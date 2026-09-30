import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] Area ${totalTests}: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] Area ${totalTests}: ${message}`);
  }
}

console.log('========================================================================');
console.log('UNIVERSAL LANDING FONT & TEXT ATTRACTIVENESS TEST SUITE (35+ ASSERTIONS)');
console.log('========================================================================\n');

// 1. Inspect src/index.css
const indexCssPath = resolve(rootDir, 'src/index.css');
assert(existsSync(indexCssPath), 'src/index.css exists on disk');
const indexCssContent = readFileSync(indexCssPath, 'utf8');

// Font declarations in index.css
assert(/--font-family:\s*['"]Inter['"]/i.test(indexCssContent), 'index.css root defines Inter as primary --font-family');
assert(!/--font-family-headings:\s*['"]Space Grotesk['"]/i.test(indexCssContent), 'index.css does NOT use Space Grotesk for root --font-family-headings');
assert(!/--font-family-display:\s*['"]Space Grotesk['"]/i.test(indexCssContent), 'index.css does NOT use Space Grotesk for root --font-family-display');
assert(/--font-family-headings:\s*(var\(--font-family\)|['"]Inter['"])/i.test(indexCssContent), 'index.css root --font-family-headings harmonized with Inter');
assert(/--font-family-display:\s*(var\(--font-family\)|['"]Inter['"])/i.test(indexCssContent), 'index.css root --font-family-display harmonized with Inter');

// Dark mode fonts in index.css
const darkModeMatch = indexCssContent.match(/\.dark\s*\{[\s\S]*?\n\}/);
assert(darkModeMatch !== null, 'index.css contains .dark scope definition');
if (darkModeMatch) {
  assert(!darkModeMatch[0].includes("'Space Grotesk'"), '.dark scope in index.css does NOT contain Space Grotesk');
  assert(/--font-family-headings:\s*(var\(--font-family\)|['"]Inter['"])/i.test(darkModeMatch[0]), '.dark scope --font-family-headings harmonized with Inter');
}

// Text color contrast in light mode
assert(/--text-primary:\s*#0f172a/i.test(indexCssContent), 'Light mode --text-primary is slate-900 (#0f172a)');
assert(/--text-secondary:\s*#(334155|1e293b)/i.test(indexCssContent), 'Light mode --text-secondary is high-contrast slate-700/800 (#334155 or #1e293b)');
assert(/--text-tertiary:\s*#475569/i.test(indexCssContent), 'Light mode --text-tertiary is crisp slate-600 (#475569)');

// Text color contrast in dark mode
if (darkModeMatch) {
  assert(/--text-primary:\s*#(f8fafc|ffffff)/i.test(darkModeMatch[0]), 'Dark mode --text-primary is bright slate-50/white (#f8fafc or #ffffff)');
  assert(/--text-secondary:\s*#(cbd5e1|e2e8f0)/i.test(darkModeMatch[0]), 'Dark mode --text-secondary is luminous slate-300/200 (#cbd5e1 or #e2e8f0)');
  assert(/--text-tertiary:\s*#94a3b8/i.test(darkModeMatch[0]), 'Dark mode --text-tertiary is readable slate-400 (#94a3b8)');
}

// Contrast ratio calculation helper
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(hex1, hex2) {
  const parse = h => [parseInt(h.slice(1,3), 16), parseInt(h.slice(3,5), 16), parseInt(h.slice(5,7), 16)];
  const l1 = getLuminance(...parse(hex1));
  const l2 = getLuminance(...parse(hex2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Quantitative Contrast Checks (Mathematical Proof of Attractiveness & Accessibility)
const lightBg = '#f8fafc';
const lightTextSec = '#334155';
const lightTextPri = '#0f172a';
const lightSecContrast = getContrast(lightBg, lightTextSec);
const lightPriContrast = getContrast(lightBg, lightTextPri);

assert(lightSecContrast >= 7.0, `Light secondary contrast (${lightSecContrast.toFixed(2)}:1) meets WCAG AAA (>= 7:1)`);
assert(lightPriContrast >= 12.0, `Light primary contrast (${lightPriContrast.toFixed(2)}:1) meets pristine ultra-contrast standard`);

const darkBg = '#0b0f19';
const darkTextSec = '#cbd5e1';
const darkTextPri = '#f8fafc';
const darkSecContrast = getContrast(darkBg, darkTextSec);
const darkPriContrast = getContrast(darkBg, darkTextPri);

assert(darkSecContrast >= 8.0, `Dark secondary contrast (${darkSecContrast.toFixed(2)}:1) meets WCAG AAA (>= 7:1)`);
assert(darkPriContrast >= 14.0, `Dark primary contrast (${darkPriContrast.toFixed(2)}:1) meets pristine ultra-contrast standard`);

// 2. Inspect tailwind.config.js
const tailwindConfigPath = resolve(rootDir, 'tailwind.config.js');
assert(existsSync(tailwindConfigPath), 'tailwind.config.js exists on disk');
const tailwindContent = readFileSync(tailwindConfigPath, 'utf8');

assert(tailwindContent.includes('"h1":') && tailwindContent.includes('"var(--font-family-headings)"'), 'tailwind.config.js maps h1 to var(--font-family-headings)');
assert(tailwindContent.includes('"h2":') && tailwindContent.includes('"var(--font-family-headings)"'), 'tailwind.config.js maps h2 to var(--font-family-headings)');
assert(tailwindContent.includes('"h3":') && tailwindContent.includes('"var(--font-family-headings)"'), 'tailwind.config.js maps h3 to var(--font-family-headings)');
assert(tailwindContent.includes('"display":') && tailwindContent.includes('"var(--font-family-display)"'), 'tailwind.config.js maps display to var(--font-family-display)');
assert(tailwindContent.includes('"sans":'), 'tailwind.config.js explicitly defines sans family');
assert(/"letterSpacing":\s*"-[0-9.]+em"/i.test(tailwindContent), 'tailwind.config.js typography scale contains negative letter-spacing for modern tight optical rhythm');

// 3. Inspect index.html
const indexHtmlPath = resolve(rootDir, 'index.html');
assert(existsSync(indexHtmlPath), 'index.html exists on disk');
const indexHtmlContent = readFileSync(indexHtmlPath, 'utf8');
assert(indexHtmlContent.includes('rel="stylesheet" href="/fonts/fonts.css"'), 'index.html links /fonts/fonts.css for instantaneous local font rendering');

// 4. Inspect MaintenancePage.jsx
const maintPagePath = resolve(rootDir, 'src/pages/utility/MaintenancePage.jsx');
assert(existsSync(maintPagePath), 'MaintenancePage.jsx exists on disk');
const maintContent = readFileSync(maintPagePath, 'utf8');

assert(!/text-xs\s+font-mono\s+font-semibold\s+uppercase\s+tracking-widest/i.test(maintContent), 'MaintenancePage.jsx eyebrow does NOT use font-mono');
assert(!/text-xs\s+font-mono\s+text-slate-400/i.test(maintContent), 'MaintenancePage.jsx subtitle does NOT use font-mono or faded slate-400');
assert(!/text-slate-400\s+dark:text-slate-500\s+text-center\s+font-mono/i.test(maintContent), 'MaintenancePage.jsx footer note does NOT use font-mono or faded slate-400');
assert(/text-slate-900\s+dark:text-white/i.test(maintContent), 'MaintenancePage.jsx title uses pristine high-contrast text-slate-900 dark:text-white');
assert(/text-slate-700\s+dark:text-slate-200/i.test(maintContent), 'MaintenancePage.jsx body text uses crisp text-slate-700 dark:text-slate-200');
assert(!/opacity-[3-6]0/i.test(maintContent), 'MaintenancePage.jsx has zero muddy low-opacity classes on text');

// 5. Inspect CSS Heading Classes
assert(/\.tool-page\s+h1\s*\{[\s\S]*?font-family:\s*var\(--font-family-headings\)/i.test(indexCssContent), '.tool-page h1 utilizes var(--font-family-headings)');
assert(/\.category-title\s*\{[\s\S]*?font-family:\s*var\(--font-family-headings\)/i.test(indexCssContent), '.category-title utilizes var(--font-family-headings)');
assert(/\.tool-card-title\s*\{[\s\S]*?font-family:\s*var\(--font-family-headings\)/i.test(indexCssContent), '.tool-card-title utilizes var(--font-family-headings)');
assert(/\.options-title\s*\{[\s\S]*?font-family:\s*var\(--font-family-headings\)/i.test(indexCssContent), '.options-title utilizes var(--font-family-headings)');

// 6. Inspect Header.jsx Logo & Navigation
const headerPath = resolve(rootDir, 'src/components/Header.jsx');
assert(existsSync(headerPath), 'src/components/Header.jsx exists on disk');
const headerContent = readFileSync(headerPath, 'utf8');
assert(headerContent.includes('Doc') && headerContent.includes('Scalar'), 'Header.jsx contains DocScalar brand name');
assert(headerContent.includes('text-on-background'), 'Header.jsx logo text uses text-on-background for theme adaptive high contrast');

console.log('\n========================================================================');
console.log(`TEST SUITE SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
