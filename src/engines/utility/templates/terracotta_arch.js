// ═══════════════════════════════════════════════════════════════════════════════
// TERRACOTTA ARCH (Adeline Palmerston Edition) — Exact 1:1 Pixel-Perfect Replica
// Warm Cream Canvas (#fbf9f5), Terracotta Line Accents (#b87352), Arch Capsule Halo & Sage Overview
// ═══════════════════════════════════════════════════════════════════════════════

export function generateTerracottaArchHtml(
  data,
  themeColor = '#b87352',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const terracottaColor = themeColor === 'default' || !themeColor ? '#b87352' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name splitting for two-line header
  const name = (safeData.name !== undefined && safeData.name !== null) ? String(safeData.name).trim() : '';
  const nameParts = name ? name.split(' ') : [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const photoSrc = safeData.photoUrl || '';
  const summaryText = safeData.summary || safeData.profile || '';

  const phoneText = safeData.phone || '';
  const locationText = safeData.location || '';
  const emailText = safeData.email || '';
  const websiteText = safeData.website || '';
  const linkedinText = safeData.linkedin || '';

  const skillsList = (safeData.skills && safeData.skills.length) ? safeData.skills : [];
  const educationList = (safeData.education && safeData.education.length) ? safeData.education : [];
  const experienceList = (safeData.experience && safeData.experience.length) ? safeData.experience : [];
  const projectsList = (safeData.projects && safeData.projects.length) ? safeData.projects : [];
  const referenceList = (safeData.references && safeData.references.length) ? safeData.references : [];

  const hasContact = phoneText || locationText || emailText || websiteText || linkedinText;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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

    /* Fixed A4 Page Container with Rounded Frame */
    .cv-page, .resume-canvas {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      background-color: #fbf9f5;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 55px 48px 30px 48px;
      margin: 0 auto;
    }

    /* Left Edge Terracotta Accent Block */
    .left-accent-block {
      position: absolute;
      top: 78px;
      left: 0;
      width: 24px;
      height: 96px;
      background-color: ${terracottaColor};
    }

    /* Header Section */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      position: relative;
      z-index: 2;
    }

    .header-left {
      flex: 1;
      padding-top: 15px;
    }

    .candidate-name {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.05;
      color: #232528;
      letter-spacing: -0.5px;
    }

    /* Subtitle with Horizontal Leading Line */
    .subtitle-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 18px;
      margin-bottom: 22px;
    }

    .subtitle-line {
      width: 140px;
      height: 1.5px;
      background-color: ${terracottaColor};
    }

    .candidate-title {
      font-size: 13px;
      font-weight: 700;
      color: ${terracottaColor};
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* Contact Details Grid */
    .contact-grid {
      display: grid;
      grid-template-columns: 190px 1fr;
      row-gap: 10px;
      column-gap: 15px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #2b2e32;
      font-weight: 500;
    }

    .contact-item svg {
      width: 15px;
      height: 15px;
      fill: #232528;
      flex-shrink: 0;
    }

    /* Capsule / Arch Photo Frame */
    .avatar-mask {
      width: 220px;
      height: 275px;
      border-radius: 110px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
      background-color: #ffffff;
      position: relative;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .profile-photo, .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      filter: grayscale(100%) contrast(105%);
      display: block;
    }

    /* Sage / Slate Blue Overview Box */
    .overview-box {
      background-color: #d1dcdd;
      border-radius: 6px;
      padding: 18px 24px;
      margin-top: -30px;
      margin-bottom: 30px;
      position: relative;
      z-index: 1;
    }

    .overview-title {
      font-size: 14px;
      font-weight: 700;
      color: #232528;
      margin-bottom: 6px;
    }

    .overview-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #383b40;
      text-align: justify;
    }

    /* Two-Column Main Content */
    .main-content-grid {
      display: grid;
      grid-template-columns: 1.22fr 1fr;
      gap: 36px;
      flex: 1;
    }

    /* Section Titles */
    .section-title {
      font-size: 15.5px;
      font-weight: 700;
      color: ${terracottaColor};
      margin-bottom: 12px;
      letter-spacing: -0.2px;
    }

    /* Work Experience Column */
    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exp-entry {
      display: flex;
      flex-direction: column;
    }

    .exp-role {
      font-size: 12px;
      font-weight: 700;
      color: #232528;
    }

    .exp-meta {
      font-size: 10.5px;
      font-style: italic;
      color: #4a4d52;
      margin-top: 1px;
      margin-bottom: 6px;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bullet-list li {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #383b40;
      text-align: justify;
    }

    .entry-divider {
      width: 45px;
      height: 1px;
      background-color: #d6b8a8;
      margin-top: 14px;
    }

    /* Right Column (Education & Skills) */
    .right-col {
      display: flex;
      flex-direction: column;
    }

    .edu-section {
      margin-bottom: 22px;
    }

    .edu-entry {
      margin-bottom: 12px;
    }

    .edu-degree {
      font-size: 11.5px;
      font-weight: 700;
      color: #232528;
      line-height: 1.25;
    }

    .edu-meta {
      font-size: 10.5px;
      font-style: italic;
      color: #4a4d52;
      margin-top: 2px;
    }

    .skills-section {
      display: flex;
      flex-direction: column;
    }

    .skills-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .skills-list li {
      font-size: 10.5px;
      font-weight: 500;
      color: #383b40;
    }

    /* Bottom Terracotta Stripe */
    .footer-stripe {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 14px;
      background: ${terracottaColor};
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
    <!-- Left Terracotta Vertical Tab -->
    <div class="left-accent-block"></div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="header-left">
        <h1 class="candidate-name" data-df-field="name">${firstName}${lastName ? `<br>${lastName}` : ''}</h1>
        
        <div class="subtitle-row">
          <div class="subtitle-line"></div>
          <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
        </div>

        ${hasContact ? `
        <div class="contact-grid">
          ${phoneText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span data-df-field="phone">${phoneText}</span>
          </div>
          ` : ''}

          ${locationText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span data-df-field="location">${locationText}</span>
          </div>
          ` : ''}

          ${emailText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <a href="mailto:${emailText}" style="color: inherit; text-decoration: none;" data-df-field="email">${emailText}</a>
          </div>
          ` : ''}

          ${websiteText ? `
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;" data-df-field="website">${websiteText.replace(/^https?:\/\//, '')}</a>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>

      <!-- Rounded Arch Frame for Portrait -->
      ${photoSrc ? `
      <div class="avatar-mask">
        <img src="${photoSrc}" alt="Profile Photo" class="profile-photo avatar" />
      </div>
      ` : ''}
    </div>

    <!-- Sage Overview / About Me Box -->
    ${summaryText ? `
    <div class="overview-box">
      <div class="overview-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</div>
      <div class="overview-text" data-df-field="summary">
        ${summaryText}
      </div>
    </div>
    ` : ''}

    <!-- Two-Column Body Content -->
    <div class="main-content-grid">
      <!-- Left Column: Work Experience -->
      <div class="left-col">
        ${experienceList.length > 0 ? `
        <div class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</div>
        <div class="experience-list">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
            <div class="exp-entry">
              <div class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
              <div class="exp-meta">
                <span data-df-field="exp:${idx}:company">${e.company || ''}</span>
                ${e.company && (e.start || e.end || e.dates) ? ' | ' : ''}
                <span data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
              </div>
              ${bullets.length > 0 ? `
              <ul class="bullet-list">
                ${bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b}</li>`).join('')}
              </ul>
              ` : ''}
              ${idx < experienceList.length - 1 ? '<div class="entry-divider"></div>' : ''}
            </div>
            `;
          }).join('')}
        </div>
        ` : ''}

        ${projectsList.length > 0 ? `
        <div class="section-title section-heading" style="margin-top: 16px;" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</div>
        <div class="experience-list">
          ${projectsList.map((p, idx) => `
          <div class="exp-entry">
            <div class="exp-role" data-df-field="proj:${idx}:name">${p.name || ''}</div>
            ${p.url ? `<div class="exp-meta"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: inherit; text-decoration: none;">${p.url}</a></div>` : ''}
            ${p.description ? `<p class="overview-text" data-df-field="proj:${idx}:description" style="margin-top: 2px;">${p.description}</p>` : ''}
          </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <!-- Right Column: Education & Skills -->
      <div class="right-col">
        ${educationList.length > 0 ? `
        <div class="edu-section">
          <div class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education History'}</div>
          <div class="edu-list">
            ${educationList.map((e, idx) => `
            <div class="edu-entry">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              <div class="edu-meta">
                <span data-df-field="edu:${idx}:school">${e.school || ''}</span>
                ${e.school && (e.start || e.end || e.date) ? ' | ' : ''}
                <span data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${skillsList.length > 0 ? `
        <div class="skills-section">
          <div class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills & Expertise'}</div>
          <ul class="skills-list">
            ${skillsList.map((s, idx) => {
              const skillName = typeof s === 'string' ? s : (s.name || '');
              return `<li data-df-field="skill:${idx}">${skillName}</li>`;
            }).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Bottom Terracotta Accent Stripe -->
    <div class="footer-stripe"></div>
  </div>

</body>
</html>`;
}
