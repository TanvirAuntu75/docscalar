/**
 * DocScalar Smart Cropper Quota & Entitlement Manager
 * 
 * Strict multi-tier enforcement for Smart Cropping operations:
 * - Guest Mode (!isAuthenticated): 0 access, auto-crop suppressed.
 * - Free Registered Users: 3 clicks per calendar day (midnight reset).
 * - Pro Subscribers: Unlimited access with zero rate-limiting.
 */

export const DAILY_FREE_LIMIT = 3;
export const STORAGE_KEY_PREFIX = 'docscalar_smart_crop_quota';

/**
 * Returns the current local calendar date formatted as YYYY-MM-DD.
 * Ensures the daily quota resets naturally at local midnight.
 * 
 * @param {Date} [d=new Date()]
 * @returns {string} e.g. "2026-09-21"
 */
export function getTodayDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Derives the unique localStorage key for a specific user and calendar date.
 * 
 * @param {string} [userEmail='anonymous']
 * @param {string} [dateKey=getTodayDateKey()]
 * @returns {string}
 */
export function getQuotaStorageKey(userEmail = 'anonymous', dateKey = getTodayDateKey()) {
  const sanitizedEmail = (userEmail || 'anonymous').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  return `${STORAGE_KEY_PREFIX}_${sanitizedEmail}_${dateKey}`;
}

/**
 * Retrieves the current daily usage count for a user.
 * 
 * @param {string} [userEmail]
 * @returns {{ used: number, date: string }}
 */
export function getDailySmartCropUsage(userEmail) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { used: 0, date: getTodayDateKey() };
  }
  try {
    const key = getQuotaStorageKey(userEmail);
    const raw = window.localStorage.getItem(key);
    if (!raw) return { used: 0, date: getTodayDateKey() };
    const parsed = JSON.parse(raw);
    return {
      used: typeof parsed.used === 'number' ? Math.max(0, parsed.used) : 0,
      date: parsed.date || getTodayDateKey()
    };
  } catch (err) {
    console.warn('[DocScalar Quota] Failed to read daily usage:', err);
    return { used: 0, date: getTodayDateKey() };
  }
}

/**
 * Persists the daily usage count to localStorage and emits an event for reactive UI updates.
 * 
 * @param {string} [userEmail]
 * @param {number} count
 * @returns {void}
 */
export function setDailySmartCropUsage(userEmail, count) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const date = getTodayDateKey();
    const key = getQuotaStorageKey(userEmail, date);
    const payload = { used: Math.max(0, count), date, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(payload));
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('docscalar_smart_crop_quota_changed', { detail: payload }));
    }
  } catch (err) {
    console.warn('[DocScalar Quota] Failed to save daily usage:', err);
  }
}

/**
 * Evaluates the user's entitlement and remaining Smart Cropper quota.
 * 
 * @param {object} auth - Auth state from useAuth()
 * @param {boolean} [auth.isAuthenticated=false]
 * @param {string} [auth.userTier='free']
 * @param {boolean} [auth.isPro=false]
 * @param {string} [auth.userEmail='']
 * @returns {{
 *   allowed: boolean,
 *   reason: 'pro_unlimited' | 'free_quota' | 'limit_reached' | 'guest_locked',
 *   used: number,
 *   remaining: number,
 *   limit: number,
 *   isPro: boolean,
 *   isAuthenticated: boolean,
 *   date: string
 * }}
 */
export function getSmartCropQuota(auth) {
  const isPro = Boolean(auth?.isPro || (auth?.isAuthenticated && auth?.userTier === 'pro'));
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const userEmail = auth?.userEmail || '';

  // Pro Subscribers: Unlimited access
  if (isPro) {
    return {
      allowed: true,
      reason: 'pro_unlimited',
      used: 0,
      remaining: Infinity,
      limit: DAILY_FREE_LIMIT,
      isPro: true,
      isAuthenticated: true,
      date: getTodayDateKey()
    };
  }

  // Guests: Locked until registered
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: 'guest_locked',
      used: 0,
      remaining: 0,
      limit: DAILY_FREE_LIMIT,
      isPro: false,
      isAuthenticated: false,
      date: getTodayDateKey()
    };
  }

  // Authenticated Free Users: 3 clicks per calendar day
  const { used, date } = getDailySmartCropUsage(userEmail);
  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);
  const allowed = remaining > 0;

  return {
    allowed,
    reason: allowed ? 'free_quota' : 'limit_reached',
    used,
    remaining,
    limit: DAILY_FREE_LIMIT,
    isPro: false,
    isAuthenticated: true,
    date
  };
}

/**
 * Synchronous quick-check whether Smart Cropping is allowed.
 * 
 * @param {object} auth
 * @returns {boolean}
 */
export function canUseSmartCrop(auth) {
  return getSmartCropQuota(auth).allowed;
}

/**
 * Consumes 1 click of Smart Cropper quota for free users.
 * Pro users consume 0 quota.
 * Guests cannot consume quota (returns success: false).
 * 
 * @param {object} auth
 * @returns {object} Updated quota result with success flag
 */
export function consumeSmartCropClick(auth) {
  const quota = getSmartCropQuota(auth);

  if (quota.isPro) {
    return { ...quota, success: true };
  }

  if (!quota.isAuthenticated) {
    return { ...quota, success: false };
  }

  if (!quota.allowed) {
    return { ...quota, success: false };
  }

  const nextUsed = quota.used + 1;
  setDailySmartCropUsage(auth.userEmail, nextUsed);
  const nextRemaining = Math.max(0, DAILY_FREE_LIMIT - nextUsed);

  return {
    ...quota,
    used: nextUsed,
    remaining: nextRemaining,
    allowed: nextRemaining > 0,
    reason: nextRemaining > 0 ? 'free_quota' : 'limit_reached',
    success: true
  };
}

/**
 * Helper to reset usage for automated tests or local debugging.
 * 
 * @param {string} [userEmail]
 * @param {string} [dateKey=getTodayDateKey()]
 */
export function resetDailySmartCropUsageForTesting(userEmail = 'anonymous', dateKey = getTodayDateKey()) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = getQuotaStorageKey(userEmail, dateKey);
    window.localStorage.removeItem(key);
  }
}
