// ═══════════════════════════════════════════════════════════════════════════════
// Step 0: Personal Details, Contact Information & Photo Management
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';
import { getRoleIntelligence } from '../../../engines/utility/resumeIntelligenceEngine.js';

export default function PersonalInfoStep() {
  const {
    data,
    setField,
    setModalState,
    addSkill
  } = useResumeContext();

  const roleIntel = useMemo(() => {
    return getRoleIntelligence(data.title || '');
  }, [data.title]);

  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawBase64 = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        setField('photoUrl', compressed);
        setModalState('photoStudio', true);
      };
      img.onerror = () => {
        setField('photoUrl', rawBase64);
        setModalState('photoStudio', true);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyRoleSummary = () => {
    if (roleIntel?.suggestedSummary) {
      setField('summary', roleIntel.suggestedSummary);
    }
  };

  const handleApplyRoleSkills = () => {
    if (Array.isArray(roleIntel?.topKeywords) && roleIntel.topKeywords.length > 0) {
      addSkill(roleIntel.topKeywords.join(', '));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Photo & Identity Section */}
      <SectionCard
        title="Candidate Identity"
        icon="badge"
        subtitle="Your primary contact header stamped on all ATS formats"
      >
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar Preview */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {data.photoUrl ? (
                <img
                  src={data.photoUrl}
                  alt="Candidate Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${data.photoCrop?.scale || 1}) translate(${data.photoCrop?.x || 0}px, ${data.photoCrop?.y || 0}px) rotate(${data.photoCrop?.rotate || 0}deg)`
                  }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>
                  person
                </span>
              )}
            </div>
          </div>

          {/* Photo Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label
                className="cv-btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                Upload Headshot
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoFile}
                  style={{ display: 'none' }}
                />
              </label>

              {data.photoUrl && (
                <>
                  <button
                    type="button"
                    className="cv-btn-secondary"
                    onClick={() => setModalState('photoStudio', true)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>crop</span>
                    Crop & Adjust
                  </button>
                  <button
                    type="button"
                    className="cv-btn-ghost"
                    onClick={() => setField('photoUrl', '')}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', color: '#ef4444' }}
                    title="Remove Photo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Recommended: 400×400px square. Photo is preserved across all 89 CV templates.
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '0.5rem' }}>
          <FieldRow label="Full Name" icon="person" required>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. Mariana Anderson"
              value={data.name || ''}
              onChange={(e) => setField('name', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Professional Job Title" icon="work" required>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. Senior Marketing Manager"
              value={data.title || ''}
              onChange={(e) => setField('title', e.target.value)}
            />
          </FieldRow>
        </div>
      </SectionCard>

      {/* Role Recommendations Pill */}
      {roleIntel?.role && (
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.05)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--brand-primary, #2563eb)', fontSize: '20px' }}>
              auto_awesome
            </span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Target Track: {roleIntel.role}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {roleIntel.topKeywords?.slice(0, 5).join(' · ')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={handleApplyRoleSkills}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
            >
              + Add {roleIntel.topKeywords?.length || 0} Core Skills
            </button>
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={handleApplyRoleSummary}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--brand-primary, #2563eb)' }}>auto_awesome</span>
              Insert Pro Summary
            </button>
          </div>
        </div>
      )}

      {/* Contact Channels */}
      <SectionCard
        title="Contact & Online Profiles"
        icon="contact_mail"
        subtitle="Standardized for ATS contact parsing and clickable links"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <FieldRow label="Email Address" icon="mail" required>
            <input
              type="email"
              style={inputStyle}
              placeholder="e.g. hello@reallygreatsite.com"
              value={data.email || ''}
              onChange={(e) => setField('email', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Phone Number" icon="call" required>
            <input
              type="tel"
              style={inputStyle}
              placeholder="e.g. +1 555 456 7890"
              value={data.phone || ''}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Location (City, State/Country)" icon="location_on">
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. New York, NY"
              value={data.location || ''}
              onChange={(e) => setField('location', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="LinkedIn Profile URL" icon="link">
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. linkedin.com/in/username"
              value={data.linkedin || ''}
              onChange={(e) => setField('linkedin', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="Portfolio / Website" icon="language">
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. yourportfolio.com"
              value={data.website || ''}
              onChange={(e) => setField('website', e.target.value)}
            />
          </FieldRow>

          <FieldRow label="GitHub Profile URL" icon="terminal">
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. github.com/username"
              value={data.github || ''}
              onChange={(e) => setField('github', e.target.value)}
            />
          </FieldRow>
        </div>
      </SectionCard>
    </div>
  );
}
