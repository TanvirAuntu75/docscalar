export function generateJonathanHtml(data, themeColor = '#1a1a1a', themeFont = 'Playfair Display', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#1a1a1a' : themeColor;

  const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JH';

  const contactParts = [];
  if (data.email) contactParts.push(data.email);
  if (data.phone) contactParts.push(data.phone);
  if (data.location) contactParts.push(data.location);
  if (data.website) contactParts.push(data.website);
  const contactText = contactParts.join('  |  ');

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; color: #1a1a1a;">
        <span>${e.company} | ${data.location || 'Location'}</span>
        <span style="font-weight: 500; font-style: italic; color: #4a4a4a;">${e.start} - ${e.end}</span>
      </div>
      <div style="font-size: 9.5pt; font-style: italic; font-weight: 600; color: #3a3a3a; margin-top: 2px; margin-bottom: 8px;">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 18px; font-size: 9pt; color: #3a3a3a; line-height: 1.45;">${e.highlights.map(h => `<li style="margin-bottom: 4px;">${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const projHtml = data.projects && data.projects.length ? `
    <section style="margin-bottom: 25px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 11.5pt; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">Projects</h2>
      <div style="border-bottom: 1px solid #d3d3d3; margin-bottom: 12px;"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 9.5pt; color: #1a1a1a;">${p.name}</div>
          <div style="font-size: 9pt; color: #3a3a3a; margin-top: 2px;">${p.description}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section style="margin-bottom: 25px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 11.5pt; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">Certifications</h2>
      <div style="border-bottom: 1px solid #d3d3d3; margin-bottom: 12px;"></div>
      ${data.certifications.map(c => `
        <div style="font-size: 9pt; color: #3a3a3a; margin-bottom: 6px;">
          ${c}
        </div>
      `).join('')}
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <section style="margin-bottom: 25px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 11.5pt; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">Education</h2>
      <div style="border-bottom: 1px solid #d3d3d3; margin-bottom: 12px;"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; color: #1a1a1a;">
            <span>${e.school} | ${data.location || 'Location'}</span>
            <span style="font-weight: 500; font-style: italic; color: #4a4a4a;">${e.start} - ${e.end}</span>
          </div>
          <div style="font-size: 9pt; font-style: italic; color: #3a3a3a; margin-top: 1px;">
            ${e.degree}${e.note ? ` : ${e.note}` : ''}
          </div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <section style="margin-bottom: 25px;">
      <h2 style="font-family: 'Playfair Display', serif; font-size: 11.5pt; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">Skills</h2>
      <div style="border-bottom: 1px solid #d3d3d3; margin-bottom: 12px;"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9pt; color: #3a3a3a;">
              <span style="font-weight: 600;">• ${name}</span>
              <span style="color: #6a6a6a; font-size: 8.5pt;">${levelText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fbfbf9; color: #1a1a1a; padding: 50px 55px; -webkit-print-color-adjust: exact; }
  
  .initials-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 1.5px solid ${accent};
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px auto;
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    font-weight: 500;
    color: ${accent};
  }
  
  .name-header {
    text-align: center;
    margin-bottom: 25px;
  }
  .name-header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 26pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: ${accent};
    margin-bottom: 8px;
  }
  .name-header .contact {
    font-size: 8.2pt;
    color: #4a4a4a;
    letter-spacing: 0.5px;
  }
  
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    text-transform: capitalize;
  }
  .section-line {
    border-bottom: 1.5px solid #d3d3d3;
    margin-bottom: 12px;
  }
  .section-content {
    font-size: 9.5pt;
    color: #3a3a3a;
    line-height: ${lineSpacing};
    margin-bottom: 25px;
  }
</style></head><body>
  <div class="initials-circle">${initials}</div>
  <div class="name-header">
    <h1>${data.name}</h1>
    <div class="contact">${contactText}</div>
  </div>

  ${data.summary ? `
    <section>
      <h2 class="section-title">Professional Summary</h2>
      <div class="section-line"></div>
      <div class="section-content">${data.summary}</div>
    </section>
  ` : ''}

  ${data.experience && data.experience.length ? `
    <section style="margin-bottom: 25px;">
      <h2 class="section-title">Experience</h2>
      <div class="section-line"></div>
      <div>
        ${expHtml}
      </div>
    </section>
  ` : ''}

  ${eduHtml}
  ${skillsHtml}
  ${projHtml}
  ${certHtml}
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EMMA — Warm Balanced Two-Column Split (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════