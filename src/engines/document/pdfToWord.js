/* PDF to Word (DOCX) Engine: Client-Side OpenXML Generation with 2D Spatial Layout */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
  convertInchesToTwip
} from 'docx';

if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/**
 * Extract array buffer from any file/blob/buffer/typedarray input safely.
 */
export async function extractBytes(file) {
  if (!file) throw new Error('Input file is empty or undefined.');
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
  throw new Error('Unsupported PDF file input format.');
}

/**
 * Sanitize text to remove XML 1.0 illegal control characters and lone surrogates.
 * Permitted in XML 1.0: \x09 (Tab), \x0A (LF), \x0D (CR), and \x20-\uD7FF, \uE000-\uFFFD.
 */
export function sanitizeXmlText(str) {
  if (!str) return '';
  return String(str)
    // Strip illegal ASCII control codes except Tab (\x09) and Newline (\x0A, \x0D)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace lone surrogates
    .replace(/[\uD800-\uDFFF]/g, '\uFFFD');
}

/**
 * Detect whether a font name indicates bold styling.
 */
export function isFontBold(fontName = '') {
  const f = String(fontName).toLowerCase();
  return f.includes('bold') || f.includes('black') || f.includes('heavy') || f.includes('sembold') || f.includes('demibold') || f.includes('w7') || f.includes('w8') || f.includes('w9');
}

/**
 * Detect whether a font name indicates italic styling.
 */
export function isFontItalic(fontName = '') {
  const f = String(fontName).toLowerCase();
  return f.includes('italic') || f.includes('oblique') || f.includes('slanted');
}

/**
 * Detect whether a line represents a heading, bullet item, or standard body text.
 */
export function detectLineType(trimmedLine = '', lineMaxH = 11, medianFontHeight = 11, lineIsBold = false, preserveHeadings = true) {
  if (!trimmedLine) return { isHeading: false, isBullet: false, headingLevel: 1 };

  const isBullet = /^[•*–-]\s+/.test(trimmedLine) || /^\d+\.\s+/.test(trimmedLine);
  if (isBullet) return { isHeading: false, isBullet: true, headingLevel: 1 };

  if (!preserveHeadings) return { isHeading: false, isBullet: false, headingLevel: 1 };

  const isSignificantlyLarger = lineMaxH >= medianFontHeight * 1.3;
  const isAllCapsHeading = trimmedLine.length > 3 && trimmedLine.length < 80 && /^[A-Z0-9\s:.-]+$/.test(trimmedLine);
  const isHeading = isSignificantlyLarger || (lineIsBold && isAllCapsHeading);
  const headingLevel = lineMaxH >= medianFontHeight * 1.6 ? 1 : 2;

  return { isHeading, isBullet: false, headingLevel };
}

/**
 * Determine if two consecutive lines belong to the same continuing paragraph.
 */
export function shouldJoinLines(prevLineText = '', lineGap = 0, lineH = 11) {
  if (!prevLineText || typeof prevLineText !== 'string') return false;
  const trimmed = prevLineText.trim();
  if (!trimmed) return false;

  // If previous line ends with terminal sentence punctuation (. ? !), it is a paragraph boundary
  // unless the gap is very tight
  const endsWithTerminal = /[.?!]\s*$/.test(trimmed);
  if (endsWithTerminal && lineGap > lineH * 1.35) {
    return false;
  }

  // If line gap is significantly larger than typical line height, it's a paragraph break
  const maxContinuationGap = Math.max(16, lineH * 1.65);
  if (lineGap > maxContinuationGap) {
    return false;
  }

  return true;
}

/**
 * Package an array of text paragraphs or page text blocks into a valid OpenXML .docx Blob.
 * Exported for backward-compatibility and direct text array conversions.
 * @param {Array<string|{text: string, isHeading?: boolean, level?: number, isPageBreak?: boolean}>} paragraphs 
 * @returns {Promise<Blob>}
 */
