import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName} - ${details}`);
  }
}

console.log('================================================================');
console.log('🧪 DOCFORGE STUDIO AUDIT & MOLECULAR VERIFICATION TEST SUITE');
console.log('================================================================\n');

// 1. SCROLLING & NEGATIVE SCROLL SPACE ELIMINATION
console.log('--- SECTION 1: Negative Scroll Space & Viewport Clipping Prevention ---');
const studiosToInspectScroll = [
  'src/pages/pdf/OcrPdf.jsx',
  'src/pages/pdf/UnOcrPdf.jsx',
  'src/pages/pdf/ProtectPdf.jsx',
  'src/pages/pdf/UnlockPdf.jsx',
  'src/pages/pdf/RepairPdf.jsx',
  'src/pages/document/PdfToExcel.jsx',
  'src/pages/document/PdfToWord.jsx',
  'src/pages/document/PdfToPowerpoint.jsx'
];

for (const relPath of studiosToInspectScroll) {
  const fullPath = path.join(projectRoot, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const baseName = path.basename(relPath);

  // Assert items-center is NOT paired with overflow-auto in the main workspace container
  // A container with flex items-center and overflow-auto vertically centers children, clipping top content into negative scroll coordinates
  const hasTrap = /flex-1\s+overflow-auto[\s\S]{0,100}items-center/.test(content) &&
                  !/items-start/.test(content);
  assert(!hasTrap, `${baseName}: Main workspace container eliminates negative scroll trap`,
    `Found items-center scroll-clipping pattern`);

  // Assert items-start with proper bottom padding exists
  assert(content.includes('items-start justify-center'), `${baseName}: Container uses items-start justify-center for top-anchored scrolling`);
  assert(/pb-24|pb-32/.test(content), `${baseName}: Main workspace has bottom padding buffer (pb-24 or pb-32)`);
}

// 2. ERADICATION OF UNPROFESSIONAL MACHINE/AI JARGON
console.log('\n--- SECTION 2: Eradication of Raw AI/Machine Jargon ("ONNX", "Browser", "Server") ---');
const studiosToInspectJargon = [
  'src/pages/pdf/OcrPdf.jsx',
  'src/pages/document/PdfToPdfa.jsx',
  'src/pages/document/PdfToExcel.jsx',
  'src/pages/document/PdfToPowerpoint.jsx',
  'src/pages/document/PdfToWord.jsx',
  'src/pages/document/DocxToPdf.jsx',
  'src/pages/document/ExcelToPdf.jsx',
  'src/pages/document/PowerpointToPdf.jsx',
  'src/pages/document/HtmlToPdf.jsx',
  'src/pages/utility/UrlToPdf.jsx',
  'src/pages/document/TranslatePdf.jsx'
];

for (const relPath of studiosToInspectJargon) {
  const fullPath = path.join(projectRoot, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const baseName = path.basename(relPath);

  // Check that raw button labels do not display 'ONNX' or 'Browser Engine' or 'Server Engine'
  const hasRawOnnxLabel = /Fast Browser \(ONNX\)|ONNX Engine|ONNX Runtime/i.test(content);
  assert(!hasRawOnnxLabel, `${baseName}: No unprofessional "ONNX" label in user interface`,
    `Found raw ONNX mentions in UI`);

  const hasRawBrowserEngineLabel = /'Browser Engine'|"Browser Engine"|Fast Browser/i.test(content);
  assert(!hasRawBrowserEngineLabel, `${baseName}: No raw "Browser" label in mode toggle buttons`);

  const hasRawServerEngineLabel = /'Server Engine'|"Server Engine"|High Accuracy Server/i.test(content);
  assert(!hasRawServerEngineLabel, `${baseName}: No raw "Server" label in mode toggle buttons`);

  // Check for professional replacement terms
  const hasProfessionalLabels = /Fast (Scan|Mode|Translate)/.test(content) && 
                                /(High Precision|Full Precision|Deep Neural|Cloud Archival)/.test(content);
  assert(hasProfessionalLabels, `${baseName}: Uses professional, user-centric mode labels`);
}

// 3. BACKGROUND PDF.JS RENDER COLLISION PREVENTIONS
console.log('\n--- SECTION 3: Background PDF.js Canvas Render Collision & Cancellation ---');
const studiosToInspectRender = [
  'src/pages/pdf/OcrPdf.jsx',
  'src/pages/pdf/UnOcrPdf.jsx',
  'src/pages/pdf/ProtectPdf.jsx',
  'src/pages/pdf/UnlockPdf.jsx',
  'src/pages/pdf/RepairPdf.jsx',
  'src/pages/document/PdfToExcel.jsx',
  'src/pages/document/PdfToPowerpoint.jsx',
  'src/pages/document/PdfToWord.jsx'
];

for (const relPath of studiosToInspectRender) {
  const fullPath = path.join(projectRoot, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const baseName = path.basename(relPath);

  assert(content.includes('currentRenderTaskRef'), `${baseName}: Implements currentRenderTaskRef for cancellation`);
  assert(content.includes('RenderingCancelledException'), `${baseName}: Gracefully handles RenderingCancelledException`);
  assert(content.includes('currentRenderTaskRef.current.cancel()'), `${baseName}: Cancels in-flight render before re-rendering`);
}

// 4. PREVIEW CANVAS ASPECT RATIO & ZOOM INTEGRITY
console.log('\n--- SECTION 4: Geometric Alignment & Zoom Mathematics ---');
{
  const ocrContent = fs.readFileSync(path.join(projectRoot, 'src/pages/pdf/OcrPdf.jsx'), 'utf8');
  assert(ocrContent.includes('aspect-[1/1.414]'), 'OcrPdf: Page thumbnails use standard ISO 216 A4 aspect ratio (1/1.414)');
  assert(!ocrContent.includes('aspect-3/4'), 'OcrPdf: Eradicated distorted 3:4 aspect ratio thumbnail styling');

  const excelContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToExcel.jsx'), 'utf8');
  // Verify no double zoom: either canvas renders at scaled viewport OR CSS transform scales it, but NOT both
  const hasDoubleZoomExcel = /scale:\s*1\.5\s*\*\s*zoomScale/.test(excelContent) && /transform:\s*['"`]scale\(/i.test(excelContent);
  assert(!hasDoubleZoomExcel, 'PdfToExcel: Eliminated double-zoom mathematical bug on preview canvas');

  const pptxContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToPowerpoint.jsx'), 'utf8');
  const hasDoubleZoomPptx = /scale:\s*1\.5\s*\*\s*zoomScale/.test(pptxContent) && /transform:\s*['"`]scale\(/i.test(pptxContent);
  assert(!hasDoubleZoomPptx, 'PdfToPowerpoint: Eliminated double-zoom mathematical bug on preview canvas');
}

// 5. ICON IMPORT INTEGRITY
console.log('\n--- SECTION 5: Dependency & Icon Import Parity ---');
{
  const excelContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToExcel.jsx'), 'utf8');
  const pptxContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToPowerpoint.jsx'), 'utf8');
  
  const excelImportsLucide = excelContent.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (excelImportsLucide) {
    const importedIcons = excelImportsLucide[1].split(',').map(s => s.trim());
    assert(importedIcons.includes('Zap'), 'PdfToExcel: Imports Zap icon cleanly from lucide-react');
    assert(importedIcons.includes('Sparkles'), 'PdfToExcel: Imports Sparkles icon cleanly from lucide-react');
    assert(!importedIcons.includes('Server') && !excelContent.includes('<Server'), 'PdfToExcel: No dangling unimported Server icon');
  } else {
    assert(false, 'PdfToExcel: Failed to match lucide-react imports');
  }

  const pptxImportsLucide = pptxContent.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (pptxImportsLucide) {
    const importedIcons = pptxImportsLucide[1].split(',').map(s => s.trim());
    assert(importedIcons.includes('Zap'), 'PdfToPowerpoint: Imports Zap icon cleanly from lucide-react');
    assert(importedIcons.includes('Sparkles'), 'PdfToPowerpoint: Imports Sparkles icon cleanly from lucide-react');
    assert(!importedIcons.includes('Server') && !pptxContent.includes('<Server'), 'PdfToPowerpoint: No dangling unimported Server icon');
  } else {
    assert(false, 'PdfToPowerpoint: Failed to match lucide-react imports');
  }
}

// 6. ADVISORY & OFFLINE BANNER QUALITY
console.log('\n--- SECTION 6: Error & Offline Status String Quality ---');
{
  const ocrContent = fs.readFileSync(path.join(projectRoot, 'src/pages/pdf/OcrPdf.jsx'), 'utf8');
  assert(ocrContent.includes('High Precision is currently offline. Switch to Fast Scan to process directly on this device.'),
    'OcrPdf: Offline warning banner is clear, polite, and actionable');
  assert(ocrContent.includes('High Precision engine is currently offline. Please switch to Fast Scan mode.'),
    'OcrPdf: Actionable error message when backend is offline');

  const excelContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToExcel.jsx'), 'utf8');
  assert(excelContent.includes('Cloud conversion engine is currently offline. Please switch to Fast Mode.'),
    'PdfToExcel: Clean cloud offline error message');

  const wordContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToWord.jsx'), 'utf8');
  assert(wordContent.includes('High-precision layout reconstruction with deep structural formatting.'),
    'PdfToWord: Clean informative advisory copy without machine jargon');
  assert(wordContent.includes('High-precision conversion could not be completed.'),
    'PdfToWord: Clean error copy without server terminology');

  const pdfaContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PdfToPdfa.jsx'), 'utf8');
  assert(pdfaContent.includes('Cloud archival conversion could not be completed.'),
    'PdfToPdfa: Clean archival error copy');
  assert(pdfaContent.includes('Validating ISO 19005 archival compliance...'),
    'PdfToPdfa: Clean ISO validation status copy');

  const docxContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/DocxToPdf.jsx'), 'utf8');
  assert(docxContent.includes('Full Precision conversion could not be completed.'),
    'DocxToPdf: Clean error copy');

  const excelPdfContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/ExcelToPdf.jsx'), 'utf8');
  assert(excelPdfContent.includes('Full Precision conversion could not be completed.'),
    'ExcelToPdf: Clean error copy');

  const pptxPdfContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/PowerpointToPdf.jsx'), 'utf8');
  assert(pptxPdfContent.includes('Full Precision conversion could not be completed.'),
    'PowerpointToPdf: Clean error copy');

  const htmlContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/HtmlToPdf.jsx'), 'utf8');
  assert(htmlContent.includes('Full Precision capture could not be completed.'),
    'HtmlToPdf: Clean error copy');

  const urlContent = fs.readFileSync(path.join(projectRoot, 'src/pages/utility/UrlToPdf.jsx'), 'utf8');
  assert(urlContent.includes('Full Precision capture could not be completed.'),
    'UrlToPdf: Clean error copy');

  const translateContent = fs.readFileSync(path.join(projectRoot, 'src/pages/document/TranslatePdf.jsx'), 'utf8');
  assert(translateContent.includes('Deep Neural translation could not be completed.'),
    'TranslatePdf: Clean translation error copy');
}

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
