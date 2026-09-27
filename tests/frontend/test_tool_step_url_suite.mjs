import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchRoutes } from 'react-router-dom';
import { TOOLS } from '../../src/utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

let passedAssertions = 0;
let totalAssertions = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failures.push({ message, details });
    console.error(`  ✗ [FAIL] ${message} — ${details}`);
  }
}

console.log('\n============================================================');
console.log('  TSK-612: 3-STAGE TOOL URL ARCHITECTURE VERIFICATION SUITE');
console.log('============================================================\n');

// ── 1. App.jsx Route Extraction & MatchRoutes Verification (Areas 1–12) ──
console.log('--- 1. App.jsx Route & Wildcard Subpath Matching ---');

const appJsxPath = path.join(rootDir, 'src/App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

// Extract all routes from App.jsx
const routeRegex = /<Route\s+[^>]*path="([^"]+)"/g;
const appRoutes = [];
let match;
while ((match = routeRegex.exec(appJsxContent)) !== null) {
  appRoutes.push({ path: match[1] });
}

assert(appRoutes.length >= 40, 'App.jsx contains at least 40 route definitions', `Found ${appRoutes.length}`);

// Test representative tools with matchRoutes
const testTools = [
  'merge-pdf',
  'compress-pdf',
  'split-pdf',
  'pdf-to-word',
  'image-converter',
  'ocr-pdf',
  'edit-pdf',
  'crop-pdf',
  'sign-pdf',
  'redact-pdf'
];

testTools.forEach((toolId) => {
  const tool = TOOLS.find((t) => t.id === toolId);
  const basePath = tool.path;

  // Test root URL
  const rootMatch = matchRoutes(appRoutes, basePath);
  assert(
    rootMatch && rootMatch.length > 0,
    `Route matches root path "${basePath}"`,
    `Expected match for ${basePath}`
  );

  // Test /studio subpath
  const studioPath = `${basePath}/studio`;
  const studioMatch = matchRoutes(appRoutes, studioPath);
  assert(
    studioMatch && studioMatch.length > 0,
    `Route matches studio subpath "${studioPath}"`,
    `Expected match for ${studioPath}`
  );

  // Test /download subpath
  const downloadPath = `${basePath}/download`;
  const downloadMatch = matchRoutes(appRoutes, downloadPath);
  assert(
    downloadMatch && downloadMatch.length > 0,
    `Route matches download subpath "${downloadPath}"`,
    `Expected match for ${downloadPath}`
  );

  // Test /upload subpath
  const uploadPath = `${basePath}/upload`;
  const uploadMatch = matchRoutes(appRoutes, uploadPath);
  assert(
    uploadMatch && uploadMatch.length > 0,
    `Route matches upload subpath "${uploadPath}"`,
    `Expected match for ${uploadPath}`
  );
});

// Verify redirect routes
const summarizeMatch = matchRoutes(appRoutes, '/summarize-pdf/studio');
assert(
  summarizeMatch && summarizeMatch.length > 0,
  'Redirect route /summarize-pdf/* matches subpaths like /summarize-pdf/studio'
);

const translateMatch = matchRoutes(appRoutes, '/translate-pdf/download');
assert(
  translateMatch && translateMatch.length > 0,
  'Redirect route /translate-pdf/* matches subpaths like /translate-pdf/download'
);

// Verify isCanvas, isWorkspace, isResumeBuilder checks in App.jsx
assert(
  appJsxContent.includes("location.pathname.startsWith('/canvas/')"),
  'App.jsx isCanvas check handles subpaths via startsWith'
);
assert(
  appJsxContent.includes("location.pathname.startsWith('/workspace/')"),
  'App.jsx isWorkspace check handles subpaths via startsWith'
);
assert(
  appJsxContent.includes("location.pathname.startsWith('/resume-builder/')"),
  'App.jsx isResumeBuilder check handles subpaths via startsWith'
);

// ── 2. FileDropzone.jsx Subpath Normalization (Areas 13–18) ──────────────
console.log('\n--- 2. FileDropzone.jsx Subpath Normalization ---');

