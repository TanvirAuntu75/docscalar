import { PDFDocument } from 'pdf-lib';

/**
 * Crop PDF pages visually.
 * @param {File} file - The PDF file.
 * @param {object} bounds - Relative percentages: { xPercent, yPercent, widthPercent, heightPercent }.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<Blob>} The cropped PDF.
 */
export async function cropPdf(file, bounds, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(55);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const { xPercent, yPercent, widthPercent, heightPercent } = bounds;

  pages.forEach((page, idx) => {
    // Get current dimensions
    const { width, height } = page.getSize();

    // Map screen percentages (top-left origin) to PDF coordinates (bottom-left origin)
    const cropLeft = width * xPercent;
    const cropWidth = width * widthPercent;
    const cropHeight = height * heightPercent;
    const cropTopOffset = height * yPercent;
    const cropBottom = height - cropTopOffset - cropHeight;

    // Clamp coordinates to stay within page bounds
    const clampLeft = Math.max(0, Math.min(cropLeft, width));
    const clampWidth = Math.max(10, Math.min(cropWidth, width - clampLeft));
    const clampBottom = Math.max(0, Math.min(cropBottom, height));
    const clampHeight = Math.max(10, Math.min(cropHeight, height - clampBottom));

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
