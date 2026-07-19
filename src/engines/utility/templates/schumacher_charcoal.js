export function generateSchumacherCharcoalHtml(data, themeColor = '#2f2e2d', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#2f2e2d' : themeColor;

  const expHtml = data.experience.map(e => `
    <div class="timeline-item">
      <div class="timeline-year">(${e.start.split(' ')[1] || e.start} – ${e.end.split(' ')[1] || e.end})</div>
      <div class="timeline-role">${e.role.toUpperCase()}</div>
      <div class="timeline-company">${e.company}</div>
      ${e.highlights && e.highlights.length ? `<ul class="timeline-desc">${e.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2>Education</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.education.map(e => `
          <div class="timeline-item">
            <div class="timeline-year">(${e.start.split(' ')[1] || e.start} – ${e.end.split(' ')[1] || e.end})</div>
            <div class="timeline-role">${e.school.toUpperCase()}</div>
            <div class="timeline-company">${e.degree}${e.note ? ` (GPA: ${e.note})` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2>Projects</h2>
      </div>
      <div class="timeline-line-wrap" style="padding-bottom: 0;">
        ${data.projects.map(p => `
          <div class="timeline-item" style="margin-bottom: 10px;">
            <div style="font-weight: 700; font-size: 9.5pt; color: #1e293b;">${p.name}</div>
            <div style="font-size: 8.5pt; color: #475569; margin-top: 1px;">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>Contact</h3>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
        ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><span style="word-break: break-all;">${data.email}</span></div>` : ''}
        ${data.location ? `<div class="contact-row"><span>${data.location}</span></div>` : ''}
      </div>
    </div>
  `;

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>Skills</h3>
      </div>
      <ul class="bullet-list" style="margin-top: 10px;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `<li>• ${name} (${levelText})</li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>Language</h3>
      </div>
      <ul class="bullet-list" style="margin-top: 10px;">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    min-height: 297mm;
  }
  
  /* Sidebar containing curvy overlap header and dark bg */
  .sidebar {
    width: 33%;
    background: ${accent};
    color: #fff;
    padding: 30px 20px;
    font-size: 8.5pt;
    display: flex;
    flex-direction: column;
  }
  
  .avatar-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 25px;
    position: relative;
  }
  .avatar-container {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 4px solid #fff;
    overflow: hidden;
    background: #e2e8f0;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.25);
    padding-bottom: 5px;
  }
  .sidebar-section h3 {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.85);
  }
  .bullet-list {
    list-style: none;
    padding: 0;
  }
  .bullet-list li {
    margin-bottom: 5px;
    color: rgba(255, 255, 255, 0.85);
  }
  
  /* Main content area */
  .main-content {
    width: 67%;
    padding: 50px 35px;
    background: #fff;
  }
  .name-header {
    margin-bottom: 35px;
  }
  .name-header h1 {
    font-size: 30pt;
    font-weight: 900;
    color: ${accent};
    line-height: 1.05;
    letter-spacing: -0.5px;
  }
  .name-header .title {
    font-size: 11.5pt;
    font-weight: 600;
    color: #64748b;
    margin-top: 6px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  
  /* Timeline styles */
  .timeline-group {
    margin-bottom: 25px;
  }
  .section-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
  }
  .section-icon {
    font-size: 14pt;
  }
  .timeline-group h2 {
    font-size: 12pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: ${accent};
  }
  .timeline-line-wrap {
    position: relative;
    padding-left: 20px;
    border-left: 2px solid #e2e8f0;
    margin-left: 8px;
  }
  .timeline-item {
    position: relative;
    margin-bottom: 18px;
  }
  .timeline-item::before {
    content: "";
    position: absolute;
    left: -24px;
    top: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${accent};
  }
  .timeline-year {
    font-size: 9pt;
    font-weight: 700;
    color: #64748b;
  }
  .timeline-role {
    font-weight: 800;
    font-size: 9.5pt;
    color: #1e293b;
    margin-top: 1px;
  }
  .timeline-company {
    font-size: 8.5pt;
    font-weight: 600;
    color: #475569;
    margin-top: 1px;
  }
  .timeline-desc {
    padding-left: 14px;
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.45;
    margin-top: 4px;
  }
</style></head><body>
<div id="main-container">
  <div class="sidebar">
    <div class="avatar-wrap">
      <div class="avatar-container">
        <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_13.jpg'}" alt="photo" />
      </div>
    </div>
    
    ${data.summary ? `
      <div class="sidebar-section">
        <div class="sidebar-title-wrap">
          <h3>About Me</h3>
        </div>
        <div style="margin-top: 10px; line-height: 1.45; color: rgba(255, 255, 255, 0.85);">${data.summary}</div>
      </div>
    ` : ''}
    
    ${contactHtml}
    ${skillsHtml}
    ${langHtml}
  </div>
  
  <div class="main-content">
    <div class="name-header">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
    </div>
    
    ${data.education && data.education.length ? eduHtml : ''}
    
    ${data.experience && data.experience.length ? `
      <div class="timeline-group">
        <div class="section-title-wrap">
          <h2>Experience</h2>
        </div>
        <div class="timeline-line-wrap">
          ${expHtml}
        </div>
      </div>
    ` : ''}
    
    ${projHtml}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. CATRINE OLIVE — Sage/Olive Premium Split Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════