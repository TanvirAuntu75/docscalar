import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { applyBatesNumbering } from '../../engines/pdf/batesNumbering';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  scanAllNumberingZones,
  recommendOptimalZone,
  analyzeZoneLuminanceAndInk
} from '../../utils/pdfZoneScanner';
import useSmartCropper from '../../hooks/useSmartCropper';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BATES_PRESETS = [
  { id: 'conf', label: 'CONF-', prefix: 'CONF-', digits: 6, suffix: '' },
  { id: 'pltf', label: 'PLTF-', prefix: 'PLTF-', digits: 6, suffix: '' },
  { id: 'def', label: 'DEF-', prefix: 'DEF-', digits: 6, suffix: '' },
  { id: 'exhibit', label: 'EXHIBIT-', prefix: 'EXHIBIT-', digits: 4, suffix: '' },
  { id: 'doc', label: 'DOC-', prefix: 'DOC-', digits: 6, suffix: '' }
];

const COMPASS_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' }
];

const COLOR_SWATCHES = ['#000000', '#FFFFFF', '#1E293B', '#DC2626', '#2563EB', '#059669', '#7C3AED'];

export default function BatesNumbering() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  // Bates Configuration
  const [prefix, setPrefix] = useState('CONF-');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [position, setPosition] = useState('bottom-right');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(36);
  const [skipCoverPage, setSkipCoverPage] = useState(false);
  const [pageScope, setPageScope] = useState('all'); // 'all' | 'range'
  const [pageRange, setPageRange] = useState('');
  const [outputFileName, setOutputFileName] = useState('');

  // Smart Collision & Anti-Overlap Defense
  const [shrinkToFit, setShrinkToFit] = useState(false);
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

  // Processing State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('bates-numbering');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.prefix !== undefined) setPrefix(draft.prefix);
          if (draft.suffix !== undefined) setSuffix(draft.suffix);
          if (draft.startNumber !== undefined) setStartNumber(draft.startNumber);
          if (draft.digits !== undefined) setDigits(draft.digits);
          if (draft.position) setPosition(draft.position);
          if (draft.fontFamily) setFontFamily(draft.fontFamily);
          if (draft.fontSize) setFontSize(draft.fontSize);
          if (draft.color) setColor(draft.color);
          if (draft.margin) setMargin(draft.margin);
          if (draft.skipCoverPage !== undefined) setSkipCoverPage(draft.skipCoverPage);
          if (draft.pageScope) setPageScope(draft.pageScope);
          if (draft.pageRange !== undefined) setPageRange(draft.pageRange);
          if (draft.shrinkToFit !== undefined) setShrinkToFit(draft.shrinkToFit);
          if (draft.shieldMode) setShieldMode(draft.shieldMode);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Bates numbering draft recovery failed:', err);
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
      saveStudioDraft('bates-numbering', {
        files,
        prefix,
        suffix,
        startNumber,
        digits,
        position,
        fontFamily,
        fontSize,
        color,
        margin,
        skipCoverPage,
        pageScope,
        pageRange,
        shrinkToFit,
        shieldMode,
        outputFileName
      });
    }
  }, [
    files,
    prefix,
    suffix,
    startNumber,
    digits,
    position,
    fontFamily,
    fontSize,
    color,
    margin,
    skipCoverPage,
    pageScope,
    pageRange,
    shrinkToFit,
    shieldMode,
    outputFileName
  ]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // 3. Render Active PDF Page to Live Viewport Canvas & Run Zone Collision Scan
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
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

          if (!isCancelled) {
            // Universal Smart Cropper: Content-aware border detection (3-pass pipeline)
            const detection = cropper.runDetection(safePage, baseViewport);

            // If Smart Cropper is active, clean and refit the preview canvas
            if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
              cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
            }

            // Map compass position IDs to scanner keys
            const compassToScannerMap = {
              'top-left': 'header-left',
              'top-center': 'header-center',
              'top-right': 'header-right',
              'bottom-left': 'footer-left',
              'bottom-center': 'footer-center',
              'bottom-right': 'footer-right'
            };
            const activeScannerKey = compassToScannerMap[position];

            // Run Smart Zone Analysis on Rendered Canvas
            const zones = scanAllNumberingZones({
              canvas,
              marginPts: margin,
              scale: scaleMultiplier,
              targetColor: color
            });
            // Normalize zone keys to compass positions
            const normalizedZones = {};
            for (const [cKey, sKey] of Object.entries(compassToScannerMap)) {
              normalizedZones[cKey] = zones[sKey];
            }
            setZoneReports(normalizedZones);

            const rec = recommendOptimalZone(zones);
            // Map back recommendation
            const scannerToCompassMap = {
              'header-left': 'top-left',
              'header-center': 'top-center',
              'header-right': 'top-right',
              'footer-left': 'bottom-left',
              'footer-center': 'bottom-center',
              'footer-right': 'bottom-right'
            };
            setRecommendation({
              recommendedPosition: scannerToCompassMap[rec.recommendedPosition] || 'bottom-right',
              recommendedLabel: rec.recommendedLabel,
              reason: rec.reason
            });

            // Audit Active Placement Zone
            if (activeScannerKey && zones[activeScannerKey]) {
              const activeZoneMetrics = zones[activeScannerKey];
              const isDark = activeZoneMetrics.meanLuminance < 120;
              const hasInk = activeZoneMetrics.hasContentConflict;
              let status = 'safe';
              let message = 'Optimal contrast and margin clearance.';
              if (isDark && hasInk) {
                status = 'critical';
                message = 'Dark background and existing text/graphics detected. Numbering will conflict.';
              } else if (isDark) {
                status = 'warning';
                message = 'Dark background detected. Consider white or high-contrast font color.';
              } else if (hasInk) {
                status = 'warning';
                message = 'Existing page content detected near margin. Check placement to prevent overlap.';
              }
              setAuditReport({
                status,
                message,
                luminance: activeZoneMetrics.meanLuminance,
                inkRatio: activeZoneMetrics.inkPixelDensity,
                isRecommended: rec.recommendedPosition === position
              });
            }
          }
        }

        if (!isCancelled) {
          setCanvasLoading(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(`${base}_bates.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render PDF page for Bates preview:', err);
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
    if (pageScope !== 'range' || !pageRange.trim()) return true;
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
  }, [pageScope, pageRange, totalPages, currentPage]);

  // Calculate live preview bates text for active page
  const calculatePreviewBatesText = () => {
    if (skipCoverPage && currentPage === 1) return null;
    if (!isCurrentPageInRange()) return null;

    const pageOffset = skipCoverPage ? currentPage - 2 : currentPage - 1;
    const num = Math.max(1, startNumber + pageOffset);
    const padded = String(num).padStart(digits, '0');
    return `${prefix}${padded}${suffix}`;
  };

  const previewText = calculatePreviewBatesText();

  // Determine active zone health and auto-contrast status
  const currentZoneData = freeformCoords ? dragHoverMetric : zoneReports[position];
  const isDarkZone = currentZoneData?.isDarkBackground || false;
  const isConflictZone = currentZoneData?.status === 'dark-conflict' || currentZoneData?.status === 'ink-conflict';
  const shouldApplyShield = shieldMode === 'white-pill' || shieldMode === 'frosted' || (shieldMode === 'auto' && isConflictZone);

  // Helper to map placement compass to CSS for preview overlay
  const getCompassStyles = () => {
    const marginPx = margin * zoomScale;
    const base = {
      position: 'absolute',
      color: isDarkZone && color.toLowerCase() === '#000000' && !shouldApplyShield ? '#FFFFFF' : color,
      fontSize: `${fontSize * zoomScale}px`,
      fontFamily: fontFamily === 'Times Roman' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'monospace',
      fontWeight: 700,
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
      case 'top-left':
        return { ...base, top: `${marginPx}px`, left: `${marginPx}px` };
      case 'top-center':
        return { ...base, top: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { ...base, top: `${marginPx}px`, right: `${marginPx}px` };
      case 'bottom-left':
        return { ...base, bottom: `${marginPx}px`, left: `${marginPx}px` };
      case 'bottom-center':
        return { ...base, bottom: `${marginPx}px`, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
      default:
        return { ...base, bottom: `${marginPx}px`, right: `${marginPx}px` };
    }
  };

  // Drag Handler for Freeform Custom Positioning
  const handleOverlayMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);

    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let initialX = margin;
    let initialY = pageDimensions.height - margin - fontSize;

    if (freeformCoords) {
      initialX = freeformCoords.x;
      initialY = freeformCoords.y;
    } else {
      if (position.includes('center')) initialX = (pageDimensions.width - 120) / 2;
      if (position.includes('right')) initialX = pageDimensions.width - margin - 120;
      if (position.includes('top')) initialY = margin;
    }

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startMouseX) / zoomScale;
      const deltaY = (moveEvent.clientY - startMouseY) / zoomScale;

      const newX = Math.max(8, Math.min(pageDimensions.width - 70, Math.round(initialX + deltaX)));
      const newY = Math.max(8, Math.min(pageDimensions.height - 20, Math.round(initialY + deltaY)));

      setFreeformCoords({ x: newX, y: newY });

      if (canvasRef.current) {
        const cWidth = canvasRef.current.width;
        const scaleFactor = cWidth / pageDimensions.width;
        const metric = analyzeZoneLuminanceAndInk(
          canvasRef.current,
          {
            x: newX * scaleFactor,
            y: newY * scaleFactor,
            width: 120 * scaleFactor,
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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const results = [];
      let conflictsFound = 0;

      const scanLimit = Math.min(numPages, 30);
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

        const scannerKey = position.includes('top') ? `header-${position.split('-')[1]}` : `footer-${position.split('-')[1]}`;
        const activeZoneMetric = zones[scannerKey] || { status: 'clean', inkDensityPct: 0 };
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

  // Handle Bates Stamping Execution (Supports Single File & Continuous Multi-Document Bundles)
  const handleApplyBatesNumbering = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      if (pageScope === 'range' && !pageRange.trim()) {
        setError('Please specify a valid page range (e.g. 2-10, 15).');
        setProcessing(false);
        return;
      }

      const activeFile = files[activeFileIndex];
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(activeFile, pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());

      const commonOptions = {
        prefix,
        suffix,
        startNumber,
        digits,
        position,
        fontFamily,
        fontSize,
        color: isDarkZone && color.toLowerCase() === '#000000' && !shouldApplyShield ? '#FFFFFF' : color,
        margin,
        skipCoverPage,
        pageScope,
        pageRange,
        shrinkToFit,
        shieldMode: shouldApplyShield ? (shieldMode === 'frosted' ? 'frosted' : 'white-pill') : 'none',
        freeformCoords,
        ...cropperOptions
      };

      if (batchMode === 'continuous' && files.length > 1) {
        // Continuous Legal Discovery Bates Sequencing Across Entire Document Collection
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

          const fileBytes = await applyBatesNumbering(f, fileOptions);
          const fileBlob = new Blob([fileBytes], { type: 'application/pdf' });

          const arrayBuffer = await f.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          runningStartNumber += pdfDoc.numPages;

          const baseName = f.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_bates.pdf`, fileBlob);

          setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const bundleName = `${files[0].name.replace(/\.[^.]+$/, '')}_bates_collection.zip`;
        setResult({
          blob: zipBlob,
          name: bundleName,
          size: zipBlob.size,
          isZip: true,
          fileCount: files.length
        });
        await saveFile(bundleName, zipBlob.size, 'application/zip', 'Bates Numbering Batch', zipBlob);
      } else if (batchMode === 'individual' && files.length > 1) {
        // Individual Legal Bates Stamping Across Entire Document Collection
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

          const fileBytes = await applyBatesNumbering(f, fileOptions);
          const fileBlob = new Blob([fileBytes], { type: 'application/pdf' });

          const baseName = f.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_bates.pdf`, fileBlob);

          setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const bundleName = `${files[0].name.replace(/\.[^.]+$/, '')}_bates_individual_collection.zip`;
        setResult({
          blob: zipBlob,
          name: bundleName,
          size: zipBlob.size,
          isZip: true,
          fileCount: files.length
        });
        await saveFile(bundleName, zipBlob.size, 'application/zip', 'Bates Numbering Batch', zipBlob);
      } else {
        const outputBytes = await applyBatesNumbering(activeFile, commonOptions);
        const blob = new Blob([outputBytes], { type: 'application/pdf' });
        const finalName = outputFileName || `${activeFile.name.replace(/\.[^.]+$/, '')}_bates.pdf`;

        setResult({
          blob,
          name: finalName,
          size: blob.size,
          isZip: false
        });

        await saveFile(finalName, blob.size, 'application/pdf', 'Bates Numbering', blob);
      }

      await clearStudioDraft('bates-numbering');
    } catch (err) {
      console.error('Bates numbering execution error:', err);
      setError(err.message || 'Failed to apply legal Bates numbers to the document.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('bates-numbering');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setPrefix('CONF-');
    setSuffix('');
    setStartNumber(1);
    setDigits(6);
    setPosition('bottom-right');
    setFontFamily('Helvetica');
    setFontSize(10);
    setColor('#000000');
    setMargin(36);
    setSkipCoverPage(false);
    setPageScope('all');
    setPageRange('');
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
      toolId="bates-numbering"
      title="Bates Numbering PDF"
      description="Add sequential legal Bates numbers, discovery stamps, and alphanumeric prefixes to your PDF."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Bates Numbering PDF Online Free — Legal Stamp Generator | DocScalar"
        description="Apply sequential Bates numbering and legal discovery stamps to PDF files 100% locally in your browser. Enterprise confidentiality guaranteed."
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
                        Smart Cropper Active: Scan borders removed and content refitted with clean {cropper.cleanMargin}pt margins.
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
                          ? 'Dark background / photocopy shadow detected in this area. Bates numbers may be obscured.'
                          : `Content / text detected in this area (${currentZoneData?.inkDensityPct}% ink density). Overlap risk.`}
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

              {/* Viewport Canvas Frame with Live WYSIWYG Bates Overlay */}
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
                  {/* Safe Margins Content Gutter Outline */}
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
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Loading document page...</span>
                    </div>
                  )}

                  {/* Live WYSIWYG Bates Overlay (Draggable) */}
                  {previewText ? (
                    <div
                      style={getCompassStyles()}
                      onMouseDown={handleOverlayMouseDown}
                      title="Drag to reposition Bates stamp anywhere on the page"
                    >
                      <span>{previewText}</span>

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
                  ) : (
                    currentPage === 1 && skipCoverPage && (
                      <div className="absolute top-4 left-4 bg-amber-500/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm flex items-center gap-1.5 z-10">
                        <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                        <span>Cover Page (Skipped)</span>
                      </div>
                    )
                  )}

                  {/* Excluded from Custom Range Badge */}
                  {!isCurrentPageInRange() && (
                    <div className="absolute top-4 left-4 bg-slate-500/15 border border-slate-500/30 text-[var(--text-secondary)] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                      <span className="material-symbols-outlined text-[13px]">filter_alt_off</span>
                      <span>Page Excluded from Range</span>
                    </div>
                  )}
                </div>
              </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-[380px] min-w-[380px] max-w-[380px] bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-none z-20">
              <div className="h-[52px] min-h-[52px] max-h-[52px] px-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-primary)] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tag</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Bates Studio
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full truncate max-w-[150px] border border-[var(--color-primary)]/20">
                  {prefix}{String(startNumber || 1).padStart(digits, '0')}{suffix}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {/* 1. Prefix & Suffix */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Alphanumeric Prefix & Suffix
                    </label>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">e.g. CONF- ... -A</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-medium text-[var(--text-secondary)] block mb-1">Prefix</span>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="CONF-"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-[var(--text-secondary)] block mb-1">Suffix (Optional)</span>
                      <input
                        type="text"
                        value={suffix}
                        onChange={(e) => setSuffix(e.target.value)}
                        placeholder="-A"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Presets Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {BATES_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPrefix(p.prefix);
                          setDigits(p.digits);
                          setSuffix(p.suffix);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer border ${
                          prefix === p.prefix
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-bold shadow-xs'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Digits Padding & Start Number */}
                <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                        Digits Padding
                      </label>
                      <select
                        value={digits}
                        onChange={(e) => setDigits(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none cursor-pointer"
                      >
                        {[3, 4, 5, 6, 7, 8, 9].map((d) => (
                          <option key={d} value={d}>
                            {d} Digits (e.g. {String(1).padStart(d, '0')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                        Start Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={startNumber}
                        onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Placement Compass with Live Health Dots */}
                <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Placement Compass
                    </label>
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
                  <div className="grid grid-cols-3 gap-2 p-2 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)]">
                    {COMPASS_POSITIONS.map((pos) => {
                      const isSelected = !freeformCoords && position === pos.id;
                      const zone = zoneReports[pos.id];
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            setPosition(pos.id);
                            setFreeformCoords(null);
                          }}
                          className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm ring-2 ring-[var(--color-primary)]/25'
                              : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              zone?.status === 'clean'
                                ? 'bg-emerald-500'
                                : zone?.status === 'dark-conflict'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-[11px] leading-tight text-center font-medium whitespace-nowrap">
                            {pos.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Anti-Overlap & Content Shielding Controls */}
                <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]">
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
                        Shrink page by 6% to ensure Bates stamps never touch handwriting, tables, or trial exhibits
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

                {/* 5. Typography & Styling */}
                <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Typography & Styling
                  </label>

                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {['Helvetica', 'Times Roman', 'Courier'].map((f) => {
                      const isSelected = fontFamily === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFontFamily(f)}
                          className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all truncate text-center ${
                            isSelected
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                          }`}
                        >
                          {f.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Font Size & Margin Sliders */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5 bg-[var(--bg-secondary)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span>Font Size</span>
                        <span className="text-[var(--color-primary)] font-bold">{fontSize}pt</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="24"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 bg-[var(--bg-secondary)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span>Margin</span>
                        <span className="text-[var(--color-primary)] font-bold">{margin}pt</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={margin}
                        onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[var(--text-secondary)]">Stamp Color</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setColor(swatch)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            color.toLowerCase() === swatch.toLowerCase()
                              ? 'border-[var(--color-primary)] scale-110 shadow-xs'
                              : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Scope & Cover Page */}
                <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Skip Cover Page</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Do not stamp first page</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={skipCoverPage}
                      onChange={(e) => setSkipCoverPage(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  {/* Page Scope */}
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setPageScope('all')}
                        className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          pageScope === 'all'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        All Pages
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageScope('range')}
                        className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          pageScope === 'range'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>

                    {pageScope === 'range' && (
                      <input
                        type="text"
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        placeholder="e.g. 1-5, 8, 11-14"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono focus:border-[var(--color-primary)] outline-none"
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
                        <option value="continuous">Continuous Legal Sequence Across All {files.length} Files (.zip)</option>
                        <option value="individual">Individual Sequences Across All {files.length} Files (.zip)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 7. Output File Name */}
                <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_bates.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {processing && (
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Stamping Bates sequences...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-150 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleApplyBatesNumbering}
                  disabled={processing}
                  className="w-full py-3.5 px-4 bg-[var(--color-primary)] hover:opacity-95 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Applying Bates Stamps ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="whitespace-nowrap">
                        {batchMode !== 'active' && files.length > 1
                          ? `Apply Legal Stamps to All ${files.length} Files`
                          : 'Apply Legal Bates Numbers'}
                      </span>
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
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Bates Stamping Complete!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.isZip
                  ? `Successfully applied continuous legal Bates stamps across all ${result.fileCount} discovery documents.`
                  : 'Sequential alphanumeric legal discovery stamps have been embedded into your PDF.'}
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

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadResult}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>{result.isZip ? 'Download Bates ZIP Bundle' : 'Download Bates PDF'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Stamp Another PDF</span>
              </button>
            </div>

            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Litigation & Production Workflow
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/workspace"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">account_tree</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Stitch Canvas</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add to discovery pipeline</p>
                  </div>
                </Link>

                <Link
                  to="/merge-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">call_merge</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Merge PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Bundle exhibits</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Litigation size limits</p>
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
