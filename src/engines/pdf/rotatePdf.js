/* Rotate PDF engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Rotate all pages or specific pages in a PDF using a background Web Worker.
 * @param {File} file
 * @param {number|number[]} rotations - 90, 180, or 270, or an array of angles for each page
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function rotatePdf(file, rotations = 90, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'rotatePdf',
        payload: { arrayBuffer, rotations }
      }, [arrayBuffer]);
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
