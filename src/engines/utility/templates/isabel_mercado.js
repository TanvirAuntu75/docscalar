// ═══════════════════════════════════════════════════════════════════════════════
// ISABEL MERCADO — Exact 1:1 Pixel-Perfect Replica from User Template
// Rectangular Framed Portrait (#ede9e3), Charcoal Pill Badges (${charcoalColor}), & 7-Dot Skill Ratings
// ═══════════════════════════════════════════════════════════════════════════════

export function generateIsabelMercadoHtml(
  data,
  themeColor = '#31353d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const charcoalColor = themeColor === 'default' || !themeColor ? '#31353d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Two-tone name splitting: light first name + bold last name
  const nameParts = (data.name || '').trim().split(' ').filter(Boolean);
  const firstName = nameParts.length ? nameParts[0].toUpperCase() : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ').toUpperCase() : '';

  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const websiteText = data.website || '';
  const locationText = data.location || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  const rawSkills = (data.skills && data.skills.length) ? data.skills : [];
  const defaultRatings = [5, 5, 5, 5];
  const skillsWithRatings = rawSkills.map((s, idx) => {
    let name = typeof s === 'string' ? s : s.name || '';
    let rating = defaultRatings[idx % defaultRatings.length];
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      const levelStr = parts[1].toLowerCase();
      if (levelStr.includes('expert') || levelStr.includes('native')) rating = 7;
      else if (levelStr.includes('advanced')) rating = 6;
      else if (levelStr.includes('intermediate')) rating = 5;
      else rating = 4;
    }
    return { name, rating };
  }).filter(s => s.name);

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
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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

    /* Fixed A4 Page Container with Rounded Corners */
    .cv-page, .resume-canvas {
      width: 794px;
      min-height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      padding: 55px 48px 40px 48px;
      display: flex;
      gap: 46px;
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

    /* Left Sidebar Column */
    .left-col {
      width: 255px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    /* Rectangular Profile Photo with Light Backing */
    .photo-container {
      width: 195px;
      height: 215px;
      background-color: #ede9e3;
      padding: 6px;
      margin-bottom: 24px;
    }

    .avatar-mask {
      width: 100%;
      height: 100%;
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

    /* Name & Title Block */
    .name-block {
      margin-bottom: 30px;
    }

    .name-first {
      font-size: 32px;
      font-weight: 300;
      color: ${charcoalColor};
      letter-spacing: 1.5px;
      line-height: 1;
      text-transform: uppercase;
    }

    .name-last {
      font-size: 36px;
      font-weight: 800;
      color: #1f2228;
      letter-spacing: 1px;
      line-height: 1.1;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .job-title {
      font-size: 12px;
      font-weight: 600;
      font-style: italic;
      color: #4b4e56;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 6px;
    }

    /* Pill-shaped Section Header */
    .pill-header {
      background-color: ${charcoalColor};
      border-radius: 20px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 18px;
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
      margin-bottom: 14px;
    }

    .pill-header svg {
      width: 18px;
      height: 18px;
      fill: #ffffff;
      flex-shrink: 0;
    }

    /* Contact Details */
    .contact-section {
      margin-bottom: 32px;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 6px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 10.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: #1f2228;
      flex-shrink: 0;
    }

    /* Skills Rating Section */
    .skills-section {
      display: flex;
      flex-direction: column;
    }

    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-left: 6px;
    }

    .skill-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skill-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #1f2228;
    }

    .rating-dots {
      display: flex;
      gap: 5.5px;
    }

    .dot {
      width: 7.5px;
      height: 7.5px;
      border-radius: 50%;
    }

    .dot.filled {
      background-color: ${charcoalColor};
    }

    .dot.empty {
      background-color: #d8dade;
    }

    /* Right Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* About Me */
    .about-section {
      margin-bottom: 22px;
    }

    .about-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #4a4d55;
      text-align: justify;
      padding-left: 4px;
    }

    /* Education */
    .edu-section {
      margin-bottom: 24px;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 6px;
    }

    .timeline-item {
      position: relative;
      padding-left: 24px;
    }

    /* Vertical Timeline Connector Line */
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

    .edu-degree {
      font-size: 12px;
      font-weight: 700;
      color: #1f2228;
    }

    .edu-dates {
      font-size: 10px;
      color: #63666d;
      margin-top: 1px;
    }

    .edu-school {
      font-size: 10.5px;
      font-style: italic;
      font-weight: 600;
      color: #2b2e34;
      margin-top: 1px;
    }

    /* Work Experience */
    .experience-section {
      display: flex;
      flex-direction: column;
    }

    .exp-item {
      position: relative;
      padding-left: 24px;
    }

    .exp-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${charcoalColor};
    }

    .exp-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .exp-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .exp-company {
      font-size: 12px;
      font-weight: 700;
      color: #1f2228;
    }

    .exp-dates {
      font-size: 10.5px;
      font-weight: 700;
      color: ${charcoalColor};
      margin-top: 1px;
    }

    .exp-role {
      font-size: 11.5px;
      font-weight: 700;
      color: #1f2228;
      margin-top: 2px;
      margin-bottom: 4px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.8px;
      line-height: 1.4;
      color: #4a4d55;
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
    
    
      <div class="name-block">
        <div data-df-field="name">
          ${firstName ? `<div class="name-first">${firstName}</div>` : ''}
          ${lastName ? `<div class="name-last">${lastName}</div>` : ''}
        </div>
        <div class="candidate-title job-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
      </div>

      ${hasContact ? `
      <!-- Contact Details -->
      <div class="contact-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>
          <span class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</span>
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
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
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

      ${skillsWithRatings.length > 0 ? `
      <!-- Skills Rating Section -->
      <div class="skills-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <span class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</span>
        </div>
        <div class="skills-list">
          ${skillsWithRatings.map((s, idx) => `
            <div class="skill-item">
              <span class="skill-name" data-df-field="skill:${idx}">${s.name}</span>
              <div class="rating-dots">
                ${[1, 2, 3, 4, 5, 6, 7].map(dotNum => `
                  <div class="dot ${dotNum <= s.rating ? 'filled' : 'empty'}"></div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

    </div>

    <!-- Right Column -->
    <div class="right-col">
      ${summaryText ? `
      <!-- About Me -->
      <div class="about-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span class="section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</span>
        </div>
        <p class="about-text" data-df-field="summary">
          ${summaryText}
        </p>
      </div>
      ` : ''}

      ${educationList.length > 0 ? `
      <!-- Education -->
      <div class="edu-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <span class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</span>
        </div>
        <div class="timeline-list">
          ${educationList.map((e, idx) => `
            <div class="timeline-item">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              <div class="edu-dates" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}${e.note ? ` · ${e.note}` : ''}</div>
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${experienceList.length > 0 ? `
      <!-- Work Experience -->
      <div class="experience-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <span class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'WORK EXPERIENCE'}</span>
        </div>
        <div class="timeline-list">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
              <div class="exp-item">
                <div class="exp-company" data-df-field="exp:${idx}:company">${e.company || ''}</div>
                <div class="exp-dates" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
                <div class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
                ${bullets.length > 0 ? `
                <ul class="exp-bullets">
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
      <!-- Projects -->
      <div class="experience-section" style="margin-top: 18px;">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          <span class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</span>
        </div>
        <div class="timeline-list">
          ${projectsList.map((p, idx) => `
            <div class="exp-item">
              <div class="exp-company" data-df-field="proj:${idx}:name">${p.name || ''}</div>
              ${p.url ? `<div class="edu-dates" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></div>` : ''}
              ${p.description ? `<div class="about-text" data-df-field="proj:${idx}:description" style="padding-left: 0; margin-top: 3px;">${p.description}</div>` : ''}
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References -->
      <div class="experience-section" style="margin-top: 18px;">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <span class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px;">
          ${referenceList.map((r, idx) => `
            <div>
              <div class="exp-company" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="edu-school" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
              ${r.contact ? `<div class="edu-dates" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
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
