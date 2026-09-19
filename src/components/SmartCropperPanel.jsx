/**
 * DocScalar Universal Smart Cropper Panel
 *
 * Self-contained sidebar UI component for the VisionClean™ Universal Smart Cropper.
 * Renders detection status, per-edge controls, margin presets, page scope selector,
 * and action buttons (Clean Borders / Revert to Original).
 *
 * Drop into any studio's sidebar with:
 *   <SmartCropperPanel cropper={cropper} totalPages={totalPages} />
 * where `cropper` is the return value of useSmartCropper().
 */
import React from 'react';
import SmartCropperModal from './SmartCropperModal';
import { shouldAutoShowSmartCropModal } from '../utils/smartCropperStorage';

export default function SmartCropperPanel({ cropper, totalPages = 0, onActivate, onRevert, className = '' }) {
  if (!cropper) return null;

  const {
    hasDetectedBorders,
    isInvertedDocument,
    currentPageDetection,
    detectionReason,
    isActive,
    cleanMargin,
    setCleanMargin,
    enabledEdges,
    toggleEdge,
    scopeMode,
    setScopeMode,
    pageRange,
    setPageRange,
    activate,
    revert
  } = cropper;

  const edgeLabels = { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' };

  const getConfidence = (edge) => {
    const ed = currentPageDetection?.edgeData?.[edge];
    return ed?.confidence ?? 0;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return '#10B981'; // emerald
    if (confidence >= 50) return '#F59E0B'; // amber
    if (confidence > 0) return '#EF4444'; // red
    return '#6B7280'; // gray (no detection)
  };

  const handleActivate = () => {
    if (shouldAutoShowSmartCropModal() && (cropper.onOpenInfo || cropper.setShowInfoModal)) {
      if (cropper.onOpenInfo) cropper.onOpenInfo(false);
      else if (cropper.setShowInfoModal) cropper.setShowInfoModal(true);
      return;
    }
    activate();
    if (onActivate) onActivate();
  };

  const handleRevert = () => {
    revert();
    if (onRevert) onRevert();
  };

  return (
    <div className={`smart-cropper-panel ${className}`}>
      {/* ── Panel Header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '12px', paddingBottom: '10px',
        borderBottom: '1px solid rgba(0,0,0,0.08)'
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: '18px',
          color: isActive ? '#10B981' : hasDetectedBorders ? '#F59E0B' : '#6B7280'
        }}>
          {isActive ? 'check_circle' : hasDetectedBorders ? 'warning' : 'crop'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#1F2937' }}>
          Smart Cropper
        </span>
        {isActive && (
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px',
            borderRadius: '4px', backgroundColor: '#D1FAE5', color: '#065F46',
            marginLeft: 'auto'
          }}>Active</span>
        )}
        {isInvertedDocument && (
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px',
            borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E',
            marginLeft: 'auto'
          }}>Inverted Doc</span>
        )}
        <button
          type="button"
          onClick={() => {
            if (cropper.onOpenInfo) cropper.onOpenInfo(true);
            else if (cropper.setShowInfoModal) cropper.setShowInfoModal(true);
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            color: '#6B7280', display: 'flex', alignItems: 'center',
            marginLeft: (isActive || isInvertedDocument) ? '6px' : 'auto'
          }}
          title="What does Smart Cropping do? (Click for interactive demonstration)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>help</span>
        </button>
      </div>

      {/* ── Inverted Document Warning ────────────────────────── */}
      {isInvertedDocument && (
        <div style={{
          padding: '8px 10px', borderRadius: '6px', fontSize: '12px',
          backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
          color: '#92400E', lineHeight: 1.4, marginBottom: '10px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>info</span>
          This page has a dark or colored background. Auto-crop is disabled to protect the document design.
        </div>
      )}

      {/* ── Detection Status ─────────────────────────────────── */}
      {!isInvertedDocument && (
        <>
          <div style={{
            padding: '8px 10px', borderRadius: '6px', fontSize: '12px',
            backgroundColor: hasDetectedBorders ? (isActive ? '#F0FDF4' : '#FFF7ED') : '#F9FAFB',
            border: `1px solid ${hasDetectedBorders ? (isActive ? '#BBF7D0' : '#FED7AA') : '#E5E7EB'}`,
            color: '#374151', lineHeight: 1.4, marginBottom: '6px'
          }}>
            {detectionReason || 'Upload a PDF to scan for border artifacts.'}
          </div>
          <button
            type="button"
            onClick={() => {
              if (cropper.onOpenInfo) cropper.onOpenInfo(true);
              else if (cropper.setShowInfoModal) cropper.setShowInfoModal(true);
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0',
              color: 'var(--color-primary, #2563eb)', fontSize: '11px', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>help</span>
            What does Smart Cropping do?
          </button>
        </>
      )}

      {/* ── Per-Edge Toggles ─────────────────────────────────── */}
      {hasDetectedBorders && !isInvertedDocument && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Edge Control
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {Object.entries(edgeLabels).map(([edge, label]) => {
              const confidence = getConfidence(edge);
              const hasCrop = (currentPageDetection?.edgeData?.[edge]?.cropPx || 0) > 0;
              return (
                <label key={edge} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 8px', borderRadius: '5px', cursor: 'pointer',
                  fontSize: '12px', color: '#374151',
                  backgroundColor: enabledEdges[edge] && hasCrop ? '#F0FDF4' : '#F9FAFB',
                  border: `1px solid ${enabledEdges[edge] && hasCrop ? '#BBF7D0' : '#E5E7EB'}`,
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={enabledEdges[edge]}
                    onChange={() => toggleEdge(edge)}
                    style={{ accentColor: '#10B981', width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <span>{label}</span>
                  {hasCrop && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
                      color: getConfidenceColor(confidence)
                    }}>
                      {confidence}%
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clean Dimensions Guarantee ──────────────────────── */}
      {(hasDetectedBorders || isActive) && !isInvertedDocument && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 10px',
          borderRadius: '8px',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '2px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
            <span>Original Dimensions Restored</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#047857', lineHeight: 1.3 }}>
            Border shadows removed and page scaled to full original sheet size with zero margin distortion.
          </div>
        </div>
      )}

      {/* ── Page Scope Selector ───────────────────────────────── */}
      {(hasDetectedBorders || isActive) && !isInvertedDocument && totalPages > 1 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Apply To
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[
              { value: 'all', label: `All Pages (${totalPages})`, icon: 'select_all' },
              { value: 'current', label: 'Current Page Only', icon: 'filter_1' },
              { value: 'range', label: 'Custom Range', icon: 'view_list' }
            ].map((option) => (
              <label key={option.value} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 8px', borderRadius: '5px', cursor: 'pointer',
                fontSize: '12px', color: '#374151',
                backgroundColor: scopeMode === option.value ? '#EFF6FF' : 'transparent',
                border: `1px solid ${scopeMode === option.value ? '#BFDBFE' : 'transparent'}`,
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="radio"
                  name="smartCropperScope"
                  value={option.value}
                  checked={scopeMode === option.value}
                  onChange={() => setScopeMode(option.value)}
                  style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#6B7280' }}>{option.icon}</span>
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {scopeMode === 'range' && (
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-5, 8, 12-18"
              style={{
                width: '100%', marginTop: '6px', padding: '6px 10px',
                borderRadius: '5px', border: '1px solid #D1D5DB',
                fontSize: '12px', color: '#374151', outline: 'none',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
            />
          )}
        </div>
      )}

      {/* ── Action Buttons ───────────────────────────────────── */}
      {!isInvertedDocument && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {!isActive && hasDetectedBorders && (
            <button
              onClick={handleActivate}
              style={{
                width: '100%', padding: '8px 0', borderRadius: '6px',
                border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '12px',
                backgroundColor: '#10B981', color: '#FFFFFF',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#059669'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#10B981'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_fix_high</span>
              Clean Borders
            </button>
          )}

          {isActive && (
            <button
              onClick={handleRevert}
              style={{
                width: '100%', padding: '7px 0', borderRadius: '6px',
                border: '1px solid #E5E7EB', cursor: 'pointer',
                fontWeight: 500, fontSize: '12px',
                backgroundColor: '#FFFFFF', color: '#6B7280',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#F9FAFB'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#FFFFFF'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>undo</span>
              Revert to Original
            </button>
          )}
        </div>
      )}

      {/* Educational & Decision Pop-Up Modal */}
      {cropper.showInfoModal && (
        <SmartCropperModal
          isOpen={cropper.showInfoModal}
          isInfoOnly={Boolean(cropper.isInfoOnlyModal)}
          onClose={cropper.closeInfoModal || (() => cropper.setShowInfoModal?.(false))}
          onApply={({ margin }) => {
            if (margin && cropper.setCleanMargin) cropper.setCleanMargin(margin);
            activate();
            if (onActivate) onActivate();
            if (cropper.closeInfoModal) cropper.closeInfoModal();
          }}
          onSkip={() => {
            handleRevert();
            if (cropper.closeInfoModal) cropper.closeInfoModal();
          }}
          detectedCount={hasDetectedBorders ? 1 : 0}
          currentMargin={cleanMargin}
          onMarginChange={cropper.setCleanMargin}
        />
      )}
    </div>
  );
}
