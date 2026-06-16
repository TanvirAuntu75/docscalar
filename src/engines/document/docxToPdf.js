/* DOCX to PDF engine using mammoth.js + jsPDF + html2canvas */
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Convert a DOCX file to PDF.
 * @param {File} file - The .docx file
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function docxToPdf(file, onProgress) {
  if (onProgress) onProgress(10);

  // Step 1: Convert DOCX to HTML using mammoth
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  if (onProgress) onProgress(40);

  // Step 2: Render HTML in an off-screen container to capture as image
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 794px;
    padding: 40px 50px;
    background: white;
    color: black;
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    word-wrap: break-word;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  if (onProgress) onProgress(60);

  // Step 3: Capture as canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(container);

  if (onProgress) onProgress(80);

  // Step 4: Build PDF from canvas
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const canvasAspect = canvas.width / canvas.height;
  const pageAspect = pdfWidth / pdfHeight;

  let imgWidth = pdfWidth;
  let imgHeight = pdfWidth / canvasAspect;

  // If content is taller than one page, split across pages
  if (imgHeight > pdfHeight) {
    const totalPages = Math.ceil(imgHeight / pdfHeight);
    for (let p = 0; p < totalPages; p++) {
      if (p > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -(p * pdfHeight), imgWidth, imgHeight);
    }
  } else {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  }

  if (onProgress) onProgress(100);

  return pdf.output('blob');
}
