import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { htmlToPdf } from '../../engines/document/htmlToPdf';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Code,
  Sparkles,
  Download,
  Zap,
  FileCheck,
  Eye,
  FileCode,
  Layers
} from 'lucide-react';

const DEFAULT_HTML_SAMPLE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1e293b; line-height: 1.6; }
    h1 { color: #2563eb; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
    h2 { color: #475569; font-size: 18px; margin-top: 24px; }
    p { margin-bottom: 12px; }
    .badge { display: inline-block; background: #eff6ff; color: #2563eb; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 9999px; }
    .feature-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <span class="badge">DocScalar Document</span>
  <h1>Executive Summary Report</h1>
  <p>This document was compiled directly from HTML into a high-fidelity vector PDF.</p>
  
  <div class="feature-box">
    <h2>Key Capabilities</h2>
    <ul>
      <li>Client-side 100% private sandbox rendering</li>
      <li>Full CSS styling, fonts, and layout preservation</li>
      <li>Automatic A4 pagination and scaling</li>
    </ul>
  </div>
  
  <p>DocScalar delivers instant, enterprise-grade document tools right in your browser.</p>
</body>
</html>`;

export default function HtmlToPdf() {
  const [inputType, setInputType] = useState('editor'); // 'editor' | 'file'
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'code'
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML_SAMPLE);
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Layout State
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [outputFileName, setOutputFileName] = useState('');
  const [zoomScale, setZoomScale] = useState(1.0);

  // Processing & Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const poller = useJobPoller(BACKEND_URL);

  // 1. Check Server Availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('html-to-pdf');
        if (draft && isMounted) {
          if (draft.htmlCode) setHtmlCode(draft.htmlCode);
          if (draft.inputType) setInputType(draft.inputType);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.orientation) setOrientation(draft.orientation);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('HTML to PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (htmlCode.trim()) {
      saveStudioDraft('html-to-pdf', {
        htmlCode,
        inputType,
        engineMode,
        pageSize,
        orientation,
        outputFileName
      });
    }
  }, [htmlCode, inputType, engineMode, pageSize, orientation, outputFileName]);

  // 4. Read uploaded HTML file
  useEffect(() => {
    if (inputType === 'file' && files.length > 0) {
      const file = files[activeFileIndex] || files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setHtmlCode(e.target.result || '');
        if (!outputFileName) {
          setOutputFileName(`${file.name.replace(/\.[^.]+$/, '')}.pdf`);
        }
      };
      reader.onerror = () => {
        setError('Failed to read uploaded HTML file.');
      };
      reader.readAsText(file);
    }
  }, [files, activeFileIndex, inputType, outputFileName]);

  // 5. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'webpage';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/pdf', 'HTML to PDF', blob);
          clearStudioDraft('html-to-pdf');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Full Precision capture could not be completed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Rendering HTML page via Chromium engine...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // 6. Execute HTML to PDF Conversion
  const handleConvert = async () => {
    const finalHtml = htmlCode.trim();
    if (!finalHtml) {
      setError('Please provide HTML markup to convert to PDF.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setStatusMessage('Initializing HTML rendering sandbox...');

    const defaultName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'webpage';
    const finalName = outputFileName.trim().endsWith('.pdf') ? outputFileName.trim() : `${outputFileName.trim() || defaultName}.pdf`;

    try {
      if (engineMode === 'server') {
        if (!backendActive) throw new Error('Cloud conversion engine is currently offline. Please switch to Fast Mode.');
        setStatusMessage('Preparing document for full-precision PDF conversion...');

        const fileToUpload = inputType === 'file' && files[activeFileIndex]
          ? files[activeFileIndex]
          : new File([finalHtml], 'document.html', { type: 'text/html' });

        const uploadData = await uploadFileSecure(BACKEND_URL, fileToUpload, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(40);
        setStatusMessage('Queueing HTML conversion task...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('target_format', 'pdf');

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue conversion task.');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } else {
        setStatusMessage('Rasterizing HTML layout into vector PDF...');
        const pdfBlob = await htmlToPdf(
          finalHtml,
          { pageSize, orientation },
          (p) => {
            setProgress(p);
            setStatusMessage(`Compiling PDF pages... ${p}%`);
          }
        );

        setProcessing(false);
        setResult({
          blob: pdfBlob,
          name: finalName,
          size: pdfBlob.size,
          engineMode: 'client'
        });

        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'HTML to PDF', pdfBlob);
        await clearStudioDraft('html-to-pdf');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during HTML to PDF conversion.');
    }
  };

  const downloadFile = () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('html-to-pdf');
    setHtmlCode(DEFAULT_HTML_SAMPLE);
    setFiles([]);
    setActiveFileIndex(0);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    poller.resetPoller();
  };

  const lineCount = htmlCode.split('\n').length;
  const charCount = htmlCode.length;

  return (
    <ToolPageLayout
      toolId="html-to-pdf"
      title="HTML to PDF Studio"
      description="Convert HTML documents, live web code, or uploaded .html files into pixel-perfect PDF documents."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="HTML to PDF Online Free — Convert HTML to PDF | DocScalar"
        description="Convert HTML code or files to PDF with full CSS support. 100% private in-browser tool with live sandboxed preview."
      />

      {!result ? (
        <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
          {/* ========================================================================= */}
          {/* LEFT / CENTER: Interactive Code Editor & Live Preview Stage               */}
          {/* ========================================================================= */}
          <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
            {/* Sticky Canvas Toolbar */}
            <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
              <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Switcher */}
                  <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputType('editor');
                        setFiles([]);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        inputType === 'editor'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Interactive Code
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
                      Upload HTML File
                    </button>
                  </div>

                  <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                  {/* Preview vs Code Toggle */}
                  <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setViewMode('preview')}
                      className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'preview'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Eye size={13} />
                      <span>Live Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('code')}
                      className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === 'code'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Code size={13} />
                      <span>Source Code</span>
                    </button>
                  </div>

                  {/* Telemetry Stats */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                    <span>{lineCount} Lines</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span>{charCount} Chars</span>
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
                    title="Reset workspace"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Viewport Canvas Stage */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
              {inputType === 'file' && files.length === 0 ? (
                <div className="w-full max-w-lg my-auto">
                  <FileDropzone
                    accept=".html,.htm,text/html"
                    multiple={false}
                    files={files}
                    setFiles={setFiles}
                  />
                </div>
              ) : viewMode === 'preview' ? (
                /* Live Sandboxed Iframe Preview */
                <div
                  className="relative bg-white shadow-2xl rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col transition-transform duration-150 origin-top"
                  style={{
                    transform: `scale(${zoomScale})`,
                    width: orientation === 'landscape' ? '840px' : '640px',
                    height: orientation === 'landscape' ? '595px' : '880px',
                    maxWidth: '100%'
                  }}
                >
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="ml-2 font-mono text-[11px] text-slate-400 truncate max-w-[200px]">sandbox://preview.html</span>
                    </div>
                    <span className="font-semibold uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      {pageSize} • {orientation}
                    </span>
                  </div>

                  <iframe
                    srcDoc={htmlCode}
                    title="Live HTML Sandbox"
                    sandbox="allow-same-origin"
                    className="w-full flex-1 border-none bg-white"
                  />
                </div>
              ) : (
                /* Monospace HTML Code Editor */
                <div
                  className="relative bg-slate-900 text-slate-100 shadow-2xl rounded-2xl border border-slate-800 p-6 flex flex-col font-mono text-xs leading-relaxed transition-transform duration-150 origin-top"
                  style={{
                    transform: `scale(${zoomScale})`,
                    width: '720px',
                    minHeight: '700px',
                    maxWidth: '100%'
                  }}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <FileCode size={14} />
                      HTML Source Code
                    </span>
                    <span>UTF-8</span>
                  </div>

                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    placeholder="Enter HTML markup here..."
                    className="w-full flex-1 bg-transparent text-slate-200 outline-none resize-none font-mono text-xs leading-relaxed"
                    style={{ minHeight: '600px' }}
                    spellCheck={false}
                  />
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
                <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">picture_as_pdf</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  HTML PDF Options
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                HTML
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Conversion Engine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Conversion Engine
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setEngineMode('client')}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      engineMode === 'client'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Zap size={14} />
                    <span>Fast Mode</span>
                    <span className={`text-[10px] ${engineMode === 'client' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Instant · Private</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEngineMode('server')}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      engineMode === 'server'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Full Precision</span>
                    <span className={`text-[10px] ${engineMode === 'server' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>High Fidelity</span>
                  </button>
                </div>
              </div>

              {/* 2. Orientation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Orientation
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  {[
                    { id: 'portrait', label: 'Portrait' },
                    { id: 'landscape', label: 'Landscape' }
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrientation(o.id)}
                      className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                        orientation === o.id
                          ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Page Size */}
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

              {/* 4. Output File Name */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Output PDF Name
                </label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="webpage.pdf"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                />
              </div>

              {/* Progress Bar (While Processing) */}
              {processing && (
                <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)] shrink-0">
                        progress_activity
                      </span>
                      <span className="truncate" title={statusMessage || 'Compiling PDF pages...'}>
                        {statusMessage || 'Compiling PDF pages...'}
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
                disabled={processing || !htmlCode.trim() || (engineMode === 'server' && !backendActive)}
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
                HTML Document Created!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your HTML markup has been converted into a high-fidelity vector PDF.
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
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Page Size</span>
                <span className="text-base font-extrabold text-[var(--text-primary)] uppercase">{pageSize}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Orientation</span>
                <span className="text-base font-extrabold text-[var(--color-primary)] capitalize">{orientation}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Full Precision' : 'Fast Mode'}
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
                <span>Convert Another HTML Document</span>
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
