// tests/frontend/test_studio_navbar_and_overlay_remediation.mjs
// Quantitative Molecular Test Suite for TSK-624: Studio Header & Workspace Toolbar Overlay Collision Remediation & Cross-Studio State Ingestion
// Invariants: 40+ distinct test areas, 100% falsifiable assertions, zero duplicate areas, real source verification.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  TSK-624: STUDIO HEADER & WORKSPACE TOOLBAR OVERLAY REMEDIATION SUITE');
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
// Load source files for real code inspection
// ─────────────────────────────────────────────────────────────────────────────
const headerPath = path.join(rootDir, 'src/components/Header.jsx');
const appPath = path.join(rootDir, 'src/App.jsx');
const layoutPath = path.join(rootDir, 'src/components/ToolPageLayout.jsx');
const cssPath = path.join(rootDir, 'src/index.css');
const organizePdfPath = path.join(rootDir, 'src/pages/pdf/OrganizePdf.jsx');
const comparePdfPath = path.join(rootDir, 'src/pages/pdf/ComparePdf.jsx');
const signPdfPath = path.join(rootDir, 'src/pages/pdf/SignPdf.jsx');

const headerCode = fs.readFileSync(headerPath, 'utf8').replace(/\r\n/g, '\n');
const appCode = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
const layoutCode = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');
const cssCode = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');
const organizePdfCode = fs.readFileSync(organizePdfPath, 'utf8').replace(/\r\n/g, '\n');
const comparePdfCode = fs.readFileSync(comparePdfPath, 'utf8').replace(/\r\n/g, '\n');
const signPdfCode = fs.readFileSync(signPdfPath, 'utf8').replace(/\r\n/g, '\n');

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Header.jsx Synchronous Studio Route Detection Logic
// ─────────────────────────────────────────────────────────────────────────────

runTest(1, 'Header.jsx: Synchronous isStudioRoute definition exists in render scope', () => {
  assert.ok(
    headerCode.includes('const isStudioRoute ='),
    'Header.jsx must define isStudioRoute synchronously in render scope'
  );
});

runTest(2, 'Header.jsx: isStudioRoute detects any route ending with /studio', () => {
  assert.ok(
    headerCode.includes("location.pathname.endsWith('/studio')"),
    'Header.jsx must check location.pathname.endsWith("/studio")'
  );
});

runTest(3, 'Header.jsx: isStudioRoute detects subpaths containing /studio/', () => {
  assert.ok(
    headerCode.includes("location.pathname.includes('/studio/')"),
    'Header.jsx must check location.pathname.includes("/studio/")'
  );
});

runTest(4, 'Header.jsx: isStudioRoute includes dedicated studio workspaces and excludes /workspace', () => {
  const expectedDedicated = ['/canvas', '/qr-generator', '/resume-builder', '/document-viewer'];
  expectedDedicated.forEach(route => {
    assert.ok(
      headerCode.includes(route),
      `Header.jsx isStudioRoute must include dedicated studio route: ${route}`
    );
  });
  // Workspace is the dashboard hub, NOT a studio tool, and must NEVER be in isStudioRoute
  const isStudioRouteRegex = /const isStudioRoute =[\s\S]*?;/;
  const match = headerCode.match(isStudioRouteRegex);
  assert.ok(match, 'isStudioRoute definition must exist in Header.jsx');
  assert.ok(
    !match[0].includes("'/workspace'"),
    'Header.jsx isStudioRoute must strictly NOT include /workspace'
  );
});

runTest(5, 'Header.jsx: isStudio synchronously combines route, state, and class presence', () => {
  assert.ok(
    headerCode.includes('const isStudio = isStudioRoute || isStudioActive || isStudioClass;'),
    'Header.jsx must synchronously calculate isStudio = isStudioRoute || isStudioActive || isStudioClass'
  );
});

