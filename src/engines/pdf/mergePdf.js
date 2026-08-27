/* Merge PDFs engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Merge multiple PDF files into one using a background Web Worker.
 * @param {File[]} files - Array of PDF files
 * @param {number[]} [rotations=[]] - Optional per-file rotation angles
 * @param {object} [options={}] - Optional merge settings (e.g. blankPageSeparator)
 * @param {function} [onProgress] - Callback (percent: number)
 * @returns {Promise<Blob>} - The merged PDF blob
 */
export async function mergePdfs(files, rotations = [], options = {}, onProgress = null) {
  // Support legacy 2-arg signature: mergePdfs(files, onProgress)
  let actualRotations = rotations;
  let actualOptions = options;
  let actualOnProgress = onProgress;

  if (typeof rotations === 'function') {
    actualOnProgress = rotations;
    actualRotations = [];
    actualOptions = {};
  } else if (typeof options === 'function') {
    actualOnProgress = options;
    actualOptions = {};
  }

  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    // Map files to ArrayBuffer promises
    const promises = files.map((file) => file.arrayBuffer());

    Promise.all(promises).then((pdfBuffers) => {
      worker.postMessage({
        type: 'mergePdfs',
        payload: {
          pdfBuffers,
          rotations: actualRotations,
          options: actualOptions
        }
      }, pdfBuffers);
    }).catch(reject);

    worker.onmessage = (e) => {
      const { type, progress, result, error } = e.data;
      if (type === 'progress') {
        if (onProgress) onProgress(progress);
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
