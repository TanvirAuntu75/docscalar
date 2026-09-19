/* Split PDF engine using background worker */
import { PDFDocument } from 'pdf-lib';
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Split a PDF into individual pages or by range using a background Web Worker.
 * @param {File} file - The PDF file
 * @param {string} mode - 'all' (each page) | 'range' (specific pages)
 * @param {string} range - e.g. "1-3,5,7-9" (only used in 'range' mode)
 * @param {function} onProgress
 * @param {object} [options] - Options including autoCropBlackBorders and smartCrop
 * @returns {Promise<{blobs: Blob[], names: string[]}>}
 */
export async function splitPdf(file, mode = 'all', range = '', onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'splitPdf',
        payload: { arrayBuffer, mode, range, options }
      }, [arrayBuffer]);
    }).catch(reject);

    worker.onmessage = (e) => {
      const { type, progress, result, error } = e.data;
      if (type === 'progress') {
        if (onProgress) onProgress(progress);
      } else if (type === 'success') {
        const blobs = result.blobs.map(b => new Blob([b.arrayBuffer], { type: b.type }));
        resolve({ blobs, names: result.names });
        worker.terminate();
      } else if (type === 'error') {
        reject(new Error(error));
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
  });
}


export function parseRange(rangeStr, max) {
  const indices = new Set();
  if (!rangeStr || !rangeStr.trim()) return [];

  const parts = rangeStr.split(',').map((s) => s.trim());
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const sides = part.split('-');
      if (sides.length !== 2) continue; // Skip invalid formats like 1-2-3
      
      const startVal = sides[0].trim();
      const endVal = sides[1].trim();

      const start = startVal === '' ? 1 : Number(startVal);
      const end = endVal === '' ? max : Number(endVal);

      if (isNaN(start) || isNaN(end) || !Number.isInteger(start) || !Number.isInteger(end) || start > end || start < 1 || end < 1) continue;

      for (let i = Math.max(1, start); i <= Math.min(max, end); i++) {
        indices.add(i - 1);
      }
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= max) {
        indices.add(n - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Get the page count of a PDF file.
 */
export async function getPdfPageCount(file) {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}
