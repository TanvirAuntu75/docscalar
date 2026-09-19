import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';
import { getPageBoxAndRotation, mapVisualToPdfPoint, mapVisualRectToPdfRect } from '../../utils/pdfEditorGeometry.js';

// Helper to convert hex strings to pdf-lib rgb objects
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

// Font cache for standard typefaces
async function resolveEmbeddedFont(pdfDoc, fontMap, family = 'helvetica-bold') {
  const key = (family || 'helvetica-bold').toLowerCase();
  if (fontMap.has(key)) return fontMap.get(key);

  let stdFont = StandardFonts.HelveticaBold;
  if (key.includes('times')) {
    stdFont = key.includes('bold') ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  } else if (key.includes('courier')) {
    stdFont = key.includes('bold') ? StandardFonts.CourierBold : StandardFonts.Courier;
  } else if (key.includes('oblique') || key.includes('italic')) {
    stdFont = key.includes('bold') ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaOblique;
  } else if (!key.includes('bold')) {
    stdFont = StandardFonts.Helvetica;
  }

  const embedded = await pdfDoc.embedFont(stdFont);
  fontMap.set(key, embedded);
  return embedded;
}

/**
 * Injects freehand paths, highlights, shapes, and text callouts into PDF page streams.
 * Handles page rotation (0°, 90°, 180°, 270°), CropBox offsets, pressure dynamics,
 * and font-preserving inline text replacements.
 * 
 * @param {File|ArrayBuffer|Uint8Array} file - The PDF file.
 * @param {Array} annotations - Array of items: { type, pageIndex, points, xPercent, yPercent, text, color, thickness, opacity, size, shapeType, startPt, endPt, fontFamily }
 * @param {function} [onProgress] - Progress reporting callback (0-100).
 * @param {object} [options] - Cropper options and margin controls.
 * @returns {Promise<Blob>} Annotated PDF Blob.
 */
