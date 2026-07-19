export function generateCharlesHtml(data, themeColor = '#0b7a8a', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#0b7a8a' : themeColor;

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 18px;">
      <div style="font-size: 8.5pt; color: #4b5563; font-weight: 500;">${e.start} - ${e.end}</div>
      <div style="font-size: 9.5pt; font-weight: 700; color: #1f2937; margin-top: 1px;">
        ${e.role} <span style="font-weight: 400; color: #4b5563;">at ${e.company}</span> | <span style="font-weight:400; font-size:8.2pt; color:#6b7280;">${data.location || 'Location'}</span>
      </div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.8pt; color: #374151; line-height: 1.45; margin-top: 6px;">${e.highlights.map(h => `<li style="margin-bottom: 3px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="main-section">
      <h3>Education</h3>
      <div class="section-divider"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 8.5pt; color: #4b5563; font-weight: 500;">${e.start} - ${e.end}</div>
          <div style="font-size: 9.5pt; font-weight: 700; color: #1f2937;">${e.degree}</div>
          <div style="font-size: 8.8pt; color: #374151; margin-top: 1px;">${e.school}${e.note ? ` | GPA: ${e.note}` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="main-section">
      <h3>Accomplishments</h3>
      <div class="section-divider"></div>
      <ul style="padding-left: 14px; font-size: 8.8pt; color: #374151; line-height: 1.45;">
        ${data.projects.map(p => `
          <li style="margin-bottom: 4px;">• <strong>${p.name}</strong>: ${p.description}</li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="main-section">
      <h3>Certifications</h3>
      <div class="section-divider"></div>
      <ul style="padding-left: 14px; font-size: 8.8pt; color: #374151; line-height: 1.45;">
        ${data.certifications.map(c => `
          <li style="margin-bottom: 4px;">• ${c}</li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <div class="contact-row">
        <span class="material-symbols-outlined">location_on</span>
        <span>${data.location || 'Address Details'}</span>
      </div>
      ${data.phone ? `
        <div class="contact-row">
          <span class="material-symbols-outlined">call</span>
          <span>${data.phone}</span>
        </div>
      ` : ''}
      ${data.email ? `
        <div class="contact-row">
          <span class="material-symbols-outlined">mail</span>
          <span style="word-break: break-all;">${data.email}</span>
        </div>
      ` : ''}
    </div>
  `;

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
      <ul class="skills-list">
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

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1f2937; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    min-height: 297mm;
  }
  
  /* Sidebar */
  .sidebar {
    width: 32%;
    background: ${accent};
    color: #fff;
    padding: 30px 18px;
    font-size: 8.5pt;
  }
  .avatar-container {
    margin-bottom: 25px;
    border: 3px solid rgba(255, 255, 255, 0.4);
    overflow: hidden;
    height: 180px;
    background: #475569;
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .sidebar-section {
    margin-bottom: 30px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #fff;
    margin-bottom: 8px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.9);
  }
  .contact-row .material-symbols-outlined {
    font-size: 13pt;
  }
  .skills-list {
    list-style: none;
    padding: 0;
  }
  .skills-list li {
    margin-bottom: 6px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 8.2pt;
    line-height: 1.35;
  }
  
  /* Main Content */
  .main-content {
    width: 68%;
    padding: 40px 35px;
    background: #fff;
  }
  .main-name {
    font-size: 32pt;
    font-weight: 700;
    color: ${accent};
    letter-spacing: -0.5px;
    margin-bottom: 25px;
  }
  .main-section {
    margin-bottom: 24px;
  }
  .main-section h3 {
    font-size: 10.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1f2937;
    margin-bottom: 4px;
  }
  .section-divider {
    border-bottom: 2px solid ${accent};
    margin-bottom: 14px;
  }
</style></head><body>
<div id="main-container">
  <div class="sidebar">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_5.jpg'}" alt="photo" />
    </div>
    ${contactHtml}
    
    ${data.summary ? `
      <div class="sidebar-section">
        <h3>Professional Summary</h3>
        <div class="sidebar-line"></div>
        <div style="line-height: 1.45; color: rgba(255, 255, 255, 0.95); font-size: 8.2pt;">${data.summary}</div>
      </div>
    ` : ''}
    
    ${skillsHtml}
  </div>
  
  <div class="main-content">
    <h1 class="main-name">${data.name}</h1>
    
    ${data.experience && data.experience.length ? `
      <section class="main-section">
        <h3>Work History</h3>
        <div class="section-divider"></div>
        <div>
          ${expHtml}
        </div>
      </section>
    ` : ''}
    
    ${eduHtml}
    ${projHtml}
    ${certHtml}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. KATHLEEN — Minimalist Block Sidebar layout with Quote Accent (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════