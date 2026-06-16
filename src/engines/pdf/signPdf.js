import { PDFDocument } from 'pdf-lib';

/**
 * Overlay a signature image onto a PDF page at precise coordinates.
 * @param {File} file - The PDF file.
 * @param {object} options - Signature settings (png blob, coordinates, sizing).
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The signed PDF file.
 */
export async function signPdf(file, options, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(55);

  const pages = pdfDoc.getPages();
  const pageIndex = options.pageIndex ?? 0;
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error("Target signature page index out of document bounds.");
  }

  const page = pages[pageIndex];
  const { width, height } = page.getSize();

  // Load and embed signature PNG
  const sigBytes = await options.signaturePngBlob.arrayBuffer();
  const sigImage = await pdfDoc.embedPng(sigBytes);

  // Compute signature drawing bounds
  const sigWidth = width * (options.widthPercent || 0.25);
  const sigHeight = (sigImage.height / sigImage.width) * sigWidth;

  // Convert relative coordinates (top-left screen origin) to PDF points (bottom-left origin)
  const drawX = width * options.xPercent - sigWidth / 2;
  const drawY = height * (1 - options.yPercent) - sigHeight / 2;

  // Ensure drawing box fits within page boundaries
  const clampX = Math.max(0, Math.min(drawX, width - sigWidth));
  const clampY = Math.max(0, Math.min(drawY, height - sigHeight));

  page.drawImage(sigImage, {
    x: clampX,
    y: clampY,
    width: sigWidth,
    height: sigHeight,
  });

  if (onProgress) onProgress(85);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
