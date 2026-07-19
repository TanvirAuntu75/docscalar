import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch, uploadFileSecure, BACKEND_URL} from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import { OcrClient } from '../../utils/ocrClient';
import { jsPDF } from 'jspdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ita', name: 'Italian (Italiano)' },
  { code: 'por', name: 'Portuguese (Português)' },
  { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
  { code: 'jpn', name: 'Japanese (日本語)' }
];

export default function OcrPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [ocrMode, setOcrMode] = useState('server'); // 'server' | 'client'
  const [statusText, setStatusText] = useState('');
  const [diagnosticLogs, setDiagnosticLogs] = useState([]);

  // Web Audio wake lock reference to prevent background tab throttling
  const wakeLockAudioRef = useRef({ audioCtx: null, silenceNode: null });
  const activePoolRef = useRef([]);
  const pdfDocRef = useRef(null);

  const startWakeLock = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      node.connect(ctx.destination);
      node.start();
      wakeLockAudioRef.current = { audioCtx: ctx, silenceNode: node };
      logDiagnostic('Background wake lock activated via silent audio playback.');
    } catch (e) {
      console.warn('Wake lock audio initialization failed:', e);
    }
  };

  const stopWakeLock = () => {
    try {
      const { audioCtx: ctx, silenceNode: node } = wakeLockAudioRef.current;
      if (node) {
        node.stop();
        node.disconnect();
      }
      if (ctx) {
        ctx.close();
      }
      wakeLockAudioRef.current = { audioCtx: null, silenceNode: null };
      logDiagnostic('Background wake lock deactivated.');
    } catch (e) {
      console.warn(e);
    }
  };

  const logDiagnostic = (msg) => {
    console.log(msg);
    setDiagnosticLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Backend availability state
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const poller = useJobPoller(BACKEND_URL);

  // Check if server is running on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
        }
      } catch (e) {
        setBackendActive(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    checkServer();
  }, []);

  // Cleanup workers and documents on unmount
  useEffect(() => {
    return () => {
      if (activePoolRef.current && activePoolRef.current.length > 0) {
        console.log('[OcrPdf] Unmount cleanup: Terminating active OCR workers');
        activePoolRef.current.forEach(c => {
          try {
            c.terminate();
          } catch (e) {}
        });
        activePoolRef.current = [];
      }
      if (pdfDocRef.current) {
        console.log('[OcrPdf] Unmount cleanup: Destroying active PDF document');
        try {
          pdfDocRef.current.destroy();
        } catch (e) {}
        pdfDocRef.current = null;
      }
      stopWakeLock();
    };
  }, []);

  // Monitor backend task status
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      stopWakeLock();
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_ocr.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'OCR PDF', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      stopWakeLock();
      setError(poller.error || 'OCR engine failed on server. Make sure Tesseract is installed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleRunOcr = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);
    startWakeLock();

    const file = files[0];

    // Client Side OCR Flow
    if (ocrMode === 'client') {
      try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
          try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            pdfDocRef.current = pdf;
            const totalPages = pdf.numPages;
            
            let docOutput = null;
            
            // Instantiate OcrClient Pool
            logDiagnostic('Loading OCR engine worker pool...');
            const gpuEnabled = localStorage.getItem('gpuBoostEnabled') !== 'false';
            const isEnglishOnly = selectedLanguage === 'eng';
            const isFirefox = navigator.userAgent.includes('Firefox');

            // WebGL context budget per browser:
            //   Chrome/Edge: ~16 contexts   Firefox: ~8 contexts
            // Contexts per worker:
            //   English-only (1 session) = 1 context/worker
            //   Multilingual (2 sessions) = 2 contexts/worker
            let concurrency;
            if (isFirefox) {
              // Firefox: stay safely under 8 context limit
              concurrency = isEnglishOnly ? 7 : 3;
            } else {
              // Chrome / Edge / Safari: generous limit, cap at 5 for memory safety
              concurrency = 5;
            }
            // Never spawn more workers than there are pages or CPU threads
            concurrency = Math.min(concurrency, navigator.hardwareConcurrency || 2, totalPages);
            logDiagnostic(`Browser: ${isFirefox ? 'Firefox' : 'Chrome/Edge'} | Mode: ${isEnglishOnly ? 'English-only' : 'Multilingual'} | Spawning ${concurrency} workers (GPU: ${gpuEnabled ? 'ON' : 'OFF'})...`);

            
            const pool = [];
            for (let c = 0; c < concurrency; c++) {
              const client = new OcrClient(gpuEnabled ? 'gpu' : 'cpu', selectedLanguage, (msg) => {
                logDiagnostic(`[Worker ${c + 1}] ${msg}`);
              });
              pool.push(client);
            }
            activePoolRef.current = pool;
            
            await Promise.all(pool.map(client => client.init()));
            logDiagnostic('OCR Worker Pool initialized successfully. Starting recognition...');
            
            const pageResults = new Array(totalPages);
            let activeTasks = 0;
            let nextPage = 1;
            let completedPages = 0;
            
            await new Promise((resolvePromise, rejectPromise) => {
              const runNext = async (workerIdx) => {
                if (nextPage > totalPages) {
                  if (activeTasks === 0) resolvePromise();
                  return;
                }
                
                const pageNum = nextPage++;
                activeTasks++;
                
                let canvasEl = null;
                let procCanvas = null;
                
                try {
                  const client = pool[workerIdx];
                  const page = await pdf.getPage(pageNum);
                  // Scale 2.0: higher resolution = better OCR accuracy on fine text
                  const viewport = page.getViewport({ scale: 2.0 });
                  
                  canvasEl = document.createElement('canvas');
                  const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
                  canvasEl.width = viewport.width;
                  canvasEl.height = viewport.height;
                  
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, viewport.width, viewport.height);
                  
                  await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                  }).promise;
                  
                  // Downscale/preprocess using canvas for safe VRAM limits
                  procCanvas = document.createElement('canvas');
                  const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });
                  const maxDim = 1024;
                  let procW = viewport.width;
                  let procH = viewport.height;
                  
                  if (procW > maxDim || procH > maxDim) {
                    const scale = maxDim / Math.max(procW, procH);
                    procW = Math.floor(procW * scale);
                    procH = Math.floor(procH * scale);
                  }
                  procCanvas.width = procW;
                  procCanvas.height = procH;
                  
                  procCtx.fillStyle = '#ffffff';
                  procCtx.fillRect(0, 0, procW, procH);
                  procCtx.drawImage(canvasEl, 0, 0, procW, procH);
                  
                  const imgData = procCtx.getImageData(0, 0, procW, procH);
                  logDiagnostic(`Worker ${workerIdx + 1} starting Page ${pageNum}/${totalPages}...`);
                  
                  const result = await client.recognizeLine(imgData.data, procW, procH);
                  logDiagnostic(`Worker ${workerIdx + 1} finished Page ${pageNum}/${totalPages}: linesFound=${result.linesFound}, linesWithText=${result.linesWithText}`);
                  
                  const imgDataUrl = canvasEl.toDataURL('image/jpeg', 0.92);
                  
                  pageResults[pageNum - 1] = {
                    text: result.text,
                    lines: result.lines,
                    width: viewport.width,
                    height: viewport.height,
                    imgDataUrl,
                    procW,
                    procH
                  };
                  
                  completedPages++;
                  const pct = Math.min(95, 10 + Math.floor((completedPages / totalPages) * 85));
                  setProgress(pct);
                  setStatusText(`Page ${pageNum}/${totalPages} processed. Completed: ${completedPages}/${totalPages} pages...`);
                  
                } catch (err) {
                  console.error(`Page ${pageNum} failed:`, err);
                  rejectPromise(err);
                  return;
                } finally {
                  // Clean up canvases to free up memory and VRAM immediately
                  if (canvasEl) {
                    canvasEl.width = 0;
                    canvasEl.height = 0;
                  }
                  if (procCanvas) {
                    procCanvas.width = 0;
                    procCanvas.height = 0;
                  }
                  canvasEl = null;
                  procCanvas = null;
                  
                  activeTasks--;
                  runNext(workerIdx);
                }
              };
              
              // Start initial tasks
              for (let c = 0; c < Math.min(concurrency, totalPages); c++) {
                runNext(c);
              }
            });
            
            // Reconstruct final PDF in order
            logDiagnostic('All pages recognized. Compiling final PDF document...');
            
            // Fetch Unifont for invisible Unicode layer
            let fontBase64 = '';
            try {
              logDiagnostic('Loading universal Unicode font...');
              const fontRes = await fetch('/fonts/unifont.ttf');
              const fontBlob = await fontRes.blob();
              fontBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(fontBlob);
              });
            } catch (err) {
              console.error('Failed to load Unifont in UI compilation, falling back to Helvetica:', err);
            }

            let allExtractedText = "";
            for (let i = 1; i <= totalPages; i++) {
              const res = pageResults[i - 1];
              if (!res) continue;
              
              if (!docOutput) {
                docOutput = new jsPDF({
                  orientation: res.width > res.height ? 'landscape' : 'portrait',
                  unit: 'pt',
                  format: [res.width, res.height]
                });
                if (fontBase64) {
                  docOutput.addFileToVFS('unifont.ttf', fontBase64);
                  docOutput.addFont('unifont.ttf', 'unifont', 'normal');
                }
              } else {
                docOutput.addPage([res.width, res.height], res.width > res.height ? 'landscape' : 'portrait');
              }
              
              docOutput.addImage(res.imgDataUrl, 'JPEG', 0, 0, res.width, res.height);
              
              const scaleX = res.width / res.procW;
              const scaleY = res.height / res.procH;
              
              docOutput.internal.write("3 Tr"); // Invisible text rendering mode
              
              if (res.lines && res.lines.length > 0) {
                for (const line of res.lines) {
                  const ly = ((line.y0 + line.y1) / 2) * scaleY;
                  const lx = 30 * scaleX;
                  const fontH = (line.y1 - line.y0) * scaleY;
                  const fontSize = Math.max(4, Math.round(fontH * 0.8));
                  
                  if (fontBase64) {
                    docOutput.setFont("unifont", "normal");
                  } else {
                    docOutput.setFont("helvetica", "normal");
                  }
                  docOutput.setFontSize(fontSize);
                  
                  let txtStr = '';
                  if (line) {
                    if (typeof line === 'string') {
                      txtStr = line;
                    } else if (typeof line === 'object') {
                      if (typeof line.text === 'string') {
                        txtStr = line.text;
                      } else if (line.text && typeof line.text === 'object' && typeof line.text.text === 'string') {
                        txtStr = line.text.text;
                      } else if (line.text) {
                        txtStr = String(line.text);
                      }
                    }
                  }
                  
                  docOutput.text(txtStr, lx, ly);
                }
              }
              
              docOutput.internal.write("0 Tr"); // Restore standard rendering mode
              allExtractedText += `--- Page ${i} ---\n${res.text}\n\n`;
            }
            
            // Clean up worker pool
            logDiagnostic('Cleaning up OCR engine worker pool...');
            pool.forEach(c => c.terminate());
            activePoolRef.current = [];
            if (pdfDocRef.current) {
              try {
                pdfDocRef.current.destroy();
              } catch (e) {}
              pdfDocRef.current = null;
            }
            stopWakeLock();
            
            setProgress(100);
            setProcessing(false);
            
            const pdfBlob = docOutput.output('blob');
            const originalName = file.name.replace(/\.[^.]+$/, '') || 'document';
            const finalName = `${originalName}_ocr_client.pdf`;
            
            const localDownloadUrl = URL.createObjectURL(pdfBlob);
            setResult({
              downloadUrl: localDownloadUrl,
              name: finalName,
              isClient: true
            });
            
            // Save to IndexedDB
            saveFile(finalName, pdfBlob.size, 'application/pdf', 'OCR PDF (Client)', pdfBlob);
            
          } catch (err) {
            console.error(err);
            if (activePoolRef.current && activePoolRef.current.length > 0) {
              activePoolRef.current.forEach(c => {
                try {
                  c.terminate();
                } catch (e) {}
              });
              activePoolRef.current = [];
            }
            if (pdfDocRef.current) {
              try {
                pdfDocRef.current.destroy();
              } catch (e) {}
              pdfDocRef.current = null;
            }
            stopWakeLock();
            setProcessing(false);
            setError(err.message || 'Client Side OCR execution failed.');
          }
        };
        fileReader.readAsArrayBuffer(file);
      } catch (err) {
        if (activePoolRef.current && activePoolRef.current.length > 0) {
          activePoolRef.current.forEach(c => {
            try {
              c.terminate();
            } catch (e) {}
          });
          activePoolRef.current = [];
        }
        if (pdfDocRef.current) {
          try {
            pdfDocRef.current.destroy();
          } catch (e) {}
          pdfDocRef.current = null;
        }
        stopWakeLock();
        setProcessing(false);
        setError(err.message || 'Failed to read PDF file.');
      }
      return;
    }

    // Server Side OCR Flow
    try {
      if (!backendActive) {
        throw new Error('Connection to OCR server is inactive. High-fidelity Server Side OCR requires a running backend.');
      }
        // Step 1: Upload file (uses chunked upload if large and premium)
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

      setProgress(40);

      // Step 2: Queue the job
      const convertFormData = new FormData();
      convertFormData.append('file_id', uploadData.file_id);
      convertFormData.append('filename', uploadData.filename);
      convertFormData.append('language', selectedLanguage);

      const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/ocr-pdf`, {
        method: 'POST',
        body: convertFormData
      });

      if (!convertRes.ok) {
        throw new Error('Failed to queue OCR task.');
      }

      const convertData = await convertRes.json();
      
      // Step 3: Trigger the poller
      poller.startPolling(convertData.job_id);

    } catch (err) {
      stopWakeLock();
      setProcessing(false);
      setError(err.message || 'An error occurred during OCR processing.');
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.downloadUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      saveAs(blob, result.name);
    } catch (err) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.setAttribute('download', result.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const reset = () => {
    // Revoke Client Side blob URL to free the output PDF from memory
    if (result?.isClient && result?.downloadUrl) {
      try {
        URL.revokeObjectURL(result.downloadUrl);
      } catch (e) {}
    }
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    poller.resetPoller();
    if (activePoolRef.current && activePoolRef.current.length > 0) {
      activePoolRef.current.forEach(c => {
        try {
          c.terminate();
        } catch (e) {}
      });
      activePoolRef.current = [];
    }
    if (pdfDocRef.current) {
      try {
        pdfDocRef.current.destroy();
      } catch (e) {}
      pdfDocRef.current = null;
    }
    stopWakeLock();
  };

  return (
    <ToolPageLayout
      toolId="ocr-pdf"
      title="OCR PDF"
      description="Make scanned documents selectable and searchable with professional Server Side text recognition"
      headerContent={
        <>
          {!checkingBackend && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: backendActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              color: backendActive ? 'var(--color-success-light)' : 'var(--color-warning)',
              border: `1px solid ${backendActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: backendActive ? 'var(--color-success)' : 'var(--color-warning)'
              }} />
              {backendActive ? 'ocrmypdf Engine Active' : 'OCR Server Client Side'}
            </span>
          </div>
        )}
        </>
      }
      files={files}
      onFileSwitch={(idx) => {
        setFiles(prev => {
          if (idx < 0 || idx >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return next;
        });
      }}>
      <SEOHead 
        title="OCR PDF Online Free — Searchable PDF Converter | DocForge" 
        description="Make scanned PDFs searchable with professional Server Side OCR. High accuracy text recognition for documents."
      />
      
      

      {!result ? (
        <>
          <FileDropzone 
            accept=".pdf,application/pdf" 
            multiple={false} 
            files={files} 
            setFiles={setFiles} 
          />
          
          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out] max-w-md mx-auto mt-6 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] text-left">
              <h3 className="text-md font-semibold mb-4 text-var(--text-primary)">OCR Configuration</h3>
              
              <div className="mb-4">
                <label className="block text-xs font-semibold text-var(--text-secondary) uppercase tracking-wider mb-2">
                  OCR Engine Mode
                </label>
                <select
                  value={ocrMode}
                  onChange={(e) => setOcrMode(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] text-var(--text-primary) text-sm focus:outline-none focus:ring-1 focus:ring-red-500 mb-4"
                >
                  <option value="server">Server Side (PaddleOCR / Tesseract)</option>
                  <option value="client">Client Side Browser (Quantized ONNX)</option>
                </select>
              </div>

              {ocrMode === 'server' ? (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-var(--text-secondary) uppercase tracking-wider mb-2">
                    Document Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] text-var(--text-primary) text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-var(--text-secondary) uppercase tracking-wider mb-2">
                    ONNX Engine
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0"></span>
                    <span className="text-xs">Handwriting + Multilingual models run as ensemble — best result wins automatically</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {processing && (
            <div className="progress-container max-w-md mx-auto mt-6">
              <div className="progress-bar mb-2">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status text-center text-sm">{statusText || 'Recognizing text and embedding layers...'} {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          
          {diagnosticLogs.length > 0 && (
            <div className="max-w-md mx-auto mt-6 p-4 rounded-xl border border-red-900/50 bg-neutral-900/90 text-neutral-300 text-xs font-mono text-left h-48 overflow-y-auto shadow-inner">
              <div className="font-semibold border-b border-neutral-800 pb-1 mb-1 text-red-400">Client Side OCR Diagnostics:</div>
              {diagnosticLogs.map((log, idx) => (
                <div key={idx} className="py-0.5 border-b border-neutral-900 last:border-b-0">{log}</div>
              ))}
            </div>
          )}
          
          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleRunOcr} 
              disabled={!files.length || processing || (ocrMode === 'server' && !backendActive)}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Running OCR...' : 'Run OCR'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">search</span>
          </div>
          <div className="result-title">OCR Recognition Complete!</div>
          <div className="result-info">
            Your searchable PDF has been generated and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Searchable PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}