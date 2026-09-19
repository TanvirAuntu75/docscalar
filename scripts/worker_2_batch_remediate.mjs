import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const templatesDir = path.resolve(root, 'src', 'engines', 'utility', 'templates');

const curatedList = [
  'kathleen.js', 'kyiv_golden.js', 'kyoto_coral.js', 'lilac_sidebar.js',
  'lyon_lavender.js', 'madrid_sun.js', 'manhattan_noir.js', 'milan_blush.js',
  'montreal_frost.js', 'ocean_block.js', 'ong_burgundy.js', 'osaka_minimal.js',
  'oslo_taupe.js', 'overlapping_badge.js', 'oxford_burgundy.js', 'prague_brass.js',
  'reykjavik_slate.js', 'richard.js', 'sage_pastel.js', 'san_francisco_skyline.js',
  'sanchez_dark.js', 'sanchez_mono.js', 'sanchez_wave.js', 'schumacher_charcoal.js'
];

for (const file of curatedList) {
  const filePath = path.join(templatesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Remove mock glyphs
  content = content.replace(/✦\s*/g, '• ');
  content = content.replace(/☼\s*/g, '• ');
  content = content.replace(/□\s*/g, '• ');
  content = content.replace(/❧\s*/g, '• ');
  content = content.replace(/◆\s*/g, '• ');

  // 2. Remove mock name fallbacks
  content = content.replace(/\$\{data\.name\s*\|\|\s*['"]Candidate Name['"]\}/g, '${data.name || \'\'}');
  content = content.replace(/\$\{data\.name\s*\?\s*data\.name\s*:\s*['"]Candidate Name['"]\}/g, '${data.name || \'\'}');

  // 3. Add <title> in <head> if missing
  if (!content.includes('<title>')) {
    content = content.replace(
      /(<meta\s+name=["']viewport["'][^>]*>)/i,
      `$1\n  <title>\${data.name ? \`\${data.name} - Resume\` : 'Resume'}</title>`
    );
  }

  // 4. Ensure .cv-page container class on root container
  // Replace <div id="main-container"> with <div class="cv-page" id="main-container">
  content = content.replace(/<div id=["']main-container["']/g, '<div class="cv-page" id="main-container"');
  content = content.replace(/<div class=["']page-container["']/g, '<div class="cv-page page-container"');
  content = content.replace(/<div class=["']resume-canvas["']/g, '<div class="cv-page resume-canvas"');
  content = content.replace(/<div class=["']container["']/g, '<div class="cv-page container"');

  // 5. Add page-break avoidance to CSS
  if (!content.includes('.cv-page:last-child')) {
    content = content.replace(
      /(@media print \{[\s\S]*?)(#main-container|\.cv-page|\.page-container|\.container)/i,
      `$1.cv-page:last-child {\n        page-break-after: avoid !important;\n        break-after: avoid !important;\n        margin-bottom: 0 !important;\n      }\n      $2`
    );
  }

  // 6. Avatar mask wrapping
  // Look for avatar-container with <img> not in avatar-mask
  if (!content.includes('avatar-mask')) {
    content = content.replace(
      /<div class=["']avatar-container["']>\s*<img([^>]*?)class=["']avatar["']([^>]*?)\/>\s*<\/div>/g,
      `<div class="avatar-container">\n          <div class="avatar-mask">\n            <img$1class="avatar"$2/>\n          </div>\n        </div>`
    );
    content = content.replace(
      /<div class=["']avatar-container["']>\s*<img([^>]*?)class=["']avatar["']([^>]*?)>\s*<\/div>/g,
      `<div class="avatar-container">\n          <div class="avatar-mask">\n            <img$1class="avatar"$2>\n          </div>\n        </div>`
    );

    // Add avatar-mask css if not present
    if (!content.includes('.avatar-mask {')) {
      content = content.replace(
        /(\.avatar\s*\{[^}]*\})/i,
        `.avatar-mask {\n      width: 145px;\n      height: 145px;\n      border-radius: 50%;\n      overflow: hidden;\n      position: relative;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      border: 3px solid \${accent};\n      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);\n    }\n    .avatar-mask .avatar, .avatar-mask img {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n      display: block;\n    }\n    $1`
      );
    }
  }

  // 7. Fix contactHtml guard
  // Replace `const contactHtml = \`\n <div class="sidebar-section">` with guarded version
  const contactRegex = /const contactHtml\s*=\s*`\s*<div class="sidebar-section">\s*<h3>Contact<\/h3>([\s\S]*?)<\/div>\s*<\/div>\s*`;/;
  const contactMatch = content.match(contactRegex);
  if (contactMatch) {
    const inner = contactMatch[1];
    // Clean up inner to make sure data-df-fields are stamped properly and deduplicated
    let cleanInner = inner;
    cleanInner = cleanInner.replace(/<span class="val">\$\{data\.location\}<\/span>/g, '<span class="val" data-df-field="location">${data.location}</span>');
    cleanInner = cleanInner.replace(/<span class="val">\$\{data\.phone\}<\/span>/g, '<span class="val" data-df-field="phone">${data.phone}</span>');
    cleanInner = cleanInner.replace(/data-df-field="email"\s+data-df-field="email"/g, 'data-df-field="email"');
    cleanInner = cleanInner.replace(/<a([^>]*?)data-df-field="email"([^>]*?)data-df-field="email"/g, '<a$1data-df-field="email"$2');

    const replacement = `const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);\n  const contactHtml = hasContact ? \`\n    <div class="sidebar-section">\n      <h3>Contact</h3>\n      <div class="sidebar-line"></div>\n      <div class="contact-list">\n        \${data.location ? \`\n          <div class="contact-item">\n            <span class="label">Location</span>\n            <span class="val" data-df-field="location">\${data.location}</span>\n          </div>\n        \` : ''}\n        \${data.phone ? \`\n          <div class="contact-item">\n            <span class="label">Phone</span>\n            <span class="val" data-df-field="phone">\${data.phone}</span>\n          </div>\n        \` : ''}\n        \${data.email ? \`\n          <div class="contact-item">\n            <span class="label">Email</span>\n            <span class="val"><a href="mailto:\${data.email}" data-df-field="email" style="color: inherit; text-decoration: none;">\${data.email}</a></span>\n          </div>\n        \` : ''}\n        \${data.linkedin ? \`\n          <div class="contact-item">\n            <span class="label">LinkedIn</span>\n            <span class="val"><a data-df-field="linkedin" href="https://\${data.linkedin.replace(/^https?:\\/\\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">\${data.linkedin.replace(/^https?:\\/\\//, '')}</a></span>\n          </div>\n        \` : ''}\n        \${data.website ? \`\n          <div class="contact-item">\n            <span class="label">Website</span>\n            <span class="val"><a data-df-field="website" href="https://\${data.website.replace(/^https?:\\/\\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">\${data.website.replace(/^https?:\\/\\//, '')}</a></span>\n          </div>\n        \` : ''}\n      </div>\n    </div>\n  \` : '';`;

    content = content.replace(contactRegex, replacement);
  }

  // 8. Stamping in skills: `<span class="skill-name">• ${name}</span>` -> `<span class="skill-name" data-df-field="skill:${idx}">• ${name}</span>`
  content = content.replace(/<span class="skill-name">\s*(?:•\s*)?\$\{name\}<\/span>/g, '<span class="skill-name" data-df-field="skill:${idx}">• ${name}</span>');
  content = content.replace(/<span class="skill-name">\s*\$\{s\}<\/span>/g, '<span class="skill-name" data-df-field="skill:${idx}">• ${s}</span>');

  // 9. Stamping in projects: `<span class="proj-title">${p.name}</span>` -> `<span class="proj-title" data-df-field="proj:${idx}:name">${p.name}</span>`
  content = content.replace(/<span class="proj-title">\s*\$\{p\.name\}<\/span>/g, '<span class="proj-title" data-df-field="proj:${idx}:name">${p.name}</span>');
  content = content.replace(/<span class="proj-url"><a href="https:\/\/\$\{p\.url\.replace\(\/\^https\?:\\\/\\\/\/, ''\)\}" target="_blank"([^>]*)>\$\{p\.url\}<\/a><\/span>/g, '<span class="proj-url"><a href="https://${p.url.replace(/^https?:\\/\\//, \'\')}" target="_blank"$1 data-df-field="proj:${idx}:url">${p.url}</a></span>');

  // 10. Guard main-header when empty
  const mainHeaderRegex = /<div class="main-header">\s*<h1 data-df-field="name">\$\{data\.name \|\| ''\}<\/h1>\s*\$\{data\.title \? `<div class="title" data-df-field="title">\$\{data\.title\}<\/div>` : ''\}\s*\$\{data\.summary \? `<div class="summary" data-df-field="summary">\$\{data\.summary\}<\/div>` : ''\}\s*<\/div>/;
  if (content.match(mainHeaderRegex)) {
    content = content.replace(
      mainHeaderRegex,
      `\${(data.name || data.title || data.summary) ? \`\n      <div class="main-header">\n        \${data.name ? \`<h1 data-df-field="name">\${data.name}</h1>\` : ''}\n        \${data.title ? \`<div class="title" data-df-field="title">\${data.title}</div>\` : ''}\n        \${data.summary ? \`<div class="summary" data-df-field="summary">\${data.summary}</div>\` : ''}\n      </div>\n      \` : ''}`
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Hardened: ${file}`);
}
