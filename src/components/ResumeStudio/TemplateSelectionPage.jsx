// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Builder — Full-Page Template Selection Gallery
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import ToolPageLayout from '../ToolPageLayout';
import SEOHead from '../SEOHead';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import { TEMPLATE_MAP } from '../../engines/utility/templateMetadata.js';
import TemplateCard from './shared/TemplateCard.jsx';

const THEME_COLORS = [
  { color: '#3e4e68', label: 'Slate Blue' },
  { color: '#a97d5d', label: 'Bronze/Rose' },
  { color: '#4e5d4c', label: 'Sage Green' },
  { color: '#2c3549', label: 'Slate Navy' },
  { color: '#802b3e', label: 'Burgundy' },
  { color: '#2f2e2d', label: 'Charcoal' }
];

export default function TemplateSelectionPage() {
  const {
    theme,
    data,
    setThemeColor,
    setActiveTemplate,
    setScreen,
    setField
  } = useResumeContext();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(32);

  const activeTemplate = theme.activeTemplate || 'mariana';
  const activeColor = theme.themeColor || '#3e4e68';

  const filterTabs = [
    { id: 'all', label: `All Templates (${Object.keys(TEMPLATE_MAP).length})`, icon: 'grid_view' },
    { id: 'ats', label: `100% ATS Ultra (${Object.values(TEMPLATE_MAP).filter(t => t.atsTier === 'ultra').length})`, icon: 'shield' },
    { id: 'corporate', label: `Corporate (${Object.values(TEMPLATE_MAP).filter(t => t.atsTier === 'corporate').length})`, icon: 'business_center' },
    { id: 'creative', label: `Modern & Creative (${Object.values(TEMPLATE_MAP).filter(t => t.atsTier === 'creative').length})`, icon: 'palette' }
  ];

  const filteredList = useMemo(() => {
    return Object.entries(TEMPLATE_MAP).filter(([key, item]) => {
      // Filter by category tier
      if (activeFilter === 'ats' && item.atsTier !== 'ultra') return false;
      if (activeFilter === 'corporate' && item.atsTier !== 'corporate') return false;
      if (activeFilter === 'creative' && item.atsTier !== 'creative') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = (item.label || '').toLowerCase().includes(query);
        const matchesKey = key.toLowerCase().includes(query);
        const matchesCandidate = item.candidateName ? item.candidateName.toLowerCase().includes(query) : false;
        return matchesLabel || matchesKey || matchesCandidate;
      }
      return true;
    });
  }, [activeFilter, searchQuery]);

  const handleSelectTemplate = (templateKey, item) => {
    setActiveTemplate(templateKey);
    setScreen('start');

    // Adapt candidate name, title, and photo if default/unaltered
    const isDefaultPhoto = !data.photoUrl || data.photoUrl.includes('/images/candidates/') || data.photoUrl.includes('unsplash.com');
    const defaultNames = Object.values(TEMPLATE_MAP).map(t => t.candidateName).filter(Boolean);
    defaultNames.push('Mariana Anderson');
    const isDefaultName = !data.name || defaultNames.includes(data.name.trim());

    const defaultTitles = Object.values(TEMPLATE_MAP).map(t => t.candidateTitle).filter(Boolean);
    defaultTitles.push('Marketing Manager', 'Marketing Specialist', 'Professional Title');
    const isDefaultTitle = !data.title || !data.title.trim() || defaultTitles.includes(data.title.trim());

    if (isDefaultName && item.candidateName) {
      setField('name', item.candidateName);
    }
    if (isDefaultTitle && item.candidateTitle) {
      setField('title', item.candidateTitle);
    }
    if (isDefaultPhoto && item.photoUrl) {
      setField('photoUrl', item.photoUrl);
    }
  };

  return (
    <ToolPageLayout
      toolId="resume-builder"
      hideHeader={true}
      title="Resume Builder"
      breadcrumbs={[{ label: 'Utility' }, { label: 'Resume Builder' }]}
    >
      <SEOHead
        title="Free CV & Resume Builder — 89 ATS Optimized Professional Templates"
        description="Build enterprise-grade resumes with 89 ATS-optimized templates, direct inline editing, smart metric enhancer, and instant PDF/DOCX export."
      />

      <div
        className="cv-template-selection-page"
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          padding: '1.5rem clamp(1.25rem, 3.5vw, 4rem) 3.5rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '0.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Select Your Template
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto', lineHeight: 1.5 }}>
            To get started, select a resume template below. You can customize colors, fonts, and layout anytime in the editor.
          </p>
        </div>

        {/* Live Color Swatch Row */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
            Choose Theme Color
          </div>
          <div className="cv-color-swatches" style={{ margin: 0, gap: '1rem' }}>
            {THEME_COLORS.map((s) => {
              const isSelected = activeColor === s.color;
              return (
                <button
                  key={s.color}
                  type="button"
                  className={`cv-color-swatch ${isSelected ? 'active' : ''}`}
                  style={{
                    backgroundColor: s.color,
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 0 3px ${s.color}, 0 4px 12px rgba(0,0,0,0.25)` : '0 2px 6px rgba(0,0,0,0.15)',
                    transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setThemeColor(s.color)}
                  title={s.label}
                  aria-label={`Select ${s.label} theme color`}
                />
              );
            })}
          </div>
        </div>

        {/* Filter Controls & Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.75rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0' }}>
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isActive ? '1px solid var(--color-primary, #2563eb)' : '1px solid var(--border-subtle)',
                    background: isActive ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)',
                    color: isActive ? 'var(--color-primary, #2563eb)' : 'var(--text-secondary)'
                  }}
                >
                  {tab.icon && <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>{tab.icon}</span>}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search templates or roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* 4-Column Template Grid */}
        <div className="cv-template-grid">
          {filteredList.slice(0, visibleCount).map(([key, item]) => (
            <TemplateCard
              key={key}
              templateKey={key}
              item={item}
              defaultData={data}
              themeColor={activeColor}
              themeFont={theme.themeFont || 'Inter'}
              isActive={activeTemplate === key}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>

        {/* Load More Button */}
        {visibleCount < filteredList.length && (
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + 24)}
              style={{
                padding: '0.65rem 2rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
              Show More Templates ({filteredList.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
