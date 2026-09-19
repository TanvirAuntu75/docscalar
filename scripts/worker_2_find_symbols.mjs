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
  const code = fs.readFileSync(filePath, 'utf-8');
  const matches = code.match(/[✦☼❧★☆◆◇■□▲▼]/g);
  if (matches) {
    console.log(`${file}: found symbols: ${[...new Set(matches)].join(' ')}`);
  }
}
