/* Excel to PDF Engine: Client Vector Grid & XLSX Parsing with Content-Aware Layout */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';

/**
 * Extract array buffer from any file/blob/buffer input
 */
async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported Excel file input format.');
}

/**
 * Unicode WinAnsi sanitization for pdf-lib standard fonts.
 * Maps non-WinAnsi characters to safe equivalents to prevent unhandled encode crashes.
 */
export function sanitizeWinAnsiText(str) {
  if (!str) return '';
  return String(str)
    // Currencies
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    .replace(/¥/g, 'JPY ')
    .replace(/₹/g, 'INR ')
    // Punctuation & quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25AA\u25CF]/g, '*')
    // Math & symbols
    .replace(/[×✕✖]/g, 'x')
    .replace(/[÷]/g, '/')
    .replace(/[±]/g, '+/-')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[≠]/g, '!=')
    .replace(/[✓✔]/g, '[v]')
    .replace(/[✗✘]/g, '[x]')
    .replace(/[★☆]/g, '*')
    // Accented characters to standard ASCII
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Fallback: replace any remaining non-printable or non-ASCII characters outside WinAnsi
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

/**
 * Compute content-aware proportional column widths based on cell text lengths.
 */
export function computeProportionalColumnWidths(rows, maxCols, totalWidth) {
  const colMaxChars = new Array(maxCols).fill(3);

  for (const row of rows) {
    for (let c = 0; c < maxCols; c++) {
      const val = row[c] !== undefined ? String(row[c]).trim() : '';
      if (val.length > colMaxChars[c]) {
        colMaxChars[c] = Math.min(val.length, 60); // cap max weight
      }
    }
  }

  const totalChars = colMaxChars.reduce((sum, len) => sum + len, 0) || 1;
  const MIN_COL_WIDTH = 38;

  // Calculate raw proportional widths
  let widths = colMaxChars.map(len => (len / totalChars) * totalWidth);

  // Enforce minimum width
  let deficit = 0;
  for (let i = 0; i < maxCols; i++) {
    if (widths[i] < MIN_COL_WIDTH) {
      deficit += MIN_COL_WIDTH - widths[i];
      widths[i] = MIN_COL_WIDTH;
    }
  }

  // Adjust remaining widths if possible
  const flexibleIndices = widths
    .map((w, i) => (w > MIN_COL_WIDTH ? i : -1))
    .filter(i => i !== -1);

  if (deficit > 0 && flexibleIndices.length > 0) {
    const totalFlex = flexibleIndices.reduce((sum, i) => sum + widths[i], 0);
    for (const i of flexibleIndices) {
      widths[i] -= (widths[i] / totalFlex) * deficit;
      if (widths[i] < MIN_COL_WIDTH) widths[i] = MIN_COL_WIDTH;
    }
  }

  // Final scale normalization so sum(widths) exactly equals totalWidth
  const currentSum = widths.reduce((sum, w) => sum + w, 0);
  if (currentSum > 0) {
    const scale = totalWidth / currentSum;
    widths = widths.map(w => w * scale);
  }

  return widths;
}

/**
 * Wrap cell text across multiple lines to prevent cut-offs and overflows.
 * Honors explicit newlines, measures text width via font.widthOfTextAtSize,
 * and splits words that exceed the column width.
 */
