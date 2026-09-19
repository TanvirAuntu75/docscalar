/* Image Format Conversion Engine: Multi-Format Raster, Vector PDF, True BMP & ICO Binary Encoders */
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export const SUPPORTED_IMAGE_FORMATS = [
  { id: 'png', label: 'PNG', name: 'PNG (Lossless)', mime: 'image/png', ext: 'png', alpha: true, desc: 'Lossless web graphics & icons with alpha transparency' },
  { id: 'jpeg', label: 'JPG', name: 'JPEG (Photo)', mime: 'image/jpeg', ext: 'jpg', alpha: false, desc: 'High-efficiency photography compression' },
  { id: 'webp', label: 'WEBP', name: 'WebP (Next-Gen)', mime: 'image/webp', ext: 'webp', alpha: true, desc: 'Next-generation web format with superior compression' },
  { id: 'bmp', label: 'BMP', name: 'BMP (Bitmap)', mime: 'image/bmp', ext: 'bmp', alpha: false, desc: 'Uncompressed Windows Bitmap graphic' },
  { id: 'ico', label: 'ICO', name: 'ICO (Favicon)', mime: 'image/x-icon', ext: 'ico', alpha: true, desc: 'Windows icon & website favicon multi-resolution bundle' },
  { id: 'pdf', label: 'PDF', name: 'PDF (Document)', mime: 'application/pdf', ext: 'pdf', alpha: false, desc: 'Universal print-ready vector document' }
];

export const COLOR_MODES = [
  { id: 'original', label: 'Full Color', desc: 'Preserves original sRGB color gamut' },
  { id: 'grayscale', label: 'Grayscale', desc: 'Converts to high-precision luminance (0.299R + 0.587G + 0.114B)' },
  { id: 'invert', label: 'Invert Colors', desc: 'Negative film inverted color values' }
];

/**
 * Extract an ArrayBuffer safely from File, Blob, Buffer, or ArrayBuffer
 */
export async function extractBytes(file) {
  if (!file) throw new Error('No image file provided.');
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof ArrayBuffer) return file;
  if (typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported image input data type.');
}

/**
 * Calculate optimal dimensions given bounds and constraints
 */
export function calculateOptimalDimensions(origWidth, origHeight, options = {}) {
  const {
    scale = 1.0,
    maxWidth,
    maxHeight,
    maintainAspectRatio = true
  } = options;

  let targetW = Math.max(1, Math.round(origWidth * (scale || 1.0)));
  let targetH = Math.max(1, Math.round(origHeight * (scale || 1.0)));

  if (maxWidth && targetW > maxWidth) {
    const ratio = maxWidth / targetW;
    targetW = maxWidth;
    if (maintainAspectRatio) {
      targetH = Math.max(1, Math.round(targetH * ratio));
    }
  }

  if (maxHeight && targetH > maxHeight) {
    const ratio = maxHeight / targetH;
    targetH = maxHeight;
    if (maintainAspectRatio) {
      targetW = Math.max(1, Math.round(targetW * ratio));
    }
  }

  return { width: targetW, height: targetH };
}

/**
 * Pure JavaScript 24-bit True Windows BMP Encoder
 * Generates valid Windows Bitmap headers (14-byte File Header + 40-byte BITMAPINFOHEADER)
 * with padded bottom-up BGR scanlines.
 */
