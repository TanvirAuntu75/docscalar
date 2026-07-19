export function generateEmmaHtml(data, themeColor = '#3c3530', themeFont = 'Playfair Display', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accentColor = themeColor === 'default' || themeColor === '#2c3549' ? '#3c3530' : themeColor;

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 700; font-size: 9.5pt; color: #1e293b;">${e.role}</div>
      <div style="font-size: 8.5pt; color: #64748b; font-style: italic; margin-top: 1px; margin-bottom: 6px;">
        ${e.company} – ${e.start} to ${e.end}
      </div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; line-height: 1.45;">${e.highlights.map(h => `<li style="margin-bottom: 3px;">${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const projHtml = data.projects && data.projects.length ? `
    <div style="margin-bottom: 16px;">
      ${data.projects.map(p => `
        <div style="margin-bottom: 10px;">
          <div style="font-weight: 700; font-size: 9pt; color: #1e293b;">${p.name}</div>
          <div style="font-size: 8.2pt; color: #475569; margin-top: 1px;">${p.description}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div style="margin-bottom: 20px;">
      ${data.education.map(e => `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 8.8pt; color: #1e293b;">${e.degree}</div>
          <div style="font-size: 8pt; color: #475569; font-style: italic; margin-top: 1px;">${e.school}</div>
          <div style="font-size: 7.8pt; color: #64748b; margin-top: 1px;">${e.start} - ${e.end}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
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
            <span class="skill-name">• ${name}</span>
            <span class="skill-level">${levelText}</span>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div>
      ${data.certifications.map(c => `
        <div style="font-size: 8pt; color: #475569; margin-bottom: 6px; font-weight: 500;">
          ${c}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #334155; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Top Band Header */
  .top-band {
    background: #f7f3ee;
    padding: 40px 20px;
    text-align: center;
    border-bottom: 1px solid #e8e2d9;
  }
  .top-band h1 {
    font-family: 'Playfair Display', serif;
    font-size: 32pt;
    font-weight: 600;
    color: ${accentColor};
    letter-spacing: 0.5px;
  }
  .top-band .line-accent {
    width: 45px;
    height: 1.5px;
    background: ${accentColor};
    margin: 12px auto 0 auto;
  }
  
  /* Split columns layout below header */
  .split-columns {
    display: flex;
    padding: 35px 45px;
    flex: 1;
    gap: 35px;
  }
  
  .left-col {
    width: 60%;
  }
  .right-col {
    width: 40%;
    border-left: 1px solid #f0eae1;
    padding-left: 30px;
  }
  
  .section-block {
    margin-bottom: 28px;
  }
  .section-block h3 {
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: ${accentColor};
    margin-bottom: 10px;
  }
  
  /* Contact row spacing */
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 8.2pt;
    color: #475569;
  }
  .contact-item {
    display: flex;
    flex-direction: column;
  }
  .contact-item .label {
    font-weight: 700;
    color: #3c3530;
    font-size: 7.8pt;
  }
  .contact-item .val {
    margin-top: 1px;
  }
  
  /* Skills list styles */
  .skills-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .skill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
</style></head><body>
<div id="main-container">
  <div class="top-band">
    <h1>${data.name}</h1>
    <div class="line-accent"></div>
  </div>
  
  <div class="split-columns">
    <div class="left-col">
      ${data.summary ? `
        <div class="section-block">
          <h3>Professional Summary</h3>
          <div style="font-size: 8.8pt; color: #475569; line-height: ${lineSpacing};">${data.summary}</div>
        </div>
      ` : ''}
      
      ${data.experience && data.experience.length ? `
        <div class="section-block">
          <h3>Work Experience</h3>
          <div>${expHtml}</div>
        </div>
      ` : ''}
    </div>
    
    <div class="right-col">
      <div class="section-block">
        <h3>Contact Information</h3>
        <div class="contact-list">
          ${data.email ? `<div class="contact-item"><span class="label">Email</span><span class="val">${data.email}</span></div>` : ''}
          ${data.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val">${data.phone}</span></div>` : ''}
          ${data.location ? `<div class="contact-item"><span class="label">Address</span><span class="val">${data.location}</span></div>` : ''}
          ${data.website ? `<div class="contact-item"><span class="label">Website</span><span class="val">${data.website}</span></div>` : ''}
        </div>
      </div>
      
      ${eduHtml ? `
        <div class="section-block">
          <h3>Education</h3>
          <div>${eduHtml}</div>
        </div>
      ` : ''}
      
      ${skillsHtml ? `
        <div class="section-block">
          <h3>Skills</h3>
          <div>${skillsHtml}</div>
        </div>
      ` : ''}
      
      ${certHtml ? `
        <div class="section-block">
          <h3>Certifications</h3>
          <div>${certHtml}</div>
        </div>
      ` : ''}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CHARLES — Teal/Blue Accent Sidebar with Top Image (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════