// ═══════════════════════════════════════════════════════════════════════════════
// Step 3: Skills Pill Matrix, Role Suggestions & Autocomplete
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';
import { getRoleIntelligence } from '../../../engines/utility/resumeIntelligenceEngine.js';
import {
  TAXONOMY_CATEGORIES,
  CONCEPT_TAXONOMY_GRAPH,
  TAXONOMY_CATEGORY_LABELS
} from '../../../engines/utility/semanticMatcherEngine.js';

const SECTOR_ORDER = [
  'frontend',
  'backend',
  'cloud_devops',
  'data_ai_ml',
  'product_design',
  'cybersecurity',
  'finance_legal',
  'databases',
  'mobile',
  'qa_automation',
  'sales',
  'marketing',
  'human_resources',
  'operations_verticals'
];

export default function SkillsStep() {
  const {
    data,
    addSkill,
    removeSkill
  } = useResumeContext();

  const [inputVal, setInputVal] = useState('');
  const [selectedSector, setSelectedSector] = useState('frontend');

  const skills = data?.skills || [];

  const roleIntel = useMemo(() => {
    return getRoleIntelligence(data.title || '');
  }, [data.title]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputVal.trim()) {
        addSkill(inputVal.trim());
        setInputVal('');
      }
    }
  };

  const handleAddClick = () => {
    if (inputVal.trim()) {
      addSkill(inputVal.trim());
      setInputVal('');
    }
  };

  const handleAddSkill = (skill) => {
    if (skill && typeof skill === 'string') {
      addSkill(skill.trim());
    }
  };

  const suggestedSkills = useMemo(() => {
    if (!roleIntel?.topKeywords) return [];
    return roleIntel.topKeywords.filter(k => !skills.some(s => s.toLowerCase() === k.toLowerCase()));
  }, [roleIntel, skills]);

  const sectorChips = TAXONOMY_CATEGORIES[selectedSector] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Skills & Technical Expertise
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Add technical proficiencies, tools, domain competencies, and certifications.
        </p>
      </div>

      <SectionCard title="Add Skills" icon="psychology">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            style={inputStyle}
            placeholder="Type a skill (e.g. React, TypeScript, Product Strategy) and press Enter or Comma..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="cv-btn-primary"
            onClick={handleAddClick}
            style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
          >
            Add Skill
          </button>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Tip: You can paste comma separated lists (e.g. "Node.js, Docker, Kubernetes, AWS") to add multiple at once.
        </span>

        {/* 14 Sector Skill Universe Browser */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary, #2563eb)' }}>hub</span>
              14 Sector Skill Universe Browser
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Explore and add industry verified skills across 14 domains
            </span>
          </div>

          {/* Category Selector Pill Bar */}
          <div
            className="skill-universe-sectors"
            style={{
              display: 'flex',
              gap: '0.35rem',
              overflowX: 'auto',
              paddingBottom: '0.4rem',
              scrollbarWidth: 'thin'
            }}
          >
            {SECTOR_ORDER.map((sector) => {
              const isActive = selectedSector === sector;
              const label = TAXONOMY_CATEGORY_LABELS[sector] || sector;
              return (
                <button
                  key={sector}
                  type="button"
                  className={`cv-btn-secondary ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedSector(sector)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    background: isActive ? 'var(--brand-primary, #2563eb)' : 'var(--bg-primary)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: isActive ? 'var(--brand-primary, #2563eb)' : 'var(--border-subtle)',
                    cursor: 'pointer',
                    fontWeight: isActive ? '700' : '500',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Curated Skill Chips for Selected Sector */}
          <div
            className="skill-universe-chips"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              padding: '0.75rem',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              minHeight: '48px'
            }}
          >
            {sectorChips.map((chip, idx) => {
              const isAdded = skills.some(s => s.toLowerCase() === chip.toLowerCase());
              return (
                <button
                  key={idx}
                  type="button"
                  className="cv-btn-secondary"
                  onClick={() => isAdded ? removeSkill(chip) : handleAddSkill(chip)}
                  title={isAdded ? `"${chip}" is in your resume (click to remove)` : `Add "${chip}" to skills`}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: isAdded ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                    borderColor: isAdded ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                    color: isAdded ? '#10b981' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '13px',
                      color: isAdded ? '#10b981' : 'var(--brand-primary, #2563eb)'
                    }}
                  >
                    {isAdded ? 'check' : 'add'}
                  </span>
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Suggested Skills for Current Role */}
      {suggestedSkills.length > 0 && (
        <SectionCard title={`Recommended for ${roleIntel.role || data.title || 'Your Track'}`} icon="auto_awesome">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {suggestedSkills.map((skill, idx) => (
              <button
                key={idx}
                type="button"
                className="cv-btn-secondary"
                onClick={() => addSkill(skill)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  borderColor: 'rgba(37, 99, 235, 0.3)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--brand-primary, #2563eb)' }}>
                  add
                </span>
                {skill}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Active Skills Matrix */}
      <SectionCard
        title={`Active Skills (${skills.length})`}
        icon="checklist"
        subtitle="These will be rendered as tags or pills in your selected template"
      >
        {skills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No skills added yet. Type a skill above to start.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: 'var(--text-muted)'
                  }}
                  title={`Remove ${skill}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
