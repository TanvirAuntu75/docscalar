/* Compress PDF engine with dual Worker / Direct Fallback */
import { PDFDocument } from 'pdf-lib';

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for compression.');
}

/**
 * Compress a PDF by re-rendering pages as lower-quality JPEG images or optimizing structural object streams.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file
 * @param {object} options - { quality: 0.1-1.0, scale: 0.5-2, mode: 'lossless'|'lossy', autoEnhance: boolean, stripMetadata: boolean }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function compressPdf(file, options = {}, onProgress) {
  const actualOptions = { ...options };
  if (actualOptions.autoEnhance === undefined && typeof localStorage !== 'undefined') {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  const arrayBuffer = await extractBytes(file);

  // If worker constructor exists in browser environment
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

      return await new Promise((resolve, reject) => {
        worker.postMessage({
          type: 'compressPdf',
          payload: { arrayBuffer, options: actualOptions }
        }, [arrayBuffer]);

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
    } catch (workerErr) {
      console.warn('Worker compression failed, falling back to direct stream compression:', workerErr);
    }
  }

  // Direct structural stream & object optimization fallback
  if (onProgress) onProgress(30);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (actualOptions.stripMetadata !== false) {
    try {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('DocForge');
      pdfDoc.setCreator('DocForge Compression Engine');
    } catch (metaErr) {}
  }

  if (onProgress) onProgress(70);
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50
  });

  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

