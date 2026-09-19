/**
 * Smart Signature Line & AcroForm Field Detection Engine
 * 
 * Automatically analyzes PDF text layer geometry and interactive AcroForm annotations
 * to identify signature lines, date lines, signer name labels, and signature form widgets.
 */

import { getPageGeometry, pdfPointsToScreenRatio } from '../../utils/pdfCoordinates.js';

// Regex patterns for detecting signature and contract cue phrases
export const SIGNATURE_CUE_REGEX = /(?:(?:authorized\s+)?signature|sign\s+here|signed\s+by|signature\s+of\s+client|signature\s+of\s+borrower|\bby\s*:|applicant\s+signature|officer\s+signature|notary\s+public)/i;
export const DATE_CUE_REGEX = /(?:\bdate\s*(?::|_|\b)|dated\s+this|effective\s+date)/i;
export const NAME_CUE_REGEX = /(?:print(?:ed)?\s+name|signer\s+name|full\s+name\s*:|\bname\s*(?::|_|\b))/i;
export const TITLE_CUE_REGEX = /(?:\btitle\s*:|job\s+title|\bposition\s*:)/i;
export const UNDERLINE_REGEX = /(?:_{3,}|-{4,}|—{2,})/;

/**
 * Normalizes a bounding box [minX, minY, maxX, maxY] into ratio coordinates [0..1]
 */
function normalizePdfRectToRatios(rect, pageGeometry) {
  const [x1, y1, x2, y2] = rect;
  const pdfX = Math.min(x1, x2);
  const pdfY = Math.min(y1, y2);
  const pdfWidth = Math.max(10, Math.abs(x2 - x1));
  const pdfHeight = Math.max(10, Math.abs(y2 - y1));

  return pdfPointsToScreenRatio({
    pdfX,
    pdfY,
    pdfWidth,
    pdfHeight,
    pageGeometry
  });
}

/**
 * Classifies an AcroForm widget into a supported Sign Studio field type
 * (signature, date, name, or generic text)
 */
export function classifyAcroFormField(annot) {
  if (!annot) return 'text';
  if (annot.fieldType === 'Sig') return 'signature';
  const name = (annot.fieldName || '').toLowerCase();
  if (/(?:^|[^a-z0-9])date(?:[^a-z0-9]|$)/i.test(name) || name.includes('date')) {
    return 'date';
  }
  if (/(?:^|[^a-z0-9])(?:sig|signature)(?:[^a-z0-9]|$)/i.test(name) || name.includes('signature')) {
    return 'signature';
  }
  if (/(?:^|[^a-z0-9])name(?:[^a-z0-9]|$)/i.test(name) || name.includes('name')) {
    return 'name';
  }
  return 'text';
}

/**
 * Scans a single PDF.js page for signature zones and AcroForm widgets.
 * 
 * @param {object} page - PDF.js page proxy
 * @param {number} pageIndex - 0-based page index
 * @returns {Promise<Array<object>>} List of detected signature candidate zones
 */
