// test_canvas_audit_suite.mjs
// Molecular test suite for LivePreviewCanvas.jsx and StudioHeaderNav.jsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const livePreviewPath = path.join(rootDir, 'src', 'components', 'ResumeStudio', 'LivePreviewCanvas.jsx');
const studioHeaderNavPath = path.join(rootDir, 'src', 'components', 'ResumeStudio', 'StudioHeaderNav.jsx');

const livePreviewContent = fs.readFileSync(livePreviewPath, 'utf8');
const studioHeaderNavContent = fs.readFileSync(studioHeaderNavPath, 'utf8');

let totalAssertions = 0;
let passedAssertions = 0;
const failures = [];

function assert(condition, testArea, message, details = {}) {
  totalAssertions++;
  if (!condition) {
    failures.push({ testArea, message, details });
    console.error(`❌ FAIL [Area ${testArea}]: ${message}`, details);
  } else {
    passedAssertions++;
    console.log(`✅ PASS [Area ${testArea}]: ${message}`);
  }
}

// Relative Luminance & WCAG Contrast Formula
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getContrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log('=== RUNNING MOLECULAR TEST SUITE FOR RESUME STUDIO FIXES ===\n');

// --- GRIDLINES FIX VERIFICATION ---
// Area 1: useEffect gridlines call
const useEffectGridlineMatch = livePreviewContent.match(/} else \{\s*disableDirectEditOnDoc\(doc\);\s*updateGridlinesOnDoc\(doc,\s*([^)]+)\);/);
assert(
  useEffectGridlineMatch !== null && useEffectGridlineMatch[1].trim() === 'showGridlines',
  1,
  'useEffect passes showGridlines when directEdit is false',
  { actual: useEffectGridlineMatch ? useEffectGridlineMatch[1] : null }
);

// Area 2: handleIframeLoad gridlines call
const iframeLoadGridlineMatch = livePreviewContent.match(/handleIframeLoad[\s\S]*?} else \{\s*disableDirectEditOnDoc\(doc\);\s*updateGridlinesOnDoc\(doc,\s*([^)]+)\);/);
assert(
  iframeLoadGridlineMatch !== null && iframeLoadGridlineMatch[1].trim() === 'showGridlines',
  2,
  'handleIframeLoad passes showGridlines when directEdit is false',
  { actual: iframeLoadGridlineMatch ? iframeLoadGridlineMatch[1] : null }
);

// Area 3: Absence of dead-end updateGridlinesOnDoc(doc, false)
const falseGridlinesOccurrences = (livePreviewContent.match(/updateGridlinesOnDoc\(\s*doc\s*,\s*false\s*\)/g) || []).length;
assert(
  falseGridlinesOccurrences === 0,
  3,
  'Zero occurrences of dead-end updateGridlinesOnDoc(doc, false)',
  { count: falseGridlinesOccurrences }
);

// Area 4: Total active updateGridlinesOnDoc calls
const totalGridlinesCalls = (livePreviewContent.match(/updateGridlinesOnDoc\(\s*doc\s*,\s*showGridlines\s*\)/g) || []).length;
assert(
  totalGridlinesCalls >= 4,
  4,
  `At least 4 calls to updateGridlinesOnDoc(doc, showGridlines) across branches (found: ${totalGridlinesCalls})`,
  { count: totalGridlinesCalls }
);

// --- FLOATING WORD TOOLBAR LIGHT THEME ---
const toolbarSnippetMatch = livePreviewContent.match(/className="cv-floating-word-toolbar"[\s\S]*?style=\{\{([\s\S]*?)\}\}/);
const toolbarStyles = toolbarSnippetMatch ? toolbarSnippetMatch[1] : '';

// Area 5: Floating toolbar background #ffffff
assert(
  toolbarStyles.includes("background: '#ffffff'"),
  5,
  'Floating word toolbar background is #ffffff',
  { snippet: toolbarStyles }
);

// Area 6: Floating toolbar text color #1e293b
assert(
  toolbarStyles.includes("color: '#1e293b'"),
  6,
  'Floating word toolbar text color is #1e293b',
  { snippet: toolbarStyles }
);

// Area 7: Floating toolbar border #cbd5e1
assert(
  toolbarStyles.includes("border: '1px solid #cbd5e1'"),
  7,
  'Floating word toolbar border is 1px solid #cbd5e1',
  { snippet: toolbarStyles }
);

