import fs from 'fs';
import path from 'path';

const files = [
  'adam_fletcher.js', 'adeline_palmerston.js', 'alfredo_torres.js', 'amsterdam_modern.js',
  'arthur_pendelton.js', 'austin_creative.js', 'barcelona_minimal.js', 'berlin_two_tone.js',
  'bold_geometric.js', 'bold_navy.js', 'cambridge_academic.js', 'charlotte_baker.js',
  'chicago_split.js', 'classic_corporate.js', 'classic_serif.js', 'clean_corporate.js',
  'clean_modern.js', 'corporate_clean.js', 'creative_designer.js', 'creative_infographic.js',
  'dark_mode_developer.js', 'denver_startup.js', 'diagonal_wedge.js', 'donna_stroupe.js',
  'dubai_luxury.js', 'dublin_compact.js', 'editorial_vogue.js', 'executive_brief.js',
  'executive_classic.js', 'executive_navy.js', 'executive_pro.js', 'formal_traditional.js',
  'frontier_tech.js', 'geneva_corporate.js'
];

console.log(`Analyzing ${files.length} templates...`);

for (const f of files) {
  const p = path.join('./src/engines/utility/templates', f);
  if (!fs.existsSync(p)) {
    console.log('MISSING:', f);
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const funcMatch = content.match(/export function (\w+)/);
  const funcName = funcMatch ? funcMatch[1] : 'UNKNOWN';
  
  // Checks
  const hasComputePartition = content.includes('computeTwoPagePartition');
  const hasCvPage = content.includes('.cv-page') || content.includes('cv-page');
  const hasLastChild = content.includes(':last-child');
  const tagCount = (content.match(/data-df-field/g) || []).length;
  const duplicateTags = (content.match(/data-df-field="[^"]+"\s+data-df-field="/g) || []).length;
  
  // Persona checks
  const mockNames = ['Adam Fletcher', 'Adeline Palmerston', 'Alfredo Torres', 'Arthur Pendelton', 'Donna Stroupe', 'Candidate Name', 'Kelly Blackwell', 'Jonathan Patterson'];
  const foundMocks = mockNames.filter(m => content.includes(`'${m}'`) || content.includes(`"${m}"`));
  
  // Avatar checks
  const hasAvatar = content.includes('photoUrl') || content.includes('photoSrc') || content.includes('avatar') || content.includes('profile-photo');
  const hasAvatarMask = content.includes('avatar-mask');
  
  console.log(`${f.padEnd(25)} | Func: ${funcName.padEnd(28)} | cv-page: ${hasCvPage} | :last-child: ${hasLastChild} | df-tags: ${tagCount} | dupes: ${duplicateTags} | mocks: ${foundMocks.join(',')} | mask: ${hasAvatarMask}`);
}
