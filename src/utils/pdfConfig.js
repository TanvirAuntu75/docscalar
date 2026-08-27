import * as pdfjsLib from 'pdfjs-dist';

export const PDFJS_VERSION = '4.8.69';
export const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
export const CMAP_PACKED = true;
export const STANDARD_FONT_DATA_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;

export function configurePdfjs() {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
}

/**
 * Loads a PDF Document with full CJK (Japanese, Chinese, Korean),
 * Indic (Bengali, Hindi), and embedded standard font CMap decoding.
 * 
 * @param {ArrayBuffer|Uint8Array|string|object} source - PDF data or options
 * @returns {import('pdfjs-dist').PDFDocumentLoadingTask}
 */
export function loadPdfDocument(source) {
  configurePdfjs();

  const baseConfig = {
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    enableXfa: true,
    useSystemFonts: true,
    isEvalSupported: false
  };

  if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
    return pdfjsLib.getDocument({ ...baseConfig, data: source });
  }

  if (typeof source === 'string') {
    return pdfjsLib.getDocument({ ...baseConfig, url: source });
  }

  if (source && typeof source === 'object') {
    return pdfjsLib.getDocument({ ...baseConfig, ...source });
  }

  return pdfjsLib.getDocument({ ...baseConfig, data: source });
}
