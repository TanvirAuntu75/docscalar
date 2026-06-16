import { PDFDocument } from 'pdf-lib';

/**
 * Remove specified pages from a PDF.
 * @param {File} file - The uploaded PDF file.
 * @param {number[]} indicesToRemove - 0-indexed page numbers to remove.
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function removePages(file, indicesToRemove, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(60);

  // Sort indices in descending order to prevent shifts from corrupting deletions
  const sorted = [...indicesToRemove].sort((a, b) => b - a);
  
  const totalPages = pdfDoc.getPageCount();
  sorted.forEach(idx => {
    if (idx >= 0 && idx < totalPages) {
      pdfDoc.removePage(idx);
    }
  });

  if (onProgress) onProgress(85);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
