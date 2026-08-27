// ═══════════════════════════════════════════════════════════════════════════════
// HOWARD ONG — Exact 1:1 Pixel-Perfect Replica from User Template
// Top Burgundy Header Banner (#7e444b), 2-Column Body with Headroom Halo & Bottom Footer Bar
// ═══════════════════════════════════════════════════════════════════════════════

export function generateHowardOngHtml(
  data,
  themeColor = '#7e444b',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const burgundyColor = themeColor === 'default' || !themeColor ? '#7e444b' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const candidateName = (data.name || 'HOWARD ONG').toUpperCase();
  const photoSrc = data.photoUrl || '/images/candidates/howard.jpg';

  const summaryText = data.summary || 'Dedicated and detail-oriented Financial Analyst with 10 years of experience. Eager to apply proven-budget maximization skills for Bank of Brocelle in monitoring, maintaining, and completing client billing and reconciliations. Special interest in achieving the millennial market and helping with retirement and general financial planning.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';
  const websiteText = data.website || 'www.reallygreatsite.com';

  const rawSkills = data.skills && data.skills.length ? data.skills : [
    'Financial modeling and reporting', 'Data mining and analysis', 'Financial accounting', 'Business valuation', 'Advanced SAS proficiency',
    'Observation', 'Decision making', 'Communication', 'Multi-tasking'
  ];

  const cleanSkills = rawSkills.map(s => typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '');
  const hardSkills = cleanSkills.slice(0, 5);
  const softSkills = cleanSkills.slice(5, 9).length ? cleanSkills.slice(5, 9) : ['Observation', 'Decision making', 'Communication', 'Multi-tasking'];

  const educationList = data.education && data.education.length ? data.education : [
    { school: 'Borcelle Business School', degree: 'Masters in Accounting', date: 'Completed in 2016' },
    { school: 'Larana Business School', degree: 'Certificate in Financial Management, Financial Analysis, and Public Budgeting', date: 'Completed in 2014' },
    { school: 'Borcelle Business School', degree: 'Bachelor of Economics, Major in Finance, Minor in Data Analytics', date: 'Completed in 2012' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      header: 'Ginyard International Co. | Financial Analyst',
      date: '2020 – Present',
      bullets: [
        'Analyse current and past financial data',
        'Look at recent financial performance and identify trends',
        'Prepare reports on the above information and communicate the insights of these reports to the broader business',
        'Consult with the management team to develop long-term commercial plans',
        'Suggest budgets and improvements based on the above information'
      ]
    },
    {
      header: 'Ingoude Company | Junior/Investment Analyst',
      date: '2015 – 2020',
      bullets: [
        'Looked at financial performance and identified trends',
        'Explored various investment opportunities'
      ]
    },
    {
      header: 'Timmerman Industries | Financial Analyst Intern',
      date: '2012 – 2015',
      bullets: [
        'Analysed financial data',
        'Observed financial performance and identified trends',
        'Prepared reports on the above information and reported the insights.'
      ]
    }
  ];

  const achievementsList = [
    { date: '2013 – 2015', desc: 'Reduced the production cost by 20% in the second year of internship.' },
    { date: '2015 – 2020', desc: '2015 - 2020 Managed five projects worth over $100million.' }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Howard Ong - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: #ffffff;
      font-family: ${fontFam};
      margin: 0;
      padding: 0;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Canvas with Rounded Outer Frame */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin: 0 auto;
    }

    /* Top Burgundy Header Banner */
    .header-banner {
      width: 100%;
      height: 185px;
      background-color: ${burgundyColor};
      position: relative;
      flex-shrink: 0;
    }

    .header-text-container {
      position: absolute;
      top: 60px;
      left: 310px;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 17px;
      font-weight: 400;
      color: #f1e2e4;
      margin-top: 8px;
      letter-spacing: 0.3px;
    }

    /* Circular Profile Photo with Optimal Headroom Framing */
    .profile-photo {
      position: absolute;
      top: 45px;
      left: 48px;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      object-fit: cover;
      object-position: center 15%;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
      z-index: 5;
      background-color: #ffffff;
    }

    /* Two-Column Main Body */
    .body-container {
      display: flex;
      padding: 25px 45px 30px 48px;
      gap: 36px;
      flex: 1;
    }

    /* Section Heading Styles */
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: ${burgundyColor};
      margin-bottom: 6px;
      display: inline-block;
      border-bottom: 1.5px solid ${burgundyColor};
      padding-bottom: 3px;
      letter-spacing: -0.2px;
    }

    /* Left Sidebar Column */
    .left-col {
      width: 225px;
      flex-shrink: 0;
      margin-top: 65px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 4px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
      color: #2e3033;
      font-weight: 500;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: #2e3033;
      flex-shrink: 0;
    }

    /* Left Column Bullet Lists */
    .bullet-list {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 4.5px;
      margin-top: 4px;
    }

    .bullet-list li {
      font-size: 10px;
      color: #2e3033;
      font-weight: 500;
      line-height: 1.35;
    }

    /* Education Items */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 6px;
    }

    .edu-item {
      position: relative;
      padding-left: 14px;
    }

    .edu-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #2e3033;
    }

    .edu-school {
      font-size: 10.5px;
      font-weight: 700;
      color: #2e3033;
      line-height: 1.25;
    }

    .edu-degree {
      font-size: 9.5px;
      font-style: italic;
      color: #484b50;
      margin-top: 1px;
      line-height: 1.3;
    }

    .edu-date {
      font-size: 9px;
      color: #63666b;
      margin-top: 1px;
    }

    /* Right Main Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .about-text {
      font-size: 10.2px;
      line-height: ${lineSpacing};
      color: #383a3e;
      text-align: justify;
      margin-top: 4px;
    }

    /* Professional Experience */
    .exp-list {
      display: flex;
      flex-direction: column;
      gap: 13px;
      margin-top: 4px;
    }

    .exp-header {
      font-size: 11px;
      font-weight: 700;
      color: #232528;
    }

    .exp-date {
      font-size: 10px;
      font-style: italic;
      color: #55575c;
      margin-top: 1px;
    }

    .exp-subheading {
      font-size: 9.5px;
      font-style: italic;
      color: #404246;
      margin-top: 3px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 3px;
    }

    .exp-bullets li {
      font-size: 9.5px;
      line-height: 1.4;
      color: #383a3e;
      text-align: justify;
    }

    /* Achievements Grid */
    .achieve-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }

    .achieve-row {
      display: flex;
      gap: 14px;
      font-size: 10px;
      line-height: 1.45;
    }

    .achieve-date {
      width: 75px;
      font-weight: 700;
      color: #232528;
      flex-shrink: 0;
    }

    .achieve-desc {
      flex: 1;
      color: #383a3e;
    }

    /* Bottom Burgundy Footer Bar */
    .footer-bar {
      width: 100%;
      height: 14px;
      background-color: ${burgundyColor};
      flex-shrink: 0;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Top Burgundy Banner -->
    <div class="header-banner">
      <div class="header-text-container">
        <h1 class="candidate-name">${candidateName}</h1>
        <div class="candidate-title">${data.title || 'Financial Analyst'}</div>
      </div>
    </div>

    <!-- Circular Profile Photo with full head & hair headroom -->
    <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Howard Ong'}">

    <!-- Body Layout -->
    <div class="body-container">
      
      <!-- Left Column -->
      <div class="left-col">
        <!-- My Contact -->
        <div>
          <div class="section-title">My Contact</div>
          <div class="contact-list">
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <span style="word-break: break-all;">${emailText}</span>
            </div>
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              <span>${phoneText}</span>
            </div>
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${locationText}</span>
            </div>
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span>${websiteText}</span>
            </div>
          </div>
        </div>

        <!-- Hard Skill -->
        <div>
          <div class="section-title">Hard Skill</div>
          <ul class="bullet-list">
            ${hardSkills.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <!-- Soft Skill -->
        <div>
          <div class="section-title">Soft Skill</div>
          <ul class="bullet-list">
            ${softSkills.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <!-- Education Background -->
        <div>
          <div class="section-title" style="border-bottom: none; padding-bottom: 0;">Education Background</div>
          <div class="edu-list">
            ${educationList.map(e => `
              <div class="edu-item">
                <div class="edu-school">${e.school || 'Borcelle Business School'}</div>
                <div class="edu-degree">${e.degree || 'Masters in Accounting'}</div>
                <div class="edu-date">${e.date || `Completed in ${e.end || '2016'}`}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-col">
        <!-- About Me -->
        <div>
          <div class="section-title">About Me</div>
          <p class="about-text">
            ${summaryText}
          </p>
        </div>

        <!-- Professional Experience -->
        <div>
          <div class="section-title">Professional Experience</div>
          <div class="exp-list">
            ${experienceList.map(e => {
              const header = e.header || `${e.company || 'Ginyard International Co.'} | ${e.role || 'Financial Analyst'}`;
              const date = e.date || `${e.start || '2020'} – ${e.end || 'Present'}`;
              const bullets = e.bullets || (e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : [e.description || 'Analyse current and past financial data']);
              return `
                <div>
                  <div class="exp-header">${header}</div>
                  <div class="exp-date">${date}</div>
                  <div class="exp-subheading">Key responsibilities:</div>
                  <ul class="exp-bullets">
                    ${bullets.map(b => `<li>${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                  </ul>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Achievements -->
        <div>
          <div class="section-title">Achievements</div>
          <div class="achieve-list">
            ${achievementsList.map(a => `
              <div class="achieve-row">
                <span class="achieve-date">${a.date}</span>
                <span class="achieve-desc">${a.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Burgundy Footer -->
    <div class="footer-bar"></div>
  </div>

</body>
</html>`;
}
