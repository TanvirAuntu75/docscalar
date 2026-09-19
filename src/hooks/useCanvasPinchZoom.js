import { useEffect, useRef } from 'react';

/**
 * DocScalar Universal Canvas Pinch-to-Zoom Hook
 * 
 * Provides smooth, professional 2-finger pinch-to-zoom on document preview canvases.
 * Eliminates browser-level whole-page zooming (Ctrl +/- on trackpads) and mobile
 * viewport distortion by intercepting gestures with non-passive event listeners.
 * 
 * Key Features:
 *   1. Precision Touchpad / macOS Trackpad 2-finger pinch:
 *      Intercepts wheel events where `e.ctrlKey || e.metaKey` is true, calls `e.preventDefault()`,
 *      applies velocity dampening to prevent runway zoom explosion, and scales `zoomScale`.
 *   2. Normal scroll preservation:
 *      Single-finger or standard mouse wheel scroll (`ctrlKey === false`) passes through untouched,
 *      ensuring vertical document scrolling remains 100% natural.
 *   3. Touchscreen 2-finger multi-touch pinch:
 *      Tracks Euclidean distance via `Math.hypot`, applies `preventDefault()` only when
 *      `e.touches.length === 2`, leaving 1-finger touch scrolling completely unaffected.
 *   4. Focal point cursor centering:
 *      Compensates `scrollLeft` and `scrollTop` relative to the cursor focal point so the
 *      canvas content under the pointer stays anchored without drifting.
 *   5. Zero Listener Churn:
 *      Synchronous `zoomRef` avoids re-attaching listeners on every frame (120 FPS capable).
 * 
 * @param {Object} options
 * @param {React.RefObject<HTMLElement>} options.containerRef - Ref to the scrollable canvas viewport element
 * @param {number} options.zoomScale - Current zoom scale
 * @param {Function} options.setZoomScale - State setter for zoom scale
 * @param {number} [options.minZoom=0.3] - Minimum zoom limit (30%)
 * @param {number} [options.maxZoom=3.0] - Maximum zoom limit (300%)
 * @param {number} [options.sensitivity=0.003] - Sensitivity coefficient for touchpad delta
 * @param {boolean} [options.enableFocalCentering=true] - Whether to anchor scroll to cursor
 * @param {boolean} [options.enabled=true] - Whether pinch-zoom is enabled
 */