export async function createDocxBlobFromParagraphs(paragraphs = []) {
  const children = [];

  for (const p of paragraphs) {
    if (!p) {
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    if (typeof p === 'object' && p.isPageBreak) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    const text = typeof p === 'string' ? p : (p.text || '');
    const cleanText = sanitizeXmlText(text.trim());
    if (!cleanText) {
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    const isHeading = typeof p === 'object' && Boolean(p.isHeading);
    const level = (typeof p === 'object' && p.level) ? p.level : 1;

    if (isHeading) {
      children.push(
        new Paragraph({
          text: cleanText,
          heading: level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: cleanText })],
          spacing: { after: 140, line: 276 }
        })
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '222222' },
          paragraph: { spacing: { after: 140, line: 276 } }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: children.length > 0 ? children : [new Paragraph({ text: '' })]
    }]
  });

  const arrayBuffer = await Packer.toArrayBuffer(doc);
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Cluster PDF.js text items into lines using 2D spatial coordinates.
 * In PDF coordinates, Y increases from bottom to top.
 * Items are clustered into lines by Y proximity, sorted descending by Y (top to bottom),
 * and items within each line are sorted ascending by X (left to right).
 */
export function clusterTextItemsIntoLines(items = []) {
  if (!items || items.length === 0) return [];

  // Filter items that contain non-whitespace text
  const validItems = items.filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0);
  if (validItems.length === 0) return [];

  // Sort initially by Y descending (higher Y is higher on the page)
  validItems.sort((a, b) => {
    const yA = a.transform ? a.transform[5] : 0;
    const yB = b.transform ? b.transform[5] : 0;
    return yB - yA;
  });

  const lines = [];

  for (const item of validItems) {
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;
    const height = item.height || (item.transform ? Math.abs(item.transform[0]) : 11);
    const tolerance = Math.max(3.5, height * 0.45);

    // Find existing line with compatible baseline Y
    let matchedLine = null;
    for (const line of lines) {
      if (Math.abs(line.y - y) <= tolerance) {
        matchedLine = line;
        break;
      }
    }

    if (matchedLine) {
      matchedLine.items.push({ item, x, y, height });
    } else {
      lines.push({
        y,
        height,
        items: [{ item, x, y, height }]
      });
    }
  }

  // Sort lines from top of page to bottom (descending Y in PDF coordinates)
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line from left to right (ascending X)
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  return lines;
}

/**
 * Convert PDF to DOCX format Client-Side using official OpenXML Document structure.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file
 * @param {object} options - Conversion options { preserveHeadings, preserveImages }
 * @param {function} onProgress - Progress callback (0 - 100)
 * @returns {Promise<Blob>} - Converted Word DOCX Blob
 */