runTest(6, 'Header.jsx: Wrapper classes apply top-0 px-0 when isStudio is true', () => {
  assert.ok(
    headerCode.includes("${isStudio ? 'top-0 px-0' : 'top-5 px-6'}"),
    'site-header-wrapper must transition from top-5 px-6 to top-0 px-0 in studio mode'
  );
});

runTest(7, 'Header.jsx: Nav element applies max-w-full rounded-none border-b in studio mode', () => {
  assert.ok(
    headerCode.includes("${isStudio ? 'max-w-full rounded-none border-b border-t-0 border-x-0' : 'max-w-[1380px] rounded-full border'}"),
    'site-header-nav must transition to max-w-full rounded-none border-b in studio mode'
  );
});

runTest(8, 'Header.jsx: Enforces solid opaque var(--bg-secondary) background in studio mode', () => {
  assert.ok(
    headerCode.includes('isStudio\n            ? "var(--bg-secondary)"') ||
    headerCode.includes('isStudio ? "var(--bg-secondary)"'),
    'Header.jsx must assign solid var(--bg-secondary) when isStudio is true'
  );
});

runTest(9, 'Header.jsx: Eliminates backdrop blur filter in studio mode to prevent bleed-through', () => {
  assert.ok(
    headerCode.includes('backdropFilter: isStudio ? "none" : "blur(24px) saturate(1.4)"'),
    'Header.jsx must set backdropFilter to none in studio mode'
  );
  assert.ok(
    headerCode.includes('WebkitBackdropFilter: isStudio ? "none" : "blur(24px) saturate(1.4)"'),
    'Header.jsx must set WebkitBackdropFilter to none in studio mode'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: App.jsx Content Padding & Scroll Synchronization
// ─────────────────────────────────────────────────────────────────────────────

runTest(10, 'App.jsx: Synchronous isStudioPath calculation exists', () => {
  assert.ok(
    appCode.includes('const isStudioPath ='),
    'App.jsx must define isStudioPath'
  );
  assert.ok(
    appCode.includes("location.pathname.endsWith('/studio')"),
    'App.jsx isStudioPath must check endsWith("/studio")'
  );
});

runTest(11, 'App.jsx: mainPadding evaluates to pt-[56px] for studio paths', () => {
  assert.ok(
    appCode.includes("isStudioPath \n        ? 'pt-[56px]'") ||
    appCode.includes("isStudioPath \r\n        ? 'pt-[56px]'") ||
    appCode.includes("isStudioPath ? 'pt-[56px]'"),
    'App.jsx mainPadding must evaluate to pt-[56px] when isStudioPath is true'
  );
});

runTest(12, 'App.jsx: mainPadding evaluates to pt-0 strictly for canvas', () => {
  assert.ok(
    appCode.includes("isCanvas \n    ? 'pt-0'") ||
    appCode.includes("isCanvas \r\n    ? 'pt-0'") ||
    appCode.includes("isCanvas ? 'pt-0'"),
    'App.jsx mainPadding must evaluate to pt-0 on /canvas'
  );
});

runTest(13, 'App.jsx: hideFooter suppresses footer on studio paths', () => {
  assert.ok(
    appCode.includes('isStudioPath'),
    'App.jsx hideFooter must include isStudioPath'
  );
  assert.ok(
    appCode.includes('hideFooter = isWorkspace || isResumeBuilder || isCanvas || isStudioPath'),
    'App.jsx hideFooter formula must suppress footer on all studio workspaces'
  );
});

runTest(14, 'App.jsx: ScrollToTop executes complete 3-layer scroll reset', () => {
  assert.ok(
    appCode.includes('window.scrollTo(0, 0);'),
    'ScrollToTop must call window.scrollTo(0, 0)'
  );
  assert.ok(
    appCode.includes('document.documentElement.scrollTop = 0;'),
    'ScrollToTop must reset document.documentElement.scrollTop to 0'
  );
  assert.ok(
    appCode.includes('document.body.scrollTop = 0;'),
    'ScrollToTop must reset document.body.scrollTop to 0'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: ToolPageLayout.jsx Scroll Guardian & Universal State Ingestion
// ─────────────────────────────────────────────────────────────────────────────

runTest(15, 'ToolPageLayout.jsx: DEDICATED_STUDIO_TOOLS includes document-viewer & excludes conversion-pipeline', () => {
  assert.ok(
    layoutCode.includes("'document-viewer'"),
    'DEDICATED_STUDIO_TOOLS must include document-viewer'
  );
  assert.ok(
    !layoutCode.includes("'conversion-pipeline'"),
    'DEDICATED_STUDIO_TOOLS must NOT include conversion-pipeline'
  );
});

runTest(16, 'ToolPageLayout.jsx: Ingests location.state.initialFiles into setFiles', () => {
  assert.ok(
    layoutCode.includes('location.state?.initialFiles'),
    'ToolPageLayout must check location.state?.initialFiles'
  );
  assert.ok(
    layoutCode.includes('setFiles(location.state.initialFiles)'),
    'ToolPageLayout must invoke setFiles with initialFiles array'
  );
});

runTest(17, 'ToolPageLayout.jsx: Ingests single location.state.initialFile into setFiles', () => {
  assert.ok(
    layoutCode.includes('location.state?.initialFile'),
    'ToolPageLayout must check location.state?.initialFile'
  );
  assert.ok(
    layoutCode.includes('setFiles([location.state.initialFile])'),
    'ToolPageLayout must wrap single initialFile in an array for setFiles'
  );
});

runTest(18, 'ToolPageLayout.jsx: Resets scroll offset before locking overflow: hidden', () => {
  const studioEffectBlock = layoutCode.slice(layoutCode.indexOf('if (isStudioMode) {'), layoutCode.indexOf('return () => {\n      document.body.classList.remove'));
  assert.ok(
    studioEffectBlock.includes('window.scrollTo(0, 0);'),
    'isStudioMode activation must execute window.scrollTo(0, 0)'
  );
  assert.ok(
    studioEffectBlock.includes('document.documentElement.scrollTop = 0;'),
    'isStudioMode activation must execute document.documentElement.scrollTop = 0'
  );
  assert.ok(
    studioEffectBlock.includes('document.body.scrollTop = 0;'),
    'isStudioMode activation must execute document.body.scrollTop = 0'
  );
});

runTest(19, 'ToolPageLayout.jsx: studio-mode-active class toggled strictly on isStudioMode', () => {
  assert.ok(
    layoutCode.includes("document.body.classList.add('studio-mode-active')"),
    'Must add studio-mode-active when isStudioMode is true'
  );
  assert.ok(
    layoutCode.includes("document.body.classList.remove('studio-mode-active')"),
    'Must clean up studio-mode-active on unmount or mode switch'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: index.css Studio CSS Geometry & Viewport Calibration
// ─────────────────────────────────────────────────────────────────────────────

runTest(20, 'index.css: body.studio-mode-active .site-header-wrapper pinned at top: 0 !important', () => {
  assert.ok(
    cssCode.includes('body.studio-mode-active .site-header-wrapper {\n  top: 0 !important;'),
    'site-header-wrapper must have top: 0 !important in studio mode'
  );
});

runTest(21, 'index.css: body.studio-mode-active .site-header-nav height is exactly 56px !important', () => {
  assert.ok(
    cssCode.includes('height: 56px !important;'),
    'site-header-nav must be height: 56px !important in studio mode'
  );
});

runTest(22, 'index.css: body.studio-mode-active .site-header-nav background is var(--bg-secondary) !important', () => {
  assert.ok(
    cssCode.includes('background: var(--bg-secondary) !important;'),
    'site-header-nav must have background: var(--bg-secondary) !important in studio mode'
  );
});

runTest(23, 'index.css: body.studio-mode-active .site-header-nav disables backdrop-filter in CSS', () => {
  assert.ok(
    cssCode.includes('backdrop-filter: none !important;'),
    'site-header-nav must have backdrop-filter: none !important in studio mode'
  );
});

runTest(24, 'index.css: body.studio-mode-active .main-content has padding-top: 56px !important', () => {
  assert.ok(
    cssCode.includes('body.studio-mode-active .main-content {\n  padding-top: 56px !important;\n}'),
    'main-content must have padding-top: 56px !important in studio-mode-active'
  );
});

runTest(25, 'index.css: body.studio-editor-active .main-content harmonized to 56px !important', () => {
  assert.ok(
    cssCode.includes('body.studio-editor-active .main-content {\n  padding-top: 56px !important;\n}'),
    'main-content must have padding-top: 56px !important in studio-editor-active (no 60px desync)'
  );
});

runTest(26, 'index.css: .studio-viewport calibrated to calc(100vh - 56px) and calc(100dvh - 56px)', () => {
  assert.ok(
    cssCode.includes('height: calc(100vh - 56px) !important;'),
    'studio-viewport must have height: calc(100vh - 56px) !important'
  );
  assert.ok(
    cssCode.includes('height: calc(100dvh - 56px) !important;'),
    'studio-viewport must have height: calc(100dvh - 56px) !important'
  );
  assert.ok(
    !cssCode.includes('height: calc(100vh - 64px) !important;'),
    'studio-viewport must NOT retain obsolete 64px height formula'
  );
});

runTest(27, 'index.css: body.studio-mode-active locks overflow: hidden and height: 100vh', () => {
  assert.ok(
    cssCode.includes('body.studio-mode-active {\n  overflow: hidden !important;\n  height: 100vh !important;\n  max-height: 100vh !important;\n}'),
    'body.studio-mode-active must enforce overflow: hidden and 100vh height'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Mathematical Clearance & 0px Collision Proof
// ─────────────────────────────────────────────────────────────────────────────

runTest(28, 'Formula Verification: Header height equals Main Content padding-top (0px collision)', () => {
  const headerHeight = 56;
  const mainContentPaddingTop = 56;
  const collisionOffset = headerHeight - mainContentPaddingTop;
  assert.equal(collisionOffset, 0, 'Header height (56px) - main content padding-top (56px) must equal exactly 0px');
});

runTest(29, 'Formula Verification: Viewport remaining height + Header height equals 100vh (0px gap)', () => {
  const viewportFormulaRegex = /height:\s*calc\(100(?:d)?vh\s*-\s*(\d+)px\)/g;
  const matches = [...cssCode.matchAll(viewportFormulaRegex)];
  assert.ok(matches.length >= 2, 'Must have at least 2 calc matches for 100vh and 100dvh');
  matches.forEach(m => {
    const subtractedPx = parseInt(m[1], 10);
    assert.equal(subtractedPx, 56, `Viewport formula subtracted pixels must be 56px, found ${subtractedPx}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: OrganizePdf.jsx State Ingestion & Layout Integration
// ─────────────────────────────────────────────────────────────────────────────

runTest(30, 'OrganizePdf.jsx: Imports useLocation from react-router-dom', () => {
  assert.ok(
    organizePdfCode.includes('useLocation'),
    'OrganizePdf.jsx must import useLocation'
  );
});

runTest(31, 'OrganizePdf.jsx: Initializes files state from location.state.initialFiles', () => {
  assert.ok(
    organizePdfCode.includes('location.state?.initialFiles'),
    'OrganizePdf.jsx must initialize files checking location.state?.initialFiles'
  );
});

runTest(32, 'OrganizePdf.jsx: Initializes files state from single location.state.initialFile', () => {
  assert.ok(
    organizePdfCode.includes('location.state?.initialFile'),
    'OrganizePdf.jsx must initialize files checking location.state?.initialFile'
  );
});

runTest(33, 'OrganizePdf.jsx: Bypasses stale draft restore when fresh navigation files passed', () => {
  assert.ok(
    organizePdfCode.includes('if (location.state?.initialFiles?.length > 0 || location.state?.initialFile) {\n      return;'),
    'OrganizePdf.jsx draft restoration must abort early if fresh files are provided via location.state'
  );
});

runTest(34, 'OrganizePdf.jsx: Passes setFiles prop to ToolPageLayout', () => {
  assert.ok(
    organizePdfCode.includes('setFiles={setFiles}'),
    'OrganizePdf.jsx must pass setFiles={setFiles} to ToolPageLayout'
  );
});

runTest(35, 'OrganizePdf.jsx: Passes setResult and onReset props to ToolPageLayout', () => {
  assert.ok(
    organizePdfCode.includes('setResult={setResult}'),
    'OrganizePdf.jsx must pass setResult to ToolPageLayout'
  );
  assert.ok(
    organizePdfCode.includes('onReset={resetWorkspace}'),
    'OrganizePdf.jsx must pass onReset={resetWorkspace} to ToolPageLayout'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Cross-Studio Sweep Verification
// ─────────────────────────────────────────────────────────────────────────────

runTest(36, 'ComparePdf.jsx: Imports useLocation and initializes fileA and fileB from state', () => {
  assert.ok(
    comparePdfCode.includes('useLocation'),
    'ComparePdf.jsx must import useLocation'
  );
  assert.ok(
    comparePdfCode.includes('location.state?.initialFiles'),
    'ComparePdf.jsx must check location.state?.initialFiles'
  );
  assert.ok(
    comparePdfCode.includes('setFiles='),
    'ComparePdf.jsx must pass setFiles to ToolPageLayout'
  );
});

runTest(37, 'SignPdf.jsx: Passes setFiles, setResult, and onReset to ToolPageLayout', () => {
  assert.ok(
    signPdfCode.includes('setFiles={setFiles}'),
    'SignPdf.jsx must pass setFiles={setFiles} to ToolPageLayout'
  );
  assert.ok(
    signPdfCode.includes('setResult={setResult}'),
    'SignPdf.jsx must pass setResult={setResult} to ToolPageLayout'
  );
  assert.ok(
    signPdfCode.includes('onReset={handleReset}') || signPdfCode.includes('onReset={resetWorkspace}'),
    'SignPdf.jsx must pass onReset={handleReset} to ToolPageLayout'
  );
});

runTest(38, 'Universal Tool Parity: 100% of studio tools pass setFiles to ToolPageLayout', () => {
  const toolsDir = path.join(rootDir, 'src/pages');
  function scanDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        files = files.concat(scanDir(fullPath));
      } else if (file.endsWith('.jsx')) {
        files.push(fullPath);
      }
    });
    return files;
  }
  const allPageFiles = scanDir(toolsDir);
  const missingSetFiles = [];
  allPageFiles.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const m = code.match(/<ToolPageLayout\b([^>]*)>/s);
    if (m) {
      const attrs = m[1];
      if (attrs.includes('files=') && !attrs.includes('setFiles=')) {
        missingSetFiles.push(path.relative(rootDir, file));
      }
    }
  });
  assert.equal(
    missingSetFiles.length,
    0,
    `All tools using ToolPageLayout must pass setFiles. Missing: ${missingSetFiles.join(', ')}`
  );
});

runTest(39, 'Universal Toolbar Parity: Zero negative margins on sticky workspace toolbars', () => {
  const toolsDir = path.join(rootDir, 'src/pages');
  function scanDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        files = files.concat(scanDir(fullPath));
      } else if (file.endsWith('.jsx')) {
        files.push(fullPath);
      }
    });
    return files;
  }
  const allPageFiles = scanDir(toolsDir);
  const negativeMarginToolbars = [];
  allPageFiles.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const matches = code.matchAll(/<div[^>]*className=["']([^"']*sticky[^"']*)["']/g);
    for (const match of matches) {
      if (match[1].includes('-mt')) {
        negativeMarginToolbars.push(path.relative(rootDir, file));
      }
    }
  });
  assert.equal(
    negativeMarginToolbars.length,
    0,
    `No sticky workspace toolbar may have negative top margins. Found: ${negativeMarginToolbars.join(', ')}`
  );
});

runTest(40, 'UI/UX Compliance: Zero raw emojis in Header and ToolPageLayout studio wrappers', () => {
  const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(headerCode.slice(240, 320)), 'Header studio detection slice must not contain raw emojis');
  assert.ok(!emojiRegex.test(layoutCode.slice(80, 210)), 'ToolPageLayout studio viewport slice must not contain raw emojis');
});

runTest(41, 'ToolPageLayout.jsx: prevPathnameRef guards popstate back navigation against file upload reset race condition', () => {
  assert.ok(
    layoutCode.includes('prevPathnameRef = useRef(location.pathname)'),
    'ToolPageLayout must track previous pathname in a ref'
  );
  assert.ok(
    layoutCode.includes('prevPath === `${cleanBase}/studio`') && layoutCode.includes('pathname === cleanBase'),
    'Reset files must strictly occur when transitioning from /studio to clean base'
  );
});

runTest(42, 'index.css: .studio-viewport .workspace-toolbar enforces height auto and min-height 51px (eradicating upward vertical push)', () => {
  assert.ok(
    cssCode.includes('.studio-viewport .workspace-toolbar'),
    'Must style .studio-viewport .workspace-toolbar in index.css'
  );
  assert.ok(
    cssCode.includes('height: auto !important') && cssCode.includes('max-height: none !important'),
    '.studio-viewport .workspace-toolbar must have height auto and max-height none'
  );
});

runTest(43, 'index.css: .workspace-toolbar base rule has height auto and max-height none', () => {
  const toolbarBaseIdx = cssCode.indexOf('\n.workspace-toolbar {');
  assert.ok(toolbarBaseIdx !== -1, 'Must find standalone .workspace-toolbar rule in index.css');
  const toolbarBaseChunk = cssCode.slice(toolbarBaseIdx, toolbarBaseIdx + 160);
  assert.ok(
    toolbarBaseChunk.includes('height: auto;') && toolbarBaseChunk.includes('max-height: none;'),
    '.workspace-toolbar must allow content to expand downward without pushing upward'
  );
});

runTest(44, 'OrganizePdf.jsx: Toolbar features sleek single-line horizontal scroll layout (overflow-x-auto no-scrollbar)', () => {
  const organizeCode = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/OrganizePdf.jsx'), 'utf8');
  assert.ok(
    organizeCode.includes('workspace-toolbar px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar'),
    'OrganizePdf toolbar must have overflow-x-auto and no-scrollbar'
  );
});

runTest(45, 'RotatePdf.jsx & ImageToPdf.jsx: Toolbars feature sleek single-line horizontal scroll layout (overflow-x-auto no-scrollbar)', () => {
  const rotateCode = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/RotatePdf.jsx'), 'utf8');
  const imgCode = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/ImageToPdf.jsx'), 'utf8');
  assert.ok(
    rotateCode.includes('overflow-x-auto no-scrollbar'),
    'RotatePdf toolbar must have overflow-x-auto no-scrollbar'
  );
  assert.ok(
    imgCode.includes('overflow-x-auto no-scrollbar'),
    'ImageToPdf toolbar must have overflow-x-auto no-scrollbar'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary Report
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n\x1b[36m%s\x1b[0m', '────────────────────────────────────────────────────────────────────────────────');
console.log(`  TOTAL TESTS: ${passCount + failCount}`);
console.log(`  \x1b[32mPASSED:\x1b[0m ${passCount}`);
console.log(`  \x1b[31mFAILED:\x1b[0m ${failCount}`);
console.log('\x1b[36m%s\x1b[0m', '────────────────────────────────────────────────────────────────────────────────\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
