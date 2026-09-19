// ═══════════════════════════════════════════════════════════════════════════════
// LORNA ALVARADO — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with 3D Folded Ribbon Headers & Right Geometric Edge Tabs
// ═══════════════════════════════════════════════════════════════════════════════

export function generateLornaAlvaradoHtml(
  data,
  themeColor = '#232628',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const charcoalColor = themeColor === 'default' || !themeColor ? '#232628' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name uppercase two-line header
  const nameParts = (data.name || '').trim().split(' ').filter(Boolean);
  const firstName = nameParts.length ? nameParts[0].toUpperCase() : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ').toUpperCase() : '';

  const photoSrc = data.photoUrl || '';

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

    /* Fixed A4 Canvas with Rounded Corners */
    .cv-page, .resume-canvas {
      width: 794px;
      min-height: 1123px;
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

    /* Right-Edge Gray Accent Tabs */
    .right-tab-top {
      position: absolute;
      top: 55px;
      right: 0;
      width: 32px;
      height: 65px;
      background-color: #e5e3de;
      z-index: 1;
    }

    .right-tab-mid {
      position: absolute;
      top: 250px;
      right: 0;
      width: 32px;
      height: 48px;
      background-color: #e5e3de;
      z-index: 1;
    }

    .right-tab-bottom {
      position: absolute;
      bottom: 135px;
      right: 0;
      width: 32px;
      height: 48px;
      background-color: #e5e3de;
      z-index: 1;
    }

    /* Left Sidebar */
    .sidebar {
      width: 275px;
      min-height: 1123px;
      background-color: #e8e6e1;
      padding: 45px 0 35px 0;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    /* Circular Profile Photo with Ring */
    .photo-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 30px;
      padding: 0 25px;
    }

    .profile-photo-ring {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      background-color: #d1ceca;
      padding: 6px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .avatar-mask {
      width: 100%;
      height: 100%;
      border-radius: 50%;
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

    /* 3D Folded Ribbon Header */
    .ribbon-header-wrap {
      position: relative;
      margin-bottom: 14px;
      width: 290px; /* Extends past the 275px sidebar */
    }

    .ribbon-header {
      background-color: ${charcoalColor};
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.8px;
    }

    /* Triangular Ribbon Under-Fold */
    .ribbon-fold {
      position: absolute;
      right: 0;
      bottom: -9px;
      width: 0;
      height: 0;
      border-top: 9px solid #111315;
      border-right: 15px solid transparent;
    }

    .sidebar-section {
      margin-bottom: 22px;
    }

    .sidebar-content {
      padding: 0 26px 0 32px;
    }

    /* Contact Details */
    .contact-item {
      margin-bottom: 10px;
    }

    .contact-label {
      font-size: 11px;
      font-weight: 700;
      color: #232628;
      margin-bottom: 2px;
    }

    .contact-val {
      font-size: 10px;
      color: #55575b;
      line-height: 1.35;
      word-break: break-word;
    }

    /* Education Items */
    .edu-item {
      margin-bottom: 12px;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: #232628;
      line-height: 1.25;
    }

    .edu-school {
      font-size: 10px;
      color: #55575b;
      margin-top: 2px;
    }

    .edu-years {
      font-size: 9.5px;
      color: #66686c;
      margin-top: 1px;
    }

    /* Bulleted Lists (Skills & Languages) */
    .sidebar-list {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 5.5px;
    }

    .sidebar-list li {
      font-size: 10.5px;
      font-weight: 500;
      color: #333538;
      line-height: 1.2;
    }

    /* Right Main Content */
    .main-panel {
      flex: 1;
      min-height: 1123px;
      padding: 60px 42px 35px 44px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      z-index: 2;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: #232628;
      line-height: 1.05;
      letter-spacing: -0.5px;
    }

    .candidate-title {
      font-size: 14px;
      font-weight: 700;
      color: #55575b;
      letter-spacing: 0.4px;
      margin-top: 8px;
    }

    .section-title-underline {
      font-size: 17px;
      font-weight: 700;
      color: #232628;
      letter-spacing: -0.2px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${charcoalColor};
      margin-bottom: 12px;
    }

    .profile-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #44474b;
      text-align: justify;
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
      justify-content: space-between;
      align-items: baseline;
    }

    .exp-company {
      font-size: 13px;
      font-weight: 700;
      color: #232628;
    }

    .exp-years {
      font-size: 10.5px;
      font-weight: 700;
      color: #66686c;
    }

    .exp-role {
      font-size: 11px;
      color: #55575b;
      margin-top: 1px;
      margin-bottom: 5px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 3.5px;
    }

    .exp-bullets li {
      font-size: 10.2px;
      line-height: ${lineSpacing};
      color: #44474b;
      text-align: justify;
    }

    .references-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ref-name {
      font-size: 12px;
      font-weight: 700;
      color: #232628;
    }

    .ref-role {
      font-size: 10.5px;
      color: #55575b;
      margin-top: 1px;
    }

    .ref-contact {
      font-size: 10px;
      color: #66686c;
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
    <!-- Right-Edge Accent Tabs -->
    <div class="right-tab-top"></div>
    <div class="right-tab-mid"></div>
    <div class="right-tab-bottom"></div>

    <!-- Left Sidebar -->
    <div class="sidebar">
      ${photoSrc ? `
      <!-- Circular Profile Photo -->
      <div class="photo-wrapper avatar-container">
        <div class="profile-photo-ring">
          <div class="avatar-mask">
            <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
          </div>
        </div>
      </div>
      ` : ''}

      ${hasContact ? `
      <!-- Contact Section with Folded Ribbon -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'CONTACT'}</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          ${phoneText ? `
          <div class="contact-item">
            <div class="contact-label">Phone</div>
            <div class="contact-val" data-df-field="phone">${phoneText}</div>
          </div>
          ` : ''}
          ${emailText ? `
          <div class="contact-item">
            <div class="contact-label">Email</div>
            <div class="contact-val">
              <a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>
            </div>
          </div>
          ` : ''}
          ${locationText ? `
          <div class="contact-item">
            <div class="contact-label">Address</div>
            <div class="contact-val" data-df-field="location">${locationText}</div>
          </div>
          ` : ''}
          ${websiteText ? `
          <div class="contact-item">
            <div class="contact-label">Website</div>
            <div class="contact-val">
              <a href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
            </div>
          </div>
          ` : ''}
          ${linkedinText ? `
          <div class="contact-item">
            <div class="contact-label">LinkedIn</div>
            <div class="contact-val">
              <a href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      ${educationList.length > 0 ? `
      <!-- Education Section with Folded Ribbon -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'EDUCATION'}</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          ${educationList.map((e, idx) => `
            <div class="edu-item">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}${e.note ? ` · ${e.note}` : ''}</div>
              <div class="edu-years" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${skillsList.length > 0 ? `
      <!-- Skills Section with Folded Ribbon -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'SKILLS'}</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          <ul class="sidebar-list">
            ${skillsList.map((s, idx) => {
              const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
              return `<li data-df-field="skill:${idx}">${name}</li>`;
            }).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      ${languageList.length > 0 ? `
      <!-- Languages Section with Folded Ribbon -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header">LANGUAGES</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          <ul class="sidebar-list">
            ${languageList.map((l, idx) => `<li data-df-field="custom:custom_languages:${idx}:title">${typeof l === 'string' ? l : (l?.title || l?.name || 'Language')}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Right Main Panel -->
    <div class="main-panel">
      <!-- Candidate Header -->
      <div>
        ${(firstName || lastName) ? `<h1 class="candidate-name" data-df-field="name">${firstName}${lastName ? `<br>${lastName}` : ''}</h1>` : ''}
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
      </div>

      ${data.summary ? `
      <!-- Profile Section -->
      <div>
        <h2 class="section-title-underline section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Profile'}</h2>
        <p class="profile-text" data-df-field="summary">
          ${data.summary}
        </p>
      </div>
      ` : ''}

      ${experienceList.length > 0 ? `
      <!-- Work Experience Section -->
      <div>
        <h2 class="section-title-underline section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'WORK EXPERIENCE'}</h2>
        <div class="experience-list">
          ${experienceList.map((e, idx) => {
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
            return `
              <div class="exp-item">
                <div class="exp-header">
                  <span class="exp-company" data-df-field="exp:${idx}:company">${e.company || ''}</span>
                  <span class="exp-years" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
                </div>
                <div class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</div>
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
      <div>
        <h2 class="section-title-underline section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'PROJECTS'}</h2>
        <div class="experience-list">
          ${projectsList.map((p, idx) => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="exp-company" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                ${p.url ? `<span class="exp-years" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div class="profile-text" data-df-field="proj:${idx}:description" style="margin-top: 3px;">${p.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${referenceList.length > 0 ? `
      <!-- References Section -->
      <div>
        <h2 class="section-title-underline section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'REFERENCES'}</h2>
        <div class="references-list">
          ${referenceList.map((r, idx) => `
            <div>
              <div class="ref-name" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="ref-role" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
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