export async function editPdf(file, annotations = [], onProgress = null, options = {}) {
  if (onProgress) onProgress(10);
  
  let pdfBytes;
  if (file instanceof ArrayBuffer) {
    pdfBytes = file;
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    pdfBytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else if (file && typeof file.arrayBuffer === 'function') {
    pdfBytes = await file.arrayBuffer();
  } else {
    throw new Error('Invalid file passed to editPdf engine.');
  }

  if (onProgress) onProgress(35);
  
  let pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  if (onProgress) onProgress(50);

  // VisionClean: Universal Smart Cropper
  if (options && options.autoCropBlackBorders) {
    pdfDoc = await cleanAndRefitDocument(pdfDoc, options.pageCropBoxes || options.cropBox || {}, {
      margin: options.cleanMargin ?? 0,
      enabledEdges: options.enabledEdges,
      pageIndices: options.pageIndices
    });
  }

  const pages = pdfDoc.getPages();
  const totalAnnotations = annotations.length;
  const fontMap = new Map();
  const defaultFont = await resolveEmbeddedFont(pdfDoc, fontMap, 'helvetica-bold');

  for (let idx = 0; idx < totalAnnotations; idx++) {
    const anno = annotations[idx];
    const pageIndex = anno.pageIndex ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const pageBox = getPageBoxAndRotation(page);
    const rot = pageBox.rotation;
    const color = hexToRgb(anno.color);

    if (anno.type === 'pen' || anno.type === 'highlight' || anno.type === 'whiteout') {
      const points = anno.points || [];
      const isHl = anno.type === 'highlight';
      const isWhiteout = anno.type === 'whiteout';
      const thickness = anno.thickness || (isWhiteout ? 18 : (isHl ? 20 : 2.5));
      const opacity = isWhiteout ? 1.0 : (anno.opacity ?? (isHl ? 0.38 : 1.0));
      const strokeColor = isWhiteout ? rgb(1, 1, 1) : color;

      // Draw line segments between consecutive points with pressure dynamics
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const startPt = mapVisualToPdfPoint(p1, pageBox, rot);
        const endPt = mapVisualToPdfPoint(p2, pageBox, rot);

        const press1 = p1.pressure ?? 0.5;
        const press2 = p2.pressure ?? 0.5;
        const avgPressure = (press1 + press2) / 2;
        const segmentThickness = thickness * ((isHl || isWhiteout) ? 1.0 : (0.3 + avgPressure * 1.4));

        page.drawLine({
          start: startPt,
          end: endPt,
          thickness: segmentThickness,
          color: strokeColor,
          opacity
        });
      }
    } else if (anno.type === 'shape') {
      const thickness = anno.thickness || 2.5;
      
      if (anno.shapeType === 'line') {
        const startPt = mapVisualToPdfPoint(anno.startPt, pageBox, rot);
        const endPt = mapVisualToPdfPoint(anno.endPt, pageBox, rot);

        page.drawLine({
          start: startPt,
          end: endPt,
          thickness,
          color,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'arrow') {
        const startPt = mapVisualToPdfPoint(anno.startPt, pageBox, rot);
        const endPt = mapVisualToPdfPoint(anno.endPt, pageBox, rot);

        // Main shaft
        page.drawLine({
          start: startPt,
          end: endPt,
          thickness,
          color,
          opacity: 1.0
        });

        // Arrow head wings math directly in unrotated user space
        const dx = endPt.x - startPt.x;
        const dy = endPt.y - startPt.y;
        const angle = Math.atan2(dy, dx);
        const headLength = Math.max(10, thickness * 3);

        const wing1 = {
          x: endPt.x - headLength * Math.cos(angle - Math.PI / 6),
          y: endPt.y - headLength * Math.sin(angle - Math.PI / 6)
        };
        const wing2 = {
          x: endPt.x - headLength * Math.cos(angle + Math.PI / 6),
          y: endPt.y - headLength * Math.sin(angle + Math.PI / 6)
        };

        page.drawLine({
          start: endPt,
          end: wing1,
          thickness,
          color,
          opacity: 1.0
        });

        page.drawLine({
          start: endPt,
          end: wing2,
          thickness,
          color,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'rectangle') {
        const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
        const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
        const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
        const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);

        const rect = mapVisualRectToPdfRect({
          xPercent: minX,
          yPercent: minY,
          widthPercent: maxX - minX,
          heightPercent: maxY - minY
        }, pageBox, rot);

        page.drawRectangle({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          borderColor: color,
          borderWidth: thickness,
          color: anno.fillColor ? hexToRgb(anno.fillColor) : undefined,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'circle') {
        const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
        const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
        const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
        const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);

        const rect = mapVisualRectToPdfRect({
          xPercent: minX,
          yPercent: minY,
          widthPercent: maxX - minX,
          heightPercent: maxY - minY
        }, pageBox, rot);

        page.drawEllipse({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          xScale: rect.width / 2,
          yScale: rect.height / 2,
          borderColor: color,
          borderWidth: thickness,
          color: anno.fillColor ? hexToRgb(anno.fillColor) : undefined,
          opacity: 1.0
        });
      }
    } else if (anno.type === 'text') {
      const font = anno.fontFamily
        ? await resolveEmbeddedFont(pdfDoc, fontMap, anno.fontFamily)
        : defaultFont;

      const textVal = anno.text || '';
      const safeTextVal = cleanTextForWinAnsi(textVal, font);
      const size = anno.size || 14;

      const visualPt = { xPercent: anno.xPercent, yPercent: anno.yPercent };
      const pt = mapVisualToPdfPoint(visualPt, pageBox, rot);

      // If whiteout is requested, draw an opaque white rectangle to mask underlying content
      if (anno.whiteout && safeTextVal.length > 0) {
        const textWidth = font.widthOfTextAtSize(safeTextVal, size);
        const textHeight = size * 1.35;
        const widthPercent = Math.min(1, (textWidth + 8) / (pageBox.width || 595));
        const heightPercent = Math.min(1, (textHeight + 4) / (pageBox.height || 842));
        const bgRect = mapVisualRectToPdfRect({
          xPercent: Math.max(0, anno.xPercent - 4 / (pageBox.width || 595)),
          yPercent: Math.max(0, anno.yPercent - 2 / (pageBox.height || 842)),
          widthPercent,
          heightPercent
        }, pageBox, rot);

        page.drawRectangle({
          x: bgRect.x,
          y: bgRect.y,
          width: bgRect.width,
          height: bgRect.height,
          color: rgb(1, 1, 1),
          opacity: 1.0
        });
      }

      // Adjust text baseline based on rotation angle so text matches on-screen visual placement
      let textX = pt.x;
      let textY = pt.y;
      const textRotationDeg = (360 - rot) % 360;

      if (rot === 0) {
        textY = pt.y - (size * 0.8);
      } else if (rot === 90) {
        textX = pt.x + (size * 0.8);
      } else if (rot === 180) {
        textY = pt.y + (size * 0.8);
      } else if (rot === 270) {
        textX = pt.x - (size * 0.8);
      }

      page.drawText(safeTextVal, {
        x: textX,
        y: textY,
        size,
        font,
        color,
        rotate: degrees(textRotationDeg)
      });
    } else if (anno.type === 'text-edit') {
      const font = anno.fontFamily
        ? await resolveEmbeddedFont(pdfDoc, fontMap, anno.fontFamily)
        : defaultFont;

      const rect = mapVisualRectToPdfRect({
        xPercent: anno.xPercent,
        yPercent: anno.yPercent,
        widthPercent: anno.widthPercent,
        heightPercent: anno.heightPercent
      }, pageBox, rot);

      // Mask out original text with opaque white rectangle
      page.drawRectangle({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        color: rgb(1, 1, 1),
        opacity: 1.0
      });

      // Stamp new edited text
      const textVal = anno.newText ?? '';
      const safeTextVal = cleanTextForWinAnsi(textVal, font);
      const fontSize = anno.fontSize || 10;
      const textRotationDeg = (360 - rot) % 360;

      let stampX = rect.x;
      let stampY = rect.y + Math.max(2, fontSize * 0.25);

      if (rot === 90) {
        stampX = rect.x + Math.max(2, fontSize * 0.25);
        stampY = rect.y;
      } else if (rot === 180) {
        stampX = rect.x + rect.width;
        stampY = rect.y + rect.height - Math.max(2, fontSize * 0.25);
      } else if (rot === 270) {
        stampX = rect.x + rect.width - Math.max(2, fontSize * 0.25);
        stampY = rect.y + rect.height;
      }

      page.drawText(safeTextVal, {
        x: stampX,
        y: stampY,
        size: fontSize,
        font,
        color: hexToRgb(anno.color || '#000000'),
        rotate: degrees(textRotationDeg)
      });
    }

    if (onProgress) {
      onProgress(Math.round(50 + ((idx + 1) / totalAnnotations) * 35));
    }
  }

  if (onProgress) onProgress(90);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
