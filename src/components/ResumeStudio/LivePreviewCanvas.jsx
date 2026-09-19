// ═══════════════════════════════════════════════════════════════════════════════
// Live Preview Canvas: Responsive Iframe, Zoom Engine & Direct WYSIWYG Bridge
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';
import {
  A4_HEIGHT,
  computePageBudgetMetrics,
  autoTunePageFit
} from '../../engines/utility/paginationEngine.js';

import {
  injectPageCutoffLine,
  removePageCutoffLine,
  measureContentHeight,
  updateGridlinesOnDoc,
  disableDirectEditOnDoc,
  enableDirectEditOnDoc
} from '../../engines/utility/wysiwygCanvasEngine.js';

export {
  injectPageCutoffLine,
  removePageCutoffLine,
  measureContentHeight,
  updateGridlinesOnDoc,
  disableDirectEditOnDoc,
  enableDirectEditOnDoc
};


export default function LivePreviewCanvas({
  onOpenPhoto,
  onOpenFullscreen
}) {
  const {
    data,
    theme,
    previewHtml,
    ui,
    setDirectEdit,
    applyInlineEdit,
    addExpHighlight,
    removeExpHighlight,
    autoTuneFit,
    setPageMargin
  } = useResumeContext();

  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  const [scale, setScale] = useState(0.68);
  const [fitMode, setFitMode] = useState('fit-width'); // 'fit-width' | 'fit-page' | 'custom'
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [contentHeight, setContentHeight] = useState(1123);

  // Office / Word Document Studio Controls
  const [showGridlines, setShowGridlines] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [floatingToolbar, setFloatingToolbar] = useState(null);
  const [marginMenuOpen, setMarginMenuOpen] = useState(false);

  const directEdit = ui.directEdit !== undefined ? ui.directEdit : false;
  const currentMargin = typeof theme?.pageMargin === 'number' ? theme.pageMargin : 24;

  const hasDiscretePage2 = Boolean(
    previewHtml?.includes('id="page-2"') ||
    previewHtml?.includes('cv-page-2')
  );

  // Compute Page Budget & Headroom Metrics
  const pageMetrics = computePageBudgetMetrics(contentHeight, A4_HEIGHT);
  const page1FillPct = pageMetrics.page1FillPct;
  const headroomPx = pageMetrics.headroomPx;

  // Discrete Page 2 metrics (1123px Sheet 1 + 24px gap = 1147px base offset)
  const page2Height = Math.max(0, contentHeight - 1147);
  const page2FillPct = Math.min(100, Math.round((page2Height / A4_HEIGHT) * 100));
  const page2HeadroomPx = Math.max(0, A4_HEIGHT - page2Height);

  const handleAutoTune = () => {
    if (typeof autoTuneFit === 'function') {
      if (data) {
        const tuned = autoTunePageFit(data, theme?.lineSpacing || 1.45, theme?.pageMargin || 0);
        if (tuned && tuned.lineSpacing !== undefined) {
          autoTuneFit(tuned.lineSpacing, tuned.pageMargin ?? 16);
          return;
        }
      }
      autoTuneFit(1.28, 16);
    }
  };

  // Word-style formatting execution
  const execIframeCmd = (cmd, val = null) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    try {
      doc.execCommand(cmd, false, val);
      const h = measureContentHeight(doc);
      if (h > 0) setContentHeight(h);
    } catch (_) {}
  };

  const handleToggleCase = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    const win = doc.defaultView || window;
    const sel = win.getSelection ? win.getSelection() : null;
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    let nextText = text;
    if (text === text.toUpperCase()) {
      nextText = text.toLowerCase();
    } else if (text === text.toLowerCase()) {
      nextText = text.replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
      nextText = text.toUpperCase();
    }
    try {
      doc.execCommand('insertText', false, nextText);
    } catch (_) {}
  };

  const handleSelectionChange = useCallback((sel) => {
    if (!sel || !iframeRef.current || !containerRef.current) {
      setFloatingToolbar(null);
      return;
    }
    const iframeRect = iframeRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const scaledLeft = iframeRect.left - containerRect.left + (sel.rect.left + sel.rect.width / 2) * scale;
    const scaledTop = iframeRect.top - containerRect.top + sel.rect.top * scale;

    setFloatingToolbar({
      left: Math.max(140, Math.min(containerRect.width - 140, scaledLeft)),
      top: Math.max(48, scaledTop - 10),
      text: sel.text
    });
  }, [scale]);

  const handleMarginPreset = (presetPx) => {
    if (typeof setPageMargin === 'function') {
      setPageMargin(presetPx);
    }
    setMarginMenuOpen(false);
  };

  // Responsive Scale Computation
  const calculateScale = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const availW = rect.width - 32;
    const availH = rect.height - 32;
    if (availW <= 0) return;

    if (fitMode === 'fit-page') {
      const sW = availW / 794;
      const sH = Math.max(0.2, (availH > 0 ? availH : 650) / contentHeight);
      const computed = Math.min(sW, sH);
      setScale(Math.max(0.3, Math.min(1.2, computed)));
    } else if (fitMode === 'fit-width') {
      const sW = availW / 794;
      setScale(Math.max(0.35, Math.min(1.3, sW)));
    } else {
      setScale(zoomLevel);
    }
  };

  useEffect(() => {
    calculateScale();
    const observer = new ResizeObserver(() => {
      calculateScale();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [fitMode, zoomLevel, contentHeight]);

  const [displayHtml, setDisplayHtml] = useState(previewHtml);
  const pendingHtmlRef = useRef(null);
  const isTypingRef = useRef(false);

  // Sync displayHtml with previewHtml only when user is NOT actively typing in the canvas
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    const isTyping = isTypingRef.current || Boolean(doc?._dfIsTyping) || Boolean(doc?.activeElement && doc.activeElement !== doc.body && (doc.activeElement.isContentEditable || doc.activeElement.getAttribute?.('contenteditable') === 'true'));

    if (isTyping) {
      pendingHtmlRef.current = previewHtml;
    } else {
      pendingHtmlRef.current = null;
      setDisplayHtml(previewHtml);
    }
  }, [previewHtml]);

  const handleTypingStart = useCallback(() => {
    isTypingRef.current = true;
  }, []);

  const handleTypingEnd = useCallback(() => {
    isTypingRef.current = false;
    if (pendingHtmlRef.current && pendingHtmlRef.current !== displayHtml) {
      const nextHtml = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      setTimeout(() => {
        setDisplayHtml(nextHtml);
      }, 50);
    }
  }, [displayHtml]);

  // Reactive synchronization of Direct Edit lifecycle & Gridlines without reloading iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !doc.body) return;

    const isTyping = isTypingRef.current || Boolean(doc?._dfIsTyping) || Boolean(doc?.activeElement && doc.activeElement !== doc.body && (doc.activeElement.isContentEditable || doc.activeElement.getAttribute?.('contenteditable') === 'true'));
    if (isTyping) {
      return; // Never re-initialize direct edit while user is actively focused/typing
    }

    if (directEdit) {
      enableDirectEditOnDoc(doc, {
        applyInlineEdit,
        addExpHighlight,
        removeExpHighlight,
        onOpenPhoto,
        onSelectionChange: handleSelectionChange,
        onContentHeightChange: (h) => setContentHeight(h),
        onTypingStart: handleTypingStart,
        onTypingEnd: handleTypingEnd
      });
      updateGridlinesOnDoc(doc, showGridlines);
    } else {
      disableDirectEditOnDoc(doc);
      if (typeof onOpenPhoto === 'function') {
        const photoEls = doc.querySelectorAll(
          '.avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo, .avatar-mask, [data-df-field="photo"]'
        );
        photoEls.forEach((p) => {
          p.classList.add('docscalar-photo-clickable');
          p.style.cursor = 'pointer';
          p.onclick = (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            onOpenPhoto();
          };
        });
      }
      updateGridlinesOnDoc(doc, showGridlines);
      injectPageCutoffLine(doc, 1123);
      setFloatingToolbar(null);
    }

    // Update measured content height
    try {
      const height = measureContentHeight(doc);
      if (height > 0) {
        setContentHeight(height);
      }
    } catch (_) {}
  }, [directEdit, displayHtml, showGridlines, applyInlineEdit, addExpHighlight, removeExpHighlight, onOpenPhoto, handleSelectionChange, handleTypingStart, handleTypingEnd]);

  const handleIframeLoad = (e) => {
    try {
      const iframe = e.target;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          if (directEdit) {
            enableDirectEditOnDoc(doc, {
              applyInlineEdit,
              addExpHighlight,
              removeExpHighlight,
              onOpenPhoto,
              onSelectionChange: handleSelectionChange,
              onContentHeightChange: (h) => setContentHeight(h),
              onTypingStart: handleTypingStart,
              onTypingEnd: handleTypingEnd
            });
            updateGridlinesOnDoc(doc, showGridlines);
          } else {
            disableDirectEditOnDoc(doc);
            if (typeof onOpenPhoto === 'function') {
              const photoEls = doc.querySelectorAll(
                '.avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo, .avatar-mask, [data-df-field="photo"]'
              );
              photoEls.forEach((p) => {
                p.classList.add('docscalar-photo-clickable');
                p.style.cursor = 'pointer';
                p.onclick = (ev) => {
                  if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
                  onOpenPhoto();
                };
              });
            }
            updateGridlinesOnDoc(doc, showGridlines);
            injectPageCutoffLine(doc, 1123);
            setFloatingToolbar(null);
          }
          const height = measureContentHeight(doc);
          if (height > 0) {
            setContentHeight(height);
          }
        }
      }
    } catch (_) {}
  };

  return (
    <div
      ref={containerRef}
      className="cv-live-preview-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        background: 'var(--bg-primary)',
        overflow: 'hidden'
      }}
    >
      {/* Canvas Top Toolbar with Word/Office Controls */}
      <div
        className="cv-preview-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.85rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          zIndex: 10,
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Left Controls: Direct Edit, Box Gridlines, Ruler & Margin Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Direct Edit Toggle */}
          <button
            type="button"
            className={`cv-btn-secondary ${directEdit ? 'active' : ''}`}
            onClick={() => setDirectEdit(!directEdit)}
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: directEdit ? 'rgba(37, 99, 235, 0.12)' : undefined,
              borderColor: directEdit ? 'var(--brand-primary, #2563eb)' : undefined
            }}
            title="Toggle direct text editing on live preview"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              {directEdit ? 'edit' : 'edit_off'}
            </span>
            Direct Edit: {directEdit ? 'ON' : 'OFF'}
          </button>

          {/* Word Box Gridlines Toggle */}
          <button
            type="button"
            className={`cv-btn-ghost ${showGridlines ? 'active' : ''}`}
            data-testid="toggle-gridlines-btn"
            onClick={() => setShowGridlines(!showGridlines)}
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.6rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: showGridlines ? '#6366f1' : undefined,
              background: showGridlines ? 'rgba(99, 102, 241, 0.1)' : undefined,
              border: showGridlines ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent'
            }}
            title="Toggle invisible content alignment boxes & layout gridlines"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              grid_4x4
            </span>
            Box Guides
          </button>

          {/* Word Ruler Toggle */}
          <button
            type="button"
            className={`cv-btn-ghost ${showRuler ? 'active' : ''}`}
            data-testid="toggle-ruler-btn"
            onClick={() => setShowRuler(!showRuler)}
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.6rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: showRuler ? 'var(--brand-primary, #2563eb)' : undefined
            }}
            title="Toggle Top Margin Ruler"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              straighten
            </span>
            Ruler
          </button>

          {/* Margin Presets Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              className="cv-btn-ghost"
              data-testid="margin-presets-btn"
              onClick={() => setMarginMenuOpen(!marginMenuOpen)}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Select Word document margin preset"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                space_bar
              </span>
              Margin: {currentMargin}px
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                arrow_drop_down
              </span>
            </button>

            {marginMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '4px',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                  zIndex: 200,
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => handleMarginPreset(24)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  Normal (24px / 1.0 in)
                </button>
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => handleMarginPreset(12)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  Narrow (12px / 0.5 in)
                </button>
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => handleMarginPreset(6)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  Compact (6px / 0.25 in)
                </button>
                <button
                  type="button"
                  className="cv-btn-ghost"
                  onClick={() => handleMarginPreset(0)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  Zero (0px / Edge to Edge)
                </button>
              </div>
            )}
          </div>

          {/* Auto Tune to 1 Page */}
          <button
            type="button"
            className="cv-btn-ghost"
            onClick={handleAutoTune}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            title="Fit content onto exactly 1 page"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--brand-primary, #2563eb)' }}>
              auto_awesome
            </span>
            Fit 1 Page
          </button>
        </div>

        {/* Center: Live A4 Page Capacity & Headroom Gauge */}
        <div
          className="cv-headroom-gauge-wrapper"
          data-testid="headroom-gauge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: 'inherit'
          }}
        >
          {hasDiscretePage2 ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <div
                className="cv-headroom-badge discrete-page2"
                data-testid="headroom-gauge-page2"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#2563eb',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.2s ease'
                }}
                title={`2 Discrete A4 Pages. Page 2 Content: ${page2FillPct}% (${page2Height}px / ${A4_HEIGHT}px). Headroom: ${page2HeadroomPx}px.`}
              >
                <div
                  style={{
                    width: '32px',
                    height: '4px',
                    background: 'rgba(0, 0, 0, 0.08)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    display: 'inline-block'
                  }}
                >
                  <div
                    style={{
                      width: `${page2FillPct}%`,
                      height: '100%',
                      background: '#3b82f6',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                  2 Pages · Page 2: {page2FillPct}% · {page2HeadroomPx}px headroom
                </span>
              </div>
              <button
                type="button"
                className="cv-btn-autotune"
                data-testid="fit-1page-btn"
                onClick={handleAutoTune}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '0.28rem 0.6rem',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                  transition: 'background 0.15s ease'
                }}
                title="Automatically adjust line spacing and margins to fit on 1 page"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>auto_awesome</span>
                Fit 1 Page
              </button>
            </div>
          ) : contentHeight <= A4_HEIGHT ? (
            <div
              className={`cv-headroom-badge ${page1FillPct > 85 ? 'warning' : 'safe'}`}
              data-testid="headroom-gauge-safe"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '0.28rem 0.65rem',
                borderRadius: '6px',
                background: page1FillPct > 85 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${page1FillPct > 85 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
                color: page1FillPct > 85 ? '#b45309' : '#059669',
                letterSpacing: '-0.01em',
                transition: 'all 0.2s ease'
              }}
              title={`A4 Page Capacity: ${page1FillPct}% (${contentHeight}px / ${A4_HEIGHT}px). Headroom: ${headroomPx}px.`}
            >
              <div
                style={{
                  width: '32px',
                  height: '4px',
                  background: 'rgba(0, 0, 0, 0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  display: 'inline-block'
                }}
              >
                <div
                  style={{
                    width: `${page1FillPct}%`,
                    height: '100%',
                    background: page1FillPct > 85 ? '#facc15' : '#10b981',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                Page 1: {page1FillPct}% · {headroomPx}px headroom
              </span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <div
                className="cv-headroom-badge overflow"
                data-testid="headroom-gauge-overflow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#dc2626',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)'
                }}
                title={`Content exceeds 1123px A4 boundary by ${Math.abs(headroomPx)}px!`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                  Page 1 Overflow (+{Math.abs(headroomPx)}px)
                </span>
              </div>
              <button
                type="button"
                className="cv-btn-autotune"
                data-testid="autotune-fit-btn"
                onClick={handleAutoTune}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '0.28rem 0.6rem',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                  transition: 'background 0.15s ease'
                }}
                title="Automatically adjust line spacing and margins to fit on 1 page"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>auto_awesome</span>
                Auto Tune Fit
              </button>
            </div>
          )}
        </div>

        {/* Right Controls: Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button
            type="button"
            className={`cv-btn-ghost ${fitMode === 'fit-width' ? 'active' : ''}`}
            onClick={() => { setFitMode('fit-width'); calculateScale(); }}
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
          >
            Fit Width
          </button>

          <button
            type="button"
            className={`cv-btn-ghost ${fitMode === 'fit-page' ? 'active' : ''}`}
            onClick={() => { setFitMode('fit-page'); calculateScale(); }}
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
          >
            Fit Page
          </button>

          <button
            type="button"
            className="cv-btn-ghost"
            onClick={() => {
              setFitMode('custom');
              setZoomLevel(prev => Math.max(0.3, prev - 0.1));
            }}
            style={{ padding: '0.25rem 0.45rem' }}
            title="Zoom Out"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
          </button>

          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            className="cv-btn-ghost"
            onClick={() => {
              setFitMode('custom');
              setZoomLevel(prev => Math.min(1.5, prev + 0.1));
            }}
            style={{ padding: '0.25rem 0.45rem' }}
            title="Zoom In"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          </button>

          {onOpenFullscreen && (
            <button
              type="button"
              className="cv-btn-ghost"
              onClick={onOpenFullscreen}
              style={{ padding: '0.25rem 0.45rem', marginLeft: '0.3rem' }}
              title="Fullscreen Preview"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Word Selection Formatting Ribbon */}
      {floatingToolbar && (
        <div
          className="cv-floating-word-toolbar"
          data-testid="floating-word-toolbar"
          style={{
            position: 'absolute',
            top: `${floatingToolbar.top}px`,
            left: `${floatingToolbar.left}px`,
            transform: 'translate(-50%, -100%)',
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '8px',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
            zIndex: 999,
            border: '1px solid #cbd5e1',
            userSelect: 'none'
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('bold'); }}
            data-testid="format-bold-btn"
            title="Bold (Ctrl+B)"
            style={{ fontWeight: 'bold', minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px' }}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('italic'); }}
            data-testid="format-italic-btn"
            title="Italic (Ctrl+I)"
            style={{ fontStyle: 'italic', minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px' }}
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('underline'); }}
            data-testid="format-underline-btn"
            title="Underline (Ctrl+U)"
            style={{ textDecoration: 'underline', minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px' }}
          >
            U
          </button>
          <div style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 2px' }} />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleToggleCase(); }}
            data-testid="format-case-btn"
            title="Change Case (UPPER / lower / Capitalize)"
            style={{ fontSize: '11px', fontWeight: '600', minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px' }}
          >
            Aa
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('insertUnorderedList'); }}
            data-testid="format-bullet-btn"
            title="Bullet List"
            style={{ minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>format_list_bulleted</span>
          </button>
          <div style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 2px' }} />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('justifyLeft'); }}
            title="Align Left"
            style={{ minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>format_align_left</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execIframeCmd('justifyCenter'); }}
            title="Align Center"
            style={{ minWidth: '24px', height: '24px', border: 'none', background: 'transparent', color: '#1e293b', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>format_align_center</span>
          </button>
        </div>
      )}

      {/* Preview Scroll Viewport */}
      <div
        className="cv-preview-viewport"
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem',
          background: 'var(--bg-tertiary, #f1f5f9)',
          gap: '0'
        }}
      >
        {/* Word Top Margin Ruler */}
        {showRuler && (
          <div
            className="cv-word-ruler"
            data-testid="word-margin-ruler"
            style={{
              width: `${794 * scale}px`,
              height: '24px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderBottom: 'none',
              borderRadius: '4px 4px 0 0',
              position: 'relative',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.04)',
              flexShrink: 0
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((inch) => {
                const leftPct = (inch / 8.27) * 100;
                return (
                  <React.Fragment key={inch}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        bottom: 0,
                        width: '1px',
                        height: '14px',
                        background: '#64748b'
                      }}
                    />
                    {inch > 0 && inch < 8 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: '1px',
                          transform: 'translateX(-50%)',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          fontWeight: '600',
                          color: '#475569'
                        }}
                      >
                        {inch}
                      </span>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${((inch + 0.5) / 8.27) * 100}%`,
                        bottom: 0,
                        width: '1px',
                        height: '7px',
                        background: '#94a3b8'
                      }}
                    />
                  </React.Fragment>
                );
              })}
              {/* Left Margin Marker */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(currentMargin / 794) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '6px',
                  transform: 'translateX(-50%)',
                  background: 'var(--brand-primary, #2563eb)',
                  borderRadius: '2px',
                  cursor: 'ew-resize',
                  zIndex: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
                title={`Left Margin: ${currentMargin}px`}
              />
              {/* Right Margin Marker */}
              <div
                style={{
                  position: 'absolute',
                  right: `${(currentMargin / 794) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '6px',
                  transform: 'translateX(50%)',
                  background: 'var(--brand-primary, #2563eb)',
                  borderRadius: '2px',
                  cursor: 'ew-resize',
                  zIndex: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
                title={`Right Margin: ${currentMargin}px`}
              />
            </div>
          </div>
        )}

        {/* Paper Sheet Shadow Wrapper */}
        <div
          className="cv-paper-shadow-wrapper"
          style={{
            width: `${794 * scale}px`,
            height: `${contentHeight * scale}px`,
            position: 'relative',
            boxShadow: hasDiscretePage2 ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            borderRadius: showRuler ? '0 0 4px 4px' : '4px',
            background: hasDiscretePage2 ? 'transparent' : '#ffffff',
            transition: 'width 0.15s ease, height 0.15s ease'
          }}
        >
          {displayHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={displayHtml}
              title="Resume Live Preview"
              onLoad={handleIframeLoad}
              style={{
                width: '794px',
                height: `${contentHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 'none',
                overflow: 'hidden',
                background: hasDiscretePage2 ? 'transparent' : '#ffffff'
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Generating live document preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
