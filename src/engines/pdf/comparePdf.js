/* Document Comparison & Forensic Difference Engine */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { extractPdfText, computeWordDiff } from '../../utils/diffEngine.js';

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for comparison.');
}

/**
 * Generate a formal PDF Comparison & Forensic Audit Report.
 * @param {object} params - { fileAName, fileBName, similarityPercent, addedCount, deletedCount, unchangedCount, diffs, totalPages }
 * @returns {Promise<Blob>}
 */
export async function generateDiffAuditReportPdf(params = {}) {
  const {
    fileAName = 'Document A (Original)',
    fileBName = 'Document B (Revision)',
    similarityPercent = 100,
    addedCount = 0,
    deletedCount = 0,
    unchangedCount = 0,
    diffs = [],
    totalPages = 1
  } = params;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();
  const margin = 40;

  // Header Banner
  page.drawRectangle({
    x: margin,
    y: height - 100,
    width: width - margin * 2,
    height: 60,
    color: rgb(0.06, 0.09, 0.16)
  });

  page.drawText('DOCSCALAR FORENSIC COMPARISON REPORT', {
    x: margin + 16,
    y: height - 65,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText('Automated Document Difference & Integrity Audit', {
    x: margin + 16,
    y: height - 85,
    size: 10,
    font: fontRegular,
    color: rgb(0.58, 0.64, 0.72)
  });

  // Metadata Section
  let y = height - 130;
  const drawRow = (label, val, isBold = false) => {
    page.drawText(label, { x: margin, y, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.45) });
    page.drawText(String(val), { x: margin + 140, y, size: 9, font: isBold ? fontBold : fontRegular, color: rgb(0.1, 0.15, 0.2) });
    y -= 18;
  };

  drawRow('Original Document (A):', fileAName);
  drawRow('Revised Document (B):', fileBName);
  drawRow('Analyzed Pages:', `${totalPages} Page(s)`);
  drawRow('Generated At:', new Date().toUTCString());
  drawRow('Report ID:', `DF-DIFF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

  // Summary Metrics Box
  y -= 10;
  page.drawRectangle({
    x: margin,
    y: y - 50,
    width: width - margin * 2,
    height: 50,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.8, 0.86, 0.94),
    borderWidth: 1
  });

  page.drawText(`Similarity Score: ${similarityPercent}%`, {
    x: margin + 16,
    y: y - 25,
    size: 12,
    font: fontBold,
    color: similarityPercent >= 90 ? rgb(0.05, 0.6, 0.35) : rgb(0.85, 0.4, 0.1)
  });

  page.drawText(`+${addedCount} Additions  |  -${deletedCount} Deletions  |  ${unchangedCount} Unchanged Words`, {
    x: margin + 16,
    y: y - 42,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45)
  });

  // Excerpt Preview
  y -= 80;
  page.drawText('SEMANTIC DIFFERENCE EXCERPT (FIRST 20 TOKENS)', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45)
  });

  y -= 15;
  const sampleDiffs = diffs.slice(0, 20);
  let textSample = sampleDiffs.map(d => {
    if (d.type === 'added') return `[+${d.value}]`;
    if (d.type === 'deleted') return `[-${d.value}]`;
    return d.value;
  }).join(' ');

  if (textSample.length > 300) textSample = textSample.slice(0, 297) + '...';
  if (!textSample) textSample = 'No textual differences detected.';

  page.drawRectangle({
    x: margin,
    y: y - 60,
    width: width - margin * 2,
    height: 60,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.88, 0.9, 0.94),
    borderWidth: 1
  });

  page.drawText(textSample, {
    x: margin + 10,
    y: y - 20,
    size: 8,
    font: fontMono,
    color: rgb(0.2, 0.25, 0.3),
    maxWidth: width - margin * 2 - 20,
    lineHeight: 12
  });

  // Footer
  page.drawText('Verified by DocScalar Forensic Diff Engine. Confidential.', {
    x: margin,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export { extractBytes, extractPdfText, computeWordDiff };
