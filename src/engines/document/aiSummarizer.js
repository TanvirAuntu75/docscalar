/* AI Document Summarizer Engine: TextRank Graph Centrality & Executive PDF Generator */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { summarizeDocument } from '../../utils/textRank.js';

/**
 * Polyfill for environments missing Promise.withResolvers
 */
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
 * Dynamically import pdfjs-dist
 */
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions?.workerSrc && typeof window !== 'undefined') {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    } catch (e) {}
  }
  return pdfjs.default || pdfjs;
}

/**
 * Extract array buffer from any input
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
  if (typeof file === 'string') {
    return new TextEncoder().encode(file).buffer;
  }
  throw new Error('Unsupported document input format.');
}

const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/';
const STANDARD_FONT_DATA_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/standard_fonts/';

/**
 * Extract plain text from PDF file or string
 */
export async function extractDocumentText(file) {
  if (typeof file === 'string') return file;
  const arrayBuffer = await extractBytes(file);
  const pdfjs = await getPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageTexts = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items || []).map((item) => item.str).filter((s) => s.trim().length > 0);
    pageTexts.push(strings.join(' '));
  }

  return pageTexts.join('\n\n');
}

/**
 * Generate publication-ready Executive Summary PDF report
 */
export async function generateSummaryReportPdf(summaryResult, options = {}) {
  const {
    documentTitle = 'Executive Document Summary',
    sourceFileName = 'document.pdf',
    mode = 'executive'
  } = options;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header Banner Block
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(0.08, 0.12, 0.22)
  });

  page.drawText('DOCFORGE AI EXECUTIVE BRIEF', {
    x: 40,
    y: height - 42,
    size: 10,
    font: fontBold,
    color: rgb(0.38, 0.65, 0.98)
  });

  page.drawText(documentTitle.slice(0, 45), {
    x: 40,
    y: height - 68,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText(`Source: ${sourceFileName} | Mode: ${mode.toUpperCase()}`, {
    x: 40,
    y: height - 86,
    size: 9,
    font,
    color: rgb(0.7, 0.75, 0.85)
  });

  // Diagnostics Metric Cards
  const stats = summaryResult.stats || { originalWords: 1000, summaryWords: 250, reductionPct: 75 };
  const cardY = height - 145;
  const cardWidth = (width - 80 - 20) / 3;

  const metrics = [
    { label: 'Original Length', value: `${stats.originalWords || 0} words` },
    { label: 'Summary Length', value: `${stats.summaryWords || 0} words` },
    { label: 'Compression', value: `-${stats.reductionPct || 70}% reduction` }
  ];

  metrics.forEach((m, idx) => {
    const cardX = 40 + idx * (cardWidth + 10);
    page.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: 36,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.88, 0.9, 0.94),
      borderWidth: 1
    });

    page.drawText(m.label.toUpperCase(), {
      x: cardX + 10,
      y: cardY + 22,
      size: 7,
      font: fontBold,
      color: rgb(0.4, 0.45, 0.55)
    });

    page.drawText(m.value, {
      x: cardX + 10,
      y: cardY + 8,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25)
    });
  });

  // Main Content Section
  let currentY = height - 180;
  const margin = 40;
  const contentWidth = width - margin * 2;

  page.drawText('KEY FINDINGS & EXECUTIVE INSIGHTS', {
    x: margin,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });
  currentY -= 20;

  const highlights = summaryResult.highlights || (summaryResult.summary ? summaryResult.summary.split('\n') : ['No summary points available.']);

  for (let i = 0; i < highlights.length; i++) {
    const text = highlights[i];
    if (!text || !text.trim()) continue;

    // Bullet badge
    page.drawCircle({
      x: margin + 4,
      y: currentY - 3,
      size: 2.5,
      color: rgb(0.2, 0.5, 0.9)
    });

    // Wrapped bullet text
    const words = text.split(' ');
    let line = '';
    const fontSize = 10;
    const lineHeight = 14;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (textWidth > contentWidth - 20 && line) {
        if (currentY < 50) break;
        page.drawText(line, {
          x: margin + 16,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.15, 0.18, 0.24)
        });
        line = word;
        currentY -= lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line && currentY >= 50) {
      page.drawText(line, {
        x: margin + 16,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.18, 0.24)
      });
      currentY -= lineHeight + 8;
    }
  }

  // Footer
  page.drawText('Generated by DocForge AI Document Intelligence • 100% Private Client-Side Processing', {
    x: margin,
    y: 20,
    size: 8,
    font,
    color: rgb(0.5, 0.55, 0.65)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Direct in-thread fallback AI Summarizer.
 * Extracts text, runs TextRank graph summarization, and produces PDF report.
 * @param {File|Blob|ArrayBuffer|string} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<{ summaryResult: object, reportBlob: Blob }>}
 */
export async function directSummarizePdf(file, options = {}, onProgress = () => {}) {
  onProgress(15);
  const text = await extractDocumentText(file);
  onProgress(45);

  const { mode = 'executive', maxSentences = 6 } = options;
  const summaryResult = summarizeDocument(text, { mode, maxSentences });
  onProgress(75);

  const reportBlob = await generateSummaryReportPdf(summaryResult, {
    documentTitle: options.documentTitle || 'Executive Document Brief',
    sourceFileName: options.sourceFileName || 'document.pdf',
    mode
  });
  onProgress(100);

  return {
    summaryResult,
    reportBlob
  };
}

/**
 * Main AI Document Summarizer function.
 * @param {File|Blob|ArrayBuffer|string} file 
 * @param {object|function} optionsOrProgress 
 * @param {function} onProgress 
 * @returns {Promise<{ summaryResult: object, reportBlob: Blob }>}
 */
export async function summarizePdfDocument(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directSummarizePdf(file, options, actualProgress);
}
