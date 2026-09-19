import fs from 'fs';

const results = JSON.parse(fs.readFileSync('.agents/explorer_survey_2/section_titles_audit.json', 'utf-8'));
const sections = ['experience', 'education', 'skills', 'summary', 'projects', 'certifications', 'references'];

const stats = {};
sections.forEach(s => {
  stats[s] = {
    missingField: 0,
    missingDynamicTitle: 0,
    missingFieldTemplates: [],
    missingDynamicTitleTemplates: []
  };
});

for (const r of results) {
  for (const s of sections) {
    if (!r.sections[s].hasField) {
      stats[s].missingField++;
      stats[s].missingFieldTemplates.push(r.templateKey);
    }
    if (!r.sections[s].hasDynamicTitle) {
      stats[s].missingDynamicTitle++;
      stats[s].missingDynamicTitleTemplates.push(r.templateKey);
    }
  }
}

console.log('Section Heading Audit Stats:');
console.log(JSON.stringify(stats, null, 2));