export function encodeBmp(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Each scanline is padded to a multiple of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize; // 14 file header + 40 DIB header + pixel data

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // --- 1. BITMAPFILEHEADER (14 bytes) ---
  // Signature 'BM'
  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4D);
  // File size
  view.setUint32(2, fileSize, true);
  // Reserved (4 bytes)
  view.setUint32(6, 0, true);
  // Pixel data offset (54 bytes)
  view.setUint32(10, 54, true);

  // --- 2. BITMAPINFOHEADER (40 bytes) ---
  // Header size
  view.setUint32(14, 40, true);
  // Width
  view.setInt32(18, width, true);
  // Height (positive = bottom-up scanlines)
  view.setInt32(22, height, true);
  // Color planes (must be 1)
  view.setUint16(26, 1, true);
  // Bits per pixel (24-bit RGB)
  view.setUint16(28, 24, true);
  // Compression (0 = BI_RGB, uncompressed)
  view.setUint32(30, 0, true);
  // Image size (can be 0 for BI_RGB, but standard is pixelArraySize)
  view.setUint32(34, pixelArraySize, true);
  // Horizontal resolution (~72 DPI = 2835 ppm)
  view.setInt32(38, 2835, true);
  // Vertical resolution (~72 DPI = 2835 ppm)
  view.setInt32(42, 2835, true);
  // Colors in palette
  view.setUint32(46, 0, true);
  // Important colors
  view.setUint32(50, 0, true);

  // --- 3. Pixel Data (Bottom-Up BGR) ---
  let writeOffset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = writeOffset;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const a = data[srcIdx + 3] / 255;

      // Composite over white background if alpha channel exists
      const finalB = Math.round(b * a + 255 * (1 - a));
      const finalG = Math.round(g * a + 255 * (1 - a));
      const finalR = Math.round(r * a + 255 * (1 - a));

      // BMP stores color order as Blue, Green, Red
      bytes[writeOffset++] = finalB;
      bytes[writeOffset++] = finalG;
      bytes[writeOffset++] = finalR;
    }

    // Pad row to 4-byte boundary
    const padding = rowSize - (width * 3);
    for (let p = 0; p < padding; p++) {
      bytes[writeOffset++] = 0;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Pure JavaScript Multi-Resolution Windows ICO Favicon Encoder
 * Packages PNG icon buffers into an authentic Windows Icon File (.ico).
 * @param {Array<{ width: number, height: number, buffer: Uint8Array|ArrayBuffer }>} iconEntries
 */
export function encodeIco(iconEntries) {
  if (!iconEntries || !iconEntries.length) {
    throw new Error('At least one icon entry is required to generate an ICO file.');
  }

  const count = iconEntries.length;
  // 6-byte ICO header + 16 bytes per directory entry
  const headerSize = 6 + count * 16;
  let totalSize = headerSize;

  for (const entry of iconEntries) {
    const byteLength = entry.buffer.byteLength || entry.buffer.length;
    totalSize += byteLength;
  }

  const outBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(outBuffer);
  const outBytes = new Uint8Array(outBuffer);

  // --- 1. ICONDIR Header (6 bytes) ---
  view.setUint16(0, 0, true); // Reserved, must be 0
  view.setUint16(2, 1, true); // Type: 1 for ICO (2 for CUR)
  view.setUint16(4, count, true); // Number of images

  // --- 2. ICONDIRENTRY & Image Data ---
  let currentDirOffset = 6;
  let currentDataOffset = headerSize;

  for (let i = 0; i < count; i++) {
    const entry = iconEntries[i];
    const dataBytes = new Uint8Array(entry.buffer);
    const dataLen = dataBytes.length;

    // Width & Height (0 represents 256px in ICO spec)
    const w = entry.width >= 256 ? 0 : entry.width;
    const h = entry.height >= 256 ? 0 : entry.height;

    view.setUint8(currentDirOffset, w);
    view.setUint8(currentDirOffset + 1, h);
    view.setUint8(currentDirOffset + 2, 0); // Palette colors (0 = no palette)
    view.setUint8(currentDirOffset + 3, 0); // Reserved
    view.setUint16(currentDirOffset + 4, 1, true); // Color planes
    view.setUint16(currentDirOffset + 6, 32, true); // Bits per pixel
    view.setUint32(currentDirOffset + 8, dataLen, true); // Image data size
    view.setUint32(currentDirOffset + 12, currentDataOffset, true); // Offset of image data

    // Copy PNG image data into output buffer
    outBytes.set(dataBytes, currentDataOffset);

    currentDirOffset += 16;
    currentDataOffset += dataLen;
  }

  return new Blob([outBuffer], { type: 'image/x-icon' });
}

/**
 * Apply color transformation filters (Grayscale, Invert) directly onto ImageData pixels
 */
export function applyColorTransform(imageData, colorMode = 'original') {
  if (!colorMode || colorMode === 'original') return imageData;

  const data = imageData.data;
  const len = data.length;

  if (colorMode === 'grayscale') {
    // Standard ITU-R BT.601 luminance coefficients
    for (let i = 0; i < len; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  } else if (colorMode === 'invert') {
    for (let i = 0; i < len; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  return imageData;
}

/**
 * Universal Image Format Converter
 * Converts images across PNG, JPG, WEBP, BMP, ICO, and PDF with high-fidelity algorithms.
 *
 * @param {File|Blob|ArrayBuffer} file - Source image
 * @param {string} targetFormat - Target format ID ('png', 'jpeg'/'jpg', 'webp', 'bmp', 'ico', 'pdf')
 * @param {number} quality - Compression quality (0.1 to 1.0)
 * @param {string} backgroundMatte - Background color ('transparent', '#FFFFFF', '#000000', etc.)
 * @param {Object} options - Advanced options (colorMode, scale, maxWidth, maxHeight, rotation, flipH, flipV, watermarkText, proPrintDpi)
 */
export async function convertImageFormat(
  file,
  targetFormat = 'png',
  quality = 0.92,
  backgroundMatte = 'transparent',
  options = {}
) {
  const normFormat = (targetFormat === 'jpg' ? 'jpeg' : targetFormat || 'png').toLowerCase();
  const formatObj = SUPPORTED_IMAGE_FORMATS.find((f) => f.id === normFormat) || SUPPORTED_IMAGE_FORMATS[0];
  const originalName = file?.name || 'image.png';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const finalName = `${baseName}.${formatObj.ext}`;

  const {
    colorMode = 'original',
    scale = 1.0,
    maxWidth,
    maxHeight,
    rotation = 0, // 0, 90, 180, 270
    flipH = false,
    flipV = false,
    watermarkText = '',
    watermarkOpacity = 0.4,
    proPrintDpi = false // 300 DPI print resampling mode
  } = options;

  // =========================================================================
  // 1. Universal PDF Document Target (Handles PNG, JPG, WEBP, BMP, SVG, GIF)
  // =========================================================================
  if (normFormat === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    let embeddedImage = null;

    // Check if browser canvas is available to rasterize non-standard formats
    if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
      let bitmap = null;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Draw image with matte if needed
        if (backgroundMatte && backgroundMatte !== 'transparent') {
          ctx.fillStyle = backgroundMatte;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(bitmap, 0, 0);

        // Apply color transform if requested
        if (colorMode !== 'original') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          applyColorTransform(imgData, colorMode);
          ctx.putImageData(imgData, 0, 0);
        }

        // Apply watermark if requested
        if (watermarkText) {
          applyWatermark(ctx, canvas.width, canvas.height, watermarkText, watermarkOpacity);
        }

        const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const pngBytes = await pngBlob.arrayBuffer();
        embeddedImage = await pdfDoc.embedPng(pngBytes);
      } catch (err) {
        // Fallback to direct byte embedding
        const arrayBuffer = await extractBytes(file);
        try {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } catch {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        }
      } finally {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      }
    } else {
      // Headless / Node fallback
      const arrayBuffer = await extractBytes(file);
      try {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      } catch {
        embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
      }
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
      height,
      format: 'pdf'
    };
  }

  // =========================================================================
  // 2. Browser Canvas Rendering Pipeline (High-DPI & Multi-Format)
  // =========================================================================
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const origW = bitmap.width;
      const origH = bitmap.height;

      // Compute constrained target dimensions
      const dpiScale = proPrintDpi ? (300 / 72) : 1.0;
      const { width: targetW, height: targetH } = calculateOptimalDimensions(origW, origH, {
        scale: scale * dpiScale,
        maxWidth: maxWidth ? maxWidth * dpiScale : undefined,
        maxHeight: maxHeight ? maxHeight * dpiScale : undefined
      });

      // Create high-precision offscreen canvas
      const canvas = document.createElement('canvas');
      const isRotated90or270 = rotation === 90 || rotation === 270;
      canvas.width = isRotated90or270 ? targetH : targetW;
      canvas.height = isRotated90or270 ? targetW : targetH;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Failed to acquire 2D canvas rendering context.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Matte / Background filling logic:
      // If format lacks alpha (JPG, BMP) and matte is transparent, default to clean #FFFFFF
      // If format supports alpha (PNG, WEBP, ICO), only fill if matte is explicitly a solid color
      const needsOpaqueFill = (!formatObj.alpha && (backgroundMatte === 'transparent' || !backgroundMatte)) ||
                              (backgroundMatte && backgroundMatte !== 'transparent');

      if (needsOpaqueFill) {
        ctx.fillStyle = (backgroundMatte && backgroundMatte !== 'transparent') ? backgroundMatte : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Handle transformation matrix (rotation & flips)
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);

      if (rotation) {
        ctx.rotate((rotation * Math.PI) / 180);
      }
      if (flipH || flipV) {
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      }

      ctx.drawImage(
        bitmap,
        -targetW / 2,
        -targetH / 2,
        targetW,
        targetH
      );
      ctx.restore();

      // Apply Color Filter (Grayscale / Invert)
      if (colorMode && colorMode !== 'original') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyColorTransform(imgData, colorMode);
        ctx.putImageData(imgData, 0, 0);
      }

      // Apply Watermark overlay if present
      if (watermarkText) {
        applyWatermark(ctx, canvas.width, canvas.height, watermarkText, watermarkOpacity);
      }

      // --- FORMAT SPECIFIC ENCODING ---

      // A. BMP Output (Pure-JS Authentic Windows BMP)
      if (normFormat === 'bmp') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bmpBlob = encodeBmp(imgData);
        return {
          blob: bmpBlob,
          name: finalName,
          size: bmpBlob.size,
          width: canvas.width,
          height: canvas.height,
          format: 'bmp'
        };
      }

      // B. ICO Output (Multi-Resolution Favicon Bundle: 16, 32, 48)
      if (normFormat === 'ico') {
        const iconSizes = [16, 32, 48];
        const iconEntries = [];

        for (const size of iconSizes) {
          const icoCanvas = document.createElement('canvas');
          icoCanvas.width = size;
          icoCanvas.height = size;
          const icoCtx = icoCanvas.getContext('2d');
          icoCtx.imageSmoothingEnabled = true;
          icoCtx.imageSmoothingQuality = 'high';
          icoCtx.drawImage(canvas, 0, 0, size, size);

          const pngBlob = await new Promise((res) => icoCanvas.toBlob(res, 'image/png'));
          const buffer = await pngBlob.arrayBuffer();
          iconEntries.push({ width: size, height: size, buffer });
        }

        const icoBlob = encodeIco(iconEntries);
        return {
          blob: icoBlob,
          name: finalName,
          size: icoBlob.size,
          width: canvas.width,
          height: canvas.height,
          format: 'ico'
        };
      }

      // C. Standard Browser Export (PNG, JPEG, WEBP)
      const outQuality = Math.min(1.0, Math.max(0.05, quality));
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), formatObj.mime, outQuality);
      });

      if (!blob) {
        throw new Error(`Browser failed to encode image into ${formatObj.label} format.`);
      }

      return {
        blob,
        name: finalName,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        format: normFormat
      };
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
    }
  }

  // =========================================================================
  // 3. Headless / Node Fallback (Testing / CI environment)
  // =========================================================================
  const arrayBuffer = await extractBytes(file);
  const fallbackBlob = new Blob([arrayBuffer], { type: formatObj.mime });
  return {
    blob: fallbackBlob,
    name: finalName,
    size: fallbackBlob.size,
    width: 800,
    height: 600,
    format: normFormat
  };
}

