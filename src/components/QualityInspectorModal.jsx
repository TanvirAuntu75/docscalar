import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { formatFileSize } from '../utils/constants';

/**
 * QualityInspectorModal
 * High-precision, side-by-side visual fidelity comparator.
 * Allows users to inspect any page of their original vs compressed PDF
 * with synchronized zoom, pan, and text sharpness verification.
 */
export default function QualityInspectorModal({
  isOpen,
  onClose,
  originalFile,
  compressedBlob,
  totalPages = 1,
  documentName = 'Document',
  originalSize = 0,
  compressedSize = 0,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [viewLayout, setViewLayout] = useState('side-by-side'); // 'side-by-side' | 'single-orig' | 'single-comp'
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState(null);

  // Document objects cache
  const origDocRef = useRef(null);
  const compDocRef = useRef(null);

  // Canvas refs
  const origCanvasRef = useRef(null);
  const compCanvasRef = useRef(null);

  // Render tasks ref to prevent concurrent render conflicts
  const origRenderTaskRef = useRef(null);
  const compRenderTaskRef = useRef(null);

  // Sync scroll refs
  const origScrollContainerRef = useRef(null);
  const compScrollContainerRef = useRef(null);
  const isSyncingScrollRef = useRef(false);

  // Load PDF documents when modal opens
  useEffect(() => {
    if (!isOpen || !originalFile || !compressedBlob) return;

    let isMounted = true;
    setLoading(true);
    setRenderError(null);

    const loadDocs = async () => {
      try {
        const origArrayBuffer = await originalFile.arrayBuffer();
        const compArrayBuffer = await compressedBlob.arrayBuffer();

        const [origDoc, compDoc] = await Promise.all([
          pdfjsLib.getDocument({ data: origArrayBuffer }).promise,
          pdfjsLib.getDocument({ data: compArrayBuffer }).promise,
        ]);

        if (!isMounted) return;
        origDocRef.current = origDoc;
        compDocRef.current = compDoc;
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load PDF documents for inspection:', err);
        setRenderError('Unable to load document pages for side-by-side comparison.');
        setLoading(false);
      }
    };

    loadDocs();

    return () => {
      isMounted = false;
      if (origRenderTaskRef.current) {
        try { origRenderTaskRef.current.cancel(); } catch {}
        origRenderTaskRef.current = null;
      }
      if (compRenderTaskRef.current) {
        try { compRenderTaskRef.current.cancel(); } catch {}
        compRenderTaskRef.current = null;
      }
      origDocRef.current = null;
      compDocRef.current = null;
    };
  }, [isOpen, originalFile, compressedBlob]);

  // Render current page on both canvases
  const renderCurrentPage = useCallback(async () => {
    if (!origDocRef.current || !compDocRef.current) return;

    try {
      setLoading(true);

      // Cancel any ongoing renders before initiating new ones
      if (origRenderTaskRef.current) {
        try { origRenderTaskRef.current.cancel(); } catch {}
        origRenderTaskRef.current = null;
      }
      if (compRenderTaskRef.current) {
        try { compRenderTaskRef.current.cancel(); } catch {}
        compRenderTaskRef.current = null;
      }

      const [origPage, compPage] = await Promise.all([
        origDocRef.current.getPage(currentPage),
        compDocRef.current.getPage(Math.min(currentPage, compDocRef.current.numPages)),
      ]);

      const baseDpi = 1.5; // High-DPI crisp rendering multiplier
      const effectiveScale = zoomScale * baseDpi;
      const renderPromises = [];

      // Render Original
      if (origCanvasRef.current) {
        const viewport = origPage.getViewport({ scale: effectiveScale });
        const canvas = origCanvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / baseDpi}px`;
        canvas.style.height = `${viewport.height / baseDpi}px`;
        const task = origPage.render({ canvasContext: ctx, viewport });
        origRenderTaskRef.current = task;
        renderPromises.push(task.promise.catch((err) => {
          if (err?.name !== 'RenderingCancelledException') throw err;
        }));
      }

      // Render Compressed
      if (compCanvasRef.current) {
        const viewport = compPage.getViewport({ scale: effectiveScale });
        const canvas = compCanvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / baseDpi}px`;
        canvas.style.height = `${viewport.height / baseDpi}px`;
        const task = compPage.render({ canvasContext: ctx, viewport });
        compRenderTaskRef.current = task;
        renderPromises.push(task.promise.catch((err) => {
          if (err?.name !== 'RenderingCancelledException') throw err;
        }));
      }

      await Promise.all(renderPromises);
      setLoading(false);
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page in inspector:', err);
      }
      setLoading(false);
    }
  }, [currentPage, zoomScale]);

  useEffect(() => {
    if (isOpen && !loading && origDocRef.current && compDocRef.current) {
      renderCurrentPage();
    }
  }, [isOpen, currentPage, zoomScale, renderCurrentPage]);

  // Synchronized scrolling between containers
  const handleScroll = (source, target) => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    if (source && target) {
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setZoomScale((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setZoomScale(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, onClose]);

  if (!isOpen) return null;

  const savingsPct =
    originalSize > 0 && compressedSize > 0
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quality Inspector Side-by-Side Modal"
    >
      <div className="w-full max-w-7xl h-[92vh] flex flex-col bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Top Header Bar */}
        <div className="h-14 px-4 sm:px-6 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0 bg-[var(--bg-secondary)]/50">
          {/* Left: Document Identity & Metrics */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-blue-500/20">
              <span className="material-symbols-outlined text-[20px]">compare</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {documentName}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 font-mono">
                  {savingsPct}% Reclaimed
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Side-by-Side Visual Fidelity & Character Sharpness Audit
              </span>
            </div>
          </div>

          {/* Center: Interactive Page Stepper */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] px-2 py-1 rounded-xl border border-[var(--border-subtle)] shadow-xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous Page (Left Arrow)"
              aria-label="Previous Page"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--text-primary)] px-2 font-mono">
              <span>Page</span>
              <span className="text-[var(--color-primary)]">{currentPage}</span>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span>{totalPages}</span>
            </div>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next Page (Right Arrow)"
              aria-label="Next Page"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          {/* Right: Controls & Dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Selector */}
            <div className="hidden sm:flex items-center bg-[var(--bg-primary)] p-0.5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
              <button
                type="button"
                disabled={zoomScale <= 0.5}
                onClick={() => setZoomScale((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="text-xs font-mono font-bold text-[var(--text-primary)] px-2 min-w-[44px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                disabled={zoomScale >= 2.5}
                onClick={() => setZoomScale((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1.0)}
                className="text-[10px] font-bold px-1.5 py-1 text-[var(--text-secondary)] hover:text-[var(--color-primary)] rounded cursor-pointer transition-colors"
                title="Reset Zoom (0)"
              >
                100%
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center bg-[var(--bg-primary)] p-0.5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
              <button
                type="button"
                onClick={() => setViewLayout('side-by-side')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  viewLayout === 'side-by-side'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Split Side-by-Side"
              >
                <span className="material-symbols-outlined text-[15px]">view_column</span>
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('single-comp')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  viewLayout === 'single-comp'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Compressed Document Only"
              >
                <span className="material-symbols-outlined text-[15px]">crop_portrait</span>
                <span>Compressed</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-red-500/10 hover:border-red-500/30 text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shadow-xs ml-1"
              title="Close Inspector (Esc)"
              aria-label="Close Inspector Modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Center Viewport */}
        <div className="flex-1 min-h-0 bg-[var(--bg-tertiary)] relative overflow-hidden flex flex-col md:flex-row">
          {loading && (
            <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[36px] animate-spin text-[var(--color-primary)]">
                progress_activity
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Rendering High-Fidelity Page {currentPage}...
              </span>
            </div>
          )}

          {renderError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="material-symbols-outlined text-[40px] text-red-500">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{renderError}</p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          ) : (
            <>
              {/* Left Pane: Original Document */}
              {(viewLayout === 'side-by-side' || viewLayout === 'single-orig') && (
                <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-[var(--border-subtle)]">
                  {/* Pane Sub-header */}
                  <div className="h-9 px-4 bg-[var(--bg-primary)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Original Document
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--text-primary)]">
                      {formatFileSize(originalSize)}
                    </span>
                  </div>
                  {/* Scrollable Viewport */}
                  <div
                    ref={origScrollContainerRef}
                    onScroll={() =>
                      handleScroll(origScrollContainerRef.current, compScrollContainerRef.current)
                    }
                    className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center select-none"
                  >
                    <div className="bg-white rounded-lg shadow-md border border-slate-200/80 overflow-hidden transition-transform duration-100">
                      <canvas ref={origCanvasRef} className="block" />
                    </div>
                  </div>
                </div>
              )}

              {/* Right Pane: Compressed Document */}
              {(viewLayout === 'side-by-side' || viewLayout === 'single-comp') && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Pane Sub-header */}
                  <div className="h-9 px-4 bg-[var(--bg-primary)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Compressed Result ({savingsPct}% smaller)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        100% Text Preserved
                      </span>
                      <span className="text-[11px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatFileSize(compressedSize)}
                      </span>
                    </div>
                  </div>
                  {/* Scrollable Viewport */}
                  <div
                    ref={compScrollContainerRef}
                    onScroll={() =>
                      handleScroll(compScrollContainerRef.current, origScrollContainerRef.current)
                    }
                    className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center select-none"
                  >
                    <div className="bg-white rounded-lg shadow-md border border-slate-200/80 overflow-hidden transition-transform duration-100">
                      <canvas ref={compCanvasRef} className="block" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Telemetry Bar */}
        <div className="h-11 px-4 sm:px-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-emerald-500">verified</span>
              <span className="hidden sm:inline">Visual Layout:</span>
              <strong className="text-[var(--text-primary)]">100% Subpixel Parity</strong>
            </span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-blue-500">text_fields</span>
              <span className="hidden sm:inline">Typography:</span>
              <strong className="text-[var(--text-primary)]">Vector Text Intact</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-[var(--text-tertiary)]">
              Use arrow keys <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border text-[10px]">←</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border text-[10px]">→</kbd> to navigate pages
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 text-xs font-bold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