// Area 8: Floating toolbar box shadow
assert(
  toolbarStyles.includes("boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)'"),
  8,
  'Floating word toolbar box shadow is light-calibrated',
  { snippet: toolbarStyles }
);

// Area 9: No old dark background #0f172a in floating toolbar
const toolbarFullSectionMatch = livePreviewContent.match(/className="cv-floating-word-toolbar"[\s\S]*?Preview Scroll Viewport/);
const toolbarFullSection = toolbarFullSectionMatch ? toolbarFullSectionMatch[0] : '';
assert(
  !toolbarFullSection.includes('#0f172a'),
  9,
  'Absence of dark #0f172a background in floating toolbar block'
);

// Area 10: No old dark border in floating toolbar
assert(
  !toolbarFullSection.includes("border: '1px solid rgba(255, 255, 255, 0.15)'"),
  10,
  'Absence of dark translucent border in floating toolbar'
);

// Area 11: Bold button color #1e293b
const boldBtnMatch = toolbarFullSection.match(/data-testid="format-bold-btn"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  boldBtnMatch && boldBtnMatch[1].includes("color: '#1e293b'"),
  11,
  'Format Bold button color is #1e293b',
  { style: boldBtnMatch ? boldBtnMatch[1] : null }
);

// Area 12: Italic button color #1e293b
const italicBtnMatch = toolbarFullSection.match(/data-testid="format-italic-btn"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  italicBtnMatch && italicBtnMatch[1].includes("color: '#1e293b'"),
  12,
  'Format Italic button color is #1e293b',
  { style: italicBtnMatch ? italicBtnMatch[1] : null }
);

// Area 13: Underline button color #1e293b
const underlineBtnMatch = toolbarFullSection.match(/data-testid="format-underline-btn"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  underlineBtnMatch && underlineBtnMatch[1].includes("color: '#1e293b'"),
  13,
  'Format Underline button color is #1e293b',
  { style: underlineBtnMatch ? underlineBtnMatch[1] : null }
);

// Area 14: Case button color #1e293b
const caseBtnMatch = toolbarFullSection.match(/data-testid="format-case-btn"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  caseBtnMatch && caseBtnMatch[1].includes("color: '#1e293b'"),
  14,
  'Format Case button color is #1e293b',
  { style: caseBtnMatch ? caseBtnMatch[1] : null }
);

// Area 15: Bullet list button color #1e293b
const bulletBtnMatch = toolbarFullSection.match(/data-testid="format-bullet-btn"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  bulletBtnMatch && bulletBtnMatch[1].includes("color: '#1e293b'"),
  15,
  'Format Bullet List button color is #1e293b',
  { style: bulletBtnMatch ? bulletBtnMatch[1] : null }
);

// Area 16: Align Left button color #1e293b
const alignLeftMatch = toolbarFullSection.match(/title="Align Left"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  alignLeftMatch && alignLeftMatch[1].includes("color: '#1e293b'"),
  16,
  'Align Left button color is #1e293b',
  { style: alignLeftMatch ? alignLeftMatch[1] : null }
);

// Area 17: Align Center button color #1e293b
const alignCenterMatch = toolbarFullSection.match(/title="Align Center"[\s\S]*?style=\{\{([^}]+)\}\}/);
assert(
  alignCenterMatch && alignCenterMatch[1].includes("color: '#1e293b'"),
  17,
  'Align Center button color is #1e293b',
  { style: alignCenterMatch ? alignCenterMatch[1] : null }
);

// Area 18 & 19: Dividers in toolbar
const dividerMatches = toolbarFullSection.match(/width:\s*'1px',\s*height:\s*'16px',\s*background:\s*'#e2e8f0'/g);
assert(
  dividerMatches !== null && dividerMatches.length === 2,
  18,
  'Both floating toolbar vertical dividers use #e2e8f0 background',
  { count: dividerMatches ? dividerMatches.length : 0 }
);

// Area 20: Total buttons in toolbar with #1e293b
const buttonColors1e293b = (toolbarFullSection.match(/color:\s*'#1e293b'/g) || []).length;
assert(
  buttonColors1e293b >= 8, // container + 7 buttons
  19,
  `Container and all 7 buttons calibrated to #1e293b (found: ${buttonColors1e293b})`,
  { count: buttonColors1e293b }
);

