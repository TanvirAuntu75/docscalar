// ═══════════════════════════════════════════════════════════════════════════════
// JSON Backup Modal: Export, Restore & PDF Document Importer
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';
import { parsePdfResumeText } from '../../engines/utility/resumeParserEngine.js';
import { extractPageTextWithColumns } from '../../engines/utility/resumeParserEngine.js';

export default function JsonBackupModal({
  isOpen,
  onClose
}) {
  const {
    exportJson,
    importJson,
    resetDraft,
    importData
  } = useResumeContext();

  const [importStatus, setImportStatus] = useState(null);

  const handleJsonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      e.target.value = '';
    } catch (_) {}

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const res = importJson(text);
        if (res.success) {
          setImportStatus({ type: 'success', message: 'Resume data restored successfully!' });
          setTimeout(() => {
            if (onClose) onClose();
          }, 1200);
        } else {
          setImportStatus({ type: 'error', message: 'Failed to parse JSON: ' + res.error });
        }
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Invalid file format: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      e.target.value = '';
    } catch (_) {}

    try {
      setImportStatus({ type: 'info', message: 'Extracting text from PDF resume...' });
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      const pageTexts = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items.map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0
        }));

        const pageText = extractPageTextWithColumns(items);
        pageTexts.push(pageText);
      }

      fullText = pageTexts.join('\n\n');

      if (fullText.trim()) {
        const parsedData = parsePdfResumeText(fullText);
        importData({ data: parsedData });

        setImportStatus({ type: 'success', message: `Extracted complete resume data from ${pdf.numPages} page PDF!` });
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setImportStatus({ type: 'error', message: 'Could not extract text from this PDF (may be scanned image).' });
      }
    } catch (err) {
      setImportStatus({ type: 'error', message: 'PDF import error: ' + err.message });
    }
  };

  if (!isOpen) return null;

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
          maxWidth: '520px',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
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
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--brand-primary, #2563eb)' }}>
              backup
            </span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
              Backup, Restore & Data Import
            </h2>
          </div>
          <button type="button" className="cv-btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {importStatus && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                background: importStatus.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : (importStatus.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 99, 235, 0.12)'),
                color: importStatus.type === 'success' ? '#10b981' : (importStatus.type === 'error' ? '#ef4444' : '#3b82f6'),
                border: '1px solid currentColor'
              }}
            >
              {importStatus.message}
            </div>
          )}

          {/* Export JSON Option */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Export JSON Backup</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Download an offline backup file containing all text, experience, and custom sections.
              </div>
            </div>
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={exportJson}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', whiteSpace: 'nowrap' }}
            >
              Download JSON
            </button>
          </div>

          {/* Import JSON Option */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Restore from JSON</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Upload a previously exported `.json` backup file.
              </div>
            </div>
            <label
              className="cv-btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Upload JSON
              <input
                type="file"
                accept=".json, application/json"
                onChange={handleJsonUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Import from PDF Option */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Extract from Existing PDF</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Upload an existing PDF resume to automatically populate fields.
              </div>
            </div>
            <label
              className="cv-btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Upload PDF
              <input
                type="file"
                accept=".pdf, application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Reset Draft */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ef4444' }}>Reset to Default Template</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Clear custom edits and restore the default sample resume.
              </div>
            </div>
            <button
              type="button"
              className="cv-btn-ghost"
              onClick={() => {
                if (window.confirm('Reset draft? All unsaved customizations will revert to default.')) {
                  resetDraft();
                  if (onClose) onClose();
                }
              }}
              style={{ fontSize: '0.78rem', color: '#ef4444', borderColor: '#ef4444' }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
