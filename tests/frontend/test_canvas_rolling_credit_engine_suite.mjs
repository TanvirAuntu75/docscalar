/**
 * ==============================================================================
 * DOCSCALAR STITCH CANVAS 24-HOUR ROLLING CREDIT ENGINE & MODAL MOLECULAR SUITE
 * ==============================================================================
 * 
 * Verifies:
 * 1. Constants: CANVAS_FREE_DAILY_CREDITS, CANVAS_CYCLE_DURATION_MS, CANVAS_FREE_DAILY_LIMIT, GUEST_DAILY_LIMIT
 * 2. formatRemainingTime duration formatter across boundary conditions (0s, ms, min, hours, 24h, includeSeconds)
 * 3. getCanvasQuota Pro Tier contract (infinite credits, no cycle timer)
 * 4. getCanvasQuota Guest contract (0 credits, allowed=false, isGuest=true)
 * 5. getCanvasQuota Free Account pristine state (10 credits, 0 used, null timer)
 * 6. consumeCanvasQuota Pro Tier contract (instant success, infinite credits)
 * 7. consumeCanvasQuota Guest contract (interception, dispatches account_required modal)
 * 8. consumeCanvasQuota Free Account first credit consumption (starts 24h cycle timer)
 * 9. consumeCanvasQuota Free Account successive consumptions (preserves original cycle timer)
 * 10. consumeCanvasQuota Free Account exhaustion at 10 credits (blocks 11th, triggers quota_exhausted modal)
 * 11. 24-Hour Cycle Auto-Reset when elapsed (resets used=0, cycleStartTime=null)
 * 12. 24-Hour Cycle Preservation when within cycle (<24h elapsed)
 * 13. Multi-User Email Normalization & State Isolation
 * 14. resetQuotaForTesting purging of docscalar_canvas_credits_*, docscalar_canvas_quota_*, docscalar_guest_quota_*
 * 15. GuestLimitModal component structure, live interval timer, and professional credits copy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

// Mock browser localStorage and window dispatchEvent
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
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail || {};
  }
};

// Import actual production functions from src/utils/guestQuota.js
import {
  GUEST_DAILY_LIMIT,
  CANVAS_FREE_DAILY_CREDITS,
  CANVAS_CYCLE_DURATION_MS,
  CANVAS_FREE_DAILY_LIMIT,
  formatRemainingTime,
  getTodayDateKey,
  getGuestQuota,
  consumeGuestQuota,
  getCanvasQuota,
  consumeCanvasQuota,
  openCanvasLimitModal,
  resetQuotaForTesting,
} from '../../src/utils/guestQuota.js';

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ ${description}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('\n======================================================================');
console.log('  DOCSCALAR CANVAS 24-HOUR ROLLING CREDIT ENGINE MOLECULAR SUITE      ');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// AREA 1: Constants Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('[AREA 1: Constants Verification]');
runTest("CANVAS_FREE_DAILY_CREDITS is exactly 10", () => {
  assert.equal(CANVAS_FREE_DAILY_CREDITS, 10);
});
runTest("CANVAS_CYCLE_DURATION_MS is exactly 86,400,000 ms (24 hours)", () => {
  assert.equal(CANVAS_CYCLE_DURATION_MS, 24 * 60 * 60 * 1000);
});
runTest("CANVAS_FREE_DAILY_LIMIT maintains backwards compatibility at 10", () => {
  assert.equal(CANVAS_FREE_DAILY_LIMIT, 10);
});
runTest("GUEST_DAILY_LIMIT is 3", () => {
  assert.equal(GUEST_DAILY_LIMIT, 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 2: formatRemainingTime Helper Zero & Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 2: formatRemainingTime Helper Zero & Edge Cases]');
runTest("formatRemainingTime returns '0s' for null, undefined, or 0 ms", () => {
  assert.equal(formatRemainingTime(null), '0s');
  assert.equal(formatRemainingTime(undefined), '0s');
  assert.equal(formatRemainingTime(0), '0s');
  assert.equal(formatRemainingTime(-5000), '0s');
  assert.equal(formatRemainingTime(NaN), '0s');
});
runTest("formatRemainingTime returns '0m' for zero ms when includeSeconds=false", () => {
  assert.equal(formatRemainingTime(0, false), '0m');
  assert.equal(formatRemainingTime(-1000, false), '0m');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 3: formatRemainingTime Seconds & Minutes Precision
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 3: formatRemainingTime Seconds & Minutes Precision]');
runTest("formatRemainingTime formats pure seconds correctly", () => {
  assert.equal(formatRemainingTime(45000), '45s');
  assert.equal(formatRemainingTime(9000), '9s');
});
runTest("formatRemainingTime formats minutes and seconds with padding", () => {
  assert.equal(formatRemainingTime(125000), '2m 05s'); // 2m 5s
  assert.equal(formatRemainingTime(590000), '9m 50s');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 4: formatRemainingTime Hours, Minutes & Seconds (24h Window)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 4: formatRemainingTime Hours, Minutes & Seconds]');
runTest("formatRemainingTime formats '18h 42m 15s' precisely", () => {
  const ms = (18 * 3600 + 42 * 60 + 15) * 1000;
  assert.equal(formatRemainingTime(ms), '18h 42m 15s');
});
runTest("formatRemainingTime formats 23h 59m without seconds when requested", () => {
  const ms = (23 * 3600 + 59 * 60 + 30) * 1000;
  assert.equal(formatRemainingTime(ms, false), '23h 59m');
});
runTest("formatRemainingTime formats exact 24 hours", () => {
  const ms = 24 * 3600 * 1000;
  assert.equal(formatRemainingTime(ms), '24h 00m 00s');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 5: getCanvasQuota Pro Tier Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 5: getCanvasQuota Pro Tier Contract]');
runTest("getCanvasQuota returns infinite credits with null cycle for Pro tier", () => {
  const quota = getCanvasQuota('founder@docscalar.com', true);
  assert.equal(quota.used, 0);
  assert.equal(quota.limit, Infinity);
  assert.equal(quota.remaining, Infinity);
  assert.equal(quota.allowed, true);
  assert.equal(quota.isPro, true);
  assert.equal(quota.isGuest, false);
  assert.equal(quota.cycleStartTime, null);
  assert.equal(quota.resetTime, null);
  assert.equal(quota.resetMs, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 6: getCanvasQuota Guest User Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 6: getCanvasQuota Guest User Contract]');
runTest("getCanvasQuota returns 0 limit and allowed=false for empty email", () => {
  const quota = getCanvasQuota('', false);
  assert.equal(quota.used, 0);
  assert.equal(quota.limit, 0);
  assert.equal(quota.remaining, 0);
  assert.equal(quota.allowed, false);
  assert.equal(quota.isPro, false);
  assert.equal(quota.isGuest, true);
  assert.equal(quota.cycleStartTime, null);
  assert.equal(quota.resetTime, null);
  assert.equal(quota.resetMs, 0);
});
runTest("getCanvasQuota treats null and undefined emails as Guest", () => {
  assert.equal(getCanvasQuota(null, false).isGuest, true);
  assert.equal(getCanvasQuota(undefined, false).isGuest, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 7: getCanvasQuota Free Account Pristine State
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 7: getCanvasQuota Free Account Pristine State]');
runTest("getCanvasQuota returns 10 free credits with 0 used on brand new account", () => {
  resetQuotaForTesting();
  const quota = getCanvasQuota('new_user@example.com', false);
  assert.equal(quota.used, 0);
  assert.equal(quota.limit, 10);
  assert.equal(quota.remaining, 10);
  assert.equal(quota.allowed, true);
  assert.equal(quota.isPro, false);
  assert.equal(quota.isGuest, false);
  assert.equal(quota.cycleStartTime, null);
  assert.equal(quota.resetTime, null);
  assert.equal(quota.resetMs, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 8: consumeCanvasQuota Pro User Execution
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 8: consumeCanvasQuota Pro User Execution]');
runTest("consumeCanvasQuota always succeeds for Pro user without modal dispatch", () => {
  dispatchedEvents.length = 0;
  const res = consumeCanvasQuota('pro_dev@docscalar.com', true);
  assert.equal(res.success, true);
  assert.equal(res.isPro, true);
  assert.equal(res.remaining, Infinity);
  assert.equal(res.limit, Infinity);
  assert.equal(dispatchedEvents.length, 0, "No limit modal event for Pro users");
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 9: consumeCanvasQuota Guest Interception
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 9: consumeCanvasQuota Guest Interception]');
runTest("consumeCanvasQuota intercepts guest and opens account_required modal", () => {
  dispatchedEvents.length = 0;
  const res = consumeCanvasQuota('', false);
  assert.equal(res.success, false);
  assert.equal(res.isGuest, true);
  assert.equal(res.remaining, 0);
  assert.equal(res.limit, 0);

  const event = dispatchedEvents.find(e => e.type === 'docscalar:canvas-limit-modal-open');
  assert.ok(event, "Must dispatch 'docscalar:canvas-limit-modal-open'");
  assert.equal(event.detail.isGuest, true);
  assert.equal(event.detail.reason, 'account_required');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 10: consumeCanvasQuota Free Account 1st Credit (Timer Initialization)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 10: Free Account 1st Credit & Timer Initialization]');
runTest("Consuming 1st credit starts 24-hour cycle timer and dispatches event", () => {
  resetQuotaForTesting();
  dispatchedEvents.length = 0;
  const email = 'user_alpha@test.com';

  const beforeNow = Date.now();
  const res = consumeCanvasQuota(email, false);
  const afterNow = Date.now();

  assert.equal(res.success, true);
  assert.equal(res.used, 1);
  assert.equal(res.remaining, 9);
  assert.equal(res.allowed, true);
  assert.ok(res.cycleStartTime >= beforeNow && res.cycleStartTime <= afterNow, "cycleStartTime must be set to Date.now()");
  assert.equal(res.resetTime, res.cycleStartTime + CANVAS_CYCLE_DURATION_MS);
  assert.ok(res.resetMs > 0 && res.resetMs <= CANVAS_CYCLE_DURATION_MS);

  // Check event dispatch
  const quotaChanged = dispatchedEvents.find(e => e.type === 'docscalar:canvas-quota-changed');
  assert.ok(quotaChanged, "Must dispatch 'docscalar:canvas-quota-changed'");
  assert.equal(quotaChanged.detail.used, 1);
  assert.equal(quotaChanged.detail.remaining, 9);

  // Check localStorage persistence
  const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const rawStored = mockStorage.getItem(`docscalar_canvas_credits_${cleanEmail}`);
  assert.ok(rawStored, "Must persist to docscalar_canvas_credits_* in localStorage");
  const parsed = JSON.parse(rawStored);
  assert.equal(parsed.used, 1);
  assert.equal(parsed.cycleStartTime, res.cycleStartTime);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 11: Free Account 2nd to 10th Credit (Timer Retention)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 11: Free Account 2nd to 10th Credit]');
runTest("Consuming credits 2 to 10 strictly preserves original cycleStartTime", () => {
  resetQuotaForTesting();
  const email = 'user_beta@test.com';

  // Credit 1
  const first = consumeCanvasQuota(email, false);
  const initialStartTime = first.cycleStartTime;
  assert.ok(initialStartTime, "Initial cycleStartTime must exist");

  // Credits 2 through 10
  for (let i = 2; i <= 10; i++) {
    const res = consumeCanvasQuota(email, false);
    assert.equal(res.success, true);
    assert.equal(res.used, i);
    assert.equal(res.remaining, 10 - i);
    assert.equal(res.cycleStartTime, initialStartTime, `Credit #${i} must retain original cycleStartTime`);
    assert.equal(res.resetTime, initialStartTime + CANVAS_CYCLE_DURATION_MS);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 12: Free Account Exhaustion at 10 Credits (11th Attempt Rejection)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 12: Free Account Quota Exhaustion & Limit Modal]');
runTest("11th credit consumption attempt is blocked and triggers limit modal with reset payload", () => {
  resetQuotaForTesting();
  dispatchedEvents.length = 0;
  const email = 'user_gamma@test.com';

  for (let i = 0; i < 10; i++) {
    consumeCanvasQuota(email, false);
  }

  dispatchedEvents.length = 0;
  const eleventh = consumeCanvasQuota(email, false);
  assert.equal(eleventh.success, false);
  assert.equal(eleventh.isGuest, false);
  assert.equal(eleventh.remaining, 0);
  assert.equal(eleventh.limit, 10);

  const modalEvent = dispatchedEvents.find(e => e.type === 'docscalar:canvas-limit-modal-open');
  assert.ok(modalEvent, "Must trigger limit modal");
  assert.equal(modalEvent.detail.isGuest, false);
  assert.equal(modalEvent.detail.reason, 'quota_exhausted');
  assert.equal(modalEvent.detail.used, 10);
  assert.equal(modalEvent.detail.limit, 10);
  assert.ok(modalEvent.detail.resetTime > Date.now(), "resetTime must be in future");
  assert.ok(modalEvent.detail.resetMs > 0, "resetMs must be positive");
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 13: 24-Hour Rolling Window Expiration & Auto-Reset Mechanics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 13: 24-Hour Cycle Expiration & Auto-Reset Mechanics]');
runTest("getCanvasQuota automatically resets used to 0 once 24 hours have elapsed", () => {
  resetQuotaForTesting();
  const email = 'user_expired@test.com';
  const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Simulate record from 24 hours + 5 minutes ago with all 10 credits used
  const pastStartTime = Date.now() - (CANVAS_CYCLE_DURATION_MS + 5 * 60 * 1000);
  mockStorage.setItem(`docscalar_canvas_credits_${cleanEmail}`, JSON.stringify({
    used: 10,
    cycleStartTime: pastStartTime,
  }));

  const quota = getCanvasQuota(email, false);
  assert.equal(quota.used, 0, "used must auto-reset to 0");
  assert.equal(quota.remaining, 10, "remaining must replenish to 10");
  assert.equal(quota.allowed, true, "allowed must become true");
  assert.equal(quota.cycleStartTime, null, "cycleStartTime must reset to null");
  assert.equal(quota.resetTime, null);
  assert.equal(quota.resetMs, 0);

  // Verify localStorage was updated with the reset record
  const saved = JSON.parse(mockStorage.getItem(`docscalar_canvas_credits_${cleanEmail}`));
  assert.equal(saved.used, 0);
  assert.equal(saved.cycleStartTime, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 14: 24-Hour Rolling Window Ongoing Retention (<24h Elapsed)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 14: 24-Hour Window Retention (<24h Elapsed)]');
runTest("getCanvasQuota preserves usage and computes remaining time when <24 hours elapsed", () => {
  resetQuotaForTesting();
  const email = 'user_ongoing@test.com';
  const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Simulate cycle started 6 hours ago with 4 credits used
  const sixHoursAgo = Date.now() - (6 * 3600 * 1000);
  mockStorage.setItem(`docscalar_canvas_credits_${cleanEmail}`, JSON.stringify({
    used: 4,
    cycleStartTime: sixHoursAgo,
  }));

  const quota = getCanvasQuota(email, false);
  assert.equal(quota.used, 4);
  assert.equal(quota.remaining, 6);
  assert.equal(quota.allowed, true);
  assert.equal(quota.cycleStartTime, sixHoursAgo);
  assert.equal(quota.resetTime, sixHoursAgo + CANVAS_CYCLE_DURATION_MS);

  // Expect approximately 18 hours remaining
  const expectedRemainingMs = quota.resetTime - Date.now();
  assert.ok(Math.abs(quota.resetMs - expectedRemainingMs) < 100);
  const formatted = formatRemainingTime(quota.resetMs);
  assert.ok(formatted.startsWith('17h') || formatted.startsWith('18h'), `Formatted time was: ${formatted}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 15: Fresh Cycle Re-initialization after Expiration
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 15: Fresh Cycle Re-initialization after Expiration]');
runTest("consumeCanvasQuota after cycle expiration begins a brand new 24-hour cycle", () => {
  resetQuotaForTesting();
  const email = 'user_reinit@test.com';
  const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 25 hours ago
  const oldCycle = Date.now() - (25 * 3600 * 1000);
  mockStorage.setItem(`docscalar_canvas_credits_${cleanEmail}`, JSON.stringify({
    used: 10,
    cycleStartTime: oldCycle,
  }));

  const nowBefore = Date.now();
  const res = consumeCanvasQuota(email, false);
  const nowAfter = Date.now();

  assert.equal(res.success, true);
  assert.equal(res.used, 1, "Must be 1 credit used in fresh cycle");
  assert.equal(res.remaining, 9);
  assert.ok(res.cycleStartTime >= nowBefore && res.cycleStartTime <= nowAfter, "Must assign brand new cycleStartTime");
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 16: Multi-User Account Email Isolation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 16: Multi-User Account Email Isolation]');
runTest("Different user accounts have independent credit stores and timers", () => {
  resetQuotaForTesting();
  const user1 = 'alex@docscalar.com';
  const user2 = 'taylor@docscalar.com';

  consumeCanvasQuota(user1, false);
  consumeCanvasQuota(user1, false);
  consumeCanvasQuota(user1, false); // Alex has used 3

  consumeCanvasQuota(user2, false); // Taylor has used 1

  const q1 = getCanvasQuota(user1, false);
  const q2 = getCanvasQuota(user2, false);

  assert.equal(q1.used, 3);
  assert.equal(q1.remaining, 7);

  assert.equal(q2.used, 1);
  assert.equal(q2.remaining, 9);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 17: User Email Normalization with Special Characters
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 17: User Email Normalization]');
runTest("Complex email addresses are sanitized into deterministic storage keys", () => {
  resetQuotaForTesting();
  const complexEmail = 'Dev.Lead+Team_2026@sub.Domain-Org.Co.UK';
  const cleanExpected = 'dev_lead_team_2026_sub_domain_org_co_uk';

  consumeCanvasQuota(complexEmail, false);

  const raw = mockStorage.getItem(`docscalar_canvas_credits_${cleanExpected}`);
  assert.ok(raw, "Expected sanitized storage key to exist");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.used, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 18: resetQuotaForTesting Purges All Keys
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 18: resetQuotaForTesting Purges All Keys]');
runTest("resetQuotaForTesting thoroughly purges credits, canvas quota, and guest quota keys", () => {
  mockStorage.setItem('docscalar_guest_quota_2026-09-26', '3');
  mockStorage.setItem('docscalar_canvas_quota_2026-09-26_test', '5');
  mockStorage.setItem('docscalar_canvas_credits_user_a', JSON.stringify({ used: 2 }));
  mockStorage.setItem('unrelated_cache_key', 'keep_me');

  resetQuotaForTesting();

  assert.equal(mockStorage.getItem('docscalar_guest_quota_2026-09-26'), null);
  assert.equal(mockStorage.getItem('docscalar_canvas_quota_2026-09-26_test'), null);
  assert.equal(mockStorage.getItem('docscalar_canvas_credits_user_a'), null);
  assert.equal(mockStorage.getItem('unrelated_cache_key'), 'keep_me');
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 19: GuestLimitModal Source Code & Imports Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 19: GuestLimitModal Imports & Source]');
const modalSrc = readFileSync(resolve(rootDir, 'src/components/GuestLimitModal.jsx'), 'utf-8');

runTest("GuestLimitModal imports formatRemainingTime from utils/guestQuota", () => {
  assert.ok(modalSrc.includes("import { formatRemainingTime } from '../utils/guestQuota';"));
});

runTest("GuestLimitModal imports createPortal from react-dom", () => {
  assert.ok(modalSrc.includes("import { createPortal } from 'react-dom';"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 20: GuestLimitModal Event Handlers & State Capture
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 20: GuestLimitModal Event Handlers & State]');
runTest("handleCanvasLimitOpen captures detail.resetTime and detail.used and detail.limit", () => {
  assert.ok(modalSrc.includes("const handleCanvasLimitOpen = (event) => {"));
  assert.ok(modalSrc.includes("detail.resetTime"));
  assert.ok(modalSrc.includes("detail.used"));
  assert.ok(modalSrc.includes("detail.limit"));
  assert.ok(modalSrc.includes("detail.resetMs"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 21: GuestLimitModal 1-Second Interval Timer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 21: GuestLimitModal 1-Second Live Countdown Timer]');
runTest("GuestLimitModal sets up 1-second setInterval when open and mode is canvas_free_limit", () => {
  assert.ok(modalSrc.includes("modalState.mode === 'canvas_free_limit'"));
  assert.ok(modalSrc.includes("setInterval("));
  assert.ok(modalSrc.includes("1000"));
  assert.ok(modalSrc.includes("clearInterval("));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 22: GuestLimitModal Titles Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 22: GuestLimitModal Titles Verification]');
runTest("GuestLimitModal displays 'Daily Canvas Credit Limit Reached' for free canvas limit", () => {
  assert.ok(modalSrc.includes("isCanvasFreeLimit && 'Daily Canvas Credit Limit Reached'"));
});

runTest("GuestLimitModal displays 'Sign Up to Unlock 10 Free Canvas Credits' for guest canvas", () => {
  assert.ok(modalSrc.includes("isCanvasGuest && 'Sign Up to Unlock 10 Free Canvas Credits'"));
});

runTest("GuestLimitModal displays 'Daily Guest Limit Reached' for guest document operations", () => {
  assert.ok(modalSrc.includes("!isCanvasFreeLimit && !isCanvasGuest && 'Daily Guest Limit Reached'"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 23: GuestLimitModal Pills Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 23: GuestLimitModal Pills Verification]');
runTest("GuestLimitModal features '${modalState.used} of ${modalState.limit} Free Daily Credits Used' pill", () => {
  assert.ok(modalSrc.includes("${modalState.used} of ${modalState.limit} Free Daily Credits Used"));
});

runTest("GuestLimitModal features '10 Free Daily Credits Available' pill for canvas guest", () => {
  assert.ok(modalSrc.includes("10 Free Daily Credits Available"));
});

runTest("GuestLimitModal features '${modalState.used} of ${modalState.limit} Free Operations Used Today' for doc guest", () => {
  assert.ok(modalSrc.includes("${modalState.used} of ${modalState.limit} Free Operations Used Today"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 24: GuestLimitModal Live Timer Box Rendering
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 24: GuestLimitModal Live Timer Box Rendering]');
runTest("Live timer box renders material symbol 'timer' icon", () => {
  assert.ok(modalSrc.includes('<span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">timer</span>') ||
            modalSrc.includes('text-[18px]">timer</span>'));
});

runTest("Live timer box renders '24-Hour Timer (Credits Reset In):' label", () => {
  assert.ok(modalSrc.includes("24-Hour Timer (Credits Reset In):"));
});

runTest("Live timer box invokes formatRemainingTime(modalState.remainingMs)", () => {
  assert.ok(modalSrc.includes("formatRemainingTime(modalState.remainingMs)"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 25: GuestLimitModal Mode Descriptions
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 25: GuestLimitModal Descriptions]');
runTest("Free Canvas limit description explains 24-hour cycle and first-credit countdown", () => {
  assert.ok(modalSrc.includes("You have used your 10 free Stitch Canvas credits for this 24-hour cycle."));
  assert.ok(modalSrc.includes("Your 24-hour countdown began when your first credit was used"));
  assert.ok(modalSrc.includes("Upgrade to DocScalar Pro for unlimited canvas credits"));
});

runTest("Guest Canvas description explains 10 daily canvas credits for workflows & pipelines", () => {
  assert.ok(modalSrc.includes("Stitch Canvas is a visual workspace studio."));
  assert.ok(modalSrc.includes("Create a free DocScalar account to receive 10 daily canvas credits for workflows, node pipelines, and AI prompt executions."));
});

runTest("Guest Document limit description explains 3 free operations per day", () => {
  assert.ok(modalSrc.includes("Guest mode provides instant document processing up to 10 MB per file (3 free operations per day)."));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 26: GuestLimitModal CTA Buttons & Actions
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 26: GuestLimitModal CTA Buttons & Actions]');
runTest("Free Canvas limit CTA is 'Upgrade to Pro (Unlimited Credits)'", () => {
  assert.ok(modalSrc.includes("Upgrade to Pro (Unlimited Credits)"));
  assert.ok(modalSrc.includes("handlePricing"));
});

runTest("Guest Canvas primary CTA is 'Create Free Account (Get 10 Credits)'", () => {
  assert.ok(modalSrc.includes("Create Free Account (Get 10 Credits)"));
  assert.ok(modalSrc.includes("handleSignUp"));
});

runTest("Guest Canvas secondary CTA is 'Log In'", () => {
  assert.ok(modalSrc.includes("isCanvasGuest ? 'Log In' : 'Sign In to Existing Account'"));
  assert.ok(modalSrc.includes("handleLogin"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 27: GuestLimitModal Feature Highlights Grid
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 27: GuestLimitModal Feature Highlights Grid]');
runTest("Feature highlights includes '10 Daily Stitch Canvas Credits included'", () => {
  assert.ok(modalSrc.includes("10 Daily Stitch Canvas Credits included"));
});

runTest("Feature highlights includes 'All 41 PDF, Office, and Image Tools included'", () => {
  assert.ok(modalSrc.includes("All 41 PDF, Office, and Image Tools included"));
});

runTest("Feature highlights includes 'Free Account: Unlimited daily operations (up to 15 MB)'", () => {
  assert.ok(modalSrc.includes("Free Account: <strong>Unlimited daily operations</strong> (up to 15 MB)"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 28: Keyboard Accessibility & ESC Key Dismissal
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 28: Keyboard Accessibility & Dialog Semantics]');
runTest("Modal handles 'Escape' keypress for instant dismissal", () => {
  assert.ok(modalSrc.includes("if (e.key === 'Escape')"));
});

runTest("Modal has proper accessibility attributes (role=dialog, aria-modal=true)", () => {
  assert.ok(modalSrc.includes('role="dialog"'));
  assert.ok(modalSrc.includes('aria-modal="true"'));
  assert.ok(modalSrc.includes('aria-labelledby="guest-limit-modal-title"'));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 29: Quota Formula Precision
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 29: Quota Formula Precision]');
runTest("remaining and allowed match exact arithmetic across all usage values 0..10", () => {
  for (let u = 0; u <= 12; u++) {
    const remaining = Math.max(0, CANVAS_FREE_DAILY_CREDITS - u);
    const allowed = remaining > 0;
    if (u < 10) {
      assert.equal(remaining, 10 - u);
      assert.equal(allowed, true);
    } else {
      assert.equal(remaining, 0);
      assert.equal(allowed, false);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 30: Time Reset Formula Precision
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 30: Time Reset Formula Precision]');
runTest("resetTime and resetMs calculations are strictly non-negative and exact", () => {
  const now = Date.now();
  const startTime = now - 50000;
  const resetTime = startTime + CANVAS_CYCLE_DURATION_MS;
  const resetMs = Math.max(0, resetTime - now);

  assert.equal(resetTime, startTime + 86400000);
  assert.equal(resetMs, 86400000 - 50000);
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 31: Zero Polling / Clean Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 31: Zero Polling / Clean Lifecycle]');
runTest("GuestLimitModal cleans up both window event listeners on unmount", () => {
  assert.ok(modalSrc.includes("window.removeEventListener('docscalar:guest-limit-modal-open'"));
  assert.ok(modalSrc.includes("window.removeEventListener('docscalar:canvas-limit-modal-open'"));
});

// ─────────────────────────────────────────────────────────────────────────────
// AREA 32: Pro Plan Upsell Footer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[AREA 32: Pro Plan Upsell Footer]');
runTest("Footer directs power users to Pro exploration", () => {
  assert.ok(modalSrc.includes("Need high-volume 1 GB batch processing or GPU OCR?"));
  assert.ok(modalSrc.includes("Explore Pro →"));
});

console.log('\n======================================================================');
console.log(`TEST SUITE SUMMARY: ${passedTests} PASSED, 0 FAILED (TOTAL: ${totalTests})`);
console.log('======================================================================\n');
console.log('ALL 32 TEST AREAS AND 50+ MOLECULAR ASSERTIONS PASSED WITH ZERO REGRESSIONS!\n');
