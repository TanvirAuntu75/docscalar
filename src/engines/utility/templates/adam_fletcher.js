// ═══════════════════════════════════════════════════════════════════════════════
// ADAM FLETCHER — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with Full-Width Dark Slate Banner & Greyscale Halo
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdamFletcherHtml(
  data = {},
  themeColor = '#32353e',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const slateColor = themeColor === 'default' || !themeColor ? '#32353e' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const nameParts = name ? name.split(' ') : [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');

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
  const languageList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);

  const otherCustomSections = customSections.filter(cs => cs !== langSection);
  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: #ffffff;
      font-family: ${fontFam};
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Canvas (794px x 1123px) */
    .cv-page, .resume-canvas {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      background-color: #ffffff;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, .resume-canvas:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Full-height Left Sidebar Background */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 310px;
      height: 1123px;
      background-color: #dbdad8;
      z-index: 1;
    }

    /* Full-width Dark Slate Horizontal Banner */
    .dark-header-bar {
      position: absolute;
      top: 55px;
      left: 0;
      width: 794px;
      height: 175px;
      background-color: ${slateColor};
      z-index: 2;
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
    }

    /* Header Text Content */
    .header-text-container {
      position: absolute;
      top: 85px;
      left: 360px;
      z-index: 3;
    }

    .name-line-1 {
      font-size: 42px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 2px;
    }

    .name-line-2 {
      font-size: 38px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: 8px;
      margin-top: 4px;
    }

    .header-job-title {
      font-size: 16px;
      font-weight: 400;
      color: #ffffff;
      margin-top: 10px;
      letter-spacing: 0.3px;
    }

    /* Profile Photo Circle Mask */
    .profile-photo-mask.avatar-mask {
      position: absolute;
      top: 25px;
      left: 38px;
      width: 236px;
      height: 236px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
      z-index: 5;
      background-color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .profile-photo.avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      filter: grayscale(100%) contrast(105%);
      display: block;
    }

    /* Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 295px;
      left: 0;
      width: 310px;
      padding: 0 28px 30px 34px;
      z-index: 3;
    }

    .sidebar-section {
      margin-bottom: 22px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 11px;
    }

    .section-title-wrap svg {
      width: 20px;
      height: 20px;
      fill: #1f2228;
      flex-shrink: 0;
    }

    .section-title-wrap h2 {
      font-size: 17.5px;
      font-weight: 700;
      color: #1f2228;
      letter-spacing: -0.2px;
    }

    .about-text {
      font-size: 10.8px;
      line-height: ${lineSpacing};
      color: #3b3e45;
      text-align: justify;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 11.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    .contact-item svg {
      width: 15px;
      height: 15px;
      fill: #1f2228;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .contact-address {
      line-height: 1.35;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .bullet-list li {
      font-size: 11.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    /* Right Main Panel */
    .main-panel {
      position: absolute;
      top: 275px;
      left: 310px;
      width: 484px;
      padding: 0 44px 35px 42px;
      z-index: 3;
    }

    .main-section {
      margin-bottom: 22px;
    }

    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 10px;
    }

    .entry-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .entry-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background-color: #1f2228;
      flex-shrink: 0;
      margin-top: 3px;
    }

    .entry-body {
      flex: 1;
    }

    .entry-date {
      font-size: 13px;
      font-weight: 700;
      color: #1f2228;
      margin-bottom: 2px;
    }

    .entry-org {
      font-size: 11.5px;
      font-weight: 700;
      color: #1f2228;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .entry-sub {
      font-size: 11px;
      color: #4a4c52;
      margin-top: 1px;
    }

    .entry-bullets {
      font-size: 11px;
      line-height: ${lineSpacing};
      color: #3b3e45;
      padding-left: 15px;
      margin-top: 5px;
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      .cv-page, .resume-canvas {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child, .resume-canvas:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>

  <div class="cv-page resume-canvas" id="page-1">
    <!-- Full Height Left Sidebar Background -->
    <div class="sidebar-bg"></div>

    <!-- Full Width Dark Slate Horizontal Strip -->
    <div class="dark-header-bar"></div>

    <!-- Header Name & Title (Over Dark Strip) -->
    <div class="header-text-container">
      <div class="name-line-1" data-df-field="name">${firstName}</div>
      ${lastName ? `<div class="name-line-2" data-df-field="name">${lastName}</div>` : ''}
      <div class="candidate-title header-job-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
    </div>

    <!-- Circular Profile Photo -->
    ${photoSrc ? `
    <div class="profile-photo-mask avatar-mask">
      <img class="profile-photo avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}">
    </div>
    ` : ''}

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      ${summaryText ? `
      <!-- About Me -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <h2 class="section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</h2>
        </div>
        <p class="about-text" data-df-field="summary">
          ${summaryText}
        </p>
      </div>
      ` : ''}

      ${hasContact ? `
      <!-- Contact -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>
          <h2 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h2>
        </div>
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
            <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a>
          </div>
          ` : ''}
          ${locationText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span class="contact-address" data-df-field="location">${locationText}</span>
          </div>
          ` : ''}
          ${websiteText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
          </div>
          ` : ''}
          ${linkedinText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z"/></svg>
            <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      ${skillsList.length > 0 ? `
      <!-- Skills -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <h2 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h2>
        </div>
        <ul class="bullet-list">
          ${skillsList.map((s, idx) => {
            const sName = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
            return `<li data-df-field="skill:${idx}">${sName}</li>`;
          }).join('')}
        </ul>
      </div>
      ` : ''}

      ${certList.length > 0 ? `
      <!-- Certifications -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          <h2 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
        </div>
        <ul class="bullet-list">
          ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${languageList.length > 0 ? `
      <!-- Language -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
          <h2 class="section-heading" data-df-field="heading:custom_languages">${data.sectionTitles?.custom_languages || 'Language'}</h2>
        </div>
        <ul class="bullet-list">
          ${languageList.map((l, idx) => `<li data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${l.title || ''}${l.value ? `: <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>

    <!-- Right Main Panel Content -->
    <div class="main-panel">
      ${experienceList.length > 0 ? `
      <!-- Experience Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
        </div>

        <div class="entries-list">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
            <div class="entry-row">
              <div class="entry-dot"></div>
              <div class="entry-body">
                <div class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
                ${bullets.length > 0 ? `
                  <ul class="entry-bullets">
                    ${bullets.map((h, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${h.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      ${educationList.length > 0 ? `
      <!-- Education Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <h2 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
        </div>

        <div class="entries-list">
          ${educationList.map((e, idx) => `
            <div class="entry-row">
              <div class="entry-dot"></div>
              <div class="entry-body">
                <div class="entry-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
                <div class="entry-org" data-df-field="edu:${idx}:school">${e.school || ''}</div>
                <div class="entry-sub" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
                ${e.note ? `<div class="entry-sub">${e.note}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${projectList.length > 0 ? `
      <!-- Projects Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
          <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
        </div>

        <div class="entries-list">
          ${projectList.map((p, idx) => `
            <div class="entry-row">
              <div class="entry-dot"></div>
              <div class="entry-body">
                <div class="entry-org" data-df-field="proj:${idx}:name">${p.name || ''}</div>
                ${p.url ? `<div class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: inherit; text-decoration: none; font-size: 11px;">${p.url}</a></div>` : ''}
                ${p.description ? `<div class="entry-sub" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
          ${referenceList.map((r, idx) => `
            <div style="font-size: 11px;">
              <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #1f2228;">${r.name || ''}</div>
              <div data-df-field="ref:${idx}:relation" style="color: #4a4c52; font-style: italic;">${r.relation || ''}</div>
              <div data-df-field="ref:${idx}:contact" style="color: #3b3e45;">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${otherCustomSections.map(cs => {
        if (!cs || !cs.items || !cs.items.length) return '';
        return `
          <div class="main-section">
            <div class="section-title-wrap">
              <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              <h2 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin-top: 10px;">
              ${cs.items.map((i, idx) => `
                <div style="font-size: 11px;">
                  <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

</body>
</html>`;
}
