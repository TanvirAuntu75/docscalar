/* DOCX to PDF Engine: Client-Side Vector/Canvas Rendering & In-Thread Fallback */
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
  throw new Error('Unsupported DOCX file input format.');
}

/**
 * Direct in-thread fallback DOCX to PDF compiler.
 * Parses document.xml from the DOCX zip package and lays out text/headings into a PDF with pdf-lib.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directDocxToPdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Invalid DOCX package: word/document.xml not found.');
  }

  const xmlContent = await docXmlFile.async('string');
  onProgress(30);

  // Extract paragraphs by splitting <w:p> tags
  const pMatches = xmlContent.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const paragraphs = [];

  for (const pXml of pMatches) {
    const textPieces = [];
    const tMatches = pXml.match(/<w:t[ >][\s\S]*?<\/w:t>/g) || [];
    for (const tXml of tMatches) {
      const clean = tXml.replace(/<[^>]+>/g, '');
      if (clean) textPieces.push(clean);
    }
    const fullText = textPieces.join('').trim();
    if (fullText) {
      const isHeading = pXml.includes('w:val="Heading') || (fullText.length < 60 && fullText === fullText.toUpperCase() && fullText.length > 3);
      paragraphs.push({ text: fullText, isHeading });
    }
  }

  onProgress(50);

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { pageSize = 'a4', orientation = 'portrait' } = options;
  const pageWidth = (pageSize === 'letter') ? (orientation === 'landscape' ? 792 : 612) : (orientation === 'landscape' ? 841.89 : 595.28);
  const pageHeight = (pageSize === 'letter') ? (orientation === 'landscape' ? 612 : 792) : (orientation === 'landscape' ? 595.28 : 841.89);

  const margin = 50;
  const printableWidth = pageWidth - margin * 2;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const { text, isHeading } = paragraphs[i];
    const fontSize = isHeading ? 14 : 10;
    const lineHeight = isHeading ? 20 : 14;
    const font = isHeading ? fontBold : fontRegular;
    const textColor = isHeading ? rgb(0.1, 0.15, 0.25) : rgb(0.15, 0.15, 0.15);

    // Simple word wrapping
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > printableWidth && currentLine) {
        if (currentY - lineHeight < margin) addNewPage();
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: textColor
        });
        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) addNewPage();
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: textColor
      });
      currentY -= lineHeight + (isHeading ? 6 : 4);
    }

    onProgress(50 + Math.round(((i + 1) / Math.max(1, paragraphs.length)) * 40));
  }

  // Ensure at least 1 page if document is blank
  if (pdfDoc.getPageCount() === 0) {
    pdfDoc.addPage([pageWidth, pageHeight]);
  }

  onProgress(95);
  const pdfBytes = await pdfDoc.save();
  onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert a DOCX file to PDF using browser layout renderer or direct fallback.
 * @param {File|Blob|ArrayBuffer} file - The .docx file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function docxToPdf(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  // Check if browser DOM with docx-preview is available
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return await directDocxToPdf(file, options, actualProgress);
  }

  try {
    actualProgress(5);
    const arrayBuffer = await extractBytes(file);
    actualProgress(15);

    const { renderAsync } = await import('docx-preview');
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const container = document.createElement('div');
    container.className = 'docx-preview-container-temp';
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 850px;
      z-index: -9999;
      opacity: 0;
      pointer-events: none;
      background: white;
    `;
    document.body.appendChild(container);

    try {
      await renderAsync(arrayBuffer, container, null, {
        breakPages: true,
        inWrapper: true
      });

      actualProgress(40);

      let pageElements = Array.from(container.querySelectorAll('section.docx'));
      if (pageElements.length === 0) {
        pageElements = Array.from(container.querySelectorAll('.docx-page, article.docx, section'));
      }
      if (pageElements.length === 0) {
        pageElements = [container];
      }

      actualProgress(50);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        const pct = Math.round(50 + ((i + 1) / pageElements.length) * 50);
        actualProgress(pct);
      }

      return pdf.output('blob');
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  } catch (err) {
    console.warn('DOM docx-preview failed, falling back to directDocxToPdf:', err);
    return await directDocxToPdf(file, options, actualProgress);
  }
}
