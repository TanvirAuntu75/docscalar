import fs from 'fs';
import path from 'path';

// Let's parse templateRegistry.js
const regContent = fs.readFileSync('src/engines/utility/templateRegistry.js', 'utf-8');

// Extract TEMPLATE_MAP entries
const mapMatch = regContent.match(/export const TEMPLATE_MAP = \{([\s\S]*?)\n\};/);
if (!mapMatch) {
  console.error('Could not find TEMPLATE_MAP');
  process.exit(1);
}

const mapBody = mapMatch[1];
const entryRegex = /^\s*([a-z0-9_]+)\s*:\s*\{([^}]+)\}/gm;
let m;
const entries = [];

while ((m = entryRegex.exec(mapBody)) !== null) {
  const key = m[1];
  const propsStr = m[2];
  
  const getProp = (name) => {
    const p = propsStr.match(new RegExp(`${name}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|([^,]*))`));
    return p ? (p[1] || p[2] || p[3] || '').trim() : '';
  };

  entries.push({
    key,
    label: getProp('label'),
    candidateName: getProp('candidateName'),
    badge: getProp('badge'),
    atsTier: getProp('atsTier'),
    atsRating: getProp('atsRating'),
    photoUrl: getProp('photoUrl'),
    candidateTitle: getProp('candidateTitle')
  });
}

console.log(`Found ${entries.length} entries in TEMPLATE_MAP`);

fs.writeFileSync('.agents/explorer_survey_2/all_89_template_map_entries.json', JSON.stringify(entries, null, 2));
