import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { extractPages } from '../../engines/pdf/extractPages';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ExtractPages() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Extraction Options
  const [extractMode, setExtractMode] = useState('single'); // 'single' (1 combined PDF) | 'separate' (ZIP of separate PDFs)
  const [selectedIndices, setSelectedIndices] = useState([]); // 0-indexed pages to keep
  const [rangeInput, setRangeInput] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // UI Studio Canvas State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = standard, 2 = large, 3 = compact
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

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
        const draft = await loadStudioDraft('extract-pages');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.extractMode) setExtractMode(draft.extractMode);
          if (draft.selectedIndices) setSelectedIndices(draft.selectedIndices);
          if (draft.rangeInput) setRangeInput(draft.rangeInput);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Extract pages draft recovery failed:', err);
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
      saveStudioDraft('extract-pages', {
        files,
        extractMode,
        selectedIndices,
        rangeInput,
        outputFileName
      });
    }
  }, [files, extractMode, selectedIndices, rangeInput, outputFileName]);

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

        // By default, select first page if none selected
        setSelectedIndices((prev) => (prev.length > 0 ? prev.filter((i) => i < count) : [0]));

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
          thumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height
          });
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingThumbnails(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(extractMode === 'separate' ? `${base}_extracted.zip` : `${base}_extracted.pdf`);
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

  // Update output filename extension on extract mode change
  useEffect(() => {
    if (!files.length) return;
    const base = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
    if (extractMode === 'separate') {
      setOutputFileName(`${base}_extracted.zip`);
    } else {
      setOutputFileName(`${base}_extracted.pdf`);
    }
  }, [extractMode, files, activeFileIndex]);

  // Page Selection Handlers
  const togglePageSelection = (idx) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = () => {
    setSelectedIndices(Array.from({ length: totalPages }, (_, i) => i));
  };

  const handleDeselectAll = () => {
    setSelectedIndices([]);
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

  const handleInvertSelection = () => {
    const inverted = [];
    for (let i = 0; i < totalPages; i++) {
      if (!selectedIndices.includes(i)) inverted.push(i);
    }
    setSelectedIndices(inverted);
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

  // Main Extract Action
  const handleExtract = async () => {
    if (!files.length) return;
    if (selectedIndices.length === 0) {
      setError('Please select at least one page to extract.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
      const outputBlob = await extractPages(
        files[activeFileIndex],
        sortedIndices,
        setProgress,
        { splitSeparate: extractMode === 'separate' }
      );

      const isZip = extractMode === 'separate';
      const defaultName = isZip
        ? `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_extracted.zip`
        : `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_extracted.pdf`;
      const finalName = outputFileName || defaultName;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        extractedCount: sortedIndices.length,
        isZip
      });

      // Save to IndexedDB
      await saveFile(
        finalName,
        outputBlob.size,
        isZip ? 'application/zip' : 'application/pdf',
        'Extract Pages',
        outputBlob
      );
      await clearStudioDraft('extract-pages');
    } catch (err) {
      setError(err.message || 'Page extraction failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('extract-pages');
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
      toolId="extract-pages"
      title="Extract PDF Pages"
      description="Select and extract specific pages from your PDF file into a single document or separate files."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Extract Pages from PDF Online Free (100% Local Studio) | DocForge"
        description="Select specific pages to extract and compile into a standalone PDF document locally in your browser. Complete privacy."
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
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1 shadow-xs text-xs py-1">
                      <span className="material-symbols-outlined text-[15px]">add_circle</span>
                      <span>Add PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                      />
                    </label>

                    {/* Selection Counter Pill */}
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>
                        {selectedIndices.length} of {totalPages} Selected
                      </span>
                    </div>
                  </div>

                  {/* Bulk Quick Pills & Density Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectOdd}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Odd
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectEven}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Even
                      </button>
                      <button
                        type="button"
                        onClick={handleInvertSelection}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Invert
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                      >
                        Clear
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
                      const isSelected = selectedIndices.includes(idx);
                      return (
                        <div
                          key={thumb.pageNumber}
                          onClick={() => togglePageSelection(idx)}
                          className={`group relative flex flex-col bg-[var(--bg-primary)] rounded-xl border-2 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'border-[var(--border-subtle)] opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* Page Header Pill */}
                          <div
                            className={`px-2.5 py-1.5 flex items-center justify-between border-b transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="text-[10px]">Page #{thumb.pageNumber}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer pointer-events-none"
                            />
                          </div>

                          {/* Thumbnail Canvas Frame */}
                          <div className="p-2 flex items-center justify-center bg-slate-100 dark:bg-slate-900/40 min-h-[140px] relative">
                            <img
                              src={thumb.dataUrl}
                              alt={`Page ${thumb.pageNumber}`}
                              className="max-h-48 w-auto object-contain rounded shadow-xs drop-shadow-xs"
                            />

                            {/* Selected Watermark Badge */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-[scaleIn_0.15s_ease-out]">
                                <span className="material-symbols-outlined text-[14px]">check</span>
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">content_copy</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Extraction Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {selectedIndices.length} / {totalPages} Pages
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Extraction Mode Switcher */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Extraction Output Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExtractMode('single')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                        extractMode === 'single'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                      <span className="text-xs">Combine 1 PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExtractMode('separate')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                        extractMode === 'separate'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">folder_zip</span>
                      <span className="text-xs">Separate ZIP</span>
                    </button>
                  </div>
                </div>

                {/* 2. Manual Page Range Parser */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Select by Page Range
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
                    Type ranges and press Enter or Apply to select pages
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
                    placeholder={extractMode === 'separate' ? 'extracted_pages.zip' : 'document_extracted.pdf'}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 4. Extraction Summary Card */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Extraction Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Pages to Extract</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedIndices.length} Pages
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Output Format</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {extractMode === 'single' ? 'Single PDF' : 'ZIP Bundle'}
                      </span>
                    </div>
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
                        Extracting pages...
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
                  onClick={handleExtract}
                  disabled={processing || selectedIndices.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Extracting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {selectedIndices.length === 0
                          ? 'Select Pages to Extract'
                          : `Extract ${selectedIndices.length} ${selectedIndices.length === 1 ? 'Page' : 'Pages'}`}
                      </span>
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
                Pages Successfully Extracted!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Selected pages have been compiled into a standalone document.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.isZip ? 'folder_zip' : 'description'}
                </span>
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
                <span>{result.isZip ? 'Download ZIP Archive' : 'Download Extracted PDF'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Extract Another</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/merge-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">call_merge</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Merge</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Combine with others</p>
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

