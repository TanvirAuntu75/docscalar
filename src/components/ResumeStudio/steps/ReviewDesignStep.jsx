// ═══════════════════════════════════════════════════════════════════════════════
// Step 7: Typography, Theme Colors, Page Spacing & Layout Architecture
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow from '../shared/FieldRow.jsx';
import { FONT_REGISTRY } from '../../../engines/utility/fontRegistry.js';

const PALETTES = [
  { id: 'default', label: 'Template Original', hex: '#2c3549' },
  { id: '#2563eb', label: 'Royal Blue', hex: '#2563eb' },
  { id: '#0d9488', label: 'Teal Modern', hex: '#0d9488' },
  { id: '#059669', label: 'Emerald Forest', hex: '#059669' },
  { id: '#4f46e5', label: 'Indigo Tech', hex: '#4f46e5' },
  { id: '#e11d48', label: 'Crimson Rose', hex: '#e11d48' },
  { id: '#d97706', label: 'Amber Gold', hex: '#d97706' },
  { id: '#334155', label: 'Slate Charcoal', hex: '#334155' }
];

export default function ReviewDesignStep() {
  const {
    theme,
    setThemeColor,
    setThemeFont,
    setThemeLayout,
    setPageMargin,
    setLineSpacing,
    autoTuneFit
  } = useResumeContext();

  const activeFont = theme.themeFont || 'Inter';
  const activeColor = theme.themeColor || 'default';
  const activeLayout = theme.themeLayout || 'single';
  const pageMargin = theme.pageMargin !== undefined ? theme.pageMargin : 24;
  const lineSpacing = theme.lineSpacing !== undefined ? theme.lineSpacing : 1.4;

  const fontKeys = Object.keys(FONT_REGISTRY || {
    inter: { name: 'Inter' },
    outfit: { name: 'Outfit' },
    open_sans: { name: 'Open Sans' },
    roboto: { name: 'Roboto' },
    merriweather: { name: 'Merriweather' },
    playfair_display: { name: 'Playfair Display' },
    plus_jakarta_sans: { name: 'Plus Jakarta Sans' },
    lora: { name: 'Lora' }
  });

  const handleAutoTune = () => {
    autoTuneFit(1.28, 16);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Typography & Layout Styling
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Customize typography scales, accent palette, page margins, and column flow.
        </p>
      </div>

      {/* Typography Registry */}
      <SectionCard title="Typography Engine (8 Core Font Stacks)" icon="font_download">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {fontKeys.map((fKey) => {
            const fontObj = FONT_REGISTRY[fKey];
            const fontName = fontObj?.name || fKey;
            const isSelected = activeFont.toLowerCase() === fontName.toLowerCase() || activeFont.toLowerCase() === fKey.toLowerCase();

            return (
              <button
                key={fKey}
                type="button"
                className={`cv-btn-secondary ${isSelected ? 'active' : ''}`}
                onClick={() => setThemeFont(fontName)}
                style={{
                  padding: '0.6rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.15rem',
                  border: isSelected ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {fontName}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {fontObj?.category || 'Serif / Sans'}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Accent Color Palette */}
      <SectionCard title="Theme Accent Palette" icon="palette">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
          {PALETTES.map((pal) => {
            const isSelected = activeColor === pal.id || (pal.id !== 'default' && activeColor === pal.hex);
            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => setThemeColor(pal.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '999px',
                  border: isSelected ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: pal.hex,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: isSelected ? '600' : 'normal' }}>
                  {pal.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Layout Grid Mode */}
      <SectionCard title="Layout Architecture" icon="view_quilt" subtitle="Automatic section column arrangement">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <button
            type="button"
            className={`cv-btn-secondary ${activeLayout === 'auto' ? 'active' : ''}`}
            onClick={() => setThemeLayout('auto')}
            style={{
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              border: activeLayout === 'auto' ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
              background: activeLayout === 'auto' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Template Native</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Original designed proportions
            </span>
          </button>

          <button
            type="button"
            className={`cv-btn-secondary ${activeLayout === 'split' ? 'active' : ''}`}
            onClick={() => setThemeLayout('split')}
            style={{
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              border: activeLayout === 'split' ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
              background: activeLayout === 'split' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Two Column Split</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Executive modern sidebar layout
            </span>
          </button>

          <button
            type="button"
            className={`cv-btn-secondary ${activeLayout === 'single' ? 'active' : ''}`}
            onClick={() => setThemeLayout('single')}
            style={{
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              border: activeLayout === 'single' ? '2px solid var(--brand-primary, #2563eb)' : '1px solid var(--border-subtle)',
              background: activeLayout === 'single' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_agenda</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Single Column ATS</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              100% Linear ATS vertical stream
            </span>
          </button>
        </div>
      </SectionCard>

      {/* Spacing & Page Fit Sliders */}
      <SectionCard
        title="Page Geometry & Spacing"
        icon="aspect_ratio"
        actions={
          <button
            type="button"
            className="cv-btn-secondary"
            onClick={handleAutoTune}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--brand-primary, #2563eb)' }}>
              auto_awesome
            </span>
            Fit 1 Page
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <FieldRow label={`Page Margin: ${pageMargin}px`} icon="format_indent_increase">
            <input
              type="range"
              min="10"
              max="45"
              step="1"
              value={pageMargin}
              onChange={(e) => setPageMargin(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </FieldRow>

          <FieldRow label={`Line Spacing: ${lineSpacing}x`} icon="format_line_spacing">
            <input
              type="range"
              min="1.1"
              max="1.9"
              step="0.05"
              value={lineSpacing}
              onChange={(e) => setLineSpacing(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </FieldRow>
        </div>
      </SectionCard>
    </div>
  );
}
