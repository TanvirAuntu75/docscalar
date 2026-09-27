// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Builder — Start Mode Selection Page (Scratch vs PDF Import)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { Zap } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import ToolPageLayout from '../ToolPageLayout';
import SEOHead from '../SEOHead';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import { TEMPLATE_MAP } from '../../engines/utility/templateMetadata.js';
import { parsePdfResumeText } from '../../engines/utility/resumeParserEngine.js';
import { extractPageTextWithColumns } from '../../engines/utility/resumeParserEngine.js';

export default function StartModePage() {
  const {
    theme,
    setScreen,
    setWizardStep,
    importData
  } = useResumeContext();

  const fileInputRef = useRef(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeTemplate = theme.activeTemplate || 'mariana';
  const templateInfo = TEMPLATE_MAP[activeTemplate] || { label: 'Professional Resume' };

  const handleStartScratch = () => {
    setScreen('editor');
    setWizardStep(0);
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const parseAndPopulateResume = (fullText) => {
    const parsedData = parsePdfResumeText(fullText);
    importData({ data: parsedData });
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      e.target.value = '';
    } catch (_) {}

    setIsExtracting(true);
    setErrorMsg('');

    let pdf = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
        parseAndPopulateResume(fullText);
        setScreen('editor');
        setWizardStep(0);
      } else {
        setErrorMsg('Could not detect readable text in this PDF. It may be a scanned image.');
      }
    } catch (err) {
      setErrorMsg('Failed to parse PDF resume: ' + err.message);
    } finally {
      setIsExtracting(false);
      if (pdf) {
        try {
          pdf.destroy();
        } catch (_) {}
      }
    }
  };

  return (
    <ToolPageLayout
      toolId="resume-builder"
      hideHeader={true}
      title="Resume Builder"
      breadcrumbs={[
        { label: 'Utility' },
        { label: 'Resume Builder', onClick: () => setScreen('gallery') },
        { label: 'Start Mode' }
      ]}
    >
      <SEOHead
        title="Choose How to Start — DocScalar Resume Studio"
        description="Choose how to start your resume: start from scratch with live preview or upload an existing PDF to auto-fill fields."
      />

      <div style={{ maxWidth: '820px', margin: '1rem auto 3rem', padding: '0 1.25rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Choose how to start your resume
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Get started quickly with your chosen template:{' '}
            <strong style={{ color: 'var(--color-primary, #2563eb)' }}>
              {templateInfo.label?.replace(/^[^\w]*/, '')}
            </strong>
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Two Choice Cards */}
        <div className="cv-start-cards" style={{ margin: '0 auto' }}>
          {/* Card 1: Start From Scratch */}
          <div
            className="cv-start-card"
            role="button"
            tabIndex={0}
            onClick={handleStartScratch}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStartScratch()}
          >
            <span className="material-symbols-outlined">edit_note</span>
            <div className="cv-start-title">Create a new resume</div>
            <div className="cv-start-desc">
              Start fresh and enter your details step by step. Ideal for building a clean new draft with real-time A4 preview.
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 'auto', width: '100%', pointerEvents: 'none' }}
            >
              Start from scratch
            </button>
          </div>

          {/* Card 2: Upload Existing PDF */}
          <div
            className="cv-start-card"
            role="button"
            tabIndex={0}
            style={{ position: 'relative' }}
            onClick={handleTriggerUpload}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTriggerUpload()}
          >
            <div
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                padding: '3px 9px',
                fontSize: '0.68rem',
                fontWeight: '700',
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Zap size={11} strokeWidth={2.5} />
              <span>Quickest way</span>
            </div>

            <span className="material-symbols-outlined">
              {isExtracting ? 'hourglass_top' : 'upload_file'}
            </span>
            <div className="cv-start-title">
              {isExtracting ? 'Extracting Resume Text...' : 'I already have a resume'}
            </div>
            <div className="cv-start-desc">
              {isExtracting
                ? 'Parsing PDF content, sections, contact information, and bullet highlights...'
                : 'Upload your current resume in PDF format. We will extract the text to pre-fill the forms instantly.'}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={isExtracting}
              style={{ marginTop: 'auto', width: '100%', pointerEvents: 'none' }}
            >
              {isExtracting ? 'Extracting...' : 'Upload & Improve'}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              id="pdf-resume-start-import"
              accept=".pdf"
              onChange={handlePdfUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Back Navigation */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScreen('gallery')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Back to Template Selection
          </button>
        </div>
      </div>
    </ToolPageLayout>
  );
}
