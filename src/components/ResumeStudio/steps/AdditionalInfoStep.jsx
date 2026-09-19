// ═══════════════════════════════════════════════════════════════════════════════
// Step 5: Certifications, Professional References & Custom Blocks
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useResumeContext } from '../../../context/ResumeContext.jsx';
import SectionCard from '../shared/SectionCard.jsx';
import FieldRow, { inputStyle } from '../shared/FieldRow.jsx';

export default function AdditionalInfoStep() {
  const {
    data,
    setField,
    addCert,
    removeCert,
    addRef,
    removeRef,
    setRefField,
    addCustomSection,
    removeCustomSection,
    updateCustomSectionItem
  } = useResumeContext();

  const [certInput, setCertInput] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const certifications = data?.certifications || [];
  const references = data?.references || [];
  const customSections = data?.customSections || [];

  const handleAddCert = () => {
    if (certInput.trim()) {
      addCert(certInput.trim());
      setCertInput('');
    }
  };

  const handleCertKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCert();
    }
  };

  const handleAddCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    addCustomSection({
      id: 'custom_' + Date.now(),
      title: newSectionTitle.trim(),
      items: [{ id: 'item_1', title: 'Highlight 1', value: 'Details' }]
    });
    setNewSectionTitle('');
  };

  const handleAddCustomSectionItem = (sectionId) => {
    const updated = (customSections || []).map((cs) => {
      if (cs.id === sectionId) {
        const items = cs.items || [];
        const newItem = {
          id: 'item_' + (items.length + 1),
          title: 'Highlight ' + (items.length + 1),
          value: 'Details'
        };
        return { ...cs, items: [...items, newItem] };
      }
      return cs;
    });
    setField('customSections', updated);
  };

  const handleRemoveCustomSectionItem = (sectionId, itemIdx) => {
    const updated = (customSections || []).map((cs) => {
      if (cs.id === sectionId) {
        const items = (cs.items || []).filter((_, idx) => idx !== itemIdx);
        return { ...cs, items: items.length > 0 ? items : [{ id: 'item_1', title: 'Highlight 1', value: 'Details' }] };
      }
      return cs;
    });
    setField('customSections', updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Certifications, References & Additional Details
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Add professional credentials, peer references, and custom sections.
        </p>
      </div>

      {/* Certifications */}
      <SectionCard title="Certifications & Licenses" icon="verified">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g. AWS Certified Solutions Architect · Amazon 2024"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={handleCertKeyDown}
          />
          <button
            type="button"
            className="cv-btn-primary"
            onClick={handleAddCert}
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', whiteSpace: 'nowrap' }}
          >
            Add Cert
          </button>
        </div>

        {certifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {certifications.map((cert, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--brand-primary, #2563eb)' }}>
                    workspace_premium
                  </span>
                  <span>{cert}</span>
                </div>
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => removeCert(cert)}
                  style={{ color: '#ef4444', padding: '0.15rem 0.35rem' }}
                  title="Remove Certification"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* References */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Professional References
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Supervisors, managers, or colleagues available upon request.
          </span>
        </div>
        <button
          type="button"
          className="cv-btn-primary"
          onClick={addRef}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          Add Reference
        </button>
      </div>

      {references.length === 0 ? (
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}
        >
          No references added yet.
        </div>
      ) : (
        references.map((refItem, idx) => (
          <SectionCard
            key={refItem.id || `ref_${idx}`}
            title={`Reference ${idx + 1}: ${refItem.name || 'Reference'}`}
            icon="group"
            actions={
              <button
                type="button"
                className="cv-btn-ghost"
                onClick={() => removeRef(refItem.id, idx)}
                style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Remove Reference"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                Remove
              </button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <FieldRow label="Full Name" icon="person" required>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Benjamin Shah"
                  value={refItem.name || ''}
                  onChange={(e) => setRefField(idx, 'name', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Company / Designation" icon="work">
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. CTO / Tech Lead @ Acme Corp"
                  value={refItem.relation || ''}
                  onChange={(e) => setRefField(idx, 'relation', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Phone Number" icon="call">
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="e.g. +1 555 234 5678"
                  value={refItem.phone || ''}
                  onChange={(e) => setRefField(idx, 'phone', e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Email Address" icon="mail">
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="e.g. b.shah@acme.com"
                  value={refItem.email || ''}
                  onChange={(e) => setRefField(idx, 'email', e.target.value)}
                />
              </FieldRow>
            </div>
          </SectionCard>
        ))
      )}

      {/* Add Custom Section */}
      <SectionCard title="Add Custom Section" icon="add_box">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g. Languages, Publications, Volunteer Work..."
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomSection();
              }
            }}
          />
          <button
            type="button"
            className="cv-btn-primary"
            onClick={handleAddCustomSection}
            style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
          >
            + Add Section
          </button>
        </div>
      </SectionCard>

      {/* Custom Sections / Languages */}
      {customSections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Custom Sections & Languages
          </h3>

          {customSections.map((cs) => (
            <SectionCard
              key={cs.id}
              title={cs.title || 'Custom Section'}
              icon="tune"
              actions={
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => removeCustomSection(cs.id)}
                  style={{ color: '#ef4444', fontSize: '0.78rem' }}
                  title="Remove Section"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(cs.items || []).map((it, itIdx) => {
                  const hasMultiple = (cs.items || []).length > 1;
                  return (
                    <div
                      key={it.id || itIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: hasMultiple ? '1fr 1fr 36px' : '1fr 1fr',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        style={inputStyle}
                        placeholder="Title (e.g. English, French)"
                        value={it.title || ''}
                        onChange={(e) => updateCustomSectionItem(cs.id, itIdx, { title: e.target.value })}
                      />
                      <input
                        type="text"
                        style={inputStyle}
                        placeholder="Proficiency / Level (e.g. Native, Fluent)"
                        value={it.value || ''}
                        onChange={(e) => updateCustomSectionItem(cs.id, itIdx, { value: e.target.value })}
                      />
                      {hasMultiple && (
                        <button
                          type="button"
                          className="cv-btn-ghost"
                          onClick={() => handleRemoveCustomSectionItem(cs.id, itIdx)}
                          style={{
                            color: '#ef4444',
                            padding: '0.25rem',
                            height: '36px',
                            minWidth: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                <div style={{ marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="cv-btn-secondary"
                    onClick={() => handleAddCustomSectionItem(cs.id)}
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                    + Add Item
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
