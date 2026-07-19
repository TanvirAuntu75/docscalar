/* DOCX to PDF engine using docx-preview + jsPDF + html2canvas */
import { renderAsync } from 'docx-preview';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Convert a DOCX file to PDF.
 * @param {File} file - The .docx file
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function docxToPdf(file, onProgress) {
  if (onProgress) onProgress(5);

  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(15);

  // Create an offscreen wrapper in the DOM to render the docx structure.
  // We use opacity 0 and position fixed to ensure it is in the layout tree (so html2canvas can read dimensions)
  // but remains completely invisible to the user.
  const container = document.createElement('div');
  container.className = 'docx-preview-container-temp';
  container.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 850px; /* Simulates A4 width at 96 DPI */
    z-index: -9999;
    opacity: 0;
    pointer-events: none;
    background: white;
  `;
  document.body.appendChild(container);

  try {
    // Render document asynchronously into our container
    await renderAsync(arrayBuffer, container, null, {
      breakPages: true,
      inWrapper: true
    });

    if (onProgress) onProgress(40);

    // docx-preview breaks pages into separate section.docx elements.
    // We query with fallback selectors to ensure robust layout extraction.
    let pageElements = Array.from(container.querySelectorAll('section.docx'));
    if (pageElements.length === 0) {
      pageElements = Array.from(container.querySelectorAll('.docx-page, article.docx'));
    }
    if (pageElements.length === 0) {
      pageElements = Array.from(container.querySelectorAll('section'));
    }
    if (pageElements.length === 0) {
      pageElements = [container];
    }

    if (onProgress) onProgress(50);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];

      // Render page element to canvas (2x scale for sharp text rendering)
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage();
      }

      // Place image directly onto A4 page boundaries
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      if (onProgress) {
        const pct = Math.round(50 + ((i + 1) / pageElements.length) * 50);
        onProgress(pct);
      }
    }

    return pdf.output('blob');
  } finally {
    // Clean up DOM elements to prevent memory leaks and visual remnants
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
