import fs from 'fs';
import path from 'path';

// All candidate files in Batch 3 & Batch 4 (Files 35 to 68 alphabetically + any from prompt)
const files = [
  'howard_ong.js',
  'isabel_mercado.js',
  'isabel_schumacher.js',
  'jonathan.js',
  'jonathan_patterson.js',
  'kathleen.js',
  'kelly_mint.js',
  'korina_villanueva.js',
  'kyiv_golden.js',
  'kyoto_coral.js',
  'lilac_sidebar.js',
  'lorna_alvarado.js',
  'lyon_lavender.js',
  'madrid_sun.js',
  'manhattan_noir.js',
  'marcus_vance.js',
  'mariana.js',
  'milan_blush.js',
  'montreal_frost.js',
  'ocean_block.js',
  'olivia.js',
  'ong_burgundy.js',
  'osaka_minimal.js',
  'oslo_taupe.js',
  'overlapping_badge.js',
  'oxford_burgundy.js',
  'prague_brass.js',
  'reykjavik_slate.js',
  'richard.js',
  'richard_sanchez.js',
  'sage_pastel.js',
  'san_francisco_skyline.js',
  'sanchez_dark.js',
  'sanchez_mono.js',
  'sanchez_wave.js',
  'schumacher_charcoal.js'
];

const basePath = path.join(process.cwd(), 'src/engines/utility/templates');

console.log(`Auditing ${files.length} template files:`);
const results = [];

for (const file of files) {
  const fullPath = path.join(basePath, file);
  if (!fs.existsSync(fullPath)) {
    console.log('NOT FOUND:', file);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Checks
  const issues = [];
  
  // 1. Mock fallbacks
  const mockFallbacks = content.match(/\|\|\s*['"`](Candidate Name|Howard Ong|Isabel Mercado|Isabel Schumacher|Jonathan Patterson|Kelly Blackwell|Korina Villanueva|Lorna Alvarado|Marcus Vance|Richard Sanchez|Jonathan Doe|John Doe|Jane Doe|Product Designer|Senior Developer|Software Engineer|Marketing Manager)[^'"`]*['"`]/g);
  if (mockFallbacks) {
    issues.push(`Mock Fallbacks (${mockFallbacks.length}): ${mockFallbacks.slice(0, 3).join(', ')}`);
  }
  
  // 2. Duplicate data-df-field
  const dupFields = content.match(/data-df-field="[^"]+"[^>]*data-df-field=/g);
  if (dupFields) {
    issues.push(`Duplicate data-df-field tags (${dupFields.length})`);
  }
  
  // 3. Avatar mask check
  const hasImg = /<img\s+[^>]*class="[^"]*avatar[^"]*"|<img\s+[^>]*src=/i.test(content);
  const hasAvatarMask = /avatar-mask/.test(content);
  if (hasImg && !hasAvatarMask) {
    issues.push('Missing .avatar-mask wrapping on image');
  }
  
  // 4. cv-page class
  const hasCvPage = /class="[^"]*cv-page[^"]*"/.test(content);
  if (!hasCvPage) {
    issues.push('Missing .cv-page container class');
  }
  
  // 5. Page break avoid on last child
  const hasLastChildBreak = /cv-page:last-child\s*\{\s*page-break-after:\s*avoid/i.test(content) || /page-break-after:\s*avoid/i.test(content);
  if (!hasLastChildBreak) {
    issues.push('Missing .cv-page:last-child page-break-after: avoid');
  }
  
  // 6. Check emojis / unicode glyphs
  const unicodeGlyphs = content.match(/[✦❖☀❄☼❧🌲♦]/g);
  if (unicodeGlyphs) {
    issues.push(`Unicode decorative glyphs: ${Array.from(new Set(unicodeGlyphs)).join(', ')}`);
  }
  
  // 7. Check skills data-df-field
  const hasSkillsField = /data-df-field=["']skill:\$\{idx\}["']|data-df-field=["']skill:\$\{i\}["']/.test(content);
  const hasSkillsSection = /skills/i.test(content);
  if (hasSkillsSection && !hasSkillsField) {
    issues.push('Missing data-df-field on skill items');
  }
  
  // 8. Check projects data-df-field
  const hasProjectsField = /data-df-field=["']proj:\$\{idx\}:name["']|data-df-field=["']proj:\$\{i\}:name["']/.test(content);
  const hasProjectsSection = /projects/i.test(content);
  if (hasProjectsSection && !hasProjectsField) {
    issues.push('Missing data-df-field on project items');
  }
  
  // 9. Check references data-df-field
  const hasRefsField = /data-df-field=["']ref:\$\{idx\}:name["']|data-df-field=["']ref:\$\{i\}:name["']/.test(content);
  const hasRefsSection = /references/i.test(content);
  if (hasRefsSection && !hasRefsField) {
    issues.push('Missing data-df-field on reference items');
  }
  
  // 10. Check custom sections data-df-field
  const hasCustomField = /custom:\$\{cs/i.test(content);
  const hasCustomSection = /customSections/i.test(content);
  if (hasCustomSection && !hasCustomField) {
    issues.push('Missing data-df-field on custom sections');
  }

  // 11. Check unconstrained contact section
  const hasUnconstrainedContact = /<h3>Contact<\/h3>|<h2[^>]*>Contact<\/h2>/i.test(content) && !/hasContact|data\.phone\s*\|\|\s*data\.email/.test(content);
  if (hasUnconstrainedContact) {
    issues.push('Potential unconstrained Contact header on empty payload');
  }

  results.push({ file, issues, size: content.length });
}

console.log('\nAudit Summary:');
for (const r of results) {
  console.log(`\n📄 ${r.file} (${r.size} bytes):`);
  if (r.issues.length === 0) {
    console.log('   ✅ Fully compliant!');
  } else {
    r.issues.forEach(iss => console.log(`   ❌ ${iss}`));
  }
}
