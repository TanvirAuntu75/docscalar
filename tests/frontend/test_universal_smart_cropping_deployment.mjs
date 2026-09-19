import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { cleanAndRefitDocument } from '../../src/engines/pdf/cleanAndRefitPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('=== Starting Universal Smart Cropping Deployment Verification Suite ===\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  [PASS] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAll() {
  // -----------------------------------------------------------------------------
  // SECTION 1: Engine Layer Verification
  // -----------------------------------------------------------------------------

  const organizeEngineSrc = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/organizePdf.js'), 'utf8');
  const removeEngineSrc = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/removePages.js'), 'utf8');
  const extractEngineSrc = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/extractPages.js'), 'utf8');
  const splitEngineSrc = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/splitPdf.js'), 'utf8');
  const workerSrc = fs.readFileSync(path.join(rootDir, 'src/workers/pdf.worker.js'), 'utf8');

  await runTest('organizePdf.js imports cleanAndRefitDocument', () => {
    assert.ok(organizeEngineSrc.includes("import { cleanAndRefitDocument } from './cleanAndRefitPage.js';"));
  });

  await runTest('organizePdf.js signature accepts options = {} parameter', () => {
    assert.ok(organizeEngineSrc.includes('async function organizePdf(files, pageConfigs, onProgress, options = {})'));
  });

  await runTest('organizePdf.js evaluates autoCropBlackBorders and smartCrop options', () => {
    assert.ok(organizeEngineSrc.includes('options.autoCropBlackBorders || options.smartCrop'));
  });

  await runTest('organizePdf.js guards clean documents without scan borders from cleanAndRefitDocument', () => {
    assert.ok(organizeEngineSrc.includes('hasRealScanBorders'));
    assert.ok(organizeEngineSrc.includes('cropBox.hasBlackBorders === true'));
  });

  await runTest('removePages.js imports cleanAndRefitDocument', () => {
    assert.ok(removeEngineSrc.includes("import { cleanAndRefitDocument } from './cleanAndRefitPage.js';"));
  });

  await runTest('removePages.js signature accepts options = {} parameter', () => {
    assert.ok(removeEngineSrc.includes('async function removePages(file, indicesToRemove, onProgress, options = {})'));
  });

  await runTest('removePages.js invokes cleanAndRefitDocument when hasRealScanBorders is true', () => {
    assert.ok(removeEngineSrc.includes('cleanAndRefitDocument(pdfDoc, { 0: cropBox }'));
  });

  await runTest('extractPages.js imports cleanAndRefitDocument', () => {
    assert.ok(extractEngineSrc.includes("import { cleanAndRefitDocument } from './cleanAndRefitPage.js';"));
  });

  await runTest('extractPages.js signature accepts options = {} parameter', () => {
    assert.ok(extractEngineSrc.includes('async function extractPages(file, indicesToKeep, onProgress, options = {})'));
  });

  await runTest('extractPages.js passes enabledEdges and margin to cleanAndRefitDocument', () => {
    assert.ok(extractEngineSrc.includes('margin: options.cleanMargin ?? 0'));
    assert.ok(extractEngineSrc.includes('enabledEdges: options.enabledEdges'));
  });

  await runTest('splitPdf.js signature accepts options = {} parameter', () => {
    assert.ok(splitEngineSrc.includes("export async function splitPdf(file, mode = 'all', range = '', onProgress, options = {})"));
  });

  await runTest('splitPdf.js passes options in worker message payload', () => {
    assert.ok(splitEngineSrc.includes('payload: { arrayBuffer, mode, range, options }'));
  });

  await runTest('pdf.worker.js unpacks options in case splitPdf', () => {
    assert.ok(workerSrc.includes('const { arrayBuffer, mode, range, options } = payload;'));
    assert.ok(workerSrc.includes('handleSplitPdf(arrayBuffer, mode, range, options || {})'));
  });

  await runTest('pdf.worker.js handleSplitPdf signature accepts options = {}', () => {
    assert.ok(workerSrc.includes('async function handleSplitPdf(arrayBuffer, mode, range, options = {})'));
  });

  await runTest('pdf.worker.js handleSplitPdf executes cleanAndRefitDocument for scanned documents', () => {
    assert.ok(workerSrc.includes('srcDoc = await cleanAndRefitDocument(srcDoc'));
    assert.ok(workerSrc.includes('options.autoCropBlackBorders || options.smartCrop'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Studio UI Integration Verification
  // -----------------------------------------------------------------------------

  const organizeUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/OrganizePdf.jsx'), 'utf8');
  const rotateUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/RotatePdf.jsx'), 'utf8');
  const splitUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/SplitPdf.jsx'), 'utf8');
  const removeUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/RemovePages.jsx'), 'utf8');
  const extractUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/ExtractPages.jsx'), 'utf8');

  await runTest('OrganizePdf.jsx imports useSmartCropper and SmartCropperToolbarButton', () => {
    assert.ok(organizeUiSrc.includes("import useSmartCropper from '../../hooks/useSmartCropper';"));
    assert.ok(organizeUiSrc.includes("import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';"));
    assert.ok(organizeUiSrc.includes("import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';"));
  });

  await runTest('OrganizePdf.jsx instantiates useSmartCropper hook', () => {
    assert.ok(organizeUiSrc.includes('const cropper = useSmartCropper({ totalPages: pageCards.length });'));
  });

  await runTest('OrganizePdf.jsx renders SmartCropperToolbarButton in toolbar', () => {
    assert.ok(organizeUiSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
  });

  await runTest('OrganizePdf.jsx renders solid white background silver icon badge for clean pages', () => {
    assert.ok(organizeUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(organizeUiSrc.includes('text-slate-500">check_circle</span>'));
    assert.ok(organizeUiSrc.includes('Clean Page'));
  });

  await runTest('OrganizePdf.jsx passes cropOptions with docCropBoxes to organizePdf engine', () => {
    assert.ok(organizeUiSrc.includes('organizePdf(files, pageCards, setProgress, cropOptions)'));
  });

  await runTest('RotatePdf.jsx imports useSmartCropper and SmartCropperToolbarButton', () => {
    assert.ok(rotateUiSrc.includes("import useSmartCropper from '../../hooks/useSmartCropper';"));
    assert.ok(rotateUiSrc.includes("import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';"));
    assert.ok(rotateUiSrc.includes("import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';"));
  });

  await runTest('RotatePdf.jsx instantiates useSmartCropper hook', () => {
    assert.ok(rotateUiSrc.includes('const cropper = useSmartCropper({ totalPages: pageCards.length });'));
  });

  await runTest('RotatePdf.jsx renders SmartCropperToolbarButton in toolbar', () => {
    assert.ok(rotateUiSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
  });

  await runTest('RotatePdf.jsx renders solid white background silver icon badge for clean pages', () => {
    assert.ok(rotateUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(rotateUiSrc.includes('text-slate-500">check_circle</span>'));
    assert.ok(rotateUiSrc.includes('Clean Page'));
  });

  await runTest('RotatePdf.jsx passes cropOptions with docCropBoxes to organizePdf engine', () => {
    assert.ok(rotateUiSrc.includes('organizePdf(files, pageCards, setProgress, cropOptions)'));
  });

  await runTest('SplitPdf.jsx imports useSmartCropper and SmartCropperToolbarButton', () => {
    assert.ok(splitUiSrc.includes("import useSmartCropper from '../../hooks/useSmartCropper';"));
    assert.ok(splitUiSrc.includes("import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';"));
    assert.ok(splitUiSrc.includes("import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';"));
  });

  await runTest('SplitPdf.jsx instantiates useSmartCropper hook with totalPages', () => {
    assert.ok(splitUiSrc.includes('const cropper = useSmartCropper({ totalPages });'));
  });

  await runTest('SplitPdf.jsx renders SmartCropperToolbarButton in toolbar', () => {
    assert.ok(splitUiSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
  });

  await runTest('SplitPdf.jsx renders solid white background silver icon badge for clean pages', () => {
    assert.ok(splitUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(splitUiSrc.includes('text-slate-500">check_circle</span>'));
    assert.ok(splitUiSrc.includes('Clean Page'));
  });

  await runTest('SplitPdf.jsx passes cropOptions with docCropBox to localSplitPdf engine', () => {
    assert.ok(splitUiSrc.includes('localSplitPdf(files[activeFileIndex], localMode, localRange, setProgress, cropOptions)'));
  });

  await runTest('RemovePages.jsx imports useSmartCropper and SmartCropperToolbarButton', () => {
    assert.ok(removeUiSrc.includes("import useSmartCropper from '../../hooks/useSmartCropper';"));
    assert.ok(removeUiSrc.includes("import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';"));
    assert.ok(removeUiSrc.includes("import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';"));
  });

  await runTest('RemovePages.jsx instantiates useSmartCropper hook with totalPages', () => {
    assert.ok(removeUiSrc.includes('const cropper = useSmartCropper({ totalPages });'));
  });

  await runTest('RemovePages.jsx renders SmartCropperToolbarButton in toolbar', () => {
    assert.ok(removeUiSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
  });

  await runTest('RemovePages.jsx renders solid white background silver icon badge for clean pages', () => {
    assert.ok(removeUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(removeUiSrc.includes('text-slate-500">check_circle</span>'));
    assert.ok(removeUiSrc.includes('Clean Page'));
  });

  await runTest('RemovePages.jsx passes cropOptions with docCropBox to removePages engine', () => {
    assert.ok(removeUiSrc.includes('removePages(files[activeFileIndex], selectedIndices, setProgress, cropOptions)'));
  });

  await runTest('ExtractPages.jsx imports useSmartCropper and SmartCropperToolbarButton', () => {
    assert.ok(extractUiSrc.includes("import useSmartCropper from '../../hooks/useSmartCropper';"));
    assert.ok(extractUiSrc.includes("import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';"));
    assert.ok(extractUiSrc.includes("import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';"));
  });

  await runTest('ExtractPages.jsx instantiates useSmartCropper hook with totalPages', () => {
    assert.ok(extractUiSrc.includes('const cropper = useSmartCropper({ totalPages });'));
  });

  await runTest('ExtractPages.jsx renders SmartCropperToolbarButton in toolbar', () => {
    assert.ok(extractUiSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
  });

  await runTest('ExtractPages.jsx renders solid white background silver icon badge for clean pages', () => {
    assert.ok(extractUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(extractUiSrc.includes('text-slate-500">check_circle</span>'));
    assert.ok(extractUiSrc.includes('Clean Page'));
  });

  await runTest('ExtractPages.jsx passes cropOptions with docCropBox to extractPages engine', () => {
    assert.ok(extractUiSrc.includes('extractPages(') && extractUiSrc.includes('cropOptions'));
    assert.ok(extractUiSrc.includes('docCropBox: cropper.isActive ? activeCropBox : null'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Visual & UX Invariant Verifications (Zero Hyphens & Parity)
  // -----------------------------------------------------------------------------

  await runTest('OrganizePdf.jsx card badges contain zero hyphens', () => {
    assert.ok(!organizeUiSrc.includes('Clean-Page'));
    assert.ok(!organizeUiSrc.includes('Borders-Detected'));
    assert.ok(organizeUiSrc.includes('<span>Clean Page</span>'));
    assert.ok(organizeUiSrc.includes('<span>Borders Detected</span>'));
    assert.ok(organizeUiSrc.includes('<span>Cropped</span>'));
  });

  await runTest('RotatePdf.jsx card badges contain zero hyphens', () => {
    assert.ok(!rotateUiSrc.includes('Clean-Page'));
    assert.ok(!rotateUiSrc.includes('Borders-Detected'));
    assert.ok(rotateUiSrc.includes('<span>Clean Page</span>'));
    assert.ok(rotateUiSrc.includes('<span>Borders Detected</span>'));
    assert.ok(rotateUiSrc.includes('<span>Cropped</span>'));
  });

  await runTest('SplitPdf.jsx card badges contain zero hyphens', () => {
    assert.ok(!splitUiSrc.includes('Clean-Page'));
    assert.ok(!splitUiSrc.includes('Borders-Detected'));
    assert.ok(splitUiSrc.includes('<span>Clean Page</span>'));
    assert.ok(splitUiSrc.includes('<span>Borders Detected</span>'));
    assert.ok(splitUiSrc.includes('<span>Cropped</span>'));
  });

  await runTest('RemovePages.jsx card badges contain zero hyphens', () => {
    assert.ok(!removeUiSrc.includes('Clean-Page'));
    assert.ok(!removeUiSrc.includes('Borders-Detected'));
    assert.ok(removeUiSrc.includes('<span>Clean Page</span>'));
    assert.ok(removeUiSrc.includes('<span>Borders Detected</span>'));
    assert.ok(removeUiSrc.includes('<span>Cropped</span>'));
  });

  await runTest('ExtractPages.jsx card badges contain zero hyphens', () => {
    assert.ok(!extractUiSrc.includes('Clean-Page'));
    assert.ok(!extractUiSrc.includes('Borders-Detected'));
    assert.ok(extractUiSrc.includes('<span>Clean Page</span>'));
    assert.ok(extractUiSrc.includes('<span>Borders Detected</span>'));
    assert.ok(extractUiSrc.includes('<span>Cropped</span>'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Empirical Runtime cleanAndRefitDocument Invariant Simulation
  // -----------------------------------------------------------------------------

  await runTest('cleanAndRefitDocument cleanly scales cropped page to match original dimensions', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4 portrait
    page.drawText('Test Content', { x: 50, y: 750, size: 20 });

    const fakeCropBox = {
      hasBlackBorders: true,
      cropTop: 20,
      cropBottom: 20,
      cropLeft: 15,
      cropRight: 15
    };

    const processedDoc = await cleanAndRefitDocument(doc, { 0: fakeCropBox }, { margin: 0 });
    const processedPage = processedDoc.getPage(0);
    const { width, height } = processedPage.getSize();

    // Mathematical formula assertion: must restore exactly back to 595.28 x 841.89
    assert.strictEqual(Math.round(width * 100) / 100, 595.28);
    assert.strictEqual(Math.round(height * 100) / 100, 841.89);
  });

  await runTest('cleanAndRefitDocument bypasses clean pages with 0 black borders', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 700]);
    page.drawText('Clean Document Without Scan Borders', { x: 50, y: 600, size: 14 });

    const cleanCropBox = {
      hasBlackBorders: false,
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0
    };

    const processedDoc = await cleanAndRefitDocument(doc, { 0: cleanCropBox }, { margin: 0 });
    const processedPage = processedDoc.getPage(0);
    const { width, height } = processedPage.getSize();

    assert.strictEqual(width, 500);
    assert.strictEqual(height, 700);
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: Subpixel Coordinate Conversion & Hook Invariants
  // -----------------------------------------------------------------------------

  const { computeCleanPdfCropBox } = await import('../../src/utils/pdfZoneScanner.js');
  const useSmartCropperSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useSmartCropper.js'), 'utf8');
  const toolbarBtnSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperToolbarButton.jsx'), 'utf8');

  await runTest('computeCleanPdfCropBox calculates exact mathematical point transformations at scale 0.35', () => {
    const borderResult = {
      hasBlackBorders: true,
      cropTop: 14,     // 14px at scale 0.35 -> 40pt
      cropBottom: 7,   // 7px at scale 0.35 -> 20pt
      cropLeft: 21,    // 21px at scale 0.35 -> 60pt
      cropRight: 35    // 35px at scale 0.35 -> 100pt
    };
    const pageSize = { width: 595.28, height: 841.89 };
    const scale = 0.35;

    const cropBox = computeCleanPdfCropBox(borderResult, pageSize, scale);
    assert.strictEqual(Math.round(cropBox.cropTop), 40);
    assert.strictEqual(Math.round(cropBox.cropBottom), 20);
    assert.strictEqual(Math.round(cropBox.cropLeft), 60);
    assert.strictEqual(Math.round(cropBox.cropRight), 100);
    assert.strictEqual(cropBox.hasBlackBorders, true);
  });

  await runTest('computeCleanPdfCropBox returns cropX, cropY, cropWidth, cropHeight in PDF coordinate space', () => {
    const borderResult = {
      hasBlackBorders: true,
      cropTop: 14,
      cropBottom: 7,
      cropLeft: 21,
      cropRight: 35
    };
    const pageSize = { width: 595.28, height: 841.89 };
    const scale = 0.35;

    const cropBox = computeCleanPdfCropBox(borderResult, pageSize, scale);
    // cropX = 60, cropY = 20, cropWidth = 595.28 - 60 - 100 = 435.28, cropHeight = 841.89 - 40 - 20 = 781.89
    assert.strictEqual(Math.round(cropBox.cropX), 60);
    assert.strictEqual(Math.round(cropBox.cropY), 20);
    assert.strictEqual(Math.round(cropBox.cropWidth * 100) / 100, 435.28);
    assert.strictEqual(Math.round(cropBox.cropHeight * 100) / 100, 781.89);
  });

  await runTest('useSmartCropper.js defaults cleanMargin to 0 for authentic dimension restoration', () => {
    assert.ok(useSmartCropperSrc.includes('cleanMargin: 0') || useSmartCropperSrc.includes('return typeof prefMargin === \'number\' ? prefMargin : 0;'));
  });

  await runTest('useSmartCropper.js enables all 4 edges by default', () => {
    assert.ok(useSmartCropperSrc.includes('enabledEdges, setEnabledEdges] = useState({ top: true, bottom: true, left: true, right: true })'));
  });

  await runTest('useSmartCropper.js getEngineOptions exports autoCropBlackBorders and pageCropBoxes', () => {
    assert.ok(useSmartCropperSrc.includes('autoCropBlackBorders: true'));
    assert.ok(useSmartCropperSrc.includes('pageCropBoxes: pdfCropBoxes'));
  });

  await runTest('SmartCropperToolbarButton.jsx provides 1-click Clean Borders activation', () => {
    assert.ok(toolbarBtnSrc.includes('handleActivateClick'));
    assert.ok(toolbarBtnSrc.includes('Clean Borders'));
  });

  await runTest('SmartCropperToolbarButton.jsx provides revert undo action', () => {
    assert.ok(toolbarBtnSrc.includes('onClick={() => revert()}'));
    assert.ok(toolbarBtnSrc.includes('undo'));
  });

  await runTest('MergePdf.jsx utilizes identical clean silver/white badge formula', () => {
    const mergeUiSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/MergePdf.jsx'), 'utf8');
    assert.ok(mergeUiSrc.includes('bg-white text-slate-600 border border-slate-200'));
    assert.ok(mergeUiSrc.includes('text-slate-500">check_circle</span>'));
  });

  console.log(`\n======================================================`);
  console.log(`Results: ${passedTests} / ${totalTests} assertions passed cleanly.`);
  console.log(`======================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