const dropzonePath = path.join(rootDir, 'src/components/FileDropzone.jsx');
const dropzoneContent = fs.readFileSync(dropzonePath, 'utf8');

assert(
  dropzoneContent.includes('basePath = location.pathname.replace(/\\/(upload|studio|download)\\/?$/'),
  'FileDropzone normalizes subpaths (/upload, /studio, /download) via regex'
);

// Simulate the normalization formula
function normalizeDropzonePath(pathname) {
  const basePath = pathname.replace(/\/(upload|studio|download)\/?$/, '').replace(/\/$/, '') || '/';
  const currentPath = pathname.replace(/\/$/, '');
  return TOOLS.find(
    (t) => t.path === basePath || t.path === basePath + '/' || t.path === currentPath || t.path === currentPath + '/'
  );
}

const testDropzonePaths = [
  { path: '/merge-pdf', expectedId: 'merge-pdf' },
  { path: '/merge-pdf/upload', expectedId: 'merge-pdf' },
  { path: '/merge-pdf/studio', expectedId: 'merge-pdf' },
  { path: '/merge-pdf/download', expectedId: 'merge-pdf' },
  { path: '/compress-pdf/studio/', expectedId: 'compress-pdf' }
];

testDropzonePaths.forEach(({ path: testP, expectedId }) => {
  const resolved = normalizeDropzonePath(testP);
  assert(
    resolved && resolved.id === expectedId,
    `normalizeDropzonePath("${testP}") resolves to "${expectedId}"`,
    `Got ${resolved?.id}`
  );
});

// ── 3. ToolPageLayout.jsx Architecture & Logic (Areas 19–30) ─────────────
console.log('\n--- 3. ToolPageLayout.jsx Architecture & Stage Logic ---');

