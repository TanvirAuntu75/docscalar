import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { mergePdfs } from '../../engines/pdf/mergePdf';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { formatFileSize } from '../../utils/constants';
import MergeProgressModal from '../../components/MergeProgressModal';
import SmartCropperToolbarButton from '../../components/SmartCropperToolbarButton';
import SmartCropperModal from '../../components/SmartCropperModal';
import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';
import {
  shouldAutoShowSmartCropModal,
  shouldAutoApplySmartCrop,
  getSmartCropPreference,
  setSmartCropPreference
} from '../../utils/smartCropperStorage';
import { countPagesInRange, validatePageRange, sanitizePdfFilename } from '../../engines/pdf/pageRangeUtils';
export { countPagesInRange, validatePageRange, sanitizePdfFilename };

import { releaseCanvas } from '../../utils/canvasLifecycle';
import { computeThumbnailViewport } from '../../utils/thumbnailHelper';
import * as pdfjsLib from 'pdfjs-dist';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Generates a DPR-aware thumbnail preview and inspects first page for scan borders.
 * Uses computeThumbnailViewport (targetWidth: 160, maxDpr: 2) and guarantees
 * immediate release of temporary canvas backing stores via releaseCanvas().
 * 
 * @param {object} firstPage - PDF.js PageProxy object
 * @param {File|object} [file] - Document file reference for logging
 * @param {object} [options={}] - Viewport and rendering options
 * @returns {Promise<{ thumbnailUrl: string|null, hasScanBorders: boolean, detectedCropBox: object|null, pdfCropBox: object|null, croppedThumbnailUrl: string|null, viewport: object }>}
 */
export async function generateThumbnail(firstPage, file, options = {}) {
  const viewport = computeThumbnailViewport(firstPage, {
    targetWidth: options.targetWidth || 160,
    maxDpr: options.maxDpr || 2,
    ...(options.rotation !== undefined ? { rotation: options.rotation } : {}),
    ...(options.dpr !== undefined ? { dpr: options.dpr } : {})
  });

  const canvas = options.canvas || (typeof document !== 'undefined' && document.createElement
    ? document.createElement('canvas')
    : null);

  if (!canvas) {
    return {
      thumbnailUrl: null,
      hasScanBorders: false,
      detectedCropBox: null,
      pdfCropBox: null,
      croppedThumbnailUrl: null,
      viewport
    };
  }

  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  let thumbnailUrl = null;
  let hasScanBorders = false;
  let detectedCropBox = null;
  let pdfCropBox = null;
  let croppedThumbnailUrl = null;

  try {
    if (ctx) {
      await firstPage.render({ canvasContext: ctx, viewport }).promise;
      thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

      // VisionClean: Smart Scan Border Analysis on First Page
      try {
        detectedCropBox = detectSmartBorders(canvas);
        if (detectedCropBox && detectedCropBox.hasBlackBorders) {
          hasScanBorders = true;
          pdfCropBox = computeCleanPdfCropBox(
            (firstPage.view && firstPage.view[2]) || viewport.width,
            (firstPage.view && firstPage.view[3]) || viewport.height,
            canvas.width,
            canvas.height,
            detectedCropBox
          );

          // Generate clean cropped thumbnail preview
          if (detectedCropBox.cleanBoxPx) {
            const { x, y, width: cw, height: ch } = detectedCropBox.cleanBoxPx;
            const cropCanvas = (typeof document !== 'undefined' && document.createElement)
              ? document.createElement('canvas')
              : null;
            if (cropCanvas) {
              cropCanvas.width = cw;
              cropCanvas.height = ch;
              try {
                const cropCtx = cropCanvas.getContext('2d');
                if (cropCtx) {
                  cropCtx.drawImage(canvas, x, y, cw, ch, 0, 0, cw, ch);
                  croppedThumbnailUrl = cropCanvas.toDataURL('image/jpeg', 0.85);
                }
              } finally {
                releaseCanvas(cropCanvas);
              }
            }
          }
        }
      } catch (cropErr) {
        console.warn('[DocScalar] Border detection error on', file?.name || 'file', cropErr);
      }
    }
  } finally {
    releaseCanvas(canvas);
  }

  return {
    thumbnailUrl,
    hasScanBorders,
    detectedCropBox,
    pdfCropBox,
    croppedThumbnailUrl,
    viewport
  };
}

export const getPagePreview = generateThumbnail;

