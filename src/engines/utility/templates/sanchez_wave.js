export function generateSanchezWaveHtml(data, themeColor = '#1a365d', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#1a365d' : themeColor;
  const secondaryAccent = '#c29b38';

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 8.5pt; color: #4b5563; font-weight: 600;">${e.start} - ${e.end}</div>
      <div style="font-size: 9.5pt; font-weight: 700; color: #1e3a8a; margin-top: 1px;">${e.company}</div>
      <div style="font-size: 8.5pt; color: #374151; font-weight: 500; font-style: italic; margin-top: 1px;">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<div style="font-size: 8.5pt; color: #4b5563; margin-top: 4px; line-height: 1.4;">${e.highlights[0]}</div>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div style="margin-bottom: 20px;">
      <div class="pill-title-outline">EDUCATION</div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px; margin-top: 10px;">
          <div style="font-size: 8.5pt; color: #4b5563; font-weight: 600;">${e.start} - ${e.end}</div>
          <div style="font-size: 9pt; font-weight: 700; color: #1f2937;">${e.degree}</div>
          <div style="font-size: 8.2pt; color: #4b5563; margin-top: 1px;">${e.school}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div style="margin-bottom: 20px;">
      <div class="pill-title-outline">SKILLS</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.2pt; color: #374151;">
              <span style="font-weight: 500;">• ${name}</span>
              <span style="color: #6b7280; font-size: 7.8pt;">${levelText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div style="margin-bottom: 20px;">
      <div class="pill-title-outline">PROJECTS</div>
      <ul style="padding-left: 14px; font-size: 8.2pt; color: #4b5563; line-height: 1.45; margin-top: 10px;">
        ${data.projects.map(p => `<li style="margin-bottom: 5px;"><strong>${p.name}</strong> – ${p.description}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #374151; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Wave Accent Header styling */
  .wave-header {
    height: 190px;
    background: #fff;
    position: relative;
    padding-left: 200px;
    padding-top: 45px;
    overflow: hidden;
  }
  
  /* CSS drawn waves at top-right */
  .wave-bg {
    position: absolute;
    top: -90px;
    right: -40px;
    width: 480px;
    height: 280px;
    background: ${accent};
    border-radius: 40% 60% 30% 70% / 60% 30% 70% 40%;
    transform: rotate(-15deg);
    z-index: 1;
  }
  .wave-bg-gold {
    position: absolute;
    top: -75px;
    right: -25px;
    width: 490px;
    height: 275px;
    background: ${secondaryAccent};
    border-radius: 35% 65% 40% 60% / 55% 45% 55% 45%;
    transform: rotate(-18deg);
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
    border: 4px solid #fff;
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0,0,0,0.12);
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
    font-weight: 800;
    color: #1e3a8a;
    letter-spacing: -0.5px;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .header-info-wrap .role {
    font-size: 10.5pt;
    font-weight: 600;
    color: #64748b;
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  /* Dynamic grid split */
  .body-grid {
    display: flex;
    padding: 20px 40px 30px 40px;
    flex: 1;
    gap: 40px;
  }
  
  .left-col {
    width: 50%;
  }
  .right-col {
    width: 50%;
  }
  
  /* Pill shaped outline section titles */
  .pill-title-outline {
    border: 1.5px solid ${accent};
    color: ${accent};
    border-radius: 20px;
    font-size: 8.5pt;
    font-weight: 800;
    text-align: center;
    padding: 4px 16px;
    display: inline-block;
    letter-spacing: 1.5px;
    background: rgba(30, 58, 138, 0.03);
  }
  
  /* Rounded block for contact details */
  .contact-rounded-card {
    background: #f1f5f9;
    border-radius: 16px;
    padding: 16px;
    margin-top: 25px;
  }
  .contact-rounded-card h4 {
    font-size: 9pt;
    font-weight: 800;
    text-transform: uppercase;
    color: ${accent};
    margin-bottom: 8px;
    letter-spacing: 1px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 8.2pt;
    color: #334155;
    margin-bottom: 8px;
  }
  .contact-row:last-child {
    margin-bottom: 0;
  }
</style></head><body>
<div id="main-container">
  <div class="wave-header">
    <div class="wave-bg-gold"></div>
    <div class="wave-bg"></div>
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_11.jpg'}" alt="photo" />
    </div>
    <div class="header-info-wrap">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="left-col">
      ${data.experience && data.experience.length ? `
        <div style="margin-bottom: 20px;">
          <div class="pill-title-outline">EXPERIENCE</div>
          <div style="margin-top: 10px;">${expHtml}</div>
        </div>
      ` : ''}
      
      ${eduHtml}
      
      <div class="contact-rounded-card">
        <h4>CONTACT</h4>
        ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><span>${data.email}</span></div>` : ''}
        ${data.website ? `<div class="contact-row"><span>${data.website}</span></div>` : ''}
      </div>
    </div>
    
    <div class="right-col">
      ${data.summary ? `
        <div style="margin-bottom: 22px; font-size: 8.8pt; color: #4b5563; line-height: 1.45;">
          ${data.summary}
        </div>
      ` : ''}
      
      ${skillsHtml}
      ${projHtml}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. HOWARD BURGUNDY — Premium Burgundy Classic Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════