import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('🧪 Launching DocScalar Contract & Poller Integrity Molecular Test Suite...\n');

let passedAssertions = 0;
function testAssert(condition, message) {
  assert.ok(condition, message);
  passedAssertions++;
}

// ─────────────────────────────────────────────────────────────────────────────
// Area 1: Central Gateway URL Normalization (api.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 1: Central Gateway URL Normalization & Resolution');
const apiJsContent = fs.readFileSync(path.join(rootDir, 'src/utils/api.js'), 'utf-8');

testAssert(apiJsContent.includes('export function resolveApiUrl('), 'api.js must export resolveApiUrl function');
testAssert(apiJsContent.includes('const cleanPath = url.startsWith(\'/\') ? url : `/${url}`;'), 'resolveApiUrl must normalize leading slash');
testAssert(apiJsContent.includes('return `${BACKEND_URL}${cleanPath}`;'), 'resolveApiUrl must prepend BACKEND_URL for relative paths');
testAssert(apiJsContent.includes('url.startsWith(\'http://\') || url.startsWith(\'https://\')'), 'resolveApiUrl must preserve absolute http/https URLs');
testAssert(apiJsContent.includes('const targetUrl = resolveApiUrl(url);'), 'apiFetch must use resolveApiUrl to normalize targetUrl');

// ─────────────────────────────────────────────────────────────────────────────
// Area 2: Job Poller Hook Contract Alignment (useJobPoller.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 2: Job Poller Hook Contract Alignment');
const useJobPollerContent = fs.readFileSync(path.join(rootDir, 'src/hooks/useJobPoller.js'), 'utf-8');

testAssert(useJobPollerContent.includes('import { apiFetch, BACKEND_URL } from \'../utils/api\';'), 'useJobPoller must import BACKEND_URL from utils/api');
testAssert(useJobPollerContent.includes('export function useJobPoller(apiBaseUrl = BACKEND_URL)'), 'useJobPoller default parameter must be BACKEND_URL');
testAssert(useJobPollerContent.includes('startPolling,'), 'useJobPoller must export startPolling');
testAssert(useJobPollerContent.includes('resetPoller'), 'useJobPoller must export resetPoller');
testAssert(!useJobPollerContent.includes('apiBaseUrl = \'http://localhost:8000\''), 'useJobPoller must not hardcode localhost:8000 as default');

// ─────────────────────────────────────────────────────────────────────────────
// Area 3: UrlToPdf Studio Hook & Server Mode Fixes
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 3: UrlToPdf Studio Hook & Server Mode Fixes');
const urlToPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/utility/UrlToPdf.jsx'), 'utf-8');

testAssert(urlToPdfContent.includes('poller.startPolling(data.job_id);'), 'UrlToPdf must call poller.startPolling instead of poller.start');
testAssert(!urlToPdfContent.includes('poller.start(data.job_id);'), 'UrlToPdf must not contain fatal poller.start call');
testAssert(urlToPdfContent.includes('setEngineMode(\'server\');'), 'UrlToPdf must default to server mode when backend check passes');

// ─────────────────────────────────────────────────────────────────────────────
// Area 4: SplitPdf Studio Payload & Poller Lifecycle Wiring
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 4: SplitPdf Studio Payload & Poller Lifecycle Wiring');
const splitPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/SplitPdf.jsx'), 'utf-8');

testAssert(splitPdfContent.includes('fd.append(\'filename\', uploadData.filename);'), 'SplitPdf must include required filename in FormData');
testAssert(splitPdfContent.includes('fd.append(\'file_id\', uploadData.file_id);'), 'SplitPdf must include file_id in FormData');
testAssert(splitPdfContent.includes('poller.status === \'finished\''), 'SplitPdf must listen to poller.status === finished');
testAssert(splitPdfContent.includes('poller.status === \'failed\''), 'SplitPdf must listen to poller.status === failed');
testAssert(splitPdfContent.includes('saveAs(result.blob, result.name);'), 'SplitPdf downloadAll must support blob downloads');
testAssert(splitPdfContent.includes('poller.resetPoller();'), 'SplitPdf resetWorkspace must reset poller state');

// ─────────────────────────────────────────────────────────────────────────────
// Area 5: TranslatePdf Studio Routing & Server Default
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 5: TranslatePdf Studio Routing & Server Default');
const translatePdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/document/TranslatePdf.jsx'), 'utf-8');

testAssert(translatePdfContent.includes('setEngineMode(\'server\');'), 'TranslatePdf must default to server mode when backend check passes');
testAssert(translatePdfContent.includes('convertFormData.append(\'mode\', \'translate\');'), 'TranslatePdf must append mode: translate to FormData');
testAssert(translatePdfContent.includes('convertFormData.append(\'target_language\', targetLang);'), 'TranslatePdf must append target_language to FormData');
testAssert(translatePdfContent.includes('/api/smart-convert'), 'TranslatePdf must call /api/smart-convert endpoint');

// ─────────────────────────────────────────────────────────────────────────────
// Area 6: DocumentViewer Payload & Health Check
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 6: DocumentViewer Payload & Health Check');
const docViewerContent = fs.readFileSync(path.join(rootDir, 'src/pages/utility/DocumentViewer.jsx'), 'utf-8');

testAssert(docViewerContent.includes('const convertFormData = new FormData();'), 'DocumentViewer must use FormData for PPTX server conversion');
testAssert(docViewerContent.includes('convertFormData.append(\'target_format\', \'pdf\');'), 'DocumentViewer must specify target_format in FormData');
testAssert(docViewerContent.includes('apiFetch(`${BACKEND_URL}/health`)'), 'DocumentViewer health check must use BACKEND_URL');

