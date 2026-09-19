import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const emptyData = {
  name: '',
  title: '',
  phone: '',
  email: '',
  location: '',
  website: '',
  linkedin: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  references: [],
  customSections: []
};

const analysis = [];

for (const file of files) {
  const fileUrl = pathToFileURL(path.join(templatesDir, file)).href;
  const mod = await import(fileUrl);
  const fnName = Object.keys(mod).find(k => k.startsWith('generate'));
  const fn = mod[fnName] || mod.default;

  const html = fn(emptyData);

  // Check if orphan empty headers/sections are rendered
  const hasEmptyExpHeader = /<h[1-4][^>]*>\s*(?:Work\s+)?Experience\s*<\/h[1-4]>/i.test(html);
  const hasEmptyEduHeader = /<h[1-4][^>]*>\s*Education(?:\s+History)?\s*<\/h[1-4]>/i.test(html);
  const hasEmptySkillsHeader = /<h[1-4][^>]*>\s*(?:Skills|Expertise|Key Skills)\s*<\/h[1-4]>/i.test(html);
  const hasEmptyContactHeader = /<h[1-4][^>]*>\s*Contact\s*<\/h[1-4]>/i.test(html);
  const hasEmptySummaryHeader = /<h[1-4][^>]*>\s*(?:About\s+Me|Summary|Profile)\s*<\/h[1-4]>/i.test(html);

  // Check if orphan icons or labels render
  const hasOrphanPhone = html.includes('Phone') && !html.includes('+');
  const hasOrphanEmail = html.includes('Email') && !html.includes('@');

  analysis.push({
    file,
    hasEmptyExpHeader,
    hasEmptyEduHeader,
    hasEmptySkillsHeader,
    hasEmptyContactHeader,
    hasEmptySummaryHeader,
    hasOrphanPhone,
    hasOrphanEmail
  });
}

console.log(`Empty section header analysis for ${analysis.length} templates:`);
console.log(`- Templates rendering empty Experience header: ${analysis.filter(a => a.hasEmptyExpHeader).length}`);
console.log(`- Templates rendering empty Education header: ${analysis.filter(a => a.hasEmptyEduHeader).length}`);
console.log(`- Templates rendering empty Skills header: ${analysis.filter(a => a.hasEmptySkillsHeader).length}`);
console.log(`- Templates rendering empty Contact header: ${analysis.filter(a => a.hasEmptyContactHeader).length}`);
console.log(`- Templates rendering empty Summary header: ${analysis.filter(a => a.hasEmptySummaryHeader).length}`);

fs.writeFileSync('.agents/explorer_0_3/empty_header_analysis.json', JSON.stringify(analysis, null, 2));
