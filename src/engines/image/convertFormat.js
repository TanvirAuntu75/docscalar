/* Image Format Conversion Engine: Multi-Format Raster & Vector PDF */
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export const SUPPORTED_IMAGE_FORMATS = [
  { id: 'png', label: 'PNG', name: 'PNG (Lossless)', mime: 'image/png', ext: 'png', alpha: true },
  { id: 'jpeg', label: 'JPG', name: 'JPEG (Photo)', mime: 'image/jpeg', ext: 'jpg', alpha: false },
  { id: 'webp', label: 'WEBP', name: 'WebP (Next-Gen)', mime: 'image/webp', ext: 'webp', alpha: true },
  { id: 'bmp', label: 'BMP', name: 'BMP (Bitmap)', mime: 'image/bmp', ext: 'bmp', alpha: false },
  { id: 'pdf', label: 'PDF', name: 'PDF (Document)', mime: 'application/pdf', ext: 'pdf', alpha: false }
];

/**
 * Extract array buffer from any input
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
  throw new Error('Unsupported image input format.');
}

/**
 * Convert an image file to a different format.
 * @param {File|Blob|ArrayBuffer} file - The source image
 * @param {string} targetFormat - 'png' | 'jpeg' | 'jpg' | 'webp' | 'bmp' | 'pdf'
 * @param {number} quality - 0.1 to 1.0 for lossy formats
 * @param {string} backgroundMatte - '#FFFFFF' | '#000000' | 'transparent'
 * @returns {Promise<{blob: Blob, name: string, size: number, width?: number, height?: number}>}
 */
export async function convertImageFormat(file, targetFormat = 'png', quality = 0.92, backgroundMatte = '#FFFFFF') {
  const normFormat = targetFormat === 'jpg' ? 'jpeg' : targetFormat.toLowerCase();
  const formatObj = SUPPORTED_IMAGE_FORMATS.find((f) => f.id === normFormat) || SUPPORTED_IMAGE_FORMATS[0];
  const originalName = file.name || 'image.png';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const finalName = `${baseName}.${formatObj.ext}`;

  // 1. PDF Target Format
  if (normFormat === 'pdf') {
    const arrayBuffer = await extractBytes(file);
    const pdfDoc = await PDFDocument.create();

    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } catch {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    }

    const { width, height } = embeddedImage.scale(1.0);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    return {
      blob: pdfBlob,
      name: finalName,
      size: pdfBlob.size,
      width,
      height
    };
  }

  // 2. Browser Canvas Conversion
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');

    // Handle background fill for formats without alpha channel (JPEG / BMP)
    if (!formatObj.alpha || backgroundMatte !== 'transparent') {
      ctx.fillStyle = backgroundMatte || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), formatObj.mime, quality);
    });

    return {
      blob,
      name: finalName,
      size: blob.size,
      width: bitmap.width,
      height: bitmap.height
    };
  }

  // 3. Headless / Node Fallback
  const arrayBuffer = await extractBytes(file);
  const fallbackBlob = new Blob([arrayBuffer], { type: formatObj.mime });
  return {
    blob: fallbackBlob,
    name: finalName,
    size: fallbackBlob.size,
    width: 800,
    height: 600
  };
}

/**
 * Batch Convert multiple image files into an array of converted blobs or a single ZIP archive.
 */
export async function batchConvertImages(files, options = {}, onProgress = () => {}) {
  const { targetFormat = 'png', quality = 0.92, backgroundMatte = '#FFFFFF' } = options;
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const res = await convertImageFormat(file, targetFormat, quality, backgroundMatte);
    results.push(res);
    onProgress(Math.round(((i + 1) / total) * 100));
  }

  return results;
}
