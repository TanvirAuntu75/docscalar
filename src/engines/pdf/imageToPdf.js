/* Images to PDF engine with Worker & Direct Fallback */
import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Extract array buffer from any file/blob/buffer input
 */
async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported image file input format.');
}

/**
 * Direct in-thread Image to PDF compilation fallback.
 */
export async function directImagesToPdf(files, rotations = [], options = {}, onProgress = () => {}) {
  const pdfDoc = await PDFDocument.create();
  const { pageSize = 'a4', orientation = 'portrait', margin = 0 } = options;

  const SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 }
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await extractBytes(file);
    const uint8 = new Uint8Array(arrayBuffer);
    const rot = (rotations[i] || 0) % 360;

    let embeddedImg;
    const isPng = (uint8[0] === 0x89 && uint8[1] === 0x50) || file?.type === 'image/png' || (file?.name && file.name.endsWith('.png'));
    if (isPng) {
      embeddedImg = await pdfDoc.embedPng(uint8);
    } else {
      embeddedImg = await pdfDoc.embedJpg(uint8);
    }

    const { width: imgW, height: imgH } = embeddedImg;
    const isSideways = rot === 90 || rot === 270;
    const effectiveImgW = isSideways ? imgH : imgW;
    const effectiveImgH = isSideways ? imgW : imgH;

    let targetPageW;
    let targetPageH;

    if (pageSize === 'fit') {
      targetPageW = effectiveImgW + margin * 2;
      targetPageH = effectiveImgH + margin * 2;
    } else {
      const baseSize = SIZES[pageSize] || SIZES.a4;
      if (orientation === 'landscape') {
        targetPageW = Math.max(baseSize.width, baseSize.height);
        targetPageH = Math.min(baseSize.width, baseSize.height);
      } else {
        targetPageW = Math.min(baseSize.width, baseSize.height);
        targetPageH = Math.max(baseSize.width, baseSize.height);
      }
    }

    const page = pdfDoc.addPage([targetPageW, targetPageH]);

    const printableW = targetPageW - margin * 2;
    const printableH = targetPageH - margin * 2;

    const scale = Math.min(printableW / effectiveImgW, printableH / effectiveImgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const finalDrawEffectiveW = effectiveImgW * scale;
    const finalDrawEffectiveH = effectiveImgH * scale;

    const posX = margin + (printableW - finalDrawEffectiveW) / 2;
    const posY = margin + (printableH - finalDrawEffectiveH) / 2;

    if (rot === 90) {
      page.drawImage(embeddedImg, {
        x: posX + finalDrawEffectiveW,
        y: posY,
        width: drawW,
        height: drawH,
        rotate: degrees(90)
      });
    } else if (rot === 180) {
      page.drawImage(embeddedImg, {
        x: posX + finalDrawEffectiveW,
        y: posY + finalDrawEffectiveH,
        width: drawW,
        height: drawH,
        rotate: degrees(180)
      });
    } else if (rot === 270) {
      page.drawImage(embeddedImg, {
        x: posX,
        y: posY + finalDrawEffectiveH,
        width: drawW,
        height: drawH,
        rotate: degrees(270)
      });
    } else {
      page.drawImage(embeddedImg, {
        x: posX,
        y: posY,
        width: drawW,
        height: drawH
      });
    }

    onProgress(Math.round(((i + 1) / files.length) * 100));
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Combine multiple image files into a single PDF using a background Web Worker.
 * @param {File[]|Blob[]} files - Array of image files
 * @param {number[]} rotations - Array of rotation angles per file index
 * @param {object} options - Page size, margins, and orientation settings
 * @param {function} onProgress - Callback (percent: number)
 * @returns {Promise<Blob>} - The PDF blob
 */
export async function imagesToPdf(files, rotations = [], options = {}, onProgress = () => {}) {
  let actualProgressCallback = onProgress;
  let actualOptions = { ...options };
  let actualRotations = rotations;

  if (typeof rotations === 'function') {
    actualProgressCallback = rotations;
    actualRotations = [];
  } else if (typeof options === 'function') {
    actualProgressCallback = options;
  }

  if (actualOptions.autoEnhance === undefined && typeof localStorage !== 'undefined') {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') === 'true';
  }

  if (typeof Worker === 'undefined') {
    return await directImagesToPdf(files, actualRotations, actualOptions, actualProgressCallback);
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

      // Map files to ArrayBuffer promises
      const promises = files.map(async (file, idx) => {
        const buffer = await extractBytes(file);
        return {
          arrayBuffer: buffer,
          name: file.name || ('image_' + (idx + 1) + '.jpg'),
          type: file.type || 'image/jpeg',
          rotation: actualRotations[idx] || 0
        };
      });

      Promise.all(promises).then((imageFiles) => {
        const transferables = imageFiles.map(f => f.arrayBuffer);
        worker.postMessage({
          type: 'imageToPdf',
          payload: { imageFiles, options: actualOptions }
        }, transferables);
      }).catch(reject);

      worker.onmessage = (e) => {
        const { type, progress, result, error } = e.data;
        if (type === 'progress') {
          if (actualProgressCallback) actualProgressCallback(progress);
        } else if (type === 'success') {
          const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' });
          resolve(blob);
          worker.terminate();
        } else if (type === 'error') {
          directImagesToPdf(files, actualRotations, actualOptions, actualProgressCallback)
            .then(resolve)
            .catch(() => reject(new Error(error)));
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        directImagesToPdf(files, actualRotations, actualOptions, actualProgressCallback)
          .then(resolve)
          .catch(reject);
        worker.terminate();
      };
    } catch (e) {
      directImagesToPdf(files, actualRotations, actualOptions, actualProgressCallback)
        .then(resolve)
        .catch(reject);
    }
  });
}
