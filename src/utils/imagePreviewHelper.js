/**
 * Image Studio Preview Downsampling & Memory Guard
 * 
 * Provides bounded, low-memory thumbnail generation for image gallery cards
 * and multi-item lists. Prevents browser crashes and GPU texture memory exhaustion
 * from raw multi-megapixel images while maintaining untouched File instances
 * for high-fidelity conversion/compression engines.
 */

import { releaseCanvas } from './canvasLifecycle.js';

export const THUMBNAIL_CONFIG = {
  DEFAULT_MAX_DIMENSION: 320,
  DEFAULT_QUALITY: 0.8,
  DEFAULT_MIME_TYPE: 'image/webp',
  FALLBACK_MIME_TYPE: 'image/jpeg',
};

/**
 * Calculates proportional downscaled dimensions capping the longest edge at maxDimension.
 * Ensures aspect ratio is strictly preserved with integer pixel boundaries.
 * 
 * @param {number} width Original width
 * @param {number} height Original height
 * @param {number} [maxDimension=320] Maximum allowed size for the longest edge
 * @returns {{ width: number, height: number, scale: number, originalWidth: number, originalHeight: number }}
 */
export function computeDownscaledDimensions(width, height, maxDimension = THUMBNAIL_CONFIG.DEFAULT_MAX_DIMENSION) {
  const origW = Number(width);
  const origH = Number(height);
  const maxDim = Number(maxDimension);

  const safeMax = (Number.isFinite(maxDim) && maxDim > 0) ? maxDim : THUMBNAIL_CONFIG.DEFAULT_MAX_DIMENSION;

  if (!Number.isFinite(origW) || !Number.isFinite(origH) || origW <= 0 || origH <= 0) {
    return { width: 0, height: 0, scale: 1, originalWidth: 0, originalHeight: 0 };
  }

  const longestEdge = Math.max(origW, origH);
  if (longestEdge <= safeMax) {
    return {
      width: Math.round(origW),
      height: Math.round(origH),
      scale: 1,
      originalWidth: Math.round(origW),
      originalHeight: Math.round(origH)
    };
  }

  const scale = safeMax / longestEdge;
  const scaledW = Math.max(1, Math.round(origW * scale));
  const scaledH = Math.max(1, Math.round(origH * scale));

  return {
    width: scaledW,
    height: scaledH,
    scale,
    originalWidth: Math.round(origW),
    originalHeight: Math.round(origH)
  };
}

/**
 * Computes backing buffer memory formula: width * height * 4 bytes (RGBA).
 * 
 * @param {number} width 
 * @param {number} height 
 * @returns {number} Memory in bytes
 */
export function computeBitmapMemoryBytes(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 0;
  return Math.round(w) * Math.round(h) * 4;
}

/**
 * Safely revokes blob URLs or calls .revoke() on items/arrays/records/Sets/Maps.
 * Completely idempotent, non-throwing, and exception-shielded.
 * 
 * @param {string|{ revoke?: Function, previewUrl?: string, url?: string }|Array|Set|Map|Object|null|undefined} urls
 * @param {WeakSet} [seen] Internal guard against circular references
 */
export function safeRevokeUrls(urls, seen = new WeakSet()) {
  if (!urls) return;

  if (typeof urls === 'string') {
    if (urls.startsWith('blob:')) {
      try {
        if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(urls);
        }
      } catch (_) {}
    }
    return;
  }

  if (Array.isArray(urls)) {
    for (const item of urls) {
      safeRevokeUrls(item, seen);
    }
    return;
  }

  if (typeof urls === 'object') {
    if (seen.has(urls)) return;
    seen.add(urls);

    // Support Set
    if (urls instanceof Set) {
      for (const item of urls) {
        safeRevokeUrls(item, seen);
      }
      return;
    }

    // Support Map
    if (urls instanceof Map) {
      for (const item of urls.values()) {
        safeRevokeUrls(item, seen);
      }
      return;
    }

    // Support thumbnail object with explicit .revoke()
    if (typeof urls.revoke === 'function') {
      try {
        urls.revoke();
      } catch (_) {}
      return;
    }

    if (typeof urls.previewUrl === 'string') {
      safeRevokeUrls(urls.previewUrl, seen);
      return;
    }

    if (typeof urls.url === 'string') {
      safeRevokeUrls(urls.url, seen);
      return;
    }

    // Handle dictionary or object records of URLs / thumbnail items
    try {
      const values = Object.values(urls);
      for (const val of values) {
        safeRevokeUrls(val, seen);
      }
    } catch (_) {}
  }
}

