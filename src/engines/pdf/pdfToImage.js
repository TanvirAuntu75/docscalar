/* PDF to Image conversion engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Convert a PDF file to images (PNG or JPG) using a background Web Worker.
 * @param {File} file - The PDF file
 * @param {object} options - { format: 'png'|'jpeg', quality: 0-1, scale: 1-4 }
 * @param {function} onProgress - Callback (percent: number)
 * @returns {Promise<{blobs: Blob[], names: string[]}>}
 */
export async function pdfToImages(file, options = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();
    
    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage({
        type: 'pdfToImages',
        payload: { arrayBuffer, options }
      }, [arrayBuffer]);
    }).catch(reject);

    worker.onmessage = (e) => {
      const { type, progress, result, error } = e.data;
      if (type === 'progress') {
        if (onProgress) onProgress(progress);
      } else if (type === 'success') {
        // Reconstitute Blobs from arrayBuffers
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
