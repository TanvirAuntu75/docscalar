import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

const results = [];

for (const file of templateFiles) {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  const templateKey = file.replace('.js', '');

  const hasSectionTitles = content.includes('sectionTitles') || content.includes('safeData.sectionTitles');
  
  // Check headings for standard sections
  const sections = ['experience', 'education', 'skills', 'summary', 'projects', 'certifications', 'references'];
  const sectionReport = {};

  for (const s of sections) {
    const headingField = `data-df-field="heading:${s}"`;
    const hasField = content.includes(headingField);
    const hasDynamicTitle = content.includes(`sectionTitles?.${s}`) || content.includes(`sectionTitles?.[${s}]`) || content.includes(`sectionTitles?.['${s}']`);
    sectionReport[s] = { hasField, hasDynamicTitle };
  }

  results.push({
    file,
    templateKey,
    hasSectionTitles,
    sections: sectionReport
  });
}

fs.writeFileSync('.agents/explorer_survey_2/section_titles_audit.json', JSON.stringify(results, null, 2));

const missingSectionTitles = results.filter(r => !r.hasSectionTitles);
console.log(`Templates without any sectionTitles support: ${missingSectionTitles.length}`);
console.log('List of templates without sectionTitles:', missingSectionTitles.map(r => r.templateKey));