export function wrapCellText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const safeMaxWidth = Math.max(maxWidth, 20);
  const paragraphs = String(text).split(/\r?\n/);
  const resultLines = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let testWidth = 0;
      if (font && typeof font.widthOfTextAtSize === 'function') {
        testWidth = font.widthOfTextAtSize(testLine, fontSize);
      } else {
        testWidth = testLine.length * (fontSize * 0.55);
      }

      if (testWidth <= safeMaxWidth || !currentLine) {
        if (!currentLine && testWidth > safeMaxWidth) {
          let partial = '';
          for (const char of word) {
            const nextPart = partial + char;
            const charW = font && typeof font.widthOfTextAtSize === 'function'
              ? font.widthOfTextAtSize(nextPart, fontSize)
              : nextPart.length * (fontSize * 0.55);
            if (charW <= safeMaxWidth || !partial) {
              partial = nextPart;
            } else {
              resultLines.push(partial);
              partial = char;
            }
          }
          currentLine = partial;
        } else {
          currentLine = testLine;
        }
      } else {
        resultLines.push(currentLine);
        const wordWidth = font && typeof font.widthOfTextAtSize === 'function'
          ? font.widthOfTextAtSize(word, fontSize)
          : word.length * (fontSize * 0.55);
        if (wordWidth > safeMaxWidth) {
          let partial = '';
          for (const char of word) {
            const nextPart = partial + char;
            const charW = font && typeof font.widthOfTextAtSize === 'function'
              ? font.widthOfTextAtSize(nextPart, fontSize)
              : nextPart.length * (fontSize * 0.55);
            if (charW <= safeMaxWidth || !partial) {
              partial = nextPart;
            } else {
              resultLines.push(partial);
              partial = char;
            }
          }
          currentLine = partial;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Direct in-thread fallback Excel to PDF compiler using xlsx and pdf-lib.
 * Features: Zero 25-char truncation, content-proportional column widths, repeated headers on page breaks,
 * unicode safety, and professional page footers.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directExcelToPdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  onProgress(25);

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in this Excel workbook.');
  }

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { pageSize = 'a4', orientation = 'auto', gridlines = true } = options;

  let totalPagesRendered = 0;
  let sheetIdx = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!data || data.length === 0) continue;

    // Filter empty rows
    const cleanedRows = data.filter((r) => r && r.some((c) => String(c).trim() !== ''));
    if (cleanedRows.length === 0) continue;

    const maxCols = Math.max(...cleanedRows.map((r) => r.length), 0);
    if (maxCols === 0) continue;

    const isLandscape = orientation === 'landscape' || (orientation === 'auto' && maxCols > 6);

    const baseWidth = pageSize === 'letter' ? 612 : 595.28;
    const baseHeight = pageSize === 'letter' ? 792 : 841.89;

    const pageWidth = isLandscape ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight);
    const pageHeight = isLandscape ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight);

    const margin = 32;
    const printableWidth = pageWidth - margin * 2;

    // Compute content-aware column widths
    const colWidths = computeProportionalColumnWidths(cleanedRows, maxCols, printableWidth);

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    totalPagesRendered++;
    let currentY = pageHeight - margin;
    let sheetPageNum = 1;

    // Sheet title banner
    currentPage.drawText(sanitizeWinAnsiText(sheetName), {
      x: margin,
      y: currentY - 2,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54)
    });
    currentY -= 26;

    // Header metrics
    const headerFontSize = 8.0;
    const headerLineHeight = headerFontSize + 3;
    const headerRow = cleanedRows[0];

    const headerCellLines = [];
    let maxHeaderLines = 1;
    for (let c = 0; c < maxCols; c++) {
      const cWidth = colWidths[c];
      const rawVal = headerRow[c] !== undefined ? String(headerRow[c]).trim() : '';
      const safeVal = sanitizeWinAnsiText(rawVal);
      const lines = wrapCellText(safeVal, fontBold, headerFontSize, cWidth - 8);
      headerCellLines.push(lines);
      if (lines.length > maxHeaderLines) maxHeaderLines = lines.length;
    }
    const headerHeight = Math.max(20, maxHeaderLines * headerLineHeight + 6);

    // Helper: Draw Header Row
    const drawHeaderRow = (targetPage, yPos) => {
      targetPage.drawRectangle({
        x: margin,
        y: yPos - headerHeight,
        width: printableWidth,
        height: headerHeight,
        color: rgb(0.24, 0.45, 0.86)
      });

      let cellX = margin;
      for (let c = 0; c < maxCols; c++) {
        const cWidth = colWidths[c];
        const lines = headerCellLines[c];
        const totalTextH = lines.length * headerLineHeight;
        const startY = yPos - Math.max(headerFontSize + 2, (headerHeight - totalTextH) / 2 + headerFontSize * 0.8);

        for (let li = 0; li < lines.length; li++) {
          targetPage.drawText(lines[li], {
            x: cellX + 4,
            y: startY - (li * headerLineHeight),
            size: headerFontSize,
            font: fontBold,
            color: rgb(1, 1, 1)
          });
        }

        if (gridlines) {
          targetPage.drawRectangle({
            x: cellX,
            y: yPos - headerHeight,
            width: cWidth,
            height: headerHeight,
            borderColor: rgb(0.18, 0.35, 0.70),
            borderWidth: 0.5
          });
        }

        cellX += cWidth;
      }
      return headerHeight;
    };

    // Helper: Draw Page Footer
    const drawFooter = (targetPage, pageNum) => {
      targetPage.drawText(`Sheet: ${sanitizeWinAnsiText(sheetName)} | Page ${pageNum}`, {
        x: margin,
        y: margin - 14,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.6)
      });
    };

    // Draw initial header row on Page 1
    drawHeaderRow(currentPage, currentY);
    currentY -= headerHeight;

    const addNewPage = () => {
      drawFooter(currentPage, sheetPageNum);
      sheetPageNum++;
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      totalPagesRendered++;
      currentY = pageHeight - margin;

      // Repeat table header at the top of the continued page
      drawHeaderRow(currentPage, currentY);
      currentY -= headerHeight;
    };

    // Draw data rows (r = 1 to end)
    for (let r = 1; r < cleanedRows.length; r++) {
      const row = cleanedRows[r];
      const dataFontSize = 8.0;
      const dataLineHeight = dataFontSize + 3;

      const rowCellLines = [];
      let maxRowLines = 1;
      for (let c = 0; c < maxCols; c++) {
        const cWidth = colWidths[c];
        const rawVal = row[c] !== undefined ? String(row[c]).trim() : '';
        const safeVal = sanitizeWinAnsiText(rawVal);
        const lines = wrapCellText(safeVal, fontRegular, dataFontSize, cWidth - 8);
        rowCellLines.push(lines);
        if (lines.length > maxRowLines) maxRowLines = lines.length;
      }

      const calculatedRowHeight = Math.max(18, maxRowLines * dataLineHeight + 6);

      if (currentY - calculatedRowHeight < margin + 14) {
        addNewPage();
      }

      // Zebra striping
      if (r % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - calculatedRowHeight,
          width: printableWidth,
          height: calculatedRowHeight,
          color: rgb(0.97, 0.98, 0.99)
        });
      }

      let cellX = margin;
      for (let c = 0; c < maxCols; c++) {
        const cWidth = colWidths[c];
        const lines = rowCellLines[c];
        const totalTextH = lines.length * dataLineHeight;
        const startY = currentY - Math.max(dataFontSize + 2, (calculatedRowHeight - totalTextH) / 2 + dataFontSize * 0.8);

        for (let li = 0; li < lines.length; li++) {
          currentPage.drawText(lines[li], {
            x: cellX + 4,
            y: startY - (li * dataLineHeight),
            size: dataFontSize,
            font: fontRegular,
            color: rgb(0.15, 0.15, 0.15)
          });
        }

        // Cell borders
        if (gridlines) {
          currentPage.drawRectangle({
            x: cellX,
            y: currentY - calculatedRowHeight,
            width: cWidth,
            height: calculatedRowHeight,
            borderColor: rgb(0.88, 0.90, 0.93),
            borderWidth: 0.5
          });
        }

        cellX += cWidth;
      }

      currentY -= calculatedRowHeight;
    }

    // Draw footer on last page of sheet
    drawFooter(currentPage, sheetPageNum);

    sheetIdx++;
    onProgress(25 + Math.round((sheetIdx / workbook.SheetNames.length) * 70));
  }

  if (pdfDoc.getPageCount() === 0) {
    pdfDoc.addPage([595.28, 841.89]);
  }

  onProgress(98);
  const pdfBytes = await pdfDoc.save();
  onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert an Excel file to PDF using browser autoTable or direct fallback.
 * @param {File|Blob|ArrayBuffer} file - The .xlsx file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function excelToPdf(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directExcelToPdf(file, options, actualProgress);
}

