
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
