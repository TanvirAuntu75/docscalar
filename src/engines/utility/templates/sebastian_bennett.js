// ═══════════════════════════════════════════════════════════════════════════════
// SEBASTIAN BENNETT — Exact 1:1 Pixel-Perfect Replica from User Template
// Executive Rounded Card Canvas (794px x 1123px), Horizontal Gray Accent Bars, Multi-Column Skills
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSebastianBennettHtml(
  data,
  themeColor = '#222427',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const slateColor = themeColor === 'default' || !themeColor ? '#222427' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Split name for Sebastian Bennett uppercase header
  const name = (safeData.name !== undefined && safeData.name !== null) ? String(safeData.name).trim() : '';
  const nameParts = name ? name.split(' ') : [];
  const firstName = (nameParts[0] || '').toUpperCase();
  const lastName = (nameParts.slice(1).join(' ') || '').toUpperCase();

  const photoSrc = safeData.photoUrl || '';
  const summaryText = safeData.summary || safeData.profile || '';

  const phoneText = safeData.phone || '';
  const emailText = safeData.email || '';
  const locationText = safeData.location || '';
  const websiteText = safeData.website || '';
  const linkedinText = safeData.linkedin || '';
  const githubText = safeData.github || '';

  const rawSkills = (safeData.skills && safeData.skills.length) ? safeData.skills : [];
  const cleanSkills = rawSkills.map(s => typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '').filter(Boolean);
  const col1 = cleanSkills.slice(0, 3);
  const col2 = cleanSkills.slice(3, 6);
  const col3 = cleanSkills.slice(6);

  const educationList = (safeData.education && safeData.education.length) ? safeData.education : [];
  const experienceList = (safeData.experience && safeData.experience.length) ? safeData.experience : [];
  const projectsList = (safeData.projects && safeData.projects.length) ? safeData.projects : [];
  const referenceList = (safeData.references && safeData.references.length) ? safeData.references : [];
  const certList = (safeData.certifications && safeData.certifications.length) ? safeData.certifications : [];

  const hasContact = phoneText || emailText || locationText || websiteText || linkedinText || githubText;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

    /* Fixed A4 Canvas with Rounded Outer Corners */
    .cv-page, .resume-card {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 26px;
      position: relative;
      overflow: hidden;
      padding: 48px 46px;
      display: flex;
      flex-direction: column;
      margin: 0 auto;
    }

    /* Top Header */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .header-left {
      flex: 1;
      padding-top: 8px;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.05;
      color: #26282b;
      letter-spacing: 2px;
    }

    .candidate-title {
      font-size: 15px;
      font-weight: 500;
      color: #383a3e;
      margin-top: 10px;
      letter-spacing: 0.2px;
    }

    .avatar-mask {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background-color: #8c8f94;
      flex-shrink: 0;
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
      display: block;
      filter: grayscale(100%) contrast(105%);
    }

    /* Contact Strip */
    .contact-bar {
      background-color: #e8e8e8;
      padding: 7px 14px;
      font-size: 11px;
      font-weight: 500;
      color: #333333;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .contact-bar span.separator {
      color: #777777;
    }

    /* Section Headers with Gray Fill Bars */
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: ${slateColor};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .header-gray-bar {
      flex: 1;
      height: 9px;
      background-color: #e8e8e8;
    }

    /* Section Content Styles */
    .section-block {
      margin-bottom: 18px;
    }

    .profile-text {
      font-size: 10.2px;
      line-height: ${lineSpacing};
      color: #3a3c40;
      text-align: justify;
    }

    /* 2-Column Entry Grid for Education & Work Experience */
    .entry-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .entry-row {
      display: flex;
      gap: 18px;
    }

    .entry-meta {
      width: 135px;
      flex-shrink: 0;
    }

    .entry-org {
      font-size: 11px;
      font-weight: 600;
      color: #26282b;
      line-height: 1.3;
    }

    .entry-date {
      font-size: 10.5px;
      color: #4b4d52;
      margin-top: 1px;
    }

    .entry-main {
      flex: 1;
    }

    .entry-role {
      font-size: 12px;
      font-weight: 700;
      color: #222427;
      margin-bottom: 2px;
    }

    .entry-desc {
      font-size: 10.2px;
      line-height: ${lineSpacing};
      color: #4a4c50;
      text-align: justify;
    }

    /* Skills Grid */
    .skills-section {
      margin-top: 2px;
    }

    .skills-header-row {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 8px;
    }

    .skills-meta-col {
      width: 135px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skills-meta-col .section-title {
      font-size: 14px;
      font-weight: 800;
      color: ${slateColor};
      letter-spacing: 1.5px;
    }

    .skills-meta-col .header-gray-bar {
      flex: 1;
      height: 9px;
      background-color: #e8e8e8;
    }

    .skills-sub-headers {
      flex: 1;
      display: flex;
      gap: 18px;
    }

    .skills-sub-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sub-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #222427;
      flex-shrink: 0;
    }

    .skills-sub-box.personal {
      flex: 0.58;
    }

    .skills-content-row {
      display: flex;
      gap: 18px;
    }

    .skills-content-offset {
      width: 135px;
      flex-shrink: 0;
    }

    .skills-columns-container {
      flex: 1;
      display: flex;
      gap: 18px;
    }

    .professional-lists-wrap {
      flex: 1;
      display: flex;
      gap: 14px;
    }

    .personal-lists-wrap {
      flex: 0.58;
    }

    .skill-list {
      list-style-type: disc;
      padding-left: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
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
      .cv-page, .resume-card {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child, .resume-card:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>

  <div class="cv-page resume-card" id="page-1">
    <!-- Top Header: Name, Title & Photo -->
    <div class="header-section">
      <div class="header-left">
        <h1 class="candidate-name" data-df-field="name">${firstName}${lastName ? `<br>${lastName}` : ''}</h1>
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
      </div>
      ${photoSrc ? `
      <div class="avatar-wrap">
        <div class="avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="Profile Photo">
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Contact Info Bar -->
    ${hasContact ? `
    <div class="contact-bar">
      ${phoneText ? `<span data-df-field="phone">${phoneText}</span>` : ''}
      ${phoneText && emailText ? `<span class="separator">|</span>` : ''}
      ${emailText ? `<a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>` : ''}
      ${(phoneText || emailText) && locationText ? `<span class="separator">|</span>` : ''}
      ${locationText ? `<span data-df-field="location">${locationText}</span>` : ''}
      ${(phoneText || emailText || locationText) && websiteText ? `<span class="separator">|</span>` : ''}
      ${websiteText ? `<a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>` : ''}
      ${(phoneText || emailText || locationText || websiteText) && linkedinText ? `<span class="separator">|</span>` : ''}
      ${linkedinText ? `<a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>` : ''}
      ${(phoneText || emailText || locationText || websiteText || linkedinText) && githubText ? `<span class="separator">|</span>` : ''}
      ${githubText ? `<a href="https://${githubText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="github" style="color: inherit; text-decoration: none;">${githubText.replace(/^https?:\/\//, '')}</a>` : ''}
    </div>
    ` : ''}

    ${summaryText ? `
    <!-- Profile Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'PROFILE'}</span>
      </div>
      <p class="profile-text" data-df-field="summary">
        ${summaryText}
      </p>
    </div>
    ` : ''}

    ${educationList.length > 0 ? `
    <!-- Education Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'EDUCATION'}</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${educationList.map((e, idx) => `
          <div class="entry-row">
            <div class="entry-meta">
              <div class="entry-org" data-df-field="edu:${idx}:school">${e.school || ''}</div>
              <div class="entry-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start} – ${e.end || ''}` : '')}</div>
            </div>
            <div class="entry-main">
              <div class="entry-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              ${e.note || e.description ? `
              <p class="entry-desc">
                ${e.note || e.description}
              </p>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${experienceList.length > 0 ? `
    <!-- Work Experience Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'WORK EXPERIENCE'}</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${experienceList.map((e, idx) => {
          const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
          return `
            <div class="entry-row">
              <div class="entry-meta">
                <div class="entry-org" data-df-field="exp:${idx}:company">${e.company || ''}</div>
                <div class="entry-date" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start} – ${e.end || ''}` : '')}</div>
              </div>
              <div class="entry-main">
                <div class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
                ${bullets.length > 0 ? `
                <div class="entry-desc">
                  ${bullets.map((b, bIdx) => `<div data-df-field="exp:${idx}:highlight:${bIdx}">${b.replace(/^[•\-\*]\s*/, '')}</div>`).join('')}
                </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    ${projectsList.length > 0 ? `
    <!-- Projects Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'PROJECTS'}</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${projectsList.map((p, idx) => `
          <div class="entry-row">
            <div class="entry-meta">
              <div class="entry-org" data-df-field="proj:${idx}:name">${p.name || ''}</div>
              ${p.url ? `<div class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: inherit; text-decoration: none;">${p.url}</a></div>` : ''}
            </div>
            <div class="entry-main">
              ${p.description ? `<p class="entry-desc" data-df-field="proj:${idx}:description">${p.description}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${cleanSkills.length > 0 ? `
    <!-- Skills Section -->
    <div class="skills-section">
      <!-- Skills Header Line -->
      <div class="skills-header-row">
        <div class="skills-meta-col">
          <span class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'SKILLS'}</span>
          <div class="header-gray-bar"></div>
        </div>
        <div class="skills-sub-headers">
          <div class="skills-sub-box">
            <span class="sub-title">Professional</span>
            <div class="header-gray-bar"></div>
          </div>
          ${col3.length > 0 ? `
          <div class="skills-sub-box personal">
            <span class="sub-title">Personal</span>
            <div class="header-gray-bar"></div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Skills List Columns -->
      <div class="skills-content-row">
        <div class="skills-content-offset"></div>
        <div class="skills-columns-container">
          <div class="professional-lists-wrap">
            <ul class="skill-list">
              ${col1.map((s, idx) => `<li data-df-field="skill:${idx}">${s}</li>`).join('')}
            </ul>
            ${col2.length > 0 ? `
            <ul class="skill-list">
              ${col2.map((s, idx) => `<li data-df-field="skill:${col1.length + idx}">${s}</li>`).join('')}
            </ul>
            ` : ''}
          </div>
          ${col3.length > 0 ? `
          <div class="personal-lists-wrap">
            <ul class="skill-list">
              ${col3.map((s, idx) => `<li data-df-field="skill:${col1.length + col2.length + idx}">${s}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    ` : ''}

    ${certList.length > 0 ? `
    <!-- Certifications Section -->
    <div class="section-block" style="margin-top: 14px;">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'CERTIFICATIONS'}</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${certList.map((c, idx) => `
          <div class="entry-row">
            <div class="entry-meta">
              <div class="entry-org" data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</div>
            </div>
            ${typeof c === 'object' && c !== null && (c.issuer || c.date) ? `
            <div class="entry-main">
              <p class="entry-desc">${c.issuer || ''}${c.issuer && c.date ? ' · ' : ''}${c.date || ''}</p>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${referenceList.length > 0 ? `
    <!-- References Section -->
    <div class="section-block" style="margin-top: 14px;">
      <div class="section-header">
        <span class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'REFERENCES'}</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${referenceList.map((r, idx) => `
          <div class="entry-row">
            <div class="entry-meta">
              <div class="entry-org" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="entry-date" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
            </div>
            <div class="entry-main">
              <p class="entry-desc" data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>

</body>
</html>`;
}
