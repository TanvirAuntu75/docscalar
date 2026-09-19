// ═══════════════════════════════════════════════════════════════════════════════
// DONNA STROUPE — Exact 1:1 Pixel-Perfect Replica from User Template
// Warm Taupe Sidebar, Dark Espresso Header Banner (#2b211d), Framed Summary & Underlined Headers
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDonnaStroupeHtml(
  data = {},
  themeColor = '#2b211d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const espressoColor = themeColor === 'default' || !themeColor ? '#2b211d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const photoSrc = (safeData.photoUrl || '').trim();

  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();
  const websiteText = (safeData.website || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();

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
      background-color: transparent;
      font-family: ${fontFam};
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Page Container (794px x 1123px) */
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

    /* Left Sidebar Taupe Background */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 275px;
      height: 1123px;
      background-color: #d6ccc2;
      z-index: 1;
    }

    /* Top Dark Espresso Header Banner */
    .dark-header-banner {
      position: absolute;
      top: 75px;
      left: 130px;
      width: 664px;
      height: 145px;
      background-color: ${espressoColor};
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-left: 175px;
      padding-right: 30px;
    }

    .candidate-name {
      font-size: 30px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.05;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 14px;
      font-weight: 400;
      color: #ede8e4;
      margin-top: 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Circular Profile Photo */
    .profile-photo-container.avatar-mask {
      position: absolute;
      top: 65px;
      left: 45px;
      width: 175px;
      height: 175px;
      border-radius: 50%;
      border: 8px solid #ffffff;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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
      object-position: center top;
      display: block;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 275px;
      left: 0;
      width: 275px;
      padding: 0 26px 30px 28px;
      z-index: 3;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 9.5px;
      color: ${espressoColor};
      font-weight: 500;
      word-break: break-all;
    }

    .contact-row svg {
      width: 13px;
      height: 13px;
      fill: ${espressoColor};
      flex-shrink: 0;
    }

    /* Sidebar Section Dividers */
    .sidebar-divider {
      width: 100%;
      height: 1px;
      background-color: #9c9288;
      margin: 14px 0;
    }

    .sidebar-title {
      font-size: 13px;
      font-weight: 700;
      color: ${espressoColor};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    /* Education Section */
    .edu-entry {
      margin-bottom: 10px;
    }

    .edu-degree {
      font-size: 10.5px;
      font-weight: 700;
      color: ${espressoColor};
      line-height: 1.25;
    }

    .edu-school {
      font-size: 9.5px;
      font-weight: 700;
      color: #4a403a;
      margin-top: 2px;
    }

    .edu-years {
      font-size: 9px;
      color: #5d544e;
      margin-top: 1px;
    }

    /* Skills List */
    .skills-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .skills-list li {
      font-size: 10px;
      font-weight: 500;
      color: ${espressoColor};
    }

    /* Language List */
    .language-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .language-item {
      font-size: 10px;
      font-weight: 500;
      color: ${espressoColor};
    }

    /* Right Main Content Panel */
    .main-panel {
      position: absolute;
      top: 240px;
      left: 275px;
      width: 519px;
      padding: 20px 36px 30px 36px;
      z-index: 3;
    }

    /* About Me */
    .about-title {
      font-size: 14px;
      font-weight: 700;
      color: ${espressoColor};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .about-box {
      border-top: 1px solid ${espressoColor};
      border-bottom: 1px solid ${espressoColor};
      padding: 8px 0;
      margin-bottom: 16px;
    }

    .about-text {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #443c37;
      text-align: justify;
    }

    /* Section Headers with Underlines */
    .section-title-underlined {
      font-size: 13px;
      font-weight: 700;
      color: ${espressoColor};
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 1px solid ${espressoColor};
      padding-bottom: 3px;
      margin-bottom: 10px;
    }

    /* Work Experience */
    .experience-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .exp-entry {
      display: flex;
      flex-direction: column;
    }

    .exp-dates {
      font-size: 9.5px;
      color: #55504b;
    }

    .exp-company {
      font-size: 10px;
      font-weight: 600;
      color: #2b211d;
      margin-top: 1px;
    }

    .exp-role {
      font-size: 10.5px;
      font-weight: 700;
      color: ${espressoColor};
      text-transform: uppercase;
      margin-top: 1px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      margin-top: 3px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #443c37;
      text-align: justify;
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
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
    
    <!-- Left Background Column -->
    <div class="sidebar-bg"></div>

    <!-- Top Dark Header Banner -->
    <div class="dark-header-banner">
      <div class="candidate-name" data-df-field="name">${name}</div>
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
    </div>

    <!-- Photo Container -->
    ${photoSrc ? `
      <div class="profile-photo-container avatar-mask">
        <img class="profile-photo avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
      </div>
    ` : ''}

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      
      ${hasContact ? `
      <div class="contact-list">
        ${phoneText ? `
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          <span data-df-field="phone">${phoneText}</span>
        </div>
        ` : ''}
        ${emailText ? `
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>
        </div>
        ` : ''}
        ${locationText ? `
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span data-df-field="location">${locationText}</span>
        </div>
        ` : ''}
        ${websiteText ? `
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
        </div>
        ` : ''}
        ${linkedinText ? `
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z"/></svg>
          <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
        </div>
        ` : ''}
      </div>
      <div class="sidebar-divider"></div>
      ` : ''}

      ${educationList.length > 0 ? `
      <div class="sidebar-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</div>
      ${educationList.map((edu, idx) => `
        <div class="edu-entry">
          <div class="edu-degree" data-df-field="edu:${idx}:degree">${edu.degree || ''}</div>
          <div class="edu-school" data-df-field="edu:${idx}:school">${edu.school || ''}</div>
          <div class="edu-years" data-df-field="edu:${idx}:date">${edu.date || (edu.start ? `${edu.start}${edu.end ? ` - ${edu.end}` : ''}` : '')}</div>
          ${edu.note ? `<div class="edu-years">GPA: ${edu.note}</div>` : ''}
        </div>
      `).join('')}
      <div class="sidebar-divider"></div>
      ` : ''}

      ${skillsList.length > 0 ? `
      <div class="sidebar-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</div>
      <ul class="skills-list">
        ${skillsList.map((s, idx) => {
          const sName = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
          return `<li data-df-field="skill:${idx}">${sName}</li>`;
        }).join('')}
      </ul>
      <div class="sidebar-divider"></div>
      ` : ''}

      ${certList.length > 0 ? `
      <div class="sidebar-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</div>
      <ul class="skills-list">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
      <div class="sidebar-divider"></div>
      ` : ''}

      ${langList.length > 0 ? `
      <div class="sidebar-title">${langSection?.title || 'Languages'}</div>
      <div class="language-list">
        ${langList.map((l, idx) => `
          <div class="language-item">
            <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
            ${l.value ? `: <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

    </div>

    <!-- Right Main Panel Content -->
    <div class="main-panel">
      
      ${summaryText ? `
      <div class="about-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</div>
      <div class="about-box">
        <p class="about-text" data-df-field="summary">
          ${summaryText}
        </p>
      </div>
      ` : ''}

      ${experienceList.length > 0 ? `
      <div class="section-title-underlined section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</div>
      <div class="experience-group">
        ${experienceList.map((exp, idx) => {
          const bullets = exp.highlights && exp.highlights.filter(Boolean).length ? exp.highlights.filter(Boolean) : (exp.description ? [exp.description] : []);
          return `
          <div class="exp-entry">
            <div class="exp-dates" data-df-field="exp:${idx}:date">${exp.date || (exp.start ? `${exp.start}${exp.end ? ` - ${exp.end}` : ''}` : '')}</div>
            <div class="exp-company"><span data-df-field="exp:${idx}:company">${exp.company || ''}</span></div>
            <div class="exp-role" data-df-field="exp:${idx}:role">${exp.role || ''}</div>
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

      ${projectList.length > 0 ? `
      <div class="section-title-underlined section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</div>
      <div class="experience-group">
        ${projectList.map((p, idx) => `
          <div class="exp-entry">
            <div class="exp-role" data-df-field="proj:${idx}:name">${p.name || ''}</div>
            ${p.url ? `<div class="exp-dates"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${espressoColor}; text-decoration: none;">${p.url}</a></div>` : ''}
            ${p.description ? `<div class="about-text" data-df-field="proj:${idx}:description" style="margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <div class="section-title-underlined section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 9.5px; color: #443c37;">
            <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: ${espressoColor};">${r.name || ''}</div>
            <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || r.role || ''}</div>
            <div data-df-field="ref:${idx}:contact">${r.contact || (r.phone ? `Phone: ${r.phone} · ` : '') + (r.email ? `Email: ${r.email}` : '')}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${otherCustomSections.map(cs => {
        if (!cs || !cs.items || !cs.items.length) return '';
        return `
          <div class="section-title-underlined" style="margin-top: 14px;">${cs.title || 'Additional Information'}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${cs.items.map((i, idx) => `
              <div style="font-size: 9.5px;">
                <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }).join('')}

    </div>

  </div>

</body>
</html>`;
}
