import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { editPdf } from '../../engines/pdf/editPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import useSmartCropper from '../../hooks/useSmartCropper';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import {
  isAnnotationHit,
  getAnnotationBounds,
  translateAnnotation,
  sanitizeAnnotation,
  getAnnotationResizeHandles,
  isHandleHit,
  resizeAnnotation
} from '../../utils/pdfEditorGeometry';
import {
  analyzeDigitalLines,
  analyzeRasterCanvas,
  findBestMatchingLine,
  clusterTextItemsIntoLines
} from '../../utils/pdfLineAnalyzer';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const EDITOR_TOOLS = [
  { id: 'select', label: 'Select / Move', icon: 'near_me', desc: 'Select, reposition, or delete annotations (V)' },
  { id: 'text-edit', label: 'Direct Text Edit', icon: 'edit_note', desc: 'Click anywhere to type, edit, or backspace text directly (I)' },
  { id: 'pen', label: 'Pen Brush', icon: 'draw', desc: 'Smooth calligraphic drawing with pressure dynamics (P)' },
  { id: 'highlight', label: 'Highlighter', icon: 'ink_highlighter', desc: 'Smart line auto-sizing highlighter (H)' },
  { id: 'rectangle', label: 'Rectangle', icon: 'crop_square', desc: 'Vector rectangle bounding box (R)' },
  { id: 'circle', label: 'Circle', icon: 'radio_button_unchecked', desc: 'Vector ellipse or circle outline (C)' },
  { id: 'line', label: 'Line', icon: 'horizontal_rule', desc: 'Straight vector connector line (L)' },
  { id: 'arrow', label: 'Arrow', icon: 'trending_flat', desc: 'Directional vector arrow indicator (A)' },
  { id: 'text', label: 'Add Text', icon: 'title', desc: 'Place new custom text annotations anywhere (T)' },
  { id: 'eraser', label: 'Eraser', icon: 'ink_eraser', desc: 'Direct PDF whiteout eraser & object remover (E)' }
];

const COLOR_SWATCHES = ['#EF4444', '#000000', '#2563EB', '#10B981', '#F59E0B', '#7C3AED'];
const HIGHLIGHT_SWATCHES = ['#FDE047', '#4ADE80', '#38BDF8', '#F472B6', '#FB923C', '#A78BFA'];

const FONT_FAMILIES = [
  { id: 'Helvetica', label: 'Helvetica (Sans-Serif)' },
  { id: 'TimesRoman', label: 'Times New Roman (Serif)' },
  { id: 'Courier', label: 'Courier (Monospace)' }
];

