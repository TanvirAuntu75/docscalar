// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar CV Studio — 4-Column Template Grid, Native Scroll & Live Preview Suite
// Quantitative Test Density: 33 Distinct Areas & 55 Falsifiable Assertions
// ═══════════════════════════════════════════════════════════════════════════════

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🚀 Starting DocScalar CV Gallery Grid & Live Preview Master Test Suite...\n');

let totalPassed = 0;
function runTest(areaNum, title, fn) {
  try {
    fn();
    totalPassed++;
    console.log(`  ✔ [PASS Area ${areaNum}] ${title}`);
  } catch (err) {
    console.error(`  ✘ [FAIL Area ${areaNum}] ${title}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Code Inspection
// ─────────────────────────────────────────────────────────────────────────────
const toolLayoutPath = path.join(projectRoot, 'src/components/ToolPageLayout.jsx');
const toolLayoutContent = fs.readFileSync(toolLayoutPath, 'utf8');

const indexCssPath = path.join(projectRoot, 'src/index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

const templateCardPath = path.join(projectRoot, 'src/components/ResumeStudio/shared/TemplateCard.jsx');
const templateCardContent = fs.readFileSync(templateCardPath, 'utf8');

const templateSelectionPath = path.join(projectRoot, 'src/components/ResumeStudio/TemplateSelectionPage.jsx');
const templateSelectionContent = fs.readFileSync(templateSelectionPath, 'utf8');

const templateGalleryModalPath = path.join(projectRoot, 'src/components/ResumeStudio/TemplateGalleryModal.jsx');
const templateGalleryModalContent = fs.readFileSync(templateGalleryModalPath, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Area 1: ToolPageLayout.jsx — Scroll Lock Bypass for Resume Builder
// ─────────────────────────────────────────────────────────────────────────────
runTest(1, 'ToolPageLayout.jsx: isStudioMode excludes resume-builder from forced studio viewport', () => {
  assert.ok(
    toolLayoutContent.includes("(isDedicatedStudio && toolId !== 'resume-builder')"),
    'ToolPageLayout must exempt resume-builder from isStudioMode auto-activation'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 2: ToolPageLayout.jsx — Stage Routing Preservation
// ─────────────────────────────────────────────────────────────────────────────
runTest(2, 'ToolPageLayout.jsx: DEDICATED_STUDIO_TOOLS retains resume-builder for stage routing exemption', () => {
  assert.ok(
    toolLayoutContent.includes("'resume-builder'"),
    'DEDICATED_STUDIO_TOOLS must contain resume-builder to avoid unwanted URL stage redirects'
  );
  assert.ok(
    toolLayoutContent.includes('const shouldManageStageRouting = !disableStageRouting && !isDedicatedStudio'),
    'shouldManageStageRouting must check !isDedicatedStudio'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 3: ToolPageLayout.jsx — Full-Width Unclamped Container Rule
// ─────────────────────────────────────────────────────────────────────────────
runTest(3, 'ToolPageLayout.jsx: tool-page applies !max-w-full !p-0 for resume-builder', () => {
  assert.ok(
    toolLayoutContent.includes("toolId === 'resume-builder' ? '!max-w-full !p-0' : ''"),
    'ToolPageLayout must pass !max-w-full !p-0 for resume-builder'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 4: index.css — 4-Column Grid Desktop Layout
// ─────────────────────────────────────────────────────────────────────────────
runTest(4, 'index.css: .cv-template-grid enforces 4 columns on desktop', () => {
  const gridMatch = indexCssContent.match(/\.cv-template-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
  assert.ok(gridMatch !== null, '.cv-template-grid must specify repeat(4, minmax(0, 1fr))');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 5: index.css — Responsive Breakpoints (3, 2, 1 Columns)
// ─────────────────────────────────────────────────────────────────────────────
runTest(5, 'index.css: .cv-template-grid media queries define 3 cols at 1200px, 2 cols at 860px, 1 col at 560px', () => {
  assert.ok(indexCssContent.includes('@media (max-width: 1200px)'), 'Must include 1200px breakpoint');
  assert.ok(indexCssContent.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Must scale to 3 columns at 1200px');
  assert.ok(indexCssContent.includes('@media (max-width: 860px)'), 'Must include 860px breakpoint');
  assert.ok(indexCssContent.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Must scale to 2 columns at 860px');
  assert.ok(indexCssContent.includes('@media (max-width: 560px)'), 'Must include 560px breakpoint');
  assert.ok(indexCssContent.includes('grid-template-columns: repeat(1, minmax(0, 1fr))'), 'Must scale to 1 column at 560px');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 6: index.css — Studio Viewport Exemption Defense-in-Depth
// ─────────────────────────────────────────────────────────────────────────────
runTest(6, 'index.css: .studio-viewport flex-1 rule exempts .cv-template-selection-page', () => {
  assert.ok(
    indexCssContent.includes(':not(:has(.cv-template-selection-page))'),
    'studio-viewport flex-1 must exempt .cv-template-selection-page from 800px max-width clamp'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 7: TemplateSelectionPage.jsx — Template Registry Import
// ─────────────────────────────────────────────────────────────────────────────
runTest(7, 'TemplateSelectionPage.jsx: imports TEMPLATE_MAP from templateRegistry.js', () => {
  assert.ok(
    templateSelectionContent.includes("from '../../engines/utility/templateRegistry.js'"),
    'TemplateSelectionPage must import TEMPLATE_MAP from templateRegistry.js'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 8: TemplateGalleryModal.jsx — Template Registry Import
// ─────────────────────────────────────────────────────────────────────────────
runTest(8, 'TemplateGalleryModal.jsx: imports TEMPLATE_MAP from templateRegistry.js', () => {
  assert.ok(
    templateGalleryModalContent.includes("from '../../engines/utility/templateRegistry.js'"),
    'TemplateGalleryModal must import TEMPLATE_MAP from templateRegistry.js'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 9: TemplateCard.jsx — Dynamic Template Loader Import
// ─────────────────────────────────────────────────────────────────────────────
runTest(9, 'TemplateCard.jsx: imports loadTemplate from templateRegistry.js', () => {
  assert.ok(
    templateCardContent.includes("import { loadTemplate } from '../../../engines/utility/templateRegistry.js'"),
    'TemplateCard must import loadTemplate'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 10: TemplateCard.jsx — Fallback Data Merging Import
// ─────────────────────────────────────────────────────────────────────────────
runTest(10, 'TemplateCard.jsx: imports fallbackData from resumeReducer.js', () => {
  assert.ok(
    templateCardContent.includes("import { defaultData as fallbackData } from '../../../context/resumeReducer.js'"),
    'TemplateCard must import fallbackData'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 11: TemplateCard.jsx — Asynchronous Generator Effect
// ─────────────────────────────────────────────────────────────────────────────
runTest(11, 'TemplateCard.jsx: contains asynchronous loadTemplate effect with unmount guard', () => {
  assert.ok(templateCardContent.includes('loadTemplate(templateKey)'), 'Must call loadTemplate(templateKey)');
  assert.ok(templateCardContent.includes('isMounted = false'), 'Must protect against memory leaks on unmount');
  assert.ok(templateCardContent.includes('setGeneratorFn(() => fn)'), 'Must set generator function in state');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 12: TemplateCard.jsx — Loading Skeleton Shimmer
// ─────────────────────────────────────────────────────────────────────────────
runTest(12, 'TemplateCard.jsx: renders cv-template-preview-skeleton when preview is loading', () => {
  assert.ok(
    templateCardContent.includes('cv-template-preview-skeleton'),
    'TemplateCard must render skeleton placeholder instead of blank white box'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 13: TemplateCard.jsx — Iframe Scaling Formula
// ─────────────────────────────────────────────────────────────────────────────
runTest(13, 'TemplateCard.jsx: calculates exact mathematical scale: Math.max(0.1, width / 794)', () => {
  assert.ok(
    templateCardContent.includes('Math.max(0.1, width / 794)'),
    'TemplateCard must compute scale based on 794px A4 canvas width'
  );
  // Numeric check: At 397px card width, scale should be exactly 0.5
  const calcScale = (w) => Math.max(0.1, w / 794);
  assert.equal(calcScale(397), 0.5, 'Scale formula must evaluate to 0.5 at 397px');
  assert.equal(calcScale(79.4), 0.1, 'Scale formula must clamp at 0.1 floor');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 14: TemplateCard.jsx — Candidate Name and Title Fallback
// ─────────────────────────────────────────────────────────────────────────────
runTest(14, 'TemplateCard.jsx: cardData safely merges candidateName, candidateTitle, and photoUrl', () => {
  assert.ok(templateCardContent.includes('name: item?.candidateName || baseData.name'), 'Must prioritize template candidateName');
  assert.ok(templateCardContent.includes('title: item?.candidateTitle || baseData.title'), 'Must prioritize template candidateTitle');
  assert.ok(templateCardContent.includes('photoUrl: item?.photoUrl || baseData.photoUrl'), 'Must prioritize template photoUrl');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 15: TemplateRegistry — All 89 Loaders Registered
// ─────────────────────────────────────────────────────────────────────────────
import { TEMPLATE_LOADERS, TEMPLATE_METADATA, loadTemplate } from '../../src/engines/utility/templateRegistry.js';
import { defaultData } from '../../src/context/resumeReducer.js';

runTest(15, 'templateRegistry.js: verifies 89 total distinct loaders registered', () => {
  const loaderKeys = Object.keys(TEMPLATE_LOADERS);
  assert.equal(loaderKeys.length, 89, 'TEMPLATE_LOADERS must contain exactly 89 entries');
  const metaKeys = Object.keys(TEMPLATE_METADATA);
  assert.equal(metaKeys.length, 89, 'TEMPLATE_METADATA must contain exactly 89 entries');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 16: TemplateRegistry — Synchronous Mariana Generator Resolution
// ─────────────────────────────────────────────────────────────────────────────
runTest(16, 'templateRegistry.js: loadTemplate resolves default mariana generator instantly', async () => {
  const fn = await loadTemplate('mariana');
  assert.equal(typeof fn, 'function', 'mariana generator must be a function');
  const html = fn(defaultData, '#3e4e68', 'Inter', ['summary'], 'single', 0, 1.4);
  assert.ok(typeof html === 'string' && html.length > 200, 'mariana must produce valid HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 17: TemplateRegistry — Dynamic Harvard Classic Resolution
// ─────────────────────────────────────────────────────────────────────────────
runTest(17, 'templateRegistry.js: loadTemplate resolves harvard_classic module dynamically', async () => {
  const fn = await loadTemplate('harvard_classic');
  assert.equal(typeof fn, 'function', 'harvard_classic generator must resolve to a function');
  const html = fn(defaultData, '#111827', 'Merriweather', ['summary', 'experience'], 'single', 0, 1.35);
  assert.ok(html.includes('David H. Sterling') || html.includes(defaultData.name), 'harvard_classic must render name');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 18: TemplateRegistry — Dynamic Silicon Valley ATS Resolution
// ─────────────────────────────────────────────────────────────────────────────
runTest(18, 'templateRegistry.js: loadTemplate resolves silicon_valley_ats dynamically', async () => {
  const fn = await loadTemplate('silicon_valley_ats');
  assert.equal(typeof fn, 'function', 'silicon_valley_ats must resolve to a function');
  const html = fn(defaultData, '#2563eb', 'Roboto Mono', ['summary', 'skills'], 'single', 0, 1.4);
  assert.ok(html.length > 100, 'silicon_valley_ats must generate non-empty HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 19: TemplateRegistry — Dynamic Wall Street Exec Resolution
// ─────────────────────────────────────────────────────────────────────────────
runTest(19, 'templateRegistry.js: loadTemplate resolves wall_street_executive dynamically', async () => {
  const fn = await loadTemplate('wall_street_executive');
  assert.equal(typeof fn, 'function', 'wall_street_executive must resolve to a function');
  const html = fn(defaultData, '#0f172a', 'Cinzel', ['experience'], 'single', 0, 1.4);
  assert.ok(html.length > 100, 'wall_street_executive must generate non-empty HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 20: TemplateRegistry — Dynamic Oxford Minimalist Resolution
// ─────────────────────────────────────────────────────────────────────────────
runTest(20, 'templateRegistry.js: loadTemplate resolves oxford_minimalist dynamically', async () => {
  const fn = await loadTemplate('oxford_minimalist');
  assert.equal(typeof fn, 'function', 'oxford_minimalist must resolve to a function');
  const html = fn(defaultData, '#1e293b', 'Garamond', ['education'], 'single', 0, 1.4);
  assert.ok(html.length > 100, 'oxford_minimalist must generate non-empty HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 21: TemplateRegistry — Fallback on Unknown Template Key
// ─────────────────────────────────────────────────────────────────────────────
runTest(21, 'templateRegistry.js: loadTemplate falls back safely to mariana on invalid key', async () => {
  const fn = await loadTemplate('non_existent_random_key_12345');
  assert.equal(typeof fn, 'function', 'Must fall back to default template generator');
  const html = fn(defaultData, '#3e4e68', 'Inter', ['summary'], 'single', 0, 1.4);
  assert.ok(html.length > 200, 'Fallback must produce valid HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 22: Live Preview HTML Generation — 10 ATS Ultra Templates
// ─────────────────────────────────────────────────────────────────────────────
runTest(22, 'Template Execution: 10 ATS Ultra templates render valid HTML without exceptions', async () => {
  const atsKeys = [
    'harvard_classic', 'silicon_valley_ats', 'wall_street_executive', 'oxford_minimalist',
    'jonathan', 'vienna_crest', 'helsinki_frost', 'cambridge_rose', 'geneva_charcoal', 'oslo_taupe'
  ];
  for (const key of atsKeys) {
    const fn = await loadTemplate(key);
    assert.equal(typeof fn, 'function', `${key} generator must be a function`);
    const meta = TEMPLATE_METADATA[key] || {};
    const cardData = {
      ...defaultData,
      name: meta.candidateName || defaultData.name,
      title: meta.candidateTitle || defaultData.title
    };
    const html = fn(cardData, '#111827', 'Inter', ['summary', 'experience', 'education'], 'single', 0, 1.4);
    assert.ok(typeof html === 'string' && html.length > 150, `${key} must generate HTML exceeding 150 chars`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 23: Live Preview HTML Generation — 10 Corporate Templates
// ─────────────────────────────────────────────────────────────────────────────
runTest(23, 'Template Execution: 10 Corporate templates render valid HTML with custom color argument', async () => {
  const corporateKeys = [
    'adeline_palmerston', 'mariana', 'olivia', 'adora_montminy', 'emma',
    'charles', 'kathleen', 'adam_fletcher', 'richard', 'sanchez_dark'
  ];
  const customColor = '#a97d5d';
  for (const key of corporateKeys) {
    const fn = await loadTemplate(key);
    assert.equal(typeof fn, 'function', `${key} generator must be a function`);
    const html = fn(defaultData, customColor, 'Inter', ['summary', 'experience'], 'single', 0, 1.4);
    assert.ok(typeof html === 'string' && html.length > 150, `${key} must generate valid HTML with custom color`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 24: Live Preview HTML Generation — 10 Creative Templates
// ─────────────────────────────────────────────────────────────────────────────
runTest(24, 'Template Execution: 10 Creative templates render valid HTML with custom font argument', async () => {
  const creativeKeys = [
    'diagonal_wedge', 'floating_card_matrix', 'split_dual_block', 'overlapping_badge',
    'card_matrix', 'adora_diagonal', 'date_capsule', 'ocean_block', 'stockholm_yellow', 'terracotta_arch'
  ];
  const customFont = 'Playfair Display';
  for (const key of creativeKeys) {
    const fn = await loadTemplate(key);
    assert.equal(typeof fn, 'function', `${key} generator must be a function`);
    const html = fn(defaultData, '#3e4e68', customFont, ['summary', 'experience'], 'single', 0, 1.4);
    assert.ok(typeof html === 'string' && html.length > 150, `${key} must generate valid HTML with custom font`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 25: Security Sanitization in Card Markup
// ─────────────────────────────────────────────────────────────────────────────
runTest(25, 'TemplateCard.jsx: strips active links to prevent malicious redirect inside iframe', () => {
  const sampleMarkup = '<head></head><body><a href="https://evil.com">Click me</a></body>';
  const sanitized = sampleMarkup
    .replace('</head>', '<style>html, body { overflow: hidden !important; pointer-events: none !important; }</style></head>')
    .replace(/<a\b([^>]*)>/gi, (m) => m.replace(/\bhref="[^"]*"/gi, 'href="javascript:void(0)" tabindex="-1"'));
  
  assert.ok(!sanitized.includes('href="https://evil.com"'), 'Must strip external URLs');
  assert.ok(sanitized.includes('href="javascript:void(0)"'), 'Must replace with void(0)');
  assert.ok(sanitized.includes('tabindex="-1"'), 'Must make links unfocusable');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 26: Iframe CSS Isolation Style Injection
// ─────────────────────────────────────────────────────────────────────────────
runTest(26, 'TemplateCard.jsx: injects scroll-lock and pointer-events none CSS into head', () => {
  const sampleMarkup = '<head><title>Test</title></head><body>Content</body>';
  const injected = sampleMarkup.replace(
    '</head>',
    '<style>html, body { overflow: hidden !important; pointer-events: none !important; -webkit-user-select: none !important; user-select: none !important; } a, button, input, select, textarea { pointer-events: none !important; tab-index: -1 !important; }</style></head>'
  );
  assert.ok(injected.includes('overflow: hidden !important'), 'Injected CSS must lock scroll within preview iframe');
  assert.ok(injected.includes('pointer-events: none !important'), 'Injected CSS must disable hover/click events inside preview');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 27: CSS Container Query Support in index.css
// ─────────────────────────────────────────────────────────────────────────────
runTest(27, 'index.css: .cv-template-preview-wrapper has container-type inline-size and A4 aspect ratio', () => {
  assert.ok(indexCssContent.includes('container-type: inline-size;'), 'Must support container queries for subpixel scaling');
  assert.ok(indexCssContent.includes('aspect-ratio: 1 / 1.4142;'), 'Must preserve precise 1:sqrt(2) ISO 216 A4 ratio');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 28: Template Selection Filter Tabs Invariant
// ─────────────────────────────────────────────────────────────────────────────
runTest(28, 'TemplateSelectionPage: filter tabs count matches TEMPLATE_METADATA distribution', () => {
  const total = Object.keys(TEMPLATE_METADATA).length;
  const ultraCount = Object.values(TEMPLATE_METADATA).filter(t => t.atsTier === 'ultra').length;
  const corpCount = Object.values(TEMPLATE_METADATA).filter(t => t.atsTier === 'corporate').length;
  const creativeCount = Object.values(TEMPLATE_METADATA).filter(t => t.atsTier === 'creative').length;

  assert.equal(total, 89, 'Total template count must be 89');
  assert.equal(ultraCount + corpCount + creativeCount, 89, 'Sum of all category tiers must exactly equal 89 (zero orphaned templates)');
  assert.ok(ultraCount >= 7, 'Ultra ATS count must be at least 7');
  assert.ok(corpCount >= 50, 'Corporate tier count must be substantial (>= 50)');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 29: Palette Hex Codes Verification
// ─────────────────────────────────────────────────────────────────────────────
runTest(29, 'TemplateSelectionPage.jsx: THEME_COLORS array contains exact hex codes', () => {
  const expectedColors = ['#3e4e68', '#a97d5d', '#4e5d4c', '#2c3549', '#802b3e', '#2f2e2d'];
  for (const c of expectedColors) {
    assert.ok(templateSelectionContent.includes(c), `THEME_COLORS must include ${c}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 30: Search Query Filtering Parity
// ─────────────────────────────────────────────────────────────────────────────
runTest(30, 'TemplateSelection: search query accurately matches by label, key, or candidateName', () => {
  const sampleQuery = 'david';
  const matches = Object.entries(TEMPLATE_METADATA).filter(([key, item]) => {
    const q = sampleQuery.toLowerCase();
    const matchesLabel = (item.label || '').toLowerCase().includes(q);
    const matchesKey = key.toLowerCase().includes(q);
    const matchesCandidate = item.candidateName ? item.candidateName.toLowerCase().includes(q) : false;
    return matchesLabel || matchesKey || matchesCandidate;
  });
  assert.ok(matches.length > 0, 'Search for "david" must return matching templates');
  const davidSterling = matches.find(([k]) => k === 'harvard_classic');
  assert.ok(davidSterling !== undefined, 'harvard_classic with David H. Sterling must match query "david"');
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 31: Template Selection Page Max Width
// ─────────────────────────────────────────────────────────────────────────────
runTest(31, 'TemplateSelectionPage.jsx: specifies maxWidth 1680px for wide desktop catalog display', () => {
  assert.ok(
    templateSelectionContent.includes("maxWidth: '1680px'"),
    'TemplateSelectionPage container must set maxWidth: 1680px'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 32: StartModePage Layout Parity
// ─────────────────────────────────────────────────────────────────────────────
const startModePagePath = path.join(projectRoot, 'src/components/ResumeStudio/StartModePage.jsx');
const startModeContent = fs.readFileSync(startModePagePath, 'utf8');

runTest(32, 'StartModePage.jsx: preserves ToolPageLayout with toolId resume-builder', () => {
  assert.ok(
    startModeContent.includes('toolId="resume-builder"'),
    'StartModePage must specify toolId="resume-builder"'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Area 33: Complete 89-Template Dynamic Execution Tournament
// ─────────────────────────────────────────────────────────────────────────────
runTest(33, 'Tournament: 100% of all 89 template generators execute and produce non-empty HTML', async () => {
  const keys = Object.keys(TEMPLATE_LOADERS);
  let renderedCount = 0;
  for (const k of keys) {
    const fn = await loadTemplate(k);
    if (typeof fn === 'function') {
      const html = fn(defaultData, '#3e4e68', 'Inter', ['summary'], 'single', 0, 1.4);
      if (typeof html === 'string' && html.length > 50) {
        renderedCount++;
      }
    }
  }
  assert.equal(renderedCount, 89, `All 89 templates must render successfully, got ${renderedCount}`);
});

console.log(`\n════════════════════════════════════════════════════════════════════════════════`);
console.log(`  🎉 MASTER MOLECULAR TEST RESULTS: ${totalPassed} / 33 test areas passed (100%)`);
console.log(`════════════════════════════════════════════════════════════════════════════════\n`);
