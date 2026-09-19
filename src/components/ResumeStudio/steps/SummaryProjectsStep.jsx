// ═══════════════════════════════════════════════════════════════════════════════
// Step 4: Executive Summary & Project Portfolios
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle, textareaStyle } from '../shared/FieldRow.jsx';
import { getRoleIntelligence, enhanceBullet } from '../../../engines/utility/resumeIntelligenceEngine.js';

export default function SummaryProjectsStep() {
  const {
    data,
    setField,
    setProjField,
    addProj,
    removeProj
  } = useResumeContext();

  const projects = data?.projects || [];
  const summaryLength = (data.summary || '').length;

  const handleApplyRoleSummary = () => {
    const roleIntel = getRoleIntelligence(data.title || '');
    const suggested = roleIntel?.summary || roleIntel?.suggestedSummary;
    if (suggested) {
      setField('summary', suggested);
    }
  };

  const handleEnhanceProject = (idx, currentDesc) => {
    if (!currentDesc) return;
    const enhanced = enhanceBullet(currentDesc, data.title || '');
    setProjField(idx, 'description', enhanced);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Professional Summary & Key Projects
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Craft a compelling executive bio and highlight portfolio initiatives.
        </p>
      </div>

      {/* Professional Summary */}
      <SectionCard
        title="Professional Executive Summary"
        icon="article"
        actions={
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={handleApplyRoleSummary}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--brand-primary, #2563eb)' }}>
              auto_awesome
            </span>
            Generate for {data.title || 'Role'}
          </button>
        }
      >
        <FieldRow
          label="Summary / Bio"
          hint={`${summaryLength} characters (Recommended: 200–450)`}
        >
          <textarea
            style={{ ...textareaStyle, minHeight: '110px', lineHeight: '1.5' }}
            placeholder="e.g. Engineering Lead with 8+ years experience designing cloud distributed systems..."
            value={data.summary || ''}
            onChange={(e) => setField('summary', e.target.value)}
          />
        </FieldRow>
      </SectionCard>

      {/* Projects */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Projects & Portfolio Initiatives
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showcase key applications, research, or campaigns.
          </span>
        </div>
        <button
          type="button"
          className="cv-btn-primary"
          onClick={addProj}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}
        >
          No projects added yet. Click "+ Add Project" to showcase your work.
        </div>
      ) : (
        projects.map((proj, idx) => (
          <SectionCard
            key={proj.id || `proj_${idx}`}
            title={`Project ${idx + 1}: ${proj.name || proj.title || 'Project'}`}
            icon="folder_special"
            actions={
              <button
                type="button"
                className="cv-btn-ghost"
                onClick={() => removeProj(proj.id, idx)}
                style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Remove Project"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                Remove
              </button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <FieldRow label="Project Name / Title" icon="title" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Distributed Consensus Engine"
                  value={proj.name || proj.title || ''}
                  onChange={(e) => setProjField(idx, 'name', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Project URL / Repository" icon="link">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. github.com/user/project"
                  value={proj.url || ''}
                  onChange={(e) => setProjField(idx, 'url', e.target.value)}
                />
              </FieldRow>
            </div>

            <div style={{ marginTop: '0.4rem' }}>
              <FieldRow
                label="Project Description & Impact"
                icon="description"
                hint={
                  <button
                    type="button"
                    className="cv-btn-ghost"
                    onClick={() => handleEnhanceProject(idx, proj.description)}
                    style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--brand-primary, #2563eb)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>auto_awesome</span>
                    Enhance
                  </button>
                }
              >
                <textarea
                  style={{ ...textareaStyle, minHeight: '65px' }}
                  placeholder="Describe the technical architecture, problems solved, and measurable outcomes achieved."
                  value={proj.description || ''}
                  onChange={(e) => setProjField(idx, 'description', e.target.value)}
                />
              </FieldRow>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
