// ═══════════════════════════════════════════════════════════════════════════════
// Studio Header Nav: Top Action Bar, Stepper, ATS Pill & Export Triggers
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import { TEMPLATE_MAP } from '../../engines/utility/templateMetadata.js';

const WIZARD_STEPS = [
  { step: 0, label: 'Contact', icon: 'person' },
  { step: 1, label: 'Experience', icon: 'work' },
  { step: 2, label: 'Education', icon: 'school' },
  { step: 3, label: 'Skills', icon: 'psychology' },
  { step: 4, label: 'Summary & Projects', icon: 'article' },
  { step: 5, label: 'Additional', icon: 'verified' },
  { step: 6, label: 'Order & Titles', icon: 'reorder' },
  { step: 7, label: 'Design & Review', icon: 'palette' }
];

export default function StudioHeaderNav({
  onOpenAtsModal,
  onOpenGallery,
  onOpenJsonModal,
  onOpenFullscreen
}) {
  const {
    theme,
    ui,
    runtime,
    atsHealth,
    canUndo,
    canRedo,
    undo,
    redo,
    setWizardStep,
    setScreen,
    autoSanitize,
    exportPdf,
    exportDocx,
    directPrint
  } = useResumeContext();

  const activeTemplateItem = TEMPLATE_MAP[theme.activeTemplate] || TEMPLATE_MAP.mariana;
  const currentStep = ui.wizardStep !== undefined ? ui.wizardStep : 0;

  return (
    <div
      className="cv-studio-top-nav"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}
      >
        {/* Left Side: Brand, Template Selector, Autosave Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cv-btn-ghost"
            onClick={() => setScreen('gallery')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            title="Exit studio and browse all 89 CV templates in gallery"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Exit to Gallery
          </button>

          <button
            type="button"
            className="cv-btn-secondary"
            onClick={onOpenGallery}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--brand-primary, #2563eb)' }}>
              style
            </span>
            <span style={{ fontWeight: '600' }}>{activeTemplateItem?.label || 'Template'}</span>
          </button>

          {/* ATS Health Score Pill */}
          <button
            type="button"
            onClick={onOpenAtsModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.7rem',
              borderRadius: '999px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: atsHealth?.color || '#10b981'
            }}
            title="Open ATS Scanner & Diagnostics"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              health_and_safety
            </span>
            <span>{atsHealth?.score || 95}% ATS</span>
          </button>

          {/* Autosave Status */}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>check_circle</span>
            Draft saved
          </span>
        </div>

        {/* Right Side: Undo/Redo, Clean Formatting, Print, Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Undo / Redo */}
          <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-subtle)', paddingRight: '0.45rem', marginRight: '0.2rem' }}>
            <button
              type="button"
              className="cv-btn-ghost"
              disabled={!canUndo}
              onClick={undo}
              style={{
                padding: '0.35rem 0.5rem',
                opacity: canUndo ? 1 : 0.4,
                cursor: canUndo ? 'pointer' : 'not-allowed'
              }}
              title="Undo (Ctrl+Z / Cmd+Z)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>undo</span>
            </button>
            <button
              type="button"
              className="cv-btn-ghost"
              disabled={!canRedo}
              onClick={redo}
              style={{
                padding: '0.35rem 0.5rem',
                opacity: canRedo ? 1 : 0.4,
                cursor: canRedo ? 'pointer' : 'not-allowed'
              }}
              title="Redo (Ctrl+Y / Cmd+Shift+Z)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>redo</span>
            </button>
          </div>

          {/* Clean Formatting */}
          <button
            type="button"
            className="cv-btn-ghost"
            onClick={autoSanitize}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            title="Clean whitespace, fix dashes & strip raw bullet artifacts"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cleaning_services</span>
            Clean
          </button>

          {/* Backup Modal */}
          <button
            type="button"
            className="cv-btn-ghost"
            onClick={onOpenJsonModal}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            title="Backup & Restore JSON / PDF"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>backup</span>
            Backup
          </button>

          {/* Direct Print */}
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={directPrint}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            title="Print via Browser Print Dialog"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
            Print
          </button>

          {/* Export DOCX */}
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={exportDocx}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            title="Export Word Document (.docx)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563eb' }}>description</span>
            DOCX
          </button>

          {/* Export PDF Primary Button */}
          <button
            type="button"
            className="cv-btn-primary"
            disabled={runtime.processing}
            onClick={exportPdf}
            style={{
              fontSize: '0.82rem',
              padding: '0.45rem 0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: '700'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {runtime.processing ? 'hourglass_top' : 'download'}
            </span>
            {runtime.processing ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Stepper Navigation Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '0 1rem',
          background: 'var(--bg-primary)',
          scrollbarWidth: 'none'
        }}
      >
        {WIZARD_STEPS.map((ws) => {
          const isActive = currentStep === ws.step;
          return (
            <button
              key={ws.step}
              type="button"
              className={`cv-step-tab ${isActive ? 'active' : ''}`}
              onClick={() => setWizardStep(ws.step)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.65rem 0.85rem',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: isActive ? '2px solid var(--brand-primary, #2563eb)' : '2px solid transparent',
                color: isActive ? 'var(--brand-primary, #2563eb)' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease, border-color 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {ws.icon}
              </span>
              <span>{ws.step + 1}. {ws.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
