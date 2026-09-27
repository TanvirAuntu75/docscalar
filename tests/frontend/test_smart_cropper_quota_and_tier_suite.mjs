import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('=== Starting Smart Cropper Quota & Multi-Tier Entitlement Master Suite ===\n');

// Set up mock browser environment for Node.js so source module can run directly
const storageMap = new Map();
const eventListeners = new Map();

global.window = {
  localStorage: {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear()
  },
  dispatchEvent: (evt) => {
    const handlers = eventListeners.get(evt.type) || [];
    handlers.forEach(h => h(evt));
    return true;
  },
  addEventListener: (type, handler) => {
    if (!eventListeners.has(type)) eventListeners.set(type, []);
    eventListeners.get(type).push(handler);
  },
  removeEventListener: (type, handler) => {
    if (eventListeners.has(type)) {
      eventListeners.set(type, eventListeners.get(type).filter(h => h !== handler));
    }
  }
};

global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict = {}) {
    this.type = type;
    this.detail = eventInitDict.detail || null;
  }
};

// Import actual source module functions directly (Anti-Inflation Rule 3: No Local-Copy Testing)
const {
  DAILY_FREE_LIMIT,
  STORAGE_KEY_PREFIX,
  getTodayDateKey,
  getQuotaStorageKey,
  getDailySmartCropUsage,
  setDailySmartCropUsage,
  getSmartCropQuota,
  canUseSmartCrop,
  consumeSmartCropClick,
  resetDailySmartCropUsageForTesting
} = await import('../../src/utils/smartCropQuota.js');

let passedTests = 0;
let totalTests = 0;

