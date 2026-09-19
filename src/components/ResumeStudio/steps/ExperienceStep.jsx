// ═══════════════════════════════════════════════════════════════════════════════
// Step 1: Work Experience & Smart XYZ Bullet Enhancer
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';
import { enhanceBullet } from '../../../engines/utility/resumeIntelligenceEngine.js';

export default function ExperienceStep() {
  const {
    data,
    setExpField,
    addExp,
    removeExp,
    addExpHighlight,
    setExpHighlight,
    removeExpHighlight
  } = useResumeContext();

  const experiences = data?.experience || [];

  const handleEnhance = (expIndex, highlightIndex, currentText) => {
    if (!currentText || currentText.trim().length === 0) return;
    const roleTitle = experiences[expIndex]?.role || data.title || '';
    const enhanced = enhanceBullet(currentText, roleTitle);
    setExpHighlight(expIndex, highlightIndex, enhanced);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Work Experience
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Detail your relevant work history, achievements, and quantified business impact.
          </p>
        </div>
        <button
          type="button"
          className="cv-btn-primary"
          onClick={addExp}
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Position
        </button>
      </div>

      {experiences.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--text-muted)' }}>
            work_outline
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            No work experience entries added yet
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
            Add your professional positions with bullet points highlighting key contributions and accomplishments.
          </div>
          <button type="button" className="cv-btn-primary" onClick={addExp} style={{ marginTop: '0.5rem' }}>
            + Add First Position
          </button>
        </div>
      ) : (
        experiences.map((exp, idx) => (
          <SectionCard
            key={exp.id || `exp_${idx}`}
            title={`Position ${idx + 1}: ${exp.role || 'Job Role'} ${exp.company ? `@ ${exp.company}` : ''}`}
            icon="business_center"
            actions={
              <button
                type="button"
                className="cv-btn-ghost"
                onClick={() => removeExp(exp.id, idx)}
                style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Remove Position"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                Remove
              </button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <FieldRow label="Job Title / Role" icon="badge" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Senior Product Manager"
                  value={exp.role || ''}
                  onChange={(e) => setExpField(idx, 'role', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Company / Organization" icon="apartment" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Google LLC"
                  value={exp.company || ''}
                  onChange={(e) => setExpField(idx, 'company', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Start Date / Year" icon="calendar_today">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. 2021 or Jan 2021"
                  value={exp.start || ''}
                  onChange={(e) => setExpField(idx, 'start', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="End Date" icon="event_available">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="e.g. 2024 or PRESENT"
                    value={exp.end || ''}
                    onChange={(e) => setExpField(idx, 'end', e.target.value)}
                  />
                  <button
                    type="button"
                    className={`cv-btn-secondary ${exp.end === 'PRESENT' ? 'active' : ''}`}
                    onClick={() => setExpField(idx, 'end', exp.end === 'PRESENT' ? '2024' : 'PRESENT')}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.45rem 0.6rem',
                      whiteSpace: 'nowrap',
                      background: exp.end === 'PRESENT' ? 'rgba(37, 99, 235, 0.15)' : undefined,
                      borderColor: exp.end === 'PRESENT' ? 'var(--brand-primary, #2563eb)' : undefined
                    }}
                  >
                    Present
                  </button>
                </div>
              </FieldRow>
            </div>

            {/* Bullet Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Accomplishments & Bullet Points
                </span>
                <button
                  type="button"
                  className="cv-btn-secondary"
                  onClick={() => addExpHighlight(idx)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  Add Bullet
                </button>
              </div>

              {(exp.highlights || []).map((bullet, hIdx) => (
                <div key={hIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.8rem' }}>•</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <textarea
                      style={{
                        ...inputStyle,
                        minHeight: '52px',
                        resize: 'vertical',
                        lineHeight: '1.4'
                      }}
                      placeholder="e.g. Redesigned checkout flow to reduce friction, increasing completed orders by 18%."
                      value={bullet}
                      onChange={(e) => setExpHighlight(idx, hIdx, e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="cv-btn-ghost"
                        onClick={() => handleEnhance(idx, hIdx, bullet)}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--brand-primary, #2563eb)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Enhance with Action Verbs & Metrics"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>auto_awesome</span>
                        Enhance
                      </button>
                      <button
                        type="button"
                        className="cv-btn-ghost"
                        onClick={() => removeExpHighlight(idx, hIdx)}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', color: '#ef4444' }}
                        title="Delete Bullet"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
