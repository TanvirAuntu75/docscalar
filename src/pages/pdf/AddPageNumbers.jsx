import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { addPageNumbers } from '../../engines/pdf/addPageNumbers';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  scanAllNumberingZones,
  recommendOptimalZone,
  analyzeZoneLuminanceAndInk,
  detectBlackScanBorders,
  computeCleanPdfCropBox
} from '../../utils/pdfZoneScanner';
import useSmartCropper from '../../hooks/useSmartCropper';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';
import {
  NUMBERING_STYLES,
  formatSequenceNumber
} from '../../utils/numberFormatter';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const FORMAT_PRESETS = [
  { label: 'Page 1 of 10', template: 'Page {page} of {total}' },
  { label: '1 / 10', template: '{page} / {total}' },
  { label: '- 1 -', template: '- {page} -' },
  { label: 'Page 1', template: 'Page {page}' },
  { label: 'p. 1', template: 'p. {page}' },
  { label: '1', template: '{page}' }
];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Dark Gray', hex: '#4B5563' },
  { name: 'Muted Gray', hex: '#9CA3AF' },
  { name: 'Primary Blue', hex: '#2563EB' },
  { name: 'Corporate Navy', hex: '#1E3A8A' }
];

export default function AddPageNumbers() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  // Numbering Configuration
  const [format, setFormat] = useState('Page {page} of {total}');
  const [position, setPosition] = useState('footer-center'); // 'header-left' | 'header-center' | 'header-right' | 'footer-left' | 'footer-center' | 'footer-right'
  const [fontFamily, setFontFamily] = useState('Helvetica'); // 'Helvetica' | 'Times' | 'Courier'
  const [fontSize, setFontSize] = useState(10);
  const [startNumber, setStartNumber] = useState(1);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(36); // pts from border
  const [skipFirstPage, setSkipFirstPage] = useState(false);
  const [countCoverPage, setCountCoverPage] = useState(true); // true = Page 2 is labeled "2", false = Page 2 is labeled "1"
  const [targetScope, setTargetScope] = useState('all'); // 'all' | 'range'
  const [pageRange, setPageRange] = useState('');
  const [numberingStyle, setNumberingStyle] = useState('arabic'); // 'arabic' | 'roman-lower' | 'roman-upper' | 'alpha-lower' | 'alpha-upper'
  const [outputFileName, setOutputFileName] = useState('');

  // Smart Collision & Anti-Overlap Defense
  const [shrinkToFit, setShrinkToFit] = useState(false); // Safe Margins (Shrink by 6%)
  const [shieldMode, setShieldMode] = useState('auto'); // 'none' | 'auto' | 'white-pill' | 'frosted'
  const [zoneReports, setZoneReports] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [freeformCoords, setFreeformCoords] = useState(null); // { x, y } in pts or null
  const [dragActive, setDragActive] = useState(false);
  const [dragHoverMetric, setDragHoverMetric] = useState(null);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // VisionClean: Universal Smart Cropper (Auto-Crop Black Scan Borders & Dimension Refit)
  const cropper = useSmartCropper({ canvasRef, totalPages });

  // Multi-File & Multi-Page Scanning
  const [batchMode, setBatchMode] = useState('active'); // 'active' | 'continuous' | 'individual'
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);

  // Canvas Viewport State
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

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef: canvasContainerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('add-page-numbers');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.format) setFormat(draft.format);
          if (draft.position) setPosition(draft.position);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.fontSize !== undefined) setFontSize(draft.fontSize);
          if (draft.startNumber !== undefined) setStartNumber(draft.startNumber);
          if (draft.color) setColor(draft.color);
          if (draft.margin !== undefined) setMargin(draft.margin);
          if (draft.skipFirstPage !== undefined) setSkipFirstPage(draft.skipFirstPage);
          if (draft.countCoverPage !== undefined) setCountCoverPage(draft.countCoverPage);
          if (draft.targetScope) setTargetScope(draft.targetScope);
          if (draft.pageRange) setPageRange(draft.pageRange);
          if (draft.numberingStyle) setNumberingStyle(draft.numberingStyle);
          if (draft.shrinkToFit !== undefined) setShrinkToFit(draft.shrinkToFit);
          if (draft.shieldMode) setShieldMode(draft.shieldMode);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Page numbers draft recovery failed:', err);
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
      saveStudioDraft('add-page-numbers', {
        files,
        format,
        position,
        fontFamily,
        fontSize,
        startNumber,
        color,
        margin,
        skipFirstPage,
        countCoverPage,
        targetScope,
        pageRange,
        numberingStyle,
        shrinkToFit,
        shieldMode,
        outputFileName
      });
    }
  }, [
    files,
    format,
    position,
    fontFamily,
    fontSize,
    startNumber,
    color,
    margin,
    skipFirstPage,
    countCoverPage,
    targetScope,
    pageRange,
    numberingStyle,
    shrinkToFit,
    shieldMode,
    outputFileName
  ]);

  // Keep page input in sync with currentPage
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // 3. Render Active PDF Page to Live Viewport Canvas & Run Smart Zone Analysis
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
        const pdf = await loadPdfDocument(arrayBuffer).promise;
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

        const scaleMultiplier = getScaleMultiplier(debouncedRenderZoom);
        const viewport = page.getViewport({ scale: scaleMultiplier });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          await page.render({ canvasContext: ctx, viewport }).promise;

            // Universal Smart Cropper: Content-aware border detection (3-pass pipeline)
            const detection = cropper.runDetection(safePage, baseViewport);

            // If Smart Cropper is active, clean and refit the preview canvas
            if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
              cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
            }

            // Run Smart Zone Analysis on Rendered Canvas
            const zones = scanAllNumberingZones({
              canvas,
              marginPts: margin,
              scale: scaleMultiplier,
              targetColor: color
            });
            setZoneReports(zones);
            const rec = recommendOptimalZone(zones);
            setRecommendation(rec);
          }

        if (!isCancelled) {
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_numbered.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render PDF page for page numbering preview:', err);
          setCanvasLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex, currentPage, debouncedRenderZoom, dpi, margin, color, cropper.isActive, cropper.cleanMargin, cropper.enabledEdges, getScaleMultiplier]);

  // Check if current page is included in range
  const isCurrentPageInRange = useCallback(() => {
    if (targetScope !== 'range' || !pageRange.trim()) return true;
    const indices = new Set();
    pageRange.split(',').forEach((part) => {
      const r = part.trim().split('-');
      if (r.length === 2) {
        const start = parseInt(r[0], 10);
        const end = parseInt(r[1], 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            indices.add(i);
          }
        }
      } else {
        const n = parseInt(part.trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) indices.add(n);
      }
    });
    return indices.has(currentPage);
  }, [targetScope, pageRange, totalPages, currentPage]);

  // Compute Active Page Display Text
  const getRenderedNumberString = () => {
    if (skipFirstPage && currentPage === 1) return '';
    if (!isCurrentPageInRange()) return '';

    let pageNum;
    if (skipFirstPage) {
      if (countCoverPage) {
        pageNum = currentPage + startNumber - 1;
      } else {
        pageNum = Math.max(1, currentPage - 2 + startNumber);
      }
    } else {
      pageNum = currentPage + startNumber - 1;
    }

    const totalDisplay = (skipFirstPage && !countCoverPage) ? totalPages - 1 : totalPages;
    const formattedNum = formatSequenceNumber(pageNum, numberingStyle);
    const formattedTotal = formatSequenceNumber(totalDisplay || 1, numberingStyle);

    return format
      .replace('{page}', formattedNum)
      .replace('{n}', formattedNum)
      .replace('{total}', formattedTotal)
      .replace('{seq_total}', String(totalPages - 1 + startNumber));
  };

  // Determine active zone health and auto-contrast status
  const currentZoneData = freeformCoords ? dragHoverMetric : zoneReports[position];
  const isDarkZone = currentZoneData?.isDarkBackground || false;
  const isConflictZone = currentZoneData?.status === 'dark-conflict' || currentZoneData?.status === 'ink-conflict';
  const shouldApplyShield = shieldMode === 'white-pill' || shieldMode === 'frosted' || (shieldMode === 'auto' && isConflictZone);

  // Compute live visual coordinates and styling for preview overlay
  const getLivePositionStyles = () => {
    const marginPx = margin * zoomScale;
    const base = {
      position: 'absolute',
      color: isDarkZone && color.toLowerCase() === '#000000' && !shouldApplyShield ? '#FFFFFF' : color,
      fontSize: `${fontSize * zoomScale}px`,
      fontFamily: fontFamily === 'Times' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      lineHeight: 1,
      zIndex: 15,
      userSelect: 'none',
      cursor: 'grab',
      transition: dragActive ? 'none' : 'all 0.15s ease'
    };

    if (shouldApplyShield) {
      base.backgroundColor = shieldMode === 'frosted' ? 'rgba(255, 255, 255, 0.88)' : '#FFFFFF';
      base.color = '#0F172A';
      base.padding = `${3 * zoomScale}px ${8 * zoomScale}px`;
      base.borderRadius = '9999px';
      base.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      base.border = '1px solid rgba(203, 213, 225, 0.8)';
    }

    if (freeformCoords) {
      return {
        ...base,
        top: `${freeformCoords.y * zoomScale}px`,
        left: `${freeformCoords.x * zoomScale}px`
      };
    }

    switch (position) {
      case 'header-left':
        return { ...base, top: `${marginPx}px`, left: `${marginPx}px` };
      case 'header-center':
        return { ...base, top: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'header-right':
        return { ...base, top: `${marginPx}px`, right: `${marginPx}px` };
      case 'footer-left':
        return { ...base, bottom: `${marginPx}px`, left: `${marginPx}px` };
      case 'footer-right':
        return { ...base, bottom: `${marginPx}px`, right: `${marginPx}px` };
      case 'footer-center':
      default:
        return { ...base, bottom: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
    }
  };

  // Drag & Drop Handler for Freeform Custom Positioning
  const handleOverlayMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);

    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;

    const rect = canvasContainer.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let initialX = margin;
    let initialY = pageDimensions.height - margin - fontSize;

    if (freeformCoords) {
      initialX = freeformCoords.x;
      initialY = freeformCoords.y;
    } else {
      if (position.includes('center')) initialX = (pageDimensions.width - 100) / 2;
      if (position.includes('right')) initialX = pageDimensions.width - margin - 100;
      if (position.includes('header')) initialY = margin;
    }

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startMouseX) / zoomScale;
      const deltaY = (moveEvent.clientY - startMouseY) / zoomScale;

      const newX = Math.max(8, Math.min(pageDimensions.width - 60, Math.round(initialX + deltaX)));
      const newY = Math.max(8, Math.min(pageDimensions.height - 20, Math.round(initialY + deltaY)));

      setFreeformCoords({ x: newX, y: newY });

      // Real-time canvas pixel collision check under drag
      if (canvasRef.current) {
        const cWidth = canvasRef.current.width;
        const scaleFactor = cWidth / pageDimensions.width;
        const metric = analyzeZoneLuminanceAndInk(
          canvasRef.current,
          {
            x: newX * scaleFactor,
            y: newY * scaleFactor,
            width: 100 * scaleFactor,
            height: 24 * scaleFactor
          },
          color
        );
        setDragHoverMetric(metric);
      }
    };

    const onMouseUp = () => {
      setDragActive(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Multi-Page Collision Audit Scanner
  const runDocumentAudit = async () => {
    if (!files.length) return;
    setAuditLoading(true);
    setShowAuditModal(true);

    try {
      const currentFile = files[activeFileIndex] || files[0];
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdf = await loadPdfDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;

      const results = [];
      let conflictsFound = 0;

      // Scan pages asynchronously
      const scanLimit = Math.min(numPages, 30); // Inspect up to 30 pages
      for (let i = 1; i <= scanLimit; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: offscreenCtx, viewport }).promise;

        const zones = scanAllNumberingZones({
          canvas: offscreenCanvas,
          marginPts: margin,
          scale: 0.8,
          targetColor: color
        });

        const activeZoneMetric = zones[position] || { status: 'clean', inkDensityPct: 0 };
        const hasConflict = activeZoneMetric.status === 'dark-conflict' || activeZoneMetric.status === 'ink-conflict';
        if (hasConflict) conflictsFound++;

        results.push({
          page: i,
          status: activeZoneMetric.status,
          inkDensity: activeZoneMetric.inkDensityPct,
          isDark: activeZoneMetric.isDarkBackground,
          recommendation: recommendOptimalZone(zones).recommendedLabel
        });
      }

      setAuditReport({
        totalPages: numPages,
        scannedPages: scanLimit,
        conflictsCount: conflictsFound,
        results
      });
    } catch (err) {
      console.warn('Document collision audit failed:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Main Apply Numbering Action (Supports Single File & Continuous Multi-File Bundles)
  const handleApplyPageNumbers = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      let targetPages = null;
      if (targetScope === 'range') {
        if (!pageRange.trim()) {
          setError('Please specify a valid page range (e.g. 2-10, 15).');
          setProcessing(false);
          return;
        }
        const indices = new Set();
        pageRange.split(',').forEach((part) => {
          const r = part.trim().split('-');
          if (r.length === 2) {
            const start = parseInt(r[0], 10) - 1;
            const end = parseInt(r[1], 10) - 1;
            for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
              indices.add(i);
            }
          } else {
            const n = parseInt(part.trim(), 10) - 1;
            if (!isNaN(n) && n >= 0 && n < totalPages) indices.add(n);
          }
        });
        targetPages = Array.from(indices);
        if (targetPages.length === 0) {
          setError('No valid pages found in the specified range.');
          setProcessing(false);
          return;
        }
      }

      const activeFile = files[activeFileIndex];
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(activeFile, pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());

      const commonOptions = {
        format,
        position,
        fontFamily,
        fontSize,
        startNumber,
        color: isDarkZone && color.toLowerCase() === '#000000' && !shouldApplyShield ? '#FFFFFF' : color,
        margin,
        skipFirstPage,
        countCoverPage,
        targetPages,
        numberingStyle,
        shrinkToFit,
        shieldMode: shouldApplyShield ? (shieldMode === 'frosted' ? 'frosted' : 'white-pill') : 'none',
        freeformCoords,
        ...cropperOptions
      };

      if (batchMode === 'continuous' && files.length > 1) {
        // Continuous Document Collection Stamping
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        let runningStartNumber = startNumber;

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const fileCropperOptions = (i === activeFileIndex)
            ? cropperOptions
            : (cropper.getEngineOptionsAsync && cropper.isActive
                ? await cropper.getEngineOptionsAsync(f, pdfjsLib)
                : cropper.getEngineOptions());

          const fileOptions = {
            ...commonOptions,
            ...fileCropperOptions,
            startNumber: runningStartNumber
          };
          const fileBlob = await addPageNumbers(f, fileOptions, (pct) => {
            const overallPct = Math.round((i / files.length) * 100 + (pct / files.length));
            setProgress(overallPct);
          });

          // Read page count of this file to advance counter
          const arrayBuffer = await f.arrayBuffer();
          const pdfDoc = await loadPdfDocument(arrayBuffer).promise;
          runningStartNumber += pdfDoc.numPages;

          const baseName = f.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_numbered.pdf`, fileBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const bundleName = `${files[0].name.replace(/\.[^.]+$/, '')}_numbered_bundle.zip`;
        setResult({
          blob: zipBlob,
          name: bundleName,
          size: zipBlob.size,
          isZip: true,
          fileCount: files.length
        });
        await saveFile(bundleName, zipBlob.size, 'application/zip', 'Add Page Numbers Batch', zipBlob);
      } else if (batchMode === 'individual' && files.length > 1) {
        // Individual Document Stamping (Each file restarts from startNumber)
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const fileCropperOptions = (i === activeFileIndex)
            ? cropperOptions
            : (cropper.getEngineOptionsAsync && cropper.isActive
                ? await cropper.getEngineOptionsAsync(f, pdfjsLib)
                : cropper.getEngineOptions());

          const fileOptions = {
            ...commonOptions,
            ...fileCropperOptions,
            startNumber
          };
          const fileBlob = await addPageNumbers(f, fileOptions, (pct) => {
            const overallPct = Math.round((i / files.length) * 100 + (pct / files.length));
            setProgress(overallPct);
          });

          const baseName = f.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_numbered.pdf`, fileBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const bundleName = `${files[0].name.replace(/\.[^.]+$/, '')}_individual_numbered_bundle.zip`;
        setResult({
          blob: zipBlob,
          name: bundleName,
          size: zipBlob.size,
          isZip: true,
          fileCount: files.length
        });
        await saveFile(bundleName, zipBlob.size, 'application/zip', 'Add Page Numbers Batch', zipBlob);
      } else {
        // Single File or Active File Mode
        const outputBlob = await addPageNumbers(activeFile, commonOptions, setProgress);
        const defaultName = `${activeFile.name.replace(/\.[^.]+$/, '')}_numbered.pdf`;
        const finalName = outputFileName || defaultName;

        setResult({
          blob: outputBlob,
          name: finalName,
          size: outputBlob.size,
          isZip: false
        });

        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Add Page Numbers', outputBlob);
      }

      await clearStudioDraft('add-page-numbers');
    } catch (err) {
      console.error('Page numbering execution failed:', err);
      setError(err.message || 'Page numbering failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('add-page-numbers');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setFormat('Page {page} of {total}');
    setPosition('footer-center');
    setFontFamily('Helvetica');
    setFontSize(10);
    setStartNumber(1);
    setColor('#000000');
    setMargin(36);
    setSkipFirstPage(false);
    setCountCoverPage(true);
    setTargetScope('all');
    setPageRange('');
    setNumberingStyle('arabic');
    setShrinkToFit(false);
    setShieldMode('auto');
    setFreeformCoords(null);
    setBatchMode('active');
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      toolId="add-page-numbers"
      title="Add PDF Page Numbers"
      description="Draw custom sequence numbers, headers, and footers across your PDF document."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Add Page Numbers to PDF Online Free — Number PDF Pages | DocScalar"
        description="Insert customized headers, footers, and page numbers into your PDF files securely. Complete privacy with fast processing."
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
            {/* LEFT / CENTER: Interactive Live High-DPI Canvas Viewport                  */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between gap-3 overflow-visible">
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value, 10));
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

                    {/* Page Navigation & Direct Jump */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-2 py-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Previous Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <div className="flex items-center gap-1.5 px-1.5">
                        <input
                          type="number"
                          min="1"
                          max={totalPages || 1}
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          onBlur={() => {
                            const p = Math.max(1, Math.min(totalPages || 1, parseInt(pageInput, 10) || 1));
                            setCurrentPage(p);
                            setPageInput(String(p));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const p = Math.max(1, Math.min(totalPages || 1, parseInt(pageInput, 10) || 1));
                              setCurrentPage(p);
                              setPageInput(String(p));
                            }
                          }}
                          className="h-6 w-10 text-center text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] outline-none"
                        />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">/ {totalPages || 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-0.5 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Next Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>

                    {/* Safe Margin Active Badge */}
                    {shrinkToFit && (
                      <div className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-full">
                        <span className="material-symbols-outlined text-[13px]">shield</span>
                        <span>Safe Margins Active</span>
                      </div>
                    )}
                  </div>

                  {/* Zoom Controls, Multi-Page Scanner & Workspace Reset */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Top Toolbar Universal Smart Cropper Button */}
                    <SmartCropperToolbarButton cropper={cropper} />

                    {/* Multi-Page Collision Audit Button */}
                    <button
                      type="button"
                      onClick={runDocumentAudit}
                      disabled={auditLoading}
                      className="px-2.5 py-1 text-xs font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Scan all pages for background conflicts and content collisions"
                    >
                      <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">
                        {auditLoading ? 'progress_activity' : 'policy'}
                      </span>
                      <span className="hidden sm:inline">Scan All Pages</span>
                    </button>

                    {/* Zoom Sliders & Presets */}
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setZoomScale(0.8)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hidden sm:inline-block ${zoomScale === 0.8 ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        title="Fit View"
                      >
                        Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(1.0)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hidden sm:inline-block ${zoomScale === 1.0 ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        title="100% Scale"
                      >
                        100%
                      </button>
                      <input
                        type="range"
                        min="0.3"
                        max="3.0"
                        step="0.05"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-14 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-8 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
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

                {/* Universal Smart Cropper Banner (Detection prompt) */}
                {cropper.hasDetectedBorders && !cropper.isActive && (
                  <div className="px-4 py-2.5 bg-emerald-500/10 border-t border-emerald-500/25 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-900 dark:text-emerald-200 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">crop</span>
                      <span>
                        <strong>Scan border artifacts detected</strong> — {cropper.detectionReason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cropper.activate()}
                        className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-xs text-[11px] flex items-center gap-1.5"
                        title="Content-aware smart crop with safety fence — zero content clipping"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                        Clean Borders
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Smart Cropper Banner */}
                {cropper.isActive && (
                  <div className="px-4 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-800 dark:text-emerald-300 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>
                        Smart Cropper Active: Scan borders removed and content refitted to original dimensions.
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

                {/* Inverted Document Banner */}
                {cropper.isInvertedDocument && (
                  <div className="px-4 py-1.5 bg-amber-500/8 border-t border-amber-500/20 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300 animate-[fadeIn_0.15s_ease-out]">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">info</span>
                    <span>Dark/inverted background detected — auto-crop disabled to protect document design.</span>
                  </div>
                )}

                {/* Smart Zone Health & Conflict Alert Banner */}
                {isConflictZone && (
                  <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-xs flex items-center justify-between flex-wrap gap-2 text-amber-800 dark:text-amber-300 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400">warning</span>
                      <span>
                        {currentZoneData?.isDarkBackground
                          ? 'Dark background / photocopy shadow detected in this area. Numbers may be obscured.'
                          : `Content / handwriting detected in this area (${currentZoneData?.inkDensityPct}% ink density). Overlap risk.`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!cropper.isActive && (cropper.hasDetectedBorders || currentZoneData?.isDarkBackground) && (
                        <button
                          type="button"
                          onClick={() => cropper.activate()}
                          className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-xs text-[11px] flex items-center gap-1"
                          title="Content-aware smart crop — zero content clipping"
                        >
                          <span className="material-symbols-outlined text-[14px]">crop</span>
                          Clean Borders
                        </button>
                      )}
                      {!shrinkToFit && (
                        <button
                          type="button"
                          onClick={() => setShrinkToFit(true)}
                          className="px-2.5 py-1 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all cursor-pointer shadow-xs text-[11px]"
                        >
                          Enable Safe Margins (Shrink to Fit)
                        </button>
                      )}
                      {recommendation && recommendation.recommendedPosition !== position && (
                        <button
                          type="button"
                          onClick={() => {
                            setPosition(recommendation.recommendedPosition);
                            setFreeformCoords(null);
                          }}
                          className="px-2.5 py-1 bg-[var(--bg-primary)] border border-amber-500/40 text-amber-800 dark:text-amber-200 font-bold rounded-lg hover:bg-[var(--bg-secondary)] transition-all cursor-pointer text-[11px]"
                        >
                          Move to {recommendation.recommendedLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Viewport Canvas Frame with Live Numbering Overlay */}
              <div
                className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none pb-24"
                ref={canvasContainerRef}
              >
                <div
                  className={`relative my-auto bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-all duration-150 ${
                    shrinkToFit ? 'ring-2 ring-emerald-500/30' : ''
                  }`}
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  {/* Safe Margins Content Gutter Outline (When Shrink to Fit is Active) */}
                  {shrinkToFit && (
                    <div
                      className="absolute border border-dashed border-emerald-500/50 pointer-events-none z-10"
                      style={{
                        inset: `${((pageDimensions.height * 0.03) || 24) * zoomScale}px ${((pageDimensions.width * 0.03) || 18) * zoomScale}px`
                      }}
                    >
                      <span className="absolute top-1 left-2 text-[9px] font-bold text-emerald-600 bg-emerald-50/80 px-1 rounded uppercase tracking-wider">
                        Safe Content Bounds
                      </span>
                    </div>
                  )}

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

                  {/* Underlying PDF Page Canvas */}
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
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Rendering high-DPI page preview...</span>
                    </div>
                  )}

                  {/* Live WYSIWYG Page Number Overlay (Draggable) */}
                  {getRenderedNumberString() && (
                    <div
                      style={getLivePositionStyles()}
                      onMouseDown={handleOverlayMouseDown}
                      title="Drag to reposition number anywhere on the page"
                    >
                      <span>{getRenderedNumberString()}</span>

                      {/* Live Drag Coordinate & Conflict Indicator */}
                      {dragActive && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30 flex items-center gap-1">
                          <span>
                            X: {freeformCoords?.x || 0}pt, Y: {freeformCoords?.y || 0}pt
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              dragHoverMetric?.status === 'clean'
                                ? 'bg-emerald-400'
                                : dragHoverMetric?.status === 'dark-conflict'
                                ? 'bg-red-400'
                                : 'bg-amber-400'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cover Page Skip Badge Indicator */}
                  {skipFirstPage && currentPage === 1 && (
                    <div className="absolute top-4 right-4 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                      <span className="material-symbols-outlined text-[13px]">visibility_off</span>
                      <span>Cover Page (Numbering Skipped)</span>
                    </div>
                  )}

                  {/* Excluded from Custom Range Badge */}
                  {!isCurrentPageInRange() && (
                    <div className="absolute top-4 left-4 bg-slate-500/15 border border-slate-500/30 text-[var(--text-secondary)] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                      <span className="material-symbols-outlined text-[13px]">filter_alt_off</span>
                      <span>Page Excluded from Custom Range</span>
                    </div>
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">format_list_numbered</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Numbering Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Format Template & Numbering Style */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Numbering Format & Style
                  </label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    placeholder="Page {page} of {total}"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-semibold"
                  />
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    {FORMAT_PRESETS.map((fp) => (
                      <button
                        key={fp.label}
                        type="button"
                        onClick={() => setFormat(fp.template)}
                        className={`p-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all cursor-pointer truncate ${
                          format === fp.template
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {fp.label}
                      </button>
                    ))}
                  </div>

                  {/* Sequence Style Selector */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">Numeral Style</span>
                    <select
                      value={numberingStyle}
                      onChange={(e) => setNumberingStyle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer font-semibold"
                    >
                      {NUMBERING_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Position & Placement Compass with Live Health Dots */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Position on Page
                    </span>
                    {freeformCoords && (
                      <button
                        type="button"
                        onClick={() => setFreeformCoords(null)}
                        className="text-[10px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Reset to Grid
                      </button>
                    )}
                  </div>

                  {/* Header (Top) Matrix */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Header (Top)</span>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {[
                        { id: 'header-left', label: 'Top Left' },
                        { id: 'header-center', label: 'Top Center' },
                        { id: 'header-right', label: 'Top Right' }
                      ].map((p) => {
                        const isSelected = !freeformCoords && position === p.id;
                        const zone = zoneReports[p.id];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPosition(p.id);
                              setFreeformCoords(null);
                            }}
                            className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  zone?.status === 'clean'
                                    ? 'bg-emerald-500'
                                    : zone?.status === 'dark-conflict'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="truncate">{p.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer (Bottom) Matrix */}
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Footer (Bottom)</span>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {[
                        { id: 'footer-left', label: 'Bottom Left' },
                        { id: 'footer-center', label: 'Bottom Center' },
                        { id: 'footer-right', label: 'Bottom Right' }
                      ].map((p) => {
                        const isSelected = !freeformCoords && position === p.id;
                        const zone = zoneReports[p.id];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPosition(p.id);
                              setFreeformCoords(null);
                            }}
                            className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  zone?.status === 'clean'
                                    ? 'bg-emerald-500'
                                    : zone?.status === 'dark-conflict'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="truncate">{p.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">touch_app</span>
                    Or drag the number directly on the page preview
                  </span>
                </div>

                {/* 3. Anti-Overlap & Content Shielding Controls */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Content Protection
                  </span>

                  {/* Universal Smart Cropper Panel */}
                  <SmartCropperPanel
                    cropper={cropper}
                    totalPages={totalPages}
                    onActivate={() => {}}
                    onRevert={() => {}}
                  />

                  {/* Safe Margins (Shrink to Fit) Toggle */}
                  <label className="flex items-start justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-500">shield</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">Safe Margins</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5">
                        Shrink page by 6% to ensure numbers never touch handwriting, tables, or charts
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={shrinkToFit}
                      onChange={(e) => setShrinkToFit(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  {/* Knockout Shield Pill */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">Knockout Shield Pill</span>
                    <select
                      value={shieldMode}
                      onChange={(e) => setShieldMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                    >
                      <option value="auto">Auto-Detect (Apply when dark/busy)</option>
                      <option value="white-pill">Solid White Pill (100% Opaque)</option>
                      <option value="frosted">Frosted White (85% Translucent)</option>
                      <option value="none">None (Transparent Text Only)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Typography & Styling */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  {/* Font Family */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                    >
                      <option value="Helvetica">Helvetica (Standard Sans)</option>
                      <option value="Times">Times Roman (Formal Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  {/* Font Size & Margin Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Size
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{fontSize}pt</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Margin
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{margin}pt</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        step="4"
                        value={margin}
                        onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-[var(--bg-secondary)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Color Presets */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Color
                      </label>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setColor(c.hex)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            color.toLowerCase() === c.hex.toLowerCase()
                              ? 'scale-110 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                              : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Sequence, Cover Page & Scope */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Start Numbering From
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 px-2 py-1 text-xs text-center bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg font-bold text-[var(--text-primary)]"
                    />
                  </div>

                  {/* Skip Cover Page Toggle */}
                  <div className="flex flex-col gap-1.5 p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Skip Cover Page</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Do not print number on page 1</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={skipFirstPage}
                        onChange={(e) => setSkipFirstPage(e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </label>

                    {skipFirstPage && (
                      <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-secondary)]">Page 2 Label:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCountCoverPage(true)}
                            className={`px-2 py-0.5 rounded cursor-pointer font-bold ${
                              countCoverPage ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            "2" (Natural)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCountCoverPage(false)}
                            className={`px-2 py-0.5 rounded cursor-pointer font-bold ${
                              !countCoverPage ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            "1" (Sequential)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Target Scope */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Page Scope
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setTargetScope('all')}
                        className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                          targetScope === 'all'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        All Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetScope('range')}
                        className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                          targetScope === 'range'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>

                    {targetScope === 'range' && (
                      <input
                        type="text"
                        placeholder="e.g. 2-10, 15"
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none mt-1"
                      />
                    )}
                  </div>

                  {/* Batch Numbering Mode (When Multiple Files Uploaded) */}
                  {files.length > 1 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Batch Scope ({files.length} Files)
                      </span>
                      <select
                        value={batchMode}
                        onChange={(e) => setBatchMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer font-semibold"
                      >
                        <option value="active">Active File Only ({files[activeFileIndex]?.name})</option>
                        <option value="continuous">Continuous Sequence Across All {files.length} Files (.zip)</option>
                        <option value="individual">Individual Numbering Across All {files.length} Files (.zip)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 6. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_numbered.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Drawing page numbers...
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
                  onClick={handleApplyPageNumbers}
                  disabled={processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Numbering ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>{batchMode !== 'active' && files.length > 1 ? `Number All ${files.length} Files` : 'Apply Page Numbers'}</span>
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
                Page Numbers Successfully Added!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.isZip
                  ? `Successfully numbered all ${result.fileCount} PDF documents in continuous legal sequence.`
                  : 'Dynamic page sequence stamps have been embedded into your PDF.'}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.isZip ? 'folder_zip' : 'description'}
                </span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
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
                <span>{result.isZip ? 'Download Numbered ZIP' : 'Download Numbered PDF'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Number Another PDF</span>
              </button>
            </div>

            {/* Quick Pipeline Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/workspace"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">account_tree</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Stitch Canvas</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add to visual pipeline</p>
                  </div>
                </Link>

                <Link
                  to="/merge-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">call_merge</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Merge PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Combine with others</p>
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

      {/* Multi-Page Collision Audit Inspection Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl max-w-lg w-full p-5 flex flex-col gap-4 animate-[scaleIn_0.15s_ease-out]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">policy</span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Document Collision Audit</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {auditLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                  progress_activity
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Scanning document pages for collisions...</span>
              </div>
            ) : auditReport ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Audit Results</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Scanned {auditReport.scannedPages} of {auditReport.totalPages} pages for {position}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      auditReport.conflictsCount === 0
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {auditReport.conflictsCount === 0
                      ? '100% Clean'
                      : `${auditReport.conflictsCount} Conflicts Detected`}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {auditReport.results.map((r) => (
                    <div
                      key={r.page}
                      className="p-2 rounded-lg bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">Page {r.page}</span>
                      <div className="flex items-center gap-2">
                        {r.status === 'clean' ? (
                          <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Clean
                          </span>
                        ) : r.status === 'dark-conflict' ? (
                          <span className="text-red-500 text-[11px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Dark Scan Artifact
                          </span>
                        ) : (
                          <span className="text-amber-500 text-[11px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {r.inkDensity}% Ink Overlap
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {auditReport.conflictsCount > 0 && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-secondary)]">Recommended Action:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShrinkToFit(true);
                        setShieldMode('auto');
                        setShowAuditModal(false);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                    >
                      Enable Safe Margins to Protect All Pages
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
