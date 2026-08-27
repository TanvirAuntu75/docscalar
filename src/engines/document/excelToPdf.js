/* Excel to PDF Engine: Client Vector Grid & XLSX Parsing with In-Thread Fallback */
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
 * Direct in-thread fallback Excel to PDF compiler using xlsx and pdf-lib.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directExcelToPdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  onProgress(30);

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in this Excel workbook.');
  }

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { pageSize = 'a4', orientation = 'auto', gridlines = true } = options;

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
    const isLandscape = orientation === 'landscape' || (orientation === 'auto' && maxCols > 6);

    const baseWidth = pageSize === 'letter' ? 612 : 595.28;
    const baseHeight = pageSize === 'letter' ? 792 : 841.89;

    const pageWidth = isLandscape ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight);
    const pageHeight = isLandscape ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight);

    const margin = 36;
    const printableWidth = pageWidth - margin * 2;
    const colWidth = Math.max(40, printableWidth / Math.max(1, maxCols));
    const rowHeight = 18;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Sheet title
    currentPage.drawText(sheetName, {
      x: margin,
      y: currentY,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54)
    });
    currentY -= 22;

    const addNewPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    };

    for (let r = 0; r < cleanedRows.length; r++) {
      if (currentY - rowHeight < margin) {
        addNewPage();
      }

      const row = cleanedRows[r];
      const isHeader = r === 0;

      // Draw background
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight + 4,
          width: printableWidth,
          height: rowHeight,
          color: rgb(0.23, 0.51, 0.96)
        });
      } else if (r % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight + 4,
          width: printableWidth,
          height: rowHeight,
          color: rgb(0.96, 0.97, 0.98)
        });
      }

      // Draw cells
      for (let c = 0; c < maxCols; c++) {
        const cellVal = row[c] !== undefined ? String(row[c]).trim() : '';
        const cellX = margin + c * colWidth;
        const font = isHeader ? fontBold : fontRegular;
        const textColor = isHeader ? rgb(1, 1, 1) : rgb(0.15, 0.15, 0.15);
        const fontSize = maxCols > 10 ? 6.5 : (maxCols > 7 ? 7.5 : 8.5);

        if (cellVal) {
          const truncated = cellVal.length > 25 ? cellVal.slice(0, 22) + '...' : cellVal;
          currentPage.drawText(truncated, {
            x: cellX + 4,
            y: currentY - rowHeight + 8,
            size: fontSize,
            font,
            color: textColor
          });
        }

        // Cell borders
        if (gridlines) {
          currentPage.drawRectangle({
            x: cellX,
            y: currentY - rowHeight + 4,
            width: colWidth,
            height: rowHeight,
            borderColor: rgb(0.85, 0.88, 0.92),
            borderWidth: 0.5
          });
        }
      }

      currentY -= rowHeight;
    }

    sheetIdx++;
    onProgress(30 + Math.round((sheetIdx / workbook.SheetNames.length) * 65));
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
