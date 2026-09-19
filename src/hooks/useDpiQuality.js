import { useState, useEffect, useCallback } from 'react';

/**
 * Canonical Studio DPI Presets.
 * PDF standard typographic scale is 72 points per inch.
 */
export const DPI_PRESETS = [
  {
    dpi: 72,
    label: '72 DPI',
    title: 'Fast Draft',
    scale: 1.0,
    badge: 'Standard',
    desc: 'Lowest memory, fastest navigation',
    icon: 'speed'
  },
  {
    dpi: 150,
    label: '150 DPI',
    title: 'Enhanced HD',
    scale: 150 / 72, // ~2.083
    badge: 'Balanced',
    desc: 'Crisp typography, retina-ready (Recommended)',
    icon: 'high_density',
    isRecommended: true
  },
  {
    dpi: 300,
    label: '300 DPI',
    title: 'Ultra Print',
    scale: 300 / 72, // ~4.167
    badge: 'Print Ready',
    desc: 'Razor-sharp text, print press standard',
    icon: 'print'
  },
  {
    dpi: 600,
    label: '600 DPI',
    title: 'Maximum Archival',
    scale: 600 / 72, // ~8.333
    badge: 'Archival',
    desc: 'Ultra-fine precision for dense scans & blueprints',
    icon: 'diamond'
  }
];

export const STORAGE_KEY = 'docscalar_studio_dpi';
export const EVENT_NAME = 'docscalar:dpi-changed';
export const DEFAULT_DPI = 150;

/**
 * Validates and normalizes DPI value to a supported preset.
 * @param {number|string} val 
 * @returns {number}
 */
export function normalizeDpi(val) {
  const parsed = parseInt(val, 10);
  const found = DPI_PRESETS.find(p => p.dpi === parsed);
  return found ? found.dpi : DEFAULT_DPI;
}

/**
 * Computes the canvas raster scale multiplier based on DPI and visual zoom.
 * @param {number} dpi - Target DPI (e.g. 72, 150, 300, 600)
 * @param {number} [zoomScale=1.0] - Viewport zoom factor (e.g. 0.8, 1.0, 1.5)
 * @returns {number}
 */
export function computeDpiScale(dpi, zoomScale = 1.0) {
  const safeDpi = normalizeDpi(dpi);
  const baseScale = safeDpi / 72;
  const safeZoom = (typeof zoomScale === 'number' && !isNaN(zoomScale)) ? zoomScale : 1.0;
  return Math.round(baseScale * safeZoom * 1000) / 1000;
}

/**
 * useDpiQuality Hook
 * Provides dynamic DPI state, localStorage persistence, and cross-studio event synchronization.
 * 
 * @param {object} [options]
 * @param {number} [options.defaultDpi] - Optional default DPI override
 * @returns {{
 *   dpi: number,
 *   setDpi: (newDpi: number) => void,
 *   dpiScale: number,
 *   getScaleMultiplier: (zoomScale?: number) => number,
 *   currentPreset: object,
 *   presets: typeof DPI_PRESETS
 * }}
 */
export function useDpiQuality(options = {}) {
  const initialDpi = () => {
    if (typeof window === 'undefined') return options.defaultDpi || DEFAULT_DPI;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('docforge_studio_dpi');
      return stored ? normalizeDpi(stored) : (options.defaultDpi || DEFAULT_DPI);
    } catch {
      return options.defaultDpi || DEFAULT_DPI;
    }
  };

  const [dpi, setDpiState] = useState(initialDpi);

  // Sync with localStorage and cross-component / cross-tab events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomChange = (e) => {
      if (e.detail?.dpi && e.detail.dpi !== dpi) {
        setDpiState(normalizeDpi(e.detail.dpi));
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setDpiState(normalizeDpi(e.newValue));
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dpi]);

  const setDpi = useCallback((newDpi) => {
    const validDpi = normalizeDpi(newDpi);
    setDpiState(validDpi);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, String(validDpi));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { dpi: validDpi } }));
      } catch (err) {
        console.warn('[useDpiQuality] Failed to persist DPI preference:', err);
      }
    }
  }, []);

  const currentPreset = DPI_PRESETS.find(p => p.dpi === dpi) || DPI_PRESETS[1];
  const dpiScale = dpi / 72;

  const getScaleMultiplier = useCallback((zoomScale = 1.0) => {
    return computeDpiScale(dpi, zoomScale);
  }, [dpi]);

  return {
    dpi,
    setDpi,
    dpiScale,
    getScaleMultiplier,
    currentPreset,
    presets: DPI_PRESETS
  };
}

export default useDpiQuality;
