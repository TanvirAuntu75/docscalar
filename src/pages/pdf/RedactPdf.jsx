import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BACKEND_URL = 'http://localhost:8000';

export default function RedactPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // PDF render state
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Redactions list
  const [redactions, setRedactions] = useState([]); // Array of { id, page, x, y, width, height }
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });

  // Backend state
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);

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

  // Monitor PDF loading when files changes
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setRedactions([]);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setProcessing(false);
      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF document. Please verify it is not corrupted.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files]);

  // Render active page & overlay redactions
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const viewport = page.getViewport({ scale: 1.0 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        drawOverlayRedactions();
      } catch (err) {
        console.error('Error rendering PDF page preview:', err);
      }
    };
    renderPage();
  }, [pdfDocument, activePageIndex, redactions]);

  // Draw redactions on the overlay canvas
  const drawOverlayRedactions = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw saved redactions for active page
    const pageRedacts = redactions.filter(r => r.page === activePageIndex);
    pageRedacts.forEach(r => {
      const rx = r.x * overlay.width;
      const ry = r.y * overlay.height;
      const rw = r.width * overlay.width;
      const rh = r.height * overlay.height;

      // Filled semi-transparent black
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(rx, ry, rw, rh);

      // Red dashed border
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Draw temporary dragging box
    if (isDragging) {
      const rx = Math.min(dragStart.x, dragEnd.x);
      const ry = Math.min(dragStart.y, dragEnd.y);
      const rw = Math.abs(dragStart.x - dragEnd.x);
      const rh = Math.abs(dragStart.y - dragEnd.y);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  };

  // Redraw when dragging state changes
  useEffect(() => {
    if (isDragging) {
      drawOverlayRedactions();
    }
  }, [dragEnd, isDragging]);

  // Mouse / Touch handlers for redaction rectangles
  const handleMouseDown = (e) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x, y });
    setDragEnd({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const w = overlay.width;
    const h = overlay.height;

    const x0 = Math.min(dragStart.x, dragEnd.x) / w;
    const y0 = Math.min(dragStart.y, dragEnd.y) / h;
    const x1 = Math.max(dragStart.x, dragEnd.x) / w;
    const y1 = Math.max(dragStart.y, dragEnd.y) / h;

    const rw = x1 - x0;
    const rh = y1 - y0;

    // Reject tiny clicks
    if (rw > 0.005 && rh > 0.005) {
      const newRedact = {
        id: Math.random().toString(36).substring(7),
        page: activePageIndex,
        x: x0,
        y: y0,
        width: rw,
        height: rh
      };
      setRedactions([...redactions, newRedact]);
    }
  };

  const removeRedaction = (id) => {
    setRedactions(redactions.filter(r => r.id !== id));
  };

  const clearAllRedactions = () => {
    setRedactions([]);
  };

  // Monitor backend job
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_redacted.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to local DB
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'Redact PDF', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Redaction failed on server.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleApplyRedactions = async () => {
    if (!files.length || !redactions.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(15);

    try {
      if (!backendActive) {
        throw new Error('Connection to security server is inactive. Secure text purging requires a running backend.');
      }

      // Step 1: Upload file to FastAPI backend
      const formData = new FormData();
      formData.append('file', files[0]);
      
      const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to conversion server failed.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      setProgress(50);

      // Step 2: Queue the redaction job
      const redactFormData = new FormData();
      redactFormData.append('file_id', uploadData.file_id);
      redactFormData.append('filename', uploadData.filename);
      // Send coordinates list
      redactFormData.append('redactions_json', JSON.stringify(redactions));

      const redactRes = await apiFetch(`${BACKEND_URL}/api/security/redact`, {
        method: 'POST',
        body: redactFormData
      });

      if (!redactRes.ok) {
        throw new Error('Failed to queue redaction task.');
      }

      const redactData = await redactRes.json();
      
      // Step 3: Trigger the poller
      poller.startPolling(redactData.job_id);

    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during redaction.');
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

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setPdfDocument(null);
    setTotalPages(0);
    setActivePageIndex(0);
    setRedactions([]);
    poller.resetPoller();
  };

  return (
    <ToolPageLayout
      toolId="redact-pdf"
      title="Redact PDF"
      description="Permanently strip text and graphics under your selection to securely sanitize files"
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
              {backendActive ? 'Security Engine Active' : 'Conversion Server Offline'}
            </span>
          </div>
        )}
        </>
      }
    >
      <SEOHead 
        title="Redact PDF Online Free — Secure Text Stripping | DocForge" 
        description="Securely mask and sanitize PDF pages. Draw boxes to permanently delete text bytes and content layers underneath, protecting sensitive data."
      />

      

      {!result ? (
        <>
          {files.length === 0 ? (
            <FileDropzone accept=".pdf,application/pdf" multiple={false} files={files} setFiles={setFiles} />
          ) : (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out] lg:grid-cols-3 grid gap-6" style={{
              display: 'grid',
              gridTemplateColumns: 'window.innerWidth > 992 ? "1.2fr 1fr" : "1fr"',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              
              {/* Left Column: Canvas Preview */}
              <div className="lg:col-span-2 flex flex-col items-center">
                <div className="flex items-center gap-4 mb-4">
                  <button 
                    className="btn btn-secondary py-1 px-3" 
                    onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                  >
                    ◀
                  </button>
                  <span className="text-sm font-medium text-var(--text-primary)">
                    Page {activePageIndex + 1} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary py-1 px-3" 
                    onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={activePageIndex === totalPages - 1}
                  >
                    ▶
                  </button>
                </div>

                <div 
                  ref={containerRef} 
                  className="relative border rounded shadow-md overflow-hidden bg-white select-none cursor-crosshair"
                  style={{ touchAction: 'none' }}
                >
                  <canvas ref={pdfCanvasRef} className="block" />
                  <canvas 
                    ref={overlayCanvasRef} 
                    className="absolute top-0 left-0" 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  />
                </div>
                <p className="text-xs text-center text-var(--text-secondary) mt-2 italic">
                  * Click and drag on the page preview above to select redaction boxes.
                </p>
              </div>

              {/* Right Column: Settings & Redaction List */}
              <div className="flex flex-col gap-6 justify-between h-full bg-[var(--surface-color)] p-5 rounded-2xl border border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-var(--text-primary)">Redactions List</h3>
                  <p className="text-sm text-var(--text-secondary) mb-4">
                    List of regions that will be permanently stripped of content.
                  </p>

                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2 pr-1">
                    {redactions.length === 0 ? (
                      <p className="text-sm text-center text-var(--text-secondary) italic py-6">
                        No redactions drawn yet.
                      </p>
                    ) : (
                      redactions.map((r, index) => (
                        <div 
                          key={r.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)]"
                        >
                          <div className="flex flex-col text-xs text-var(--text-secondary)">
                            <span className="font-semibold text-var(--text-primary)">Region #{index + 1}</span>
                            <span>Page: {r.page + 1}</span>
                            <span>Bounds: {Math.round(r.x*100)}%, {Math.round(r.y*100)}%</span>
                          </div>
                          <button 
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer flex items-center justify-center"
                            onClick={() => removeRedaction(r.id)}
                            title="Remove region"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {redactions.length > 0 && (
                    <button 
                      className="btn btn-secondary w-full mt-4 text-xs" 
                      onClick={clearAllRedactions}
                    >
                      Clear All Regions
                    </button>
                  )}
                </div>

                <div className="mt-6">
                  {processing ? (
                    <div className="mb-4">
                      <div className="progress-bar mb-2">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-center text-var(--text-secondary)">
                        Applying redaction matrices... {progress}%
                      </p>
                    </div>
                  ) : null}

                  {error && <p className="text-xs text-red-500 text-center mb-4">{error}</p>}

                  <div className="flex flex-col gap-3">
                    <button 
                      className="btn btn-primary w-full py-3 text-sm"
                      onClick={handleApplyRedactions}
                      disabled={!redactions.length || processing || !backendActive}
                    >
                      {processing ? 'Applying...' : `Securely Redact ${redactions.length} Regions`}
                    </button>
                    <button 
                      className="btn btn-secondary w-full py-2 text-xs" 
                      onClick={handleReset}
                      disabled={processing}
                    >
                      Cancel / Reset
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">shield</span>
          </div>
          <div className="result-title">Redaction Applied Securely!</div>
          <div className="result-info">
            All coordinates have been sanitized. Underlying text and image bytes have been permanently deleted in <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Redacted PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Redact Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}