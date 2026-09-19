import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { convertPdfToWord } from '../../engines/document/pdfToWord';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  FileText,
  Sparkles,
  Download,
  Zap,
  Type,
  FileCheck,
  Archive,
  ArrowLeft,
  XCircle,
  AlertCircle
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToWord() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [pdfDocument, setPdfDocument] = useState(null);
  const [documentTelemetry, setDocumentTelemetry] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'preview'
  const [pageFilter, setPageFilter] = useState('');
  const [gridDensity, setGridDensity] = useState('standard'); // 'compact' | 'standard' | 'large'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Conversion Configuration State
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [preserveHeadings, setPreserveHeadings] = useState(true);
  const [preserveImages, setPreserveImages] = useState(true);
  const [outputFileName, setOutputFileName] = useState('');

  // Processing, Poller & Cancellation
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const previewCanvasRef = useRef(null);
  const currentRenderTaskRef = useRef(null);
  const abortControllerRef = useRef(null);
  const poller = useJobPoller(BACKEND_URL);

  // 1. Check Backend Availability
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, {
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok && isMounted) {
          setBackendActive(true);
        }
      } catch (e) {
        if (isMounted) setBackendActive(false);
      }
    };
    checkServer();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('pdf-to-word');
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
          if (draft.preserveHeadings !== undefined) setPreserveHeadings(draft.preserveHeadings);
          if (draft.preserveImages !== undefined) setPreserveImages(draft.preserveImages);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('PDF to Word draft recovery notice:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0 && !result) {
      saveStudioDraft('pdf-to-word', {
        files,
        engineMode,
        preserveHeadings,
        preserveImages,
        outputFileName
      });
    }
  }, [files, engineMode, preserveHeadings, preserveImages, outputFileName, result]);

  // 4. Load Active PDF Document & Render Thumbnails
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setPageThumbnails([]);
      setDocumentTelemetry(null);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setCanvasLoading(true);
      setStatusMessage('Reading PDF structure and pages...');
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        if (isCancelled) return;

        // Verify PDF Header
        const headerSlice = new Uint8Array(arrayBuffer.slice(0, 8));
        const headerStr = String.fromCharCode(...headerSlice);
        if (!headerStr.includes('%PDF-')) {
          throw new Error('The selected file is not a valid PDF document (missing %PDF- header).');
        }

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setActivePageIndex(0);

        if (!outputFileName || files.length > 1) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}.docx`);
        }

        // Render Page Thumbnails (up to 48 pages for gallery) and sample text density
        const thumbs = [];
        const thumbLimit = Math.min(pdf.numPages, 48);
        let totalCharsSampled = 0;
        const sampleLimit = Math.min(pdf.numPages, 3);

        for (let i = 1; i <= thumbLimit; i++) {
          if (isCancelled) return;
          const page = await pdf.getPage(i);

          // Sample first 3 pages for text density (scanned vs digital detection)
          if (i <= sampleLimit) {
            try {
              const textContent = await page.getTextContent({ includeMarkedContent: false });
              const chars = (textContent.items || []).reduce((acc, it) => acc + (it.str ? it.str.trim().length : 0), 0);
              totalCharsSampled += chars;
            } catch (_) {}
          }

          const viewport = page.getViewport({ scale: 0.35 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, viewport.width, viewport.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL('image/jpeg', 0.82));
          page.cleanup();
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          const avgChars = sampleLimit > 0 ? totalCharsSampled / sampleLimit : 0;
          const isScanned = avgChars < 15;
          setDocumentTelemetry({
            avgChars,
            isScanned,
            totalWordsEst: Math.round((totalCharsSampled / Math.max(1, sampleLimit)) * pdf.numPages / 5),
            type: isScanned ? 'Scanned Image' : 'Digital Vector'
          });
        }
      } catch (err) {
        if (!isCancelled) {
          if (err && (err.name === 'PasswordException' || String(err.message).includes('password'))) {
            setError('This document is password protected. Please unlock the PDF before converting.');
          } else {
            setError(err.message || 'Unable to open PDF document. The file may be corrupt.');
          }
        }
      } finally {
        if (!isCancelled) {
          setCanvasLoading(false);
          setStatusMessage('');
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, activeFileIndex]);

  // 5. Render Active Page in Single-Page Inspect Mode (with Retina/High-DPI support)
  useEffect(() => {
    if (!pdfDocument || viewMode !== 'preview') return;

    let isMounted = true;
    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        if (!isMounted) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });

        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const displayScale = 1.35 * zoomScale;
        const viewport = page.getViewport({ scale: displayScale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        if (currentRenderTaskRef.current) {
          try {
            currentRenderTaskRef.current.cancel();
          } catch (e) {}
          currentRenderTaskRef.current = null;
        }

        const renderTask = page.render({ canvasContext: ctx, viewport });
        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Inspect page render notice:', err);
        }
      } finally {
        currentRenderTaskRef.current = null;
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {}
        currentRenderTaskRef.current = null;
      }
    };
  }, [pdfDocument, activePageIndex, viewMode, zoomScale]);

  // 6. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}.docx`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            totalPages,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PDF to WORD', blob);
          clearStudioDraft('pdf-to-word');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            totalPages,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'High-precision conversion could not be completed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 15);
      setStatusMessage('Extracting Word layout, fonts, and paragraph structures...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // 7. Cancel Active Conversion
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    poller.resetPoller();
    setProcessing(false);
    setProgress(0);
    setStatusMessage('');
    setError('Operation cancelled by user.');
  };

  // 8. Execute Single File or Batch PDF to Word Conversion
  const handleConvert = async (batchMode = false) => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);

    abortControllerRef.current = new AbortController();

    try {
      if (batchMode && files.length > 1) {
        // Multi-File Batch Conversion
        setStatusMessage(`Processing batch of ${files.length} documents...`);
        const zip = new JSZip();
        const convertedItems = [];

        for (let idx = 0; idx < files.length; idx++) {
          if (abortControllerRef.current?.signal?.aborted) {
            throw new Error('Batch conversion was cancelled.');
          }

          const currentDoc = files[idx];
          const baseName = currentDoc.name.replace(/\.[^.]+$/, '');
          const docxName = `${baseName}.docx`;
          const baseProgress = Math.round((idx / files.length) * 100);

          setStatusMessage(`Converting document ${idx + 1} of ${files.length}: ${currentDoc.name}`);
          setProgress(baseProgress + 2);

          const docxBlob = await convertPdfToWord(
            currentDoc,
            { preserveHeadings, preserveImages },
            (subPct) => {
              const docStep = Math.round((subPct / 100) * (90 / files.length));
              setProgress(Math.min(95, baseProgress + docStep));
            }
          );

          zip.file(docxName, docxBlob);
          convertedItems.push({
            name: docxName,
            blob: docxBlob,
            size: docxBlob.size
          });

          await saveFile(docxName, docxBlob.size, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PDF to WORD', docxBlob);
        }

        setStatusMessage('Packaging batch ZIP archive...');
        setProgress(96);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `converted_word_documents_${Date.now()}.zip`;

        setProcessing(false);
        setResult({
          isBatch: true,
          zipBlob,
          name: zipName,
          size: zipBlob.size,
          items: convertedItems,
          engineMode: 'client'
        });
        await clearStudioDraft('pdf-to-word');
      } else {
        // Single Active File Conversion
        const file = files[activeFileIndex] || files[0];
        const rawName = outputFileName.trim();
        const finalName = rawName.endsWith('.docx') ? rawName : `${rawName || file.name.replace(/\.[^.]+$/, '')}.docx`;

        if (engineMode === 'server') {
          if (!backendActive) {
            throw new Error('Cloud conversion engine is currently offline. Please switch to Fast Mode.');
          }
          setStatusMessage('Preparing document for full-precision layout reconstruction...');
          const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
          if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed.');

          setProgress(35);
          setStatusMessage('Queueing Word DOCX conversion job...');

          const convertFormData = new FormData();
          convertFormData.append('file_id', uploadData.file_id);
          convertFormData.append('filename', uploadData.filename);

          const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/pdf-to-docx`, {
            method: 'POST',
            body: convertFormData,
            signal: abortControllerRef.current.signal
          });

          if (!convertRes.ok) throw new Error('Failed to start high-precision conversion.');
          const convertData = await convertRes.json();
          poller.startPolling(convertData.job_id);
        } else {
          // Client Browser Engine
          setStatusMessage('Extracting text and building OpenXML document structure...');
          const docxBlob = await convertPdfToWord(
            file,
            { preserveHeadings, preserveImages },
            (p) => {
              setProgress(p);
              setStatusMessage(`Compiling Word document... ${p}%`);
            }
          );

          setProcessing(false);
          setResult({
            isBatch: false,
            blob: docxBlob,
            name: finalName,
            size: docxBlob.size,
            totalPages,
            engineMode: 'client'
          });

          await saveFile(finalName, docxBlob.size, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PDF to WORD', docxBlob);
          await clearStudioDraft('pdf-to-word');
        }
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during conversion.');
    }
  };

  const downloadFile = (item = null) => {
    if (!result) return;
    if (item && item.blob) {
      saveAs(item.blob, item.name);
      return;
    }
    if (result.isBatch && result.zipBlob) {
      saveAs(result.zipBlob, result.name);
    } else if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  // Return to workspace without clearing the uploaded files queue
  const handleReturnToWorkspace = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
  };

  // Complete reset to clean state
  const resetWorkspace = () => {
    clearStudioDraft('pdf-to-word');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setPdfDocument(null);
    setTotalPages(0);
    setActivePageIndex(0);
    setPageThumbnails([]);
    setOutputFileName('');
    poller.resetPoller();
  };

  const filteredPageIndices = Array.from({ length: totalPages }, (_, i) => i + 1).filter((num) => {
    if (!pageFilter.trim()) return true;
    return num.toString().includes(pageFilter.trim());
  });

  return (
    <ToolPageLayout
      toolId="pdf-to-word"
      title="PDF to Word (DOCX)"
      description="Convert PDF documents into fully editable Microsoft Word (.docx) files with preserved layout, typography, and page structure."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF to Word Converter Online — Convert PDF to DOCX | DocScalar"
        description="Convert PDF documents into fully editable Microsoft Word (.docx) files. Fast client-side private conversion and desktop high-fidelity layout support."
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
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative" role="region" aria-label="PDF to Word Workspace">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Document Viewport                               */}
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
                          aria-label="Active document selector"
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value));
                            setActivePageIndex(0);
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
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    {/* View Switcher Capsule (Gallery vs Inspect) */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]" role="group" aria-label="View mode">
                      <button
                        type="button"
                        aria-label="Show page thumbnails gallery"
                        aria-pressed={viewMode === 'gallery'}
                        onClick={() => setViewMode('gallery')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          viewMode === 'gallery'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">grid_view</span>
                        <span>Gallery ({totalPages})</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Inspect individual page preview"
                        aria-pressed={viewMode === 'preview'}
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          viewMode === 'preview'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>Inspect Page</span>
                      </button>
                    </div>

                    {/* Page Navigation Capsule (Inspect Mode) */}
                    {viewMode === 'preview' && totalPages > 0 && (
                      <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5">
                        <button
                          type="button"
                          aria-label="Previous Page"
                          onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                          disabled={activePageIndex === 0}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-2 text-[var(--text-primary)] select-none">
                          Page {activePageIndex + 1} / {totalPages}
                        </span>
                        <button
                          type="button"
                          aria-label="Next Page"
                          onClick={() => setActivePageIndex((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={activePageIndex >= totalPages - 1}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    {viewMode === 'gallery' ? (
                      <>
                        <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg px-2 py-0.5 border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
                          <span className="material-symbols-outlined text-[14px] text-[var(--text-secondary)] mr-1">search</span>
                          <input
                            type="text"
                            aria-label="Filter pages by number"
                            placeholder="Find page..."
                            value={pageFilter}
                            onChange={(e) => setPageFilter(e.target.value)}
                            className="bg-transparent w-20 outline-none text-xs"
                          />
                        </div>

                        <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]" role="group" aria-label="Grid density">
                          <button
                            type="button"
                            aria-label="Compact grid layout"
                            aria-pressed={gridDensity === 'compact'}
                            onClick={() => setGridDensity('compact')}
                            className={`p-1 rounded cursor-pointer ${gridDensity === 'compact' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">density_small</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Standard grid layout"
                            aria-pressed={gridDensity === 'standard'}
                            onClick={() => setGridDensity('standard')}
                            className={`p-1 rounded cursor-pointer ${gridDensity === 'standard' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">density_medium</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Large grid layout"
                            aria-pressed={gridDensity === 'large'}
                            onClick={() => setGridDensity('large')}
                            className={`p-1 rounded cursor-pointer ${gridDensity === 'large' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">density_large</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                        <input
                          type="range"
                          aria-label="Inspect zoom scale"
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
                    )}

                    <button
                      type="button"
                      aria-label="Reset workspace"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scanned Document Advisory Banner */}
              {documentTelemetry?.isScanned && engineMode === 'client' && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs z-10 animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-amber-500 text-lg">document_scanner</span>
                    <div>
                      <span className="font-bold block text-xs sm:text-sm">Scanned Document Detected</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300">
                        This PDF contains scanned images without a digital text layer. Fast Mode requires embedded text; switch to Full Precision or use OCR Studio.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEngineMode('server')}
                    disabled={!backendActive}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-all shrink-0 cursor-pointer text-xs shadow-xs"
                  >
                    Switch to Full Precision
                  </button>
                </div>
              )}

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none pb-24 sm:pb-32">
                {canvasLoading ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">{statusMessage || 'Loading document pages...'}</span>
                  </div>
                ) : viewMode === 'gallery' ? (
                  <div
                    className={`w-full max-w-6xl grid gap-4 p-2 ${
                      gridDensity === 'compact'
                        ? 'grid-cols-3 sm:grid-cols-6 md:grid-cols-8'
                        : gridDensity === 'large'
                        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'
                    }`}
                  >
                    {filteredPageIndices.map((pageNum) => {
                      const thumb = pageThumbnails[pageNum - 1];
                      const isSelected = activePageIndex === pageNum - 1;
                      return (
                        <div
                          key={pageNum}
                          onClick={() => {
                            setActivePageIndex(pageNum - 1);
                            setViewMode('preview');
                          }}
                          className={`relative rounded-2xl bg-[var(--bg-primary)] border-2 transition-all p-2 flex flex-col items-center gap-2 group cursor-pointer hover:shadow-lg ${
                            isSelected
                              ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                              : 'border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50'
                          }`}
                        >
                          <div className="w-full aspect-[1/1.414] rounded-xl overflow-hidden bg-white shadow-xs flex items-center justify-center relative">
                            {thumb ? (
                              <img src={thumb} alt={`Page ${pageNum}`} className="w-full h-full object-contain pointer-events-none" />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-[var(--text-tertiary)]">
                                <span className="material-symbols-outlined text-[20px]">description</span>
                                <span className="text-[10px]">Page {pageNum}</span>
                              </div>
                            )}

                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-blue-600/85 backdrop-blur-xs text-[9px] font-bold text-white uppercase tracking-wider">
                              DOCX
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full px-1">
                            <span className="text-xs font-bold text-[var(--text-primary)]">Page {pageNum}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--color-primary)] font-semibold">
                              Inspect →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-all duration-150 m-auto shrink-0"
                    style={{
                      width: Math.floor(pageDimensions.width * zoomScale),
                      height: Math.floor(pageDimensions.height * zoomScale)
                    }}
                  >
                    <canvas ref={previewCanvasRef} className="block w-full h-full object-contain" />
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">description</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Word (DOCX) Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {files.length > 1 ? `${files.length} Files` : `${totalPages} Pages`}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Pre-Flight Document Telemetry */}
                {documentTelemetry && (
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Document Layer</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        documentTelemetry.isScanned
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {documentTelemetry.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Est. Word Count</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {documentTelemetry.isScanned ? '0 (Image only)' : `~${documentTelemetry.totalWordsEst.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Total Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">{totalPages}</span>
                    </div>
                  </div>
                )}

                {/* 1. Conversion Engine */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Conversion Engine
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]" role="group" aria-label="Engine Mode">
                    <button
                      type="button"
                      aria-pressed={engineMode === 'client'}
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
                      aria-pressed={engineMode === 'server'}
                      onClick={() => setEngineMode('server')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'server'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Full Precision</span>
                      <span className={`text-[10px] ${engineMode === 'server' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Native DOCX</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] px-1">
                    {engineMode === 'client'
                      ? 'Client-side processing preserves complete privacy with zero cloud upload.'
                      : backendActive
                      ? 'High-precision layout reconstruction with deep structural formatting.'
                      : 'Full Precision engine is currently offline. Fast Mode is active.'}
                  </span>
                </div>

                {/* 2. Layout & Typography Options */}
                <div className="bg-[var(--bg-secondary)] p-3.5 rounded-2xl border border-[var(--border-subtle)] flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                    <Type size={13} className="text-[var(--color-primary)]" />
                    <span>Layout Options</span>
                  </span>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveHeadings}
                      onChange={(e) => setPreserveHeadings(e.target.checked)}
                      className="mt-0.5 rounded accent-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Heading Styles</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Map title lines to Word Heading 1 and 2</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveImages}
                      onChange={(e) => setPreserveImages(e.target.checked)}
                      className="mt-0.5 rounded accent-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Paragraph Flow</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Preserve spacing, lines, and reading order</span>
                    </div>
                  </label>
                </div>

                {/* 3. Output File Name (Single File Mode) */}
                {files.length === 1 && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Output File Name
                    </label>
                    <input
                      type="text"
                      aria-label="Custom output document name"
                      value={outputFileName}
                      onChange={(e) => setOutputFileName(e.target.value)}
                      placeholder="document.docx"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}

                {/* Progress & Status Indicator */}
                {processing && (
                  <div className="flex flex-col gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]" aria-live="polite">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5 truncate max-w-[190px]">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        {statusMessage || 'Processing document...'}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="self-end text-[11px] text-red-500 hover:underline cursor-pointer font-semibold flex items-center gap-1 pt-1"
                    >
                      <XCircle size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Sticky Primary Action Buttons */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleConvert(false)}
                  disabled={processing || files.length === 0 || (engineMode === 'server' && !backendActive)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Converting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{files.length > 1 ? `Convert Active (${files[activeFileIndex]?.name.slice(0, 16)}...)` : 'Convert to Word (.docx)'}</span>
                    </>
                  )}
                </button>

                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleConvert(true)}
                    disabled={processing || (engineMode === 'server' && !backendActive)}
                    className="w-full py-2.5 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                  >
                    <Archive size={14} className="text-[var(--color-primary)]" />
                    <span>Convert All {files.length} Documents (ZIP)</span>
                  </button>
                )}
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
              {result.isBatch ? <Archive size={40} /> : <FileText size={40} />}
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {result.isBatch ? 'Batch Documents Ready!' : 'Word Document Ready!'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.isBatch
                  ? `Successfully converted ${result.items.length} PDF files into Microsoft Word documents.`
                  : 'Your PDF has been converted into an editable Microsoft Word (.docx) document.'}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-blue-500 shrink-0" />
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
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                  {result.isBatch ? 'Documents' : 'Pages'}
                </span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">
                  {result.isBatch ? result.items.length : result.totalPages || 1}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                  {result.isBatch ? 'ZIP' : 'DOCX'}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-[var(--color-primary)] mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Full Precision' : 'Fast Mode'}
                </span>
              </div>
            </div>

            {/* Batch items list if applicable */}
            {result.isBatch && result.items && (
              <div className="w-full max-h-40 overflow-y-auto p-2 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col gap-1.5 text-left">
                {result.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-primary)] rounded-lg text-xs">
                    <span className="truncate max-w-[240px] font-medium text-[var(--text-primary)]">{it.name}</span>
                    <button
                      type="button"
                      onClick={() => downloadFile(it)}
                      className="text-[var(--color-primary)] hover:underline text-[11px] font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={() => downloadFile()}
              >
                <Download size={18} />
                <span>{result.isBatch ? 'Download All (ZIP)' : 'Download Word (.docx)'}</span>
              </button>

              {files.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[170px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                  onClick={handleReturnToWorkspace}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Documents</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[160px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>New Session</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3 text-center">
                Continue Working with Your Document
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/document-viewer');
                      return;
                    }
                    const docxFile = new File([result.blob], result.name || 'document.docx', {
                      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    navigate('/document-viewer', { state: { initialFiles: [docxFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">visibility</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Document Studio</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Inspect Word structure</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/docx-to-pdf');
                      return;
                    }
                    const docxFile = new File([result.blob], result.name || 'document.docx', {
                      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    navigate('/docx-to-pdf', { state: { initialFiles: [docxFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">picture_as_pdf</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Word to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reconvert to PDF</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/canvas');
                      return;
                    }
                    const docxFile = new File([result.blob], result.name || 'document.docx', {
                      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    navigate('/canvas', { state: { initialFiles: [docxFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">account_tree</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Stitch Canvas</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Chain into visual pipeline</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
