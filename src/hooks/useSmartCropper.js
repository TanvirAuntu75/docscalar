import { useState, useCallback, useRef, useEffect } from 'react';
import { detectSmartBorders, computeCleanPdfCropBox } from '../utils/pdfZoneScanner';
import { getSmartCropPreference, shouldAutoApplySmartCrop, shouldAutoShowSmartCropModal } from '../utils/smartCropperStorage';
import { useAuth } from '../context/AuthContext';
import { getSmartCropQuota, consumeSmartCropClick } from '../utils/smartCropQuota';
import { getPdfjsDocParams } from '../utils/pdfConfig';

/**
 * DocScalar Universal Smart Cropper Hook
 *
 * Provides content-aware scan border detection, undo/redo, page-scope management,
 * per-edge control, and canvas overlay rendering for any studio that renders
 * PDF pages via pdfjs-dist to an HTML5 canvas.
 *
 * Usage:
 *   const cropper = useSmartCropper({ canvasRef, totalPages });
 *   // After rendering a page to canvas:
 *   cropper.runDetection(currentPage, baseViewport);
 *   // In sidebar: <SmartCropperPanel {...cropper} />
 *   // To apply in engine: pass cropper.getEngineOptions() to your engine
 *
 * Handles adversarial edge cases:
 *   - Black background PDFs with white text (inverted document guard)
 *   - Full-bleed magazine/poster designs (color variance analysis)
 *   - Decorative borders (Content Fence Guard)
 *   - Content near scan shadow edges (automatic retreat)
 *   - Clean professional PDFs (zero changes)
 *   - Mixed orientation pages (per-page independent detection)
 */
