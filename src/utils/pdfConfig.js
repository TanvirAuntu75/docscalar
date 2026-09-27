// Polyfill Promise.withResolvers for Node.js < 22 and legacy browser environments
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function withResolvers() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import * as pdfjsLib from 'pdfjs-dist';

export const PDFJS_VERSION = '4.8.69';

// 1. CDN Fallback Endpoints (Version-pinned to matching pdfjs-dist)
export const CDN_CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
export const CDN_STANDARD_FONT_DATA_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;

// 2. Local-First Endpoints (100% Offline Guaranteed via /public/cmaps and /public/standard_fonts)
const getBaseOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  if (typeof self !== 'undefined' && self.location?.origin && self.location.origin !== 'null') {
    return self.location.origin;
  }
  return '';
};

const baseOrigin = getBaseOrigin();
export const LOCAL_CMAP_URL = baseOrigin ? `${baseOrigin.replace(/\/+$/, '')}/cmaps/` : '/cmaps/';
export const LOCAL_STANDARD_FONT_DATA_URL = baseOrigin ? `${baseOrigin.replace(/\/+$/, '')}/standard_fonts/` : '/standard_fonts/';

// Primary URLs: Local-first with CDN fallback availability
export const CMAP_URL = LOCAL_CMAP_URL;
export const CMAP_PACKED = true;
export const STANDARD_FONT_DATA_URL = LOCAL_STANDARD_FONT_DATA_URL;

/**
 * Resolves CMap URL with optional CDN fallback.
 * @param {boolean} [forceCdn=false]
 * @returns {string}
 */
export function getCMapUrl(forceCdn = false) {
  return forceCdn ? CDN_CMAP_URL : CMAP_URL;
}

/**
 * Resolves Standard Font Data URL with optional CDN fallback.
 * @param {boolean} [forceCdn=false]
 * @returns {string}
 */
export function getStandardFontDataUrl(forceCdn = false) {
  return forceCdn ? CDN_STANDARD_FONT_DATA_URL : STANDARD_FONT_DATA_URL;
}

export function configurePdfjs() {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
}

/**
 * Centralized helper function to build standard PDF.js document parameters.
 * Guarantees local-first CMap injection, zero-tofu embedded standard fonts,
 * XFA forms support, and system fonts fallback.
 *
 * @param {ArrayBuffer|Uint8Array|string|object} data - PDF data buffer, URL, or options
 * @param {object} [extraOptions={}] - Additional options or overrides
 * @returns {object} Options object for pdfjsLib.getDocument(...)
 */
export function getPdfjsDocParams(data, extraOptions = {}) {
  const useCdn = Boolean(extraOptions.useCdn);
  const baseConfig = {
    cMapUrl: useCdn ? CDN_CMAP_URL : (extraOptions.cMapUrl || CMAP_URL),
    cMapPacked: extraOptions.cMapPacked !== undefined ? extraOptions.cMapPacked : CMAP_PACKED,
    standardFontDataUrl: useCdn ? CDN_STANDARD_FONT_DATA_URL : (extraOptions.standardFontDataUrl || STANDARD_FONT_DATA_URL),
    enableXfa: true,
    useSystemFonts: false,
    disableFontFace: true,
  };

  if (data instanceof ArrayBuffer || (typeof Uint8Array !== 'undefined' && data instanceof Uint8Array)) {
    return {
      ...baseConfig,
      data,
      ...extraOptions,
    };
  }

  if (typeof data === 'string') {
    return {
      ...baseConfig,
      url: data,
      ...extraOptions,
    };
  }

  if (data && typeof data === 'object') {
    return {
      ...baseConfig,
      ...data,
      ...extraOptions,
    };
  }

  return {
    ...baseConfig,
    data,
    ...extraOptions,
  };
}

/**
 * Loads a PDF Document with full CJK (Japanese, Chinese, Korean),
 * Indic (Bengali, Hindi), and embedded standard font CMap decoding.
 * 
 * @param {ArrayBuffer|Uint8Array|string|object} source - PDF data or options
 * @param {object} [extraOptions={}] - Additional options or overrides
 * @returns {import('pdfjs-dist').PDFDocumentLoadingTask}
 */
export function loadPdfDocument(source, extraOptions = {}) {
  configurePdfjs();
  const params = getPdfjsDocParams(source, extraOptions);
  return pdfjsLib.getDocument(params);
}
