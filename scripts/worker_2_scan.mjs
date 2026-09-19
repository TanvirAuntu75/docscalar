import fs from 'fs';
import path from 'path';

const files = [
  'global_executive.js',
  'helsinki_nordic.js',
  'hongkong_finance.js',
  'howard_ong.js',
  'infographic_bold.js',
  'isabel_mercado.js',
  'isabel_schumacher.js',
  'jonathan_patterson.js',
  'jonathan.js',
  'kelly_mint.js',
  'korina_villanueva.js',
  'kyoto_zen.js',
  'london_executive.js',
  'lorna_alvarado.js',
  'madrid_warm.js',
  'marcus_vance.js',
  'mariana.js',
  'milan_fashion.js',
  'minimal_clean.js',
  'minimal_line.js',
  'minimal_mono.js',
  'modern_accent.js',
  'modern_clean.js',
  'modern_dark.js',
  'modern_developer.js',
  'modern_executive.js',
  'modern_grid.js',
  'modern_minimal.js',
  'modern_professional.js',
  'modern_split.js',
  'modern_tech.js',
  'montreal_bilingual.js',
  'mumbai_tech.js',
  'munich_engineering.js'
];

const basePath = path.join(process.cwd(), 'src/engines/utility/templates');

console.log('Scanning 34 files in Batch 3 & 4:');
for (const file of files) {
  const fullPath = path.join(basePath, file);
  if (!fs.existsSync(fullPath)) {
    console.log('MISSING:', file);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasDupAttrs = /data-df-field="[^"]+"[^>]*data-df-field=/.test(content);
  const hasAvatarMask = /avatar-mask/.test(content);
  const hasCvPage = /class="[^"]*cv-page[^"]*"/.test(content);
  const hasLastChildBreak = /cv-page:last-child|page-break-after:\s*avoid/i.test(content);
  const fakeNames = ['Howard Ong', 'Isabel Mercado', 'Isabel Schumacher', 'Jonathan Patterson', 'Kelly Blackwell', 'Korina Villanueva', 'Lorna Alvarado', 'Marcus Vance', 'Candidate Name', 'Jonathan Doe', 'John Doe', 'Jane Doe'];
  const foundFakes = fakeNames.filter(f => content.includes(f));
  const expMatch = content.match(/export\s+(?:function|const)\s+([a-zA-Z0-9_]+)/g);
  
  console.log(`${file.padEnd(25)} | Size: ${content.length.toString().padStart(5)} | DupAttrs: ${hasDupAttrs ? 'YES' : ' NO'} | Mask: ${hasAvatarMask ? 'YES' : ' NO'} | cvPage: ${hasCvPage ? 'YES' : ' NO'} | LastBrk: ${hasLastChildBreak ? 'YES' : ' NO'} | Fakes: ${foundFakes.join(', ') || 'none'} | Exports: ${expMatch ? expMatch.join(', ') : 'none'}`);
}