export default function useSmartCropper({ canvasRef, totalPages = 0 }) {
  // ── Auth & Quota Entitlement State ──────────────────────────────────
  let auth = null;
  try {
    auth = useAuth();
  } catch {
    auth = { isAuthenticated: false, userTier: 'guest', isPro: false, userEmail: '' };
  }

  const [quota, setQuota] = useState(() => getSmartCropQuota(auth));
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalType, setLimitModalType] = useState('guest'); // 'guest' | 'limit_reached'

  useEffect(() => {
    const handleQuotaChange = () => {
      setQuota(getSmartCropQuota(auth));
    };
    handleQuotaChange();
    if (typeof window !== 'undefined') {
      window.addEventListener('docscalar_smart_crop_quota_changed', handleQuotaChange);
      return () => window.removeEventListener('docscalar_smart_crop_quota_changed', handleQuotaChange);
    }
  }, [auth]);

  // ── Detection State ─────────────────────────────────────────────────
  const [detectedCropBoxes, setDetectedCropBoxes] = useState({}); // pageIndex -> smartBorderResult
  const [pdfCropBoxes, setPdfCropBoxes] = useState({}); // pageIndex -> pdfCropBox (in PDF points)
  const [hasDetectedBorders, setHasDetectedBorders] = useState(false);
  const [isInvertedDocument, setIsInvertedDocument] = useState(false);
  const [currentPageDetection, setCurrentPageDetection] = useState(null); // latest detection result
  const [detectionReason, setDetectionReason] = useState(''); // human-readable status

  // ── Crop Control State ──────────────────────────────────────────────
  // STRICT TIER RULE: Only Pro subscribers can auto-apply. Guests and Free users NEVER auto-apply!
  const [isActive, setIsActive] = useState(() => {
    const isProUser = Boolean(auth?.isPro || (auth?.isAuthenticated && auth?.userTier === 'pro'));
    return isProUser && shouldAutoApplySmartCrop();
  });
  const [cleanMargin, setCleanMargin] = useState(() => {
    const prefMargin = getSmartCropPreference().cleanMargin;
    return typeof prefMargin === 'number' ? prefMargin : 0;
  }); // margin perimeter in pts (0 = original dimensions restored)
  const [enabledEdges, setEnabledEdges] = useState({ top: true, bottom: true, left: true, right: true });

  // ── Educational & Decision Modal State ───────────────────────────────
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isInfoOnlyModal, setIsInfoOnlyModal] = useState(false);
  const hasPromptedModalRef = useRef(false);
  const onOpenInfo = useCallback((infoOnly = true) => {
    setIsInfoOnlyModal(Boolean(infoOnly));
    setShowInfoModal(true);
  }, []);
  const closeInfoModal = useCallback(() => {
    hasPromptedModalRef.current = true;
    setShowInfoModal(false);
    setIsInfoOnlyModal(false);
  }, []);

  // Listen for storage preference updates across tools/components
  useEffect(() => {
    const handlePrefChange = (e) => {
      const pref = e?.detail || getSmartCropPreference();
      if (typeof pref?.cleanMargin === 'number') setCleanMargin(pref.cleanMargin);
      if (pref?.dontShowAgain && pref?.rememberChoice === 'apply') {
        setIsActive(true);
      } else if (!pref?.dontShowAgain) {
        hasPromptedModalRef.current = false;
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('docscalar_smart_crop_pref_changed', handlePrefChange);
      return () => window.removeEventListener('docscalar_smart_crop_pref_changed', handlePrefChange);
    }
  }, []);

  // ── Page Scope State ────────────────────────────────────────────────
  const [scopeMode, setScopeMode] = useState('all'); // 'all' | 'current' | 'range'
  const [pageRange, setPageRange] = useState(''); // e.g. "1-5, 8, 12-18"
  const [currentPage, setCurrentPageInternal] = useState(1);

  // ── Undo State & Synchronous Refs ────────────────────────────────────
  const originalBytesRef = useRef(null); // stores pre-crop original PDF ArrayBuffer
  const latestDetectionRef = useRef(null); // synchronous latest detection to prevent React state lag
  const pageDetectionCacheRef = useRef(new Map()); // resolution-specific detection cache
  const canonicalCacheRef = useRef(new Map()); // pageNum_enabledEdges -> canonical invariant detection in PDF points

  /**
   * Run smart border detection on the currently rendered canvas.
   * Call this after pdfjs-dist finishes rendering a page to the canvas.
   *
   * @param {number} pageNum - 1-based page number being displayed
   * @param {{ width: number, height: number }} baseViewport - pdfjs base viewport (scale=1.0)
   * @param {HTMLCanvasElement|null} [canvasOverride] - Optional canvas override
   */
  const runDetection = useCallback((pageNum, baseViewport, canvasOverride = null) => {
    const canvas = canvasOverride || canvasRef?.current;
    if (!canvas || !baseViewport || !canvas.width || !canvas.height) return null;

    // Check if canonical detection for this page is already cached (resolution-invariant across zoom levels)
    const canonicalKey = `${pageNum}_${JSON.stringify(enabledEdges)}`;
    if (canonicalCacheRef.current.has(canonicalKey)) {
      const canonical = canonicalCacheRef.current.get(canonicalKey);
      const scaleX = canvas.width / (baseViewport.width || 1);
      const scaleY = canvas.height / (baseViewport.height || 1);
      const cropLeftPx = Math.round((canonical.pdfCrop?.cropLeft || 0) * scaleX);
      const cropRightPx = Math.round((canonical.pdfCrop?.cropRight || 0) * scaleX);
      const cropTopPx = Math.round((canonical.pdfCrop?.cropTop || 0) * scaleY);
      const cropBottomPx = Math.round((canonical.pdfCrop?.cropBottom || 0) * scaleY);

      const adapted = {
        ...canonical,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        cropLeft: cropLeftPx,
        cropRight: cropRightPx,
        cropTop: cropTopPx,
        cropBottom: cropBottomPx,
        cleanBoxPx: {
          x: cropLeftPx,
          y: cropTopPx,
          width: Math.max(10, canvas.width - cropLeftPx - cropRightPx),
          height: Math.max(10, canvas.height - cropTopPx - cropBottomPx)
        }
      };

      latestDetectionRef.current = adapted;
      setCurrentPageDetection(adapted);
      setCurrentPageInternal(pageNum);
      setHasDetectedBorders(adapted.hasBlackBorders);
      setIsInvertedDocument(!!adapted.isInvertedDocument);
      return adapted;
    }

    const result = detectSmartBorders(canvas, { enabledEdges });
    const pageIdx = pageNum - 1;

    // Convert to PDF coordinates
    const pdfCrop = computeCleanPdfCropBox(
      baseViewport.width,
      baseViewport.height,
      canvas.width,
      canvas.height,
      result
    );

    // Attach canonical coordinates and viewport metadata for resolution invariance
    result.pdfCrop = pdfCrop;
    result.baseViewport = { width: baseViewport.width, height: baseViewport.height };
    result.canvasWidth = canvas.width;
    result.canvasHeight = canvas.height;

    // Store in refs for synchronous, race-condition-free access
    latestDetectionRef.current = result;
    canonicalCacheRef.current.set(canonicalKey, result);
    const cacheKey = `${pageNum}_${canvas.width}x${canvas.height}_${JSON.stringify(enabledEdges)}`;
    pageDetectionCacheRef.current.set(cacheKey, result);

    setCurrentPageDetection(result);
    setCurrentPageInternal(pageNum);

    if (result.isInvertedDocument) {
      setIsInvertedDocument(true);
      setHasDetectedBorders(false);
      setDetectionReason(result.reason || 'Inverted/dark background document — auto-crop disabled');
      return result;
    }

    setIsInvertedDocument(false);

    // Store per-page detection
    setDetectedCropBoxes((prev) => ({ ...prev, [pageIdx]: result }));
    setPdfCropBoxes((prev) => ({ ...prev, [pageIdx]: pdfCrop }));

    setHasDetectedBorders(result.hasBlackBorders);

    if (result.hasBlackBorders) {
      const activeEdges = Object.entries(result.edgeData || {})
        .filter(([, d]) => d.cropPx > 0)
        .map(([edge]) => edge);
      setDetectionReason(`Scan borders detected on ${activeEdges.join(', ')} edge${activeEdges.length > 1 ? 's' : ''} (${result.overallConfidence}% confidence)`);

      const isProUser = Boolean(auth?.isPro || (auth?.isAuthenticated && auth?.userTier === 'pro'));
      if (isProUser && shouldAutoApplySmartCrop()) {
        setIsActive(true);
      } else if (auth?.isAuthenticated && shouldAutoShowSmartCropModal() && !hasPromptedModalRef.current) {
        hasPromptedModalRef.current = true;
        setShowInfoModal(true);
      }
    } else {
      setDetectionReason('No scan border artifacts detected — document appears clean');
    }

    return result;
  }, [canvasRef, enabledEdges, auth]);

  /**
   * Apply the cropper to the canvas preview. Redraws the canvas with
   * borders cropped and content refitted with clean margins.
   * Dynamically scales from canonical PDF points so cropping is 100%
   * invariant across all zoom levels and window resizing.
   *
   * @param {HTMLCanvasElement} canvas - The canvas to modify
   * @param {number} scaleMultiplier - Current viewport scale
   * @param {object|null} [detectionOverride] - Synchronous detection result override
   * @param {object|null} [baseViewportOverride] - Optional baseViewport { width, height }
   * @param {boolean} [forceActive=false] - Force preview rendering even if React isActive state is still syncing
   */
  const applyCanvasPreview = useCallback((canvas, scaleMultiplier = 1.5, detectionOverride = null, baseViewportOverride = null, forceActive = false) => {
    const detection = detectionOverride || latestDetectionRef.current || currentPageDetection;
    if (!canvas || (!isActive && !forceActive) || !detection?.hasBlackBorders) return;

    // Derive crop rectangle dynamically for the current canvas dimensions
    // using canonical PDF points or scale factors so crop is 100% zoom-invariant
    const baseW = baseViewportOverride?.width || detection.baseViewport?.width || (canvas.width / scaleMultiplier);
    const baseH = baseViewportOverride?.height || detection.baseViewport?.height || (canvas.height / scaleMultiplier);

    let cropLeftPx = 0;
    let cropRightPx = 0;
    let cropTopPx = 0;
    let cropBottomPx = 0;

    if (detection.pdfCrop && baseW > 0 && baseH > 0) {
      const scaleX = canvas.width / baseW;
      const scaleY = canvas.height / baseH;
      cropLeftPx = Math.round((detection.pdfCrop.cropLeft || 0) * scaleX);
      cropRightPx = Math.round((detection.pdfCrop.cropRight || 0) * scaleX);
      cropTopPx = Math.round((detection.pdfCrop.cropTop || 0) * scaleY);
      cropBottomPx = Math.round((detection.pdfCrop.cropBottom || 0) * scaleY);
    } else if (detection.canvasWidth && detection.canvasHeight) {
      const ratioX = canvas.width / detection.canvasWidth;
      const ratioY = canvas.height / detection.canvasHeight;
      cropLeftPx = Math.round((detection.cropLeft || 0) * ratioX);
      cropRightPx = Math.round((detection.cropRight || 0) * ratioX);
      cropTopPx = Math.round((detection.cropTop || 0) * ratioY);
      cropBottomPx = Math.round((detection.cropBottom || 0) * ratioY);
    } else {
      const clean = detection.cleanBoxPx || { x: 0, y: 0, width: canvas.width, height: canvas.height };
      cropLeftPx = clean.x;
      cropRightPx = Math.max(0, canvas.width - (clean.x + clean.width));
      cropTopPx = clean.y;
      cropBottomPx = Math.max(0, canvas.height - (clean.y + clean.height));
    }

    // Clamp crops safely to prevent over-cropping or inverted rectangles
    const maxCropX = Math.floor(canvas.width * 0.40);
    const maxCropY = Math.floor(canvas.height * 0.40);
    cropLeftPx = Math.min(cropLeftPx, maxCropX);
    cropRightPx = Math.min(cropRightPx, maxCropX);
    cropTopPx = Math.min(cropTopPx, maxCropY);
    cropBottomPx = Math.min(cropBottomPx, maxCropY);

    const cleanX = cropLeftPx;
    const cleanY = cropTopPx;
    const cleanW = Math.max(1, canvas.width - (cropLeftPx + cropRightPx));
    const cleanH = Math.max(1, canvas.height - (cropTopPx + cropBottomPx));

    // Convert cleanMargin (in PDF points) to canvas pixels
    const marginPts = typeof cleanMargin === 'number' ? cleanMargin : 0;
    const marginPx = Math.round(marginPts * scaleMultiplier);

    // Create an offscreen buffer holding the clean cropped content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cleanW;
    tempCanvas.height = cleanH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, cleanX, cleanY, cleanW, cleanH, 0, 0, cleanW, cleanH);

    // Compute fitted dimensions with margin inside original canvas bounds
    const availableW = Math.max(1, canvas.width - marginPx * 2);
    const availableH = Math.max(1, canvas.height - marginPx * 2);
    const scaleFactor = Math.min(availableW / cleanW, availableH / cleanH);

    const destW = Math.round(cleanW * scaleFactor);
    const destH = Math.round(cleanH * scaleFactor);
    const destX = Math.round((canvas.width - destW) / 2);
    const destY = Math.round((canvas.height - destH) / 2);

    const ctx = canvas.getContext('2d');
    // Fill background with clean neutral canvas color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw cropped, refitted content
    ctx.drawImage(tempCanvas, destX, destY, destW, destH);
  }, [isActive, currentPageDetection, cleanMargin]);

  /**
   * Activate the cropper (user clicked "Clean Borders").
   * Strictly verifies authentication and daily free quota:
   * - Guests: Opens guest registration modal, blocks crop.
   * - Free Users: Consumes 1 click (max 3/day). If limit reached, opens limit modal.
   * - Pro Subscribers: Unlimited access with 0 deduction.
   *
   * @param {ArrayBuffer} [pdfBytes] - Original PDF file bytes for undo support
   * @returns {boolean} Whether activation succeeded
   */
  const activate = useCallback((pdfBytes = null) => {
    const currentQuota = getSmartCropQuota(auth);

    if (!currentQuota.isAuthenticated) {
      setLimitModalType('guest');
      setLimitModalOpen(true);
      return false;
    }

    if (!currentQuota.allowed) {
      setLimitModalType('limit_reached');
      setLimitModalOpen(true);
      return false;
    }

    if (!currentQuota.isPro) {
      const result = consumeSmartCropClick(auth);
      if (!result.success) {
        setLimitModalType('limit_reached');
        setLimitModalOpen(true);
        return false;
      }
      setQuota(result);
    }

    if (pdfBytes && !originalBytesRef.current) {
      originalBytesRef.current = pdfBytes.slice(0); // deep copy
    }
    setIsActive(true);
    return true;
  }, [auth]);

  /**
   * Deactivate the cropper (user clicked "Revert to Original").
   * Returns the original PDF bytes if stored.
   *
   * @returns {ArrayBuffer|null} Original PDF bytes, or null if not stored
   */
  const revert = useCallback(() => {
    setIsActive(false);
    return originalBytesRef.current;
  }, []);

  /**
   * Toggle a specific edge on/off.
   *
   * @param {'top'|'bottom'|'left'|'right'} edge
   */
  const toggleEdge = useCallback((edge) => {
    setEnabledEdges((prev) => {
      const next = { ...prev, [edge]: !prev[edge] };
      pageDetectionCacheRef.current.clear();
      canonicalCacheRef.current.clear();
      return next;
    });
  }, []);

  /**
   * Parse a page range string into a Set of 0-based page indices.
   * Supports formats: "1-5, 8, 12-18"
   *
   * @param {string} rangeStr
   * @param {number} total - Total number of pages
   * @returns {Set<number>} 0-based page indices
   */
  const parsePageRange = useCallback((rangeStr, total) => {
    const indices = new Set();
    if (!rangeStr.trim()) return indices;

    rangeStr.split(',').forEach((part) => {
      const trimmed = part.trim();
      const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
      if (dashMatch) {
        const start = Math.max(1, parseInt(dashMatch[1], 10));
        const end = Math.min(total, parseInt(dashMatch[2], 10));
        for (let i = start; i <= end; i++) indices.add(i - 1);
      } else {
        const num = parseInt(trimmed, 10);
        if (num >= 1 && num <= total) indices.add(num - 1);
      }
    });

    return indices;
  }, []);

  /**
   * Get options to pass to the processing engine (cleanAndRefitDocument).
   * Includes crop boxes, enabled edges, page indices, and margin.
   *
   * @returns {object} Engine-ready options
   */
  const getEngineOptions = useCallback(() => {
    if (!isActive) return {};

    let pageIndices = null;
    if (scopeMode === 'current') {
      pageIndices = [currentPage - 1];
    } else if (scopeMode === 'range' && pageRange.trim()) {
      pageIndices = [...parsePageRange(pageRange, totalPages)];
    }
    // scopeMode === 'all' → pageIndices = null (all pages)

    return {
      autoCropBlackBorders: true,
      pageCropBoxes: pdfCropBoxes,
      cleanMargin,
      enabledEdges,
      pageIndices
    };
  }, [isActive, pdfCropBoxes, cleanMargin, enabledEdges, scopeMode, currentPage, pageRange, totalPages, parsePageRange]);

  /**
   * Asynchronously get options to pass to the processing engine (cleanAndRefitDocument),
   * guaranteeing that any un-rendered pages within the target scope are scanned on-demand.
   *
   * @param {File|Blob} [file] - Source PDF file/blob to scan missing pages from
   * @param {object} [pdfjs] - pdfjs-dist instance
   * @param {function} [onProgress] - Optional progress callback
   * @returns {Promise<object>} Engine-ready options with complete pageCropBoxes
   */
  const getEngineOptionsAsync = useCallback(async (file, pdfjs, onProgress) => {
    const baseOpts = getEngineOptions();
    if (!isActive || !file || !pdfjs) return baseOpts;

    const pageIndices = baseOpts.pageIndices || Array.from({ length: totalPages }, (_, i) => i);
    const existing = { ...(baseOpts.pageCropBoxes || {}) };
    const missing = pageIndices.filter((idx) => !existing[idx]);

    if (missing.length > 0) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjs.getDocument(getPdfjsDocParams(arrayBuffer)).promise;
        for (let i = 0; i < missing.length; i++) {
          const idx = missing[i];
          const pageNum = idx + 1;
          const page = await pdfDoc.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1.0 });
          const offCanvas = document.createElement('canvas');
          offCanvas.width = Math.floor(baseViewport.width);
          offCanvas.height = Math.floor(baseViewport.height);
          const ctx = offCanvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: baseViewport }).promise;
          const det = detectSmartBorders(offCanvas, { enabledEdges });
          const pdfCrop = computeCleanPdfCropBox(baseViewport.width, baseViewport.height, offCanvas.width, offCanvas.height, det);
          existing[idx] = pdfCrop;
          if (onProgress) {
            onProgress(Math.round(((i + 1) / missing.length) * 100));
          }
        }
        pdfDoc.destroy();
      } catch (err) {
        console.warn('[DocScalar SmartCropper] Background page scan error:', err);
      }
    }

    return {
      ...baseOpts,
      pageCropBoxes: existing
    };
  }, [getEngineOptions, isActive, totalPages, enabledEdges]);

  /**
   * Check if a specific page (1-based) is within the current scope.
   *
   * @param {number} pageNum - 1-based page number
   * @returns {boolean}
   */
  const isPageInScope = useCallback((pageNum) => {
    if (scopeMode === 'all') return true;
    if (scopeMode === 'current') return pageNum === currentPage;
    if (scopeMode === 'range' && pageRange.trim()) {
      return parsePageRange(pageRange, totalPages).has(pageNum - 1);
    }
    return true;
  }, [scopeMode, currentPage, pageRange, totalPages, parsePageRange]);

  /**
   * Reset all detection and crop state.
   */
  const reset = useCallback(() => {
    setDetectedCropBoxes({});
    setPdfCropBoxes({});
    setHasDetectedBorders(false);
    setIsInvertedDocument(false);
    setCurrentPageDetection(null);
    setDetectionReason('');
    setIsActive(false);
    setCleanMargin(18);
    setEnabledEdges({ top: true, bottom: true, left: true, right: true });
    setScopeMode('all');
    setPageRange('');
    originalBytesRef.current = null;
    latestDetectionRef.current = null;
    pageDetectionCacheRef.current.clear();
    canonicalCacheRef.current.clear();
  }, []);

  const clearCache = useCallback(() => {
    pageDetectionCacheRef.current.clear();
    canonicalCacheRef.current.clear();
    setDetectedCropBoxes({});
    setPdfCropBoxes({});
    setCurrentPageDetection(null);
  }, []);

  return {
    // Detection state
    hasDetectedBorders,
    isInvertedDocument,
    currentPageDetection,
    detectionReason,
    detectedCropBoxes,
    pdfCropBoxes,

    // Crop control
    isActive,
    cleanMargin,
    setCleanMargin,
    enabledEdges,
    setEnabledEdges,
    toggleEdge,

    // Page scope
    scopeMode,
    setScopeMode,
    pageRange,
    setPageRange,
    currentPage,
    isPageInScope,

    // Actions
    runDetection,
    applyCanvasPreview,
    activate,
    revert,
    reset,
    clearCache,
    getEngineOptions,
    getEngineOptionsAsync,

    // Educational & Decision Modal
    showInfoModal,
    setShowInfoModal,
    isInfoOnlyModal,
    setIsInfoOnlyModal,
    onOpenInfo,
    closeInfoModal,

    // Tier Quota & Limit Enforcement
    quota,
    limitModalOpen,
    setLimitModalOpen,
    limitModalType,
    setLimitModalType,
    closeLimitModal: () => setLimitModalOpen(false)
  };
}
