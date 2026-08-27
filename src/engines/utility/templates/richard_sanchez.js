// ═══════════════════════════════════════════════════════════════════════════════
// RICHARD SANCHEZ — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with Royal Blue Banner, Dark Sidebar, & Solid/Border Pill Badges
// ═══════════════════════════════════════════════════════════════════════════════

export function generateRichardSanchezHtml(
  data,
  themeColor = '#0b3b8c',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const blueColor = themeColor === 'default' || !themeColor ? '#0b3b8c' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name uppercase two-line header
  const nameParts = (data.name || 'Richard Sanchez').trim().split(' ');
  const firstName = (nameParts[0] || 'RICHARD').toUpperCase();
  const lastName = (nameParts.slice(1).join(' ') || 'SANCHEZ').toUpperCase();

  const photoSrc = data.photoUrl || '/images/candidates/richard.jpg';

  const summaryText = data.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sit amet quam rhoncus, egestas dui eget, malesuada justo. Ut aliquam augue dui.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';

  const languageList = data.custom_languages && data.custom_languages.length ? data.custom_languages : ['English', 'Germany (basic)', 'Spain (basic)'];

  const expertiseList = data.skills && data.skills.length ? data.skills : [
    'Management Skills', 'Creativity', 'Digital Marketing', 'Negotiation', 'Critical Thinking', 'Leadership'
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      company: 'Arowwai Industries',
      location: 'Sydney - Australia',
      start: '2020',
      end: '2022',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sit amet quam rhoncus, egestas dui eget, malesuada justo. Ut aliquam augue.'
    },
    {
      company: 'Wardiere Inc.',
      location: 'Sydney - Australia',
      start: '2016',
      end: '2020',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sit amet quam rhoncus, egestas dui eget, malesuada justo. Ut aliquam augue.'
    },
    {
      company: 'Studio Showde',
      location: 'Sydney - Australia',
      start: '2010',
      end: '2015',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sit amet quam rhoncus, egestas dui eget, malesuada justo. Ut aliquam augue.'
    }
  ];

  const educationList = data.education && data.education.length ? data.education : [
    {
      school: 'Borcelle University',
      degree: 'Bachelor of Business Management',
      start: '2014',
      end: '2023'
    },
    {
      school: 'Borcelle University',
      degree: 'Master of Business Management',
      start: '2014',
      end: '2018'
    }
  ];

  // Skills Progress Bars (Default or custom skills with level)
  const skillsBars = [
    { name: 'Design Process', percent: 78 },
    { name: 'Project Management', percent: 81 }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Richard Sanchez - Resume</title>
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

    /* Fixed A4 Canvas with Rounded Outer Corners */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
    }

    /* Full-Height Left Dark Sidebar */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 305px;
      height: 1123px;
      background-color: #17181c;
      z-index: 1;
    }

    /* Horizontal Royal Blue Header Banner */
    .top-blue-banner {
      position: absolute;
      top: 108px;
      left: 0;
      width: 794px;
      height: 140px;
      background: linear-gradient(90deg, #093c8d 0%, #0b449e 100%);
      z-index: 2;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
    }

    /* Profile Photo Circle */
    .profile-photo {
      position: absolute;
      top: 78px;
      left: 82px;
      width: 175px;
      height: 175px;
      border-radius: 50%;
      border: 6px solid #ffffff;
      object-fit: cover;
      object-position: center 15%;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
      z-index: 5;
      background-color: #ffffff;
    }

    /* Header Text in Blue Banner */
    .header-info {
      position: absolute;
      top: 122px;
      left: 335px;
      z-index: 3;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.05;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 14px;
      font-weight: 400;
      color: #cbdcf8;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 275px;
      left: 0;
      width: 305px;
      padding: 0 28px 30px 28px;
      z-index: 3;
      display: flex;
      flex-direction: column;
    }

    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      margin-bottom: 8px;
    }

    .about-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #b5b8be;
      text-align: center;
      margin-bottom: 18px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
      padding-left: 8px;
    }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
      color: #e2e4e8;
      font-weight: 500;
    }

    .contact-icon-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: #0c4da2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .contact-icon-circle svg {
      width: 12px;
      height: 12px;
      fill: #ffffff;
    }

    /* Pill Badges (Sidebar) */
    .sidebar-badge {
      width: 100%;
      border: 1.5px solid #0c4da2;
      background-color: #121824;
      border-radius: 20px;
      padding: 5px 0;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 6px 0 10px 0;
    }

    .sidebar-list {
      list-style-type: disc;
      padding-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .sidebar-list li {
      font-size: 10.5px;
      color: #c5c8ce;
      font-weight: 500;
    }

    /* Right Main Panel Content */
    .main-panel {
      position: absolute;
      top: 268px;
      left: 305px;
      width: 489px;
      padding: 0 45px 30px 38px;
      z-index: 3;
    }

    .main-section {
      margin-bottom: 16px;
    }

    /* Main Blue Pill Badges */
    .main-badge {
      background-color: ${blueColor};
      color: #ffffff;
      border-radius: 20px;
      padding: 4px 28px;
      font-size: 11px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 10px;
    }

    /* Job & Education Entries */
    .entry-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .entry-block {
      display: flex;
      flex-direction: column;
    }

    .entry-company {
      font-size: 11px;
      font-weight: 700;
      color: #1a1c20;
    }

    .entry-location {
      font-size: 10px;
      font-weight: 700;
      color: #2b2e34;
      margin-top: 1px;
    }

    .entry-date {
      font-size: 10px;
      font-weight: 700;
      color: #2b2e34;
      margin-bottom: 2px;
    }

    .entry-desc {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #585b62;
      text-align: justify;
    }

    .edu-degree {
      font-size: 10px;
      color: #585b62;
      margin-top: 1px;
    }

    .edu-date {
      font-size: 9.5px;
      color: #6b6e76;
      margin-top: 1px;
    }

    /* Skills Progress Bars */
    .skills-bars {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 2px;
    }

    .skill-bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .skill-label {
      font-size: 10.5px;
      font-weight: 600;
      color: #222428;
      width: 125px;
      flex-shrink: 0;
    }

    .progress-track {
      flex: 1;
      height: 7px;
      background-color: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: ${blueColor};
      border-radius: 4px;
    }

    .skill-value {
      font-size: 10.5px;
      font-weight: 700;
      color: #4b4e54;
      width: 38px;
      text-align: right;
      flex-shrink: 0;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Left Dark Sidebar -->
    <div class="sidebar-bg"></div>

    <!-- Top Blue Banner -->
    <div class="top-blue-banner"></div>

    <!-- Header Name & Role -->
    <div class="header-info">
      <h1 class="candidate-name">${firstName}<br>${lastName}</h1>
      <div class="candidate-title">${data.title || 'Product Designer'}</div>
    </div>

    <!-- Circular Profile Photo -->
    <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Richard Sanchez'}">

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      <div class="sidebar-title">About Me</div>
      <p class="about-text">
        ${summaryText}
      </p>

      <!-- Contact Details -->
      <div class="contact-list">
        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </div>
          <span>${phoneText}</span>
        </div>

        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <span style="word-break: break-all;">${emailText}</span>
        </div>

        <div class="contact-row">
          <div class="contact-icon-circle">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <span>${locationText}</span>
        </div>
      </div>

      <!-- Language -->
      <div class="sidebar-badge">Language</div>
      <ul class="sidebar-list">
        ${languageList.map(l => `<li>${typeof l === 'string' ? l : l.name || 'Language'}</li>`).join('')}
      </ul>

      <!-- Expertise -->
      <div class="sidebar-badge">Expertise</div>
      <ul class="sidebar-list">
        ${expertiseList.map(s => {
          const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
          return `<li>${name}</li>`;
        }).join('')}
      </ul>
    </div>

    <!-- Right Main Panel Content -->
    <div class="main-panel">
      <!-- Experience Section -->
      <div class="main-section">
        <div class="main-badge">Experience</div>
        <div class="entry-group">
          ${experienceList.map(e => {
            const desc = e.description || (e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean).join('. ') : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sit amet quam rhoncus, egestas dui eget, malesuada justo. Ut aliquam augue.');
            return `
              <div class="entry-block">
                <div class="entry-company">${e.company || 'Arowwai Industries'}</div>
                ${e.location ? `<div class="entry-location">${e.location}</div>` : '<div class="entry-location">Sydney - Australia</div>'}
                <div class="entry-date">${e.start || '2020'} - ${e.end || '2022'}</div>
                <p class="entry-desc">${desc}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Education Section -->
      <div class="main-section">
        <div class="main-badge">Education</div>
        <div class="entry-group">
          ${educationList.map(e => `
            <div class="entry-block">
              <div class="entry-company">${e.school || 'Borcelle University'}</div>
              <div class="edu-degree">${e.degree || 'Bachelor of Business Management'}</div>
              <div class="edu-date">${e.start || '2014'} - ${e.end || '2023'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Skills Summary Section -->
      <div class="main-section">
        <div class="main-badge">Skills Summary</div>
        <div class="skills-bars">
          ${skillsBars.map(sb => `
            <div class="skill-bar-row">
              <span class="skill-label">${sb.name}</span>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${sb.percent}%;"></div>
              </div>
              <span class="skill-value">${sb.percent} %</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
