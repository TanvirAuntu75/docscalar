// ═══════════════════════════════════════════════════════════════════════════════
// Template Gallery Modal: 89-Template Catalog Showcase & Tier Filtering
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import { TEMPLATE_MAP } from '../../engines/utility/templateMetadata.js';
import TemplateCard from './shared/TemplateCard.jsx';

export default function TemplateGalleryModal({
  isOpen,
  onClose,
  isFullScreen = false
}) {
  const {
    theme,
    data,
    setActiveTemplate,
    setScreen,
    setField
  } = useResumeContext();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'ats' | 'corporate' | 'creative'
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);

  const activeTemplate = theme.activeTemplate || 'mariana';

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
        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesKey = key.toLowerCase().includes(query);
        const matchesCandidate = item.candidateName ? item.candidateName.toLowerCase().includes(query) : false;
        return matchesLabel || matchesKey || matchesCandidate;
      }
      return true;
    });
  }, [activeFilter, searchQuery]);

  const handleSelectTemplate = (templateKey, item) => {
    setActiveTemplate(templateKey);
    setScreen('editor');

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

    if (onClose) onClose();
  };

  if (!isOpen && !isFullScreen) return null;

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
            Resume & CV Template Catalog
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Choose from 89 enterprise-grade, ATS-optimized layouts tailored for every industry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              outline: 'none',
              minWidth: '200px'
            }}
          />

          <button
            type="button"
            className="cv-btn-secondary"
            onClick={() => {
              setScreen('gallery');
              if (onClose) onClose();
            }}
            style={{
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
            title="Open Full Page Template Gallery"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
            <span>Full Page View</span>
          </button>

          {onClose && (
            <button
              type="button"
              className="cv-btn-ghost"
              onClick={onClose}
              style={{ padding: '0.4rem 0.6rem' }}
              title="Close Gallery"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-primary)',
          overflowX: 'auto'
        }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cv-btn-secondary ${activeFilter === tab.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              background: activeFilter === tab.id ? 'rgba(37, 99, 235, 0.12)' : undefined,
              borderColor: activeFilter === tab.id ? 'var(--brand-primary, #2563eb)' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {tab.icon && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Showcase */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          background: 'var(--bg-secondary)'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {filteredList.slice(0, visibleCount).map(([key, item]) => (
            <TemplateCard
              key={key}
              templateKey={key}
              item={item}
              defaultData={data}
              themeColor={theme.themeColor}
              themeFont={theme.themeFont}
              isActive={activeTemplate === key}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>

        {visibleCount < filteredList.length && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              type="button"
              className="cv-btn-primary"
              onClick={() => setVisibleCount(prev => prev + 24)}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
            >
              Load More Templates ({filteredList.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return content;
  }

  return (
    <div
      className="cv-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: '90vh',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          background: 'var(--bg-primary)'
        }}
      >
        {content}
      </div>
    </div>
  );
}
