/**
 * pageRangeUtils.js
 * High-performance, zero-falsy-trap page range parsing and slicing utilities.
 * Supports standard syntax: "1-3, 5", "all", "odd", "even", individual numbers,
 * inverted ranges ("5-2"), out-of-bounds capping, and whitespace tolerance.
 */

/**
 * Normalizes a page range string by converting typographic dashes,
 * semicolons, and trimming whitespace around hyphens.
 * @param {string} str - Raw range string (e.g. "1 - 3", "1–4", "1; 2; 3")
 * @returns {string} - Cleaned range string (e.g. "1-3", "1-4", "1, 2, 3")
 */
export function normalizeRangeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u2013\u2014\u2212]/g, '-') // en-dash, em-dash, minus to hyphen
    .replace(/;/g, ',')                    // semicolons to commas
    .replace(/\s*-\s*/g, '-')              // "1 - 3" -> "1-3"
    .replace(/\s*,\s*/g, ', ')             // "1 , 3" -> "1, 3"
    .replace(/\s+/g, ' ')                  // normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Parses a page range string into an array of 0-based page indices.
 * @param {string} rangeStr - The range string (e.g. "1-3, 5", "all", "odd", "even")
 * @param {number} totalPages - Total pages in the source document
 * @returns {number[]} - Array of unique, 0-based page indices sorted ascending
 */
export function parsePageRangeIndices(rangeStr, totalPages) {
  const clean = normalizeRangeString(rangeStr);
  if (!clean || clean === 'all') {
    return Array.from({ length: totalPages }, (_, k) => k);
  }
  if (clean === 'odd') {
    const indices = [];
    for (let p = 0; p < totalPages; p++) {
      if (p % 2 === 0) indices.push(p); // 1st page is index 0
    }
    return indices;
  }
  if (clean === 'even') {
    const indices = [];
    for (let p = 0; p < totalPages; p++) {
      if (p % 2 === 1) indices.push(p); // 2nd page is index 1
    }
    return indices;
  }
  const indicesSet = new Set();
  const parts = clean.split(/[,\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));
        for (let p = s; p <= e; p++) {
          indicesSet.add(p - 1);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indicesSet.add(p - 1);
      }
    }
  }
  return indicesSet.size > 0
    ? Array.from(indicesSet).sort((a, b) => a - b)
    : Array.from({ length: totalPages }, (_, k) => k);
}

/**
 * Calculates the number of selected pages without allocating an index array.
 * @param {string} rangeStr - The range string (e.g. "1-3, 5", "all", "odd", "even")
 * @param {number} totalPages - Total pages in the source document
 * @returns {number} - Number of selected pages
 */
export function countPagesInRange(rangeStr, totalPages) {
  const clean = normalizeRangeString(rangeStr);
  if (!clean || clean === 'all') {
    return totalPages;
  }
  if (clean === 'odd') {
    return Math.ceil(totalPages / 2);
  }
  if (clean === 'even') {
    return Math.floor(totalPages / 2);
  }
  const indices = new Set();
  const parts = clean.split(/[,\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));
        for (let p = s; p <= e; p++) {
          indices.add(p);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p);
      }
    }
  }
  return indices.size > 0 ? indices.size : totalPages;
}

/**
 * Validates a page range string against total document pages.
 * Detects syntax errors, out-of-bounds page numbers, and returns calculated count.
 * @param {string} rangeStr - The range string (e.g. "1-3, 5", "all", "odd", "even", "99-100")
 * @param {number} totalPages - Total pages in the source document
 * @returns {{ isValid: boolean, pageCount: number, isOutOfBounds: boolean, error: string | null, warning: string | null }}
 */
export function validatePageRange(rangeStr, totalPages) {
  const clean = normalizeRangeString(rangeStr);
  if (!clean || clean === 'all') {
    return {
      isValid: true,
      pageCount: totalPages,
      isOutOfBounds: false,
      error: null,
      warning: null
    };
  }

  if (clean === 'odd') {
    return {
      isValid: true,
      pageCount: Math.ceil(totalPages / 2),
      isOutOfBounds: false,
      error: null,
      warning: null
    };
  }
  if (clean === 'even') {
    return {
      isValid: true,
      pageCount: Math.floor(totalPages / 2),
      isOutOfBounds: false,
      error: null,
      warning: null
    };
  }

  const validIndices = new Set();
  const outOfBounds = [];
  const invalidTokens = [];
  const parts = clean.split(/[,\s]+/);

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const subParts = part.split('-');
      if (subParts.length !== 2) {
        invalidTokens.push(part);
        continue;
      }
      const [startStr, endStr] = subParts;
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || !/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
        invalidTokens.push(part);
        continue;
      }

      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        outOfBounds.push(part);
      }

      const s = Math.max(1, Math.min(start, end));
      const e = Math.min(totalPages, Math.max(start, end));
      if (s <= e) {
        for (let p = s; p <= e; p++) {
          validIndices.add(p);
        }
      }
    } else {
      if (!/^\d+$/.test(part)) {
        invalidTokens.push(part);
        continue;
      }
      const p = parseInt(part, 10);
      if (p < 1 || p > totalPages) {
        outOfBounds.push(part);
      } else {
        validIndices.add(p);
      }
    }
  }

  if (invalidTokens.length > 0) {
    return {
      isValid: false,
      pageCount: validIndices.size,
      isOutOfBounds: outOfBounds.length > 0,
      error: `Invalid format: "${invalidTokens.join(', ')}"`,
      warning: null
    };
  }

  if (outOfBounds.length > 0) {
    if (validIndices.size === 0) {
      return {
        isValid: false,
        pageCount: 0,
        isOutOfBounds: true,
        error: `Page(s) out of bounds (doc has ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}): ${outOfBounds.join(', ')}`,
        warning: null
      };
    }
    return {
      isValid: true,
      pageCount: validIndices.size,
      isOutOfBounds: true,
      error: null,
      warning: `Some pages out of bounds (${outOfBounds.join(', ')})`
    };
  }

  return {
    isValid: true,
    pageCount: validIndices.size,
    isOutOfBounds: false,
    error: null,
    warning: null
  };
}

/**
 * Sanitizes an output PDF filename.
 * Strips invalid filesystem characters, ensures .pdf extension, and provides safe default.
 * @param {string} rawName - User provided filename
 * @param {string} defaultName - Fallback name if empty (default: 'merged.pdf')
 * @returns {string} - Clean, safe filename ending with .pdf
 */
export function sanitizePdfFilename(rawName, defaultName = 'merged.pdf') {
  if (!rawName || typeof rawName !== 'string') return defaultName;
  const clean = rawName.trim().replace(/[\/\\:*?"<>|]/g, '_').replace(/\.pdf$/i, '').trim();
  return clean ? `${clean}.pdf` : defaultName;
}

