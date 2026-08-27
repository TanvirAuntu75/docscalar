import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { pdfToPdfa } from '../../engines/document/pdfToPdfa';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  ShieldCheck,
  Sparkles,
  Download,
  Cpu,
  Server,
  FileCheck,
  LayoutGrid,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Archive,
  Palette
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToPdfa() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'inspect'
  const [docLoading, setDocLoading] = useState(false);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Conversion Configuration State
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [conformanceLevel, setConformanceLevel] = useState('2b'); // '1b' | '2b' | '3b'
  const [colorProfile, setColorProfile] = useState('sRGB IEC61966-2.1');
  const [outputFileName, setOutputFileName] = useState('');

  // Processing & Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
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
        const draft = await loadStudioDraft('pdf-to-pdfa');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.conformanceLevel) setConformanceLevel(draft.conformanceLevel);
          if (draft.colorProfile) setColorProfile(draft.colorProfile);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('PDF to PDF/A draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('pdf-to-pdfa', {
        files,
        engineMode,
        conformanceLevel,
        colorProfile,
        outputFileName
      });
    }
  }, [files, engineMode, conformanceLevel, colorProfile, outputFileName]);

  // 4. Load PDF with PDF.js for Preview
  useEffect(() => {
    if (files.length === 0) {
      setPdfDoc(null);
      setNumPages(0);
      setPageThumbnails([]);
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

        if (!outputFileName) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_pdfa.pdf`);
        }

        // Render visual page thumbnails
        const thumbs = [];
        for (let i = 1; i <= Math.min(loadedDoc.numPages, 48); i++) {
          if (!isMounted) return;
          try {
            const page = await loadedDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, viewport.width, viewport.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL('image/jpeg', 0.8));
            page.cleanup();
          } catch (e) {
            console.warn(`Error generating PDF/A thumbnail for page ${i}:`, e);
          }
        }
        if (isMounted) setPageThumbnails(thumbs);
      } catch (err) {
        if (isMounted) {
          console.warn('PDF/A load error:', err);
          setError('Failed to load PDF document for preview.');
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

  // 5. Render Active Page in Inspect Mode
  useEffect(() => {
    if (!pdfDoc || viewMode !== 'inspect' || !canvasRef.current) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(activePage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.warn('Canvas render error:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePage, viewMode, zoomScale]);

  // 6. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_pdfa.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            pagesCount: numPages,
            conformance: `PDF/A-${conformanceLevel.toUpperCase()}`,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/pdf', 'PDF to PDF/A', blob);
          clearStudioDraft('pdf-to-pdfa');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            pagesCount: numPages,
            conformance: `PDF/A-${conformanceLevel.toUpperCase()}`,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server conversion failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Validating ISO 19005 archival compliance on server...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex, numPages, conformanceLevel]);

  // 7. Execute PDF to PDF/A Conversion
  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);
    setStatusMessage('Preparing ISO 19005 XMP conformance schemas...');

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName.trim().endsWith('.pdf') ? outputFileName.trim() : `${outputFileName.trim() || file.name.replace(/\.[^.]+$/, '')}_pdfa.pdf`;

    try {
      if (engineMode === 'server') {
        if (!backendActive) throw new Error('Conversion server is unreachable. Please switch to Fast Browser Mode.');
        setStatusMessage('Uploading PDF for server Ghostscript PDF/A distiller...');
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(40);
        setStatusMessage('Queueing PDF/A distiller job...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('conformance', conformanceLevel);

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/pdf-to-pdfa`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue conversion task.');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } else {
        setStatusMessage('Injecting OutputIntents & XMP metadata packets...');
        const pdfaBlob = await pdfToPdfa(
          file,
          { conformanceLevel, colorProfile },
          (p) => {
            setProgress(p);
            setStatusMessage(`Standardizing PDF/A structure... ${p}%`);
          }
        );

        setProcessing(false);
        setResult({
          blob: pdfaBlob,
          name: finalName,
          size: pdfaBlob.size,
          pagesCount: numPages,
          conformance: `PDF/A-${conformanceLevel.toUpperCase()}`,
          engineMode: 'client'
        });

        await saveFile(finalName, pdfaBlob.size, 'application/pdf', 'PDF to PDF/A', pdfaBlob);
        await clearStudioDraft('pdf-to-pdfa');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during PDF to PDF/A conversion.');
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
    clearStudioDraft('pdf-to-pdfa');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    setPdfDoc(null);
    setNumPages(0);
    poller.resetPoller();
  };

  const currentFile = files[activeFileIndex] || files[0];

  return (
    <ToolPageLayout
      toolId="pdf-to-pdfa"
      title="PDF to PDF/A Archival Studio"
      description="Convert standard PDF documents into ISO 19005-compliant PDF/A files for long-term legal, government, and enterprise archiving."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF to PDF/A Converter Free — ISO 19005 Archival Standard | DocForge"
        description="Convert PDF to ISO-compliant PDF/A-1b, PDF/A-2b, and PDF/A-3b format for long-term document archiving. Free, private, and instantaneous."
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
            {/* LEFT / CENTER: Interactive Document Preview Stage                         */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-blue-500">archive</span>
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
                        <span className="material-symbols-outlined text-[16px] text-blue-500">archive</span>
                        <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
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
                      <button
                        type="button"
                        onClick={() => setViewMode('inspect')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'inspect'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Maximize2 size={13} />
                        <span>Inspect Page</span>
                      </button>
                    </div>

                    {/* Page Navigation (Inspect Mode) */}
                    {viewMode === 'inspect' && numPages > 1 && (
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

                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-secondary)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <span>{numPages} {numPages === 1 ? 'Page' : 'Pages'}</span>
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
                {docLoading ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] my-auto">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Reading document structure...</span>
                  </div>
                ) : viewMode === 'inspect' ? (
                  <div
                    className="relative bg-white shadow-2xl rounded-2xl border border-slate-300 dark:border-slate-800 p-2 overflow-hidden flex flex-col transition-transform duration-150 origin-top"
                    style={{ transform: `scale(${zoomScale})` }}
                  >
                    <canvas ref={canvasRef} className="rounded-xl max-w-full h-auto" />
                  </div>
                ) : (
                  /* Thumbnail Gallery Stage */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl w-full">
                    {Array.from({ length: numPages }, (_, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setActivePage(i + 1);
                          setViewMode('inspect');
                        }}
                        className="group relative bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                          {pageThumbnails[i] ? (
                            <img src={pageThumbnails[i]} alt={`Page ${i + 1}`} className="w-full h-full object-contain bg-white" />
                          ) : (
                            <>
                              <ShieldCheck size={28} className="text-blue-500 opacity-60 mb-2" />
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                ISO 19005
                              </span>
                            </>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-500/10 backdrop-blur-xs text-blue-600 font-bold text-[10px] border border-blue-500/20 shadow-xs">
                            Page {i + 1}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-secondary)]">
                          <span>Page {i + 1}</span>
                          <span className="text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <span className="material-symbols-outlined text-[18px] text-blue-500">verified</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    PDF/A Archival Options
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  ISO-19005
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
                      <Cpu size={14} />
                      <span>Fast Browser (Private)</span>
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
                      <span>Ghostscript Server</span>
                    </button>
                  </div>
                </div>

                {/* 2. PDF/A Conformance Standard */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    PDF/A Conformance Level
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: '2b', name: 'PDF/A-2b (Recommended)', desc: 'ISO 19005-2 modern standard with transparency & compression' },
                      { id: '1b', name: 'PDF/A-1b (Strict Archival)', desc: 'ISO 19005-1 basic legacy visual preservation standard' },
                      { id: '3b', name: 'PDF/A-3b (Universal)', desc: 'ISO 19005-3 allows embedding source XML / CSV attachments' }
                    ].map((conf) => (
                      <div
                        key={conf.id}
                        onClick={() => setConformanceLevel(conf.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-0.5 ${
                          conformanceLevel === conf.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-xs'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{conf.name}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            conformanceLevel === conf.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--border-subtle)]'
                          }`}>
                            {conformanceLevel === conf.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)]">{conf.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Color Space Profile */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Color Profile (Output Intent)
                  </label>
                  <div className="relative">
                    <select
                      value={colorProfile}
                      onChange={(e) => setColorProfile(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                    >
                      <option value="sRGB IEC61966-2.1">sRGB IEC61966-2.1 (Standard Web & Screen)</option>
                      <option value="Japan Color 2001 Coated">Japan Color 2001 Coated (Commercial CMYK)</option>
                      <option value="USWebCoatedSWOP">U.S. Web Coated (SWOP) v2</option>
                    </select>
                  </div>
                </div>

                {/* 4. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output PDF/A Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_pdfa.pdf"
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
                        {statusMessage || 'Standardizing PDF/A...'}
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
                  disabled={processing || files.length === 0 || (engineMode === 'server' && !backendActive)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Converting to PDF/A ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Convert to PDF/A</span>
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
            <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF/A Archival Ready!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your document is now ISO 19005 compliant with standardized XMP metadata and OutputIntents for permanent archiving.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-blue-500" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-blue-600 font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Standard</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{result.conformance || 'PDF/A-2B'}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pagesCount || numPages}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Ghostscript' : 'ISO-19005 Distiller'}
                </span>
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
                <span>Download PDF/A ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Convert Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocForge
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add legal signature</p>
                  </div>
                </Link>

                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Encrypt with AES-256</p>
                  </div>
                </Link>

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">view_module</span>
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
