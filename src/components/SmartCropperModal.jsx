import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getSmartCropPreference,
  setSmartCropPreference,
  resetSmartCropPreference
} from '../utils/smartCropperStorage';

const EMPTY_ITEMS = Object.freeze([]);

/**
 * SmartCropperModal Component
 * 
 * Educational and decision pop-up modal explaining what Smart Cropping does,
 * displaying an interactive visual Before/After demonstration, providing 1-click
 * action choices, and persisting "Don't show this again" / "Remember choice" settings.
 * 
 * When in Info Only mode (isInfoOnly=true or when the user previously enabled "Remember me"),
 * it acts as a pure educational information sheet: hiding decision buttons, hide the remember
 * checkbox, and offering a clean "Got it" close button with zero side-effects.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {function} props.onClose - Modal close handler
 * @param {function} [props.onApply] - Callback when user accepts Smart Cropping
 * @param {function} [props.onSkip] - Callback when user rejects Smart Cropping / keeps original
 * @param {number} [props.detectedCount=0] - Number of documents or pages with detected borders
 * @param {string[]|string} [props.detectedFiles=[]] - Names or summary of afflicted files
 * @param {number} [props.currentMargin=0] - Active clean margin in points
 * @param {function} [props.onMarginChange] - Margin adjustment callback
 * @param {boolean} [props.isInfoOnly=false] - When true, renders pure informational content without decision CTAs
 */
