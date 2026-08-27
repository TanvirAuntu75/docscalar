import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';

// Helper to convert hex strings to pdf-lib rgb objects
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

/**
 * Injects freehand paths, highlights, shapes, and text callouts into PDF page streams.
 * @param {File} file - The PDF file.
 * @param {Array} annotations - Array of items: { type, pageIndex, points, xPercent, yPercent, text, color, thickness, opacity, size, shapeType, startPt, endPt }
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} Annotated PDF.
 */
export async function editPdf(file, annotations = [], onProgress = null) {
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
  
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  if (onProgress) onProgress(50);

  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const totalAnnotations = annotations.length;

  annotations.forEach((anno, idx) => {
    const pageIndex = anno.pageIndex ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    const color = hexToRgb(anno.color);

    if (anno.type === 'pen' || anno.type === 'highlight') {
      const points = anno.points || [];
      const thickness = anno.thickness || (anno.type === 'highlight' ? 12 : 2.5);
      const opacity = anno.opacity ?? (anno.type === 'highlight' ? 0.4 : 1.0);

      // Draw line segments between consecutive points
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const startX = width * p1.xPercent;
        const startY = height * (1 - p1.yPercent);
        const endX = width * p2.xPercent;
        const endY = height * (1 - p2.yPercent);

        const press1 = p1.pressure ?? 0.5;
        const press2 = p2.pressure ?? 0.5;
        const avgPressure = (press1 + press2) / 2;
        const segmentThickness = thickness * (anno.type === 'highlight' ? 1.0 : (0.3 + avgPressure * 1.4));

        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness: segmentThickness,
          color,
          opacity
        });
      }
    } else if (anno.type === 'shape') {
      const thickness = anno.thickness || 2.5;
      
      if (anno.shapeType === 'line') {
        const startX = width * anno.startPt.xPercent;
        const startY = height * (1 - anno.startPt.yPercent);
        const endX = width * anno.endPt.xPercent;
        const endY = height * (1 - anno.endPt.yPercent);

        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness,
          color,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'arrow') {
        const startX = width * anno.startPt.xPercent;
        const startY = height * (1 - anno.startPt.yPercent);
        const endX = width * anno.endPt.xPercent;
        const endY = height * (1 - anno.endPt.yPercent);

        // Main shaft
        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness,
          color,
          opacity: 1.0
        });

        // Arrow head wings math
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        const headLength = Math.max(10, thickness * 3);

        const wing1X = endX - headLength * Math.cos(angle - Math.PI / 6);
        const wing1Y = endY - headLength * Math.sin(angle - Math.PI / 6);
        const wing2X = endX - headLength * Math.cos(angle + Math.PI / 6);
        const wing2Y = endY - headLength * Math.sin(angle + Math.PI / 6);

        page.drawLine({
          start: { x: endX, y: endY },
          end: { x: wing1X, y: wing1Y },
          thickness,
          color,
          opacity: 1.0
        });

        page.drawLine({
          start: { x: endX, y: endY },
          end: { x: wing2X, y: wing2Y },
          thickness,
          color,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'rectangle') {
        const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
        const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
        const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
        const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);

        const rectX = width * minX;
        const rectY = height * (1 - maxY);
        const rectWidth = width * (maxX - minX);
        const rectHeight = height * (maxY - minY);

        page.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          borderColor: color,
          borderWidth: thickness,
          opacity: 1.0
        });
      } else if (anno.shapeType === 'circle') {
        const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
        const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
        const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
        const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);

        const rx = (width * (maxX - minX)) / 2;
        const ry = (height * (maxY - minY)) / 2;
        const cx = width * minX + rx;
        const cy = height * (1 - maxY) + ry;

        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: rx,
          yScale: ry,
          borderColor: color,
          borderWidth: thickness,
          opacity: 1.0
        });
      }
    } else if (anno.type === 'text') {
      const textVal = anno.text || '';
      const safeTextVal = cleanTextForWinAnsi(textVal, font);
      const size = anno.size || 14;
      const x = width * anno.xPercent;
      // Subtract size offset to place baseline correctly relative to click
      const y = height * (1 - anno.yPercent) - (size * 0.5);

      page.drawText(safeTextVal, {
        x,
        y,
        size,
        font,
        color
      });
    } else if (anno.type === 'text-edit') {
      const x = width * anno.xPercent;
      const y = height * (1 - anno.yPercent - anno.heightPercent);
      const rectWidth = width * anno.widthPercent;
      const rectHeight = height * anno.heightPercent;

      // Draw solid white rectangle to mask out original text (standard PDF background color)
      page.drawRectangle({
        x,
        y,
        width: rectWidth,
        height: rectHeight,
        color: rgb(1, 1, 1),
        opacity: 1.0
      });

      // Stamp edited text at the exact same location
      const textVal = anno.newText || '';
      const safeTextVal = cleanTextForWinAnsi(textVal, font);
      const fontSize = anno.fontSize || 10;
      
      // Adjust slightly upwards so text baseline sits inside the mask rectangle
      const textY = y + (rectHeight * 0.15);

      page.drawText(safeTextVal, {
        x,
        y: textY,
        size: fontSize,
        font,
        color: hexToRgb(anno.color || '#000000')
      });
    }

    if (onProgress) {
      onProgress(Math.round(50 + ((idx + 1) / totalAnnotations) * 35));
    }
  });

  if (onProgress) onProgress(90);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