/**
 * Helper to export canvas to Blob with WebP priority and JPEG fallback.
 * 
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas 
 * @param {number} quality 
 * @returns {Promise<Blob>}
 */
async function exportCanvasBlob(canvas, quality = THUMBNAIL_CONFIG.DEFAULT_QUALITY) {
  // 1. OffscreenCanvas convertToBlob support
  if (typeof canvas.convertToBlob === 'function') {
    try {
      const blob = await canvas.convertToBlob({
        type: THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE,
        quality
      });
      // WHATWG canvas spec: if format is unsupported, browser returns image/png instead of throwing
      if (blob && blob.size > 0 && blob.type === THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE) {
        return blob;
      }
    } catch (_webpErr) {
      // Fall through to fallback MIME type below
    }

    try {
      const fallbackBlob = await canvas.convertToBlob({
        type: THUMBNAIL_CONFIG.FALLBACK_MIME_TYPE,
        quality
      });
      if (fallbackBlob && fallbackBlob.size > 0) {
        return fallbackBlob;
      }
    } catch (_jpegErr) {
      // Fall through to toBlob or error
    }
  }

  // 2. HTMLCanvasElement toBlob support
  if (typeof canvas.toBlob === 'function') {
    const webpBlob = await new Promise((resolve) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0 && blob.type === THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE) {
              resolve(blob);
            } else {
              resolve(null);
            }
          },
          THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE,
          quality
        );
      } catch (_) {
        resolve(null);
      }
    });

    if (webpBlob) return webpBlob;

    // Fallback to JPEG
    return await new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error('Canvas export produced empty blob'));
            }
          },
          THUMBNAIL_CONFIG.FALLBACK_MIME_TYPE,
          quality
        );
      } catch (jpegErr) {
        reject(jpegErr);
      }
    });
  }

  // 3. Fallback via toDataURL if toBlob is not available
  if (typeof canvas.toDataURL === 'function') {
    let dataUrl;
    try {
      dataUrl = canvas.toDataURL(THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE, quality);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL(THUMBNAIL_CONFIG.FALLBACK_MIME_TYPE, quality);
      }
    } catch (_) {
      dataUrl = canvas.toDataURL(THUMBNAIL_CONFIG.FALLBACK_MIME_TYPE, quality);
    }

    if (typeof fetch === 'function') {
      const res = await fetch(dataUrl);
      return await res.blob();
    }
  }

  throw new Error('Canvas does not support blob export');
}

/**
 * Generates a lightweight, downscaled image thumbnail from a File or Blob.
 * 
 * - Reads image file safely via `createImageBitmap` or `HTMLImageElement`.
 * - Calculates proportional downscaled dimensions capping the longest edge at `maxDimension` (default 320px).
 * - Renders onto an offscreen canvas.
 * - Exports to a lightweight `image/webp` (or `image/jpeg` fallback) blob with quality 0.8.
 * - Releases canvas memory via `releaseCanvas(canvas)`.
 * - Returns `{ previewUrl, width, height, originalWidth, originalHeight, revoke: () => URL.revokeObjectURL(previewUrl) }`.
 * 
 * @param {File|Blob} file 
 * @param {Object} [options]
 * @param {number} [options.maxDimension=320]
 * @param {number} [options.quality=0.8]
 * @param {AbortSignal} [options.signal]
 * @param {{ isCancelled?: boolean }} [options.cancellationToken]
 * @param {HTMLCanvasElement|OffscreenCanvas} [options.canvas] Custom canvas instance for testing
 * @returns {Promise<{ previewUrl: string|null, width: number, height: number, originalWidth: number, originalHeight: number, mimeType?: string, size?: number, revoke: Function, error?: string }>}
 */
