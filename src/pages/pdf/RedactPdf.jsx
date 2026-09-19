import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { scanPdfForPII, searchPdfCustomTerms } from '../../utils/piiDetector';
import { redactPdf as clientRedactPdf } from '../../engines/pdf/redactPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import {
  Shield,
  Search,
  Sparkles,
  Lock,
  Settings,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import useSmartCropper from '../../hooks/useSmartCropper';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RedactPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // PDF Document Viewport State
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const { dpi, setDpi, getScaleMultiplier } = useDpiQuality();
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Debounce high-DPI PDF rasterization to decouple smooth 120 FPS GPU scaling from heavy canvas redraws
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRenderZoom(zoomScale);
    }, 200);
    return () => clearTimeout(handler);
  }, [zoomScale]);

  // Studio Mode / Tabs: 'auto' | 'search' | 'manual' | 'settings'
  const [activeTab, setActiveTab] = useState('auto');

  // Redactions List: Array of { id, page, x, y, width, height, type, label, value, isRatio, selected, source }
  const [redactions, setRedactions] = useState([]);

  // Auto-PII Detection Settings & State
  const [detectedPII, setDetectedPII] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [enabledCategories, setEnabledCategories] = useState({
    creditCard: true,
    ssn: true,
    email: true,
    phone: true,
    ip: false
  });

  // Custom Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegexSearch, setIsRegexSearch] = useState(false);
  const [customMatches, setCustomMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sanitization & Output State
  const [sanitizeMetadata, setSanitizeMetadata] = useState(true);
  const [outputFileName, setOutputFileName] = useState('');

  // Drag-to-Draw Bounding Box State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });

  // Processing & Backend Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const cropper = useSmartCropper({ canvasRef: pdfCanvasRef, totalPages });
  const poller = useJobPoller(BACKEND_URL);

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  // 1. Check Backend Availability on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch {
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
        const draft = await loadStudioDraft('redact-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.redactions) setRedactions(draft.redactions);
          if (draft.activeTab) setActiveTab(draft.activeTab);
          if (draft.enabledCategories) setEnabledCategories(draft.enabledCategories);
          if (draft.sanitizeMetadata !== undefined) setSanitizeMetadata(draft.sanitizeMetadata);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Redact PDF draft recovery failed:', err);
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
      saveStudioDraft('redact-pdf', {
        files,
        redactions,
        activeTab,
        enabledCategories,
        sanitizeMetadata,
        outputFileName
      });
    }
  }, [files, redactions, activeTab, enabledCategories, sanitizeMetadata, outputFileName]);

  // 4. Load Active PDF Document
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setRedactions([]);
      setDetectedPII([]);
      setCustomMatches([]);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setCanvasLoading(true);
      setStatusMessage('Parsing document structure...');
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setActivePageIndex(0);
        if (!outputFileName) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_redacted.pdf`);
        }
      } catch {
        if (!isCancelled) {
          setError('Failed to load PDF. Please verify the document is not password locked or corrupted.');
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

  // 5. Render Active Page to High-DPI Canvas
  useEffect(() => {
    if (!pdfDocument) return;

    let isMounted = true;
    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        if (!isMounted) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });

        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const scaleMultiplier = getScaleMultiplier(debouncedRenderZoom);
        const viewport = page.getViewport({ scale: scaleMultiplier });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Universal Smart Cropper: Content-aware border detection (3-pass pipeline)
        const detection = cropper.runDetection(activePageIndex + 1, baseViewport);

        // If Smart Cropper is active, clean and refit the preview canvas
        if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
          cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
        }

        if (isMounted) {
          drawOverlayRedactions();
        }
      } catch (err) {
        console.error('Error rendering PDF page preview:', err);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
    };
  }, [pdfDocument, activePageIndex, debouncedRenderZoom, dpi, redactions, cropper.isActive, cropper.cleanMargin, cropper.enabledEdges, getScaleMultiplier]);

  // Filter Active Redactions
  const activeRedactions = useMemo(() => {
    return redactions.filter((r) => r.selected !== false);
  }, [redactions]);

  // 6. Draw Redaction Bounding Boxes on Overlay Canvas
  const drawOverlayRedactions = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Render active page redaction boxes
    const pageRedacts = activeRedactions.filter((r) => r.page === activePageIndex);
    pageRedacts.forEach((r) => {
      const rx = r.x * overlay.width;
      const ry = r.y * overlay.height;
      const rw = r.width * overlay.width;
      const rh = r.height * overlay.height;

      // Solid black box with opacity
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(rx, ry, rw, rh);

      // Distinct styling border
      ctx.strokeStyle = r.type === 'custom' ? 'rgba(59, 130, 246, 0.95)' : 'rgba(239, 68, 68, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);

      // Label Tag
      if (r.label) {
        ctx.fillStyle = r.type === 'custom' ? 'rgba(59, 130, 246, 0.95)' : 'rgba(239, 68, 68, 0.95)';
        ctx.fillRect(rx, Math.max(0, ry - 16), Math.min(rw, 110), 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(r.label.slice(0, 16), rx + 4, Math.max(11, ry - 4));
      }
    });

    // Draw temporary drag box
    if (isDragging) {
      const rx = Math.min(dragStart.x, dragEnd.x);
      const ry = Math.min(dragStart.y, dragEnd.y);
      const rw = Math.abs(dragStart.x - dragEnd.x);
      const rh = Math.abs(dragStart.y - dragEnd.y);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  };

  useEffect(() => {
    if (isDragging) {
      drawOverlayRedactions();
    }
  }, [dragEnd, isDragging]);

  // Subpixel Coordinate Extraction (Unified Mouse + Touch)
  const getEventCoords = (e) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = overlay.width / rect.width;
    const scaleY = overlay.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Pointer Event Handlers for Drag-to-Draw
  const handleMouseDown = (e) => {
    const coords = getEventCoords(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setDragEnd(coords);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const coords = getEventCoords(e);
    if (!coords) return;

    setDragEnd(coords);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const w = overlay.width;
    const h = overlay.height;
    if (w <= 0 || h <= 0) return;

    const x0 = Math.min(dragStart.x, dragEnd.x) / w;
    const y0 = Math.min(dragStart.y, dragEnd.y) / h;
    const x1 = Math.max(dragStart.x, dragEnd.x) / w;
    const y1 = Math.max(dragStart.y, dragEnd.y) / h;

    const rw = x1 - x0;
    const rh = y1 - y0;

    if (rw > 0.008 && rh > 0.008) {
      const newRedact = {
        id: `manual-${Math.random().toString(36).substring(7)}`,
        page: activePageIndex,
        x: x0,
        y: y0,
        width: rw,
        height: rh,
        type: 'manual',
        label: 'Manual Box',
        isRatio: true,
        selected: true
      };
      setRedactions((prev) => [...prev, newRedact]);
    }
  };

  // Keyboard Shortcuts (Arrow navigation & Escape cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActivePageIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActivePageIndex((p) => Math.min(totalPages - 1, p + 1));
      } else if (e.key === 'Escape') {
        setIsDragging(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Touch Swipe on Container for Page Navigation
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (deltaTime < 500 && Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
      if (deltaX < 0 && activePageIndex < totalPages - 1) {
        setActivePageIndex((p) => Math.min(totalPages - 1, p + 1));
      } else if (deltaX > 0 && activePageIndex > 0) {
        setActivePageIndex((p) => Math.max(0, p - 1));
      }
    }
  };

  // Run Automated PII Scan
  const handleScanPII = async () => {
    if (!pdfDocument) return;
    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    try {
      const activeCats = Object.keys(enabledCategories).filter((k) => enabledCategories[k]);
      const findings = await scanPdfForPII(pdfDocument, { activeCategories: activeCats }, (p) => {
        setScanProgress(p);
      });

      setDetectedPII(findings);
      setRedactions((prev) => {
        const manualOnly = prev.filter((r) => r.type === 'manual' || r.source === 'custom-search');
        return [...manualOnly, ...findings];
      });

      if (findings.length === 0) {
        setStatusMessage('Scan complete: No sensitive PII patterns detected.');
      } else {
        setStatusMessage(`Scan complete: Found ${findings.length} sensitive PII items.`);
      }
    } catch (err) {
      setError(`PII Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Run Custom Text / Regex Search
  const handleSearchCustom = async () => {
    if (!pdfDocument || !searchTerm.trim()) return;
    setIsSearching(true);
    setError(null);

    try {
      const matches = await searchPdfCustomTerms(pdfDocument, searchTerm, isRegexSearch);
      setCustomMatches(matches);

      setRedactions((prev) => {
        const others = prev.filter((r) => r.source !== 'custom-search');
        return [...others, ...matches];
      });

      if (matches.length === 0) {
        setStatusMessage(`No matches found for "${searchTerm.trim()}".`);
      } else {
        setStatusMessage(`Found ${matches.length} matching occurrences.`);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleRedactionSelection = (id) => {
    setRedactions((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const selectAllPII = (selectState) => {
    setRedactions((prev) => prev.map((r) => (r.source === 'auto-detect' ? { ...r, selected: selectState } : r)));
  };

  const removeRedaction = (id) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
    setDetectedPII((prev) => prev.filter((r) => r.id !== id));
    setCustomMatches((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllRedactions = () => {
    setRedactions([]);
    setDetectedPII([]);
    setCustomMatches([]);
  };

  // Monitor Backend Poller
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_redacted.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            redactionCount: activeRedactions.length,
            totalPages
          });
          saveFile(finalName, blob.size, 'application/pdf', 'Redact PDF', blob);
          clearStudioDraft('redact-pdf');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            redactionCount: activeRedactions.length,
            totalPages
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server redaction failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Applying permanent redactions on secure engine...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // Execute Redaction (Server or Client fallback)
  const handleApplyRedactions = async () => {
    if (!files.length) return;
    if (activeRedactions.length === 0 && !sanitizeMetadata) {
      setError('Please select at least one redaction box or enable metadata sanitization.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(15);
    setStatusMessage('Preparing document redactions...');

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_redacted.pdf`;

    try {
      if (backendActive) {
        setStatusMessage('Uploading document for secure redaction...');
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(50);
        setStatusMessage('Processing redactions and removing metadata...');

        const redactFormData = new FormData();
        redactFormData.append('file_id', uploadData.file_id);
        redactFormData.append('filename', uploadData.filename);
        redactFormData.append('redactions_json', JSON.stringify(activeRedactions));
        redactFormData.append('sanitize_metadata', sanitizeMetadata ? 'true' : 'false');

        const redactRes = await apiFetch(`${BACKEND_URL}/api/security/redact`, {
          method: 'POST',
          body: redactFormData
        });

        if (!redactRes.ok) throw new Error('Failed to queue redaction task on security server.');
        const redactData = await redactRes.json();
        poller.startPolling(redactData.job_id);
      } else {
        setStatusMessage('Applying permanent vector and pixel redactions...');
        const cropperOptions = await (cropper.getEngineOptionsAsync
          ? cropper.getEngineOptionsAsync(file, pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
          : cropper.getEngineOptions());

        const blob = await clientRedactPdf(
          file,
          { boxes: activeRedactions, sanitizeMetadata, ...cropperOptions },
          (p) => setProgress(p)
        );

        setProcessing(false);
        setResult({
          blob,
          name: finalName,
          size: blob.size,
          redactionCount: activeRedactions.length,
          totalPages
        });

        await saveFile(finalName, blob.size, 'application/pdf', 'Redact PDF', blob);
        await clearStudioDraft('redact-pdf');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during redaction.');
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
    clearStudioDraft('redact-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setPdfDocument(null);
    setTotalPages(0);
    setActivePageIndex(0);
    setRedactions([]);
    setDetectedPII([]);
    setCustomMatches([]);
    setOutputFileName('');
    cropper.revert();
    poller.resetPoller();
  };

  const activePageRedactionCount = activeRedactions.filter((r) => r.page === activePageIndex).length;

  return (
    <ToolPageLayout
      toolId="redact-pdf"
      title="Redact PDF Studio"
      description="Permanently remove sensitive personal information, custom text terms, and hidden metadata from your PDF."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Redact PDF Online — Permanently Remove Sensitive Data | DocScalar"
        description="Auto-detect sensitive information like credit cards, SSNs, and emails. Permanently erase underlying text and image data under redactions."
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
            {/* LEFT / CENTER: Interactive Visual Document Canvas & Redaction Viewport     */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
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
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[180px]" title={files[0]?.name}>
                          {files[0]?.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                          ({formatFileSize(files[0]?.size || 0)})
                        </span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    {totalPages > 0 && (
                      <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-2 py-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                          disabled={activePageIndex === 0}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-2.5 text-[var(--text-primary)] select-none">
                          Page {activePageIndex + 1} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePageIndex((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={activePageIndex >= totalPages - 1}
                          className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {/* Active Page Redaction Counter Pill */}
                    {activePageRedactionCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        {activePageRedactionCount} Redactions on Page
                      </span>
                    )}
                  </div>

                  {/* Zoom & Reset */}
                  <div className="flex items-center gap-2">
                    {/* Top Toolbar Universal Smart Cropper Button */}
                    <SmartCropperToolbarButton cropper={cropper} />

                    {/* Standardized Step Zoom Capsule */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.max(0.3, Math.round((prev - 0.1) * 10) / 10))}
                        disabled={zoomScale <= 0.3}
                        className="p-1 hover:bg-[var(--bg-primary)] rounded text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <span className="material-symbols-outlined text-[15px]">remove</span>
                      </button>
                      <span className="text-xs font-semibold px-2 min-w-[3.2rem] text-center text-[var(--text-primary)] select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
                        disabled={zoomScale >= 3.0}
                        className="p-1 hover:bg-[var(--bg-primary)] rounded text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                      </button>
                    </div>

                    {/* Enhanced Quality / DPI Selector */}
                    <DpiQualitySelector
                      dpi={dpi}
                      onChange={setDpi}
                      align="right"
                      compact={true}
                      dropDirection="down"
                    />

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

                {cropper.isActive && (
                  <div className="px-4 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">auto_fix_high</span>
                      <span className="font-medium">
                        Smart Cropper Active: Content preserved with {cropper.cleanMargin}pt margins
                        {cropper.scope === 'single' ? ` (Page ${activePageIndex + 1})` : ' (All Pages)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cropper.revert()}
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Revert to Original
                    </button>
                  </div>
                )}

                {cropper.isInvertedDocument && (
                  <div className="px-4 py-1.5 bg-amber-500/8 border-t border-amber-500/20 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300 animate-[fadeIn_0.15s_ease-out]">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">info</span>
                    <span>Dark/inverted background detected — auto-crop disabled to protect document design.</span>
                  </div>
                )}
              </div>

              {/* Viewport Canvas Frame */}
              <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none"
              >
                <div
                  className="relative my-auto bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden cursor-crosshair transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  {/* Smart Cropper Clean Margins Refit Outline */}
                  {cropper.isActive && (
                    <div
                      className="absolute border border-dashed border-emerald-500/60 pointer-events-none z-10"
                      style={{
                        inset: `${(cropper.cleanMargin ?? 0) * zoomScale}px`
                      }}
                    >
                      <span className="absolute top-1 right-2 text-[9px] font-bold text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/90 dark:text-emerald-300 px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Smart Cropper Active{cropper.cleanMargin ? ` (${cropper.cleanMargin}pt)` : ''}
                      </span>
                    </div>
                  )}

                  <canvas
                    ref={pdfCanvasRef}
                    className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none block"
                  />

                  {/* Loading Spinner Overlay */}
                  {canvasLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{statusMessage || 'Loading page canvas...'}</span>
                    </div>
                  )}

                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute top-0 left-0 w-full h-full touch-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">security</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Redaction Suite
                  </span>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {activeRedactions.length} Boxes
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Mode Navigation Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('auto')}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'auto'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Auto PII</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'search'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Search size={14} />
                    <span>Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'manual'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Lock size={14} />
                    <span>Boxes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Settings size={14} />
                    <span>Sanitize</span>
                  </button>
                </div>

                {/* TAB 1: Auto PII Scanner */}
                {activeTab === 'auto' && (
                  <div className="flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-subtle)]">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                        PII Categories to Detect
                      </span>
                      <div className="flex flex-col gap-1.5 text-xs text-[var(--text-primary)]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledCategories.creditCard}
                            onChange={(e) => setEnabledCategories((prev) => ({ ...prev, creditCard: e.target.checked }))}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span>Credit Cards (Luhn algorithm)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledCategories.ssn}
                            onChange={(e) => setEnabledCategories((prev) => ({ ...prev, ssn: e.target.checked }))}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span>Social Security (SSN)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledCategories.email}
                            onChange={(e) => setEnabledCategories((prev) => ({ ...prev, email: e.target.checked }))}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span>Email Addresses</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledCategories.phone}
                            onChange={(e) => setEnabledCategories((prev) => ({ ...prev, phone: e.target.checked }))}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span>Phone Numbers</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabledCategories.ip}
                            onChange={(e) => setEnabledCategories((prev) => ({ ...prev, ip: e.target.checked }))}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span>IP Addresses</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleScanPII}
                      disabled={isScanning || !pdfDocument}
                      className="w-full py-2.5 px-3 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                    >
                      <Sparkles size={14} />
                      <span>{isScanning ? `Scanning (${scanProgress}%)...` : 'Auto-Scan Document for PII'}</span>
                    </button>

                    {detectedPII.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Findings ({detectedPII.length})
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => selectAllPII(true)}
                              className="text-[10px] text-[var(--color-primary)] font-bold hover:underline cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-[var(--text-tertiary)] text-[10px]">•</span>
                            <button
                              type="button"
                              onClick={() => selectAllPII(false)}
                              className="text-[10px] text-[var(--text-secondary)] font-bold hover:underline cursor-pointer"
                            >
                              Deselect
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                          {detectedPII.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setActivePageIndex(item.page)}
                              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs cursor-pointer hover:border-[var(--color-primary)] transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRedactionSelection(item.id);
                                  }}
                                  className="text-[var(--text-primary)] cursor-pointer"
                                >
                                  {item.selected !== false ? (
                                    <CheckSquare size={14} className="text-red-500" />
                                  ) : (
                                    <Square size={14} className="text-[var(--text-secondary)]" />
                                  )}
                                </button>
                                <div className="flex flex-col truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--text-primary)]">{item.label}</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 font-semibold">
                                      P.{item.page + 1}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">
                                    {item.maskedValue}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRedaction(item.id);
                                }}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Custom Text Search */}
                {activeTab === 'search' && (
                  <div className="flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Search Keyword or Pattern
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. Confidential, Salary..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchCustom()}
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSearchCustom}
                          disabled={isSearching || !searchTerm.trim()}
                          className="px-3 py-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        >
                          <Search size={14} />
                          <span>Find</span>
                        </button>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)] mt-0.5">
                        <input
                          type="checkbox"
                          checked={isRegexSearch}
                          onChange={(e) => setIsRegexSearch(e.target.checked)}
                          className="rounded accent-[var(--color-primary)] cursor-pointer"
                        />
                        <span>Use Regular Expression (Regex)</span>
                      </label>
                    </div>

                    {customMatches.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Matches ({customMatches.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMatches([]);
                              setRedactions((prev) => prev.filter((r) => r.source !== 'custom-search'));
                            }}
                            className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                          >
                            Clear Matches
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                          {customMatches.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => setActivePageIndex(m.page)}
                              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs cursor-pointer hover:border-[var(--color-primary)] transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRedactionSelection(m.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  {m.selected !== false ? (
                                    <CheckSquare size={14} className="text-blue-500" />
                                  ) : (
                                    <Square size={14} className="text-[var(--text-secondary)]" />
                                  )}
                                </button>
                                <div className="flex flex-col truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--text-primary)]">Match</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-500 font-semibold">
                                      P.{m.page + 1}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">
                                    {m.value}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRedaction(m.id);
                                }}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Active Redaction Boxes List */}
                {activeTab === 'manual' && (
                  <div className="flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Targets ({activeRedactions.length})
                      </span>
                      {redactions.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllRedactions}
                          className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {redactions.length === 0 ? (
                        <p className="text-xs text-center text-[var(--text-secondary)] italic py-8">
                          No redactions placed yet. Draw boxes on the document or run an auto-scan.
                        </p>
                      ) : (
                        redactions.map((r, index) => (
                          <div
                            key={r.id}
                            onClick={() => setActivePageIndex(r.page)}
                            className={`flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs cursor-pointer hover:border-[var(--color-primary)] transition-colors ${
                              r.selected === false ? 'opacity-40' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRedactionSelection(r.id);
                                }}
                                className="cursor-pointer"
                              >
                                {r.selected !== false ? (
                                  <CheckSquare size={14} className="text-red-500" />
                                ) : (
                                  <Square size={14} className="text-[var(--text-secondary)]" />
                                )}
                              </button>
                              <div className="flex flex-col text-xs text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {r.label || `Region #${index + 1}`}
                                  </span>
                                  <span className="text-[9px] px-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold">
                                    P.{r.page + 1}
                                  </span>
                                </div>
                                <span className="text-[10px]">
                                  {Math.round(r.x * 100)}%, {Math.round(r.y * 100)}% • {Math.round(r.width * 100)}% × {Math.round(r.height * 100)}%
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRedaction(r.id);
                              }}
                              className="text-[var(--text-secondary)] hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: Metadata & Compliance Sanitizer */}
                {activeTab === 'settings' && (
                  <div className="flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                    <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-subtle)]">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sanitizeMetadata}
                          onChange={(e) => setSanitizeMetadata(e.target.checked)}
                          className="mt-0.5 rounded accent-[var(--color-primary)] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            Sanitize Metadata & XMP Packets
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                            Strips author names, creation timestamps, and printer tags to prevent forensic data leakage.
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                      <Shield size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Permanent content removal: Redacted text and graphical elements are completely erased from the PDF structure and cannot be retrieved through copy-pasting or file inspection.
                      </span>
                    </div>
                  </div>
                )}

                {/* Universal Smart Cropper Panel */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <SmartCropperPanel
                    cropper={cropper}
                    totalPages={totalPages}
                    onActivate={() => {}}
                    onRevert={() => {}}
                  />
                </div>

                {/* 2. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_redacted.pdf"
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
                        <span className="truncate" title={statusMessage || 'Applying redactions...'}>
                          {statusMessage || 'Applying redactions...'}
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
                  onClick={handleApplyRedactions}
                  disabled={processing || files.length === 0 || (activeRedactions.length === 0 && !sanitizeMetadata)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Sanitizing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      <span>Apply Permanent Redactions ({activeRedactions.length})</span>
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
              <span className="material-symbols-outlined text-[40px]">verified_user</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Document Sanitized & Redacted!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Sensitive text, image areas, and document metadata have been permanently erased.
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
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Redacted Items</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.redactionCount || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.totalPages || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Security</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">100% Compliant</span>
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
                <span>Download Sanitized PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Redact Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
