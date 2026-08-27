import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import { convertUrlToPdf, PAPER_FORMATS } from '../../engines/utility/urlToPdf';
import { apiFetch, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Globe,
  Sparkles,
  Download,
  Cpu,
  Server,
  FileCheck,
  RotateCw,
  Maximize2,
  Laptop,
  Tablet,
  Smartphone,
  ShieldCheck,
  Check,
  FileText
} from 'lucide-react';

const URL_PRESETS = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Portable_Document_Format' },
  { label: 'MDN Web', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { label: 'GitHub Docs', url: 'https://docs.github.com/en' },
  { label: 'W3C Specs', url: 'https://www.w3.org/standards/' }
];

export default function UrlToPdf() {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Portable_Document_Format');
  const [paperFormat, setPaperFormat] = useState('A4');
  const [landscape, setLandscape] = useState(false);
  const [printBackground, setPrintBackground] = useState(true);
  const [marginType, setMarginType] = useState('default');
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [deviceViewport, setDeviceViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [outputFileName, setOutputFileName] = useState('');

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
        const draft = await loadStudioDraft('url-to-pdf');
        if (draft && isMounted) {
          if (draft.url) setUrl(draft.url);
          if (draft.paperFormat) setPaperFormat(draft.paperFormat);
          if (draft.landscape !== undefined) setLandscape(draft.landscape);
          if (draft.printBackground !== undefined) setPrintBackground(draft.printBackground);
          if (draft.marginType) setMarginType(draft.marginType);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('URL to PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (url) {
      saveStudioDraft('url-to-pdf', {
        url,
        paperFormat,
        landscape,
        printBackground,
        marginType,
        engineMode,
        outputFileName
      });
    }
  }, [url, paperFormat, landscape, printBackground, marginType, engineMode, outputFileName]);

  // 4. Update Output Filename on URL Change
  useEffect(() => {
    if (!outputFileName && url) {
      try {
        const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'webpage';
        setOutputFileName(`${domain}.pdf`);
      } catch (e) {
        setOutputFileName('webpage_capture.pdf');
      }
    }
  }, [url]);

  // 5. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const domainName = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'webpage';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${domainName}.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            url,
            paperFormat,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/pdf', 'URL to PDF', blob);
          clearStudioDraft('url-to-pdf');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: 150000,
            url,
            paperFormat,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server webpage capture failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 25);
      setStatusMessage('Capturing webpage DOM and rendering PDF...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, url, outputFileName, paperFormat]);

  // 6. Execute URL to PDF Capture
  const handleCapture = async () => {
    if (!url.trim() || !url.startsWith('http')) {
      setError('Please enter a valid website URL starting with http:// or https://');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(15);
    setStatusMessage('Connecting to webpage target...');

    const domainName = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'webpage';
    const finalName = outputFileName.trim().endsWith('.pdf')
      ? outputFileName.trim()
      : `${outputFileName.trim() || domainName}.pdf`;

    try {
      if (engineMode === 'server') {
        if (!backendActive) throw new Error('Conversion server is unreachable. Please switch to Fast Client Mode.');
        setStatusMessage('Submitting headless Chromium capture job...');

        const formData = new FormData();
        formData.append('url', url.trim());
        formData.append('format', paperFormat);
        formData.append('landscape', String(landscape));
        formData.append('print_background', String(printBackground));
        formData.append('margin_type', marginType);

        const res = await apiFetch(`${BACKEND_URL}/api/convert/url-to-pdf`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => ({ detail: 'URL conversion failed' }));
          throw new Error(detail.detail || 'URL conversion failed');
        }

        const data = await res.json();
        setProgress(40);
        poller.start(data.job_id);
      } else {
        setStatusMessage('Fetching webpage markup and typesetting vector PDF...');
        const pdfBlob = await convertUrlToPdf(
          url.trim(),
          { paperFormat, landscape, printBackground, marginType },
          (p) => {
            setProgress(p);
            setStatusMessage(`Rendering document pages... ${p}%`);
          }
        );

        setProcessing(false);
        setResult({
          blob: pdfBlob,
          name: finalName,
          size: pdfBlob.size,
          url,
          paperFormat,
          engineMode: 'client'
        });

        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'URL to PDF', pdfBlob);
        await clearStudioDraft('url-to-pdf');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during URL capture.');
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
    clearStudioDraft('url-to-pdf');
    setUrl('https://en.wikipedia.org/wiki/Portable_Document_Format');
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    poller.resetPoller();
  };

  const viewportWidth =
    deviceViewport === 'mobile' ? '375px' : deviceViewport === 'tablet' ? '768px' : '100%';

  return (
    <ToolPageLayout
      toolId="url-to-pdf"
      title="URL to PDF Studio"
      description="Convert online links, documentation, and live websites into publication-grade A4 PDF documents."
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="URL to PDF Converter Online Free — Save Webpages as PDF | DocForge"
        description="Convert any website URL or online article into a print-ready PDF document. High-resolution rendering, background color preservation, and 100% private processing."
      />

      {!result ? (
        <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
          {/* ========================================================================= */}
          {/* LEFT / CENTER: Interactive Live Browser Viewport Stage                    */}
          {/* ========================================================================= */}
          <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
            {/* Sticky Simulated Browser Address Bar */}
            <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
              <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
                {/* Simulated Address Input */}
                <div className="flex-1 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] min-w-[280px]">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-transparent text-xs font-semibold text-[var(--text-primary)] w-full outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                    title="Reload webpage"
                  >
                    <RotateCw size={13} />
                  </button>
                </div>

                {/* Device Viewport Switcher */}
                <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setDeviceViewport('desktop')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      deviceViewport === 'desktop'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Desktop (100%)"
                  >
                    <Laptop size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceViewport('tablet')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      deviceViewport === 'tablet'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceViewport('mobile')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      deviceViewport === 'mobile'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>

                {/* Canvas Controls */}
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

              {/* Quick Presets Bar */}
              <div className="px-4 py-1.5 border-t border-[var(--border-subtle)]/50 flex items-center gap-2 overflow-x-auto text-[11px] text-[var(--text-secondary)]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Quick Demo:</span>
                {URL_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setUrl(preset.url)}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-medium border border-[var(--border-subtle)] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Canvas Stage */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
              <div
                className="bg-[var(--bg-primary)] shadow-2xl rounded-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col transition-all duration-200 origin-top"
                style={{
                  width: viewportWidth,
                  maxWidth: '100%',
                  height: '680px',
                  transform: `scale(${zoomScale})`
                }}
              >
                {/* Browser Window Chrome Header */}
                <div className="px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] truncate max-w-[280px]">
                    {url}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Live Sandbox</span>
                </div>

                {/* Sandboxed Iframe Preview */}
                <div className="flex-1 w-full h-full relative bg-white dark:bg-slate-900">
                  <iframe
                    src={url}
                    title="Live Webpage Preview"
                    sandbox="allow-same-origin allow-scripts allow-popups"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: Studio Options Sidebar                                             */}
          {/* ========================================================================= */}
          <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Print Layout Options
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                HTML2PDF
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Paper Format */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Paper Size
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(PAPER_FORMATS).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaperFormat(key)}
                      className={`p-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        paperFormat === key
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>{key}</span>
                      <span className="text-[9px] font-normal opacity-70 truncate max-w-full">{value.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Orientation */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Orientation
                </span>
                <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setLandscape(false)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !landscape
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>Portrait</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLandscape(true)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      landscape
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              {/* 3. Margins */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Page Margins
                </span>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs">
                  {['default', 'minimum', 'none'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarginType(m)}
                      className={`py-1.5 capitalize font-semibold rounded-md transition-all cursor-pointer ${
                        marginType === m
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Background Graphics Toggle */}
              <label className="flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={printBackground}
                  onChange={(e) => setPrintBackground(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--color-primary)] accent-[var(--color-primary)]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Print Background Graphics</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Include CSS background colors & images</span>
                </div>
              </label>

              {/* 5. Engine Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Rendering Engine
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
                    <Cpu size={14} />
                    <span>Fast Client</span>
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
                    <Server size={14} />
                    <span>Chromium Cloud</span>
                  </button>
                </div>
              </div>

              {/* 6. Output File Name */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Output Filename
                </label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="webpage_capture.pdf"
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
                      {statusMessage || 'Capturing webpage...'}
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
                onClick={handleCapture}
                disabled={processing || !url || (engineMode === 'server' && !backendActive)}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Capturing Webpage ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Capture Webpage to PDF</span>
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
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/10">
              <Globe size={40} />
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Webpage Captured!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your online webpage has been converted into a high-fidelity vector PDF document.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-[var(--color-primary)]" />
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
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">{result.paperFormat}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-[var(--text-primary)] mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Chromium' : 'Vector NMT'}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Security</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">Verified SSL</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <Download size={18} />
                <span>Download Webpage PDF ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Capture Another URL</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocForge
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/summarize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-purple-500">auto_awesome</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">AI Summarize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Summarize document</p>
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
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress PDF</p>
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
