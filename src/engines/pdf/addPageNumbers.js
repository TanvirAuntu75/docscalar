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
export async function addPageNumbers(file, options = {}, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(55);

  const pages = pdfDoc.getPages();
  
  let font;
  if (options.fontFamily === 'Times') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  } else if (options.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.Courier);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  
  const format = options.format || options.formatStr || 'Page {page} of {total}';
  const position = options.position || 'footer-center';
  const fontSize = parseInt(options.fontSize || 10);
  const startNumber = parseInt(options.startNumber || 1);
  const colorVals = hexToRgb(options.color || '#000000');
  const margin = parseInt(options.margin || 36); // spacing offset from page borders
  const skipFirstPage = Boolean(options.skipFirstPage);
  const targetPages = Array.isArray(options.targetPages) ? options.targetPages : null;

  const totalPages = options.ptopTotalPages || pages.length;

  pages.forEach((page, idx) => {
    // Skip if first page should be excluded (e.g. cover sheet)
    if (skipFirstPage && idx === 0) {
      return;
    }

    // Skip if targetPages filter is active and this page is not in list
    if (targetPages && !targetPages.includes(idx)) {
      return;
    }

    const { width, height } = page.getSize();
    const originalPageIndex = (options.ptopPageIndices && options.ptopPageIndices[idx] !== undefined) 
      ? options.ptopPageIndices[idx] 
      : idx;
    
    // Page numbering index adjusted for skipFirstPage if needed
    const pageNumOffset = skipFirstPage ? originalPageIndex : originalPageIndex + startNumber;
    const currentPageNumber = skipFirstPage ? Math.max(1, originalPageIndex - 1 + startNumber) : (originalPageIndex + startNumber);

    const textStr = format
      .replace('{page}', String(currentPageNumber))
      .replace('{n}', String(currentPageNumber))
      .replace('{total}', String(skipFirstPage ? totalPages - 1 : totalPages))
      .replace('{seq_total}', String(totalPages - 1 + startNumber));

    const safeTextStr = cleanTextForWinAnsi(textStr, font);
    const textWidth = font.widthOfTextAtSize(safeTextStr, fontSize);

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

