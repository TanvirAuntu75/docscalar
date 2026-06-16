/* Text to PDF engine using pdf-lib */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer';


/**
 * Convert plain text to a formatted PDF.
 * @param {string} text - The text content
 * @param {object} options - { fontSize, fontFamily, title }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function textToPdf(text, options = {}, onProgress) {
  const { fontSize = 12, title = 'Document' } = options;

  if (onProgress) onProgress(10);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const lineHeight = fontSize * 1.5;
  const maxWidth = pageWidth - margin * 2;

  const safeText = cleanTextForWinAnsi(text, font);
  const lines = wrapText(safeText, font, fontSize, maxWidth);

  if (onProgress) onProgress(40);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;
  let pageCount = 1;

  for (let i = 0; i < lines.length; i++) {
    if (yPos < margin + lineHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - margin;
      pageCount++;
    }

    currentPage.drawText(lines[i], {
      x: margin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= lineHeight;

    if (onProgress && i % 50 === 0) {
      onProgress(40 + Math.round((i / lines.length) * 55));
    }
  }

  if (onProgress) onProgress(95);

  pdfDoc.setTitle(title);
  pdfDoc.setCreator('DocForge');

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

function wrapText(text, font, fontSize, maxWidth) {
  const result = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para.trim() === '') {
      result.push('');
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) result.push(currentLine);
  }

  return result;
}
