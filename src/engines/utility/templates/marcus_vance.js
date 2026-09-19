/**
 * Exact 1:1 High-Fidelity Replica: Marcus Vance - Executive Resume (Bespoke Edition)
 * Features:
 * - Monolithic Geometric Dark Slate Header Vector with Teal & Cobalt Accent Ribbons
 * - Offset Rotated Accent Ring Headshot Frame (-3deg gradient ring, 20px rounded photo)
 * - Space Grotesk & Plus Jakarta Sans Dual Typographic System
 * - 38/62 Left-Right Split with Progress Bar Skill Cards & Track Record Timeline
 * - Multi-Tone Footer Band
 */

export function generateMarcusVanceHtml(
  data = {},
  themeColor = '#0d9488',
  themeFont = 'Space Grotesk',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0d9488' : themeColor;
  const photoSrc = data.photoUrl || '';

  // Map user data cleanly without resurrecting fake sample data
  const experienceList = (data.experience && data.experience.length > 0)
    ? data.experience.map(exp => ({
        role: exp.role || exp.position || '',
        company: exp.company || exp.workplace || '',
        date: exp.dates || exp.date || (exp.start ? `${exp.start}${exp.end ? ` – ${exp.end}` : ''}` : ''),
        bullets: Array.isArray(exp.highlights) && exp.highlights.length > 0
          ? exp.highlights.filter(Boolean)
          : (Array.isArray(exp.bullets) && exp.bullets.length > 0
            ? exp.bullets.filter(Boolean)
            : (exp.description ? exp.description.split('\n').filter(Boolean) : []))
      }))
    : [];

  const educationList = (data.education && data.education.length > 0)
    ? data.education.map((edu) => ({
        degree: edu.degree || '',
        school: edu.school || edu.institution || '',
        year: edu.date || (edu.start ? `${edu.start}${edu.end ? ` – ${edu.end}` : ''}` : ''),
        note: edu.note || ''
      }))
    : [];

  const skillsList = (data.skills && data.skills.length > 0)
    ? data.skills.map((s) => {
        if (typeof s === 'string') {
          return { name: s, level: 90 };
        }
        return { name: s.name, level: s.level || 90 };
      }).filter(s => s.name)
    : [];

  const certList = (data.certifications && data.certifications.length > 0)
    ? data.certifications.map(c => ({
        degree: typeof c === 'string' ? c : (c.name || ''),
        school: c.issuer || '',
        year: c.year || c.date || ''
      }))
    : [];

  const projectList = (data.projects && data.projects.length > 0)
    ? data.projects.map((p) => ({
        name: p.name || '',
        url: p.url || '',
        desc: p.description || ''
      })).filter(p => p.name || p.desc)
    : [];

  const referenceList = (data.references && data.references.length > 0) ? data.references : [];

  const contactPhone = data.phone || '';
  const contactEmail = data.email || '';
  const contactLocation = data.location || data.address || '';
  const contactWebsite = data.website || '';
  const contactLinkedin = data.linkedin || '';
  const hasContact = Boolean(contactPhone || contactEmail || contactLocation || contactWebsite || contactLinkedin);
  const summaryText = data.summary || data.profile || '';

  const hasHeader = Boolean(data.name || data.title || photoSrc || hasContact);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #383c40;
      font-family: 'Plus Jakarta Sans', sans-serif;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Standard A4 Container */
    .cv-page, .resume-canvas {
      width: 794px;
      min-height: 1123px;
      background-color: #f8fafc;
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

    /* Bespoke Header Geometry */
    .header-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 794px;
      height: 190px;
      z-index: 1;
      pointer-events: none;
    }

    .header-content {
      position: relative;
      z-index: 2;
      min-height: 190px;
      display: flex;
      align-items: center;
      padding: 20px 45px 15px 45px;
      gap: 32px;
    }

    /* Profile Frame with Geometric Accent Offset */
    .photo-wrapper {
      position: relative;
      width: 140px;
      height: 140px;
      flex-shrink: 0;
    }

    .photo-accent-ring {
      position: absolute;
      inset: -6px;
      border-radius: 24px;
      background: linear-gradient(135deg, #2b6cb0 0%, ${accent} 100%);
      transform: rotate(-3deg);
      z-index: 1;
    }

    .avatar-mask {
      width: 100%;
      height: 100%;
      border-radius: 20px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      background-color: #ffffff;
      border: 4px solid #ffffff;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
    }

    .profile-photo, .avatar {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }

    .header-details {
      flex: 1;
      color: #ffffff;
      padding-top: 10px;
    }

    .candidate-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.05;
      text-transform: uppercase;
      color: #ffffff;
    }

    .candidate-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2.5px;
      color: #5eead4;
      text-transform: uppercase;
      margin-top: 6px;
    }

    .header-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 12px;
      font-size: 10.5px;
      color: #cbd5e1;
      font-weight: 500;
    }

    .header-meta-row span, .header-meta-row a {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #cbd5e1;
      text-decoration: none;
    }

    .header-meta-row svg {
      width: 13px;
      height: 13px;
      fill: #5eead4;
    }

    /* Main Grid Structure */
    .main-grid {
      position: relative;
      z-index: 2;
      display: flex;
      flex: 1;
      padding: 30px 45px 35px 45px;
      gap: 36px;
    }

    /* Left Column (38%) */
    .sidebar-col {
      width: 230px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Right Column (62%) */
    .content-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Section Headings */
    .section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .title-indicator {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background-color: ${accent};
    }

    .title-line {
      flex: 1;
      height: 1.5px;
      background-color: #e2e8f0;
    }

    /* Callout Summary Card */
    .summary-card {
      background-color: #ffffff;
      border-left: 4px solid ${accent};
      border-radius: 0 10px 10px 0;
      padding: 14px 18px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .summary-text {
      font-size: 10.5px;
      line-height: 1.6;
      color: #334155;
      text-align: justify;
    }

    /* Experience Timeline */
    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exp-item {
      position: relative;
      padding-left: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .exp-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: -10px;
      width: 1.5px;
      background-color: #cbd5e1;
    }

    .exp-item:last-child::before {
      bottom: 6px;
    }

    .exp-node {
      position: absolute;
      left: 0;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ffffff;
      border: 2px solid ${accent};
    }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .exp-role {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .exp-date {
      font-size: 9.5px;
      font-weight: 600;
      color: ${accent};
      background-color: #f0fdfa;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #ccfbf1;
    }

    .exp-org {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      margin-top: 1px;
      margin-bottom: 5px;
    }

    .exp-bullets {
      list-style-type: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .exp-bullets li {
      position: relative;
      padding-left: 14px;
      font-size: 10px;
      line-height: 1.45;
      color: #475569;
      text-align: justify;
    }

    .exp-bullets li::before {
      content: '–';
      position: absolute;
      left: 0;
      color: ${accent};
      font-weight: bold;
    }

    /* Skills Progress Grid */
    .skills-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skill-card {
      background-color: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .skill-info {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-weight: 600;
      color: #1e293b;
    }

    .skill-bar-track {
      height: 5px;
      background-color: #f1f5f9;
      border-radius: 3px;
      overflow: hidden;
    }

    .skill-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #2b6cb0 0%, ${accent} 100%);
      border-radius: 3px;
    }

    /* Education Cards */
    .edu-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .edu-card {
      background-color: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    .edu-school {
      font-size: 10px;
      color: #64748b;
      margin-top: 1px;
    }

    .edu-year {
      font-size: 9px;
      font-weight: 600;
      color: ${accent};
      margin-top: 3px;
    }

    /* Footer Band */
    .footer-band {
      height: 12px;
      background: linear-gradient(90deg, #0f172a 0%, #1e293b 70%, ${accent} 100%);
      width: 100%;
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
    
    <!-- Unique Monolithic Geometric Header Vector -->
    <svg class="header-svg" viewBox="0 0 794 190" preserveAspectRatio="none">
      <path d="M0,0 L794,0 L794,145 L540,145 L470,190 L0,190 Z" fill="#0f172a" />
      <polygon points="540,145 794,145 794,155 525,155" fill="${accent}" />
      <polygon points="555,155 794,155 794,162 545,162" fill="#2b6cb0" />
    </svg>

    <!-- Header Content Overlay -->
    <div class="header-content">
      ${photoSrc ? `
      <div class="photo-wrapper avatar-container">
        <div class="photo-accent-ring"></div>
        <div class="avatar-mask">
          <img class="profile-photo avatar" src="${photoSrc}" alt="${data.name || 'Profile Photo'}">
        </div>
      </div>
      ` : ''}
      <div class="header-details">
        ${data.name ? `<h1 class="candidate-name" data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${hasContact ? `
        <div class="header-meta-row">
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
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <a href="https://${contactWebsite.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website">${contactWebsite.replace(/^https?:\/\//, '')}</a>
          </span>
          ` : ''}
          ${contactLinkedin ? `
          <span>
            <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 .01 3.25 1.63 1.63 0 0 0 0-3.25z"/></svg>
            <a href="https://${contactLinkedin.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="linkedin">${contactLinkedin.replace(/^https?:\/\//, '')}</a>
          </span>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Main Grid Content -->
    <div class="main-grid">
      
      <!-- Left Sidebar Column -->
      <div class="sidebar-col">
        
        ${skillsList.length > 0 ? `
        <!-- Core Competencies / Skills -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Core Focus'}</span>
            <div class="title-line"></div>
          </div>
          <div class="skills-group">
            ${skillsList.map((skill, idx) => `
            <div class="skill-card">
              <div class="skill-info">
                <span data-df-field="skill:${idx}">${skill.name}</span>
                <span>${skill.level}%</span>
              </div>
              <div class="skill-bar-track">
                <div class="skill-bar-fill" style="width: ${skill.level}%;"></div>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${educationList.length > 0 ? `
        <!-- Education -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</span>
            <div class="title-line"></div>
          </div>
          <div class="edu-group">
            ${educationList.map((edu, idx) => `
            <div class="edu-card">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${edu.degree}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${edu.school}${edu.note ? ` · ${edu.note}` : ''}</div>
              <div class="edu-year" data-df-field="edu:${idx}:date">${edu.year}</div>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${certList.length > 0 ? `
        <!-- Key Certifications -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Accreditation'}</span>
            <div class="title-line"></div>
          </div>
          <div class="edu-group">
            ${certList.map((cert, idx) => `
            <div class="edu-card">
              <div class="edu-degree" data-df-field="cert:${idx}">${cert.degree}</div>
              <div class="edu-school">${cert.school}</div>
              <div class="edu-year">${cert.year}</div>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

      </div>

      <!-- Right Main Column -->
      <div class="content-col">
        
        ${summaryText ? `
        <!-- Profile Summary -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Executive Summary'}</span>
            <div class="title-line"></div>
          </div>
          <div class="summary-card">
            <p class="summary-text" data-df-field="summary">
              ${summaryText}
            </p>
          </div>
        </div>
        ` : ''}

        ${experienceList.length > 0 ? `
        <!-- Experience Timeline -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Track Record'}</span>
            <div class="title-line"></div>
          </div>
          <div class="experience-list">
            ${experienceList.map((exp, idx) => `
            <div class="exp-item">
              <div class="exp-node"></div>
              <div class="exp-header">
                <span class="exp-role" data-df-field="exp:${idx}:role">${exp.role}</span>
                <span class="exp-date" data-df-field="exp:${idx}:date">${exp.date}</span>
              </div>
              <div class="exp-org" data-df-field="exp:${idx}:company">${exp.company}</div>
              ${exp.bullets.length > 0 ? `
              <ul class="exp-bullets">
                ${exp.bullets.map((b, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${b}</li>`).join('')}
              </ul>
              ` : ''}
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${projectList.length > 0 ? `
        <!-- Key Initiatives -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Key Initiatives'}</span>
            <div class="title-line"></div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            ${projectList.map((p, idx) => `
            <div style="font-size: 10px; line-height: 1.45; color: #475569;">
              <strong style="color: #0f172a; font-size: 10.5px;" data-df-field="proj:${idx}:name">${p.name}:</strong> <span data-df-field="proj:${idx}:description">${p.desc}</span>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${referenceList.length > 0 ? `
        <!-- References -->
        <div>
          <div class="section-title">
            <span class="title-indicator"></span>
            <span class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</span>
            <div class="title-line"></div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px;">
            ${referenceList.map((r, idx) => `
            <div class="edu-card">
              <div class="edu-degree" data-df-field="ref:${idx}:name">${r.name || ''}</div>
              <div class="edu-school" data-df-field="ref:${idx}:relation">${r.relation || ''}</div>
              ${r.contact ? `<div class="edu-year" data-df-field="ref:${idx}:contact">${r.contact}</div>` : ''}
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

      </div>

    </div>

    <!-- Bottom Palette Anchor -->
    <div class="footer-band"></div>
  </div>

</body>
</html>`;
}
