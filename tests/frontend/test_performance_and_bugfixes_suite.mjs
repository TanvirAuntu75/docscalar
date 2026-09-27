// ═══════════════════════════════════════════════════════════════════════════════
// DOCSCALAR PERFORMANCE OPTIMIZATIONS & CRITICAL BUGFIXES MOLECULAR TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertStrictEqual(actual, expected, message) {
  assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`);
}

console.log('======================================================================');
console.log('  DOCSCALAR PERFORMANCE & BUGFIXES MOLECULAR TEST SUITE               ');
console.log('======================================================================\n');

// ── AREA 1: QrGenerator formatFileSize Resolution ─────────────────────────────
console.log('[AREA 1: QrGenerator formatFileSize Resolution]');
const qrGeneratorSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/utility/QrGenerator.jsx'), 'utf8');

assert(
  qrGeneratorSrc.includes("import { formatFileSize } from '../../utils/constants'"),
  'QrGenerator.jsx imports formatFileSize from utils/constants'
);

assert(
  qrGeneratorSrc.includes('{formatFileSize(result.blob.size)}'),
  'QrGenerator.jsx correctly formats result blob size with formatFileSize'
);

assert(
  !qrGeneratorSrc.includes('formatFileSize = undefined'),
  'QrGenerator.jsx does not shadow formatFileSize'
);

// Verify formatFileSize functionality from constants.js
import { formatFileSize } from '../../src/utils/constants.js';
assertStrictEqual(formatFileSize(0), '0 B', 'formatFileSize(0) returns "0 B"');
assertStrictEqual(formatFileSize(1024), '1 KB', 'formatFileSize(1024) returns "1 KB"');
assertStrictEqual(formatFileSize(10 * 1024 * 1024), '10 MB', 'formatFileSize(10MB) returns "10 MB"');
assertStrictEqual(formatFileSize(1024 * 1024 * 1024), '1 GB', 'formatFileSize(1GB) returns "1 GB"');

// ── AREA 2: Home.jsx selectedTypeGroup Resolution ─────────────────────────────
console.log('\n[AREA 2: Home.jsx selectedTypeGroup Resolution]');
const homeSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/Home.jsx'), 'utf8');

assert(
  homeSrc.includes('const selectedTypeGroup = getSelectedTypeGroup();'),
  'Home.jsx defines selectedTypeGroup from getSelectedTypeGroup() before rendering'
);

assert(
  homeSrc.includes("{selectedTypeGroup ? selectedTypeGroup.toUpperCase() : 'mixed'}"),
  'Home.jsx uses selectedTypeGroup safely in batch counter header'
);

assert(
  homeSrc.includes("selectedTypeGroup === 'pdf'"),
  'Home.jsx tests selectedTypeGroup === "pdf" safely'
);

assert(
  homeSrc.includes("selectedTypeGroup === 'image'"),
  'Home.jsx tests selectedTypeGroup === "image" safely'
);

assert(
  homeSrc.includes('batchGroup: selectedTypeGroup || \'mixed\''),
  'Home.jsx sets batchGroup from selectedTypeGroup'
);

// ── AREA 3: SignPdf onReset Resolution ─────────────────────────────────────────
console.log('\n[AREA 3: SignPdf onReset Resolution]');
const signPdfSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/pdf/SignPdf.jsx'), 'utf8');

assert(
  signPdfSrc.includes('onReset={handleReset}'),
  'SignPdf.jsx wires onReset to handleReset function'
);

assert(
  !signPdfSrc.includes('onReset={resetWorkspace}'),
  'SignPdf.jsx does not reference nonexistent resetWorkspace'
);

assert(
  signPdfSrc.includes('const handleReset = () => {'),
  'SignPdf.jsx defines handleReset function'
);

// ── AREA 4: unOcrPdf PDFName Import ────────────────────────────────────────────
console.log('\n[AREA 4: unOcrPdf PDFName Import]');
const unOcrSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/engines/pdf/unOcrPdf.js'), 'utf8');

assert(
  unOcrSrc.includes("import { PDFDocument, PDFName } from 'pdf-lib';"),
  'unOcrPdf.js imports PDFName alongside PDFDocument from pdf-lib'
);

assert(
  unOcrSrc.includes("PDFName.of('Subtype')"),
  'unOcrPdf.js resolves PDF Subtype via PDFName.of'
);

assert(
  unOcrSrc.includes("PDFName.of('Length')"),
  'unOcrPdf.js resolves PDF Length via PDFName.of'
);

assert(
  unOcrSrc.includes("PDFName.of('Filter')"),
  'unOcrPdf.js deletes Filter dictionary key via PDFName.of'
);

// ── AREA 5: StitchCanvas Undeclared files Fix ──────────────────────────────────
console.log('\n[AREA 5: StitchCanvas Undeclared files Fix]');
const stitchCanvasSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/StitchCanvas.jsx'), 'utf8');

assert(
  stitchCanvasSrc.includes('const inputItems = itemsForEngine && itemsForEngine.length > 0 ? itemsForEngine : [mainFile];'),
  'StitchCanvas.jsx image-to-pdf fallback resolves to [mainFile] without referencing undeclared files'
);

assert(
  !stitchCanvasSrc.includes('(files && files.length > 0 ? files : [mainFile])'),
  'StitchCanvas.jsx no longer references undeclared files in image-to-pdf branch'
);

// ── AREA 6: Vite Config Pre-Bundling Optimization ─────────────────────────────
console.log('\n[AREA 6: Vite Config Pre-Bundling Optimization]');
const viteConfigSrc = fs.readFileSync(path.join(ROOT_DIR, 'vite.config.js'), 'utf8');

assert(
  viteConfigSrc.includes('include: ['),
  'vite.config.js configures optimizeDeps.include'
);

const expectedDeps = [
  'react',
  'react-dom',
  'react-router-dom',
  'framer-motion',
  'lucide-react',
  'pdf-lib',
  'pdfjs-dist',
  'xlsx',
  'jszip',
  'mammoth',
  'jspdf',
  'html2canvas',
  'qrcode',
  'animejs',
];

expectedDeps.forEach((dep) => {
  assert(
    viteConfigSrc.includes(`'${dep}'`),
    `vite.config.js optimizeDeps.include contains pre-bundled vendor '${dep}'`
  );
});

// ── AREA 7: LandingPage Direct Template Imports ───────────────────────────────
console.log('\n[AREA 7: LandingPage Direct Template Imports]');
const landingPageSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/LandingPage.jsx'), 'utf8');

assert(
  !landingPageSrc.includes("from '../engines/utility/resumeTemplates'"),
  'LandingPage.jsx does NOT import from 85-template barrel file resumeTemplates.js'
);

assert(
  landingPageSrc.includes("from '../engines/utility/templates/mariana'"),
  'LandingPage.jsx imports Mariana directly from templates/mariana'
);

assert(
  landingPageSrc.includes("from '../engines/utility/templates/olivia'"),
  'LandingPage.jsx imports Olivia directly from templates/olivia'
);

assert(
  landingPageSrc.includes("from '../engines/utility/templates/alvarado_slate'"),
  'LandingPage.jsx imports Alvarado Slate directly from templates/alvarado_slate'
);

// ── AREA 8: LandingPage 3D Carousel Performance ──────────────────────────────
console.log('\n[AREA 8: LandingPage 3D Carousel Performance]');

assert(
  landingPageSrc.includes('templateHtmlMap = useMemo('),
  'LandingPage.jsx Resume3DCarousel memoizes templateHtmlMap with useMemo'
);

assert(
  landingPageSrc.includes('const cvHtml = templateHtmlMap[tpl.name] || \'\';'),
  'LandingPage.jsx retrieves pre-rendered cvHtml from templateHtmlMap without recalculation'
);

assert(
  landingPageSrc.includes('loading="lazy"'),
  'LandingPage.jsx carousel iframe specifies loading="lazy"'
);

assert(
  landingPageSrc.includes('className="w-full h-full border-0 pointer-events-none select-none bg-white"'),
  'LandingPage.jsx iframe maintains clean pointer-events-none layout styling'
);

// ── Final Test Suite Summary ──────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`TEST SUITE SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED (TOTAL: ${totalAssertions})`);
console.log('======================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('ALL 35+ PERFORMANCE & BUGFIX ASSERTIONS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
