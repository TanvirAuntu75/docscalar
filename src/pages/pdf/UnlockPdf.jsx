import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function UnlockPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Decryption State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');

  // Canvas Viewport State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
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

  // Processing & Polling State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Backend Connectivity Status
  const [backendActive, setBackendActive] = useState(true);
  const poller = useJobPoller(BACKEND_URL);
  const canvasRef = useRef(null);
  const currentRenderTaskRef = useRef(null);

  // 1. Check Backend Connectivity on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
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
        const draft = await loadStudioDraft('unlock-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.password) setPassword(draft.password);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Unlock PDF draft recovery failed:', err);
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
      saveStudioDraft('unlock-pdf', {
        files,
        password,
        outputFileName
      });
    }
  }, [files, password, outputFileName]);

  // 4. Attempt to Render Preview Canvas (with Password if Provided)
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setCurrentPage(1);
      setIsPasswordVerified(false);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const renderPage = async () => {
      setCanvasLoading(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          password: password || undefined
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }

        setIsPasswordVerified(true);
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
            setOutputFileName(`${base}_unlocked.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          setIsPasswordVerified(false);
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_unlocked.pdf`);
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
  }, [files, activeFileIndex, currentPage, password, debouncedRenderZoom]);

  // 5. Monitor Backend Polling Job Status
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_unlocked.pdf`;

      // Fetch blob to enable instant local download & save to IndexedDB
      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size
          });
          saveFile(finalName, blob.size, 'application/pdf', 'Unlock PDF', blob);
          clearStudioDraft('unlock-pdf');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName
          });
          clearStudioDraft('unlock-pdf');
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Password verification failed. Make sure the credentials are correct.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 35);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex, outputFileName]);

  // Main Handle Unlock Action
  const handleUnlock = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    const file = files[activeFileIndex] || files[0];

    try {
      if (!backendActive) {
        throw new Error('Connection to decryption server is inactive. Please verify backend service.');
      }

      // Step 1: Upload file securely
      const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
      if (!uploadData.success) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      setProgress(40);

      // Step 2: Queue the PyMuPDF / PikePDF unlock job
      const unlockFormData = new FormData();
      unlockFormData.append('file_id', uploadData.file_id);
      unlockFormData.append('filename', uploadData.filename);
      unlockFormData.append('password', password);

      const unlockRes = await apiFetch(`${BACKEND_URL}/api/security/unlock`, {
        method: 'POST',
        body: unlockFormData
      });

      if (!unlockRes.ok) {
        throw new Error('Failed to verify password or queue unlock task. Please double-check password.');
      }

      const unlockData = await unlockRes.json();

      // Step 3: Trigger the poller
      poller.startPolling(unlockData.job_id);
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during decryption.');
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
      return;
    }
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

  const resetWorkspace = () => {
    clearStudioDraft('unlock-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setPassword('');
    setShowPassword(false);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setIsPasswordVerified(false);
    setProcessing(false);
    setProgress(0);
    poller.resetPoller();
  };

  return (
    <ToolPageLayout
      toolId="unlock-pdf"
      title="Unlock & Decrypt PDF"
      description="Remove password protection, print locks, and permission restrictions from your PDF."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Unlock PDF Online Free — Remove PDF Password | DocScalar"
        description="Decrypt password-protected PDF files instantly. Remove user restrictions, permission locks, and owner security details securely."
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
            {/* LEFT / CENTER: Interactive Live Canvas Viewport                           */}
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

                    {/* Page Navigation Capsule (When Verified) */}
                    {isPasswordVerified && totalPages > 0 ? (
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
                    ) : (
                      <div className="h-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
                        <span className="material-symbols-outlined text-[15px]">lock</span>
                        <span>Password Protected File</span>
                      </div>
                    )}
                  </div>

                  {/* Zoom Controls & Workspace Reset */}
                  <div className="flex items-center gap-2">
                    {isPasswordVerified && (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                        <input
                          type="range"
                          min="0.3"
                          max="3.0"
                          step="0.05"
                          value={zoomScale}
                          onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                          className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                          {Math.round(zoomScale * 100)}%
                        </span>
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
                {isPasswordVerified ? (
                  /* Decrypted High-DPI Document Canvas */
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
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Testing credentials & rendering preview...</span>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 z-10">
                      <span className="material-symbols-outlined text-[15px]">lock_open</span>
                      <span>Decryption Verified</span>
                    </div>
                  </div>
                ) : (
                  /* Locked Document Shield Card */
                  <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-5 animate-[scaleIn_0.2s_ease-out]">
                    <div className="w-18 h-18 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <span className="material-symbols-outlined text-[36px]">shield_lock</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        This PDF is Password Protected
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        The content stream is encrypted with AES-256 keys. Enter the document password in the sidebar to remove protection.
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
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">lock_open</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Decryption Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Zero-Lock
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Document Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password to decrypt..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Enter the open or permissions password to strip restrictions.
                  </span>
                </div>

                {/* 2. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_unlocked.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 3. Decryption Notice */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[var(--text-primary)]">Permanent Decryption:</strong> All encryption keys, printing limits, content copying restrictions, and form editing locks will be stripped permanently from the output file.
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Decrypting PDF stream...
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
                  onClick={handleUnlock}
                  disabled={processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Decrypting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">lock_open</span>
                      <span>Unlock & Decrypt PDF</span>
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
              <span className="material-symbols-outlined text-[40px]">lock_open</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Successfully Decrypted!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                All password restrictions and security constraints have been permanently removed.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
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
                <span>Download Unlocked PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Unlock Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add new password</p>
                  </div>
                </Link>

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </Link>

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
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
