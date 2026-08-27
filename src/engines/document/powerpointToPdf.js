/* PowerPoint to PDF Engine: Client Slide Rendering & In-Thread Fallback */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

/**
 * Extract array buffer from any file/blob/buffer input
 */
async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported PowerPoint file input format.');
}

/**
 * Direct in-thread fallback PowerPoint to PDF compiler using JSZip and pdf-lib.
 * Extracts text boxes and titles from ppt/slides/slide*.xml and renders 16:9 slides in PDF.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directPptxToPdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  const zip = await JSZip.loadAsync(arrayBuffer);
  onProgress(30);

  // Find all slide XML files
  const slideFileNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Standard 16:9 slide dimensions in points: 720x405
  const slideWidth = 720;
  const slideHeight = 405;

  if (slideFileNames.length === 0) {
    // If no slide files found, create at least 1 fallback slide
    const blankPage = pdfDoc.addPage([slideWidth, slideHeight]);
    blankPage.drawText('Presentation Document', { x: 50, y: slideHeight - 80, size: 24, font: fontBold });
  } else {
    for (let i = 0; i < slideFileNames.length; i++) {
      const slideFileName = slideFileNames[i];
      const slideXml = await zip.file(slideFileName).async('string');

      // Extract all text elements (<a:t>)
      const textMatches = slideXml.match(/<a:t[ >][\s\S]*?<\/a:t>/g) || [];
      const textPieces = [];
      for (const tXml of textMatches) {
        const clean = tXml.replace(/<[^>]+>/g, '').trim();
        if (clean) textPieces.push(clean);
      }

      const page = pdfDoc.addPage([slideWidth, slideHeight]);

      // Draw subtle slide background and border
      page.drawRectangle({
        x: 0,
        y: 0,
        width: slideWidth,
        height: slideHeight,
        color: rgb(0.98, 0.98, 0.99)
      });

      // Draw top accent bar
      page.drawRectangle({
        x: 0,
        y: slideHeight - 6,
        width: slideWidth,
        height: 6,
        color: rgb(0.93, 0.35, 0.18) // PowerPoint Orange
      });

      // Draw slide number pill
      page.drawText('Slide ' + (i + 1), {
        x: slideWidth - 70,
        y: 20,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });

      let currentY = slideHeight - 50;

      if (textPieces.length > 0) {
        // First piece as Title
        const titleText = textPieces[0];
        page.drawText(titleText.length > 50 ? titleText.slice(0, 48) + '...' : titleText, {
          x: 40,
          y: currentY,
          size: 18,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.25)
        });
        currentY -= 35;

        // Remaining pieces as bullet/body text
        for (let j = 1; j < Math.min(textPieces.length, 10); j++) {
          const piece = textPieces[j];
          if (!piece) continue;

          page.drawText('•  ' + (piece.length > 80 ? piece.slice(0, 78) + '...' : piece), {
            x: 50,
            y: currentY,
            size: 11,
            font: fontRegular,
            color: rgb(0.2, 0.2, 0.2)
          });
          currentY -= 22;
          if (currentY < 40) break;
        }
      } else {
        page.drawText('Slide ' + (i + 1), {
          x: 40,
          y: currentY,
          size: 20,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2)
        });
      }

      onProgress(30 + Math.round(((i + 1) / slideFileNames.length) * 65));
    }
  }

  onProgress(98);
  const pdfBytes = await pdfDoc.save();
  onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert a PowerPoint (.pptx) file to PDF.
 * @param {File|Blob|ArrayBuffer} file - The .pptx file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function powerpointToPdf(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  // Check if browser DOM is available
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return await directPptxToPdf(file, options, actualProgress);
  }

  try {
    actualProgress(5);
    const arrayBuffer = await extractBytes(file);
    actualProgress(15);

    const { pptxToHtml } = await import('@jvmr/pptx-to-html');
    const { jsPDF } = await import('jspdf');
    const { domToCanvas } = await import('modern-screenshot');

    const slidesHtml = await pptxToHtml(arrayBuffer, {
      width: 960,
      height: 540,
      scaleToFit: true,
      letterbox: true
    });

    actualProgress(40);

    if (!slidesHtml || slidesHtml.length === 0) {
      return await directPptxToPdf(file, options, actualProgress);
    }

    const container = document.createElement('div');
    container.className = 'pptx-preview-container-temp';
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 960px;
      height: 540px;
      z-index: -9999;
      opacity: 0;
      pointer-events: none;
      background: white;
    `;
    document.body.appendChild(container);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slidesHtml.length; i++) {
        container.innerHTML = slidesHtml[i];
        await new Promise((r) => setTimeout(r, 20));

        const canvas = await domToCanvas(container, {
          scale: 2,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        const pct = Math.round(40 + ((i + 1) / slidesHtml.length) * 60);
        actualProgress(pct);
      }

      return pdf.output('blob');
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  } catch (err) {
    console.warn('DOM pptx-to-html failed, falling back to directPptxToPdf:', err);
    return await directPptxToPdf(file, options, actualProgress);
  }
}
