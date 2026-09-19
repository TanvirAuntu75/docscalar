import fs from 'fs';
import path from 'path';

const batch5Files = [
  'seattle_emerald.js',
  'sebastian_bennett.js',
  'seoul_neon.js',
  'singapore_ruby.js',
  'split_dual_block.js',
  'stockholm_monochrome.js',
  'stockholm_yellow.js',
  'terracotta_arch.js',
  'tokyo_ice_blue.js',
  'vancouver_pine.js',
  'venice_sand_split.js',
  'vienna_crest.js',
  'violet_modern.js',
  'wilson_light.js',
  'wilson_minimal.js',
  'ziv_olive.js',
  'zurich_slate_block.js'
];

console.log(`Analyzing Batch 5 files (${batch5Files.length} files)...`);

for (let i = 0; i < batch5Files.length; i++) {
  const f = batch5Files[i];
  const p = path.join('./src/engines/utility/templates', f);
  if (!fs.existsSync(p)) {
    console.log(`[${i+69}] MISSING: ${f}`);
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const funcMatch = content.match(/export function (\w+)/);
  const funcName = funcMatch ? funcMatch[1] : 'UNKNOWN';
  
  const hasCvPage = content.includes('.cv-page') || content.includes('class="cv-page');
  const hasLastChild = content.includes(':last-child');
  const tagCount = (content.match(/data-df-field/g) || []).length;
  const duplicateTags = (content.match(/data-df-field="[^"]+"\s+data-df-field="/g) || []).length;
  
  // Check for persona / mock strings
  const mocks = [
    'Candidate Name', 'Sebastian Bennett', 'Adeline Palmerston', 'Richard Sanchez',
    'Adam Fletcher', 'Donna Stroupe', 'Howard Ong', 'Isabel Mercado', 'John Doe'
  ];
  const foundMocks = mocks.filter(m => content.includes(`'${m}'`) || content.includes(`"${m}"`));
  
  // Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2728}\u{2744}\u{2600}\u{2726}\u{2756}\u{2666}\u{2767}\u{1F332}]/u;
  const hasEmoji = emojiRegex.test(content);

  // Check avatar mask
  const hasPhoto = content.includes('photoUrl') || content.includes('photoSrc');
  const hasAvatarMask = content.includes('avatar-mask');

  console.log(`[${i+69}] ${f.padEnd(25)} | Func: ${funcName.padEnd(30)} | cv-page: ${hasCvPage} | :last-child: ${hasLastChild} | df-tags: ${tagCount} | dupes: ${duplicateTags} | mocks: ${foundMocks.join(',') || 'none'} | emoji: ${hasEmoji} | avatarMask: ${hasAvatarMask}`);
}
