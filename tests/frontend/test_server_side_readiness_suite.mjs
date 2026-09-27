import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

// Directly import actual source constants
import { TOOLS } from '../../src/utils/constants.js';

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function test(description, fn) {
  try {
    fn();
    passedCount++;
    testResults.push({ description, status: 'PASS' });
    console.log(`  ✓ ${description}`);
  } catch (err) {
    failedCount++;
    testResults.push({ description, status: 'FAIL', error: err.message });
    console.error(`  ✗ ${description}`);
    console.error(`    -> ${err.message}`);
  }
}

console.log('======================================================================');
console.log('  DOCSCALAR SERVER-SIDE & PRODUCTION READINESS MOLECULAR TEST SUITE   ');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// AREA 1: Tool Tier Harmonization in constants.js (Direct Module Import)
// ─────────────────────────────────────────────────────────────────────────────
console.log('[AREA 1: Tool Tier Harmonization & Metadata in constants.js]');

const expectedGuestTools = [
  'compress-pdf',
  'docx-to-pdf',
  'excel-to-pdf',
  'powerpoint-to-pdf',
  'html-to-pdf',
  'pdf-to-word',
  'pdf-to-excel',
  'pdf-to-powerpoint',
  'pdf-to-pdfa',
  'remove-pages',
  'extract-pages',
  'organize-pdf',
  'scan-to-pdf',
  'add-watermark',
  'add-page-numbers',
  'protect-pdf',
  'unlock-pdf',
  'compare-pdf',
  'bates-numbering',
];

for (const toolId of expectedGuestTools) {
  test(`Tool '${toolId}' has minTier set to 'guest'`, () => {
    const tool = TOOLS.find(t => t.id === toolId);
    assert.ok(tool, `Tool with id '${toolId}' must exist in TOOLS array`);
    assert.equal(tool.minTier, 'guest', `Expected tool '${toolId}' to have minTier 'guest', but got '${tool.minTier}'`);
  });
}

test("qr-generator description is purged of 'Client Side' jargon", () => {
  const qrTool = TOOLS.find(t => t.id === 'qr-generator');
  assert.ok(qrTool, "qr-generator tool must exist");
  assert.equal(qrTool.description.includes('Client Side'), false, "qr-generator description should not contain 'Client Side'");
  assert.equal(qrTool.description, 'Generate customizable, high resolution vector QR codes');
});

test("ai-translator, ai-summarizer, and conversion-pipeline are fully decommissioned from TOOLS", () => {
  const translator = TOOLS.find(t => t.id === 'ai-translator');
  const summarizer = TOOLS.find(t => t.id === 'ai-summarizer');
  const pipeline = TOOLS.find(t => t.id === 'conversion-pipeline');
  assert.equal(translator, undefined, "ai-translator tool must be removed from TOOLS");
  assert.equal(summarizer, undefined, "ai-summarizer tool must be removed from TOOLS");
  assert.equal(pipeline, undefined, "conversion-pipeline tool must be removed from TOOLS");
});

test("Total canonical tools count is exactly 41", () => {
  assert.equal(TOOLS.length, 41, `Expected exactly 41 canonical tools, found ${TOOLS.length}`);
});

test("All 41 tools are accessible in guest mode (minTier === 'guest')", () => {
  const guestTools = TOOLS.filter(t => t.minTier === 'guest');
  assert.equal(guestTools.length, 41, `Expected all 41 tools to have minTier === 'guest', found ${guestTools.length}`);
});

