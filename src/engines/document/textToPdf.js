/* Text to PDF engine using jsPDF */
import { jsPDF } from 'jspdf';

/**
 * Convert plain text to a formatted PDF.
 * @param {string} text - The text content
 * @param {object} options - { fontSize, lineSpacing, title }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function textToPdf(text, options = {}, onProgress) {
  const { fontSize = 12, lineSpacing = 1.5, title = 'Document' } = options;

  if (onProgress) onProgress(10);

  // A4 format, points unit
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  doc.setProperties({
    title: title,
    creator: 'DocForge'
  });

  doc.setFont('helvetica');
  doc.setFontSize(fontSize);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  // Calculate line height based on font size and line spacing multiplier
  const lineHeight = fontSize * lineSpacing;

  if (onProgress) onProgress(30);

  // Split text to lines fitting the page width
  // jsPDF splitTextToSize preserves paragraphs and wraps lines
  const lines = doc.splitTextToSize(text, maxWidth);

  if (onProgress) onProgress(50);

  let yPos = margin + fontSize; // Start at top margin + font ascent

  for (let i = 0; i < lines.length; i++) {
    // If we exceed page bottom margin, add a new page
    if (yPos > pageHeight - margin) {
      doc.addPage();
      yPos = margin + fontSize;
    }

    doc.text(lines[i], margin, yPos);
    yPos += lineHeight;

    if (onProgress && i % 50 === 0) {
      onProgress(50 + Math.round((i / lines.length) * 45));
    }
  }

  if (onProgress) onProgress(95);

  const pdfBlob = doc.output('blob');

  if (onProgress) onProgress(100);

  return pdfBlob;
}
