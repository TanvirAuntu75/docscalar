import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function testPdfParse() {
  const data = new Uint8Array(fs.readFileSync('./test_dummy.pdf'));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log('PDF loaded, number of pages:', pdf.numPages);
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const text = textContent.items.map(item => item.str).join(' ');
  console.log('Extracted text:', text);
}

testPdfParse().catch(console.error);
