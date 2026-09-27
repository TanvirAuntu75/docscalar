/**
 * DocScalar Quota & Tier Enforcement Manager
 * 
 * Manages:
 * 1. Guest Mode daily document operation quotas (3 operations/calendar day, resetting at local midnight).
 * 2. Stitch Canvas rolling 24-hour credit engine (10 credits/24 hours from 1st credit used for Free Accounts, unlimited for Pro).
 */

export const GUEST_DAILY_LIMIT = 3;
export const CANVAS_FREE_DAILY_CREDITS = 10;
export const CANVAS_CYCLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in ms
export const CANVAS_FREE_DAILY_LIMIT = 10; // Backwards compatibility alias

/**
 * Formats milliseconds remaining into human-readable duration string.
 * e.g. "18h 42m 15s", "23h 59m", or "45s".
 */
export function formatRemainingTime(ms, includeSeconds = true) {
  if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) {
    return includeSeconds ? '0s' : '0m';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (!includeSeconds) {
    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    return `${minutes}m`;
  }

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
    parts.push(`${String(minutes).padStart(2, '0')}m`);
    parts.push(`${String(seconds).padStart(2, '0')}s`);
  } else if (minutes > 0) {
    parts.push(`${minutes}m`);
    parts.push(`${String(seconds).padStart(2, '0')}s`);
  } else {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

/**
 * Returns the current date in YYYY-MM-DD format based on local midnight.
 */
export function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves the current guest operations quota status.
 */
export function getGuestQuota() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { used: 0, limit: GUEST_DAILY_LIMIT, remaining: GUEST_DAILY_LIMIT, allowed: true, date: getTodayDateKey() };
  }

  const dateKey = getTodayDateKey();
  const storageKey = `docscalar_guest_quota_${dateKey}`;
  const raw = localStorage.getItem(storageKey);
  const used = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  const remaining = Math.max(0, GUEST_DAILY_LIMIT - used);

  return {
    used,
    limit: GUEST_DAILY_LIMIT,
    remaining,
    allowed: remaining > 0,
    date: dateKey,
  };
}

/**
 * Consumes 1 guest operation and persists to localStorage.
 * Dispatches 'docscalar:guest-quota-changed'.
 */
export function consumeGuestQuota() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { success: true, remaining: GUEST_DAILY_LIMIT - 1 };
  }

  const dateKey = getTodayDateKey();
  const storageKey = `docscalar_guest_quota_${dateKey}`;
  const current = getGuestQuota();

  if (current.used >= GUEST_DAILY_LIMIT) {
    openGuestLimitModal({ reason: 'quota_exhausted', used: current.used, limit: GUEST_DAILY_LIMIT });
    return { success: false, remaining: 0 };
  }

  const newUsed = current.used + 1;
  localStorage.setItem(storageKey, String(newUsed));

  const result = {
    used: newUsed,
    limit: GUEST_DAILY_LIMIT,
    remaining: Math.max(0, GUEST_DAILY_LIMIT - newUsed),
    allowed: (GUEST_DAILY_LIMIT - newUsed) > 0,
    date: dateKey,
  };

  try {
    window.dispatchEvent(new CustomEvent('docscalar:guest-quota-changed', { detail: result }));
  } catch (_) {}

  return { success: true, ...result };
}

/**
 * Triggers the global Guest Limit Modal.
 */
export function openGuestLimitModal(detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('docscalar:guest-limit-modal-open', { detail }));
  } catch (_) {}
}

/**
 * Retrieves the daily Stitch Canvas rolling 24-hour quota status.
 * - Pro Tier: Unlimited (Infinity)
 * - Free Account: 10 credits per rolling 24-hour cycle from 1st action
 * - Guest: 0 credits (requires account)
 */
