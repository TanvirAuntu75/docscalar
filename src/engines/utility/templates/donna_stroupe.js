// ═══════════════════════════════════════════════════════════════════════════════
// DONNA STROUPE — Exact 1:1 Pixel-Perfect Replica from User Template
// Warm Taupe Sidebar, Dark Espresso Header Banner (#2b211d), Framed Summary & Underlined Headers
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDonnaStroupeHtml(
  data,
  themeColor = '#2b211d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const espressoColor = themeColor === 'default' || !themeColor ? '#2b211d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const candidateName = (data.name || 'DONNA STROUPE').toUpperCase();
  const photoSrc = data.photoUrl || '/images/candidates/donna.jpg';

  const summaryText = data.summary || 'I am a Sales Representative is a professional who initializes and manages relationships with customers. They serve as their point of contact and lead from initial outreach through the making of the final purchase by them or someone in their household.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';
  const websiteText = data.website || 'reallygreatsite.com';

  const skillsList = data.skills && data.skills.length ? data.skills : [
    'Sales Strategies', 'Negotiation Skills', 'Problem-Solving',
    'Time Management', 'Presentation Skills', 'Team Collaboration'
  ];

  const languageList = data.custom_languages && data.custom_languages.length ? data.custom_languages : ['English', 'French'];

  const educationList = data.education && data.education.length ? data.education : [
    { degree: 'BA Sales and Commerce', school: 'Wardiere University', start: '2016', end: '2020' },
    { degree: 'Bachelor of Marketing', school: 'Wardiere University', start: '2020', end: '2023' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      dates: 'Jul 2020 – Aug 2023',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      role: 'Consumer Goods Seller',
      highlights: [
        'Offer consumer goods packages to corporate and clients',
        'Meet with clients every quarter to update or renew services',
        'Train junior sales agents'
      ]
    },
    {
      dates: 'Jul 2020 – Aug 2015',
      company: 'Timmerman Industries | 123 Anywhere St., Any City',
      role: 'FMCG Sales Agent',
      highlights: [
        'Visited corporate client offices to offer latest products',
        'Built relationships with clients to maintain sales goals and create new opportunities'
      ]
    },
    {
      dates: 'Aug 2014 – Jul 2015',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      role: 'Sales Agent',
      highlights: [
        'Visited corporate client offices to offer latest products'
      ]
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donna Stroupe - Resume</title>
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

    /* Fixed A4 Page Container (794px x 1123px) */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
    }

    /* Left Sidebar Taupe Background */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 275px;
      height: 1123px;
      background-color: #d6ccc2;
      z-index: 1;
    }

    /* Top Dark Espresso Header Banner (Starts smoothly behind the photo center) */
    .dark-header-banner {
      position: absolute;
      top: 75px;
      left: 130px;
      width: 664px;
      height: 145px;
      background-color: ${espressoColor};
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-left: 175px;
    }

    .candidate-name {
      font-size: 34px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 15px;
      font-weight: 400;
      color: #ede8e4;
      margin-top: 10px;
      letter-spacing: 0.5px;
    }

    /* Circular Profile Photo */
    .profile-photo {
      position: absolute;
      top: 65px;
      left: 45px;
      width: 185px;
      height: 185px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      object-fit: cover;
      object-position: center 15%;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 5;
      background-color: #ffffff;
    }

    /* Left Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 285px;
      left: 0;
      width: 275px;
      padding: 0 28px 30px 30px;
      z-index: 3;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
      color: #2b211d;
      font-weight: 500;
    }

    .contact-row svg {
      width: 14px;
      height: 14px;
      fill: #2b211d;
      flex-shrink: 0;
    }

    /* Sidebar Section Dividers */
    .sidebar-divider {
      width: 100%;
      height: 1px;
      background-color: #9c9288;
      margin: 18px 0;
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 700;
      color: #2b211d;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    /* Education Section */
    .edu-entry {
      margin-bottom: 12px;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: #2b211d;
      line-height: 1.25;
    }

    .edu-school {
      font-size: 10px;
      font-weight: 700;
      color: #4a403a;
      margin-top: 2px;
    }

    .edu-years {
      font-size: 9.5px;
      color: #5d544e;
      margin-top: 1px;
    }

    /* Skills List */
    .skills-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 5.5px;
    }

    .skills-list li {
      font-size: 10.5px;
      font-weight: 500;
      color: #2b211d;
    }

    /* Language List */
    .language-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .language-item {
      font-size: 10.5px;
      font-weight: 500;
      color: #2b211d;
    }

    /* Right Main Content Panel */
    .main-panel {
      position: absolute;
      top: 250px;
      left: 275px;
      width: 519px;
      padding: 25px 38px 30px 38px;
      z-index: 3;
    }

    /* About Me */
    .about-title {
      font-size: 15px;
      font-weight: 700;
      color: #2b211d;
      margin-bottom: 8px;
    }

    .about-box {
      border-top: 1px solid #2b211d;
      border-bottom: 1px solid #2b211d;
      padding: 10px 0;
      margin-bottom: 20px;
    }

    .about-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #443c37;
      text-align: justify;
    }

    /* Section Headers with Underlines */
    .section-title-underlined {
      font-size: 14px;
      font-weight: 700;
      color: #2b211d;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 1px solid #2b211d;
      padding-bottom: 4px;
      margin-bottom: 14px;
    }

    /* Work Experience */
    .experience-group {
      display: flex;
      flex-direction: column;
      gap: 13px;
      margin-bottom: 22px;
    }

    .exp-entry {
      display: flex;
      flex-direction: column;
    }

    .exp-dates {
      font-size: 10px;
      color: #55504b;
    }

    .exp-company {
      font-size: 10.5px;
      font-weight: 600;
      color: #2b211d;
      margin-top: 1px;
    }

    .exp-role {
      font-size: 11.5px;
      font-weight: 700;
      color: #2b211d;
      margin-top: 2px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 3.5px;
      margin-top: 4px;
    }

    .exp-bullets li {
      font-size: 9.8px;
      line-height: 1.4;
      color: #443c37;
    }

    /* References */
    .references-row {
      display: flex;
      gap: 30px;
    }

    .ref-col {
      flex: 1;
    }

    .ref-name {
      font-size: 11.5px;
      font-weight: 700;
      color: #2b211d;
    }

    .ref-title {
      font-size: 10px;
      color: #55504b;
      margin-top: 1px;
      margin-bottom: 5px;
    }

    .ref-contact {
      font-size: 9.5px;
      color: #443c37;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Left Sidebar Base Color -->
    <div class="sidebar-bg"></div>

    <!-- Top Dark Header Banner -->
    <div class="dark-header-banner">
      <h1 class="candidate-name">${candidateName}</h1>
      <div class="candidate-title">${data.title || 'Sales Representative'}</div>
    </div>

    <!-- Circular Profile Photo -->
    <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Donna Stroupe'}">

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      <!-- Contact Details -->
      <div class="contact-list">
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          <span style="word-break: break-all;">${emailText}</span>
        </div>
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          <span>${phoneText}</span>
        </div>
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span>${locationText}</span>
        </div>
        <div class="contact-row">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          <span>${websiteText}</span>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Education Section -->
      <div class="sidebar-title">Education</div>
      ${educationList.map(e => `
        <div class="edu-entry">
          <div class="edu-degree">${e.degree || 'Bachelor of Marketing'}</div>
          <div class="edu-school">${e.school || 'Wardiere University'}</div>
          <div class="edu-years">${e.start || '2016'} - ${e.end || '2020'}</div>
        </div>
      `).join('')}

      <div class="sidebar-divider"></div>

      <!-- Skills Section -->
      <div class="sidebar-title">Skills</div>
      <ul class="skills-list">
        ${skillsList.map(s => {
          const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
          return `<li>${name}</li>`;
        }).join('')}
      </ul>

      <div class="sidebar-divider"></div>

      <!-- Language Section -->
      <div class="sidebar-title">Language</div>
      <div class="language-list">
        ${languageList.map(l => `<div class="language-item">${typeof l === 'string' ? l : l.name || 'Language'}</div>`).join('')}
      </div>
    </div>

    <!-- Right Main Content Panel -->
    <div class="main-panel">
      <!-- About Me Section -->
      <div class="about-title">About Me</div>
      <div class="about-box">
        <p class="about-text">
          ${summaryText}
        </p>
      </div>

      <!-- Work Experience Section -->
      <div class="section-title-underlined">Work Experience</div>
      <div class="experience-group">
        ${experienceList.map(e => {
          const dates = e.dates || `${e.start || '2020'} – ${e.end || '2023'}`;
          const company = e.company || 'Arowwai Industries | 123 Anywhere St., Any City';
          const role = e.role || 'Sales Representative';
          const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : [e.description || 'Offer consumer goods packages to corporate and clients'];
          return `
            <div class="exp-entry">
              <div class="exp-dates">${dates}</div>
              <div class="exp-company">${company}</div>
              <div class="exp-role">${role}</div>
              <ul class="exp-bullets">
                ${bullets.map(b => `<li>${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
              </ul>
            </div>
          `;
        }).join('')}
      </div>

      <!-- References Section -->
      <div class="section-title-underlined">References</div>
      <div class="references-row">
        <!-- Reference 1 -->
        <div class="ref-col">
          <div class="ref-name">Estelle Darcy</div>
          <div class="ref-title">Wardiere Inc. / CEO</div>
          <div class="ref-contact">Phone: +123-456-7890</div>
          <div class="ref-contact">Email: hello@reallygreatsite.com</div>
        </div>

        <!-- Reference 2 -->
        <div class="ref-col">
          <div class="ref-name">Harper Russo</div>
          <div class="ref-title">Wardiere Inc. / CEO</div>
          <div class="ref-contact">Phone: +123-456-7890</div>
          <div class="ref-contact">Email: hello@reallygreatsite.com</div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
