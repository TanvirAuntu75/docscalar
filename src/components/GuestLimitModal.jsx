import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatRemainingTime } from '../utils/guestQuota';

/**
 * GuestLimitModal Component
 * 
 * High-grade, professional modal rendered when:
 * 1. A guest user consumes their 3 free daily document operations ('guest_doc_limit').
 * 2. An unauthenticated guest accesses Stitch Canvas ('canvas_guest').
 * 3. A free account user reaches their 10 Stitch Canvas credits within a 24-hour cycle ('canvas_free_limit').
 */
export default function GuestLimitModal() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'guest_doc_limit', // 'guest_doc_limit' | 'canvas_guest' | 'canvas_free_limit'
    used: 3,
    limit: 3,
    resetTime: null,
    remainingMs: 0,
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGuestLimitOpen = (event) => {
      const detail = event?.detail || {};
      setModalState({
        isOpen: true,
        mode: 'guest_doc_limit',
        used: detail.used || 3,
        limit: detail.limit || 3,
        resetTime: null,
        remainingMs: 0,
      });
    };

    const handleCanvasLimitOpen = (event) => {
      const detail = event?.detail || {};
      const resetTime = detail.resetTime || null;
      const remainingMs = resetTime ? Math.max(0, resetTime - Date.now()) : (detail.resetMs || 0);
      setModalState({
        isOpen: true,
        mode: detail.isGuest ? 'canvas_guest' : 'canvas_free_limit',
        used: detail.used !== undefined ? detail.used : 10,
        limit: detail.limit !== undefined ? detail.limit : 10,
        resetTime,
        remainingMs,
      });
    };

    window.addEventListener('docscalar:guest-limit-modal-open', handleGuestLimitOpen);
    window.addEventListener('docscalar:canvas-limit-modal-open', handleCanvasLimitOpen);

    return () => {
      window.removeEventListener('docscalar:guest-limit-modal-open', handleGuestLimitOpen);
      window.removeEventListener('docscalar:canvas-limit-modal-open', handleCanvasLimitOpen);
    };
  }, []);

  // Live ticking 1-second timer when modal is open and mode is canvas_free_limit
  useEffect(() => {
    if (!modalState.isOpen || modalState.mode !== 'canvas_free_limit' || !modalState.resetTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, modalState.resetTime - now);
      setModalState((prev) => ({
        ...prev,
        remainingMs: diff,
      }));
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [modalState.isOpen, modalState.mode, modalState.resetTime]);

  // Handle ESC key press
  useEffect(() => {
    if (!modalState.isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalState((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen]);

  if (!modalState.isOpen || typeof document === 'undefined') return null;

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSignUp = () => {
    handleClose();
    navigate('/signup', { state: { from: location } });
  };

  const handleLogin = () => {
    handleClose();
    navigate('/login', { state: { from: location } });
  };

  const handlePricing = () => {
    handleClose();
    navigate('/pricing');
  };

  const isCanvasFreeLimit = modalState.mode === 'canvas_free_limit';
  const isCanvasGuest = modalState.mode === 'canvas_guest';

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-limit-modal-title"
    >
      <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-[var(--text-primary)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center gap-2 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCanvasFreeLimit || isCanvasGuest
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          }`}>
            <span className="material-symbols-outlined text-[26px]">
              {isCanvasFreeLimit ? 'timer' : (isCanvasGuest ? 'hub' : 'lock_clock')}
            </span>
          </div>

          <h2 id="guest-limit-modal-title" className="text-lg font-bold">
            {isCanvasFreeLimit && 'Daily Canvas Credit Limit Reached'}
            {isCanvasGuest && 'Sign Up to Unlock 10 Free Canvas Credits'}
            {!isCanvasFreeLimit && !isCanvasGuest && 'Daily Guest Limit Reached'}
          </h2>

          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider font-label-mono">
            {isCanvasFreeLimit && `${modalState.used} of ${modalState.limit} Free Daily Credits Used`}
            {isCanvasGuest && 'Canvas Beta · 10 Free Daily Credits Available'}
            {!isCanvasFreeLimit && !isCanvasGuest && `${modalState.used} of ${modalState.limit} Free Operations Used Today`}
          </span>

          {/* Live 24-Hour Countdown Timer Box */}
          {isCanvasFreeLimit && (
            <div className="w-full mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">timer</span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  24-Hour Timer (Credits Reset In):
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatRemainingTime(modalState.remainingMs)}
              </span>
            </div>
          )}

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2 max-w-sm">
            {isCanvasFreeLimit && (
              <>
                You have used your 10 free Stitch Canvas credits for this 24-hour cycle. Your 24-hour countdown began when your first credit was used and will automatically replenish once the timer completes. Upgrade to DocScalar Pro for unlimited canvas credits and high-speed processing.
              </>
            )}
            {isCanvasGuest && (
              <>
                Stitch Canvas is a visual workspace studio. Create a free DocScalar account to receive 10 daily canvas credits for workflows, node pipelines, and AI prompt executions.
              </>
            )}
            {!isCanvasFreeLimit && !isCanvasGuest && (
              <>
                Guest mode provides instant document processing up to 10 MB per file (3 free operations per day). You have reached your guest quota for today. Create a free DocScalar account to enjoy unlimited daily document operations for files up to 15 MB, along with saved workspace drafts and conversion history.
              </>
            )}
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3.5 mb-5 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
            <span>Free Account: <strong>Unlimited daily operations</strong> (up to 15 MB)</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
            <span>All 41 PDF, Office, and Image Tools included</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
            <span>10 Daily Stitch Canvas Credits included</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isCanvasFreeLimit ? (
            <button
              type="button"
              onClick={handlePricing}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
              <span>Upgrade to Pro (Unlimited Credits)</span>
            </button>
          ) : isCanvasGuest ? (
            <button
              type="button"
              onClick={handleSignUp}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Create Free Account (Get 10 Credits)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignUp}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Create Free Account (Unlimited Operations)</span>
            </button>
          )}

          {!isCanvasFreeLimit && (
            <button
              type="button"
              onClick={handleLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>{isCanvasGuest ? 'Log In' : 'Sign In to Existing Account'}</span>
            </button>
          )}
        </div>

        {/* Pro Plan Upsell Footer */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-center">
          <button
            type="button"
            onClick={handlePricing}
            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--color-primary)] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Need high-volume 1 GB batch processing or GPU OCR?</span>
            <span className="font-bold underline">Explore Pro →</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
