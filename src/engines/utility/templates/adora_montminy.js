// ═══════════════════════════════════════════════════════════════════════════════
// ADORA MONTMINY — Exact Pixel-Perfect Replica of media_1787663074998.png
// Gradient Blue & Slate Diagonal Cut, Halo Avatar, Bracket Timeline
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdoraMontminyHtml(
  data = {},
  themeColor = '#1d8cf8',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const gradientStart = themeColor === 'default' || !themeColor ? '#1d8cf8' : themeColor;
  const gradientEnd = '#38bdf8';
  const slateDark = '#1f2937';
  const sidebarBg = '#f0f2f5';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();
  const websiteText = (safeData.website || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();
  const photoSrc = (safeData.photoUrl || '').trim();

  const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const langSection = customSections.find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const otherCustomSections = customSections.filter(cs => cs !== langSection);
  const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);

  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  const summaryHtml = summaryText ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <span class="section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</span>
      </div>
      <div class="summary-p" data-df-field="summary">${summaryText}</div>
    </div>
  ` : '';

  const contactHtml = hasContact ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
        <span class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</span>
      </div>
      <div class="contact-list">
        ${phoneText ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            <span data-df-field="phone">${phoneText}</span>
          </div>
        ` : ''}
        ${emailText ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a>
          </div>
        ` : ''}
        ${locationText ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span data-df-field="location">${locationText}</span>
          </div>
        ` : ''}
        ${websiteText ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
        ${linkedinText ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z"/></svg>
            <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const skillsHtml = skillsList.length ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        <span class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</span>
      </div>
      <ul class="bullet-list">
        ${skillsList.map((s, idx) => {
          const sName = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
          return `<li data-df-field="skill:${idx}">${sName}</li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  const languageHtml = langList.length ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
        <span>Language</span>
      </div>
      <ul class="bullet-list">
        ${langList.map((l, idx) => `<li data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${l.title || ''}${l.value ? `: <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const certHtml = certList.length ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        <span class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</span>
      </div>
      <ul class="bullet-list">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        <span class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</span>
      </div>
      <div class="bracket-list">
        ${educationList.map((e, idx) => `
          <div class="bracket-item">
            <div class="bracket-dot-top"></div>
            <div class="bracket-dot-bottom"></div>
            <div class="b-date" data-df-field="edu:${idx}:date">(${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')})</div>
            <div class="b-inst" data-df-field="edu:${idx}:school">${e.school || ''}</div>
            <div class="b-deg" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
            ${e.note ? `<div class="b-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const expHtml = experienceList.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
        <span class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</span>
      </div>
      <div class="bracket-list">
        ${experienceList.map((e, idx) => {
          const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
          return `
          <div class="bracket-item">
            <div class="bracket-dot-top"></div>
            <div class="bracket-dot-bottom"></div>
            <div class="b-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
            <div class="b-date"><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
            ${bullets.length > 0 ? `
              <ul class="b-desc">
                ${bullets.map((h, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${h.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = projectList.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
        <span class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</span>
      </div>
      <div class="bracket-list">
        ${projectList.map((p, idx) => `
          <div class="bracket-item">
            <div class="bracket-dot-top"></div>
            <div class="bracket-dot-bottom"></div>
            <div class="b-role" data-df-field="proj:${idx}:name">${p.name || ''}</div>
            ${p.url ? `<div class="b-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${gradientStart}; text-decoration: none; font-size: 8.5pt;">${p.url}</a></div>` : ''}
            ${p.description ? `<div class="b-deg" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const refHtml = referenceList.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        <span class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 8.5pt; color: #475569;">
            <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #0f172a;">${r.name || ''}</div>
            <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
            <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const customHtml = otherCustomSections.map(cs => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <div class="main-block">
        <div class="main-heading">
          <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          <span>${cs.title || 'Additional Information'}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.5pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      margin: 0;
      padding: 0;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page, #main-container {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, #main-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    /* Top Gradient & Slate Shapes */
    .top-shapes {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 110px;
      z-index: 1;
      overflow: hidden;
    }
    .shape-gradient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 110px;
      background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
      clip-path: polygon(0 0, 100% 0, 100% 40%, 0 100%);
    }
    .shape-dark-wedge {
      position: absolute;
      top: 0;
      right: 0;
      width: 48%;
      height: 110px;
      background: ${slateDark};
      clip-path: polygon(35% 0, 100% 0, 100% 100%, 0 0);
    }
    
    /* Header Area */
    .header-area {
      position: relative;
      z-index: 5;
      display: flex;
      padding: ${15 + pageMargin}px 35px 12px 35px;
      align-items: center;
      gap: 30px;
      min-height: 195px;
    }
    .avatar-wrapper {
      width: 38%;
      display: flex;
      justify-content: center;
      flex-shrink: 0;
      padding-top: 10px;
    }
    .avatar-mask {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 5px solid #ffffff;
      box-shadow: 0 8px 22px rgba(0,0,0,0.12);
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .name-title-box {
      flex: 1;
      padding-top: 65px;
    }
    .name-title-box h1 {
      font-size: 28pt;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.05;
      letter-spacing: -0.5px;
    }
    .name-title-box .job-title {
      font-size: 11pt;
      font-weight: 500;
      color: #475569;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }
    
    /* 2-Column Content */
    .content-body {
      position: relative;
      z-index: 4;
      display: flex;
      flex: 1;
      height: calc(1123px - 210px);
    }
    
    /* Left Sidebar (38%) */
    .left-col {
      width: 38%;
      background: ${sidebarBg};
      padding: 15px 24px 40px 35px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .sidebar-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .block-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .head-icon {
      width: 16px;
      height: 16px;
      color: ${gradientStart};
      flex-shrink: 0;
    }
    .summary-p {
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 8.5pt;
      color: #334155;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      word-break: break-all;
    }
    .c-svg {
      width: 14px;
      height: 14px;
      color: ${gradientStart};
      flex-shrink: 0;
    }
    .bullet-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .bullet-list li {
      line-height: 1.3;
    }
    
    /* Right Column (62%) */
    .right-col {
      width: 62%;
      background: #ffffff;
      padding: 15px 35px 40px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .main-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .main-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .main-icon {
      width: 18px;
      height: 18px;
      color: ${gradientStart};
      flex-shrink: 0;
    }
    
    /* Bracket Timeline Items */
    .bracket-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-left: 6px;
    }
    .bracket-item {
      position: relative;
      border-left: 1.5px solid #cbd5e1;
      padding-left: 18px;
      padding-top: 1px;
      padding-bottom: 4px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .bracket-dot-top {
      position: absolute;
      top: -1px;
      left: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${gradientStart};
    }
    .bracket-dot-bottom {
      position: absolute;
      bottom: -1px;
      left: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${gradientStart};
    }
    .b-date {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 3px;
      font-variant-numeric: tabular-nums;
    }
    .b-inst, .b-role {
      font-size: 8.8pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .b-deg, .b-comp {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 2px;
    }
    .b-note {
      font-size: 8.2pt;
      color: #64748b;
    }
    .b-desc {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
      margin-top: 4px;
    }
    .b-desc li {
      margin-bottom: 2px;
    }
    
    /* Bottom Gradient Shape */
    .bottom-shapes {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 36px;
      z-index: 10;
      overflow: hidden;
    }
    .foot-gradient {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 36px;
      background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
      clip-path: polygon(0 40%, 80% 0, 100% 15%, 100% 100%, 0 100%);
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
      }
      .cv-page, #main-container {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child, #main-container:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
<div class="cv-page" id="main-container">
  <div class="top-shapes">
    <div class="shape-gradient"></div>
    <div class="shape-dark-wedge"></div>
  </div>
  
  <div class="header-area">
    <div class="avatar-wrapper">
      ${photoSrc ? `
        <div class="avatar-mask">
          <img class="avatar" src="${photoSrc}" alt="${name || 'Photo'}" />
        </div>
      ` : ''}
    </div>
    <div class="name-title-box">
      <h1 data-df-field="name">${name ? name.replace(' ', '<br>') : ''}</h1>
      <div class="candidate-title job-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
    </div>
  </div>
  
  <div class="content-body">
    <div class="left-col">
      ${summaryHtml}
      ${contactHtml}
      ${skillsHtml}
      ${languageHtml}
      ${certHtml}
    </div>
    
    <div class="right-col">
      ${eduHtml}
      ${expHtml}
      ${projHtml}
      ${refHtml}
      ${customHtml}
    </div>
  </div>
  
  <div class="bottom-shapes">
    <div class="foot-gradient"></div>
  </div>
</div>
</body>
</html>`;
}