export function getCanvasQuota(userEmail = '', isPro = false) {
  if (isPro) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      allowed: true,
      isPro: true,
      isGuest: false,
      cycleStartTime: null,
      resetTime: null,
      resetMs: 0,
    };
  }

  if (!userEmail) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      allowed: false,
      isPro: false,
      isGuest: true,
      cycleStartTime: null,
      resetTime: null,
      resetMs: 0,
    };
  }

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      used: 0,
      limit: CANVAS_FREE_DAILY_CREDITS,
      remaining: CANVAS_FREE_DAILY_CREDITS,
      allowed: true,
      isPro: false,
      isGuest: false,
      cycleStartTime: null,
      resetTime: null,
      resetMs: 0,
    };
  }

  const cleanEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const storageKey = `docscalar_canvas_credits_${cleanEmail}`;

  let used = 0;
  let cycleStartTime = null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        used = typeof parsed.used === 'number' ? Math.max(0, parsed.used) : 0;
        cycleStartTime = typeof parsed.cycleStartTime === 'number' ? parsed.cycleStartTime : null;
      }
    }
  } catch (_) {}

  // Evaluate 24-hour cycle: If cycleStartTime exists and 24h elapsed, auto-reset
  if (cycleStartTime && (Date.now() - cycleStartTime >= CANVAS_CYCLE_DURATION_MS)) {
    used = 0;
    cycleStartTime = null;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ used: 0, cycleStartTime: null }));
    } catch (_) {}
  }

  const remaining = Math.max(0, CANVAS_FREE_DAILY_CREDITS - used);
  const allowed = remaining > 0;
  const resetTime = cycleStartTime ? cycleStartTime + CANVAS_CYCLE_DURATION_MS : null;
  const resetMs = resetTime ? Math.max(0, resetTime - Date.now()) : 0;

  return {
    used,
    limit: CANVAS_FREE_DAILY_CREDITS,
    remaining,
    allowed,
    isPro: false,
    isGuest: false,
    cycleStartTime,
    resetTime,
    resetMs,
  };
}

/**
 * Consumes 1 Canvas credit or prompt message.
 * Returns { success: boolean, ...status }.
 */
export function consumeCanvasQuota(userEmail = '', isPro = false) {
  if (isPro) {
    return { success: true, isPro: true, remaining: Infinity, limit: Infinity };
  }

  if (!userEmail) {
    openCanvasLimitModal({ isGuest: true, reason: 'account_required' });
    return { success: false, isGuest: true, remaining: 0, limit: 0 };
  }

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      success: true,
      used: 1,
      limit: CANVAS_FREE_DAILY_CREDITS,
      remaining: CANVAS_FREE_DAILY_CREDITS - 1,
      allowed: true,
      isPro: false,
      isGuest: false,
      cycleStartTime: Date.now(),
      resetTime: Date.now() + CANVAS_CYCLE_DURATION_MS,
      resetMs: CANVAS_CYCLE_DURATION_MS,
    };
  }

  const current = getCanvasQuota(userEmail, false);

  if (current.used >= CANVAS_FREE_DAILY_CREDITS) {
    openCanvasLimitModal({
      isGuest: false,
      reason: 'quota_exhausted',
      used: current.used,
      limit: CANVAS_FREE_DAILY_CREDITS,
      resetTime: current.resetTime,
      resetMs: current.resetMs,
    });
    return { success: false, isGuest: false, remaining: 0, limit: CANVAS_FREE_DAILY_CREDITS };
  }

  const cleanEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const storageKey = `docscalar_canvas_credits_${cleanEmail}`;

  const used = current.used + 1;
  const cycleStartTime = current.used === 0 ? Date.now() : (current.cycleStartTime || Date.now());

  try {
    localStorage.setItem(storageKey, JSON.stringify({ used, cycleStartTime }));
  } catch (_) {}

  const remaining = Math.max(0, CANVAS_FREE_DAILY_CREDITS - used);
  const allowed = remaining > 0;
  const resetTime = cycleStartTime ? cycleStartTime + CANVAS_CYCLE_DURATION_MS : null;
  const resetMs = resetTime ? Math.max(0, resetTime - Date.now()) : 0;

  const result = {
    used,
    limit: CANVAS_FREE_DAILY_CREDITS,
    remaining,
    allowed,
    isPro: false,
    isGuest: false,
    cycleStartTime,
    resetTime,
    resetMs,
  };

  try {
    window.dispatchEvent(new CustomEvent('docscalar:canvas-quota-changed', { detail: result }));
  } catch (_) {}

  return { success: true, ...result };
}

/**
 * Triggers the Canvas Limit / Upgrade Modal.
 */
export function openCanvasLimitModal(detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('docscalar:canvas-limit-modal-open', { detail }));
  } catch (_) {}
}

/**
 * Resets quota storage for automated testing suites.
 */
export function resetQuotaForTesting() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const dateKey = getTodayDateKey();
  try {
    localStorage.removeItem(`docscalar_guest_quota_${dateKey}`);
    const keysToRemove = new Set();

    if (typeof localStorage.length === 'number' && typeof localStorage.key === 'function') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('docscalar_guest_quota_') ||
           k.startsWith('docscalar_canvas_quota_') ||
           k.startsWith('docscalar_canvas_credits_'))
        ) {
          keysToRemove.add(k);
        }
      }
    }

    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('docscalar_guest_quota_') ||
        key.startsWith('docscalar_canvas_quota_') ||
        key.startsWith('docscalar_canvas_credits_')
      ) {
        keysToRemove.add(key);
      }
    });

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}
