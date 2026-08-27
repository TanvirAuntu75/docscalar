import { PDFDocument } from 'pdf-lib';

/**
 * Crop PDF pages visually with target page scope support.
 * @param {File} file - The PDF file.
 * @param {object} bounds - Relative percentages: { xPercent, yPercent, widthPercent, heightPercent }.
 * @param {function} [onProgress] - Progress callback.
 * @param {object} [options] - Additional options: { targetPages: number[], perPageBounds: Record<number, object> }.
 * @returns {Promise<Blob>} The cropped PDF.
 */
export async function cropPdf(file, bounds, onProgress, options = {}) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(55);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const targetPages = Array.isArray(options.targetPages) && options.targetPages.length > 0
    ? options.targetPages
    : Array.from({ length: totalPages }, (_, i) => i);

  pages.forEach((page, idx) => {
    if (!targetPages.includes(idx)) return;

    // Use per-page bounds if provided, otherwise default bounds
    const pageBounds = (options.perPageBounds && options.perPageBounds[idx]) || bounds;
    const { xPercent, yPercent, widthPercent, heightPercent } = pageBounds;

    // Get current dimensions and origin offsets (handling non-zero MediaBox origins)
    const { width, height } = page.getSize();
    let originX = 0;
    let originY = 0;
    try {
      const mediaBox = page.getMediaBox();
      if (mediaBox && typeof mediaBox.x === 'number') {
        originX = mediaBox.x;
        originY = mediaBox.y;
      }
    } catch (e) {}

    // Map screen percentages (top-left origin) to PDF coordinates (bottom-left origin)
    const cropLeft = originX + width * xPercent;
    const cropWidth = width * widthPercent;
    const cropHeight = height * heightPercent;
    const cropTopOffset = height * yPercent;
    const cropBottom = originY + (height - cropTopOffset - cropHeight);

    // Clamp coordinates to stay within page bounds
    const clampLeft = Math.max(originX, Math.min(cropLeft, originX + width - 10));
    const clampWidth = Math.max(10, Math.min(cropWidth, originX + width - clampLeft));
    const clampBottom = Math.max(originY, Math.min(cropBottom, originY + height - 10));
    const clampHeight = Math.max(10, Math.min(cropHeight, originY + height - clampBottom));

    // Set the crop box boundary on the page
    page.setCropBox(clampLeft, clampBottom, clampWidth, clampHeight);
    
    // Also adjust media box to match crop box (ensures strict compliance across all readers)
    page.setMediaBox(clampLeft, clampBottom, clampWidth, clampHeight);

    if (onProgress) {
      onProgress(Math.round(55 + ((idx + 1) / totalPages) * 35));
    }
  });

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}

