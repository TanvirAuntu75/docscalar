/* Images to PDF engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Combine multiple image files into a single PDF using a background Web Worker.
 * @param {File[]} files - Array of image files
 * @param {number[]} rotations - Array of rotation angles per file index
 * @param {object} options - Page size, margins, and orientation settings
 * @param {function} onProgress - Callback (percent: number)
 * @returns {Promise<Blob>} - The PDF blob
 */
export async function imagesToPdf(files, rotations = [], options = {}, onProgress) {
  let actualProgressCallback = onProgress;
  let actualOptions = { ...options };
  let actualRotations = rotations;

  if (typeof rotations === 'function') {
    actualProgressCallback = rotations;
    actualRotations = [];
  } else if (typeof options === 'function') {
    actualProgressCallback = options;
  }

  // Inject user's autoEnhance preference from localStorage
  if (actualOptions.autoEnhance === undefined) {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    // Map files to ArrayBuffer promises
    const promises = files.map(async (file, idx) => {
      const buffer = await file.arrayBuffer();
      return {
        arrayBuffer: buffer,
        name: file.name,
        type: file.type,
        rotation: actualRotations[idx] || 0
      };
    });

    Promise.all(promises).then((imageFiles) => {
      const transferables = imageFiles.map(f => f.arrayBuffer);
      worker.postMessage({
        type: 'imageToPdf',
        payload: { imageFiles, options: actualOptions }
      }, transferables);
    }).catch(reject);

    worker.onmessage = (e) => {
      const { type, progress, result, error } = e.data;
      if (type === 'progress') {
        if (actualProgressCallback) actualProgressCallback(progress);
      } else if (type === 'success') {
        const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' });
        resolve(blob);
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
