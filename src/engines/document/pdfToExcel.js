/* PDF to Excel Engine: High-Precision Coordinate Table Extraction & XLSX Packaging */
import * as XLSX from 'xlsx';

/**
 * Polyfill for environments missing Promise.withResolvers
 */
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/**
 * Dynamically import pdfjs-dist
 */
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions?.workerSrc && typeof window !== 'undefined') {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    } catch (e) {}
  }
  return pdfjs.default || pdfjs;
}

/**
 * Extract array buffer from any input
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
  throw new Error('Unsupported PDF input format.');
}

const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/';
const STANDARD_FONT_DATA_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/standard_fonts/';

/**
 * Direct in-thread fallback PDF to Excel compiler.
 * Analyzes text item geometry (X, Y) and constructs structured XLSX sheets.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directPdfToExcel(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  const pdfjs = await getPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  onProgress(30);

  const { sheetMode = 'per_page', autoDetectNumbers = true } = options;
  const workbook = XLSX.utils.book_new();

  const allPagesRows = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    // Group items into rows by Y coordinate tolerance (~6pt)
    const rowBuckets = new Map();

    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5]);

      // Find closest row bucket within 5pt tolerance
      let matchedY = null;
      for (const bucketY of rowBuckets.keys()) {
        if (Math.abs(bucketY - y) <= 5) {
          matchedY = bucketY;
          break;
        }
      }

      if (matchedY === null) {
        matchedY = y;
        rowBuckets.set(matchedY, []);
      }

      rowBuckets.get(matchedY).push({
        x,
        text: item.str.trim()
      });
    }

    // Sort rows top-to-bottom (higher Y to lower Y in PDF coordinates)
    const sortedY = Array.from(rowBuckets.keys()).sort((a, b) => b - a);
    const pageGrid = [];

    for (const y of sortedY) {
      const rowItems = rowBuckets.get(y);
      // Sort columns left-to-right (lower X to higher X)
      rowItems.sort((a, b) => a.x - b.x);

      const rowValues = rowItems.map((cell) => {
        const str = cell.text;
        if (autoDetectNumbers) {
          // Check if numeric or currency
          const cleanNum = str.replace(/[$,€£]/g, '').trim();
          if (!isNaN(cleanNum) && cleanNum !== '') {
            return Number(cleanNum);
          }
        }
        return str;
      });

      if (rowValues.length > 0) {
        pageGrid.push(rowValues);
      }
    }

    if (sheetMode === 'per_page') {
      const ws = XLSX.utils.aoa_to_sheet(pageGrid.length > 0 ? pageGrid : [['']]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Page_' + pageNum);
    } else {
      if (pageGrid.length > 0) {
        allPagesRows.push(['--- Page ' + pageNum + ' ---']);
        allPagesRows.push(...pageGrid);
      }
    }

    onProgress(30 + Math.round((pageNum / numPages) * 60));
  }

  if (sheetMode === 'single_sheet') {
    const ws = XLSX.utils.aoa_to_sheet(allPagesRows.length > 0 ? allPagesRows : [['']]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Extracted_Data');
  }

  onProgress(95);
  const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  onProgress(100);

  return new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Convert a PDF file to Excel (.xlsx) workbook.
 * @param {File|Blob|ArrayBuffer} file - The .pdf file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function pdfToExcel(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directPdfToExcel(file, options, actualProgress);
}
