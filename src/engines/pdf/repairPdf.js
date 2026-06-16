import { PDFDocument } from 'pdf-lib';

/**
 * Re-indexes a corrupted PDF document's cross-reference table (XREF).
 * Re-serializes object streams client-side to output a clean compliant file.
 * @param {File} file - The corrupted PDF file.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<Blob>} The repaired PDF.
 */
export async function repairPdf(file, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(45);

  // PDFDocument.load automatically attempts recovery on broken XREF/offsets indexes
  const pdfDoc = await PDFDocument.load(pdfBytes, { 
    ignoreEncryption: true,
    throwOnInvalidObject: false 
  });
  if (onProgress) onProgress(75);

  const savedBytes = await pdfDoc.save({
    useObjectStreams: false // Write standard objects for maximum backward compatibility
  });
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
