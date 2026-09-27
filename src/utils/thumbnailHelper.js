/**
 * DPR-Aware Thumbnail Resolution Capping & Offscreen Rendering Utilities
 * Topic 4 of 6: High-DPI Capping, Safe Bounded Viewports & Leak-Proof Canvas Teardown
 * 
 * Provides dynamic viewport scaling capped strictly to target dimensions and max DPR,
 * preventing massive GPU/V8 memory bloat from ultra-large documents (e.g. architectural blueprints)
 * and ultra-high pixel ratio screens (3x/4x mobile/retina displays).
 */

import { releaseCanvas, safeCancelRenderTask } from './canvasLifecycle.js';

export const THUMBNAIL_DEFAULTS = Object.freeze({
  TARGET_WIDTH: 160,
  MAX_DPR: 2,
  MIN_SCALE: 0.05,
  MAX_SCALE: 2.0,
  DEFAULT_ROTATION: 0,
  DEFAULT_QUALITY: 0.8,
  DEFAULT_FORMAT: 'image/jpeg'
});

/**
 * Computes a memory-bounded, DPR-aware viewport for a PDF.js page.
 * 
 * Dynamically computes scale:
 *   scale = (targetWidth * Math.min(window.devicePixelRatio || 1, maxDpr)) / unscaledWidth
 * Clamps scale strictly between 0.05 (guards 3000pt+ blueprints) and 2.0 (guards microscopic PDFs).
 * 
 * @param {object} page - PDF.js PageProxy object
 * @param {object} [options={}] - Viewport configuration options
 * @param {number} [options.targetWidth=160] - Target CSS layout width in pixels
 * @param {number} [options.maxDpr=2] - Maximum device pixel ratio cap
 * @param {number} [options.rotation=0] - Page rotation in degrees (0, 90, 180, 270)
 * @param {number} [options.dpr] - Explicit device pixel ratio override (useful for testing)
 * @returns {object} PDF.js PageViewport instance
 */
export function computeThumbnailViewport(page, options = {}) {
  if (!page || typeof page.getViewport !== 'function') {
    throw new TypeError('[DocScalar] computeThumbnailViewport requires a valid PDF.js page object.');
  }

  const targetWidth = Number(options.targetWidth) > 0 
    ? Number(options.targetWidth) 
    : THUMBNAIL_DEFAULTS.TARGET_WIDTH;

  const maxDpr = Number(options.maxDpr) > 0 
    ? Number(options.maxDpr) 
    : THUMBNAIL_DEFAULTS.MAX_DPR;

  const rotation = options.rotation !== undefined 
    ? Number(options.rotation) 
    : (typeof page.rotate === 'number' ? page.rotate : THUMBNAIL_DEFAULTS.DEFAULT_ROTATION);

  // 1. Calculate unscaled page width at the requested rotation (scale: 1.0)
  let unscaledWidth = targetWidth;
  try {
    const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
    if (unscaledViewport && typeof unscaledViewport.width === 'number' && isFinite(unscaledViewport.width) && unscaledViewport.width > 0) {
      unscaledWidth = unscaledViewport.width;
    }
  } catch (_e) {
    unscaledWidth = targetWidth;
  }

  // 2. Resolve DPR with upper bound clamped to maxDpr
  const rawDpr = options.dpr !== undefined 
    ? Number(options.dpr) 
    : ((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1);
  const safeDpr = (!isNaN(rawDpr) && isFinite(rawDpr) && rawDpr > 0) ? rawDpr : 1;
  const effectiveDpr = Math.min(safeDpr, maxDpr);

  // 3. Calculate dynamic scale and clamp within safety bounds [0.05, 2.0]
  const calculatedScale = (targetWidth * effectiveDpr) / unscaledWidth;
  const safeCalculatedScale = (typeof calculatedScale === 'number' && isFinite(calculatedScale) && calculatedScale > 0)
    ? calculatedScale
    : 1.0;
  const boundedScale = Math.min(
    Math.max(safeCalculatedScale, THUMBNAIL_DEFAULTS.MIN_SCALE),
    THUMBNAIL_DEFAULTS.MAX_SCALE
  );

  // 4. Return bounded viewport
  return page.getViewport({ scale: boundedScale, rotation });
}

/**
 * Calculates theoretical backing pixel buffer memory in bytes for a given canvas dimension.
 * Formula: width * height * 4 bytes (RGBA 32-bit).
 * 
 * @param {number} width - Canvas pixel width
 * @param {number} height - Canvas pixel height
 * @returns {number} Backing buffer memory in bytes
 */
export function computeThumbnailMemoryBytes(width, height) {
  const w = Math.max(0, Math.round(Number(width) || 0));
  const h = Math.max(0, Math.round(Number(height) || 0));
  return w * h * 4;
}

/**
 * Renders a PDF page to a target canvas with DPR-aware resolution capping and cancellation safety.
 * 
 * @param {object} page - PDF.js PageProxy object
 * @param {HTMLCanvasElement|{ current: HTMLCanvasElement }} canvas - Target canvas element or React ref
 * @param {object} [options={}] - Render options
 * @param {number} [options.targetWidth=160] - Target layout width in pixels
 * @param {number} [options.maxDpr=2] - Maximum device pixel ratio cap
 * @param {number} [options.rotation=0] - Page rotation in degrees
 * @param {boolean} [options.cancelExisting=true] - Whether to cancel any prior active render task
 * @param {object} [options.renderTask] - Explicit prior render task to cancel
 * @param {string} [options.backgroundColor] - Optional background fill (e.g. '#ffffff')
 * @param {object} [options.renderOptions] - Additional options forwarded to page.render()
 * @returns {{ renderTask: object|null, viewport: object|null, width: number, height: number }}
 */
export function renderThumbnailToCanvas(page, canvas, options = {}) {
  if (!page) {
    return { renderTask: null, viewport: null, width: 0, height: 0 };
  }

  const targetCanvas = (canvas && typeof canvas === 'object' && 'current' in canvas) 
    ? canvas.current 
    : canvas;

  if (!targetCanvas) {
    return { renderTask: null, viewport: null, width: 0, height: 0 };
  }

  // Handle render task cancellation
  if (options.cancelExisting !== false) {
    if (options.renderTask) {
      safeCancelRenderTask(options.renderTask);
    }
    if (targetCanvas._docscalarRenderTask) {
      safeCancelRenderTask(targetCanvas._docscalarRenderTask);
      targetCanvas._docscalarRenderTask = null;
    }
  }

  const viewport = computeThumbnailViewport(page, options);
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);

  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = typeof targetCanvas.getContext === 'function' 
    ? targetCanvas.getContext('2d', options.contextAttributes) 
    : null;

  if (!ctx) {
    return { renderTask: null, viewport, width, height };
  }

  if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0, 0, width, height);
  }

  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  const renderArgs = {
    canvasContext: ctx,
    viewport,
    ...(options.intent ? { intent: options.intent } : {}),
    ...(options.transform ? { transform: options.transform } : {}),
    ...(options.renderOptions || {})
  };

  const renderTask = page.render(renderArgs);
  targetCanvas._docscalarRenderTask = renderTask;

  if (renderTask && renderTask.promise) {
    if (typeof renderTask.promise.finally === 'function') {
      renderTask.promise
        .finally(() => {
          if (targetCanvas._docscalarRenderTask === renderTask) {
            targetCanvas._docscalarRenderTask = null;
          }
        })
        .catch(() => {});
    } else if (typeof renderTask.promise.catch === 'function') {
      renderTask.promise.catch(() => {});
    }
  }

  return { renderTask, viewport, width, height };
}