export async function detectSignatureZonesOnPage(page, pageIndex = 0) {
  if (!page) return [];

  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const pageGeometry = getPageGeometry({
    width: unscaledViewport.width,
    height: unscaledViewport.height,
    rotation: unscaledViewport.rotation || 0
  });

  const detectedZones = [];

  // 1. Inspect AcroForm widget annotations (Highest fidelity)
  try {
    const annotations = await page.getAnnotations({ intent: 'display' });
    if (Array.isArray(annotations)) {
      for (const annot of annotations) {
        if (annot.subtype === 'Widget' && annot.rect) {
          const classifiedType = classifyAcroFormField(annot);
          const isKnownField = classifiedType === 'signature' || classifiedType === 'date' || classifiedType === 'name';

          if (isKnownField) {
            const ratios = normalizePdfRectToRatios(annot.rect, pageGeometry);
            detectedZones.push({
              id: `acro_${pageIndex}_${annot.id || Math.random().toString(36).substring(2, 6)}`,
              source: 'acroform',
              type: classifiedType,
              label: annot.fieldName || (classifiedType === 'signature' ? 'Signature Field' : classifiedType === 'date' ? 'Date Field' : 'Name Field'),
              pageIndex,
              x: ratios.xRatio,
              y: ratios.yRatio,
              width: Math.max(0.12, Math.min(0.40, ratios.widthRatio)),
              height: Math.max(0.04, Math.min(0.12, ratios.heightRatio)),
              confidence: 0.98
            });
          }
        }
      }
    }
  } catch (annotErr) {
    console.warn('AcroForm annotation inspection skipped:', annotErr);
  }

  // 2. Inspect Text Layer for Visual Signature Lines & Cues
  try {
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = (item.str || '').trim();
      if (!text) continue;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const itemX = transform[4];
      const itemY = transform[5];
      const itemW = item.width || 50;
      const itemH = item.height || 12;

      let detectedType = null;
      let label = '';
      let confidence = 0.85;

      if (SIGNATURE_CUE_REGEX.test(text)) {
        detectedType = 'signature';
        label = text;
      } else if (DATE_CUE_REGEX.test(text)) {
        detectedType = 'date';
        label = text;
      } else if (NAME_CUE_REGEX.test(text)) {
        detectedType = 'name';
        label = text;
      } else if (TITLE_CUE_REGEX.test(text)) {
        detectedType = 'title';
        label = text;
      } else if (UNDERLINE_REGEX.test(text)) {
        // Standalone underline row
        detectedType = 'signature';
        label = 'Signature Line';
        confidence = 0.70;
      }

      if (detectedType) {
        // Calculate appropriate target field box relative to the cue text.
        // For signatures, we want the field to sit right above the signature line,
        // or to the immediate right if it's "Signature: ________".
        const hasTrailingLine = UNDERLINE_REGEX.test(text) || (items[i + 1] && UNDERLINE_REGEX.test(items[i + 1].str));
        
        let targetPdfX = itemX;
        let targetPdfY = itemY;
        let targetPdfW = 160;
        let targetPdfH = detectedType === 'signature' ? 44 : 26;

        if (hasTrailingLine) {
          targetPdfW = 180;
          targetPdfY = itemY; // Position along the underline
        } else {
          // Sit slightly above the label text
          targetPdfY = itemY + itemH + 4;
        }

        const ratios = normalizePdfRectToRatios(
          [targetPdfX, targetPdfY, targetPdfX + targetPdfW, targetPdfY + targetPdfH],
          pageGeometry
        );

        // Clamp ratios to valid document viewbounds
        const safeWidth = detectedType === 'signature' ? 0.26 : detectedType === 'date' ? 0.22 : 0.25;
        const safeHeight = detectedType === 'signature' ? 0.08 : 0.045;
        const safeX = Math.max(0.04, Math.min(1 - safeWidth - 0.04, ratios.xRatio));
        const safeY = Math.max(0.04, Math.min(1 - safeHeight - 0.04, ratios.yRatio));

        // Deduplicate overlapping zones
        const isDuplicate = detectedZones.some(
          (z) => Math.abs(z.x - safeX) < 0.05 && Math.abs(z.y - safeY) < 0.05
        );

        if (!isDuplicate) {
          detectedZones.push({
            id: `cue_${pageIndex}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            source: 'text_analysis',
            type: detectedType,
            label,
            pageIndex,
            x: safeX,
            y: safeY,
            width: safeWidth,
            height: safeHeight,
            confidence
          });
        }
      }
    }
  } catch (textErr) {
    console.warn('Text layer signature detection skipped:', textErr);
  }

  return detectedZones;
}

/**
 * Scans all pages in a document and aggregates detected zones with summary statistics.
 * 
 * @param {object} pdfDocument - PDF.js document proxy
 * @returns {Promise<{ zones: Array<object>, totalCount: number, countsByPage: object }>}
 */
export async function scanDocumentSignatureZones(pdfDocument) {
  if (!pdfDocument || !pdfDocument.numPages) {
    return { zones: [], totalCount: 0, countsByPage: {} };
  }

  const allZones = [];
  const countsByPage = {};

  for (let p = 0; p < pdfDocument.numPages; p++) {
    try {
      const page = await pdfDocument.getPage(p + 1);
      const pageZones = await detectSignatureZonesOnPage(page, p);
      allZones.push(...pageZones);
      countsByPage[p] = pageZones.length;
    } catch (err) {
      console.warn(`Error detecting zones on page ${p + 1}:`, err);
      countsByPage[p] = 0;
    }
  }

  return {
    zones: allZones,
    totalCount: allZones.length,
    countsByPage
  };
}
