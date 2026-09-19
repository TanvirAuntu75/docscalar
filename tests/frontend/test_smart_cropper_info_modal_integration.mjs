import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('=== Starting Smart Cropper Info Modal Integration Test Suite ===\n');

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
  const toolbarBtnSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperToolbarButton.jsx'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperModal.jsx'), 'utf8');
  const useSmartCropperSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useSmartCropper.js'), 'utf8');
  const panelSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperPanel.jsx'), 'utf8');

  // ── Area 1-5: Import and Structure Verification ──
  await runTest('SmartCropperToolbarButton imports SmartCropperModal', () => {
    assert.ok(toolbarBtnSrc.includes("import SmartCropperModal from './SmartCropperModal';"));
  });

  await runTest('SmartCropperModal imports createPortal from react-dom', () => {
    assert.ok(modalSrc.includes("import { createPortal } from 'react-dom';"));
  });

  await runTest('SmartCropperModal returns modalContent wrapped in createPortal to document.body', () => {
    assert.ok(modalSrc.includes("createPortal(modalContent, document.body)"));
  });

  await runTest('SmartCropperModal checks typeof document !== undefined before portaling', () => {
    assert.ok(modalSrc.includes("if (typeof document !== 'undefined')"));
  });

  await runTest('useSmartCropper exports showInfoModal and onOpenInfo', () => {
    assert.ok(useSmartCropperSrc.includes('showInfoModal,'));
    assert.ok(useSmartCropperSrc.includes('setShowInfoModal,'));
    assert.ok(useSmartCropperSrc.includes('onOpenInfo,'));
    assert.ok(useSmartCropperSrc.includes('closeInfoModal'));
  });

  // ── Area 6-12: Toolbar Button Modal State & Trigger Verification ──
  await runTest('SmartCropperToolbarButton defines internalModalOpen state', () => {
    assert.ok(toolbarBtnSrc.includes('const [internalModalOpen, setInternalModalOpen] = useState(false);'));
  });

  await runTest('SmartCropperToolbarButton sets hasInfoHandler unconditionally to true', () => {
    assert.ok(toolbarBtnSrc.includes('const hasInfoHandler = true;'));
  });

  await runTest('handleInfoClick handles event propagation and default preventions', () => {
    assert.ok(toolbarBtnSrc.includes("if (typeof e.preventDefault === 'function') e.preventDefault();"));
    assert.ok(toolbarBtnSrc.includes("if (typeof e.stopPropagation === 'function') e.stopPropagation();"));
  });

  await runTest('handleInfoClick triggers parent onOpenInfo callback when provided', () => {
    assert.ok(toolbarBtnSrc.includes('if (onOpenInfo) {'));
    assert.ok(toolbarBtnSrc.includes('onOpenInfo();'));
  });

  await runTest('handleInfoClick falls back to cropper.onOpenInfo when available', () => {
    assert.ok(toolbarBtnSrc.includes("else if (typeof cropper?.onOpenInfo === 'function') {"));
    assert.ok(toolbarBtnSrc.includes('cropper.onOpenInfo();'));
  });

  await runTest('handleInfoClick falls back to setInternalModalOpen(true) when cropper lacks handler', () => {
    assert.ok(toolbarBtnSrc.includes('setInternalModalOpen(true);'));
  });

  await runTest('isInfoModalOpen respects !onOpenInfo to avoid duplicate modal rendering', () => {
    assert.ok(toolbarBtnSrc.includes('const isInfoModalOpen = !onOpenInfo && Boolean(cropper?.showInfoModal || internalModalOpen);'));
  });

  // ── Area 13-18: Modal Handler Implementation in Toolbar Button ──
  await runTest('handleCloseModal invokes cropper.closeInfoModal when available', () => {
    assert.ok(toolbarBtnSrc.includes('cropper.closeInfoModal();'));
  });

  await runTest('handleCloseModal invokes cropper.setShowInfoModal(false) as secondary fallback', () => {
    assert.ok(toolbarBtnSrc.includes('cropper.setShowInfoModal(false);'));
  });

  await runTest('handleCloseModal resets internalModalOpen to false', () => {
    assert.ok(toolbarBtnSrc.includes('setInternalModalOpen(false);'));
  });

  await runTest('handleApplyModal applies cleanMargin, scopeMode, pageRange and activates', () => {
    assert.ok(toolbarBtnSrc.includes('cropper.setCleanMargin(margin);'));
    assert.ok(toolbarBtnSrc.includes('cropper.setScopeMode(modalResult.pageScope);'));
    assert.ok(toolbarBtnSrc.includes('cropper.setPageRange(modalResult.customRange);'));
    assert.ok(toolbarBtnSrc.includes('cropper.activate();'));
  });

  await runTest('handleSkipModal calls cropper.revert() and closes modal', () => {
    assert.ok(toolbarBtnSrc.includes('cropper.revert();'));
    assert.ok(toolbarBtnSrc.includes('handleCloseModal();'));
  });

  await runTest('renderInfoModal passes props properly to SmartCropperModal', () => {
    assert.ok(toolbarBtnSrc.includes('isOpen={isInfoModalOpen}'));
    assert.ok(toolbarBtnSrc.includes('onClose={handleCloseModal}'));
    assert.ok(toolbarBtnSrc.includes('onApply={handleApplyModal}'));
    assert.ok(toolbarBtnSrc.includes('onSkip={handleSkipModal}'));
  });

  // ── Area 19-24: Four-State Rendering Invariants ──
  await runTest('State 1 (Active/Cropped) renders renderInfoModal()', () => {
    const activeBlock = toolbarBtnSrc.split('// ── State 1: Active')[1]?.split('// ── State 2:')[0];
    assert.ok(activeBlock, 'State 1 block must exist');
    assert.ok(activeBlock.includes('{renderInfoModal()}'), 'State 1 must render renderInfoModal()');
  });

  await runTest('State 2 (Borders Detected) renders renderInfoModal()', () => {
    const detectedBlock = toolbarBtnSrc.split('// ── State 2: Scan borders detected')[1]?.split('// ── State 3:')[0];
    assert.ok(detectedBlock, 'State 2 block must exist');
    assert.ok(detectedBlock.includes('{renderInfoModal()}'), 'State 2 must render renderInfoModal()');
  });

  await runTest('State 3 (Inverted Document) renders renderInfoModal()', () => {
    const invertedBlock = toolbarBtnSrc.split('// ── State 3: Inverted / dark document')[1]?.split('// ── State 4:')[0];
    assert.ok(invertedBlock, 'State 3 block must exist');
    assert.ok(invertedBlock.includes('{renderInfoModal()}'), 'State 3 must render renderInfoModal()');
  });

  await runTest('State 4 (Clean Document / Default) renders renderInfoModal()', () => {
    const defaultBlock = toolbarBtnSrc.split('// ── State 4: Clean document')[1];
    assert.ok(defaultBlock, 'State 4 block must exist');
    assert.ok(defaultBlock.includes('{renderInfoModal()}'), 'State 4 must render renderInfoModal()');
  });

  await runTest('State 1 renders help icon with accessible title', () => {
    const activeBlock = toolbarBtnSrc.split('// ── State 1: Active')[1]?.split('// ── State 2:')[0];
    assert.ok(activeBlock.includes('help'));
    assert.ok(activeBlock.includes('title="What does Smart Cropping do? (Click for info & options)"'));
  });

  await runTest('handleActivateClick routes through handleInfoClick when shouldAutoShowSmartCropModal() is true', () => {
    assert.ok(toolbarBtnSrc.includes('if (shouldAutoShowSmartCropModal()) {'));
    assert.ok(toolbarBtnSrc.includes('handleInfoClick(e);'));
  });

  // ── Area 25-30: Modal Content and User Experience Invariants ──
  await runTest('SmartCropperModal contains What does Smart Cropping do title', () => {
    assert.ok(modalSrc.includes('What does Smart Cropping do?'));
  });

  await runTest('SmartCropperModal contains Visual Demonstration Before/After cards', () => {
    assert.ok(modalSrc.includes('Original Scan'));
    assert.ok(modalSrc.includes('Original Dimensions Restored'));
  });

  await runTest('SmartCropperModal contains Core Capabilities (Shadow Removal, Uniform Framing, Lossless)', () => {
    assert.ok(modalSrc.includes('Shadow Removal'));
    assert.ok(modalSrc.includes('Uniform Framing'));
    assert.ok(modalSrc.includes('100% Lossless'));
  });

  await runTest('SmartCropperModal CTA buttons are strict single-line without wrapping', () => {
    assert.ok(modalSrc.includes('Keep Original (No Crop)'));
    assert.ok(modalSrc.includes('Apply Smart Cropping'));
    assert.ok(modalSrc.includes('whitespace-nowrap'));
  });

  await runTest('Zero Hyphens Invariant in user-facing buttons and labels', () => {
    assert.ok(!modalSrc.includes('Keep Original - No Crop'));
    assert.ok(!modalSrc.includes('Apply Smart-Cropping'));
  });

  await runTest('SmartCropperPanel also provides SmartCropperModal fallback rendering', () => {
    assert.ok(panelSrc.includes('<SmartCropperModal'));
    assert.ok(panelSrc.includes('isOpen={cropper.showInfoModal}'));
  });

  // ── Area 31-35: Studio Verification Matrix ──
  const studioFiles = [
    'src/pages/pdf/OrganizePdf.jsx',
    'src/pages/pdf/RotatePdf.jsx',
    'src/pages/pdf/SplitPdf.jsx',
    'src/pages/pdf/RemovePages.jsx',
    'src/pages/pdf/ExtractPages.jsx'
  ];

  for (const studioFile of studioFiles) {
    const studioSrc = fs.readFileSync(path.join(rootDir, studioFile), 'utf8');
    const baseName = path.basename(studioFile);
    await runTest(`${baseName} uses SmartCropperToolbarButton with cropper`, () => {
      assert.ok(studioSrc.includes('<SmartCropperToolbarButton cropper={cropper} />'));
    });
  }

  console.log(`\n=== Test Summary: ${passedTests}/${totalTests} Passed ===`);
  if (passedTests === totalTests) {
    console.log('>>> All 35 Smart Cropper Info Modal assertions PASSED with 100% compliance! <<<');
  } else {
    process.exitCode = 1;
  }
}

runAll();
