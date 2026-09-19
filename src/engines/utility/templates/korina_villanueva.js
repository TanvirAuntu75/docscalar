// ═══════════════════════════════════════════════════════════════════════════════
// KORINA VILLANUEVA — Exact 1:1 Pixel-Perfect Replica from User Template
// Pointed Pennant/Chevron Frame, Rating Dots Skills, & Horizontal Language Progress Tracks
// ═══════════════════════════════════════════════════════════════════════════════

export function generateKorinaVillanuevaHtml(
  data,
  themeColor = '#112338',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const navyColor = themeColor === 'default' || !themeColor ? '#112338' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const candidateName = data.name ? (data.name || '').toUpperCase().trim() : '';
  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const websiteText = data.website || '';
  const locationText = data.location || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || websiteText || locationText || linkedinText);

  const rawSkills = (data.skills && data.skills.length) ? data.skills : [];
  const defaultRatings = [4, 3, 2, 3, 4];
  const skillsWithRatings = rawSkills.map((s, idx) => {
    let name = typeof s === 'string' ? s : s.name || '';
    let rating = defaultRatings[idx % defaultRatings.length];
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      const levelStr = parts[1].toLowerCase();
      if (levelStr.includes('expert') || levelStr.includes('native')) rating = 4;
      else if (levelStr.includes('advanced')) rating = 3;
      else if (levelStr.includes('intermediate')) rating = 2;
      else rating = 1;
    }
    return { name, rating };
  }).filter(s => s.name);

  const educationList = (data.education && data.education.length) ? data.education : [];
  const experienceList = (data.experience && data.experience.length) ? data.experience : [];
  const referenceList = (data.references && data.references.length) ? data.references : [];
  const projectsList = (data.projects && data.projects.length) ? data.projects : [];
  const customLangs = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages')?.items || (data.custom_languages || []);
  const languageList = customLangs.map((l) => {
    const name = typeof l === 'string' ? l : (l.title || l.name || 'Language');
    let percent = 90;
    const levelStr = typeof l === 'object' ? (l.value || l.level || '') : '';
    if (levelStr) {
      const num = parseInt(levelStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) percent = Math.min(100, Math.max(10, num));
    }
    return { name, percent };
  });

  const hasHeader = Boolean(photoSrc || candidateName || data.title || summaryText);

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

    /* Fixed A4 Canvas with Rounded Outer Frame */
    .cv-page, .resume-canvas {
      width: 794px;
      min-height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      padding: 50px 48px 40px 48px;
      display: flex;
      flex-direction: column;
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

    /* Top Header Area */
    .top-header {
      display: flex;
      gap: 45px;
      margin-bottom: 30px;
      align-items: flex-start;
    }

    /* Pointed Pennant / Chevron Shaped Photo Frame */
    .photo-wrapper {
      width: 185px;
      height: 250px;
      clip-path: polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%);
      background-color: #e2e8f0;
      flex-shrink: 0;
      overflow: hidden;
    }

    .avatar-mask {
      width: 100%;
      height: 100%;
      clip-path: polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%);
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

    /* Top Right Header Details */
    .header-details {
      flex: 1;
      padding-top: 15px;
    }

    .candidate-name {
      font-size: 34px;
      font-weight: 800;
      color: ${navyColor};
      letter-spacing: 1.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 16px;
      font-weight: 500;
      color: #334155;
      margin-top: 8px;
      margin-bottom: 20px;
      letter-spacing: 0.2px;
    }

    .summary-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #475569;
      text-align: justify;
    }

    /* Two-Column Lower Content Layout */
    .main-content {
      display: flex;
      gap: 45px;
      flex: 1;
    }

    /* Section Title Styles */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: ${navyColor};
      margin-bottom: 14px;
      letter-spacing: -0.2px;
    }

    /* Left Sidebar Column */
    .left-col {
      width: 185px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10px;
      color: #334155;
      font-weight: 500;
      word-break: break-all;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: ${navyColor};
      flex-shrink: 0;
    }

    /* Education Section */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .edu-item {
      display: flex;
      flex-direction: column;
    }

    .edu-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-bullet-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: ${navyColor};
      flex-shrink: 0;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: ${navyColor};
    }

    .edu-school {
      font-size: 9.5px;
      color: #475569;
      margin-top: 3px;
      padding-left: 15px;
    }

    .edu-year {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
      padding-left: 15px;
    }

    /* Rating Dots Skills */
    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .skill-name {
      font-size: 10px;
      font-weight: 500;
      color: #334155;
    }

    .dots-rating {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #cbd5e1;
    }

    .dot.filled {
      background-color: ${navyColor};
    }

    /* Horizontal Language Progress Tracks */
    .lang-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .lang-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .lang-name {
      font-size: 10px;
      font-weight: 500;
      color: #334155;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background-color: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: ${navyColor};
      border-radius: 3px;
    }

    /* Right Main Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exp-item {
      display: flex;
      flex-direction: column;
    }

    .exp-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .exp-role {
      font-size: 13.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .exp-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
      margin-bottom: 5px;
      padding-left: 15px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 30px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #475569;
      text-align: justify;
    }

    /* References Grid */
    .references-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .reference-card {
      display: flex;
      flex-direction: column;
    }

    .ref-name {
      font-size: 12px;
      font-weight: 700;
      color: ${navyColor};
    }

    .ref-position {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }

    .ref-contact {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
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
    <!-- Top Header Area -->
    <div class="top-header">
      ${photoSrc ? `
      <div class="photo-wrapper avatar-container">
        <div class="avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
        </div>
      </div>
      ` : ''}

      <div class="header-details">
        ${candidateName ? `<h1 class="candidate-name" data-df-field="name">${candidateName}</h1>` : ''}
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${summaryText ? `
        <p class="summary-text" data-df-field="summary">
          ${summaryText}
        </p>
        ` : ''}
      </div>
    </div>

    <!-- Two-Column Lower Content Layout -->
    <div class="main-content">
      <!-- Left Column: Contact, Education, Skills, Language -->
      <div class="left-col">
        ${hasContact ? `
        <!-- Contact Section -->
        <div class="sidebar-section">
          <h2 class="section-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h2>
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
              <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>
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

        ${educationList.length > 0 ? `
        <!-- Education Section -->
        <div class="sidebar-section">
          <h2 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
          <div class="edu-list">
            ${educationList.map((e, idx) => `
              <div class="edu-item">
                <div class="edu-header">
                  <div class="section-bullet-dot"></div>
                  <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
                </div>
                <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}${e.note ? ` · ${e.note}` : ''}</div>
                <div class="edu-year" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${skillsWithRatings.length > 0 ? `
        <!-- Skills Section -->
        <div class="sidebar-section">
          <h2 class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h2>
          <div class="skills-list">
            ${skillsWithRatings.map((s, idx) => `
              <div class="skill-row">
                <span class="skill-name" data-df-field="skill:${idx}">${s.name}</span>
                <div class="dots-rating">
                  <div class="dot ${s.rating >= 1 ? 'filled' : ''}"></div>
                  <div class="dot ${s.rating >= 2 ? 'filled' : ''}"></div>
                  <div class="dot ${s.rating >= 3 ? 'filled' : ''}"></div>
                  <div class="dot ${s.rating >= 4 ? 'filled' : ''}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${languageList.length > 0 ? `
        <!-- Language Section -->
        <div class="sidebar-section">
          <h2 class="section-title section-heading" data-df-field="heading:custom_languages">${data.sectionTitles?.custom_languages || 'Language'}</h2>
          <div class="lang-list">
            ${languageList.map((l, i) => `
              <div class="lang-item">
                <span class="lang-name" data-df-field="custom:custom_languages:${i}:title">${l.name}</span>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${l.percent}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Right Column: Experience, References, Projects -->
      <div class="right-col">
        ${experienceList.length > 0 ? `
        <!-- Experience Section -->
        <div class="main-section">
          <h2 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
          <div class="experience-list">
            ${experienceList.map((e, idx) => {
              const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
              return `
                <div class="exp-item">
                  <div class="exp-header">
                    <div class="section-bullet-dot"></div>
                    <div class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
                  </div>
                  <div class="exp-meta">
                    <span class="exp-company" data-df-field="exp:${idx}:company">${e.company || ''}</span>
                    ${e.company && (e.dates || e.start) ? ' | ' : ''}
                    <span class="exp-date" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
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

        ${projectsList.length > 0 ? `
        <!-- Projects Section -->
        <div class="main-section">
          <h2 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
          <div class="experience-list">
            ${projectsList.map((p, idx) => `
              <div class="exp-item">
                <div class="exp-header">
                  <div class="section-bullet-dot"></div>
                  <div class="exp-role" data-df-field="proj:${idx}:name">${p.name || ''}</div>
                </div>
                ${p.url ? `<div class="exp-meta" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></div>` : ''}
                ${p.description ? `<div class="summary-text" data-df-field="proj:${idx}:description" style="padding-left: 15px; margin-top: 3px;">${p.description}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${referenceList.length > 0 ? `
        <!-- References Section -->
        <div class="main-section">
          <h2 class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
          <div class="references-grid">
            ${referenceList.map((r, idx) => `
              <div class="reference-card">
                <div class="ref-name" data-df-field="ref:${idx}:name">${r.name || ''}</div>
                <div class="ref-position" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
                ${r.contact ? `<div class="ref-contact" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  </div>

</body>
</html>`;
}
