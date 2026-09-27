/**
 * test_server_first_copy_and_ops_suite.mjs
 * Comprehensive automated molecular verification suite for server-first copy,
 * privacy guarantees, and complete elimination of all misleading client-side/local claims.
 * 
 * Strict Anti-Inflation & Quantitative Test Invariant:
 * Minimum 30 distinct test areas, 50+ falsifiable assertions, 0 fake assertions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { TOOL_SEO_DATA } from '../../src/utils/seoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

let totalAssertions = 0;
let passedAssertions = 0;
const failures = [];

function test(description, fn) {
  totalAssertions++;
  try {
    fn();
    passedAssertions++;
    console.log(`  ✓ [PASS] Area ${totalAssertions}: ${description}`);
  } catch (err) {
    failures.push({ area: totalAssertions, description, error: err.message });
    console.error(`  ✗ [FAIL] Area ${totalAssertions}: ${description} -> ${err.message}`);
  }
}

console.log('\n=== Starting Molecular Server-First Copy & Zero-Local Claims Test Suite ===\n');

// 1. Read actual target source files (No local duplicates)
const homePath = path.join(rootDir, 'src/pages/Home.jsx');
const toolLayoutPath = path.join(rootDir, 'src/components/ToolPageLayout.jsx');
const organizePdfPath = path.join(rootDir, 'src/pages/pdf/OrganizePdf.jsx');
const pdfToWordPath = path.join(rootDir, 'src/pages/document/PdfToWord.jsx');
const securityPath = path.join(rootDir, 'src/pages/Security.jsx');
const pricingPath = path.join(rootDir, 'src/pages/Pricing.jsx');
const ocrPdfPath = path.join(rootDir, 'src/pages/pdf/OcrPdf.jsx');
const toastPath = path.join(rootDir, 'src/components/ModelDownloadToast.jsx');
const auditCertPath = path.join(rootDir, 'src/engines/pdf/auditCertificate.js');
const comparePdfPath = path.join(rootDir, 'src/engines/pdf/comparePdf.js');
const dailyApisPath = path.join(rootDir, 'src/utils/dailyLifeApis.js');
const seoDataPath = path.join(rootDir, 'src/utils/seoData.js');
const knowledgePath = path.join(rootDir, 'public/models/website_knowledge.json');
const trustBarPath = path.join(rootDir, 'src/components/TrustBar.jsx');
const dropzonePath = path.join(rootDir, 'src/components/FileDropzone.jsx');
const footerPath = path.join(rootDir, 'src/components/Footer.jsx');
const mergeModalPath = path.join(rootDir, 'src/components/MergeProgressModal.jsx');

const homeContent = fs.readFileSync(homePath, 'utf8');
const toolLayoutContent = fs.readFileSync(toolLayoutPath, 'utf8');
const organizePdfContent = fs.readFileSync(organizePdfPath, 'utf8');
const pdfToWordContent = fs.readFileSync(pdfToWordPath, 'utf8');
const securityContent = fs.readFileSync(securityPath, 'utf8');
const pricingContent = fs.readFileSync(pricingPath, 'utf8');
const ocrPdfContent = fs.readFileSync(ocrPdfPath, 'utf8');
const toastContent = fs.readFileSync(toastPath, 'utf8');
const auditCertContent = fs.readFileSync(auditCertPath, 'utf8');
const comparePdfContent = fs.readFileSync(comparePdfPath, 'utf8');
const dailyApisContent = fs.readFileSync(dailyApisPath, 'utf8');
const seoDataContent = fs.readFileSync(seoDataPath, 'utf8');
const knowledgeContent = fs.readFileSync(knowledgePath, 'utf8');
const trustBarContent = fs.readFileSync(trustBarPath, 'utf8');
const dropzoneContent = fs.readFileSync(dropzonePath, 'utf8');
const footerContent = fs.readFileSync(footerPath, 'utf8');
const mergeModalContent = fs.readFileSync(mergeModalPath, 'utf8');

// --- Section 1: Home.jsx Remediations ---
test('Home.jsx - Subtitle line 1781 does not contain "local conversion tool"', () => {
  assert.ok(!homeContent.includes('Launch any local conversion tool directly from your workspace studio to start working'));
});

test('Home.jsx - Subtitle line 1781 contains updated enterprise copy', () => {
  assert.ok(homeContent.includes('Launch any document studio tool directly from your workspace to start working'));
});

test('Home.jsx - Settings modal does not contain "Configure your local workspace parameters"', () => {
  assert.ok(!homeContent.includes('Configure your local workspace parameters'));
  assert.ok(homeContent.includes('Configure your workspace parameters'));
});

test('Home.jsx - System version does not claim "DocScalar Local Version"', () => {
  assert.ok(!homeContent.includes('DocScalar Local Version'));
  assert.ok(homeContent.includes('DocScalar App Version'));
});

test('Home.jsx - Delete single record toast does not say "local workspace"', () => {
  assert.ok(!homeContent.includes("showToast('Record deleted from local workspace.');"));
  assert.ok(homeContent.includes("showToast('Record deleted from workspace.');"));
});

test('Home.jsx - Clear workspace dialog title is "Clear Workspace History" not local', () => {
  assert.ok(!homeContent.includes("title: 'Clear Local History'"));
  assert.ok(homeContent.includes("title: 'Clear Workspace History'"));
});

test('Home.jsx - Clear workspace dialog message does not claim "browser database"', () => {
  assert.ok(!homeContent.includes('All saved files will be deleted from your browser database.'));
  assert.ok(homeContent.includes('All cached entries will be deleted.'));
});

test('Home.jsx - Clear workspace toast does not say "Local workspace cleared."', () => {
  assert.ok(!homeContent.includes("showToast('Local workspace cleared.');"));
  assert.ok(homeContent.includes("showToast('Workspace history cleared.');"));
});

test('Home.jsx - Upgrade modal Pro description does not claim "38 local/AI utilities"', () => {
  assert.ok(!homeContent.includes('38 local/AI utilities'));
  assert.ok(homeContent.includes('38 document and AI utilities'));
});

test('Home.jsx - Upgrade modal Free description does not claim "manage local files"', () => {
  assert.ok(!homeContent.includes('manage local files and preferences'));
  assert.ok(homeContent.includes('manage workspace files and preferences'));
});

// --- Section 2: ToolPageLayout.jsx Remediations ---
test('ToolPageLayout.jsx - Banner line 285 does not claim "local conversion engines"', () => {
  assert.ok(!toolLayoutContent.includes('advanced document utilities and local conversion engines'));
});

test('ToolPageLayout.jsx - Banner line 285 has "high-speed conversion engines"', () => {
  assert.ok(toolLayoutContent.includes('advanced document utilities and high-speed conversion engines'));
});

test('ToolPageLayout.jsx - Modal line 408 has "high-speed conversion engines"', () => {
  const matches = (toolLayoutContent.match(/high-speed conversion engines/g) || []).length;
  assert.strictEqual(matches, 2, 'Must appear in both guest gate and unauthenticated modal');
});

// --- Section 3: OrganizePdf.jsx Remediations ---
test('OrganizePdf.jsx - Success message does not say "saved locally"', () => {
  assert.ok(!organizePdfContent.includes('Your document has been compiled and saved locally.'));
});

test('OrganizePdf.jsx - Success message says "ready for download"', () => {
  assert.ok(organizePdfContent.includes('Your document has been compiled and is ready for download.'));
});

// --- Section 4: PdfToWord.jsx Remediations ---
test('PdfToWord.jsx - Engine mode helper does not claim "Fast on-device processing executes directly in your browser"', () => {
  assert.ok(!pdfToWordContent.includes('Fast on-device processing executes directly in your browser.'));
});

test('PdfToWord.jsx - Engine mode helper contains throughput optimization text', () => {
  assert.ok(pdfToWordContent.includes('Fast processing mode optimizes document throughput.'));
});

// --- Section 5: Security.jsx Remediations ---
test('Security.jsx - Line 68 does not claim "transformed locally in client WebAssembly"', () => {
  assert.ok(!securityContent.includes('transformed locally in client WebAssembly'));
});

test('Security.jsx - Line 68 guarantees transient memory-only sandboxes with immediate purge', () => {
  assert.ok(securityContent.includes('Documents are processed in transient, memory-only sandboxes with zero disk persistence, isolated RAM execution, and immediate post-download purge.'));
});

test('Security.jsx - Section 2 does not claim "files never touch any external server"', () => {
  assert.ok(!securityContent.includes('In these workflows, your files never touch any external server.'));
});

test('Security.jsx - Section 2 emphasizes transient memory sandboxes and zero permanent disk persistence', () => {
  assert.ok(securityContent.includes('DocScalar executes document conversions in isolated, transient memory sandboxes with zero permanent disk persistence.'));
});

// --- Section 6: Pricing.jsx Remediations ---
test('Pricing.jsx - Matrix feature row does not say "Local browser history cache"', () => {
  assert.ok(!pricingContent.includes('Local browser history cache'));
});

test('Pricing.jsx - Matrix feature row displays "Browser history cache"', () => {
  assert.ok(pricingContent.includes('Browser history cache'));
});

// --- Section 7: OcrPdf.jsx Remediations ---
test('OcrPdf.jsx - Meta description does not claim "Fast on-device"', () => {
  assert.ok(!ocrPdfContent.includes('Fast on-device and deep recognition options.'));
});

test('OcrPdf.jsx - Meta description specifies neural and deep recognition', () => {
  assert.ok(ocrPdfContent.includes('High-speed neural and deep recognition options.'));
});

// --- Section 8: ModelDownloadToast.jsx Remediations ---
test('ModelDownloadToast.jsx - Badge does not render "On-Device AI"', () => {
  assert.ok(!toastContent.includes("'On-Device AI'"));
});

test('ModelDownloadToast.jsx - Badge renders "DocScalar AI"', () => {
  assert.ok(toastContent.includes("'DocScalar AI'"));
});

// --- Section 9: PDF Engines Audit Certificates & Watermarks ---
test('auditCertificate.js - Footer does not claim "Client-Side Cryptographic Engine"', () => {
  assert.ok(!auditCertContent.includes('DocScalar Client-Side Cryptographic Engine'));
  assert.ok(auditCertContent.includes('DocScalar Cryptographic Engine'));
});

test('comparePdf.js - Watermark footer does not claim "Client-Side Forensic Diff Engine"', () => {
  assert.ok(!comparePdfContent.includes('DocScalar Client-Side Forensic Diff Engine'));
  assert.ok(comparePdfContent.includes('DocScalar Forensic Diff Engine'));
});

// --- Section 10: Utility Headers ---
test('dailyLifeApis.js - Header does not claim "100% client-side privacy-first architecture"', () => {
  assert.ok(!dailyApisContent.includes("DocScalar's 100% client-side privacy-first architecture."));
  assert.ok(dailyApisContent.includes("DocScalar's enterprise privacy-first architecture."));
});

// --- Section 11: SEO Metadata Integrity (seoData.js) ---
test('seoData.js - unzip-file does not claim "zero server uploads"', () => {
  assert.ok(!seoDataContent.includes('zero server uploads'));
});

test('seoData.js - unzip-file does not claim "client-side in browser WebAssembly memory"', () => {
  assert.ok(!seoDataContent.includes('client-side in browser WebAssembly memory'));
});

test('seoData.js - unzip-file FAQ reflects isolated transient memory buffers with immediate post-download purge', () => {
  assert.ok(seoDataContent.includes('DocScalar processes archives in isolated transient memory buffers with immediate post-download purge.'));
});

test('seoData.js - edit-pdf does not claim "directly in your browser"', () => {
  assert.ok(!seoDataContent.includes('shapes directly in your browser with zero document distortions'));
  assert.ok(seoDataContent.includes('shapes with zero document distortions'));
});

test('seoData.js - sign-pdf FAQ does not claim "locally in your browser session"', () => {
  assert.ok(!seoDataContent.includes('locally in your browser session'));
  assert.ok(seoDataContent.includes('in your active session'));
});

test('seoData.js - pdf-forms FAQ does not claim "browser session memory"', () => {
  assert.ok(!seoDataContent.includes('in your browser session memory'));
  assert.ok(seoDataContent.includes('in your active session memory'));
});

test('seoData.js - document-viewer description does not claim "in your browser"', () => {
  assert.ok(!seoDataContent.includes('PowerPoint PPTX documents in your browser.'));
  assert.ok(seoDataContent.includes('PowerPoint PPTX documents with high-fidelity formatting.'));
});

// --- Section 12: AI Assistant Knowledge Base (website_knowledge.json) ---
test('website_knowledge.json - Privacy chunk does not claim "100% Local First Privacy Architecture"', () => {
  assert.ok(!knowledgeContent.includes('100% Local First Privacy Architecture'));
});

test('website_knowledge.json - Privacy chunk does not claim "DocForge executes all document processing ... locally in your browser"', () => {
  assert.ok(!knowledgeContent.includes('DocForge executes all document processing'));
  assert.ok(!knowledgeContent.includes('NEVER uploaded to third-party cloud servers'));
});

test('website_knowledge.json - Privacy chunk reflects DocScalar enterprise transient memory sandboxes and shredding', () => {
  assert.ok(knowledgeContent.includes('DocScalar executes document processing in isolated transient memory sandboxes with secure transit encryption'));
  assert.ok(knowledgeContent.includes('files are automatically shredded from memory immediately after download'));
});

// --- Section 13: Quantitative String Multi-File Invariant Scan ---
const prohibitedPatterns = [
  /Launch any local conversion tool/i,
  /Configure your local workspace parameters/i,
  /DocScalar Local Version/i,
  /local conversion engines/i,
  /saved locally\./i,
  /executes directly in your browser/i,
  /transformed locally in client WebAssembly/i,
  /zero server uploads/i,
  /100% Local First/i,
  /38 local\/AI utilities/i,
  /manage local files and preferences/i,
  /Local browser history cache/i
];

prohibitedPatterns.forEach((pattern, idx) => {
  test(`Global Scan invariant #${idx + 1}: Pattern ${pattern.toString()} has 0 matches across tested files`, () => {
    const combinedFiles = [
      homeContent,
      toolLayoutContent,
      organizePdfContent,
      pdfToWordContent,
      securityContent,
      pricingContent,
      ocrPdfContent,
      toastContent,
      auditCertContent,
      comparePdfContent,
      dailyApisContent,
      seoDataContent,
      knowledgeContent
    ];
    let count = 0;
    for (const content of combinedFiles) {
      const m = content.match(pattern);
      if (m) count += m.length;
    }
    assert.strictEqual(count, 0, `Expected 0 matches for ${pattern}, found ${count}`);
  });
});

// --- Section 14: Dynamic Runtime Verification of seoData.js ---
test('Dynamic Runtime Import of seoData.js exports valid tool SEO mappings', () => {
  assert.ok(TOOL_SEO_DATA, 'TOOL_SEO_DATA must be an object');
  assert.ok(TOOL_SEO_DATA['unzip-file'], 'unzip-file entry must exist');
  assert.ok(TOOL_SEO_DATA['document-viewer'], 'document-viewer entry must exist');
  assert.ok(TOOL_SEO_DATA['edit-pdf'], 'edit-pdf entry must exist');
  assert.ok(TOOL_SEO_DATA['sign-pdf'], 'sign-pdf entry must exist');
  assert.ok(TOOL_SEO_DATA['pdf-forms'], 'pdf-forms entry must exist');
  assert.ok(TOOL_SEO_DATA['merge-pdf'], 'merge-pdf entry must exist');

  // Verify string invariants directly on parsed objects
  assert.ok(!TOOL_SEO_DATA['unzip-file'].description.includes('zero server uploads'));
  assert.ok(!TOOL_SEO_DATA['unzip-file'].faqs[0].a.includes('client-side'));
  assert.ok(!TOOL_SEO_DATA['document-viewer'].description.includes('in your browser'));
  assert.ok(!TOOL_SEO_DATA['edit-pdf'].description.includes('in your browser'));
  assert.ok(!TOOL_SEO_DATA['sign-pdf'].faqs[1].a.includes('locally'));
  assert.ok(!TOOL_SEO_DATA['pdf-forms'].faqs[0].a.includes('browser session memory'));
  assert.ok(!TOOL_SEO_DATA['merge-pdf'].faqs[0].a.includes('directly on your device'));
});

// --- Section 15: Trust Badges Hyphen-Free, Engine-Free & Number-Free Verification ---
test('TrustBar.jsx - Does not contain "End-to-End" or "TLS 1.3"', () => {
  assert.ok(!trustBarContent.includes('End-to-End'));
  assert.ok(!trustBarContent.includes('TLS 1.3'));
  assert.ok(!trustBarContent.includes('Auto-Purged'));
});

test('TrustBar.jsx - Contains verified hyphen-free badges', () => {
  assert.ok(trustBarContent.includes('Fast Secure Processing'));
  assert.ok(trustBarContent.includes('Encrypted Data Transfer'));
  assert.ok(trustBarContent.includes('Automatic File Purge'));
});

test('FileDropzone.jsx - Micro-trust badges do not contain "256-Bit", "TLS", or "30 Min"', () => {
  assert.ok(!dropzoneContent.includes('256-Bit TLS Encryption'));
  assert.ok(!dropzoneContent.includes('Auto-Purged in 30 Min'));
});

test('FileDropzone.jsx - Micro-trust badges render verified clean copy', () => {
  assert.ok(dropzoneContent.includes('Encrypted File Transfer'));
  assert.ok(dropzoneContent.includes('Automatic File Purge'));
  assert.ok(dropzoneContent.includes('Zero AI Training'));
});

test('Footer.jsx - Line 147 does not contain "256-Bit", "TLS", or "RAM-Only"', () => {
  assert.ok(!footerContent.includes('256-Bit TLS'));
  assert.ok(!footerContent.includes('RAM-Only'));
  assert.ok(footerContent.includes('Encrypted Transfer · Memory Processing · Zero AI Training'));
});

test('MergeProgressModal.jsx - Does not contain "End-to-End" or "Auto-Purged"', () => {
  assert.ok(!mergeModalContent.includes('End-to-End Encrypted Assembly'));
  assert.ok(!mergeModalContent.includes('Auto-Purged Processing'));
  assert.ok(mergeModalContent.includes('Encrypted Secure Assembly · Automatic Memory Purge'));
});

console.log('\n================================================================');
console.log(`Execution Complete: ${passedAssertions} / ${totalAssertions} assertions passed cleanly.`);
if (failures.length > 0) {
  console.error(`Total Failures: ${failures.length}`);
  process.exit(1);
} else {
  console.log(`Status: 100% Deterministic Compliance Verified across all 15 Target Areas.`);
  console.log('================================================================\n');
}
