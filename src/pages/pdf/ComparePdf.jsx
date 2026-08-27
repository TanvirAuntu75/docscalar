import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { extractPdfText, computeWordDiff, computePixelDiff } from '../../utils/diffEngine';
import { generateDiffAuditReportPdf } from '../../engines/pdf/comparePdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Columns,
  SplitSquareVertical,
  Flame,
  FileText,
  Sliders,
  Copy,
  Check,
  TrendingUp,
  Download,
  RotateCcw
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ComparePdf() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [pdfA, setPdfA] = useState(null);
  const [pdfB, setPdfB] = useState(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.0);

  // View Modes: 'side-by-side' | 'swipe' | 'heatmap' | 'text-diff'
  const [viewMode, setViewMode] = useState('side-by-side');
  const [sliderVal, setSliderVal] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [heatmapThreshold, setHeatmapThreshold] = useState(25);
  const [heatmapStats, setHeatmapStats] = useState(null);

  // Text diff state
  const [textDiffScope, setTextDiffScope] = useState('page'); // 'page' | 'all'
  const [textDiffResult, setTextDiffResult] = useState(null);
  const [isDiffingText, setIsDiffingText] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Processing & Export Result
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Canvas Refs
  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const canvasAOverlayRef = useRef(null);
  const canvasBOverlayRef = useRef(null);
  const canvasHeatmapRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('compare-pdf');
        if (draft && isMounted) {
          if (draft.fileA) {
            const fA = draft.fileA instanceof File ? draft.fileA : new File([draft.fileA.blob || draft.fileA], draft.fileA.name || 'docA.pdf', { type: 'application/pdf' });
            setFileA(fA);
          }
          if (draft.fileB) {
            const fB = draft.fileB instanceof File ? draft.fileB : new File([draft.fileB.blob || draft.fileB], draft.fileB.name || 'docB.pdf', { type: 'application/pdf' });
            setFileB(fB);
          }
          if (draft.viewMode) setViewMode(draft.viewMode);
          if (draft.heatmapThreshold) setHeatmapThreshold(draft.heatmapThreshold);
          if (draft.textDiffScope) setTextDiffScope(draft.textDiffScope);
        }
      } catch (err) {
        console.warn('Compare PDF draft recovery warning:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (fileA || fileB) {
      saveStudioDraft('compare-pdf', {
        fileA,
        fileB,
        viewMode,
        heatmapThreshold,
        textDiffScope
      });
    }
  }, [fileA, fileB, viewMode, heatmapThreshold, textDiffScope]);

  // 3. Load PDF Document A
  useEffect(() => {
    if (!fileA) {
      setPdfA(null);
      return;
    }
    let activePdf = null;
    let isCancelled = false;

    const loadA = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await fileA.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfA(pdf);
      } catch (err) {
        if (!isCancelled) setError('Failed to parse Document A. Please verify it is a valid PDF.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadA();
    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [fileA]);

  // 4. Load PDF Document B
  useEffect(() => {
    if (!fileB) {
      setPdfB(null);
      return;
    }
    let activePdf = null;
    let isCancelled = false;

    const loadB = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await fileB.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfB(pdf);
      } catch (err) {
        if (!isCancelled) setError('Failed to parse Document B. Please verify it is a valid PDF.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadB();
    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [fileB]);

  // 5. Synchronize Page Count
  useEffect(() => {
    if (pdfA && pdfB) {
      const count = Math.max(pdfA.numPages, pdfB.numPages);
      setTotalPages(count);
      setCurrentPage(1);
    } else {
      setTotalPages(0);
    }
  }, [pdfA, pdfB]);

  // 6. Render Comparative Viewports
  useEffect(() => {
    let isCancelled = false;

    const renderCanvases = async () => {
      if (!pdfA || !pdfB) return;

      try {
        const pA = Math.min(currentPage, pdfA.numPages);
        const pB = Math.min(currentPage, pdfB.numPages);

        const pageA = await pdfA.getPage(pA);
        const pageB = await pdfB.getPage(pB);

        const targetWidth = Math.round(580 * zoomScale);
        const scaleA = targetWidth / pageA.getViewport({ scale: 1.0 }).width;
        const scaleB = targetWidth / pageB.getViewport({ scale: 1.0 }).width;

        const viewportA = pageA.getViewport({ scale: scaleA });
        const viewportB = pageB.getViewport({ scale: scaleB });

        const commonHeight = Math.max(viewportA.height, viewportB.height);

        // 1. Side-by-Side Render
        const canvasA = canvasARef.current;
        if (canvasA) {
          canvasA.width = targetWidth;
          canvasA.height = commonHeight;
          const ctxA = canvasA.getContext('2d');
          ctxA.fillStyle = '#ffffff';
          ctxA.fillRect(0, 0, targetWidth, commonHeight);
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
        }

        const canvasB = canvasBRef.current;
        if (canvasB) {
          canvasB.width = targetWidth;
          canvasB.height = commonHeight;
          const ctxB = canvasB.getContext('2d');
          ctxB.fillStyle = '#ffffff';
          ctxB.fillRect(0, 0, targetWidth, commonHeight);
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
        }

        // 2. Swipe Overlay Canvases
        const canvasAOverlay = canvasAOverlayRef.current;
        if (canvasAOverlay) {
          canvasAOverlay.width = targetWidth;
          canvasAOverlay.height = commonHeight;
          const ctxAOverlay = canvasAOverlay.getContext('2d');
          ctxAOverlay.fillStyle = '#ffffff';
          ctxAOverlay.fillRect(0, 0, targetWidth, commonHeight);
          await pageA.render({ canvasContext: ctxAOverlay, viewport: viewportA }).promise;
        }

        const canvasBOverlay = canvasBOverlayRef.current;
        if (canvasBOverlay) {
          canvasBOverlay.width = targetWidth;
          canvasBOverlay.height = commonHeight;
          const ctxBOverlay = canvasBOverlay.getContext('2d');
          ctxBOverlay.fillStyle = '#ffffff';
          ctxBOverlay.fillRect(0, 0, targetWidth, commonHeight);
          await pageB.render({ canvasContext: ctxBOverlay, viewport: viewportB }).promise;
        }

        // 3. Pixel Heatmap
        if (canvasA && canvasB && canvasHeatmapRef.current) {
          const stats = computePixelDiff(canvasA, canvasB, canvasHeatmapRef.current, heatmapThreshold);
          if (!isCancelled) {
            setHeatmapStats(stats);
          }
        }
      } catch (err) {
        console.error('Failed to render comparison pages:', err);
      }
    };

    renderCanvases();

    return () => {
      isCancelled = true;
    };
  }, [pdfA, pdfB, currentPage, viewMode, heatmapThreshold, zoomScale]);

  // 7. Compute Semantic Text Diff
  useEffect(() => {
    if (!pdfA || !pdfB) return;

    let isCancelled = false;
    const runTextDiff = async () => {
      setIsDiffingText(true);
      try {
        const pNum = textDiffScope === 'page' ? currentPage : null;
        const [textDataA, textDataB] = await Promise.all([
          extractPdfText(pdfA, pNum),
          extractPdfText(pdfB, pNum)
        ]);

        if (!isCancelled) {
          const diffResult = computeWordDiff(textDataA.text, textDataB.text);
          setTextDiffResult(diffResult);
        }
      } catch (err) {
        console.error('Error running text diff:', err);
      } finally {
        if (!isCancelled) setIsDiffingText(false);
      }
    };

    runTextDiff();

    return () => {
      isCancelled = true;
    };
  }, [pdfA, pdfB, currentPage, textDiffScope]);

  // Draggable Swipe Divider
  const handleDrag = (e) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    if (clientX === null) return;

    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderVal(percent);
  };

  const copyDiffSummary = () => {
    if (!textDiffResult) return;
    const summary = [
      `=== DocForge PDF Diff Summary ===`,
      `Original: ${fileA?.name || 'Document A'}`,
      `Revision: ${fileB?.name || 'Document B'}`,
      `Scope: ${textDiffScope === 'page' ? `Page ${currentPage}` : 'Entire Document'}`,
      `Similarity Score: ${textDiffResult.similarityPercent}%`,
      `Additions: +${textDiffResult.addedCount} words`,
      `Deletions: -${textDiffResult.deletedCount} words`,
      `Unchanged: ${textDiffResult.unchangedCount} words`,
      `\n=== Detailed Changes ===\n`,
      textDiffResult.diffs
        .map((d) => {
          if (d.type === 'added') return `[+ ${d.value}]`;
          if (d.type === 'deleted') return `[- ${d.value}]`;
          return d.value;
        })
        .join(' ')
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Generate Formal Forensic Comparison Audit Report PDF
  const handleExportAuditReport = async () => {
    if (!fileA || !fileB) return;
    setProcessing(true);
    setStatusMessage('Generating Forensic Comparison Audit Report...');
    setError(null);

    try {
      const auditParams = {
        fileAName: fileA.name,
        fileBName: fileB.name,
        similarityPercent: textDiffResult?.similarityPercent ?? 100,
        addedCount: textDiffResult?.addedCount ?? 0,
        deletedCount: textDiffResult?.deletedCount ?? 0,
        unchangedCount: textDiffResult?.unchangedCount ?? 0,
        diffs: textDiffResult?.diffs ?? [],
        totalPages
      };

      const auditBlob = await generateDiffAuditReportPdf(auditParams);
      const auditFileName = `diff_report_${fileA.name.replace(/\.[^.]+$/, '')}_vs_${fileB.name.replace(/\.[^.]+$/, '')}.pdf`;

      setResult({
        blob: auditBlob,
        name: auditFileName,
        size: auditBlob.size,
        similarityPercent: auditParams.similarityPercent,
        addedCount: auditParams.addedCount,
        deletedCount: auditParams.deletedCount,
        totalPages
      });

      await saveFile(auditFileName, auditBlob.size, 'application/pdf', 'Compare PDF', auditBlob);
      await clearStudioDraft('compare-pdf');
    } catch (err) {
      setError(`Failed to generate report: ${err.message}`);
    } finally {
      setProcessing(false);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    clearStudioDraft('compare-pdf');
    setFileA(null);
    setFileB(null);
    setPdfA(null);
    setPdfB(null);
    setTotalPages(0);
    setCurrentPage(1);
    setViewMode('side-by-side');
    setTextDiffResult(null);
    setHeatmapStats(null);
    setResult(null);
    setError(null);
  };

  const downloadReport = () => {
    if (!result?.blob) return;
    saveAs(result.blob, result.name);
  };

  const attachedFiles = [fileA, fileB].filter(Boolean);

  return (
    <ToolPageLayout
      toolId="compare-pdf"
      title="Compare PDF Studio"
      description="Visual side-by-side comparison, interactive swipe divider, pixel heatmap, and semantic text diff."
      files={attachedFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Compare PDF Files Online Free — Visual Diff & Heatmap | DocForge"
        description="Spot changes between PDF revisions with pixel heatmaps, word-level text diffs, and interactive swipe overlays. 100% Client-side."
      />

      {!result ? (
        !fileA || !fileB ? (
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full p-4 sm:p-8 animate-[fadeIn_0.22s_ease-out]">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Select Two Documents to Compare
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Upload the original reference PDF (Document A) and the revised version (Document B) to inspect diffs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document A Upload Card */}
              <div className="bg-[var(--bg-primary)] p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">description</span>
                      <span>Document A (Original)</span>
                    </span>
                    {fileA && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                        Ready
                      </span>
                    )}
                  </div>

                  {fileA ? (
                    <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-primary)]/20 text-center flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-[var(--color-primary)]">
                        picture_as_pdf
                      </span>
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate max-w-xs">
                        {fileA.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{formatFileSize(fileA.size)}</div>
                      <button
                        type="button"
                        onClick={() => setFileA(null)}
                        className="mt-2 text-xs text-[var(--text-secondary)] hover:text-red-500 font-semibold cursor-pointer underline transition-colors"
                      >
                        Change File A
                      </button>
                    </div>
                  ) : (
                    <FileDropzone
                      accept=".pdf,application/pdf"
                      multiple={false}
                      files={[]}
                      setFiles={(fs) => setFileA(fs[0])}
                      compact={true}
                    />
                  )}
                </div>
              </div>

              {/* Document B Upload Card */}
              <div className="bg-[var(--bg-primary)] p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">difference</span>
                      <span>Document B (Revision)</span>
                    </span>
                    {fileB && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                        Ready
                      </span>
                    )}
                  </div>

                  {fileB ? (
                    <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-emerald-500/20 text-center flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-emerald-500">
                        picture_as_pdf
                      </span>
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate max-w-xs">
                        {fileB.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{formatFileSize(fileB.size)}</div>
                      <button
                        type="button"
                        onClick={() => setFileB(null)}
                        className="mt-2 text-xs text-[var(--text-secondary)] hover:text-red-500 font-semibold cursor-pointer underline transition-colors"
                      >
                        Change File B
                      </button>
                    </div>
                  ) : (
                    <FileDropzone
                      accept=".pdf,application/pdf"
                      multiple={false}
                      files={[]}
                      setFiles={(fs) => setFileB(fs[0])}
                      compact={true}
                    />
                  )}
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center items-center gap-2 text-xs text-[var(--text-secondary)] py-4 mt-4">
                <span className="material-symbols-outlined text-[16px] animate-spin text-[var(--color-primary)]">
                  progress_activity
                </span>
                <span>Parsing PDF structures...</span>
              </div>
            )}

            {error && (
              <div className="p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 text-center font-medium">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* ACTIVE STUDIO WORKSPACE: Interactive Dual Viewport & Unified Sidebar      */
          /* ========================================================================= */
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* LEFT / CENTER: Interactive Comparison Viewport */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Mode Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setViewMode('side-by-side')}
                        className={`py-1 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'side-by-side'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Columns size={13} />
                        <span>Side-by-Side</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('swipe')}
                        className={`py-1 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'swipe'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <SplitSquareVertical size={13} />
                        <span>Swipe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('heatmap')}
                        className={`py-1 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'heatmap'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Flame size={13} />
                        <span>Heatmap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode('text-diff')}
                        className={`py-1 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'text-diff'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <FileText size={13} />
                        <span>Text Diff</span>
                      </button>
                    </div>

                    {/* Pagination Capsule */}
                    {totalPages > 0 && (
                      <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
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
                      onClick={handleReset}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset comparison"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                {/* 1. Side-by-Side Mode */}
                {viewMode === 'side-by-side' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-[var(--color-primary)]">
                        <span className="truncate max-w-[200px]">Doc A: {fileA?.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-normal">Page {Math.min(currentPage, pdfA?.numPages || 1)}</span>
                      </div>
                      <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 bg-white max-w-full">
                        <canvas ref={canvasARef} className="block max-w-full h-auto" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="truncate max-w-[200px]">Doc B: {fileB?.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-normal">Page {Math.min(currentPage, pdfB?.numPages || 1)}</span>
                      </div>
                      <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 bg-white max-w-full">
                        <canvas ref={canvasBRef} className="block max-w-full h-auto" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Swipe Mode */}
                {viewMode === 'swipe' && (
                  <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5 text-[var(--color-primary)]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                        <span>Left: Original (A)</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Right: Revision (B)</span>
                      </span>
                    </div>

                    <div
                      ref={containerRef}
                      onMouseMove={handleDrag}
                      onTouchMove={handleDrag}
                      onMouseUp={() => setIsDragging(false)}
                      onTouchEnd={() => setIsDragging(false)}
                      className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 select-none max-w-full bg-white cursor-ew-resize"
                    >
                      <canvas ref={canvasAOverlayRef} className="block max-w-full h-auto pointer-events-none" />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ clipPath: `inset(0 0 0 ${sliderVal}%)` }}
                      >
                        <canvas ref={canvasBOverlayRef} className="block w-full h-full" />
                      </div>

                      {/* Vertical Handle */}
                      <div
                        onMouseDown={(e) => {
                          setIsDragging(true);
                          e.preventDefault();
                        }}
                        onTouchStart={(e) => {
                          setIsDragging(true);
                          e.preventDefault();
                        }}
                        className="absolute top-0 bottom-0 z-20 cursor-ew-resize"
                        style={{
                          left: `${sliderVal}%`,
                          width: '3px',
                          backgroundColor: 'var(--color-primary)',
                          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center text-xs font-bold cursor-ew-resize">
                          ⇄
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Heatmap Mode */}
                {viewMode === 'heatmap' && (
                  <div className="flex flex-col items-center gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 bg-white max-w-full">
                      <canvas ref={canvasHeatmapRef} className="block max-w-full h-auto" />
                    </div>
                  </div>
                )}

                {/* 4. Text Diff Mode */}
                {viewMode === 'text-diff' && (
                  <div className="w-full max-w-4xl bg-[var(--bg-primary)] p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xl font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
                    {isDiffingText ? (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] gap-2">
                        <span className="material-symbols-outlined text-[24px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        <span>Aligning text streams...</span>
                      </div>
                    ) : textDiffResult ? (
                      <div className="space-x-1">
                        {textDiffResult.diffs.map((token, idx) => {
                          if (token.type === 'added') {
                            return (
                              <span
                                key={idx}
                                className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded font-bold"
                              >
                                +{token.value}
                              </span>
                            );
                          }
                          if (token.type === 'deleted') {
                            return (
                              <span
                                key={idx}
                                className="bg-rose-500/20 text-rose-600 dark:text-rose-400 line-through border border-rose-500/30 px-1 py-0.5 rounded font-bold opacity-80"
                              >
                                -{token.value}
                              </span>
                            );
                          }
                          return (
                            <span key={idx} className="text-[var(--text-primary)]">
                              {token.value}{' '}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-[var(--text-secondary)] italic py-16">
                        No text extracted. Ensure the documents contain a searchable text layer.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Studio Options Sidebar */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">difference</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Diff Metrics
                  </span>
                </div>
                {textDiffResult && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {textDiffResult.similarityPercent}% Match
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Comparison Scope */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Text Diff Scope
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setTextDiffScope('page')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        textDiffScope === 'page'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Page {currentPage}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextDiffScope('all')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        textDiffScope === 'all'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      All Pages ({totalPages})
                    </button>
                  </div>
                </div>

                {/* 2. Heatmap Sensitivity Slider (When in Heatmap Mode) */}
                {viewMode === 'heatmap' && (
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <Sliders size={13} />
                        <span>Pixel Sensitivity</span>
                      </span>
                      <span>{heatmapThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={heatmapThreshold}
                      onChange={(e) => setHeatmapThreshold(parseInt(e.target.value, 10))}
                      className="w-full accent-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>More Sensitive</span>
                      <span>Less Sensitive</span>
                    </div>
                  </div>
                )}

                {/* 3. Live Difference Telemetry Cards */}
                {textDiffResult && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Word Statistics
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Additions</span>
                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                          +{textDiffResult.addedCount}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Deletions</span>
                        <span className="text-base font-extrabold text-rose-700 dark:text-rose-300">
                          -{textDiffResult.deletedCount}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Unchanged Words</span>
                      <span className="font-bold text-[var(--text-primary)]">{textDiffResult.unchangedCount}</span>
                    </div>

                    {heatmapStats && (
                      <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Pixel Variance</span>
                        <span className="font-bold text-[var(--color-primary)]">{heatmapStats.diffRatio}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Quick 1-Click Clipboard Action */}
                <button
                  type="button"
                  onClick={copyDiffSummary}
                  disabled={!textDiffResult}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {copiedReport ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedReport ? 'Diff Summary Copied!' : 'Copy Summary to Clipboard'}</span>
                </button>

                {statusMessage && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleExportAuditReport}
                  disabled={processing || !fileA || !fileB}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Generating Audit...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Export Comparison Audit PDF</span>
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
              <span className="material-symbols-outlined text-[40px]">fact_check</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Comparison Report Ready!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                A cryptographic comparison audit document has been compiled and verified.
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

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Similarity</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {result.similarityPercent}%
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Additions</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">+{result.addedCount}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Deletions</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">-{result.deletedCount}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadReport}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Audit Report PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={handleReset}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Compare Another Pair</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with These Documents
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/edit-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">edit_document</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Edit PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Make adjustments</p>
                  </div>
                </Link>

                <Link
                  to="/merge-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">call_merge</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Merge PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Combine documents</p>
                  </div>
                </Link>

                <Link
                  to="/redact-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">security</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Redact PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Sanitize sensitive text</p>
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
