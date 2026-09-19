import fs from 'fs';
import path from 'path';

const entries = JSON.parse(fs.readFileSync('.agents/explorer_survey_2/all_89_template_map_entries.json', 'utf-8'));

console.log('Total entries:', entries.length);

// Let's inspect each entry
const personas = entries.map((e, idx) => ({
  index: idx + 1,
  key: e.key,
  label: e.label,
  candidateName: e.candidateName,
  badge: e.badge,
  atsTier: e.atsTier,
  atsRating: e.atsRating
}));

fs.writeFileSync('.agents/explorer_survey_2/all_89_personas.json', JSON.stringify(personas, null, 2));
console.log('Saved personas catalog.');
