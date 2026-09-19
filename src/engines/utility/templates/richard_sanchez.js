// ═══════════════════════════════════════════════════════════════════════════════
// RICHARD SANCHEZ — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with Royal Blue Banner, Dark Sidebar, & Solid/Border Pill Badges
// ═══════════════════════════════════════════════════════════════════════════════

export function generateRichardSanchezHtml(
  data,
  themeColor = '#0b3b8c',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const blueColor = themeColor === 'default' || !themeColor ? '#0b3b8c' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name uppercase two-line header
  const nameParts = (data.name || '').trim().split(' ').filter(Boolean);
  const firstName = nameParts.length ? nameParts[0].toUpperCase() : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ').toUpperCase() : '';

  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const locationText = data.location || '';
  const websiteText = data.website || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  const languageList = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages')?.items?.map(i => (typeof i === "string" ? i : (i.title || i.name || ""))) || (data.custom_languages || []);
  const expertiseList = (data.skills && data.skills.length) ? data.skills : [];
  const experienceList = (data.experience && data.experience.length) ? data.experience : [];
  const educationList = (data.education && data.education.length) ? data.education : [];
  const referenceList = (data.references && data.references.length) ? data.references : [];
  const projectsList = (data.projects && data.projects.length) ? data.projects : [];

  const skillsBars = (data.skills || []).map(s => {
    let name = typeof s === 'string' ? s : s.name || '';
    let percent = 80;
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      const levelStr = parts[1].toLowerCase();
      if (levelStr.includes('expert') || levelStr.includes('native')) percent = 95;
      else if (levelStr.includes('advanced')) percent = 85;
      else if (levelStr.includes('intermediate')) percent = 70;
      else percent = 50;
    }
    return { name, percent };
  }).filter(s => s.name).slice(0, 4);

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
      min-height: 1123px;
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

    /* Full-Height Left Dark Sidebar */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 305px;
      height: 1123px;
      background-color: #17181c;
      z-index: 1;
    }

    /* Horizontal Royal Blue Header Banner */
    .top-blue-banner {
      position: absolute;
      top: 108px;
      left: 0;
      width: 794px;
      height: 140px;
      background: ${blueColor};
      z-index: 2;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
    }

    /* Profile Photo Circle */
    .avatar-container {
      position: absolute;
      top: 78px;
      left: 82px;
      width: 175px;
      height: 175px;
      z-index: 5;
    }

    .avatar-mask {
      width: 175px;
      height: 175px;
      border-radius: 50%;
      border: 6px solid #ffffff;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
      background-color: #ffffff;
    }

    .profile-photo, .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Header Text in Blue Banner */
    .header-info {
      position: absolute;
      top: 122px;
      left: 335px;
      z-index: 3;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.05;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 14px;
      font-weight: 400;
      color: #cbdcf8;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 275px;
      left: 0;
      width: 305px;
      padding: 0 28px 30px 28px;
      z-index: 3;
      display: flex;
      flex-direction: column;
    }

    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      margin-bottom: 8px;
    }

    .about-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #b5b8be;
      text-align: center;
      margin-bottom: 18px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
      padding-left: 8px;
    }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
      color: #e2e4e8;
      font-weight: 500;
    }

    .contact-icon-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: ${blueColor};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .contact-icon-circle svg {
      width: 12px;
      height: 12px;
      fill: #ffffff;
    }

    /* Pill Badges (Sidebar) */
    .sidebar-badge {
      width: 100%;
      border: 1.5px solid ${blueColor};
      background-color: #121824;
      border-radius: 20px;
      padding: 5px 0;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 6px 0 10px 0;
    }

    .sidebar-list {
      list-style-type: disc;
      padding-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .sidebar-list li {
      font-size: 10.5px;
      color: #c5c8ce;
      font-weight: 500;
    }

    /* Right Main Panel Content */
    .main-panel {
      position: absolute;
      top: 275px;
      left: 305px;
      width: 489px;
      padding: 0 42px 35px 38px;
      z-index: 3;
      display: flex;
      flex-direction: column;
    }

    /* Main Section Pill Header */
    .main-badge {
      background-color: ${blueColor};
      color: #ffffff;
      border-radius: 20px;
      padding: 6px 20px;
      font-size: 12.5px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 12px;
    }

    .main-section {
      margin-bottom: 20px;
    }

    .experience-item {
      margin-bottom: 14px;
    }

    .exp-company-dates {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
      font-weight: 700;
      color: #1b1c20;
    }

    .exp-role-title {
      font-size: 10.5px;
      font-weight: 600;
      color: ${blueColor};
      margin-top: 1px;
      margin-bottom: 4px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #494c53;
      text-align: justify;
    }

    .edu-item {
      margin-bottom: 10px;
    }

    .edu-dates-school {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 10.5px;
      font-weight: 700;
      color: #1b1c20;
    }

    .edu-degree {
      font-size: 10px;
      color: #555860;
      margin-top: 1px;
    }

    .skills-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
    }

    .skill-bar-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .skill-bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 600;
      color: #1b1c20;
    }

    .skill-track {
      width: 100%;
      height: 6px;
      background-color: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .skill-fill {
      height: 100%;
      background-color: ${blueColor};
      border-radius: 3px;
    }

    .ref-item {
      margin-bottom: 8px;
    }

    .ref-name {
      font-size: 11px;
      font-weight: 700;
      color: #1b1c20;
    }

    .ref-relation {
      font-size: 9.5px;
      color: #555860;
    }

    .ref-contact {
      font-size: 9.5px;
      color: ${blueColor};
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
    
    <div class="header-info">
      ${(firstName || lastName) ? `<h1 class="candidate-name" data-df-field="name">${firstName}${lastName ? ` ${lastName}` : ''}</h1>` : ''}
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
    </div>

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      ${summaryText ? `
      <!-- About Me -->
      <div class="sidebar-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'ABOUT ME'}</div>
      <p class="about-text" data-df-field="summary">
        ${summaryText}
      </p>
      ` : ''}

      ${hasContact ? `
      <!-- Contact Details -->
      <div class="contact-list">
        ${phoneText ? `
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </div>
          <span data-df-field="phone">${phoneText}</span>
        </div>
        ` : ''}
        ${emailText ? `
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a>
        </div>
        ` : ''}
        ${locationText ? `
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <span data-df-field="location">${locationText}</span>
        </div>
        ` : ''}
        ${websiteText ? `
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
        </div>
        ` : ''}
        ${linkedinText ? `
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 .01 3.25 1.63 1.63 0 0 0 0-3.25z"/></svg>
          </div>
          <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${expertiseList.length > 0 ? `
      <!-- Expertise -->
      <div class="sidebar-badge section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'EXPERTISE'}</div>
      <ul class="sidebar-list">
        ${expertiseList.map((e, idx) => {
          const name = typeof e === 'string' ? (e.includes(' - ') ? e.split(' - ')[0] : e) : e.name || '';
          return `<li data-df-field="skill:${idx}">${name}</li>`;
        }).join('')}
      </ul>
      ` : ''}

      ${languageList.length > 0 ? `
      <!-- Language -->
      <div class="sidebar-badge">LANGUAGE</div>
      <ul class="sidebar-list">
        ${languageList.map((l, idx) => `<li data-df-field="custom:custom_languages:${idx}:title">${typeof l === 'string' ? l : (l?.title || l?.name || 'Language')}</li>`).join('')}
      </ul>
      ` : ''}
    </div>

    <!-- Right Main Panel -->
    <div class="main-panel">
      ${experienceList.length > 0 ? `
      <!-- Experience Section -->
      <div class="main-section">
        <div><span class="main-badge section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'EXPERIENCE'}</span></div>
        ${experienceList.map((e, idx) => {
          const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
          return `
            <div class="experience-item">
              <div class="exp-company-dates">
                <span data-df-field="exp:${idx}:company">${e.company || ''}</span>
                <span data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
              </div>
              <div class="exp-role-title" data-df-field="exp:${idx}:role">${e.role || ''}</div>
              ${bullets.length > 0 ? `
              <ul class="exp-bullets">
                ${bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
              </ul>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      ${educationList.length > 0 ? `
      <!-- Education Section -->
      <div class="main-section">
        <div><span class="main-badge section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'EDUCATION'}</span></div>
        ${educationList.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-dates-school">
              <span data-df-field="edu:${idx}:school">${e.school || ''}</span>
              <span data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
            </div>
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${skillsBars.length > 0 ? `
      <!-- Skills Matrix Progress Bars -->
      <div class="main-section">
        <div><span class="main-badge section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'SKILLS'}</span></div>
        <div class="skills-grid">
          ${skillsBars.map((s, idx) => `
            <div class="skill-bar-item">
              <div class="skill-bar-header">
                <span data-df-field="skill:${idx}">${s.name}</span>
                <span>${s.percent}%</span>
              </div>
              <div class="skill-track">
                <div class="skill-fill" style="width: ${s.percent}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${projectsList.length > 0 ? `
      <!-- Projects Section -->
      <div class="main-section">
        <div><span class="main-badge section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'PROJECTS'}</span></div>
        ${projectsList.map((p, idx) => `
          <div class="edu-item">
            <div class="edu-dates-school">
              <span data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="edu-degree" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References Section -->
      <div class="main-section">
        <div><span class="main-badge section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'REFERENCES'}</span></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${referenceList.map((r, idx) => `
            <div class="ref-item">
              <div class="ref-name" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="ref-relation" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
              ${r.contact ? `<div class="ref-contact" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
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
