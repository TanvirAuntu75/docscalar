import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { removePages } from '../../engines/pdf/removePages';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import useSmartCropper from '../../hooks/useSmartCropper';
import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';
import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RemovePages() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Pages marked for removal (0-indexed)
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [rangeInput, setRangeInput] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // UI Studio Canvas State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = standard, 2 = large, 3 = compact
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const cropper = useSmartCropper({ totalPages });

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('remove-pages');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.selectedIndices) setSelectedIndices(draft.selectedIndices);
          if (draft.rangeInput) setRangeInput(draft.rangeInput);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Remove pages draft recovery failed:', err);
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
      saveStudioDraft('remove-pages', {
        files,
        selectedIndices,
        rangeInput,
        outputFileName
      });
    }
  }, [files, selectedIndices, rangeInput, outputFileName]);

  // 3. Render Active File Page Thumbnails
  useEffect(() => {
    if (files.length === 0) {
      setPageThumbnails([]);
      setTotalPages(0);
      setSelectedIndices([]);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const loadThumbnails = async () => {
      setLoadingThumbnails(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }

        const count = pdf.numPages;
        setTotalPages(count);
        setSelectedIndices([]);

        const thumbs = [];
        for (let i = 1; i <= Math.min(count, 50); i++) {
          if (isCancelled) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          let hasScanBorders = false;
          let cropBox = null;
          let borderResult = null;
          try {
            borderResult = detectSmartBorders(canvas, viewport);
            hasScanBorders = borderResult && borderResult.hasBlackBorders === true &&
              (borderResult.cropTop > 0 || borderResult.cropBottom > 0 || borderResult.cropLeft > 0 || borderResult.cropRight > 0);
            if (hasScanBorders) {
              cropBox = computeCleanPdfCropBox(borderResult, { width: page.view[2], height: page.view[3] }, viewport.scale);
              cropper.activate();
            }
          } catch (e) {}

          const rawDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          let croppedDataUrl = rawDataUrl;
          if (hasScanBorders && borderResult) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = canvas.width;
            cropCanvas.height = canvas.height;
            const cCtx = cropCanvas.getContext('2d');
            cCtx.drawImage(canvas, 0, 0);
            cropper.applyCanvasPreview(cropCanvas, viewport.scale, borderResult, { width: page.view[2], height: page.view[3] }, true);
            croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.8);
          }

          thumbs.push({
            pageNumber: i,
            dataUrl: rawDataUrl,
            rawDataUrl,
            croppedDataUrl,
            width: viewport.width,
            height: viewport.height,
            hasScanBorders,
            cropBox
          });
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingThumbnails(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_modified.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render page thumbnails:', err);
          setLoadingThumbnails(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // Page Removal Selection Handlers
  const togglePageSelection = (idx) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectOdd = () => {
    const odds = [];
    for (let i = 0; i < totalPages; i += 2) odds.push(i);
    setSelectedIndices(odds);
  };

  const handleSelectEven = () => {
    const evens = [];
    for (let i = 1; i < totalPages; i += 2) evens.push(i);
    setSelectedIndices(evens);
  };

  const handleSelectFirst = () => {
    setSelectedIndices((prev) => (prev.includes(0) ? prev : [0, ...prev]));
  };

  const handleSelectLast = () => {
    const lastIdx = totalPages - 1;
    if (lastIdx >= 0) {
      setSelectedIndices((prev) => (prev.includes(lastIdx) ? prev : [...prev, lastIdx]));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIndices([]);
  };

  // Range String Parser (e.g. "1-4, 7, 10")
  const applyRangeString = () => {
    if (!rangeInput.trim()) return;
    const indices = new Set();
    rangeInput.split(',').forEach((part) => {
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
    setSelectedIndices(Array.from(indices).sort((a, b) => a - b));
  };

  // Main Remove Execution Action
  const handleRemove = async () => {
    if (!files.length) return;
    if (selectedIndices.length === 0) {
      setError('Please select at least one page to remove.');
      return;
    }
    if (selectedIndices.length >= totalPages) {
      setError('You cannot remove all pages from a PDF. At least one page must remain.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const allPageCropBoxes = {};
      pageThumbnails.forEach((t) => {
        if (t.hasScanBorders && t.cropBox) {
          allPageCropBoxes[t.pageNumber - 1] = t.cropBox;
        }
      });
      const activeCropBox = pageThumbnails.find((t) => t.cropBox)?.cropBox || null;
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(files[activeFileIndex], pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());
      const cropOptions = {
        ...cropperOptions,
        autoCropBlackBorders: cropper.isActive,
        smartCrop: cropper.isActive,
        pageCropBoxes: cropper.isActive ? allPageCropBoxes : {},
        docCropBox: cropper.isActive ? activeCropBox : null,
        cleanMargin: cropper.cleanMargin || 0,
        enabledEdges: cropper.enabledEdges
      };
      const outputBlob = await removePages(files[activeFileIndex], selectedIndices, setProgress, cropOptions);
      const defaultName = `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_modified.pdf`;
      const finalName = outputFileName || defaultName;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        removedCount: selectedIndices.length,
        remainingCount: totalPages - selectedIndices.length
      });

      // Save to IndexedDB
      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Remove Pages', outputBlob);
      await clearStudioDraft('remove-pages');
    } catch (err) {
      setError(err.message || 'Page removal failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('remove-pages');
    setFiles([]);
    setActiveFileIndex(0);
    setTotalPages(0);
    setSelectedIndices([]);
    setRangeInput('');
    setOutputFileName('');
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

  const filteredThumbs = useMemo(() => {
    if (!searchQuery.trim()) return pageThumbnails;
    const q = searchQuery.trim();
    return pageThumbnails.filter((t) => t.pageNumber.toString().includes(q));
  }, [pageThumbnails, searchQuery]);

  return (
    <ToolPageLayout
      toolId="remove-pages"
      title="Remove PDF Pages"
      description="Delete unwanted pages, blank sheets, or specific sections from your PDF file."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Remove Pages from PDF Online Free (100% Local Studio) | DocScalar"
        description="Delete pages from your PDF file instantly and securely in your browser. Complete privacy without server uploads."
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
            {/* LEFT / CENTER: Interactive Visual Document Canvas & Page Gallery          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
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

                    {/* Removal Counter / Page Count Pill */}
                    {selectedIndices.length > 0 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-extrabold text-red-600 dark:text-red-400 animate-[scaleIn_0.15s_ease-out] shrink-0 select-none">
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>
                          {selectedIndices.length} to Delete ({totalPages - selectedIndices.length} Kept)
                        </span>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] shrink-0 select-none">
                        <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                        <span>{totalPages} {totalPages === 1 ? 'Page' : 'Pages'}</span>
                      </div>
                    )}

                    {/* Visual Divider */}
                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    {/* Ergonomic Add PDFs Action Button */}
                    <label className="h-8 px-3.5 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">add_circle</span>
                      <span>Add PDF</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                        title=""
                        tabIndex={-1}
                      />
                    </label>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />
                    <SmartCropperToolbarButton cropper={cropper} />
                  </div>

                  {/* Bulk Quick Pills & Density Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSelectOdd}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Delete Odd
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectEven}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Delete Even
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectFirst}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Delete First
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectLast}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Delete Last
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Keep All
                      </button>
                    </div>

                    {/* Search / Filter Pages */}
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-2 text-[14px] text-[var(--text-secondary)] pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Page #"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 pr-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-20"
                      />
                    </div>

                    {/* Grid Density Zoom */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setZoomLevel(3)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 3 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Compact View"
                      >
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 1 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Standard View"
                      >
                        <span className="material-symbols-outlined text-[16px]">view_module</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(2)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 2 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Large View"
                      >
                        <span className="material-symbols-outlined text-[16px]">crop_free</span>
                      </button>
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

              {/* Central Visual Document Grid */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-pattern select-none">
                {loadingThumbnails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Generating live page gallery...</span>
                  </div>
                ) : filteredThumbs.length > 0 ? (
                  <div
                    className={`grid gap-4 mx-auto max-w-7xl ${
                      zoomLevel === 3
                        ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
                        : zoomLevel === 2
                        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                    }`}
                  >
                    {filteredThumbs.map((thumb) => {
                      const idx = thumb.pageNumber - 1;
                      const isMarkedForDeletion = selectedIndices.includes(idx);
                      return (
                        <div
                          key={thumb.pageNumber}
                          onClick={() => togglePageSelection(idx)}
                          className={`group relative flex flex-col bg-[var(--bg-primary)] rounded-xl border-2 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer ${
                            isMarkedForDeletion
                              ? 'border-red-500 ring-2 ring-red-500/20 opacity-75'
                              : 'border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                          }`}
                        >
                          {/* Page Header Pill */}
                          <div
                            className={`px-2.5 py-1.5 flex items-center justify-between border-b transition-colors ${
                              isMarkedForDeletion
                                ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 font-bold line-through'
                                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="text-[10px] font-bold">Page #{thumb.pageNumber}</span>
                            <div className="flex items-center gap-1">
                              {cropper.isActive ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cropper.revert();
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/50 shrink-0"
                                  title="Smart Cropping Active — Click to restore original document"
                                >
                                  <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                  <span>Cropped</span>
                                </button>
                              ) : thumb.hasScanBorders ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cropper.activate();
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/50 shrink-0"
                                  title="Photocopy scan borders detected — Click to remove scan borders"
                                >
                                  <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                                  <span>Borders Detected</span>
                                </button>
                              ) : (
                                <div
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 bg-white text-slate-600 border border-slate-200 shrink-0 select-none cursor-default"
                                  title="Clean digital document: zero scan borders detected"
                                >
                                  <span className="material-symbols-outlined text-[11px] text-slate-500">check_circle</span>
                                  <span>Clean Page</span>
                                </div>
                              )}
                              <span className="material-symbols-outlined text-[15px]">
                                {isMarkedForDeletion ? 'delete' : 'check_circle_outline'}
                              </span>
                            </div>
                          </div>

                          {/* Thumbnail Canvas Frame */}
                          <div className={`p-2 flex items-center justify-center bg-slate-100 dark:bg-slate-900/40 min-h-[140px] relative transition-all ${
                            cropper.isActive && thumb.hasScanBorders ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''
                          }`}>
                            <img
                              src={cropper.isActive && thumb.hasScanBorders && thumb.croppedDataUrl ? thumb.croppedDataUrl : thumb.dataUrl}
                              alt={`Page ${thumb.pageNumber}`}
                              className={`max-h-48 w-auto object-contain rounded shadow-xs drop-shadow-xs transition-all ${
                                isMarkedForDeletion ? 'filter grayscale contrast-75 opacity-40' : ''
                              }`}
                            />

                            {/* Deletion Cross Badge */}
                            {isMarkedForDeletion && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
                                <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg animate-[scaleIn_0.15s_ease-out]">
                                  <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[36px] mb-2 opacity-50">search_off</span>
                    <span className="text-xs font-semibold">No pages matching filter</span>
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
                  <span className="material-symbols-outlined text-[18px] text-red-500">delete</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Removal Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {selectedIndices.length} / {totalPages} to Delete
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Quick Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Quick Deletion Presets
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectOdd}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      Delete Odd Pages
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectEven}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      Delete Even Pages
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectFirst}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      Delete Cover Page
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectLast}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      Delete Last Page
                    </button>
                  </div>
                </div>

                {/* 2. Manual Page Range Parser */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Delete by Page Range
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. 1-4, 7, 10"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyRangeString()}
                      className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyRangeString}
                      className="btn btn-secondary btn-sm text-xs py-1.5 px-3 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Type page numbers to mark them for deletion
                  </span>
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
                    placeholder="document_modified.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 4. Removal Summary Card */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Document Changes
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="flex flex-col p-1.5 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-secondary)]">Original</span>
                      <span className="font-bold text-[var(--text-primary)]">{totalPages}</span>
                    </div>
                    <div className="flex flex-col p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-[10px] text-red-600 dark:text-red-400">Deleted</span>
                      <span className="font-bold text-red-600 dark:text-red-400">-{selectedIndices.length}</span>
                    </div>
                    <div className="flex flex-col p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Remaining</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.max(0, totalPages - selectedIndices.length)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-red-500">
                          progress_activity
                        </span>
                        Removing selected pages...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-200 rounded-full"
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
                  onClick={handleRemove}
                  disabled={processing || selectedIndices.length === 0 || selectedIndices.length >= totalPages}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Removing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {selectedIndices.length === 0
                          ? 'Select Pages to Remove'
                          : `Remove ${selectedIndices.length} ${selectedIndices.length === 1 ? 'Page' : 'Pages'}`}
                      </span>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
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
                Pages Successfully Removed!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.removedCount} {result.removedCount === 1 ? 'page was' : 'pages were'} deleted. Your modified PDF has {result.remainingCount} {result.remainingCount === 1 ? 'page' : 'pages'}.
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
                <span>Download Modified PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Remove More Pages</span>
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
