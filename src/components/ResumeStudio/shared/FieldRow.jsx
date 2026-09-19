import React from 'react';

export default function FieldRow({ label, icon, required, hint, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {icon && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{icon}</span>}
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
};

export const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '80px'
};
