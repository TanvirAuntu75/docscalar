// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Studio — Master Modular Container (< 200 Lines)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import { ResumeProvider, useResumeContext } from '../../context/ResumeContext.jsx';
import {
  StudioHeaderNav,
  LivePreviewCanvas,
  TemplateGalleryModal,
  TemplateSelectionPage,
  StartModePage,
  AtsDiagnosticModal,
  PhotoStudioModal,
  JsonBackupModal,
  FullscreenPreviewModal,
  PersonalInfoStep,
  ExperienceStep,
  EducationStep,
  SkillsStep,
  SummaryProjectsStep,
  AdditionalInfoStep,
  SectionManagerStep,
  ReviewDesignStep,
  StepBottomNav
} from '../../components/ResumeStudio';

function ResumeStudio() {
  const { ui, setModalState, runtime, dispatch } = useResumeContext();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [atsModalTab, setAtsModalTab] = useState('health');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'preview'

  const step = ui.wizardStep !== undefined ? ui.wizardStep : 0;

  // Auto-dismiss runtime error after 6 seconds
  useEffect(() => {
    if (runtime?.error) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RUNTIME/SET_ERROR', payload: null });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [runtime?.error, dispatch]);

  const handleOpenAts = useCallback((tab = 'health') => {
    setAtsModalTab(tab);
    setAtsModalOpen(true);
  }, []);

  // Step Switcher
  const renderCurrentStep = () => {
    switch (step) {
      case 0: return <PersonalInfoStep />;
      case 1: return <ExperienceStep />;
      case 2: return <EducationStep />;
      case 3: return <SkillsStep />;
      case 4: return <SummaryProjectsStep />;
      case 5: return <AdditionalInfoStep />;
      case 6: return <SectionManagerStep />;
      case 7: return <ReviewDesignStep />;
      default: return <PersonalInfoStep />;
    }
  };

  // If in initial gallery mode, render full template catalog with site header & swatches
  if (ui.screen === 'gallery') {
    return <TemplateSelectionPage />;
  }

  // If in start mode, render onboarding screen (Scratch vs PDF import)
  if (ui.screen === 'start') {
    return <StartModePage />;
  }

  return (
    <div className="cv-studio-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <SEOHead
        title="Resume Studio — Professional CV & Resume Builder"
        description="Build professional resumes with 89 ATS verified templates, direct inline editing, smart metric suggestions, and instant PDF or DOCX export."
      />

      {/* Top Navigation Bar */}
      <StudioHeaderNav
        onOpenAtsModal={() => handleOpenAts('health')}
        onOpenGallery={() => setGalleryOpen(true)}
        onOpenJsonModal={() => setJsonModalOpen(true)}
        onOpenFullscreen={() => setFullscreenOpen(true)}
      />

      {/* Responsive Mobile Tab Switcher (< 900px) */}
      <div
        className="cv-mobile-view-tabs"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          padding: '0.4rem 1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <button
            type="button"
            className={`cv-btn-secondary ${mobileTab === 'editor' ? 'active' : ''}`}
            onClick={() => setMobileTab('editor')}
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_note</span>
            Edit Content
          </button>
          <button
            type="button"
            className={`cv-btn-secondary ${mobileTab === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileTab('preview')}
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>preview</span>
            Live Preview
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: 2-Column Split */}
      <div
        className="cv-studio-workspace"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 42%) 1fr',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Left Form Panel */}
        <div
          className={`cv-form-panel ${mobileTab === 'editor' ? 'cv-mobile-visible' : 'cv-mobile-hidden'}`}
          style={{
            overflowY: 'auto',
            padding: '1.5rem',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ flex: 1 }}>
            {renderCurrentStep()}
          </div>
          <StepBottomNav />
        </div>

        {/* Right Live Preview Canvas */}
        <div
          className={`cv-preview-panel ${mobileTab === 'preview' ? 'cv-mobile-visible' : 'cv-mobile-hidden'}`}
          style={{ height: '100%', overflow: 'hidden' }}
        >
          <LivePreviewCanvas
            onOpenPhoto={() => setPhotoModalOpen(true)}
            onOpenFullscreen={() => setFullscreenOpen(true)}
          />
        </div>
      </div>

      {/* Floating Error Toast */}
      {runtime?.error && (
        <div
          className="cv-studio-toast-error"
          data-testid="studio-error-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#ef4444',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 10000,
            fontSize: '0.875rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
          <span>{runtime.error}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RUNTIME/SET_ERROR', payload: null })}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: '2px' }}
            title="Dismiss error"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}

      {/* Modals & Dialogs */}
      <TemplateGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <AtsDiagnosticModal
        isOpen={atsModalOpen}
        initialTab={atsModalTab}
        onClose={() => setAtsModalOpen(false)}
      />

      <PhotoStudioModal
        isOpen={photoModalOpen || ui.photoStudioOpen}
        onClose={() => {
          setPhotoModalOpen(false);
          setModalState('photoStudio', false);
        }}
      />

      <JsonBackupModal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
      />

      <FullscreenPreviewModal
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
      />
    </div>
  );
}

export default function ResumeBuilder() {
  return (
    <ResumeProvider>
      <ResumeStudio />
    </ResumeProvider>
  );
}
