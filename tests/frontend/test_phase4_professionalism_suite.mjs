/**
 * test_phase4_professionalism_suite.mjs
 * 
 * Molecular Test Suite for Phase 4: Professionalism, Visual Standards & Enterprise Security Copy
 * Enforces Zero-Assumption Rule, Law-Grade Precision, and Anti-Inflation Test Invariants (40+ assertions).
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT = process.cwd();

console.log('=== Starting Phase 4 Professionalism & Visual Standards Test Suite ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] Area ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Area ${totalTests}: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// 1. AIChatBot.jsx Integrity & Professionalism
// --------------------------------------------------------------------------
const aiChatBotContent = fs.readFileSync(path.join(ROOT, 'src/components/AIChatBot.jsx'), 'utf8');

runTest('AIChatBot: Suggested chips contain zero raw emoji glyphs', () => {
  const chipMatch = aiChatBotContent.match(/return\s*\[\s*([\s\S]*?)\s*\];\s*\}\s*,\s*\[location\.pathname\]/);
  assert(chipMatch, 'Suggested chips block not found');
  const chipBlock = chipMatch[1];
  assert(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(chipBlock), 'Found raw emojis in suggested chips');
});

runTest('AIChatBot: Suggested chips contain no casual toy prompts (Weather, Joke, Currency, Serendipity, London)', () => {
  assert(!aiChatBotContent.includes('Tokyo Weather'), 'Found Tokyo Weather in AIChatBot');
  assert(!aiChatBotContent.includes('USD to EUR'), 'Found USD to EUR in AIChatBot');
  assert(!aiChatBotContent.includes('Define serendipity'), 'Found serendipity in AIChatBot');
  assert(!aiChatBotContent.includes('Time in London'), 'Found Time in London in AIChatBot');
  assert(!aiChatBotContent.includes('100% Local Privacy guarantee'), 'Found 100% Local Privacy guarantee chip');
});

runTest('AIChatBot: Suggested chips include professional document workflows', () => {
  assert(aiChatBotContent.includes('Enterprise TLS & privacy'), 'Missing Enterprise TLS chip');
  assert(aiChatBotContent.includes('Convert PDF to Word or Excel'), 'Missing Convert PDF chip');
  assert(aiChatBotContent.includes('Compress PDF without quality loss'), 'Missing Compress PDF chip');
  assert(aiChatBotContent.includes('Batch redact sensitive PII'), 'Missing Batch redact chip');
  assert(aiChatBotContent.includes('Digitally sign PDF contracts'), 'Missing Digitally sign chip');
});

runTest('AIChatBot: Tool synthesis uses Enterprise Security instead of 100% Client-Side / Zero Cloud', () => {
  assert(!aiChatBotContent.includes('🔒 **100% Client-Side Privacy**'), 'Found old 100% Client-Side Privacy in tool synthesis');
  assert(!aiChatBotContent.includes('Zero bytes are uploaded to any cloud server'), 'Found zero bytes uploaded claim');
  assert(aiChatBotContent.includes('**Enterprise Security**: Processed with end-to-end TLS 1.3 encryption and transient memory cleanup'), 'Missing Enterprise Security synthesis statement');
});

runTest('AIChatBot: FAQ synthesis uses Enterprise Security Architecture instead of Zero Server Uploads', () => {
  assert(!aiChatBotContent.includes('### **100% Client-Side Privacy Architecture**'), 'Found old FAQ privacy heading');
  assert(!aiChatBotContent.includes('**Zero Server Uploads**:'), 'Found Zero Server Uploads FAQ claim');
  assert(aiChatBotContent.includes('### **Enterprise Security & Privacy Architecture**'), 'Missing Enterprise Security & Privacy FAQ heading');
  assert(aiChatBotContent.includes('**Confidential Document Processing**:'), 'Missing Confidential Document Processing heading');
  assert(aiChatBotContent.includes('Transient In-Memory Pipeline'), 'Missing Transient In-Memory Pipeline FAQ bullet');
});

runTest('AIChatBot: Greeting and identity reflect Document AI Copilot without contradictory claims', () => {
  assert(!aiChatBotContent.includes("DocScalar's On Device AI Copilot"), 'Found On Device AI Copilot in greeting');
  assert(!aiChatBotContent.includes("100% Client Side AI Copilot"), 'Found 100% Client Side AI Copilot in identity');
  assert(!aiChatBotContent.includes("100% local compute document operating system"), 'Found 100% local compute claim');
  assert(aiChatBotContent.includes("DocScalar's Document AI Copilot"), 'Missing Document AI Copilot greeting');
  assert(aiChatBotContent.includes("DocScalar is an enterprise-grade document operating system"), 'Missing enterprise-grade document operating system description');
});

runTest('AIChatBot: 44 Tools catalog query describes secure processing', () => {
  assert(!aiChatBotContent.includes('designed for 100% private, client side processing'), 'Found client side processing in catalog reply');
  assert(aiChatBotContent.includes('designed for high-performance, secure document processing'), 'Missing secure document processing in catalog reply');
});

runTest('AIChatBot: Clarify chips do not contain Tokyo weather or jokes', () => {
  const clarifyMatch = aiChatBotContent.match(/id:\s*`bot-clarify-[\s\S]*?chips:\s*\[([\s\S]*?)\]/);
  assert(clarifyMatch, 'Clarify chips block not found');
  const clarifyBlock = clarifyMatch[1];
  assert(!clarifyBlock.includes('Tokyo Weather'), 'Found Tokyo Weather in clarify chips');
  assert(!clarifyBlock.includes('joke'), 'Found joke in clarify chips');
  assert(clarifyBlock.includes('Security & Privacy'), 'Missing Security & Privacy clarify chip');
  assert(clarifyBlock.includes('Convert PDF to Word'), 'Missing Convert PDF clarify chip');
});

runTest('AIChatBot: Joke punchline and laugh responses contain no raw emoji glyphs', () => {
  assert(!aiChatBotContent.includes('Haha, like I said: **${activeJoke.punchline}** 😄'), 'Found emoji in punchline response');
  assert(!aiChatBotContent.includes('Glad that gave you a smile! 😄'), 'Found emoji in laugh response');
  assert(!aiChatBotContent.includes('{ title: \'😄 Another Joke\''), 'Found emoji in Another Joke chip');
  assert(!aiChatBotContent.includes('{ title: \'💡 Daily Advice\''), 'Found emoji in Daily Advice chip');
  assert(!aiChatBotContent.includes('{ title: \'Reveal Punchline 🎭\''), 'Found emoji in Reveal Punchline chip');
});

runTest('AIChatBot: Header badge and error message reflect enterprise readiness', () => {
  assert(!aiChatBotContent.includes('100% Client-Side Engine'), 'Found 100% Client-Side Engine in header badge');
  assert(aiChatBotContent.includes('Enterprise Copilot'), 'Missing Enterprise Copilot in header badge');
  assert(!aiChatBotContent.includes('All client side tools and canvas operations are running locally on your device.'), 'Found old error fallback text');
  assert(aiChatBotContent.includes('All tools and canvas operations are ready for secure processing.'), 'Missing secure processing error fallback text');
});

// --------------------------------------------------------------------------
// 2. AtsDiagnosticModal.jsx Visual & Icon Integrity
// --------------------------------------------------------------------------
const atsModalContent = fs.readFileSync(path.join(ROOT, 'src/components/ResumeStudio/AtsDiagnosticModal.jsx'), 'utf8');

runTest('AtsDiagnosticModal: Lucide icons imported correctly', () => {
  assert(/import\s*\{[^}]*AlertTriangle[^}]*\}\s*from\s*'lucide-react'/.test(atsModalContent), 'AlertTriangle not imported');
  assert(/import\s*\{[^}]*Sparkles[^}]*\}\s*from\s*'lucide-react'/.test(atsModalContent), 'Sparkles not imported');
});

runTest('AtsDiagnosticModal: Multi-column text collision header uses AlertTriangle instead of raw emoji', () => {
  assert(!atsModalContent.includes('<span>⚠️ Detected'), 'Found raw emoji ⚠️ in AtsDiagnosticModal');
  assert(atsModalContent.includes('<AlertTriangle size={15}'), 'Missing AlertTriangle in multi-column collision header');
  assert(atsModalContent.includes('Detected {xrayAnalysis.scrambledLines.length} Multi Column Text Collision(s)'), 'Missing text in collision header');
});

runTest('AtsDiagnosticModal: Transferable skills header uses Sparkles instead of raw emoji', () => {
  assert(!atsModalContent.includes('<span>💡 Transferable Skills Recognized'), 'Found raw emoji 💡 in AtsDiagnosticModal');
  assert(atsModalContent.includes('<Sparkles size={14}'), 'Missing Sparkles in transferable skills header');
  assert(atsModalContent.includes('Transferable Skills Recognized (75% credit):'), 'Missing text in transferable skills header');
});

runTest('AtsDiagnosticModal: Zero raw emoji glyphs in the entire file', () => {
  assert(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(atsModalContent), 'Found raw emoji in AtsDiagnosticModal.jsx');
});

// --------------------------------------------------------------------------
// 3. StartModePage.jsx Visual & Icon Integrity
// --------------------------------------------------------------------------
const startModeContent = fs.readFileSync(path.join(ROOT, 'src/components/ResumeStudio/StartModePage.jsx'), 'utf8');

runTest('StartModePage: Lucide Zap icon imported correctly', () => {
  assert(/import\s*\{[^}]*Zap[^}]*\}\s*from\s*'lucide-react'/.test(startModeContent), 'Zap not imported');
});

runTest('StartModePage: "Quickest way" badge uses Zap icon instead of raw emoji', () => {
  assert(!startModeContent.includes('⚡ Quickest way'), 'Found raw emoji ⚡ in StartModePage');
  assert(startModeContent.includes('<Zap size={11} strokeWidth={2.5} />'), 'Missing Zap icon in StartModePage badge');
  assert(startModeContent.includes('<span>Quickest way</span>'), 'Missing Quickest way span');
});

runTest('StartModePage: Zero raw emoji glyphs in the entire file', () => {
  assert(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(startModeContent), 'Found raw emoji in StartModePage.jsx');
});

// --------------------------------------------------------------------------
// 4. paginationEngine.js Badge Text & Calculation Parity
// --------------------------------------------------------------------------
const paginationEngineContent = fs.readFileSync(path.join(ROOT, 'src/engines/utility/paginationEngine.js'), 'utf8');

runTest('paginationEngine: badgeText contains no raw emojis', () => {
  assert(!paginationEngineContent.includes('⚠️ Page 1 Overflow'), 'Found raw emoji ⚠️ in paginationEngine badgeText');
  assert(!paginationEngineContent.includes('📄 Page 1:'), 'Found raw emoji 📄 in paginationEngine badgeText');
  assert(paginationEngineContent.includes('? `Page 1 Overflow (+${Math.abs(headroomPx)}px)`'), 'Missing clean overflow badgeText');
  assert(paginationEngineContent.includes(': `Page 1: ${page1FillPct}% · ${headroomPx}px headroom`'), 'Missing clean normal badgeText');
});

runTest('paginationEngine: badgeText format calculation parity test', async () => {
  const { computePageBudgetMetrics } = await import('../../src/engines/utility/paginationEngine.js');
  // Normal headroom case: content 500px, container safe A4 1123px
  const diagNormal = computePageBudgetMetrics(500, 1123);
  assert(diagNormal.badgeText.startsWith('Page 1:'), `Expected badgeText to start with 'Page 1:', got: ${diagNormal.badgeText}`);
  assert(!diagNormal.badgeText.includes('📄'), 'Found emoji in computed badgeText');
  assert(!diagNormal.badgeText.includes('⚠️'), 'Found emoji in computed badgeText');
  assert.strictEqual(diagNormal.headroomPx, 623);
  assert.strictEqual(diagNormal.page1FillPct, 45);
  assert.strictEqual(diagNormal.badgeText, 'Page 1: 45% · 623px headroom');

  // Overflow case: content 1400px
  const diagOverflow = computePageBudgetMetrics(1400, 1123);
  assert(diagOverflow.badgeText.startsWith('Page 1 Overflow'), `Expected overflow badgeText, got: ${diagOverflow.badgeText}`);
  assert(!diagOverflow.badgeText.includes('⚠️'), 'Found emoji in overflow badgeText');
  assert.strictEqual(diagOverflow.overflowPx, 277);
  assert.strictEqual(diagOverflow.badgeText, 'Page 1 Overflow (+277px)');
});

// --------------------------------------------------------------------------
// 5. OcrPdf.jsx & PdfForms.jsx Cleanliness
// --------------------------------------------------------------------------
const ocrPdfContent = fs.readFileSync(path.join(ROOT, 'src/pages/pdf/OcrPdf.jsx'), 'utf8');
const pdfFormsContent = fs.readFileSync(path.join(ROOT, 'src/pages/pdf/PdfForms.jsx'), 'utf8');

runTest('OcrPdf: Auto-detect language entry does not use raw globe emoji', () => {
  assert(!ocrPdfContent.includes("flag: '🌐'"), 'Found raw emoji 🌐 in OcrPdf LANGUAGES');
  assert(ocrPdfContent.includes("flag: 'GLOBAL'"), 'Missing flag: GLOBAL in OcrPdf LANGUAGES');
});

runTest('PdfForms: Auto-detection scan messages contain no raw sparkle emojis', () => {
  assert(!pdfFormsContent.includes('✨ Detected'), 'Found raw emoji ✨ in PdfForms line 245');
  assert(!pdfFormsContent.includes('✨ Scan complete'), 'Found raw emoji ✨ in PdfForms line 282');
  assert(!pdfFormsContent.includes('✨ Analyzed Page'), 'Found raw emoji ✨ in PdfForms line 738');
  assert(pdfFormsContent.includes('setScanMessage(`Detected ${detected.length} form boxes'), 'Missing clean scanMessage on line 245');
  assert(pdfFormsContent.includes('setScanMessage(`Scan complete: Found ${allDetected.length} form boxes'), 'Missing clean scanMessage on line 282');
  assert(pdfFormsContent.includes('setScanMessage(`Analyzed Page ${currentPage}: ${detected.length} form boxes'), 'Missing clean scanMessage on line 738');
});

// --------------------------------------------------------------------------
// 6. StitchCanvas.jsx Telemetry Pill Formatting
// --------------------------------------------------------------------------
const stitchCanvasContent = fs.readFileSync(path.join(ROOT, 'src/components/StitchCanvas.jsx'), 'utf8');

runTest('StitchCanvas: formatTelemetryPill does not prepend raw lightning emoji', () => {
  assert(!stitchCanvasContent.includes('const raw = `⚡ ${durationSec}s'), 'Found raw emoji ⚡ in formatTelemetryPill');
  assert(stitchCanvasContent.includes('const raw = `${durationSec}s · ${throughputPart}${deltaPart}`;'), 'Missing clean telemetry pill formatting');
});

runTest('StitchCanvas: formatTelemetryPill numeric output verification', () => {
  const fnMatch = stitchCanvasContent.match(/export const formatTelemetryPill = ([\s\S]*?^\});/m);
  assert(fnMatch, 'formatTelemetryPill function not found in StitchCanvas.jsx');
  const formatTelemetryPill = (new Function(`return (${fnMatch[1].trim()})`))();

  const pill1 = formatTelemetryPill({ durationSec: 1.25, throughputMbSec: 15.6, sizeDeltaPct: -42 });
  assert.strictEqual(pill1, '1.25s · 15.6 MB/s · -42%', `Unexpected pill formatting: ${pill1}`);

  const pill2 = formatTelemetryPill({ durationSec: 0.8, throughputMbSec: null, sizeDeltaPct: 15 });
  assert.strictEqual(pill2, '0.8s · +15%', `Unexpected positive delta formatting: ${pill2}`);

  const pill3 = formatTelemetryPill(null);
  assert.strictEqual(pill3, '', 'Expected empty string for null telemetry');
});

// --------------------------------------------------------------------------
// 7. DocumentViewer.jsx Text & Security Cleanliness
// --------------------------------------------------------------------------
const docViewerContent = fs.readFileSync(path.join(ROOT, 'src/pages/utility/DocumentViewer.jsx'), 'utf8');

runTest('DocumentViewer: SEO description has no duplicated text', () => {
  assert(!docViewerContent.includes('Client Side and Client Side'), 'Found duplicated "Client Side and Client Side" in DocumentViewer');
  assert(docViewerContent.includes('description="Preview any document type with high fidelity on DocScalar."'), 'Missing clean SEO description in DocumentViewer');
});

runTest('DocumentViewer: Dropzone description has no outdated "never touch our servers" claim', () => {
  assert(!docViewerContent.includes('Your files never touch our servers'), 'Found "never touch our servers" in DocumentViewer');
  assert(docViewerContent.includes('preview it instantly with secure, private in-browser rendering.'), 'Missing clean dropzone description in DocumentViewer');
});

// --------------------------------------------------------------------------
// 8. PostProcessingNextActions.jsx & StickyStack.jsx
// --------------------------------------------------------------------------
const postProcContent = fs.readFileSync(path.join(ROOT, 'src/components/PostProcessingNextActions.jsx'), 'utf8');
const stickyStackContent = fs.readFileSync(path.join(ROOT, 'src/components/StickyStack.jsx'), 'utf8');

runTest('PostProcessingNextActions: Badge renders Encrypted & Private instead of Zero Cloud Upload', () => {
  assert(!postProcContent.includes('Zero Cloud Upload'), 'Found Zero Cloud Upload in PostProcessingNextActions');
  assert(postProcContent.includes('Encrypted & Private'), 'Missing Encrypted & Private in PostProcessingNextActions');
});

runTest('StickyStack: Card 2 renders Confidential Processing with ShieldCheck icon', () => {
  assert(!stickyStackContent.includes('title: "On-Device Processing"'), 'Found On-Device Processing in StickyStack');
  assert(stickyStackContent.includes('title: "Confidential Processing"'), 'Missing Confidential Processing in StickyStack');
  assert(stickyStackContent.includes('Enterprise security by default'), 'Missing Enterprise security description in StickyStack');
  assert(/import\s*\{[^}]*ShieldCheck[^}]*\}\s*from\s*"lucide-react"/.test(stickyStackContent), 'ShieldCheck not imported in StickyStack');
});

runTest('StickyStack: Card 2 has no purple/pink gradient (Anti-AI-Purple rule)', () => {
  assert(!stickyStackContent.includes('from-purple-100/50'), 'Found purple gradient in StickyStack Card 2');
  assert(!stickyStackContent.includes('to-pink-100/50'), 'Found pink gradient in StickyStack Card 2');
  assert(stickyStackContent.includes('from-sky-100/50 to-blue-100/50'), 'Missing sky-to-blue gradient in StickyStack Card 2');
});

// --------------------------------------------------------------------------
// 9. Document & PDF Studios Conversion Metadata Parity
// --------------------------------------------------------------------------
const compressPdfContent = fs.readFileSync(path.join(ROOT, 'src/pages/pdf/CompressPdf.jsx'), 'utf8');
const docxToPdfContent = fs.readFileSync(path.join(ROOT, 'src/pages/document/DocxToPdf.jsx'), 'utf8');
const pdfToWordContent = fs.readFileSync(path.join(ROOT, 'src/pages/document/PdfToWord.jsx'), 'utf8');
const pptToPdfContent = fs.readFileSync(path.join(ROOT, 'src/pages/document/PowerpointToPdf.jsx'), 'utf8');
const htmlToPdfContent = fs.readFileSync(path.join(ROOT, 'src/pages/document/HtmlToPdf.jsx'), 'utf8');

runTest('CompressPdf: Workspace header badge renders Encrypted & Private', () => {
  assert(!compressPdfContent.includes('<span>100% Client-Side Private</span>'), 'Found 100% Client-Side Private in CompressPdf');
  assert(compressPdfContent.includes('<span>Encrypted & Private</span>'), 'Missing Encrypted & Private in CompressPdf');
});

runTest('DocxToPdf: SEO description uses Fast, encrypted conversion', () => {
  assert(!docxToPdfContent.includes('Client-side private conversion and desktop high-fidelity'), 'Found old Client-side private conversion in DocxToPdf');
  assert(docxToPdfContent.includes('Fast, encrypted conversion and desktop high-fidelity support.'), 'Missing Fast, encrypted conversion in DocxToPdf');
});

runTest('PdfToWord: SEO description uses Fast, secure conversion', () => {
  assert(!pdfToWordContent.includes('Fast client-side private conversion and desktop'), 'Found old Fast client-side private conversion in PdfToWord');
  assert(pdfToWordContent.includes('Fast, secure conversion and desktop high-fidelity layout support.'), 'Missing Fast, secure conversion in PdfToWord');
});

runTest('PdfToWord: Client mode description states browser execution without zero cloud claim', () => {
  assert(!pdfToWordContent.includes('Client-side processing preserves complete privacy with zero cloud upload.'), 'Found zero cloud upload claim in PdfToWord engine mode description');
  assert(pdfToWordContent.includes('Fast on-device processing executes directly in your browser.'), 'Missing browser execution description in PdfToWord');
});

runTest('PowerpointToPdf: SEO description uses confidential document conversion', () => {
  assert(!pptToPdfContent.includes('Fast, secure, and client-side private conversion.'), 'Found client-side private conversion in PowerpointToPdf');
  assert(pptToPdfContent.includes('Fast, secure, and confidential document conversion.'), 'Missing confidential document conversion in PowerpointToPdf');
});

runTest('HtmlToPdf: Sample template uses privacy protection without client-only buzzword', () => {
  assert(!htmlToPdfContent.includes('Client-side 100% private sandbox rendering'), 'Found old sample text in HtmlToPdf');
  assert(htmlToPdfContent.includes('High-fidelity sandbox rendering with privacy protection'), 'Missing updated sample text in HtmlToPdf');
});

// --------------------------------------------------------------------------
// 10. dailyLifeApis.js Markdown Output Cleanliness
// --------------------------------------------------------------------------
const dailyApisContent = fs.readFileSync(path.join(ROOT, 'src/utils/dailyLifeApis.js'), 'utf8');

runTest('dailyLifeApis: Wikipedia summary title heading has no raw emoji', () => {
  assert(!dailyApisContent.includes('### **🏛️ ${data.title}**'), 'Found raw emoji 🏛️ in dailyLifeApis');
  assert(dailyApisContent.includes('### **${data.title}**\\n\\n'), 'Missing clean title in dailyLifeApis Wikipedia summary');
});

runTest('dailyLifeApis: Fallback joke punchline has no raw emoji', () => {
  assert(!dailyApisContent.includes('Because light attracts bugs! 🐛'), 'Found raw emoji 🐛 in dailyLifeApis fallback joke');
  assert(dailyApisContent.includes("const fallbackPunchline = 'Because light attracts bugs!';"), 'Missing clean fallback joke punchline in dailyLifeApis');
});

runTest('dailyLifeApis: Country summary heading has no raw emoji', () => {
  assert(!dailyApisContent.includes('### **🌍 ${data.title}**'), 'Found raw emoji 🌍 in dailyLifeApis country summary');
  assert(dailyApisContent.includes('### **${data.title}** *(${desc})*\\n\\n'), 'Missing clean title in dailyLifeApis country summary');
});

// --------------------------------------------------------------------------
// Summary & Final Certification
// --------------------------------------------------------------------------
console.log(`\n========================================================`);
console.log(`Phase 4 Professionalism Suite: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
