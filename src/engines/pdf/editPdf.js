import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer';

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
 * Injects freehand paths, highlights, and text callouts into PDF page streams.
 * @param {File} file - The PDF file.
 * @param {Array} annotations - Array of items: { type, pageIndex, points, xPercent, yPercent, text, color, thickness, opacity, size }
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} Annotated PDF.
 */
export async function editPdf(file, annotations, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
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

        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness,
          color,
          opacity
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
