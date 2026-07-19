import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
};

/**
 * Draw page numbers dynamically on a PDF document.
 * @param {File} file - The PDF file.
 * @param {object} options - Page numbering settings.
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The numbered PDF file.
 */
export async function addPageNumbers(file, options, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(55);

  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const format = options.format || options.formatStr || 'Page {page} of {total}';
  const position = options.position || 'footer-center';
  const fontSize = parseInt(options.fontSize || 10);
  const startNumber = parseInt(options.startNumber || 1);
  const colorVals = hexToRgb(options.color || '#000000');
  const margin = 36; // spacing offset from page borders

  const totalPages = options.ptopTotalPages || pages.length;

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    const originalPageIndex = (options.ptopPageIndices && options.ptopPageIndices[idx] !== undefined) 
      ? options.ptopPageIndices[idx] 
      : idx;
    const currentPageNumber = originalPageIndex + startNumber;
    const textStr = format
      .replace('{page}', String(currentPageNumber))
      .replace('{n}', String(currentPageNumber))
      .replace('{total}', String(totalPages - 1 + startNumber)); // total page offset adjustment

    const safeTextStr = cleanTextForWinAnsi(textStr, font);
    const textWidth = font.widthOfTextAtSize(safeTextStr, fontSize);
    const textHeight = fontSize * 0.8;

    let x = (width - textWidth) / 2;
    let y = margin; // default footer-center

    // Positioning configurations
    if (position === 'footer-left') {
      x = margin;
      y = margin;
    } else if (position === 'footer-right') {
      x = width - margin - textWidth;
      y = margin;
    } else if (position === 'header-center') {
      x = (width - textWidth) / 2;
      y = height - margin;
    } else if (position === 'header-left') {
      x = margin;
      y = height - margin;
    } else if (position === 'header-right') {
      x = width - margin - textWidth;
      y = height - margin;
    }

    page.drawText(safeTextStr, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(colorVals.r, colorVals.g, colorVals.b),
    });

    if (onProgress) {
      onProgress(Math.round(55 + ((idx + 1) / totalPages) * 35));
    }
  });

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
