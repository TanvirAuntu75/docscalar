/* HTML to PDF engine using jsPDF + html2canvas */
import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';

/**
 * Convert an HTML file to PDF.
 * @param {File} file - The .html file
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function htmlToPdf(file, onProgress) {
  if (onProgress) onProgress(10);

  const text = await file.text();
  if (onProgress) onProgress(35);

  // Create an offscreen wrapper in the DOM to render HTML.
  const container = document.createElement('div');
  container.className = 'html-preview-container-temp';
  container.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 800px; /* Simulates A4 width */
    z-index: -9999;
    opacity: 0;
    pointer-events: none;
    background: white;
    padding: 40px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
  `;
  container.innerHTML = text;
  document.body.appendChild(container);

  try {
    if (onProgress) onProgress(60);

    // Render DOM elements to canvas
    const canvas = await domToCanvas(container, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const canvasAspect = canvas.width / canvas.height;
    const pageHeight = pdfWidth / canvasAspect;

    // If content is taller than A4 height, page-split it sequentially
    if (pageHeight > pdfHeight) {
      const totalPages = Math.ceil(pageHeight / pdfHeight);
      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -(p * pdfHeight), pdfWidth, pageHeight);
      }
    } else {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pageHeight);
    }

    if (onProgress) onProgress(100);
    return pdf.output('blob');
  } finally {
    // Clean up temporary DOM assets
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
