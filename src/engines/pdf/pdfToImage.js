/* PDF to Image conversion engine with background worker & universal input support */

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for image conversion.');
}

/**
 * Convert a PDF file to images (PNG or JPG) using a background Web Worker.
 * Collects ALL pages in memory before resolving — use only for small PDFs (≤100 pages).
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file
 * @param {object} options - { format: 'png'|'jpeg', quality: 0-1, scale: 1-4 }
 * @param {function} onProgress - Callback (percent: number)
 * @returns {Promise<{blobs: Blob[], names: string[]}>}
 */
export async function pdfToImages(file, options = {}, onProgress) {
  const actualOptions = { ...options };
  if (actualOptions.autoEnhance === undefined && typeof localStorage !== 'undefined') {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  const arrayBuffer = await extractBytes(file);

  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

        worker.postMessage({
          type: 'pdfToImages',
          payload: { arrayBuffer, options: actualOptions }
        }, [arrayBuffer]);

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
      } catch (err) {
        reject(err);
      }
    });
  }

  throw new Error('Web Workers are required for PDF to Image conversion.');
}

/**
 * Stream-convert a PDF file to images one page at a time.
 * Memory-safe for any PDF size — each page is immediately handed off to `onPage`
 * and released from memory before the next page begins.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file
 * @param {object} options - { format: 'png'|'jpeg', quality: 0-1, scale: 1-4 }
 * @param {function} onPage  - Called for each page: ({ name, blob, pageIndex, totalPages, progress })
 * @param {function} onProgress - Called with (percent: number) for each page
 * @returns {Promise<{ totalPages: number }>} - Resolves when all pages are streamed
 */
export async function pdfToImagesStream(file, options = {}, onPage, onProgress) {
  const actualOptions = { ...options };
  if (actualOptions.autoEnhance === undefined && typeof localStorage !== 'undefined') {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  const arrayBuffer = await extractBytes(file);

  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

        worker.postMessage(
          { type: 'pdfToImagesStream', payload: { arrayBuffer, options: actualOptions } },
          [arrayBuffer]
        );

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
      } catch (err) {
        reject(err);
      }
    });
  }

  throw new Error('Web Workers are required for PDF to Image streaming conversion.');
}