export async function generateImageThumbnail(file, options = {}) {
  const maxDimension = options.maxDimension || THUMBNAIL_CONFIG.DEFAULT_MAX_DIMENSION;
  const quality = (typeof options.quality === 'number' && options.quality > 0 && options.quality <= 1)
    ? options.quality
    : THUMBNAIL_CONFIG.DEFAULT_QUALITY;

  const isCancelled = () => Boolean(options.signal?.aborted || options.cancellationToken?.isCancelled);

  // Early cancellation check
  if (isCancelled()) {
    return {
      previewUrl: null,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      error: 'Cancelled',
      revoke: () => {}
    };
  }

  // Zero-byte or invalid input validation
  if (!file || (typeof file.size === 'number' && file.size === 0)) {
    return {
      previewUrl: null,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      error: 'Invalid or zero-byte file',
      revoke: () => {}
    };
  }

  let imageSource = null;
  let isImageBitmap = false;
  let tempObjectUrl = null;
  let canvas = null;

  try {
    // 1. Safe Image Decoding: Prefer createImageBitmap when available for Blob/File objects (not strings)
    const bitmapLoader = options.createImageBitmap || (typeof createImageBitmap === 'function' ? createImageBitmap : null);
    const isBlobLike = file && typeof file === 'object' && (
      (typeof Blob !== 'undefined' && file instanceof Blob) ||
      (typeof file.slice === 'function' && typeof file.size === 'number')
    );

    if (bitmapLoader && isBlobLike) {
      try {
        imageSource = await bitmapLoader(file);
        isImageBitmap = true;
      } catch (_bitmapErr) {
        // Fallback to Image element below
      }
    }

    if (isCancelled()) {
      return {
        previewUrl: null,
        width: 0,
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        error: 'Cancelled',
        revoke: () => {}
      };
    }

    // 2. HTMLImageElement Fallback
    if (!imageSource) {
      if (typeof Image !== 'undefined') {
        imageSource = await new Promise((resolve, reject) => {
          const img = new Image();
          if (typeof file === 'string') {
            img.src = file;
          } else if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            try {
              tempObjectUrl = URL.createObjectURL(file);
              img.src = tempObjectUrl;
            } catch (urlErr) {
              return reject(urlErr);
            }
          } else {
            return reject(new Error('Unable to create source for image element'));
          }

          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to decode image file'));
        });
      }
    }

    if (!imageSource) {
      return {
        previewUrl: null,
        width: 0,
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        error: 'Image decoding not supported in this environment',
        revoke: () => {}
      };
    }

    if (isCancelled()) {
      return {
        previewUrl: null,
        width: 0,
        height: 0,
        originalWidth: 0,
        originalHeight: 0,
        error: 'Cancelled',
        revoke: () => {}
      };
    }

    const origW = imageSource.naturalWidth || imageSource.width || 0;
    const origH = imageSource.naturalHeight || imageSource.height || 0;

    if (origW <= 0 || origH <= 0) {
      return {
        previewUrl: null,
        width: 0,
        height: 0,
        originalWidth: origW,
        originalHeight: origH,
        error: 'Image has invalid or zero dimensions',
        revoke: () => {}
      };
    }

    // 3. Proportional downscaled dimensions
    const { width: scaledW, height: scaledH } = computeDownscaledDimensions(origW, origH, maxDimension);

    // 4. Offscreen canvas allocation
    if (options.canvas) {
      canvas = options.canvas;
    } else if (typeof options.createCanvas === 'function') {
      canvas = options.createCanvas(scaledW, scaledH);
    } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      canvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(scaledW || 1, scaledH || 1);
    }

    if (!canvas) {
      throw new Error('Canvas not supported in current environment');
    }

    canvas.width = scaledW;
    canvas.height = scaledH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to obtain 2D canvas context');
    }

    ctx.drawImage(imageSource, 0, 0, scaledW, scaledH);

    // 5. Lightweight WebP export with JPEG fallback
    const blob = await exportCanvasBlob(canvas, quality);

    // 6. Preview Object URL
    const previewUrl = (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
      ? URL.createObjectURL(blob)
      : null;

    if (isCancelled()) {
      if (previewUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (_) {}
      }
      return {
        previewUrl: null,
        width: 0,
        height: 0,
        originalWidth: origW,
        originalHeight: origH,
        error: 'Cancelled',
        revoke: () => {}
      };
    }

    const result = {
      previewUrl,
      width: scaledW,
      height: scaledH,
      originalWidth: origW,
      originalHeight: origH,
      mimeType: blob?.type || THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE,
      size: blob?.size || 0,
      revoke: () => {
        if (previewUrl) {
          try {
            if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
              URL.revokeObjectURL(previewUrl);
            }
          } catch (_) {}
        }
      }
    };

    return result;
  } catch (err) {
    return {
      previewUrl: null,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      error: err.message || 'Image thumbnail generation failed',
      revoke: () => {}
    };
  } finally {
    // 7. Leak-Proof Resource Cleanup
    if (isImageBitmap && imageSource && typeof imageSource.close === 'function') {
      try {
        imageSource.close();
      } catch (_) {}
    }

    if (tempObjectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(tempObjectUrl);
      } catch (_) {}
    }

    // Always release temporary canvas memory
    if (canvas) {
      releaseCanvas(canvas);
    }
  }
}

