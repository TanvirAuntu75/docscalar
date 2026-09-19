import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import {
  resizeImage,
  batchResizeImages,
  RESIZE_PRESETS
} from '../../engines/image/resizeImage';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  Scaling,
  Maximize2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Sparkles,
  Download,
  FileCheck,
  Sliders,
  Ratio,
  Percent,
  Compass
} from 'lucide-react';

export default function ImageResizer() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Resize State
  const [mode, setMode] = useState('exact'); // 'exact' | 'percentage' | 'preset'
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [percentage, setPercentage] = useState(50);
  const [presetId, setPresetId] = useState('ig_post');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [format, setFormat] = useState('keep'); // 'keep' | 'png' | 'jpeg' | 'webp'
  const [quality, setQuality] = useState(0.92);

  // Viewport & Preview State
  const [viewMode, setViewMode] = useState('inspect'); // 'inspect' | 'gallery'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [naturalDims, setNaturalDims] = useState([]); // Array of { w, h }

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('image-resizer');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'image.png', {
              type: f.type || 'image/png',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.mode) setMode(draft.mode);
          if (draft.width) setWidth(draft.width);
          if (draft.height) setHeight(draft.height);
          if (draft.percentage) setPercentage(draft.percentage);
          if (draft.presetId) setPresetId(draft.presetId);
          if (draft.lockAspectRatio !== undefined) setLockAspectRatio(draft.lockAspectRatio);
          if (draft.format) setFormat(draft.format);
          if (draft.quality) setQuality(draft.quality);
        }
      } catch (err) {
        console.warn('Image Resizer draft recovery failed:', err);
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
      saveStudioDraft('image-resizer', {
        files,
        mode,
        width,
        height,
        percentage,
        presetId,
        lockAspectRatio,
        format,
        quality
      });
    }
  }, [files, mode, width, height, percentage, presetId, lockAspectRatio, format, quality]);

  // 3. Generate Previews and Extract Natural Dimensions
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    const dims = [];
    files.forEach((f, idx) => {
      const img = new Image();
      img.onload = () => {
        dims[idx] = { w: img.width, h: img.height };
        if (idx === 0 && dims[0]) {
          setWidth(dims[0].w);
          setHeight(dims[0].h);
        }
        setNaturalDims([...dims]);
      };
      img.src = urls[idx];
    });

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  // 4. Aspect Ratio Linked Dimension Handlers
  const currentNatural = naturalDims[activeFileIndex] || naturalDims[0] || { w: 1080, h: 1080 };

  const handleWidthChange = (val) => {
    const num = val === '' ? '' : Number(val);
    setWidth(num);
    if (lockAspectRatio && currentNatural.w > 0 && num > 0) {
      const ratio = currentNatural.h / currentNatural.w;
      setHeight(Math.round(num * ratio));
    }
  };

  const handleHeightChange = (val) => {
    const num = val === '' ? '' : Number(val);
    setHeight(num);
    if (lockAspectRatio && currentNatural.h > 0 && num > 0) {
      const ratio = currentNatural.w / currentNatural.h;
      setWidth(Math.round(num * ratio));
    }
  };

  const applyPreset = (preset) => {
    setPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  // 5. Handle Batch Resizing
  const handleResize = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const resizedResults = await batchResizeImages(
        files,
        {
          mode,
          width: Number(width),
          height: Number(height),
          percentage: Number(percentage),
          presetId,
          format,
          quality
        },
        (p) => setProgress(p)
      );

      let saveBlob;
      let saveName;
      let saveType;

      if (resizedResults.length === 1) {
        saveBlob = resizedResults[0].blob;
        saveName = resizedResults[0].name;
        saveType = resizedResults[0].blob.type;
      } else {
        const zip = new JSZip();
        resizedResults.forEach((r) => zip.file(r.name, r.blob));
        saveBlob = await zip.generateAsync({ type: 'blob' });
        saveName = `resized_images_bundle.zip`;
        saveType = 'application/zip';
      }

      setResult({
        items: resizedResults,
        bundleBlob: saveBlob,
        bundleName: saveName,
        totalSize: saveBlob.size
      });

      await saveFile(saveName, saveBlob.size, saveType, 'Image Resizer', saveBlob);
      await clearStudioDraft('image-resizer');
    } catch (err) {
      setError(err.message || 'An error occurred while resizing images.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    if (!result) return;
    if (result.items.length === 1) {
      saveAs(result.items[0].blob, result.items[0].name);
    } else if (result.bundleBlob) {
      saveAs(result.bundleBlob, result.bundleName);
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('image-resizer');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const currentFile = files[activeFileIndex] || files[0];
  const currentPreviewUrl = previewUrls[activeFileIndex] || previewUrls[0];

  // Calculated target dimension for preview
  const previewTargetDims = (() => {
    if (mode === 'percentage') {
      const scale = (percentage || 50) / 100;
      return {
        w: Math.round(currentNatural.w * scale),
        h: Math.round(currentNatural.h * scale)
      };
    }
    if (mode === 'preset') {
      const p = RESIZE_PRESETS.find((pr) => pr.id === presetId);
      return p ? { w: p.width, h: p.height } : { w: width, h: height };
    }
    return { w: width, h: height };
  })();

  return (
    <ToolPageLayout
      toolId="image-resizer"
      title="Image Resizer Studio"
      description="Resize images by exact pixels, percentage scale, or social media presets with high-quality bicubic resampling."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Image Resizer Online Free — Resize JPG, PNG, WEBP in Bulk | DocScalar"
        description="Resize images online for free by exact pixels, percentage scale, or social media presets (Instagram, YouTube, Twitter). 100% private in-browser resizing."
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
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-medium)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">image</span>
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
                      <div className="h-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">image</span>
                        <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    {/* Mode Switcher Pill */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setMode('exact')}
                        className={`h-7 px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          mode === 'exact'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Ratio size={13} />
                        <span>Exact</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('percentage')}
                        className={`h-7 px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          mode === 'percentage'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Percent size={13} />
                        <span>Scale %</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('preset')}
                        className={`h-7 px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          mode === 'preset'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Compass size={13} />
                        <span>Presets</span>
                      </button>
                    </div>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    {/* Target Dimension Capsule */}
                    <div className="h-8 flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] shrink-0">
                      <span className="text-[var(--text-secondary)] font-medium">Target:</span>
                      <span className="text-[var(--color-primary)] font-semibold">{previewTargetDims.w} x {previewTargetDims.h} px</span>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('inspect')}
                        className={`h-7 px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
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
                        className={`h-7 px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'gallery'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <LayoutGrid size={13} />
                        <span>Gallery ({files.length})</span>
                      </button>
                    </div>

                    {/* Image Navigation */}
                    {files.length > 1 && (
                      <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveFileIndex((p) => Math.max(0, p - 1))}
                          disabled={activeFileIndex <= 0}
                          className="p-0.5 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                          title="Previous image"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="font-semibold text-[var(--text-primary)] px-1.5 select-none">
                          {activeFileIndex + 1} / {files.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveFileIndex((p) => Math.min(files.length - 1, p + 1))}
                          disabled={activeFileIndex >= files.length - 1}
                          className="p-0.5 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                          title="Next image"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
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
                      className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                {viewMode === 'inspect' ? (
                  /* Single Image Inspect Stage */
                  <div
                    className="relative bg-[var(--bg-primary)] shadow-2xl rounded-3xl border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col items-center gap-4 transition-transform duration-150 origin-center max-w-4xl"
                    style={{ transform: `scale(${zoomScale})` }}
                  >
                    {/* Checkerboard Image Frame */}
                    <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] max-h-[500px] flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]">
                      <img
                        src={currentPreviewUrl}
                        alt={currentFile?.name}
                        className="max-w-full max-h-[460px] object-contain rounded-xl"
                      />
                    </div>

                    {/* Dimensions Shift Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)]">
                      <span className="text-[var(--text-secondary)]">Original: {currentNatural.w} x {currentNatural.h} px</span>
                      <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">arrow_forward</span>
                      <span className="font-bold text-[var(--color-primary)]">Target: {previewTargetDims.w} x {previewTargetDims.h} px</span>
                    </div>
                  </div>
                ) : (
                  /* Batch Thumbnail Gallery Stage */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl w-full">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveFileIndex(idx);
                          setViewMode('inspect');
                        }}
                        className={`group relative bg-[var(--bg-primary)] p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                          activeFileIndex === idx
                            ? 'border-[var(--color-primary)] shadow-md'
                            : 'border-[var(--border-subtle)] hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="w-full aspect-square bg-[var(--bg-secondary)] rounded-xl overflow-hidden flex items-center justify-center relative">
                          <img
                            src={previewUrls[idx]}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-primary)]">
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">{formatFileSize(file.size)}</span>
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
                  <Scaling size={18} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Resize Controls
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full uppercase">
                  {mode}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Mode 1: Exact Pixels */}
                {mode === 'exact' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Width (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="16384"
                          value={width}
                          onChange={(e) => handleWidthChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Height (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="16384"
                          value={height}
                          onChange={(e) => handleHeightChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        lockAspectRatio
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {lockAspectRatio ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{lockAspectRatio ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}</span>
                    </button>
                  </div>
                )}

                {/* Mode 2: Percentage Scale */}
                {mode === 'percentage' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--text-primary)]">Scale Factor</span>
                      <span className="font-bold text-[var(--color-primary)] text-sm">{percentage}%</span>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={percentage}
                      onChange={(e) => setPercentage(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />

                    <div className="grid grid-cols-4 gap-1.5">
                      {[25, 50, 75, 150].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPercentage(pct)}
                          className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            percentage === pct
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 3: Social & Display Presets */}
                {mode === 'preset' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Preset Directory
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {RESIZE_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                            presetId === p.id
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{p.label}</span>
                            <span className="text-[10px] opacity-70">{p.category}</span>
                          </div>
                          <span className="text-xs font-mono font-semibold">{p.width}x{p.height}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output Format & Quality */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output Format
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs text-center">
                    {[
                      { id: 'keep', label: 'Auto' },
                      { id: 'png', label: 'PNG' },
                      { id: 'jpeg', label: 'JPG' },
                      { id: 'webp', label: 'WEBP' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormat(fmt.id)}
                        className={`py-1 font-bold rounded-lg transition-all cursor-pointer ${
                          format === fmt.id
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)] shrink-0">
                          progress_activity
                        </span>
                        <span className="truncate" title={`Resizing ${files.length} ${files.length === 1 ? 'image' : 'images'}...`}>
                          Resizing {files.length} {files.length === 1 ? 'image' : 'images'}...
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
                  onClick={handleResize}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Resizing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Resize {files.length} {files.length === 1 ? 'Image' : 'Images'}</span>
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
                Images Resized!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.items.length} {result.items.length === 1 ? 'image has' : 'images have'} been resized with high-definition bicubic resampling.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
                <span className="truncate max-w-[220px]">
                  {result.items.length === 1 ? result.items[0].name : result.bundleName}
                </span>
                {result.totalSize && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-emerald-600 font-bold">{formatFileSize(result.totalSize)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Target Size</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">
                  {result.items[0]?.width}x{result.items[0]?.height}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Processed</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.items.length}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Resampling</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">Bicubic High</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadAll}
              >
                <Download size={18} />
                <span>Download {result.items.length > 1 ? 'All (ZIP) ↓' : 'Resized Image ↓'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Resize More Images</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocScalar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/image-converter"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">image</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Converter</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Convert PNG, JPG, WEBP</p>
                  </div>
                </Link>

                <Link
                  to="/image-compressor"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Compressor</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Compress image payloads</p>
                  </div>
                </Link>

                <Link
                  to="/crop-image"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-emerald-500">crop</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Crop Image</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Crop region coordinates</p>
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
