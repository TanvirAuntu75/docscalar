import fs from 'fs';
import path from 'path';

const files = [
  'adam_fletcher.js', 'adeline_palmerston.js', 'adora_diagonal.js', 'adora_montminy.js',
  'alfredo_torres.js', 'alvarado_slate.js', 'amsterdam_orange.js', 'arthur_pendelton.js',
  'austin_amber.js', 'barcelona_cyan.js', 'berlin_two_tone.js', 'bordeaux_wine.js',
  'boston_crimson.js', 'buenos_aires_tango.js', 'cairo_gold.js', 'cambridge_rose.js',
  'cape_town_sunset.js', 'card_matrix.js', 'charles.js', 'copenhagen_sand.js',
  'date_capsule.js', 'diagonal_wedge.js', 'donna_stroupe.js', 'dublin_forest.js',
  'edinburgh_navy.js', 'emerald_prestige.js', 'emma.js', 'floating_card_matrix.js',
  'florence_terracotta.js', 'geneva_charcoal.js', 'helsinki_frost.js', 'helsinki_navy.js',
  'howard_ong.js', 'isabel_mercado.js'
];

for (const f of files) {
  const p = path.join('./src/engines/utility/templates', f);
  const content = fs.readFileSync(p, 'utf8');
  
  console.log(`\n================== ${f} ==================`);
  // Check exports
  const funcMatch = content.match(/export function (\w+)\s*\(([^)]*)\)/);
  if (funcMatch) {
    console.log(`Function: ${funcMatch[1]}(${funcMatch[2].trim().replace(/\s+/g, ' ')})`);
  }
  
  // Check for lines with || '...' or || "..."
  const orMatches = content.match(/(?:data\.\w+|nameParts\[\d+\])\s*\|\|\s*['"][^'"]+['"]/g);
  if (orMatches) {
    console.log('Fallbacks found:', orMatches.slice(0, 10));
  }
  
  // Check for sections present
  const hasProjects = content.includes('data.projects') || content.includes('projects') || content.includes('proj:');
  const hasReferences = content.includes('data.references') || content.includes('references') || content.includes('ref:');
  const hasCustom = content.includes('customSections') || content.includes('custom_') || content.includes('custom:');
  const hasSkills = content.includes('data.skills') || content.includes('skills');
  const hasCerts = content.includes('data.certifications') || content.includes('certifications') || content.includes('cert:');
  
  console.log(`Sections -> Skills: ${hasSkills}, Proj: ${hasProjects}, Ref: ${hasReferences}, Custom: ${hasCustom}, Certs: ${hasCerts}`);
}