export default function EditPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  const [backendActive, setBackendActive] = useState(false);
  const poller = useJobPoller(BACKEND_URL);

  const [activeTool, setActiveTool] = useState('text-edit');
  const [strokeColor, setStrokeColor] = useState('#EF4444');
  const [thickness, setThickness] = useState(3);
  const [outputFileName, setOutputFileName] = useState('');
  const [smartHighlight, setSmartHighlight] = useState(true);
  const [detectedLines, setDetectedLines] = useState([]);
  const [eraserThickness, setEraserThickness] = useState(18);
  const [eraserMode, setEraserMode] = useState('additions'); // 'additions' (erase only added items) | 'whiteout' (erase PDF directly)
  const activeSmartLineRef = useRef(null);

  // Typography & Direct Inline Text Editing
  const [textColor, setTextColor] = useState('#000000');
  const [textFontSize, setTextFontSize] = useState(14);
  const [textFontFamily, setTextFontFamily] = useState('Helvetica');
  const [isWhiteoutEnabled, setIsWhiteoutEnabled] = useState(true);
  const [directTextEditor, setDirectTextEditor] = useState(null);

  const [annotations, setAnnotations] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [editedTextMap, setEditedTextMap] = useState({});

  // Selection & dragging / resizing state
  const [selectedAnnoId, setSelectedAnnoId] = useState(null);
  const [isDraggingSelected, setIsDraggingSelected] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState(null);
  const dragStartPointRef = useRef(null);
  const dragInitialAnnoRef = useRef(null);
  const dragInitialBoundsRef = useRef(null);
  const dragInitialFontSizeRef = useRef(14);
  const dragDidMutateRef = useRef(false);
  const eraserGestureHadDeletionRef = useRef(false);
  const eraserHoverPointRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);
  const currentPathPointsRef = useRef([]);
  const dragStartRef = useRef(null);
  const dragEndRef = useRef(null);

  // Inline text editing state
  const [extractedTextLines, setExtractedTextLines] = useState([]);
  const [, setLoadingText] = useState(false);
  const [editingTextLineId, setEditingTextLineId] = useState(null);

  // Live change tracking for dynamic glowing export CTA
  const textEditsCount = useMemo(() => {
    return Object.values(editedTextMap).filter(line => line.currentText !== line.originalText).length;
  }, [editedTextMap]);
  const totalChangesCount = annotations.length + textEditsCount;
  const hasChanges = totalChangesCount > 0;

  // Text annotation placement popup
  const [textPlacement, setTextPlacement] = useState(null);
  const [tempText, setTempText] = useState('');

  // Zoom & Canvas state
  const { dpi, setDpi, getScaleMultiplier } = useDpiQuality();
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const cropper = useSmartCropper({ canvasRef: pdfCanvasRef, totalPages });

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  // 1-Finger horizontal swipe navigation on touchscreens / trackpads
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    };

    const onTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const elapsed = Date.now() - startTime;

        // Threshold: >50px horizontal swipe, predominantly horizontal (1.5x vertical), fast (<600ms)
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && elapsed < 600) {
          if (!directTextEditorRef.current && !editingTextLineId) {
            if (deltaX < 0) {
              if (navigateToPageRef.current) navigateToPageRef.current(p => p + 1);
            } else {
              if (navigateToPageRef.current) navigateToPageRef.current(p => p - 1);
            }
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [editingTextLineId]);

  // Debounce high-DPI PDF rasterization
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRenderZoom(zoomScale);
    }, 200);
    return () => clearTimeout(handler);
  }, [zoomScale]);

  // Check backend server availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // Sync poller results with single-execution guard to prevent size badge flickering on/off
  const syncedDownloadUrlRef = useRef(null);
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_edited.pdf`;

      if (syncedDownloadUrlRef.current === downloadUrl) {
        return;
      }
      syncedDownloadUrlRef.current = downloadUrl;

      setResult(prev => ({
        downloadUrl,
        name: finalName,
        pageCount: totalPages,
        annotationCount: annotations.length,
        size: prev?.size || null
      }));

      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          setResult(prev => (prev ? { ...prev, blob, size: blob.size } : prev));
          saveFile(finalName, blob.size, 'application/pdf', 'Edit PDF', blob);
          clearStudioDraft('edit-pdf');
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server document editing task failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex, outputFileName, totalPages, annotations.length]);

  // Session draft restore
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('edit-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.activeTool) setActiveTool(draft.activeTool);
          if (draft.strokeColor) setStrokeColor(draft.strokeColor);
          if (draft.textColor) setTextColor(draft.textColor);
          if (draft.thickness) setThickness(draft.thickness);
          if (draft.textFontSize) setTextFontSize(draft.textFontSize);
          if (draft.textFontFamily) setTextFontFamily(draft.textFontFamily);
          if (typeof draft.isWhiteoutEnabled === 'boolean') setIsWhiteoutEnabled(draft.isWhiteoutEnabled);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
          if (draft.annotations && Array.isArray(draft.annotations)) {
            const sanitized = draft.annotations.map(sanitizeAnnotation).filter(Boolean);
            setAnnotations(sanitized);
          }
          if (draft.editedTextMap) setEditedTextMap(draft.editedTextMap);
        }
      } catch (err) {
        console.warn('Edit PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync pageInput with currentPage
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Debounced session draft save
  useEffect(() => {
    if (files.length === 0) return;
    const timer = setTimeout(() => {
      saveStudioDraft('edit-pdf', {
        files,
        activeTool,
        strokeColor,
        textColor,
        thickness,
        textFontSize,
        textFontFamily,
        isWhiteoutEnabled,
        outputFileName,
        annotations,
        editedTextMap
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [files, activeTool, strokeColor, textColor, thickness, textFontSize, textFontFamily, isWhiteoutEnabled, outputFileName, annotations, editedTextMap]);

  // Load PDF Document via PDF.js
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setCurrentPage(1);
      setAnnotations([]);
      setUndoStack([]);
      setRedoStack([]);
      setEditedTextMap({});
      setExtractedTextLines([]);
      setTextPlacement(null);
      setSelectedAnnoId(null);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setCanvasLoading(true);
      setError(null);
      try {
        const file = files[activeFileIndex] || files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCanvasLoading(false);

        if (!outputFileName) {
          const base = file.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_edited.pdf`);
        }
      } catch {
        if (!isCancelled) {
          setCanvasLoading(false);
          setError('Failed to parse PDF document. Verify it is not corrupted or password locked.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, activeFileIndex]);

  // Extract text content for inline editing
  useEffect(() => {
    if (!pdfDocument) {
      setExtractedTextLines([]);
      return;
    }

    let isCancelled = false;

    const extractTextContent = async () => {
      setLoadingText(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        if (isCancelled) return;
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        if (isCancelled) return;

        // Intelligently cluster text items into true visual lines (1 box per line invariant)
        const clustered = clusterTextItemsIntoLines(textContent.items, viewport, currentPage - 1);
        const lines = clustered.map((line) => {
          const savedEdit = editedTextMap[line.id];
          return {
            ...line,
            currentText: savedEdit?.currentText ?? line.originalText,
            fontSize: savedEdit?.fontSize ?? line.fontSize,
            fontFamily: savedEdit?.fontFamily ?? line.fontFamily,
            color: savedEdit?.color ?? line.color
          };
        });

        if (!isCancelled) {
          setExtractedTextLines(lines);
          if (lines.length > 0) {
            const digitalBands = analyzeDigitalLines(lines, { width: viewport.width, height: viewport.height });
            setDetectedLines(digitalBands);
          }
        }
      } catch (err) {
        console.error('Failed to extract PDF page text:', err);
      } finally {
        if (!isCancelled) setLoadingText(false);
      }
    };

    extractTextContent();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, currentPage]);

  // Stable references for instant overlay redrawing without triggering base PDF rasterization
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const selectedAnnoIdRef = useRef(selectedAnnoId);
  selectedAnnoIdRef.current = selectedAnnoId;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const zoomScaleRef = useRef(zoomScale);
  zoomScaleRef.current = zoomScale;
  const pageDimensionsRef = useRef(pageDimensions);
  pageDimensionsRef.current = pageDimensions;
  const totalPagesRef = useRef(totalPages);
  totalPagesRef.current = totalPages;
  const directTextEditorRef = useRef(directTextEditor);
  directTextEditorRef.current = directTextEditor;
  const navigateToPageRef = useRef(null);

  // Redraw overlay annotations and selection boxes (Instant <1ms execution, zero PDF rasterization)
  const redrawOverlayAnnotations = useCallback(() => {
    try {
      const overlay = overlayCanvasRef.current;
      if (!overlay || !overlay.width || !overlay.height) return;
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const activePageIndex = currentPageRef.current - 1;
      const currentAnnos = annotationsRef.current || [];
      const currentSelectedId = selectedAnnoIdRef.current;
      const currentScale = zoomScaleRef.current || 1.0;
      const currentDims = pageDimensionsRef.current || { width: 595, height: 842 };
      const dpiRatio = overlay.width / (currentDims.width || 595);

      const pageAnnos = currentAnnos.filter(a => a && a.pageIndex === activePageIndex);

      pageAnnos.forEach(anno => {
        if (!anno) return;
        if (anno.type === 'pen' || anno.type === 'highlight' || anno.type === 'whiteout') {
          const points = (anno.points || []).filter(
            p => p && typeof p.xPercent === 'number' && typeof p.yPercent === 'number'
          );
          if (points.length < 2) return;

          ctx.save();
          if (anno.type === 'whiteout') {
            // Direct PDF Whiteout Eraser: Paints opaque white over PDF content
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = (anno.thickness || 18) * dpiRatio;

            ctx.beginPath();
            ctx.moveTo(points[0].xPercent * overlay.width, points[0].yPercent * overlay.height);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].xPercent * overlay.width, points[i].yPercent * overlay.height);
            }
            ctx.stroke();
          } else if (anno.type === 'highlight') {
            // True digital highlighter: source-over with 0.45 alpha ensures underlying text remains 100% visible and crisp
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.45;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = anno.color || '#FDE047';
            ctx.lineWidth = (anno.thickness || 20) * dpiRatio;

            ctx.beginPath();
            ctx.moveTo(points[0].xPercent * overlay.width, points[0].yPercent * overlay.height);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].xPercent * overlay.width, points[i].yPercent * overlay.height);
            }
            ctx.stroke();
          } else {
            ctx.globalAlpha = 1.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < points.length - 1; i++) {
              const pt1 = points[i];
              const pt2 = points[i + 1];
              if (!pt1 || !pt2) continue;
              const press1 = pt1.pressure ?? 0.5;
              const press2 = pt2.pressure ?? 0.5;
              const avgPressure = (press1 + press2) / 2;

              ctx.beginPath();
              ctx.strokeStyle = anno.color || '#EF4444';
              ctx.lineWidth = (anno.thickness || 3) * (0.3 + avgPressure * 1.4) * dpiRatio;
              ctx.moveTo(pt1.xPercent * overlay.width, pt1.yPercent * overlay.height);
              ctx.lineTo(pt2.xPercent * overlay.width, pt2.yPercent * overlay.height);
              ctx.stroke();
            }
          }
          ctx.restore();
        } else if (anno.type === 'shape') {
          if (!anno.startPt || !anno.endPt ||
              typeof anno.startPt.xPercent !== 'number' || typeof anno.startPt.yPercent !== 'number' ||
              typeof anno.endPt.xPercent !== 'number' || typeof anno.endPt.yPercent !== 'number') {
            return;
          }

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = anno.color || '#EF4444';
          ctx.lineWidth = (anno.thickness || 3) * dpiRatio;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 1.0;

          const startX = anno.startPt.xPercent * overlay.width;
          const startY = anno.startPt.yPercent * overlay.height;
          const endX = anno.endPt.xPercent * overlay.width;
          const endY = anno.endPt.yPercent * overlay.height;

          const minX = Math.min(startX, endX);
          const minY = Math.min(startY, endY);
          const w = Math.max(1, Math.abs(endX - startX));
          const h = Math.max(1, Math.abs(endY - startY));

          if (anno.shapeType === 'rectangle') {
            ctx.strokeRect(minX, minY, w, h);
          } else if (anno.shapeType === 'circle') {
            const rx = w / 2;
            const ry = h / 2;
            const cx = minX + rx;
            const cy = minY + ry;
            ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (anno.shapeType === 'line') {
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          } else if (anno.shapeType === 'arrow') {
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            
            const angle = Math.atan2(endY - startY, endX - startX);
            const headLength = Math.max(10 * dpiRatio, (anno.thickness || 3) * 3 * dpiRatio);
            
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
          ctx.restore();
        } else if (anno.type === 'text') {
          if (typeof anno.xPercent !== 'number' || typeof anno.yPercent !== 'number') return;
          const fontSize = Math.max(8 * dpiRatio, (anno.size || 14) * dpiRatio);
          const fontName = anno.fontFamily === 'TimesRoman'
            ? 'Times New Roman, serif'
            : anno.fontFamily === 'Courier'
            ? 'Courier New, monospace'
            : 'sans-serif';

          ctx.save();
          ctx.font = `bold ${fontSize}px ${fontName}`;
          const textMetrics = ctx.measureText(anno.text || '');
          const textWidth = textMetrics.width;
          const textHeight = fontSize * 1.25;

          const startX = anno.xPercent * overlay.width;
          const startY = anno.yPercent * overlay.height;

          // Render opaque whiteout backdrop if enabled
          if (anno.whiteout) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(startX - 2 * dpiRatio, startY - fontSize * 0.9, textWidth + 4 * dpiRatio, textHeight);
          }

          ctx.fillStyle = anno.color || '#000000';
          ctx.globalAlpha = 1.0;
          ctx.fillText(anno.text || '', startX, startY);
          ctx.restore();
        }
      });

      // Draw selection handles for the currently selected annotation
      if (currentSelectedId) {
        const selected = pageAnnos.find(a => a.id === currentSelectedId);
        if (selected) {
          const bounds = getAnnotationBounds(selected, currentDims);
          if (bounds) {
            const bx = bounds.minX * overlay.width;
            const by = bounds.minY * overlay.height;
            const bw = (bounds.maxX - bounds.minX) * overlay.width;
            const bh = (bounds.maxY - bounds.minY) * overlay.height;
            const pad = 6 * dpiRatio;

            ctx.save();
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 1.5 * dpiRatio;
            ctx.setLineDash([4 * dpiRatio, 4 * dpiRatio]);

            // Corner anchor handles size
            const hSize = 8 * dpiRatio;

            if (selected.type === 'shape' && (selected.shapeType === 'line' || selected.shapeType === 'arrow')) {
              const sx = (selected.startPt?.xPercent ?? 0) * overlay.width;
              const sy = (selected.startPt?.yPercent ?? 0) * overlay.height;
              const ex = (selected.endPt?.xPercent ?? 0) * overlay.width;
              const ey = (selected.endPt?.yPercent ?? 0) * overlay.height;

              // Draw subtle dashed path along the line itself
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(ex, ey);
              ctx.stroke();

              // Endpoint handles
              ctx.setLineDash([]);
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#2563EB';
              ctx.lineWidth = 2 * dpiRatio;
              [[sx, sy], [ex, ey]].forEach(([hx, hy]) => {
                ctx.beginPath();
                ctx.arc(hx, hy, hSize * 0.85, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
              });
            } else {
              ctx.strokeRect(bx - pad, by - pad, Math.max(bw + pad * 2, 16 * dpiRatio), Math.max(bh + pad * 2, 16 * dpiRatio));
              ctx.setLineDash([]);
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#2563EB';
              ctx.lineWidth = 2 * dpiRatio;
              const corners = [
                [bx - pad, by - pad],
                [bx + bw + pad, by - pad],
                [bx - pad, by + bh + pad],
                [bx + bw + pad, by + bh + pad]
              ];
              corners.forEach(([hx, hy]) => {
                ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
                ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
              });
            }
            ctx.restore();
          }
        }
      }
    } catch (err) {
      console.warn('Overlay redraw caught non-fatal issue:', err);
    }
  }, []);

  // Render Base PDF Page preview to canvas (Only re-renders when document, page, zoom, or crop parameters change)
  useEffect(() => {
    if (!pdfDocument) return;

    let renderTask = null;
    let cancelled = false;

    const renderPage = async () => {
      setCanvasLoading(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        if (cancelled) return;

        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions(prev => {
          if (prev.width === baseViewport.width && prev.height === baseViewport.height) return prev;
          return { width: baseViewport.width, height: baseViewport.height };
        });

        const scaleMultiplier = getScaleMultiplier(debouncedRenderZoom);
        const viewport = page.getViewport({ scale: scaleMultiplier });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (cancelled) return;

        // Smart Cropper detection & refit
        const detection = cropper.runDetection(currentPage, baseViewport);
        if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
          cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
        }

        redrawOverlayAnnotations();

        // Perform smart line analysis for scanned documents if no digital text streams exist
        setTimeout(() => {
          if (cancelled) return;
          const c = pdfCanvasRef.current;
          if (c && c.width && c.height) {
            setDetectedLines(prev => {
              if (prev.length > 0 && prev[0].type === 'digital') return prev;
              const rasterBands = analyzeRasterCanvas(c, baseViewport);
              return rasterBands.length > 0 ? rasterBands : prev;
            });
          }
        }, 60);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      } finally {
        if (!cancelled) setCanvasLoading(false);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try { renderTask.cancel(); } catch {}
      }
    };
  }, [pdfDocument, currentPage, debouncedRenderZoom, dpi, cropper.isActive, cropper.cleanMargin, cropper.enabledEdges, getScaleMultiplier, redrawOverlayAnnotations]);

  // Synchronize overlay whenever annotations, zoom, or selection change
  useEffect(() => {
    redrawOverlayAnnotations();
  }, [annotations, selectedAnnoId, zoomScale, currentPage, pageDimensions, redrawOverlayAnnotations]);

  const pushUndoSnapshot = () => {
    setUndoStack(prev => [
      ...prev,
      {
        annotations: JSON.parse(JSON.stringify(annotations)),
        editedTextMap: { ...editedTextMap }
      }
    ].slice(-40));
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [
      ...prev,
      {
        annotations: JSON.parse(JSON.stringify(annotations)),
        editedTextMap: { ...editedTextMap }
      }
    ]);
    setAnnotations(previous.annotations);
    setEditedTextMap(previous.editedTextMap);
    setExtractedTextLines(prev =>
      prev.map(l => ({
        ...l,
        currentText: previous.editedTextMap[l.id]?.currentText ?? l.originalText
      }))
    );
    setSelectedAnnoId(null);
    setEditingTextLineId(null);
    setDirectTextEditor(null);
    setTextPlacement(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [
      ...prev,
      {
        annotations: JSON.parse(JSON.stringify(annotations)),
        editedTextMap: { ...editedTextMap }
      }
    ]);
    setAnnotations(next.annotations);
    setEditedTextMap(next.editedTextMap);
    setExtractedTextLines(prev =>
      prev.map(l => ({
        ...l,
        currentText: next.editedTextMap[l.id]?.currentText ?? l.originalText
      }))
    );
    setSelectedAnnoId(null);
    setEditingTextLineId(null);
    setDirectTextEditor(null);
    setTextPlacement(null);
  };

  // Keyboard navigation & tool shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)) {
        if (e.key === 'Escape') {
          e.target.blur();
          setEditingTextLineId(null);
          setTextPlacement(null);
        }
        if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowRight')) {
          e.preventDefault();
          e.target.blur();
          if (navigateToPageRef.current) navigateToPageRef.current(p => p + 1);
          else navigateToPage(p => p + 1);
          return;
        }
        if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowLeft')) {
          e.preventDefault();
          e.target.blur();
          if (navigateToPageRef.current) navigateToPageRef.current(p => p - 1);
          else navigateToPage(p => p - 1);
          return;
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnoId) {
          e.preventDefault();
          pushUndoSnapshot();
          setAnnotations(prev => prev.filter(a => a.id !== selectedAnnoId));
          setSelectedAnnoId(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedAnnoId(null);
        setTextPlacement(null);
        setEditingTextLineId(null);
        setDirectTextEditor(null);
        return;
      }

      if (e.key === 'PageDown' || e.key === ']' || e.key === 'ArrowRight' || (e.altKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        if (navigateToPageRef.current) navigateToPageRef.current(p => p + 1);
        else navigateToPage(p => p + 1);
        return;
      }
      if (e.key === 'PageUp' || e.key === '[' || e.key === 'ArrowLeft' || (e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        if (navigateToPageRef.current) navigateToPageRef.current(p => p - 1);
        else navigateToPage(p => p - 1);
        return;
      }

      const key = e.key.toLowerCase();
      const toolMap = {
        v: 'select',
        i: 'text-edit',
        p: 'pen',
        h: 'highlight',
        r: 'rectangle',
        c: 'circle',
        l: 'line',
        a: 'arrow',
        t: 'text',
        e: 'eraser'
      };
      if (toolMap[key]) {
        switchTool(toolMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, annotations, editedTextMap, selectedAnnoId, totalPages, currentPage]);

  // Clean Tool Switcher: resets lingering drag/draw states
  const switchTool = (toolId) => {
    if (directTextEditor && directTextEditor.text.trim()) {
      commitDirectTextEditor();
    }
    setActiveTool(toolId);
    setDirectTextEditor(null);
    setTextPlacement(null);
    setIsDrawing(false);
    setIsDraggingSelected(false);
    setActiveResizeHandle(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
    dragStartPointRef.current = null;
    dragInitialAnnoRef.current = null;
    dragInitialBoundsRef.current = null;
    dragInitialFontSizeRef.current = 14;
    if (toolId !== 'select') {
      setSelectedAnnoId(null);
    }
    if (overlayCanvasRef.current) {
      if (toolId === 'select') overlayCanvasRef.current.style.cursor = 'default';
      else if (toolId === 'text' || toolId === 'text-edit') overlayCanvasRef.current.style.cursor = 'text';
      else overlayCanvasRef.current.style.cursor = 'crosshair';
    }
    if (toolId === 'highlight') {
      if (strokeColor === '#EF4444' || strokeColor === '#1E293B' || strokeColor === '#000000') {
        setStrokeColor('#FDE047');
      }
      if (thickness < 12) {
        setThickness(20);
      }
    } else if (toolId === 'pen') {
      if (strokeColor === '#FDE047') {
        setStrokeColor('#EF4444');
      }
      if (thickness > 10) {
        setThickness(3);
      }
    }
  };

  const handleUpdateTextLine = (line, newText, newFontSize, newFontFamily, newColor) => {
    setExtractedTextLines(prev =>
      prev.map(l => (l.id === line.id ? {
        ...l,
        currentText: newText,
        fontSize: newFontSize || l.fontSize,
        fontFamily: newFontFamily || l.fontFamily,
        color: newColor || l.color || textColor || '#000000'
      } : l))
    );

    setEditedTextMap(prev => {
      const next = { ...prev };
      if (newText === line.originalText) {
        delete next[line.id];
      } else {
        next[line.id] = {
          ...line,
          pageIndex: currentPage - 1,
          currentText: newText,
          fontSize: newFontSize || line.fontSize,
          fontFamily: newFontFamily || line.fontFamily,
          color: newColor || line.color || textColor || '#000000'
        };
      }
      return next;
    });
  };

  const getCanvasCoords = (e) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return { xPercent: 0, yPercent: 0, pressure: 0.5 };
    const rect = overlay.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
    const pressure = e.pointerType === 'pen' ? (e.pressure ?? 0.5) : 0.5;

    return {
      xPercent: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      yPercent: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      pressure
    };
  };

  const handlePointerDown = (e) => {
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}

    if (directTextEditor && directTextEditor.text.trim()) {
      commitDirectTextEditor();
    }

    const pt = getCanvasCoords(e);
    const activePageIndex = currentPage - 1;
    const pageAnnos = (annotations || []).filter(a => a && a.pageIndex === activePageIndex);

    if (activeTool === 'select') {
      // 1. First, check if clicked on any resize handle of the currently selected annotation
      if (selectedAnnoId) {
        const selected = pageAnnos.find(a => a.id === selectedAnnoId);
        if (selected) {
          const handles = getAnnotationResizeHandles(selected, pageDimensions);
          const hitHandle = handles.find(h => isHandleHit(h, pt, 0.035));
          if (hitHandle) {
            setActiveResizeHandle(hitHandle.id);
            setIsDraggingSelected(true);
            dragDidMutateRef.current = false;
            dragStartPointRef.current = pt;
            dragInitialAnnoRef.current = JSON.parse(JSON.stringify(selected));
            dragInitialBoundsRef.current = getAnnotationBounds(selected, pageDimensions);
            dragInitialFontSizeRef.current = selected.size || textFontSize || 14;
            return;
          }
        }
      }

      // 2. Otherwise find top-most annotation hit for moving
      const hit = pageAnnos.slice().reverse().find(a => isAnnotationHit(a, pt, 0.03, pageDimensions));
      if (hit) {
        setSelectedAnnoId(hit.id);
        setActiveResizeHandle(null);
        setIsDraggingSelected(true);
        dragDidMutateRef.current = false;
        dragStartPointRef.current = pt;
        dragInitialAnnoRef.current = JSON.parse(JSON.stringify(hit));
        dragInitialBoundsRef.current = getAnnotationBounds(hit, pageDimensions);
        dragInitialFontSizeRef.current = hit.size || textFontSize || 14;

        // Sync sidebar controls with selected annotation
        if (hit.color) setStrokeColor(hit.color);
        if (hit.thickness) setThickness(hit.thickness);
        if (hit.size) setTextFontSize(hit.size);
        if (hit.fontFamily) setTextFontFamily(hit.fontFamily);
        if (typeof hit.whiteout === 'boolean') setIsWhiteoutEnabled(hit.whiteout);
      } else {
        setSelectedAnnoId(null);
        setActiveResizeHandle(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      eraserGestureHadDeletionRef.current = false;
      if (eraserMode === 'additions') {
        // Continuous Drag Eraser for Additions:
        // Sweep over drawings/text/shapes/whiteouts to cleanly delete only user additions
        const eraserRadius = Math.max(0.035, (eraserThickness || 18) / (pageDimensions.width || 595));
        const hit = pageAnnos.slice().reverse().find(a => isAnnotationHit(a, pt, eraserRadius, pageDimensions));
        if (hit) {
          pushUndoSnapshot();
          eraserGestureHadDeletionRef.current = true;
          setAnnotations(prev => prev.filter(a => a.id !== hit.id));
          if (selectedAnnoId === hit.id) setSelectedAnnoId(null);
        }
        setIsDrawing(true);
        return;
      }

      // Erase PDF Directly (Whiteout mode):
      const hit = pageAnnos.slice().reverse().find(a => isAnnotationHit(a, pt, 0.035, pageDimensions));
      if (hit) {
        pushUndoSnapshot();
        setAnnotations(prev => prev.filter(a => a.id !== hit.id));
        if (selectedAnnoId === hit.id) setSelectedAnnoId(null);
        return;
      }
      // Direct PDF Eraser: Start whiteout brush stroke across canvas
      setIsDrawing(true);
      currentPathPointsRef.current = [pt];
      setCurrentPathPoints([pt]);
      return;
    }

    // Direct Text Editing & Insertion (Universal: Works on both scanned & digital PDFs)
    if (activeTool === 'text-edit' || activeTool === 'text') {
      // 1. If clicking directly on an existing custom text annotation, re-edit inline immediately
      const hitTextAnno = pageAnnos.slice().reverse().find(a => a.type === 'text' && isAnnotationHit(a, pt, 0.03, pageDimensions));
      if (hitTextAnno) {
        setDirectTextEditor({
          id: hitTextAnno.id,
          xPercent: hitTextAnno.xPercent,
          yPercent: hitTextAnno.yPercent,
          text: hitTextAnno.text,
          fontSize: hitTextAnno.size || textFontSize,
          fontFamily: hitTextAnno.fontFamily || textFontFamily,
          color: hitTextAnno.color || textColor || '#000000',
          whiteout: typeof hitTextAnno.whiteout === 'boolean' ? hitTextAnno.whiteout : isWhiteoutEnabled,
          isNew: false
        });
        setSelectedAnnoId(null);
        return;
      }

      // 2. Drop direct text insertion cursor at exact click location
      setDirectTextEditor({
        id: `direct-text-${Math.random().toString(36).substr(2, 7)}`,
        xPercent: pt.xPercent,
        yPercent: pt.yPercent,
        text: '',
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        color: textColor || '#000000',
        whiteout: isWhiteoutEnabled,
        isNew: true
      });
      return;
    }

    // Drawing tools (pen, highlight, shapes)
    setIsDrawing(true);
    if (activeTool === 'highlight') {
      let startPoint = pt;
      if (smartHighlight && detectedLines.length > 0) {
        const match = findBestMatchingLine(pt, detectedLines);
        if (match) {
          activeSmartLineRef.current = match;
          startPoint = { ...pt, yPercent: match.centerPercent };
        } else {
          activeSmartLineRef.current = null;
        }
      } else {
        activeSmartLineRef.current = null;
      }
      currentPathPointsRef.current = [startPoint];
      setCurrentPathPoints([startPoint]);
    } else if (activeTool === 'pen') {
      currentPathPointsRef.current = [pt];
      setCurrentPathPoints([pt]);
    } else {
      dragStartRef.current = pt;
      dragEndRef.current = pt;
    }
  };

  const handleDoubleClick = (e) => {
    const pt = getCanvasCoords(e);
    const activePageIndex = currentPage - 1;
    const pageAnnos = (annotations || []).filter(a => a && a.pageIndex === activePageIndex);

    // If double clicking an existing text annotation, re-edit inline immediately
    const hitTextAnno = pageAnnos.slice().reverse().find(a => a.type === 'text' && isAnnotationHit(a, pt, 0.03, pageDimensions));
    if (hitTextAnno) {
      setDirectTextEditor({
        id: hitTextAnno.id,
        xPercent: hitTextAnno.xPercent,
        yPercent: hitTextAnno.yPercent,
        text: hitTextAnno.text,
        fontSize: hitTextAnno.size || textFontSize,
        fontFamily: hitTextAnno.fontFamily || textFontFamily,
        color: hitTextAnno.color || textColor || '#000000',
        whiteout: Boolean(hitTextAnno.whiteout),
        isNew: false
      });
      setSelectedAnnoId(null);
      return;
    }

    // If double clicking anywhere else on the document, open direct text editor at that point
    setDirectTextEditor({
      id: `text-${Math.random().toString(36).substr(2, 7)}`,
      xPercent: pt.xPercent,
      yPercent: pt.yPercent,
      text: '',
      fontSize: textFontSize,
      fontFamily: textFontFamily,
      color: textColor || '#000000',
      whiteout: isWhiteoutEnabled,
      isNew: true
    });
  };

  const handlePointerMove = (e) => {
    try {
      const pt = getCanvasCoords(e);

      if (activeTool === 'select') {
        if (isDraggingSelected && selectedAnnoId && dragStartPointRef.current && dragInitialAnnoRef.current) {
          if (activeResizeHandle) {
            // Push undo snapshot ONCE on first actual resize mutation
            if (!dragDidMutateRef.current) {
              pushUndoSnapshot();
              dragDidMutateRef.current = true;
            }
            // Resizing via handle (scaling text bigger/smaller, or expanding/shrinking shape)
            const resized = resizeAnnotation(
              dragInitialAnnoRef.current,
              activeResizeHandle,
              pt,
              dragInitialBoundsRef.current,
              dragInitialFontSizeRef.current,
              pageDimensions
            );
            if (resized.size && resized.size !== textFontSize) {
              setTextFontSize(resized.size);
            }
            setAnnotations(prev => prev.map(a => a.id === selectedAnnoId ? resized : a));
            return;
          } else {
            if (typeof dragStartPointRef.current.xPercent !== 'number' || typeof dragStartPointRef.current.yPercent !== 'number') return;
            const deltaX = pt.xPercent - dragStartPointRef.current.xPercent;
            const deltaY = pt.yPercent - dragStartPointRef.current.yPercent;

            if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
              if (!dragDidMutateRef.current) {
                pushUndoSnapshot();
                dragDidMutateRef.current = true;
              }
            }

            const updated = translateAnnotation(dragInitialAnnoRef.current, deltaX, deltaY);

            setAnnotations(prev => prev.map(a => a.id === selectedAnnoId ? updated : a));
            return;
          }
        }

        // Hover cursor feedback when not dragging
        const overlay = overlayCanvasRef.current;
        if (overlay && selectedAnnoId) {
          const activePageIndex = currentPage - 1;
          const selected = annotations.find(a => a.id === selectedAnnoId && a.pageIndex === activePageIndex);
          if (selected) {
            const handles = getAnnotationResizeHandles(selected, pageDimensions);
            const hoveredHandle = handles.find(h => isHandleHit(h, pt, 0.035));
            if (hoveredHandle) {
              overlay.style.cursor = hoveredHandle.cursor;
              return;
            } else if (isAnnotationHit(selected, pt, 0.03, pageDimensions)) {
              overlay.style.cursor = 'move';
              return;
            } else {
              overlay.style.cursor = 'default';
            }
          }
        }
        return;
      }

      if (!isDrawing) return;
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      const dpiRatio = overlay.width / (pageDimensions.width || 595);

      if (activeTool === 'eraser') {
        if (eraserMode === 'additions') {
          // Continuous sweep-to-erase additions as user drags over them
          const activePageIndex = currentPage - 1;
          const pageAnnos = (annotations || []).filter(a => a && a.pageIndex === activePageIndex);
          const eraserRadius = Math.max(0.035, (eraserThickness || 18) / (pageDimensions.width || 595));
          const hit = pageAnnos.slice().reverse().find(a => isAnnotationHit(a, pt, eraserRadius, pageDimensions));
          if (hit) {
            if (!eraserGestureHadDeletionRef.current) {
              pushUndoSnapshot();
              eraserGestureHadDeletionRef.current = true;
            }
            setAnnotations(prev => prev.filter(a => a.id !== hit.id));
            if (selectedAnnoId === hit.id) setSelectedAnnoId(null);
          }
          return;
        }

        currentPathPointsRef.current.push(pt);
        setCurrentPathPoints(prev => [...prev, pt]);

        ctx.save();
        ctx.beginPath();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = (eraserThickness || 18) * dpiRatio;

        const lastPt = currentPathPoints[currentPathPoints.length - 1] || pt;
        if (lastPt && typeof lastPt.xPercent === 'number' && typeof lastPt.yPercent === 'number') {
          ctx.moveTo(lastPt.xPercent * overlay.width, lastPt.yPercent * overlay.height);
          ctx.lineTo(pt.xPercent * overlay.width, pt.yPercent * overlay.height);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      if (activeTool === 'pen' || activeTool === 'highlight') {
        let currentPt = pt;
        if (activeTool === 'highlight' && activeSmartLineRef.current) {
          const line = activeSmartLineRef.current;
          if (Math.abs(pt.yPercent - line.centerPercent) < 0.04) {
            currentPt = { ...pt, yPercent: line.centerPercent };
          } else {
            activeSmartLineRef.current = null;
          }
        }

        currentPathPointsRef.current.push(currentPt);
        setCurrentPathPoints(prev => [...prev, currentPt]);

        ctx.save();
        ctx.beginPath();
        if (activeTool === 'highlight') {
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.55;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = strokeColor || '#FDE047';
          const effThickness = activeSmartLineRef.current?.recommendedThickness || thickness || 20;
          ctx.lineWidth = effThickness * dpiRatio;
        } else {
          ctx.globalAlpha = 1.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = strokeColor || '#EF4444';
        }

        const lastPt = currentPathPoints[currentPathPoints.length - 1] || currentPt;
        if (lastPt && typeof lastPt.xPercent === 'number' && typeof lastPt.yPercent === 'number') {
          const avgPressure = ((lastPt.pressure ?? 0.5) + (currentPt.pressure ?? 0.5)) / 2;
          if (activeTool !== 'highlight') {
            ctx.lineWidth = (thickness || 3) * (0.3 + avgPressure * 1.4) * dpiRatio;
          }
          ctx.moveTo(lastPt.xPercent * overlay.width, lastPt.yPercent * overlay.height);
          ctx.lineTo(currentPt.xPercent * overlay.width, currentPt.yPercent * overlay.height);
          ctx.stroke();
        }
        ctx.restore();
      } else if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
        if (!dragStartRef.current) return;
        dragEndRef.current = pt;
        redrawOverlayAnnotations();

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = strokeColor || '#EF4444';
        ctx.lineWidth = (thickness || 3) * dpiRatio;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1.0;

        const startX = dragStartRef.current.xPercent * overlay.width;
        const startY = dragStartRef.current.yPercent * overlay.height;
        const endX = pt.xPercent * overlay.width;
        const endY = pt.yPercent * overlay.height;

        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const w = Math.max(1, Math.abs(endX - startX));
        const h = Math.max(1, Math.abs(endY - startY));

        if (activeTool === 'rectangle') {
          ctx.strokeRect(minX, minY, w, h);
        } else if (activeTool === 'circle') {
          const rx = w / 2;
          const ry = h / 2;
          const cx = minX + rx;
          const cy = minY + ry;
          ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (activeTool === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else if (activeTool === 'arrow') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLength = Math.max(10 * dpiRatio, (thickness || 3) * 3 * dpiRatio);
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
        ctx.restore();
      }
    } catch (err) {
      console.warn('Pointer move non-fatal error:', err);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingSelected) {
      setIsDraggingSelected(false);
      setActiveResizeHandle(null);
      dragDidMutateRef.current = false;
      dragStartPointRef.current = null;
      dragInitialAnnoRef.current = null;
      dragInitialBoundsRef.current = null;
      dragInitialFontSizeRef.current = 14;
      return;
    }

    if (activeTool === 'eraser') {
      eraserGestureHadDeletionRef.current = false;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const activePageIndex = currentPage - 1;

    if (activeTool === 'eraser') {
      if (eraserMode === 'additions') {
        currentPathPointsRef.current = [];
        setCurrentPathPoints([]);
        return;
      }

      const pts = (currentPathPointsRef.current && currentPathPointsRef.current.length > 1)
        ? [...currentPathPointsRef.current]
        : [...currentPathPoints];

      if (pts.length > 1) {
        pushUndoSnapshot();
        const newStroke = {
          id: `whiteout-${Math.random().toString(36).substr(2, 7)}`,
          type: 'whiteout',
          pageIndex: activePageIndex,
          points: pts,
          color: '#FFFFFF',
          thickness: eraserThickness || 18,
          opacity: 1.0
        };
        setAnnotations(prev => [...prev, newStroke]);
      }
      currentPathPointsRef.current = [];
      setCurrentPathPoints([]);
      return;
    } else if (activeTool === 'pen' || activeTool === 'highlight') {
      const pts = (currentPathPointsRef.current && currentPathPointsRef.current.length > 1)
        ? [...currentPathPointsRef.current]
        : [...currentPathPoints];

      if (pts.length > 1) {
        pushUndoSnapshot();
        const effThickness = activeTool === 'highlight'
          ? (activeSmartLineRef.current?.recommendedThickness || thickness || 20)
          : thickness;
        activeSmartLineRef.current = null;

        const newStroke = {
          id: `${activeTool}-${Math.random().toString(36).substr(2, 7)}`,
          type: activeTool,
          pageIndex: activePageIndex,
          points: pts,
          color: activeTool === 'highlight' ? (strokeColor || '#FDE047') : strokeColor,
          thickness: effThickness,
          opacity: activeTool === 'highlight' ? 0.4 : 1.0
        };
        setAnnotations(prev => [...prev, newStroke]);
      } else {
        activeSmartLineRef.current = null;
      }
      currentPathPointsRef.current = [];
      setCurrentPathPoints([]);
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      const sPt = dragStartRef.current ? { ...dragStartRef.current } : null;
      let ePt = dragEndRef.current ? { ...dragEndRef.current } : null;

      if (sPt) {
        if (!ePt || (Math.abs(ePt.xPercent - sPt.xPercent) < 0.005 && Math.abs(ePt.yPercent - sPt.yPercent) < 0.005)) {
          // If clicked without dragging, provide a sensible default size (e.g. 15% width, 10% height)
          ePt = {
            xPercent: Math.min(1.0, sPt.xPercent + (activeTool === 'line' || activeTool === 'arrow' ? 0.15 : 0.12)),
            yPercent: Math.min(1.0, sPt.yPercent + (activeTool === 'line' || activeTool === 'arrow' ? 0.0 : 0.08)),
            pressure: 0.5
          };
        }
        pushUndoSnapshot();
        const newShape = {
          id: `shape-${Math.random().toString(36).substr(2, 7)}`,
          type: 'shape',
          shapeType: activeTool,
          pageIndex: activePageIndex,
          startPt: sPt,
          endPt: ePt,
          color: strokeColor,
          thickness: thickness
        };
        setAnnotations(prev => [...prev, newShape]);
      }
      dragStartRef.current = null;
      dragEndRef.current = null;
    }
  };

  // Global window pointer release listener prevents stuck drawing states
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isDrawing || isDraggingSelected) {
        handlePointerUp();
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [isDrawing, isDraggingSelected]);

  // Commit direct inline text edits (both extracted lines & arbitrary direct text)
  const commitDirectTextEditor = () => {
    if (!directTextEditor) return;
    const textVal = directTextEditor.text.trim();

    if (directTextEditor.lineId) {
      // It was an extracted text line
      const line = extractedTextLines.find(l => l.id === directTextEditor.lineId);
      if (line) {
        pushUndoSnapshot();
        handleUpdateTextLine(
          line,
          directTextEditor.text,
          directTextEditor.fontSize,
          directTextEditor.fontFamily,
          directTextEditor.color
        );
      }
    } else if (textVal) {
      // It's a direct text annotation
      pushUndoSnapshot();
      const activePageIndex = currentPage - 1;
      const existingIdx = annotations.findIndex(a => a.id === directTextEditor.id);

      const annoObj = {
        id: directTextEditor.id,
        type: 'text',
        pageIndex: activePageIndex,
        xPercent: directTextEditor.xPercent,
        yPercent: directTextEditor.yPercent,
        text: directTextEditor.text,
        size: directTextEditor.fontSize || textFontSize,
        fontFamily: directTextEditor.fontFamily || textFontFamily,
        color: directTextEditor.color || textColor || '#000000',
        whiteout: directTextEditor.whiteout
      };

      if (existingIdx >= 0) {
        setAnnotations(prev => prev.map((a, i) => (i === existingIdx ? annoObj : a)));
      } else {
        setAnnotations(prev => [...prev, annoObj]);
      }
      setSelectedAnnoId(directTextEditor.id);
    } else if (!directTextEditor.isNew) {
      // If user cleared text completely, remove annotation
      pushUndoSnapshot();
      setAnnotations(prev => prev.filter(a => a.id !== directTextEditor.id));
      if (selectedAnnoId === directTextEditor.id) setSelectedAnnoId(null);
    }

    setDirectTextEditor(null);
  };

  const navigateToPage = (newPage) => {
    if (directTextEditorRef.current && directTextEditorRef.current.text?.trim()) {
      commitDirectTextEditor();
    }
    setCurrentPage(prevPage => {
      const target = typeof newPage === 'function' ? newPage(prevPage) : newPage;
      const clamped = Math.max(1, Math.min(totalPagesRef.current || totalPages || 1, target));
      setPageInput(String(clamped));
      return clamped;
    });
    setSelectedAnnoId(null);
    setDirectTextEditor(null);
    setEditingTextLineId(null);
    setTextPlacement(null);
  };
  navigateToPageRef.current = navigateToPage;

  const clearPageAnnotations = () => {
    pushUndoSnapshot();
    const activePageIndex = currentPage - 1;
    setAnnotations(prev => prev.filter(a => a.pageIndex !== activePageIndex));
    setExtractedTextLines(prev => prev.map(l => ({ ...l, currentText: l.originalText })));
    setEditedTextMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id]?.pageIndex === activePageIndex) {
          delete next[id];
        }
      });
      return next;
    });
    setSelectedAnnoId(null);
    setDirectTextEditor(null);
    setTextPlacement(null);
  };

  // Modify color, thickness, font size, or font family of selected annotation or active direct text editor in real time
  const handleUpdateSelectedStyle = (newColor, newThickness, newSize, newFontFamily, newWhiteout) => {
    if (directTextEditor) {
      setDirectTextEditor(prev => prev ? {
        ...prev,
        color: newColor !== null && newColor !== undefined ? newColor : prev.color,
        fontSize: newSize !== null && newSize !== undefined ? newSize : prev.fontSize,
        fontFamily: newFontFamily !== null && newFontFamily !== undefined ? newFontFamily : prev.fontFamily,
        whiteout: newWhiteout !== undefined ? newWhiteout : prev.whiteout
      } : null);
    }
    if (editingTextLineId) {
      setExtractedTextLines(prev =>
        prev.map(l => (l.id === editingTextLineId ? {
          ...l,
          color: newColor !== null && newColor !== undefined ? newColor : l.color,
          fontSize: newSize !== null && newSize !== undefined ? newSize : l.fontSize,
          fontFamily: newFontFamily !== null && newFontFamily !== undefined ? newFontFamily : l.fontFamily
        } : l))
      );
      setEditedTextMap(prev => {
        if (!prev[editingTextLineId]) return prev;
        return {
          ...prev,
          [editingTextLineId]: {
            ...prev[editingTextLineId],
            color: newColor !== null && newColor !== undefined ? newColor : prev[editingTextLineId].color,
            fontSize: newSize !== null && newSize !== undefined ? newSize : prev[editingTextLineId].fontSize,
            fontFamily: newFontFamily !== null && newFontFamily !== undefined ? newFontFamily : prev[editingTextLineId].fontFamily
          }
        };
      });
    }
    if (!selectedAnnoId) return;
    pushUndoSnapshot();
    setAnnotations(prev =>
      prev.map(a => {
        if (a.id === selectedAnnoId) {
          return {
            ...a,
            color: newColor !== null && newColor !== undefined ? newColor : a.color,
            thickness: newThickness !== null && newThickness !== undefined ? newThickness : a.thickness,
            size: newSize !== null && newSize !== undefined ? newSize : a.size,
            fontFamily: newFontFamily !== null && newFontFamily !== undefined ? newFontFamily : a.fontFamily,
            whiteout: newWhiteout !== undefined ? newWhiteout : a.whiteout
          };
        }
        return a;
      })
    );
  };

  const runLocalEdit = async (file, allAnnotations, finalName) => {
    try {
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(file, pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());
      const outputBlob = await editPdf(file, allAnnotations, (p) => setProgress(p), cropperOptions);
      
      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        pageCount: totalPages,
        annotationCount: allAnnotations.length
      });

      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Edit PDF', outputBlob);
      await clearStudioDraft('edit-pdf');
    } catch (err) {
      setError(err.message || 'Annotation injection failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!files.length) return;

    if (directTextEditor && directTextEditor.text.trim()) {
      commitDirectTextEditor();
    }

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_edited.pdf`;

    if (!hasChanges && (!directTextEditor || !directTextEditor.text.trim())) {
      // If nothing has been changed, do not trigger error or queue empty job.
      // Cleanly export the document directly with zero failure.
      setResult({
        blob: file,
        name: finalName,
        size: file.size,
        pageCount: totalPages,
        annotationCount: 0
      });
      return;
    }

    setProcessing(true);
    setProgress(15);
    setError(null);
    setResult(null);
    syncedDownloadUrlRef.current = null;

    const textEditAnnos = Object.values(editedTextMap)
      .filter(line => line.currentText !== line.originalText)
      .map(line => {
        const charCount = (line.currentText ?? '').length;
        const estWidthPercent = Math.max(
          line.widthPercent,
          ((charCount + 1) * (line.fontSize || 12) * 0.58 / (pageDimensions.width || 595))
        );
        const estHeightPercent = Math.max(
          line.heightPercent || 0.02,
          ((line.fontSize || 12) * 1.35 / (pageDimensions.height || 842))
        );
        return {
          id: line.id,
          type: 'text-edit',
          pageIndex: line.pageIndex,
          originalText: line.originalText,
          newText: line.currentText,
          xPercent: line.xPercent,
          yPercent: line.yPercent,
          widthPercent: Math.min(1.0 - line.xPercent, estWidthPercent),
          heightPercent: estHeightPercent,
          fontSize: line.fontSize || textFontSize,
          fontFamily: line.fontFamily || textFontFamily,
          color: line.color || textColor || '#000000'
        };
      });

    // Text edits (whiteout + new text) MUST come BEFORE user annotations (highlighter, drawings)
    // so annotations are drawn on top of the text corrections, preserving user highlights!
    const allAnnotations = [...textEditAnnos, ...annotations];

    if (backendActive) {
      try {
        setProgress(25);
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        setProgress(50);
        const formData = new FormData();
        formData.append('file_id', uploadData.file_id);
        formData.append('filename', uploadData.filename);
        formData.append('annotations_json', JSON.stringify(allAnnotations));

        const res = await apiFetch(`${BACKEND_URL}/api/edit-pdf`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Failed to queue edit task on server.');
        }

        const data = await res.json();
        poller.startPolling(data.job_id);
      } catch (err) {
        console.warn('Server edit failed, falling back to local client engine:', err);
        await runLocalEdit(file, allAnnotations, finalName);
      }
    } else {
      await runLocalEdit(file, allAnnotations, finalName);
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      try {
        const res = await fetch(result.downloadUrl);
        const blob = await res.blob();
        saveAs(blob, result.name);
      } catch {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.name;
        link.click();
      }
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('edit-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setPdfDocument(null);
    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);
    setEditedTextMap({});
    setExtractedTextLines([]);
    setTextPlacement(null);
    setSelectedAnnoId(null);
    setActiveTool('text-edit');
    setStrokeColor('#EF4444');
    setThickness(3);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
    syncedDownloadUrlRef.current = null;
  };

  return (
    <ToolPageLayout
      toolId="edit-pdf"
      title="Edit PDF Document"
      description="Draw smooth pen strokes, highlight lines, place visual shapes, or directly edit text inline visually"
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Edit PDF Online Free — Annotate & Direct Edit PDF | DocScalar"
        description="Add smooth handwritten curves, highlight lines, vector shapes, and rewrite existing PDF text inline. Encrypted annotations editor with full vector fidelity."
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
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between gap-3 overflow-visible" role="toolbar" aria-label="PDF Editor Toolbar">
                  <div className="flex items-center gap-2.5 shrink-0">
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value, 10));
                            setCurrentPage(1);
                            setSelectedAnnoId(null);
                          }}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                          aria-label="Select active file"
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

                    {totalPages > 0 && (
                      <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5 shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => navigateToPage(1)}
                          disabled={currentPage <= 1}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors cursor-pointer"
                          title="First Page"
                          aria-label="First Page"
                        >
                          <span className="material-symbols-outlined text-[15px]">first_page</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateToPage(p => p - 1)}
                          disabled={currentPage <= 1}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page (PageUp or [)"
                          aria-label="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <div className="flex items-center gap-1 px-1">
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const p = parseInt(pageInput, 10);
                                if (!isNaN(p) && p >= 1 && p <= totalPages) {
                                  navigateToPage(p);
                                } else {
                                  setPageInput(String(currentPage));
                                }
                              }
                            }}
                            onBlur={() => {
                              const p = parseInt(pageInput, 10);
                              if (!isNaN(p) && p >= 1 && p <= totalPages) {
                                navigateToPage(p);
                              } else {
                                setPageInput(String(currentPage));
                              }
                            }}
                            className="w-10 h-6 text-center text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Current Page Number"
                          />
                          <span className="text-xs font-bold text-[var(--text-secondary)] select-none">
                            / {totalPages}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToPage(p => p + 1)}
                          disabled={currentPage >= totalPages}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page (PageDown or ])"
                          aria-label="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateToPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors cursor-pointer"
                          title="Last Page"
                          aria-label="Last Page"
                        >
                          <span className="material-symbols-outlined text-[15px]">last_page</span>
                        </button>
                      </div>
                    )}

                    {/* Undo / Redo Actions */}
                    <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] px-1.5 py-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-1 rounded-md cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                        title="Undo last action (Ctrl+Z)"
                        aria-label="Undo"
                      >
                        <span className="material-symbols-outlined text-[16px] block">undo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-1 rounded-md cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                        title="Redo action (Ctrl+Y)"
                        aria-label="Redo"
                      >
                        <span className="material-symbols-outlined text-[16px] block">redo</span>
                      </button>
                    </div>

                    {/* Delete Selected Item */}
                    {selectedAnnoId && (
                      <button
                        type="button"
                        onClick={() => {
                          pushUndoSnapshot();
                          setAnnotations(prev => prev.filter(a => a.id !== selectedAnnoId));
                          setSelectedAnnoId(null);
                        }}
                        className="h-8 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors animate-[fadeIn_0.15s_ease-out] shrink-0"
                        title="Delete selected annotation (Delete)"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>Delete Selected</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SmartCropperToolbarButton cropper={cropper} />

                    <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                      <input
                        type="range"
                        min="0.3"
                        max="3.0"
                        step="0.05"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                        aria-label="Zoom scale"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

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
                      className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Reset workspace"
                      aria-label="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>

                {/* Smart Cropper Banner Notifications (Only when borders detected and awaiting action) */}
                {cropper.hasDetectedBorders && !cropper.isActive && (
                  <div className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/25 text-xs flex items-center justify-between flex-wrap gap-2 text-emerald-900 dark:text-emerald-200 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">crop</span>
                      <span>
                        <strong>Scan border artifacts detected</strong> — {cropper.detectionReason}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cropper.activate()}
                      className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-xs text-[11px] flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                      Clean Borders
                    </button>
                  </div>
                )}

                {/* Inline Text Mode Guidance Banner */}
                {activeTool === 'text-edit' && (
                  <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/25 text-xs flex items-center justify-between flex-wrap gap-2 text-blue-900 dark:text-blue-200 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400">edit_note</span>
                      <span>
                        {extractedTextLines.length > 0 ? (
                          <>
                            <strong>Direct Text Editing Active:</strong> Click directly into any text line to edit, or click anywhere to insert new text with your keyboard.
                          </>
                        ) : (
                          <>
                            <strong>Scanned Page Detected:</strong> This page consists of raster images with no digital text streams. Click anywhere on the canvas to insert clean text with automatic whiteout!
                          </>
                        )}
                      </span>
                    </div>
                    {extractedTextLines.length > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 rounded text-blue-700 dark:text-blue-300">
                        {extractedTextLines.length} text lines ready for direct typing
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 sm:p-8 pb-24 sm:pb-32 flex items-start justify-center relative bg-pattern select-none"
              >
                <div
                  className="relative my-4 sm:my-8 bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  {/* Clean Margins Outline */}
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
                    className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none block z-1"
                  />

                  {/* Loading Spinner */}
                  {canvasLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Rendering page canvas...</span>
                    </div>
                  )}

                  {/* Layer 2 (zIndex: 10): In-Place Text Editing & Modified Lines Layer */}
                  {/* Positioned UNDER overlayCanvasRef so highlighter strokes on overlayCanvasRef are never covered by whiteout! */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 10,
                      pointerEvents: activeTool === 'text-edit' ? 'auto' : 'none'
                    }}
                    onClick={(e) => {
                      // Clicking empty space in direct text edit drops insertion cursor
                      if (activeTool === 'text-edit' && e.target === e.currentTarget) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const xPercent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const yPercent = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

                        // Check proximity to existing extracted lines:
                        // If click was very close to a text line (within 1.8% vertical tolerance and horizontal span),
                        // snap to editing that line instead of spawning an unwanted direct text box!
                        const matchedLine = findBestMatchingLine({ xPercent, yPercent }, extractedTextLines, 0.018);
                        if (matchedLine) {
                          const charCount = (matchedLine.currentText ?? '').length;
                          const estWidthPercent = Math.max(
                            matchedLine.widthPercent,
                            ((charCount + 1) * (matchedLine.fontSize || 12) * 0.58 / (pageDimensions.width || 595))
                          );
                          const minX = Math.max(0, matchedLine.xPercent - 0.03);
                          const maxX = Math.min(1, matchedLine.xPercent + estWidthPercent + 0.03);
                          if (xPercent >= minX && xPercent <= maxX) {
                            setDirectTextEditor(null);
                            setEditingTextLineId(matchedLine.id);
                            return;
                          }
                        }

                        setEditingTextLineId(null);
                        setDirectTextEditor({
                          id: `direct-text-${Math.random().toString(36).substr(2, 7)}`,
                          xPercent,
                          yPercent,
                          text: '',
                          fontSize: textFontSize,
                          fontFamily: textFontFamily,
                          color: textColor || '#000000',
                          whiteout: isWhiteoutEnabled,
                          isNew: true
                        });
                      }
                    }}
                  >
                    {/* When in text-edit tool: render interactive lines */}
                    {activeTool === 'text-edit' &&
                      extractedTextLines.map((line) => {
                        const isModified = line.currentText !== line.originalText;
                        const isEditing = editingTextLineId === line.id;
                        const renderedFontSize = Math.max(9, (line.fontSize || 12) * zoomScale);
                        const charCount = (line.currentText ?? '').length;
                        const estWidthPercent = Math.max(
                          line.widthPercent * 100,
                          ((charCount + 1) * (line.fontSize || 12) * 0.58 / (pageDimensions.width || 595)) * 100
                        );

                        if (isEditing) {
                          return (
                            <input
                              key={line.id}
                              autoFocus
                              type="text"
                              value={line.currentText}
                              onFocus={() => {
                                pushUndoSnapshot();
                              }}
                              onChange={(e) => {
                                handleUpdateTextLine(line, e.target.value);
                              }}
                              onBlur={() => {
                                setEditingTextLineId(null);
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setEditingTextLineId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingTextLineId(null);
                                }
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                left: `${line.xPercent * 100}%`,
                                top: `${line.yPercent * 100}%`,
                                width: `${Math.min(100 - line.xPercent * 100, Math.max(estWidthPercent, 4))}%`,
                                height: `${Math.max(line.heightPercent * 100, 2.2)}%`,
                                fontSize: `${renderedFontSize}px`,
                                fontFamily:
                                  line.fontFamily === 'TimesRoman'
                                    ? 'Times New Roman, serif'
                                    : line.fontFamily === 'Courier'
                                    ? 'Courier New, monospace'
                                    : 'sans-serif',
                                color: line.color || textColor || '#000000',
                                backgroundColor: '#ffffff',
                                border: '1.5px solid var(--color-primary)',
                                borderRadius: '2px',
                                padding: '0 2px',
                                margin: 0,
                                lineHeight: 1,
                                outline: 'none',
                                boxSizing: 'border-box',
                                pointerEvents: 'auto',
                                cursor: 'text',
                                zIndex: 30
                              }}
                              className="hover:border-blue-500 hover:bg-blue-500/10 focus:bg-white focus:border-blue-600 focus:shadow-md focus:ring-2 focus:ring-blue-500/30 transition-colors"
                              title={`Original: "${line.originalText}"`}
                            />
                          );
                        }

                        if (isModified) {
                          return (
                            <div
                              key={line.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDirectTextEditor(null);
                                setEditingTextLineId(line.id);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                left: `${line.xPercent * 100}%`,
                                top: `${line.yPercent * 100}%`,
                                width: `${Math.min(100 - line.xPercent * 100, Math.max(estWidthPercent, 4))}%`,
                                height: `${Math.max(line.heightPercent * 100, 2.2)}%`,
                                fontSize: `${renderedFontSize}px`,
                                fontFamily:
                                  line.fontFamily === 'TimesRoman'
                                    ? 'Times New Roman, serif'
                                    : line.fontFamily === 'Courier'
                                    ? 'Courier New, monospace'
                                    : 'sans-serif',
                                color: line.color || textColor || '#000000',
                                backgroundColor: '#ffffff',
                                border: '1px solid transparent',
                                borderRadius: '2px',
                                padding: '0 2px',
                                margin: 0,
                                lineHeight: 1,
                                pointerEvents: 'auto',
                                cursor: 'text',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              className="hover:ring-1 hover:ring-blue-400/40 rounded transition-all select-none"
                              title="Click to edit modified line"
                            >
                              {line.currentText}
                            </div>
                          );
                        }

                        // Untouched line: Pristine preview with ZERO wireframe clutter (no dashed boxes, transparent text to let PDF canvas show)
                        return (
                          <div
                            key={line.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDirectTextEditor(null);
                              setEditingTextLineId(line.id);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              left: `${line.xPercent * 100}%`,
                              top: `${line.yPercent * 100}%`,
                              width: `${Math.min(100 - line.xPercent * 100, Math.max(estWidthPercent, 4))}%`,
                              height: `${Math.max(line.heightPercent * 100, 2.4)}%`,
                              minHeight: '16px',
                              transform: 'translateY(-1px)',
                              backgroundColor: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '2px',
                              padding: '1px 3px',
                              margin: 0,
                              pointerEvents: 'auto',
                              cursor: 'text'
                            }}
                            className="hover:bg-blue-500/5 hover:ring-1 hover:ring-blue-400/30 rounded transition-colors"
                            title="Click directly to edit this line"
                          />
                        );
                      })}

                    {/* When not in text-edit tool: render modified lines preview */}
                    {activeTool !== 'text-edit' &&
                      Object.values(editedTextMap)
                        .filter(line => line.pageIndex === (currentPage - 1) && line.currentText !== line.originalText)
                        .map((line) => {
                          const renderedFontSize = Math.max(9, (line.fontSize || 12) * zoomScale);
                          const charCount = (line.currentText ?? '').length;
                          const estWidthPercent = Math.max(
                            line.widthPercent * 100,
                            ((charCount + 1) * (line.fontSize || 12) * 0.58 / (pageDimensions.width || 595)) * 100
                          );

                          return (
                            <div
                              key={`preview-${line.id}`}
                              style={{
                                position: 'absolute',
                                left: `${line.xPercent * 100}%`,
                                top: `${line.yPercent * 100}%`,
                                width: `${Math.min(100 - line.xPercent * 100, Math.max(estWidthPercent, 4))}%`,
                                height: `${Math.max(line.heightPercent * 100, 2.2)}%`,
                                fontSize: `${renderedFontSize}px`,
                                fontFamily:
                                  line.fontFamily === 'TimesRoman'
                                    ? 'Times New Roman, serif'
                                    : line.fontFamily === 'Courier'
                                    ? 'Courier New, monospace'
                                    : 'sans-serif',
                                color: line.color || textColor || '#000000',
                                backgroundColor: '#ffffff',
                                borderRadius: '2px',
                                padding: '0 2px',
                                margin: 0,
                                lineHeight: 1,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              className="font-semibold select-none"
                            >
                              {line.currentText}
                            </div>
                          );
                        })}
                  </div>

                  {/* Layer 3 (zIndex: 20): Interactive Drawing & Overlay Canvas */}
                  {/* Positioned OVER the modified text layer so yellow highlights and pen strokes are rendered on top! */}
                  <canvas
                    ref={overlayCanvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onDoubleClick={handleDoubleClick}
                    className={`absolute top-0 left-0 w-full h-full touch-none z-20 ${
                      activeTool === 'select'
                        ? 'cursor-default'
                        : activeTool === 'text'
                        ? 'cursor-text'
                        : activeTool === 'eraser'
                        ? 'cursor-crosshair'
                        : activeTool === 'text-edit'
                        ? 'cursor-text'
                        : 'cursor-crosshair'
                    }`}
                    style={{
                      mixBlendMode: 'normal',
                      pointerEvents: activeTool === 'text-edit' ? 'none' : 'auto'
                    }}
                  />

                  {/* Universal In-Situ Direct Text Insertion Cursor (Works on Scanned & Digital PDFs) */}
                  {directTextEditor && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${directTextEditor.xPercent * 100}%`,
                        top: `${directTextEditor.yPercent * 100}%`,
                        zIndex: 50,
                        transform: 'translate(-2px, -50%)'
                      }}
                      className="animate-[scaleIn_0.1s_ease-out] relative flex flex-col items-start select-none"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {/* Direct Inline Input with Blinking Text Insertion Cursor */}
                      <input
                        ref={(el) => {
                          if (el) {
                            el.focus();
                            if (el.value) {
                              const len = el.value.length;
                              el.setSelectionRange(len, len);
                            }
                          }
                        }}
                        type="text"
                        autoFocus
                        value={directTextEditor.text}
                        placeholder="Type here..."
                        onChange={(e) => setDirectTextEditor(prev => ({ ...prev, text: e.target.value }))}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitDirectTextEditor();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setDirectTextEditor(null);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
                            commitDirectTextEditor();
                          }
                        }}
                        className={`outline-none font-semibold rounded px-2 py-0.5 border-2 border-blue-600 shadow-xl ring-3 ring-blue-500/20 transition-all ${
                          directTextEditor.whiteout
                            ? 'bg-white text-slate-900'
                            : 'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white backdrop-blur-xs'
                        }`}
                        style={{
                          color: directTextEditor.color || textColor || '#000000',
                          fontSize: `${Math.max(10, (directTextEditor.fontSize || textFontSize) * zoomScale)}px`,
                          fontFamily:
                            directTextEditor.fontFamily === 'TimesRoman'
                              ? 'Times New Roman, serif'
                              : directTextEditor.fontFamily === 'Courier'
                              ? 'Courier New, monospace'
                              : 'sans-serif',
                          lineHeight: 1.25,
                          caretColor: directTextEditor.color || strokeColor || '#2563EB',
                          minWidth: '120px',
                          width: `${Math.max(120, ((directTextEditor.text || '').length + 3) * (directTextEditor.fontSize || textFontSize) * 0.62 * zoomScale)}px`
                        }}
                      />

                      {/* Compact Quick Actions Pill */}
                      <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1 select-none">
                          Enter ↵ to apply · Esc to cancel
                        </span>
                        <button
                          type="button"
                          onClick={commitDirectTextEditor}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
                          title="Apply text (Enter)"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectTextEditor(null)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 cursor-pointer transition-colors"
                          title="Cancel (Esc)"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">edit_document</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Editor Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Tool Selection Grid */}
                {/* 1. Tool Selection Grid */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Editing Tool
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EDITOR_TOOLS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => switchTool(t.id)}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                          activeTool === t.id
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
                        }`}
                        title={`${t.label}: ${t.desc}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                        <span className="text-xs font-bold truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Context-Sensitive Tool Properties */}
                {(() => {
                  const selectedAnno = selectedAnnoId ? annotations.find(a => a.id === selectedAnnoId) : null;
                  const isTextContext = activeTool === 'text' || activeTool === 'text-edit' || selectedAnno?.type === 'text';

                  if (activeTool === 'eraser') {
                    return (
                      <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)] animate-[fadeIn_0.12s_ease-out]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Eraser Mode
                          </label>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            eraserMode === 'additions'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}>
                            {eraserMode === 'additions' ? 'Additions Only' : 'PDF Whiteout'}
                          </span>
                        </div>

                        {/* Dual Mode Switcher */}
                        <div className="grid grid-cols-2 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1">
                          <button
                            type="button"
                            onClick={() => setEraserMode('additions')}
                            className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              eraserMode === 'additions'
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            title="Erase only your drawings, highlighters, text, shapes, or whiteouts without touching the original PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">layers_clear</span>
                            <span className="text-[11px] text-center">Erase Additions Only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEraserMode('whiteout')}
                            className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              eraserMode === 'whiteout'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            title="Erase printed text, handwriting, or graphics on the original PDF with whiteout"
                          >
                            <span className="material-symbols-outlined text-[18px]">ink_eraser</span>
                            <span className="text-[11px] text-center">Erase PDF Directly</span>
                          </button>
                        </div>

                        {/* Guidance Box */}
                        <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          eraserMode === 'additions'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                        }`}>
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <span className="material-symbols-outlined text-[16px]">
                              {eraserMode === 'additions' ? 'info' : 'format_paint'}
                            </span>
                            <span>
                              {eraserMode === 'additions' ? 'Erase Your Additions' : 'Direct PDF Whiteout'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {eraserMode === 'additions'
                              ? 'Sweep over your pen drawings, highlighters, text, shapes, or whiteout strokes to delete only what you added. The underlying original PDF will remain 100% untouched.'
                              : 'Drag across printed text, scanned handwriting, numbers, or graphics on the PDF to directly erase them with pure whiteout.'}
                          </p>
                        </div>

                        {/* Eraser Stroke Thickness Slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                            <span className="uppercase tracking-wider">Eraser Thickness / Radius</span>
                            <span className="font-extrabold text-[var(--text-primary)]">{eraserThickness}px</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="45"
                            value={eraserThickness}
                            onChange={(e) => setEraserThickness(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                            aria-label="Eraser thickness slider"
                          />
                          <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center min-h-[36px]">
                            <div
                              style={{
                                width: '80%',
                                height: `${Math.max(4, eraserThickness * 0.7)}px`,
                                backgroundColor: eraserMode === 'additions' ? 'rgba(59, 130, 246, 0.2)' : '#FFFFFF',
                                border: eraserMode === 'additions' ? '1.5px dashed #2563EB' : '1px dashed #94A3B8',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isTextContext) {
                    const currentSize = selectedAnno?.size || textFontSize;
                    const currentFont = selectedAnno?.fontFamily || textFontFamily;
                    const currentWhiteout = selectedAnno ? Boolean(selectedAnno.whiteout) : isWhiteoutEnabled;
                    const currentColor = selectedAnno?.color || textColor || '#000000';

                    return (
                      <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)] animate-[fadeIn_0.12s_ease-out]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            {selectedAnno ? 'Selected Text Styling' : 'Typography & Text'}
                          </label>
                          {selectedAnno && (
                            <span className="text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              Selected Item
                            </span>
                          )}
                        </div>

                        {/* Font Family Selector */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Font Family</span>
                          <select
                            value={currentFont}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTextFontFamily(val);
                              handleUpdateSelectedStyle(null, null, null, val, null);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] font-semibold cursor-pointer"
                          >
                            {FONT_FAMILIES.map(f => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Font Size Slider, Step Buttons & Direct Number Input */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold text-[var(--text-secondary)]">
                            <span className="uppercase tracking-wider">Font Size</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newSize = Math.max(8, currentSize - 2);
                                  setTextFontSize(newSize);
                                  handleUpdateSelectedStyle(null, null, newSize, null, null);
                                }}
                                className="w-6 h-6 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold flex items-center justify-center hover:bg-[var(--border-subtle)] cursor-pointer text-xs"
                                title="Decrease font size (-2pt)"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="8"
                                max="120"
                                value={currentSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 6 && val <= 144) {
                                    setTextFontSize(val);
                                    handleUpdateSelectedStyle(null, null, val, null, null);
                                  }
                                }}
                                className="w-12 h-6 text-center text-xs font-extrabold bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label="Direct Font Size in points"
                              />
                              <span className="text-xs font-bold text-[var(--text-secondary)]">pt</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newSize = Math.min(120, currentSize + 2);
                                  setTextFontSize(newSize);
                                  handleUpdateSelectedStyle(null, null, newSize, null, null);
                                }}
                                className="w-6 h-6 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold flex items-center justify-center hover:bg-[var(--border-subtle)] cursor-pointer text-xs"
                                title="Increase font size (+2pt)"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="120"
                            value={currentSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setTextFontSize(val);
                              handleUpdateSelectedStyle(null, null, val, null, null);
                            }}
                            className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                            aria-label="Font size slider"
                          />
                          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-blue-500">open_in_full</span>
                            <span>Drag any corner handle on the canvas or click + to make text bigger</span>
                          </span>
                        </div>

                        {/* Whiteout Mask Toggle */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-primary)]">Opaque Whiteout</span>
                            <span className="text-[10px] text-[var(--text-secondary)]">Covers underlying PDF pixels</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !currentWhiteout;
                              setIsWhiteoutEnabled(nextVal);
                              handleUpdateSelectedStyle(null, null, null, null, nextVal);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              currentWhiteout
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {currentWhiteout ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                            <span>{currentWhiteout ? 'Active' : 'Off'}</span>
                          </button>
                        </div>

                        {/* Color Palette */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Text Color</span>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              {COLOR_SWATCHES.map((swatch) => (
                                <button
                                  key={swatch}
                                  type="button"
                                  onClick={() => {
                                    setTextColor(swatch);
                                    handleUpdateSelectedStyle(swatch, null, null, null, null);
                                  }}
                                  className={`w-6 h-6 rounded-full border border-black/10 transition-transform cursor-pointer ${
                                    currentColor === swatch ? 'scale-125 ring-2 ring-[var(--color-primary)]' : 'hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: swatch }}
                                  aria-label={`Color ${swatch}`}
                                />
                              ))}
                            </div>
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTextColor(val);
                                handleUpdateSelectedStyle(val, null, null, null, null);
                              }}
                              className="w-7 h-7 rounded-lg border border-[var(--border-subtle)] cursor-pointer bg-transparent"
                              aria-label="Custom color picker"
                            />
                          </div>
                        </div>

                        {/* Live Typography Preview */}
                        <div
                          className={`p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-center min-h-[44px] transition-colors ${
                            currentWhiteout ? 'bg-white shadow-xs' : 'bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <span
                            style={{
                              color: currentColor,
                              fontSize: `${Math.max(11, Math.min(26, currentSize * 1.1))}px`,
                              fontFamily:
                                currentFont === 'TimesRoman'
                                  ? 'Times New Roman, serif'
                                  : currentFont === 'Courier'
                                  ? 'Courier New, monospace'
                                  : 'sans-serif',
                              fontWeight: 'bold'
                            }}
                          >
                            Aa Sample Text
                          </span>
                        </div>

                        {/* If text is selected, offer direct inline re-editing button */}
                        {selectedAnno?.type === 'text' && (
                          <button
                            type="button"
                            onClick={() => {
                              setDirectTextEditor({
                                id: selectedAnno.id,
                                xPercent: selectedAnno.xPercent,
                                yPercent: selectedAnno.yPercent,
                                text: selectedAnno.text,
                                fontSize: selectedAnno.size || textFontSize,
                                fontFamily: selectedAnno.fontFamily || textFontFamily,
                                color: selectedAnno.color || strokeColor,
                                whiteout: Boolean(selectedAnno.whiteout),
                                isNew: false
                              });
                              setSelectedAnnoId(null);
                            }}
                            className="w-full py-2 px-3 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Edit Text Content Directly</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  // Otherwise, stroke/geometry controls (pen, highlight, shapes)
                  const currentThickness = selectedAnno?.thickness || thickness;
                  const currentColor = selectedAnno?.color || strokeColor;
                  const isHighlightMode = activeTool === 'highlight' || selectedAnno?.type === 'highlight';
                  const activeSwatches = isHighlightMode ? HIGHLIGHT_SWATCHES : COLOR_SWATCHES;

                  return (
                    <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)] animate-[fadeIn_0.12s_ease-out]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          {selectedAnno ? 'Selected Shape Styling' : (isHighlightMode ? 'Highlighter Settings' : 'Stroke & Geometry')}
                        </label>
                        {selectedAnno && (
                          <span className="text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                            Selected Item
                          </span>
                        )}
                      </div>

                      {/* Color Palette */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                          {isHighlightMode ? 'Highlighter Tint' : 'Stroke Color'}
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            {activeSwatches.map((swatch) => (
                              <button
                                key={swatch}
                                type="button"
                                onClick={() => {
                                  setStrokeColor(swatch);
                                  handleUpdateSelectedStyle(swatch, null, null, null, null);
                                }}
                                className={`w-6 h-6 rounded-full border border-black/10 transition-transform cursor-pointer ${
                                  currentColor === swatch ? 'scale-125 ring-2 ring-[var(--color-primary)]' : 'hover:scale-110'
                                }`}
                                style={{ backgroundColor: swatch }}
                                aria-label={`Color ${swatch}`}
                              />
                            ))}
                          </div>
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStrokeColor(val);
                              handleUpdateSelectedStyle(val, null, null, null, null);
                            }}
                            className="w-7 h-7 rounded-lg border border-[var(--border-subtle)] cursor-pointer bg-transparent"
                            aria-label="Custom color picker"
                          />
                        </div>
                      </div>

                      {/* Smart Line Auto-Fit Switch for Highlighter */}
                      {isHighlightMode && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <div className="flex flex-col gap-0.5 pr-2">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                              Smart Line Auto-Fit
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              Auto-detects line height & snaps across words
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={smartHighlight}
                            onClick={() => setSmartHighlight(prev => !prev)}
                            className={`relative inline-flex w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                              smartHighlight ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            aria-label="Toggle Smart Line Auto-Fit"
                            title={smartHighlight ? 'Smart Auto-Fit enabled' : 'Smart Auto-Fit disabled'}
                          >
                            <span
                              className={`pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                                smartHighlight ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      {/* Stroke Thickness Slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                          <span className="uppercase tracking-wider">
                            {isHighlightMode ? 'Manual Stroke Thickness' : 'Stroke Thickness'}
                          </span>
                          <span className="font-extrabold text-[var(--text-primary)]">{currentThickness}px</span>
                        </div>
                        <input
                          type="range"
                          min={activeTool === 'highlight' ? '6' : '1'}
                          max={activeTool === 'highlight' ? '42' : '16'}
                          value={currentThickness}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setThickness(val);
                            handleUpdateSelectedStyle(null, val, null, null, null);
                          }}
                          className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                          aria-label="Stroke thickness slider"
                        />
                        <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center min-h-[36px]">
                          <div
                            style={{
                              width: '80%',
                              height: `${activeTool === 'highlight' ? Math.max(4, currentThickness * 0.7) : Math.max(1, currentThickness * 0.7)}px`,
                              backgroundColor: currentColor,
                              opacity: activeTool === 'highlight' ? 0.4 : 1.0,
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                        {isHighlightMode && smartHighlight && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Smart Sizer active. Slider sets default or manual override.
                          </span>
                        )}
                        {selectedAnno?.type === 'shape' && (
                          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-blue-500">open_in_full</span>
                            <span>Drag corner or endpoint handles on canvas to resize or reshape</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Page Annotations & Clear */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                    <span>Page Annotations</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {annotations.filter(a => a.pageIndex === currentPage - 1).length} active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearPageAnnotations}
                    disabled={annotations.filter(a => a.pageIndex === currentPage - 1).length === 0}
                    className="w-full py-2 px-3 bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-secondary)] disabled:hover:text-[var(--text-secondary)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-subtle)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Clear annotations on this page"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    <span>Clear Current Page Annotations</span>
                  </button>
                </div>

                {/* 5. Universal Smart Cropper Panel */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <SmartCropperPanel
                    cropper={cropper}
                    totalPages={totalPages}
                    onActivate={() => {}}
                    onRevert={() => {}}
                  />
                </div>

                {/* 6. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_edited.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Baking edited document...
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

              {/* Sticky Primary CTA */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={processing || files.length === 0 || !hasChanges}
                  className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 ${
                    hasChanges
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60 shadow-none'
                  }`}
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Saving ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {hasChanges ? 'download' : 'save'}
                      </span>
                      <span>Save & Export Edited PDF</span>
                      {hasChanges && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-700 text-white text-[11px] font-bold">
                          {totalChangesCount}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {hasChanges ? (
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center justify-center gap-1 animate-[fadeIn_0.2s_ease-out]">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>Ready to export ({totalChangesCount} {totalChangesCount === 1 ? 'edit' : 'edits'} detected)</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-center text-[var(--text-muted)] mt-2 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    <span>Draw, add text, or edit the PDF to enable export</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* Result View */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Edits Applied!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                All drawings, text edits, highlights, and vector annotations have been embedded.
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Annotations</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.annotationCount || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Verified</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Edited PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Edit Another PDF</span>
              </button>
            </div>

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
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Digital signature</p>
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
