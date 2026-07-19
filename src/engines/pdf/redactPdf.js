/* Redact PDF engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Redact a PDF using a background Web Worker.
 * @param {File} file - The PDF file to redact
 * @param {object} params - Redaction parameters: { boxes: [], textPatterns: [] }
 * @param {function} onProgress - Progress callback function (percent: number)
 * @returns {Promise<Blob>}
 */
export async function redactPdf(file, params = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'redactPdf',
        payload: { arrayBuffer, params }
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
