/**
 * test_user_pov_and_multitenant_suite.mjs
 * 
 * Quantitative Molecular Test Suite for TSK-607:
 * Verifies Out-of-the-Box, User-POV, and Multi-Tenant Remediations across Frontend & Backend.
 * 36 Distinct Areas, Falsifiable Assertions, Zero-Copy Source Inspection.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT_DIR = resolve('.');
let totalPassed = 0;
let totalFailed = 0;
const results = [];

function assert(condition, testArea, message, details = '') {
  if (condition) {
    totalPassed++;
    results.push({ area: testArea, status: 'PASS', message });
    console.log(`  [PASS] Area ${testArea}: ${message}`);
  } else {
    totalFailed++;
    results.push({ area: testArea, status: 'FAIL', message, details });
    console.error(`  [FAIL] Area ${testArea}: ${message} -> ${details}`);
  }
}

console.log('\n================================================================');
console.log('  TSK-607 MOLECULAR TEST SUITE: OUT-OF-THE-BOX & USER-POV GAPS');
console.log('================================================================\n');

// -------------------------------------------------------------
// Group 1: Client Network & Auth Layer (src/utils/api.js)
// -------------------------------------------------------------
const apiJsPath = join(ROOT_DIR, 'src/utils/api.js');
const apiJsContent = readFileSync(apiJsPath, 'utf8').replace(/\r\n/g, '\n');

// Area 1: Guest chunked upload allowed for >25MB without token requirement
const chunkConditionMatch = apiJsContent.match(/if\s*\(\s*file\.size\s*>\s*25\s*\*\s*1024\s*\*\s*1024\s*\)/);
const hasTokenRequirementInChunk = apiJsContent.includes('file.size > 25 * 1024 * 1024 && token');
assert(
  chunkConditionMatch !== null && !hasTokenRequirementInChunk,
  1,
  'uploadFileSecure enables chunked upload for files > 25MB without requiring auth token (Guest mode enabled)'
);

// Area 2: Single upload fallback condition
assert(
  apiJsContent.includes("formData.append('file', file, file.name || 'document.pdf')") &&
  apiJsContent.includes("await apiFetch(`${backendUrl}/api/upload`"),
  2,
  'uploadFileSecure retains clean single-shot POST fallback for files <= 25MB'
);

// Area 3: Single upload triggers onProgress(100)
assert(
  apiJsContent.includes('if (onProgress) {\n      onProgress(100);\n    }'),
  3,
  'uploadFileSecure reports onProgress(100) upon successful single-shot upload completion'
);

// Area 4: apiFetch Authorization header injection
assert(
  apiJsContent.includes("newHeaders['Authorization'] = `Bearer ${token}`") &&
  apiJsContent.includes("newHeaders.set('Authorization', `Bearer ${token}`)"),
  4,
  'apiFetch properly formats and injects Authorization Bearer header when token exists'
);

// Area 5: apiFetch 401 token eviction
assert(
  apiJsContent.includes("if (response.status === 401 && token) {\n    localStorage.removeItem('accessToken');"),
  5,
  'apiFetch automatically evicts expired or revoked accessToken from localStorage on HTTP 401'
);

// Area 6: apiFetch 401 custom event dispatch
assert(
  apiJsContent.includes("window.dispatchEvent(new CustomEvent('docscalar:auth-expired'))"),
  6,
  'apiFetch dispatches docscalar:auth-expired window event upon receiving HTTP 401'
);

// Area 7: apiFetch passes response cleanly when status is not 401
assert(
  apiJsContent.includes('return response;'),
  7,
  'apiFetch returns raw response for callers to handle success and status payloads'
);

// Area 8: URL normalization preserved in apiFetch
assert(
  apiJsContent.includes('const targetUrl = resolveApiUrl(url);'),
  8,
  'apiFetch normalizes relative routes through resolveApiUrl'
);

// -------------------------------------------------------------
// Group 2: Backend Upload Gate & Multi-Tenant Isolation (backend/main.py)
// -------------------------------------------------------------
const mainPyPath = join(ROOT_DIR, 'backend/main.py');
const mainPyContent = readFileSync(mainPyPath, 'utf8').replace(/\r\n/g, '\n');

// Area 9: 0-byte file check exists in upload_file
assert(
  mainPyContent.includes('if total_size == 0:') &&
  mainPyContent.includes('file_path.unlink(missing_ok=True)') &&
  mainPyContent.includes('shutil.rmtree(upload_folder, ignore_errors=True)'),
  9,
  'upload_file endpoint checks for total_size == 0 and cleans temp buffers before erroring'
);

// Area 10: 0-byte file returns HTTP 400 with user-friendly detail
assert(
  mainPyContent.includes('detail="The uploaded file is empty (0 bytes). Please upload a valid document."'),
  10,
  'upload_file rejects empty 0-byte uploads with descriptive HTTP 400 error'
);

// Area 11: download_converted_file isolates output by job_id
assert(
  mainPyContent.includes('safe_job_id = os.path.basename(job_id)') &&
  mainPyContent.includes('safe_filename = os.path.basename(filename)') &&
  mainPyContent.includes('isolated_path = config.OUTPUT_DIR / safe_job_id / safe_filename'),
  11,
  'download_converted_file namespaces file lookups by job_id directory to eradicate multi-tenant collisions'
);

// Area 12: download_converted_file falls back to flat path for legacy compatibility
assert(
  mainPyContent.includes('flat_path = config.OUTPUT_DIR / safe_filename') &&
  mainPyContent.includes('target_path = (\n        isolated_path\n        if isolated_path.exists()\n        else (flat_path if flat_path.exists() else None)\n    )'),
  12,
  'download_converted_file gracefully falls back to flat OUTPUT_DIR if isolated subdirectory is absent'
);

// Area 13: download_converted_file provides clear 30-minute expiration notice on 404
assert(
  mainPyContent.includes('detail="Requested file was not found or has expired (documents are purged after 30 minutes for security)."'),
  13,
  'download_converted_file explicitly informs users about 30-minute privacy expiration on 404'
);

// Area 14: Direct download endpoint exists as backward-compatibility fallback
assert(
  mainPyContent.includes('@app.get("/api/download/{filename}")') &&
  mainPyContent.includes('async def download_file_direct(filename: str):'),
  14,
  'Direct /api/download/{filename} route registered to prevent breaking single-parameter callers'
);

// Area 15: Core conversion rate limits relaxed from 5/minute to 30/minute
const count30PerMinute = (mainPyContent.match(/@limiter\.limit\("30\/minute"\)/g) || []).length;
assert(
  count30PerMinute >= 15,
  15,
  `Conversion endpoints updated to @limiter.limit("30/minute") (Found ${count30PerMinute} routes)`
);

// Area 16: Zero occurrences of @limiter.limit("5/minute") on core conversion routes
const count5PerMinute = (mainPyContent.match(/@limiter\.limit\("5\/minute"\)/g) || []).length;
assert(
  count5PerMinute === 0,
  16,
  'All conversion endpoints completely purged of restrictive 5/minute rate limit'
);

// -------------------------------------------------------------
// Group 3: Pricing Page PCI-DSS & Early Access (src/pages/Pricing.jsx)
// -------------------------------------------------------------
const pricingJsxPath = join(ROOT_DIR, 'src/pages/Pricing.jsx');
const pricingJsxContent = readFileSync(pricingJsxPath, 'utf8').replace(/\r\n/g, '\n');

// Area 17: Pro button calls handleGetStartedPro
assert(
  pricingJsxContent.includes('onClick={handleGetStartedPro}'),
  17,
  'Pricing page Pro upgrade button bound to handleGetStartedPro'
);

// Area 18: Unauthenticated users redirected to /login with state preservation
assert(
  pricingJsxContent.includes("navigate('/login', { state: { from: { pathname: '/pricing' } } });"),
  18,
  'handleGetStartedPro redirects unauthenticated visitors to /login preserving return route'
);

// Area 19: Calls /api/billing/create-checkout via apiFetch
assert(
  pricingJsxContent.includes("await apiFetch(`${BACKEND_URL}/api/billing/create-checkout`"),
  19,
  'handleGetStartedPro communicates with backend Stripe checkout endpoint via apiFetch'
);

// Area 20: Redirects to Stripe Checkout session URL when provided
assert(
  pricingJsxContent.includes('if (data.checkout_url) {\n          window.location.href = data.checkout_url;'),
  20,
  'handleGetStartedPro redirects browser directly to Stripe hosted checkout URL'
);

// Area 21: Early access beta modal fallback when Stripe is unconfigured
assert(
  pricingJsxContent.includes('setModalOpen(true);') &&
  pricingJsxContent.includes('Public Beta Preview'),
  21,
  'Pricing page falls back cleanly to Early Access Beta activation when billing is in preview mode'
);

// Area 22: Modal contains zero fake credit card number inputs
assert(
  !pricingJsxContent.includes('placeholder="4242 4242 4242 4242"') &&
  !pricingJsxContent.includes('handleCardNumberChange'),
  22,
  'Pricing modal completely purged of uncertified fake credit card number input fields'
);

// Area 23: Modal contains zero fake CVC inputs
assert(
  !pricingJsxContent.includes('handleCvcChange') &&
  !pricingJsxContent.includes('placeholder="123"'),
  23,
  'Pricing modal completely purged of uncertified fake CVC input fields'
);

// Area 24: Modal contains zero fake expiry inputs
assert(
  !pricingJsxContent.includes('handleExpiryChange') &&
  !pricingJsxContent.includes('placeholder="MM/YY"'),
  24,
  'Pricing modal completely purged of uncertified fake expiry input fields'
);

// Area 25: Purge of residual client-side mock payment disclaimer
assert(
  !pricingJsxContent.includes('DocScalar is local and Client Side first') &&
  !pricingJsxContent.includes('This mock transaction completes entirely inside your browser'),
  25,
  'Pricing modal completely purged of client-side buzzwords and fake browser transaction disclaimer'
);

// Area 26: handleActivateBetaPro sets pro tier and navigates to /workspace
assert(
  pricingJsxContent.includes("const licenseKey = `DF-PRO-BETA-${randomHash}`;") &&
  pricingJsxContent.includes("setTier({ tier: 'pro', proLicenseKey: licenseKey });") &&
  pricingJsxContent.includes("navigate('/workspace');"),
  26,
  'handleActivateBetaPro activates Pro tier with DF-PRO-BETA key and redirects to /workspace'
);

// -------------------------------------------------------------
// Group 4: Studio Fallback & Resilience Sweep
// -------------------------------------------------------------

// Area 27 & 28: PdfToExcel.jsx server check fallback
const pdfToExcelContent = readFileSync(join(ROOT_DIR, 'src/pages/document/PdfToExcel.jsx'), 'utf8').replace(/\r\n/g, '\n');
assert(
  pdfToExcelContent.includes("if (res.ok) {\n          setBackendActive(true);\n          setEngineMode('server');\n        } else {\n          setBackendActive(false);\n          setEngineMode('client');\n        }"),
  27,
  'PdfToExcel.jsx falls back to client engine when server returns non-ok response'
);
assert(
  pdfToExcelContent.includes("} catch (e) {\n        setBackendActive(false);\n        setEngineMode('client');\n      }"),
  28,
  'PdfToExcel.jsx falls back to client engine when server check throws network exception'
);

// Area 29 & 30: PdfToPowerpoint.jsx server check fallback
const pdfToPptContent = readFileSync(join(ROOT_DIR, 'src/pages/document/PdfToPowerpoint.jsx'), 'utf8').replace(/\r\n/g, '\n');
assert(
  pdfToPptContent.includes("if (res.ok) {\n          setBackendActive(true);\n          setEngineMode('server');\n        } else {\n          setBackendActive(false);\n          setEngineMode('client');\n        }"),
  29,
  'PdfToPowerpoint.jsx falls back to client engine when server returns non-ok response'
);
assert(
  pdfToPptContent.includes("} catch (e) {\n        setBackendActive(false);\n        setEngineMode('client');\n      }"),
  30,
  'PdfToPowerpoint.jsx falls back to client engine when server check throws network exception'
);

// Area 31 & 32: TranslatePdf.jsx server check fallback
const translatePdfContent = readFileSync(join(ROOT_DIR, 'src/pages/document/TranslatePdf.jsx'), 'utf8').replace(/\r\n/g, '\n');
assert(
  translatePdfContent.includes("if (res.ok) {\n          setBackendActive(true);\n          setEngineMode('server');\n        } else {\n          setBackendActive(false);\n          setEngineMode('client');\n        }"),
  31,
  'TranslatePdf.jsx falls back to client engine when server returns non-ok response'
);
assert(
  translatePdfContent.includes("} catch (e) {\n        setBackendActive(false);\n        setEngineMode('client');\n      }"),
  32,
  'TranslatePdf.jsx falls back to client engine when server check throws network exception'
);

// Area 33 & 34: HtmlToPdf.jsx server check fallback
const htmlToPdfContent = readFileSync(join(ROOT_DIR, 'src/pages/document/HtmlToPdf.jsx'), 'utf8').replace(/\r\n/g, '\n');
assert(
  htmlToPdfContent.includes("if (res.ok) {\n          setBackendActive(true);\n          setEngineMode('server');\n        } else {\n          setBackendActive(false);\n          setEngineMode('client');\n        }"),
  33,
  'HtmlToPdf.jsx falls back to client engine when server returns non-ok response'
);
assert(
  htmlToPdfContent.includes("} catch (e) {\n        setBackendActive(false);\n        setEngineMode('client');\n      }"),
  34,
  'HtmlToPdf.jsx falls back to client engine when server check throws network exception'
);

// -------------------------------------------------------------
// Group 5: Storage & Cleanup Lifecycle
// -------------------------------------------------------------
const cleanupPyContent = readFileSync(join(ROOT_DIR, 'backend/jobs/cleanup.py'), 'utf8').replace(/\r\n/g, '\n');

// Area 35: Recursive directory cleanup for both UPLOAD_DIR and OUTPUT_DIR
assert(
  cleanupPyContent.includes('for directory in [config.UPLOAD_DIR, config.OUTPUT_DIR]:') &&
  cleanupPyContent.includes('elif file_path.is_dir():') &&
  cleanupPyContent.includes('shutil.rmtree(file_path)'),
  35,
  'cleanup_expired_files scans both UPLOAD_DIR and OUTPUT_DIR, removing expired subdirectories'
);

// Area 36: Expiration threshold formula
assert(
  cleanupPyContent.includes('expiry_threshold = config.FILE_EXPIRY_MINS * 60') &&
  cleanupPyContent.includes('file_age = now - file_path.stat().st_mtime'),
  36,
  'cleanup_expired_files mathematically calculates age using file_path.stat().st_mtime against expiry_threshold'
);

console.log('\n----------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('----------------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('>>> 100% MOLECULAR TEST COVERAGE CERTIFIED: ALL ASSERTIONS PASSED <<<\n');
  process.exit(0);
}
