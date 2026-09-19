// ═══════════════════════════════════════════════════════════════════════════════
// ADELINE PALMERSTON — Exact 1:1 Pixel-Perfect Replica with Universal Multi-Page Engine
// Precision Fixed A4 Canvas (794px x 1123px) with Exact Multi-Polygon Vector Header
// ═══════════════════════════════════════════════════════════════════════════════

import { computeTwoPagePartition } from '../paginationEngine.js';
import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateAdelinePalmerstonHtml(
  data = {},
  themeColor = '#212f3d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const isObject = typeof themeColor === 'object' && themeColor !== null && !Array.isArray(themeColor);
  const slateColor = isObject ? (themeColor.primaryColor || themeColor.themeColor || '#212f3d') : (themeColor === 'default' || !themeColor ? '#212f3d' : themeColor);
  const bronzeColor = '#9d6842';
  const activeFont = isObject ? (themeColor.font || themeColor.themeFont || 'Plus Jakarta Sans') : (themeFont || 'Plus Jakarta Sans');
  const rawOrder = isObject ? (themeColor.sectionOrder || sectionOrder) : sectionOrder;
  const activeLayout = isObject ? (themeColor.themeLayout || themeLayout || 'auto') : (themeLayout || 'auto');
  const activeMargin = isObject ? (themeColor.pageMargin !== undefined ? themeColor.pageMargin : 0) : (pageMargin !== undefined ? pageMargin : 0);
  const activeSpacing = isObject ? (themeColor.lineSpacing !== undefined ? themeColor.lineSpacing : 1.45) : (lineSpacing !== undefined ? lineSpacing : 1.45);

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const nameParts = name ? name.split(' ') : [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');

  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const photoSrc = (safeData.photoUrl || '').trim();
  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();
  const websiteText = (safeData.website || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();

  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  // ── Universal Partitioning via Shared Pagination Engine ──
  const { partitions } = computeTwoPagePartition({
    data: safeData,
    sectionOrder: rawOrder,
    pageMargin: activeMargin,
    lineSpacing: activeSpacing,
    baseHeaderHeight: 120,
    totalPageHeight: 1043
  });

  // ── Render Helpers with Continuous Offset Indexing & data-df-field Attributes ──
  const renderExperienceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <h2 class="section-heading" data-df-field="heading:experience">${isContinuation ? (safeData.sectionTitles?.experience ? `${safeData.sectionTitles.experience} (Continued)` : 'Experience (Continued)') : (safeData.sectionTitles?.experience || 'Experience')}</h2>
        </div>
        <div class="timeline">
          ${items.map((e, idx) => {
            const actualIdx = globalOffset + idx;
            return `
              <div class="timeline-item">
                <div class="timeline-date" data-df-field="exp:${actualIdx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
                <div class="timeline-org"><span data-df-field="exp:${actualIdx}:company">${e.company || ''}</span>${locationText ? `<span class="timeline-loc"> · ${locationText}</span>` : ''}</div>
                <div class="timeline-deg" data-df-field="exp:${actualIdx}:role">${e.role || ''}</div>
                ${e.highlights && e.highlights.filter(Boolean).length ? `
                  <ul class="bullet-list" style="margin-top: 6px;">
                    ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${actualIdx}:highlight:${hIdx}">${h}</li>`).join('')}
                  </ul>
                ` : ''}
                <span class="node-bottom"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderProjectItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
          <h2 class="section-heading" data-df-field="heading:projects">${isContinuation ? (safeData.sectionTitles?.projects ? `${safeData.sectionTitles.projects} (Continued)` : 'Projects (Continued)') : (safeData.sectionTitles?.projects || 'Projects')}</h2>
        </div>
        <div class="timeline">
          ${items.map((p, idx) => {
            const actualIdx = globalOffset + idx;
            return `
              <div class="timeline-item">
                <div class="timeline-org" data-df-field="proj:${actualIdx}:name">${p.name || ''}</div>
                ${p.url ? `<div class="timeline-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${actualIdx}:url" style="color: ${slateColor}; text-decoration: none; font-size: 11px;">${p.url}</a></div>` : ''}
                ${p.description ? `<div class="timeline-deg" data-df-field="proj:${actualIdx}:description" style="margin-top: 3px;">${p.description}</div>` : ''}
                <span class="node-bottom"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderCertItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          <h2 class="section-heading" data-df-field="heading:certifications">${isContinuation ? (safeData.sectionTitles?.certifications ? `${safeData.sectionTitles.certifications} (Continued)` : 'Certifications (Continued)') : (safeData.sectionTitles?.certifications || 'Certifications')}</h2>
        </div>
        <ul class="bullet-list" style="padding-left: 20px;">
          ${items.map((c, idx) => {
            const actualIdx = globalOffset + idx;
            return `<li data-df-field="cert:${actualIdx}">${typeof c === 'object' ? c.name || '' : c}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  };

  const renderReferenceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <h2 class="section-heading" data-df-field="heading:references">${isContinuation ? (safeData.sectionTitles?.references ? `${safeData.sectionTitles.references} (Continued)` : 'References (Continued)') : (safeData.sectionTitles?.references || 'References')}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
          ${items.map((r, idx) => {
            const actualIdx = globalOffset + idx;
            return `
              <div style="font-size: 11px; color: #555;">
                <div style="font-weight: 700; color: #222;" data-df-field="ref:${actualIdx}:name">${r.name || ''}</div>
                <div style="font-style: italic;" data-df-field="ref:${actualIdx}:relation">${r.relation || ''}</div>
                <div data-df-field="ref:${actualIdx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderCustomSection = (cs) => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <h2 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 11px;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderEducation = () => {
    const educationList = Array.isArray(safeData.education) ? safeData.education : [];
    if (!educationList.length) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <h2 class="section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h2>
        </div>
        <div class="timeline">
          ${educationList.map((edu, idx) => `
            <div class="edu-item">
              <div class="edu-year" data-df-field="edu:${idx}:date">${edu.date || (edu.start ? `${edu.start}${edu.end ? ` – ${edu.end}` : ''}` : '')}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${edu.school || ''}</div>
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${edu.degree || ''}</div>
              ${edu.note ? `<div class="edu-degree" style="font-style: italic; color: #888;">${edu.note}</div>` : ''}
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderSummary = () => {
    if (!summaryText) return '';
    return `
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <h2 class="section-heading" data-df-field="heading:summary">${safeData.sectionTitles?.summary || 'About Me'}</h2>
        </div>
        <div class="about-text" data-df-field="summary">
          ${summaryText}
        </div>
      </div>
    `;
  };

  const renderSkillsSidebar = () => {
    const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
    if (!skillsList.length) return '';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Skills'}</h3>
        <ul class="bullet-list">
          ${skillsList.map((skill, idx) => {
            const skillName = typeof skill === 'string' ? skill : (skill.name || '');
            return `<li data-df-field="skill:${idx}">${skillName}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  };

  const renderContactSidebar = () => {
    if (!hasContact) return '';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="heading:contact">${safeData.sectionTitles?.contact || 'Contact'}</h3>
        <div class="contact-list">
          ${phoneText ? `
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              <span data-df-field="phone">${phoneText}</span>
            </div>
          ` : ''}
          ${emailText ? `
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <a href="mailto:${emailText}" style="color: inherit; text-decoration: none;" data-df-field="email">${emailText}</a>
            </div>
          ` : ''}
          ${locationText ? `
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span data-df-field="location">${locationText}</span>
            </div>
          ` : ''}
          ${linkedinText ? `
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.66 1.66 0 1 0 0 3.32 1.66 1.66 0 0 0 0-3.32z"/></svg>
              <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;" data-df-field="linkedin">${linkedinText.replace(/^https?:\/\//, '')}</a>
            </div>
          ` : ''}
          ${websiteText ? `
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;" data-df-field="website">${websiteText.replace(/^https?:\/\//, '')}</a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  const renderContactBar = () => {
    if (!hasContact) return '';
    const parts = [];
    if (phoneText) parts.push(`<span data-df-field="phone">${phoneText}</span>`);
    if (emailText) parts.push(`<a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>`);
    if (locationText) parts.push(`<span data-df-field="location">${locationText}</span>`);
    if (websiteText) parts.push(`<a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>`);
    if (linkedinText) parts.push(`<a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>`);
    return `<div class="contact-bar-single" style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 9.5px; color: #555; margin-top: 6px; margin-bottom: 14px;">${parts.join(' · ')}</div>`;
  };

  const renderLangSidebar = () => {
    const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
    const items = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);
    if (!items.length) return '';
    return `
      <div class="sidebar-section">
        <h3 data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:title">${langSection?.title || 'Languages'}</h3>
        <ul class="bullet-list">
          ${items.map((item, idx) => `
            <li data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}">${typeof item === 'string' ? item : (item.name || item.title || item.value || '')}</li>
          `).join('')}
        </ul>
      </div>
    `;
  };

  const renderers = {
    summary: () => renderSummary(),
    experience: (items, isCont, offset) => renderExperienceItems(items || safeData.experience, isCont, offset),
    education: () => renderEducation(),
    skills: () => renderSkillsSidebar(),
    projects: (items, isCont, offset) => renderProjectItems(items || safeData.projects, isCont, offset),
    certifications: (items, isCont, offset) => renderCertItems(items || safeData.certifications, isCont, offset),
    references: (items, isCont, offset) => renderReferenceItems(items || safeData.references, isCont, offset),
    custom: (cs) => renderCustomSection(cs),
    custom_languages: () => renderLangSidebar(),
    contact: () => renderContactSidebar()
  };

  const runtime = renderUniversalOrderedSections(safeData, {
    primaryColor: slateColor,
    font: activeFont,
    sectionOrder: rawOrder,
    themeLayout: activeLayout,
    pageMargin: activeMargin,
    lineSpacing: activeSpacing,
    partitions
  }, renderers, {
    sidebarKeys: ['contact', 'skills', 'custom_languages']
  });

  const isSplit = activeLayout !== 'single';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  ${runtime.googleFontsLink}
  <style>
    @page { margin: 0; size: A4; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: transparent;
      font-family: ${runtime.fontFamilyCss};
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      line-height: ${runtime.adjustedLineSpacing};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cv-page {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      background-color: #ffffff;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border-radius: 4px;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .cv-page-white {
      display: block !important;
      background: #ffffff !important;
      padding: ${44 + activeMargin}px 50px !important;
    }

    .page-2-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Left Sidebar Base Color */
    .bg-sidebar {
      position: absolute;
      top: 76px;
      left: 0;
      width: 340px;
      bottom: 0;
      background-color: #f3f1ec;
      z-index: 1;
    }

    /* Vector Top Header Graphics */
    .top-decorations {
      position: absolute;
      top: 0;
      left: 0;
      width: 794px;
      height: 76px;
      z-index: 2;
      pointer-events: none;
    }

    /* Vector Bottom Footer Graphics */
    .bottom-decorations {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 794px;
      height: 32px;
      z-index: 2;
      pointer-events: none;
    }

    /* Circular Profile Photo Mask */
    .profile-photo-mask.avatar-mask {
      position: absolute;
      top: 30px;
      left: 55px;
      width: 230px;
      height: 230px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
      z-index: 5;
      background-color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .profile-photo.avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 295px;
      left: 0;
      width: 340px;
      padding: 0 34px 30px 38px;
      z-index: 3;
    }

    .sidebar-section {
      margin-bottom: 24px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .section-title-wrap svg {
      width: 18px;
      height: 18px;
      fill: ${slateColor};
      flex-shrink: 0;
    }

    .section-title-wrap h2 {
      font-size: 16.5px;
      font-weight: 700;
      color: ${slateColor};
      letter-spacing: -0.2px;
    }

    .about-text {
      font-size: 10.5px;
      line-height: ${Math.min(activeSpacing, 1.38)};
      color: #333333;
      text-align: justify;
    }

    .sidebar-section h3 {
      font-size: 16.5px;
      font-weight: 700;
      color: ${slateColor};
      margin-bottom: 12px;
      letter-spacing: -0.2px;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #333333;
      word-break: break-word;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: ${slateColor};
      flex-shrink: 0;
    }

    .bullet-list {
      list-style-type: square;
      padding-left: 16px;
      font-size: 11.5px;
      color: #333333;
    }

    .bullet-list li {
      margin-bottom: 4px;
      line-height: 1.3;
    }

    /* Right Main Panel */
    .main-panel {
      position: absolute;
      top: 0;
      left: 340px;
      right: 0;
      bottom: 0;
      padding: ${75 + activeMargin}px 46px 30px 42px;
      z-index: 3;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    body.layout-single .main-panel {
      position: static;
      left: 0;
      width: 100%;
      padding: ${44 + activeMargin}px 48px;
    }

    .candidate-name {
      font-size: 34px;
      font-weight: 800;
      line-height: 1.02;
      color: ${slateColor};
      letter-spacing: -0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .candidate-title {
      font-size: 12.5px;
      font-weight: 600;
      color: ${bronzeColor};
      letter-spacing: 2.2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .main-section {
      break-inside: avoid;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .timeline-item {
      position: relative;
      padding-left: 22px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${slateColor};
    }

    .timeline-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${slateColor};
    }

    .timeline-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${slateColor};
    }

    .timeline-date {
      font-size: 13.5px;
      font-weight: 700;
      color: ${slateColor};
      letter-spacing: -0.2px;
      margin-bottom: 1px;
    }

    .timeline-org {
      font-size: 12px;
      font-weight: 700;
      color: ${bronzeColor};
      margin-bottom: 2px;
    }

    .timeline-deg {
      font-size: 11px;
      color: #555555;
      line-height: 1.25;
    }

    .edu-item {
      position: relative;
      padding-left: 22px;
      margin-bottom: 10px;
    }

    .edu-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${slateColor};
    }

    .edu-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${slateColor};
    }

    .edu-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${slateColor};
    }

    .edu-year {
      font-size: 13px;
      font-weight: 700;
      color: ${slateColor};
      margin-bottom: 1px;
    }

    .edu-school {
      font-size: 11.5px;
      font-weight: 700;
      color: ${bronzeColor};
      margin-bottom: 1px;
    }

    .edu-degree {
      font-size: 10.5px;
      color: #555555;
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        gap: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .cv-page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body class="${runtime.layoutClass}">

  <!-- Page 1 Sheet -->
  <div class="cv-page" id="page-1">
    ${isSplit ? `
      <!-- Left Sidebar Base Color -->
      <div class="bg-sidebar"></div>

      <!-- Top Vector Polygon Art -->
      <svg class="top-decorations" viewBox="0 0 794 76" preserveAspectRatio="none">
        <polygon points="0,0 794,0 794,76 340,76 340,55 0,55" fill="${slateColor}"/>
        <polygon points="0,55 340,55 340,76 0,76" fill="${bronzeColor}"/>
      </svg>

      <!-- Bottom Vector Polygon Art -->
      <svg class="bottom-decorations" viewBox="0 0 794 32" preserveAspectRatio="none">
        <polygon points="0,12 340,12 340,0 794,0 794,32 0,32" fill="${slateColor}"/>
        <polygon points="0,0 340,0 340,12 0,12" fill="${bronzeColor}"/>
      </svg>

      <!-- Profile Photo -->
      ${photoSrc ? `
        <div class="profile-photo-mask avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="Profile Photo" />
        </div>
      ` : ''}

      <!-- Left Sidebar Content -->
      <div class="sidebar-content">
        ${renderContactSidebar()}
        ${runtime.sidebarHtml}
      </div>
    ` : ''}

    <!-- Right Main Panel -->
    <div class="main-panel">
      <div class="candidate-name" data-df-field="name">${firstName}${lastName ? `<br>${lastName}` : ''}</div>
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      ${!isSplit ? renderContactBar() : ''}

      ${runtime.p1MainHtml}
    </div>
  </div>

  <!-- Page 2 Sheet (Clean Full-Width Sheet) -->
  ${runtime.hasPage2 ? `
    <div class="cv-page cv-page-white" id="page-2">
      <div class="page-2-body">
        ${runtime.p2MainHtml}
      </div>
    </div>
  ` : ''}

</body>
</html>`;
}