/**
 * Batch generates downscaled thumbnails for an array of image files.
 * Supports cancellation tokens / AbortSignal, and cleans up any partial
 * allocations on cancellation or error.
 * 
 * @param {Array<File|Blob>} files 
 * @param {Object} [options] 
 * @param {number} [options.maxDimension=320] 
 * @param {number} [options.quality=0.8] 
 * @param {AbortSignal} [options.signal] 
 * @param {{ isCancelled?: boolean }} [options.cancellationToken] 
 * @param {Function} [options.onProgress] 
 * @param {number} [options.concurrency=4] 
 * @returns {Promise<Array<Object>>}
 */
export async function generateBatchImageThumbnails(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const {
    maxDimension = THUMBNAIL_CONFIG.DEFAULT_MAX_DIMENSION,
    quality = THUMBNAIL_CONFIG.DEFAULT_QUALITY,
    signal,
    cancellationToken,
    onProgress,
    concurrency = 4
  } = options;

  let isTerminated = false;
  const isCancelled = () => {
    return Boolean(isTerminated || signal?.aborted || cancellationToken?.isCancelled);
  };

  if (isCancelled()) {
    const cancelErr = new Error('Batch thumbnail generation was cancelled before starting');
    cancelErr.name = 'AbortError';
    throw cancelErr;
  }

  const results = new Array(files.length).fill(null);
  const allocatedThumbnails = new Set();
  let completedCount = 0;

  try {
    const queue = files.map((file, index) => ({ file, index }));
    const workers = [];

    const worker = async () => {
      while (queue.length > 0) {
        if (isCancelled()) {
          isTerminated = true;
          break;
        }
        const item = queue.shift();
        if (!item) break;

        try {
          const thumb = await generateImageThumbnail(item.file, {
            maxDimension,
            quality,
            signal,
            cancellationToken,
            ...options
          });

          if (thumb?.previewUrl) {
            allocatedThumbnails.add(thumb);
          }

          if (isCancelled()) {
            isTerminated = true;
            break;
          }

          results[item.index] = thumb;
          completedCount++;

          if (typeof onProgress === 'function') {
            try {
              onProgress(completedCount, files.length);
            } catch (_) {}
          }
        } catch (itemErr) {
          if (isCancelled()) {
            isTerminated = true;
            break;
          }
          results[item.index] = {
            previewUrl: null,
            width: 0,
            height: 0,
            originalWidth: 0,
            originalHeight: 0,
            error: itemErr.message || 'Thumbnail generation failed',
            revoke: () => {}
          };
          completedCount++;
        }
      }
    };

    const workerPoolSize = Math.max(1, Math.min(concurrency, files.length));
    for (let i = 0; i < workerPoolSize; i++) {
      workers.push(worker());
    }

    // Wait for all in-flight workers to settle before proceeding
    await Promise.allSettled(workers);

    if (isCancelled()) {
      isTerminated = true;
      safeRevokeUrls(allocatedThumbnails);
      const abortErr = new Error('Batch thumbnail generation was cancelled');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    return results;
  } catch (err) {
    // Release all partial allocations on cancel or error
    safeRevokeUrls(allocatedThumbnails);
    throw err;
  }
}
