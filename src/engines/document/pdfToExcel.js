/* PDF to Excel Engine: High-Precision Scalar Recognition, Coordinate Grid Extraction & XLSX Packaging */
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
 * Normalize and infer scalar data types (int, float, currency, percent, date, bool, string)
 */
export function normalizeCellValue(rawStr, autoDetectNumbers = true) {
  if (rawStr === null || rawStr === undefined) return '';
  const str = String(rawStr).trim();
  if (!str) return '';

  if (!autoDetectNumbers) return str;

  // 1. Boolean detection
  const lower = str.toLowerCase();
  if (lower === 'true' || lower === 'yes' || str === '✓' || str === '✔' || str === '[x]' || str === '[X]') return true;
  if (lower === 'false' || lower === 'no' || str === '✘' || str === '✗' || str === '[ ]') return false;

  // 2. Accounting negative in parentheses: (1,234.56) or ($1,234.56)
  const acctMatch = str.match(/^\s*\(\s*[$€£¥]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*\)\s*$/);
  if (acctMatch) {
    const num = parseFloat(acctMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return -num;
  }

  // 3. Percentage: 12.5% or -5.2%
  const pctMatch = str.match(/^([+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\s*%$/);
  if (pctMatch) {
    const num = parseFloat(pctMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return num / 100;
  }

  // 4. Currency values: $1,250.00, €45.90, £100, ¥5000, 1,250.00 USD
  const currencyMatch = str.match(/^([$€£¥₹])\s*([+-]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)$/);
  if (currencyMatch) {
    const num = parseFloat(currencyMatch[2].replace(/,/g, ''));
    if (!isNaN(num)) return num;
  }

  // 5. Standard comma-formatted or decimal number: 1,250, 1,250.50, -45.00
  const stdNumMatch = str.match(/^([+-]?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)$/);
  if (stdNumMatch) {
    // Avoid stripping leading zeros on identifiers like postal codes (e.g. "01234") unless it's "0" or "0.xx"
    const cleaned = stdNumMatch[1].replace(/,/g, '');
    if (cleaned.length > 1 && cleaned.startsWith('0') && !cleaned.startsWith('0.')) {
      return str; // preserve as string code
    }
    const num = Number(cleaned);
    if (!isNaN(num)) return num;
  }

  // 6. ISO Date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return str;
    }
  }

  return str;
}

/**
 * Merge adjacent text items on the same horizontal line into coherent word phrases.
 */
export function mergeLineTextItems(items, yTolerance = 4.0) {
  if (!items || items.length === 0) return [];

  // Group items by baseline Y
  const rowGroups = [];
  for (const item of items) {
    if (!item.str || item.str.trim() === '') continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const width = item.width || (item.str.length * 6);
    const height = item.height || 10;
    const fontSize = Math.sqrt((item.transform[0] || 10) ** 2 + (item.transform[1] || 0) ** 2);

    let matchedRow = null;
    for (const rg of rowGroups) {
      if (Math.abs(rg.y - y) <= Math.max(yTolerance, fontSize * 0.35)) {
        matchedRow = rg;
        break;
      }
    }

    if (!matchedRow) {
      matchedRow = { y, items: [] };
      rowGroups.push(matchedRow);
    }
    matchedRow.items.push({
      x0: x,
      x1: x + width,
      y,
      height,
      fontSize,
      text: item.str
    });
  }

  // Sort rows top-to-bottom (PDF coordinates: higher Y = higher on page)
  rowGroups.sort((a, b) => b.y - a.y);

  // In each row, sort left to right and cluster adjacent items into phrases
  const visualLines = [];
  for (const rg of rowGroups) {
    rg.items.sort((a, b) => a.x0 - b.x0);

    const mergedSpans = [];
    let currentSpan = null;

    for (const it of rg.items) {
      if (!currentSpan) {
        currentSpan = { ...it, text: it.text };
        continue;
      }

      const gap = it.x0 - currentSpan.x1;
      // If gap is small (less than 1 space width ~ 4-10pt), join them
      const maxJoinGap = Math.max(4.5, currentSpan.fontSize * 0.45);

      if (gap <= maxJoinGap && gap >= -5.0) {
        const needsSpace = !currentSpan.text.endsWith(' ') && !it.text.startsWith(' ') && gap > 1.0;
        currentSpan.text += (needsSpace ? ' ' : '') + it.text;
        currentSpan.x1 = Math.max(currentSpan.x1, it.x1);
      } else {
        mergedSpans.push(currentSpan);
        currentSpan = { ...it, text: it.text };
      }
    }
    if (currentSpan) {
      mergedSpans.push(currentSpan);
    }

    if (mergedSpans.length > 0) {
      visualLines.push({
        y: rg.y,
        spans: mergedSpans
      });
    }
  }

  return visualLines;
}

/**
 * Recognize scalar key-value pairs (e.g. "Invoice #: 1234", "Date: 2024-05-12", "Total: $450.00")
 */
export function extractScalarFields(visualLines) {
  const scalars = [];
  const scalarLineIndices = new Set();

  const KEY_VALUE_REGEX = /^([A-Z0-9][A-Za-z0-9\s#\-\/\.]{1,35})\s*:\s*(.+)$/;

  for (let lIdx = 0; lIdx < visualLines.length; lIdx++) {
    const line = visualLines[lIdx];

    // Case 1: Single span contains "Key: Value"
    if (line.spans.length === 1) {
      const match = line.spans[0].text.trim().match(KEY_VALUE_REGEX);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (key.length > 1 && val.length > 0) {
          scalars.push({ key, value: val, lineIdx: lIdx });
          scalarLineIndices.add(lIdx);
          continue;
        }
      }
    }

    // Case 2: Adjacent spans on same line: Span 0 ends with ':', Span 1 is the value
    if (line.spans.length >= 2) {
      let lineConsumed = true;
      const rowScalars = [];
      for (let sIdx = 0; sIdx < line.spans.length; sIdx++) {
        const s = line.spans[sIdx];
        const trimmed = s.text.trim();

        if (trimmed.endsWith(':') && sIdx + 1 < line.spans.length) {
          const key = trimmed.slice(0, -1).trim();
          const val = line.spans[sIdx + 1].text.trim();
          if (key && val && !val.endsWith(':')) {
            rowScalars.push({ key, value: val, lineIdx: lIdx });
            sIdx++; // skip value
            continue;
          }
        }
        // Match inline "Key: Value" in multi-span
        const inlineMatch = trimmed.match(KEY_VALUE_REGEX);
        if (inlineMatch) {
          rowScalars.push({ key: inlineMatch[1].trim(), value: inlineMatch[2].trim(), lineIdx: lIdx });
          continue;
        }

        lineConsumed = false;
      }

      if (rowScalars.length > 0 && lineConsumed) {
        scalars.push(...rowScalars);
        scalarLineIndices.add(lIdx);
      }
    }
  }

  return { scalars, scalarLineIndices };
}

/**
 * Cluster horizontal spans across lines into aligned column coordinate bins.
 */
export function buildColumnGrid(visualLines, excludeLineIndices = new Set()) {
  const eligibleLines = visualLines.filter((_, idx) => !excludeLineIndices.has(idx));
  if (eligibleLines.length === 0) return { columns: [], gridRows: [] };

  // 1. Gather all span start X coordinates and span widths
  const xCoords = [];
  for (const line of eligibleLines) {
    for (const span of line.spans) {
      xCoords.push(span.x0);
    }
  }

  if (xCoords.length === 0) return { columns: [], gridRows: [] };

  // 2. Cluster X coordinates into discrete column tracks
  xCoords.sort((a, b) => a - b);
  const columnCenters = [];
  const COL_TOLERANCE = 22.0; // max horizontal drift for same column

  for (const x of xCoords) {
    let matchedCol = null;
    for (const col of columnCenters) {
      if (Math.abs(col.avg - x) <= COL_TOLERANCE) {
        matchedCol = col;
        break;
      }
    }

    if (!matchedCol) {
      columnCenters.push({ points: [x], avg: x });
    } else {
      matchedCol.points.push(x);
      matchedCol.avg = matchedCol.points.reduce((a, b) => a + b, 0) / matchedCol.points.length;
    }
  }

  // Filter columns: keep columns that have >= 2 items or occur in the widest multi-span row
  const maxSpansInAnyRow = Math.max(...eligibleLines.map(l => l.spans.length), 1);
  const validColumns = columnCenters
    .filter(c => c.points.length >= 2 || maxSpansInAnyRow <= 2)
    .sort((a, b) => a.avg - b.avg);

  // If clustering collapsed too aggressively, use the span coordinates from the widest row
  if (validColumns.length < maxSpansInAnyRow && maxSpansInAnyRow > 1) {
    const widestLine = eligibleLines.find(l => l.spans.length === maxSpansInAnyRow);
    if (widestLine) {
      validColumns.length = 0;
      for (const s of widestLine.spans) {
        validColumns.push({ avg: s.x0, points: [s.x0] });
      }
    }
  }

  // 3. Map each line's spans into the column grid
  const gridRows = [];
  for (const line of eligibleLines) {
    const rowValues = new Array(Math.max(validColumns.length, 1)).fill('');

    for (const span of line.spans) {
      // Find closest column track
      let bestColIdx = 0;
      let minDiff = Infinity;

      for (let cIdx = 0; cIdx < validColumns.length; cIdx++) {
        const diff = Math.abs(validColumns[cIdx].avg - span.x0);
        if (diff < minDiff) {
          minDiff = diff;
          bestColIdx = cIdx;
        }
      }

      if (rowValues[bestColIdx] === '') {
        rowValues[bestColIdx] = span.text.trim();
      } else {
        // If column already has text (multi-word in same cell), append
        rowValues[bestColIdx] += ' ' + span.text.trim();
      }
    }

    if (rowValues.some(val => val !== '')) {
      gridRows.push(rowValues);
    }
  }

  return { columns: validColumns, gridRows };
}

/**
 * Extract structured page data including scalar key-values and 2D grid.
 */
export async function parsePdfPageStructure(page, options = {}) {
  const { autoDetectNumbers = true, extractScalars = true } = options;
  const textContent = await page.getTextContent();
  const rawItems = textContent.items || [];

  // Phase 1: Merge raw PDF text items into cohesive visual lines
  const visualLines = mergeLineTextItems(rawItems);

  // Phase 2: Scalar Recognition (Key-Value pairs & summaries)
  let scalars = [];
  let scalarIndices = new Set();
  if (extractScalars) {
    const scalarRes = extractScalarFields(visualLines);
    scalars = scalarRes.scalars;
    scalarIndices = scalarRes.scalarLineIndices;
  }

  // Phase 3: Tabular Grid Recognition (Coordinate column binning)
  const { gridRows } = buildColumnGrid(visualLines, scalarIndices);

  // Phase 4: Data Normalization
  const normalizedGrid = gridRows.map(row =>
    row.map(cell => normalizeCellValue(cell, autoDetectNumbers))
  );

  const normalizedScalars = scalars.map(s => ({
    key: s.key,
    value: normalizeCellValue(s.value, autoDetectNumbers)
  }));

  return {
    scalars: normalizedScalars,
    gridRows: normalizedGrid,
    rawLineCount: visualLines.length
  };
}

/**
 * Direct in-browser PDF to Excel compiler.
 * Implements Scalar Recognition, 1D gap clustering, coordinate column binning, and professional XLSX styling.
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
  onProgress(25);

  const {
    sheetMode = 'per_page',
    autoDetectNumbers = true,
    extractScalars = true
  } = options;

  const workbook = XLSX.utils.book_new();
  const allPagesAoa = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const { scalars, gridRows } = await parsePdfPageStructure(page, {
      autoDetectNumbers,
      extractScalars
    });

    const pageAoa = [];

    // 1. If scalars were detected, render a structured Key-Value Header block
    if (scalars && scalars.length > 0) {
      pageAoa.push(['--- Document Information & Key Details ---']);
      // Render in pairs: [Key 1, Value 1, Key 2, Value 2]
      for (let i = 0; i < scalars.length; i += 2) {
        const row = [scalars[i].key, scalars[i].value];
        if (i + 1 < scalars.length) {
          row.push(scalars[i + 1].key, scalars[i + 1].value);
        }
        pageAoa.push(row);
      }
      pageAoa.push([]); // blank spacer row
    }

    // 2. Append tabular data rows
    if (gridRows && gridRows.length > 0) {
      pageAoa.push(...gridRows);
    }

    // If both scalars and grid were completely empty, add fallback row
    if (pageAoa.length === 0) {
      pageAoa.push(['[Empty Page]']);
    }

    // Auto-compute column widths for optimal reading in Excel
    const maxCols = Math.max(...pageAoa.map(r => r.length), 1);
    const colWidths = new Array(maxCols).fill({ wch: 10 });
    for (const r of pageAoa) {
      r.forEach((cellVal, cIdx) => {
        const strLen = String(cellVal || '').length;
        if (strLen + 3 > colWidths[cIdx].wch) {
          colWidths[cIdx] = { wch: Math.min(Math.max(strLen + 3, 10), 45) };
        }
      });
    }

    if (sheetMode === 'per_page') {
      const ws = XLSX.utils.aoa_to_sheet(pageAoa);
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, ws, `Page_${pageNum}`);
    } else {
      if (allPagesAoa.length > 0) {
        allPagesAoa.push([]);
        allPagesAoa.push([`=== Page ${pageNum} ===`]);
      }
      allPagesAoa.push(...pageAoa);
    }

    onProgress(25 + Math.round((pageNum / numPages) * 65));
  }

  if (sheetMode === 'single_sheet') {
    const maxCols = Math.max(...allPagesAoa.map(r => r.length), 1);
    const colWidths = new Array(maxCols).fill({ wch: 10 });
    for (const r of allPagesAoa) {
      r.forEach((cellVal, cIdx) => {
        const strLen = String(cellVal || '').length;
        if (strLen + 3 > colWidths[cIdx].wch) {
          colWidths[cIdx] = { wch: Math.min(Math.max(strLen + 3, 10), 45) };
        }
      });
    }
    const ws = XLSX.utils.aoa_to_sheet(allPagesAoa.length > 0 ? allPagesAoa : [['']]);
    ws['!cols'] = colWidths;
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

