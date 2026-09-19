// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Print & Photo Studio Utilities (Shared Engine)
// Cross-Platform Portrait Filtering, Zoom/Pan Transforms, and Print Engine Overrides
// ═══════════════════════════════════════════════════════════════════════════════

export const PHOTO_FILTER_PRESETS = {
  none: { grayscale: 0, contrast: 100, brightness: 100, sepia: 0 },
  original: { grayscale: 0, contrast: 100, brightness: 100, sepia: 0 },
  bw: { grayscale: 100, contrast: 110, brightness: 100, sepia: 0 },
  grayscale: { grayscale: 100, contrast: 110, brightness: 100, sepia: 0 },
  crisp: { grayscale: 0, contrast: 120, brightness: 105, sepia: 0 },
  high_contrast: { grayscale: 0, contrast: 120, brightness: 105, sepia: 0 },
  warm: { grayscale: 0, contrast: 105, brightness: 102, sepia: 20 },
  noir: { grayscale: 100, contrast: 130, brightness: 95, sepia: 0 },
  cool_noir: { grayscale: 100, contrast: 130, brightness: 95, sepia: 0 }
};

/**
 * Computes CSS filter rule for photo studio presets or custom adjustments
 * @param {object} photoCrop
 * @returns {string} CSS filter rule string
 */
export const computePhotoFilterCss = (photoCrop = {}) => {
  const rawKey = photoCrop.filterPreset || photoCrop.filter || 'none';
  const filterPreset =
    rawKey === 'grayscale' ? 'bw' :
    rawKey === 'high_contrast' ? 'crisp' :
    rawKey === 'cool_noir' ? 'noir' :
    rawKey;
  const preset = PHOTO_FILTER_PRESETS[filterPreset] || PHOTO_FILTER_PRESETS.none;
  const filters = photoCrop.filters || {};

  const grayscale = filters.grayscale !== undefined ? Number(filters.grayscale) : preset.grayscale;
  const contrast = filters.contrast !== undefined ? Number(filters.contrast) : preset.contrast;
  const brightness = filters.brightness !== undefined ? Number(filters.brightness) : preset.brightness;
  const sepia = filters.sepia !== undefined ? Number(filters.sepia) : preset.sepia;

  const isDefault = grayscale === 0 && contrast === 100 && brightness === 100 && sepia === 0;
  if (isDefault) return '';

  return `filter: grayscale(${grayscale}%) contrast(${contrast}%) brightness(${brightness}%) sepia(${sepia}%) !important; -webkit-filter: grayscale(${grayscale}%) contrast(${contrast}%) brightness(${brightness}%) sepia(${sepia}%) !important;`;
};

/**
 * Computes CSS transform rule for rotation, scale, and pan offset
 * @param {object} photoCrop
 * @returns {string} CSS transform rule string
 */
export const computePhotoTransformCss = (photoCrop = {}) => {
  const { scale = 1, x = 0, y = 0, rotate = 0 } = photoCrop;
  const numScale = Number(scale) || 1;
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numRotate = Number(rotate) || 0;

  const isDefault = numScale === 1 && numX === 0 && numY === 0 && numRotate === 0;
  if (isDefault) return '';

  return `transform: rotate(${numRotate}deg) scale(${numScale}) translate(${numX}px, ${numY}px) !important; -webkit-transform: rotate(${numRotate}deg) scale(${numScale}) translate(${numX}px, ${numY}px) !important; transform-origin: center center !important; -webkit-transform-origin: center center !important;`;
};

/**
 * Injects CSS transform and portrait filter styles for candidate avatar positioning, zooming, rotation, and studio filters.
 * If default crop parameters (scale=1, x=0, y=0, rotate=0, default filter) are provided, skips style injection to prevent unnecessary GPU compositing.
 *
 * @param {string} html - HTML string of rendered template
 * @param {object} data - Resume data containing photoCrop configuration (or photoCrop object directly)
 * @returns {string} HTML with injected photo studio styles
 */
export const injectPhotoCropStyles = (html, data) => {
  if (!html) return html;
  const cropConfig = data?.photoCrop || (data && (data.scale !== undefined || data.filterPreset !== undefined || data.filter !== undefined || data.x !== undefined || data.y !== undefined || data.rotate !== undefined) ? data : null);
  if (cropConfig) {
    const transformCss = computePhotoTransformCss(cropConfig);
    const filterCss = computePhotoFilterCss(cropConfig);

    // Strip existing style tag if already present to guarantee idempotency
    const cleanHtml = html.replace(/<style id="docscalar-photo-crop-styles">[\s\S]*?<\/style>/gi, '');

    if (!transformCss && !filterCss) return cleanHtml;

    const styleInjection = `
      <style id="docscalar-photo-crop-styles">
        .avatar, .avatar-mask img, .profile-photo, .profile-photo-mask img, .photo-frame img, .avatar-img, .resume-photo img, [data-df-field="photo"] img, [data-df-field="photo"] {
          ${transformCss}
          ${filterCss}
        }
      </style>
    `;

    if (/<\/head>/i.test(cleanHtml)) {
      return cleanHtml.replace(/<\/head>/i, `${styleInjection}</head>`);
    }
    return cleanHtml + styleInjection;
  }
  return html;
};

/**
 * Injects print and PDF rendering overrides directly into the document <head>.
 * Guarantees discrete A4 page break behavior, eliminates trailing blank pages via .cv-page:last-child,
 * and enforces exact color adjustment across webkit and standard print engines.
 *
 * @param {string} html - HTML string of rendered template
 * @returns {string} HTML with injected print overrides
 */
export const injectPrintStyles = (html) => {
  if (!html) return html;
  // Strip existing style tag if already present to guarantee idempotency
  const cleanHtml = html.replace(/<style id="docscalar-direct-print-styles">[\s\S]*?<\/style>/gi, '');
  const printStyles = `
    <style id="docscalar-direct-print-styles">
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        *, *:before, *:after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          gap: 0 !important;
        }
        .cv-page, .resume-canvas {
          box-shadow: none !important;
          border-radius: 0 !important;
          margin: 0 auto !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .cv-page:last-child, .resume-canvas:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    </style>
  `;
  if (/<\/head>/i.test(cleanHtml)) {
    return cleanHtml.replace(/<\/head>/i, `${printStyles}</head>`);
  }
  return cleanHtml + printStyles;
};
