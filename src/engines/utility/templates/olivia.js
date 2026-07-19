export function generateOliviaHtml(data, themeColor = '#b38e70', themeFont = 'Playfair Display', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#b38e70' : themeColor;

  const nameParts = data.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const expHtml = data.experience.map(e => `
    <div class="timeline-item">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span class="timeline-role">${e.role}</span>
        <span class="timeline-date">${e.start} - ${e.end}</span>
      </div>
      <div class="timeline-company">${e.company}</div>
      ${e.highlights && e.highlights.length ? `<ul class="timeline-desc">${e.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const projHtml = data.projects && data.projects.length ? `
    <div style="margin-top: 10px;">
      ${data.projects.map(p => `
        <div class="project-item">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
            <span class="project-title">${p.name}</span>
            <span class="project-date">2023</span>
          </div>
          <div class="project-desc">${p.description}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      <div class="edu-container">
        ${data.education.map(e => `
          <div class="edu-item">
            <div class="edu-degree">${e.degree}</div>
            <div class="edu-school">${e.school}</div>
            <div class="edu-date">${e.start} - ${e.end}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-row">
              <span class="skill-name">${name}</span>
              <span class="skill-level">${levelText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>Languages</h3>
      <div class="sidebar-line"></div>
      <div class="lang-grid">
        ${langSection.items.map(i => {
          let name = i.title;
          let level = i.value || 'Native';
          return `
            <div class="lang-row">
              <span class="lang-name">${name}</span>
              <span class="lang-level">${level}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const phoneSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const emailSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  const addressSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const linkedinSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`;
  const websiteSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row">${phoneSvg}<span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row">${emailSvg}<span>${data.email}</span></div>` : ''}
        ${data.location ? `<div class="contact-row">${addressSvg}<span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row">${linkedinSvg}<span>${data.linkedin}</span></div>` : ''}
        ${data.website ? `<div class="contact-row">${websiteSvg}<span>${data.website}</span></div>` : ''}
      </div>
    </div>
  `;

  const profileIcon = `<div class="header-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`;
  const expIcon = `<div class="header-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>`;
  const projIcon = `<div class="header-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>`;

  const mainCustomHtml = (data.customSections || [])
    .filter(cs => cs.id !== 'custom_languages' && cs.title?.toLowerCase() !== 'languages')
    .map(cs => `
      <section class="main-section">
        <div class="section-header-wrap">
          <div class="header-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <h2>${cs.title}</h2>
        </div>
        <div class="main-line"></div>
        <div style="font-size: 8.5pt; color: #475569;">
          ${cs.items.map(i => `
            <div style="margin-bottom: 8px;">
              <strong>${i.title}</strong>${i.value ? `: ${i.value}` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #334155; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    min-height: 297mm;
  }
  
  /* Sidebar */
  .sidebar {
    width: 32%;
    background: #f9f6f0;
    border-right: 1px solid #e2e8f0;
    padding: 40px 20px;
    font-size: 8.5pt;
  }
  .avatar-container {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
  }
  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 3px solid ${accent};
    object-fit: cover;
  }
  .sidebar-section {
    margin-bottom: 28px;
  }
  .sidebar-section h3 {
    font-family: 'Playfair Display', serif;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e293b;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 2px solid ${accent};
    width: 35px;
    margin-bottom: 12px;
  }
  
  /* Contact Row */
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #475569;
  }
  .contact-row svg {
    width: 13px;
    height: 13px;
    min-width: 13px;
  }
  .contact-row span {
    font-size: 8.2pt;
    word-break: break-all;
  }
  
  /* Education sidebar dots timeline */
  .edu-container {
    position: relative;
    padding-left: 14px;
  }
  .edu-container::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 5px;
    bottom: 5px;
    width: 1px;
    background: #cbd5e1;
  }
  .edu-item {
    position: relative;
    margin-bottom: 14px;
  }
  .edu-item::before {
    content: "";
    position: absolute;
    left: -15px;
    top: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${accent};
  }
  .edu-degree {
    font-weight: 700;
    font-size: 8.5pt;
    color: #1e293b;
  }
  .edu-school {
    font-style: italic;
    color: #475569;
    font-size: 8pt;
    margin-top: 1px;
  }
  .edu-date {
    font-size: 7.8pt;
    color: #64748b;
    margin-top: 1px;
  }
  
  /* Skills list as textual levels */
  .skills-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .skill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .skill-name {
    font-size: 8.2pt;
    font-weight: 500;
    color: #334155;
  }
  .skill-level {
    font-size: 7.8pt;
    color: #64748b;
  }
  
  /* Languages row spacing */
  .lang-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 8.2pt;
  }
  .lang-name {
    font-weight: 500;
    color: #334155;
  }
  .lang-level {
    color: #64748b;
    font-size: 7.8pt;
  }
  
  /* Main Content */
  .main-content {
    width: 68%;
    padding: 45px 35px;
    background: #fff;
  }
  .main-header {
    margin-bottom: 30px;
  }
  .main-header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 28pt;
    font-weight: 500;
    letter-spacing: 0.5px;
    line-height: 1.1;
  }
  .main-header .first-name {
    color: ${accent};
  }
  .main-header .last-name {
    color: #1e293b;
    font-weight: 700;
  }
  .main-header .title-badge {
    background: ${accent};
    color: #fff;
    font-size: 8.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 4px 14px;
    display: inline-block;
    margin-top: 10px;
    margin-bottom: 12px;
  }
  .main-header .summary {
    font-size: 8.8pt;
    color: #475569;
    line-height: 1.5;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
  }
  
  /* Main sections */
  .main-section {
    margin-bottom: 24px;
  }
  .section-header-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .header-icon-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${accent};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-icon-circle svg {
    width: 13px;
    height: 13px;
  }
  .main-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1e293b;
    flex: 1;
  }
  .main-line {
    border-bottom: 1px solid #e2e8f0;
    margin-top: 4px;
    margin-bottom: 14px;
  }
  
  /* Experience timeline */
  .timeline-container {
    position: relative;
    padding-left: 18px;
  }
  .timeline-container::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 6px;
    bottom: 6px;
    width: 1px;
    background: #cbd5e1;
  }
  .timeline-item {
    position: relative;
    margin-bottom: 18px;
  }
  .timeline-item::before {
    content: "";
    position: absolute;
    left: -17.5px;
    top: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${accent};
  }
  .timeline-role {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
  }
  .timeline-date {
    font-size: 8pt;
    font-style: italic;
    color: #475569;
  }
  .timeline-company {
    font-style: italic;
    font-size: 8.5pt;
    color: #64748b;
    margin-bottom: 5px;
  }
  .timeline-desc {
    padding-left: 14px;
    font-size: 8.2pt;
    color: #475569;
    line-height: 1.45;
  }
  .timeline-desc li {
    margin-bottom: 3px;
  }
  
  /* Projects section */
  .project-item {
    margin-bottom: 12px;
  }
  .project-title {
    font-size: 9pt;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
  }
  .project-date {
    font-size: 8pt;
    color: #475569;
  }
  .project-desc {
    font-size: 8.2pt;
    color: #475569;
    line-height: 1.45;
    margin-top: 2px;
  }
