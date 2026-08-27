import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { addPageNumbers } from '../../engines/pdf/addPageNumbers';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const FORMAT_PRESETS = [
  { label: 'Page 1 of 10', template: 'Page {page} of {total}' },
  { label: '1 / 10', template: '{page} / {total}' },
  { label: '- 1 -', template: '- {page} -' },
  { label: 'Page 1', template: 'Page {page}' },
  { label: 'p. 1', template: 'p. {page}' },
  { label: '1', template: '{page}' }
];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Gray', hex: '#4B5563' },
  { name: 'Muted Gray', hex: '#9CA3AF' },
  { name: 'Primary Blue', hex: '#3B82F6' },
  { name: 'Corporate Navy', hex: '#1E3A8A' }
];

export default function AddPageNumbers() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Numbering Configuration
  const [format, setFormat] = useState('Page {page} of {total}');
  const [position, setPosition] = useState('footer-center'); // 'header-left' | 'header-center' | 'header-right' | 'footer-left' | 'footer-center' | 'footer-right'
  const [fontFamily, setFontFamily] = useState('Helvetica'); // 'Helvetica' | 'Times' | 'Courier'
  const [fontSize, setFontSize] = useState(10);
  const [startNumber, setStartNumber] = useState(1);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(36); // pts from border
  const [skipFirstPage, setSkipFirstPage] = useState(false);
  const [targetScope, setTargetScope] = useState('all'); // 'all' | 'range'
  const [pageRange, setPageRange] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // Canvas Viewport State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('add-page-numbers');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.format) setFormat(draft.format);
          if (draft.position) setPosition(draft.position);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.fontSize !== undefined) setFontSize(draft.fontSize);
          if (draft.startNumber !== undefined) setStartNumber(draft.startNumber);
          if (draft.color) setColor(draft.color);
          if (draft.margin !== undefined) setMargin(draft.margin);
          if (draft.skipFirstPage !== undefined) setSkipFirstPage(draft.skipFirstPage);
          if (draft.targetScope) setTargetScope(draft.targetScope);
          if (draft.pageRange) setPageRange(draft.pageRange);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Page numbers draft recovery failed:', err);
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
      saveStudioDraft('add-page-numbers', {
        files,
        format,
        position,
        fontFamily,
        fontSize,
        startNumber,
        color,
        margin,
        skipFirstPage,
        targetScope,
        pageRange,
        outputFileName
      });
    }
  }, [files, format, position, fontFamily, fontSize, startNumber, color, margin, skipFirstPage, targetScope, pageRange, outputFileName]);

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

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!isCancelled) {
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_numbered.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render PDF page for page numbering preview:', err);
          setCanvasLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex, currentPage, zoomScale]);

  // Compute Active Page Display Text
  const getRenderedNumberString = () => {
    if (skipFirstPage && currentPage === 1) return '';
    const pageNum = skipFirstPage ? Math.max(1, currentPage - 1 + startNumber - 1) : (currentPage - 1 + startNumber);
    const totalDisplay = skipFirstPage ? totalPages - 1 : totalPages;
    return format
      .replace('{page}', String(pageNum))
      .replace('{n}', String(pageNum))
      .replace('{total}', String(totalDisplay || 1));
  };

  // Helper to map header/footer position to CSS for live preview overlay
  const getLivePositionStyles = () => {
    const marginPx = margin * 0.75 * zoomScale;
    const base = {
      position: 'absolute',
      pointerEvents: 'none',
      color: color,
      fontSize: `${fontSize * zoomScale}px`,
      fontFamily: fontFamily === 'Times' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      lineHeight: 1
    };

    switch (position) {
      case 'header-left':
        return { ...base, top: `${marginPx}px`, left: `${marginPx}px` };
      case 'header-center':
        return { ...base, top: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'header-right':
        return { ...base, top: `${marginPx}px`, right: `${marginPx}px` };
      case 'footer-left':
        return { ...base, bottom: `${marginPx}px`, left: `${marginPx}px` };
      case 'footer-right':
        return { ...base, bottom: `${marginPx}px`, right: `${marginPx}px` };
      case 'footer-center':
      default:
        return { ...base, bottom: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
    }
  };

  // Main Apply Numbering Action
  const handleApplyPageNumbers = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      let targetPages = null;
      if (targetScope === 'range' && pageRange.trim()) {
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
      }

      const options = {
        format,
        position,
        fontFamily,
        fontSize,
        startNumber,
        color,
        margin,
        skipFirstPage,
        targetPages
      };

      const outputBlob = await addPageNumbers(files[activeFileIndex], options, setProgress);
      const defaultName = `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_numbered.pdf`;
      const finalName = outputFileName || defaultName;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size
      });

      // Save to IndexedDB
      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Add Page Numbers', outputBlob);
      await clearStudioDraft('add-page-numbers');
    } catch (err) {
      setError(err.message || 'Page numbering failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('add-page-numbers');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setFormat('Page {page} of {total}');
    setPosition('footer-center');
    setFontFamily('Helvetica');
    setFontSize(10);
    setStartNumber(1);
    setColor('#000000');
    setMargin(36);
    setSkipFirstPage(false);
    setTargetScope('all');
    setPageRange('');
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      toolId="add-page-numbers"
      title="Add PDF Page Numbers"
      description="Draw custom sequence numbers, headers, and footers across your PDF document."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Add Page Numbers to PDF Online Free (100% Local Studio) | DocForge"
        description="Insert customized headers, footers, and page numbers into your PDF files securely in your browser. Complete privacy without server uploads."
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
            {/* LEFT / CENTER: Interactive Live High-DPI Canvas Viewport                  */}
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
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[180px]">{files[0]?.name}</span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Previous Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <span className="text-xs font-bold px-2 text-[var(--text-primary)] select-none">
                        Page {currentPage} / {totalPages || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Next Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>

                    {/* Format Quick Presets */}
                    <div className="hidden lg:flex items-center gap-1">
                      {FORMAT_PRESETS.slice(0, 3).map((fp) => (
                        <button
                          key={fp.label}
                          type="button"
                          onClick={() => setFormat(fp.template)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                            format === fp.template
                              ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {fp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom Controls & Workspace Reset */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
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
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Frame with Live Numbering Overlay */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                <div
                  className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
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

                  {/* Live WYSIWYG Page Number Overlay */}
                  {getRenderedNumberString() && (
                    <span style={getLivePositionStyles()}>
                      {getRenderedNumberString()}
                    </span>
                  )}

                  {/* Cover Page Skip Badge Indicator */}
                  {skipFirstPage && currentPage === 1 && (
                    <div className="absolute top-4 right-4 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                      <span className="material-symbols-outlined text-[13px]">visibility_off</span>
                      <span>Cover Page (Numbering Skipped)</span>
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">format_list_numbered</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Numbering Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Format Template Input & Presets */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Numbering Format
                  </label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    placeholder="Page {page} of {total}"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-semibold"
                  />
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    {FORMAT_PRESETS.map((fp) => (
                      <button
                        key={fp.label}
                        type="button"
                        onClick={() => setFormat(fp.template)}
                        className={`p-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all cursor-pointer truncate ${
                          format === fp.template
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {fp.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Available tags: <code className="text-[var(--color-primary)]">{`{page}`}</code>, <code className="text-[var(--color-primary)]">{`{total}`}</code>
                  </span>
                </div>

                {/* 2. Position & Placement Compass (Header / Footer Matrix) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Position on Page
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Header (Top)</span>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {[
                        { id: 'header-left', label: 'Top Left' },
                        { id: 'header-center', label: 'Top Center' },
                        { id: 'header-right', label: 'Top Right' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPosition(p.id)}
                          className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                            position === p.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Footer (Bottom)</span>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {[
                        { id: 'footer-left', label: 'Bottom Left' },
                        { id: 'footer-center', label: 'Bottom Center' },
                        { id: 'footer-right', label: 'Bottom Right' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPosition(p.id)}
                          className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                            position === p.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Typography & Styling */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  {/* Font Family */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                    >
                      <option value="Helvetica">Helvetica (Standard Sans)</option>
                      <option value="Times">Times Roman (Formal Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  {/* Font Size & Margin Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Size
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{fontSize}pt</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Margin
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{margin}pt</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        step="4"
                        value={margin}
                        onChange={(e) => setMargin(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>
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

                {/* 4. Sequence & Application Scope */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Start Numbering From
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 text-xs text-center bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg font-bold text-[var(--text-primary)]"
                    />
                  </div>

                  {/* Skip Cover Page Toggle */}
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Skip Cover Page</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Do not print number on page 1</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={skipFirstPage}
                      onChange={(e) => setSkipFirstPage(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  {/* Target Scope */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Page Scope
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setTargetScope('all')}
                        className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                          targetScope === 'all'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        All Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetScope('range')}
                        className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                          targetScope === 'range'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>

                    {targetScope === 'range' && (
                      <input
                        type="text"
                        placeholder="e.g. 2-10, 15"
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none mt-1"
                      />
                    )}
                  </div>
                </div>

                {/* 5. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_numbered.pdf"
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
                        Drawing page numbers...
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
                  onClick={handleApplyPageNumbers}
                  disabled={processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Numbering ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Apply Page Numbers</span>
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
                Page Numbers Successfully Added!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Dynamic page sequence stamps have been embedded into your PDF.
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
                <span>Download Numbered PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Number Another PDF</span>
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
