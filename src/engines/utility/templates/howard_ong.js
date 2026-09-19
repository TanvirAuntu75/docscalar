// ═══════════════════════════════════════════════════════════════════════════════
// HOWARD ONG — Exact 1:1 Pixel-Perfect Replica from User Template
// Top Burgundy Header Banner (#7e444b), 2-Column Body with Headroom Halo & Bottom Footer Bar
// ═══════════════════════════════════════════════════════════════════════════════

export function generateHowardOngHtml(
  data,
  themeColor = '#7e444b',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const burgundyColor = themeColor === 'default' || !themeColor ? '#7e444b' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const candidateName = data.name ? (data.name || '').toUpperCase().trim() : '';
  const photoSrc = data.photoUrl || '';
  const summaryText = data.summary || data.profile || '';

  const phoneText = data.phone || '';
  const emailText = data.email || '';
  const locationText = data.location || '';
  const websiteText = data.website || '';
  const linkedinText = data.linkedin || '';
  const hasContact = Boolean(phoneText || emailText || locationText || websiteText || linkedinText);

  const rawSkills = (data.skills && data.skills.length) ? data.skills : [];
  const cleanSkills = rawSkills.map(s => typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '').filter(Boolean);
  const hardSkills = cleanSkills.slice(0, 5);
  const softSkills = cleanSkills.slice(5);

  const educationList = (data.education && data.education.length) ? data.education : [];
  const experienceList = (data.experience && data.experience.length) ? data.experience : [];
  const referenceList = (data.references && data.references.length) ? data.references : [];
  const projectsList = (data.projects && data.projects.length) ? data.projects : [];
  const achievementsList = (data.awards || data.certifications || []).map(a => typeof a === 'string' ? { date: '', desc: a } : { date: a.date || a.year || '', desc: a.title || a.name || '' });

  const hasHeader = Boolean(candidateName || data.title || photoSrc);

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

    /* Top Burgundy Header Banner */
    .header-banner {
      width: 100%;
      height: 185px;
      background-color: ${burgundyColor};
      position: relative;
      flex-shrink: 0;
    }

    .header-text-container {
      position: absolute;
      top: 50px;
      left: 310px;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 17px;
      font-weight: 400;
      color: #f1e2e4;
      margin-top: 8px;
      letter-spacing: 0.3px;
    }

    /* Circular Profile Photo with Optimal Headroom Framing */
    .avatar-container {
      position: absolute;
      top: 45px;
      left: 48px;
      width: 220px;
      height: 220px;
      z-index: 5;
    }

    .avatar-mask {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
      background-color: #ffffff;
    }

    .profile-photo, .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Two-Column Main Body */
    .body-container {
      display: flex;
      padding: 25px 45px 30px 48px;
      gap: 36px;
      flex: 1;
    }

    /* Section Heading Styles */
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: ${burgundyColor};
      margin-bottom: 6px;
      display: inline-block;
      border-bottom: 1.5px solid ${burgundyColor};
      padding-bottom: 3px;
      letter-spacing: -0.2px;
    }

    /* Left Sidebar Column */
    .left-col {
      width: 225px;
      flex-shrink: 0;
      margin-top: 65px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 4px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
      color: #2e3033;
      font-weight: 500;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: #2e3033;
      flex-shrink: 0;
    }

    /* Left Column Bullet Lists */
    .bullet-list {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 4.5px;
      margin-top: 4px;
    }

    .bullet-list li {
      font-size: 10px;
      color: #2e3033;
      font-weight: 500;
      line-height: 1.35;
    }

    /* Education Items */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 6px;
    }

    .edu-item {
      position: relative;
      padding-left: 14px;
    }

    .edu-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #2e3033;
    }

    .edu-school {
      font-size: 10.5px;
      font-weight: 700;
      color: #2e3033;
      line-height: 1.25;
    }

    .edu-degree {
      font-size: 9.5px;
      font-style: italic;
      color: #484b50;
      margin-top: 1px;
      line-height: 1.3;
    }

    .edu-date {
      font-size: 9px;
      color: #63666b;
      margin-top: 1px;
    }

    /* Right Main Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .about-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #3b3d40;
      text-align: justify;
      margin-top: 4px;
    }

    .exp-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 6px;
    }

    .exp-item {
      position: relative;
      padding-left: 14px;
    }

    .exp-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 5px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #2e3033;
    }

    .exp-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .exp-role {
      font-size: 11px;
      font-weight: 700;
      color: #2e3033;
    }

    .exp-dates {
      font-size: 9.5px;
      font-weight: 700;
      color: #2e3033;
    }

    .exp-company {
      font-size: 10px;
      font-style: italic;
      color: #484b50;
      margin-top: 1px;
      margin-bottom: 3px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #3b3d40;
      text-align: justify;
    }

    .achievements-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }

    .achievement-item {
      display: flex;
      gap: 8px;
      font-size: 9.5px;
      line-height: 1.35;
      color: #3b3d40;
    }

    .achievement-date {
      font-weight: 700;
      color: #2e3033;
      flex-shrink: 0;
    }

    .achievement-desc {
      text-align: justify;
    }

    .references-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 6px;
    }

    .ref-item {
      display: flex;
      flex-direction: column;
    }

    .ref-name {
      font-size: 10.5px;
      font-weight: 700;
      color: #2e3033;
    }

    .ref-role {
      font-size: 9.5px;
      color: #484b50;
      margin-top: 1px;
    }

    .ref-contact {
      font-size: 9px;
      color: #63666b;
      margin-top: 2px;
    }

    /* Bottom Decorative Burgundy Bar */
    .footer-bar {
      width: 100%;
      height: 24px;
      background-color: ${burgundyColor};
      margin-top: auto;
      flex-shrink: 0;
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
    <!-- Top Burgundy Header Banner -->
    <div class="header-banner">
      ${photoSrc ? `
      <!-- Circular Profile Photo -->
      <div class="avatar-container">
        <div class="avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
        </div>
      </div>
      ` : ''}

      <div class="header-text-container">
        ${candidateName ? `<h1 class="candidate-name" data-df-field="name">${candidateName}</h1>` : ''}
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
      </div>
    </div>

    <!-- Two-Column Main Body -->
    <div class="body-container">
      
      <!-- Left Column: Contact, Skills, Education -->
      <div class="left-col">
        ${hasContact ? `
        <!-- Contact Details -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'CONTACT'}</div>
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

        ${hardSkills.length > 0 ? `
        <!-- Skills (Column 1) -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'SKILLS'}</div>
          <ul class="bullet-list">
            ${hardSkills.map((s, idx) => `<li data-df-field="skill:${idx}">${s}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${softSkills.length > 0 ? `
        <!-- Expertise -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'EXPERTISE'}</div>
          <ul class="bullet-list">
            ${softSkills.map((s, idx) => `<li data-df-field="skill:${idx + hardSkills.length}">${s}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${educationList.length > 0 ? `
        <!-- Education -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'EDUCATION'}</div>
          <div class="edu-list">
            ${educationList.map((e, idx) => `
              <div class="edu-item">
                <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
                <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}${e.note ? ` · ${e.note}` : ''}</div>
                <div class="edu-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Right Column: Profile, Experience, Achievements, References -->
      <div class="right-col">
        ${summaryText ? `
        <!-- Profile Section -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'PROFILE'}</div>
          <p class="about-text" data-df-field="summary">
            ${summaryText}
          </p>
        </div>
        ` : ''}

        ${experienceList.length > 0 ? `
        <!-- Work Experience Section -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'WORK EXPERIENCE'}</div>
          <div class="exp-list">
            ${experienceList.map((e, idx) => {
              const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : (e.description ? [e.description] : []);
              return `
                <div class="exp-item">
                  <div class="exp-title-row">
                    <span class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
                    <span class="exp-dates" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
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
          <div class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'PROJECTS'}</div>
          <div class="exp-list">
            ${projectsList.map((p, idx) => `
              <div class="exp-item">
                <div class="exp-title-row">
                  <span class="exp-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                  ${p.url ? `<span class="exp-dates" data-df-field="proj:${idx}:url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
                </div>
                ${p.description ? `<div class="about-text" data-df-field="proj:${idx}:description" style="margin-top: 3px;">${p.description}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${achievementsList.length > 0 ? `
        <!-- Achievements Section -->
        <div>
          <div class="section-title">ACHIEVEMENTS</div>
          <div class="achievements-list">
            ${achievementsList.map((a, idx) => `
              <div class="achievement-item">
                ${a.date ? `<span class="achievement-date">${a.date}</span>` : ''}
                <span class="achievement-desc" data-df-field="cert:${idx}">${a.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${referenceList.length > 0 ? `
        <!-- References Section -->
        <div>
          <div class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'REFERENCES'}</div>
          <div class="references-grid">
            ${referenceList.map((r, idx) => `
              <div class="ref-item">
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

    <!-- Bottom Decorative Burgundy Bar -->
    <div class="footer-bar"></div>
  </div>

</body>
</html>`;
}