</style></head><body>
<div id="main-container">
  <div class="sidebar">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_2.jpg'}" alt="photo" />
    </div>
    ${contactHtml}
    ${eduHtml}
    ${skillsHtml}
    ${langHtml}
  </div>
  
  <div class="main-content">
    <div class="main-header">
      <h1><span class="first-name">${firstName}</span> <span class="last-name">${lastName}</span></h1>
      ${data.title ? `<div class="title-badge">${data.title}</div>` : ''}
      ${data.summary ? `<div class="summary">${data.summary}</div>` : ''}
    </div>
    
    ${data.summary ? `
      <section class="main-section">
        <div class="section-header-wrap">
          ${profileIcon}
          <h2>Profile</h2>
        </div>
        <div class="main-line"></div>
        <div style="font-size: 8.8pt; color: #475569; line-height: 1.5;">${data.summary}</div>
      </section>
    ` : ''}
    
    ${data.experience && data.experience.length ? `
      <section class="main-section">
        <div class="section-header-wrap">
          ${expIcon}
          <h2>Experience</h2>
        </div>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${expHtml}
        </div>
      </section>
    ` : ''}
    
    ${data.projects && data.projects.length ? `
      <section class="main-section">
        <div class="section-header-wrap">
          ${projIcon}
          <h2>Projects</h2>
        </div>
        <div class="main-line"></div>
        ${projHtml}
      </section>
    ` : ''}
    
    ${mainCustomHtml}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. JONATHAN — Classic / Academic Centered Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════