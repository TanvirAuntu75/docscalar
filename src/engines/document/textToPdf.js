/* Text to PDF Engine: Formatted Document Typesetting & In-Thread Fallback */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Extract raw text from string, File, Blob, or Buffer
 */
async function extractText(input) {
  if (typeof input === 'string') return input;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return input.toString('utf8');
  }
  if (input instanceof Uint8Array) {
    return new TextDecoder().decode(input);
  }
  if (input instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(input));
  }
  if (input && typeof input.text === 'function') {
    return await input.text();
  }
  if (input && typeof input.arrayBuffer === 'function') {
    const ab = await input.arrayBuffer();
    return new TextDecoder().decode(new Uint8Array(ab));
  }
  throw new Error('Unsupported text input format.');
}

/**
 * Direct in-thread fallback Text to PDF compiler using pdf-lib.
 * Handles text wrapping, pagination, headers, and page numbering.
 * @param {string|File|Blob|ArrayBuffer} textOrFile 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directTextToPdf(textOrFile, options = {}, onProgress = () => {}) {
  onProgress(10);
  const text = await extractText(textOrFile);
  onProgress(30);

  const {
    fontSize = 12,
    lineSpacing = 1.5,
    fontFamily = 'Helvetica', // 'Helvetica' | 'TimesRoman' | 'Courier'
    pageSize = 'a4', // 'a4' | 'letter'
    margin = 50,
    pageNumbers = true,
    title = 'Document'
  } = options;

  const pdfDoc = await PDFDocument.create();

  let font;
  let fontBold;
  if (fontFamily === 'TimesRoman' || fontFamily === 'Times') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else if (fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.Courier);
    fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const baseWidth = pageSize === 'letter' ? 612 : 595.28;
  const baseHeight = pageSize === 'letter' ? 792 : 841.89;

  const pageWidth = baseWidth;
  const pageHeight = baseHeight;
  const printableWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * lineSpacing;

  // Split raw text into paragraphs
  const rawParagraphs = text.split(/\r?\n/);
  const wrappedLines = [];

  for (const para of rawParagraphs) {
    if (para.trim() === '') {
      wrappedLines.push(''); // Empty paragraph spacer
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth <= printableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  }

  onProgress(50);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Optional Document Header / Title
  if (title && title.trim()) {
    currentPage.drawText(title.trim(), {
      x: margin,
      y: currentY,
      size: fontSize + 4,
      font: fontBold,
      color: rgb(0.12, 0.15, 0.25)
    });
    currentY -= (fontSize + 4) * 1.8;
  }

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
  };

  for (let i = 0; i < wrappedLines.length; i++) {
    if (currentY - lineHeight < margin + 20) {
      addNewPage();
    }

    const line = wrappedLines[i];
    if (line !== '') {
      currentPage.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15)
      });
    }

    currentY -= lineHeight;

    if (i % 30 === 0) {
      onProgress(50 + Math.round((i / Math.max(1, wrappedLines.length)) * 45));
    }
  }

  // Draw Page Numbers if enabled
  if (pageNumbers) {
    const totalPages = pdfDoc.getPageCount();
    for (let p = 0; p < totalPages; p++) {
      const page = pdfDoc.getPage(p);
      const pageNumberText = 'Page ' + (p + 1) + ' of ' + totalPages;
      const numWidth = font.widthOfTextAtSize(pageNumberText, 9);
      page.drawText(pageNumberText, {
        x: pageWidth - margin - numWidth,
        y: margin - 20,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
  }

  onProgress(98);
  const pdfBytes = await pdfDoc.save();
  onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert plain text or uploaded text file to a formatted PDF.
 * @param {string|File|Blob} textOrFile - The text content
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function textToPdf(textOrFile, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directTextToPdf(textOrFile, options, actualProgress);
}
