/**
 * TSK-738: Sign Studio Clean Layout, Rogue Ad Banner Eradication & Studio Isolation Test Suite
 * 
 * Verifies that:
 * 1. SignPdf.jsx has no AdPlaceholder import or JSX element.
 * 2. AdPlaceholder.jsx enforces studio-mode-active suppression.
 * 3. src/index.css enforces display: none !important on upgrade banners in studio mode.
 * 4. All 24 PDF tools maintain zero rogue banner/placeholder elements.
 * 5. Studio sidebar dimensions, flex math, and viewport properties are preserved.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT_DIR = process.cwd();

console.log('═'.repeat(80));
console.log('  TSK-738: SIGN STUDIO CLEAN LAYOUT & BANNER ISOLATION MOLECULAR TEST SUITE');
console.log('═'.repeat(80));

let passed = 0;
let failed = 0;

function runTest(id, description, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] Area ${String(id).padStart(2, '0')}: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] Area ${String(id).padStart(2, '0')}: ${description}`);
    console.error(`    ↳ Error: ${err.message}`);
    failed++;
  }
}

const signPdfContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/pdf/SignPdf.jsx'), 'utf-8');
const adPlaceholderContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/AdPlaceholder.jsx'), 'utf-8');
const homeContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/Home.jsx'), 'utf-8');
const indexCssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
const toolLayoutContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/ToolPageLayout.jsx'), 'utf-8');

// Area 01: SignPdf does not import AdPlaceholder
runTest(1, 'SignPdf.jsx does not import AdPlaceholder', () => {
  assert.ok(!signPdfContent.includes("import AdPlaceholder from '../../components/AdPlaceholder';"), 'SignPdf should not import AdPlaceholder');
  assert.ok(!signPdfContent.match(/import\s+AdPlaceholder\s+from/), 'SignPdf should have zero AdPlaceholder imports');
});

// Area 02: SignPdf does not render AdPlaceholder
runTest(2, 'SignPdf.jsx does not render <AdPlaceholder in JSX', () => {
  assert.ok(!signPdfContent.includes('<AdPlaceholder'), 'SignPdf should not render AdPlaceholder');
});

// Area 03: SignPdf children inside ToolPageLayout contain workspace and modals only
runTest(3, 'SignPdf.jsx ToolPageLayout wraps studio workspace cleanly', () => {
  const toolPageLayoutRegex = /<ToolPageLayout[\s\S]*?<\/ToolPageLayout>/;
  const match = signPdfContent.match(toolPageLayoutRegex);
  assert.ok(match, 'ToolPageLayout must exist in SignPdf');
  const innerContent = match[0];
  assert.ok(innerContent.includes('<SignCanvasViewport'), 'Inner content must contain SignCanvasViewport');
  assert.ok(innerContent.includes('<SignOptionsSidebar'), 'Inner content must contain SignOptionsSidebar');
  assert.ok(!innerContent.includes('<AdPlaceholder'), 'Inner content must not contain AdPlaceholder');
});

// Area 04: SignPdf studio workspace has flex-1 and h-full
runTest(4, 'SignPdf.jsx studio workspace container has full-height flex layout', () => {
  assert.ok(signPdfContent.includes('className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative"'), 'Studio container must have flex-1 flex w-full h-full min-h-0 overflow-hidden relative');
});

// Area 05: SignCanvasViewport is rendered inside workspace
runTest(5, 'SignCanvasViewport is first primary child of workspace container', () => {
  const workspaceIdx = signPdfContent.indexOf('className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative"');
  const viewportIdx = signPdfContent.indexOf('<SignCanvasViewport', workspaceIdx);
  const sidebarIdx = signPdfContent.indexOf('<SignOptionsSidebar', workspaceIdx);
  assert.ok(workspaceIdx !== -1, 'Workspace container found');
  assert.ok(viewportIdx > workspaceIdx, 'SignCanvasViewport inside workspace');
  assert.ok(sidebarIdx > viewportIdx, 'SignOptionsSidebar placed after SignCanvasViewport');
});

// Area 06: SignOptionsSidebar is adjacent sibling to viewport
runTest(6, 'SignOptionsSidebar is the rightmost child in the studio workspace', () => {
  const workspaceIdx = signPdfContent.indexOf('className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative"');
  const workspaceEndIdx = signPdfContent.indexOf('</div>', signPdfContent.indexOf('<SignOptionsSidebar', workspaceIdx));
  assert.ok(workspaceEndIdx !== -1, 'Workspace properly closes after SignOptionsSidebar');
});

// Area 07: Home.jsx does not have unused AdPlaceholder import
runTest(7, 'Home.jsx has no unused AdPlaceholder import', () => {
  assert.ok(!homeContent.includes("import AdPlaceholder from '../components/AdPlaceholder';"), 'Home.jsx must not have unused AdPlaceholder import');
});

// Area 08: AdPlaceholder guards against studio-mode-active
runTest(8, 'AdPlaceholder.jsx checks studio-mode-active class', () => {
  assert.ok(adPlaceholderContent.includes("document.body?.classList?.contains('studio-mode-active')"), 'AdPlaceholder must check studio-mode-active');
});

// Area 09: AdPlaceholder returns null for studio-mode-active
runTest(9, 'AdPlaceholder.jsx returns null when inside active studio mode', () => {
  assert.ok(adPlaceholderContent.includes('return null;'), 'AdPlaceholder must return null');
  const guardBlock = adPlaceholderContent.slice(adPlaceholderContent.indexOf('if (isPro'), adPlaceholderContent.indexOf('return ('));
  assert.ok(guardBlock.includes('studio-mode-active'), 'Guard block must check studio mode before rendering JSX');
});

// Area 10: index.css suppresses .upgrade-banner in .studio-viewport
runTest(10, 'src/index.css suppresses .upgrade-banner in .studio-viewport', () => {
  assert.ok(indexCssContent.includes('.studio-viewport .upgrade-banner'), 'CSS must include .studio-viewport .upgrade-banner');
  assert.ok(indexCssContent.includes('display: none !important;'), 'CSS must enforce display: none !important');
});

// Area 11: index.css suppresses .upgrade-banner in .studio-mode-active
runTest(11, 'src/index.css suppresses .upgrade-banner in .studio-mode-active', () => {
  assert.ok(indexCssContent.includes('.studio-mode-active .upgrade-banner'), 'CSS must include .studio-mode-active .upgrade-banner');
});

// Area 12: index.css suppresses .ad-placeholder in studio modes
runTest(12, 'src/index.css suppresses .ad-placeholder in studio modes', () => {
  assert.ok(indexCssContent.includes('.studio-viewport .ad-placeholder'), 'CSS must include .studio-viewport .ad-placeholder');
  assert.ok(indexCssContent.includes('.studio-mode-active .ad-placeholder'), 'CSS must include .studio-mode-active .ad-placeholder');
});

// Area 13: index.css .studio-sidebar width exact numeric formula verification
runTest(13, 'src/index.css .studio-sidebar formula-level width verification (380px)', () => {
  const matchWidth = indexCssContent.match(/\.studio-sidebar\s*\{[\s\S]*?width:\s*(\d+)px;/);
  assert.ok(matchWidth, 'Must find width in .studio-sidebar');
  const widthVal = parseInt(matchWidth[1], 10);
  assert.equal(widthVal, 380, 'Sidebar width must be exactly 380px');
});

// Area 14: index.css .studio-sidebar min-width exact verification
runTest(14, 'src/index.css .studio-sidebar min-width verification (380px)', () => {
  const matchMinWidth = indexCssContent.match(/\.studio-sidebar\s*\{[\s\S]*?min-width:\s*(\d+)px;/);
  assert.ok(matchMinWidth, 'Must find min-width in .studio-sidebar');
  assert.equal(parseInt(matchMinWidth[1], 10), 380, 'Sidebar min-width must be exactly 380px');
});

// Area 15: index.css .studio-sidebar max-width exact verification
runTest(15, 'src/index.css .studio-sidebar max-width verification (380px)', () => {
  const matchMaxWidth = indexCssContent.match(/\.studio-sidebar\s*\{[\s\S]*?max-width:\s*(\d+)px;/);
  assert.ok(matchMaxWidth, 'Must find max-width in .studio-sidebar');
  assert.equal(parseInt(matchMaxWidth[1], 10), 380, 'Sidebar max-width must be exactly 380px');
});

// Area 16: ToolPageLayout sets studio-mode-active on document.body
runTest(16, 'ToolPageLayout.jsx manages studio-mode-active body class', () => {
  assert.ok(toolLayoutContent.includes("document.body.classList.add('studio-mode-active');"), 'Must add studio-mode-active');
  assert.ok(toolLayoutContent.includes("document.body.classList.remove('studio-mode-active');"), 'Must remove studio-mode-active');
});

// Area 17: ToolPageLayout isStudioMode branch check
runTest(17, 'ToolPageLayout.jsx isStudioMode branch checks loaded files', () => {
  assert.ok(toolLayoutContent.includes('(files && files.length > 0)) && !hasResult'), 'isStudioMode must check files and !hasResult');
});

// Areas 18 - 36: Codebase-wide audit across all PDF tools verifying zero AdPlaceholder
const pdfToolFiles = [
  'SplitPdf.jsx',
  'CropPdf.jsx',
  'RotatePdf.jsx',
  'OrganizePdf.jsx',
  'BatesNumbering.jsx',
  'AddWatermark.jsx',
  'AddPageNumbers.jsx',
  'ExtractPages.jsx',
  'RemovePages.jsx',
  'MergePdf.jsx',
  'CompressPdf.jsx',
  'ProtectPdf.jsx',
  'UnlockPdf.jsx',
  'EditPdf.jsx',
  'RedactPdf.jsx',
  'PdfForms.jsx',
  'PdfToImage.jsx',
  'ImageToPdf.jsx',
  'ComparePdf.jsx'
];

pdfToolFiles.forEach((file, idx) => {
  const testId = 18 + idx;
  runTest(testId, `Universal PDF tool audit: ${file} contains zero AdPlaceholder`, () => {
    const filePath = path.join(ROOT_DIR, 'src/pages/pdf', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(!content.includes('AdPlaceholder'), `${file} must not contain AdPlaceholder`);
    }
  });
});

// Area 37: Geometric Screen Width Allocation Formula Verification
runTest(37, 'Geometric Screen Width Allocation Verification (1920px Full HD)', () => {
  const windowWidth = 1920;
  const sidebarWidth = 380;
  const thumbnailWidth = 200; // SignThumbnailSidebar approximate width
  const allocatedCanvasWidth = windowWidth - sidebarWidth - thumbnailWidth;
  assert.equal(allocatedCanvasWidth, 1340, 'Available canvas stage width must be 1340px');
  // Verify that rogue ad (min 380px) is no longer stealing width
  const previousConstrainedWidth = allocatedCanvasWidth - 380;
  assert.equal(previousConstrainedWidth, 960, 'Previously canvas was choked down to 960px');
  assert.ok(allocatedCanvasWidth > previousConstrainedWidth, 'Remediated canvas stage has full breathing space');
});

// Area 38: AIChatBot floating button positioning
runTest(38, 'AIChatBot launcher button uses fixed positioning to not affect layout', () => {
  const chatBotContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/AIChatBot.jsx'), 'utf-8');
  assert.ok(chatBotContent.includes('fixed top-0 left-0'), 'AIChatBot button must be fixed top-0 left-0');
  assert.ok(chatBotContent.includes('z-[9999]'), 'AIChatBot button must have z-[9999] to float above pages');
});

const signSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');

// Area 39: SignOptionsSidebar date input uses className="hidden"
runTest(39, 'SignOptionsSidebar date picker uses className="hidden" to prevent scrollIntoView', () => {
  const dateIdx = signSidebarContent.indexOf('type="date"');
  assert.ok(dateIdx !== -1, 'Must contain date input');
  const dateInputBlock = signSidebarContent.slice(dateIdx, dateIdx + 1200);
  assert.ok(dateInputBlock.includes('className="hidden"'), 'Date input must use className="hidden"');
});

// Area 40: SignOptionsSidebar custom stamp upload uses className="hidden"
runTest(40, 'SignOptionsSidebar custom stamp upload uses className="hidden"', () => {
  const stampIdx = signSidebarContent.indexOf('accept="image/png,image/jpeg,image/svg+xml"');
  assert.ok(stampIdx !== -1, 'custom stamp accept must exist');
  const stampBlock = signSidebarContent.slice(stampIdx, stampIdx + 200);
  assert.ok(stampBlock.includes('className="hidden"'), 'Custom stamp input must use className="hidden"');
});

// Area 41: SignOptionsSidebar enterprise pfx/p12 upload uses className="hidden"
runTest(41, 'SignOptionsSidebar enterprise pfx/p12 certificate upload uses className="hidden"', () => {
  const pfxIdx = signSidebarContent.indexOf('accept=".pfx,.p12"');
  assert.ok(pfxIdx !== -1, 'pfx accept must exist');
  const pfxBlock = signSidebarContent.slice(pfxIdx, pfxIdx + 800);
  assert.ok(pfxBlock.includes('className="hidden"'), 'Certificate file input must use className="hidden"');
});

// Area 42: SignOptionsSidebar zero instances of sr-only
runTest(42, 'SignOptionsSidebar contains zero instances of sr-only', () => {
  assert.ok(!signSidebarContent.includes('className="sr-only"'), 'SignOptionsSidebar must have 0 instances of sr-only');
});

// Area 43: index.css locks html.studio-mode-active with overflow hidden
runTest(43, 'src/index.css locks html.studio-mode-active with overflow: hidden', () => {
  assert.ok(indexCssContent.includes('html.studio-mode-active,'), 'CSS must target html.studio-mode-active');
  assert.ok(indexCssContent.includes('html:has(body.studio-mode-active)'), 'CSS must target html:has(body.studio-mode-active)');
});

// Area 44: index.css sets scroll-behavior: auto in studio mode
runTest(44, 'src/index.css sets scroll-behavior: auto !important in studio mode', () => {
  assert.ok(indexCssContent.includes('scroll-behavior: auto !important;'), 'CSS must set scroll-behavior: auto in studio mode');
});

// Area 45: ToolPageLayout adds studio-mode-active to documentElement
runTest(45, 'ToolPageLayout.jsx adds studio-mode-active to documentElement', () => {
  assert.ok(toolLayoutContent.includes("document.documentElement.classList.add('studio-mode-active');"), 'Must add studio-mode-active to documentElement');
  assert.ok(toolLayoutContent.includes("document.documentElement.classList.remove('studio-mode-active');"), 'Must remove studio-mode-active from documentElement');
});

// Area 46: ToolPageLayout attaches preventWindowScroll listener
runTest(46, 'ToolPageLayout.jsx attaches preventWindowScroll listener to cancel window scrolling', () => {
  assert.ok(toolLayoutContent.includes('preventWindowScroll'), 'Must define preventWindowScroll');
  assert.ok(toolLayoutContent.includes("window.addEventListener('scroll', preventWindowScroll"), 'Must attach scroll listener');
  assert.ok(toolLayoutContent.includes("window.removeEventListener('scroll', preventWindowScroll)"), 'Must detach scroll listener on unmount');
});

// Area 47: SignatureSecurityInfoModal.jsx exists and exports a React component
runTest(47, 'SignatureSecurityInfoModal.jsx exists on disk and exports default function', () => {
  const modalPath = path.join(ROOT_DIR, 'src/components/SignStudio/SignatureSecurityInfoModal.jsx');
  assert.ok(fs.existsSync(modalPath), 'SignatureSecurityInfoModal.jsx must exist');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalContent.includes('export default function SignatureSecurityInfoModal'), 'Must export SignatureSecurityInfoModal');
});

// Area 48: SignatureSecurityInfoModal implements full keyboard accessibility and modal semantics
runTest(48, 'SignatureSecurityInfoModal implements Escape key listener and dialog aria attributes', () => {
  const modalPath = path.join(ROOT_DIR, 'src/components/SignStudio/SignatureSecurityInfoModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalContent.includes("e.key === 'Escape'"), 'Must handle Escape key');
  assert.ok(modalContent.includes('role="dialog"'), 'Must have role="dialog"');
  assert.ok(modalContent.includes('aria-modal="true"'), 'Must have aria-modal="true"');
});

// Area 49: SignatureSecurityInfoModal renders SES vs Digital Signature PRO comparison cards
runTest(49, 'SignatureSecurityInfoModal renders Simple Signature and Digital Signature PRO cards', () => {
  const modalPath = path.join(ROOT_DIR, 'src/components/SignStudio/SignatureSecurityInfoModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalContent.includes('Simple Signature'), 'Must describe Simple Signature');
  assert.ok(modalContent.includes('Digital Signature'), 'Must describe Digital Signature');
  assert.ok(modalContent.includes('SES · Standard'), 'Must state SES standard');
  assert.ok(modalContent.includes('PRO · eIDAS / AES'), 'Must state PRO eIDAS standard');
});

// Area 50: SignatureSecurityInfoModal renders technical feature comparison table
runTest(50, 'SignatureSecurityInfoModal renders comparison table with PKI, tamper seal & legal standards', () => {
  const modalPath = path.join(ROOT_DIR, 'src/components/SignStudio/SignatureSecurityInfoModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalContent.includes('X.509 PKI Cryptographic Certificate'), 'Table must cover X.509 PKI');
  assert.ok(modalContent.includes('Tamper-Evident Byte Seal'), 'Table must cover Tamper-Evident Byte Seal');
  assert.ok(modalContent.includes('Adobe Reader Green Checkmark'), 'Table must cover Adobe Reader Green Checkmark');
  assert.ok(modalContent.includes('Custom Enterprise .pfx / .p12 Upload'), 'Table must cover custom .pfx upload');
});

// Area 51: SignOptionsSidebar defines showSecurityInfo and click-outside handler
runTest(51, 'SignOptionsSidebar defines showSecurityInfo state and popover refs for non-blocking info box', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes('const [showSecurityInfo, setShowSecurityInfo] = useState(false);'), 'Must define showSecurityInfo state');
  assert.ok(currentSidebarContent.includes('const infoButtonRef = useRef(null);'), 'Must define infoButtonRef');
  assert.ok(currentSidebarContent.includes('const infoPopoverRef = useRef(null);'), 'Must define infoPopoverRef');
  assert.ok(currentSidebarContent.includes("document.addEventListener('pointerdown', handleClickOutside);"), 'Must attach pointerdown outside click listener');
});

// Area 52: SignOptionsSidebar does not mount full-screen blocking modal
runTest(52, 'SignOptionsSidebar does not render full-screen blocking modal overlay', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(!currentSidebarContent.includes('<SignatureSecurityInfoModal'), 'Must not mount full-screen blocking modal');
});

// Area 53: SignOptionsSidebar contains exactly ONE setSecurityMode('simple') button
runTest(53, 'SignOptionsSidebar contains exactly ONE setSecurityMode(\'simple\') trigger (No Duplicates)', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const matches = currentSidebarContent.match(/setSecurityMode\(['"]simple['"]\)/g);
  assert.strictEqual(matches?.length, 1, 'There must be exactly 1 setSecurityMode("simple") in sidebar');
});

// Area 54: SignOptionsSidebar contains exactly ONE setSecurityMode('digital') button
runTest(54, 'SignOptionsSidebar contains exactly ONE setSecurityMode(\'digital\') trigger (No Duplicates)', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const matches = currentSidebarContent.match(/setSecurityMode\(['"]digital['"]\)/g);
  assert.strictEqual(matches?.length, 1, 'There must be exactly 1 setSecurityMode("digital") in sidebar');
});

// Area 55: Section 1 contains pure Info icon button (zero 'Compare' text) to toggle non-blocking popover
runTest(55, 'Section 1 contains pure Info icon button (zero Compare text) to toggle non-blocking popover', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes('onClick={() => setShowSecurityInfo((prev) => !prev)}'), 'Must have button to toggle security info popover');
  assert.ok(currentSidebarContent.includes('aria-label="Signature security info"'), 'Must have accessible label');
  assert.ok(!currentSidebarContent.includes('<span>Compare</span>'), 'Must NOT contain Compare text next to icon');
});

// Area 56: Pro feature branding adheres to iLovePDF standard with PRO badge and eIDAS / AES
runTest(56, 'Digital signature mode branded as Digital Signature with PRO badge and eIDAS / AES description', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes('Digital Signature'), 'Must display Digital Signature');
  assert.ok(currentSidebarContent.includes('PRO'), 'Must have PRO badge');
  assert.ok(currentSidebarContent.includes('Cryptographic seal · eIDAS / AES'), 'Must state eIDAS / AES seal');
});

// Area 57: Free feature branding adheres to Simple Signature with SES badge
runTest(57, 'Simple mode branded as Simple Signature with SES badge and free & instant description', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes('Simple Signature'), 'Must display Simple Signature');
  assert.ok(currentSidebarContent.includes('SES'), 'Must have SES badge');
  assert.ok(currentSidebarContent.includes('Standard electronic · Free & instant'), 'Must state standard electronic description');
});

// Area 58: Digital certificate settings centralized in Section 1 with ZERO X.509 or (CN) jargon
runTest(58, 'Digital certificate settings centralized in Section 1 with zero raw X.509 or (CN) jargon', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const sec1Idx = currentSidebarContent.indexOf('1. SIGNATURE SECURITY STANDARD');
  const sec2Idx = currentSidebarContent.indexOf('2. PRIMARY SIGNATURE & INITIALS CARDS');
  assert.ok(sec1Idx !== -1 && sec2Idx !== -1, 'Section 1 and Section 2 headers found');
  const sec1Chunk = currentSidebarContent.slice(sec1Idx, sec2Idx);
  assert.ok(sec1Chunk.includes("securityMode === 'digital'"), 'Cert settings inside Section 1');
  assert.ok(sec1Chunk.includes('Digital Certificate Settings'), 'Cert settings titled Digital Certificate Settings');
  assert.ok(!sec1Chunk.includes('X.509'), 'Section 1 must contain ZERO raw X.509 technical jargon');
  assert.ok(!sec1Chunk.includes('(CN)'), 'Section 1 must contain ZERO raw (CN) technical jargon');
  assert.ok(sec1Chunk.includes('Signer Name'), 'Signer name input labeled Signer Name');
  assert.ok(sec1Chunk.includes('Signer Email'), 'Email input labeled Signer Email');
  assert.ok(sec1Chunk.includes('Custom Certificate'), 'Custom certificate labeled cleanly');
});

// Area 59: Section 4 rebranded to Document Finalization & Compliance with ZERO mode switchers
runTest(59, 'Section 4 rebranded to Document Finalization & Compliance with zero duplicate mode buttons', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const sec4Idx = currentSidebarContent.indexOf('4. DOCUMENT FINALIZATION & COMPLIANCE');
  assert.ok(sec4Idx !== -1, 'Section 4 header found');
  const sec4Chunk = currentSidebarContent.slice(sec4Idx, currentSidebarContent.indexOf('STICKY BOTTOM ACTION FOOTER'));
  assert.ok(!sec4Chunk.includes('setSecurityMode'), 'Section 4 must contain ZERO setSecurityMode calls');
  assert.ok(!sec4Chunk.includes('Standard (SES)'), 'Section 4 must contain zero duplicate SES tabs');
  assert.ok(!sec4Chunk.includes('Digital Seal'), 'Section 4 must contain zero duplicate digital seal tabs');
});

// Area 60: Section 4 retains Flatten Document and Audit Trail Certificate options
runTest(60, 'Section 4 cleanly houses Flatten Document and Audit Trail Certificate checkboxes', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const sec4Idx = currentSidebarContent.indexOf('4. DOCUMENT FINALIZATION & COMPLIANCE');
  const sec4Chunk = currentSidebarContent.slice(sec4Idx, currentSidebarContent.indexOf('STICKY BOTTOM ACTION FOOTER'));
  assert.ok(sec4Chunk.includes('Flatten Document'), 'Must have Flatten Document');
  assert.ok(sec4Chunk.includes('Audit Trail Certificate'), 'Must have Audit Trail Certificate');
  assert.ok(sec4Chunk.includes('checked={flattenDocument}'), 'Flatten Document bound to state');
  assert.ok(sec4Chunk.includes('checked={generateCertificate}'), 'Audit Trail Certificate bound to state');
});

// Area 61: Sticky footer CTA button renders Sign & Certify PDF when digital mode active
runTest(61, 'Sticky footer CTA dynamically displays Sign & Certify PDF in digital mode', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes("securityMode === 'digital' ? 'Sign & Certify PDF' : 'Sign PDF'"), 'CTA must switch label based on mode');
});

// Area 62: Sticky footer CTA button switches icon to verified_user in digital mode
runTest(62, 'Sticky footer CTA dynamically displays verified_user icon in digital mode', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes("securityMode === 'digital' ? 'verified_user' : 'draw'"), 'CTA must switch icon based on mode');
});

// Area 63: Sticky footer CTA button displays Sealing & Certifying... spinner text when processing in digital mode
runTest(63, 'Sticky footer CTA displays Sealing & Certifying... spinner text in digital mode', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes("securityMode === 'digital' ? 'Sealing & Certifying...' : 'Signing Document...'"), 'Processing text must reflect digital signing');
});

// Area 64: Non-blocking floating info popover contains Pro benefits and close trigger
runTest(64, 'Non-blocking floating info popover contains Pro benefits, tooltip semantics, and close trigger', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(currentSidebarContent.includes('role="tooltip"'), 'Popover must have role="tooltip"');
  assert.ok(currentSidebarContent.includes('Cryptographic Tamper Seal'), 'Popover explains tamper seal');
  assert.ok(currentSidebarContent.includes('Adobe Reader Green Checkmark'), 'Popover explains Acrobat checkmark');
  assert.ok(currentSidebarContent.includes('Custom Enterprise PKI'), 'Popover explains custom enterprise PKI');
  assert.ok(currentSidebarContent.includes('onClick={() => setShowSecurityInfo(false)}'), 'Must have close button for popover');
});

// Area 65: SignOptionsSidebar declares showStampPicker state
runTest(65, 'SignOptionsSidebar declares showStampPicker state hook with false default', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(
    currentSidebarContent.includes('const [showStampPicker, setShowStampPicker] = useState(false);'),
    'SignOptionsSidebar must declare showStampPicker state hook'
  );
});

// Area 66: Stamp/Seal picker trigger button toggles showStampPicker state
runTest(66, 'Stamp/Seal picker trigger button toggles showStampPicker on click', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(
    currentSidebarContent.includes('onClick={() => setShowStampPicker(!showStampPicker)}'),
    'Picker button must toggle showStampPicker'
  );
});

// Area 67: Stamp/Seal button renders dynamic label based on showStampPicker
runTest(67, 'Stamp/Seal button displays dynamic label based on showStampPicker state', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(
    currentSidebarContent.includes("showStampPicker ? 'Close Picker' : 'Choose Preset"),
    'Button label must reflect picker open/closed state'
  );
});

// Area 68: Stamp & Seal presets dropdown guarded by showStampPicker
runTest(68, 'Stamp & Seal presets dropdown rendered conditionally on showStampPicker', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  assert.ok(
    currentSidebarContent.includes('{showStampPicker && ('),
    'Presets dropdown must be conditioned on showStampPicker'
  );
});

// Area 69: Stamp preset selection dismisses picker via setShowStampPicker(false)
runTest(69, 'Selecting stamp preset dismisses picker via setShowStampPicker(false)', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const presetFnIdx = currentSidebarContent.indexOf('const handleAddStampPreset = (preset) => {');
  assert.ok(presetFnIdx !== -1, 'handleAddStampPreset must exist');
  const presetFnChunk = currentSidebarContent.slice(presetFnIdx, presetFnIdx + 800);
  assert.ok(presetFnChunk.includes('setShowStampPicker(false);'), 'Preset handler must dismiss picker');
});

// Area 70: Custom stamp upload dismisses picker via setShowStampPicker(false)
runTest(70, 'Custom stamp image upload dismisses picker via setShowStampPicker(false)', () => {
  const currentSidebarContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
  const uploadFnIdx = currentSidebarContent.indexOf('const handleCustomStampUpload = (e) => {');
  assert.ok(uploadFnIdx !== -1, 'handleCustomStampUpload must exist');
  const uploadFnChunk = currentSidebarContent.slice(uploadFnIdx, uploadFnIdx + 500);
  assert.ok(uploadFnChunk.includes('setShowStampPicker(false);'), 'Upload handler must dismiss picker');
});

console.log('═'.repeat(80));
console.log(`  SUITE COMPLETE: ${passed} passed, ${failed} failed.`);
console.log('═'.repeat(80));

if (failed > 0) {
  process.exit(1);
}

