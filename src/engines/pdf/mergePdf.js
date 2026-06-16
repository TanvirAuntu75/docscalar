/* Merge PDFs engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Merge multiple PDF files into one using a background Web Worker.
 * @param {File[]} files - Array of PDF files
 * @param {function} onProgress - Callback (percent: number)
 * @returns {Promise<Blob>} - The merged PDF blob
 */
export async function mergePdfs(files, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    // Map files to ArrayBuffer promises
    const promises = files.map((file) => file.arrayBuffer());

    Promise.all(promises).then((pdfBuffers) => {
      worker.postMessage({
        type: 'mergePdfs',
        payload: { pdfBuffers }
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
