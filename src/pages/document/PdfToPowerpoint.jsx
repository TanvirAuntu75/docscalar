import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { pdfToPowerpoint } from '../../engines/document/pdfToPowerpoint';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Presentation,
  Sparkles,
  Download,
  Zap,
  FileCheck,
  LayoutGrid,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Tv
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToPowerpoint() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'inspect'
  const [docLoading, setDocLoading] = useState(false);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Conversion Configuration State
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9' | '4:3'
  const [outputFileName, setOutputFileName] = useState('');

  // Processing & Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const currentRenderTaskRef = useRef(null);
  const poller = useJobPoller(BACKEND_URL);

  // 1. Check Server Availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
          setEngineMode('server');
        }
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('pdf-to-powerpoint');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'presentation.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('PDF to PowerPoint draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('pdf-to-powerpoint', {
        files,
        engineMode,
        aspectRatio,
        outputFileName
      });
    }
  }, [files, engineMode, aspectRatio, outputFileName]);

  // 4. Load PDF with PDF.js for Preview
  useEffect(() => {
    if (files.length === 0) {
      setPdfDoc(null);
      setNumPages(0);
      setPageThumbnails([]);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isMounted = true;

    const loadDoc = async () => {
      setDocLoading(true);
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = loadPdfDocument(new Uint8Array(arrayBuffer));
        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setActivePage(1);

        if (!outputFileName) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}.pptx`);
        }

        // Render visual slide thumbnails
        const thumbs = [];
        for (let i = 1; i <= Math.min(loadedDoc.numPages, 48); i++) {
          if (!isMounted) return;
          try {
            const page = await loadedDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, viewport.width, viewport.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL('image/jpeg', 0.8));
            page.cleanup();
          } catch (e) {
            console.warn(`Error generating slide thumbnail for page ${i}:`, e);
          }
        }
        if (isMounted) setPageThumbnails(thumbs);
      } catch (err) {
        if (isMounted) {
          console.warn('Powerpoint PDF load error:', err);
          setError('Failed to load PDF document for preview.');
        }
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [files, activeFileIndex]);

  // 5. Render Active Slide in Inspect Mode
  useEffect(() => {
    if (!pdfDoc || viewMode !== 'inspect' || !canvasRef.current) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(activePage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (currentRenderTaskRef.current) {
          try {
            currentRenderTaskRef.current.cancel();
          } catch (e) {}
          currentRenderTaskRef.current = null;
        }

        const renderContext = {
          canvasContext: context,
          viewport
        };

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Canvas render error:', err);
        }
      } finally {
        currentRenderTaskRef.current = null;
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {}
        currentRenderTaskRef.current = null;
      }
    };
  }, [pdfDoc, activePage, viewMode, zoomScale]);

  // 6. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'presentation';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}.pptx`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            slidesCount: numPages,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'PDF to POWERPOINT', blob);
          clearStudioDraft('pdf-to-powerpoint');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            slidesCount: numPages,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'High-precision conversion failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Converting presentation layouts with full precision...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex, numPages]);

  // 7. Execute PDF to PowerPoint Conversion
  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setStatusMessage('Analyzing presentation slide hierarchy...');

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName.trim().endsWith('.pptx') ? outputFileName.trim() : `${outputFileName.trim() || file.name.replace(/\.[^.]+$/, '')}.pptx`;

    try {
      if (engineMode === 'server') {
        if (!backendActive) throw new Error('Cloud conversion engine is currently offline. Please switch to Fast Mode.');
        setStatusMessage('Preparing presentation for full-precision layout conversion...');
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(40);
        setStatusMessage('Queueing presentation conversion task...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('target_format', 'pptx');

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/pdf-to-powerpoint`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue conversion task.');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } else {
        setStatusMessage('Compiling OpenXML presentation slides...');
        const pptxBlob = await pdfToPowerpoint(
          file,
          { aspectRatio },
          (p) => {
            setProgress(p);
            setStatusMessage(`Packaging PPTX presentation... ${p}%`);
          }
        );

        setProcessing(false);
        setResult({
          blob: pptxBlob,
          name: finalName,
          size: pptxBlob.size,
          slidesCount: numPages,
          engineMode: 'client'
        });

        await saveFile(finalName, pptxBlob.size, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'PDF to POWERPOINT', pptxBlob);
        await clearStudioDraft('pdf-to-powerpoint');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during PDF to PowerPoint conversion.');
    }
  };

  const downloadFile = () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('pdf-to-powerpoint');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    setPdfDoc(null);
    setNumPages(0);
    poller.resetPoller();
  };

  const currentFile = files[activeFileIndex] || files[0];

  return (
    <ToolPageLayout
      toolId="pdf-to-powerpoint"
      title="PDF to PowerPoint Studio"
      description="Convert PDF documents into editable Microsoft PowerPoint presentations (.pptx) with structured titles and body text."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF to PowerPoint Online Free — Convert PDF to PPTX | DocScalar"
        description="Convert PDF files to editable PowerPoint PPTX slides online. Free, fast, and 100% private in-browser presentation extraction."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Slide Presentation Stage                       */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-orange-500">co_present</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[180px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-orange-500">co_present</span>
                        <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setViewMode('gallery')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'gallery'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <LayoutGrid size={13} />
                        <span>Slides Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('inspect')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'inspect'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Maximize2 size={13} />
                        <span>Inspect Slide</span>
                      </button>
                    </div>

                    {/* Slide Navigation (Inspect Mode) */}
                    {viewMode === 'inspect' && numPages > 1 && (
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                          disabled={activePage <= 1}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="font-semibold text-[var(--text-primary)] px-1">
                          Slide {activePage} / {numPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.min(numPages, p + 1))}
                          disabled={activePage >= numPages}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-secondary)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <span>{numPages} {numPages === 1 ? 'Slide' : 'Slides'}</span>
                    </div>
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none pb-24 sm:pb-32">
                {docLoading ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] my-auto">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-orange-500">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Parsing presentation slides...</span>
                  </div>
                ) : viewMode === 'inspect' ? (
                  <div
                    className="relative bg-white shadow-2xl rounded-2xl border border-slate-300 dark:border-slate-800 p-2 overflow-hidden flex flex-col transition-all duration-150 m-auto shrink-0"
                  >
                    <canvas ref={canvasRef} className="rounded-xl max-w-full h-auto" />
                  </div>
                ) : (
                  /* Slides Gallery Grid Stage */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl w-full">
                    {Array.from({ length: numPages }, (_, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setActivePage(i + 1);
                          setViewMode('inspect');
                        }}
                        className="group relative bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-orange-500 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                          {pageThumbnails[i] ? (
                            <img src={pageThumbnails[i]} alt={`Slide ${i + 1}`} className="w-full h-full object-contain bg-white" />
                          ) : (
                            <>
                              <Presentation size={28} className="text-orange-500 opacity-60 mb-2" />
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Slide Deck
                              </span>
                            </>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-orange-500/10 backdrop-blur-xs text-orange-600 font-bold text-[10px] border border-orange-500/20 shadow-xs">
                            Slide {i + 1}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-secondary)]">
                          <span>Slide {i + 1}</span>
                          <span className="text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-orange-500">co_present</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    PowerPoint Options
                  </span>
                </div>
                <span className="text-xs font-bold text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  PPTX
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Conversion Engine */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Conversion Engine
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setEngineMode('client')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'client'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Zap size={14} />
                      <span>Fast Mode</span>
                      <span className={`text-[10px] ${engineMode === 'client' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Instant · Private</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEngineMode('server')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'server'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Full Precision</span>
                      <span className={`text-[10px] ${engineMode === 'server' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Native PPTX</span>
                    </button>
                  </div>
                </div>

                {/* 2. Aspect Ratio */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {[
                      { id: '16:9', label: '16:9 Widescreen' },
                      { id: '4:3', label: '4:3 Standard' }
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          aspectRatio === ar.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output PPTX Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="presentation.pptx"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-orange-500 shrink-0">
                          progress_activity
                        </span>
                        <span className="truncate" title={statusMessage || 'Packaging PowerPoint slides...'}>
                          {statusMessage || 'Packaging PowerPoint slides...'}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={processing || files.length === 0 || (engineMode === 'server' && !backendActive)}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Converting to PPTX ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Convert to PowerPoint (.pptx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PowerPoint Presentation Ready!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your PDF document has been packaged into an editable Microsoft PowerPoint (.pptx) slide deck.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-orange-600 font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Slides Created</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.slidesCount || numPages}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">PPTX</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Full Precision' : 'Fast Mode'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <Download size={18} />
                <span>Download PowerPoint (.pptx)</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Convert Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocScalar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/powerpoint-to-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-orange-500">picture_as_pdf</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">PPTX to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Convert back to PDF</p>
                  </div>
                </Link>

                <Link
                  to="/pdf-to-word"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">description</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">PDF to Word</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Extract to DOCX</p>
                  </div>
                </Link>

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">view_module</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reorder pages</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
