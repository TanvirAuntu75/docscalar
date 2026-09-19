/**
 * DocScalar Smart Cropper Storage Utility
 * 
 * Safely persists and retrieves user decisions and "Don't show this again"
 * preferences for the Smart Cropper educational and decision modal.
 */

export const STORAGE_KEY = 'docscalar_smart_crop_preference';
export const SMART_CROP_PREF_KEY = STORAGE_KEY;

/**
 * Default preference state
 */
export const DEFAULT_PREFERENCE = {
  dontShowAgain: false,
  rememberChoice: null, // 'apply' | 'skip' | null
  userDecision: null, // alias for rememberChoice
  cleanMargin: 0,
  targetScope: 'detected', // 'all' | 'detected' | 'selected'
  pageScope: 'all', // 'all' | 'odd' | 'even' | 'custom'
  customRange: '',
  timestamp: null
};

/**
 * Retrieve current Smart Cropper preference from localStorage.
 * Safe for SSR, incognito mode, and restricted browser environments.
 * 
 * @returns {{ dontShowAgain: boolean, rememberChoice: string|null, userDecision: string|null, cleanMargin: number, targetScope: string, pageScope: string, customRange: string, timestamp: number|null }}
 */
export function getSmartCropPreference() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PREFERENCE };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem('docforge_smart_crop_preference');
    if (!raw) return { ...DEFAULT_PREFERENCE };

    const parsed = JSON.parse(raw);
    const decision = (parsed.rememberChoice || parsed.userDecision);
    const validDecision = decision === 'apply' || decision === 'skip' ? decision : null;
    const validTargetScope = ['all', 'detected', 'selected'].includes(parsed.targetScope) ? parsed.targetScope : 'detected';
    const validPageScope = ['all', 'odd', 'even', 'custom'].includes(parsed.pageScope) ? parsed.pageScope : 'all';
    return {
      dontShowAgain: Boolean(parsed.dontShowAgain),
      rememberChoice: validDecision,
      userDecision: validDecision,
      cleanMargin: typeof parsed.cleanMargin === 'number' ? parsed.cleanMargin : 0,
      targetScope: validTargetScope,
      pageScope: validPageScope,
      customRange: typeof parsed.customRange === 'string' ? parsed.customRange : '',
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : null
    };
  } catch (err) {
    console.warn('[DocScalar] Failed to read Smart Cropper preference from storage:', err);
    return { ...DEFAULT_PREFERENCE };
  }
}

/**
 * Persist Smart Cropper preference to localStorage.
 * 
 * @param {object} param0
 * @param {boolean} param0.dontShowAgain - Whether the modal should be suppressed in future uploads
 * @param {'apply'|'skip'|null} [param0.rememberChoice] - The decision to auto-apply in future scans
 * @param {'apply'|'skip'|null} [param0.userDecision] - Alias for rememberChoice
 * @param {number} [param0.cleanMargin=0] - Active clean margin width in points
 * @param {'all'|'detected'|'selected'} [param0.targetScope='detected'] - Target documents scope
 * @param {'all'|'odd'|'even'|'custom'} [param0.pageScope='all'] - Page range scope
 * @param {string} [param0.customRange=''] - Custom page range string
 * @returns {object} The saved preference payload
 */
export function setSmartCropPreference({
  dontShowAgain,
  rememberChoice = null,
  userDecision = null,
  cleanMargin = 0,
  targetScope = 'detected',
  pageScope = 'all',
  customRange = ''
}) {
  const chosenDecision = (rememberChoice || userDecision);
  const validDecision = chosenDecision === 'apply' || chosenDecision === 'skip' ? chosenDecision : null;
  const validTargetScope = ['all', 'detected', 'selected'].includes(targetScope) ? targetScope : 'detected';
  const validPageScope = ['all', 'odd', 'even', 'custom'].includes(pageScope) ? pageScope : 'all';
  const payload = {
    dontShowAgain: Boolean(dontShowAgain),
    rememberChoice: validDecision,
    userDecision: validDecision,
    cleanMargin: typeof cleanMargin === 'number' ? cleanMargin : 0,
    targetScope: validTargetScope,
    pageScope: validPageScope,
    customRange: typeof customRange === 'string' ? customRange : '',
    timestamp: Date.now()
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return payload;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('docscalar_smart_crop_pref_changed', { detail: payload }));
    }
    return payload;
  } catch (err) {
    console.warn('[DocScalar] Failed to save Smart Cropper preference to storage:', err);
    return payload;
  }
}

/**
 * Determines whether the educational/decision modal should automatically appear
 * when scan borders are detected.
 * 
 * @returns {boolean} True if the modal should pop up automatically
 */
export function shouldAutoShowSmartCropModal() {
  const pref = getSmartCropPreference();
  return !pref.dontShowAgain;
}

/**
 * Determines whether Smart Cropping should be automatically activated silently
 * without showing the modal.
 * 
 * @returns {boolean} True if the user remembered 'apply' as their persistent choice
 */
export function shouldAutoApplySmartCrop() {
  const pref = getSmartCropPreference();
  return pref.dontShowAgain && pref.rememberChoice === 'apply';
}

/**
 * Resets Smart Cropper preference to default (clearing "Don't show again").
 * 
 * @returns {boolean}
 */
export function resetSmartCropPreference() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('docscalar_smart_crop_pref_changed', { detail: { ...DEFAULT_PREFERENCE } }));
    }
    return true;
  } catch (err) {
    console.warn('[DocScalar] Failed to reset Smart Cropper preference:', err);
    return false;
  }
}
