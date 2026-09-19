// ═══════════════════════════════════════════════════════════════════════════════
// JONATHAN PATTERSON — Exact 1:1 Pixel-Perfect Replica from User Template
// Top-Right Navy Curve (${navyColor}), Left Arch Dome Sidebar, Donut Gauges & Pill Headers
// ═══════════════════════════════════════════════════════════════════════════════

export function generateJonathanPattersonHtml(
  data,
  themeColor = '#1b324d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.4
) {
  const navyColor = themeColor === 'default' || !themeColor ? '#1b324d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const rawName = (data.name || '').toUpperCase().trim();
  const nameParts = rawName ? rawName.split(' ').filter(Boolean) : [];
  const nameFormatted = nameParts.length > 1 ? `${nameParts[0]}<br>${nameParts.slice(1).join(' ')}` : (rawName || '');

  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const websiteText = data.website || '';
  const locationText = data.location || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || websiteText || locationText || linkedinText);

  const skillsList = (data.skills && data.skills.length) ? data.skills.map((s) => typeof s === 'string' ? s : s.name || '').filter(Boolean) : [];

  const customLangs = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages')?.items || (data.custom_languages || []);

  const gauges = customLangs.slice(0, 3).map((l, i) => {
    let name = typeof l === 'string' ? l : (l.title || l.name || 'Language');
    let pct = 100;
    const levelStr = typeof l === 'object' ? (l.value || l.level || '') : '';
    if (levelStr) {
      const num = parseInt(levelStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) pct = Math.min(100, Math.max(10, num));
    } else if (i === 1) pct = 75;
    else if (i === 2) pct = 70;

    const circumference = 113.1; // 2 * pi * 18
    const offset = circumference - (circumference * pct) / 100;
    return { name, pct: `${pct}%`, offset: offset.toFixed(2) };
  });

  const educationList = (data.education && data.education.length) ? data.education : [];
  const experienceList = (data.experience && data.experience.length) ? data.experience : [];
  const referenceList = (data.references && data.references.length) ? data.references : [];
  const projectsList = (data.projects && data.projects.length) ? data.projects : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
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

    /* Fixed A4 Page Container (794px x 1123px) */
    .cv-page, .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      display: flex;
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

    /* Top-Right Navy Accent Block */
    .top-right-navy {
      position: absolute;
      top: 0;
      right: 0;
      width: 310px;
      height: 255px;
      background-color: ${navyColor};
      border-bottom-left-radius: 95px;
      z-index: 1;
    }

    /* Arch Capsule Profile Photo */
    .photo-wrapper {
      position: absolute;
      top: 90px;
      right: 85px;
      width: 195px;
      height: 255px;
      border-radius: 100px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 5;
      background-color: #ffffff;
    }

    .avatar-mask {
      width: 100%;
      height: 100%;
      border-radius: 100px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .profile-photo, .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Top-Left Candidate Header */
    .header-text-block {
      position: absolute;
      top: 75px;
      left: 48px;
      z-index: 2;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: ${navyColor};
      line-height: 1.05;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 15.5px;
      font-weight: 700;
      color: ${navyColor};
      margin-top: 10px;
      letter-spacing: 0.2px;
    }

    /* Left Sidebar Arch Container */
    .sidebar-arch {
      position: absolute;
      top: 245px;
      left: 20px;
      width: 280px;
      height: 855px;
      background-color: ${navyColor};
      border-top-left-radius: 140px;
      border-top-right-radius: 140px;
      border-bottom-left-radius: 18px;
      border-bottom-right-radius: 18px;
      padding: 72px 24px 25px 24px;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 18px;
      z-index: 3;
    }

    .sidebar-section-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: 0.2px;
    }

    .about-text {
      font-size: 9.5px;
      line-height: 1.5;
      color: #d7e2ee;
      text-align: justify;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10px;
      color: #ffffff;
      font-weight: 500;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: #ffffff;
      flex-shrink: 0;
    }

    /* Skills Bullet List */
    .skills-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .skills-list li {
      font-size: 10px;
      color: #ffffff;
      font-weight: 500;
    }

    /* Language Donut Gauges */
    .language-section {
      margin-top: 2px;
    }

    .language-gauges-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
    }

    .gauge-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .gauge-title {
      font-size: 9.5px;
      font-weight: 500;
      color: #d7e2ee;
    }

    .gauge-circle {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gauge-circle svg {
      transform: rotate(-90deg);
      width: 44px;
      height: 44px;
    }

    .gauge-circle circle {
      fill: none;
      stroke-width: 3.5;
    }

    .gauge-bg {
      stroke: rgba(255, 255, 255, 0.2);
    }

    .gauge-fill {
      stroke: #ffffff;
      stroke-linecap: round;
    }

    .gauge-value {
      position: absolute;
      font-size: 8.5px;
      font-weight: 700;
      color: #ffffff;
    }

    /* Right Main Panel */
    .main-panel {
      position: absolute;
      top: 360px;
      left: 318px;
      width: 450px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      z-index: 3;
    }

    /* Rounded Outline Section Pill Headers */
    .section-pill-header {
      border: 1.5px solid #b8c7d9;
      border-radius: 15px;
      padding: 3px 18px;
      color: ${navyColor};
      font-size: 13.5px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 10px;
    }

    /* Experience Entries */
    .exp-list {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .exp-block {
      display: flex;
      flex-direction: column;
    }

    .exp-role-title {
      font-size: 11px;
      font-weight: 700;
      color: ${navyColor};
    }

    .exp-company-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1px;
      margin-bottom: 3px;
    }

    .exp-company {
      font-size: 11.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .exp-dates {
      font-size: 10px;
      font-weight: 700;
      color: ${navyColor};
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.2px;
      line-height: ${lineSpacing};
      color: #3b424e;
      text-align: justify;
    }

    /* Education Entries */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .edu-block {
      display: flex;
      flex-direction: column;
    }

    .edu-school-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .edu-school {
      font-size: 11.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .edu-dates {
      font-size: 10px;
      font-weight: 700;
      color: ${navyColor};
    }

    .edu-degree {
      font-size: 9.5px;
      font-style: italic;
      color: #4a5462;
      margin-top: 1px;
    }

    /* References Grid */
    .ref-row {
      display: flex;
      gap: 25px;
    }

    .ref-col {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .ref-name {
      font-size: 11.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .ref-title {
      font-size: 10px;
      color: #4a5462;
      margin-top: 1px;
      margin-bottom: 4px;
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
    <!-- Top-Right Navy Accent Block -->
    <div class="top-right-navy"></div>

    <!-- Arch Capsule Profile Photo -->
    ${photoSrc ? `
    <div class="photo-wrapper avatar-container">
      <div class="avatar-mask">
        <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
      </div>
    </div>
    ` : ''}

    <!-- Top-Left Candidate Header -->
    <div class="header-text-block">
      ${nameFormatted ? `<h1 class="candidate-name" data-df-field="name">${nameFormatted}</h1>` : ''}
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
    </div>

    <!-- Left Sidebar Arch Container -->
    <div class="sidebar-arch">
      ${summaryText ? `
      <!-- About Me -->
      <div class="sidebar-section">
        <div class="sidebar-section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</div>
        <div class="about-text" data-df-field="summary">
          ${summaryText}
        </div>
      </div>
      ` : ''}

      ${hasContact ? `
      <!-- Contact -->
      <div class="sidebar-section">
        <div class="sidebar-section-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</div>
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
          ${websiteText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
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
        <div class="sidebar-section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</div>
        <ul class="skills-list">
          ${skillsList.map((s, idx) => `<li data-df-field="skill:${idx}">${s}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${gauges.length > 0 ? `
      <!-- Language Donut Gauges -->
      <div class="sidebar-section language-section">
        <div class="sidebar-section-title section-heading" data-df-field="heading:custom_languages">${data.sectionTitles?.custom_languages || 'Language'}</div>
        <div class="language-gauges-row">
          ${gauges.map((g, i) => `
            <div class="gauge-col">
              <div class="gauge-circle">
                <svg viewBox="0 0 44 44">
                  <circle class="gauge-bg" cx="22" cy="22" r="18"/>
                  <circle class="gauge-fill" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="${g.offset}"/>
                </svg>
                <span class="gauge-value">${g.pct}</span>
              </div>
              <span class="gauge-title" data-df-field="custom:custom_languages:${i}:title">${g.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Right Main Panel -->
    <div class="main-panel">
      ${experienceList.length > 0 ? `
      <!-- Experience Section -->
      <div class="main-section">
        <div><span class="section-pill-header section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</span></div>
        <div class="exp-list">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
              <div class="exp-block">
                <div class="exp-role-title" data-df-field="exp:${idx}:role">${e.role || ''}</div>
                <div class="exp-company-row">
                  <span class="exp-company" data-df-field="exp:${idx}:company">${e.company || ''}</span>
                  <span class="exp-dates" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
                </div>
                ${bullets.length > 0 ? `
                <ul class="exp-bullets">
                  ${bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      ${educationList.length > 0 ? `
      <!-- Education Section -->
      <div class="main-section">
        <div><span class="section-pill-header section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</span></div>
        <div class="edu-list">
          ${educationList.map((e, idx) => `
            <div class="edu-block">
              <div class="edu-school-row">
                <span class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</span>
                <span class="edu-dates" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
              </div>
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}${e.note ? ` · ${e.note}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${projectsList.length > 0 ? `
      <!-- Projects Section -->
      <div class="main-section">
        <div><span class="section-pill-header section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</span></div>
        <div class="exp-list">
          ${projectsList.map((p, idx) => `
            <div class="exp-block">
              <div class="exp-company-row">
                <span class="exp-company" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                ${p.url ? `<span class="exp-dates" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div class="edu-degree" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References Section -->
      <div class="main-section">
        <div><span class="section-pill-header section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</span></div>
        <div class="ref-row">
          ${referenceList.map((r, idx) => `
            <div class="ref-col">
              <div class="ref-name" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="ref-title" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
              ${r.contact ? `<div class="edu-degree" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
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
