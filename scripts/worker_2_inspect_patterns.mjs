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

  // 1. Check contactHtml declaration
  const contactDecl = content.match(/const contactHtml = ([\s\S]*?);/);
  console.log(`\n=== ${file} ===`);
  if (contactDecl) {
    console.log(`ContactHtml length: ${contactDecl[1].length}, has "hasContact": ${content.includes('hasContact')}`);
  }

  // 2. Check avatar element
  const avatarMatches = content.match(/<div class=["'](avatar[^"']*)["']>\s*([\s\S]*?)<\/div>/g);
  if (avatarMatches) {
    console.log(`Avatar elements: ${avatarMatches.join(' | ')}`);
  }

  // 3. Check skills rendering
  const skillMatches = content.match(/<div class=["']skill[^"']*["']>([\s\S]*?)<\/div>/g);
  if (skillMatches && skillMatches.length) {
    console.log(`Skill elements (first 1): ${skillMatches[0]}`);
  }
}
