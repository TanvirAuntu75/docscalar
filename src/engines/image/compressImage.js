/* Image compression engine with transparency preservation and quantization */

/**
 * Compress an image by reducing quality.
 * @param {File} file
 * @param {number} quality - 0.1 to 1.0
 * @returns {Promise<{blob: Blob, name: string, originalSize: number, newSize: number}>}
 */
export async function compressImage(file, quality = 0.7) {
  const mime = file.type;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let outputMime = mime;
  let ext = file.name.split('.').pop().toLowerCase();

  const autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';

  if (mime === 'image/png') {
    // Quantize PNG colors to round color depth and shrink file size without losing transparency
    if (autoEnhance) {
      ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
    }
    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    if (quality < 0.9) {
      // Step value dynamically scaled from quality parameter (e.g. quality 0.7 -> step 16)
      const step = Math.max(1, Math.round(Math.pow(2, 8 - Math.round(quality * 8))));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;     // R
        data[i+1] = Math.round(data[i+1] / step) * step; // G
        data[i+2] = Math.round(data[i+2] / step) * step; // B
        // Preserve Alpha as is
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } else if (mime === 'image/webp') {
    if (autoEnhance) {
      ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
    }
    ctx.drawImage(bitmap, 0, 0);
  } else {
    // Default to JPEG (e.g. image/jpeg, image/jpg, bmp, gif) and fill transparency with white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (autoEnhance) {
      ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
    }
    ctx.drawImage(bitmap, 0, 0);
    outputMime = 'image/jpeg';
    ext = 'jpg';
  }

  const blob = await new Promise((r) => {
    canvas.toBlob(r, outputMime, outputMime === 'image/png' ? undefined : quality);
  });

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${baseName}-compressed.${ext}`,
    originalSize: file.size,
    newSize: blob.size,
  };
}
