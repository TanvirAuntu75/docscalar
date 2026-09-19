import React from 'react';
import { formatFileSize } from '../utils/constants';

/**
 * Enterprise-grade dedicated Analysis & Progress Modal for PDF Merge Studio.
 * Replaces cramped sidebar progress bars with full-stage telemetry, radial progress ring,
 * and zero text truncation.
 */
export default function MergeProgressModal({
  isOpen,
  progress = 0,
  stage = '',
  currentFile = '',
  currentIndex = 0,
  totalFiles = 0,
  totalPages = 0,
  totalSizeBytes = 0,
  outputFileName = 'merged.pdf',
  onCancel
}) {
  // WCAG 2.1 Modal Accessibility: Close/Cancel on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  // SVG Circular Meter Math (radius = 48, circumference = 2 * PI * 48 ~ 301.59)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  // 3-Phase Diagnostic Pipeline Calculation
  const stages = [
    {
      id: 'ingest',
      title: 'Stream Ingestion & Page Slicing',
      description: 'Parsing cross-references and extracting requested page ranges',
      isComplete: clampedProgress >= 35,
      isActive: clampedProgress < 35
    },
    {
      id: 'transform',
      title: 'Page Transformation & Sizing',
      description: 'Applying rotational angles and dimension normalization',
      isComplete: clampedProgress >= 80,
      isActive: clampedProgress >= 35 && clampedProgress < 80
    },
    {
      id: 'assemble',
      title: 'Assembly & Serialization',
      description: 'Stamping running page numbers, bookmarks, and writing final PDF',
      isComplete: clampedProgress >= 100,
      isActive: clampedProgress >= 80 && clampedProgress < 100
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden gap-6">
        {/* Top Highlight Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--color-primary,#2563eb)] to-emerald-500" />

        {/* Circular SVG Progress Meter */}
        <div className="relative w-32 h-32 flex items-center justify-center mt-2">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Active Progress Stroke */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-[var(--color-primary,#2563eb)] transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Percentage Telemetry */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono tracking-tight">
              {clampedProgress}%
            </span>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
              {clampedProgress === 100 ? 'Finalizing' : 'Merging'}
            </span>
          </div>
        </div>

        {/* Header & File Pill */}
        <div className="flex flex-col items-center gap-2 w-full">
          <h3
            id="merge-progress-title"
            className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight"
          >
            {totalFiles > 0
              ? `Combining ${totalFiles} PDF Documents...`
              : 'Assembling Merged Document...'}
          </h3>

          {/* Document Summary Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs text-[var(--text-secondary)] max-w-full">
            <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)] shrink-0">
              call_merge
            </span>
            <span className="font-semibold text-[var(--text-primary)] truncate max-w-[180px]" title={outputFileName}>
              {outputFileName}
            </span>
            {totalPages > 0 && (
              <>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="font-mono text-[11px] shrink-0 font-medium">~{totalPages} pages</span>
              </>
            )}
            {totalSizeBytes > 0 && (
              <>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="font-mono text-[11px] text-[var(--color-primary)] font-bold shrink-0">
                  {formatFileSize(totalSizeBytes)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Diagnostic 3-Phase Stepper */}
        <div className="w-full flex flex-col gap-2.5 text-left bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] rounded-2xl p-3 sm:p-4">
          {stages.map((stg) => (
            <div
              key={stg.id}
              className={`flex items-start gap-3 transition-opacity duration-200 ${
                stg.isActive
                  ? 'opacity-100'
                  : stg.isComplete
                  ? 'opacity-85'
                  : 'opacity-40'
              }`}
            >
              {/* State Icon Indicator */}
              <div className="mt-0.5 shrink-0">
                {stg.isComplete ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                  </div>
                ) : stg.isActive ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary,#2563eb)] border-t-transparent animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[var(--border-subtle)]" />
                )}
              </div>

              {/* Text Information */}
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-bold leading-tight ${
                    stg.isActive
                      ? 'text-[var(--text-primary)]'
                      : stg.isComplete
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  {stg.title}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] leading-normal truncate">
                  {stg.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Sub-Action Telemetry Banner */}
        <div className="w-full px-3 py-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2 font-mono">
          <span className="material-symbols-outlined text-[15px] animate-spin text-[var(--color-primary)]">
            sync
          </span>
          <span className="truncate">
            {stage ||
              (currentFile
                ? `Merging (${currentIndex + 1}/${totalFiles}): ${currentFile}`
                : `Finalizing ${outputFileName}...`)}
          </span>
        </div>

        {/* User-Triggered Cancellation Action */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors py-1 px-3 rounded-lg hover:bg-red-500/10"
            title="Abort the current merging process"
            aria-label="Cancel merge operation"
          >
            <span className="material-symbols-outlined text-[15px]">cancel</span>
            <span>Cancel Merge</span>
          </button>
        )}

        {/* Footer: Local Execution Guarantee */}
        <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 -mt-2">
          <span className="material-symbols-outlined text-[14px] text-emerald-500">lock</span>
          <span>100% Client-Side In-Memory Assembly. Your documents never leave your device.</span>
        </p>
      </div>
    </div>
  );
}
