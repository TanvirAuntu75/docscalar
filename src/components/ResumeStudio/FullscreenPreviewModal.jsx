// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Studio — Fullscreen Live Preview Modal
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import { A4_HEIGHT } from '../../engines/utility/paginationEngine.js';

export default function FullscreenPreviewModal({ isOpen, onClose }) {
  const {
    data,
    theme,
    previewHtml,
    exportPdf,
    exportDocx,
    directPrint,
    runtime
  } = useResumeContext();

  const [scale, setScale] = useState(0.85);
  const [fitMode, setFitMode] = useState('fit-page'); // 'fit-page' | 'fit-width' | 'custom'
  const viewportRef = useRef(null);

  const calculateScale = useCallback(() => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const availW = rect.width - 48;
    const availH = rect.height - 48;
    if (availW <= 0 || availH <= 0) return;

    if (fitMode === 'fit-page') {
      const sW = availW / 794;
      const sH = availH / A4_HEIGHT;
      const computed = Math.min(sW, sH);
      setScale(Math.max(0.3, Math.min(1.4, Number(computed.toFixed(2)))));
    } else if (fitMode === 'fit-width') {
      const sW = availW / 794;
      setScale(Math.max(0.35, Math.min(1.5, Number(sW.toFixed(2)))));
    }
  }, [fitMode]);

  useEffect(() => {
    if (isOpen) {
      calculateScale();
      const timer = setTimeout(calculateScale, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, calculateScale]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => calculateScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculateScale]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cv-fullscreen-modal-backdrop"
      data-testid="fullscreen-preview-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Controls Ribbon */}
      <div
        style={{
          height: '56px',
          background: 'var(--bg-secondary, #1e293b)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          flexShrink: 0,
          color: 'var(--text-primary, #f8fafc)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary, #3b82f6)' }}>
            visibility
          </span>
          <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
            {data?.name ? `${data.name} — Resume Preview` : 'Fullscreen Resume Preview'}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--color-primary, #3b82f6)',
              fontWeight: '500'
            }}
          >
            A4 Standard (794 × 1123)
          </span>
        </div>

        {/* Center: Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className={`cv-btn-ghost ${fitMode === 'fit-page' ? 'active' : ''}`}
            onClick={() => {
              setFitMode('fit-page');
            }}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
          >
            Fit Page
          </button>
          <button
            type="button"
            className={`cv-btn-ghost ${fitMode === 'fit-width' ? 'active' : ''}`}
            onClick={() => {
              setFitMode('fit-width');
            }}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
          >
            Fit Width
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle, rgba(255,255,255,0.1))', margin: '0 0.25rem' }} />

          <button
            type="button"
            className="cv-btn-ghost"
            onClick={() => {
              setFitMode('custom');
              setScale((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))));
            }}
            style={{ padding: '0.3rem 0.5rem' }}
            title="Zoom Out"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove</span>
          </button>

          <span style={{ fontSize: '0.8rem', fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            className="cv-btn-ghost"
            onClick={() => {
              setFitMode('custom');
              setScale((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(2))));
            }}
            style={{ padding: '0.3rem 0.5rem' }}
            title="Zoom In"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          </button>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={directPrint}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Print Document"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
            Print
          </button>

          <button
            type="button"
            className="cv-btn-secondary"
            onClick={exportDocx}
            disabled={runtime?.isProcessing}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Export as Word DOCX"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
            DOCX
          </button>

          <button
            type="button"
            className="cv-btn-primary"
            onClick={exportPdf}
            disabled={runtime?.isProcessing}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Download PDF Resume"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
            Download PDF
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle, rgba(255,255,255,0.1))', margin: '0 0.25rem' }} />

          <button
            type="button"
            className="cv-btn-ghost"
            onClick={onClose}
            style={{ padding: '0.4rem', color: 'var(--text-secondary, #94a3b8)' }}
            title="Close Fullscreen"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
      </div>

      {/* Main Fullscreen Canvas Viewport */}
      <div
        ref={viewportRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '2rem 1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: `${794 * scale}px`,
            minHeight: `${A4_HEIGHT * scale}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            background: '#ffffff',
            overflow: 'hidden',
            transition: 'width 0.15s ease, min-height 0.15s ease',
            position: 'relative'
          }}
        >
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              title="Fullscreen Resume Live Preview"
              style={{
                width: '794px',
                height: `${A4_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 'none',
                display: 'block'
              }}
            />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Loading document preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
