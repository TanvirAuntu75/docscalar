// ═══════════════════════════════════════════════════════════════════════════════
// Step 2: Education, Academic Credentials & Honors
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';

export default function EducationStep() {
  const {
    data,
    setEduField,
    addEdu,
    removeEdu
  } = useResumeContext();

  const educations = data?.education || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Education & Academic Credentials
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            List your universities, degrees, graduation years, and academic distinctions.
          </p>
        </div>
        <button
          type="button"
          className="cv-btn-primary"
          onClick={addEdu}
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Degree
        </button>
      </div>

      {educations.length === 0 ? (
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
            school
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            No education entries added yet
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
            Add your degrees, certifications, or high school qualifications.
          </div>
          <button type="button" className="cv-btn-primary" onClick={addEdu} style={{ marginTop: '0.5rem' }}>
            + Add First Degree
          </button>
        </div>
      ) : (
        educations.map((edu, idx) => (
          <SectionCard
            key={edu.id || `edu_${idx}`}
            title={`Degree ${idx + 1}: ${edu.degree || 'Degree'} ${edu.school ? `@ ${edu.school}` : ''}`}
            icon="school"
            actions={
              <button
                type="button"
                className="cv-btn-ghost"
                onClick={() => removeEdu(edu.id, idx)}
                style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Remove Degree"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                Remove
              </button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <FieldRow label="Degree / Field of Study" icon="workspace_premium" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. B.S. in Computer Science"
                  value={edu.degree || ''}
                  onChange={(e) => setEduField(idx, 'degree', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="School / University" icon="account_balance" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Stanford University"
                  value={edu.school || ''}
                  onChange={(e) => setEduField(idx, 'school', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Start Year" icon="calendar_today">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. 2018"
                  value={edu.start || ''}
                  onChange={(e) => setEduField(idx, 'start', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Graduation / End Year" icon="event_available">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. 2022"
                  value={edu.end || ''}
                  onChange={(e) => setEduField(idx, 'end', e.target.value)}
                />
              </FieldRow>
            </div>

            <div style={{ marginTop: '0.4rem' }}>
              <FieldRow label="Honors, GPA or Minor (Optional)" icon="military_tech">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Magna Cum Laude · GPA: 3.9 / 4.0 · Dean's List"
                  value={edu.note || ''}
                  onChange={(e) => setEduField(idx, 'note', e.target.value)}
                />
              </FieldRow>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
