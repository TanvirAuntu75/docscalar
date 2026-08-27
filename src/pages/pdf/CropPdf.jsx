import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { cropPdf } from '../../engines/pdf/cropPdf';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { formatFileSize } from '../../utils/constants';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CropPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // PDF Document State
  const [pdfDocument, setPdfDocument] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });

  // Crop Margins in Percentage (0 to 100)
  const [leftMargin, setLeftMargin] = useState(10);
  const [rightMargin, setRightMargin] = useState(10);
  const [topMargin, setTopMargin] = useState(10);
  const [bottomMargin, setBottomMargin] = useState(10);

  // Application Scope: 'all' | 'current' | 'range'
  const [scope, setScope] = useState('all');
  const [pageRangeStr, setPageRangeStr] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // Canvas Viewport Zoom & Drag States
  const [zoomScale, setZoomScale] = useState(1.0);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDraggingRef = useRef(null); // 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const dragStartRef = useRef({ x: 0, y: 0, left: 10, right: 10, top: 10, bottom: 10 });

  // Restore draft session on mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('crop-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.leftMargin !== undefined) setLeftMargin(draft.leftMargin);
          if (draft.rightMargin !== undefined) setRightMargin(draft.rightMargin);
          if (draft.topMargin !== undefined) setTopMargin(draft.topMargin);
          if (draft.bottomMargin !== undefined) setBottomMargin(draft.bottomMargin);
          if (draft.scope) setScope(draft.scope);
          if (draft.pageRangeStr) setPageRangeStr(draft.pageRangeStr);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Crop draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save draft session on state change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('crop-pdf', {
        files,
        leftMargin,
        rightMargin,
        topMargin,
        bottomMargin,
        scope,
        pageRangeStr,
        outputFileName
      });
    }
  }, [files, leftMargin, rightMargin, topMargin, bottomMargin, scope, pageRangeStr, outputFileName]);

  // Load PDF Document when active file changes
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePage(1);
      return;
    }

    if (activeFileIndex >= files.length) {
      setActiveFileIndex(0);
      return;
    }

    let isCancelled = false;
    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[activeFileIndex];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setActivePage(1);

        const baseName = file.name.replace(/\.[^.]+$/, '');
        setOutputFileName(`${baseName}_cropped.pdf`);
        setProcessing(false);
      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF document. It might be corrupted or password-protected.');
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // Render Current Page Canvas Preview
  useEffect(() => {
    if (!pdfDocument) return;

    let isCancelled = false;
    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.5 });
        setPageDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.warn('Error rendering PDF page preview:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, activePage]);

  // Margin Clamping Invariants
  const updateMargin = useCallback((type, value) => {
    const val = Math.max(0, Math.min(85, parseInt(value) || 0));
    if (type === 'left') {
      setLeftMargin(val);
      if (val + rightMargin >= 90) setRightMargin(90 - val);
    } else if (type === 'right') {
      setRightMargin(val);
      if (leftMargin + val >= 90) setLeftMargin(90 - val);
    } else if (type === 'top') {
      setTopMargin(val);
      if (val + bottomMargin >= 90) setBottomMargin(90 - val);
    } else if (type === 'bottom') {
      setBottomMargin(val);
      if (topMargin + val >= 90) setTopMargin(90 - val);
    }
  }, [leftMargin, rightMargin, topMargin, bottomMargin]);

  // Preset Handlers
  const applyPresetMargins = (left, right, top, bottom) => {
    setLeftMargin(left);
    setRightMargin(right);
    setTopMargin(top);
    setBottomMargin(bottom);
  };

  const applyAspectRatio = (ratioW, ratioH) => {
    const currentW = 100 - leftMargin - rightMargin;
    const targetH = Math.min(85, Math.round((currentW * ratioH) / ratioW));
    const padY = Math.max(0, Math.round((100 - targetH) / 2));
    setTopMargin(padY);
    setBottomMargin(padY);
  };

  // Mouse / Touch Drag-to-Crop Logic
  const handleDragStart = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handleType;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      left: leftMargin,
      right: rightMargin,
      top: topMargin,
      bottom: bottomMargin
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();

    const deltaXPercent = ((clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaYPercent = ((clientY - dragStartRef.current.y) / rect.height) * 100;

    const handle = isDraggingRef.current;
    const start = dragStartRef.current;

    if (handle === 'move') {
      const boxW = 100 - start.left - start.right;
      const boxH = 100 - start.top - start.bottom;

      let newLeft = Math.max(0, Math.min(100 - boxW, Math.round(start.left + deltaXPercent)));
      let newTop = Math.max(0, Math.min(100 - boxH, Math.round(start.top + deltaYPercent)));

      setLeftMargin(newLeft);
      setRightMargin(100 - newLeft - boxW);
      setTopMargin(newTop);
      setBottomMargin(100 - newTop - boxH);
    } else {
      if (handle.includes('w')) {
        const newLeft = Math.max(0, Math.min(85 - start.right, Math.round(start.left + deltaXPercent)));
        setLeftMargin(newLeft);
      }
      if (handle.includes('e')) {
        const newRight = Math.max(0, Math.min(85 - start.left, Math.round(start.right - deltaXPercent)));
        setRightMargin(newRight);
      }
      if (handle.includes('n')) {
        const newTop = Math.max(0, Math.min(85 - start.bottom, Math.round(start.top + deltaYPercent)));
        setTopMargin(newTop);
      }
      if (handle.includes('s')) {
        const newBottom = Math.max(0, Math.min(85 - start.top, Math.round(start.bottom - deltaYPercent)));
        setBottomMargin(newBottom);
      }
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = null;
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  };

  // Execute Crop
  const handleCrop = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const bounds = {
        xPercent: leftMargin / 100,
        yPercent: topMargin / 100,
        widthPercent: (100 - leftMargin - rightMargin) / 100,
        heightPercent: (100 - topMargin - bottomMargin) / 100
      };

      let targetPages = null;
      if (scope === 'current') {
        targetPages = [activePage - 1];
      } else if (scope === 'range' && pageRangeStr.trim()) {
        const indices = new Set();
        pageRangeStr.split(',').forEach((part) => {
          const r = part.trim().split('-');
          if (r.length === 2) {
            const start = parseInt(r[0]) - 1;
            const end = parseInt(r[1]) - 1;
            for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) indices.add(i);
          } else {
            const n = parseInt(part.trim()) - 1;
            if (!isNaN(n) && n >= 0 && n < totalPages) indices.add(n);
          }
        });
        targetPages = Array.from(indices);
      }

      const outputBlob = await cropPdf(files[activeFileIndex], bounds, setProgress, { targetPages });
      const finalName = outputFileName || `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_cropped.pdf`;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        croppedWidth: Math.round(pageDimensions.width * bounds.widthPercent),
        croppedHeight: Math.round(pageDimensions.height * bounds.heightPercent)
      });

      // Save to IndexedDB
      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Crop PDF', outputBlob);
      await clearStudioDraft('crop-pdf');
    } catch (err) {
      setError(err.message || 'Cropping execution failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('crop-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setPdfDocument(null);
    setTotalPages(0);
    setActivePage(1);
    setLeftMargin(10);
    setRightMargin(10);
    setTopMargin(10);
    setBottomMargin(10);
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const cropWidthPercent = 100 - leftMargin - rightMargin;
  const cropHeightPercent = 100 - topMargin - bottomMargin;

  return (
    <ToolPageLayout
      toolId="crop-pdf"
      title="Crop PDF"
      description="Crop document margins visually, trim headers/footers, or apply precise page boundaries."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Crop PDF Pages Online Free (100% Local Studio) | DocForge"
        description="Crop document margins visually with interactive drag handles. Fully private, adjusting page boundaries locally without uploading to server."
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
            {/* LEFT / CENTER: Interactive Crop Viewport & Canvas                          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Top Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
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
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                      </div>
                    )}

                    <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1 shadow-xs text-xs py-1">
                      <span className="material-symbols-outlined text-[15px]">add_circle</span>
                      <span>Add File</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                      />
                    </label>

                    {/* Page Navigator Capsule */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                          disabled={activePage === 1}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 cursor-pointer"
                          title="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold text-[var(--text-primary)] px-1">
                          {activePage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                          disabled={activePage === totalPages}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 cursor-pointer"
                          title="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preset Pills & Zoom Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="hidden lg:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyPresetMargins(5, 5, 5, 5)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        5% Trim
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetMargins(10, 10, 10, 10)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        10% Trim
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetMargins(5, 5, 15, 15)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Trim Header/Footer
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetMargins(0, 0, 0, 0)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Full Page
                      </button>
                    </div>

                    {/* Scale Zoom Slider */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_out</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-14 h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_in</span>
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

              {/* Central Visual Document Viewport */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                <div
                  ref={containerRef}
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'center center',
                    transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="relative inline-block shadow-2xl rounded-lg overflow-hidden bg-white max-w-full"
                >
                  {/* Base Rendered PDF Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="block max-h-[calc(100dvh-180px)] w-auto max-w-full pointer-events-none drop-shadow-md"
                  />

                  {/* Darkened Mask Outside Crop Bounds */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftMargin}%`,
                      top: `${topMargin}%`,
                      right: `${rightMargin}%`,
                      bottom: `${bottomMargin}%`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  />

                  {/* Interactive Crop Boundary Box */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftMargin}%`,
                      top: `${topMargin}%`,
                      width: `${cropWidthPercent}%`,
                      height: `${cropHeightPercent}%`,
                      border: '2px solid var(--color-primary)',
                      zIndex: 20
                    }}
                    onMouseDown={(e) => handleDragStart(e, 'move')}
                    onTouchStart={(e) => handleDragStart(e, 'move')}
                    className="cursor-move group"
                  >
                    {/* 3x3 Rule of Thirds Guides */}
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity">
                      <div className="border-r border-b border-white/60 border-dashed" />
                      <div className="border-r border-b border-white/60 border-dashed" />
                      <div className="border-b border-white/60 border-dashed" />
                      <div className="border-r border-b border-white/60 border-dashed" />
                      <div className="border-r border-b border-white/60 border-dashed" />
                      <div className="border-b border-white/60 border-dashed" />
                      <div className="border-r border-white/60 border-dashed" />
                      <div className="border-r border-white/60 border-dashed" />
                      <div />
                    </div>

                    {/* Central Dimension Pill */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
                      {cropWidthPercent}% × {cropHeightPercent}%
                    </div>

                    {/* 8-Point Bounding Box Resize Handles */}
                    {/* NW */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'nw')}
                      onTouchStart={(e) => handleDragStart(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[var(--color-primary)] rounded-full cursor-nwse-resize shadow-md z-30"
                    />
                    {/* N */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'n')}
                      onTouchStart={(e) => handleDragStart(e, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-[var(--color-primary)] rounded-sm cursor-ns-resize shadow-md z-30"
                    />
                    {/* NE */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'ne')}
                      onTouchStart={(e) => handleDragStart(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[var(--color-primary)] rounded-full cursor-nesw-resize shadow-md z-30"
                    />
                    {/* E */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'e')}
                      onTouchStart={(e) => handleDragStart(e, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-4 bg-white border-2 border-[var(--color-primary)] rounded-sm cursor-ew-resize shadow-md z-30"
                    />
                    {/* SE */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'se')}
                      onTouchStart={(e) => handleDragStart(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[var(--color-primary)] rounded-full cursor-nwse-resize shadow-md z-30"
                    />
                    {/* S */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 's')}
                      onTouchStart={(e) => handleDragStart(e, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-[var(--color-primary)] rounded-sm cursor-ns-resize shadow-md z-30"
                    />
                    {/* SW */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'sw')}
                      onTouchStart={(e) => handleDragStart(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[var(--color-primary)] rounded-full cursor-nesw-resize shadow-md z-30"
                    />
                    {/* W */}
                    <div
                      onMouseDown={(e) => handleDragStart(e, 'w')}
                      onTouchStart={(e) => handleDragStart(e, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-4 bg-white border-2 border-[var(--color-primary)] rounded-sm cursor-ew-resize shadow-md z-30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">crop</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Crop Settings
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Page {activePage} of {totalPages}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Margin Steppers & Sliders */}
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Crop Margins (%)
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Top */}
                    <div className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-[var(--text-secondary)]">Top</span>
                        <span className="font-extrabold text-[var(--color-primary)]">{topMargin}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={topMargin}
                        onChange={(e) => updateMargin('top', e.target.value)}
                        className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </div>

                    {/* Bottom */}
                    <div className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-[var(--text-secondary)]">Bottom</span>
                        <span className="font-extrabold text-[var(--color-primary)]">{bottomMargin}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={bottomMargin}
                        onChange={(e) => updateMargin('bottom', e.target.value)}
                        className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </div>

                    {/* Left */}
                    <div className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-[var(--text-secondary)]">Left</span>
                        <span className="font-extrabold text-[var(--color-primary)]">{leftMargin}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={leftMargin}
                        onChange={(e) => updateMargin('left', e.target.value)}
                        className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </div>

                    {/* Right */}
                    <div className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-[var(--text-secondary)]">Right</span>
                        <span className="font-extrabold text-[var(--color-primary)]">{rightMargin}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={rightMargin}
                        onChange={(e) => updateMargin('right', e.target.value)}
                        className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Aspect Ratio Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Aspect Ratio
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyAspectRatio(1, 1)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      1:1 Square
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAspectRatio(4, 3)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      4:3 Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAspectRatio(16, 9)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      16:9 Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAspectRatio(1, 1.414)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      A4 Ratio
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAspectRatio(1, 1.294)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetMargins(10, 10, 10, 10)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      Reset 10%
                    </button>
                  </div>
                </div>

                {/* 3. Page Scope */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Apply Crop To
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2.5 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        name="cropScope"
                        checked={scope === 'all'}
                        onChange={() => setScope('all')}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        All Pages ({totalPages} pages)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        name="cropScope"
                        checked={scope === 'current'}
                        onChange={() => setScope('current')}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Current Page Only (Page {activePage})
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        name="cropScope"
                        checked={scope === 'range'}
                        onChange={() => setScope('range')}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Custom Page Range
                      </span>
                    </label>

                    {scope === 'range' && (
                      <input
                        type="text"
                        placeholder="e.g. 1-4, 7, 10"
                        value={pageRangeStr}
                        onChange={(e) => setPageRangeStr(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none mt-1"
                      />
                    )}
                  </div>
                </div>

                {/* 4. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_cropped.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 5. Summary Metrics Box */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Crop Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Crop Area</span>
                      <span className="font-bold text-[var(--color-primary)]">
                        {cropWidthPercent}% × {cropHeightPercent}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Target Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {scope === 'all' ? `${totalPages} Pages` : scope === 'current' ? '1 Page' : 'Range Filtered'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Applying crop boundaries...
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
                  onClick={handleCrop}
                  disabled={processing || totalPages === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Cropping ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Crop PDF</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
                PDF Successfully Cropped!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Document margins have been trimmed and page boundaries updated.
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
                <span>Download Cropped PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Crop Another</span>
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

