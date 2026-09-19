import fs from 'fs';
import path from 'path';

const files = [
  'adam_fletcher.js', 'adeline_palmerston.js', 'adora_diagonal.js', 'adora_montminy.js',
  'alfredo_torres.js', 'alvarado_slate.js', 'amsterdam_orange.js', 'arthur_pendelton.js',
  'austin_amber.js', 'barcelona_cyan.js', 'berlin_two_tone.js', 'bordeaux_wine.js',
  'boston_crimson.js', 'buenos_aires_tango.js', 'cairo_gold.js', 'cambridge_rose.js',
  'cape_town_sunset.js', 'card_matrix.js', 'charles.js', 'copenhagen_sand.js',
  'date_capsule.js', 'diagonal_wedge.js', 'donna_stroupe.js', 'dublin_forest.js',
  'edinburgh_navy.js', 'emerald_prestige.js', 'emma.js', 'floating_card_matrix.js',
  'florence_terracotta.js', 'geneva_charcoal.js', 'helsinki_frost.js', 'helsinki_navy.js',
  'howard_ong.js', 'isabel_mercado.js'
];

console.log(`Analyzing ${files.length} templates in Batch 1 & 2...`);

for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const p = path.join('./src/engines/utility/templates', f);
  if (!fs.existsSync(p)) {
    console.log(`[${i+1}] MISSING: ${f}`);
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const funcMatch = content.match(/export function (\w+)/);
  const funcName = funcMatch ? funcMatch[1] : 'UNKNOWN';
  
  const hasCvPage = content.includes('.cv-page') || content.includes('cv-page');
  const hasLastChild = content.includes(':last-child');
  const tagCount = (content.match(/data-df-field/g) || []).length;
  const duplicateTags = (content.match(/data-df-field="[^"]+"\s+data-df-field="/g) || []).length;
  
  // Check for persona / mock strings
  const mocks = [
    'Adam Fletcher', 'Adeline Palmerston', 'Alfredo Torres', 'Arthur Pendelton', 
    'Donna Stroupe', 'Candidate Name', 'Howard Ong', 'Isabel Mercado', 
    'Adora Montminy', 'Adora Diagonal'
  ];
  const foundMocks = mocks.filter(m => content.includes(`'${m}'`) || content.includes(`"${m}"`));
  
  // Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2728}\u{2744}\u{2600}\u{2726}\u{2756}\u{2666}\u{2767}\u{1F332}]/u;
  const hasEmoji = emojiRegex.test(content);

  // Check avatar mask
  const hasPhoto = content.includes('photoUrl') || content.includes('photoSrc');
  const hasAvatarMask = content.includes('avatar-mask');

  console.log(`[${i+1}] ${f.padEnd(25)} | Func: ${funcName.padEnd(28)} | cv-page: ${hasCvPage} | :last-child: ${hasLastChild} | df-tags: ${tagCount} | dupes: ${duplicateTags} | mocks: ${foundMocks.join(',') || 'none'} | emoji: ${hasEmoji} | avatarMask: ${hasAvatarMask}`);
}
