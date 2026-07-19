/* Un-OCR PDF engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Flatten a PDF to strip its text layer using a background Web Worker.
 * @param {File} file - The PDF file
 * @param {object} options - { scale: 1.0-4.0 }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function unOcrPdf(file, options = {}, onProgress) {
  const actualOptions = { ...options };
  if (actualOptions.autoEnhance === undefined) {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'unOcrPdf',
        payload: { arrayBuffer, options: actualOptions }
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
