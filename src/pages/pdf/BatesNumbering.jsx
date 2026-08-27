import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { applyBatesNumbering } from '../../engines/pdf/batesNumbering';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BATES_PRESETS = [
  { id: 'conf', label: 'CONF-', prefix: 'CONF-', digits: 6, suffix: '' },
  { id: 'pltf', label: 'PLTF-', prefix: 'PLTF-', digits: 6, suffix: '' },
  { id: 'def', label: 'DEF-', prefix: 'DEF-', digits: 6, suffix: '' },
  { id: 'exhibit', label: 'EXHIBIT-', prefix: 'EXHIBIT-', digits: 4, suffix: '' },
  { id: 'doc', label: 'DOC-', prefix: 'DOC-', digits: 6, suffix: '' }
];

const COMPASS_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' }
];

const COLOR_SWATCHES = ['#000000', '#1E293B', '#DC2626', '#2563EB', '#059669', '#7C3AED'];

export default function BatesNumbering() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Bates Configuration
  const [prefix, setPrefix] = useState('CONF-');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [position, setPosition] = useState('bottom-right');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(36);
  const [skipCoverPage, setSkipCoverPage] = useState(false);
  const [pageScope, setPageScope] = useState('all'); // 'all' | 'range'
  const [pageRange, setPageRange] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // Canvas Viewport State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Processing State
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
        const draft = await loadStudioDraft('bates-numbering');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.prefix !== undefined) setPrefix(draft.prefix);
          if (draft.suffix !== undefined) setSuffix(draft.suffix);
          if (draft.startNumber !== undefined) setStartNumber(draft.startNumber);
          if (draft.digits !== undefined) setDigits(draft.digits);
          if (draft.position) setPosition(draft.position);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.fontSize) setFontSize(draft.fontSize);
          if (draft.color) setColor(draft.color);
          if (draft.margin) setMargin(draft.margin);
          if (draft.skipCoverPage !== undefined) setSkipCoverPage(draft.skipCoverPage);
          if (draft.pageScope) setPageScope(draft.pageScope);
          if (draft.pageRange !== undefined) setPageRange(draft.pageRange);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Bates numbering draft recovery failed:', err);
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
      saveStudioDraft('bates-numbering', {
        files,
        prefix,
        suffix,
        startNumber,
        digits,
        position,
        fontFamily,
        fontSize,
        color,
        margin,
        skipCoverPage,
        pageScope,
        pageRange,
        outputFileName
      });
    }
  }, [files, prefix, suffix, startNumber, digits, position, fontFamily, fontSize, color, margin, skipCoverPage, pageScope, pageRange, outputFileName]);

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
            setOutputFileName(`${base}_bates.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('PDF Page rendering error:', err);
          setCanvasLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex, currentPage, zoomScale]);

  // Calculate live preview bates text for active page
  const calculatePreviewBatesText = () => {
    if (currentPage === 1 && skipCoverPage) return null;
    const offset = skipCoverPage ? Math.max(0, currentPage - 2) : currentPage - 1;
    const seq = (parseInt(startNumber, 10) || 1) + offset;
    const numStr = String(seq).padStart(digits, '0');
    return `${prefix}${numStr}${suffix}`;
  };

  const previewText = calculatePreviewBatesText();

  // Position coordinates for WYSIWYG overlay
  const getCompassStyles = () => {
    const scaleFactor = (pageDimensions.width * zoomScale) / pageDimensions.width;
    const scaledMargin = margin * scaleFactor;
    const scaledFontSize = fontSize * scaleFactor;

    let style = {
      position: 'absolute',
      fontSize: `${scaledFontSize}px`,
      color: color,
      fontFamily: fontFamily === 'Courier' ? 'monospace' : fontFamily === 'Times Roman' ? 'serif' : 'sans-serif',
      fontWeight: 'bold',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      lineHeight: 1
    };

    if (position === 'top-left') {
      style.top = `${scaledMargin}px`;
      style.left = `${scaledMargin}px`;
    } else if (position === 'top-center') {
      style.top = `${scaledMargin}px`;
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    } else if (position === 'top-right') {
      style.top = `${scaledMargin}px`;
      style.right = `${scaledMargin}px`;
    } else if (position === 'bottom-left') {
      style.bottom = `${scaledMargin}px`;
      style.left = `${scaledMargin}px`;
    } else if (position === 'bottom-center') {
      style.bottom = `${scaledMargin}px`;
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    } else if (position === 'bottom-right') {
      style.bottom = `${scaledMargin}px`;
      style.right = `${scaledMargin}px`;
    }

    return style;
  };

  // Handle Bates Stamping Execution
  const handleProcess = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setProgress(15);

    const file = files[activeFileIndex] || files[0];

    try {
      setProgress(40);
      const outputBytes = await applyBatesNumbering(file, {
        prefix,
        suffix,
        startNumber: parseInt(startNumber, 10) || 1,
        digits: parseInt(digits, 10) || 6,
        position,
        fontFamily,
        fontSize: parseInt(fontSize, 10) || 10,
        color,
        margin: parseInt(margin, 10) || 36,
        skipCoverPage,
        pageScope,
        pageRange
      });

      setProgress(85);
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_bates.pdf`;

      const startTag = `${prefix}${String(startNumber || 1).padStart(digits, '0')}${suffix}`;
      const endSeq = (parseInt(startNumber, 10) || 1) + (totalPages > 0 ? totalPages - 1 : 0);
      const endTag = `${prefix}${String(endSeq).padStart(digits, '0')}${suffix}`;

      setResult({
        blob,
        name: finalName,
        originalSize: file.size,
        newSize: blob.size,
        pageCount: totalPages,
        startTag,
        endTag,
        position
      });

      // Save to local workspace DB
      await saveFile(finalName, blob.size, 'application/pdf', 'Bates Numbering', blob);
      await clearStudioDraft('bates-numbering');
      setProgress(100);
    } catch (err) {
      console.error('Bates numbering execution error:', err);
      setError(err.message || 'Failed to apply legal Bates numbers to the document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('bates-numbering');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setPrefix('CONF-');
    setSuffix('');
    setStartNumber(1);
    setDigits(6);
    setPosition('bottom-right');
    setFontFamily('Helvetica');
    setFontSize(10);
    setColor('#000000');
    setMargin(36);
    setSkipCoverPage(false);
    setPageScope('all');
    setPageRange('');
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      toolId="bates-numbering"
      title="Bates Numbering PDF"
      description="Add sequential legal Bates numbers, discovery stamps, and alphanumeric prefixes to your PDF."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Bates Numbering PDF Online Free — Legal Stamp Generator | DocForge"
        description="Apply sequential Bates numbering and legal discovery stamps to PDF files 100% locally in your browser."
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
                    {totalPages > 0 && (
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
                          Page {currentPage} / {totalPages}
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
                    )}

                    {/* Quick Preset Pills */}
                    <div className="hidden lg:flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">Presets:</span>
                      {BATES_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPrefix(p.prefix);
                            setDigits(p.digits);
                            setSuffix(p.suffix);
                          }}
                          className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded cursor-pointer transition-all ${
                            prefix === p.prefix
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom & Reset */}
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

              {/* Viewport Canvas Frame with Live WYSIWYG Bates Overlay */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                <div
                  className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
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
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Loading document page...</span>
                    </div>
                  )}

                  {/* Live WYSIWYG Bates Overlay */}
                  {previewText ? (
                    <div
                      style={getCompassStyles()}
                      className="transition-all duration-150 drop-shadow-sm font-mono"
                    >
                      {previewText}
                    </div>
                  ) : (
                    currentPage === 1 && skipCoverPage && (
                      <div className="absolute top-4 left-4 bg-amber-500/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm flex items-center gap-1.5 z-10">
                        <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                        <span>Cover Page (Skipped)</span>
                      </div>
                    )
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tag</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Bates Studio
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full truncate max-w-[130px]">
                  {prefix}{String(startNumber || 1).padStart(digits, '0')}{suffix}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Prefix & Suffix */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Alphanumeric Prefix & Suffix
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block mb-1">Prefix</span>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="CONF-"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block mb-1">Suffix (Optional)</span>
                      <input
                        type="text"
                        value={suffix}
                        onChange={(e) => setSuffix(e.target.value)}
                        placeholder="-A"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Start Number & Digits Padding */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Sequence & Zero Padding
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block mb-1">Start Number</span>
                      <input
                        type="number"
                        min="1"
                        value={startNumber}
                        onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-tertiary)] block mb-1">Zero Padding</span>
                      <select
                        value={digits}
                        onChange={(e) => setDigits(parseInt(e.target.value, 10))}
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-semibold focus:border-[var(--color-primary)] outline-none cursor-pointer"
                      >
                        <option value={4}>4 digits (0001)</option>
                        <option value={5}>5 digits (00001)</option>
                        <option value={6}>6 digits (000001)</option>
                        <option value={7}>7 digits (0000001)</option>
                        <option value={8}>8 digits (00000001)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. 6-Point Placement Compass */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Placement Compass
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)]">
                    {COMPASS_POSITIONS.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setPosition(pos.id)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          position === pos.id
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            position === pos.id ? 'bg-white' : 'bg-[var(--text-tertiary)]'
                          }`}
                        />
                        <span className="text-[10px] leading-tight text-center">{pos.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Typography & Styling */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Typography & Styling
                  </label>

                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {['Helvetica', 'Times Roman', 'Courier'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFontFamily(f)}
                        className={`py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all truncate ${
                          fontFamily === f
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Font Size & Margin Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span>Font Size</span>
                        <span>{fontSize}pt</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="24"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span>Margin</span>
                        <span>{margin}pt</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={margin}
                        onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setColor(swatch)}
                          className={`w-6 h-6 rounded-full border border-black/10 transition-transform cursor-pointer ${
                            color === swatch ? 'scale-125 ring-2 ring-[var(--color-primary)]' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-[var(--border-subtle)] cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {/* 5. Scope & Rules */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Scope & Rules
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Skip Cover Page (Page 1)</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Start numbering on Page 2</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={skipCoverPage}
                      onChange={(e) => setSkipCoverPage(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPageScope('all')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pageScope === 'all'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      All Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageScope('range')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pageScope === 'range'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {pageScope === 'range' && (
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="e.g. 1-5, 8, 10-15"
                      className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  )}
                </div>

                {/* 6. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_bates.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Stamping Bates sequences...
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
                  onClick={handleProcess}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Stamping ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">pin</span>
                      <span>Apply Legal Bates Numbers</span>
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
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Bates Stamping Complete!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Sequential legal discovery numbers and metadata tags have been embedded.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.newSize && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.newSize)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Sequence Range</span>
                <span className="text-xs font-mono font-extrabold text-[var(--text-primary)] truncate max-w-[150px]">
                  {result.startTag} → {result.endTag}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Position</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                  {result.position.replace('-', ' ')}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={handleDownload}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Stamped PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Stamp Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/redact-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">ink_eraser</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Redact</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Blackout legal info</p>
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