export function SmartCropperModal({
  isOpen,
  onClose,
  onApply,
  onSkip,
  detectedCount = 0,
  detectedFiles = EMPTY_ITEMS,
  currentMargin = 0,
  onMarginChange,
  items = EMPTY_ITEMS,
  initialScope = 'detected',
  initialPageScope = 'all',
  initialCustomRange = '',
  isInfoOnly = false
}) {
  const [prefState, setPrefState] = useState(() => getSmartCropPreference());
  const [rememberChoice, setRememberChoice] = useState(true);
  const [selectedMargin, setSelectedMargin] = useState(currentMargin);
  const [targetScope, setTargetScope] = useState(initialScope);
  const [pageScope, setPageScope] = useState(initialPageScope);
  const [customRange, setCustomRange] = useState(initialCustomRange);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [decisionRevealed, setDecisionRevealed] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(null);

  const prevIsOpenRef = useRef(false);

  // Auto-detect Info Only mode: if explicitly passed or if user already saved "Remember me", unless user actively wants to decide
  const effectiveInfoOnly = Boolean(isInfoOnly || prefState.dontShowAgain) && !decisionRevealed;

  // Sync state on open (rising edge: false -> true only)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = Boolean(isOpen);

    if (isOpen && !wasOpen) {
      const pref = getSmartCropPreference();
      setPrefState(pref);
      setDecisionRevealed(false);
      setResetFeedback(null);
      const effScope = initialScope || pref.targetScope || 'detected';
      const effPageScope = initialPageScope || pref.pageScope || 'all';
      const effRange = initialCustomRange || pref.customRange || '';
      const effMargin = typeof currentMargin === 'number'
        ? currentMargin
        : (typeof pref.cleanMargin === 'number' ? pref.cleanMargin : 0);

      setRememberChoice(pref.timestamp !== null ? Boolean(pref.dontShowAgain) : true);
      setSelectedMargin(effMargin);
      setTargetScope(effScope);
      setPageScope(effPageScope);
      setCustomRange(effRange);

      const safeItems = Array.isArray(items) ? items : [];
      if (safeItems.length > 0) {
        if (effScope === 'all') {
          setSelectedFileIds(safeItems.map((it) => it.id));
        } else {
          const detected = safeItems.filter((it) => it.hasScanBorders || it.cropEnabled).map((it) => it.id);
          setSelectedFileIds(detected.length > 0 ? detected : safeItems.map((it) => it.id));
        }
      }
    }
  }, [isOpen, currentMargin, initialScope, initialPageScope, initialCustomRange, items]);

  const handleResetChoice = () => {
    resetSmartCropPreference();
    const fresh = getSmartCropPreference();
    setPrefState(fresh);
    setRememberChoice(false);
    setResetFeedback('Saved choice reset! You can choose an action below or dismiss to decide on next upload.');
    setDecisionRevealed(true);
  };

  const handleChooseNow = () => {
    setResetFeedback(null);
    setDecisionRevealed(true);
  };

  const handleDismiss = () => {
    if (onClose) onClose();
  };

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (rememberChoice) {
      setSmartCropPreference({
        dontShowAgain: true,
        rememberChoice: 'apply',
        cleanMargin: selectedMargin,
        targetScope,
        pageScope,
        customRange
      });
    }
    if (onMarginChange && selectedMargin !== currentMargin) {
      onMarginChange(selectedMargin);
    }
    if (onApply) {
      onApply({
        margin: selectedMargin,
        targetScope,
        pageScope,
        customRange,
        selectedFileIds,
        rememberChoice
      });
    }
    if (onClose) onClose();
  };

  const handleSkip = () => {
    if (rememberChoice) {
      setSmartCropPreference({ dontShowAgain: true, rememberChoice: 'skip' });
    }
    if (onSkip) onSkip();
    if (onClose) onClose();
  };

  const fileList = Array.isArray(detectedFiles)
    ? detectedFiles
    : (detectedFiles ? [detectedFiles] : []);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-cropper-modal-title"
      className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="max-w-xl w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-[scaleIn_0.18s_ease-out]">
        
        {/* ── Modal Header ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">auto_fix_high</span>
            </div>
            <div>
              <h3 id="smart-cropper-modal-title" className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                {effectiveInfoOnly ? 'What does Smart Cropping do?' : (detectedCount > 0 ? 'Smart Crop: Scan Borders Detected' : 'Smart Cropping')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {effectiveInfoOnly
                  ? 'Optical scan shadow removal & restoring original dimensions'
                  : (detectedCount > 0
                      ? 'Dark photocopy border shadows detected. Choose how to apply cropping.'
                      : 'Choose whether to apply Smart Cropping or keep original document dimensions.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Contextual Detection Banner (if borders detected and in decision mode) ────── */}
        {detectedCount > 0 && !effectiveInfoOnly && (
          <div className="px-4 sm:px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">
                warning
              </span>
              <span className="font-semibold truncate">
                Scan borders detected in {detectedCount} {detectedCount === 1 ? 'document' : 'documents'}
                {fileList.length > 0 && (
                  <span className="font-mono font-normal ml-1.5 opacity-90">
                    : {fileList.slice(0, 2).join(', ')}{fileList.length > 2 ? ` (+${fileList.length - 2} more)` : ''}
                  </span>
                )}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              Photocopy Noise
            </span>
          </div>
        )}

        {/* ── Scrollable Body ──────────────────────────────────────── */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          
          {/* Visual Before & After Demonstration */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Visual Demonstration
            </span>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)]">
              
              {/* Card 1: BEFORE (Raw Scan with Shadows) */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-full aspect-[3/4] max-w-[170px] bg-[#f4ede4] rounded-lg shadow-sm overflow-hidden flex flex-col justify-between p-2.5 border border-black/10">
                  {/* Simulated Dark Scanner Border Overlays */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-slate-900/85" />
                  <div className="absolute bottom-0 left-0 right-0 h-3.5 bg-slate-950" />
                  <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-slate-900/90" />
                  <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-slate-800/75" />
                  {/* Tilted Photocopy Lid Shadow Gradient */}
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-tl from-black/80 via-black/30 to-transparent" />

                  {/* Dummy Document Text Lines */}
                  <div className="flex flex-col gap-1.5 z-10 w-full pt-1.5 px-1 opacity-70">
                    <div className="h-1.5 bg-slate-800 rounded-sm w-3/4" />
                    <div className="h-1 bg-slate-600 rounded-sm w-full" />
                    <div className="h-1 bg-slate-600 rounded-sm w-5/6" />
                    <div className="h-1 bg-slate-600 rounded-sm w-4/5" />
                    <div className="h-1 bg-slate-600 rounded-sm w-full mt-2" />
                    <div className="h-1 bg-slate-600 rounded-sm w-2/3" />
                  </div>

                  <div className="z-10 text-[8px] font-bold text-slate-700 uppercase tracking-tighter text-center">
                    Original Scan
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 text-center">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span>Dark Scanner Borders</span>
                </div>
              </div>

              {/* Card 2: AFTER (Smart Cropped & Centered) */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-full aspect-[3/4] max-w-[170px] bg-white dark:bg-slate-50 rounded-lg shadow-md overflow-hidden flex flex-col justify-between p-3.5 border-2 border-emerald-500/40">
                  {/* Clean Page Boundary Guides */}
                  <div className="absolute inset-2 border border-dashed border-emerald-500/25 rounded pointer-events-none" />

                  {/* Clean Centered Document Text Lines */}
                  <div className="flex flex-col gap-1.5 z-10 w-full pt-0.5 opacity-90">
                    <div className="h-1.5 bg-slate-900 rounded-sm w-3/4" />
                    <div className="h-1 bg-slate-700 rounded-sm w-full" />
                    <div className="h-1 bg-slate-700 rounded-sm w-5/6" />
                    <div className="h-1 bg-slate-700 rounded-sm w-4/5" />
                    <div className="h-1 bg-slate-700 rounded-sm w-full mt-2" />
                    <div className="h-1 bg-slate-700 rounded-sm w-2/3" />
                  </div>

                  <div className="z-10 text-[8px] font-bold text-emerald-700 uppercase tracking-tighter text-center bg-emerald-50 rounded py-0.5 border border-emerald-200">
                    Original Dimensions Restored
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-center">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Excised & Centered</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Core Invariants List */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Core Capabilities
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="material-symbols-outlined text-[16px]">crop</span>
                  <span>Shadow Removal</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Removes scanner bed shadows, dark photocopy edges, and crooked lid gradients.
                </p>
              </div>

              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="material-symbols-outlined text-[16px]">fit_screen</span>
                  <span>Uniform Framing</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Centers page contents and frames them with clean, standardized white margins.
                </p>
              </div>

              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>100% Lossless</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Never rasterizes vector text, forms, or downsamples embedded photos.
                </p>
              </div>
            </div>
          </div>

          {/* ── Multi-Document Selection (When multiple files present & in decision mode) ── */}
          {!effectiveInfoOnly && items && items.length > 1 && (
            <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Apply Smart Crop To
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedFileIds.length} of {items.length} Files Selected
                </span>
              </div>

              {/* Quick Scope Buttons: Crop All vs Selected Files vs Detected Only */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('all');
                    setSelectedFileIds(items.map((it) => it.id));
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                    targetScope === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                  title="Crop all uploaded documents uniformly"
                >
                  Crop All ({items.length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('selected');
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                    targetScope === 'selected'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                  title="Select specific documents to crop below"
                >
                  Selected ({selectedFileIds.length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetScope('detected');
                    const detected = items.filter((it) => it.hasScanBorders).map((it) => it.id);
                    setSelectedFileIds(detected.length > 0 ? detected : items.map((it) => it.id));
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                    targetScope === 'detected'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                  title="Crop only documents with detected black scan borders"
                >
                  Detected ({detectedCount || items.filter((it) => it.hasScanBorders).length})
                </button>
              </div>

              {/* Quick Select All / Deselect All Controls */}
              <div className="flex items-center justify-between text-[11px] px-1 text-[var(--text-secondary)]">
                <span>Select documents to crop:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileIds(items.map((it) => it.id));
                      setTargetScope('all');
                    }}
                    className="text-emerald-600 hover:text-emerald-500 font-semibold cursor-pointer underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileIds([]);
                      setTargetScope('selected');
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold cursor-pointer underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Document Checklist */}
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                {items.map((item, idx) => {
                  const isChecked = selectedFileIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setTargetScope('selected');
                            if (e.target.checked) {
                              setSelectedFileIds((prev) => [...prev, item.id]);
                            } else {
                              setSelectedFileIds((prev) => prev.filter((id) => id !== item.id));
                            }
                          }}
                          className="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate" title={item.file?.name || item.name}>
                            #{idx + 1} {item.file?.name || item.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        </div>
                      </div>

                      {item.hasScanBorders ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                          Borders Detected
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/15 text-[var(--text-secondary)] shrink-0">
                          Clean Digital
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Crop Pages Scope (Decision Mode Only) ── */}
          {!effectiveInfoOnly && (
            <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Crop Pages
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                {pageScope} {pageScope === 'custom' && customRange ? `(${customRange})` : ''}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'all', label: 'All Pages' },
                { id: 'odd', label: 'Odd Only' },
                { id: 'even', label: 'Even Only' },
                { id: 'custom', label: 'Custom' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPageScope(opt.id)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                    pageScope === opt.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pageScope === 'custom' && (
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g. 1-5, 8 or 1, 3, 5"
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-xl text-[var(--text-primary)] outline-none font-mono"
              />
            )}
          </div>
        )}

          {/* Zero Inset Distortion - Full Original Dimensions Restored */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950 dark:text-emerald-100">
            <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              aspect_ratio
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300">
                Full Original Dimensions Restored
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Scanner shadows and photocopy dark borders are excised cleanly without synthetic margins, restoring the genuine document content back to its full original dimensions.
              </p>
            </div>
          </div>
        </div>

        {/* ── Modal Footer: Info Mode (Got it) vs Decision Mode (Apply / Skip) ─────── */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 flex flex-col gap-3">
          {effectiveInfoOnly ? (
            <>
              {/* Preference Status Card with Always-Available Reset / Choose Option */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${prefState.dontShowAgain ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {prefState.dontShowAgain ? 'check_circle' : 'tune'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                      Saved Preference
                    </span>
                    <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {prefState.dontShowAgain ? (
                        prefState.rememberChoice === 'apply' ? 'Auto-Apply Smart Cropping' : 'Keep Original (No Crop)'
                      ) : (
                        'Ask every time (No auto-choice saved)'
                      )}
                    </span>
                  </div>
                </div>

                {prefState.dontShowAgain ? (
                  <button
                    type="button"
                    onClick={handleResetChoice}
                    className="py-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1 shadow-2xs"
                    title="Clear saved choice and reveal decision buttons"
                  >
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    <span>Reset Choice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleChooseNow}
                    className="py-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1 shadow-2xs"
                    title="Choose a Smart Cropping action now"
                  >
                    <span className="material-symbols-outlined text-[14px]">checklist</span>
                    <span>Choose Now</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Got it</span>
              </button>
            </>
          ) : (
            <>
              {/* Reset Feedback Notification if user just clicked Reset Choice */}
              {resetFeedback && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-100 animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0">check_circle</span>
                    <span className="leading-snug">{resetFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetFeedback(null)}
                    className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              {/* Choose Now guidance prompt if decision mode was revealed without reset feedback */}
              {decisionRevealed && !resetFeedback && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950 dark:text-emerald-100 animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0">checklist</span>
                    <span className="leading-snug">Choose an action below. Toggle &quot;Remember my choice&quot; to automate future uploads.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDecisionRevealed(false)}
                    className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs p-1 cursor-pointer shrink-0"
                    title="Back to information"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              {/* Remember Choice Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={(e) => setRememberChoice(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                    Remember my choice and don't show this again
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    You can reopen this dialog anytime via the Smart Crop (?) help icon.
                  </span>
                </div>
              </label>

              {/* Action CTAs (Strict Single-Line No-Wrap) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2.5 px-4 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all text-center whitespace-nowrap shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Keep Original (No Crop)</span>
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                  <span>Apply Smart Cropping</span>
                </button>
              </div>

              {/* Back to information link if user revealed decision mode */}
              {decisionRevealed && (
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionRevealed(false);
                      setResetFeedback(null);
                    }}
                    className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    <span>Back to Information</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

export default SmartCropperModal;
