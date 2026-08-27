/* Un-OCR / Flatten PDF Engine: Stream Stripping & Rasterization Support */
import { PDFDocument } from 'pdf-lib';

/**
 * Extract array buffer from any file/blob/buffer input
 */
async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for Un-OCR.');
}

/**
 * Direct in-thread PDF Text Stream Stripping fallback.
 */
export async function directUnOcrPdf(arrayBuffer) {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const context = pdfDoc.context;
  const objects = context.enumerateIndirectObjects();

  for (const ref of objects) {
    const obj = ref[1];
    if (obj && typeof obj.getContentsString === 'function') {
      try {
        if (obj.dict) {
          const subtype = obj.dict.get(PDFName.of('Subtype'));
          if (subtype && subtype.toString() !== '/Form') {
            continue;
          }
        }

        const allText = obj.getContentsString();
        if (allText.includes('BT') && allText.includes('ET')) {
          const strippedText = allText.replace(/BT[\s\S]*?ET/g, '');
          if (strippedText.length !== allText.length) {
            const newBytes = new Uint8Array(strippedText.length);
            for (let i = 0; i < strippedText.length; i++) {
              newBytes[i] = strippedText.charCodeAt(i) & 0xFF;
            }
            obj.contents = newBytes;
            if (obj.dict) {
              obj.dict.set(PDFName.of('Length'), context.obj(newBytes.length));
              obj.dict.delete(PDFName.of('Filter'));
              obj.dict.delete(PDFName.of('DecodeParms'));
            }
          }
        }
      } catch (e) {
        // Continue processing remaining objects
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Flatten a PDF to strip its text layer using a background Web Worker or direct fallback.
 * @param {File|Blob|Uint8Array|ArrayBuffer} file - The PDF file
 * @param {object} options - { scale: 1.0-4.0, mode: 'strip'|'rasterize' }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function unOcrPdf(file, options = {}, onProgress = () => {}) {
  const actualOptions = { ...options };
  const arrayBuffer = await extractBytes(file);

  if (typeof Worker === 'undefined') {
    onProgress(50);
    const resultBlob = await directUnOcrPdf(arrayBuffer);
    onProgress(100);
    return resultBlob;
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

      worker.postMessage({
        type: 'unOcrPdf',
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
          directUnOcrPdf(arrayBuffer).then(resolve).catch(() => reject(new Error(error)));
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        directUnOcrPdf(arrayBuffer).then(resolve).catch(reject);
        worker.terminate();
      };
    } catch (e) {
      directUnOcrPdf(arrayBuffer).then(resolve).catch(reject);
    }
  });
}
