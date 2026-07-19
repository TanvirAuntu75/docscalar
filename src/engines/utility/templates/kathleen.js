export function generateKathleenHtml(data, themeColor = '#d97706', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#d97706' : themeColor;

  const nameParts = data.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 22px;">
      <div style="font-weight: 700; font-size: 10pt; color: #1e293b;">${e.role}</div>
      <div style="font-weight: 600; font-size: 9pt; color: #64748b; margin-top: 1px;">
        ${e.company} | <span style="font-weight: 400; font-style: italic;">${data.location || 'Location'}</span>
      </div>
      <div style="font-size: 8pt; font-style: italic; color: #64748b; margin-top: 2px; margin-bottom: 8px;">${e.start} - ${e.end}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #334155; line-height: 1.45;">${e.highlights.map(h => `<li style="margin-bottom: 4px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 8pt; color: #475569; font-weight: 500;">${e.start} - ${e.end}</div>
          <div style="font-weight: 700; font-size: 8.5pt; color: #1e293b; margin-top: 1px;">${e.degree}</div>
          <div style="font-size: 8pt; color: #475569; margin-top: 1px;">${e.school}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
      <ul style="list-style: none; padding: 0;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <li style="display: flex; justify-content: space-between; font-size: 8.2pt; color: #334155; margin-bottom: 6px;">
              <span>• ${name}</span>
              <span style="color: #64748b; font-size: 7.8pt;">${levelText}</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section style="margin-bottom: 24px;">
      <h2 class="main-section-title">Projects</h2>
      <div class="main-line"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 9pt; color: #1e293b;">${p.name}</div>
          <div style="font-size: 8.2pt; color: #475569; margin-top: 2px;">${p.description}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section style="margin-bottom: 24px;">
      <h2 class="main-section-title">Certifications</h2>
      <div class="main-line"></div>
      <ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; line-height: 1.45;">
        ${data.certifications.map(c => `
          <li style="margin-bottom: 4px;">• ${c}</li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;850&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #334155; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    min-height: 297mm;
  }
  
  /* Left column side block */
  .sidebar {
    width: 33%;
    background: #f5f5f5;
    padding: 40px 22px;
    font-size: 8.5pt;
    border-right: 1px solid #e5e5e5;
  }
  .stacked-name {
    margin-bottom: 35px;
  }
  .stacked-name .first {
    font-size: 28pt;
    font-weight: 850;
    color: #1a1a1a;
    line-height: 0.95;
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }
  .stacked-name .last {
    font-size: 28pt;
    font-weight: 800;
    color: #334155;
    line-height: 0.95;
    letter-spacing: -0.5px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid ${accent};
    width: 30px;
    margin-bottom: 12px;
  }
  
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .contact-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${accent};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 7.5pt;
  }
  .contact-val {
    font-size: 8pt;
    color: #334155;
    word-break: break-all;
  }
  
  /* Main content side block */
  .main-content {
    width: 67%;
    padding: 40px 35px;
    background: #fff;
    position: relative;
  }
  .quote-accent {
    position: absolute;
    top: 25px;
    right: 35px;
    font-size: 72pt;
    font-weight: 850;
    color: ${accent};
    opacity: 0.22;
    line-height: 1;
    font-family: Georgia, serif;
    pointer-events: none;
    select: none;
  }
  
  .main-section-title {
    font-size: 9.5pt;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 1.5px solid #e5e5e5;
    margin-bottom: 14px;
  }
</style></head><body>
<div id="main-container">
  <div class="sidebar">
    <div class="stacked-name">
      <div class="first">${firstName}</div>
      <div class="last">${lastName}</div>
    </div>
    
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.email ? `<div class="contact-row"><div class="contact-circle">e</div><span class="contact-val">${data.email}</span></div>` : ''}
        ${data.phone ? `<div class="contact-row"><div class="contact-circle">t</div><span class="contact-val">${data.phone}</span></div>` : ''}
        ${data.location ? `<div class="contact-row"><div class="contact-circle">a</div><span class="contact-val">${data.location}</span></div>` : ''}
      </div>
    </div>
    
    ${eduHtml}
    ${skillsHtml}
  </div>
  
  <div class="main-content">
    <div class="quote-accent">”</div>
    
    ${data.summary ? `
      <section style="margin-bottom: 24px;">
        <h2 class="main-section-title">Professional Summary</h2>
        <div class="main-line"></div>
        <div style="font-size: 8.8pt; color: #334155; line-height: ${lineSpacing};">${data.summary}</div>
      </section>
    ` : ''}
    
    ${data.experience && data.experience.length ? `
      <section style="margin-bottom: 24px;">
        <h2 class="main-section-title">Work Experience</h2>
        <div class="main-line"></div>
        <div>
          ${expHtml}
        </div>
      </section>
    ` : ''}
    
    ${projHtml}
    ${certHtml}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RICHARD — Premium Split Band Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════