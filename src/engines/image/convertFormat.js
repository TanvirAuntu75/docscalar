/* Image format conversion engine using Canvas API */

/**
 * Convert an image file to a different format.
 * @param {File} file - The source image
 * @param {string} targetFormat - 'png' | 'jpeg' | 'webp' | 'bmp'
 * @param {number} quality - 0-1 for lossy formats
 * @returns {Promise<{blob: Blob, name: string}>}
 */
export async function convertImageFormat(file, targetFormat = 'png', quality = 0.92) {
  const mimeMap = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };

  const mime = mimeMap[targetFormat] || 'image/png';
  const ext = targetFormat === 'jpg' ? 'jpg' : targetFormat;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');

  // For JPEG/BMP, fill white background (no alpha)
  if (targetFormat === 'jpeg' || targetFormat === 'jpg' || targetFormat === 'bmp') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  if (autoEnhance) {
    ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
  }

  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise((r) => canvas.toBlob(r, mime, quality));
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return { blob, name: `${baseName}.${ext}` };
}
