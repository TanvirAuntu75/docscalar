/* Compress PDF engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Compress a PDF by re-rendering pages as lower-quality JPEG images in a background Web Worker.
 * @param {File} file
 * @param {object} options - { quality: 0.1-1.0, scale: 0.5-2 }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function compressPdf(file, options = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'compressPdf',
        payload: { arrayBuffer, options }
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
