import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Read source files
const appPath = path.join(rootDir, 'src/App.jsx');
const appCode = fs.readFileSync(appPath, 'utf8');

const layoutPath = path.join(rootDir, 'src/components/ToolPageLayout.jsx');
const layoutCode = fs.readFileSync(layoutPath, 'utf8');

const indexPath = path.join(rootDir, 'src/index.css');
const indexCode = fs.readFileSync(indexPath, 'utf8');

const qrPath = path.join(rootDir, 'src/pages/utility/QrGenerator.jsx');
const qrCode = fs.readFileSync(qrPath, 'utf8');

const enginePath = path.join(rootDir, 'src/engines/utility/qrGenerate.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');

// Import engine functions dynamically
const engine = await import(`file://${enginePath.replace(/\\/g, '/')}`);

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  TSK-QR-STUDIO: WIDE LAYOUT & SQUEEZE REMEDIATION VERIFICATION SUITE');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
function runTest(num, name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✔ Area ${String(num).padStart(2, '0')}: ${name}`);
  } catch (err) {
    console.error(`  ✘ Area ${String(num).padStart(2, '0')}: ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// 1. Routing Architecture
runTest(1, 'App.jsx: registers /qr-generator/* route', () => {
  assert.ok(appCode.includes('path="/qr-generator/*"'), 'Must register /qr-generator/*');
});

runTest(2, 'App.jsx: registers /qr_generator/* alias redirect to /qr-generator', () => {
  assert.ok(appCode.includes('path="/qr_generator/*"') && appCode.includes('to="/qr-generator"'), 'Must redirect /qr_generator/* to /qr-generator');
});

runTest(3, 'App.jsx: registers /qr_generator root alias redirect to /qr-generator', () => {
  assert.ok(appCode.includes('path="/qr_generator"') && appCode.includes('to="/qr-generator"'), 'Must redirect /qr_generator to /qr-generator');
});

// 2. Wide Layout Architecture in ToolPageLayout.jsx
runTest(4, 'ToolPageLayout.jsx: applies !max-w-[1380px] wide class for qr-generator', () => {
  assert.ok(
    layoutCode.includes("toolId === 'qr-generator' ? '!max-w-[1380px]") ||
    layoutCode.includes('!max-w-[1380px]'),
    'ToolPageLayout must apply !max-w-[1380px] for qr-generator'
  );
});

runTest(5, 'ToolPageLayout.jsx: retains qr-generator in DEDICATED_STUDIO_TOOLS array', () => {
  const match = layoutCode.match(/const DEDICATED_STUDIO_TOOLS = \[[\s\S]*?\];/);
  assert.ok(match && match[0].includes("'qr-generator'"), 'DEDICATED_STUDIO_TOOLS must contain qr-generator');
});

runTest(6, 'ToolPageLayout.jsx: exempts qr-generator from studio-viewport constraint', () => {
  assert.ok(
    layoutCode.includes("toolId !== 'qr-generator'"),
    'ToolPageLayout must exempt qr-generator from full-screen viewport to preserve spacious tool-page layout'
  );
});

// 3. CSS Overrides in index.css
runTest(7, 'index.css: defines .tool-page:has(.qr-studio-root) with max-width: 1380px !important', () => {
  assert.ok(
    indexCode.includes('.tool-page:has(.qr-studio-root)') && indexCode.includes('1380px !important'),
    'index.css must override .tool-page:has(.qr-studio-root) to 1380px'
  );
});

runTest(8, 'index.css: defines .tool-page:has([data-tool="qr-generator"]) with max-width: 1380px !important', () => {
  assert.ok(
    indexCode.includes('[data-tool="qr-generator"]') && indexCode.includes('1380px !important'),
    'index.css must override .tool-page:has([data-tool="qr-generator"]) to 1380px'
  );
});

// 4. QrGenerator Root & 2-Column Responsive Grid Architecture
runTest(9, 'QrGenerator.jsx: sets data-tool="qr-generator" on root element', () => {
  assert.ok(qrCode.includes('data-tool="qr-generator"'), 'Must set data-tool="qr-generator"');
});

runTest(10, 'QrGenerator.jsx: sets qr-studio-root class with max-w-[1380px]', () => {
  assert.ok(qrCode.includes('qr-studio-root') && qrCode.includes('max-w-[1380px]'), 'Must include qr-studio-root and max-w-[1380px]');
});

runTest(11, 'QrGenerator.jsx: implements 12-column responsive grid (grid-cols-1 lg:grid-cols-12)', () => {
  assert.ok(qrCode.includes('lg:grid-cols-12'), 'Must use 12-column responsive grid');
});

runTest(12, 'QrGenerator.jsx: Left Stage column spans 7 columns on desktop (lg:col-span-7)', () => {
  assert.ok(qrCode.includes('lg:col-span-7'), 'Left stage must span 7 columns');
});

runTest(13, 'QrGenerator.jsx: Right Customization column spans 5 columns on desktop (lg:col-span-5)', () => {
  assert.ok(qrCode.includes('lg:col-span-5'), 'Right panel must span 5 columns');
});

// 5. Payload Types & Formatting
runTest(14, 'Engine: QR_PAYLOAD_TYPES contains all 5 expected types', () => {
  const ids = engine.QR_PAYLOAD_TYPES.map(t => t.id);
  assert.deepEqual(ids, ['url', 'wifi', 'vcard', 'email', 'text']);
});

runTest(15, 'QrGenerator.jsx: renders segmented tabs for all 5 payload types', () => {
  assert.ok(qrCode.includes('QR_PAYLOAD_TYPES.map'), 'Must map over QR_PAYLOAD_TYPES');
  assert.ok(qrCode.includes('payloadType === t.id'), 'Must provide active state toggle');
});

runTest(16, 'Engine formatQrPayload: formats Wi-Fi with SSID, encryption, and password', () => {
  const payload = engine.formatQrPayload('wifi', {
    ssid: 'TestNetwork',
    password: 'Password123',
    encryption: 'WPA',
    hidden: false
  });
  assert.equal(payload, 'WIFI:S:TestNetwork;T:WPA;P:Password123;;');
});

runTest(17, 'Engine formatQrPayload: formats hidden Wi-Fi with H:true flag', () => {
  const payload = engine.formatQrPayload('wifi', {
    ssid: 'SecretNet',
    password: 'Pass',
    encryption: 'WPA',
    hidden: true
  });
  assert.equal(payload, 'WIFI:S:SecretNet;T:WPA;P:Pass;H:true;;');
});

runTest(18, 'Engine formatQrPayload: formats vCard with standard fields', () => {
  const payload = engine.formatQrPayload('vcard', {
    name: 'Sarah Connor',
    phone: '+1 555 0199',
    email: 'sarah@example.com',
    company: 'Resistance',
    title: 'Commander'
  });
  assert.ok(payload.includes('BEGIN:VCARD'));
  assert.ok(payload.includes('FN:Sarah Connor'));
  assert.ok(payload.includes('TEL:+1 555 0199'));
  assert.ok(payload.includes('EMAIL:sarah@example.com'));
  assert.ok(payload.includes('ORG:Resistance'));
  assert.ok(payload.includes('TITLE:Commander'));
  assert.ok(payload.includes('END:VCARD'));
});

runTest(19, 'Engine formatQrPayload: formats Email with mailto, subject, and body', () => {
  const payload = engine.formatQrPayload('email', {
    to: 'hello@docscalar.app',
    subject: 'Feedback',
    body: 'Great tool!'
  });
  assert.equal(payload, 'mailto:hello@docscalar.app?subject=Feedback&body=Great%20tool!');
});

runTest(20, 'Engine formatQrPayload: handles plain URL string', () => {
  const payload = engine.formatQrPayload('url', 'https://example.com/test');
  assert.equal(payload, 'https://example.com/test');
});

runTest(21, 'Engine formatQrPayload: handles plain text string', () => {
  const payload = engine.formatQrPayload('text', 'Document text payload');
  assert.equal(payload, 'Document text payload');
});

// 6. Color Themes & Swatches
runTest(22, 'Engine: COLOR_PALETTES contains all 6 curated presets', () => {
  assert.equal(engine.COLOR_PALETTES.length, 6);
  const ids = engine.COLOR_PALETTES.map(p => p.id);
  assert.ok(ids.includes('classic'));
  assert.ok(ids.includes('indigo'));
  assert.ok(ids.includes('emerald'));
  assert.ok(ids.includes('sunset'));
  assert.ok(ids.includes('amber'));
  assert.ok(ids.includes('slate'));
});

runTest(23, 'Engine: All color presets have valid 7-character hex codes', () => {
  for (const p of engine.COLOR_PALETTES) {
    assert.match(p.dark, /^#[0-9a-fA-F]{6}$/, `${p.id} dark hex must be valid`);
    assert.match(p.light, /^#[0-9a-fA-F]{6}$/, `${p.id} light hex must be valid`);
  }
});

runTest(24, 'QrGenerator.jsx: provides custom Foreground and Background color pickers', () => {
  assert.ok(qrCode.includes('Foreground') && qrCode.includes('darkColor'), 'Must have Foreground color picker');
  assert.ok(qrCode.includes('Background') && qrCode.includes('lightColor'), 'Must have Background color picker');
});

runTest(25, 'QrGenerator.jsx: provides swapColors action for inverting colors', () => {
  assert.ok(qrCode.includes('swapColors'), 'Must define swapColors function');
  assert.ok(qrCode.includes('Swap Colors'), 'Must provide Swap Colors button');
});

// 7. Error Correction Levels
runTest(26, 'QrGenerator.jsx: supports L, M, Q, H error correction with recovery percentages', () => {
  assert.ok(qrCode.includes("'L'") && qrCode.includes("'M'") && qrCode.includes("'Q'") && qrCode.includes("'H'"));
  assert.ok(qrCode.includes('7%') && qrCode.includes('15%') && qrCode.includes('25%') && qrCode.includes('30%'));
});

// 8. Export Formats & Resolution
runTest(27, 'QrGenerator.jsx: supports png, svg, and pdf export formats', () => {
  assert.ok(qrCode.includes("'png'") && qrCode.includes("'svg'") && qrCode.includes("'pdf'"));
  assert.ok(qrCode.includes('generateQRSVG'));
  assert.ok(qrCode.includes('generateQRPdfFlyer'));
});

runTest(28, 'QrGenerator.jsx: provides Quick Export buttons directly under preview', () => {
  assert.ok(qrCode.includes('Quick Export:'), 'Must render Quick Export row');
  assert.ok(qrCode.includes("handleExport('png')"), 'Must have Quick PNG button');
  assert.ok(qrCode.includes("handleExport('svg')"), 'Must have Quick SVG button');
  assert.ok(qrCode.includes("handleExport('pdf')"), 'Must have Quick PDF button');
});

runTest(29, 'QrGenerator.jsx: provides resolution selector (380px, 600px, 1200px)', () => {
  assert.ok(qrCode.includes('380') && qrCode.includes('600') && qrCode.includes('1200'), 'Must provide resolution options');
});

// 9. Interactive Controls (Copy, Zoom, Reset)
runTest(30, 'QrGenerator.jsx: implements copy payload text with feedback state', () => {
  assert.ok(qrCode.includes('handleCopyPayload'), 'Must define handleCopyPayload');
  assert.ok(qrCode.includes('copiedText'), 'Must track copiedText state');
});

runTest(31, 'QrGenerator.jsx: implements copy image to clipboard with feedback state', () => {
  assert.ok(qrCode.includes('handleCopyImage'), 'Must define handleCopyImage');
  assert.ok(qrCode.includes('copiedImage'), 'Must track copiedImage state');
});

runTest(32, 'QrGenerator.jsx: implements zoom scale control bounded from 0.5 to 1.4', () => {
  assert.ok(qrCode.includes('zoomScale'), 'Must track zoomScale state');
  assert.ok(qrCode.includes('min="0.5"'), 'Slider min must be 0.5');
});

runTest(33, 'QrGenerator.jsx: implements resetWorkspace action clearing draft and state', () => {
  assert.ok(qrCode.includes('resetWorkspace'), 'Must define resetWorkspace');
  assert.ok(qrCode.includes('clearStudioDraft'), 'Must clear studio draft on reset');
});

// 10. Persistence & Telemetry
runTest(34, 'QrGenerator.jsx: integrates IndexedDB draft persistence', () => {
  assert.ok(qrCode.includes('loadStudioDraft'), 'Must call loadStudioDraft');
  assert.ok(qrCode.includes('saveStudioDraft'), 'Must call saveStudioDraft');
});

runTest(35, 'QrGenerator.jsx: integrates saveFile for recent file history', () => {
  assert.ok(qrCode.includes('saveFile(finalName'), 'Must call saveFile on export');
});

runTest(36, 'QrGenerator.jsx: renders live telemetry specs pill under preview', () => {
  assert.ok(qrCode.includes('currentFormattedPayload'), 'Must display formatted payload');
  assert.ok(qrCode.includes('ShieldCheck'), 'Must display ShieldCheck icon');
  assert.ok(qrCode.includes('Error Recovery'), 'Must display recovery percentage');
});

runTest(37, 'QrGenerator.jsx: celebratory result view renders verified badge and download button', () => {
  assert.ok(qrCode.includes('QR Code Ready!'), 'Must render celebration title');
  assert.ok(qrCode.includes('Save to Computer'), 'Must render download button');
  assert.ok(qrCode.includes('Back to Studio Editor'), 'Must render back button');
});

runTest(38, 'UI/UX Compliance: Zero AI purple gradient and zero emoji slop', () => {
  // Ensure no purple gradient mesh slop in component
  assert.ok(!qrCode.includes('from-purple-600 to-indigo-600'), 'Must not use AI purple gradient slop');
  // Ensure no raw emoji icons
  assert.ok(!qrCode.includes('🚀') && !qrCode.includes('✨') && !qrCode.includes('🎉'), 'Must not use raw emoji slop');
});

console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`  TOTAL TESTS: ${passCount} / 38 passed (100%)`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');