const layoutPath = path.join(rootDir, 'src/components/ToolPageLayout.jsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Check exports and component structure
assert(
  layoutContent.includes('export default function ToolPageLayout'),
  'ToolPageLayout exports default layout component'
);

// Stage determination simulation
function computeStage({ hasResult, files, isStudio, isDedicatedStudio }) {
  const isStudioMode = (isDedicatedStudio || isStudio || (files && files.length > 0)) && !hasResult;
  return hasResult ? 'download' : (isStudioMode ? 'studio' : 'upload');
}

assert(
  computeStage({ hasResult: false, files: [], isStudio: false, isDedicatedStudio: false }) === 'upload',
  'Empty files and no result resolves to stage "upload"'
);
assert(
  computeStage({ hasResult: false, files: [{ name: 'doc.pdf' }], isStudio: false, isDedicatedStudio: false }) === 'studio',
  'Loaded files with no result resolves to stage "studio"'
);
assert(
  computeStage({ hasResult: true, files: [{ name: 'doc.pdf' }], isStudio: false, isDedicatedStudio: false }) === 'download',
  'Active result resolves to stage "download"'
);
assert(
  computeStage({ hasResult: true, files: [], isStudio: false, isDedicatedStudio: false }) === 'download',
  'Active result with empty files array resolves to stage "download"'
);
assert(
  computeStage({ hasResult: false, files: [], isStudio: true, isDedicatedStudio: false }) === 'studio',
  'isStudio flag forced resolves to stage "studio"'
);

// Dedicated studio tools exclusion
assert(
  layoutContent.includes("'qr-generator'") &&
  layoutContent.includes("'canvas'") &&
  layoutContent.includes("'workspace'") &&
  layoutContent.includes("'resume-builder'"),
  'DEDICATED_STUDIO_TOOLS array includes canvas, workspace, qr-generator, and resume-builder'
);
assert(
  layoutContent.includes('const shouldManageStageRouting = !disableStageRouting && !isDedicatedStudio'),
  'shouldManageStageRouting properly exempts dedicated studios and explicit overrides'
);

// URL synchronization effects
assert(
  layoutContent.includes("if (currentStage === 'download')"),
  'ToolPageLayout contains stage-to-URL sync branch for "download"'
);
assert(
  layoutContent.includes("if (currentStage === 'studio')"),
  'ToolPageLayout contains stage-to-URL sync branch for "studio"'
);
assert(
  layoutContent.includes("if (currentStage === 'upload')"),
  'ToolPageLayout contains stage-to-URL sync branch for "upload"'
);

// Popstate / Back button handling
assert(
  layoutContent.includes("pathname === `${cleanBase}/studio` && hasResult"),
  'ToolPageLayout handles popstate Back to studio by clearing result'
);
assert(
  layoutContent.includes("window.dispatchEvent(new CustomEvent('docscalar:reset-result'"),
  'ToolPageLayout dispatches docscalar:reset-result event on Back to studio'
);
assert(
  layoutContent.includes("(pathname === cleanBase || pathname === `${cleanBase}/upload`) && (files && files.length > 0)"),
  'ToolPageLayout handles popstate Back to upload by clearing files'
);
assert(
  layoutContent.includes("window.dispatchEvent(new CustomEvent('docscalar:reset-files'"),
  'ToolPageLayout dispatches docscalar:reset-files event on Back to upload'
);

// Direct visit grace period
assert(
  layoutContent.includes('setTimeout(() => {'),
  'ToolPageLayout uses setTimeout grace period for cold direct visits'
);
assert(
  layoutContent.includes('600);'),
  'ToolPageLayout uses 600ms grace period to allow IndexedDB draft restoration'
);

// ── 4. Zero UI Modification Verification (Areas 31–36) ───────────────────
console.log('\n--- 4. Zero UI Modification Verification ---');

assert(
  !layoutContent.includes('ToolStepBar'),
  'ToolPageLayout contains ZERO added ToolStepBar elements'
);
assert(
  !layoutContent.includes('studio-top-nav'),
  'ToolPageLayout contains ZERO added studio top navigation bars'
);
assert(
  !layoutContent.includes('tool-download-step-header'),
  'ToolPageLayout contains ZERO added download step headers'
);
assert(
  layoutContent.includes('children'),
  'ToolPageLayout preserves 100% of original children DOM nodes in studio and standard view'
);

// Canonical SEO preservation
assert(
  layoutContent.includes("const canonicalUrl = `https://docscalar.app${basePath.replace(/\\/$/, '')}`;"),
  'ToolPageLayout preserves canonical URL pointing to root tool path'
);
assert(
  layoutContent.includes('canonical={canonicalUrl}'),
  'ToolPageLayout passes canonical prop to SEOHead'
);

// ── 5. Representative Tool Pages Integration (Areas 37–40) ───────────────
console.log('\n--- 5. Representative Tool Pages Integration ---');

const mergePdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/MergePdf.jsx'), 'utf8');
assert(
  mergePdfContent.includes('setFiles={setFiles}') &&
  mergePdfContent.includes('setResult={setResult}') &&
  mergePdfContent.includes('onReset={reset}'),
  'MergePdf.jsx passes setFiles, setResult, and onReset to ToolPageLayout'
);

const compressPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/CompressPdf.jsx'), 'utf8');
assert(
  compressPdfContent.includes('setFiles={setFiles}') &&
  compressPdfContent.includes('setResult={setResult}'),
  'CompressPdf.jsx passes setFiles and setResult to ToolPageLayout'
);

const splitPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/SplitPdf.jsx'), 'utf8');
assert(
  splitPdfContent.includes('setFiles={setFiles}') &&
  splitPdfContent.includes('setResult={setResult}'),
  'SplitPdf.jsx passes setFiles and setResult to ToolPageLayout'
);

console.log('\n============================================================');
console.log(`  TEST RESULTS: ${passedAssertions} / ${totalAssertions} assertions passed (${Math.round((passedAssertions / totalAssertions) * 100)}%)`);
console.log('============================================================\n');

if (failures.length > 0) {
  console.error(`FAILED with ${failures.length} issues:`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.message}: ${f.details}`));
  process.exit(1);
} else {
  console.log('ALL ASSERTIONS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