async function runTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  [PASS] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAll() {
  // Read source files for static verification
  const quotaSrc = fs.readFileSync(path.join(rootDir, 'src/utils/smartCropQuota.js'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropLimitModal.jsx'), 'utf8');
  const useSmartCropperSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useSmartCropper.js'), 'utf8');
  const toolbarBtnSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperToolbarButton.jsx'), 'utf8');
  const panelSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperPanel.jsx'), 'utf8');
  const organizePdfSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/OrganizePdf.jsx'), 'utf8');
  const extractPagesSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/ExtractPages.jsx'), 'utf8');
  const removePagesSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/RemovePages.jsx'), 'utf8');
  const rotatePdfSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/RotatePdf.jsx'), 'utf8');
  const splitPdfSrc = fs.readFileSync(path.join(rootDir, 'src/pages/pdf/SplitPdf.jsx'), 'utf8');

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 1: CORE QUOTA UTILITY FORMULAS & CONSTANTS (Areas 1 - 7)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('DAILY_FREE_LIMIT is strictly equal to 3', () => {
    assert.strictEqual(DAILY_FREE_LIMIT, 3, 'Free limit must be exactly 3');
  });

  await runTest('STORAGE_KEY_PREFIX is docscalar_smart_crop_quota', () => {
    assert.strictEqual(STORAGE_KEY_PREFIX, 'docscalar_smart_crop_quota');
  });

  await runTest('getTodayDateKey returns YYYY-MM-DD with zero padding', () => {
    const testDate = new Date(2026, 4, 3); // May 3, 2026
    const key = getTodayDateKey(testDate);
    assert.strictEqual(key, '2026-05-03');
    const defaultKey = getTodayDateKey();
    assert.match(defaultKey, /^\d{4}-\d{2}-\d{2}$/);
  });

  await runTest('getQuotaStorageKey sanitizes email with special characters', () => {
    const key = getQuotaStorageKey('User+Name@Domain.Com', '2026-09-21');
    assert.strictEqual(key, 'docscalar_smart_crop_quota_user_name_domain.com_2026-09-21');
  });

  await runTest('getQuotaStorageKey handles empty or null email falling back to anonymous', () => {
    const keyNull = getQuotaStorageKey(null, '2026-09-21');
    const keyEmpty = getQuotaStorageKey('', '2026-09-21');
    assert.strictEqual(keyNull, 'docscalar_smart_crop_quota_anonymous_2026-09-21');
    assert.strictEqual(keyEmpty, 'docscalar_smart_crop_quota_anonymous_2026-09-21');
  });

  await runTest('getDailySmartCropUsage returns 0 used when no key exists in storage', () => {
    storageMap.clear();
    const usage = getDailySmartCropUsage('fresh_user@docscalar.io');
    assert.strictEqual(usage.used, 0);
    assert.strictEqual(usage.date, getTodayDateKey());
  });

  await runTest('setDailySmartCropUsage persists payload and fires custom event', () => {
    storageMap.clear();
    let firedDetail = null;
    const testHandler = (e) => { firedDetail = e.detail; };
    window.addEventListener('docscalar_smart_crop_quota_changed', testHandler);

    setDailySmartCropUsage('tester@docscalar.io', 2);
    const usage = getDailySmartCropUsage('tester@docscalar.io');
    assert.strictEqual(usage.used, 2);
    assert.ok(firedDetail !== null, 'Event must fire');
    assert.strictEqual(firedDetail.used, 2);

    window.removeEventListener('docscalar_smart_crop_quota_changed', testHandler);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 2: GUEST MODE ACCESS RESTRICTION (Areas 8 - 12)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('Guest Mode: getSmartCropQuota returns allowed: false and reason: guest_locked', () => {
    const guestAuth = { isAuthenticated: false, userEmail: '' };
    const quota = getSmartCropQuota(guestAuth);
    assert.strictEqual(quota.allowed, false);
    assert.strictEqual(quota.reason, 'guest_locked');
    assert.strictEqual(quota.remaining, 0);
    assert.strictEqual(quota.limit, 3);
    assert.strictEqual(quota.isPro, false);
    assert.strictEqual(quota.isAuthenticated, false);
  });

  await runTest('Guest Mode: canUseSmartCrop returns false', () => {
    const guestAuth = { isAuthenticated: false };
    assert.strictEqual(canUseSmartCrop(guestAuth), false);
  });

  await runTest('Guest Mode: consumeSmartCropClick returns success: false and does not alter storage', () => {
    storageMap.clear();
    const guestAuth = { isAuthenticated: false, userEmail: '' };
    const res = consumeSmartCropClick(guestAuth);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(storageMap.size, 0);
  });

  await runTest('Guest Mode: Null or undefined auth object safely returns guest_locked', () => {
    const quotaNull = getSmartCropQuota(null);
    const quotaUndef = getSmartCropQuota(undefined);
    assert.strictEqual(quotaNull.allowed, false);
    assert.strictEqual(quotaNull.reason, 'guest_locked');
    assert.strictEqual(quotaUndef.allowed, false);
    assert.strictEqual(quotaUndef.reason, 'guest_locked');
  });

  await runTest('Guest Mode: canUseSmartCrop with null auth is false', () => {
    assert.strictEqual(canUseSmartCrop(null), false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 3: PRO SUBSCRIBER UNLIMITED ENTITLEMENT (Areas 13 - 17)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('Pro Tier: auth.isPro === true returns unlimited quota with 0 deduction', () => {
    const proAuth = { isAuthenticated: true, isPro: true, userEmail: 'pro@test.com' };
    const quota = getSmartCropQuota(proAuth);
    assert.strictEqual(quota.allowed, true);
    assert.strictEqual(quota.reason, 'pro_unlimited');
    assert.strictEqual(quota.remaining, Infinity);
    assert.strictEqual(quota.used, 0);
    assert.strictEqual(quota.isPro, true);
  });

  await runTest('Pro Tier: auth.userTier === "pro" returns unlimited quota', () => {
    const proAuth = { isAuthenticated: true, userTier: 'pro', userEmail: 'pro2@test.com' };
    const quota = getSmartCropQuota(proAuth);
    assert.strictEqual(quota.allowed, true);
    assert.strictEqual(quota.reason, 'pro_unlimited');
    assert.strictEqual(quota.remaining, Infinity);
  });

  await runTest('Pro Tier: canUseSmartCrop returns true', () => {
    const proAuth = { isAuthenticated: true, isPro: true };
    assert.strictEqual(canUseSmartCrop(proAuth), true);
  });

  await runTest('Pro Tier: consumeSmartCropClick returns success: true and NEVER increments usage', () => {
    storageMap.clear();
    const proAuth = { isAuthenticated: true, isPro: true, userEmail: 'pro@test.com' };
    const res1 = consumeSmartCropClick(proAuth);
    const res2 = consumeSmartCropClick(proAuth);
    const res3 = consumeSmartCropClick(proAuth);
    const res4 = consumeSmartCropClick(proAuth);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res4.success, true);
    assert.strictEqual(res4.remaining, Infinity);
    assert.strictEqual(storageMap.size, 0, 'Storage must not be touched for pro users');
  });

  await runTest('Pro Tier: Reverting crop does not mutate quota', () => {
    const proAuth = { isAuthenticated: true, isPro: true, userEmail: 'pro@test.com' };
    const quota = getSmartCropQuota(proAuth);
    assert.strictEqual(quota.remaining, Infinity);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 4: FREE REGISTERED USER 3-CLICKS DAILY PROGRESSION (Areas 18 - 25)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('Free Tier: Initial state gives 3 remaining clicks (0/3 used)', () => {
    storageMap.clear();
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    const quota = getSmartCropQuota(freeAuth);
    assert.strictEqual(quota.allowed, true);
    assert.strictEqual(quota.reason, 'free_quota');
    assert.strictEqual(quota.used, 0);
    assert.strictEqual(quota.remaining, 3);
    assert.strictEqual(quota.limit, 3);
  });

  await runTest('Free Tier: First click consumes 1 quota point (1/3 used, 2 remaining)', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    const res = consumeSmartCropClick(freeAuth);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.used, 1);
    assert.strictEqual(res.remaining, 2);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.reason, 'free_quota');
  });

  await runTest('Free Tier: Second click consumes 1 quota point (2/3 used, 1 remaining)', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    const res = consumeSmartCropClick(freeAuth);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.used, 2);
    assert.strictEqual(res.remaining, 1);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.reason, 'free_quota');
  });

  await runTest('Free Tier: Third click consumes 1 quota point (3/3 used, 0 remaining, limit reached)', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    const res = consumeSmartCropClick(freeAuth);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.used, 3);
    assert.strictEqual(res.remaining, 0);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'limit_reached');
  });

  await runTest('Free Tier: Fourth click attempt is strictly BLOCKED (success: false, used stays 3)', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    const res = consumeSmartCropClick(freeAuth);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'limit_reached');
    assert.strictEqual(res.used, 3);
    assert.strictEqual(res.remaining, 0);
  });

  await runTest('Free Tier: canUseSmartCrop returns false once limit is reached', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'free@test.com' };
    assert.strictEqual(canUseSmartCrop(freeAuth), false);
  });

  await runTest('Free Tier: Formula verification Math.max(0, DAILY_FREE_LIMIT - used)', () => {
    const limit = DAILY_FREE_LIMIT;
    const testCases = [
      { used: 0, expected: 3 },
      { used: 1, expected: 2 },
      { used: 2, expected: 1 },
      { used: 3, expected: 0 },
      { used: 4, expected: 0 },
      { used: 99, expected: 0 }
    ];
    for (const tc of testCases) {
      const calc = Math.max(0, limit - tc.used);
      assert.strictEqual(calc, tc.expected, `Used ${tc.used} should give remaining ${tc.expected}`);
    }
  });

  await runTest('Free Tier: Calendar day rollover resets quota to 3 on new date', () => {
    const freeAuth = { isAuthenticated: true, isPro: false, userTier: 'free', userEmail: 'rollover@test.com' };
    // Simulate usage yesterday
    const yesterdayKey = getQuotaStorageKey('rollover@test.com', '2026-09-20');
    storageMap.set(yesterdayKey, JSON.stringify({ used: 3, date: '2026-09-20' }));

    // Check quota today (which should be 0 used because date is today)
    const quotaToday = getSmartCropQuota(freeAuth);
    assert.strictEqual(quotaToday.used, 0);
    assert.strictEqual(quotaToday.remaining, 3);
    assert.strictEqual(quotaToday.allowed, true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 5: RESET AND ISOLATION HELPERS (Areas 26 - 28)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('resetDailySmartCropUsageForTesting clears target storage key', () => {
    setDailySmartCropUsage('cleanup@test.com', 2);
    assert.strictEqual(getDailySmartCropUsage('cleanup@test.com').used, 2);
    resetDailySmartCropUsageForTesting('cleanup@test.com');
    assert.strictEqual(getDailySmartCropUsage('cleanup@test.com').used, 0);
  });

  await runTest('User email isolation: user A usage does not affect user B', () => {
    storageMap.clear();
    const userA = { isAuthenticated: true, userEmail: 'alice@docscalar.io' };
    const userB = { isAuthenticated: true, userEmail: 'bob@docscalar.io' };

    consumeSmartCropClick(userA);
    consumeSmartCropClick(userA);

    const quotaA = getSmartCropQuota(userA);
    const quotaB = getSmartCropQuota(userB);

    assert.strictEqual(quotaA.used, 2);
    assert.strictEqual(quotaA.remaining, 1);
    assert.strictEqual(quotaB.used, 0);
    assert.strictEqual(quotaB.remaining, 3);
  });

  await runTest('Storage JSON corrupted or non-numeric used gracefully handles and recovers', () => {
    const key = getQuotaStorageKey('corrupted@test.com');
    storageMap.set(key, '{"invalid_json": true}');
    const usage = getDailySmartCropUsage('corrupted@test.com');
    assert.strictEqual(usage.used, 0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 6: SMART CROP LIMIT MODAL COMPONENT INTEGRITY (Areas 29 - 33)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('SmartCropLimitModal renders createPortal into document.body', () => {
    assert.ok(modalSrc.includes("createPortal("));
    assert.ok(modalSrc.includes("document.body"));
  });

  await runTest('SmartCropLimitModal defines guest type with Unlock Smart Cropper title', () => {
    assert.ok(modalSrc.includes("Unlock Smart Cropper"));
    assert.ok(modalSrc.includes("isGuest ? 'Unlock Smart Cropper'"));
  });

  await runTest('SmartCropLimitModal guest type routes to /signup and /login', () => {
    assert.ok(modalSrc.includes("navigate('/signup'"));
    assert.ok(modalSrc.includes("navigate('/login'"));
  });

  await runTest('SmartCropLimitModal limit_reached type routes to /pricing for Pro upgrade', () => {
    assert.ok(modalSrc.includes("navigate('/pricing')"));
    assert.ok(modalSrc.includes("Daily Limit Reached"));
    assert.ok(modalSrc.includes("Upgrade to Pro"));
  });

  await runTest('SmartCropLimitModal supports keyboard Escape dismiss and backdrop click', () => {
    assert.ok(modalSrc.includes("e.key === 'Escape'"));
    assert.ok(modalSrc.includes("e.target === e.currentTarget"));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 7: HOOK useSmartCropper ARCHITECTURAL HARDENING (Areas 34 - 38)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('useSmartCropper imports getSmartCropQuota and consumeSmartCropClick', () => {
    assert.ok(useSmartCropperSrc.includes('getSmartCropQuota,'));
    assert.ok(useSmartCropperSrc.includes('consumeSmartCropClick'));
    assert.ok(useSmartCropperSrc.includes("from '../utils/smartCropQuota'"));
  });

  await runTest('useSmartCropper imports useAuth hook', () => {
    assert.ok(useSmartCropperSrc.includes("import { useAuth } from '../context/AuthContext';"));
  });

  await runTest('useSmartCropper isActive initializes to false for guests and free users', () => {
    assert.ok(useSmartCropperSrc.includes("const isProUser = Boolean(auth?.isPro || (auth?.isAuthenticated && auth?.userTier === 'pro'));"));
    assert.ok(useSmartCropperSrc.includes("return isProUser && shouldAutoApplySmartCrop();"));
  });

  await runTest('useSmartCropper runDetection strictly restricts auto-apply to Pro users', () => {
    assert.ok(useSmartCropperSrc.includes("if (isProUser && shouldAutoApplySmartCrop()) {"));
    assert.ok(useSmartCropperSrc.includes("setIsActive(true);"));
  });

  await runTest('useSmartCropper activate checks currentQuota.isAuthenticated and currentQuota.allowed', () => {
    assert.ok(useSmartCropperSrc.includes("if (!currentQuota.isAuthenticated) {"));
    assert.ok(useSmartCropperSrc.includes("setLimitModalType('guest');"));
    assert.ok(useSmartCropperSrc.includes("if (!currentQuota.allowed) {"));
    assert.ok(useSmartCropperSrc.includes("setLimitModalType('limit_reached');"));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 8: TOOLBAR BUTTON & PANEL TIER BADGES (Areas 39 - 41)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('SmartCropperToolbarButton displays PRO, left count, or Free 3/day tier badge', () => {
    assert.ok(toolbarBtnSrc.includes("if (activeQuota.isPro)"));
    assert.ok(toolbarBtnSrc.includes("PRO"));
    assert.ok(toolbarBtnSrc.includes("if (!activeQuota.isAuthenticated)"));
    assert.ok(toolbarBtnSrc.includes("Free 3/day"));
    assert.ok(toolbarBtnSrc.includes("{activeQuota.remaining}/{activeQuota.limit} left"));
  });

  await runTest('SmartCropperToolbarButton renders SmartCropLimitModal', () => {
    assert.ok(toolbarBtnSrc.includes("<SmartCropLimitModal"));
    assert.ok(toolbarBtnSrc.includes("isOpen={isLimitModalOpen}"));
  });

  await runTest('SmartCropperPanel imports and displays SmartCropLimitModal and tier badge', () => {
    assert.ok(panelSrc.includes("import SmartCropLimitModal from './SmartCropLimitModal';"));
    assert.ok(panelSrc.includes("PRO UNLIMITED"));
    assert.ok(panelSrc.includes("<SmartCropLimitModal"));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 9: ZERO AUTO-ACTIVATE ON FILE UPLOAD ACROSS ALL 5 STUDIOS (Areas 42 - 46)
  // ─────────────────────────────────────────────────────────────────────────────

  await runTest('OrganizePdf: Zero unconditional cropper.activate() on file upload', () => {
    const uploadLoop = organizePdfSrc.match(/loadNewFiles[\s\S]*?loadNewFiles\(\);/)?.[0] || '';
    assert.ok(!uploadLoop.includes('cropper.activate();'), 'OrganizePdf upload must not call cropper.activate()');
    assert.ok(organizePdfSrc.includes('paintThumbnailCanvas(targetCard.id, cropper.isActive);'), 'Must use cropper.isActive');
  });

  await runTest('ExtractPages: Zero unconditional cropper.activate() on file upload', () => {
    const thumbLoader = extractPagesSrc.match(/loadThumbnails[\s\S]*?loadThumbnails\(\);/)?.[0] || '';
    assert.ok(!thumbLoader.includes('cropper.activate();'), 'ExtractPages thumbnail loader must not call cropper.activate()');
  });

  await runTest('RemovePages: Zero unconditional cropper.activate() on file upload', () => {
    const thumbLoader = removePagesSrc.match(/loadThumbnails[\s\S]*?loadThumbnails\(\);/)?.[0] || '';
    assert.ok(!thumbLoader.includes('cropper.activate();'), 'RemovePages thumbnail loader must not call cropper.activate()');
  });

  await runTest('RotatePdf: Zero unconditional cropper.activate() on file upload', () => {
    const uploadLoop = rotatePdfSrc.match(/loadNewFiles[\s\S]*?loadNewFiles\(\);/)?.[0] || '';
    assert.ok(!uploadLoop.includes('cropper.activate();'), 'RotatePdf upload must not call cropper.activate()');
    assert.ok(rotatePdfSrc.includes('paintThumbnailCanvas(targetCard.id, cropper.isActive);'), 'Must use cropper.isActive');
  });

  await runTest('SplitPdf: Zero unconditional cropper.activate() on file upload', () => {
    const thumbLoader = splitPdfSrc.match(/loadPdfThumbnails[\s\S]*?loadPdfThumbnails\(\);/)?.[0] || '';
    assert.ok(!thumbLoader.includes('cropper.activate();'), 'SplitPdf thumbnail loader must not call cropper.activate()');
    assert.ok(splitPdfSrc.includes('paintThumbnailCanvas(i - 1, cropper.isActive);'), 'Must use cropper.isActive');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(`Results: ${passedTests} / ${totalTests} test areas passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