export async function convertPdfToWord(file, options = {}, onProgress = () => {}) {
  onProgress(5);
  const arrayBuffer = await extractBytes(file);
  
  // Basic PDF Header Validation
  const headerCheck = new Uint8Array(arrayBuffer.slice(0, 8));
  const headerStr = String.fromCharCode(...headerCheck);
  if (!headerStr.includes('%PDF-')) {
    throw new Error('Invalid PDF format: File header does not start with %PDF-');
  }

  let pdf = null;
  try {
    onProgress(10);
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    }

    try {
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    } catch (docErr) {
      if (docErr && (docErr.name === 'PasswordException' || String(docErr.message).includes('password'))) {
        throw new Error('This PDF is password-protected. Please unlock the document first or provide the password.');
      }
      throw new Error(`Failed to load PDF document: ${docErr.message || 'Corrupted or unreadable structure.'}`);
    }

    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      throw new Error('PDF document has zero pages.');
    }

    const docChildren = [];
    const preserveHeadings = options.preserveHeadings !== false;

    // Process Page by Page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageProgress = 10 + Math.round((pageNum / totalPages) * 75);
      onProgress(pageProgress);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent({ includeMarkedContent: false });
      const lines = clusterTextItemsIntoLines(textContent.items);

      // Determine typical body font height for this page
      const fontHeights = textContent.items
        .map(it => it.height || (it.transform ? Math.abs(it.transform[0]) : 0))
        .filter(h => h > 5 && h < 40);
      fontHeights.sort((a, b) => a - b);
      const medianFontHeight = fontHeights.length > 0 ? fontHeights[Math.floor(fontHeights.length / 2)] : 11;

      let prevLineY = null;
      let currentParagraphRuns = [];

      const flushParagraph = (isHeading = false, headingLevel = 1, isBullet = false) => {
        if (currentParagraphRuns.length === 0) return;

        // Check if paragraph text is not purely whitespace
        const fullText = currentParagraphRuns.map(r => r.text).join('').trim();
        if (!fullText) {
          currentParagraphRuns = [];
          return;
        }

        const textRuns = currentParagraphRuns.map(r => {
          return new TextRun({
            text: r.text,
            bold: r.bold,
            italics: r.italics,
            size: r.size ? Math.round(r.size * 2) : 22, // Half-points (11pt = 22)
            color: '222222'
          });
        });

        if (isHeading && preserveHeadings) {
          docChildren.push(
            new Paragraph({
              children: textRuns,
              heading: headingLevel === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 }
            })
          );
        } else if (isBullet) {
          docChildren.push(
            new Paragraph({
              children: textRuns,
              bullet: { level: 0 },
              spacing: { after: 100, line: 276 }
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 140, line: 276 }
            })
          );
        }

        currentParagraphRuns = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineY = line.y;
        const lineH = line.height;

        // 1. Build this line's text and detect properties
        let lineText = '';
        let lineMaxH = lineH;
        let lineIsBold = false;
        let lineIsItalic = false;
        const lineRuns = [];

        for (let j = 0; j < line.items.length; j++) {
          const { item, x } = line.items[j];
          const rawStr = sanitizeXmlText(item.str || '');
          if (!rawStr) continue;

          const itemH = item.height || (item.transform ? Math.abs(item.transform[0]) : lineH);
          if (itemH > lineMaxH) lineMaxH = itemH;

          const bold = isFontBold(item.fontName);
          const italic = isFontItalic(item.fontName);
          if (bold) lineIsBold = true;
          if (italic) lineIsItalic = true;

          // Space insertion logic between items in the same line
          if (j > 0) {
            const prevItem = line.items[j - 1];
            const prevEndX = prevItem.x + (prevItem.item.width || 0);
            const xGap = x - prevEndX;
            if (xGap > 2.5 && !lineText.endsWith(' ') && !rawStr.startsWith(' ')) {
              lineRuns.push({ text: ' ', bold: false, italics: false });
              lineText += ' ';
            }
          }

          lineRuns.push({
            text: rawStr,
            bold,
            italics: italic,
            size: itemH
          });
          lineText += rawStr;
        }

        const trimmedLine = lineText.trim();
        if (!trimmedLine) continue;

        // 2. Classify line type
        const { isHeading, isBullet, headingLevel } = detectLineType(
          trimmedLine,
          lineMaxH,
          medianFontHeight,
          lineIsBold,
          preserveHeadings
        );

        // 3. Handle paragraph boundary conditions
        if (isHeading || isBullet) {
          // Flush any preceding standard paragraph text before starting heading or bullet
          flushParagraph();

          // Push this line's runs and flush immediately
          currentParagraphRuns.push(...lineRuns);
          if (isHeading) {
            flushParagraph(true, headingLevel);
          } else {
            flushParagraph(false, 1, true);
          }
        } else {
          // Standard body line: check if continuing existing paragraph or starting new
          if (prevLineY !== null && currentParagraphRuns.length > 0) {
            const lineGap = prevLineY - lineY;
            const prevText = currentParagraphRuns.map(r => r.text).join('');
            const canJoin = shouldJoinLines(prevText, lineGap, lineH);
            if (!canJoin) {
              flushParagraph();
            }
          }

          // If continuing previous paragraph runs, ensure inter-line space or hyphen unwrap
          if (currentParagraphRuns.length > 0) {
            const lastRun = currentParagraphRuns[currentParagraphRuns.length - 1];
            const lastRunText = lastRun.text || '';
            const firstRunText = lineRuns[0]?.text || '';

            if (lastRunText.endsWith('-')) {
              // Word hyphenation: if next line starts with lowercase, drop trailing hyphen
              if (/^[a-z]/.test(firstRunText.trim())) {
                lastRun.text = lastRunText.slice(0, -1);
              }
            } else if (!lastRunText.endsWith(' ') && !firstRunText.startsWith(' ')) {
              currentParagraphRuns.push({ text: ' ', bold: false, italics: false });
            }
          }

          currentParagraphRuns.push(...lineRuns);
        }

        prevLineY = lineY;
      }

      // Flush remaining runs for the page
      flushParagraph();
      page.cleanup();

      // Add native OpenXML page break if not the last page
      if (pageNum < totalPages) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    onProgress(90);

    // If PDF was entirely blank or images with no text, provide empty paragraph
    if (docChildren.length === 0) {
      docChildren.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22, color: '222222' },
            paragraph: { spacing: { after: 140, line: 276 } }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            }
          }
        },
        children: docChildren
      }]
    });

    const docxArrayBuffer = await Packer.toArrayBuffer(doc);
    onProgress(100);

    return new Blob([docxArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  } finally {
    if (pdf) {
      try {
        pdf.destroy();
      } catch (e) {}
    }
  }
}
