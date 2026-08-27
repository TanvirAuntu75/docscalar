/* PDF to Word (DOCX) Engine: Client-Side OpenXML Generation & Server-Side Integration */
import JSZip from 'jszip';

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
  throw new Error('Unsupported PDF file input format.');
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Package an array of text paragraphs or page text blocks into a valid OpenXML .docx Blob
 * @param {Array<string|{text: string, isHeading?: boolean}>} paragraphs 
 * @returns {Promise<Blob>}
 */
export async function createDocxBlobFromParagraphs(paragraphs = []) {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // 4. word/styles.xml
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="222222"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  // 5. word/document.xml
  const paragraphXml = paragraphs.map((p) => {
    const text = typeof p === 'string' ? p : (p.text || '');
    const isHeading = typeof p === 'object' && p.isHeading;
    const cleanText = escapeXml(text.trim());

    if (!cleanText) {
      return '<w:p/>';
    }

    if (isHeading) {
      return `<w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="240" w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
            <w:color w:val="1E293B"/>
          </w:rPr>
          <w:t>${cleanText}</w:t>
        </w:r>
      </w:p>`;
    }

    return `<w:p>
      <w:pPr>
        <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:t xml:space="preserve">${cleanText}</w:t>
      </w:r>
    </w:p>`;
  }).join('\n');

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  const docxBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([docxBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * Convert PDF to DOCX format Client-Side.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file
 * @param {object} options - Conversion options
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function convertPdfToWord(file, options = {}, onProgress = () => {}) {
  onProgress(10);
  const arrayBuffer = await extractBytes(file);
  
  let pdf = null;
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    }

    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;
    const extractedParagraphs = [];

    for (let i = 1; i <= totalPages; i++) {
      onProgress(10 + Math.round((i / totalPages) * 70));
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let currentLine = '';
      let lastY = null;

      for (const item of textContent.items) {
        const str = item.str || '';
        const y = item.transform ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
          if (currentLine.trim()) {
            extractedParagraphs.push({
              text: currentLine.trim(),
              isHeading: currentLine.trim().length < 60 && /^[A-Z0-9\s:.-]+$/.test(currentLine.trim())
            });
          }
          currentLine = str;
        } else {
          currentLine += (currentLine ? ' ' : '') + str;
        }
        lastY = y;
      }

      if (currentLine.trim()) {
        extractedParagraphs.push({
          text: currentLine.trim(),
          isHeading: false
        });
      }

      // Add page break separator if not last page
      if (i < totalPages) {
        extractedParagraphs.push('');
      }
    }

    onProgress(90);
    const docxBlob = await createDocxBlobFromParagraphs(extractedParagraphs);
    onProgress(100);
    return docxBlob;
  } finally {
    if (pdf) {
      try {
        pdf.destroy();
      } catch (e) {}
    }
  }
}