// Area 21: Zero white-text buttons in floating toolbar
const whiteButtonColors = (toolbarFullSection.match(/color:\s*'#ffffff'/g) || []).length;
assert(
  whiteButtonColors === 0,
  20,
  'Zero white buttons (color: #ffffff) remain in floating toolbar',
  { count: whiteButtonColors }
);

// --- HEADROOM BADGES & GAUGES ---
// Area 22: Discrete Page 2 badge color #2563eb
const discreteBadgeMatch = livePreviewContent.match(/style=\{\{[\s\S]*?background:\s*'rgba\(59,\s*130,\s*246,\s*0\.12\)'[\s\S]*?color:\s*'([^']+)'[\s\S]*?2 Discrete A4 Pages/);
assert(
  discreteBadgeMatch !== null && discreteBadgeMatch[1] === '#2563eb',
  21,
  'Discrete 2-page badge color is #2563eb',
  { actual: discreteBadgeMatch ? discreteBadgeMatch[1] : null }
);

// Area 23: Absence of #60a5fa in discrete badge
assert(
  !livePreviewContent.includes("color: '#60a5fa'"),
  22,
  'Absence of washed-out #60a5fa in LivePreviewCanvas'
);

// Area 24: Discrete Page 2 progress track background rgba(0, 0, 0, 0.08)
const discreteTrackMatch = livePreviewContent.match(/2 Discrete A4 Pages[\s\S]*?width:\s*'32px'[\s\S]*?background:\s*'([^']+)'/);
assert(
  discreteTrackMatch !== null && discreteTrackMatch[1] === 'rgba(0, 0, 0, 0.08)',
  23,
  'Discrete Page 2 gauge track background is rgba(0, 0, 0, 0.08)',
  { actual: discreteTrackMatch ? discreteTrackMatch[1] : null }
);

// Area 25: Single Page badge safe & warning colors
const singlePageBadgeMatch = livePreviewContent.match(/cv-headroom-badge \$\{page1FillPct > 85[\s\S]*?color:\s*page1FillPct > 85 \? '([^']+)' : '([^']+)'/);
assert(
  singlePageBadgeMatch !== null &&
  singlePageBadgeMatch[1] === '#b45309' &&
  singlePageBadgeMatch[2] === '#059669',
  24,
  'Single Page badge colors are #b45309 (warning) and #059669 (safe)',
  {
    warning: singlePageBadgeMatch ? singlePageBadgeMatch[1] : null,
    safe: singlePageBadgeMatch ? singlePageBadgeMatch[2] : null
  }
);

// Area 26: Absence of #facc15 and #34d399 in single page badge
assert(
  !livePreviewContent.includes("page1FillPct > 85 ? '#facc15' : '#34d399'"),
  25,
  'Absence of washed-out #facc15 / #34d399 in single page badge'
);

// Area 27: Single Page gauge track background rgba(0, 0, 0, 0.08)
const singlePageTrackMatch = livePreviewContent.match(/headroom-gauge-safe[\s\S]*?width:\s*'32px'[\s\S]*?background:\s*'([^']+)'/);
assert(
  singlePageTrackMatch !== null && singlePageTrackMatch[1] === 'rgba(0, 0, 0, 0.08)',
  26,
  'Single Page gauge track background is rgba(0, 0, 0, 0.08)',
  { actual: singlePageTrackMatch ? singlePageTrackMatch[1] : null }
);

// Area 28: Overflow badge text color #dc2626
const overflowBadgeMatch = livePreviewContent.match(/cv-headroom-badge overflow[\s\S]*?color:\s*'([^']+)'/);
assert(
  overflowBadgeMatch !== null && overflowBadgeMatch[1] === '#dc2626',
  27,
  'Overflow badge text color is #dc2626',
  { actual: overflowBadgeMatch ? overflowBadgeMatch[1] : null }
);

// Area 29: Absence of #f87171 in overflow badge
assert(
  !livePreviewContent.includes("color: '#f87171'"),
  28,
  'Absence of washed-out #f87171 in overflow badge'
);

