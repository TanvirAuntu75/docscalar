/* Redact PDF engine with dual Worker / Direct Fallback */
import { PDFDocument, rgb } from 'pdf-lib';

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for redaction.');
}

/**
 * Redact a PDF by permanently overlaying opaque solid black boxes and scrubbing metadata.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file to redact
 * @param {object} params - Redaction parameters: { boxes: [], textPatterns: [], sanitizeMetadata: boolean }
 * @param {function} onProgress - Progress callback function (percent: number)
 * @returns {Promise<Blob>}
 */
export async function redactPdf(file, params = {}, onProgress) {
  const arrayBuffer = await extractBytes(file);

  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

      return await new Promise((resolve, reject) => {
        worker.postMessage({
          type: 'redactPdf',
          payload: { arrayBuffer, params }
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
      console.warn('Worker redaction failed, falling back to direct PDF-lib redaction:', workerErr);
    }
  }

  // Direct PDF-lib execution fallback
  if (onProgress) onProgress(20);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const boxes = params.boxes || [];

  for (let idx = 0; idx < boxes.length; idx++) {
    const box = boxes[idx];
    const page = pages[box.page];
    if (!page) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    let rx = box.x;
    let ry = box.y;
    let rw = box.width;
    let rh = box.height;

    if (box.isRatio || (box.x >= 0 && box.x <= 1 && box.y >= 0 && box.y <= 1 && box.width <= 1 && box.height <= 1)) {
      rx = box.x * pageWidth;
      ry = (1 - box.y - box.height) * pageHeight;
      rw = box.width * pageWidth;
      rh = box.height * pageHeight;
    }

    page.drawRectangle({
      x: rx - 2,
      y: ry - 2,
      width: rw + 4,
      height: rh + 4,
      color: rgb(0, 0, 0),
      opacity: 1.0
    });
  }

  if (params.sanitizeMetadata !== false) {
    try {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('DocForge Sanitizer');
      pdfDoc.setCreator('DocForge');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
    } catch (e) {}
  }

  if (onProgress) onProgress(90);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  if (onProgress) onProgress(100);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

