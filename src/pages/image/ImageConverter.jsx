import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import {
  convertImageFormat,
  batchConvertImages,
  SUPPORTED_IMAGE_FORMATS,
  COLOR_MODES,
  calculateOptimalDimensions
} from '../../engines/image/convertFormat';
import { useAuth } from '../../context/AuthContext';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  FileCheck,
  LayoutGrid,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  SplitSquareVertical,
  Layers,
  Sliders,
  Archive,
  Plus,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  Printer,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
  MoveLeft,
  MoveRight
} from 'lucide-react';

export default function ImageConverter() {
  const { isPro } = useAuth();
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [naturalDims, setNaturalDims] = useState([]); // [{ width, height, aspect, mp }]

  // Conversion Configuration State
  const [targetFormat, setTargetFormat] = useState('png');
  const [quality, setQuality] = useState(0.92);
  const [backgroundMatte, setBackgroundMatte] = useState('transparent');
  const [colorMode, setColorMode] = useState('original'); // 'original' | 'grayscale' | 'invert'
  const [scalePreset, setScalePreset] = useState('1.0'); // '1.0' | '0.75' | '0.5' | '0.25' | '2.0' | 'max_1920' | 'max_1080'
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Pro Features State
  const [proMultiFormat, setProMultiFormat] = useState(false);
  const [proPrintDpi, setProPrintDpi] = useState(false);
  const [proExifScrubber, setProExifScrubber] = useState(true);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.35);

  // Viewport & Interactive State
  const [viewMode, setViewMode] = useState('inspect'); // 'inspect' | 'gallery'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [compareSliderPos, setCompareSliderPos] = useState(50); // 0 - 100 percentage
  const [isComparing, setIsComparing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Processing & Results State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const compareContainerRef = useRef(null);
  const isDraggingSlider = useRef(false);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('image-converter');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'image.png', {
              type: f.type || 'image/png',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.targetFormat) setTargetFormat(draft.targetFormat);
          if (draft.quality !== undefined) setQuality(draft.quality);
          if (draft.backgroundMatte) setBackgroundMatte(draft.backgroundMatte);
          if (draft.colorMode) setColorMode(draft.colorMode);
          if (draft.scalePreset) setScalePreset(draft.scalePreset);
        }
      } catch (err) {
        console.warn('Image Converter draft recovery failed:', err);
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
      saveStudioDraft('image-converter', {
        files,
        targetFormat,
        quality,
        backgroundMatte,
        colorMode,
        scalePreset
      });
    }
  }, [files, targetFormat, quality, backgroundMatte, colorMode, scalePreset]);

  // 3. Generate Object URLs & Measure Natural Dimensions
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    // Measure natural dimensions for each image
    const dimsPromises = urls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 800;
          const h = img.naturalHeight || 600;
          const aspect = (w / h).toFixed(2);
          const mp = ((w * h) / 1000000).toFixed(1);
          resolve({ width: w, height: h, aspect, mp });
        };
        img.onerror = () => {
          resolve({ width: 800, height: 600, aspect: '1.33', mp: '0.5' });
        };
        img.src = url;
      });
    });

    Promise.all(dimsPromises).then((dims) => {
      setNaturalDims(dims);
    });

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  // 4. Keyboard Shortcuts (Arrow Left/Right to cycle images, + / - to zoom, Escape to reset)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        setActiveFileIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveFileIndex((prev) => Math.min(files.length - 1, prev + 1));
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((prev) => Math.min(2.5, +(prev + 0.1).toFixed(1)));
      } else if (e.key === '-' || e.key === '_') {
        setZoomScale((prev) => Math.max(0.5, +(prev - 0.1).toFixed(1)));
      } else if (e.key === '0' || e.key === 'Escape') {
        setZoomScale(1.0);
        setIsComparing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files.length]);

  // 5. Add More Files
  const handleAddMoreFiles = (e) => {
    const added = Array.from(e.target.files || []);
    if (!added.length) return;
    setFiles((prev) => [...prev, ...added]);
    // Clear input so same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  // 6. Remove Single File
  const handleRemoveFile = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    setFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeFileIndex >= updated.length) {
        setActiveFileIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  // 7. Move File Position (Reorder)
  const handleMoveFile = (fromIndex, toIndex, e) => {
    if (e) e.stopPropagation();
    if (toIndex < 0 || toIndex >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    if (activeFileIndex === fromIndex) {
      setActiveFileIndex(toIndex);
    }
  };

  // 8. Interactive Comparison Slider Touch & Mouse Handlers
  const handleSliderMove = useCallback((clientX) => {
    if (!compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = Math.round((offsetX / rect.width) * 100);
    setCompareSliderPos(percent);
  }, []);

  const handleMouseDownSlider = () => {
    isDraggingSlider.current = true;
  };

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
    };
    const handleWindowTouchMove = (e) => {
      if (isDraggingSlider.current && e.touches && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };
    const handleWindowMouseUp = () => {
      isDraggingSlider.current = false;
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [handleSliderMove]);

  // 9. Batch Image Conversion Execution
  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);

    try {
      // Resolve scale and constraints from preset
      let numericScale = 1.0;
      let maxWidthConstraint;
      let maxHeightConstraint;

      if (scalePreset === '0.75') numericScale = 0.75;
      else if (scalePreset === '0.5') numericScale = 0.5;
      else if (scalePreset === '0.25') numericScale = 0.25;
      else if (scalePreset === '2.0') numericScale = 2.0;
      else if (scalePreset === 'max_1920') {
        maxWidthConstraint = 1920;
        maxHeightConstraint = 1080;
      } else if (scalePreset === 'max_1080') {
        maxWidthConstraint = 1080;
        maxHeightConstraint = 1080;
      }

      const conversionOptions = {
        targetFormat,
        quality,
        backgroundMatte,
        colorMode,
        scale: numericScale,
        maxWidth: maxWidthConstraint,
        maxHeight: maxHeightConstraint,
        rotation,
        flipH,
        flipV,
        watermarkText: watermarkText.trim(),
        watermarkOpacity,
        proMultiFormat: isPro && proMultiFormat,
        proPrintDpi: isPro && proPrintDpi,
        proExifScrubber: isPro && proExifScrubber
      };

      const convertedResults = await batchConvertImages(
        files,
        conversionOptions,
        (p) => setProgress(p)
      );

      let saveBlob;
      let saveName;
      let saveType;
      const totalOrigSize = files.reduce((acc, f) => acc + f.size, 0);

      if (convertedResults.length === 1) {
        saveBlob = convertedResults[0].blob;
        saveName = convertedResults[0].name;
        saveType = convertedResults[0].blob.type;
      } else {
        const zip = new JSZip();
        convertedResults.forEach((r) => zip.file(r.name, r.blob));
        saveBlob = await zip.generateAsync({ type: 'blob' });
        saveName = proMultiFormat
          ? `multi_format_bundle.zip`
          : `converted_${targetFormat}_bundle.zip`;
        saveType = 'application/zip';
      }

      const totalOutSize = saveBlob.size;
      const savingsPercent = totalOrigSize > 0
        ? Math.round(((totalOrigSize - totalOutSize) / totalOrigSize) * 100)
        : 0;

      setResult({
        items: convertedResults,
        bundleBlob: saveBlob,
        bundleName: saveName,
        totalOrigSize,
        totalOutSize,
        savingsPercent,
        targetFormat: proMultiFormat ? 'multi' : targetFormat
      });

      await saveFile(saveName, saveBlob.size, saveType, 'Image Converter', saveBlob);
      await clearStudioDraft('image-converter');
    } catch (err) {
      setError(err.message || 'An error occurred during image conversion.');
    } finally {
      setProcessing(false);
    }
  };

  // 10. Downloads & Clipboard Actions
  const downloadAll = () => {
    if (!result) return;
    if (result.items.length === 1) {
      saveAs(result.items[0].blob, result.items[0].name);
    } else if (result.bundleBlob) {
      saveAs(result.bundleBlob, result.bundleName);
    }
  };

  const downloadSingleItem = (item, e) => {
    if (e) e.stopPropagation();
    saveAs(item.blob, item.name);
  };

  const copyImageToClipboard = async (item, index, e) => {
    if (e) e.stopPropagation();
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const mime = item.blob.type || 'image/png';
        // Browsers require image/png for clipboard image writes
        if (mime === 'image/png') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': item.blob })]);
        } else {
          // Convert to PNG blob for clipboard compatibility
          const { blob: pngBlob } = await convertImageFormat(item.blob, 'png', 1.0);
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        }
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleReconvert = () => {
    setResult(null);
    setProgress(0);
    setError(null);
  };

  const resetWorkspace = () => {
    clearStudioDraft('image-converter');
    setFiles([]);
    setActiveFileIndex(0);
    setNaturalDims([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setIsComparing(false);
  };

  const currentFile = files[activeFileIndex] || files[0];
  const currentPreviewUrl = previewUrls[activeFileIndex] || previewUrls[0];
  const currentDims = naturalDims[activeFileIndex] || { width: 800, height: 600, aspect: '1.33', mp: '0.5' };
  const selectedFormatObj = SUPPORTED_IMAGE_FORMATS.find((f) => f.id === targetFormat) || SUPPORTED_IMAGE_FORMATS[0];

  return (
    <ToolPageLayout
      toolId="image-converter"
      title="Image Converter Studio"
      description="Convert images between PNG, JPG, WEBP, BMP, ICO, and PDF formats with subpixel fidelity, batch processing, and privacy-first local encoding."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Image Converter Online Free — Convert PNG, JPG, WEBP, BMP, ICO, PDF | DocScalar"
        description="Convert single or batch images to PNG, JPG, WEBP, BMP, ICO, and PDF online for free. 100% private in-browser WebAssembly processing with zero server uploads."
      />

      {/* Hidden File Input for Adding More Images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAddMoreFiles}
        multiple
        accept="image/*"
        className="hidden"
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept="image/*"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Live Image Canvas Stage                        */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Top Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-3 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add More Files Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-xs font-semibold text-[var(--text-primary)] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title="Add more images to batch"
                    >
                      <Plus size={14} className="text-[var(--color-primary)]" />
                      <span>Add Images</span>
                    </button>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-medium)] shrink-0">
                        <ImageIcon size={14} className="text-[var(--color-primary)]" />
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value, 10))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[150px] sm:max-w-[190px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {i + 1}. {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                        <ImageIcon size={14} className="text-[var(--color-primary)]" />
                        <span className="truncate max-w-[150px] sm:max-w-[190px]">{currentFile?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    {/* Target Format Capsule */}
                    <div className="h-8 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] shrink-0">
                      <span className="text-[var(--text-secondary)] font-medium">To:</span>
                      <span className="text-[var(--color-primary)] font-bold">
                        {proMultiFormat && isPro ? 'Triple Bundle (PNG+JPG+WEBP)' : selectedFormatObj.label}
                      </span>
                    </div>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    {/* View Mode Toggle */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('inspect')}
                        className={`h-7 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'inspect'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Maximize2 size={13} />
                        <span>Inspect</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('gallery')}
                        className={`h-7 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'gallery'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <LayoutGrid size={13} />
                        <span>Gallery ({files.length})</span>
                      </button>
                    </div>

                    {/* Quick Image Paging Arrows */}
                    {files.length > 1 && (
                      <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)] text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveFileIndex((p) => Math.max(0, p - 1))}
                          disabled={activeFileIndex <= 0}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                          title="Previous image (ArrowLeft)"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="font-semibold text-[var(--text-primary)] px-1 select-none text-[11px]">
                          {activeFileIndex + 1}/{files.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveFileIndex((p) => Math.min(files.length - 1, p + 1))}
                          disabled={activeFileIndex >= files.length - 1}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                          title="Next image (ArrowRight)"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    {/* Split View Compare Toggle */}
                    {viewMode === 'inspect' && (
                      <button
                        type="button"
                        onClick={() => setIsComparing((prev) => !prev)}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isComparing
                            ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        title="Toggle before/after split comparison"
                      >
                        <SplitSquareVertical size={14} />
                        <span className="hidden sm:inline">Compare</span>
                      </button>
                    )}

                    {/* Zoom Controls */}
                    <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.max(0.5, +(prev - 0.1).toFixed(1)))}
                        className="p-1 hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                        title="Zoom out (-)"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-center select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.min(2.5, +(prev + 0.1).toFixed(1)))}
                        className="p-1 hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                        title="Zoom in (+)"
                      >
                        <ZoomIn size={13} />
                      </button>
                    </div>

                    {/* Reset Workspace */}
                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Reset workspace and clear files"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center relative bg-pattern select-none">
                {viewMode === 'inspect' ? (
                  /* Single Image Inspect Stage */
                  <div
                    className="relative bg-[var(--bg-primary)] shadow-2xl rounded-3xl border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col items-center gap-4 transition-transform duration-150 origin-center max-w-4xl w-full"
                    style={{ transform: `scale(${zoomScale})` }}
                  >
                    {/* Checkerboard Image Frame */}
                    <div
                      ref={compareContainerRef}
                      className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] max-h-[480px] w-full flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]"
                    >
                      {/* Base / Original Image */}
                      <img
                        src={currentPreviewUrl}
                        alt={currentFile?.name}
                        className="max-w-full max-h-[440px] object-contain rounded-xl select-none pointer-events-none"
                        style={{
                          transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                          filter: colorMode === 'grayscale' ? 'grayscale(100%)' : colorMode === 'invert' ? 'invert(100%)' : 'none'
                        }}
                      />

                      {/* Interactive Split Comparison Overlay */}
                      {isComparing && (
                        <>
                          <div
                            className="absolute inset-0 overflow-hidden flex items-center justify-center select-none pointer-events-none"
                            style={{ clipPath: `inset(0 ${100 - compareSliderPos}% 0 0)` }}
                          >
                            <img
                              src={currentPreviewUrl}
                              alt="Original"
                              className="max-w-full max-h-[440px] object-contain rounded-xl select-none pointer-events-none block"
                              style={{
                                transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`
                              }}
                            />
                            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-bold z-10 shadow-sm">
                              Original
                            </div>
                          </div>

                          <div className="absolute top-3 right-3 bg-[var(--color-primary)] text-white px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm pointer-events-none z-10">
                            Preview ({colorMode !== 'original' ? COLOR_MODES.find(c => c.id === colorMode)?.label : selectedFormatObj.label})
                          </div>

                          {/* Split Drag Divider Line */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] cursor-ew-resize flex items-center justify-center z-20 touch-none"
                            style={{ left: `${compareSliderPos}%` }}
                            onMouseDown={handleMouseDownSlider}
                            onTouchStart={handleMouseDownSlider}
                          >
                            <div className="w-6 h-6 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center border border-slate-300 pointer-events-none">
                              <ArrowLeftRight size={12} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Image Diagnostics Pill (Dimensions, Aspect Ratio, Megapixels, Size) */}
                    <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] flex-wrap justify-center">
                      <span className="font-bold text-[var(--color-primary)] truncate max-w-[180px]">{currentFile?.name}</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span>{currentDims.width} × {currentDims.height} px</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span>{currentDims.aspect}:1 ({currentDims.mp} MP)</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span>{formatFileSize(currentFile?.size || 0)}</span>
                    </div>

                    {/* Canvas Quick Actions: Rotate, Flip, Delete */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Rotate 90 degrees clockwise"
                      >
                        <RotateCw size={13} />
                        <span>Rotate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlipH((prev) => !prev)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                          flipH
                            ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                        title="Flip horizontally"
                      >
                        <FlipHorizontal size={13} />
                        <span>Flip H</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlipV((prev) => !prev)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                          flipV
                            ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                        title="Flip vertically"
                      >
                        <FlipVertical size={13} />
                        <span>Flip V</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFile(activeFileIndex, e)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-600 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Remove this image from batch"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Batch Thumbnail Gallery Stage */
                  <div className="max-w-5xl w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {files.map((file, idx) => {
                        const dims = naturalDims[idx] || { width: 0, height: 0 };
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveFileIndex(idx);
                              setViewMode('inspect');
                            }}
                            className={`group relative bg-[var(--bg-primary)] p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                              activeFileIndex === idx
                                ? 'border-[var(--color-primary)] shadow-md ring-2 ring-[var(--color-primary)]/20'
                                : 'border-[var(--border-subtle)] hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            {/* Card Thumbnail */}
                            <div className="w-full aspect-square bg-[var(--bg-secondary)] rounded-xl overflow-hidden flex items-center justify-center relative">
                              <img
                                src={previewUrls[idx]}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white font-bold text-[9px]">
                                {idx + 1}. {dims.width ? `${dims.width}×${dims.height}` : selectedFormatObj.label}
                              </div>

                              {/* Card Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => handleRemoveFile(idx, e)}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-xs"
                                title="Delete image"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {/* Card Details & Reordering Controls */}
                            <div className="flex flex-col w-full gap-1">
                              <div className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-primary)]">
                                <span className="truncate max-w-[110px]" title={file.name}>{file.name}</span>
                                <span className="text-[10px] text-[var(--text-secondary)]">{formatFileSize(file.size)}</span>
                              </div>

                              {/* Reorder Buttons */}
                              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleMoveFile(idx, idx - 1, e)}
                                    disabled={idx === 0}
                                    className="p-0.5 hover:text-[var(--color-primary)] disabled:opacity-20 cursor-pointer"
                                    title="Move left"
                                  >
                                    <MoveLeft size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleMoveFile(idx, idx + 1, e)}
                                    disabled={idx === files.length - 1}
                                    className="p-0.5 hover:text-[var(--color-primary)] disabled:opacity-20 cursor-pointer"
                                    title="Move right"
                                  >
                                    <MoveRight size={12} />
                                  </button>
                                </div>
                                <span className="font-bold text-[var(--color-primary)]">→ {selectedFormatObj.label}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Image Card Slot */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--color-primary)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-all cursor-pointer p-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center shadow-xs">
                          <Plus size={18} />
                        </div>
                        <span className="text-xs font-bold">Add Images</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">PNG, JPG, WebP, etc.</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tune</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Conversion Settings
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {files.length} {files.length === 1 ? 'Image' : 'Images'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Target Format Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Format
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUPPORTED_IMAGE_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setTargetFormat(fmt.id)}
                        className={`p-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 text-center ${
                          targetFormat === fmt.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs ring-1 ring-[var(--color-primary)]/30'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{fmt.label}</span>
                        <span className="text-[9px] font-normal opacity-70 truncate max-w-full">{fmt.name.split(' ')[1] || ''}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quality / Compression Slider (For JPG & WEBP) */}
                {(targetFormat === 'jpeg' || targetFormat === 'webp') && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--text-primary)]">Quality / Compression</span>
                      <span className="font-bold text-[var(--color-primary)]">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Smaller File</span>
                      <span>Balanced (80%)</span>
                      <span>Max Quality</span>
                    </div>
                  </div>
                )}

                {/* 3. Color Mode Transformation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Color Filter
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COLOR_MODES.map((cm) => (
                      <button
                        key={cm.id}
                        type="button"
                        onClick={() => setColorMode(cm.id)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                          colorMode === cm.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {cm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Resizing & Output Dimensions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output Scale / Bounds
                  </label>
                  <select
                    value={scalePreset}
                    onChange={(e) => setScalePreset(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] p-2 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="1.0">Original Dimensions (100%)</option>
                    <option value="0.75">Scale 75%</option>
                    <option value="0.5">Scale 50% (Half Size)</option>
                    <option value="0.25">Scale 25% (Thumbnail)</option>
                    <option value="2.0">Scale 200% (High-Res 2×)</option>
                    <option value="max_1920">Fit within 1920×1080 (Full HD)</option>
                    <option value="max_1080">Fit within 1080×1080 (Square Web)</option>
                  </select>
                </div>

                {/* 5. Matte Background Fill (For JPG, BMP, or custom) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Matte / Transparency
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'transparent', label: 'Transparent', desc: 'Alpha' },
                      { id: '#FFFFFF', label: 'White Fill', desc: '#FFF' },
                      { id: '#000000', label: 'Black Fill', desc: '#000' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBackgroundMatte(m.id)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          backgroundMatte === m.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Pro Subscriber Capabilities Accordion */}
                <div className="flex flex-col gap-2 p-3 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                        Pro Subscriber Features
                      </span>
                    </div>
                    {isPro ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 uppercase">
                        Active
                      </span>
                    ) : (
                      <Link
                        to="/pricing"
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white uppercase hover:opacity-90"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>

                  {/* Multi-Format Triple Bundle Export */}
                  <label className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer pt-1">
                    <span className="flex items-center gap-1.5">
                      <Archive size={13} className="text-[var(--text-secondary)]" />
                      <span>Triple Export (PNG+JPG+WEBP)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={proMultiFormat}
                      onChange={(e) => setProMultiFormat(e.target.checked)}
                      disabled={!isPro}
                      className="accent-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>

                  {/* 300 DPI Print Mode */}
                  <label className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Printer size={13} className="text-[var(--text-secondary)]" />
                      <span>300 DPI Print Mastering</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={proPrintDpi}
                      onChange={(e) => setProPrintDpi(e.target.checked)}
                      disabled={!isPro}
                      className="accent-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>

                  {/* Privacy EXIF Scrubber */}
                  <label className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-[var(--text-secondary)]" />
                      <span>Zero-Footprint EXIF Cleaner</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={proExifScrubber}
                      onChange={(e) => setProExifScrubber(e.target.checked)}
                      disabled={!isPro}
                      className="accent-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>

                  {/* Watermark Input */}
                  <div className="flex flex-col gap-1 pt-1 border-t border-purple-500/15">
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-semibold">
                      <span>Watermark Stamp (Optional)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. © 2026 DocScalar"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      disabled={!isPro}
                      className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Progress Bar While Converting */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <RefreshCw size={13} className="animate-spin text-[var(--color-primary)] shrink-0" />
                        <span className="truncate" title={`Converting ${files.length} ${files.length === 1 ? 'image' : 'images'}...`}>
                          Converting {files.length} {files.length === 1 ? 'image' : 'images'}...
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">{progress}%</span>
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
                  onClick={handleConvert}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Converting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>
                        {proMultiFormat && isPro
                          ? `Convert to All Formats (${files.length})`
                          : `Convert to ${selectedFormatObj.label} (${files.length})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download & Inspection Stage         */
        /* ========================================================================= */
        <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-2xl w-full p-6 sm:p-8 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 my-auto">
            {/* Celebration Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} className="text-emerald-500 stroke-[2.2]" />
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Images Converted Successfully!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.items.length} {result.items.length === 1 ? 'file is ready' : 'files are ready'} in{' '}
                <span className="font-bold text-[var(--color-primary)]">
                  {result.targetFormat === 'multi' ? 'Multi-Format Triple Bundle' : selectedFormatObj.label}
                </span>{' '}
                format.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-1 max-w-full">
                <FileCheck size={15} className="text-emerald-500 shrink-0" />
                <span className="truncate max-w-[200px]">
                  {result.items.length === 1 ? result.items[0].name : result.bundleName}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-emerald-600 font-bold">{formatFileSize(result.totalOutSize)}</span>
                {result.savingsPercent !== 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    result.savingsPercent > 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-blue-500/15 text-blue-600'
                  }`}>
                    {result.savingsPercent > 0 ? `-${result.savingsPercent}%` : `+${Math.abs(result.savingsPercent)}%`}
                  </span>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">
                  {result.targetFormat === 'multi' ? 'Triple' : selectedFormatObj.label}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Output Files</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.items.length}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Size</span>
                <span className="text-xs font-bold text-emerald-600 mt-1">
                  {formatFileSize(result.totalOutSize)}
                </span>
              </div>
            </div>

            {/* Primary Download CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-1">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadAll}
              >
                <Download size={18} />
                <span>Download {result.items.length > 1 ? 'All (ZIP) ↓' : 'Converted Image ↓'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[170px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={handleReconvert}
                title="Change format or settings without re-uploading files"
              >
                <Sliders size={16} />
                <span>Adjust Settings</span>
              </button>
            </div>

            {/* Individual Converted Files List & 1-Click Clipboard Copy */}
            <div className="w-full flex flex-col gap-2 pt-4 border-t border-[var(--border-subtle)] text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Converted Output Files ({result.items.length})
              </span>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {result.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-[11px] text-[var(--color-primary)] uppercase px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10">
                        {item.format || selectedFormatObj.ext}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[220px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                        ({formatFileSize(item.size)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Copy Image Button */}
                      <button
                        type="button"
                        onClick={(e) => copyImageToClipboard(item, idx, e)}
                        className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Copy image to clipboard"
                      >
                        {copiedIndex === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      {/* Download Single File */}
                      <button
                        type="button"
                        onClick={(e) => downloadSingleItem(item, e)}
                        className="p-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer flex items-center gap-1"
                        title="Download this file"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Continue Working with DocScalar
                </span>
                <button
                  type="button"
                  onClick={resetWorkspace}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Convert More Images</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/image-to-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">picture_as_pdf</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Images to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Bundle images to PDF</p>
                  </div>
                </Link>

                <Link
                  to="/image-compressor"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Compressor</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce image file size</p>
                  </div>
                </Link>

                <Link
                  to="/image-resizer"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">straighten</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Resizer</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Scale pixel bounds</p>
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