/**
 * Apply customizable text watermark onto canvas context
 */
function applyWatermark(ctx, width, height, text, opacity = 0.4) {
  ctx.save();
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.04));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.7})`;
  ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.08));

  // Position at bottom-right corner with 24px padding
  const padding = Math.round(fontSize * 1.2);
  const metrics = ctx.measureText(text);
  const x = width - metrics.width - padding;
  const y = height - padding;

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Batch Convert multiple image files with options and live progress reporting.
 * If Pro multi-format mode is active, exports PNG + WEBP + JPG bundle.
 */
export async function batchConvertImages(files, options = {}, onProgress = () => {}) {
  const {
    targetFormat = 'png',
    quality = 0.92,
    backgroundMatte = 'transparent',
    proMultiFormat = false,
    ...extraOptions
  } = options;

  const results = [];
  const total = files.length;
  if (!total) return results;

  // Pro Multi-Format Mode: Convert every file to PNG, JPG, and WEBP simultaneously
  const formatsToGenerate = proMultiFormat
    ? ['png', 'jpeg', 'webp']
    : [targetFormat];

  const totalOps = total * formatsToGenerate.length;
  let opIndex = 0;

  for (let i = 0; i < total; i++) {
    const file = files[i];

    for (const fmt of formatsToGenerate) {
      const res = await convertImageFormat(
        file,
        fmt,
        quality,
        backgroundMatte,
        extraOptions
      );
      results.push(res);
      opIndex++;
      onProgress(Math.round((opIndex / totalOps) * 100));
    }
  }

  return results;
}

