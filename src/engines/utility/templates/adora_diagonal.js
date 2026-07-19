export function generateAdoraDiagonalHtml(data, themeColor = '#0284c7', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#0284c7' : themeColor;
  const secondaryAccent = '#1e3a8a';

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
          <div style="margin-bottom: 10px;">
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
    flex-direction: column;
    min-height: 297mm;
    position: relative;
    overflow: hidden;
  }
  
  /* Geometric Wave Background Accents at Top & Bottom */
  .geometric-header {
    height: 190px;
    background: #fff;
    position: relative;
    padding-left: 200px;
    padding-top: 45px;
    overflow: hidden;
  }
  .wave-accent {
    position: absolute;
    top: -95px;
    right: -45px;
    width: 480px;
    height: 280px;
    background: linear-gradient(135deg, ${accent}, ${secondaryAccent});
    border-radius: 40% 60% 30% 70% / 60% 30% 70% 40%;
    transform: rotate(-12deg);
    z-index: 1;
  }
  .wave-accent-dark {
    position: absolute;
    top: -75px;
    right: -30px;
    width: 495px;
    height: 285px;
    background: #111827;
    border-radius: 35% 65% 40% 60% / 55% 45% 55% 45%;
    transform: rotate(-15deg);
    z-index: 0;
  }
  .wave-footer {
    position: absolute;
    bottom: -100px;
    left: -100px;
    width: 400px;
    height: 150px;
    background: linear-gradient(135deg, ${accent}, ${secondaryAccent});
    border-radius: 50% 50% 0 0;
    transform: rotate(5deg);
    opacity: 0.85;
    z-index: 0;
  }
  
  /* Large avatar overlapping header and waves */
  .avatar-container {
    position: absolute;
    left: 45px;
    top: 30px;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 4.5px solid #fff;
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .header-info-wrap {
    position: relative;
    z-index: 5;
  }
  .header-info-wrap h1 {
    font-size: 28pt;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: -0.5px;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .header-info-wrap .role {
    font-size: 11pt;
    font-weight: 600;
    color: #64748b;
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  /* Dynamic Grid */
  .body-grid {
    display: flex;
    flex: 1;
    z-index: 1;
  }
  
  /* Sidebar */
  .sidebar {
    width: 33%;
    background: #e9ecf0;
    color: #1e293b;
    padding: 30px 20px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1.5px solid rgba(0, 0, 0, 0.15);
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
    color: #475569;
  }
  .bullet-list {
    list-style: none;
    padding: 0;
  }
  .bullet-list li {
    margin-bottom: 5px;
    color: #475569;
  }
  
  /* Main Content Area */
  .main-content {
    width: 67%;
    padding: 40px 35px;
    background: #fff;
  }
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
    color: #1e3a8a;
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
  <div class="geometric-header">
    <div class="wave-accent-dark"></div>
    <div class="wave-accent"></div>
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_15.jpg'}" alt="photo" />
    </div>
    <div class="header-info-wrap">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${data.summary ? `
        <div class="sidebar-section">
          <div class="sidebar-title-wrap">
            <h3>About Me</h3>
          </div>
          <div style="margin-top: 10px; line-height: 1.45; color: #475569;">${data.summary}</div>
        </div>
      ` : ''}
      
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
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
  
  <div class="wave-footer"></div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16. OLIVIA WILSON MINIMAL — Elegant White Timeline Split Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════