test("ocr-pdf, un-ocr-pdf, and sign-pdf are accessible to guests", () => {
  const tools = ['ocr-pdf', 'un-ocr-pdf', 'sign-pdf'];
  for (const pid of tools) {
    const tool = TOOLS.find(t => t.id === pid);
    assert.ok(tool, `Tool '${pid}' must exist`);
    assert.equal(tool.minTier, 'guest', `Tool '${pid}' must have minTier === 'guest'`);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 2: App.jsx Route Access & Redirects
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 2: App.jsx Route Access & Redirect Mapping]');

const appSource = readFileSync(resolve(rootDir, 'src/App.jsx'), 'utf-8');

test("/canvas route is directly accessible without ProtectedRoute wrapper", () => {
  const canvasMatch = appSource.match(/<Route\s+path=["']\/canvas["']\s+element=\{<Home\s*\/>\}/);
  assert.ok(canvasMatch, "Route /canvas must render <Home /> directly without <ProtectedRoute>");
});

test("/canvas is NOT wrapped in ProtectedRoute", () => {
  const protectedCanvas = appSource.match(/<Route\s+path=["']\/canvas["']\s+element=\{\s*<ProtectedRoute>/);
  assert.equal(protectedCanvas, null, "Route /canvas must not be wrapped in <ProtectedRoute>");
});

test("/dashboard route redirects to /workspace with replace", () => {
  const dashboardMatch = appSource.match(/<Route\s+path=["']\/dashboard["']\s+element=\{<Navigate\s+to=["']\/workspace["']\s+replace\s*\/>\}/);
  assert.ok(dashboardMatch, "/dashboard must redirect to /workspace with replace");
});

test("/conversion-pipeline route redirects to /canvas with replace", () => {
  const pipelineMatch = appSource.match(/<Route\s+path=["']\/conversion-pipeline\/\*["']\s+element=\{<Navigate\s+to=["']\/canvas["']\s+replace\s*\/>\}/);
  assert.ok(pipelineMatch, "/conversion-pipeline/* must redirect to /canvas with replace");
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 3: ProtectedRoute.jsx State Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 3: ProtectedRoute.jsx State Preservation]');

const protectedRouteSource = readFileSync(resolve(rootDir, 'src/components/ProtectedRoute.jsx'), 'utf-8');

test("ProtectedRoute imports useLocation from 'react-router-dom'", () => {
  assert.ok(protectedRouteSource.includes('useLocation'), "ProtectedRoute must import useLocation");
});

test("ProtectedRoute passes state={{ from: location }} to <Navigate to='/login'", () => {
  assert.ok(
    protectedRouteSource.includes('state={{ from: location }}'),
    "ProtectedRoute must pass state={{ from: location }} to <Navigate to='/login' replace />"
  );
});

test("ProtectedRoute redirects non-pro users on requirePro to '/'", () => {
  assert.ok(
    protectedRouteSource.includes("if (requirePro && userTier !== 'pro')"),
    "ProtectedRoute must check requirePro and userTier"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 4: Login.jsx & SignUp.jsx Redirect Memory & Guest Links
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 4: Login.jsx & SignUp.jsx Redirect Memory & Guest Links]');

const loginSource = readFileSync(resolve(rootDir, 'src/pages/Login.jsx'), 'utf-8');
const signUpSource = readFileSync(resolve(rootDir, 'src/pages/SignUp.jsx'), 'utf-8');

test("Login.jsx imports useLocation and uses state from location", () => {
  assert.ok(loginSource.includes('useLocation'), "Login.jsx must import useLocation");
  assert.ok(
    loginSource.includes('location.state?.from?.pathname'),
    "Login.jsx must inspect location.state?.from?.pathname for redirection destination"
  );
});

test("Login.jsx contains a 'Continue as Guest' fallback link", () => {
  assert.ok(
    loginSource.includes('Continue as Guest'),
    "Login.jsx must render a 'Continue as Guest' link"
  );
});

test("SignUp.jsx imports useLocation and uses state from location", () => {
  assert.ok(signUpSource.includes('useLocation'), "SignUp.jsx must import useLocation");
  assert.ok(
    signUpSource.includes('location.state?.from?.pathname'),
    "SignUp.jsx must inspect location.state?.from?.pathname for redirection destination"
  );
});

test("SignUp.jsx preserves location state on 'Log in instead' link", () => {
  assert.ok(
    signUpSource.includes('state={location.state}'),
    "SignUp.jsx must pass state={location.state} to login link"
  );
});

test("SignUp.jsx contains a 'Continue as Guest' fallback link", () => {
  assert.ok(
    signUpSource.includes('Continue as Guest'),
    "SignUp.jsx must render a 'Continue as Guest' link"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 5: FileDropzone.jsx Gating & Jargon Eradication
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 5: FileDropzone.jsx Gating & Jargon Eradication]');

const dropzoneSource = readFileSync(resolve(rootDir, 'src/components/FileDropzone.jsx'), 'utf-8');

test("FileDropzone.jsx: 30MB artificial browser tab freeze warning is eradicated", () => {
  assert.equal(
    dropzoneSource.includes('Processing large files Client Side may slow down or freeze your browser tab'),
    false,
    "The 30MB browser crash warning must be completely removed"
  );
});

test("FileDropzone.jsx defaultMeta badges contain zero 'Client Side' or 'No File Upload'", () => {
  assert.equal(
    dropzoneSource.includes("label: 'Client Side Processing'"),
    false,
    "defaultMeta badges must not contain 'Client Side Processing'"
  );
  assert.equal(
    dropzoneSource.includes("label: 'No File Upload'"),
    false,
    "defaultMeta badges must not contain 'No File Upload'"
  );
});

test("FileDropzone.jsx tips do not tell users to close browser tabs for client side speed", () => {
  assert.equal(
    dropzoneSource.includes('Close other browser tabs for optimal Client Side speed'),
    false,
    "Dropzone tips must not mention closing tabs for client side speed"
  );
});

test("FileDropzone.jsx tips do not claim documents never touch servers", () => {
  assert.equal(
    dropzoneSource.includes('Your documents are private and never touch our servers'),
    false,
    "Dropzone tips must not make false 'never touch our servers' claims"
  );
});

test("FileDropzone.jsx cards contain enterprise-grade encryption copy", () => {
  assert.ok(
    dropzoneSource.includes('Bank-grade SSL/TLS end-to-end encryption') || dropzoneSource.includes('Encrypted Pipeline'),
    "Dropzone cards must feature modern encrypted pipeline descriptions"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 6: TrustBar.jsx Enterprise Badges
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 6: TrustBar.jsx Enterprise Badges]');

const trustBarSource = readFileSync(resolve(rootDir, 'src/components/TrustBar.jsx'), 'utf-8');

test("TrustBar.jsx does NOT contain 'Zero Cloud Upload'", () => {
  assert.equal(trustBarSource.includes('Zero Cloud Upload'), false, "TrustBar must not contain 'Zero Cloud Upload'");
});

test("TrustBar.jsx does NOT contain 'Files Never Leave Your Device'", () => {
  assert.equal(trustBarSource.includes('Files Never Leave Your Device'), false, "TrustBar must not contain 'Files Never Leave Your Device'");
});

test("TrustBar.jsx does NOT contain '100% Private & Local'", () => {
  assert.equal(trustBarSource.includes('100% Private & Local'), false, "TrustBar must not contain '100% Private & Local'");
});

test("TrustBar.jsx contains 'High Speed Secure Processing'", () => {
  assert.ok(trustBarSource.includes('High Speed Secure Processing'), "TrustBar must contain 'High Speed Secure Processing'");
});

test("TrustBar.jsx contains 'End-to-End Encrypted (TLS 1.3)'", () => {
  assert.ok(trustBarSource.includes('End-to-End Encrypted (TLS 1.3)'), "TrustBar must contain 'End-to-End Encrypted (TLS 1.3)'");
});

test("TrustBar.jsx contains 'Auto-Purged After Processing'", () => {
  assert.ok(trustBarSource.includes('Auto-Purged After Processing'), "TrustBar must contain 'Auto-Purged After Processing'");
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 7: Footer.jsx Links on Landing Page
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 7: Footer.jsx Links on Landing Page]');

const footerSource = readFileSync(resolve(rootDir, 'src/components/Footer.jsx'), 'utf-8');

test("Footer.jsx renders Privacy Policy link on the landing page", () => {
  assert.ok(
    footerSource.includes('<Link to="/privacy"'),
    "Landing footer must include a link to /privacy"
  );
});

test("Footer.jsx renders Terms of Service link on the landing page", () => {
  assert.ok(
    footerSource.includes('<Link to="/terms"'),
    "Landing footer must include a link to /terms"
  );
});

test("Footer.jsx headline is updated to modern document workflows", () => {
  assert.equal(
    footerSource.includes('Ready to work privately?'),
    false,
    "Footer headline should not be 'Ready to work privately?'"
  );
  assert.ok(
    footerSource.includes('Ready for faster document workflows?'),
    "Footer headline must be 'Ready for faster document workflows?'"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 8: Home.jsx Guest Upload Limit Expansion
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 8: Home.jsx Guest Upload Limit Expansion]');

const homeSource = readFileSync(resolve(rootDir, 'src/pages/Home.jsx'), 'utf-8');

test("Home.jsx guest upload file limit is set to 10MB", () => {
  assert.ok(
    homeSource.includes('10 * 1024 * 1024'),
    "Home.jsx must allow 10 * 1024 * 1024 bytes for guest users"
  );
  assert.ok(
    homeSource.includes("'10MB'"),
    "Home.jsx maxFileSizeStr must be '10MB' for guest users"
  );
});

test("Home.jsx authenticated free file limit is set to 15MB", () => {
  assert.ok(
    homeSource.includes('15 * 1024 * 1024'),
    "Home.jsx must allocate 15MB for authenticated free users"
  );
});

test("Home.jsx pro file limit remains 1GB", () => {
  assert.ok(
    homeSource.includes('1024 * 1024 * 1024'),
    "Home.jsx must allocate 1GB for pro users"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 9: LandingPage.jsx InfiniteMarquee Interactivity & Clean Copy
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 9: LandingPage.jsx InfiniteMarquee Interactivity & Clean Copy]');

const landingSource = readFileSync(resolve(rootDir, 'src/components/LandingPage.jsx'), 'utf-8');

test("LandingPage.jsx: InfiniteMarquee tool cards have onClick navigation", () => {
  assert.ok(
    landingSource.includes('onClick={() => navigate(tool.path || `/${tool.id}`)}'),
    "InfiniteMarquee must attach onClick navigation to tool chips"
  );
});

test("LandingPage.jsx: BENTO_FEATURES contains zero 'On-Device AI' or 'AI Intelligence Suite'", () => {
  assert.equal(
    landingSource.includes("title: 'On-Device AI'"),
    false,
    "BENTO_FEATURES must not include 'On-Device AI'"
  );
  assert.equal(
    landingSource.includes("title: 'AI Intelligence Suite'"),
    false,
    "BENTO_FEATURES must not include 'AI Intelligence Suite'"
  );
  assert.ok(
    landingSource.includes("title: 'Smart Scanning & Cropper'"),
    "BENTO_FEATURES must include 'Smart Scanning & Cropper'"
  );
});

test("LandingPage.jsx: FAQ items are purged of AI summarization and translation references", () => {
  assert.equal(landingSource.includes('Our AI summarization and translation tools'), false, "FAQ items must not mention AI summarization and translation");
  assert.equal(landingSource.includes('How does AI document intelligence work?'), false, "FAQ items must not ask about AI document intelligence");
  assert.ok(landingSource.includes('How does the Smart Cropper and scan detection work?'), "FAQ items must include Smart Cropper FAQ");
});

test("LandingPage.jsx: PRIVACY_CARDS contains 'End-to-End Encryption'", () => {
  assert.ok(
    landingSource.includes("title: 'End-to-End Encryption'"),
    "PRIVACY_CARDS must include 'End-to-End Encryption'"
  );
  assert.ok(
    landingSource.includes("title: 'Automatic File Purging'"),
    "PRIVACY_CARDS must include 'Automatic File Purging'"
  );
});

test("LandingPage.jsx: FAQ items specify 10MB for guest users", () => {
  assert.ok(
    landingSource.includes('Guest visitors can process files up to 10MB'),
    "FAQ items must accurately reflect 10MB guest limit"
  );
});

test("LandingPage.jsx: Hero headline does not state 'privately, in your browser'", () => {
  assert.equal(
    landingSource.includes('privately, in your browser'),
    false,
    "Hero headline must not say 'privately, in your browser'"
  );
  assert.ok(
    landingSource.includes('faster and more securely'),
    "Hero headline must say 'faster and more securely'"
  );
});

test("LandingPage.jsx: Hero typewriter does not claim 'Files never leave your machine'", () => {
  assert.equal(
    landingSource.includes('Files never leave your machine'),
    false,
    "Hero typewriter must not claim files never leave machine"
  );
});

test("LandingPage.jsx: Stats strip displays 'Doc Tools' and 'Encrypted'", () => {
  assert.equal(landingSource.includes("'Local First'"), false, "Stats strip must not contain 'Local First'");
  assert.ok(landingSource.includes("'Encrypted'"), "Stats strip must contain 'Encrypted'");
});

test("LandingPage.jsx: Pricing section shows 10MB limit for Guest tier", () => {
  assert.ok(
    landingSource.includes("'10MB file limit'"),
    "LandingPage pricing card for Guest tier must show '10MB file limit'"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 10: Pricing.jsx Modernization
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 10: Pricing.jsx Modernization]');

const pricingSource = readFileSync(resolve(rootDir, 'src/pages/Pricing.jsx'), 'utf-8');

test("Pricing.jsx Guest Mode card features '10 MB file size limit'", () => {
  assert.ok(
    pricingSource.includes('10 MB file size limit'),
    "Pricing.jsx Guest Mode card must state 10 MB limit"
  );
});

test("Pricing.jsx Standard Utility card does NOT say 'Client Side document workflows'", () => {
  assert.equal(
    pricingSource.includes('Client Side document workflows'),
    false,
    "Pricing.jsx must not mention Client Side workflows"
  );
});

test("Pricing.jsx security strip does NOT say 'Local processing remains fully active Client Side'", () => {
  assert.equal(
    pricingSource.includes('Local processing remains fully active Client Side'),
    false,
    "Pricing.jsx security strip must not contain client side claims"
  );
});

test("Pricing.jsx feature comparison table specifies 10 MB for Guest Mode", () => {
  const tablePart = pricingSource.substring(pricingSource.indexOf('Feature Comparison'));
  assert.ok(
    tablePart.includes('<td className="py-4 px-6 text-center text-on-surface-variant font-medium">10 MB</td>'),
    "Feature comparison table must show 10 MB for Guest Mode"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 11: Privacy.jsx & Terms.jsx Legal Alignment
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 11: Privacy.jsx & Terms.jsx Legal Alignment]');

const privacySource = readFileSync(resolve(rootDir, 'src/pages/Privacy.jsx'), 'utf-8');
const termsSource = readFileSync(resolve(rootDir, 'src/pages/Terms.jsx'), 'utf-8');

test("Privacy.jsx does NOT claim 100% local processing in browser", () => {
  assert.equal(
    privacySource.includes('Whenever possible, your documents are processed 100% locally in your browser'),
    false,
    "Privacy.jsx must not claim 100% local browser processing"
  );
});

test("Privacy.jsx commits to end-to-end TLS 1.3 encryption and transient purge", () => {
  assert.ok(
    privacySource.includes('end-to-end TLS 1.3 encrypted connections'),
    "Privacy.jsx must state end-to-end TLS 1.3 encrypted connections"
  );
});

test("Terms.jsx section 2 reflects tiered limits (1GB, 15MB, 10MB)", () => {
  assert.ok(
    termsSource.includes('up to 1GB for Pro users, 15MB for Free registered accounts, and 10MB for Guest users'),
    "Terms.jsx must reflect the updated tiered limits"
  );
});

test("Terms.jsx does NOT contain 'No Client Side Limits: Conversions occurring 100% locally'", () => {
  assert.equal(
    termsSource.includes('No Client Side Limits: Conversions occurring 100% locally'),
    false,
    "Terms.jsx must remove 'No Client Side Limits'"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 12: AIChatBot.jsx & MergeProgressModal.jsx Scrubbing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 12: AIChatBot.jsx & MergeProgressModal.jsx Scrubbing]');

const chatBotSource = readFileSync(resolve(rootDir, 'src/components/AIChatBot.jsx'), 'utf-8');
const modalSource = readFileSync(resolve(rootDir, 'src/components/MergeProgressModal.jsx'), 'utf-8');

test("AIChatBot.jsx welcome message does NOT claim 100% client-side architecture", () => {
  assert.equal(
    chatBotSource.includes('100% client-side WebAssembly architecture'),
    false,
    "AIChatBot.jsx welcome message must not claim 100% client-side WebAssembly"
  );
});

test("AIChatBot.jsx welcome message emphasizes encrypted document processing", () => {
  assert.ok(
    chatBotSource.includes('fast, secure, and encrypted document processing'),
    "AIChatBot.jsx must feature encrypted document processing"
  );
});

test("MergeProgressModal.jsx does NOT claim 100% Client-Side In-Memory Assembly", () => {
  assert.equal(
    modalSource.includes('100% Client-Side In-Memory Assembly'),
    false,
    "MergeProgressModal.jsx must not claim 100% Client-Side In-Memory Assembly"
  );
});

test("MergeProgressModal.jsx features 'End-to-End Encrypted Assembly · Auto-Purged Processing'", () => {
  assert.ok(
    modalSource.includes('End-to-End Encrypted Assembly · Auto-Purged Processing'),
    "MergeProgressModal.jsx must feature encrypted assembly copy"
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// AREA 13: SEOHead Studio Descriptions Scrubbing (Zero Client-Side Clutter)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 13: SEOHead Studio Descriptions Scrubbing]');

const studiosToCheck = [
  'src/pages/pdf/EditPdf.jsx',
  'src/pages/pdf/UnOcrPdf.jsx',
  'src/pages/pdf/PdfForms.jsx',
  'src/pages/pdf/ComparePdf.jsx',
  'src/pages/pdf/ScanToPdf.jsx',
  'src/pages/pdf/MergePdf.jsx'
];

for (const relPath of studiosToCheck) {
  test(`${relPath} SEOHead has zero 'Client Side' or 'Client-side'`, () => {
    const src = readFileSync(resolve(rootDir, relPath), 'utf-8');
    const seoMatch = src.match(/<SEOHead[\s\S]*?\/>/);
    assert.ok(seoMatch, `${relPath} must contain <SEOHead />`);
    assert.equal(
      /Client[\s-]?side/i.test(seoMatch[0]),
      false,
      `${relPath} <SEOHead /> still contains Client-Side jargon: ${seoMatch[0]}`
    );
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Final Summary & Exit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\nALL 70+ MOLECULAR ASSERTIONS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
