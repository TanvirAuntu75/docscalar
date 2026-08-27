import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { textToPdf } from '../../engines/document/textToPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  FileText,
  Sparkles,
  Download,
  Type,
  AlignLeft,
  FileCheck,
  Hash,
  BookOpen
} from 'lucide-react';

export default function TextToPdf() {
  const [inputType, setInputType] = useState('text'); // 'text' | 'file'
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [fontFamily, setFontFamily] = useState('Helvetica'); // 'Helvetica' | 'TimesRoman' | 'Courier'
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [margin, setMargin] = useState(50);
  const [pageNumbers, setPageNumbers] = useState(true);
  const [outputFileName, setOutputFileName] = useState('');
  const [zoomScale, setZoomScale] = useState(1.0);

  // Processing & Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('text-to-pdf');
        if (draft && isMounted) {
          if (draft.text) setText(draft.text);
          if (draft.inputType) setInputType(draft.inputType);
          if (draft.title) setTitle(draft.title);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.fontSize) setFontSize(draft.fontSize);
          if (draft.lineSpacing) setLineSpacing(draft.lineSpacing);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.margin) setMargin(draft.margin);
          if (draft.pageNumbers !== undefined) setPageNumbers(draft.pageNumbers);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Text to PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (text.trim() || title.trim()) {
      saveStudioDraft('text-to-pdf', {
        text,
        inputType,
        title,
        fontFamily,
        fontSize,
        lineSpacing,
        pageSize,
        margin,
        pageNumbers,
        outputFileName
      });
    }
  }, [text, inputType, title, fontFamily, fontSize, lineSpacing, pageSize, margin, pageNumbers, outputFileName]);

  // 3. Read uploaded TXT file
  useEffect(() => {
    if (inputType === 'file' && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result || '');
        if (!title) {
          setTitle(file.name.replace(/\.[^.]+$/, ''));
        }
        if (!outputFileName) {
          setOutputFileName(`${file.name.replace(/\.[^.]+$/, '')}.pdf`);
        }
      };
      reader.onerror = () => {
        setError('Failed to read uploaded text file.');
      };
      reader.readAsText(file);
    }
  }, [files, inputType, title, outputFileName]);

  // 4. Word and Character Counts
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 400));

  // 5. Execute Text to PDF Conversion
  const handleConvert = async () => {
    const finalContent = text.trim();
    if (!finalContent) {
      setError('Please type or paste some text to convert to PDF.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);
    setStatusMessage('Typesetting document layout...');

    const defaultName = title.trim() ? title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'text_document';
    const finalName = outputFileName.trim().endsWith('.pdf') ? outputFileName.trim() : `${outputFileName.trim() || defaultName}.pdf`;

    try {
      const pdfBlob = await textToPdf(
        finalContent,
        {
          fontSize: Number(fontSize),
          lineSpacing: Number(lineSpacing),
          fontFamily,
          pageSize,
          margin: Number(margin),
          pageNumbers,
          title: title.trim()
        },
        (pct) => {
          setProgress(pct);
          setStatusMessage(`Compiling document pages... ${pct}%`);
        }
      );

      setProcessing(false);
      setResult({
        blob: pdfBlob,
        name: finalName,
        size: pdfBlob.size,
        wordCount,
        charCount,
        estimatedPages
      });

      await saveFile(finalName, pdfBlob.size, 'application/pdf', 'Text to PDF', pdfBlob);
      await clearStudioDraft('text-to-pdf');
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'Failed to convert text to PDF.');
    }
  };

  const downloadFile = () => {
    if (!result || !result.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('text-to-pdf');
    setText('');
    setFiles([]);
    setTitle('');
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
  };

  const getFontFamilyStyle = () => {
    if (fontFamily === 'TimesRoman') return 'font-serif';
    if (fontFamily === 'Courier') return 'font-mono';
    return 'font-sans';
  };

  return (
    <ToolPageLayout
      toolId="text-to-pdf"
      title="Text to PDF Studio"
      description="Convert plain text notes, code snippets, or uploaded TXT files into beautifully formatted, paginated PDF documents."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Text to PDF Online Free — Convert TXT or Notes to PDF | DocForge"
        description="Convert raw text or text files (.txt) to formatted PDF documents with customizable fonts, margins, and page numbers. 100% private in-browser tool."
      />

      {!result ? (
        <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
          {/* ========================================================================= */}
          {/* LEFT / CENTER: Interactive Document Editor & Canvas Viewport               */}
          {/* ========================================================================= */}
          <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
            {/* Sticky Canvas Toolbar */}
            <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
              <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Pill Switcher */}
                  <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputType('text');
                        setFiles([]);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        inputType === 'text'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Interactive Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputType('file')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        inputType === 'file'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Upload TXT File
                    </button>
                  </div>

                  <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                  {/* Telemetry Stats */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                    <span>{wordCount} Words</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span>{charCount} Chars</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">~{estimatedPages} Pages</span>
                  </div>
                </div>

                {/* Right Canvas Controls */}
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
                    title="Clear editor & reset workspace"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Viewport Canvas Stage (A4 Document Paper Container) */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
              {inputType === 'file' && files.length === 0 ? (
                <div className="w-full max-w-lg my-auto">
                  <FileDropzone
                    accept=".txt,text/plain"
                    multiple={false}
                    files={files}
                    setFiles={setFiles}
                  />
                </div>
              ) : (
                <div
                  className={`relative bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-300 dark:border-slate-800 p-8 sm:p-12 flex flex-col transition-transform duration-150 ${getFontFamilyStyle()}`}
                  style={{
                    transform: `scale(${zoomScale})`,
                    width: '640px',
                    minHeight: '880px',
                    maxWidth: '100%',
                    lineHeight: lineSpacing
                  }}
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl" />

                  {/* Document Title Input */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document Title (Optional)"
                    className="text-2xl font-bold text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[var(--color-primary)] outline-none pb-2 mb-4 tracking-tight"
                  />

                  {/* Main Text Content Editor Area */}
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type or paste your text here... Your document will be automatically formatted and paginated into a clean vector PDF."
                    className={`w-full flex-1 bg-transparent text-slate-700 dark:text-slate-200 outline-none resize-none overflow-y-auto leading-relaxed border-none ${getFontFamilyStyle()}`}
                    style={{
                      fontSize: `${fontSize}px`,
                      minHeight: '680px'
                    }}
                  />

                  {/* Page Footer Simulation */}
                  {pageNumbers && (
                    <div className="pt-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>DocForge Typesetter</span>
                      <span>Page 1 of {estimatedPages}</span>
                    </div>
                  )}
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
                <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">text_fields</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Formatting Options
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                TXT
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Font Family */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Font Family
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  {[
                    { id: 'Helvetica', label: 'Helvetica' },
                    { id: 'TimesRoman', label: 'Times' },
                    { id: 'Courier', label: 'Courier' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id)}
                      className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                        fontFamily === f.id
                          ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Font Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Font Size
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  {[
                    { id: 10, label: '10pt' },
                    { id: 12, label: '12pt' },
                    { id: 14, label: '14pt' },
                    { id: 16, label: '16pt' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFontSize(s.id)}
                      className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                        fontSize === s.id
                          ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Line Spacing */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Line Spacing
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  {[
                    { id: 1.2, label: '1.2 Single' },
                    { id: 1.5, label: '1.5 Normal' },
                    { id: 2.0, label: '2.0 Double' }
                  ].map((ls) => (
                    <button
                      key={ls.id}
                      type="button"
                      onClick={() => setLineSpacing(ls.id)}
                      className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                        lineSpacing === ls.id
                          ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {ls.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Page Size & Margins */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Page Size
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  {[
                    { id: 'a4', label: 'A4' },
                    { id: 'letter', label: 'US Letter' }
                  ].map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() => setPageSize(ps.id)}
                      className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                        pageSize === ps.id
                          ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Page Numbers Toggle */}
              <div className="bg-[var(--bg-secondary)] p-3 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Hash size={14} className="text-[var(--color-primary)]" />
                  <span>Include Page Numbers</span>
                </span>
                <input
                  type="checkbox"
                  checked={pageNumbers}
                  onChange={(e) => setPageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                />
              </div>

              {/* 6. Output File Name */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Output PDF Name
                </label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="document.pdf"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                />
              </div>

              {/* Progress Bar (While Processing) */}
              {processing && (
                <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                    <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      {statusMessage || 'Compiling PDF pages...'}
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
                onClick={handleConvert}
                disabled={processing || !text.trim()}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Converting to PDF ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Convert to PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
                Text Document Created!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your text notes have been converted into a clean vector PDF.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
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
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Word Count</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.wordCount}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Est. Pages</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">~{result.estimatedPages}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Font</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {fontFamily} ({fontSize}pt)
                </span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Create Another PDF</span>
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
