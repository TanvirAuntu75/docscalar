import React, { useState, useEffect, useRef } from 'react';
import { loadTemplate } from '../../../engines/utility/templateRegistry.js';
import { defaultData as fallbackData } from '../../../context/resumeReducer.js';

export default function TemplateCard({
  templateKey,
  item,
  defaultData,
  themeColor = 'default',
  themeFont = 'Inter',
  onSelect,
  isActive = false
}) {
  const [width, setWidth] = useState(260);
  const ref = useRef(null);
  const [generatorFn, setGeneratorFn] = useState(() => (typeof item?.fn === 'function' ? item.fn : null));
  const [isLoadingFn, setIsLoadingFn] = useState(() => typeof item?.fn !== 'function');

  useEffect(() => {
    let isMounted = true;
    if (typeof item?.fn === 'function') {
      setGeneratorFn(() => item.fn);
      setIsLoadingFn(false);
      return;
    }

    setIsLoadingFn(true);
    loadTemplate(templateKey)
      .then((fn) => {
        if (isMounted) {
          if (typeof fn === 'function') {
            setGeneratorFn(() => fn);
          }
          setIsLoadingFn(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(`Failed to load template "${templateKey}":`, err);
          setIsLoadingFn(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [templateKey, item?.fn]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const baseData = defaultData && Object.keys(defaultData).length > 0 ? defaultData : fallbackData;

  const cardData = {
    ...fallbackData,
    ...baseData,
    summary: (baseData.summary || fallbackData.summary || '').length > 200
      ? (baseData.summary || fallbackData.summary || '').slice(0, 200) + '...'
      : (baseData.summary || fallbackData.summary || ''),
    experience: (baseData.experience && baseData.experience.length > 0 ? baseData.experience : fallbackData.experience).slice(0, 2).map(e => ({
      ...e,
      highlights: (e.highlights || []).slice(0, 2)
    })),
    education: (baseData.education && baseData.education.length > 0 ? baseData.education : fallbackData.education).slice(0, 2),
    skills: (baseData.skills && baseData.skills.length > 0 ? baseData.skills : fallbackData.skills).slice(0, 6),
    projects: (baseData.projects && baseData.projects.length > 0 ? baseData.projects : fallbackData.projects).slice(0, 1),
    certifications: (baseData.certifications && baseData.certifications.length > 0 ? baseData.certifications : fallbackData.certifications).slice(0, 1),
    name: item?.candidateName || baseData.name || fallbackData.name,
    title: item?.candidateTitle || baseData.title || fallbackData.title,
    photoUrl: item?.photoUrl || baseData.photoUrl || fallbackData.photoUrl || '/images/candidates/candidate_1.jpg'
  };

  const activeFn = typeof item?.fn === 'function' ? item.fn : generatorFn;

  const rawMarkup = typeof activeFn === 'function'
    ? activeFn(cardData, themeColor, themeFont, ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'], 'single', 0, 1.4)
    : '';

  const previewMarkup = rawMarkup
    ? rawMarkup
        .replace('</head>', '<style>html, body { overflow: hidden !important; pointer-events: none !important; -webkit-user-select: none !important; user-select: none !important; } a, button, input, select, textarea { pointer-events: none !important; tab-index: -1 !important; }</style></head>')
        .replace(/<a\b([^>]*)>/gi, (m) => m.replace(/\bhref="[^"]*"/gi, 'href="javascript:void(0)" tabindex="-1"'))
    : '';

  const scale = Math.max(0.1, width / 794);

  return (
    <div
      className={`cv-template-card ${isActive ? 'active-template' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Select ${item.label || templateKey} resume template`}
      onClick={() => onSelect && onSelect(templateKey, item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSelect) onSelect(templateKey, item);
        }
      }}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        border: isActive ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
      }}
    >
      {item.badge && (
        <div className="cv-template-badge">
          {item.badge}
        </div>
      )}
      <div ref={ref} className="cv-template-preview-wrapper" style={{ position: 'relative', width: '100%', aspectRatio: '794/1123', overflow: 'hidden', background: '#ffffff' }}>
        {previewMarkup ? (
          <iframe
            srcDoc={previewMarkup}
            title={item.label}
            tabIndex={-1}
            aria-hidden="true"
            className="cv-template-preview-iframe"
            scrolling="no"
            style={{
              width: '794px',
              height: '1123px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
              pointerEvents: 'none',
              border: 'none'
            }}
          />
        ) : (
          <div
            className="cv-template-preview-skeleton"
            style={{
              width: '100%',
              height: '100%',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: '#f8fafc',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ height: '24px', width: '60%', background: '#e2e8f0', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '40%', background: '#e2e8f0', borderRadius: '4px' }} />
            <div style={{ height: '1px', width: '100%', background: '#cbd5e1', margin: '0.5rem 0' }} />
            <div style={{ height: '12px', width: '90%', background: '#e2e8f0', borderRadius: '3px' }} />
            <div style={{ height: '12px', width: '85%', background: '#e2e8f0', borderRadius: '3px' }} />
            <div style={{ height: '12px', width: '75%', background: '#e2e8f0', borderRadius: '3px' }} />
            <div style={{ height: '36px', width: '100%', background: '#f1f5f9', borderRadius: '4px', marginTop: '0.5rem' }} />
          </div>
        )}
        <div className="cv-template-overlay">
          <button className="cv-template-overlay-btn" type="button" tabIndex={-1}>
            <span>{isActive ? 'Active Template' : 'Use Template'}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {isActive ? 'check' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>
      <div className="cv-template-card-label">
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          {item.candidateName || ''}
        </span>
      </div>
    </div>
  );
}
