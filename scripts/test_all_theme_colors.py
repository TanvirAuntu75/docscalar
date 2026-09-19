import subprocess
import os

def test_theme_colors_node():
    test_js = """
import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';

const defaultData = {
  name: 'MARCUS STERLING',
  title: 'Senior Marketing Director',
  phone: '+1 (555) 234-5678',
  email: 'marcus.sterling@enterprise.io',
  location: 'San Francisco, CA',
  website: 'sterlinggrowth.io',
  linkedin: 'linkedin.com/in/marcussterling',
  summary: 'Accomplished executive with 8+ years leading cross-functional teams.',
  skills: ['Strategic Planning', 'P&L Optimization', 'Revenue Operations'],
  experience: [
    {
      role: 'Director of Growth Marketing',
      company: 'Apex Cloud Solutions • San Francisco, CA',
      date: '2022 – PRESENT',
      highlights: ['Scaled ARR from $12M to $29M within 24 months.']
    }
  ],
  education: [
    { degree: 'Master of Business Administration (MBA)', school: 'Stanford University', date: '2016 – 2018' }
  ]
};

const templatesDir = './src/engines/utility/templates';
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

console.log(`Testing ${files.length} templates across 3 color modes (default, bronze #a97d5d, teal #0d9488)...`);

let pass = 0;
for (const file of files) {
  const filePath = path.resolve(templatesDir, file);
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl);
  const fnName = Object.keys(mod).find(k => k.startsWith('generate'));
  const fn = mod[fnName] || mod.default;

  if (typeof fn !== 'function') {
    console.error(`[FAIL] ${file}: no generator function found`);
    process.exit(1);
  }

  // 1. Default mode
  const htmlDef = fn(defaultData, 'default');
  if (!htmlDef || htmlDef.length < 500) {
    console.error(`[FAIL] ${file}: default render too short (${htmlDef ? htmlDef.length : 0} bytes)`);
    process.exit(1);
  }

  // 2. Bronze mode
  const htmlBronze = fn(defaultData, '#a97d5d');
  if (!htmlBronze || htmlBronze.length < 500) {
    console.error(`[FAIL] ${file}: bronze render too short`);
    process.exit(1);
  }

  // 3. Teal mode
  const htmlTeal = fn(defaultData, '#0d9488');
  if (!htmlTeal || htmlTeal.length < 500) {
    console.error(`[FAIL] ${file}: teal render too short`);
    process.exit(1);
  }

  pass++;
}

console.log(`[SUCCESS] All ${pass}/${files.length} template engines verified across all theme color modes!`);
"""
    with open('scripts/test_theme_modes.mjs', 'w', encoding='utf-8') as f:
        f.write(test_js)
        
    res = subprocess.run(['node', 'scripts/test_theme_modes.mjs'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(res.stdout)
    if res.returncode != 0:
        print("ERROR:", res.stderr)
        raise RuntimeError("Theme mode verification failed")

if __name__ == '__main__':
    test_theme_colors_node()
