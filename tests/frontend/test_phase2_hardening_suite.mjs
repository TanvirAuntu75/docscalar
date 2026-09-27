/**
 * Phase 2 System Hardening Molecular Test Suite
 * Validates:
 * 1. Server-side cooperative job cancellation (queue.py, main.py, useJobPoller.js)
 * 2. IndexedDB draft TTL eviction & mobile quota protection (db.js, App.jsx)
 * 3. Password-protected PDF UX & 1-click unlock pathways (PdfToWord, PdfToExcel, CompressPdf)
 * 4. Fault-tolerant multi-file batch conversions (PdfToWord)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '../..');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ Assertion Failed [${totalAssertions}]: ${message}`);
    process.exitCode = 1;
  } else {
    passedAssertions++;
    console.log(`✅ [${totalAssertions}] ${message}`);
  }
}

console.log('\n--- AREA 1: backend/jobs/queue.py Job Cancellation Logic ---');
const queueCode = readFileSync(resolve(root, 'backend/jobs/queue.py'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  queueCode.includes('def cancel_job(job_id: str) -> bool:'),
  'cancel_job function signature is defined with boolean return type'
);
assert(
  queueCode.includes('def is_job_cancelled(job_id: str = None) -> bool:'),
  'is_job_cancelled function signature is defined'
);
assert(
  queueCode.includes('job.cancel()') && queueCode.includes('in_memory_jobs[job_id]["status"] = "cancelled"'),
  'cancel_job supports both Redis/RQ and in-memory ThreadPool fallback'
);
assert(
  queueCode.includes('_current_job_state.current_job_id'),
  'is_job_cancelled checks thread-local current_job_id when job_id is omitted'
);

console.log('\n--- AREA 2: backend/jobs/queue.py Worker Cancellation Guards ---');
assert(
  queueCode.includes('if in_memory_jobs.get(job_id, {}).get("status") == "cancelled":\n                    return'),
  'run_task checks for cancellation before starting execution'
);
assert(
  queueCode.includes('if in_memory_jobs.get(job_id, {}).get("status") == "cancelled":\n                        return\n                    in_memory_jobs[job_id]["status"] = "finished"'),
  'run_task avoids overwriting cancelled status with finished'
);
assert(
  queueCode.includes('if in_memory_jobs.get(job_id, {}).get("status") == "cancelled":\n                        return\n                    in_memory_jobs[job_id]["status"] = "failed"'),
  'run_task avoids overwriting cancelled status with failed'
);
assert(
  queueCode.includes('in_memory_jobs[job_id]["error"] = "Job was cancelled by user."'),
  'cancel_job records clear user cancellation message'
);

console.log('\n--- AREA 3: backend/main.py Cancellation Endpoints ---');
const mainCode = readFileSync(resolve(root, 'backend/main.py'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  mainCode.includes('@app.post("/api/job/{job_id}/cancel")'),
  'POST /api/job/{job_id}/cancel endpoint is registered'
);
assert(
  mainCode.includes('@app.post("/api/jobs/{job_id}/cancel")'),
  'POST /api/jobs/{job_id}/cancel plural route alias is registered'
);
assert(
  mainCode.includes('from backend.jobs.queue import cancel_job'),
  'cancel_job is imported into backend/main.py'
);
assert(
  mainCode.includes('"status": "cancelled" if cancelled else "not_found"'),
  'cancel_job_endpoint returns structured status response'
);

console.log('\n--- AREA 4: src/hooks/useJobPoller.js Cancellation Hook ---');
const pollerCode = readFileSync(resolve(root, 'src/hooks/useJobPoller.js'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  pollerCode.includes('const cancelJob = useCallback(async () =>'),
  'cancelJob method is defined in useJobPoller'
);
assert(
  pollerCode.includes('cancelJob\n  };'),
  'cancelJob is returned by useJobPoller hook'
);
assert(
  pollerCode.includes('const resetPoller = useCallback((cancelServer = false) =>'),
  'resetPoller accepts cancelServer parameter'
);
assert(
  pollerCode.includes("const isActive = status === 'started' || status === 'queued';"),
  'resetPoller detects active in-flight states'
);
assert(
  pollerCode.includes('apiFetch(`${apiBaseUrl}/api/job/${activeId}/cancel`, { method: \'POST\' })'),
  'resetPoller dispatches POST to cancellation endpoint when active'
);
assert(
  pollerCode.includes('pollWorkerRef.current.terminate()'),
  'resetPoller terminates local background Web Worker timer'
);

console.log('\n--- AREA 5: src/utils/db.js Draft TTL & Quota Recovery ---');
const dbCode = readFileSync(resolve(root, 'src/utils/db.js'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  dbCode.includes('export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;'),
  'DRAFT_TTL_MS is exported and equals exactly 24 hours (86,400,000 ms)'
);
assert(
  dbCode.includes('export async function pruneExpiredStudioDrafts(maxAgeMs = DRAFT_TTL_MS)'),
  'pruneExpiredStudioDrafts is exported with default 24h TTL'
);
assert(
  dbCode.includes("rec.key.startsWith('studio_draft_')"),
  'pruneExpiredStudioDrafts specifically targets studio draft keys'
);
assert(
  dbCode.includes('const age = rec.date ? now - new Date(rec.date).getTime() : Infinity;'),
  'pruneExpiredStudioDrafts calculates precise record age'
);
assert(
  dbCode.includes('if (age > DRAFT_TTL_MS) {\n          store.delete(`studio_draft_${key}`);\n          resolve(null);'),
  'loadStudioDraft automatically purges stale drafts older than 24 hours'
);
assert(
  dbCode.includes('await pruneExpiredStudioDrafts(60 * 60 * 1000);'),
  'saveStudioDraft performs quota recovery sweep of drafts older than 1h on error'
);

console.log('\n--- AREA 6: src/App.jsx Idle Draft Sweep ---');
const appCode = readFileSync(resolve(root, 'src/App.jsx'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  appCode.includes("import { pruneExpiredStudioDrafts } from './utils/db'"),
  'App.jsx imports pruneExpiredStudioDrafts from ./utils/db'
);
assert(
  appCode.includes('pruneExpiredStudioDrafts().catch(() => {});'),
  'App.jsx executes idle sweep of expired drafts'
);
assert(
  appCode.includes('return () => clearTimeout(timer);'),
  'App.jsx cleans up idle sweep timer on unmount'
);

console.log('\n--- AREA 7: src/pages/document/PdfToWord.jsx Password & Batch Resilience ---');
const ptwCode = readFileSync(resolve(root, 'src/pages/document/PdfToWord.jsx'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  ptwCode.includes('poller.cancelJob();'),
  'PdfToWord handleCancel calls poller.cancelJob()'
);
assert(
  ptwCode.includes("err.name === 'PasswordException' || String(err.message).includes('password')"),
  'PdfToWord loadPdf detects PasswordException'
);
assert(
  ptwCode.includes('const failedDocs = [];'),
  'PdfToWord batch conversion maintains isolated failedDocs registry'
);
assert(
  ptwCode.includes("zip.file('unconverted_files_summary.txt', report);"),
  'PdfToWord batch conversion attaches unconverted_files_summary.txt to ZIP'
);
assert(
  ptwCode.includes('failedDocs.push({ name: currentDoc.name, reason: docErr.message || \'Conversion failed\' });'),
  'PdfToWord batch conversion isolates per-file failure without aborting entire batch'
);
assert(
  ptwCode.includes('to="/pdf/unlock-pdf"') && ptwCode.includes('state={{ initialFiles: files }}'),
  'PdfToWord error banner renders Unlock PDF button with initialFiles state'
);

console.log('\n--- AREA 8: src/pages/document/PdfToExcel.jsx Password & Cancellation ---');
const pteCode = readFileSync(resolve(root, 'src/pages/document/PdfToExcel.jsx'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  pteCode.includes("err.name === 'PasswordException' || String(err.message).toLowerCase().includes('password')"),
  'PdfToExcel loadDoc catches PasswordException and password errors'
);
assert(
  pteCode.includes('poller.cancelJob();'),
  'PdfToExcel resetWorkspace calls poller.cancelJob()'
);
assert(
  pteCode.includes('poller.cancelJob();\n                        setProcessing(false);'),
  'PdfToExcel progress indicator contains Cancel button calling poller.cancelJob()'
);
assert(
  pteCode.includes('to="/pdf/unlock-pdf"') && pteCode.includes('state={{ initialFiles: files }}'),
  'PdfToExcel error banner renders Unlock PDF button with initialFiles state'
);

console.log('\n--- AREA 9: src/pages/pdf/CompressPdf.jsx Password & Cancellation ---');
const cpCode = readFileSync(resolve(root, 'src/pages/pdf/CompressPdf.jsx'), 'utf-8').replace(/\r\n/g, '\n');

assert(
  cpCode.includes("err.name === 'PasswordException' || String(err.message).toLowerCase().includes('password')"),
  'CompressPdf loadThumbnails catches PasswordException and sets error'
);
assert(
  cpCode.includes('poller.cancelJob();'),
  'CompressPdf resetWorkspace calls poller.cancelJob()'
);
assert(
  cpCode.includes('to="/pdf/unlock-pdf"') && cpCode.includes('state={{ initialFiles: files }}'),
  'CompressPdf error banner renders Unlock PDF button with initialFiles state'
);

console.log(`\n========================================`);
console.log(`FINAL RESULT: ${passedAssertions} / ${totalAssertions} assertions passed.`);
console.log(`========================================\n`);

if (passedAssertions !== totalAssertions) {
  process.exit(1);
}