export default function useCanvasPinchZoom({
  containerRef,
  zoomScale,
  setZoomScale,
  minZoom = 0.3,
  maxZoom = 3.0,
  sensitivity = 0.003,
  enableFocalCentering = true,
  enabled = true
}) {
  const zoomRef = useRef(zoomScale);
  zoomRef.current = zoomScale;

  const initialDistanceRef = useRef(0);
  const initialZoomRef = useRef(1.0);
  const touchCenterRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const el = containerRef?.current;

    // ── 1. Window-Level Precision Touchpad 2-Finger Pinch (WheelEvent with ctrlKey) ─────
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Crucial: intercept pinch-zoom on window, permanently blocking browser-level page zoom
        e.preventDefault();
        e.stopPropagation();

        const currentZoom = typeof zoomRef.current === 'number' ? zoomRef.current : 1.0;
        
        // Dampened delta: prevents runaway jumps on fast trackpad flicks or stepped mouse wheels
        const MAX_DELTA_STEP = 0.08;
        const rawDelta = -e.deltaY * sensitivity;
        const delta = Math.max(-MAX_DELTA_STEP, Math.min(MAX_DELTA_STEP, rawDelta));
        
        const nextZoom = Math.min(maxZoom, Math.max(minZoom, Number((currentZoom + delta).toFixed(2))));
        if (nextZoom === currentZoom) return;

        // Focal Point Centering: keep content under cursor stationary
        if (enableFocalCentering && el) {
          const rect = el.getBoundingClientRect();
          const isInside = (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
          );
          const cursorX = isInside ? (e.clientX - rect.left) : (rect.width / 2);
          const cursorY = isInside ? (e.clientY - rect.top) : (rect.height / 2);

          const contentPointX = (el.scrollLeft + cursorX) / currentZoom;
          const contentPointY = (el.scrollTop + cursorY) / currentZoom;

          const newScrollX = Math.max(0, contentPointX * nextZoom - cursorX);
          const newScrollY = Math.max(0, contentPointY * nextZoom - cursorY);

          el.scrollLeft = newScrollX;
          el.scrollTop = newScrollY;
        }

        setZoomScale(nextZoom);
      }
    };

    // ── 2. Touchscreen 2-Finger Pinch (TouchEvent) ─────────────────────────
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        initialDistanceRef.current = Math.hypot(dx, dy);
        initialZoomRef.current = typeof zoomRef.current === 'number' ? zoomRef.current : 1.0;

        if (el) {
          const rect = el.getBoundingClientRect();
          touchCenterRef.current = {
            x: (t0.clientX + t1.clientX) / 2 - rect.left,
            y: (t0.clientY + t1.clientY) / 2 - rect.top
          };
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialDistanceRef.current > 0) {
        // Intercept 2-finger pinch on window, blocking mobile whole-page zoom
        e.preventDefault();
        e.stopPropagation();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const currentDistance = Math.hypot(dx, dy);

        if (currentDistance > 0) {
          const ratio = currentDistance / initialDistanceRef.current;
          const targetZoom = initialZoomRef.current * ratio;
          const nextZoom = Math.min(maxZoom, Math.max(minZoom, Number(targetZoom.toFixed(2))));
          const currentZoom = typeof zoomRef.current === 'number' ? zoomRef.current : 1.0;

          if (nextZoom !== currentZoom) {
            if (enableFocalCentering && el) {
              const { x: cursorX, y: cursorY } = touchCenterRef.current;
              const contentPointX = (el.scrollLeft + cursorX) / currentZoom;
              const contentPointY = (el.scrollTop + cursorY) / currentZoom;

              const newScrollX = Math.max(0, contentPointX * nextZoom - cursorX);
              const newScrollY = Math.max(0, contentPointY * nextZoom - cursorY);

              el.scrollLeft = newScrollX;
              el.scrollTop = newScrollY;
            }
            setZoomScale(nextZoom);
          }
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        initialDistanceRef.current = 0;
      }
    };

    // ── 3. Safari/WebKit Trackpad Gesture Interception ──────────────────────
    const handleGesture = (e) => {
      e.preventDefault();
    };

    // ── 4. Studio Keyboard Zoom Shortcuts (Ctrl +, Ctrl -, Ctrl 0) ────────
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
          return;
        }

        e.preventDefault();
        if (e.key === '=' || e.key === '+') {
          setZoomScale((prev) => Math.min(maxZoom, Number((prev + 0.05).toFixed(2))));
        } else if (e.key === '-' || e.key === '_') {
          setZoomScale((prev) => Math.max(minZoom, Number((prev - 0.05).toFixed(2))));
        } else if (e.key === '0') {
          setZoomScale(1.0);
        }
      }
    };

    // Register on window and container with passive: false so preventDefault() legally halts browser zoom
    // el.addEventListener('wheel', handleWheel, { passive: false })
    // el.addEventListener('touchstart', handleTouchStart, { passive: false })
    // el.addEventListener('touchmove', handleTouchMove, { passive: false })
    // el.addEventListener('gesturestart', handleGesture, { passive: false })
    // el.addEventListener('gesturechange', handleGesture, { passive: false })
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('gesturestart', handleGesture, { passive: false });
    window.addEventListener('gesturechange', handleGesture, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // el.removeEventListener('wheel', handleWheel);
      // el.removeEventListener('touchstart', handleTouchStart);
      // el.removeEventListener('touchmove', handleTouchMove);
      // el.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('gesturestart', handleGesture);
      window.removeEventListener('gesturechange', handleGesture);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, enabled, setZoomScale, minZoom, maxZoom, sensitivity, enableFocalCentering]);
}
