/* PowerPoint to PDF engine using @jvmr/pptx-to-html + jsPDF + html2canvas */
import { pptxToHtml } from '@jvmr/pptx-to-html';
import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';

/**
 * Convert a PowerPoint (.pptx) file to PDF.
 * @param {File} file - The .pptx file
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function powerpointToPdf(file, onProgress) {
  if (onProgress) onProgress(5);

  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(15);

  // Convert PPTX slides to HTML slides in memory
  // width: 960 and height: 540 aligns with standard 16:9 ratio
  const slidesHtml = await pptxToHtml(arrayBuffer, {
    width: 960,
    height: 540,
    scaleToFit: true,
    letterbox: true
  });

  if (onProgress) onProgress(40);

  if (!slidesHtml || slidesHtml.length === 0) {
    throw new Error("No presentation slides found in this PowerPoint file.");
  }

  // Create an offscreen wrapper in the DOM to render slides sequentially.
  // We use opacity 0 and position fixed to keep it invisible to the user.
  const container = document.createElement('div');
  container.className = 'pptx-preview-container-temp';
  container.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 960px; /* Aligns with standard slide layout dimensions */
    height: 540px;
    z-index: -9999;
    opacity: 0;
    pointer-events: none;
    background: white;
  `;
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF('l', 'mm', 'a4'); // Slides are landscape by default
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < slidesHtml.length; i++) {
      const slideMarkup = slidesHtml[i];

      // Inject the current slide's HTML
      container.innerHTML = slideMarkup;

      // Yield to layout engine to resolve styling / layout definitions
      await new Promise(r => setTimeout(r, 20));

      // Render slide content to canvas (2x scale for sharp text rendering)
      const canvas = await domToCanvas(container, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage();
      }

      // Draw the slide covering full landscape A4 dimensions
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      if (onProgress) {
        const pct = Math.round(40 + ((i + 1) / slidesHtml.length) * 60);
        onProgress(pct);
      }
    }

    return pdf.output('blob');
  } finally {
    // Clean up temporary DOM assets
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
