import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('\n================================================================');
console.log('🧪 DOCSCALAR PHASE 3 HARDENING & INTERNATIONALIZATION TEST SUITE');
console.log('================================================================\n');

let passedAssertions = 0;
let totalAssertions = 0;

function test(description, fn) {
  totalAssertions++;
  try {
    fn();
    passedAssertions++;
    console.log(`  [PASS] Area ${totalAssertions}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Area ${totalAssertions}: ${description}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

const rootDir = process.cwd();

// Load target files
const mainPyPath = path.join(rootDir, 'backend', 'main.py');
const mainPyContent = fs.readFileSync(mainPyPath, 'utf8');

const authContextPath = path.join(rootDir, 'src', 'context', 'AuthContext.jsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

const docViewerPath = path.join(rootDir, 'src', 'pages', 'utility', 'DocumentViewer.jsx');
const docViewerContent = fs.readFileSync(docViewerPath, 'utf8');

const unlockPdfPath = path.join(rootDir, 'src', 'pages', 'pdf', 'UnlockPdf.jsx');
const unlockPdfContent = fs.readFileSync(unlockPdfPath, 'utf8');

const protectPdfPath = path.join(rootDir, 'src', 'pages', 'pdf', 'ProtectPdf.jsx');
const protectPdfContent = fs.readFileSync(protectPdfPath, 'utf8');

// -------------------------------------------------------------
// SECTION 1: UNICODE-SAFE FILENAME SANITIZATION IN BACKEND
// -------------------------------------------------------------
console.log('\n--- SECTION 1: Unicode Filename Preservation & Security ---');

// The sanitization formula in backend/main.py:
// raw_filename = Path(file.filename).name
// sanitized_filename = re.sub(r'[\r\n"\\/\0\x00-\x1f]', '_', raw_filename).strip() or "document.pdf"
const sanitizeFilenameJs = (rawFilename) => {
  const base = path.basename(rawFilename);
  return base.replace(/[\r\n"\\/\0\x00-\x1f]/g, '_').trim() || 'document.pdf';
};

test('Strict ASCII regex [^a-zA-Z0-9_.-] is removed from upload in backend/main.py', () => {
  assert.strictEqual(
    mainPyContent.includes('sanitized_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", raw_filename)'),
    false,
    'Old ASCII-only regex must not be present in backend/main.py'
  );
});

test('Unicode-safe sanitization regex is implemented in backend/main.py', () => {
  assert.ok(
    mainPyContent.includes("re.sub(r'[\\r\\n\"\\\\/\\0\\x00-\\x1f]', '_', raw_filename).strip() or \"document.pdf\""),
    'backend/main.py must use Unicode-safe sanitization'
  );
});

test('French accented filename is preserved without mangling', () => {
  const input = 'rapport_financier_été_2024.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'rapport_financier_été_2024.pdf');
});

test('German umlauts and ß are preserved without mangling', () => {
  const input = 'Geschäftsbericht_München_groß.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'Geschäftsbericht_München_groß.pdf');
});

test('Spanish ñ and accents are preserved without mangling', () => {
  const input = 'año_2024_diseño_gráfico.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'año_2024_diseño_gráfico.pdf');
});

test('Arabic script is preserved without mangling', () => {
  const input = 'تقرير_مالي_2024.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'تقرير_مالي_2024.pdf');
});

test('Chinese simplified characters are preserved without mangling', () => {
  const input = '财务报表_2024年.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, '财务报表_2024年.pdf');
});

test('Japanese Kanji and Hiragana are preserved without mangling', () => {
  const input = '仕様書_改訂版_ひらがな.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, '仕様書_改訂版_ひらがな.pdf');
});

test('Bengali script is preserved without mangling', () => {
  const input = 'নথি_২০২৪_বার্ষিক_রিপোর্ট.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'নথি_২০২৪_বার্ষিক_রিপোর্ট.pdf');
});

test('Cyrillic script is preserved without mangling', () => {
  const input = 'Годовой_отчет_2024.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'Годовой_отчет_2024.pdf');
});

test('Spaces and hyphens in filename are preserved', () => {
  const input = 'Annual Financial Report - Q3 2024 (Final).pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'Annual Financial Report - Q3 2024 (Final).pdf');
});

test('Path traversal attempts (../..) are stripped to basename', () => {
  const input = '../../../../etc/passwd.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'passwd.pdf');
});

test('Windows path traversal attempts (..\\..) are stripped', () => {
  const input = '..\\..\\Windows\\System32\\cmd.exe.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result.includes('\\'), false);
  assert.strictEqual(result.includes('..'), false);
});

test('Null bytes are stripped', () => {
  const input = 'exploit\0file.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result.includes('\0'), false);
  assert.strictEqual(result, 'exploit_file.pdf');
});

test('Newline and carriage return characters are replaced', () => {
  const input = 'document\r\nheader_injection.pdf';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result.includes('\r'), false);
  assert.strictEqual(result.includes('\n'), false);
  assert.strictEqual(result, 'document__header_injection.pdf');
});

test('Empty or pure whitespace filename falls back to document.pdf', () => {
  const input = '   ';
  const result = sanitizeFilenameJs(input);
  assert.strictEqual(result, 'document.pdf');
});

// -------------------------------------------------------------
// SECTION 2: AUTH REFRESH ENDPOINT & REACT AUTH SYNC
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Auth Refresh & Session Synchronization ---');

test('backend/main.py defines @app.post("/api/auth/refresh")', () => {
  assert.ok(
    mainPyContent.includes('@app.post("/api/auth/refresh")'),
    'backend/main.py must register /api/auth/refresh route'
  );
});

test('refresh_token endpoint depends on get_current_user', () => {
  assert.ok(
    mainPyContent.includes('def refresh_token(current_user: User = Depends(get_current_user)):'),
    'refresh_token must enforce authentication via get_current_user dependency'
  );
});

test('refresh_token returns access_token, token_type, and user tier', () => {
  assert.ok(
    mainPyContent.includes('{"access_token": token, "token_type": "bearer", "tier": current_user.tier}'),
    'refresh_token must return standard token response payload'
  );
});

test('AuthContext.jsx imports useEffect and useReducer', () => {
  assert.ok(
    authContextContent.includes("import { createContext, useContext, useReducer, useEffect } from 'react';"),
    'AuthContext must import React hooks'
  );
});

test('AuthContext.jsx registers event listener for docscalar:auth-expired', () => {
  assert.ok(
    authContextContent.includes("window.addEventListener('docscalar:auth-expired', handleAuthExpired);"),
    'AuthContext must register window listener for docscalar:auth-expired'
  );
});

test('AuthContext.jsx cleans up docscalar:auth-expired event listener on unmount', () => {
  assert.ok(
    authContextContent.includes("window.removeEventListener('docscalar:auth-expired', handleAuthExpired);"),
    'AuthContext must remove window listener on cleanup'
  );
});

test('AuthContext.jsx dispatches AUTH_ACTIONS.LOGOUT on auth-expired event', () => {
  assert.ok(
    authContextContent.includes('dispatch({ type: AUTH_ACTIONS.LOGOUT });'),
    'AuthContext must dispatch LOGOUT when auth expires'
  );
});

// -------------------------------------------------------------
// SECTION 3: DOCUMENTVIEWER JARGON SCRUB & PASSWORD UX
// -------------------------------------------------------------
console.log('\n--- SECTION 3: DocumentViewer Jargon & Password UX ---');

test('DocumentViewer.jsx contains zero occurrences of "Server Side PowerPoint"', () => {
  assert.strictEqual(
    docViewerContent.includes('Server Side PowerPoint rendering failed'),
    false,
    'Must scrub "Server Side PowerPoint" from DocumentViewer'
  );
});

test('DocumentViewer.jsx contains zero occurrences of "Client Side slide renderer"', () => {
  assert.strictEqual(
    docViewerContent.includes('Client Side slide renderer failed'),
    false,
    'Must scrub "Client Side slide renderer" from DocumentViewer'
  );
});

test('DocumentViewer.jsx contains zero occurrences of "Client Side client PPTX"', () => {
  assert.strictEqual(
    docViewerContent.includes('Client Side client PPTX'),
    false,
    'Must scrub "Client Side client PPTX" comment'
  );
});

test('DocumentViewer.jsx uses user-friendly slide fallback error message', () => {
  assert.ok(
    docViewerContent.includes('High-fidelity slide rendering failed. Switching to presentation fallback...'),
    'Must display user-friendly slide fallback message'
  );
});

test('DocumentViewer.jsx declares isPasswordProtected state', () => {
  assert.ok(
    docViewerContent.includes('const [isPasswordProtected, setIsPasswordProtected] = useState(false);'),
    'DocumentViewer must track password-protected status'
  );
});

test('DocumentViewer.jsx catches PasswordException during PDF load', () => {
  assert.ok(
    docViewerContent.includes("pdfErr?.name === 'PasswordException' || pdfErr?.message?.toLowerCase().includes('password')"),
    'DocumentViewer must explicitly catch password exceptions on PDF preview'
  );
});

test('DocumentViewer.jsx provides actionable Unlock This PDF button', () => {
  assert.ok(
    docViewerContent.includes('Unlock This PDF'),
    'DocumentViewer must display Unlock This PDF button when password protected'
  );
});

test('DocumentViewer.jsx passes activeFile in state to /pdf/unlock-pdf', () => {
  assert.ok(
    docViewerContent.includes("navigate('/pdf/unlock-pdf', { state: { initialFiles: [activeFile.fileObject] } })"),
    'DocumentViewer must pass active file to /pdf/unlock-pdf'
  );
});

// -------------------------------------------------------------
// SECTION 4: CROSS-STUDIO INITIALFILES & WORKSPACE RESET
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Cross-Studio initialFiles & Job Cancellation ---');

test('UnlockPdf.jsx imports useLocation from react-router-dom', () => {
  assert.ok(
    unlockPdfContent.includes("import { Link, useLocation } from 'react-router-dom';"),
    'UnlockPdf must import useLocation'
  );
});

test('UnlockPdf.jsx calls useLocation hook', () => {
  assert.ok(
    unlockPdfContent.includes('const location = useLocation();'),
    'UnlockPdf must invoke useLocation'
  );
});

test('UnlockPdf.jsx prioritizes location.state.initialFiles on mount', () => {
  assert.ok(
    unlockPdfContent.includes('if (location.state?.initialFiles && Array.isArray(location.state.initialFiles) && location.state.initialFiles.length > 0)'),
    'UnlockPdf must ingest location.state.initialFiles'
  );
});

test('UnlockPdf.jsx sets outputFileName based on incoming initial file', () => {
  assert.ok(
    unlockPdfContent.includes("setOutputFileName(`${base}_unlocked.pdf`);"),
    'UnlockPdf must initialize outputFileName from initial file'
  );
});

test('UnlockPdf.jsx calls poller.resetPoller(true) in resetWorkspace', () => {
  assert.ok(
    unlockPdfContent.includes('poller.resetPoller(true);'),
    'UnlockPdf must cancel backend jobs on workspace reset'
  );
});

test('UnlockPdf.jsx renders Cancel Decryption button during processing', () => {
  assert.ok(
    unlockPdfContent.includes('Cancel Decryption'),
    'UnlockPdf must provide Cancel Decryption button while processing'
  );
  assert.ok(
    unlockPdfContent.includes('poller.cancelJob();'),
    'UnlockPdf cancel button must invoke poller.cancelJob()'
  );
});

test('ProtectPdf.jsx imports useLocation from react-router-dom', () => {
  assert.ok(
    protectPdfContent.includes("import { Link, useLocation } from 'react-router-dom';"),
    'ProtectPdf must import useLocation'
  );
});

test('ProtectPdf.jsx calls useLocation hook', () => {
  assert.ok(
    protectPdfContent.includes('const location = useLocation();'),
    'ProtectPdf must invoke useLocation'
  );
});

test('ProtectPdf.jsx prioritizes location.state.initialFiles on mount', () => {
  assert.ok(
    protectPdfContent.includes('if (location.state?.initialFiles && Array.isArray(location.state.initialFiles) && location.state.initialFiles.length > 0)'),
    'ProtectPdf must ingest location.state.initialFiles'
  );
});

test('ProtectPdf.jsx sets outputFileName based on incoming initial file', () => {
  assert.ok(
    protectPdfContent.includes("setOutputFileName(`${base}_protected.pdf`);"),
    'ProtectPdf must initialize outputFileName from initial file'
  );
});

test('ProtectPdf.jsx calls poller.resetPoller(true) in resetWorkspace', () => {
  assert.ok(
    protectPdfContent.includes('poller.resetPoller(true);'),
    'ProtectPdf must cancel backend jobs on workspace reset'
  );
});

test('ProtectPdf.jsx renders Cancel Encryption button during processing', () => {
  assert.ok(
    protectPdfContent.includes('Cancel Encryption'),
    'ProtectPdf must provide Cancel Encryption button while processing'
  );
  assert.ok(
    protectPdfContent.includes('poller.cancelJob();'),
    'ProtectPdf cancel button must invoke poller.cancelJob()'
  );
});

console.log('\n================================================================');
console.log(`📊 TEST SUITE SUMMARY: ${passedAssertions} / ${totalAssertions} Assertions Passed`);
console.log('================================================================\n');

if (passedAssertions !== totalAssertions) {
  process.exit(1);
}
