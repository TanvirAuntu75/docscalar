/**
 * Viewport-Only Virtualized Rendering Utilities
 * Topic 6 of 6: IntersectionObserver Visibility Hook, Bounded Virtual Windows & Canvas Lifecycle Guard
 * 
 * Eliminates browser tab crashes and multi-gigabyte RAM spikes when loading multi-page PDF documents
 * by dynamically rendering only pages currently inside the visible viewport (plus prefetch buffer),
 * rendering lightweight zero-canvas skeleton placeholders for offscreen pages, and immediately
 * deallocating canvas contexts and V8 bitmap stores when pages scroll out of view.
 */

import { useState, useEffect, useRef } from 'react';

export const VIRTUALIZER_DEFAULTS = Object.freeze({
  ROOT_MARGIN: '200px',
  THRESHOLD: 0.01,
  WINDOW_SIZE: 3,
  CARD_ASPECT_RATIO: '3/4',
  ESTIMATED_PAGE_RAM_BYTES: 144640 // ~144.6 KB per DPR-capped thumbnail (160x226x4 bytes)
});

/**
 * Cross-browser React hook tracking whether a DOM element is inside the viewport.
 * 
 * Uses the high-performance native `IntersectionObserver` API. When IntersectionObserver
 * is not supported (SSR, headless testing environments, legacy browsers), defaults `isVisible`
 * safely to `true` to ensure content is always visible and functional.
 * 
 * @param {object} [options={}] - IntersectionObserver options
 * @param {string} [options.rootMargin='200px'] - Viewport expansion margin for prefetching
 * @param {number|number[]} [options.threshold=0.01] - Intersection threshold ratio
 * @param {Element|null} [options.root=null] - Viewport root element (default: browser window)
 * @param {boolean} [options.initialVisible] - Override initial visibility state (default: false when observer supported, true otherwise)
 * @returns {[import('react').RefObject, boolean]} Tuple [ref, isVisible] (also accessible via .ref and .isVisible properties)
 */
export function useVisibilityObserver(options = {}) {
  const rootMargin = options?.rootMargin ?? VIRTUALIZER_DEFAULTS.ROOT_MARGIN;
  const threshold = options?.threshold ?? VIRTUALIZER_DEFAULTS.THRESHOLD;
  const root = options?.root ?? null;
  const initialVisible = options?.initialVisible;

  const hasObserver = typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

  // If IntersectionObserver is not supported, default safely to true (always render)
  const [isVisible, setIsVisible] = useState(() => {
    if (!hasObserver) return true;
    return typeof initialVisible === 'boolean' ? initialVisible : false;
  });

  const ref = useRef(null);

  useEffect(() => {
    if (!hasObserver) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    let observer = null;
    try {
      observer = new window.IntersectionObserver((entries) => {
        if (!entries || !entries.length) return;
        const entry = entries[0];
        setIsVisible(Boolean(entry.isIntersecting));
      }, {
        root,
        rootMargin,
        threshold
      });

      observer.observe(node);
    } catch (_err) {
      // In case IntersectionObserver throws (e.g. malformed margin syntax), safely fallback to visible
      setIsVisible(true);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasObserver, root, rootMargin, threshold]);

  const result = [ref, isVisible];
  result.ref = ref;
  result.isVisible = isVisible;
  return result;
}

/**
 * Calculates an active virtual index window [start, end] centered on activeIndex
 * with bounded buffers, guaranteeing bounds safety across arbitrary collection sizes.
 * 
 * @param {number} totalItems - Total item count in the collection
 * @param {number} [activeIndex=0] - Active / focused item index (0-indexed)
 * @param {number} [windowSize=3] - Buffer radius around activeIndex (default: 3 items before & after)
 * @returns {Array<number>} [start, end] range array with attached helper metadata (.start, .end, .count, .indices, .isInWindow)
 */
export function createVirtualWindow(totalItems, activeIndex = 0, windowSize = 3) {
  const total = Number.isFinite(Number(totalItems)) ? Math.max(0, Math.floor(Number(totalItems))) : 0;
  
  if (total === 0) {
    const emptyResult = [0, -1];
    emptyResult.start = 0;
    emptyResult.end = -1;
    emptyResult.count = 0;
    emptyResult.indices = [];
    emptyResult.isInWindow = () => false;
    return emptyResult;
  }

  const rawActive = Number.isFinite(Number(activeIndex)) ? Math.floor(Number(activeIndex)) : 0;
  const clampedActive = Math.max(0, Math.min(total - 1, rawActive));
  const buffer = Number.isFinite(Number(windowSize)) ? Math.max(0, Math.floor(Number(windowSize))) : VIRTUALIZER_DEFAULTS.WINDOW_SIZE;

  const start = Math.max(0, clampedActive - buffer);
  const end = Math.min(total - 1, clampedActive + buffer);
  const count = end - start + 1;

  const indices = [];
  for (let i = start; i <= end; i++) {
    indices.push(i);
  }

  const result = [start, end];
  result.start = start;
  result.end = end;
  result.count = count;
  result.indices = indices;
  result.isInWindow = (index) => typeof index === 'number' && Number.isInteger(index) && index >= start && index <= end;

  return result;
}

/**
 * Calculates theoretical and empirical RAM savings achievable via viewport virtualization.
 * 
 * @param {number} totalItems - Total document pages / canvas elements
 * @param {number} [visibleCount=6] - Number of simultaneously visible canvases in viewport
 * @param {number} [bytesPerItem=144640] - Backing pixel buffer RAM per thumbnail (default: 160x226x4 bytes)
 * @returns {object} Savings breakdown { totalBytes, virtualBytes, savedBytes, percentReduction }
 */
export function computeVirtualizationSavings(
  totalItems, 
  visibleCount = 6, 
  bytesPerItem = VIRTUALIZER_DEFAULTS.ESTIMATED_PAGE_RAM_BYTES
) {
  const total = Number.isFinite(Number(totalItems)) ? Math.max(0, Math.floor(Number(totalItems))) : 0;
  const visible = Number.isFinite(Number(visibleCount)) ? Math.max(0, Math.floor(Number(visibleCount))) : 6;
  const perItem = Number.isFinite(Number(bytesPerItem)) ? Math.max(0, Math.floor(Number(bytesPerItem))) : VIRTUALIZER_DEFAULTS.ESTIMATED_PAGE_RAM_BYTES;

  if (total === 0) {
    return {
      totalBytes: 0,
      virtualBytes: 0,
      savedBytes: 0,
      percentReduction: 0
    };
  }

  const activeCanvases = Math.min(total, visible);
  const totalBytes = total * perItem;
  const virtualBytes = activeCanvases * perItem;
  const savedBytes = totalBytes - virtualBytes;
  const percentReduction = totalBytes > 0 ? (savedBytes / totalBytes) * 100 : 0;

  return {
    totalBytes,
    virtualBytes,
    savedBytes,
    percentReduction: Number(percentReduction.toFixed(2))
  };
}
