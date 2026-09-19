import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SmartCropperModal from './SmartCropperModal';
import {
  shouldAutoShowSmartCropModal,
  getSmartCropPreference,
  setSmartCropPreference
} from '../utils/smartCropperStorage';

/**
 * SmartCropperToolbarButton Component
 * 
 * Reusable top toolbar action button for the Universal Smart Cropper.
 * Provides high-visibility detection alert, 1-click border cleaning,
 * active status indication with margin readout, quick revert,
 * and an animated dropdown options popover for Scope (All vs Detected),
 * Page Range (All, Odd, Even, Custom Range), and Margin Presets.
 * 
 * @param {object} props
 * @param {object} props.cropper - Hook return object from useSmartCropper
 * @param {function} [props.onOpenInfo] - Modal info trigger callback
 * @param {string} [props.className=''] - Optional styling override
 * @param {string|null} [props.badge=null] - Ratio badge (e.g. "4/5")
 * @param {object|null} [props.options=null] - Interactive dropdown options object
 */
export function SmartCropperToolbarButton({
  cropper,
  onOpenInfo,
  className = '',
  badge = null,
  options = null
}) {
  if (!cropper) return null;

  const {
    hasDetectedBorders,
    isActive,
    isInvertedDocument,
    detectionReason,
    cleanMargin = 0,
    activate,
    revert
  } = cropper;

  const [isOpen, setIsOpen] = useState(false);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [internalInfoOnly, setInternalInfoOnly] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [customRangeDraft, setCustomRangeDraft] = useState('');
  const [rememberChoice, setRememberChoice] = useState(false);

  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  // Sync draft and preferences when popover opens
  useEffect(() => {
    if (isOpen) {
      const pref = getSmartCropPreference();
      setRememberChoice(Boolean(pref.dontShowAgain));
      if (options?.customRange) {
        setCustomRangeDraft(options.customRange);
      }
    }
  }, [isOpen, options?.customRange]);

  const updateCoords = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 360;
    const padding = 8;

    let top = rect.bottom + 6;
    // Auto-flip if overflowing bottom
    if (top + popoverHeight > window.innerHeight - padding) {
      if (rect.top > popoverHeight + padding) {
        top = rect.top - popoverHeight - 6;
      } else {
        top = Math.max(padding, window.innerHeight - popoverHeight - padding);
      }
    }

    let left = rect.left;
    // Horizontal clamping
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setCoords({ top, left });
  }, []);

  // Listen for outside clicks, resize, scroll, and escape
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResizeOrScroll = () => {
      updateCoords();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, updateCoords]);

  const handleInfoClick = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    setInternalInfoOnly(true);
    if (onOpenInfo) {
      onOpenInfo(true);
    } else if (typeof cropper?.onOpenInfo === 'function') {
      cropper.onOpenInfo(true);
    } else {
      setInternalModalOpen(true);
    }
  };

  const hasInfoHandler = true;

  const isInfoModalOpen = !onOpenInfo && Boolean(cropper?.showInfoModal || internalModalOpen);

  const handleCloseModal = () => {
    if (typeof cropper?.closeInfoModal === 'function') {
      cropper.closeInfoModal();
    } else if (typeof cropper?.setShowInfoModal === 'function') {
      cropper.setShowInfoModal(false);
    }
    setInternalModalOpen(false);
    setInternalInfoOnly(false);
  };

  const handleApplyModal = (modalResult) => {
    const margin = typeof modalResult?.margin === 'number' ? modalResult.margin : 0;
    if (typeof cropper?.setCleanMargin === 'function') {
      cropper.setCleanMargin(margin);
    }
    if (typeof cropper?.setScopeMode === 'function' && modalResult?.pageScope) {
      cropper.setScopeMode(modalResult.pageScope);
    }
    if (typeof cropper?.setPageRange === 'function' && modalResult?.customRange !== undefined) {
      cropper.setPageRange(modalResult.customRange);
    }
    if (typeof cropper?.activate === 'function') {
      cropper.activate();
    }
    if (options?.onMarginChange) options.onMarginChange(margin);
    if (options?.onScopeChange && modalResult?.targetScope) options.onScopeChange(modalResult.targetScope);
    if (options?.onPageScopeChange && modalResult?.pageScope) options.onPageScopeChange(modalResult.pageScope);
    if (options?.onCustomRangeChange && modalResult?.customRange !== undefined) options.onCustomRangeChange(modalResult.customRange);
    handleCloseModal();
  };

  const handleSkipModal = () => {
    if (typeof cropper?.revert === 'function') {
      cropper.revert();
    }
    handleCloseModal();
  };

  const renderInfoModal = () => {
    if (!isInfoModalOpen) return null;

    const isInfoOnly = internalInfoOnly || Boolean(cropper?.isInfoOnlyModal);

    return (
      <SmartCropperModal
        isOpen={isInfoModalOpen}
        isInfoOnly={isInfoOnly}
        onClose={handleCloseModal}
        onApply={handleApplyModal}
        onSkip={handleSkipModal}
        detectedCount={options?.detectedCount !== undefined ? options.detectedCount : (hasDetectedBorders ? 1 : 0)}
        detectedFiles={options?.detectedFiles || []}
        currentMargin={typeof cropper?.cleanMargin === 'number' ? cropper.cleanMargin : (typeof options?.margin === 'number' ? options.margin : 0)}
        onMarginChange={(m) => {
          if (typeof cropper?.setCleanMargin === 'function') cropper.setCleanMargin(m);
          if (options?.onMarginChange) options.onMarginChange(m);
        }}
        initialScope={options?.targetScope || 'detected'}
        initialPageScope={cropper?.scopeMode || options?.pageScope || 'all'}
        initialCustomRange={cropper?.pageRange || options?.customRange || ''}
      />
    );
  };

  const handleActivateClick = (e) => {
    setInternalInfoOnly(false);
    if (shouldAutoShowSmartCropModal()) {
      if (typeof cropper?.onOpenInfo === 'function') {
        cropper.onOpenInfo(false);
      } else {
        setInternalModalOpen(true);
      }
    } else {
      activate();
    }
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleRememberToggle = (checked) => {
    setRememberChoice(checked);
    const pref = getSmartCropPreference();
    setSmartCropPreference({
      ...pref,
      dontShowAgain: checked,
      rememberChoice: checked ? 'apply' : null,
      targetScope: options?.targetScope || pref.targetScope,
      pageScope: options?.pageScope || pref.pageScope,
      customRange: options?.customRange || pref.customRange,
      cleanMargin: options?.margin || pref.cleanMargin
    });
  };

  // ── Render Dropdown Popover ──────────────────────────────────────────────
  const renderDropdownPopover = () => {
    if (!isOpen || typeof document === 'undefined' || !options) return null;

    const {
      targetScope = 'all',
      onScopeChange,
      pageScope = 'all',
      onPageScopeChange,
      onCustomRangeChange,
      margin = 0,
      onMarginChange,
      itemCount = 0,
      detectedCount = 0,
      croppedCount = 0
    } = options;

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 99999
        }}
        className="w-80 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-2xl shadow-2xl p-3.5 flex flex-col gap-3 backdrop-blur-xl dropdown-fade-in text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span className="material-symbols-outlined text-[17px] text-emerald-500">auto_fix_high</span>
            <span>Smart Crop Options</span>
            {itemCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {croppedCount}/{itemCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasInfoHandler && (
              <button
                type="button"
                onClick={handleInfoClick}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="What does Smart Cropping do?"
              >
                <span className="material-symbols-outlined text-[14px]">help</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              title="Close options"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        </div>

        {/* Section 1: Apply to Documents */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <span>Apply To Documents</span>
            <span className="text-emerald-500 font-semibold capitalize">{targetScope}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                if (onScopeChange) onScopeChange('all');
              }}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetScope === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              <span>All ({itemCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onScopeChange) onScopeChange('detected');
              }}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetScope === 'detected'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">document_scanner</span>
              <span>Detected ({detectedCount})</span>
            </button>
          </div>
        </div>

        {/* Section 2: Apply to Pages (All, Odd, Even, Range) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <span>Apply To Pages</span>
            <span className="text-emerald-500 font-semibold uppercase">{pageScope}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
            {[
              { id: 'all', label: 'All' },
              { id: 'odd', label: 'Odd' },
              { id: 'even', label: 'Even' },
              { id: 'custom', label: 'Range' }
            ].map((ps) => {
              const isSelected = pageScope === ps.id;
              return (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => {
                    if (onPageScopeChange) onPageScopeChange(ps.id);
                  }}
                  className={`py-1 px-1 text-[11px] font-semibold rounded-lg transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {ps.label}
                </button>
              );
            })}
          </div>

          {/* Animated Custom Range Input */}
          {pageScope === 'custom' && (
            <div className="mt-1 flex flex-col gap-1.5 p-2 bg-[var(--bg-secondary)] rounded-xl border border-emerald-500/30 dropdown-fade-in">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                <span className="font-semibold">Enter Page Range</span>
                <span className="text-[9px] opacity-75">e.g. 1-5, 8</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customRangeDraft}
                  onChange={(e) => setCustomRangeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onCustomRangeChange) {
                      onCustomRangeChange(customRangeDraft.trim());
                    }
                  }}
                  placeholder="1-5, 8"
                  className="flex-1 px-2.5 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onCustomRangeChange) onCustomRangeChange(customRangeDraft.trim());
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Clean Dimensions Guarantee */}
        <div className="flex flex-col gap-1 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>Original Dimensions Restored</span>
          </div>
          <p className="text-[10.5px] opacity-90 leading-tight">
            Scanner shadows and photocopy dark borders are excised cleanly with zero synthetic margin distortion.
          </p>
        </div>

        {/* Section 4: Persistent Choice Sync (Remember Me) */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => handleRememberToggle(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
            />
            <span className="text-[10.5px]">Remember choices for future uploads</span>
          </label>
          <span className="text-[9px] font-mono text-emerald-500 font-bold">
            Auto Sync
          </span>
        </div>
      </div>,
      document.body
    );
  };

  // ── State 1: Active (Clean borders applied) ──────────────────────────────
  if (isActive) {
    return (
      <>
        <div
          ref={containerRef}
          className={`inline-flex items-center gap-0.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg p-0.5 shadow-xs shrink-0 ${className}`}
        >
          <button
            type="button"
            onClick={() => revert()}
            className="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-all hover:bg-emerald-500/20 rounded cursor-pointer select-none group"
            title="Smart Cropper Active — Click to revert to original"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">
              check_circle
            </span>
            <span className="text-[11px] font-bold whitespace-nowrap">
              Cropped
            </span>
            {badge && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-800 dark:text-emerald-200">
                {badge}
              </span>
            )}
            <span className="material-symbols-outlined text-[13px] opacity-60 group-hover:opacity-100 group-hover:text-red-500 transition-colors">
              undo
            </span>
          </button>

          {options && (
            <button
              type="button"
              onClick={handleToggleDropdown}
              aria-expanded={isOpen}
              className={`p-1 hover:bg-emerald-500/25 rounded text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer ${
                isOpen ? 'bg-emerald-500/30' : ''
              }`}
              title="Smart Crop Options (Scope, Page Range, Margins)"
            >
              <span className="material-symbols-outlined text-[15px]">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}

          {hasInfoHandler && (
            <button
              type="button"
              onClick={handleInfoClick}
              className="p-1 hover:bg-emerald-500/25 rounded text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
              title="What does Smart Cropping do? (Click for info & options)"
            >
              <span className="material-symbols-outlined text-[13px]">help</span>
            </button>
          )}
        </div>
        {renderDropdownPopover()}
        {renderInfoModal()}
      </>
    );
  }

  // ── State 2: Scan borders detected & waiting for user action ──────────────
  if (hasDetectedBorders) {
    return (
      <>
        <div
          ref={containerRef}
          className={`inline-flex items-center gap-0.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/50 rounded-lg p-0.5 shadow-xs transition-colors shrink-0 ${className}`}
        >
          <button
            type="button"
            onClick={handleActivateClick}
            className="px-2 py-0.5 text-xs font-bold text-white hover:bg-emerald-700/80 rounded flex items-center gap-1.5 transition-all cursor-pointer select-none"
            title={`Scan borders detected (${detectionReason || 'scan noise'}) — Click to remove black borders and restore original dimensions`}
          >
            <span className="material-symbols-outlined text-[15px]">
              auto_fix_high
            </span>
            <span className="text-[11px] font-bold whitespace-nowrap">
              Clean Borders
            </span>
            {badge && (
              <span className="text-[9px] font-semibold bg-white/20 px-1 py-0.2 rounded">
                {badge}
              </span>
            )}
          </button>

          {options && (
            <button
              type="button"
              onClick={handleToggleDropdown}
              aria-expanded={isOpen}
              className={`p-1 hover:bg-emerald-800 rounded text-white/90 hover:text-white transition-colors cursor-pointer ${
                isOpen ? 'bg-emerald-800' : ''
              }`}
              title="Smart Crop Options (Scope, Page Range, Margins)"
            >
              <span className="material-symbols-outlined text-[15px]">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}

          {hasInfoHandler && (
            <button
              type="button"
              onClick={handleInfoClick}
              className="p-1 hover:bg-emerald-700 rounded text-white/90 hover:text-white transition-colors cursor-pointer"
              title="What does Smart Cropping do? (Click for info & options)"
            >
              <span className="material-symbols-outlined text-[13px]">help</span>
            </button>
          )}
        </div>
        {renderDropdownPopover()}
        {renderInfoModal()}
      </>
    );
  }

  // ── State 3: Inverted / dark document protected ──────────────────────────
  if (isInvertedDocument) {
    return (
      <>
        <div
          className={`px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1 select-none opacity-85 shrink-0 ${className}`}
          title="Dark/inverted background detected — auto-crop disabled to protect document design"
        >
          <span className="material-symbols-outlined text-[14px] text-amber-500">
            contrast
          </span>
          <span className="text-[11px] font-semibold whitespace-nowrap hidden sm:inline">
            Dark Doc Protected
          </span>
          {hasInfoHandler && (
            <button
              type="button"
              onClick={handleInfoClick}
              className="p-0.5 hover:bg-amber-500/20 rounded text-amber-600 dark:text-amber-400 transition-colors cursor-pointer ml-0.5"
              title="What does Smart Cropping do? (Click for info)"
            >
              <span className="material-symbols-outlined text-[13px]">help</span>
            </button>
          )}
        </div>
        {renderInfoModal()}
      </>
    );
  }

  // ── State 4: Clean document (Border detection clean, manual crop available)
  return (
    <>
      <div
        ref={containerRef}
        className={`inline-flex items-center gap-0.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-emerald-500/40 rounded-lg p-0.5 transition-all shrink-0 ${className}`}
      >
        <button
          type="button"
          onClick={handleActivateClick}
          className="px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded flex items-center gap-1 cursor-pointer select-none"
          title="Smart Cropper — Click to excise black scan borders"
        >
          <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">
            crop
          </span>
          <span className="text-[11px] font-semibold whitespace-nowrap hidden md:inline">
            Smart Crop
          </span>
          {badge && (
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {badge}
            </span>
          )}
        </button>

        {options && (
          <button
            type="button"
            onClick={handleToggleDropdown}
            aria-expanded={isOpen}
            className={`p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${
              isOpen ? 'bg-[var(--bg-tertiary)]' : ''
            }`}
            title="Smart Crop Options (Scope, Page Range, Margins)"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        )}

        {hasInfoHandler && (
          <button
            type="button"
            onClick={handleInfoClick}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="What does Smart Cropping do? (Click for info & demonstration)"
          >
            <span className="material-symbols-outlined text-[13px]">help</span>
          </button>
        )}
      </div>
      {renderDropdownPopover()}
      {renderInfoModal()}
    </>
  );
}

export default SmartCropperToolbarButton;
