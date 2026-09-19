import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { repairPdf } from '../../engines/pdf/repairPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';
import { BACKEND_URL } from '../../utils/api';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RepairPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Repair Configuration
  const [repairMode, setRepairMode] = useState('standard'); // 'standard' | 'deep'
  const [stripCorruptMetadata, setStripCorruptMetadata] = useState(true);
  const [normalizeDictionaries, setNormalizeDictionaries] = useState(true);
  const [outputFileName, setOutputFileName] = useState('');

  // Canvas Viewport State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const viewportContainerRef = useRef(null);

  // Debounce high-DPI PDF rasterization to decouple smooth 120 FPS GPU scaling from heavy canvas redraws
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRenderZoom(zoomScale);
    }, 200);
    return () => clearTimeout(handler);
  }, [zoomScale]);

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef: viewportContainerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  // Processing State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [backendActive, setBackendActive] = useState(false);

  const canvasRef = useRef(null);
  const currentRenderTaskRef = useRef(null);

  // Backend Health Check
  useEffect(() => {
    let isMounted = true;
    fetch(`${BACKEND_URL}/health`)
      .then((res) => {
        if (res.ok && isMounted) setBackendActive(true);
      })
      .catch(() => {
        if (isMounted) setBackendActive(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard Arrow Page Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Touchscreen / Trackpad horizontal swipe
  useEffect(() => {
    const el = viewportContainerRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    };

    const onTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const elapsed = Date.now() - startTime;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && elapsed < 600) {
          if (deltaX < 0) {
            setCurrentPage((p) => Math.min(totalPages, p + 1));
          } else {
            setCurrentPage((p) => Math.max(1, p - 1));
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [totalPages]);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('repair-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.repairMode) setRepairMode(draft.repairMode);
          if (draft.stripCorruptMetadata !== undefined) setStripCorruptMetadata(draft.stripCorruptMetadata);
          if (draft.normalizeDictionaries !== undefined) setNormalizeDictionaries(draft.normalizeDictionaries);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Repair PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('repair-pdf', {
        files,
        repairMode,
        stripCorruptMetadata,
        normalizeDictionaries,
        outputFileName
      });
    }
  }, [files, repairMode, stripCorruptMetadata, normalizeDictionaries, outputFileName]);

  // 3. Render Active PDF Page to Live Viewport Canvas
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setCurrentPage(1);
      setRenderError(null);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const renderPage = async () => {
      setCanvasLoading(true);
      setRenderError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }

        const count = pdf.numPages;
        setTotalPages(count);

        const safePage = Math.min(Math.max(1, currentPage), count);
        const page = await pdf.getPage(safePage);
        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });

        const viewport = page.getViewport({ scale: 1.5 * debouncedRenderZoom });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          if (currentRenderTaskRef.current) {
            try {
              currentRenderTaskRef.current.cancel();
            } catch (e) {}
            currentRenderTaskRef.current = null;
          }

          const renderTask = page.render({ canvasContext: ctx, viewport });
          currentRenderTaskRef.current = renderTask;
          await renderTask.promise;
        }

        if (!isCancelled) {
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_repaired.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.warn('PDF Page rendering error on damaged document:', err);
          setRenderError(err.message || 'Damaged stream detected');
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_repaired.pdf`);
          }
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
  }, [files, activeFileIndex, currentPage, debouncedRenderZoom]);

  // Handle PDF Repair Execution
  const handleRepair = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    const file = files[activeFileIndex] || files[0];

    try {
      const repairResult = await repairPdf(
        file,
        {
          mode: repairMode,
          stripCorruptMetadata,
          normalizeDictionaries
        },
        (p) => setProgress(p)
      );

      const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_repaired.pdf`;

      setResult({
        blob: repairResult.blob,
        name: finalName,
        size: repairResult.repairedSize,
        originalSize: repairResult.originalSize,
        pageCount: repairResult.pageCount,
        strategy: repairResult.strategy
      });

      // Save to IndexedDB
      await saveFile(finalName, repairResult.repairedSize, 'application/pdf', 'Repair PDF', repairResult.blob);
      await clearStudioDraft('repair-pdf');
    } catch (err) {
      setError(err.message || 'Failed to repair PDF structure. The file may be completely unreadable or empty.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('repair-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setRepairMode('standard');
    setStripCorruptMetadata(true);
    setNormalizeDictionaries(true);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setRenderError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      toolId="repair-pdf"
      title="Repair PDF"
      description="Fix damaged, corrupted, or unreadable PDF documents and restore clean structure."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Repair PDF Online Free — Fix Corrupted PDFs | DocScalar"
        description="Fix corrupted, damaged, or unreadable PDF structures. Rebuild index tables and recover document pages securely."
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
            {/* LEFT / CENTER: Interactive Canvas Viewport                                */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-medium)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[180px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    {totalPages > 0 && (
                      <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-2 text-[var(--text-primary)] select-none">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {/* Document Status Pill */}
                    {renderError ? (
                      <div className="h-8 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold shrink-0">
                        <span className="material-symbols-outlined text-[15px]">warning</span>
                        <span>Damaged Stream</span>
                      </div>
                    ) : (
                      <div className="h-8 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>Document Loaded</span>
                      </div>
                    )}
                  </div>

                  {/* Zoom Controls & Reset */}
                  <div className="flex items-center gap-2">
                    {totalPages > 0 && !renderError && (
                      <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] p-0.5 shrink-0 select-none">
                        <button
                          type="button"
                          onClick={() => setZoomScale((z) => Math.max(0.3, parseFloat((z - 0.1).toFixed(2))))}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Zoom Out"
                          aria-label="Zoom Out"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomScale(1.0)}
                          className="px-2 text-xs font-bold text-[var(--text-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                          title="Reset Zoom to 100%"
                          aria-label="Reset Zoom"
                        >
                          {Math.round(zoomScale * 100)}%
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomScale((z) => Math.min(3.0, parseFloat((z + 0.1).toFixed(2))))}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Zoom In"
                          aria-label="Zoom In"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Frame */}
              <div ref={viewportContainerRef} className="flex-1 overflow-auto p-4 sm:p-8 pb-24 sm:pb-32 flex items-start justify-center relative bg-pattern select-none">
                {renderError ? (
                  /* Corrupted File Stream Diagnostic Card */
                  <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--bg-primary)] border border-amber-500/30 shadow-xl shadow-amber-500/5 flex flex-col items-center text-center gap-5 animate-[scaleIn_0.2s_ease-out] m-auto">
                    <div className="w-18 h-18 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <span className="material-symbols-outlined text-[36px]">warning</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        Damaged Document Stream Detected
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        The standard PDF renderer encountered broken cross-reference table offsets. Click <strong>Repair PDF</strong> to reconstruct the document into a standard ISO-compliant stream.
                      </p>
                    </div>
                    <div className="px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 max-w-full truncate">
                      <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                      <span className="truncate max-w-[200px]">{files[activeFileIndex]?.name}</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span className="text-[var(--text-secondary)] font-bold">
                        {formatFileSize(files[activeFileIndex]?.size || 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* High-DPI Document Canvas */
                  <div
                    className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150 m-auto shrink-0"
                    style={{
                      width: (pageDimensions.width || 595) * zoomScale,
                      height: (pageDimensions.height || 842) * zoomScale
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-contain pointer-events-none block"
                    />

                    {/* Loading Spinner Overlay */}
                    {canvasLoading && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                        <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Inspecting object streams...</span>
                      </div>
                    )}
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">build</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Repair Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Ready'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Repair Strategy Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Reconstruction Strategy
                  </label>

                  <button
                    type="button"
                    onClick={() => setRepairMode('standard')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      repairMode === 'standard'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Standard Structure Repair</span>
                      {repairMode === 'standard' && (
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">check_circle</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Rebuilds corrupted cross-reference tables and fixes shifted byte offsets. Fastest & preserves exact layers.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepairMode('deep')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      repairMode === 'deep'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Deep Reconstruction</span>
                      {repairMode === 'deep' && (
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">check_circle</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Extracts all salvageable objects into a freshly compiled PDF container. Best for severely damaged files.
                    </p>
                  </button>
                </div>

                {/* 2. Advanced Options */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Sanitization Rules
                  </span>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Normalize Dictionaries</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Fix unclosed PDF object trees</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={normalizeDictionaries}
                      onChange={(e) => setNormalizeDictionaries(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Clean Corrupted Metadata</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Reset broken producer tags</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={stripCorruptMetadata}
                      onChange={(e) => setStripCorruptMetadata(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* 3. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_repaired.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 4. Technical Explanation Card */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[var(--text-primary)]">How PDF repair works:</strong> PDFs rely on internal index tables to locate text and graphics. When offsets shift or streams get damaged, standard viewers fail to open the file. DocScalar reconstructs the object hierarchy and writes a clean, standards-compliant PDF.
                  </div>
                </div>

                {/* Progress Bar */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Reconstructing document structure...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
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
                  onClick={handleRepair}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Repairing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">build</span>
                      <span>Repair & Reconstruct PDF</span>
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
              <span className="material-symbols-outlined text-[40px]">build_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Structure Repaired!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Cross-reference index tables and object streams have been successfully reconstructed.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">verified</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Recovered Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Strategy</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[130px]">
                  {result.strategy || 'Standard XREF'}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Compliant</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Repaired PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Repair Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </Link>

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">grid_view</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Sort & rotate pages</p>
                  </div>
                </Link>

                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
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