export default function MergePdf() {
  const [files, setFiles] = useState([]);
  const [pdfItems, setPdfItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // VisionClean: Universal Smart Cropper
  const [smartCropActive, setSmartCropActive] = useState(() => shouldAutoApplySmartCrop());
  const [smartCropMargin, setSmartCropMargin] = useState(0);
  const [showSmartCropModal, setShowSmartCropModal] = useState(false);
  const [smartCropInfoOnly, setSmartCropInfoOnly] = useState(false);
  const [detectedScanFiles, setDetectedScanFiles] = useState([]);
  const [cropScope, setCropScope] = useState('detected'); // 'detected' | 'all' | 'custom'
  const [cropPageScope, setCropPageScope] = useState('all'); // 'all' | 'odd' | 'even' | 'custom'
  const [cropCustomRange, setCropCustomRange] = useState('');

  // Synchronize Smart Crop preference changes across tabs and tools
  useEffect(() => {
    const handlePrefChange = (e) => {
      const pref = e?.detail || getSmartCropPreference();
      if (pref?.dontShowAgain && pref?.rememberChoice === 'apply') {
        setSmartCropActive(true);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('docscalar_smart_crop_pref_changed', handlePrefChange);
      return () => window.removeEventListener('docscalar_smart_crop_pref_changed', handlePrefChange);
    }
  }, []);


  // Studio Options
  const [blankPageSeparator, setBlankPageSeparator] = useState(false);
  const [normalizePageSize, setNormalizePageSize] = useState('original');
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [outputFileName, setOutputFileName] = useState('merged.pdf');

  // Result Continuation File: passed in router state to seamlessly feed downstream tools
  const continuationFile = useMemo(() => {
    if (!result) return null;
    try {
      return new File([result], sanitizePdfFilename(outputFileName), {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    } catch (_) {
      return null;
    }
  }, [result, outputFileName]);

  // UI state
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2); // 1 = compact (140px), 2 = comfortable (185px), 3 = large (240px)
  const [cropToast, setCropToast] = useState(null);
  const [progressTelemetry, setProgressTelemetry] = useState({
    stage: 'Initializing...',
    currentFile: '',
    currentIndex: 0,
    totalFiles: 0
  });
  const [rangeEditState, setRangeEditState] = useState(null); // { id, draftValue, previousValue }

  // Undo stack for document deletion & clear all
  const undoStackRef = useRef([]);

  // Active merge cancellation ref
  const activeWorkerRef = useRef(null);

  // Active preview object URL ref for memory leak elimination
  const activePreviewUrlRef = useRef(null);

  // Restored draft items metadata ref for full fidelity session hydration
  const restoredItemsMetaRef = useRef(null);

  // Cache rendered thumbnail file references to eliminate redundant rendering loops
  const renderedFileIdsRef = useRef(new Set());

  // Refs
  const dragIndexRef = useRef(null);
  const cropToastTimeoutRef = useRef(null);
  const hasPromptedModalRef = useRef(false);
  const activeEditPopoverRef = useRef(null);
  const fileInputRef = useRef(null);
  const thumbnailAbortRef = useRef(new Map());

  // Desktop / OS File Drag and Drop Handlers on Canvas (Prevents browser navigation away from app)
  const handleCanvasDragOver = (e) => {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isCanvasDragOver) setIsCanvasDragOver(true);
    }
  };

  const handleCanvasDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsCanvasDragOver(false);
    }
  };

  const handleCanvasDrop = (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsCanvasDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (droppedFiles.length > 0) {
        setFiles((prev) => [...prev, ...droppedFiles]);
        if (smartCropActive && cropScope === 'all') {
          showCropToast(`Added ${droppedFiles.length} document(s) (Clean margins applied per Crop All)`, 'success');
        } else {
          showCropToast(`Added ${droppedFiles.length} document(s) to workspace`, 'success');
        }
      }
    }
  };

  const showCropToast = useCallback((message, type = 'success', action = null) => {
    if (cropToastTimeoutRef.current) {
      clearTimeout(cropToastTimeoutRef.current);
    }
    setCropToast({
      message,
      type,
      actionLabel: action?.actionLabel || action?.label,
      onAction: action?.onAction || action?.callback
    });
    cropToastTimeoutRef.current = setTimeout(() => {
      setCropToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (cropToastTimeoutRef.current) {
        clearTimeout(cropToastTimeoutRef.current);
      }
    };
  }, []);

  // Safe undo handler for document removal & full-canvas clearing
  const handleUndo = useCallback(() => {
    const lastAction = undoStackRef.current.pop();
    if (!lastAction) return;

    if (lastAction.type === 'single') {
      const { item, index } = lastAction;
      setPdfItems((prev) => {
        const next = [...prev];
        const insertIdx = Math.min(index, next.length);
        next.splice(insertIdx, 0, item);
        setFiles(next.map((it) => it.file));
        return next;
      });
      showCropToast(`Restored "${item.file.name}"`, 'success');
    } else if (lastAction.type === 'all') {
      const { pdfItems: restoredItems, files: restoredFiles, outputFileName: restoredName } = lastAction;
      setPdfItems(restoredItems);
      setFiles(restoredFiles);
      if (restoredName) setOutputFileName(restoredName);
      showCropToast(`Restored all ${restoredItems.length} documents`, 'success');
    }
  }, [showCropToast]);

  // Clean cancellation control for in-flight merge worker
  const handleCancelMerge = useCallback(() => {
    if (activeWorkerRef.current) {
      if (typeof activeWorkerRef.current.cancel === 'function') {
        activeWorkerRef.current.cancel();
      } else if (typeof activeWorkerRef.current.terminate === 'function') {
        activeWorkerRef.current.terminate();
      }
      activeWorkerRef.current = null;
    }
    setProcessing(false);
    setProgress(0);
    showCropToast('Merge operation cancelled', 'info');
  }, [showCropToast]);

  // Restore draft session on mount if available (with rotation & page range restoration)
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('merge-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          if (draft.itemsMeta && Array.isArray(draft.itemsMeta)) {
            restoredItemsMetaRef.current = draft.itemsMeta;
          }
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
          if (draft.blankPageSeparator !== undefined) setBlankPageSeparator(draft.blankPageSeparator);
          if (draft.normalizePageSize) setNormalizePageSize(draft.normalizePageSize);
          if (draft.addPageNumbers !== undefined) setAddPageNumbers(draft.addPageNumbers);
          if (draft.smartCropActive !== undefined) setSmartCropActive(draft.smartCropActive);
          if (draft.smartCropMargin) setSmartCropMargin(draft.smartCropMargin);
        }
      } catch (err) {
        console.warn('Merge draft restoration failed:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
      if (activePreviewUrlRef.current) {
        try { URL.revokeObjectURL(activePreviewUrlRef.current); } catch (_) {}
        activePreviewUrlRef.current = null;
      }
    };
  }, []);

  // Save draft session when files, items, or settings change (including per-item customizations)
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('merge-pdf', {
        files,
        outputFileName,
        blankPageSeparator,
        normalizePageSize,
        addPageNumbers,
        smartCropActive,
        smartCropMargin,
        itemsMeta: pdfItems.map((it) => ({
          name: it.file?.name,
          size: it.file?.size,
          rotation: it.rotation || 0,
          pageRange: it.pageRange || 'all',
          cropEnabled: it.cropEnabled,
          cropPageRange: it.cropPageRange,
          cropMargin: it.cropMargin
        }))
      });
    }
  }, [files, pdfItems, outputFileName, blankPageSeparator, normalizePageSize, addPageNumbers, smartCropActive, smartCropMargin]);

  // Page Range Editor handlers (with zero-falsy-trap and auto-revert when left empty)
  const handleStartRangeEdit = (item) => {
    if (rangeEditState?.id === item.id) {
      handleCommitRangeEdit();
      return;
    }
    if (rangeEditState) {
      handleCommitRangeEdit();
    }
    const currentVal = item.pageRange ?? 'all';
    setRangeEditState({
      id: item.id,
      draftValue: currentVal,
      previousValue: currentVal
    });
  };

  const handleCommitRangeEdit = () => {
    if (!rangeEditState) return;
    const { id, draftValue, previousValue } = rangeEditState;
    const trimmed = (draftValue || '').trim();
    if (trimmed === '') {
      // User left the box empty: "if i click on the other keeping the box here empty it should go back to the previous input i gave"
      setPdfItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, pageRange: previousValue } : it))
      );
    } else {
      setPdfItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, pageRange: trimmed } : it))
      );
    }
    setRangeEditState(null);
  };

  const handleRevertRangeEdit = () => {
    if (!rangeEditState) return;
    const { id, previousValue } = rangeEditState;
    setPdfItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, pageRange: previousValue } : it))
    );
    setRangeEditState(null);
  };

  // Close & commit page range popover when clicking outside ("on the other") or pressing Escape
  useEffect(() => {
    if (!rangeEditState) return;

    const handleClickOutside = (e) => {
      if (activeEditPopoverRef.current && !activeEditPopoverRef.current.contains(e.target)) {
        handleCommitRangeEdit();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRevertRangeEdit();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rangeEditState]);

  // Per-item crop helpers
  const isItemCropped = useCallback((item) => {
    if (!item || !smartCropActive) return false;
    if (item.cropEnabled !== undefined) return Boolean(item.cropEnabled);
    if (cropScope === 'all') return true;
    if (cropScope === 'detected') return Boolean(item.hasScanBorders);
    return false;
  }, [smartCropActive, cropScope]);

  const toggleItemCrop = (itemId) => {
    const target = pdfItems.find((it) => it.id === itemId);
    if (!target) return;
    if (!target.hasScanBorders) {
      const docName = target.file?.name ? `"${target.file.name}"` : 'document';
      showCropToast(`Clean document: Zero scan borders detected for ${docName}`, 'info');
      return;
    }
    const currentlyCropped = isItemCropped(target);
    const willEnable = !currentlyCropped;

    // Switch scope to 'selected' so individual file toggle never affects other documents
    setCropScope('selected');

    setPdfItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return { ...it, cropEnabled: willEnable };
        }
        return {
          ...it,
          cropEnabled: it.cropEnabled !== undefined ? it.cropEnabled : isItemCropped(it)
        };
      })
    );

    const remainingCroppedCount = pdfItems.filter((it) =>
      it.id === itemId ? willEnable : isItemCropped(it)
    ).length;

    setSmartCropActive(remainingCroppedCount > 0);

    const docName = target.file?.name ? `"${target.file.name}"` : 'document';
    if (willEnable) {
      showCropToast(`Cropped: Scan borders excised & original dimensions restored for ${docName}`, 'success');
    } else {
      showCropToast(`Uncropped: Original document restored for ${docName}`, 'info');
    }
  };

  const setItemCropRange = (itemId, range) => {
    setPdfItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, cropPageRange: range } : it))
    );
  };

  const setItemCropMargin = (itemId, margin) => {
    setPdfItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, cropMargin: margin } : it))
    );
  };

  // Sync files to pdfItems with thumbnail generation
  useEffect(() => {
    if (files.length === 0) {
      setPdfItems([]);
      return;
    }

    setPdfItems((prevItems) => {
      const existingMap = new Map(prevItems.map((item) => [item.file, item]));
      const usedIds = new Set();
      const savedMetaList = restoredItemsMetaRef.current;

      const isAllCropActive = smartCropActive && cropScope === 'all';
      const nextItems = files.map((file, idx) => {
        const existing = existingMap.get(file);
        if (existing && !usedIds.has(existing.id)) {
          usedIds.add(existing.id);
          return existing;
        }
        const newId = `pdf_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
        usedIds.add(newId);

        const savedMeta = savedMetaList
          ? (savedMetaList[idx] && savedMetaList[idx].name === file.name
              ? savedMetaList[idx]
              : savedMetaList.find((m) => m.name === file.name && m.size === file.size))
          : null;

        return {
          id: newId,
          file,
          pageCount: 1,
          thumbnailUrl: null,
          rotation: savedMeta?.rotation ?? 0,
          pageRange: savedMeta?.pageRange ?? 'all',
          cropEnabled: savedMeta?.cropEnabled !== undefined
            ? savedMeta.cropEnabled
            : (smartCropActive ? (cropScope === 'all' ? true : undefined) : undefined),
          cropPageRange: savedMeta?.cropPageRange,
          cropMargin: savedMeta?.cropMargin
        };
      });

      restoredItemsMetaRef.current = null;
      return nextItems;
    });

    // Render first page thumbnails for new items & inspect for scan borders
    files.forEach(async (file) => {
      if (renderedFileIdsRef.current.has(file)) return;
      renderedFileIdsRef.current.add(file);

      if (file.size === 0) {
        setPdfItems((prev) =>
          prev.map((item) =>
            item.file === file
              ? {
                  ...item,
                  isCorrupted: true,
                  corruptionError: `"${file.name}" is an empty file (0 bytes).`
                }
              : item
          )
        );
        showCropToast(`"${file.name}" is an empty file (0 bytes) and cannot be merged`, 'warning');
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;

        const firstPage = await pdf.getPage(1);
        const {
          thumbnailUrl,
          hasScanBorders,
          detectedCropBox,
          pdfCropBox,
          croppedThumbnailUrl
        } = await generateThumbnail(firstPage, file);


        setPdfItems((prev) =>
          prev.map((item) =>
            item.file === file
              ? {
                  ...item,
                  pageCount,
                  thumbnailUrl,
                  croppedThumbnailUrl: hasScanBorders ? croppedThumbnailUrl : null,
                  hasScanBorders,
                  detectedCropBox: hasScanBorders ? detectedCropBox : null,
                  pdfCropBox: hasScanBorders ? pdfCropBox : null,
                  cropEnabled: item.cropEnabled !== undefined
                    ? item.cropEnabled
                    : (smartCropActive
                        ? (cropScope === 'all' ? true : (cropScope === 'detected' ? Boolean(hasScanBorders) : false))
                        : false),
                  cropPageRange: item.cropPageRange || 'all',
                  cropMargin: 0
                }
              : item
          )
        );

        if (hasScanBorders) {
          setDetectedScanFiles((prev) => (prev.includes(file.name) ? prev : [...prev, file.name]));
          if (shouldAutoApplySmartCrop()) {
            const pref = getSmartCropPreference();
            const effectiveScope = pref.targetScope || 'detected';
            const effectiveMargin = typeof pref.cleanMargin === 'number' ? pref.cleanMargin : 0;
            const effectivePageScope = pref.pageScope || 'all';
            const effectiveCustomRange = pref.customRange || '';

            setSmartCropActive(true);
            setCropScope(effectiveScope);
            setSmartCropMargin(effectiveMargin);
            setCropPageScope(effectivePageScope);
            if (effectiveCustomRange) setCropCustomRange(effectiveCustomRange);

            setPdfItems((prev) =>
              prev.map((it) => ({
                ...it,
                cropEnabled: effectiveScope === 'all' ? true : Boolean(it.hasScanBorders),
                cropMargin: effectiveMargin,
                cropPageRange: effectivePageScope === 'custom' ? (effectiveCustomRange || `1-${it.pageCount}`) : effectivePageScope
              }))
            );
          } else if (shouldAutoShowSmartCropModal() && !hasPromptedModalRef.current && !smartCropActive) {
            hasPromptedModalRef.current = true;
            setSmartCropInfoOnly(false);
            setShowSmartCropModal(true);
          }
        }

        pdf.destroy();
      } catch (err) {
        console.warn(`Could not render thumbnail for ${file.name}:`, err);
        const isEncrypted = err?.name === 'PasswordException' ||
          err?.message?.toLowerCase().includes('password') ||
          err?.message?.toLowerCase().includes('encrypted');
        if (isEncrypted) {
          setPdfItems((prev) =>
            prev.map((item) =>
              item.file === file
                ? {
                    ...item,
                    isEncrypted: true,
                    encryptionError: 'Password protected PDF cannot be merged without decryption.'
                  }
                : item
            )
          );
          showCropToast(`"${file.name}" is password protected and cannot be merged`, 'info');
        } else {
          setPdfItems((prev) =>
            prev.map((item) =>
              item.file === file
                ? {
                    ...item,
                    isCorrupted: true,
                    corruptionError: `"${file.name}" is empty or corrupted (not a valid PDF).`
                  }
                : item
            )
          );
          showCropToast(`"${file.name}" appears corrupted or invalid and cannot be merged`, 'warning');
        }
      }
    });
  }, [files]);

  // Add more files handler
  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!newFiles.length) return;
    setFiles((prev) => [...prev, ...newFiles]);
    if (smartCropActive && cropScope === 'all') {
      showCropToast(`Added ${newFiles.length} document(s) (Clean margins applied per Crop All)`, 'success');
    } else {
      showCropToast(`Added ${newFiles.length} document(s) to workspace`, 'success');
    }
    e.target.value = '';
  };

  // Drag & drop handlers
  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    setIsCanvasDragOver(false);

    // If external files were dropped directly onto a card, ingest them at target index
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (droppedFiles.length > 0) {
        setFiles((prev) => {
          const next = [...prev];
          next.splice(targetIndex, 0, ...droppedFiles);
          return next;
        });
        showCropToast(`Added ${droppedFiles.length} document(s) at position #${targetIndex + 1}`, 'success');
        return;
      }
    }

    const sourceIndex = dragIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    setPdfItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      setFiles(next.map((item) => item.file));
      return next;
    });
    dragIndexRef.current = null;
  };

  // Move left / right
  const moveItem = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= pdfItems.length) return;
    setPdfItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      setFiles(next.map((item) => item.file));
      return next;
    });
  };

  // Rotate individual item
  const rotateItem = (index, degrees) => {
    setPdfItems((prev) => {
      const next = [...prev];
      const current = next[index].rotation || 0;
      next[index] = {
        ...next[index],
        rotation: (current + degrees + 360) % 360
      };
      return next;
    });
  };

  // Rotate all items
  const rotateAll = (degrees) => {
    setPdfItems((prev) =>
      prev.map((item) => ({
        ...item,
        rotation: ((item.rotation || 0) + degrees + 360) % 360
      }))
    );
    showCropToast(`Rotated all documents by ${degrees > 0 ? '+' : ''}${degrees}°`, 'info');
  };

  // Remove individual item
  const removeItem = (index) => {
    setPdfItems((prev) => {
      const itemToRemove = prev[index];
      if (rangeEditState?.id === itemToRemove?.id) {
        setRangeEditState(null);
      }
      undoStackRef.current.push({
        type: 'single',
        item: itemToRemove,
        index
      });
      const next = [...prev];
      next.splice(index, 1);
      setFiles(next.map((item) => item.file));
      showCropToast(`Removed "${itemToRemove?.file?.name || 'document'}"`, 'info', {
        actionLabel: 'Undo',
        onAction: handleUndo
      });
      return next;
    });
  };

  // Sort by filename
  const sortByName = () => {
    setPdfItems((prev) => {
      const next = [...prev].sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setFiles(next.map((item) => item.file));
      return next;
    });
    showCropToast('Sorted documents by name A-Z', 'info');
  };

  // Sort by file size
  const sortBySize = () => {
    setPdfItems((prev) => {
      const next = [...prev].sort((a, b) => b.file.size - a.file.size);
      setFiles(next.map((item) => item.file));
      return next;
    });
    showCropToast('Sorted documents by file size', 'info');
  };

  // Reverse order
  const reverseOrder = () => {
    setPdfItems((prev) => {
      const next = [...prev].reverse();
      setFiles(next.map((item) => item.file));
      return next;
    });
    showCropToast('Reversed document sequence order', 'info');
  };

  // Summary Metrics with Partial Slicing Awareness & Blank Separators
  const blankPagesCount = (blankPageSeparator && pdfItems.length > 1) ? (pdfItems.length - 1) : 0;
  const totalPagesEstimate = pdfItems.reduce((acc, item) => {
    const count = countPagesInRange(item.pageRange, item.pageCount || 1);
    return acc + count;
  }, 0) + blankPagesCount;
  const totalSizeBytes = pdfItems.reduce((acc, item) => acc + item.file.size, 0);
  const croppedItemsCount = pdfItems.filter((it) => isItemCropped(it)).length;
  const allCropped = pdfItems.length > 0 && croppedItemsCount === pdfItems.length;
  const someCropped = croppedItemsCount > 0;

  // Execute Merge
  const handleMerge = async () => {
    if (rangeEditState) {
      handleCommitRangeEdit();
    }
    if (pdfItems.length < 2) return;

    const encryptedItem = pdfItems.find((it) => it.isEncrypted);
    if (encryptedItem) {
      setError(`Cannot merge encrypted file "${encryptedItem.file.name}". Please decrypt or remove it before merging.`);
      return;
    }

    const corruptedItem = pdfItems.find((it) => it.isCorrupted || (it.file && it.file.size === 0));
    if (corruptedItem) {
      setError(`Cannot merge corrupted or empty file "${corruptedItem.file.name}". Please remove it before merging.`);
      return;
    }

    // Guard against invalid or 0-page ranges
    for (const item of pdfItems) {
      const rangeCheck = validatePageRange(item.pageRange, item.pageCount);
      if (!rangeCheck.isValid) {
        setError(`Cannot merge: "${item.file.name}" has an invalid page range (${rangeCheck.error || 'Syntax error'}).`);
        return;
      }
      if (rangeCheck.pageCount === 0) {
        setError(`Cannot merge: "${item.file.name}" has 0 pages selected in its range.`);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    setProgressTelemetry({
      stage: 'Preparing document streams...',
      currentFile: pdfItems[0]?.file?.name || '',
      currentIndex: 0,
      totalFiles: pdfItems.length
    });
    setError(null);
    setResult(null);

    try {
      const orderedFiles = pdfItems.map((item) => item.file);
      const rotations = pdfItems.map((item) => item.rotation || 0);
      const pageRanges = pdfItems.map((item) => item.pageRange || 'all');

      // Collect docCropBoxes and crop scope for smart cropping
      const docCropBoxes = {};
      const cropPageRanges = [];
      const cropEnabledFiles = [];

      pdfItems.forEach((item, idx) => {
        const cropped = isItemCropped(item);
        cropEnabledFiles.push(cropped);
        cropPageRanges.push(item.cropPageRange || cropPageScope || 'all');
        if (cropped && item.pdfCropBox && item.pdfCropBox.hasBlackBorders === true) {
          docCropBoxes[idx] = item.pdfCropBox;
          docCropBoxes[item.file.name] = item.pdfCropBox;
        }
      });

      const options = {
        blankPageSeparator,
        normalizePageSize,
        addPageNumbers,
        pageRanges,
        outputFileName: sanitizePdfFilename(outputFileName),
        fileNames: orderedFiles.map((f) => f.name),
        autoCropBlackBorders: smartCropActive,
        cleanMargin: 0,
        docCropBoxes,
        cropEnabledFiles,
        cropPageRanges,
        cropPageScope,
        workerRef: activeWorkerRef
      };

      const onProgressCallback = (p, telemetry) => {
        setProgress(p);
        if (telemetry) {
          setProgressTelemetry((prev) => ({ ...prev, ...telemetry }));
        }
      };

      const blob = await mergePdfs(orderedFiles, rotations, options, onProgressCallback);
      setResult(blob);

      try {
        const finalName = sanitizePdfFilename(outputFileName);
        await saveFile(finalName || 'merged.pdf', blob.size, 'application/pdf', 'Merge PDFs', blob);
      } catch (dbErr) {
        console.error('Failed to save to workspace:', dbErr);
      }

      // Clear draft since merge succeeded
      try {
        await clearStudioDraft('merge-pdf');
      } catch (_) {}
    } catch (err) {
      if (err.message === 'MERGE_CANCELLED') {
        return;
      }
      const errorMsg = err.message || 'Merge failed';
      setError(errorMsg);
      showCropToast(errorMsg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const reset = (isExplicitClear = true) => {
    if (isExplicitClear && pdfItems.length > 0) {
      const prevItems = [...pdfItems];
      undoStackRef.current.push({
        type: 'all',
        pdfItems: prevItems,
        files: prevItems.map((it) => it.file),
        outputFileName
      });
      showCropToast(`Cleared all ${prevItems.length} documents`, 'info', {
        actionLabel: 'Undo',
        onAction: handleUndo
      });
    }
    clearStudioDraft('merge-pdf');
    renderedFileIdsRef.current.clear();
    if (activePreviewUrlRef.current) {
      try { URL.revokeObjectURL(activePreviewUrlRef.current); } catch (_) {}
      activePreviewUrlRef.current = null;
    }
    setFiles([]);
    setPdfItems([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setSmartCropActive(false);
    setDetectedScanFiles([]);
    hasPromptedModalRef.current = false;
  };

  // Grid columns styling helper
  const getGridTemplate = () => {
    if (zoomLevel === 1) return 'repeat(auto-fill, minmax(140px, 1fr))';
    if (zoomLevel === 3) return 'repeat(auto-fill, minmax(240px, 1fr))';
    return 'repeat(auto-fill, minmax(185px, 1fr))';
  };

  const handleToolbarScopeChange = useCallback((newScope) => {
    setCropScope(newScope);
    setSmartCropActive(true);
    setPdfItems((prev) =>
      prev.map((it) => ({
        ...it,
        cropEnabled: newScope === 'all' ? true : Boolean(it.hasScanBorders)
      }))
    );
    const pref = getSmartCropPreference();
    if (pref.dontShowAgain) {
      setSmartCropPreference({ ...pref, targetScope: newScope, rememberChoice: 'apply' });
    }
    const count = newScope === 'all' ? pdfItems.length : pdfItems.filter((it) => it.hasScanBorders).length;
    showCropToast(
      newScope === 'all'
        ? `Smart crop enabled for all ${pdfItems.length} documents`
        : `Smart crop set to ${count} detected scan document${count === 1 ? '' : 's'} only`,
      'success'
    );
  }, [pdfItems, showCropToast]);

  const handleToolbarPageScopeChange = useCallback((newPageScope) => {
    setCropPageScope(newPageScope);
    setPdfItems((prev) =>
      prev.map((it) => ({
        ...it,
        cropPageRange: newPageScope === 'custom' ? (cropCustomRange || `1-${it.pageCount}`) : newPageScope
      }))
    );
    const pref = getSmartCropPreference();
    if (pref.dontShowAgain) {
      setSmartCropPreference({ ...pref, pageScope: newPageScope, rememberChoice: 'apply' });
    }
    showCropToast(`Crop pages set to: ${newPageScope.toUpperCase()}`, 'info');
  }, [cropCustomRange, showCropToast]);

  const handleToolbarCustomRangeChange = useCallback((range) => {
    setCropCustomRange(range);
    setCropPageScope('custom');
    setPdfItems((prev) =>
      prev.map((it) => ({
        ...it,
        cropPageRange: range || `1-${it.pageCount}`
      }))
    );
    const pref = getSmartCropPreference();
    if (pref.dontShowAgain) {
      setSmartCropPreference({ ...pref, pageScope: 'custom', customRange: range, rememberChoice: 'apply' });
    }
    showCropToast(`Custom crop page range set: "${range}"`, 'info');
  }, [showCropToast]);

  const handleToolbarMarginChange = useCallback((newMargin) => {
    setSmartCropMargin(newMargin);
    setPdfItems((prev) =>
      prev.map((it) => ({
        ...it,
        cropMargin: newMargin,
        pdfCropBox: it.pdfCropBox
      }))
    );
    const pref = getSmartCropPreference();
    if (pref.dontShowAgain) {
      setSmartCropPreference({ ...pref, cleanMargin: newMargin, rememberChoice: 'apply' });
    }
    showCropToast(`Clean margin updated to ${newMargin}pt across documents`, 'info');
  }, [showCropToast]);

  const hasAnyScanBorders = pdfItems.some((it) => it.hasScanBorders);
  const mergeCropper = {
    hasDetectedBorders: hasAnyScanBorders && !smartCropActive,
    isActive: smartCropActive,
    isInvertedDocument: pdfItems.some((it) => it.detectedCropBox?.isInvertedDocument),
    detectionReason: hasAnyScanBorders
      ? `${pdfItems.filter((it) => it.hasScanBorders).length} document(s) with photocopy borders`
      : '',
    cleanMargin: 0,
    activate: () => {
      if (shouldAutoShowSmartCropModal()) {
        setSmartCropInfoOnly(false);
        setShowSmartCropModal(true);
      } else {
        const pref = getSmartCropPreference();
        const effectiveScope = pref.targetScope || (hasAnyScanBorders ? 'detected' : 'all');
        const effectiveMargin = typeof pref.cleanMargin === 'number'
          ? pref.cleanMargin
          : (typeof smartCropMargin === 'number' ? smartCropMargin : 0);
        const effectivePageScope = pref.pageScope || cropPageScope || 'all';
        const effectiveCustomRange = pref.customRange || cropCustomRange || '';

        setSmartCropActive(true);
        setCropScope(effectiveScope);
        setSmartCropMargin(effectiveMargin);
        setCropPageScope(effectivePageScope);
        if (effectiveCustomRange) setCropCustomRange(effectiveCustomRange);

        setPdfItems((prev) =>
          prev.map((it) => {
            const shouldCrop = effectiveScope === 'selected'
              ? Boolean(it.cropEnabled && it.hasScanBorders)
              : Boolean(it.hasScanBorders);
            return {
              ...it,
              cropEnabled: shouldCrop,
              cropMargin: effectiveMargin,
              cropPageRange: effectivePageScope === 'custom' ? (effectiveCustomRange || `1-${it.pageCount}`) : effectivePageScope
            };
          })
        );

        const count = effectiveScope === 'selected'
          ? pdfItems.filter((it) => it.cropEnabled && it.hasScanBorders).length
          : pdfItems.filter((it) => it.hasScanBorders).length;

        showCropToast(
          `Smart crop active (${effectiveScope === 'all' ? 'All Documents' : 'Detected Only'}): clean margins applied to ${count} of ${pdfItems.length} documents`,
          'success'
        );
      }
    },
    revert: () => {
      setSmartCropActive(false);
      setPdfItems((prev) =>
        prev.map((it) => ({
          ...it,
          cropEnabled: false
        }))
      );
      showCropToast('Smart cropping turned off — original documents restored', 'info');
    },
    onOpenInfo: (info = true) => {
      setSmartCropInfoOnly(Boolean(info));
      setShowSmartCropModal(true);
    }
  };

  return (
    <ToolPageLayout
      toolId="merge-pdf"
      title="Merge PDFs"
      description="Combine multiple PDF files into one document and arrange them in the exact order you want."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      setResult={setResult}
      onReset={reset}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Merge PDF Online Free — Fast & Secure PDF Combiner | DocScalar"
        description="Combine PDF documents securely. Reorder, rotate, sort, and merge multiple PDF files with secure transit encryption."
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
            {/* LEFT / CENTER: Interactive PDF Canvas Workspace                           */}
            {/* ========================================================================= */}
            <div
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
              className={`workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative bg-[var(--bg-tertiary)] transition-all ${
                isCanvasDragOver
                  ? 'ring-4 ring-inset ring-[var(--color-primary)]/50 bg-[var(--color-primary)]/5'
                  : ''
              }`}
            >
              {/* Sticky Workspace Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <label className="h-8 px-3.5 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs text-xs font-semibold select-none shrink-0">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Add PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                        title=""
                        tabIndex={-1}
                      />
                    </label>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    <button
                      type="button"
                      onClick={() => rotateAll(-90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all documents left 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_left</span>
                      <span className="hidden sm:inline">Rotate Left</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotateAll(90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all documents right 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                      <span className="hidden sm:inline">Rotate Right</span>
                    </button>

                    <button
                      type="button"
                      onClick={sortByName}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Sort documents alphabetically (A-Z)"
                    >
                      <span className="material-symbols-outlined text-[15px]">sort_by_alpha</span>
                      <span className="hidden md:inline">Sort A-Z</span>
                    </button>

                    <button
                      type="button"
                      onClick={sortBySize}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Sort documents by size (largest first)"
                    >
                      <span className="material-symbols-outlined text-[15px]">data_usage</span>
                      <span className="hidden md:inline">By Size</span>
                    </button>

                    <button
                      type="button"
                      onClick={reverseOrder}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Reverse document sequence"
                    >
                      <span className="material-symbols-outlined text-[15px]">swap_vert</span>
                      <span className="hidden md:inline">Reverse</span>
                    </button>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    {/* Universal Smart Cropper Button with unified ratio badge & animated options dropdown */}
                    <SmartCropperToolbarButton
                      cropper={mergeCropper}
                      onOpenInfo={(info = true) => {
                        setSmartCropInfoOnly(Boolean(info));
                        setShowSmartCropModal(true);
                      }}
                      badge={pdfItems.length > 1 && croppedItemsCount > 0 ? `${croppedItemsCount}/${pdfItems.length}` : null}
                      options={{
                        targetScope: cropScope,
                        onScopeChange: handleToolbarScopeChange,
                        pageScope: cropPageScope,
                        onPageScopeChange: handleToolbarPageScopeChange,
                        customRange: cropCustomRange,
                        onCustomRangeChange: handleToolbarCustomRangeChange,
                        margin: smartCropMargin,
                        onMarginChange: handleToolbarMarginChange,
                        itemCount: pdfItems.length,
                        detectedCount: pdfItems.filter((it) => it.hasScanBorders).length,
                        croppedCount: croppedItemsCount
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] hidden lg:inline">
                      {pdfItems.length} {pdfItems.length === 1 ? 'file' : 'files'} (~{totalPagesEstimate} pages)
                    </span>

                    {/* Card Size / Zoom Slider */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_out</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                        className="w-16 h-1 accent-[var(--color-primary)] cursor-pointer"
                        title="Adjust document card size"
                      />
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_in</span>
                    </div>

                    <button
                      type="button"
                      onClick={reset}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Clear all documents"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Grid of PDF Documents */}
              <div className="workspace-canvas flex-1 p-4 sm:p-6">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: getGridTemplate(),
                    gap: zoomLevel === 1 ? '0.75rem' : '1.25rem'
                  }}
                  className="w-full"
                >
                  {pdfItems.map((item, index) => {
                    const isDragging = dragIndexRef.current === index;
                    const isOver = dragOverIndex === index;

                    return (
                      <div
                        key={item.id}
                        draggable={!processing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group relative flex flex-col bg-[var(--bg-primary)] border-2 rounded-xl overflow-hidden select-none transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                          isOver
                            ? 'border-[var(--color-primary)] scale-[1.02] shadow-lg ring-2 ring-[var(--color-primary)]/20'
                            : isDragging
                            ? 'opacity-40 border-dashed border-[var(--color-primary)]'
                            : item.isCorrupted || item.isEncrypted
                            ? 'border-rose-500/80 ring-2 ring-rose-500/20 shadow-rose-500/10'
                            : isItemCropped(item)
                            ? 'border-emerald-500/80 ring-2 ring-emerald-500/25 shadow-emerald-500/10'
                            : 'border-[var(--border-subtle)] hover:border-[var(--color-primary)]/60'
                        }`}
                      >
                        {/* Top Badges Bar: Dedicated Non-Colliding Header Row */}
                        <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between pointer-events-none">
                          {/* Left: Sequence Index Badge & Encryption Status */}
                          <div className="flex items-center gap-1">
                            <div className="pointer-events-auto bg-slate-900/85 dark:bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs border border-white/10 shrink-0">
                              #{index + 1}
                            </div>
                            {item.isEncrypted && (
                              <div
                                className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 shrink-0"
                                title="Password protected document — cannot be merged without decryption"
                              >
                                <span className="material-symbols-outlined text-[11px]">lock</span>
                                <span>{zoomLevel === 1 ? 'Lock' : 'Encrypted'}</span>
                              </div>
                            )}
                            {item.isCorrupted && (
                              <div
                                className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 shrink-0"
                                title={item.corruptionError || 'Corrupted or empty PDF — cannot be processed'}
                              >
                                <span className="material-symbols-outlined text-[11px]">error</span>
                                <span>{zoomLevel === 1 ? 'Corrupt' : 'Corrupted'}</span>
                              </div>
                            )}
                          </div>

                          {/* Right: Smart Crop Status Badge & Trigger */}
                          <div className="pointer-events-auto flex items-center gap-1">
                            {isItemCropped(item) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemCrop(item.id);
                                }}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40 shrink-0"
                                title={`Smart Cropping Active (${item.cropPageRange || cropPageScope || 'all'} pages) — Click to restore original document`}
                              >
                                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                <span>
                                  {zoomLevel === 1
                                    ? 'Cropped'
                                    : item.cropPageRange && item.cropPageRange !== 'all'
                                    ? `Cropped (${item.cropPageRange})`
                                    : 'Cropped'}
                                </span>
                              </button>
                            ) : item.hasScanBorders ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemCrop(item.id);
                                }}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/50 shrink-0"
                                title="Photocopy scan borders detected — Click to remove scan borders"
                              >
                                <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                                <span>{zoomLevel === 1 ? 'Borders' : 'Borders Detected'}</span>
                              </button>
                            ) : (
                              <div
                                className="text-[9px] font-semibold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 bg-white text-slate-600 border border-slate-200 shrink-0 select-none cursor-default"
                                title="Clean digital document: zero scan borders detected"
                              >
                                <span className="material-symbols-outlined text-[11px] text-slate-500">check_circle</span>
                                <span>{zoomLevel === 1 ? 'Clean' : 'Clean Page'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Page Count & Slicing Scope Badge */}
                        {(() => {
                          const rangeVal = validatePageRange(item.pageRange, item.pageCount);
                          const hasRangeError = !rangeVal.isValid || rangeVal.isOutOfBounds;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRangeEdit(item);
                              }}
                              className={`absolute bottom-14 left-2 z-10 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all ${
                                hasRangeError
                                  ? 'bg-red-600 text-white ring-2 ring-red-400'
                                  : item.pageRange && item.pageRange !== 'all'
                                  ? 'bg-amber-500 text-white ring-1 ring-amber-400'
                                  : 'bg-blue-600/90 text-white hover:bg-blue-600'
                              }`}
                              title={
                                hasRangeError
                                  ? (rangeVal.error || rangeVal.warning)
                                  : "Click to slice specific pages from this document"
                              }
                            >
                              <span className="material-symbols-outlined text-[11px]">
                                {hasRangeError ? 'warning' : item.pageRange && item.pageRange !== 'all' ? 'filter_list' : 'menu_book'}
                              </span>
                              <span>
                                {item.pageRange && item.pageRange !== 'all'
                                  ? `Pages: ${item.pageRange} (${countPagesInRange(item.pageRange, item.pageCount)} ${countPagesInRange(item.pageRange, item.pageCount) === 1 ? 'page' : 'pages'})`
                                  : `${item.pageCount} ${item.pageCount === 1 ? 'Page' : 'Pages'} (All)`}
                              </span>
                              <span className="material-symbols-outlined text-[10px] opacity-70">edit</span>
                            </button>
                          );
                        })()}

                        {/* Micro Page-Range Editor Popover */}
                        {rangeEditState?.id === item.id && (() => {
                          const draftVal = validatePageRange(rangeEditState.draftValue, item.pageCount);
                          return (
                            <div
                              ref={activeEditPopoverRef}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-x-1.5 bottom-12 z-30 w-auto min-w-0 max-w-full bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-xl shadow-xl p-2 flex flex-col gap-1.5 text-left animate-[scaleIn_0.15s_ease-out]"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                                    Pages (1–{item.pageCount})
                                  </span>
                                  {rangeEditState.draftValue.trim() === '' && (
                                    <span className="text-[9px] text-amber-500 font-medium truncate">
                                      (Empty=revert)
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCommitRangeEdit}
                                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                                  title="Close & Save"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                              <input
                                type="text"
                                autoFocus
                                value={rangeEditState.draftValue}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRangeEditState((prev) => (prev ? { ...prev, draftValue: val } : null));
                                  setPdfItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, pageRange: val } : it))
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCommitRangeEdit();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleRevertRangeEdit();
                                  }
                                }}
                                placeholder={`e.g. 1-${item.pageCount}, 5`}
                                className={`w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border rounded-lg text-[var(--text-primary)] outline-none font-mono ${
                                  !draftVal.isValid || draftVal.isOutOfBounds
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-[var(--border-subtle)] focus:border-[var(--color-primary)]'
                                }`}
                              />
                              {(!draftVal.isValid || draftVal.isOutOfBounds) && (
                                <p className="text-[9px] text-red-500 leading-tight font-medium">
                                  {draftVal.error || draftVal.warning}
                                </p>
                              )}
                              <div className="flex items-center gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeEditState((prev) => (prev ? { ...prev, draftValue: 'all' } : null));
                                    setPdfItems((prev) =>
                                      prev.map((it) => (it.id === item.id ? { ...it, pageRange: 'all' } : it))
                                    );
                                  }}
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border border-[var(--border-subtle)] cursor-pointer transition-colors ${
                                    rangeEditState.draftValue.trim().toLowerCase() === 'all'
                                      ? 'bg-[var(--color-primary)] text-white'
                                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeEditState((prev) => (prev ? { ...prev, draftValue: 'odd' } : null));
                                    setPdfItems((prev) =>
                                      prev.map((it) => (it.id === item.id ? { ...it, pageRange: 'odd' } : it))
                                    );
                                  }}
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border border-[var(--border-subtle)] cursor-pointer transition-colors ${
                                    rangeEditState.draftValue.trim().toLowerCase() === 'odd'
                                      ? 'bg-[var(--color-primary)] text-white'
                                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Odd
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeEditState((prev) => (prev ? { ...prev, draftValue: 'even' } : null));
                                    setPdfItems((prev) =>
                                      prev.map((it) => (it.id === item.id ? { ...it, pageRange: 'even' } : it))
                                    );
                                  }}
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border border-[var(--border-subtle)] cursor-pointer transition-colors ${
                                    rangeEditState.draftValue.trim().toLowerCase() === 'even'
                                      ? 'bg-[var(--color-primary)] text-white'
                                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  Even
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCommitRangeEdit}
                                  className="ml-auto px-2 py-0.5 text-[9px] font-bold bg-[var(--color-primary)] text-white rounded cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* PDF First Page Preview / Thumbnail Container */}
                        <div className="w-full aspect-[4/5] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                          {(isItemCropped(item) && item.croppedThumbnailUrl) || item.thumbnailUrl ? (
                            <img
                              src={(isItemCropped(item) && item.croppedThumbnailUrl) ? item.croppedThumbnailUrl : item.thumbnailUrl}
                              alt={item.file.name}
                              style={{
                                transform: `rotate(${item.rotation || 0}deg)`,
                                transition: 'transform 0.2s ease-out'
                              }}
                              className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-[var(--text-tertiary)]">
                              <span className="material-symbols-outlined text-4xl text-red-500/80 fill">picture_as_pdf</span>
                              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">PDF Document</span>
                            </div>
                          )}

                          {/* Professional Frosted-Glass Hover Action Overlay & Floating Pill (Bounded to center so it never covers top badges) */}
                          <div className="absolute inset-x-0 top-9 bottom-11 bg-slate-950/20 dark:bg-black/35 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200 flex items-center justify-center z-20 pointer-events-none">
                            <div className="flex items-center gap-1 bg-slate-900/95 dark:bg-black/95 backdrop-blur-md border border-white/20 px-2 py-1 rounded-full shadow-2xl pointer-events-auto text-white transform scale-90 group-hover:scale-100 group-focus-within:scale-100 transition-transform duration-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotateItem(index, -90);
                                }}
                                className="p-1.5 hover:bg-white/20 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
                                title="Rotate Left 90°"
                              >
                                <span className="material-symbols-outlined text-[15px]">rotate_left</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotateItem(index, 90);
                                }}
                                className="p-1.5 hover:bg-white/20 text-slate-200 hover:text-white rounded-full transition-colors cursor-pointer"
                                title="Rotate Right 90°"
                              >
                                <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                              </button>
                              <div className="w-px h-3.5 bg-white/25 mx-0.5" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(index);
                                }}
                                className="p-1.5 hover:bg-red-600 text-red-300 hover:text-white rounded-full transition-colors cursor-pointer"
                                title="Remove Document"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Details & Reorder Arrows */}
                        <div className="p-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={item.file.name}>
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                              <span>{formatFileSize(item.file.size)}</span>
                              <span>•</span>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                              </span>
                              {item.rotation !== 0 && (
                                <span className="text-[var(--color-primary)] font-bold">
                                  ({item.rotation}°)
                                </span>
                              )}
                              <span>•</span>
                              {isItemCropped(item) ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5" title="Smart Cropping Active">
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                  <span>Cropped</span>
                                </span>
                              ) : item.hasScanBorders ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-0.5" title="Scan borders detected">
                                  <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                                  <span>Needs Crop</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium inline-flex items-center gap-0.5" title="Clean digital document: zero scan borders">
                                  <span className="material-symbols-outlined text-[12px] text-slate-400">verified</span>
                                  <span>Clean</span>
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(index, -1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Left"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            </button>
                            <button
                              type="button"
                              disabled={index === pdfItems.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(index, 1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Right"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add More Drop Target Card */}
                  <label
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.querySelector('input')?.click();
                      }
                    }}
                    onDragOver={handleCanvasDragOver}
                    onDrop={handleCanvasDrop}
                    className="flex flex-col items-center justify-center aspect-[4/5] bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-primary)] border-2 border-dashed border-[var(--border-medium)] hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none rounded-xl cursor-pointer transition-all gap-2 group p-4 text-center select-none shadow-xs"
                    title="Click or drag to add more PDF documents"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] group-hover:bg-[var(--color-primary)]/10 text-[var(--text-secondary)] group-hover:text-[var(--color-primary)] flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[24px]">add</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)]">
                      Add More
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      PDF Documents
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleAddFiles}
                      title=""
                      tabIndex={-1}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tune</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Merge Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {pdfItems.length} {pdfItems.length === 1 ? 'File' : 'Files'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Summary Card */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Merge Overview
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Total Files</span>
                      <span className="font-bold text-[var(--text-primary)]">{pdfItems.length} documents</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Est. Total Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">~{totalPagesEstimate} pages</span>
                    </div>
                    <div className="flex flex-col col-span-2 pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-secondary)]">Combined Input Size</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatFileSize(totalSizeBytes)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Output File Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    onBlur={() => {
                      if (!outputFileName.trim()) setOutputFileName('merged.pdf');
                    }}
                    placeholder="merged.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 3. Page Dimensions Normalization */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">aspect_ratio</span>
                    Page Dimensions
                  </label>
                  <select
                    value={normalizePageSize}
                    onChange={(e) => setNormalizePageSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                  >
                    <option value="original">Original Dimensions (Preserve All)</option>
                    <option value="a4">Standard A4 (210 × 297 mm)</option>
                    <option value="letter">Standard US Letter (8.5 × 11 in)</option>
                    <option value="match-first">Match First Document Dimensions</option>
                  </select>
                  <span className="text-[10px] text-[var(--text-secondary)] leading-tight">
                    Scales and centers content onto uniform sheet dimensions
                  </span>
                </div>

                {/* 4. Running Page Numbers */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">pin</span>
                        Running Page Numbers
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Stamps centered "Page X of Y" at bottom in vector text
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={addPageNumbers}
                      onChange={(e) => setAddPageNumbers(e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* 5. Duplex Blank Page Separator */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">note_add</span>
                        Blank Page Separator
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Inserts blank page between documents for double-sided printing
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={blankPageSeparator}
                      onChange={(e) => setBlankPageSeparator(e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* 6. Smart Cropping (Auto-Crop Black Scan Borders) */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">auto_fix_high</span>
                      <span>Smart Cropping</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smartCropActive}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSmartCropActive(checked);
                          if (checked && shouldAutoShowSmartCropModal()) {
                            setSmartCropInfoOnly(false);
                            setShowSmartCropModal(true);
                          }
                          if (checked) {
                            const effectiveScope = cropScope === 'selected' ? 'detected' : cropScope;
                            setCropScope(effectiveScope);
                            setPdfItems((prev) =>
                              prev.map((it) => ({
                                ...it,
                                cropEnabled: Boolean(it.hasScanBorders)
                              }))
                            );
                            const borderCount = pdfItems.filter((it) => it.hasScanBorders).length;
                            if (borderCount === 0) {
                              showCropToast('Smart Cropping ready: All uploaded documents are clean', 'info');
                            } else if (effectiveScope === 'all') {
                              showCropToast(`Smart Cropping active across ${borderCount} document${borderCount === 1 ? '' : 's'} with scan borders`, 'success');
                            } else {
                              showCropToast(
                                `Smart Cropping active on ${borderCount} document${borderCount === 1 ? '' : 's'} with scan borders`,
                                'success'
                              );
                            }
                          } else {
                            setPdfItems((prev) => prev.map((it) => ({ ...it, cropEnabled: false })));
                            showCropToast('Smart Cropping turned off — original documents restored', 'info');
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                    Excises black scanner borders, photocopy edges, and aligns pages with uniform white margins.
                  </p>

                  {hasAnyScanBorders && (
                    <div className="flex items-center justify-between text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      <span>{pdfItems.filter((it) => it.hasScanBorders).length} of {pdfItems.length} documents have scan borders</span>
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                    </div>
                  )}

                  {mergeCropper.isInvertedDocument && (
                    <div className="flex items-center justify-between text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20">
                      <span>White-on-black / inverted scan detected</span>
                      <span className="material-symbols-outlined text-[12px]">contrast</span>
                    </div>
                  )}

                  {smartCropActive && (
                    <>
                      {/* Scope: Crop All vs Selected Files vs Detected Only */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          <span>Apply Smart Crop To</span>
                          <span className="text-emerald-500 font-semibold">
                            {cropScope === 'all'
                              ? `All (${pdfItems.length})`
                              : cropScope === 'selected'
                              ? `Selected (${croppedItemsCount})`
                              : `Detected (${pdfItems.filter((it) => it.hasScanBorders).length})`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCropScope('all');
                              setSmartCropActive(true);
                              setPdfItems((prev) => prev.map((it) => ({ ...it, cropEnabled: Boolean(it.hasScanBorders) })));
                              const borderCount = pdfItems.filter((it) => it.hasScanBorders).length;
                              if (borderCount > 0) {
                                showCropToast(`Smart crop enabled for ${borderCount} document${borderCount === 1 ? '' : 's'} with scan borders`, 'success');
                              } else {
                                showCropToast('All documents are clean: zero scan borders to crop', 'info');
                              }
                            }}
                            className={`py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                              cropScope === 'all'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                            title="Crop all documents uniformly"
                          >
                            Crop All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCropScope('selected');
                              setSmartCropActive(true);
                              showCropToast(`Select specific documents to crop below`, 'info');
                            }}
                            className={`py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                              cropScope === 'selected'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                            title="Choose specific files to crop"
                          >
                            Selected ({croppedItemsCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCropScope('detected');
                              setSmartCropActive(true);
                              setPdfItems((prev) =>
                                prev.map((it) => ({ ...it, cropEnabled: Boolean(it.hasScanBorders) }))
                              );
                              const count = pdfItems.filter((it) => it.hasScanBorders).length;
                              showCropToast(`Smart crop set to ${count} detected scan file${count === 1 ? '' : 's'} only`, 'info');
                            }}
                            className={`py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                              cropScope === 'detected'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                            title="Crop only documents with detected black scan borders"
                          >
                            Detected Only
                          </button>
                        </div>
                      </div>

                      {/* Interactive Selected Files Checklist (Visible when Selected Files is active) */}
                      {cropScope === 'selected' && (
                        <div className="flex flex-col gap-1.5 p-2 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                              Choose Files ({croppedItemsCount}/{pdfItems.length})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const borderCount = pdfItems.filter((it) => it.hasScanBorders).length;
                                  if (borderCount > 0) {
                                    setSmartCropActive(true);
                                    setPdfItems((prev) => prev.map((it) => ({ ...it, cropEnabled: Boolean(it.hasScanBorders) })));
                                    showCropToast(`Selected ${borderCount} document${borderCount === 1 ? '' : 's'} with scan borders`, 'success');
                                  } else {
                                    showCropToast('All documents are already clean: zero scan borders detected', 'info');
                                  }
                                }}
                                className="text-[10px] text-emerald-600 hover:text-emerald-500 font-semibold cursor-pointer underline"
                              >
                                All
                              </button>
                              <span className="text-[var(--text-tertiary)]">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSmartCropActive(false);
                                  setPdfItems((prev) => prev.map((it) => ({ ...it, cropEnabled: false })));
                                  showCropToast('Deselected all files — smart cropping turned off', 'info');
                                }}
                                className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold cursor-pointer underline"
                              >
                                None
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
                            {pdfItems.map((item, idx) => {
                              const isChecked = isItemCropped(item);
                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center justify-between p-1.5 rounded-lg border transition-all select-none text-[11px] ${
                                    !item.hasScanBorders
                                      ? 'opacity-60 bg-[var(--bg-secondary)] border-[var(--border-subtle)] cursor-default'
                                      : isChecked
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-primary)] cursor-pointer'
                                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-secondary)] cursor-pointer'
                                  }`}
                                  title={item.hasScanBorders ? undefined : 'Clean document: no scan borders to crop'}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!item.hasScanBorders}
                                      onChange={() => toggleItemCrop(item.id)}
                                      className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold truncate max-w-[110px]" title={item.file?.name}>
                                        #{idx + 1} {item.file?.name}
                                      </span>
                                      <span className="text-[9px] text-[var(--text-secondary)]">
                                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                                      </span>
                                    </div>
                                  </div>

                                  {isChecked ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                      Cropped
                                    </span>
                                  ) : item.hasScanBorders ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                      Borders
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-500/10 text-[var(--text-tertiary)] shrink-0">
                                      Clean
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Page Range Scope: All, Odd, Even, Custom */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          <span>Crop Pages</span>
                          <span className="text-emerald-500 font-semibold capitalize">
                            {cropPageScope} {cropPageScope === 'custom' && cropCustomRange ? `(${cropCustomRange})` : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {['all', 'odd', 'even', 'custom'].map((scope) => (
                            <button
                              key={scope}
                              type="button"
                              onClick={() => {
                                setCropPageScope(scope);
                                if (scope !== 'custom') {
                                  setPdfItems((prev) => prev.map((it) => ({ ...it, cropPageRange: scope })));
                                } else if (cropCustomRange) {
                                  setPdfItems((prev) => prev.map((it) => ({ ...it, cropPageRange: cropCustomRange })));
                                }
                                showCropToast(`Smart crop page scope set to: ${scope}`, 'info');
                              }}
                              className={`py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer text-center capitalize ${
                                cropPageScope === scope
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                              }`}
                            >
                              {scope}
                            </button>
                          ))}
                        </div>
                        {cropPageScope === 'custom' && (
                          <input
                            type="text"
                            value={cropCustomRange}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCropCustomRange(val);
                              setPdfItems((prev) => prev.map((it) => ({ ...it, cropPageRange: val })));
                            }}
                            placeholder="e.g. 1-5, 8 or odd"
                            className="w-full px-2.5 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-lg text-[var(--text-primary)] outline-none font-mono"
                          />
                        )}
                      </div>

                      {/* Original Dimensions Restoration Invariant */}
                      <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="material-symbols-outlined text-[14px]">aspect_ratio</span>
                          <span>Original Dimensions Restored</span>
                        </div>
                        <p className="leading-relaxed">
                          Dark scanner borders and photocopy shadows are excised. Clean page content expands to fit the full original sheet dimensions without artificial margin insets.
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSmartCropInfoOnly(true);
                      setShowSmartCropModal(true);
                    }}
                    className="text-[10px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 self-start cursor-pointer mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">help</span>
                    <span>What does Smart Cropping do?</span>
                  </button>
                </div>

                {/* Enterprise Lossless Content Preservation Guarantee */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1.5 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>100% Lossless Content Preservation</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                    DocScalar combines native PDF streams in-memory. Selectable text, embedded fonts, and vector paths remain crisp and completely unrasterized.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {pdfItems.length < 2 && (
                  <p className="text-[11px] text-[var(--text-secondary)] text-center bg-amber-500/10 text-amber-700 dark:text-amber-300 p-2 rounded-lg border border-amber-500/20 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>Add at least 2 PDF documents to enable merging.</span>
                  </p>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={pdfItems.length < 2 || processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Merging ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Merge {pdfItems.length} PDFs</span>
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
        /* RESULT VIEW: Premium High-Fidelity Download Card                           */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto max-h-full my-auto">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDFs Successfully Merged!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {pdfItems.length} documents combined into a single unified PDF.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">
                  {sanitizePdfFilename(outputFileName)}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
              </div>
            </div>

            {/* 2-Tier CTA Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col gap-3 w-full max-w-md pt-2">
              {/* Tier 1: Hero Download CTA */}
              <button
                type="button"
                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                onClick={() => {
                  const finalName = sanitizePdfFilename(outputFileName);
                  saveAs(result, finalName);
                }}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Merged PDF</span>
                <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded-full font-mono font-medium ml-1">
                  {formatFileSize(result.size)}
                </span>
              </button>

              {/* Tier 2: Secondary Action Controls (Preview & Dual Utilities) */}
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  type="button"
                  className="w-full py-2.5 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all text-center"
                  onClick={() => {
                    if (activePreviewUrlRef.current) {
                      try { URL.revokeObjectURL(activePreviewUrlRef.current); } catch (_) {}
                    }
                    const url = URL.createObjectURL(result);
                    activePreviewUrlRef.current = url;
                    window.open(url, '_blank');
                  }}
                  title="Preview merged PDF in a new browser tab"
                >
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">visibility</span>
                  <span>Preview Merged PDF</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <Link
                    to="/compress-pdf"
                    state={continuationFile ? { initialFile: continuationFile } : undefined}
                    className="py-2.5 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 text-[var(--text-primary)] hover:text-[var(--color-primary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">compress</span>
                    <span>Compress Result</span>
                  </Link>

                  <button
                    type="button"
                    className="py-2.5 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all text-center"
                    onClick={reset}
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Merge More Files</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/compress-pdf"
                  state={continuationFile ? { initialFile: continuationFile } : undefined}
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
                  state={continuationFile ? { initialFile: continuationFile } : undefined}
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
                  state={continuationFile ? { initialFile: continuationFile } : undefined}
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

      {/* Enterprise Processing Progress Modal */}
      {processing && (
        <MergeProgressModal
          isOpen={processing}
          progress={progress}
          stage={progressTelemetry.stage}
          currentFile={progressTelemetry.currentFile}
          currentIndex={progressTelemetry.currentIndex}
          totalFiles={progressTelemetry.totalFiles}
          totalPages={totalPagesEstimate}
          totalSizeBytes={totalSizeBytes}
          outputFileName={sanitizePdfFilename(outputFileName)}
          itemCount={pdfItems.length}
          onCancel={handleCancelMerge}
        />
      )}

      {/* Smart Cropper Educational & Decision Modal */}
      <SmartCropperModal
        isOpen={showSmartCropModal}
        isInfoOnly={smartCropInfoOnly}
        onClose={() => {
          setShowSmartCropModal(false);
          setSmartCropInfoOnly(false);
        }}
        onApply={({ margin, targetScope, pageScope, customRange, selectedFileIds }) => {
          const newMargin = typeof margin === 'number' ? margin : 0;
          setSmartCropMargin(newMargin);
          if (targetScope) setCropScope(targetScope);
          if (pageScope) setCropPageScope(pageScope);
          if (customRange !== undefined) setCropCustomRange(customRange);
          setSmartCropActive(true);

          setPdfItems((prev) =>
            prev.map((it) => {
              const shouldCrop = targetScope === 'all'
                ? Boolean(it.hasScanBorders)
                : targetScope === 'selected'
                ? (selectedFileIds ? selectedFileIds.includes(it.id) : Boolean(it.cropEnabled))
                : Boolean(it.hasScanBorders);
              return {
                ...it,
                cropEnabled: shouldCrop,
                cropPageRange: pageScope === 'custom' ? (customRange || `1-${it.pageCount}`) : (pageScope || 'all'),
                cropMargin: newMargin
              };
            })
          );
          const count = targetScope === 'all'
            ? pdfItems.filter((it) => it.hasScanBorders).length
            : targetScope === 'selected'
            ? (selectedFileIds ? selectedFileIds.length : pdfItems.filter((it) => it.cropEnabled).length)
            : pdfItems.filter((it) => it.hasScanBorders).length;
          showCropToast(
            newMargin
              ? `Clean margins (${newMargin}pt) applied to ${count} of ${pdfItems.length} documents`
              : `Original dimensions restored for ${count} of ${pdfItems.length} documents`,
            'success'
          );
        }}
        onSkip={() => {
          setSmartCropActive(false);
          setPdfItems((prev) => prev.map((it) => ({ ...it, cropEnabled: false })));
          showCropToast('Smart Cropping skipped, original documents kept', 'info');
        }}
        detectedCount={pdfItems.filter((it) => it.hasScanBorders).length}
        detectedFiles={detectedScanFiles}
        currentMargin={smartCropMargin}
        onMarginChange={setSmartCropMargin}
        items={pdfItems}
        initialScope={cropScope}
        initialPageScope={cropPageScope}
        initialCustomRange={cropCustomRange}
      />

      {/* Toast Notification for Crop & Document Actions */}
      {cropToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 dark:bg-zinc-900/95 text-white rounded-xl shadow-2xl border border-emerald-500/40 backdrop-blur-md transition-all duration-300 pointer-events-auto"
        >
          <span className={`material-symbols-outlined text-[18px] ${cropToast.type === 'success' ? 'text-emerald-400' : 'text-sky-400'}`}>
            {cropToast.type === 'success' ? 'check_circle' : 'info'}
          </span>
          <span className="text-xs font-medium text-slate-100 max-w-sm sm:max-w-md truncate">
            {cropToast.message}
          </span>
          {cropToast.actionLabel && cropToast.onAction && (
            <button
              type="button"
              onClick={() => {
                const action = cropToast.onAction;
                setCropToast(null);
                action();
              }}
              className="ml-1 px-2 py-0.5 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-md cursor-pointer transition-colors"
            >
              {cropToast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCropToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded"
            aria-label="Dismiss notification"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
    </ToolPageLayout>
  );
}
