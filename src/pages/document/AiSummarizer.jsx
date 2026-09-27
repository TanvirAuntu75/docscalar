import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { summarizePdfDocument, generateSummaryReportPdf } from '../../engines/document/aiSummarizer';
import { summarizeDocument } from '../../utils/textRank';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  FileCheck,
  LayoutGrid,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  SplitSquareVertical,
  FileText,
  Zap,
  TrendingDown,
  BookOpen
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function AiSummarizer() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'gallery'
  const [docLoading, setDocLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [extractedFullText, setExtractedFullText] = useState('');

  // Summarization State
  const [summaryMode, setSummaryMode] = useState('executive'); // 'executive' | 'highlights' | 'bullet' | 'detailed'
  const [sentenceBudget, setSentenceBudget] = useState(6);
  const [liveSummary, setLiveSummary] = useState(null);
  const [outputFileName, setOutputFileName] = useState('');
  const [copied, setCopied] = useState(false);

  // Processing & Results
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('summarize-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.summaryMode) setSummaryMode(draft.summaryMode);
          if (draft.sentenceBudget) setSentenceBudget(draft.sentenceBudget);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('AI Summarizer draft recovery failed:', err);
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
      saveStudioDraft('summarize-pdf', {
        files,
        summaryMode,
        sentenceBudget,
        outputFileName
      });
    }
  }, [files, summaryMode, sentenceBudget, outputFileName]);

  // 3. Load PDF with PDF.js for Preview & Text Extraction
  useEffect(() => {
    if (files.length === 0) {
      setPdfDoc(null);
      setNumPages(0);
      setExtractedFullText('');
      setLiveSummary(null);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isMounted = true;

    const loadDoc = async () => {
      setDocLoading(true);
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = loadPdfDocument(new Uint8Array(arrayBuffer));
        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setActivePage(1);

        // Extract full document text across pages
        const fullTexts = [];
        for (let i = 1; i <= loadedDoc.numPages; i++) {
          const page = await loadedDoc.getPage(i);
          const content = await page.getTextContent();
          const strings = (content.items || []).map((item) => item.str).filter((s) => s.trim().length > 0);
          fullTexts.push(strings.join(' '));
        }

        const combinedText = fullTexts.join('\n\n');
        if (isMounted) {
          setExtractedFullText(combinedText);
          const summary = summarizeDocument(combinedText, { mode: summaryMode, maxSentences: sentenceBudget });
          setLiveSummary(summary);

          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_executive_summary.pdf`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to extract readable text from document.');
        }
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [files, activeFileIndex]);

  // 4. Update Live Summary when Mode or Budget Changes
  useEffect(() => {
    if (extractedFullText.trim()) {
      try {
        const summary = summarizeDocument(extractedFullText, { mode: summaryMode, maxSentences: sentenceBudget });
        setLiveSummary(summary);
      } catch (e) {
        console.warn('Live summary re-score error:', e);
      }
    }
  }, [summaryMode, sentenceBudget, extractedFullText]);

  // 5. Render Active Page in Inspect Mode
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(activePage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderContext = { canvasContext: context, viewport };
          await page.render(renderContext).promise;
        }
      } catch (err) {
        console.warn('Canvas render error:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePage, viewMode, zoomScale]);

  // 6. Execute Executive Report Generation
  const handleGenerateReport = async () => {
    if (!files.length || !liveSummary) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(15);
    setStatusMessage('Synthesizing executive insights and key takeaways...');

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName.trim().endsWith('.pdf')
      ? outputFileName.trim()
      : `${outputFileName.trim() || file.name.replace(/\.[^.]+$/, '')}_executive_summary.pdf`;

    try {
      setProgress(50);
      setStatusMessage('Typesetting publication-grade PDF brief...');

      const reportBlob = await generateSummaryReportPdf(liveSummary, {
        documentTitle: `Executive Brief: ${file.name.replace(/\.[^.]+$/, '')}`,
        sourceFileName: file.name,
        mode: summaryMode
      });

      setProgress(90);
      setStatusMessage('Finalizing document payload...');

      setProcessing(false);
      setResult({
        blob: reportBlob,
        name: finalName,
        size: reportBlob.size,
        pagesCount: numPages,
        summary: liveSummary,
        mode: summaryMode
      });

      await saveFile(finalName, reportBlob.size, 'application/pdf', 'AI Summarizer', reportBlob);
      await clearStudioDraft('summarize-pdf');
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during Executive Report generation.');
    }
  };

  const handleCopyText = () => {
    if (!liveSummary) return;
    const textToCopy = liveSummary.highlights
      ? liveSummary.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n\n')
      : liveSummary.summary || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('summarize-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    setPdfDoc(null);
    setNumPages(0);
    setExtractedFullText('');
    setLiveSummary(null);
  };

  const currentFile = files[activeFileIndex] || files[0];

  return (
    <ToolPageLayout
      toolId="ai-summarizer"
      title="AI Document Summarizer Studio"
      description="Condense multi-page PDF documents and research papers into executive briefs, key takeaways, and structured insights in seconds."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="AI PDF Summarizer Online Free — Executive Document Briefs | DocScalar"
        description="Summarize PDF documents and research reports with advanced AI graph centrality. Fast, secure, and encrypted document processing with zero data retention."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf,.docx,.txt"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Dual-Pane Summary Stage                        */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-purple-500">auto_awesome</span>
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
                        <span className="material-symbols-outlined text-[16px] text-purple-500">auto_awesome</span>
                        <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* Mode Switcher Pill */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                      {[
                        { id: 'executive', label: 'Executive Brief' },
                        { id: 'highlights', label: 'Key Highlights' },
                        { id: 'bullet', label: 'Bullets' },
                        { id: 'detailed', label: 'Abstract' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSummaryMode(m.id)}
                          className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                            summaryMode === m.id
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setViewMode('split')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'split'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <SplitSquareVertical size={13} />
                        <span>Dual View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('gallery')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'gallery'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <LayoutGrid size={13} />
                        <span>Gallery</span>
                      </button>
                    </div>

                    {/* Page Navigation */}
                    {numPages > 1 && (
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                          disabled={activePage <= 1}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="font-semibold text-[var(--text-primary)] px-1">
                          {activePage} / {numPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePage((p) => Math.min(numPages, p + 1))}
                          disabled={activePage >= numPages}
                          className="p-1 hover:text-[var(--color-primary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="flex items-center gap-1 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Copy summary text"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

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

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
                {docLoading ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] my-auto">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-purple-500">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Analyzing semantic document structures...</span>
                  </div>
                ) : viewMode === 'split' ? (
                  /* Dual Side-by-Side View */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl w-full">
                    {/* Left: Original Document Canvas */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
                        <span>Source Document (Page {activePage})</span>
                        <span className="text-[10px] text-slate-400">PDF Canvas</span>
                      </div>
                      <div
                        className="relative bg-white shadow-xl rounded-2xl border border-slate-300 dark:border-slate-800 p-2 overflow-hidden flex flex-col transition-transform duration-150 origin-top"
                        style={{ transform: `scale(${zoomScale})` }}
                      >
                        <canvas ref={canvasRef} className="rounded-xl max-w-full h-auto" />
                      </div>
                    </div>

                    {/* Right: Live Executive Summary Card */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1.5 text-purple-500">
                          <Sparkles size={14} />
                          <span>AI Executive Brief</span>
                        </span>
                        {liveSummary && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
                            {liveSummary.stats?.reductionPct || 70}% Condensed
                          </span>
                        )}
                      </div>

                      <div
                        className="relative bg-[var(--bg-primary)] shadow-xl rounded-2xl border border-[var(--border-subtle)] p-6 flex flex-col gap-4 min-h-[420px] transition-transform duration-150 origin-top"
                        style={{ transform: `scale(${zoomScale})` }}
                      >
                        {/* Diagnostics Metric Pills */}
                        {liveSummary && (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] text-center">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Original</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{liveSummary.stats?.originalWords || 0} words</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Summary</span>
                              <span className="text-xs font-bold text-purple-500">{liveSummary.stats?.summaryWords || 0} words</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Reduction</span>
                              <span className="text-xs font-bold text-emerald-500">-{liveSummary.stats?.reductionPct || 0}%</span>
                            </div>
                          </div>
                        )}

                        {/* Executive Insights Content */}
                        <div className="flex-1 overflow-y-auto space-y-3 text-xs leading-relaxed text-[var(--text-primary)] pr-1">
                          {liveSummary && liveSummary.highlights && liveSummary.highlights.length > 0 ? (
                            liveSummary.highlights.map((highlight, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)]">
                                <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <p className="text-[var(--text-primary)]">{highlight}</p>
                              </div>
                            ))
                          ) : (
                            <p className="italic text-[var(--text-secondary)]">Analyzing document content to extract key findings...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Thumbnail Gallery Stage */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl w-full">
                    {Array.from({ length: numPages }, (_, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setActivePage(i + 1);
                          setViewMode('split');
                        }}
                        className="group relative bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-purple-500 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                          <BookOpen size={28} className="text-purple-500 opacity-60 mb-2" />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Page {i + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-secondary)]">
                          <span>Page {i + 1}</span>
                          <span className="text-purple-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Inspect →
                          </span>
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
                  <span className="material-symbols-outlined text-[18px] text-purple-500">auto_awesome</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Summary Options
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  AI Graph
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Summary Format */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Summary Format
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'executive', name: 'Executive Brief', desc: 'Core goals, high-impact findings & takeaways' },
                      { id: 'highlights', name: 'Top Highlights', desc: 'Key milestone bullet points' },
                      { id: 'bullet', name: 'Structured Bullets', desc: 'Comprehensive categorized breakdown' },
                      { id: 'detailed', name: 'Detailed Abstract', desc: 'Deep paragraph-level academic synthesis' }
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSummaryMode(m.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-0.5 ${
                          summaryMode === m.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-xs'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{m.name}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            summaryMode === m.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--border-subtle)]'
                          }`}>
                            {summaryMode === m.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)]">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Sentence Budget Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Length / Density
                    </label>
                    <span className="text-xs font-bold text-purple-600">
                      {sentenceBudget} Key Points
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="1"
                    value={sentenceBudget}
                    onChange={(e) => setSentenceBudget(parseInt(e.target.value))}
                    className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>Concise (3)</span>
                    <span>Balanced (6)</span>
                    <span>Detailed (12)</span>
                  </div>
                </div>

                {/* 3. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Executive Report Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="executive_summary.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-purple-500 shrink-0">
                          progress_activity
                        </span>
                        <span className="truncate" title={statusMessage || 'Generating summary...'}>
                          {statusMessage || 'Generating summary...'}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-200 rounded-full"
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
                  onClick={handleGenerateReport}
                  disabled={processing || files.length === 0 || !liveSummary}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Compiling Report ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Export Executive Brief (.pdf)</span>
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
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/10">
              <span className="material-symbols-outlined text-[40px]">auto_awesome</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Executive Brief Ready!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your publication-grade executive brief and key takeaways PDF report has been generated.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-purple-500" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-purple-600 font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Original</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.summary?.stats?.originalWords || 0} w</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Summary</span>
                <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">{result.summary?.stats?.summaryWords || 0} w</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Time Saved</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">
                  -{result.summary?.stats?.reductionPct || 75}% reading
                </span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all bg-purple-600 hover:bg-purple-500 text-white"
                onClick={downloadReport}
              >
                <Download size={18} />
                <span>Download Executive PDF ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Summarize Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocScalar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/ai-translator"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">translate</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Translate PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Translate to 20+ languages</p>
                  </div>
                </Link>

                <Link
                  to="/pdf-to-word"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">description</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">PDF to Word</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Extract to DOCX</p>
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
