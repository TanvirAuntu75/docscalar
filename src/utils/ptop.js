import { PDFDocument } from 'pdf-lib';

/**
 * Parses page range string (e.g. "1-2, 5", "even", "odd", "first 3", "last page")
 * and returns sorted 0-based page indices.
 * 
 * @param {string} rangeStr - The user-input range query
 * @param {number} totalPages - The total number of pages in the PDF
 * @returns {number[]|null} - Array of 0-based page indices or null if invalid/empty
 */
export function parsePageRange(rangeStr, totalPages) {
  if (!rangeStr || typeof rangeStr !== 'string' || !rangeStr.trim() || totalPages <= 0) {
    return null;
  }
  
  const trimmed = rangeStr.toLowerCase().trim();
  const indices = new Set();

  if (trimmed === 'even') {
    for (let i = 1; i < totalPages; i += 2) {
      indices.add(i);
    }
  } else if (trimmed === 'odd') {
    for (let i = 0; i < totalPages; i += 2) {
      indices.add(i);
    }
  } else if (trimmed === 'all') {
    for (let i = 0; i < totalPages; i++) {
      indices.add(i);
    }
  } else if (trimmed.startsWith('first') || trimmed.startsWith('last')) {
    const numMatch = trimmed.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0]) : 1;
    if (trimmed.startsWith('first')) {
      const limit = Math.min(num, totalPages);
      for (let i = 0; i < limit; i++) {
        indices.add(i);
      }
    } else {
      const start = Math.max(0, totalPages - num);
      for (let i = start; i < totalPages; i++) {
        indices.add(i);
      }
    }
  } else {
    // Parse commas and dashes, e.g. "1-3, 5, 8 to 10"
    const normalized = trimmed.replace(/\bto\b/g, '-');
    const parts = normalized.split(',');
    
    for (const part of parts) {
      const piece = part.trim();
      if (!piece) continue;

      if (piece.includes('-')) {
        const [startStr, endStr] = piece.split('-');
        const start = parseInt(startStr.trim());
        const end = parseInt(endStr.trim());
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(0, Math.min(start, end) - 1);
          const max = Math.min(totalPages - 1, Math.max(start, end) - 1);
          for (let i = min; i <= max; i++) {
            indices.add(i);
          }
        }
      } else {
        const num = parseInt(piece);
        if (!isNaN(num) && num > 0 && num <= totalPages) {
          indices.add(num - 1);
        }
      }
    }
  }

  if (indices.size === 0) return null;
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Loads a PDF and returns its page count.
 */
export async function getPdfPageCount(pdfBytes) {
  let doc = null;
  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    if (doc.isEncrypted) {
      throw new Error("This PDF is password-protected or encrypted. Please unlock it using the Unlock PDF tool first.");
    }
    return doc.getPageCount();
  } finally {
    doc = null;
  }
}

/**
 * Extracts a subset of pages from a PDF.
 */
export async function extractPdfSubset(pdfBytes, targetIndices) {
  if (!targetIndices || targetIndices.length === 0) {
    return pdfBytes;
  }
  let srcDoc = null;
  let subDoc = null;
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    if (srcDoc.isEncrypted) {
      throw new Error("This PDF is password-protected or encrypted. Please unlock it using the Unlock PDF tool first.");
    }
    subDoc = await PDFDocument.create();
    
    const copiedPages = await subDoc.copyPages(srcDoc, targetIndices);
    copiedPages.forEach(page => subDoc.addPage(page));
    
    const result = await subDoc.save();
    return result;
  } finally {
    srcDoc = null;
    subDoc = null;
  }
}

/**
 * Stitches a modified subset of pages back into the original PDF.
 */
export async function stitchPdfSubset(origBytes, subsetBytes, targetIndices) {
  if (!targetIndices || targetIndices.length === 0) {
    return origBytes;
  }
  let outDoc = null;
  let srcDoc = null;
  let processedDoc = null;
  try {
    outDoc = await PDFDocument.create();
    srcDoc = await PDFDocument.load(origBytes, { ignoreEncryption: true });
    if (srcDoc.isEncrypted) {
      throw new Error("This PDF is password-protected or encrypted. Please unlock it using the Unlock PDF tool first.");
    }
    processedDoc = await PDFDocument.load(subsetBytes, { ignoreEncryption: true });
    if (processedDoc.isEncrypted) {
      throw new Error("The processed PDF subset is encrypted.");
    }

    const totalPages = srcDoc.getPageCount();
    const allIndices = Array.from({ length: totalPages }, (_, i) => i);
    const srcPages = await outDoc.copyPages(srcDoc, allIndices);
    
    const subsetCount = processedDoc.getPageCount();
    const subsetPagesIndices = Array.from({ length: subsetCount }, (_, i) => i);
    const processedPages = await outDoc.copyPages(processedDoc, subsetPagesIndices);

    for (let i = 0; i < totalPages; i++) {
      const targetIdx = targetIndices.indexOf(i);
      if (targetIdx !== -1 && targetIdx < processedPages.length) {
        outDoc.addPage(processedPages[targetIdx]);
      } else {
        outDoc.addPage(srcPages[i]);
      }
    }

    const result = await outDoc.save();
    return result;
  } finally {
    outDoc = null;
    srcDoc = null;
    processedDoc = null;
  }
}
