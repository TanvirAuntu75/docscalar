/* DOCX to PDF Engine: Client-Side Vector/Canvas Rendering & In-Thread Fallback */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

/**
 * Extract array buffer from any file/blob/buffer input safely.
 */
export async function extractBytes(file) {
  if (!file) throw new Error('Input Word document is empty or undefined.');
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof ArrayBuffer) return file;
  if (typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported DOCX file input format.');
}

/**
 * Check if buffer has OLE2 binary header indicating legacy Word 97-2003 (.doc) format.
 * Header bytes: D0 CF 11 E0 A1 B1 1A E1
 */
export function isLegacyDocFormat(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 8) return false;
  const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
  return (
    bytes[0] === 0xD0 &&
    bytes[1] === 0xCF &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xE0 &&
    bytes[4] === 0xA1 &&
    bytes[5] === 0xB1 &&
    bytes[6] === 0x1A &&
    bytes[7] === 0xE1
  );
}

/**
 * Sanitize text to fit within StandardFonts.Helvetica (WinAnsiEncoding).
 * Replaces Unicode quotes, dashes, bullets, and unencodable glyphs with safe equivalents
 * to prevent unhandled "WinAnsi cannot encode" crashes.
 */
export function sanitizeWinAnsiText(str) {
  if (!str) return '';
  return String(str)
    // Common typography replacements
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25CB\u25AA\u25AB]/g, '-')
    .replace(/\u25BA/g, '>')
    .replace(/\u200B/g, '') // Zero-width space
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\t/g, '    ')
    // Remove control characters except newline and carriage return
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fallback for remaining characters outside Latin-1 / WinAnsi range (code > 255)
    // preserving newline (\x0A) and carriage return (\x0D)
    .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, (char) => {
      // Transliterate or provide safe placeholder
      const code = char.codePointAt(0);
      if (code === 0x2122) return '(TM)'; // Trademark
      if (code === 0x00A9) return '(C)';
      if (code === 0x00AE) return '(R)';
      if (code >= 0x0100 && code <= 0x017F) return '?'; // Extended Latin
      return '?';
    });
}

/**
 * Extract body elements (paragraphs, line breaks, tables) from Word document.xml.
 * @param {string} xmlContent 
 * @returns {Array<{text: string, isHeading: boolean, isTable: boolean, hasPageBreak?: boolean}>}
 */
