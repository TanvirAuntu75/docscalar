// ═══════════════════════════════════════════════════════════════════════════════
// ISABEL MERCADO — Exact 1:1 Pixel-Perfect Replica from User Template
// Rectangular Framed Portrait (#ede9e3), Charcoal Pill Badges (#31353d), & 7-Dot Skill Ratings
// ═══════════════════════════════════════════════════════════════════════════════

export function generateIsabelMercadoHtml(
  data,
  themeColor = '#31353d',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const charcoalColor = themeColor === 'default' || !themeColor ? '#31353d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Two-tone name splitting: light first name + bold last name
  const nameParts = (data.name || 'ISABEL MERCADO').trim().split(' ');
  const firstName = (nameParts[0] || 'ISABEL').toUpperCase();
  const lastName = (nameParts.slice(1).join(' ') || 'MERCADO').toUpperCase();

  const photoSrc = data.photoUrl || '/images/candidates/isabel.jpg';

  const summaryText = data.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const websiteText = data.website || 'www.reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';

  const rawSkills = data.skills && data.skills.length ? data.skills : [
    'Project Management', 'Problem Solving', 'Creativity', 'Leadership'
  ];

  // Map skills to 7-dot ratings
  const defaultRatings = [5, 5, 5, 5];
  const skillsWithRatings = rawSkills.map((s, idx) => {
    let name = typeof s === 'string' ? s : s.name || '';
    let rating = defaultRatings[idx % defaultRatings.length];
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      const levelStr = parts[1].toLowerCase();
      if (levelStr.includes('expert') || levelStr.includes('native')) rating = 7;
      else if (levelStr.includes('advanced')) rating = 6;
      else if (levelStr.includes('intermediate')) rating = 5;
      else rating = 4;
    }
    return { name, rating };
  });

  const educationList = data.education && data.education.length ? data.education : [
    { degree: 'Masters in Product Design', dates: '2004 - 2008', school: 'Really Great University' },
    { degree: 'BA in Product Design', dates: '2008 - 2010', school: 'Really Great University' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      company: 'Really Great Company',
      dates: '2018-2020',
      role: 'Senior Graphic Designer',
      highlights: [
        'Manage website appearance, as well as SEO content and marketing, as well as brand and logo design.',
        'Collaborate with other development teams.'
      ]
    },
    {
      company: 'Really Great Company',
      dates: '2017-2018',
      role: 'Graphic Designer',
      highlights: [
        'Manage website appearance, as well as SEO content and marketing, as well as brand and logo design.',
        'Collaborate with other development teams.'
      ]
    },
    {
      company: 'Really Great Company',
      dates: '2016-2017',
      role: 'Junior Graphic Designer',
      highlights: [
        'Manage website appearance, as well as SEO content and marketing, as well as brand and logo design.',
        'Collaborate with other development teams.'
      ]
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Isabel Mercado - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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

    /* Fixed A4 Page Container with Rounded Corners */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      padding: 55px 48px 40px 48px;
      display: flex;
      gap: 46px;
      margin: 0 auto;
    }

    /* Left Sidebar Column */
    .left-col {
      width: 255px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    /* Rectangular Profile Photo with Light Backing */
    .photo-container {
      width: 195px;
      height: 215px;
      background-color: #ede9e3;
      padding: 6px;
      margin-bottom: 24px;
    }

    .profile-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    /* Name & Title Block */
    .name-block {
      margin-bottom: 30px;
    }

    .name-first {
      font-size: 32px;
      font-weight: 300;
      color: #31353d;
      letter-spacing: 1.5px;
      line-height: 1;
      text-transform: uppercase;
    }

    .name-last {
      font-size: 36px;
      font-weight: 800;
      color: #1f2228;
      letter-spacing: 1px;
      line-height: 1.1;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .job-title {
      font-size: 12px;
      font-weight: 600;
      font-style: italic;
      color: #4b4e56;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 6px;
    }

    /* Pill-shaped Section Header */
    .pill-header {
      background-color: ${charcoalColor};
      border-radius: 20px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 18px;
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
      margin-bottom: 14px;
    }

    .pill-header svg {
      width: 18px;
      height: 18px;
      fill: #ffffff;
      flex-shrink: 0;
    }

    /* Contact Details */
    .contact-section {
      margin-bottom: 32px;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 6px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 10.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: #1f2228;
      flex-shrink: 0;
    }

    /* Skills Rating Section */
    .skills-section {
      display: flex;
      flex-direction: column;
    }

    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-left: 6px;
    }

    .skill-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skill-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #1f2228;
    }

    .rating-dots {
      display: flex;
      gap: 5.5px;
    }

    .dot {
      width: 7.5px;
      height: 7.5px;
      border-radius: 50%;
    }

    .dot.filled {
      background-color: ${charcoalColor};
    }

    .dot.empty {
      background-color: #d8dade;
    }

    /* Right Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* About Me */
    .about-section {
      margin-bottom: 22px;
    }

    .about-text {
      font-size: 10.5px;
      line-height: ${lineSpacing};
      color: #4a4d55;
      text-align: justify;
      padding-left: 4px;
    }

    /* Education */
    .edu-section {
      margin-bottom: 24px;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 6px;
    }

    .timeline-item {
      position: relative;
      padding-left: 24px;
    }

    /* Vertical Timeline Connector Line */
    .timeline-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${charcoalColor};
    }

    /* Timeline Top Node */
    .timeline-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    /* Timeline Bottom Node */
    .timeline-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .edu-degree {
      font-size: 12px;
      font-weight: 700;
      color: #1f2228;
    }

    .edu-dates {
      font-size: 10px;
      color: #63666d;
      margin-top: 1px;
    }

    .edu-school {
      font-size: 10.5px;
      font-style: italic;
      font-weight: 600;
      color: #2b2e34;
      margin-top: 1px;
    }

    /* Work Experience */
    .experience-section {
      display: flex;
      flex-direction: column;
    }

    .exp-item {
      position: relative;
      padding-left: 24px;
    }

    .exp-item::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background-color: ${charcoalColor};
    }

    .exp-item::after {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .exp-item .node-bottom {
      position: absolute;
      left: 0;
      bottom: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${charcoalColor};
    }

    .exp-company {
      font-size: 12px;
      font-weight: 700;
      color: #1f2228;
    }

    .exp-dates {
      font-size: 10.5px;
      font-weight: 700;
      color: ${charcoalColor};
      margin-top: 1px;
    }

    .exp-role {
      font-size: 11.5px;
      font-weight: 700;
      color: #1f2228;
      margin-top: 2px;
      margin-bottom: 4px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .exp-bullets li {
      font-size: 9.8px;
      line-height: 1.4;
      color: #4a4d55;
      text-align: justify;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    
    <!-- Left Column -->
    <div class="left-col">
      <!-- Portrait Photo -->
      <div class="photo-container">
        <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Isabel Mercado'}">
      </div>

      <!-- Name & Job Title -->
      <div class="name-block">
        <div class="name-first">${firstName}</div>
        <div class="name-last">${lastName}</div>
        <div class="job-title">${(data.title || 'GRAPHICS DESIGNER').toUpperCase()}</div>
      </div>

      <!-- Contact -->
      <div class="contact-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          <span>Contact</span>
        </div>
        <div class="contact-list">
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>${locationText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span>${phoneText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2h-4zM4 5h16v11H4V5z"/></svg>
            <span>${websiteText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <span style="word-break: break-all;">${emailText}</span>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="skills-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <span>Skills</span>
        </div>
        <div class="skills-list">
          ${skillsWithRatings.map(s => `
            <div class="skill-item">
              <span class="skill-name">${s.name}</span>
              <div class="rating-dots">
                ${[1, 2, 3, 4, 5, 6, 7].map(idx => `
                  <span class="dot ${idx <= s.rating ? 'filled' : 'empty'}"></span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Right Column -->
    <div class="right-col">
      <!-- About Me -->
      <div class="about-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>About Me</span>
        </div>
        <p class="about-text">
          ${summaryText}
        </p>
      </div>

      <!-- Education -->
      <div class="edu-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <span>Education</span>
        </div>
        <div class="timeline-list">
          ${educationList.map(e => `
            <div class="timeline-item">
              <div class="edu-degree">${e.degree || 'BA in Product Design'}</div>
              <div class="edu-dates">${e.dates || `${e.start || '2008'} - ${e.end || '2010'}`}</div>
              <div class="edu-school">${e.school || 'Really Great University'}</div>
              <span class="node-bottom"></span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Work Experience -->
      <div class="experience-section">
        <div class="pill-header">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <span>Work Experience</span>
        </div>
        <div class="timeline-list">
          ${experienceList.map(e => {
            const company = e.company || 'Really Great Company';
            const dates = e.dates || `${e.start || '2018'}-${e.end || '2020'}`;
            const role = e.role || 'Graphic Designer';
            const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : [e.description || 'Manage website appearance, as well as SEO content and marketing.'];
            return `
              <div class="exp-item">
                <div class="exp-company">${company}</div>
                <div class="exp-dates">${dates}</div>
                <div class="exp-role">${role}</div>
                <ul class="exp-bullets">
                  ${bullets.map(b => `<li>${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
                <span class="node-bottom"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;
}
