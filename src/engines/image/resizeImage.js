/* Image resize engine using Canvas API */

/**
 * Resize an image to new dimensions.
 * @param {File} file
 * @param {object} options - { width, height, mode: 'exact'|'percentage', percentage }
 * @returns {Promise<{blob: Blob, name: string}>}
 */
export async function resizeImage(file, options = {}) {
  const { mode = 'exact', width, height, percentage = 50 } = options;

  const bitmap = await createImageBitmap(file);
  let newW, newH;

  if (mode === 'percentage') {
    const scale = percentage / 100;
    newW = Math.round(bitmap.width * scale);
    newH = Math.round(bitmap.height * scale);
  } else {
    newW = width || bitmap.width;
    newH = height || bitmap.height;
  }

  newW = Math.max(1, newW);
  newH = Math.max(1, newH);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  if (autoEnhance) {
    ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
  }

  ctx.drawImage(bitmap, 0, 0, newW, newH);

  // Preserve original format if possible
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  const mime = mimeMap[ext] || 'image/png';

  const blob = await new Promise((r) => canvas.toBlob(r, mime, 0.92));
  if (!blob) {
    throw new Error('Failed to generate image. The dimensions may exceed browser limits or memory capacity.');
  }
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return { blob, name: `${baseName}-${newW}x${newH}.${ext}` };
}
