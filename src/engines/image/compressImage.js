/* Image compression engine using Canvas API */

/**
 * Compress an image by reducing quality.
 * @param {File} file
 * @param {number} quality - 0.1 to 1.0
 * @returns {Promise<{blob: Blob, name: string, originalSize: number, newSize: number}>}
 */
export async function compressImage(file, quality = 0.7) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${baseName}-compressed.jpg`,
    originalSize: file.size,
    newSize: blob.size,
  };
}
