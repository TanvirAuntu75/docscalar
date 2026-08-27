import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { splitPdf as localSplitPdf } from '../../engines/pdf/splitPdf';
import { formatFileSize } from '../../utils/constants';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Palette for visual range badges
const RANGE_COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', ring: 'ring-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-500 text-white' },
  { name: 'Blue', bg: 'bg-blue-500/10', border: 'border-blue-500/40', ring: 'ring-blue-500', text: 'text-blue-500', badge: 'bg-blue-500 text-white' },
  { name: 'Purple', bg: 'bg-purple-500/10', border: 'border-purple-500/40', ring: 'ring-purple-500', text: 'text-purple-500', badge: 'bg-purple-500 text-white' },
  { name: 'Amber', bg: 'bg-amber-500/10', border: 'border-amber-500/40', ring: 'ring-amber-500', text: 'text-amber-500', badge: 'bg-amber-500 text-white' },
  { name: 'Rose', bg: 'bg-rose-500/10', border: 'border-rose-500/40', ring: 'ring-rose-500', text: 'text-rose-500', badge: 'bg-rose-500 text-white' },
  { name: 'Cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', ring: 'ring-cyan-500', text: 'text-cyan-500', badge: 'bg-cyan-500 text-white' },
];

export default function SplitPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('range');
  const [rangeMode, setRangeMode] = useState('custom'); 
  const [customRanges, setCustomRanges] = useState([{ id: 1, start: 1, end: 1 }]);
  const [mergeRanges, setMergeRanges] = useState(false);
  const [extractMode, setExtractMode] = useState('selected'); 
  const [selectedPages, setSelectedPages] = useState([]); 
  const [mergeExtracted, setMergeExtracted] = useState(true);
  const [rangeInputStr, setRangeInputStr] = useState('');
  const [fixedInterval, setFixedInterval] = useState(2);
  const [maxSizeMb, setMaxSizeMb] = useState(5);
  const [zoomLevel, setZoomLevel] = useState(2); 
  const [searchQuery, setSearchQuery] = useState('');
  const [outputFileName, setOutputFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const canvasRefs = useRef({});
  const pdfInstanceRef = useRef(null);
  const fileInputRef = useRef(null);
  const [backendActive, setBackendActive] = useState(false);
  const poller = useJobPoller(BACKEND_URL);

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('split-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.activeTab) setActiveTab(draft.activeTab);
          if (draft.rangeMode) setRangeMode(draft.rangeMode);
          if (draft.customRanges) setCustomRanges(draft.customRanges);
          if (draft.selectedPages) setSelectedPages(draft.selectedPages);
          if (draft.fixedInterval) setFixedInterval(draft.fixedInterval);
          if (draft.mergeRanges !== undefined) setMergeRanges(draft.mergeRanges);
          if (draft.mergeExtracted !== undefined) setMergeExtracted(draft.mergeExtracted);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Split draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('split-pdf', { files, activeTab, rangeMode, customRanges, selectedPages, fixedInterval, mergeRanges, mergeExtracted, outputFileName });
    }
  }, [files, activeTab, rangeMode, customRanges, selectedPages, fixedInterval, mergeRanges, mergeExtracted, outputFileName]);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        setBackendActive(res.ok);
      } catch (e) { setBackendActive(false); }
    };
    checkServer();
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0); setSelectedPages([]); setThumbnails([]); return;
    }
    if (activeFileIndex >= files.length) { setActiveFileIndex(0); return; }
    let isCancelled = false;
    const loadPdfThumbnails = async () => {
      setProcessing(true); setError(null);
      try {
        const file = files[activeFileIndex];
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        if (isCancelled) { pdf.destroy(); return; }
        pdfInstanceRef.current = pdf;
        const count = pdf.numPages;
        setTotalPages(count);
        setSelectedPages(Array.from({ length: count }, (_, idx) => idx));
        setCustomRanges([{ id: 1, start: 1, end: count }]);
        const baseName = file.name.replace(/\.[^.]+$/, '');
        setOutputFileName(`${baseName}-split.zip`);
        setThumbnails(Array.from({ length: count }, (_, idx) => idx + 1));
        setProcessing(false);
        setTimeout(async () => {
          for (let i = 1; i <= count; i++) {
            if (isCancelled) break;
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 0.35 });
              const canvas = canvasRefs.current[i - 1];
              if (canvas) {
                canvas.width = viewport.width; canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              }
            } catch (err) { console.warn(`Error rendering thumbnail page ${i}:`, err); }
          }
        }, 80);
      } catch (err) {
        if (!isCancelled) { setProcessing(false); setError('Failed to parse PDF document.'); }
      }
    };
    loadPdfThumbnails();
    return () => { isCancelled = true; if (pdfInstanceRef.current) pdfInstanceRef.current.destroy(); };
  }, [files, activeFileIndex]);

  const addCustomRange = () => {
    const nextStart = customRanges.length > 0 ? Math.min(totalPages, customRanges[customRanges.length - 1].end + 1) : 1;
    setCustomRanges((prev) => [...prev, { id: Date.now(), start: nextStart, end: Math.min(totalPages, nextStart + 1) }]);
  };

  const removeCustomRange = (id) => { if (customRanges.length > 1) setCustomRanges((prev) => prev.filter((r) => r.id !== id)); };

  const updateCustomRange = (id, field, val) => {
    setCustomRanges((prev) => prev.map((r) => r.id === id ? { ...r, [field]: Math.max(1, Math.min(totalPages, parseInt(val) || 1)) } : r));
  };

  const handleSelectAll = () => setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx));
  const handleSelectOdd = () => setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx).filter((idx) => idx % 2 === 0));
  const handleSelectEven = () => setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx).filter((idx) => idx % 2 !== 0));
  const handleClearSelection = () => setSelectedPages([]);
  const togglePageSelection = (idx) => {
    setSelectedPages((prev) => prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx].sort((a, b) => a - b));
  };

  const handleRangeInputSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      const val = rangeInputStr.trim();
      if (!val) return;
      const indices = new Set();
      val.split(',').forEach((part) => {
        const range = part.trim().split('-');
        if (range.length === 2) {
          const start = parseInt(range[0]) - 1, end = parseInt(range[1]) - 1;
          for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) indices.add(i);
        } else {
          const num = parseInt(part.trim()) - 1;
          if (!isNaN(num) && num >= 0 && num < totalPages) indices.add(num);
        }
      });
      setSelectedPages(Array.from(indices).sort((a, b) => a - b));
      if (e.key === 'Enter') setRangeInputStr('');
    }
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const pageRangeMapping = useMemo(() => {
    const mapping = {};
    if (activeTab === 'range' && rangeMode === 'custom') {
      customRanges.forEach((r, rIdx) => {
        const color = RANGE_COLORS[rIdx % RANGE_COLORS.length];
        for (let p = r.start; p <= r.end; p++) {
          if (!mapping[p]) mapping[p] = [];
          mapping[p].push({ label: `R${rIdx + 1}`, color });
        }
      });
    } else if (activeTab === 'fixed') {
      const interval = Math.max(1, fixedInterval);
      for (let p = 1; p <= totalPages; p++) {
        const part = Math.ceil(p / interval);
        mapping[p] = [{ label: `P${part}`, color: RANGE_COLORS[(part - 1) % RANGE_COLORS.length] }];
      }
    }
    return mapping;
  }, [activeTab, rangeMode, customRanges, fixedInterval, totalPages]);

  const handleSplit = async () => {
    if (!files.length) return;
    setError(null);
    let modeArg = 'all', rangeArg = '', extraArg = {};
    if (activeTab === 'range') {
      if (rangeMode === 'custom') { modeArg = 'custom-ranges'; rangeArg = JSON.stringify(customRanges.map(r => [r.start, r.end])); extraArg = { merge_ranges: mergeRanges }; }
      else if (rangeMode === 'bookmarks') modeArg = 'by-bookmarks';
      else if (rangeMode === 'blank') modeArg = 'by-blank-page';
    } else if (activeTab === 'fixed') { modeArg = 'fixed-ranges'; rangeArg = String(fixedInterval); }
    else if (activeTab === 'extract') {
      if (extractMode === 'all') modeArg = 'all';
      else { modeArg = 'select-pages'; rangeArg = selectedPages.map(p => p + 1).join(','); extraArg = { merge_output: mergeExtracted }; if (!selectedPages.length) { setError('Select pages'); return; } }
    } else if (activeTab === 'size') { modeArg = 'size-limit'; extraArg = { max_bytes: maxSizeMb * 1024 * 1024 }; }
    setProcessing(true);
    if (backendActive) {
      try {
        const uploadData = await uploadFileSecure(BACKEND_URL, files[activeFileIndex], setProgress);
        const fd = new FormData();
        fd.append('file_id', uploadData.file_id); fd.append('mode', modeArg); fd.append('range', rangeArg); fd.append('extra_params', JSON.stringify(extraArg));
        const res = await apiFetch(`${BACKEND_URL}/api/convert/split-pdf`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error();
        poller.startPolling((await res.json()).job_id);
      } catch { runLocalFallback(modeArg, rangeArg, extraArg); }
    } else runLocalFallback(modeArg, rangeArg, extraArg);
  };

  const runLocalFallback = async (modeArg, rangeArg, extraArg) => {
    try {
      const localMode = modeArg === 'fixed-ranges' ? 'equal-intervals' : (['custom-ranges', 'select-pages'].includes(modeArg) ? 'range' : (['by-bookmarks', 'by-blank-page'].includes(modeArg) ? modeArg : 'all'));
      const localRange = modeArg === 'custom-ranges' ? JSON.parse(rangeArg).map(r => `${r[0]}-${r[1]}`).join(',') : (modeArg === 'select-pages' ? rangeArg : (modeArg === 'fixed-ranges' ? rangeArg : ''));
      setProgress(40);
      const res = await localSplitPdf(files[activeFileIndex], localMode, localRange, setProgress);
      const isSinglePdf = res.blobs.length === 1;
      const finalName = isSinglePdf ? `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}_extracted.pdf` : outputFileName;
      setResult({ localResult: res, name: finalName, filesCount: res.blobs.length, isSinglePdf, totalSize: res.blobs.reduce((acc, b) => acc + b.size, 0) });
      if (isSinglePdf) await saveFile(finalName, res.blobs[0].size, res.blobs[0].type, 'Split PDF', res.blobs[0]);
      else {
        const zip = new JSZip();
        res.blobs.forEach((b, i) => zip.file(res.names[i], b));
        const blob = await zip.generateAsync({ type: 'blob' });
        await saveFile(finalName, blob.size, 'application/zip', 'Split PDF', blob);
      }
      clearStudioDraft('split-pdf'); setProcessing(false);
    } catch (err) { setError(err.message); setProcessing(false); }
  };

  const downloadAll = async () => {
    if (result.downloadUrl) saveAs(result.downloadUrl, result.name);
    else if (result.localResult) {
      if (result.isSinglePdf) saveAs(result.localResult.blobs[0], result.name);
      else {
        const zip = new JSZip();
        result.localResult.blobs.forEach((b, i) => zip.file(result.localResult.names[i], b));
        saveAs(await zip.generateAsync({ type: 'blob' }), result.name);
      }
    }
  };

  const resetWorkspace = () => { clearStudioDraft('split-pdf'); setFiles([]); setResult(null); setError(null); setProcessing(false); setTotalPages(0); setThumbnails([]); };

  const getGridTemplate = () => {
    switch (zoomLevel) {
      case 1:
        return 'repeat(auto-fill, minmax(120px, 1fr))';
      case 3:
        return 'repeat(auto-fill, minmax(220px, 1fr))';
      default:
        return 'repeat(auto-fill, minmax(165px, 1fr))';
    }
  };

  const visibleThumbnails = thumbnails.filter((pageNum) => {
    if (!searchQuery) return true;
    return pageNum.toString().includes(searchQuery);
  });

  return (
    <ToolPageLayout
      toolId="split-pdf"
      title="Split PDF"
      description="Extract specific pages, partition custom ranges, split at intervals, or divide outline bookmarks."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Split PDF Pages Online Free (100% Local) | DocForge"
        description="Split PDF pages online. Choose Custom Ranges, Fixed Intervals, Size-Based limits, or Visual selection grid thumbnail extractor. Fully responsive & private."
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
            {/* LEFT / CENTER: Visual Page Canvas Workspace                                */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative bg-[var(--bg-tertiary)]">
              {/* Sticky Workspace Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
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
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[220px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({totalPages} pages)</span>
                      </div>
                    )}

                    <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1.5 shadow-xs">
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

                    {/* Mode Tag */}
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                      <span className="material-symbols-outlined text-[13px]">
                        {activeTab === 'range' ? 'tune' : activeTab === 'extract' ? 'call_split' : activeTab === 'fixed' ? 'splitscreen' : 'straighten'}
                      </span>
                      {activeTab === 'range' ? 'Custom Ranges' : activeTab === 'extract' ? 'Extract Pages' : activeTab === 'fixed' ? 'Fixed Intervals' : 'Size Limit'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="relative hidden md:block">
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-[15px] text-[var(--text-secondary)] pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Page #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg outline-none focus:border-[var(--color-primary)] w-28 focus:w-36 transition-all"
                      />
                    </div>

                    {/* Card Size / Zoom Slider */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_out</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                        className="w-16 h-1 accent-[var(--color-primary)] cursor-pointer"
                        title="Adjust page thumbnail size"
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

                {/* Extract Mode Quick Action Strip */}
                {activeTab === 'extract' && extractMode === 'selected' && (
                  <div className="px-4 py-2 bg-[var(--color-primary)]/10 border-t border-[var(--color-primary)]/20 flex items-center justify-between flex-wrap gap-2 animate-[fadeIn_0.15s_ease-out]">
                    <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_box</span>
                      {selectedPages.length} of {totalPages} Pages Selected for Extraction
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectOdd}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Odd
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectEven}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Even
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="btn btn-ghost btn-sm text-xs py-1 text-[var(--text-secondary)]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Grid of PDF Pages */}
              <div className="workspace-canvas flex-1 p-4 sm:p-6">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: getGridTemplate(),
                    gap: zoomLevel === 1 ? '0.75rem' : '1.25rem'
                  }}
                  className="w-full"
                >
                  {visibleThumbnails.map((pageNum) => {
                    const idx = pageNum - 1;
                    const isSelected = selectedPages.includes(idx);
                    const rangeBadges = pageRangeMapping[pageNum] || [];
                    const hasRangeBadge = rangeBadges.length > 0;
                    const primaryBadge = rangeBadges[0];
                    const isInteractiveExtract = activeTab === 'extract' && extractMode === 'selected';

                    return (
                      <div
                        key={pageNum}
                        onClick={() => {
                          if (isInteractiveExtract) togglePageSelection(idx);
                        }}
                        className={`group relative flex flex-col bg-[var(--bg-primary)] border rounded-xl overflow-hidden select-none transition-all shadow-xs hover:shadow-md ${
                          isInteractiveExtract ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          isInteractiveExtract
                            ? isSelected
                              ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                              : 'border-[var(--border-subtle)] opacity-50 hover:opacity-100 hover:border-[var(--color-primary)]/60'
                            : hasRangeBadge
                            ? `ring-1 ${primaryBadge.color.ring} ${primaryBadge.color.border}`
                            : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        {/* Sequence Number Badge & Checkbox */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                          {isInteractiveExtract && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePageSelection(idx)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                            />
                          )}
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            #{pageNum}
                          </span>
                        </div>

                        {/* Top-Right Visual Range Badges */}
                        {hasRangeBadge && (
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            {rangeBadges.map((rb, rbIdx) => (
                              <span
                                key={rbIdx}
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs ${rb.color.badge}`}
                                title={`Belongs to Range ${rb.label}`}
                              >
                                {rb.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Page Preview Canvas */}
                        <div className="w-full aspect-[4/5] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                          <canvas
                            ref={(el) => (canvasRefs.current[idx] = el)}
                            className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-xs"
                          />
                        </div>

                        {/* Card Footer Details */}
                        <div className="p-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                            Page {pageNum}
                          </span>
                          {hasRangeBadge && (
                            <span className={`text-[10px] font-bold ${primaryBadge.color.text}`}>
                              {primaryBadge.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">call_split</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Split Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Mode Segmented Switcher */}
                <div className="p-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('range')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'range'
                        ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Ranges
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('extract')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'extract'
                        ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Extract
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fixed')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'fixed'
                        ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('size')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'size'
                        ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Size
                  </button>
                </div>

                {/* 2. TAB CONTENT: Custom Ranges */}
                {activeTab === 'range' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Custom Ranges
                      </span>
                      <button
                        type="button"
                        onClick={addCustomRange}
                        className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Add Range
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                      {customRanges.map((r, i) => {
                        const color = RANGE_COLORS[i % RANGE_COLORS.length];

                        return (
                          <div
                            key={r.id}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border bg-[var(--bg-secondary)] ${color.border}`}
                          >
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${color.badge}`}>
                              R{i + 1}
                            </span>
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-[11px] text-[var(--text-secondary)] font-medium">From</span>
                              <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={r.start}
                                onChange={(e) => updateCustomRange(r.id, 'start', e.target.value)}
                                className="w-14 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-xs px-2 py-1 text-center font-bold text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                              />
                              <span className="text-[11px] text-[var(--text-secondary)] font-medium">to</span>
                              <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={r.end}
                                onChange={(e) => updateCustomRange(r.id, 'end', e.target.value)}
                                className="w-14 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-xs px-2 py-1 text-center font-bold text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                              />
                            </div>
                            {customRanges.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCustomRange(r.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Remove range"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={mergeRanges}
                        onChange={(e) => setMergeRanges(e.target.checked)}
                        className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Merge all ranges into one single PDF
                      </span>
                    </label>
                  </div>
                )}

                {/* 3. TAB CONTENT: Extract Pages */}
                {activeTab === 'extract' && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Extraction Mode
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExtractMode('selected')}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          extractMode === 'selected'
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        Selected Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtractMode('all')}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          extractMode === 'all'
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        All Pages (1-Page)
                      </button>
                    </div>

                    {extractMode === 'selected' && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Range String (e.g. 1-4, 7, 10)
                          </label>
                          <input
                            type="text"
                            placeholder="Type page range and press Enter"
                            value={rangeInputStr}
                            onChange={(e) => setRangeInputStr(e.target.value)}
                            onKeyDown={handleRangeInputSubmit}
                            className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                          />
                        </div>

                        <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mergeExtracted}
                            onChange={(e) => setMergeExtracted(e.target.checked)}
                            className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            Merge extracted pages into one PDF
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TAB CONTENT: Fixed Interval */}
                {activeTab === 'fixed' && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Fixed Page Intervals
                    </span>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl">
                      <span className="text-xs font-semibold text-[var(--text-primary)] flex-1">
                        Split every:
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={fixedInterval}
                          onChange={(e) => setFixedInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-xs px-2 py-1 text-center font-bold text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">pages</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Generates <strong>{Math.ceil(totalPages / Math.max(1, fixedInterval))}</strong> separate PDF files containing {fixedInterval} page(s) each.
                    </p>
                  </div>
                )}

                {/* 5. TAB CONTENT: Size Limit */}
                {activeTab === 'size' && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Maximum File Size
                    </span>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl">
                      <span className="text-xs font-semibold text-[var(--text-primary)] flex-1">
                        Max size per PDF:
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={maxSizeMb}
                          onChange={(e) => setMaxSizeMb(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-xs px-2 py-1 text-center font-bold text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">MB</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Output Filename */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="split.zip"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 7. Overview Metrics */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Source Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">{totalPages} pages</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Target Outputs</span>
                      <span className="font-bold text-[var(--color-primary)]">
                        {activeTab === 'range'
                          ? mergeRanges
                            ? '1 Combined PDF'
                            : `${customRanges.length} Separate PDFs`
                          : activeTab === 'extract'
                          ? extractMode === 'all'
                            ? `${totalPages} PDFs (ZIP)`
                            : mergeExtracted
                            ? '1 Combined PDF'
                            : `${selectedPages.length} PDFs (ZIP)`
                          : activeTab === 'fixed'
                          ? `${Math.ceil(totalPages / Math.max(1, fixedInterval))} PDFs (ZIP)`
                          : 'Size-Partitioned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Visible while processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Splitting document...
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
                  onClick={handleSplit}
                  disabled={
                    processing ||
                    totalPages === 0 ||
                    (activeTab === 'extract' && extractMode === 'selected' && selectedPages.length === 0)
                  }
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Splitting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Split PDF</span>
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
        /* RESULT VIEW: Premium High-Fidelity Download Card                           */
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
                PDF Successfully Split!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Generated {result.filesCount} file{result.filesCount > 1 ? 's' : ''} from your document.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.isSinglePdf ? 'description' : 'folder_zip'}
                </span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.totalSize && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.totalSize)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadAll}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>{result.isSinglePdf ? 'Download PDF' : 'Download ZIP'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Split Another</span>
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
