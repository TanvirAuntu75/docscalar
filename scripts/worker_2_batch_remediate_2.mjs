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
  content = content.replace(/<div id=["']main-container["']/g, '<div class="cv-page" id="main-container"');
  content = content.replace(/<div class=["']page-container["']/g, '<div class="cv-page page-container"');
  content = content.replace(/<div class=["']resume-canvas["']/g, '<div class="cv-page resume-canvas"');
  content = content.replace(/<div class=["']container["']/g, '<div class="cv-page container"');

  // 5. Page break avoidance in CSS
  if (!content.includes('.cv-page:last-child')) {
    content = content.replace(
      /(@media print \{[\s\S]*?)(#main-container|\.cv-page|\.page-container|\.container)/i,
      `$1.cv-page:last-child {\n        page-break-after: avoid !important;\n        break-after: avoid !important;\n        margin-bottom: 0 !important;\n      }\n      $2`
    );
  }

  // 6. Avatar mask wrapping in HTML
  content = content.replace(
    /<div class=["'](avatar-wrap|avatar-halo-wrap|avatar-container)["']>\s*<img([^>]*?)class=["']avatar["']([^>]*?)\/>\s*<\/div>/g,
    `<div class="$1">\n        <div class="avatar-mask">\n          <img$2class="avatar"$3/>\n        </div>\n      </div>`
  );
  content = content.replace(
    /<div class=["'](avatar-wrap|avatar-halo-wrap|avatar-container)["']>\s*<img([^>]*?)class=["']avatar["']([^>]*?)>\s*<\/div>/g,
    `<div class="$1">\n        <div class="avatar-mask">\n          <img$2class="avatar"$3>\n        </div>\n      </div>`
  );

  // Avatar mask in CSS
  if (!content.includes('.avatar-mask {')) {
    content = content.replace(
      /(\.avatar\s*\{[^}]*\})/i,
      `.avatar-mask {\n      width: 145px;\n      height: 145px;\n      border-radius: 50%;\n      overflow: hidden;\n      position: relative;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n    }\n    .avatar-mask .avatar, .avatar-mask img {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n      display: block;\n    }\n    $1`
    );
  }

  // 7. ContactHtml Guard & Deduplication
  // Find where `const contactHtml = ` starts
  if (content.includes('const contactHtml = `') && !content.includes('const hasContact = Boolean(')) {
    content = content.replace(
      /const contactHtml = `([\s\S]*?)`;/m,
      (match, p1) => {
        let clean = p1;
        clean = clean.replace(/<span class="val">\$\{data\.location\}<\/span>/g, '<span class="val" data-df-field="location">${data.location}</span>');
        clean = clean.replace(/<span class="val">\$\{data\.phone\}<\/span>/g, '<span class="val" data-df-field="phone">${data.phone}</span>');
        clean = clean.replace(/data-df-field="email"\s+data-df-field="email"/g, 'data-df-field="email"');
        clean = clean.replace(/<a([^>]*?)data-df-field="email"([^>]*?)data-df-field="email"/g, '<a$1data-df-field="email"$2');
        return `const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);\n  const contactHtml = hasContact ? \`${clean}\` : '';`;
      }
    );
  }

  // Clean any remaining duplicate data-df-field="email"
  content = content.replace(/data-df-field="email"\s+data-df-field="email"/g, 'data-df-field="email"');
  content = content.replace(/<a([^>]*?)data-df-field="email"([^>]*?)data-df-field="email"/g, '<a$1data-df-field="email"$2');

  // 8. Stamping for skills
  content = content.replace(/<div class=["']skill-item["']>\s*<span>\s*(?:•\s*)?\$\{name\}<\/span>/g, '<div class="skill-item">\n              <span data-df-field="skill:${idx}">• ${name}</span>');
  content = content.replace(/<div class=["']skill-tag["']>\s*<span>\s*\$\{name\}<\/span>/g, '<div class="skill-tag">\n              <span data-df-field="skill:${idx}">${name}</span>');
  content = content.replace(/<span class=["']chip-name["']>\s*\$\{name\}<\/span>/g, '<span class="chip-name" data-df-field="skill:${idx}">${name}</span>');
  content = content.replace(/<span class=["']s-name["']>\s*\$\{name\}<\/span>/g, '<span class="s-name" data-df-field="skill:${idx}">${name}</span>');
  content = content.replace(/<span class=["']skill-name["']>\s*(?:•\s*)?\$\{name\}<\/span>/g, '<span class="skill-name" data-df-field="skill:${idx}">• ${name}</span>');
  content = content.replace(/<span class=["']skill-name["']>\s*(?:•\s*)?\$\{s\}<\/span>/g, '<span class="skill-name" data-df-field="skill:${idx}">• ${s}</span>');
  content = content.replace(/<div class=["']skill-item["']>\s*<span class=["']skill-name["']>\s*(?:•\s*)?\$\{s\}<\/span>/g, '<div class="skill-item">\n              <span class="skill-name" data-df-field="skill:${idx}">• ${s}</span>');

  // 9. Stamping for projects
  content = content.replace(/<span class=["']proj-title["']>\s*\$\{p\.name\}<\/span>/g, '<span class="proj-title" data-df-field="proj:${idx}:name">${p.name}</span>');
  content = content.replace(/<span class=["']entry-role["']>\s*\$\{p\.name\}<\/span>/g, '<span class="entry-role" data-df-field="proj:${idx}:name">${p.name}</span>');
  content = content.replace(/<span class=["']proj-url["']><a href=["']https:\/\/\$\{p\.url\.replace\(\/\^https\?:\\\/\\\/\/, ''\)\}["'] target=["']_blank["']([^>]*)>\$\{p\.url\}<\/a><\/span>/g, '<span class="proj-url"><a href="https://${p.url.replace(/^https?:\\/\\//, \'\')}" target="_blank"$1 data-df-field="proj:${idx}:url">${p.url}</a></span>');

  // 10. Guard main-header when empty
  const mainHeaderRegex = /<div class=["']main-header["']>\s*<h1 data-df-field=["']name["']>\$\{data\.name \|\| ''\}<\/h1>\s*(\$\{data\.title \? `<div class=["']title["'] data-df-field=["']title["']>\$\{data\.title\}<\/div>` : ''\})\s*(\$\{data\.summary \? `<div class=["'](?:summary|summary-text)["'] data-df-field=["']summary["']>\$\{data\.summary\}<\/div>` : ''\})\s*<\/div>/;
  if (content.match(mainHeaderRegex)) {
    content = content.replace(
      mainHeaderRegex,
      (match, p1, p2) => `\${(data.name || data.title || data.summary) ? \`\n      <div class="main-header">\n        \${data.name ? \`<h1 data-df-field="name">\${data.name}</h1>\` : ''}\n        ${p1}\n        ${p2}\n      </div>\n      \` : ''}`
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Deep Hardened: ${file}`);
}