/**
 * Renders a PDF page offscreen to a lightweight image data URL (JPEG/WebP) and
 * immediately frees the backing canvas memory via releaseCanvas().
 * 
 * @param {object} page - PDF.js PageProxy object
 * @param {object} [options={}] - Configuration and render options
 * @param {number} [options.targetWidth=160] - Target layout width in pixels
 * @param {number} [options.maxDpr=2] - Maximum device pixel ratio cap
 * @param {number} [options.rotation=0] - Page rotation in degrees
 * @param {string} [options.format='image/jpeg'] - Output image MIME type ('image/jpeg' or 'image/webp')
 * @param {number} [options.quality=0.8] - Image quality (0.0 to 1.0)
 * @param {string} [options.backgroundColor='#FFFFFF'] - Canvas background fill color
 * @param {HTMLCanvasElement} [options.canvas] - Optional custom canvas instance (for testing/mocking)
 * @returns {Promise<string>} Data URL string of the rendered thumbnail
 */
export async function renderThumbnailToDataUrl(page, options = {}) {
  if (!page) return '';

  const viewport = computeThumbnailViewport(page, options);
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);

  const canvas = options.canvas || (typeof document !== 'undefined' && document.createElement
    ? document.createElement('canvas')
    : null);

  if (!canvas) {
    return '';
  }

  canvas.width = width;
  canvas.height = height;

  try {
    const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    if (!ctx) return '';

    const format = options.format || THUMBNAIL_DEFAULTS.DEFAULT_FORMAT;
    const quality = options.quality !== undefined ? options.quality : THUMBNAIL_DEFAULTS.DEFAULT_QUALITY;

    // Fill background unless explicitly disabled ('transparent' or null)
    const bg = options.backgroundColor !== undefined ? options.backgroundColor : '#FFFFFF';
    if (bg && bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      ...(options.intent ? { intent: options.intent } : {}),
      ...(options.transform ? { transform: options.transform } : {}),
      ...(options.renderOptions || {})
    });

    if (renderTask && renderTask.promise) {
      await renderTask.promise;
    }

    let dataUrl = '';
    if (typeof canvas.toDataURL === 'function') {
      dataUrl = canvas.toDataURL(format, quality);
    }
    return dataUrl;
  } finally {
    releaseCanvas(canvas);
  }
}

export default {
  THUMBNAIL_DEFAULTS,
  computeThumbnailViewport,
  computeThumbnailMemoryBytes,
  renderThumbnailToCanvas,
  renderThumbnailToDataUrl
};
