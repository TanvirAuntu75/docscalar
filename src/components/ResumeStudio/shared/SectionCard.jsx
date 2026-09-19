import React from 'react';

export default function SectionCard({ title, icon, subtitle, actions, children, style }) {
  return (
    <div
      className="cv-studio-section-card"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style
      }}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {icon && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand-primary, #2563eb)' }}>{icon}</span>}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {title}
              </div>
              {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