export function extractDocxElements(xmlContent = '') {
  if (!xmlContent || typeof xmlContent !== 'string') return [];

  const bodyMatch = xmlContent.match(/<w:body[ >]([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xmlContent;

  const elementRegex = /<(w:p|w:tbl)[ >][\s\S]*?<\/\1>/g;
  const elements = bodyXml.match(elementRegex) || [];
  const items = [];

  for (const elXml of elements) {
    if (elXml.startsWith('<w:p')) {
      const textPieces = [];
      const tMatches = elXml.match(/<w:t[ >][\s\S]*?<\/w:t>/g) || [];
      for (const tXml of tMatches) {
        const clean = tXml.replace(/<[^>]+>/g, '');
        if (clean) textPieces.push(clean);
      }
      const rawText = textPieces.join('').trim();
      const sanitized = sanitizeWinAnsiText(rawText);
      if (sanitized) {
        const isHeading =
          elXml.includes('w:val="Heading') ||
          (sanitized.length < 60 && sanitized === sanitized.toUpperCase() && sanitized.length > 3);
        const hasPageBreak = elXml.includes('w:type="page"') || elXml.includes('<w:br/>');
        items.push({ text: sanitized, isHeading, isTable: false, hasPageBreak });
      }
    } else if (elXml.startsWith('<w:tbl')) {
      // Table handling: extract rows and columns
      const rowMatches = elXml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
      const tableRows = [];
      for (const rowXml of rowMatches) {
        const cellMatches = rowXml.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || [];
        const cellTexts = [];
        for (const cellXml of cellMatches) {
          const tMatches = cellXml.match(/<w:t[ >][\s\S]*?<\/w:t>/g) || [];
          const cellStr = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
          cellTexts.push(sanitizeWinAnsiText(cellStr));
        }
        if (cellTexts.length > 0) {
          tableRows.push(cellTexts);
        }
      }
      if (tableRows.length > 0) {
        const tableText = tableRows.map(r => r.filter(Boolean).join('  |  ')).filter(Boolean).join('\n');
        items.push({ text: tableText, isHeading: false, isTable: true, rows: tableRows });
      }
    }
  }

  return items;
}

/**
 * Direct in-thread fallback DOCX to PDF compiler.
 * Parses document.xml from the DOCX zip package and lays out text/headings into a PDF with pdf-lib.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options - { pageSize, orientation }
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directDocxToPdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);

  if (isLegacyDocFormat(arrayBuffer)) {
    throw new Error(
      'Legacy Word 97-2003 (.doc) format detected. Please select Desktop Engine for full conversion, or convert your file to modern .docx format.'
    );
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (zipErr) {
    throw new Error(
      'Invalid or corrupt Word document. Unable to extract document structure from file package.'
    );
  }
  
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Invalid DOCX package: word/document.xml not found.');
  }

  const xmlContent = await docXmlFile.async('string');
  onProgress(30);

  // Extract body elements in sequential order: paragraphs <w:p> and tables <w:tbl>
  const items = extractDocxElements(xmlContent);

  onProgress(50);

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { pageSize = 'a4', orientation = 'portrait' } = options;
  const isLandscape = orientation === 'landscape';
  const pageWidth = (pageSize === 'letter') ? (isLandscape ? 792 : 612) : (isLandscape ? 841.89 : 595.28);
  const pageHeight = (pageSize === 'letter') ? (isLandscape ? 612 : 792) : (isLandscape ? 595.28 : 841.89);

  const margin = 50;
  const printableWidth = pageWidth - margin * 2;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
  };

  for (let i = 0; i < items.length; i++) {
    const { text, isHeading, isTable, hasPageBreak } = items[i];

    if (hasPageBreak && i > 0) {
      addNewPage();
    }

    const fontSize = isHeading ? 14 : isTable ? 9.5 : 10;
    const lineHeight = isHeading ? 22 : isTable ? 16 : 14.5;
    const font = isHeading || isTable ? fontBold : fontRegular;
    const textColor = isHeading
      ? rgb(0.1, 0.15, 0.25)
      : isTable
      ? rgb(0.2, 0.25, 0.35)
      : rgb(0.15, 0.15, 0.15);

    // If structured table, render row by row
    if (isTable && items[i].rows && items[i].rows.length > 0) {
      for (const row of items[i].rows) {
        const rowLine = row.filter(Boolean).join('  |  ');
        if (!rowLine) continue;
        if (currentY - lineHeight < margin) addNewPage();
        try {
          currentPage.drawText(rowLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: textColor
          });
        } catch (e) {}
        currentY -= lineHeight;
      }
      currentY -= 4;
      onProgress(50 + Math.round(((i + 1) / Math.max(1, items.length)) * 40));
      continue;
    }

    // Word wrapping
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let testWidth = 0;
      try {
        testWidth = font.widthOfTextAtSize(testLine, fontSize);
      } catch (err) {
        testWidth = testLine.length * (fontSize * 0.55);
      }

      if (testWidth > printableWidth && currentLine) {
        if (currentY - lineHeight < margin) addNewPage();
        try {
          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: textColor
          });
        } catch (e) {}
        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY - lineHeight < margin) addNewPage();
      try {
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: textColor
        });
      } catch (e) {}
      currentY -= lineHeight + (isHeading ? 6 : isTable ? 2 : 4);
    }

    onProgress(50 + Math.round(((i + 1) / Math.max(1, items.length)) * 40));
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

  // Check if running in headless/node or non-browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return await directDocxToPdf(file, options, actualProgress);
  }

  try {
    actualProgress(5);
    const arrayBuffer = await extractBytes(file);
    actualProgress(15);

    if (isLegacyDocFormat(arrayBuffer)) {
      throw new Error(
        'Legacy Word 97-2003 (.doc) format detected. Please select Desktop Engine for full conversion, or convert your file to modern .docx format.'
      );
    }

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

      const { pageSize = 'a4', orientation = 'portrait' } = options;
      const isLandscape = orientation === 'landscape';
      const format = pageSize === 'letter' ? 'letter' : 'a4';

      const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', format);
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
        if (i > 0) pdf.addPage(format, isLandscape ? 'l' : 'p');
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        const pct = Math.round(50 + ((i + 1) / pageElements.length) * 45);
        actualProgress(pct);
      }

      actualProgress(100);
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
