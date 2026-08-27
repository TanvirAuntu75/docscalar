/* PDF Translation Engine: Multi-Language Document Translation & Vector Synthesis */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
 * Supported Language Directory
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇧🇩' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish (Polski)', flag: '🇵🇱' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

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
  throw new Error('Unsupported PDF input format.');
}

/**
 * Translate a text snippet using Free Public Neural Machine Translation
 */
export async function translateTextSnippet(text, targetLang = 'es', sourceLang = 'auto') {
  if (!text || text.trim() === '') return '';
  const clean = text.trim();
  if (clean.length > 500) {
    // Split into smaller sentences to avoid URL limit
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    const translatedParts = await Promise.all(
      sentences.map((s) => translateTextSnippet(s, targetLang, sourceLang))
    );
    return translatedParts.join(' ');
  }

  try {
    const from = sourceLang === 'auto' ? 'autodetect' : sourceLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${from}|${targetLang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (e) {
    // Fallback on network failure
  }

  // Graceful offline fallback: return annotated text
  return `[${targetLang.toUpperCase()}] ${clean}`;
}

const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/';
const STANDARD_FONT_DATA_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/standard_fonts/';

/**
 * Direct in-thread fallback PDF Translator.
 * Extracts text from PDF pages, translates sentences, and typesets translated vector PDF.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directTranslatePdf(file, options = {}, onProgress = () => {}) {
  onProgress(10);
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
  onProgress(25);

  const { targetLang = 'es', sourceLang = 'auto' } = options;

  // Create new translated PDF document
  const translatedDoc = await PDFDocument.create();
  const font = await translatedDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await translatedDoc.embedFont(StandardFonts.HelveticaBold);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    // Collect paragraphs
    const paragraphs = [];
    let currentPara = '';

    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      currentPara += (currentPara ? ' ' : '') + item.str.trim();
      if (item.hasEOL || currentPara.endsWith('.') || currentPara.length > 250) {
        paragraphs.push(currentPara);
        currentPara = '';
      }
    }
    if (currentPara) paragraphs.push(currentPara);

    // Translate paragraphs
    const translatedParagraphs = [];
    for (const para of paragraphs) {
      const translated = await translateTextSnippet(para, targetLang, sourceLang);
      const sanitized = (translated || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
      translatedParagraphs.push(sanitized);
    }

    // Synthesize translated PDF page
    const newPage = translatedDoc.addPage([viewport.width || 595.28, viewport.height || 841.89]);
    const { width, height } = newPage.getSize();

    // Draw header banner
    newPage.drawRectangle({
      x: 36,
      y: height - 42,
      width: width - 72,
      height: 24,
      color: rgb(0.95, 0.96, 0.98)
    });

    newPage.drawText(`DocForge AI Translation: ${targetLang.toUpperCase()}`, {
      x: 44,
      y: height - 34,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45)
    });

    let currentY = height - 70;
    const margin = 40;
    const maxWidth = width - margin * 2;
    const fontSize = 10;
    const lineHeight = 14;

    for (const text of (translatedParagraphs.length > 0 ? translatedParagraphs : ['[No readable text detected on this page]'])) {
      // Word wrap
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (textWidth > maxWidth && line) {
          if (currentY < 45) break;
          newPage.drawText(line, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0.12, 0.14, 0.18)
          });
          line = word;
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line && currentY >= 45) {
        newPage.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.12, 0.14, 0.18)
        });
        currentY -= lineHeight + 6;
      }
    }

    // Page Number Footer
    newPage.drawText(`Page ${pageNum} of ${numPages}`, {
      x: width / 2 - 25,
      y: 20,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    onProgress(25 + Math.round((pageNum / numPages) * 70));
  }

  onProgress(95);
  const pdfBytes = await translatedDoc.save();
  onProgress(100);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Translate a PDF document into a target language.
 * @param {File|Blob|ArrayBuffer} file - The .pdf file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function translatePdf(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directTranslatePdf(file, options, actualProgress);
}
