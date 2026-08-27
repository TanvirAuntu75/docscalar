// ═══════════════════════════════════════════════════════════════════════════════
// TERRACOTTA ARCH (Adeline Palmerston Edition) — Exact 1:1 Pixel-Perfect Replica
// Warm Cream Canvas (#fbf9f5), Terracotta Line Accents (#b87352), Arch Capsule Halo & Sage Overview
// ═══════════════════════════════════════════════════════════════════════════════

export function generateTerracottaArchHtml(
  data,
  themeColor = '#b87352',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const terracottaColor = themeColor === 'default' || !themeColor ? '#b87352' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name splitting for two-line header
  const nameParts = (data.name || 'Adeline Palmerston').trim().split(' ');
  const firstName = nameParts[0] || 'Adeline';
  const lastName = nameParts.slice(1).join(' ') || 'Palmerston';

  const photoSrc = data.photoUrl || '/images/candidates/adeline.jpg';

  const summaryText = data.summary || 'I am a sales representative with a proven track record of exceeding sales targets. Adept at building and nurturing client relationships through effective communication and a consultative sales approach. Known for a high level of enthusiasm, resilience, and a passion for delivering exceptional customer experiences.';

  const phoneText = data.phone || '123-456-7890';
  const locationText = data.location || '123 Anywhere St., Any City';
  const emailText = data.email || 'hello@reallygreatsite';

  const skillsList = data.skills && data.skills.length ? data.skills : [
    'Prospecting and Lead Generation', 'Consultative Selling', 'Relationship Building',
    'Customer Retention', 'Negotiation and Closing', 'Product Knowledge'
  ];

  const educationList = data.education && data.education.length ? data.education : [
    { degree: 'Master of Business Administration in Sales Management', school: 'Really Great University', years: '(2014 - 2016)' },
    { degree: 'Bachelor of Business Administration in Sales Management', school: 'Really Great University', years: '(2010 - 2014)' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      role: 'Senior Sales Representative',
      meta: '(2020 - Present) Really Great Company',
      highlights: [
        'Exceeded annual sales targets by 20% through strategic prospecting and effective negotiation.',
        'Cultivated and managed key client accounts, resulting in a 30% increase in customer retention.',
        'Collaborated with the marketing team to implement successful promotional campaigns, contributing to a 25% boost in lead generation.'
      ]
    },
    {
      role: 'Sales Specialist',
      meta: '(2018 - 2020) Really Great Company',
      highlights: [
        'Consistently ranked as a top-performing sales representative, achieving monthly sales quotas.',
        'Conducted product demonstrations and training sessions, enhancing customer understanding and satisfaction.',
        'Implemented a proactive follow-up system, resulting in a 15% increase in repeat business.'
      ]
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adeline Palmerston - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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

    /* Fixed A4 Page Container with Rounded Frame */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #fbf9f5;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 55px 48px 30px 48px;
      margin: 0 auto;
    }

    /* Left Edge Terracotta Accent Block */
    .left-accent-block {
      position: absolute;
      top: 78px;
      left: 0;
      width: 24px;
      height: 96px;
      background-color: ${terracottaColor};
    }

    /* Header Section */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      position: relative;
      z-index: 2;
    }

    .header-left {
      flex: 1;
      padding-top: 15px;
    }

    .candidate-name {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.05;
      color: #232528;
      letter-spacing: -0.5px;
    }

    /* Subtitle with Horizontal Leading Line */
    .subtitle-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 18px;
      margin-bottom: 22px;
    }

    .subtitle-line {
      width: 140px;
      height: 1.5px;
      background-color: ${terracottaColor};
    }

    .candidate-title {
      font-size: 13px;
      font-weight: 700;
      color: ${terracottaColor};
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* Contact Details Grid */
    .contact-grid {
      display: grid;
      grid-template-columns: 190px 1fr;
      row-gap: 10px;
      column-gap: 15px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #2b2e32;
      font-weight: 500;
    }

    .contact-item svg {
      width: 15px;
      height: 15px;
      fill: #232528;
      flex-shrink: 0;
    }

    /* Capsule / Arch Photo Frame */
    .photo-wrapper {
      width: 220px;
      height: 275px;
      border-radius: 110px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
      background-color: #ffffff;
      position: relative;
      z-index: 3;
    }

    .profile-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      filter: grayscale(100%) contrast(105%);
    }

    /* Sage / Slate Blue Overview Box */
    .overview-box {
      background-color: #d1dcdd;
      border-radius: 6px;
      padding: 18px 24px;
      margin-top: -30px;
      margin-bottom: 30px;
      position: relative;
      z-index: 1;
    }

    .overview-title {
      font-size: 14px;
      font-weight: 700;
      color: #232528;
      margin-bottom: 6px;
    }

    .overview-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #383b40;
      text-align: justify;
    }

    /* Two-Column Main Content */
    .main-content-grid {
      display: grid;
      grid-template-columns: 1.22fr 1fr;
      gap: 36px;
      flex: 1;
    }

    /* Section Titles */
    .section-title {
      font-size: 15.5px;
      font-weight: 700;
      color: ${terracottaColor};
      margin-bottom: 12px;
      letter-spacing: -0.2px;
    }

    /* Work Experience Column */
    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exp-entry {
      display: flex;
      flex-direction: column;
    }

    .exp-role {
      font-size: 12px;
      font-weight: 700;
      color: #232528;
    }

    .exp-meta {
      font-size: 10.5px;
      font-style: italic;
      color: #4a4d52;
      margin-top: 1px;
      margin-bottom: 6px;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bullet-list li {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #383b40;
      text-align: justify;
    }

    .entry-divider {
      width: 45px;
      height: 1px;
      background-color: #d6b8a8;
      margin-top: 14px;
    }

    /* Right Column (Education & Skills) */
    .right-col {
      display: flex;
      flex-direction: column;
    }

    .edu-section {
      margin-bottom: 22px;
    }

    .edu-entry {
      margin-bottom: 12px;
    }

    .edu-degree {
      font-size: 11.5px;
      font-weight: 700;
      color: #232528;
      line-height: 1.25;
    }

    .edu-meta {
      font-size: 10.5px;
      font-style: italic;
      color: #4a4d52;
      margin-top: 2px;
    }

    .skills-section {
      display: flex;
      flex-direction: column;
    }

    .skills-list {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .skills-list li {
      font-size: 10.5px;
      font-weight: 500;
      color: #383b40;
    }

    /* Bottom Terracotta Stripe */
    .footer-stripe {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 10px;
      background-color: ${terracottaColor};
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Left Terracotta Vertical Tab -->
    <div class="left-accent-block"></div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="header-left">
        <h1 class="candidate-name">${firstName}<br>${lastName}</h1>
        
        <div class="subtitle-row">
          <div class="subtitle-line"></div>
          <span class="candidate-title">${data.title || 'Sales Representative'}</span>
        </div>

        <div class="contact-grid">
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span>${phoneText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>${locationText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <span style="word-break: break-all;">${emailText}</span>
          </div>
        </div>
      </div>

      <!-- Pill / Arch Shaped Photo Frame -->
      <div class="photo-wrapper">
        <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Adeline Palmerston'}">
      </div>
    </div>

    <!-- Sage Blue Overview Section -->
    <div class="overview-box">
      <div class="overview-title">Overview</div>
      <p class="overview-text">
        ${summaryText}
      </p>
    </div>

    <!-- Two-Column Main Content -->
    <div class="main-content-grid">
      
      <!-- Left Column: Work Experience -->
      <div>
        <div class="section-title">Work Experience</div>
        <div class="experience-list">
          ${experienceList.map((e, idx) => {
            const role = e.role || 'Senior Sales Representative';
            const meta = e.meta || `${e.start ? `(${e.start} - ${e.end || 'Present'})` : ''} ${e.company || 'Really Great Company'}`;
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : [e.description || 'Exceeded annual sales targets by 20% through strategic prospecting.'];
            return `
              <div class="exp-entry">
                <div class="exp-role">${role}</div>
                <div class="exp-meta">${meta}</div>
                <ul class="bullet-list">
                  ${bullets.map(b => `<li>${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
                ${idx < experienceList.length - 1 ? '<div class="entry-divider"></div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right Column: Education & Skills -->
      <div class="right-col">
        <!-- Education -->
        <div class="edu-section">
          <div class="section-title">Education</div>
          
          ${educationList.map((e, idx) => {
            const deg = e.degree || 'Bachelor of Business Administration in Sales Management';
            const meta = e.years ? `${e.years} ${e.school || 'Really Great University'}` : `${e.start ? `(${e.start} - ${e.end || '2020'})` : ''} ${e.school || 'Really Great University'}`;
            return `
              <div class="edu-entry">
                <div class="edu-degree">${deg}</div>
                <div class="edu-meta">${meta}</div>
              </div>
              ${idx < educationList.length - 1 ? '<div class="entry-divider" style="margin-bottom: 12px; margin-top: 0;"></div>' : ''}
            `;
          }).join('')}
        </div>

        <!-- Skills -->
        <div class="skills-section">
          <div class="section-title">Skills</div>
          <ul class="skills-list">
            ${skillsList.map(s => {
              const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
              return `<li>${name}</li>`;
            }).join('')}
          </ul>
        </div>
      </div>

    </div>

    <!-- Bottom Terracotta Band -->
    <div class="footer-stripe"></div>
  </div>

</body>
</html>`;
}
