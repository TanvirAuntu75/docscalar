/**
 * Exact 1:1 High-Fidelity Replica: Executive Resume - Editorial Swiss (Arthur Pendelton)
 * Features:
 * - Editorial Swiss Typography (Inter + Newsreader Italic Serif)
 * - Prominent Framed Circular Portrait (140x140px) with Double Ring Border & Subtle Drop Shadow
 * - Clean Sub-Header Horizontal Contact Bar with Inline SVGs
 * - Asymmetric 2-Column Swiss Grid (215px Sidebar / Dynamic Main Panel)
 * - Structured Education, Competencies, and Tooling Tags
 * - Hairline Structural Footer Rule (#0f172a)
 */

export function generateArthurPendeltonHtml(
  data = {},
  themeColor = '#0f172a',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0f172a' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const photoSrc = (safeData.photoUrl || '').trim();

  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const contactPhone = (safeData.phone || '').trim();
  const contactEmail = (safeData.email || '').trim();
  const contactLocation = (safeData.location || safeData.address || '').trim();
  const contactWebsite = (safeData.website || '').trim();
  const contactLinkedin = (safeData.linkedin || '').trim();

  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const competencyList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const langSection = customSections.find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const otherCustomSections = customSections.filter(cs => cs !== langSection);
  const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);

  const hasContact = Boolean(contactPhone || contactEmail || contactLocation || contactWebsite || contactLinkedin);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,400&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: transparent;
      font-family: ${fontFam};
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Canvas (794px x 1123px) */
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
      display: flex;
      flex-direction: column;
      padding: ${36 + pageMargin}px 46px;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, .resume-canvas:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1.5px solid ${accent};
    }

    .header-left {
      flex: 1;
      padding-right: 20px;
    }

    .candidate-name {
      font-family: ${fontFam};
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: ${accent};
      line-height: 1.05;
      text-transform: uppercase;
    }

    .candidate-title {
      font-family: 'Newsreader', serif;
      font-size: 16px;
      font-style: italic;
      color: #475569;
      margin-top: 4px;
    }

    /* High-Impact Circular Portrait Frame */
    .photo-frame.avatar-mask {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 1.5px solid #cbd5e1;
      padding: 3px;
      background-color: #ffffff;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .profile-photo.avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center top;
      filter: grayscale(100%) contrast(105%);
      display: block;
    }

    /* Sub-Header Contact Row */
    .contact-bar {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9.5px;
      font-weight: 500;
      color: #475569;
      letter-spacing: 0.2px;
    }

    .contact-bar span, .contact-bar a {
      display: flex;
      align-items: center;
      gap: 5px;
      color: inherit;
      text-decoration: none;
    }

    .contact-bar svg {
      width: 11px;
      height: 11px;
      fill: ${accent};
      flex-shrink: 0;
    }

    /* 2-Column Body Layout */
    .main-body {
      display: grid;
      grid-template-columns: 215px 1fr;
      gap: 32px;
      margin-top: 16px;
      flex: 1;
    }

    /* Section Typography */
    .section-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background-color: #e2e8f0;
    }

    /* Left Sidebar */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sidebar-block {
      display: flex;
      flex-direction: column;
    }

    /* Education Entry */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .edu-item {
      display: flex;
      flex-direction: column;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: ${accent};
      line-height: 1.25;
    }

    .edu-school {
      font-size: 10px;
      color: #475569;
      margin-top: 1px;
    }

    .edu-year {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Key Competencies */
    .competency-list {
      list-style-type: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .competency-list li {
      font-size: 9.8px;
      color: #334155;
      font-weight: 500;
      position: relative;
      padding-left: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .competency-list li::before {
      content: '–';
      position: absolute;
      left: 0;
      color: #64748b;
    }

    /* Right Main Panel */
    .content-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Executive Summary */
    .summary-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #334155;
      text-align: justify;
    }

    /* Experience Timeline */
    .exp-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .exp-item {
      display: flex;
      flex-direction: column;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .exp-role {
      font-size: 11.5px;
      font-weight: 700;
      color: ${accent};
    }

    .exp-dates {
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.3px;
    }

    .exp-company {
      font-family: 'Newsreader', serif;
      font-size: 11px;
      font-style: italic;
      color: #475569;
      margin-top: 1px;
      margin-bottom: 4px;
    }

    .exp-bullets {
      list-style-type: none;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      position: relative;
      padding-left: 12px;
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #334155;
      text-align: justify;
    }

    .exp-bullets li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${accent};
      font-size: 11px;
      line-height: 1;
    }

    /* Bottom Subdued Accent */
    .footer-rule {
      width: 100%;
      height: 2px;
      background-color: ${accent};
      margin-top: auto;
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
    
    <!-- Top Header -->
    <div class="header">
      <div class="header-left">
        <h1 class="candidate-name" data-df-field="name">${name}</h1>
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      </div>
      ${photoSrc ? `
      <div class="photo-frame avatar-mask">
        <img class="profile-photo avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}">
      </div>
      ` : ''}
    </div>

    <!-- Contact Row -->
    ${hasContact ? `
    <div class="contact-bar">
      ${contactPhone ? `
      <span>
        <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        <span data-df-field="phone">${contactPhone}</span>
      </span>
      ` : ''}
      ${contactEmail ? `
      <span>
        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        <a href="mailto:${contactEmail}" data-df-field="email">${contactEmail}</a>
      </span>
      ` : ''}
      ${contactLocation ? `
      <span>
        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <span data-df-field="location">${contactLocation}</span>
      </span>
      ` : ''}
      ${contactWebsite ? `
      <span>
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        <a href="https://${contactWebsite.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website">${contactWebsite.replace(/^https?:\/\//, '')}</a>
      </span>
      ` : ''}
      ${contactLinkedin ? `
      <span>
        <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z"/></svg>
        <a href="https://${contactLinkedin.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin">${contactLinkedin.replace(/^https?:\/\//, '')}</a>
      </span>
      ` : ''}
    </div>
    ` : ''}

    <!-- Main Content Grid -->
    <div class="main-body">
      
      <!-- Left Sidebar -->
      <div class="sidebar">
        
        ${educationList.length > 0 ? `
        <!-- Education -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</div>
          <div class="edu-list">
            ${educationList.map((edu, idx) => `
            <div class="edu-item">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${edu.degree || ''}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${edu.school || ''}</div>
              <div class="edu-year" data-df-field="edu:${idx}:date">${edu.date || (edu.start ? `${edu.start}${edu.end ? ` – ${edu.end}` : ''}` : '')}</div>
              ${edu.note ? `<div class="edu-year">GPA: ${edu.note}</div>` : ''}
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${competencyList.length > 0 ? `
        <!-- Core Competencies -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</div>
          <ul class="competency-list">
            ${competencyList.map((c, idx) => {
              const sName = typeof c === 'string' ? (c.includes(' - ') ? c.split(' - ')[0] : c) : c.name || '';
              return `<li data-df-field="skill:${idx}">${sName}</li>`;
            }).join('')}
          </ul>
        </div>
        ` : ''}

        ${certList.length > 0 ? `
        <!-- Certifications -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</div>
          <ul class="competency-list">
            ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${langList.length > 0 ? `
        <!-- Languages -->
        <div class="sidebar-block">
          <div class="section-label">${langSection?.title || 'Languages'}</div>
          <ul class="competency-list">
            ${langList.map((l, idx) => `<li data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${l.title || ''}${l.value ? `: <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

      </div>

      <!-- Right Main Content Panel -->
      <div class="content-panel">
        
        ${summaryText ? `
        <!-- Summary -->
        <div class="sidebar-block">
          <div class="section-label">Executive Profile</div>
          <p class="summary-text" data-df-field="summary">
            ${summaryText}
          </p>
        </div>
        ` : ''}

        ${experienceList.length > 0 ? `
        <!-- Professional Experience -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</div>
          <div class="exp-list">
            ${experienceList.map((exp, idx) => {
              const bullets = exp.highlights && exp.highlights.filter(Boolean).length ? exp.highlights.filter(Boolean) : (exp.description ? [exp.description] : []);
              return `
              <div class="exp-item">
                <div class="exp-header">
                  <span class="exp-role" data-df-field="exp:${idx}:role">${exp.role || ''}</span>
                  <span class="exp-dates" data-df-field="exp:${idx}:date">${exp.dates || (exp.start ? `${exp.start}${exp.end ? ` – ${exp.end}` : ''}` : '')}</span>
                </div>
                <div class="exp-company"><span data-df-field="exp:${idx}:company">${exp.company || ''}</span></div>
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

        ${projectList.length > 0 ? `
        <!-- Projects -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</div>
          <div class="exp-list">
            ${projectList.map((p, idx) => `
              <div class="exp-item">
                <div class="exp-header">
                  <span class="exp-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                  ${p.url ? `<span class="exp-dates"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
                </div>
                ${p.description ? `<div class="summary-text" data-df-field="proj:${idx}:description" style="margin-top: 2px;">${p.description}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${referenceList.length > 0 ? `
        <!-- References -->
        <div class="sidebar-block">
          <div class="section-label section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${referenceList.map((r, idx) => `
              <div style="font-size: 9.5px;">
                <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: ${accent};">${r.name || ''}</div>
                <div data-df-field="ref:${idx}:relation" style="color: #64748b; font-style: italic;">${r.relation || r.role || ''}</div>
                <div data-df-field="ref:${idx}:contact" style="color: #334155;">${r.contact || (r.phone ? `Phone: ${r.phone} · ` : '') + (r.email ? `Email: ${r.email}` : '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${otherCustomSections.map(cs => {
          if (!cs || !cs.items || !cs.items.length) return '';
          return `
            <div class="sidebar-block">
              <div class="section-label">${cs.title || 'Additional Information'}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${cs.items.map((i, idx) => `
                  <div style="font-size: 9.5px;">
                    <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

      </div>
    </div>

    <!-- Structural Bottom Rule -->
    <div class="footer-rule"></div>

  </div>

</body>
</html>`;
}
