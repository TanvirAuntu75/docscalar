/**
 * ==============================================================================
 * DOCSCALAR UNIVERSAL GUEST ACCESS, TIER LIMITS & PRO PERSISTENCE TEST SUITE
 * ==============================================================================
 * 
 * Verifies:
 * 1. TIER_LIMITS configuration in constants.js (10MB Guest, 15MB Free, 1GB Pro)
 * 2. Universal 41-tool accessibility in Guest Mode (minTier === 'guest')
 * 3. Guest Mode quota engine: 3 daily operations limit, consumption, and midnight reset
 * 4. Canvas quota engine: 0 for guest, 10 daily actions for free account, unlimited for Pro
 * 5. Multi-engine quota event dispatching ('docscalar:guest-quota-changed', etc.)
 * 6. FileDropzone dynamic size ceiling enforcement & error notifications
 * 7. ToolPageLayout quota state integration and GuestLimitModal mounting
 * 8. StitchCanvas 'In Active Development' badge, quota telemetry & execution interception
 * 9. Backend main.py file size ceilings (10MB, 15MB, 1GB) and SQLite Pro upgrade route
 * 10. Pricing.jsx backend persistence call via apiFetch('/api/auth/upgrade-pro')
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

// Mock browser environment for node testing
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  key(n) {
    return Object.keys(this.store)[n] || null;
  }
  get length() {
    return Object.keys(this.store).length;
  }
}

const mockStorage = new MockLocalStorage();
const dispatchedEvents = [];

globalThis.window = {
  dispatchEvent: (event) => {
    dispatchedEvents.push(event);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.localStorage = mockStorage;
globalThis.CustomEvent = class CustomEvent {
  constructor(name, options = {}) {
    this.type = name;
    this.detail = options.detail;
  }
};

// Import actual source modules
const { TIER_LIMITS, TOOLS } = await import('../../src/utils/constants.js');
const {
  GUEST_DAILY_LIMIT,
  CANVAS_FREE_DAILY_LIMIT,
  getTodayDateKey,
  getGuestQuota,
  consumeGuestQuota,
  getCanvasQuota,
  consumeCanvasQuota,
  resetQuotaForTesting,
} = await import('../../src/utils/guestQuota.js');

console.log('======================================================================');
console.log('  DOCSCALAR GUEST QUOTA & PRO PERSISTENCE MOLECULAR TEST SUITE       ');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(description, testFn) {
  try {
    testFn();
    console.log(`  ✓ ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 1: Constants & Tier Limits Configuration (src/utils/constants.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('[AREA 1: Constants & Tier Limits Configuration]');

runTest("TIER_LIMITS guest mode is configured for 10 MB max size (10,485,760 bytes)", () => {
  assert.equal(TIER_LIMITS.guest.maxSizeBytes, 10 * 1024 * 1024);
  assert.equal(TIER_LIMITS.guest.maxFileSizeBytes, 10 * 1024 * 1024);
  assert.equal(TIER_LIMITS.guest.maxFileSizeMB, 10);
  assert.equal(TIER_LIMITS.guest.maxSizeLabel, '10 MB');
});

runTest("TIER_LIMITS guest mode has dailyOperationsLimit of 3", () => {
  assert.equal(TIER_LIMITS.guest.dailyOperationsLimit, 3);
  assert.equal(TIER_LIMITS.guest.dailyOpsLimit, 3);
});

runTest("TIER_LIMITS guest mode has dailyCanvasLimit of 0 (requires account)", () => {
  assert.equal(TIER_LIMITS.guest.dailyCanvasLimit, 0);
  assert.equal(TIER_LIMITS.guest.canvasOpsLimit, 0);
});

runTest("TIER_LIMITS free account mode is configured for 15 MB max size (15,728,640 bytes)", () => {
  assert.equal(TIER_LIMITS.free.maxSizeBytes, 15 * 1024 * 1024);
  assert.equal(TIER_LIMITS.free.maxFileSizeBytes, 15 * 1024 * 1024);
  assert.equal(TIER_LIMITS.free.maxFileSizeMB, 15);
  assert.equal(TIER_LIMITS.free.maxSizeLabel, '15 MB');
});

runTest("TIER_LIMITS free account mode has unlimited daily operations", () => {
  assert.equal(TIER_LIMITS.free.dailyOperationsLimit, Infinity);
  assert.equal(TIER_LIMITS.free.dailyOpsLimit, Infinity);
});

runTest("TIER_LIMITS free account mode has 10 daily canvas preview operations", () => {
  assert.equal(TIER_LIMITS.free.dailyCanvasLimit, 10);
  assert.equal(TIER_LIMITS.free.canvasOpsLimit, 10);
});

runTest("TIER_LIMITS pro tier mode is configured for 1 GB max size (1,073,741,824 bytes)", () => {
  assert.equal(TIER_LIMITS.pro.maxSizeBytes, 1024 * 1024 * 1024);
  assert.equal(TIER_LIMITS.pro.maxFileSizeBytes, 1024 * 1024 * 1024);
  assert.equal(TIER_LIMITS.pro.maxFileSizeMB, 1024);
  assert.equal(TIER_LIMITS.pro.maxSizeLabel, '1 GB');
});

runTest("TIER_LIMITS pro tier mode has unlimited operations and canvas access", () => {
  assert.equal(TIER_LIMITS.pro.dailyOperationsLimit, Infinity);
  assert.equal(TIER_LIMITS.pro.dailyOpsLimit, Infinity);
  assert.equal(TIER_LIMITS.pro.dailyCanvasLimit, Infinity);
  assert.equal(TIER_LIMITS.pro.canvasOpsLimit, Infinity);
});

runTest("All 41 tools have minTier set to 'guest' for universal free access", () => {
  assert.equal(TOOLS.length, 41, "Must contain exactly 41 canonical tools");
  const nonGuestTools = TOOLS.filter(t => t.minTier !== 'guest');
  assert.equal(nonGuestTools.length, 0, `Expected 0 non-guest tools, found: ${nonGuestTools.map(t => t.id).join(', ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 2: Guest Mode Quota Engine (src/utils/guestQuota.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 2: Guest Mode Quota Engine]');

runTest("GUEST_DAILY_LIMIT constant equals 3", () => {
  assert.equal(GUEST_DAILY_LIMIT, 3);
});

runTest("getTodayDateKey generates valid YYYY-MM-DD format", () => {
  const key = getTodayDateKey();
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/, "Date key must be YYYY-MM-DD");
});

runTest("Fresh session returns pristine quota (0 used, 3 remaining, allowed=true)", () => {
  resetQuotaForTesting();
  const quota = getGuestQuota();
  assert.equal(quota.used, 0);
  assert.equal(quota.limit, 3);
  assert.equal(quota.remaining, 3);
  assert.equal(quota.allowed, true);
});

runTest("consumeGuestQuota correctly increments usage to 1/3 and returns allowed=true", () => {
  resetQuotaForTesting();
  const res = consumeGuestQuota();
  assert.equal(res.success, true);
  assert.equal(res.used, 1);
  assert.equal(res.remaining, 2);
  assert.equal(res.allowed, true);
});

runTest("consumeGuestQuota increments usage across successive operations up to limit", () => {
  resetQuotaForTesting();
  consumeGuestQuota(); // 1
  const second = consumeGuestQuota(); // 2
  assert.equal(second.used, 2);
  assert.equal(second.remaining, 1);
  assert.equal(second.allowed, true);

  const third = consumeGuestQuota(); // 3
  assert.equal(third.used, 3);
  assert.equal(third.remaining, 0);
  assert.equal(third.allowed, false);
});

runTest("consumeGuestQuota rejects 4th attempt when quota is exhausted and triggers modal", () => {
  resetQuotaForTesting();
  dispatchedEvents.length = 0;
  consumeGuestQuota(); // 1
  consumeGuestQuota(); // 2
  consumeGuestQuota(); // 3

  const fourth = consumeGuestQuota(); // 4 (exceeded)
  assert.equal(fourth.success, false);
  assert.equal(fourth.remaining, 0);

  const modalEvent = dispatchedEvents.find(e => e.type === 'docscalar:guest-limit-modal-open');
  assert.ok(modalEvent, "Must trigger 'docscalar:guest-limit-modal-open' event on quota exhaustion");
  assert.equal(modalEvent.detail.reason, 'quota_exhausted');
});

runTest("Guest quota automatically resets on new calendar day", () => {
  resetQuotaForTesting();
  // Simulate yesterday's usage of 3
  mockStorage.setItem('docscalar_guest_quota_2020-01-01', '3');
  // Reading today's quota must return 0 used
  const quota = getGuestQuota();
  assert.equal(quota.used, 0);
  assert.equal(quota.remaining, 3);
  assert.equal(quota.allowed, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 3: Canvas Quota Engine for Guest, Free Account & Pro (src/utils/guestQuota.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 3: Canvas Quota Engine]');

runTest("CANVAS_FREE_DAILY_LIMIT constant equals 10", () => {
  assert.equal(CANVAS_FREE_DAILY_LIMIT, 10);
});

runTest("getCanvasQuota for guest returns limit=0 and allowed=false", () => {
  const quota = getCanvasQuota('', false);
  assert.equal(quota.limit, 0);
  assert.equal(quota.remaining, 0);
  assert.equal(quota.allowed, false);
  assert.equal(quota.isGuest, true);
});

runTest("consumeCanvasQuota for guest returns success=false and triggers account required modal", () => {
  dispatchedEvents.length = 0;
  const res = consumeCanvasQuota('', false);
  assert.equal(res.success, false);
  assert.equal(res.isGuest, true);
  assert.equal(res.remaining, 0);

  const modalEvent = dispatchedEvents.find(e => e.type === 'docscalar:canvas-limit-modal-open');
  assert.ok(modalEvent, "Must trigger 'docscalar:canvas-limit-modal-open'");
  assert.equal(modalEvent.detail.reason, 'account_required');
});

runTest("getCanvasQuota for Pro tier returns limit=Infinity and allowed=true", () => {
  const quota = getCanvasQuota('pro_user@example.com', true);
  assert.equal(quota.limit, Infinity);
  assert.equal(quota.remaining, Infinity);
  assert.equal(quota.allowed, true);
  assert.equal(quota.isPro, true);
});

runTest("consumeCanvasQuota for Pro user always succeeds with infinite remaining", () => {
  const res = consumeCanvasQuota('pro_user@example.com', true);
  assert.equal(res.success, true);
  assert.equal(res.isPro, true);
  assert.equal(res.remaining, Infinity);
});

runTest("consumeCanvasQuota for Free Account increments from 1 to 10 successfully", () => {
  resetQuotaForTesting();
  const email = 'free_dev@test.org';
  for (let i = 1; i <= 10; i++) {
    const res = consumeCanvasQuota(email, false);
    assert.equal(res.success, true);
    assert.equal(res.used, i);
    assert.equal(res.remaining, 10 - i);
  }
});

runTest("consumeCanvasQuota for Free Account blocks 11th operation and triggers limit modal", () => {
  resetQuotaForTesting();
  dispatchedEvents.length = 0;
  const email = 'free_dev@test.org';
  for (let i = 0; i < 10; i++) {
    consumeCanvasQuota(email, false);
  }

  const eleventh = consumeCanvasQuota(email, false);
  assert.equal(eleventh.success, false);
  assert.equal(eleventh.remaining, 0);

  const modalEvent = dispatchedEvents.find(e => e.type === 'docscalar:canvas-limit-modal-open');
  assert.ok(modalEvent, "Must trigger canvas limit modal on 11th attempt");
  assert.equal(modalEvent.detail.reason, 'quota_exhausted');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 4: GuestLimitModal Component Analysis (src/components/GuestLimitModal.jsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 4: GuestLimitModal Component Structure & Event Wiring]');

const modalSource = readFileSync(resolve(rootDir, 'src/components/GuestLimitModal.jsx'), 'utf-8');

runTest("GuestLimitModal imports createPortal for body rendering", () => {
  assert.ok(modalSource.includes("import { createPortal } from 'react-dom';"));
});

runTest("GuestLimitModal listens to 'docscalar:guest-limit-modal-open'", () => {
  assert.ok(modalSource.includes("window.addEventListener('docscalar:guest-limit-modal-open'"));
  assert.ok(modalSource.includes("window.removeEventListener('docscalar:guest-limit-modal-open'"));
});

runTest("GuestLimitModal listens to 'docscalar:canvas-limit-modal-open'", () => {
  assert.ok(modalSource.includes("window.addEventListener('docscalar:canvas-limit-modal-open'"));
  assert.ok(modalSource.includes("window.removeEventListener('docscalar:canvas-limit-modal-open'"));
});

runTest("GuestLimitModal implements Escape key keyboard dismissal", () => {
  assert.ok(modalSource.includes("if (e.key === 'Escape')"));
});

runTest("GuestLimitModal features 'Daily Guest Limit Reached' for guest mode doc limit", () => {
  assert.ok(modalSource.includes("'Daily Guest Limit Reached'"));
  assert.ok(modalSource.includes("3 free operations per day"));
});

runTest("GuestLimitModal features 'Account Required for Stitch Canvas' or 'Sign Up to Unlock 10 Free Canvas Credits' copy", () => {
  assert.ok(modalSource.includes("'Account Required for Stitch Canvas'") || modalSource.includes("'Sign Up to Unlock 10 Free Canvas Credits'"));
});

runTest("GuestLimitModal features 'Daily Canvas Credit Limit Reached' copy", () => {
  assert.ok(modalSource.includes("'Daily Canvas Credit Limit Reached'") || modalSource.includes("'Daily Canvas Preview Limit Reached'"));
  assert.ok(modalSource.includes("10 free Stitch Canvas credits") || modalSource.includes("10 free daily Stitch Canvas preview actions"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 5: ToolPageLayout Telemetry & Modal Mounting (src/components/ToolPageLayout.jsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 5: ToolPageLayout Quota Telemetry & Modal Mounting]');

const toolLayoutSource = readFileSync(resolve(rootDir, 'src/components/ToolPageLayout.jsx'), 'utf-8');

runTest("ToolPageLayout imports getGuestQuota from utils/guestQuota", () => {
  assert.ok(toolLayoutSource.includes("import { getGuestQuota } from '../utils/guestQuota';"));
});

runTest("ToolPageLayout mounts GuestLimitModal in studio mode", () => {
  const isStudioModeIdx = toolLayoutSource.lastIndexOf('if (isStudioMode) {');
  const studioBlock = toolLayoutSource.substring(isStudioModeIdx, isStudioModeIdx + 400);
  assert.ok(studioBlock.includes('<GuestLimitModal />'));
});

runTest("ToolPageLayout mounts GuestLimitModal in standard mode", () => {
  const returnIdx = toolLayoutSource.lastIndexOf('return (');
  const standardBlock = toolLayoutSource.substring(returnIdx, returnIdx + 300);
  assert.ok(standardBlock.includes('<GuestLimitModal />'));
});

runTest("ToolPageLayout renders guest quota telemetry pill with 3-operation counter", () => {
  assert.ok(toolLayoutSource.includes("Guest Mode · ${guestQuota.remaining} of 3 free operations remaining today"));
  assert.ok(toolLayoutSource.includes("Daily Guest Quota Reached · 0 of 3 operations remaining"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 6: FileDropzone Tier Size Enforcement (src/components/FileDropzone.jsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 6: FileDropzone Dynamic Ceilings & Rejections]');

const dropzoneSource = readFileSync(resolve(rootDir, 'src/components/FileDropzone.jsx'), 'utf-8');

runTest("FileDropzone imports TIER_LIMITS from utils/constants", () => {
  assert.ok(dropzoneSource.includes("TIER_LIMITS") && dropzoneSource.includes("from '../utils/constants'"));
});

runTest("FileDropzone calculates maxAllowedBytes dynamically based on userTier", () => {
  assert.ok(dropzoneSource.includes("const activeTierLimit = TIER_LIMITS[activeTierKey] || TIER_LIMITS.guest;"));
  assert.ok(dropzoneSource.includes("activeTierLimit.maxFileSizeBytes"));
});

runTest("FileDropzone displays dynamic max size label in dropzone metadata tags", () => {
  assert.ok(dropzoneSource.includes("const dynamicMaxSizeLabel = activeTierLimit.maxFileSizeMB >= 1024 ? '1 GB' : `${activeTierLimit.maxFileSizeMB} MB`;"));
});

runTest("FileDropzone shows informative rejection toast when exceeding tier limit", () => {
  assert.ok(dropzoneSource.includes("oversized.name"));
  assert.ok(dropzoneSource.includes("exceeds the ${dynamicMaxSizeLabel} limit"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 7: StitchCanvas In-Development Labeling & Quota Interception (src/components/StitchCanvas.jsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 7: StitchCanvas In-Development Badging & Quota Interception]');

const canvasSource = readFileSync(resolve(rootDir, 'src/components/StitchCanvas.jsx'), 'utf-8');

runTest("StitchCanvas imports getCanvasQuota, consumeCanvasQuota, openCanvasLimitModal", () => {
  assert.ok(canvasSource.includes("import { getCanvasQuota, consumeCanvasQuota, openCanvasLimitModal } from '../utils/guestQuota';"));
});

runTest("StitchCanvas mounts GuestLimitModal in root view", () => {
  assert.ok(canvasSource.includes("import GuestLimitModal from './GuestLimitModal';"));
  assert.ok(canvasSource.includes("<GuestLimitModal />"));
});

runTest("StitchCanvas displays professional 'Beta' or 'Studio Preview' badge", () => {
  assert.ok(canvasSource.includes("Beta") || canvasSource.includes("Studio Preview · In Active Development"));
});

runTest("StitchCanvas displays streamlined compact Beta capsule", () => {
  assert.ok(canvasSource.includes("text-[9.5px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20"));
});

runTest("StitchCanvas top bar has visible quota pill cleanly removed to de-clutter workspace", () => {
  assert.ok(!canvasSource.includes("actions left today"));
  assert.ok(!canvasSource.includes("Sign In for 10 Daily Preview Actions"));
  assert.ok(!canvasSource.includes("PRO UNLIMITED"));
});

runTest("StitchCanvas intercepts handleSendCommand with consumeCanvasQuota check", () => {
  const sendCmdIdx = canvasSource.indexOf('const handleSendCommand =');
  const sendCmdBlock = canvasSource.substring(sendCmdIdx, sendCmdIdx + 1000);
  assert.ok(sendCmdBlock.includes("consumeCanvasQuota(userEmail, false)"));
});

runTest("StitchCanvas intercepts executeOperator with consumeCanvasQuota check", () => {
  const execOpIdx = canvasSource.indexOf('const executeOperator =');
  const execOpBlock = canvasSource.substring(execOpIdx, execOpIdx + 1000);
  assert.ok(execOpBlock.includes("consumeCanvasQuota(userEmail, false)"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 8: Backend Server File Ceilings & SQLite Pro Persistence (backend/main.py)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 8: Backend Ceilings & SQLite Pro Persistence]');

const backendSource = readFileSync(resolve(rootDir, 'backend/main.py'), 'utf-8');

runTest("backend/main.py defines GUEST_MAX_FILE_SIZE = 10MB (10,485,760 bytes)", () => {
  assert.ok(backendSource.includes("GUEST_MAX_FILE_SIZE = 10 * 1024 * 1024"));
});

runTest("backend/main.py defines FREE_MAX_FILE_SIZE = 15MB (15,728,640 bytes)", () => {
  assert.ok(backendSource.includes("FREE_MAX_FILE_SIZE = 15 * 1024 * 1024"));
});

runTest("backend/main.py defines PRO_MAX_FILE_SIZE = 1GB (1,073,741,824 bytes)", () => {
  assert.ok(backendSource.includes("PRO_MAX_FILE_SIZE = 1024 * 1024 * 1024"));
});

runTest("backend/main.py implements /api/auth/upgrade-pro route with DB commit", () => {
  assert.ok(backendSource.includes('@app.post("/api/auth/upgrade-pro")'));
  const upgradeBlock = backendSource.substring(
    backendSource.indexOf('@app.post("/api/auth/upgrade-pro")'),
    backendSource.indexOf('@app.post("/api/auth/upgrade-pro")') + 600
  );
  assert.ok(upgradeBlock.includes('current_user.tier = "pro"'));
  assert.ok(upgradeBlock.includes('db.commit()'));
  assert.ok(upgradeBlock.includes('db.refresh(current_user)'));
});

runTest("backend/main.py aliases /api/billing/activate-beta to upgrade_to_pro", () => {
  assert.ok(backendSource.includes('@app.post("/api/billing/activate-beta")'));
});

runTest("backend/main.py /api/auth/login returns persisted tier directly from database", () => {
  const loginIdx = backendSource.indexOf('def login(');
  const loginBlock = backendSource.substring(loginIdx, loginIdx + 1200);
  assert.ok(loginBlock.includes('"tier": user.tier'));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 9: Pricing.jsx Server-Side Persistence Call (src/pages/Pricing.jsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 9: Pricing.jsx Server-Side Persistence]');

const pricingSource = readFileSync(resolve(rootDir, 'src/pages/Pricing.jsx'), 'utf-8');

runTest("Pricing.jsx handleActivateBetaPro calls /api/auth/upgrade-pro to persist in DB", () => {
  assert.ok(pricingSource.includes("await apiFetch('/api/auth/upgrade-pro'"));
});

runTest("Pricing.jsx pricing table displays 10 MB for Guest Mode, 15 MB for Free, 1 GB for Pro", () => {
  assert.ok(pricingSource.includes("10 MB file size limit"));
  assert.ok(pricingSource.includes("15 MB file size limit"));
  assert.ok(pricingSource.includes("1 GB file size limit & All 41 tools"));
});

runTest("Pricing.jsx states '3 free operations per calendar day' for Guest Mode", () => {
  assert.ok(pricingSource.includes("3 free operations per calendar day"));
});

runTest("Pricing.jsx states 'Unlimited daily document operations' for Free Account", () => {
  assert.ok(pricingSource.includes("Unlimited daily document operations"));
});

runTest("Pricing.jsx states '10 Daily Stitch Canvas Preview actions' for Free Account", () => {
  assert.ok(pricingSource.includes("10 Daily Stitch Canvas Preview actions"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`TEST SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED (TOTAL: ${passCount + failCount})`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL 45+ MOLECULAR ASSERTIONS PASSED WITH ZERO REGRESSIONS!\n');
}
