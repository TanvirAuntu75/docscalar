// ═══════════════════════════════════════════════════════════════════════════════
// ISABEL SCHUMACHER — Exact 1:1 Pixel-Perfect Replica from User Template
// Dark Charcoal Sidebar (#312f2e), Outer Halo Ring, & Dual-Node Bracket Timelines
// ═══════════════════════════════════════════════════════════════════════════════

export function generateIsabelSchumacherHtml(
  data,
  themeColor = '#312f2e',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const charcoalColor = themeColor === 'default' || !themeColor ? '#312f2e' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name splitting for two-line header
  const nameParts = (data.name || '').trim().split(' ').filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const locationText = data.location || '';
  const websiteText = data.website || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  const skillsList = (data.skills && data.skills.length) ? data.skills : [];
  const languageList = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages')?.items?.map(i => (typeof i === "string" ? i : (i.title || i.name || ""))) || (data.custom_languages || []);

  const educationList = (data.education && data.education.length) ? data.education : [];
  const experienceList = (data.experience && data.experience.length) ? data.experience : [];
  const projectsList = (data.projects && data.projects.length) ? data.projects : [];
  const referenceList = (data.references && data.references.length) ? data.references : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>
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
      width: 794px;
      min-height: 1123px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Canvas with Rounded Outer Corners */
    .cv-page, .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      margin: 0 auto 20px auto;
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
    }

    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-bottom: 0 !important;
    }

    /* Dark Charcoal Left Sidebar */
    .sidebar-bg {
      position: absolute;
      top: 155px;
      left: 0;
      width: 275px;
      height: 968px;
      background-color: ${charcoalColor};
      z-index: 1;
    }

    /* Outer Dark Halo Ring */
    .photo-dark-ring {
      position: absolute;
      top: 38px;
      left: 21px;
      width: 234px;
      height: 234px;
      border-radius: 50%;
      border: 7px solid ${charcoalColor};
      z-index: 2;
    }

    /* Avatar Masking Container */
    .avatar-container {
      position: absolute;
      top: 45px;
      left: 28px;
      width: 220px;
      height: 220px;
      z-index: 5;
    }

    .avatar-mask {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #ffffff;
    }

    .profile-photo, .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 305px;
      left: 0;
      width: 275px;
      padding: 0 25px 30px 28px;
      z-index: 3;
    }

    .sidebar-section {
      margin-bottom: 24px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .section-title-wrap svg {
      width: 20px;
      height: 20px;
      fill: #ffffff;
      flex-shrink: 0;
    }

    .section-title-wrap h2 {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.2px;
    }

    .about-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #d1cfcd;
      text-align: justify;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #edebe8;
      font-weight: 500;
    }

    .contact-item svg {
      width: 15px;
      height: 15px;
      fill: #ffffff;
      flex-shrink: 0;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .bullet-list li {
      font-size: 11px;
      color: #edebe8;
      font-weight: 500;
    }

    /* Right Main Panel Content */
    .main-panel {
      position: absolute;
      top: 0;
      left: 275px;
      width: 519px;
      padding: 75px 44px 35px 46px;
      z-index: 3;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.08;
      color: #2b2d2f;
      letter-spacing: -0.5px;
    }

    .candidate-title {
      font-size: 15px;
      font-weight: 500;
      color: #444444;
      margin-top: 8px;
      margin-bottom: 26px;
    }

    .main-section {
      margin-bottom: 22px;
    }

    .main-section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .main-section-title-wrap svg {
      width: 21px;
      height: 21px;
      fill: #2b2d2f;
      flex-shrink: 0;
    }

    .main-section-title-wrap h2 {
      font-size: 17.5px;
      font-weight: 700;
      color: #2b2d2f;
      letter-spacing: -0.2px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 10px;
    }

    .timeline-item {
      position: relative;
      padding-left: 24px;
    }

    /* Timeline Vertical Connector */
    .timeline-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${charcoalColor};
    }

    /* Timeline Top Node */
    .timeline-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    /* Timeline Bottom Node */
    .timeline-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .timeline-date {
      font-size: 13px;
      font-weight: 700;
      color: #2b2d2f;
      margin-bottom: 2px;
    }

    .timeline-org {
      font-size: 11.5px;
      font-weight: 700;
      color: #2b2d2f;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .timeline-deg {
      font-size: 11px;
      color: #555555;
      margin-top: 1px;
    }

    .timeline-sub {
      font-size: 11px;
      color: #444444;
      margin-top: 1px;
    }

    .timeline-bullets {
      font-size: 11px;
      line-height: ${lineSpacing};
      color: #3b3d40;
      padding-left: 15px;
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 3px;
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
        margin: 0 !important;
        width: 794px !important;
        height: 1123px !important;
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
<body>

  <div class="cv-page resume-canvas" id="page-1">
    <!-- Left Dark Sidebar Background -->
    <div class="sidebar-bg"></div>

    <!-- Outer Dark Halo Ring -->
    <div class="photo-dark-ring"></div>

    <!-- Circular Profile Photo -->
    ${photoSrc ? `
    <div class="avatar-container">
      <div class="avatar-mask">
        <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
      </div>
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
            <span data-df-field="location">${locationText}</span>
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
            <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 .01 3.25 1.63 1.63 0 0 0 0-3.25z"/></svg>
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
            const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
            return `<li data-df-field="skill:${idx}">${name}</li>`;
          }).join('')}
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
          ${languageList.map((l, idx) => `<li data-df-field="custom:custom_languages:${idx}:title">${typeof l === 'string' ? l : (l?.title || l?.name || 'Language')}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>

    <!-- Right Main Content Panel -->
    <div class="main-panel">
      ${(firstName || lastName) ? `<h1 class="candidate-name" data-df-field="name">${firstName}${lastName ? `<br>${lastName}` : ''}</h1>` : ''}
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>

      ${educationList.length > 0 ? `
      <!-- Education Section -->
      <div class="main-section">
        <div class="main-section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <h2 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
        </div>

        <div class="timeline">
          ${educationList.map((e, idx) => `
            <div class="timeline-item">
              <div class="timeline-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `(${e.start}${e.end ? ` – ${e.end}` : ''})` : '')}</div>
              <div class="timeline-org" data-df-field="edu:${idx}:school">${e.school || ''}</div>
              <div class="timeline-deg" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              ${e.note ? `<div class="timeline-deg">${e.note}</div>` : ''}
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${experienceList.length > 0 ? `
      <!-- Experience Section -->
      <div class="main-section">
        <div class="main-section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
        </div>

        <div class="timeline">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
              <div class="timeline-item">
                <div class="timeline-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
                <div class="timeline-date"><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
                ${bullets.length > 0 ? `
                <ul class="timeline-bullets">
                  ${bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
                ` : ''}
                <span class="node-bottom"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      ${projectsList.length > 0 ? `
      <!-- Projects Section -->
      <div class="main-section">
        <div class="main-section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
        </div>
        <div class="timeline">
          ${projectsList.map((p, idx) => `
            <div class="timeline-item">
              <div class="timeline-org" data-df-field="proj:${idx}:name">${p.name || ''}</div>
              ${p.url ? `<div class="timeline-sub" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></div>` : ''}
              ${p.description ? `<div class="timeline-deg" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References Section -->
      <div class="main-section">
        <div class="main-section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
        </div>
        <div class="timeline">
          ${referenceList.map((r, idx) => `
            <div class="timeline-item">
              <div class="timeline-org" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              ${r.relation ? `<div class="timeline-sub" data-df-field="ref:${idx}:relation">${r.relation}</div>` : ''}
              ${r.contact ? `<div class="timeline-deg" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  </div>

</body>
</html>`;
}
