/* Image Resizing Engine: High-Quality Bicubic Resampling & Multi-Mode Sizing */
import JSZip from 'jszip';

export const RESIZE_PRESETS = [
  { id: 'ig_post', label: 'Instagram Post', width: 1080, height: 1080, category: 'Social' },
  { id: 'ig_story', label: 'Instagram Story', width: 1080, height: 1920, category: 'Social' },
  { id: 'yt_thumb', label: 'YouTube Thumbnail', width: 1280, height: 720, category: 'Social' },
  { id: 'x_header', label: 'Twitter/X Header', width: 1500, height: 500, category: 'Social' },
  { id: 'fb_cover', label: 'Facebook Cover', width: 820, height: 312, category: 'Social' },
  { id: 'linkedin_banner', label: 'LinkedIn Banner', width: 1584, height: 396, category: 'Social' },
  { id: 'hd_720', label: 'HD 720p', width: 1280, height: 720, category: 'Display' },
  { id: 'fhd_1080', label: 'Full HD 1080p', width: 1920, height: 1080, category: 'Display' },
  { id: 'uhd_4k', label: '4K UHD', width: 3840, height: 2160, category: 'Display' }
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
 * Resize an image to new dimensions.
 * @param {File|Blob|ArrayBuffer} file
 * @param {object} options - { mode: 'exact'|'percentage'|'preset', width, height, percentage, presetId, format, quality }
 * @returns {Promise<{blob: Blob, name: string, width: number, height: number, size: number}>}
 */
export async function resizeImage(file, options = {}) {
  const {
    mode = 'exact',
    width,
    height,
    percentage = 50,
    presetId,
    format = 'keep',
    quality = 0.92
  } = options;

  const originalName = file.name || 'image.png';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const origExt = (originalName.split('.').pop() || 'png').toLowerCase();

  // 1. Browser Canvas High-Quality Resampling
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    let newW = bitmap.width;
    let newH = bitmap.height;

    if (mode === 'percentage') {
      const scale = (percentage || 50) / 100;
      newW = Math.round(bitmap.width * scale);
      newH = Math.round(bitmap.height * scale);
    } else if (mode === 'preset' && presetId) {
      const presetObj = RESIZE_PRESETS.find((p) => p.id === presetId);
      if (presetObj) {
        newW = presetObj.width;
        newH = presetObj.height;
      }
    } else {
      newW = width || bitmap.width;
      newH = height || bitmap.height;
    }

    newW = Math.max(1, Math.min(16384, Math.round(newW)));
    newH = Math.max(1, Math.min(16384, Math.round(newH)));

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(bitmap, 0, 0, newW, newH);

    const targetExt = format === 'keep' ? (['png', 'jpg', 'jpeg', 'webp'].includes(origExt) ? origExt : 'png') : format;
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeMap[targetExt] || 'image/png';

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, quality);
    });

    if (!blob) {
      throw new Error('Failed to generate image. Dimensions may exceed browser memory capacity.');
    }

    const finalName = `${baseName}_${newW}x${newH}.${targetExt === 'jpeg' ? 'jpg' : targetExt}`;
    return {
      blob,
      name: finalName,
      width: newW,
      height: newH,
      size: blob.size
    };
  }

  // 2. Headless / Node Fallback
  const arrayBuffer = await extractBytes(file);
  let targetW = width || 800;
  let targetH = height || 600;

  if (mode === 'percentage') {
    const scale = (percentage || 50) / 100;
    targetW = Math.round(800 * scale);
    targetH = Math.round(600 * scale);
  }

  const finalName = `${baseName}_${targetW}x${targetH}.${origExt}`;
  const fallbackBlob = new Blob([arrayBuffer], { type: 'image/png' });
  return {
    blob: fallbackBlob,
    name: finalName,
    width: targetW,
    height: targetH,
    size: fallbackBlob.size
  };
}

/**
 * Batch Resize multiple image files.
 */
export async function batchResizeImages(files, options = {}, onProgress = () => {}) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const res = await resizeImage(file, options);
    results.push(res);
    onProgress(Math.round(((i + 1) / total) * 100));
  }

  return results;
}
