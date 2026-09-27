import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * SmartCropLimitModal Component
 * 
 * Displayed when:
 * 1. A guest user attempts to use Smart Cropper ('guest' type).
 * 2. An authenticated free user exhausts their 3 daily crops ('limit_reached' type).
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {'guest' | 'limit_reached'} [props.type='guest'] - The modal variant
 * @param {function} props.onClose - Dismiss callback
 * @param {number} [props.usedCount=3] - Number of crops used today
 * @param {number} [props.dailyLimit=3] - Maximum free crops allowed per day
 */
export function SmartCropLimitModal({
  isOpen,
  type = 'guest',
  onClose,
  usedCount = 3,
  dailyLimit = 3
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isGuest = type === 'guest';

  const handleSignUp = () => {
    onClose();
    navigate('/signup', { state: { from: location } });
  };

  const handleLogin = () => {
    onClose();
    navigate('/login', { state: { from: location } });
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-crop-modal-title"
    >
      <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-[var(--text-primary)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center gap-2 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isGuest 
              ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' 
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}>
            <span className="material-symbols-outlined text-[26px]">
              {isGuest ? 'auto_fix_high' : 'lock_clock'}
            </span>
          </div>

          <h2 id="smart-crop-modal-title" className="text-lg font-bold">
            {isGuest ? 'Unlock Smart Cropper' : `Daily Limit Reached (${usedCount}/${dailyLimit} Used)`}
          </h2>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
            {isGuest
              ? 'Smart Cropper automatically detects and excises black scan borders and printer skew artifacts using edge-detection algorithms.'
              : `You have used your ${dailyLimit} free Smart Crops for today. Your free daily quota resets automatically at midnight.`}
          </p>
        </div>

        {/* Tier Details Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3.5 mb-5 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-emerald-500 shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold">Free Accounts</span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Get <strong className="text-[var(--text-primary)]">3 free Smart Crops every day</strong> simply by signing up or logging in.
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-[var(--border-subtle)]" />

          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)] shrink-0 mt-0.5">
              verified
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold">DocScalar Pro</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-primary)] text-white">
                  UNLIMITED
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Unlimited Smart Cropping, 2GB file uploads, batch document processing, and priority servers.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isGuest ? (
            <>
              <button
                type="button"
                onClick={handleSignUp}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Sign Up Free (3 Crops Daily)</span>
              </button>

              <button
                type="button"
                onClick={handleLogin}
                className="w-full py-2 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Log In to Existing Account</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleUpgrade}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">star</span>
                <span>Upgrade to Pro for Unlimited Crops</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <span>Close (Resets Tomorrow)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SmartCropLimitModal;
