/**
 * Canvas & PDF Document Lifecycle Teardown Utilities
 * 
 * Provides fail-safe teardown routines for HTML5 Canvas elements and PDF.js
 * document proxies to guarantee zero memory leaks and immediate V8/GPU
 * backing pixel buffer release upon component unmount.
 */

/**
 * Safely releases a canvas element's backing store and 2D context memory.
 * Immediately frees V8 / browser GPU backing pixel store by clearing the
 * context and setting canvas dimensions to 0.
 * Safe with null, undefined, React refs, detached or mock canvas elements.
 * 
 * @param {HTMLCanvasElement|{ current: HTMLCanvasElement }|null|undefined} canvas
 */
export function releaseCanvas(canvas) {
  if (!canvas) return;

  // Handle arrays of canvases or refs
  if (Array.isArray(canvas)) {
    canvas.forEach(releaseCanvas);
    return;
  }

  // Unwrap React ref if a ref object is passed directly
  const target = (typeof canvas === 'object' && 'current' in canvas) ? canvas.current : canvas;
  if (!target || typeof target !== 'object') return;

  // 1. Clear 2D context if present
  try {
    if (typeof target.getContext === 'function') {
      const ctx = target.getContext('2d');
      if (ctx && typeof ctx.clearRect === 'function') {
        const w = Number(target.width) || 0;
        const h = Number(target.height) || 0;
        if (w > 0 && h > 0) {
          ctx.clearRect(0, 0, w, h);
        }
      }
    }
  } catch (_err) {
    // Suppress context access errors on detached, secured, or headless canvas elements
  }

  // 2. Collapse dimensions to immediately release backing pixel memory
  try {
    if ('width' in target) {
      target.width = 0;
    }
    if ('height' in target) {
      target.height = 0;
    }
  } catch (_err) {
    // Suppress dimension modification errors on frozen/restricted objects
  }
}

/**
 * Safely calls `.destroy()`, `.cancel()`, or `.cleanup()` on PDF.js document proxies,
 * loading tasks, or render tasks.
 * Catches synchronous exceptions and rejects unhandled promise rejections so
 * unmounting components never crash.
 * Safe with null, undefined, React refs, arrays, and mock documents.
 * 
 * @param {object|{ current: object }|Array|null|undefined} pdfDoc
 */
export function safeDestroyPdf(pdfDoc) {
  if (!pdfDoc) return;

  // Handle arrays of documents or proxies
  if (Array.isArray(pdfDoc)) {
    pdfDoc.forEach(safeDestroyPdf);
    return;
  }

  // Unwrap React ref if passed directly
  const target = (typeof pdfDoc === 'object' && 'current' in pdfDoc) ? pdfDoc.current : pdfDoc;
  if (!target || typeof target !== 'object') return;

  try {
    if (typeof target.destroy === 'function') {
      const result = target.destroy();
      // Handle promise rejection if destroy() returns a Promise
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } else if (typeof target.cancel === 'function') {
      const result = target.cancel();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } else if (typeof target.cleanup === 'function') {
      const result = target.cleanup();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    }
  } catch (_err) {
    // Suppress synchronous destruction errors
  }
}

/**
 * Safely cancels an in-flight PDF.js render task, catching any synchronous errors
 * or rejected promises so unmounting/page-swapping components never crash.
 * Safe with null, undefined, React refs, and arrays.
 * 
 * @param {object|{ current: object }|Array|null|undefined} renderTask
 */
export function safeCancelRenderTask(renderTask) {
  if (!renderTask) return;

  if (Array.isArray(renderTask)) {
    renderTask.forEach(safeCancelRenderTask);
    return;
  }

  const target = (typeof renderTask === 'object' && 'current' in renderTask) ? renderTask.current : renderTask;
  if (!target || typeof target !== 'object') return;

  try {
    if (target.promise && typeof target.promise.catch === 'function') {
      target.promise.catch(() => {});
    }
    if (typeof target.cancel === 'function') {
      const result = target.cancel();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    }
  } catch (_err) {
    // Suppress cancellation errors
  }
}

export default {
  releaseCanvas,
  safeDestroyPdf,
  safeCancelRenderTask
};
