import { PDFDocument } from 'pdf-lib';

/**
 * Extract specified pages into a new PDF.
 * @param {File} file - The uploaded PDF file.
 * @param {number[]} indicesToKeep - 0-indexed page numbers to keep.
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function extractPages(file, indicesToKeep, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(50);
  
  const newPdfDoc = await PDFDocument.create();
  
  // Enforce boundary safety
  const totalPages = pdfDoc.getPageCount();
  const validIndices = indicesToKeep.filter(idx => idx >= 0 && idx < totalPages);
  
  if (validIndices.length === 0) {
    throw new Error("No valid pages selected for extraction.");
  }

  const copiedPages = await newPdfDoc.copyPages(pdfDoc, validIndices);
  copiedPages.forEach(page => newPdfDoc.addPage(page));

  if (onProgress) onProgress(85);
  const savedBytes = await newPdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
