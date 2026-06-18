/* PDF to Image conversion engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Convert a PDF file to images (PNG or JPG) using a background Web Worker.
 * Collects ALL pages in memory before resolving — use only for small PDFs (≤100 pages).
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

/**
 * Stream-convert a PDF file to images one page at a time.
 * Memory-safe for any PDF size — each page is immediately handed off to `onPage`
 * and released from memory before the next page begins.
 *
 * @param {File} file - The PDF file
 * @param {object} options - { format: 'png'|'jpeg', quality: 0-1, scale: 1-4 }
 * @param {function} onPage  - Called for each page: ({ name, blob, pageIndex, totalPages, progress })
 * @param {function} onProgress - Called with (percent: number) for each page
 * @returns {Promise<{ totalPages: number }>} - Resolves when all pages are streamed
 */
export async function pdfToImagesStream(file, options = {}, onPage, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();

    file.arrayBuffer().then((arrayBuffer) => {
      worker.postMessage(
        { type: 'pdfToImagesStream', payload: { arrayBuffer, options } },
        [arrayBuffer]
      );
    }).catch(reject);

    let totalPagesCount = 0;

    worker.onmessage = async (e) => {
      const { type, error } = e.data;

      if (type === 'pageCount') {
        totalPagesCount = e.data.totalPages;

      } else if (type === 'page') {
        const { pageIndex, totalPages, name, mimeType, buffer, progress } = e.data;
        // Reconstitute a Blob from the transferable buffer (now on main thread)
        const blob = new Blob([buffer], { type: mimeType });
        if (onPage) await onPage({ name, blob, pageIndex, totalPages, progress });
        if (onProgress) onProgress(progress);

      } else if (type === 'success') {
        resolve({ totalPages: totalPagesCount });
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
