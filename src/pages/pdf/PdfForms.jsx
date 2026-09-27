import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { getFormFields, fillFormFields, compileFormWithNewFields, exportFormToCsv, exportFormToJson } from '../../engines/pdf/pdfForms';
import { detectCanvasFormBoxes, scanAllPdfPagesForBoxes } from '../../utils/pdfFormBoxDetector';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  FileSpreadsheet,
  Code,
  Upload,
  Trash2
} from 'lucide-react';
import useSmartCropper from '../../hooks/useSmartCropper';
import SmartCropperPanel from '../../components/SmartCropperPanel';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import useCanvasPinchZoom from '../../hooks/useCanvasPinchZoom';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CREATOR_TOOLS = [
  { id: 'text', label: 'Text Field', icon: 'text_fields', desc: 'Single-line or multi-line text input' },
  { id: 'checkbox', label: 'Checkbox', icon: 'check_box', desc: 'Toggle boolean checkbox box' },
  { id: 'select', label: 'Dropdown', icon: 'arrow_drop_down_circle', desc: 'Select option dropdown list' },
  { id: 'radio', label: 'Radio Group', icon: 'radio_button_checked', desc: 'Mutual exclusion radio option' }
];

const RESIZE_HANDLES = [
  { id: 'nw', cursor: 'nwse-resize', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2' },
  { id: 'n',  cursor: 'ns-resize',   className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
  { id: 'ne', cursor: 'nesw-resize', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2' },
  { id: 'e',  cursor: 'ew-resize',   className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2' },
  { id: 'se', cursor: 'nwse-resize', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
  { id: 's',  cursor: 'ns-resize',   className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
  { id: 'sw', cursor: 'nesw-resize', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
  { id: 'w',  cursor: 'ew-resize',   className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' }
];

export default function PdfForms() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);

  // Forms state
  const [formFields, setFormFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const scannedPagesRef = useRef(new Set());

  // Mode: 'fill' vs 'create'
  const [activeMode, setActiveMode] = useState('fill');
  const [creatorTool, setCreatorTool] = useState('text');
  const [createdFields, setCreatedFields] = useState([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [flattenFields, setFlattenFields] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');
  const [fieldListFilter, setFieldListFilter] = useState('all'); // 'all' | 'page'

  // History Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Multi-File Session State Isolation Cache
  const fileSessionsRef = useRef({});

  // Bounding box transformation (Move & 8-point Resize)
  const canvasFrameRef = useRef(null);
  const transformStateRef = useRef(null);

  // Drag-and-draw states for placing custom fields
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  // Canvas Viewport State
  const { dpi, setDpi, getScaleMultiplier } = useDpiQuality();
  const [zoomScale, setZoomScale] = useState(1.0);
  const [debouncedRenderZoom, setDebouncedRenderZoom] = useState(zoomScale);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [pageViewport, setPageViewport] = useState(null);
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Debounce high-DPI PDF rasterization to decouple smooth 120 FPS GPU scaling from heavy canvas redraws
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRenderZoom(zoomScale);
    }, 200);
    return () => clearTimeout(handler);
  }, [zoomScale]);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const currentRenderTaskRef = useRef(null);
  const cropper = useSmartCropper({ canvasRef: pdfCanvasRef, totalPages });

  // Universal 2-finger touchpad/touchscreen canvas pinch-to-zoom
  useCanvasPinchZoom({
    containerRef,
    zoomScale,
    setZoomScale,
    minZoom: 0.3,
    maxZoom: 3.0
  });

  const snapValue = (val) => {
    if (!snapToGrid) return val;
    return Math.round(val / 0.025) * 0.025; // 2.5% grid
  };

  const pushSnapshot = (customSnapshot = null) => {
    const snap = customSnapshot || {
      createdFields: JSON.parse(JSON.stringify(createdFields)),
      fieldValues: { ...fieldValues }
    };
    setUndoStack(prev => [...prev.slice(-30), snap]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    const currentSnapshot = {
      createdFields: JSON.parse(JSON.stringify(createdFields)),
      fieldValues: { ...fieldValues }
    };

    setRedoStack(prev => [...prev, currentSnapshot]);
    setUndoStack(newUndoStack);

    setCreatedFields(previous.createdFields);
    setFieldValues(previous.fieldValues);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    const currentSnapshot = {
      createdFields: JSON.parse(JSON.stringify(createdFields)),
      fieldValues: { ...fieldValues }
    };

    setUndoStack(prev => [...prev, currentSnapshot]);
    setRedoStack(newRedoStack);

    setCreatedFields(next.createdFields);
    setFieldValues(next.fieldValues);
  };

  const switchFile = (newIndex) => {
    if (newIndex === activeFileIndex) return;

    // Cache outgoing file state
    fileSessionsRef.current[activeFileIndex] = {
      createdFields: [...createdFields],
      fieldValues: { ...fieldValues },
      undoStack: [...undoStack],
      redoStack: [...redoStack]
    };

    // Restore incoming file state
    const cached = fileSessionsRef.current[newIndex];
    if (cached) {
      setCreatedFields(cached.createdFields || []);
      setFieldValues(cached.fieldValues || {});
      setUndoStack(cached.undoStack || []);
      setRedoStack(cached.redoStack || []);
    } else {
      setCreatedFields([]);
      setFieldValues({});
      setUndoStack([]);
      setRedoStack([]);
    }

    setSelectedFieldId(null);
    setCurrentPage(1);
    setActiveFileIndex(newIndex);
  };

  const handleClearAllValues = () => {
    pushSnapshot();
    const cleared = {};
    Object.keys(fieldValues).forEach(k => {
      cleared[k] = typeof fieldValues[k] === 'boolean' ? false : '';
    });
    setFieldValues(cleared);
  };

  const handleResetAllFields = () => {
    pushSnapshot();
    setCreatedFields([]);
    setSelectedFieldId(null);
    const initialVals = {};
    formFields.forEach(f => {
      initialVals[f.name] = f.value;
    });
    setFieldValues(initialVals);
  };

  const handleAutoDetectCurrentPage = () => {
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;

    setIsAutoDetecting(true);
    try {
      const pageIdx = currentPage - 1;
      const detected = detectCanvasFormBoxes(canvas, pageIdx);
      if (detected.length === 0) {
        alert('No distinct form boxes detected on this page. You can still place fields manually in "Place New Fields" mode.');
        return;
      }

      pushSnapshot();
      setCreatedFields(prev => {
        const existingOnPage = prev.filter(f => f.pageIndex === pageIdx);
        const newUnique = detected.filter(d => !existingOnPage.some(e => {
          const dx = Math.abs(e.rect.startXPercent - d.rect.startXPercent);
          const dy = Math.abs(e.rect.startYPercent - d.rect.startYPercent);
          return dx < 0.05 && dy < 0.03;
        }));
        return [...prev, ...newUnique];
      });

      setActiveMode('fill');
      setScanMessage(`Detected ${detected.length} form boxes on Page ${currentPage}. Click any box to type directly.`);
      if (detected[0]) {
        setSelectedFieldId(detected[0].id);
      }
    } catch (err) {
      console.warn('Error auto-detecting form boxes:', err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleAutoDetectAllPages = async () => {
    if (!pdfDocument) return;
    setIsAutoDetecting(true);
    setScanMessage('Scanning all pages for form boxes...');
    try {
      const allDetected = await scanAllPdfPagesForBoxes(pdfDocument, {}, (cur, total) => {
        setScanMessage(`Scanning page ${cur} of ${total} for form boxes...`);
      });

      if (allDetected.length === 0) {
        alert('No distinct form boxes detected across document pages.');
        return;
      }

      pushSnapshot();
      setCreatedFields(prev => {
        const newUnique = allDetected.filter(d => !prev.some(e => {
          if (e.pageIndex !== d.pageIndex) return false;
          const dx = Math.abs(e.rect.startXPercent - d.rect.startXPercent);
          const dy = Math.abs(e.rect.startYPercent - d.rect.startYPercent);
          return dx < 0.05 && dy < 0.03;
        }));
        return [...prev, ...newUnique];
      });

      setActiveMode('fill');
      setScanMessage(`Scan complete: Found ${allDetected.length} form boxes across ${totalPages} pages.`);
    } catch (err) {
      console.warn('Error scanning all pages:', err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const isMultilineField = (f) => {
    if (f.multiline) return true;
    if (f.widgets && f.widgets.some(w => w.rect && w.rect.height > 35)) return true;
    if (f.rect) {
      const hPt = (f.rect.endYPercent - f.rect.startYPercent) * (pageDimensions.height || 842);
      if (hPt > 35) return true;
    }
    return false;
  };

  const handleStartTransform = (e, type, fieldId, handle = null) => {
    e.stopPropagation();
    e.preventDefault();
    const field = createdFields.find(f => f.id === fieldId);
    if (!field) return;

    const canvasEl = canvasFrameRef.current;
    if (!canvasEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();

    const snapshot = {
      createdFields: JSON.parse(JSON.stringify(createdFields)),
      fieldValues: { ...fieldValues }
    };

    transformStateRef.current = {
      type,
      handle,
      fieldId,
      startPointer: { x: e.clientX, y: e.clientY },
      startRect: { ...field.rect },
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      snapshot,
      hasMutated: false
    };

    const handlePointerMove = (moveEvt) => {
      if (!transformStateRef.current) return;
      const state = transformStateRef.current;
      const deltaX = (moveEvt.clientX - state.startPointer.x) / state.canvasWidth;
      const deltaY = (moveEvt.clientY - state.startPointer.y) / state.canvasHeight;

      if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
        state.hasMutated = true;
      }

      const snap = (v) => snapToGrid ? Math.round(v / 0.025) * 0.025 : v;

      setCreatedFields(prev => prev.map(f => {
        if (f.id !== state.fieldId) return f;
        const sr = state.startRect;

        if (state.type === 'move') {
          const w = sr.endXPercent - sr.startXPercent;
          const h = sr.endYPercent - sr.startYPercent;
          let newStartX = snap(sr.startXPercent + deltaX);
          let newStartY = snap(sr.startYPercent + deltaY);

          newStartX = Math.max(0, Math.min(1 - w, newStartX));
          newStartY = Math.max(0, Math.min(1 - h, newStartY));

          return {
            ...f,
            rect: {
              startXPercent: newStartX,
              startYPercent: newStartY,
              endXPercent: newStartX + w,
              endYPercent: newStartY + h
            }
          };
        }

        if (state.type === 'resize') {
          let startX = sr.startXPercent;
          let endX = sr.endXPercent;
          let startY = sr.startYPercent;
          let endY = sr.endYPercent;
          const hId = state.handle;

          if (hId.includes('w')) {
            const raw = snap(sr.startXPercent + deltaX);
            startX = Math.max(0, Math.min(endX - 0.02, raw));
          }
          if (hId.includes('e')) {
            const raw = snap(sr.endXPercent + deltaX);
            endX = Math.min(1.0, Math.max(startX + 0.02, raw));
          }
          if (hId.includes('n')) {
            const raw = snap(sr.startYPercent + deltaY);
            startY = Math.max(0, Math.min(endY - 0.02, raw));
          }
          if (hId.includes('s')) {
            const raw = snap(sr.endYPercent + deltaY);
            endY = Math.min(1.0, Math.max(startY + 0.02, raw));
          }

          return {
            ...f,
            rect: {
              startXPercent: startX,
              startYPercent: startY,
              endXPercent: endX,
              endYPercent: endY
            }
          };
        }

        return f;
      }));
    };

    const handlePointerUp = () => {
      if (transformStateRef.current) {
        if (transformStateRef.current.hasMutated) {
          setUndoStack(prev => [...prev.slice(-30), transformStateRef.current.snapshot]);
          setRedoStack([]);
        }
        transformStateRef.current = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const updateFieldProperty = (id, prop, val) => {
    pushSnapshot();
    setCreatedFields(prev => prev.map(f => (f.id === id ? { ...f, [prop]: val } : f)));
  };

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('pdf-forms');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'form.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.activeMode) setActiveMode(draft.activeMode);
          if (draft.creatorTool) setCreatorTool(draft.creatorTool);
          if (draft.createdFields) setCreatedFields(draft.createdFields);
          if (draft.fieldValues) setFieldValues(draft.fieldValues);
          if (draft.snapToGrid !== undefined) setSnapToGrid(draft.snapToGrid);
          if (draft.flattenFields !== undefined) setFlattenFields(draft.flattenFields);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('PDF forms draft recovery failed:', err);
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
      saveStudioDraft('pdf-forms', {
        files,
        activeMode,
        creatorTool,
        createdFields,
        fieldValues,
        snapToGrid,
        flattenFields,
        outputFileName
      });
    }
  }, [files, activeMode, creatorTool, createdFields, fieldValues, snapToGrid, flattenFields, outputFileName]);

  // 3. Scan PDF for form fields and load document pages
  useEffect(() => {
    if (files.length === 0) {
      setFormFields([]);
      setFieldValues({});
      setCreatedFields([]);
      setScanMessage('');
      setPdfDocument(null);
      setPageViewport(null);
      setTotalPages(0);
      setCurrentPage(1);
      setActiveMode('fill');
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const scanFormAndLoadPdf = async () => {
      setScanning(true);
      setCanvasLoading(true);
      setScanMessage('Scanning document structure and AcroForm fields...');
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

        // Extract fields via PDF-lib
        const fields = await getFormFields(file);
        if (isCancelled) return;
        setFormFields(fields);

        // Check if session cache exists for activeFileIndex
        const session = fileSessionsRef.current[activeFileIndex];
        if (session) {
          setCreatedFields(session.createdFields || []);
          setFieldValues(session.fieldValues || {});
          setUndoStack(session.undoStack || []);
          setRedoStack(session.redoStack || []);
        } else {
          // Initialize state values map if empty
          setFieldValues(prev => {
            const initialVals = { ...prev };
            fields.forEach(f => {
              if (initialVals[f.name] === undefined) {
                initialVals[f.name] = f.value;
              }
            });
            return initialVals;
          });
        }

        if (fields.length === 0) {
          setScanMessage('No existing interactive fields detected. Switch to "Place New Fields" to add fields.');
          if (createdFields.length === 0) {
            setActiveMode('create');
          }
        } else {
          setScanMessage(`Scan complete: Found ${fields.length} interactive fields.`);
          setActiveMode('fill');
        }

        if (!outputFileName) {
          const base = file.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_filled.pdf`);
        }
      } catch {
        if (!isCancelled) {
          setError('Failed to process PDF form. Make sure the document is not password locked or corrupted.');
        }
      } finally {
        if (!isCancelled) {
          setScanning(false);
          setCanvasLoading(false);
        }
      }
    };

    scanFormAndLoadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, activeFileIndex]);

  // Sync active file session cache on state mutations
  useEffect(() => {
    if (files.length > 0) {
      fileSessionsRef.current[activeFileIndex] = {
        createdFields,
        fieldValues,
        undoStack,
        redoStack
      };
    }
  }, [activeFileIndex, createdFields, fieldValues, undoStack, redoStack, files]);

  // Global Keyboard Shortcuts & Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      const isEditingInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      // Shortcuts for Undo / Redo
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            if (!isEditingInput) {
              e.preventDefault();
              handleRedo();
              return;
            }
          } else {
            if (!isEditingInput) {
              e.preventDefault();
              handleUndo();
              return;
            }
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          if (!isEditingInput) {
            e.preventDefault();
            handleRedo();
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        if (isEditingInput) {
          e.target?.blur?.();
        }
        setSelectedFieldId(null);
        return;
      }

      if (isEditingInput) return;

      if (selectedFieldId) {
        const field = createdFields.find(f => f.id === selectedFieldId);
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          if (field) {
            deleteCreatedField(field.id, field.name);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedFieldId(null);
          return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          if (!field) return;
          const delta = e.shiftKey ? 0.02 : 0.005; // 2.0% with Shift, 0.5% default
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowLeft') dx = -delta;
          if (e.key === 'ArrowRight') dx = delta;
          if (e.key === 'ArrowUp') dy = -delta;
          if (e.key === 'ArrowDown') dy = delta;

          const w = field.rect.endXPercent - field.rect.startXPercent;
          const h = field.rect.endYPercent - field.rect.startYPercent;
          const newStartX = Math.max(0, Math.min(1 - w, field.rect.startXPercent + dx));
          const newStartY = Math.max(0, Math.min(1 - h, field.rect.startYPercent + dy));

          pushSnapshot();
          setCreatedFields(prev => prev.map(f => {
            if (f.id !== selectedFieldId) return f;
            return {
              ...f,
              rect: {
                ...f.rect,
                startXPercent: newStartX,
                startYPercent: newStartY,
                endXPercent: newStartX + w,
                endYPercent: newStartY + h
              }
            };
          }));
          return;
        }
      } else {
        // No field selected: page navigation
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          setCurrentPage(p => Math.max(1, p - 1));
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          setCurrentPage(p => Math.min(totalPages, p + 1));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, createdFields, undoStack, redoStack, totalPages]);

  // 4. Render Active PDF Page to Live Viewport Canvas
  useEffect(() => {
    if (!pdfDocument) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (currentRenderTaskRef.current) {
          try { currentRenderTaskRef.current.cancel(); } catch {}
          currentRenderTaskRef.current = null;
        }

        const page = await pdfDocument.getPage(currentPage);
        const canvas = pdfCanvasRef.current;
        if (!canvas || isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });
        setPageViewport(baseViewport);

        const scaleMultiplier = getScaleMultiplier(debouncedRenderZoom);
        const viewport = page.getViewport({ scale: scaleMultiplier });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const task = page.render({ canvasContext: ctx, viewport });
        currentRenderTaskRef.current = task;
        await task.promise;
        if (isCancelled) return;

        // Universal Smart Cropper: Content-aware border detection (3-pass pipeline)
        const detection = cropper.runDetection(currentPage, baseViewport);

        // If Smart Cropper is active, clean and refit the preview canvas
        if (cropper.isActive && (detection?.hasBlackBorders || cropper.hasDetectedBorders)) {
          cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);
        }

        // Auto-detect form boxes on initial load if document has 0 AcroForm fields and no fields placed yet on this page
        const pageKey = `${activeFileIndex}_${currentPage}`;
        if (formFields.length === 0 && !scannedPagesRef.current.has(pageKey)) {
          scannedPagesRef.current.add(pageKey);
          const pageIdx = currentPage - 1;
          const detected = detectCanvasFormBoxes(canvas, pageIdx);
          if (detected.length > 0) {
            setCreatedFields(prev => {
              const existingOnPage = prev.filter(f => f.pageIndex === pageIdx);
              if (existingOnPage.length > 0) return prev;
              return [...prev, ...detected];
            });
            setActiveMode('fill');
            setScanMessage(`Analyzed Page ${currentPage}: ${detected.length} form boxes detected. Click any box to type directly.`);
          }
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering form PDF page:', err);
        }
      } finally {
        currentRenderTaskRef.current = null;
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try { currentRenderTaskRef.current.cancel(); } catch {}
        currentRenderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, debouncedRenderZoom, dpi, cropper.isActive, cropper.cleanMargin, cropper.enabledEdges, getScaleMultiplier, activeFileIndex, formFields]);

  const handleValueChange = (name, val) => {
    pushSnapshot();
    setFieldValues(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleStartDrag = (e) => {
    if (activeMode !== 'create') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const snapX = snapValue(x);
    const snapY = snapValue(y);
    setDragStart({ xPercent: snapX, yPercent: snapY });
    setDragCurrent({ xPercent: snapX, yPercent: snapY });
  };

  const handleDrag = (e) => {
    if (activeMode !== 'create' || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDragCurrent({ xPercent: snapValue(x), yPercent: snapValue(y) });
  };

  const handleStopDrag = () => {
    if (activeMode !== 'create' || !dragStart || !dragCurrent) return;

    const start = dragStart;
    const end = dragCurrent;
    setDragStart(null);
    setDragCurrent(null);

    const dx = Math.abs(start.xPercent - end.xPercent);
    const dy = Math.abs(start.yPercent - end.yPercent);

    if (dx > 0.015 && dy > 0.015) {
      pushSnapshot();
      const generatedName = `${creatorTool}_${createdFields.length + 1}`;
      const isRadio = creatorTool === 'radio';
      let options = creatorTool === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : null;
      let radioValue = isRadio ? `Option_${createdFields.length + 1}` : '';

      const newField = {
        id: Math.random().toString(36).substr(2, 6),
        name: generatedName,
        type: creatorTool,
        options,
        value: radioValue,
        pageIndex: currentPage - 1,
        rect: {
          startXPercent: Math.min(start.xPercent, end.xPercent),
          startYPercent: Math.min(start.yPercent, end.yPercent),
          endXPercent: Math.max(start.xPercent, end.xPercent),
          endYPercent: Math.max(start.yPercent, end.yPercent)
        },
        backgroundColor: '#ffffff',
        borderColor: '#2563eb',
        borderWidth: 1
      };

      setCreatedFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setFieldValues(prev => ({
        ...prev,
        [generatedName]: prev[generatedName] !== undefined ? prev[generatedName] : (creatorTool === 'checkbox' ? false : '')
      }));
    }
  };

  const deleteCreatedField = (id, name) => {
    pushSnapshot();
    setCreatedFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    setFieldValues(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleFill = async () => {
    if (!files.length) return;
    if (formFields.length === 0 && createdFields.length === 0) {
      setError('No fields are available to fill or compile.');
      return;
    }

    setProcessing(true);
    setProgress(15);
    setError(null);
    setResult(null);

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_filled.pdf`;

    try {
      setProgress(40);
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(file, pdfjsLib, (p) => setProgress(Math.round(p * 0.25)))
        : cropper.getEngineOptions());

      let outputBlob;
      if (createdFields.length > 0) {
        outputBlob = await compileFormWithNewFields(
          file,
          createdFields,
          fieldValues,
          (p) => setProgress(p),
          flattenFields,
          cropperOptions
        );
      } else {
        outputBlob = await fillFormFields(
          file,
          fieldValues,
          (p) => setProgress(p),
          flattenFields,
          cropperOptions
        );
      }

      setProgress(85);
      const totalFieldsCount = formFields.length + createdFields.length;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        pageCount: totalPages,
        fieldCount: totalFieldsCount,
        flattened: flattenFields
      });

      await saveFile(finalName, outputBlob.size, 'application/pdf', 'PDF Forms', outputBlob);
      await clearStudioDraft('pdf-forms');
      setProgress(100);
    } catch (err) {
      console.error('PDF form compilation error:', err);
      setError(err.message || 'Failed to fill and compile PDF form.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('pdf-forms');
    fileSessionsRef.current = {};
    setUndoStack([]);
    setRedoStack([]);
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setFormFields([]);
    setFieldValues({});
    setCreatedFields([]);
    setSelectedFieldId(null);
    setScanMessage('');
    setActiveMode('fill');
    setCreatorTool('text');
    setFlattenFields(false);
    setOutputFileName('');
    setPageViewport(null);
    setFieldListFilter('all');
    cropper.revert();
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  const handleExportCsv = () => {
    const allFields = [...formFields, ...createdFields];
    if (!allFields.length) return;
    const csv = exportFormToCsv(allFields, fieldValues);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${(files[activeFileIndex]?.name || 'form').replace(/\.[^.]+$/, '')}_data.csv`);
  };

  const handleExportJson = () => {
    const allFields = [...formFields, ...createdFields];
    if (!allFields.length) return;
    const json = exportFormToJson(allFields, fieldValues);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `${(files[activeFileIndex]?.name || 'form').replace(/\.[^.]+$/, '')}_data.json`);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const data = parsed.fields || parsed;
        const newVals = {};
        Object.entries(data).forEach(([key, val]) => {
          if (val && typeof val === 'object' && 'value' in val) {
            newVals[key] = val.value;
          } else {
            newVals[key] = val;
          }
        });
        setFieldValues(prev => ({ ...prev, ...newVals }));
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activePageIndex = currentPage - 1;
  const pageCreatedFields = createdFields.filter(f => f.pageIndex === activePageIndex);
  const selectedField = createdFields.find(f => f.id === selectedFieldId);

  const activePageExistingWidgets = useMemo(() => {
    if (!pageViewport || !formFields.length) return [];
    const widgets = [];
    formFields.forEach(f => {
      if (!f.widgets || !f.widgets.length) return;
      f.widgets.forEach((w, wIdx) => {
        if (w.pageIndex === activePageIndex && w.rect) {
          try {
            const vpRect = pageViewport.convertToViewportRectangle([
              w.rect.x,
              w.rect.y,
              w.rect.x + w.rect.width,
              w.rect.y + w.rect.height
            ]);
            const minX = Math.min(vpRect[0], vpRect[2]);
            const maxX = Math.max(vpRect[0], vpRect[2]);
            const minY = Math.min(vpRect[1], vpRect[3]);
            const maxY = Math.max(vpRect[1], vpRect[3]);
            widgets.push({
              id: `existing_${f.name}_${wIdx}`,
              name: f.name,
              type: f.type,
              options: f.options,
              onValue: w.onValue || (f.options && f.options[wIdx]) || '',
              isMultiline: f.multiline || Boolean(w.rect && w.rect.height > 35) || false,
              leftPct: (minX / pageViewport.width) * 100,
              topPct: (minY / pageViewport.height) * 100,
              widthPct: ((maxX - minX) / pageViewport.width) * 100,
              heightPct: ((maxY - minY) / pageViewport.height) * 100
            });
          } catch {}
        }
      });
    });
    return widgets;
  }, [pageViewport, formFields, activePageIndex]);

  const displayedFields = useMemo(() => {
    const all = [...formFields, ...createdFields];
    if (fieldListFilter !== 'page') return all;
    return all.filter(f => {
      if (f.pageIndex !== undefined) return f.pageIndex === activePageIndex;
      if (f.widgets && f.widgets.length > 0) {
        return f.widgets.some(w => w.pageIndex === activePageIndex);
      }
      return true;
    });
  }, [formFields, createdFields, fieldListFilter, activePageIndex]);

  return (
    <ToolPageLayout
      toolId="pdf-forms"
      title="PDF Forms Studio"
      description="Fill interactive forms, place new fillable fields visually, or flatten PDF forms into static documents."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF Form Creator & Filler Online Free — Edit Fillable PDFs | DocScalar"
        description="Place fillable fields visually or fill and save interactive PDF form fields instantly. Secure encrypted in memory processing."
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
            {/* LEFT / CENTER: Interactive Canvas Viewport                                */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] shrink-0">
                <div className="workspace-toolbar px-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 overflow-x-auto no-scrollbar shrink-0 min-h-[48px]">
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            switchFile(parseInt(e.target.value));
                          }}
                          aria-label="Active PDF Document File"
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[130px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[130px]" title={files[0]?.name}>
                          {files[0]?.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                          ({formatFileSize(files[0]?.size || 0)})
                        </span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    {totalPages > 0 && (
                      <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1.5 py-0.5 shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page"
                          aria-label="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-1.5 text-[var(--text-primary)] select-none whitespace-nowrap">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="w-6 h-6 flex items-center justify-center hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page"
                          aria-label="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {/* Undo / Redo Buttons */}
                    <div className="h-8 flex items-center gap-0.5 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-1 rounded hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo action"
                      >
                        <span className="material-symbols-outlined text-[16px] block">undo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-1 rounded hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                        aria-label="Redo action"
                      >
                        <span className="material-symbols-outlined text-[16px] block">redo</span>
                      </button>
                    </div>

                    {/* Mode Switcher Buttons */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveMode('fill')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                          activeMode === 'fill'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        <span>Fill Fields</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode('create')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                          activeMode === 'create'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">add_box</span>
                        <span>Place New Fields</span>
                      </button>
                    </div>

                    {/* Visual Form Box Auto-Detector */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={handleAutoDetectCurrentPage}
                        disabled={isAutoDetecting}
                        className="px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30"
                        title="Scan page to detect form boxes and type directly"
                        aria-label="Scan form boxes on current page"
                      >
                        <span className={`material-symbols-outlined text-[14px] ${isAutoDetecting ? 'animate-spin' : ''}`}>
                          {isAutoDetecting ? 'progress_activity' : 'document_scanner'}
                        </span>
                        <span>Scan Boxes</span>
                      </button>
                    </div>

                    {/* Creator Tool Quick Strip (Visible in create mode) */}
                    {activeMode === 'create' && (
                      <div className="h-8 flex items-center gap-0.5 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] shrink-0">
                        {CREATOR_TOOLS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setCreatorTool(t.id)}
                            className={`p-1 rounded-md cursor-pointer transition-all ${
                              creatorTool === t.id
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            title={`${t.label}: ${t.desc}`}
                          >
                            <span className="material-symbols-outlined text-[16px] block">{t.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Zoom, Grid & Reset */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeMode === 'create' && (
                      <button
                        type="button"
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`h-8 px-2 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                          snapToGrid
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                        title="Snap to 2.5% Grid"
                      >
                        <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
                        <span className="hidden sm:inline">Grid Snap</span>
                      </button>
                    )}

                    {/* Precision Step Zoom Widget */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setZoomScale((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
                        disabled={zoomScale <= 0.3}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] disabled:opacity-30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Zoom Out"
                        aria-label="Zoom Out"
                      >
                        <span className="material-symbols-outlined text-[15px]">remove</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(1.0)}
                        className="text-[11px] font-bold text-[var(--text-primary)] px-1.5 min-w-[42px] text-center select-none hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        title="Click to reset zoom (100%)"
                      >
                        {Math.round(zoomScale * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale((z) => Math.min(3.0, +(z + 0.1).toFixed(2)))}
                        disabled={zoomScale >= 3.0}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] disabled:opacity-30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Zoom In"
                        aria-label="Zoom In"
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
                      className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Reset workspace"
                      aria-label="Reset workspace"
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
                        {cropper.scope === 'single' ? ` (Page ${currentPage})` : ' (All Pages)'}
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

              {/* Viewport Canvas Frame with Live Forms Layer */}
              <div className="flex-1 flex min-h-0 overflow-hidden relative">
                {/* Left Vertical Page Thumbnail Strip */}
                {totalPages > 1 && (
                  <div
                    className="w-28 min-w-28 max-w-28 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]/70 backdrop-blur-xs flex flex-col items-center gap-2 p-2 overflow-y-auto select-none z-10 shrink-0"
                    role="navigation"
                    aria-label="Document page navigation"
                  >
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrent = currentPage === pageNum;
                      const pageFieldCount =
                        createdFields.filter((f) => f.pageIndex === i).length +
                        formFields.filter((f) => f.widgets && f.widgets.some((w) => w.pageIndex === i)).length;

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-full py-2 px-1.5 rounded-xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                          aria-label={`Jump to page ${pageNum}, ${pageFieldCount} fields`}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">description</span>
                            <span className="text-[11px] font-bold">Page {pageNum}</span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isCurrent
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                            }`}
                          >
                            P.{pageNum} ({pageFieldCount} {pageFieldCount === 1 ? 'field' : 'fields'})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div
                  ref={containerRef}
                  className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none"
                >
                  <div
                    ref={canvasFrameRef}
                    className="relative my-auto bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
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

                    {/* Rendered PDF Page Base Canvas */}
                    <canvas
                      ref={pdfCanvasRef}
                      className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none block"
                    />

                    {/* Loading Spinner Overlay */}
                    {(canvasLoading || scanning) && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
                        <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">{scanMessage || 'Loading form document...'}</span>
                      </div>
                    )}

                    {/* Drag-to-Place Drawing Overlay Layer (In create mode) */}
                    {activeMode === 'create' && (
                      <div
                        onPointerDown={handleStartDrag}
                        onPointerMove={handleDrag}
                        onPointerUp={handleStopDrag}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20 touch-none"
                      >
                        {/* Drag preview box */}
                        {dragStart && dragCurrent && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${Math.min(dragStart.xPercent, dragCurrent.xPercent) * 100}%`,
                              top: `${Math.min(dragStart.yPercent, dragCurrent.yPercent) * 100}%`,
                              width: `${Math.abs(dragStart.xPercent - dragCurrent.xPercent) * 100}%`,
                              height: `${Math.abs(dragStart.yPercent - dragCurrent.yPercent) * 100}%`
                            }}
                            className="border-2 border-dashed border-blue-500 bg-blue-500/20 rounded pointer-events-none flex items-center justify-center text-[10px] font-bold text-blue-700"
                          >
                            New {creatorTool}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Existing AcroForm Widgets Overlay Layer (When in fill mode) */}
                    {/* Interactive Existing AcroForm Widgets Overlay Layer (When in fill mode) */}
                    {activeMode === 'fill' && activePageExistingWidgets.map((w, wIdx) => {
                      const val = fieldValues[w.name] ?? '';
                      const isSelected = selectedFieldId === w.id;
                      const fontSize = Math.max(9.5, Math.min(12.5, Math.round(11 * zoomScale)));

                      return (
                        <div
                          key={w.id}
                          style={{
                            position: 'absolute',
                            left: `${w.leftPct}%`,
                            top: `${w.topPct}%`,
                            width: `${w.widthPct}%`,
                            height: `${w.heightPct}%`,
                            zIndex: isSelected ? 30 : 22
                          }}
                          className="group transition-all rounded-xs"
                        >
                          {w.type === 'checkbox' ? (
                            <div className="w-full h-full flex items-center justify-center bg-transparent hover:bg-white/60 border border-slate-400/60 hover:border-blue-500 rounded-xs cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(fieldValues[w.name])}
                                onChange={(e) => handleValueChange(w.name, e.target.checked)}
                                className="w-full h-full accent-[var(--color-primary)] cursor-pointer opacity-90"
                                title={w.name}
                                aria-label={w.name}
                              />
                            </div>
                          ) : w.type === 'select' ? (
                            <select
                              value={fieldValues[w.name] ?? ''}
                              onChange={(e) => handleValueChange(w.name, e.target.value)}
                              className="w-full h-full bg-white/90 hover:bg-white text-slate-900 text-[11px] font-normal border border-slate-300 hover:border-blue-400 focus:border-[var(--color-primary)] rounded-xs px-1.5 outline-none cursor-pointer shadow-2xs"
                              title={w.name}
                              aria-label={w.name}
                            >
                              <option value="">Select option...</option>
                              {w.options?.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : w.type === 'radio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-transparent hover:bg-white/60 border border-slate-400/60 hover:border-blue-500 rounded-full cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name={w.name}
                                value={w.onValue || w.name}
                                checked={fieldValues[w.name] === (w.onValue || w.name)}
                                onChange={() => handleValueChange(w.name, w.onValue || w.name)}
                                aria-label={`${w.name}: ${w.onValue || w.name}`}
                                title={`${w.name}: ${w.onValue || w.name}`}
                                className="w-3/4 h-3/4 accent-[var(--color-primary)] cursor-pointer"
                              />
                            </div>
                          ) : w.isMultiline ? (
                            <textarea
                              value={val}
                              onChange={(e) => handleValueChange(w.name, e.target.value)}
                              placeholder=""
                              aria-label={`${w.name}: multiline`}
                              title={w.name}
                              tabIndex={wIdx + 1}
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.35 }}
                              className="w-full h-full font-sans font-normal text-slate-900 p-1.5 outline-none resize-none cursor-text transition-all rounded-xs bg-transparent hover:bg-blue-50/20 focus:bg-white border border-transparent hover:border-blue-400/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:shadow-xs"
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => handleValueChange(w.name, e.target.value)}
                              placeholder=""
                              aria-label={w.name}
                              title={w.name}
                              tabIndex={wIdx + 1}
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
                              className="w-full h-full font-sans font-normal text-slate-900 px-2 outline-none cursor-text transition-all rounded-xs bg-transparent hover:bg-blue-50/20 focus:bg-white border border-transparent hover:border-blue-400/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:shadow-xs"
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* Interactive Created Fields Overlays */}
                    {pageCreatedFields.map((field, fIdx) => {
                      const isSelected = selectedFieldId === field.id;
                      const left = `${field.rect.startXPercent * 100}%`;
                      const top = `${field.rect.startYPercent * 100}%`;
                      const width = `${(field.rect.endXPercent - field.rect.startXPercent) * 100}%`;
                      const height = `${(field.rect.endYPercent - field.rect.startYPercent) * 100}%`;
                      const heightPt = (field.rect.endYPercent - field.rect.startYPercent) * (pageDimensions.height || 842);
                      const isMultiline = field.multiline || heightPt > 35;
                      const val = fieldValues[field.name] ?? '';
                      const fontSize = Math.max(9.5, Math.min(12.5, Math.round(11 * zoomScale)));

                      return (
                        <div
                          key={field.id}
                          onClick={(e) => {
                            if (activeMode === 'create') {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                            }
                          }}
                          onPointerDown={(e) => {
                            if (activeMode === 'create') {
                              setSelectedFieldId(field.id);
                              if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
                                handleStartTransform(e, 'move', field.id);
                              }
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left,
                            top,
                            width,
                            height,
                            zIndex: isSelected ? 30 : 25
                          }}
                          className={`group transition-all ${
                            activeMode === 'create'
                              ? (isSelected ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 z-30' : 'hover:ring-1 hover:ring-blue-400')
                              : (isSelected ? 'z-30' : '')
                          }`}
                        >
                          {/* 8-point resize handles and move handle when selected in create mode */}
                          {activeMode === 'create' && isSelected && (
                            <>
                              {/* Move handle */}
                              <div
                                onPointerDown={(e) => handleStartTransform(e, 'move', field.id)}
                                className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary)] text-white shadow-md cursor-move z-40 hover:scale-110 transition-transform"
                                title="Drag to reposition field"
                                aria-label="Move handle"
                              >
                                <span className="material-symbols-outlined text-[14px]">open_with</span>
                              </div>

                              {/* 8 Resize handles */}
                              {RESIZE_HANDLES.map((h) => (
                                <div
                                  key={h.id}
                                  onPointerDown={(e) => handleStartTransform(e, 'resize', field.id, h.id)}
                                  className={`absolute w-2.5 h-2.5 bg-white border-2 border-[var(--color-primary)] rounded-full z-40 shadow-xs hover:scale-125 transition-transform ${h.className}`}
                                  style={{ cursor: h.cursor }}
                                  title={`Resize ${h.id}`}
                                  aria-label={`Resize handle ${h.id}`}
                                />
                              ))}
                            </>
                          )}

                          {field.type === 'checkbox' ? (
                            <div className={`w-full h-full flex items-center justify-center rounded-xs cursor-pointer transition-colors ${
                              activeMode === 'fill'
                                ? 'bg-transparent hover:bg-white/60 border border-slate-400/60 hover:border-blue-500'
                                : 'bg-white/90 border border-blue-500'
                            }`}>
                              <input
                                type="checkbox"
                                checked={Boolean(fieldValues[field.name])}
                                onChange={(e) => handleValueChange(field.name, e.target.checked)}
                                aria-label={`Created Checkbox: ${field.name}`}
                                className="w-full h-full accent-[var(--color-primary)] cursor-pointer"
                              />
                            </div>
                          ) : field.type === 'select' ? (
                            <select
                              value={fieldValues[field.name] || ''}
                              onChange={(e) => handleValueChange(field.name, e.target.value)}
                              aria-label={`Created Select: ${field.name}`}
                              className="w-full h-full bg-white/90 text-slate-800 text-[11px] font-normal border border-slate-300 hover:border-blue-500 rounded-xs px-1.5 outline-none cursor-pointer shadow-2xs"
                            >
                              <option value="">Select an option</option>
                              {field.options?.map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-transparent hover:bg-white/60 border border-slate-400/60 hover:border-blue-500 rounded-full cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name={field.name}
                                value={field.value || field.name}
                                checked={fieldValues[field.name] === (field.value || field.name)}
                                onChange={() => handleValueChange(field.name, field.value || field.name)}
                                aria-label={`Created Radio: ${field.name}`}
                                className="w-3/4 h-3/4 accent-[var(--color-primary)] cursor-pointer"
                              />
                            </div>
                          ) : isMultiline ? (
                            <textarea
                              value={val}
                              onChange={(e) => handleValueChange(field.name, e.target.value)}
                              onFocus={() => {
                                if (activeMode === 'create') setSelectedFieldId(field.id);
                              }}
                              onBlur={() => {
                                if (activeMode === 'fill') setSelectedFieldId(null);
                              }}
                              placeholder={activeMode === 'create' ? field.name : ''}
                              aria-label={`Created Textarea: ${field.name}`}
                              tabIndex={fIdx + 1}
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.35 }}
                              className={`w-full h-full font-sans font-normal text-slate-900 outline-none resize-none p-1.5 cursor-text transition-all rounded-xs ${
                                activeMode === 'fill'
                                  ? 'bg-transparent hover:bg-blue-50/20 focus:bg-white border border-transparent hover:border-blue-400/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:shadow-xs'
                                  : (isSelected
                                      ? 'bg-blue-50/90 border border-dashed border-blue-500 rounded ring-2 ring-[var(--color-primary)]'
                                      : 'bg-blue-50/90 border border-dashed border-blue-500 rounded')
                              }`}
                            />
                          ) : (field.subtype === 'underline' || field.underline) ? (
                            <div className="w-full h-full flex items-end">
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                onFocus={() => {
                                  if (activeMode === 'create') setSelectedFieldId(field.id);
                                }}
                                onBlur={() => {
                                  if (activeMode === 'fill') setSelectedFieldId(null);
                                }}
                                placeholder={activeMode === 'create' ? field.name : ''}
                                aria-label={`Underline Input: ${field.name}`}
                                tabIndex={fIdx + 1}
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.1 }}
                                className={`w-full font-sans font-normal text-slate-900 outline-none px-1 pb-0.5 cursor-text transition-all bg-transparent border-b-2 ${
                                  activeMode === 'fill'
                                    ? 'border-transparent hover:border-blue-400/40 focus:border-[var(--color-primary)] focus:bg-white/80'
                                    : (isSelected
                                        ? 'border-[var(--color-primary)] bg-blue-50/90'
                                        : 'border-blue-400/80 bg-blue-50/70')
                                }`}
                              />
                            </div>
                          ) : (field.subtype === 'comb' || field.comb) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <input
                                type="text"
                                value={val}
                                maxLength={field.cellCount || 30}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                onFocus={() => {
                                  if (activeMode === 'create') setSelectedFieldId(field.id);
                                }}
                                onBlur={() => {
                                  if (activeMode === 'fill') setSelectedFieldId(null);
                                }}
                                placeholder={activeMode === 'create' ? field.name : ''}
                                aria-label={`Comb Field: ${field.name}`}
                                tabIndex={fIdx + 1}
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.2, letterSpacing: '0.42em' }}
                                className={`w-full h-full font-mono font-semibold text-center text-slate-900 outline-none px-1 cursor-text transition-all rounded-xs ${
                                  activeMode === 'fill'
                                    ? 'bg-transparent hover:bg-blue-50/20 focus:bg-white border border-transparent hover:border-blue-400/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30'
                                    : (isSelected
                                        ? 'bg-blue-50/90 border border-dashed border-blue-500 rounded ring-2 ring-[var(--color-primary)]'
                                        : 'bg-blue-50/90 border border-dashed border-blue-500 rounded')
                                }`}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center">
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                onFocus={() => {
                                  if (activeMode === 'create') setSelectedFieldId(field.id);
                                }}
                                onBlur={() => {
                                  if (activeMode === 'fill') setSelectedFieldId(null);
                                }}
                                placeholder={activeMode === 'create' ? field.name : ''}
                                aria-label={`Created Text: ${field.name}`}
                                tabIndex={fIdx + 1}
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
                                className={`w-full font-sans font-normal text-slate-900 outline-none px-2 cursor-text transition-all rounded-xs ${
                                  activeMode === 'fill'
                                    ? 'bg-transparent hover:bg-blue-50/20 focus:bg-white border border-transparent hover:border-blue-400/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:shadow-xs'
                                    : (isSelected
                                        ? 'bg-blue-50/90 border border-dashed border-blue-500 rounded ring-2 ring-[var(--color-primary)]'
                                        : 'bg-blue-50/90 border border-dashed border-blue-500 rounded')
                                }`}
                              />
                            </div>
                          )}

                          {activeMode === 'create' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCreatedField(field.id, field.name);
                              }}
                              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-50"
                              title="Delete Field"
                              aria-label={`Delete ${field.name}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">dynamic_form</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Forms Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {formFields.length + createdFields.length} Fields
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Quick Data Exchange Actions */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Form Data Exchange
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Export Form Data to CSV spreadsheet"
                      aria-label="Export Form Data to CSV"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold">CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Export Form Data to JSON structure"
                      aria-label="Export Form Data to JSON"
                    >
                      <Code className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-bold">JSON</span>
                    </button>

                    <label
                      className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer"
                      aria-label="Import JSON Form Data"
                    >
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold">Import</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportJson}
                        aria-label="Upload JSON file"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Form Utilities */}
                <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Form Utilities
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleClearAllValues}
                      className="px-2 py-1.5 text-xs font-semibold rounded-xl bg-[var(--bg-secondary)] hover:bg-amber-500/10 text-[var(--text-secondary)] hover:text-amber-600 dark:hover:text-amber-400 border border-[var(--border-subtle)] hover:border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Clear all entered field values"
                      aria-label="Clear All Values"
                    >
                      <span className="material-symbols-outlined text-[15px]">backspace</span>
                      <span className="truncate">Clear Values</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllFields}
                      className="px-2 py-1.5 text-xs font-semibold rounded-xl bg-[var(--bg-secondary)] hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 border border-[var(--border-subtle)] hover:border-red-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Reset all custom fields and values"
                      aria-label="Reset All Fields"
                    >
                      <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                      <span className="truncate">Reset Fields</span>
                    </button>
                  </div>
                </div>

                {/* 2. Inspector / Field Configuration */}
                {activeMode === 'create' && selectedField ? (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Field Inspector
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteCreatedField(selectedField.id, selectedField.name)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                        aria-label="Delete selected field"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-tertiary)]">Field Name</span>
                      <input
                        type="text"
                        value={selectedField.name}
                        onChange={(e) => updateFieldProperty(selectedField.id, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        aria-label="Field Name"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-tertiary)]">Field Type</span>
                      <select
                        value={selectedField.type}
                        onChange={(e) => updateFieldProperty(selectedField.id, 'type', e.target.value)}
                        aria-label="Field Type"
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-semibold outline-none cursor-pointer"
                      >
                        <option value="text">Text Input</option>
                        <option value="checkbox">Checkbox Box</option>
                        <option value="select">Dropdown Select</option>
                        <option value="radio">Radio Group Option</option>
                      </select>
                    </div>

                    {selectedField.type === 'select' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-tertiary)]">Dropdown Options (Comma separated)</span>
                        <input
                          type="text"
                          value={selectedField.options?.join(', ') || ''}
                          onChange={(e) => updateFieldProperty(selectedField.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          aria-label="Dropdown Options"
                          className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Document Fields List
                      </label>
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFieldListFilter('all')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            fieldListFilter === 'all'
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          All ({formFields.length + createdFields.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFieldListFilter('page')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            fieldListFilter === 'page'
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Page {currentPage}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                      {displayedFields.length === 0 ? (
                        <div className="p-4 text-center flex flex-col items-center gap-2.5 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-subtle)]">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">document_scanner</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-[var(--text-primary)]">No Interactive Fields</span>
                            <span className="text-[11px] text-[var(--text-tertiary)]">Scan this page to auto-detect form boxes for direct typing.</span>
                          </div>
                          <div className="flex flex-col w-full gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={handleAutoDetectCurrentPage}
                              disabled={isAutoDetecting}
                              className="w-full py-1.5 px-3 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                              <span>Auto-Detect Page Boxes</span>
                            </button>
                            {totalPages > 1 && (
                              <button
                                type="button"
                                onClick={handleAutoDetectAllPages}
                                disabled={isAutoDetecting}
                                className="w-full py-1.5 px-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">library_books</span>
                                <span>Scan All {totalPages} Pages</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        displayedFields.map((f, idx) => {
                          const fieldPage = f.pageIndex !== undefined
                            ? f.pageIndex + 1
                            : (f.widgets?.[0]?.pageIndex !== undefined ? f.widgets[0].pageIndex + 1 : null);

                          return (
                            <div
                              key={f.id || `field_${f.name}_${idx}`}
                              className="p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[130px]" title={f.name}>
                                    {f.name}
                                  </span>
                                  {fieldPage !== null && (
                                    <button
                                      type="button"
                                      onClick={() => setCurrentPage(fieldPage)}
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold cursor-pointer transition-colors ${
                                        currentPage === fieldPage
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                          : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                      }`}
                                      title={`Jump to Page ${fieldPage}`}
                                    >
                                      P.{fieldPage}
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                                  {f.type}
                                </span>
                              </div>

                              {f.type === 'checkbox' ? (
                                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(fieldValues[f.name])}
                                    onChange={(e) => handleValueChange(f.name, e.target.checked)}
                                    aria-label={f.name}
                                    className="w-3.5 h-3.5 accent-[var(--color-primary)] cursor-pointer"
                                  />
                                  <span>Checked</span>
                                </label>
                              ) : f.type === 'select' ? (
                                <select
                                  value={fieldValues[f.name] || ''}
                                  onChange={(e) => handleValueChange(f.name, e.target.value)}
                                  aria-label={f.name}
                                  className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] cursor-pointer"
                                >
                                  <option value="">-- Select option --</option>
                                  {f.options?.map((opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : f.type === 'radio' ? (
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  {f.options && f.options.length > 0 ? (
                                    f.options.map((opt, i) => (
                                      <label key={i} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                                        <input
                                          type="radio"
                                          name={f.name}
                                          value={opt}
                                          checked={fieldValues[f.name] === opt}
                                          onChange={() => handleValueChange(f.name, opt)}
                                          aria-label={`${f.name}: ${opt}`}
                                          className="w-3 h-3 accent-[var(--color-primary)] cursor-pointer"
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))
                                  ) : (
                                    <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                                      <input
                                        type="radio"
                                        name={f.name}
                                        value={f.name}
                                        checked={fieldValues[f.name] === f.name || fieldValues[f.name] === true}
                                        onChange={() => handleValueChange(f.name, f.name)}
                                        aria-label={`${f.name}: selected`}
                                        className="w-3 h-3 accent-[var(--color-primary)] cursor-pointer"
                                      />
                                      <span>Selected</span>
                                    </label>
                                  )}
                                </div>
                              ) : isMultilineField(f) ? (
                                <textarea
                                  value={fieldValues[f.name] || ''}
                                  onChange={(e) => handleValueChange(f.name, e.target.value)}
                                  placeholder={`Enter ${f.name}...`}
                                  aria-label={f.name}
                                  rows={3}
                                  className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] resize-y"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={fieldValues[f.name] || ''}
                                  onChange={(e) => handleValueChange(f.name, e.target.value)}
                                  placeholder={`Enter ${f.name}...`}
                                  aria-label={f.name}
                                  className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Flatten Form Option */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Flatten Form Fields</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Bake into static permanent text</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={flattenFields}
                      onChange={(e) => setFlattenFields(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* Universal Smart Cropper Panel */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <SmartCropperPanel
                    cropper={cropper}
                    totalPages={totalPages}
                    onActivate={() => {}}
                    onRevert={() => {}}
                  />
                </div>

                {/* 4. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_filled.pdf"
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
                        Compiling form document...
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
                  onClick={handleFill}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Compiling ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Save & Compile PDF Form</span>
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
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Form Saved!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.flattened
                  ? 'All form fields have been baked and flattened into permanent PDF content.'
                  : 'Interactive AcroForm values and widgets have been embedded.'}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Fields</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.fieldCount || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Mode</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {result.flattened ? 'Flattened' : 'Interactive'}
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
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Form PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Fill Another Form</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
