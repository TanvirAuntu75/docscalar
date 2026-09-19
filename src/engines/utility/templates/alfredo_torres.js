/**
 * Exact 1:1 High-Fidelity Replica: Alfredo Torres Resume
 * Features:
 * - Mathematical Parallel Geometric Header Vector (Ochre, Slate, Navy)
 * - Grayscale Framed Photo Container (170x200px) with 8px radius
 * - Bold Uppercase Plus Jakarta Sans Typography
 * - 2-Column Clean Layout with Left Sidebar & Right Timeline / References
 * - Navy Footer Anchor Band (#1e293b)
 */

export function generateAlfredoTorresHtml(
  data = {},
  themeColor = '#b89358',
  themeFont = 'Plus Jakarta Sans',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#b89358' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Plus Jakarta Sans', sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const photoSrc = (safeData.photoUrl || '').trim();

  const profileSummary = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const contactPhone = (safeData.phone || '').trim();
  const contactEmail = (safeData.email || '').trim();
  const contactLocation = (safeData.location || safeData.address || '').trim();
  const contactWebsite = (safeData.website || '').trim();
  const contactLinkedin = (safeData.linkedin || '').trim();

  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const hasContact = Boolean(contactPhone || contactEmail || contactLocation || contactWebsite || contactLinkedin);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed Standard A4 Canvas */
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
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, .resume-canvas:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Seamless Geometric Header Vector */
    .header-graphics {
      position: absolute;
      top: 0;
      left: 0;
      width: 794px;
      height: 140px;
      z-index: 1;
      pointer-events: none;
    }

    /* Header Content */
    .header-section {
      position: relative;
      z-index: 2;
      display: flex;
      padding: ${35 + pageMargin}px 48px 18px 48px;
      gap: 36px;
      align-items: flex-end;
    }

    .photo-frame.avatar-mask {
      width: 160px;
      height: 190px;
      background-color: #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .profile-photo.avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      filter: grayscale(100%) contrast(105%);
      display: block;
    }

    .header-text {
      flex: 1;
      padding-bottom: 8px;
    }

    .candidate-name {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #1e293b;
      line-height: 1.05;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 2px;
      color: ${accent};
      text-transform: uppercase;
      margin-top: 6px;
    }

    /* Body 2-Column Split */
    .body-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex: 1;
      padding: 10px 48px 24px 48px;
      gap: 40px;
    }

    /* Left Sidebar */
    .left-column {
      width: 230px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .sidebar-section h3 {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #1e293b;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar-section h3::after {
      content: '';
      flex: 1;
      height: 2px;
      background-color: ${accent};
    }

    .contact-item {
      font-size: 11px;
      line-height: 1.5;
      color: #475569;
      margin-bottom: 6px;
      word-break: break-all;
    }

    .contact-item strong {
      display: block;
      font-size: 9.5px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #1e293b;
    }

    .skills-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .skills-list li {
      font-size: 11.5px;
      font-weight: 600;
      color: #334155;
    }

    .skills-list li::before {
      content: '• ';
      color: ${accent};
      font-weight: bold;
    }

    /* Right Main Panel */
    .right-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .main-section h2 {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      color: #1e293b;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .main-section h2::after {
      content: '';
      flex: 1;
      height: 2px;
      background-color: #e2e8f0;
    }

    .summary-text {
      font-size: 11px;
      line-height: ${lineSpacing};
      color: #475569;
      text-align: justify;
    }

    .timeline-item {
      margin-bottom: 12px;
      position: relative;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }

    .timeline-role {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .timeline-company {
      font-size: 11px;
      font-weight: 700;
      color: ${accent};
    }

    .timeline-date {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .timeline-bullets {
      list-style-type: disc;
      padding-left: 16px;
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .timeline-bullets li {
      font-size: 10.8px;
      line-height: ${lineSpacing};
      color: #475569;
    }

    /* Footer Band */
    .footer-band {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 794px;
      height: 18px;
      background-color: #1e293b;
      z-index: 10;
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
    <!-- Geometric Header Vector Background -->
    <svg class="header-graphics" viewBox="0 0 794 140" preserveAspectRatio="none">
      <polygon points="0,0 794,0 794,80 0,140" fill="${accent}" />
      <polygon points="0,0 520,0 440,140 0,140" fill="#334155" opacity="0.9" />
      <polygon points="0,0 320,0 260,140 0,140" fill="#1e293b" />
    </svg>

    <!-- Header Section -->
    <div class="header-section">
      ${photoSrc ? `
        <div class="photo-frame avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
        </div>
      ` : ''}
      <div class="header-text">
        <div class="candidate-name" data-df-field="name">${name}</div>
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="body-content">
      <!-- Left Column -->
      <div class="left-column">
        ${hasContact ? `
        <div class="sidebar-section">
          <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
          ${contactPhone ? `<div class="contact-item"><strong>Phone</strong><span data-df-field="phone">${contactPhone}</span></div>` : ''}
          ${contactEmail ? `<div class="contact-item"><strong>Email</strong><a href="mailto:${contactEmail}" style="color: inherit; text-decoration: none;" data-df-field="email">${contactEmail}</a></div>` : ''}
          ${contactLocation ? `<div class="contact-item"><strong>Location</strong><span data-df-field="location">${contactLocation}</span></div>` : ''}
          ${contactWebsite ? `<div class="contact-item"><strong>Website</strong><a href="https://${contactWebsite.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${contactWebsite.replace(/^https?:\/\//, '')}</a></div>` : ''}
          ${contactLinkedin ? `<div class="contact-item"><strong>LinkedIn</strong><a href="https://${contactLinkedin.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${contactLinkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        </div>
        ` : ''}

        ${educationList.length > 0 ? `
        <div class="sidebar-section">
          <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
          ${educationList.map((edu, idx) => `
            <div class="contact-item" style="margin-bottom: 10px;">
              <strong data-df-field="edu:${idx}:degree">${edu.degree || ''}</strong>
              <div data-df-field="edu:${idx}:school" style="color: #334155; font-weight: 600;">${edu.school || ''}</div>
              <div data-df-field="edu:${idx}:date" style="font-size: 10px; color: #64748b;">${edu.date || (edu.start ? `${edu.start}${edu.end ? ` - ${edu.end}` : ''}` : '')}</div>
              ${edu.note ? `<div style="font-size: 10px; color: #64748b;">GPA: ${edu.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${skillsList.length > 0 ? `
        <div class="sidebar-section">
          <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
          <ul class="skills-list">
            ${skillsList.map((s, idx) => {
              const sName = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
              return `<li data-df-field="skill:${idx}">${sName}</li>`;
            }).join('')}
          </ul>
        </div>
        ` : ''}

        ${certList.length > 0 ? `
        <div class="sidebar-section">
          <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
          <ul class="skills-list">
            ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>

      <!-- Right Column -->
      <div class="right-column">
        ${profileSummary ? `
        <div class="main-section">
          <h2 class="section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || data.sectionTitles?.profile || 'Profile'}</h2>
          <p class="summary-text" data-df-field="summary">${profileSummary}</p>
        </div>
        ` : ''}

        ${experienceList.length > 0 ? `
        <div class="main-section">
          <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
          ${experienceList.map((exp, idx) => {
            const bullets = exp.highlights && exp.highlights.filter(Boolean).length ? exp.highlights.filter(Boolean) : (exp.description ? [exp.description] : []);
            return `
            <div class="timeline-item">
              <div class="timeline-header">
                <span class="timeline-role" data-df-field="exp:${idx}:role">${exp.role || ''}</span>
                <span class="timeline-date" data-df-field="exp:${idx}:date">${exp.date || (exp.start ? `${exp.start}${exp.end ? ` - ${exp.end}` : ''}` : '')}</span>
              </div>
              <div class="timeline-company"><span data-df-field="exp:${idx}:company">${exp.company || ''}</span></div>
              ${bullets.length > 0 ? `
                <ul class="timeline-bullets">
                  ${bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
          }).join('')}
        </div>
        ` : ''}

        ${projectList.length > 0 ? `
        <div class="main-section">
          <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
          ${projectList.map((p, idx) => `
            <div class="timeline-item">
              <div class="timeline-header">
                <span class="timeline-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                ${p.url ? `<span class="timeline-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div class="summary-text" data-df-field="proj:${idx}:description" style="margin-top: 2px;">${p.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${referenceList.length > 0 ? `
        <div class="main-section">
          <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${referenceList.map((r, idx) => `
              <div style="font-size: 11px;">
                <div data-df-field="ref:${idx}:name" style="font-weight: 800; color: #1e293b;">${r.name || ''}</div>
                <div data-df-field="ref:${idx}:relation" style="color: #64748b; font-style: italic;">${r.relation || r.role || ''}</div>
                <div data-df-field="ref:${idx}:contact" style="color: #475569;">${r.contact || (r.phone ? `Phone: ${r.phone} · ` : '') + (r.email ? `Email: ${r.email}` : '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${customSections.map(cs => {
          if (!cs || !cs.items || !cs.items.length) return '';
          return `
            <div class="main-section">
              <h2 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${cs.items.map((i, idx) => `
                  <div style="font-size: 11px;">
                    <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Navy Anchor Footer Band -->
    <div class="footer-band"></div>
  </div>

</body>
</html>`;
}