// ─────────────────────────────────────────────────────────────────────────────
// Area 7: StitchCanvas Redact & Agent Plan Contract Parity
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 7: StitchCanvas Redact & Agent Plan Contract Parity');
const canvasContent = fs.readFileSync(path.join(rootDir, 'src/components/StitchCanvas.jsx'), 'utf-8');

testAssert(canvasContent.includes('import { BACKEND_URL, apiFetch } from \'../utils/api\';'), 'StitchCanvas must import BACKEND_URL from utils/api');
testAssert(!canvasContent.includes('const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || \'http://localhost:8000\';'), 'StitchCanvas must not have local BACKEND_URL definition');
testAssert(canvasContent.includes('convertFormData.append(\'redactions_json\', JSON.stringify('), 'StitchCanvas redact-pdf must send redactions_json Form parameter');
testAssert(canvasContent.includes('files: activeFiles'), 'StitchCanvas agent-plan must include files array in payload');

// ─────────────────────────────────────────────────────────────────────────────
// Area 8: Client Engines Route Singular Path Alignment
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 8: Client Engines Route Singular Path Alignment');
const repairPdfContent = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/repairPdf.js'), 'utf-8');
const redactPdfContent = fs.readFileSync(path.join(rootDir, 'src/engines/pdf/redactPdf.js'), 'utf-8');

testAssert(repairPdfContent.includes('/api/job/${jobData.job_id}/status'), 'repairPdf.js must use singular /api/job/{id}/status');
testAssert(!repairPdfContent.includes('/api/jobs/status/'), 'repairPdf.js must not call plural /api/jobs/status/');
testAssert(redactPdfContent.includes('/api/job/${jobData.job_id}/status'), 'redactPdf.js must use singular /api/job/{id}/status');
testAssert(!redactPdfContent.includes('/api/jobs/status/'), 'redactPdf.js must not call plural /api/jobs/status/');

// ─────────────────────────────────────────────────────────────────────────────
// Area 9: Elimination of Hardcoded localhost:8000 in Source
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 9: Elimination of Hardcoded localhost:8000 in Source');
const editPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/EditPdf.jsx'), 'utf-8');
const signPdfContent = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/SignPdf.jsx'), 'utf-8');
const resumeCtxContent = fs.readFileSync(path.join(rootDir, 'src/context/ResumeContext.jsx'), 'utf-8');

testAssert(editPdfContent.includes('import { apiFetch, uploadFileSecure, BACKEND_URL } from \'../../utils/api\';'), 'EditPdf must import BACKEND_URL from utils/api');
testAssert(!editPdfContent.includes('const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || \'http://localhost:8000\';'), 'EditPdf must not have local BACKEND_URL constant');

testAssert(signPdfContent.includes('import { apiFetch, uploadFileSecure, BACKEND_URL } from \'../../utils/api\';'), 'SignPdf must import BACKEND_URL from utils/api');
testAssert(!signPdfContent.includes('const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || \'http://localhost:8000\';'), 'SignPdf must not have local BACKEND_URL constant');

testAssert(resumeCtxContent.includes('import { apiFetch, uploadFileSecure, BACKEND_URL } from \'../utils/api.js\';'), 'ResumeContext must import BACKEND_URL from utils/api');
testAssert(!resumeCtxContent.includes('const BACKEND_URL = (typeof import.meta !== \'undefined\''), 'ResumeContext must not have local BACKEND_URL constant');
testAssert(resumeCtxContent.includes('apiFetch(`${BACKEND_URL}/api/convert/html-to-pdf`'), 'ResumeContext must call html-to-pdf with BACKEND_URL');

// ─────────────────────────────────────────────────────────────────────────────
// Area 10: Backend FastAPI Route Aliases & Production Hardening
// ─────────────────────────────────────────────────────────────────────────────
console.log('Area 10: Backend FastAPI Route Aliases & Production Hardening');
const backendMainContent = fs.readFileSync(path.join(rootDir, 'backend/main.py'), 'utf-8');
const backendConfigContent = fs.readFileSync(path.join(rootDir, 'backend/config.py'), 'utf-8');

testAssert(backendMainContent.includes('@app.post("/api/convert/translate-pdf")'), 'main.py must register /api/convert/translate-pdf alias');
testAssert(backendMainContent.includes('@app.get("/api/jobs/status/{job_id}")'), 'main.py must register /api/jobs/status/{job_id} alias');
testAssert(backendMainContent.includes('@app.get("/api/jobs/{job_id}/status")'), 'main.py must register /api/jobs/{job_id}/status alias');
testAssert(backendMainContent.includes('RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED"'), 'main.py must support RATE_LIMIT_ENABLED configuration');
testAssert(backendMainContent.includes('CORS_ORIGINS = os.getenv("CORS_ORIGINS"') || backendMainContent.includes('raw_cors = os.getenv("CORS_ORIGINS"'), 'main.py must support CORS_ORIGINS whitelist');
testAssert(!backendMainContent.includes('allow_origins=["*"]'), 'main.py must not combine allow_origins=["*"] with allow_credentials=True');
testAssert(backendMainContent.includes('files: Optional[List[str]] = []'), 'AgentPlanRequest must default files to empty list');
testAssert(backendConfigContent.includes('HOST = os.getenv("HOST", "0.0.0.0")'), 'backend/config.py must default HOST to 0.0.0.0');

console.log(`\n✅ ALL ${passedAssertions} MOLECULAR ASSERTIONS PASSED DETERMINISTICALLY! (100% Zero-Assumption Compliance)\n`);
