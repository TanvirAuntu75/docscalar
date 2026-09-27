import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { addWatermark } from '../../engines/pdf/addWatermark';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import useSmartCropper from '../../hooks/useSmartCropper';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const WATERMARK_PRESETS = [
  'CONFIDENTIAL',
  'DRAFT',
  'SAMPLE',
  'APPROVED',
  'TOP SECRET',
  'DO NOT COPY',
  'ORIGINAL'
];

const COLOR_PRESETS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Black', hex: '#000000' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' }
];

export default function AddWatermark() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Watermark Configuration State
  const [type, setType] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState('Helvetica'); // 'Helvetica' | 'Times' | 'Courier'
  const [color, setColor] = useState('#EF4444');
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [size, setSize] = useState(50); // fontSize for text (pt), % scale for image
  const [position, setPosition] = useState('center'); // 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  const [repeatTile, setRepeatTile] = useState(false);
  const [targetScope, setTargetScope] = useState('all'); // 'all' | 'current' | 'range'
  const [pageRange, setPageRange] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // Image watermark state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Canvas Viewport State
  const { dpi, setDpi, getScaleMultiplier } = useDpiQuality();
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Debounce high-DPI PDF rasterization to decouple smooth 120 FPS GPU scaling from heavy canvas redraws
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRenderZoom(zoomScale);
    }, 200);
    return () => clearTimeout(handler);
  }, [zoomScale]);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const viewportContainerRef = useRef(null);
  const imageInputRef = useRef(null);
  const cropper = useSmartCropper({ canvasRef, totalPages });

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef: viewportContainerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('add-watermark');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.type) setType(draft.type);
          if (draft.text) setText(draft.text);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.color) setColor(draft.color);
          if (draft.opacity !== undefined) setOpacity(draft.opacity);
          if (draft.rotation !== undefined) setRotation(draft.rotation);
          if (draft.size !== undefined) setSize(draft.size);
          if (draft.position) setPosition(draft.position);
          if (draft.repeatTile !== undefined) setRepeatTile(draft.repeatTile);
          if (draft.targetScope) setTargetScope(draft.targetScope);
          if (draft.pageRange) setPageRange(draft.pageRange);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Add watermark draft recovery failed:', err);
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
      saveStudioDraft('add-watermark', {
        files,
        type,
        text,
        fontFamily,
        color,
        opacity,
        rotation,
        size,
        position,
        repeatTile,
        targetScope,
        pageRange,
        outputFileName
      });
    }
  }, [files, type, text, fontFamily, color, opacity, rotation, size, position, repeatTile, targetScope, pageRange, outputFileName]);

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // 3. Render Active PDF Page to Live Viewport Canvas
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setCurrentPage(1);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const renderPage = async () => {
      setCanvasLoading(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
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

        const scaleMultiplier = getScaleMultiplier(debouncedRenderZoom);
        const viewport = page.getViewport({ scale: scaleMultiplier });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Universal Smart Cropper: Content-aware border detection (3-pass pipeline)
          const detection = cropper.runDetection(safePage, baseViewport);

          // If Smart Cropper is active, clean and refit the preview canvas
          if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
            cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
          }
        }

        if (!isCancelled) {
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_watermarked.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render PDF page for watermark preview:', err);
          setCanvasLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex, currentPage, debouncedRenderZoom, dpi, cropper.isActive, cropper.cleanMargin, cropper.enabledEdges, getScaleMultiplier]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG).');
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setType('image');
    setError(null);
  };

  // Main Apply Watermark Action
  const handleApplyWatermark = async () => {
    if (!files.length) return;
    if (type === 'image' && !imageFile) {
      setError('Please upload an image/logo watermark first.');
      return;
    }
    if (type === 'text' && !text.trim()) {
      setError('Please enter watermark text.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Calculate target page indices
      let targetPages = null;
      if (targetScope === 'current') {
        targetPages = [currentPage - 1];
      } else if (targetScope === 'range') {
        if (!pageRange.trim()) {
          setError('Please specify a valid page range (e.g. 1-3, 5).');
          setProcessing(false);
          return;
        }
        const indices = new Set();
        pageRange.split(',').forEach((part) => {
          const r = part.trim().split('-');
          if (r.length === 2) {
            const start = parseInt(r[0]) - 1;
            const end = parseInt(r[1]) - 1;
            for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
              indices.add(i);
            }
          } else {
            const n = parseInt(part.trim()) - 1;
            if (!isNaN(n) && n >= 0 && n < totalPages) indices.add(n);
          }
        });
        targetPages = Array.from(indices);
        if (targetPages.length === 0) {
          setError('No valid pages found in the specified range.');
          setProcessing(false);
          return;
        }
      }

      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(files[activeFileIndex], pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());

      const options = {
        type,
        text,
        fontFamily,
        color,
        opacity,
        rotation,
        size,
        position,
        repeatTile,
        targetPages,
        imageFile: type === 'image' ? imageFile : null,
        ...cropperOptions
      };

      const outputBlob = await addWatermark(files[activeFileIndex], options, setProgress);
      const defaultName = `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_watermarked.pdf`;
      const finalName = outputFileName || defaultName;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size
      });

      // Save to IndexedDB
      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Add Watermark', outputBlob);
      await clearStudioDraft('add-watermark');
    } catch (err) {
      setError(err.message || 'Watermarking failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('add-watermark');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setType('text');
    setText('CONFIDENTIAL');
    setColor('#EF4444');
    setOpacity(0.3);
    setRotation(45);
    setSize(50);
    setPosition('center');
    setRepeatTile(false);
    setTargetScope('all');
    setPageRange('');
    setOutputFileName('');
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  // Dynamic CSS Styles for Live Watermark Overlay Viewport
  const getWatermarkPositionClass = () => {
    switch (position) {
      case 'top-left':
        return 'top-8 left-8';
      case 'top-right':
        return 'top-8 right-8';
      case 'bottom-left':
        return 'bottom-8 left-8';
      case 'bottom-right':
        return 'bottom-8 right-8';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <ToolPageLayout
      toolId="add-watermark"
      title="Add PDF Watermark"
      description="Stamp custom text, confidentiality marks, or logos across your PDF documents."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Add Watermark to PDF Online Free — Watermark PDF Pages | DocScalar"
        description="Add text or image watermarks to PDF files securely. Stamp confidential markers or logos with high precision and privacy."
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
            {/* LEFT / CENTER: Interactive High-DPI Document Canvas Viewport              */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between gap-3 overflow-visible">
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
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
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[180px]" title={files[0]?.name}>
                          {files[0]?.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                          ({formatFileSize(files[0]?.size || 0)})
                        </span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-2 py-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Previous Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <span className="text-xs font-bold px-2.5 text-[var(--text-primary)] select-none">
                        Page {currentPage} / {totalPages || 1}
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
                  </div>

                  {/* Document Actions, Zoom Controls & Workspace Reset */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Top Toolbar Universal Smart Cropper Button */}
                    <SmartCropperToolbarButton cropper={cropper} />

                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
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

                    {/* Enhanced Quality / DPI Selector */}
                    <DpiQualitySelector
                      dpi={dpi}
                      onChange={setDpi}
                      align="right"
                      compact={true}
                      dropDirection="down"
                    />

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

                {/* Universal Smart Cropper Banners */}
                {cropper.hasDetectedBorders && !cropper.isActive && (
                  <div className="px-4 py-2.5 bg-emerald-500/10 border-t border-emerald-500/25 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-900 dark:text-emerald-200 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">crop</span>
                      <span>
                        <strong>Scan border artifacts detected</strong> — {cropper.detectionReason}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cropper.activate()}
                      className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-xs text-[11px] flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                      Clean Borders
                    </button>
                  </div>
                )}

                {cropper.isActive && (
                  <div className="px-4 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-800 dark:text-emerald-300 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>
                        Smart Cropper Active: Scan borders removed and content refitted with clean {cropper.cleanMargin}pt margins.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cropper.revert()}
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Revert to Original
                    </button>
                  </div>
                )}

                {cropper.isInvertedDocument && (
                  <div className="px-4 py-1.5 bg-amber-500/8 border-t border-amber-500/20 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300 animate-[fadeIn_0.15s_ease-out]">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">info</span>
                    <span>Dark/inverted background detected — auto-crop disabled to protect document design.</span>
                  </div>
                )}
              </div>

              {/* Viewport Canvas Frame with Live WYSIWYG Watermark Overlay */}
              <div ref={viewportContainerRef} className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
                <div
                  className="relative my-auto bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  {/* Smart Cropper Clean Margins Refit Outline */}
                  {cropper.isActive && (
                    <div
                      className="absolute border border-dashed border-emerald-500/60 pointer-events-none z-10"
                      style={{
                        inset: `${(cropper.cleanMargin ?? 0) * zoomScale}px`
                      }}
                    >
                      <span className="absolute top-1 right-2 text-[9px] font-bold text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/90 dark:text-emerald-300 px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Smart Cropper Active{cropper.cleanMargin ? ` (${cropper.cleanMargin}pt)` : ''}
                      </span>
                    </div>
                  )}

                  {/* Underlying PDF Page Canvas */}
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
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Rendering high-DPI page preview...</span>
                    </div>
                  )}

                  {/* Live WYSIWYG Watermark Overlay */}
                  {repeatTile ? (
                    /* 3x3 Tile Grid */
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none p-4">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-center overflow-hidden">
                          {type === 'text' ? (
                            <span
                              style={{
                                color,
                                opacity,
                                transform: `rotate(${rotation}deg)`,
                                fontSize: `${size * 0.7 * zoomScale}px`,
                                fontFamily: fontFamily === 'Times' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
                                fontWeight: 800,
                                lineHeight: 1,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {text || 'CONFIDENTIAL'}
                            </span>
                          ) : imagePreviewUrl ? (
                            <img
                              src={imagePreviewUrl}
                              alt="Watermark preview"
                              style={{
                                opacity,
                                transform: `rotate(${rotation}deg)`,
                                width: `${size * 0.7 * zoomScale}%`,
                                maxHeight: '80%',
                                objectContain: 'contain'
                              }}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single Positioned Watermark */
                    <div className={`absolute ${getWatermarkPositionClass()} pointer-events-none transition-all duration-150`}>
                      {type === 'text' ? (
                        <span
                          style={{
                            color,
                            opacity,
                            transform: `rotate(${rotation}deg)`,
                            fontSize: `${size * zoomScale}px`,
                            fontFamily: fontFamily === 'Times' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
                            fontWeight: 800,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            transformOrigin: 'center center'
                          }}
                        >
                          {text || 'CONFIDENTIAL'}
                        </span>
                      ) : imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Watermark preview"
                          style={{
                            opacity,
                            transform: `rotate(${rotation}deg)`,
                            width: `${(pageDimensions.width * (size / 100)) * zoomScale}px`,
                            objectContain: 'contain',
                            display: 'inline-block',
                            transformOrigin: 'center center'
                          }}
                        />
                      ) : (
                        <div className="p-4 rounded-xl border-2 border-dashed border-slate-400 bg-slate-100/60 text-slate-500 text-xs font-semibold">
                          Upload an image to preview watermark
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">branding_watermark</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Watermark Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Watermark Mode Type Switcher */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Watermark Type
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('text')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        type === 'text'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">title</span>
                      <span>Text Stamp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('image')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        type === 'image'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">image</span>
                      <span>Image / Logo</span>
                    </button>
                  </div>
                </div>

                {/* 2. Text Configuration */}
                {type === 'text' ? (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Watermark Text
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. CONFIDENTIAL"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-bold"
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {WATERMARK_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setText(p)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                              text === p
                                ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Font Typography
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                      >
                        <option value="Helvetica">Helvetica Bold (Modern Sans)</option>
                        <option value="Times">Times Roman Bold (Formal Serif)</option>
                        <option value="Courier">Courier Bold (Typewriter Monospace)</option>
                      </select>
                    </div>

                    {/* Color Presets */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Color
                        </label>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setColor(c.hex)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              color.toLowerCase() === c.hex.toLowerCase()
                                ? 'scale-110 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                                : 'border-white dark:border-slate-800 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Image / Logo Upload Section */
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Upload Logo / Stamp
                    </label>
                    <label className="p-4 border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-2xl flex flex-col items-center justify-center gap-2 bg-[var(--bg-secondary)] cursor-pointer transition-colors">
                      {imageFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="material-symbols-outlined text-[24px] text-emerald-500">check_circle</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[200px]">
                            {imageFile.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">Click to change image</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[28px] text-[var(--color-primary)]">
                            add_photo_alternate
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">Choose Image</span>
                          <span className="text-[10px]">PNG, JPG, or SVG</span>
                        </div>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleImageUpload}
                        title=""
                        tabIndex={-1}
                      />
                    </label>
                  </div>
                )}

                {/* 3. Dials: Opacity, Size, Rotation */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  {/* Opacity Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Opacity
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Size Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {type === 'text' ? 'Font Size' : 'Image Scale'}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {size}
                        {type === 'text' ? 'pt' : '%'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={type === 'text' ? 14 : 10}
                      max={type === 'text' ? 120 : 100}
                      step="2"
                      value={size}
                      onChange={(e) => setSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Rotation Angle Dial */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Rotation Angle
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{rotation}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={rotation}
                        onChange={(e) => setRotation(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRotation(0)}
                          className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded font-semibold text-[var(--text-secondary)]"
                        >
                          0°
                        </button>
                        <button
                          type="button"
                          onClick={() => setRotation(45)}
                          className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded font-semibold text-[var(--text-secondary)]"
                        >
                          45°
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Placement & Repetition */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Placement & Position
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {[
                      { id: 'top-left', label: 'Top Left' },
                      { id: 'top-right', label: 'Top Right' },
                      { id: 'center', label: 'Center' },
                      { id: 'bottom-left', label: 'Bottom Left' },
                      { id: 'bottom-right', label: 'Bottom Right' }
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => {
                          setPosition(pos.id);
                          setRepeatTile(false);
                        }}
                        className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                          position === pos.id && !repeatTile
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRepeatTile(!repeatTile)}
                      className={`p-1.5 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                        repeatTile
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      3×3 Tile Grid
                    </button>
                  </div>
                </div>

                {/* 5. Target Scope */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Apply To
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setTargetScope('all')}
                      className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        targetScope === 'all'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      All Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScope('current')}
                      className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        targetScope === 'current'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      Current Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetScope('range')}
                      className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        targetScope === 'range'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      Page Range
                    </button>
                  </div>

                  {targetScope === 'range' && (
                    <input
                      type="text"
                      placeholder="e.g. 1-3, 5"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  )}
                </div>

                {/* Universal Smart Cropper Panel */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <SmartCropperPanel
                    cropper={cropper}
                    totalPages={totalPages}
                    onActivate={() => {}}
                    onRevert={() => {}}
                  />
                </div>

                {/* 6. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_watermarked.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Baking watermark...
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
                  onClick={handleApplyWatermark}
                  disabled={processing || (type === 'image' && !imageFile)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Applying ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Apply Watermark</span>
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
                Watermark Successfully Applied!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your watermark has been embedded into the PDF structure.
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
                <span>Download Watermarked PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Watermark Another PDF</span>
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
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
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
