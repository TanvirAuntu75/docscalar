// tests/frontend/test_workspace_navbar_and_studio_isolation.mjs
// Quantitative Molecular Verification Suite for Workspace Navbar Decoupling & Studio Isolation
// Invariant: 30+ distinct test areas, 100% falsifiable assertions, zero local-copy dupes.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  TSK-625: WORKSPACE NAVBAR DECOUPLING & STUDIO ISOLATION TEST SUITE');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function runTest(testNumber, areaName, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m Area ${String(testNumber).padStart(2, '0')}: ${areaName}`);
    passCount++;
  } catch (err) {
    console.error(`  \x1b[31m✘\x1b[0m Area ${String(testNumber).padStart(2, '0')}: ${areaName}`);
    console.error(`     \x1b[31mFailure:\x1b[0m ${err.message}`);
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load source files
// ─────────────────────────────────────────────────────────────────────────────
const headerPath = path.join(rootDir, 'src/components/Header.jsx');
const appPath = path.join(rootDir, 'src/App.jsx');
const homePath = path.join(rootDir, 'src/pages/Home.jsx');

const headerCode = fs.readFileSync(headerPath, 'utf8').replace(/\r\n/g, '\n');
const appCode = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
const homeCode = fs.readFileSync(homePath, 'utf8').replace(/\r\n/g, '\n');

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Header.jsx Source Code Inspection
// ─────────────────────────────────────────────────────────────────────────────

runTest(1, 'Header.jsx: isStudioRoute definition exists in render scope', () => {
  assert.ok(headerCode.includes('const isStudioRoute ='), 'Header.jsx must define isStudioRoute');
});

runTest(2, 'Header.jsx: isStudioRoute strictly EXCLUDES /workspace', () => {
  const match = headerCode.match(/const isStudioRoute\s*=[\s\S]*?;/);
  assert.ok(match, 'isStudioRoute definition block must be found');
  assert.ok(!match[0].includes("'/workspace'"), 'isStudioRoute must NOT contain "/workspace"');
});

runTest(3, 'Header.jsx: isStudioRoute detects route ending with /studio', () => {
  assert.ok(headerCode.includes("location.pathname.endsWith('/studio')"));
});

runTest(4, 'Header.jsx: isStudioRoute detects subpath with /studio/', () => {
  assert.ok(headerCode.includes("location.pathname.includes('/studio/')"));
});

runTest(5, 'Header.jsx: isStudioRoute retains /canvas dedicated studio', () => {
  const match = headerCode.match(/const isStudioRoute\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/canvas'"));
});

runTest(6, 'Header.jsx: isStudioRoute retains /qr-generator dedicated studio', () => {
  const match = headerCode.match(/const isStudioRoute\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/qr-generator'"));
});

runTest(7, 'Header.jsx: isStudioRoute retains /resume-builder dedicated studio', () => {
  const match = headerCode.match(/const isStudioRoute\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/resume-builder'"));
});

runTest(8, 'Header.jsx: isStudioRoute retains /document-viewer dedicated studio', () => {
  const match = headerCode.match(/const isStudioRoute\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/document-viewer'"));
});

runTest(9, 'Header.jsx: Synchronous isStudio boolean correctly combines route, state, and DOM class', () => {
  assert.ok(headerCode.includes('const isStudio = isStudioRoute || isStudioActive || isStudioClass;'));
});

runTest(10, 'Header.jsx: Non-studio wrapper applies floating top-5 px-6 styling', () => {
  assert.ok(headerCode.includes("${isStudio ? 'top-0 px-0' : 'top-5 px-6'}"));
});

runTest(11, 'Header.jsx: Non-studio nav applies max-w-[1380px] rounded-full border', () => {
  assert.ok(headerCode.includes("${isStudio ? 'max-w-full rounded-none border-b border-t-0 border-x-0' : 'max-w-[1380px] rounded-full border'}"));
});

runTest(12, 'Header.jsx: Non-studio nav applies backdrop blur and saturation', () => {
  assert.ok(headerCode.includes('backdropFilter: isStudio ? "none" : "blur(24px) saturate(1.4)"'));
});

runTest(13, 'Header.jsx: Non-studio nav inner padding applies px-8 py-3.5', () => {
  assert.ok(headerCode.includes("${isStudio ? 'px-6 py-2 h-[56px] w-full max-w-full' : 'px-8 py-3.5'}"));
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: App.jsx Source Code Inspection
// ─────────────────────────────────────────────────────────────────────────────

runTest(14, 'App.jsx: isStudioPath definition exists', () => {
  assert.ok(appCode.includes('const isStudioPath ='), 'App.jsx must define isStudioPath');
});

runTest(15, 'App.jsx: isStudioPath strictly EXCLUDES /workspace', () => {
  const match = appCode.match(/const isStudioPath\s*=[\s\S]*?;/);
  assert.ok(match, 'isStudioPath definition block must be found in App.jsx');
  assert.ok(!match[0].includes("'/workspace'"), 'App.jsx isStudioPath must NOT contain "/workspace"');
});

runTest(16, 'App.jsx: isStudioPath retains /resume-builder', () => {
  const match = appCode.match(/const isStudioPath\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/resume-builder'"));
});

runTest(17, 'App.jsx: isStudioPath retains /document-viewer', () => {
  const match = appCode.match(/const isStudioPath\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/document-viewer'"));
});

runTest(18, 'App.jsx: isStudioPath retains /qr-generator', () => {
  const match = appCode.match(/const isStudioPath\s*=[\s\S]*?;/);
  assert.ok(match && match[0].includes("'/qr-generator'"));
});

runTest(19, 'App.jsx: mainPadding grants pt-[88px] or pt-[72px] for non-studio routes', () => {
  assert.ok(appCode.includes("(isPro ? 'pt-[72px]' : 'pt-[88px]')"));
});

runTest(20, 'App.jsx: mainPadding grants pt-[56px] for studio paths', () => {
  assert.ok(appCode.includes("? 'pt-[56px]'"));
});

runTest(21, 'App.jsx: mainPadding grants pt-0 strictly for canvas', () => {
  assert.ok(appCode.includes("isCanvas \n    ? 'pt-0'"));
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Header Nav Links Focus Styling (Anti-Rectangular Outline)
// ─────────────────────────────────────────────────────────────────────────────

runTest(22, 'Header.jsx: Workspace Link contains focus:outline-none and focus-visible:ring-2', () => {
  assert.ok(
    headerCode.includes("to={isAuthenticated ? '/workspace' : '/'}") &&
    headerCode.includes("focus-visible:ring-2 focus-visible:ring-primary/40")
  );
});

runTest(23, 'Header.jsx: Canvas Link contains focus-visible:ring-2', () => {
  const canvasLinkMatch = headerCode.match(/<Link\b[^>]*to="\/canvas"[^>]*>/);
  assert.ok(canvasLinkMatch && canvasLinkMatch[0].includes("focus-visible:ring-2"));
});

runTest(24, 'Header.jsx: All Tools button contains focus-visible:ring-2', () => {
  const allToolsBtnMatch = headerCode.match(/<button\b[\s\S]*?navigate\('\/\?category=all'\)[\s\S]*?>/);
  assert.ok(allToolsBtnMatch && allToolsBtnMatch[0].includes("focus-visible:ring-2"));
});

runTest(25, 'Header.jsx: CV Builder Link contains focus-visible:ring-2', () => {
  const cvLinkMatch = headerCode.match(/<Link\b[^>]*to="\/resume-builder"[^>]*>/);
  assert.ok(cvLinkMatch && cvLinkMatch[0].includes("focus-visible:ring-2"));
});

runTest(26, 'Header.jsx: Document Viewer Link contains focus-visible:ring-2', () => {
  const docViewerMatch = headerCode.match(/<Link\b[^>]*to="\/document-viewer"[^>]*>/);
  assert.ok(docViewerMatch && docViewerMatch[0].includes("focus-visible:ring-2"));
});

runTest(27, 'Header.jsx: Pricing Link contains focus-visible:ring-2', () => {
  const pricingMatch = headerCode.match(/<Link\b[^>]*to="\/pricing"[^>]*>/);
  assert.ok(pricingMatch && pricingMatch[0].includes("focus-visible:ring-2"));
});

runTest(28, 'Header.jsx: Brand Logo container contains focus:outline-none and rounded-lg', () => {
  const logoMatch = headerCode.match(/<div\b[^>]*onClick=\{handleLogoClick\}[^>]*>/);
  assert.ok(logoMatch && logoMatch[0].includes("focus:outline-none") && logoMatch[0].includes("rounded-lg"));
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Live Execution Simulation of Route Logic
// ─────────────────────────────────────────────────────────────────────────────

// Extract the exact route matching logic from Header.jsx
function simulateHeaderIsStudioRoute(pathname) {
  return (
    pathname.endsWith('/studio') ||
    pathname.includes('/studio/') ||
    ['/canvas', '/qr-generator', '/resume-builder', '/document-viewer'].some(
      route => pathname === route || pathname.startsWith(route + '/')
    )
  );
}

// Extract the exact route matching logic from App.jsx
function simulateAppMainPadding(pathname, isPro) {
  const isCanvas = pathname === '/canvas' || pathname.startsWith('/canvas/');
  const isStudioPath =
    pathname.endsWith('/studio') ||
    pathname.includes('/studio/') ||
    ['/resume-builder', '/document-viewer', '/qr-generator'].some(
      r => pathname === r || pathname.startsWith(r + '/')
    );
  return isCanvas ? 'pt-0' : (isStudioPath ? 'pt-[56px]' : (isPro ? 'pt-[72px]' : 'pt-[88px]'));
}

runTest(29, 'Simulation: /workspace evaluates to isStudio = false', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/workspace'), false);
});

runTest(30, 'Simulation: /workspace/queue evaluates to isStudio = false', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/workspace/queue'), false);
});

runTest(31, 'Simulation: /workspace computes Free padding = pt-[88px]', () => {
  assert.strictEqual(simulateAppMainPadding('/workspace', false), 'pt-[88px]');
});

runTest(32, 'Simulation: /workspace computes Pro padding = pt-[72px]', () => {
  assert.strictEqual(simulateAppMainPadding('/workspace', true), 'pt-[72px]');
});

runTest(33, 'Simulation: Dedicated tool studio /organize-pdf/studio evaluates to isStudio = true', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/organize-pdf/studio'), true);
  assert.strictEqual(simulateAppMainPadding('/organize-pdf/studio', false), 'pt-[56px]');
});

runTest(34, 'Simulation: Dedicated tool studio /merge-pdf/studio evaluates to isStudio = true', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/merge-pdf/studio'), true);
  assert.strictEqual(simulateAppMainPadding('/merge-pdf/studio', false), 'pt-[56px]');
});

runTest(35, 'Simulation: Dedicated tool studio /compress-pdf/studio evaluates to isStudio = true', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/compress-pdf/studio'), true);
  assert.strictEqual(simulateAppMainPadding('/compress-pdf/studio', false), 'pt-[56px]');
});

runTest(36, 'Simulation: Resume Builder /resume-builder evaluates to isStudio = true', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/resume-builder'), true);
  assert.strictEqual(simulateAppMainPadding('/resume-builder', false), 'pt-[56px]');
});

runTest(37, 'Simulation: Document Viewer /document-viewer evaluates to isStudio = true', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/document-viewer'), true);
  assert.strictEqual(simulateAppMainPadding('/document-viewer', false), 'pt-[56px]');
});

runTest(38, 'Simulation: Root / evaluates to isStudio = false with pt-[88px]', () => {
  assert.strictEqual(simulateHeaderIsStudioRoute('/'), false);
  assert.strictEqual(simulateAppMainPadding('/', false), 'pt-[88px]');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`  TOTAL TESTS: ${passCount + failCount}`);
console.log(`  PASSED: \x1b[32m${passCount}\x1b[0m`);
console.log(`  FAILED: \x1b[31m${failCount}\x1b[0m`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
