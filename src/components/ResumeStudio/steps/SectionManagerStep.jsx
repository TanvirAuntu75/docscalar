// ═══════════════════════════════════════════════════════════════════════════════
// Step 6: Section & Title Serial Manager (Ordering & Custom Headings)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';

const DEFAULT_LABELS = {
  summary: 'Executive Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills & Proficiencies',
  projects: 'Key Projects',
  certifications: 'Certifications',
  references: 'References',
  custom_languages: 'Languages'
};

const SECTION_ICONS = {
  summary: 'article',
  experience: 'work',
  education: 'school',
  skills: 'psychology',
  projects: 'folder_special',
  certifications: 'verified',
  references: 'group',
  custom_languages: 'translate'
};

const PRESETS = [
  {
    id: 'standard',
    label: 'Standard Chronological',
    order: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references', 'custom_languages']
  },
  {
    id: 'skills_first',
    label: 'Skills & Tech First',
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'references', 'custom_languages']
  },
  {
    id: 'projects_first',
    label: 'Projects & Portfolio First',
    order: ['summary', 'projects', 'experience', 'skills', 'education', 'certifications', 'references', 'custom_languages']
  },
  {
    id: 'academic',
    label: 'Academic & Research First',
    order: ['summary', 'education', 'experience', 'skills', 'certifications', 'projects', 'references', 'custom_languages']
  }
];

export default function SectionManagerStep() {
  const {
    theme,
    data,
    setSectionOrder,
    moveSection,
    setSectionTitle,
    addCustomSection,
    removeCustomSection
  } = useResumeContext();

  const [newSectionTitle, setNewSectionTitle] = useState('');

  const sectionOrder = theme.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references', 'custom_languages'];
  const sectionTitles = data.sectionTitles || {};

  const handleApplyPreset = (presetOrder) => {
    const currentOrder = sectionOrder || [];
    // Collect user-created custom section keys that are not custom_languages
    const customKeys = currentOrder.filter((k) => k.startsWith('custom_') && k !== 'custom_languages');
    (data.customSections || []).forEach((cs) => {
      if (cs.id && cs.id !== 'custom_languages' && !customKeys.includes(cs.id)) {
        customKeys.push(cs.id);
      }
    });
    const merged = [...presetOrder];
    // Retain references if present in data or currentOrder
    if ((data.references?.length || currentOrder.includes('references')) && !merged.includes('references')) {
      merged.push('references');
    }
    // Retain all user-created custom sections
    customKeys.forEach((ck) => {
      if (!merged.includes(ck)) {
        merged.push(ck);
      }
    });
    setSectionOrder(merged);
  };

  const handleCreateCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    const secId = 'custom_' + Date.now();
    addCustomSection({
      id: secId,
      title: newSectionTitle.trim(),
      items: [
        { id: 'item_1', title: 'Highlight 1', value: 'Details' },
        { id: 'item_2', title: 'Highlight 2', value: 'Details' }
      ]
    });
    setNewSectionTitle('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Section Order & Custom Headings
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Rearrange the flow of sections across all 89 CV templates and customize heading labels.
        </p>
      </div>

      {/* Quick Presets */}
      <SectionCard title="Quick Ordering Presets" icon="auto_fix_high">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="cv-btn-secondary"
              onClick={() => handleApplyPreset(preset.order)}
              style={{
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                justifyContent: 'flex-start'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Reorderable Section Stream */}
      <SectionCard title="Serial Section Hierarchy" icon="reorder" subtitle="Use Up / Down arrows to alter vertical layout sequence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sectionOrder.map((secKey, idx) => {
            const defaultLabel = DEFAULT_LABELS[secKey] || secKey.replace(/^custom_/, '').replace(/_/g, ' ');
            const currentTitle = sectionTitles[secKey] || defaultLabel;
            const icon = SECTION_ICONS[secKey] || 'tune';

            return (
              <div
                key={secKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  gap: '0.75rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', width: '20px' }}>
                    {idx + 1}.
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary, #2563eb)' }}>
                    {icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      style={{
                        ...inputStyle,
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.82rem',
                        fontWeight: '600'
                      }}
                      value={currentTitle}
                      onChange={(e) => setSectionTitle(secKey, e.target.value)}
                      placeholder={defaultLabel}
                    />
                  </div>
                </div>

                {/* Move Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="cv-btn-ghost"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, idx - 1)}
                    style={{
                      padding: '0.3rem 0.45rem',
                      opacity: idx === 0 ? 0.35 : 1,
                      cursor: idx === 0 ? 'not-allowed' : 'pointer'
                    }}
                    title="Move Section Up"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    className="cv-btn-ghost"
                    disabled={idx === sectionOrder.length - 1}
                    onClick={() => moveSection(idx, idx + 1)}
                    style={{
                      padding: '0.3rem 0.45rem',
                      opacity: idx === sectionOrder.length - 1 ? 0.35 : 1,
                      cursor: idx === sectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                    title="Move Section Down"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_downward</span>
                  </button>
                  {secKey.startsWith('custom_') && secKey !== 'custom_languages' && (
                    <button
                      type="button"
                      className="cv-btn-ghost"
                      onClick={() => removeCustomSection(secKey)}
                      style={{
                        padding: '0.3rem 0.45rem',
                        color: 'var(--text-danger, #ef4444)',
                        cursor: 'pointer'
                      }}
                      title="Delete Custom Section"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Add Custom Section */}
      <SectionCard title="Create New Custom Section" icon="add_box">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            style={inputStyle}
            placeholder="Custom Section Heading (e.g. Publications, Volunteer Work, Patents)..."
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateCustomSection();
              }
            }}
          />
          <button
            type="button"
            className="cv-btn-primary"
            onClick={handleCreateCustomSection}
            style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
          >
            Create Section
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
