// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Studio — Step Bottom Navigation
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';

const WIZARD_STEPS = [
  { step: 0, label: 'Contact Information', short: 'Contact' },
  { step: 1, label: 'Work Experience', short: 'Experience' },
  { step: 2, label: 'Education & Degrees', short: 'Education' },
  { step: 3, label: 'Skills & Competencies', short: 'Skills' },
  { step: 4, label: 'Summary & Projects', short: 'Projects' },
  { step: 5, label: 'Additional Information', short: 'Additional' },
  { step: 6, label: 'Order & Section Titles', short: 'Sections' },
  { step: 7, label: 'Design & Review', short: 'Review' }
];

export default function StepBottomNav() {
  const {
    ui,
    setWizardStep,
    exportPdf,
    directPrint,
    runtime
  } = useResumeContext();

  const currentStep = ui.wizardStep !== undefined ? ui.wizardStep : 0;
  const prevStepInfo = currentStep > 0 ? WIZARD_STEPS[currentStep - 1] : null;
  const nextStepInfo = currentStep < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[currentStep + 1] : null;

  const scrollToTop = () => {
    const panel = document.querySelector('.cv-form-panel');
    if (panel) {
      panel.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setWizardStep(currentStep - 1);
      scrollToTop();
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setWizardStep(currentStep + 1);
      scrollToTop();
    }
  };

  return (
    <div
      className="cv-step-bottom-nav"
      data-testid="step-bottom-nav"
      style={{
        marginTop: '2rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}
    >
      {/* Left: Previous Button */}
      <div>
        {prevStepInfo ? (
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={handlePrev}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              padding: '0.5rem 0.95rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Back: {prevStepInfo.short}
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary, #94a3b8)' }}>
            Step 1 of 8 · Contact
          </span>
        )}
      </div>

      {/* Center: Step Indicator */}
      {prevStepInfo && nextStepInfo && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary, #94a3b8)', fontWeight: '500' }}>
          Step {currentStep + 1} of 8
        </div>
      )}

      {/* Right: Next or Finish Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {nextStepInfo ? (
          <button
            type="button"
            className="cv-btn-primary"
            onClick={handleNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              padding: '0.5rem 1.15rem'
            }}
          >
            Next: {nextStepInfo.short}
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={directPrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                padding: '0.5rem 0.95rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              Print
            </button>
            <button
              type="button"
              className="cv-btn-primary"
              onClick={exportPdf}
              disabled={runtime?.isProcessing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.5rem 1.25rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              Finish & Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
