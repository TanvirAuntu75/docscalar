// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Predictive Idle & Hover Route Prefetching Engine
// Preloads route component chunks on idle browser cycles and hover/focus
// ═══════════════════════════════════════════════════════════════════════════════

export const prefetchedRoutes = new Set();

export const ROUTE_LOADERS = {
  '/': () => import('../pages/Home'),
  '/workspace': () => import('../pages/Home'),
  '/canvas': () => import('../pages/Home'),
  '/merge-pdf': () => import('../pages/pdf/MergePdf'),
  '/split-pdf': () => import('../pages/pdf/SplitPdf'),
  '/compress-pdf': () => import('../pages/pdf/CompressPdf'),
  '/pdf-to-image': () => import('../pages/pdf/PdfToImage'),
  '/image-to-pdf': () => import('../pages/pdf/ImageToPdf'),
  '/rotate-pdf': () => import('../pages/pdf/RotatePdf'),
  '/image-converter': () => import('../pages/image/ImageConverter'),
  '/image-compressor': () => import('../pages/image/ImageCompressor'),
  '/image-resizer': () => import('../pages/image/ImageResizer'),
  '/docx-to-pdf': () => import('../pages/document/DocxToPdf'),
  '/text-to-pdf': () => import('../pages/document/TextToPdf'),
  '/ai-translator': () => import('../pages/document/TranslatePdf'),
  '/translate-pdf': () => import('../pages/document/TranslatePdf'),
  '/ai-summarizer': () => import('../pages/document/AiSummarizer'),
  '/summarize-pdf': () => import('../pages/document/AiSummarizer'),
  '/qr-generator': () => import('../pages/utility/QrGenerator'),
  '/protect-pdf': () => import('../pages/pdf/ProtectPdf'),
  '/unlock-pdf': () => import('../pages/pdf/UnlockPdf'),
  '/remove-pages': () => import('../pages/pdf/RemovePages'),
  '/extract-pages': () => import('../pages/pdf/ExtractPages'),
  '/organize-pdf': () => import('../pages/pdf/OrganizePdf'),
  '/add-watermark': () => import('../pages/pdf/AddWatermark'),
  '/add-page-numbers': () => import('../pages/pdf/AddPageNumbers'),
  '/sign-pdf': () => import('../pages/pdf/SignPdf'),
  '/powerpoint-to-pdf': () => import('../pages/document/PowerpointToPdf'),
  '/excel-to-pdf': () => import('../pages/document/ExcelToPdf'),
  '/html-to-pdf': () => import('../pages/document/HtmlToPdf'),
  '/pdf-to-word': () => import('../pages/document/PdfToWord'),
  '/crop-pdf': () => import('../pages/pdf/CropPdf'),
  '/pdf-forms': () => import('../pages/pdf/PdfForms'),
  '/scan-to-pdf': () => import('../pages/pdf/ScanToPdf'),
  '/compare-pdf': () => import('../pages/pdf/ComparePdf'),
  '/edit-pdf': () => import('../pages/pdf/EditPdf'),
  '/repair-pdf': () => import('../pages/pdf/RepairPdf'),
  '/pdf-to-excel': () => import('../pages/document/PdfToExcel'),
  '/pdf-to-powerpoint': () => import('../pages/document/PdfToPowerpoint'),
  '/pdf-to-pdfa': () => import('../pages/document/PdfToPdfa'),
  '/redact-pdf': () => import('../pages/pdf/RedactPdf'),
  '/ocr-pdf': () => import('../pages/pdf/OcrPdf'),
  '/un-ocr-pdf': () => import('../pages/pdf/UnOcrPdf'),
  '/bates-numbering': () => import('../pages/pdf/BatesNumbering'),
  '/conversion-pipeline': () => import('../pages/utility/ConversionPipeline'),
  '/resume-builder': () => import('../pages/utility/ResumeBuilder'),
  '/url-to-pdf': () => import('../pages/utility/UrlToPdf'),
  '/unzip-file': () => import('../pages/utility/UnzipFile'),
  '/document-viewer': () => import('../pages/utility/DocumentViewer'),
  '/login': () => import('../pages/Login'),
  '/signup': () => import('../pages/SignUp'),
  '/pricing': () => import('../pages/Pricing'),
  '/privacy': () => import('../pages/Privacy'),
  '/terms': () => import('../pages/Terms'),
};

export function prefetchRoute(path) {
  if (!path || typeof path !== 'string') {
    return Promise.resolve(null);
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (prefetchedRoutes.has(normalizedPath)) {
    return Promise.resolve(null);
  }

  const loader = ROUTE_LOADERS[normalizedPath];
  if (!loader) {
    return Promise.resolve(null);
  }

  prefetchedRoutes.add(normalizedPath);

  try {
    return Promise.resolve(loader()).catch((err) => {
      // In development or environments without bundler resolution, catch gracefully
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        console.debug?.(`[prefetchRoute] Prefetch skipped for ${normalizedPath}:`, err);
      }
      return null;
    });
  } catch (err) {
    return Promise.resolve(null);
  }
}

export function prefetchIdleRoutes(paths = ['/merge-pdf', '/compress-pdf', '/pdf-to-image']) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return Promise.resolve([]);
  }

  const schedule = (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function')
    ? window.requestIdleCallback.bind(window)
    : (typeof globalThis !== 'undefined' && typeof globalThis.requestIdleCallback === 'function')
      ? globalThis.requestIdleCallback.bind(globalThis)
      : (cb) => setTimeout(cb, 1);

  return new Promise((resolve) => {
    schedule(() => {
      const promises = paths.map((p) => prefetchRoute(p));
      Promise.all(promises).then(resolve).catch(() => resolve([]));
    });
  });
}