// Area 30: Zero remaining dark tracks rgba(255, 255, 255, 0.15) in 32px gauge bars
const oldTrackMatches = (livePreviewContent.match(/width:\s*'32px'[\s\S]*?background:\s*'rgba\(255,\s*255,\s*255,\s*0\.15\)'/g) || []).length;
assert(
  oldTrackMatches === 0,
  29,
  'Zero occurrences of old white-translucent gauge tracks in 32px bars',
  { count: oldTrackMatches }
);

// Area 31: Quantitative WCAG Contrast Assertions
const ratioBlue = getContrastRatio('#2563eb', '#ffffff');
const ratioGreen = getContrastRatio('#059669', '#ffffff');
const ratioAmber = getContrastRatio('#b45309', '#ffffff');
const ratioRed = getContrastRatio('#dc2626', '#ffffff');
const ratioSlateText = getContrastRatio('#1e293b', '#ffffff');

assert(
  ratioBlue >= 4.5,
  30,
  `#2563eb hits WCAG AA contrast against #ffffff (computed: ${ratioBlue.toFixed(2)}:1 >= 4.5:1)`,
  { ratio: ratioBlue }
);

assert(
  ratioGreen >= 3.0,
  31,
  `#059669 hits WCAG AA Large/Bold contrast against #ffffff (computed: ${ratioGreen.toFixed(2)}:1 >= 3.0:1)`,
  { ratio: ratioGreen }
);

assert(
  ratioAmber >= 4.5,
  32,
  `#b45309 hits WCAG AA contrast against #ffffff (computed: ${ratioAmber.toFixed(2)}:1 >= 4.5:1)`,
  { ratio: ratioAmber }
);

assert(
  ratioRed >= 4.5,
  33,
  `#dc2626 hits WCAG AA contrast against #ffffff (computed: ${ratioRed.toFixed(2)}:1 >= 4.5:1)`,
  { ratio: ratioRed }
);

assert(
  ratioSlateText >= 7.0,
  34,
  `#1e293b hits WCAG AAA contrast against #ffffff (computed: ${ratioSlateText.toFixed(2)}:1 >= 7.0:1)`,
  { ratio: ratioSlateText }
);

// --- STUDIO HEADER NAV VERIFICATION ---
// Area 35: StudioHeaderNav button title
assert(
  studioHeaderNavContent.includes('title="Exit studio and browse all 89 CV templates in gallery"'),
  35,
  'StudioHeaderNav gallery button title updated with clarity',
  {}
);

// Area 36: StudioHeaderNav icon arrow_back
const headerNavButtonMatch = studioHeaderNavContent.match(/onClick=\{\(\) => setScreen\('gallery'\)\}[\s\S]*?<\/button>/);
const headerNavButton = headerNavButtonMatch ? headerNavButtonMatch[0] : '';
assert(
  headerNavButton.includes('>arrow_back</span>'),
  36,
  'StudioHeaderNav gallery button icon updated to arrow_back',
  { snippet: headerNavButton }
);

// Area 37: StudioHeaderNav button text
assert(
  headerNavButton.includes('Exit to Gallery'),
  37,
  'StudioHeaderNav gallery button label updated to "Exit to Gallery"',
  { snippet: headerNavButton }
);

// Area 38: Absence of old "grid_view" or "Browse all 89 CV templates" in header button
assert(
  !headerNavButton.includes('grid_view') && !headerNavButton.includes('title="Browse all 89 CV templates"'),
  38,
  'Absence of old grid_view icon and old title in header exit button',
  { snippet: headerNavButton }
);

// Area 39: Preservation of onClick={() => setScreen('gallery')}
assert(
  headerNavButton.includes("onClick={() => setScreen('gallery')}"),
  39,
  'Preservation of onClick={() => setScreen(\'gallery\')} handler',
  { snippet: headerNavButton }
);

// Area 40: Preservation of template picker adjacent button
assert(
  studioHeaderNavContent.includes('onClick={onOpenGallery}') && studioHeaderNavContent.includes('activeTemplateItem?.label'),
  40,
  'Adjacent onOpenGallery template dropdown picker remains intact and functional',
  {}
);

console.log('\n========================================');
console.log(`TOTAL TEST ASSERTIONS: ${totalAssertions}`);
console.log(`PASSED: ${passedAssertions}`);
console.log(`FAILED: ${failures.length}`);
console.log('========================================\n');

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
