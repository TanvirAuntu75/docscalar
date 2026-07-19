export function generateMarianaHtml(data, themeColor = '#2c3549', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor;

  const expHtml = data.experience.map(e => `
    <div class="timeline-item">
      <div class="timeline-date">${e.start} – ${e.end}</div>
      <div class="timeline-company">${e.company}</div>
      <div class="timeline-role">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<ul class="timeline-desc">${e.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const refHtml = data.references && data.references.length ? `
    <div class="reference-grid">
      ${data.references.map(r => `
        <div class="ref-item">
          <div class="ref-name">${r.name}</div>
          <div class="ref-relation">${r.relation}</div>
          <div>Phone: ${r.phone}</div>
          <div>Email: ${r.email}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const mainCustomHtml = (data.customSections || [])
    .filter(cs => cs.id !== 'custom_languages' && cs.title?.toLowerCase() !== 'languages')
    .map(cs => `
      <section class="main-section">
        <h2>${cs.title}</h2>
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

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h2>Projects</h2>
      <div class="main-line"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 10px;">
          <div style="font-weight:700; font-size:9.5pt; color:#1e293b;">${p.name}${p.url ? ` <span style="font-weight:400; font-size:8pt; color:#64748b">(${p.url})</span>` : ''}</div>
          <div style="font-size:8.5pt; color:#475569; margin-top:2px;">${p.description}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <h2>Certifications</h2>
      <div class="main-line"></div>
      <ul style="padding-left:14px; font-size:8.5pt; color:#475569;">
        ${data.certifications.map(c => `<li style="margin-bottom:3px;">${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      ${data.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val">${data.phone}</span></div>` : ''}
      ${data.email ? `<div class="contact-item"><span class="label">Email</span><span class="val">${data.email}</span></div>` : ''}
      ${data.location ? `<div class="contact-item"><span class="label">Address</span><span class="val">${data.location}</span></div>` : ''}
      ${data.website ? `<div class="contact-item"><span class="label">Website</span><span class="val">${data.website}</span></div>` : ''}
      ${data.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><span class="val">${data.linkedin}</span></div>` : ''}
    </div>
  `;

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div class="edu-item">
          <div class="edu-date">${e.start} – ${e.end}</div>
          <div class="edu-degree">${e.degree}</div>
          <div class="edu-school">${e.school}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Expertise</h3>
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
      <h3>Language</h3>
      <div class="sidebar-line"></div>
      <ul class="lang-list">
        ${langSection.items.map(i => `<li>${i.title}${i.value ? ` - ${i.value}` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${themeFont}', 'Inter', sans-serif; background: #fff; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    min-height: 297mm;
  }
  
  /* Sidebar */
  .sidebar {
    width: 33%;
    background: ${accent === '#2c3549' || accent === 'default' ? '#2c3549' : accent};
    color: #fff;
    padding: 35px 20px;
    font-size: 8.5pt;
  }
  .avatar-container {
    display: flex;
    justify-content: center;
    margin-bottom: 25px;
  }
  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.4);
    object-fit: cover;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #fff;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
    margin-bottom: 12px;
  }
  .contact-item {
    margin-bottom: 10px;
  }
  .contact-item .label {
    display: block;
    font-weight: 700;
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.95);
  }
  .contact-item .val {
    display: block;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 1px;
    word-break: break-all;
  }
  .edu-item {
    margin-bottom: 12px;
  }
  .edu-date {
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }
  .edu-degree {
    font-weight: 700;
    font-size: 8.5pt;
    color: #fff;
    margin-top: 1px;
  }
  .edu-school {
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.75);
  }
  .lang-list {
    list-style: none;
    padding-left: 0;
  }
  .lang-list li {
    position: relative;
    padding-left: 12px;
    margin-bottom: 6px;
    color: rgba(255, 255, 255, 0.85);
  }
  .lang-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: rgba(255, 255, 255, 0.6);
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
    color: rgba(255, 255, 255, 0.85);
  }
  .skill-name {
    font-size: 8.5pt;
    font-weight: 500;
  }
  .skill-level {
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Main Content */
  .main-content {
    width: 67%;
    padding: 45px 35px;
    background: #fff;
    color: #1e293b;
  }
  .main-header {
    margin-bottom: 25px;
  }
  .main-header h1 {
    font-size: 26pt;
    font-weight: 700;
    color: #1e293b;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }
  .main-header .title {
    font-size: 13pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #475569;
    letter-spacing: 2px;
    margin-top: 4px;
    margin-bottom: 12px;
  }
  .main-header .summary {
    font-size: 9pt;
    color: #475569;
    line-height: ${lineSpacing};
  }
  .main-section {
    margin-bottom: 22px;
  }
  .main-section h2 {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #1e293b;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 14px;
  }
  
  /* Timeline */
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
    width: 1.5px;
    background: #e2e8f0;
  }
  .timeline-item {
    position: relative;
    margin-bottom: 16px;
  }
  .timeline-item::before {
    content: "";
    position: absolute;
    left: -18px;
    top: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid ${accent === '#2c3549' || accent === 'default' ? '#475569' : accent};
  }
  .timeline-date {
    font-size: 8.5pt;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 1px;
  }
  .timeline-company {
    font-size: 8.5pt;
    color: #64748b;
    margin-bottom: 2px;
  }
  .timeline-role {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }
  .timeline-desc {
    padding-left: 14px;
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.45;
  }
  .timeline-desc li {
    margin-bottom: 2px;
  }
  
  /* Reference Grid */
  .reference-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .ref-item {
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.45;
  }
  .ref-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 2px;
  }
  .ref-relation {
    font-style: italic;
    color: #64748b;
    margin-bottom: 4px;
  }
</style></head><body>
<div id="main-container">
  <div class="sidebar">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_1.jpg'}" alt="photo" />
    </div>
    ${contactHtml}
    ${eduHtml}
    ${skillsHtml}
    ${langHtml}
  </div>
  
  <div class="main-content">
    <div class="main-header">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
      ${data.summary ? `<div class="summary">${data.summary}</div>` : ''}
    </div>
    
    ${data.experience && data.experience.length ? `
      <section class="main-section">
        <h2>Experience</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${expHtml}
        </div>
      </section>
    ` : ''}
    
    ${projHtml}
    ${certHtml}
    ${mainCustomHtml}
    
    ${refHtml ? `
      <section class="main-section">
        <h2>Reference</h2>
        <div class="main-line"></div>
        ${refHtml}
      </section>
    ` : ''}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OLIVIA — Premium Elegant Bronze Layout with Icons & Skill Level (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════