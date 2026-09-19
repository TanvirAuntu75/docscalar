import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DPI_PRESETS, normalizeDpi } from '../hooks/useDpiQuality';

/**
 * DpiQualitySelector Component
 * Universal enhanced quality / DPI selector for DocScalar studio toolbars and option panels.
 * Renders via React Portal to document.body in button mode to guarantee zero clipping
 * from parent overflow containers.
 * 
 * @param {object} props
 * @param {number} props.dpi - Currently selected DPI
 * @param {(dpi: number) => void} props.onChange - Selection callback
 * @param {'left'|'right'} [props.align='right'] - Popover alignment
 * @param {'up'|'down'} [props.dropDirection='down'] - Popover drop direction
 * @param {string} [props.className=''] - Additional styling classes
 * @param {'button'|'segmented'} [props.mode='button'] - Rendering presentation mode
 * @param {boolean} [props.compact=false] - Compact rendering for mobile / tight spaces
 */
export function DpiQualitySelector({
  dpi,
  onChange,
  align = 'right',
  dropDirection = 'down',
  className = '',
  mode = 'button',
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const activeDpi = normalizeDpi(dpi);
  const activePreset = DPI_PRESETS.find(p => p.dpi === activeDpi) || DPI_PRESETS[1];

  const updateCoords = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 288; // 18rem = 288px
    const popoverHeight = 310;
    const padding = 8;

    let top = dropDirection === 'up'
      ? rect.top - popoverHeight - 6
      : rect.bottom + 6;

    // Viewport vertical clamping & auto-flip
    if (dropDirection !== 'up' && top + popoverHeight > window.innerHeight - padding) {
      if (rect.top > popoverHeight + padding) {
        top = rect.top - popoverHeight - 6;
      } else {
        top = Math.max(padding, window.innerHeight - popoverHeight - padding);
      }
    } else if (dropDirection === 'up' && top < padding) {
      top = rect.bottom + 6;
    }

    let left = align === 'right'
      ? rect.right - popoverWidth
      : rect.left;

    // Viewport horizontal clamping
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setCoords({ top, left });
  }, [align, dropDirection]);

  // Close dropdown on outside click or Escape key, and update coordinates on resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleOutsideClick = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  const handleSelect = (newDpi) => {
    onChange?.(newDpi);
    setIsOpen(false);
  };

  // ── Segmented Pill Mode (e.g. for Sidebar options panels) ───────────────
  if (mode === 'segmented') {
    return (
      <div className={`flex items-center p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] ${className}`}>
        {DPI_PRESETS.map((preset) => {
          const isSelected = preset.dpi === activeDpi;
          return (
            <button
              key={preset.dpi}
              type="button"
              onClick={() => handleSelect(preset.dpi)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                isSelected
                  ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
              }`}
              title={`${preset.title} (${preset.dpi} DPI): ${preset.desc}`}
            >
              <span className="text-[11px] leading-none">{preset.label}</span>
              <span className={`text-[9px] leading-none opacity-80 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                {preset.badge}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Standard Toolbar Button & Popover Mode ──────────────────────────────
  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-xs select-none ${
          isOpen
            ? 'bg-[var(--bg-primary)] border-[var(--color-primary)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
            : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/40'
        }`}
        title={`Render Quality: ${activePreset.label} (${activePreset.title}) — Click to change DPI`}
      >
        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)] shrink-0">
          {activePreset.icon || 'high_density'}
        </span>
        
        {!compact && (
          <span className="text-[11px] font-medium text-[var(--text-secondary)] hidden 2xl:inline">
            Quality:
          </span>
        )}

        <span className="text-[11px] font-bold text-[var(--text-primary)] whitespace-nowrap">
          {activePreset.label}
        </span>

        {!compact && (
          <span className="text-[9px] font-semibold px-1 py-0.2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded uppercase tracking-wider hidden 2xl:inline">
            {activePreset.badge}
          </span>
        )}

        <span className={`material-symbols-outlined text-[14px] text-[var(--text-secondary)] transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Floating Popover Menu via Portal to document.body */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '18rem',
            zIndex: 99999
          }}
          className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden animate-[scaleIn_0.15s_ease-out] backdrop-blur-md"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[var(--bg-secondary)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">
                tune
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Render & Export Quality
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              DPI Multiplier
            </span>
          </div>

          {/* Preset Options */}
          <div className="p-1.5 space-y-1">
            {DPI_PRESETS.map((preset) => {
              const isSelected = preset.dpi === activeDpi;
              return (
                <button
                  key={preset.dpi}
                  type="button"
                  onClick={() => handleSelect(preset.dpi)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--text-primary)]'
                      : 'hover:bg-[var(--bg-secondary)] border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {/* Left Icon or Check */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  }`}>
                    <span className="material-symbols-outlined text-[13px]">
                      {isSelected ? 'check' : preset.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--text-primary)]'}`}>
                        {preset.label} — {preset.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>

                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                      {preset.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-[var(--color-primary)]">
              info
            </span>
            <span>Higher DPI increases subpixel clarity on screen and in exports.</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DpiQualitySelector;
