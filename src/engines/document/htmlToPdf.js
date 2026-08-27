/* HTML to PDF Engine: Sandboxed DOM Rasterization & In-Thread Vector Fallback */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Extract raw HTML text from string, File, Blob, or Buffer
 */
async function extractHtmlText(input) {
  if (typeof input === 'string') return input;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return input.toString('utf8');
  }
  if (input instanceof Uint8Array) {
    return new TextDecoder().decode(input);
  }
  if (input instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(input));
  }
  if (input && typeof input.text === 'function') {
    return await input.text();
  }
  if (input && typeof input.arrayBuffer === 'function') {
    const ab = await input.arrayBuffer();
    return new TextDecoder().decode(new Uint8Array(ab));
  }
  throw new Error('Unsupported HTML input format.');
}

/**
 * Direct in-thread fallback HTML to PDF compiler using pdf-lib.
 * Parses HTML tags (headings, paragraphs, lists) and typesets vector PDF.
 * @param {string|File|Blob|ArrayBuffer} htmlOrFile 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directHtmlToPdf(htmlOrFile, options = {}, onProgress = () => {}) {
  onProgress(10);
  const html = await extractHtmlText(htmlOrFile);
  onProgress(30);

  const {
    pageSize = 'a4',
    orientation = 'portrait',
    margin = 40
  } = options;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const baseWidth = pageSize === 'letter' ? 612 : 595.28;
  const baseHeight = pageSize === 'letter' ? 792 : 841.89;

  const pageWidth = orientation === 'landscape' ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight);
  const pageHeight = orientation === 'landscape' ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight);

  const printableWidth = pageWidth - margin * 2;

  // Extract structural HTML blocks using regex
  // Match <h1> - <h6>, <p>, <li>, <div>, or plain text lines
  const tagPattern = /<(h[1-6]|p|li|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks = [];
  let match;

  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const rawContent = match[2].replace(/<[^>]+>/g, '').trim();
    if (rawContent) {
      blocks.push({ tag, text: rawContent });
    }
  }

  // Fallback: if no standard tags matched, strip all tags and split by lines
  if (blocks.length === 0) {
    const cleanText = html.replace(/<style[\s\S]*?<\/style>/gi, '')
                          .replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<[^>]+>/g, ' ');
    const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      blocks.push({ tag: 'p', text: line });
    }
  }

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
  };

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const isHeading = block.tag.startsWith('h');
    const isH1 = block.tag === 'h1';
    const isH2 = block.tag === 'h2';
    const isListItem = block.tag === 'li';

    const fontSize = isH1 ? 18 : (isH2 ? 15 : (isHeading ? 13 : 10.5));
    const font = isHeading ? fontBold : fontRegular;
    const lineHeight = fontSize * 1.45;
    const blockMarginBottom = isHeading ? 12 : 8;

    const fontColor = isH1 ? rgb(0.1, 0.2, 0.5) : (isHeading ? rgb(0.15, 0.15, 0.2) : rgb(0.2, 0.2, 0.2));

    // Word wrap block text
    const words = block.text.split(' ');
    let currentLine = isListItem ? '•  ' : '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth <= printableWidth) {
        currentLine = testLine;
      } else {
        if (currentY - lineHeight < margin) {
          addNewPage();
        }
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: fontColor
        });
        currentY -= lineHeight;
        currentLine = isListItem ? '   ' + word : word;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) {
        addNewPage();
      }
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: fontColor
      });
      currentY -= lineHeight + blockMarginBottom;
    }

    onProgress(30 + Math.round(((bIdx + 1) / Math.max(1, blocks.length)) * 65));
  }

  if (pdfDoc.getPageCount() === 0) {
    pdfDoc.addPage([pageWidth, pageHeight]);
  }

  onProgress(98);
  const pdfBytes = await pdfDoc.save();
  onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert HTML string or uploaded file to PDF.
 * @param {string|File|Blob} htmlOrFile - HTML content or File
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function htmlToPdf(htmlOrFile, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return await directHtmlToPdf(htmlOrFile, options, actualProgress);
  }

  try {
    actualProgress(10);
    const htmlText = await extractHtmlText(htmlOrFile);
    actualProgress(35);

    const { jsPDF } = await import('jspdf');
    const { domToCanvas } = await import('modern-screenshot');

    const container = document.createElement('div');
    container.className = 'html-preview-container-temp';
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 800px;
      z-index: -9999;
      opacity: 0;
      pointer-events: none;
      background: white;
      padding: 40px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    `;
    container.innerHTML = htmlText;
    document.body.appendChild(container);

    try {
      actualProgress(60);
      const canvas = await domToCanvas(container, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF(options.orientation === 'landscape' ? 'l' : 'p', 'mm', options.pageSize === 'letter' ? 'letter' : 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasAspect = canvas.width / canvas.height;
      const pageContentHeight = pdfWidth / canvasAspect;

      if (pageContentHeight > pdfHeight) {
        const totalPages = Math.ceil(pageContentHeight / pdfHeight);
        for (let p = 0; p < totalPages; p++) {
          if (p > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -(p * pdfHeight), pdfWidth, pageContentHeight);
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pageContentHeight);
      }

      actualProgress(100);
      return pdf.output('blob');
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  } catch (err) {
    console.warn('DOM html-to-canvas failed, falling back to directHtmlToPdf:', err);
    return await directHtmlToPdf(htmlOrFile, options, actualProgress);
  }
}
