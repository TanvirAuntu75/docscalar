import fs from 'fs';
import path from 'path';

const entries = JSON.parse(fs.readFileSync('.agents/explorer_survey_2/all_89_template_map_entries.json', 'utf-8'));
const templatesDir = path.resolve('src/engines/utility/templates');

for (const entry of entries) {
  const filePath = path.join(templatesDir, `${entry.key}.js`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Look for fallback title in code like `safeData.title || '...'`
    const fallbackMatch = content.match(/safeData\.title\s*\|\|\s*['"`]([^'"`]+)['"`]/);
    entry.fileFallbackTitle = fallbackMatch ? fallbackMatch[1] : null;

    // Look for title or profession hints in comments or header
    const first50Lines = content.split('\n').slice(0, 50).join('\n');
    const roleMatches = first50Lines.match(/(?:role|profession|title|position|Specialist|Manager|Director|Engineer|Architect|Lead|Executive|Consultant|Analyst|Designer|Fellow|Officer|Scientist|Strategist)[^\n,]*/gi) || [];
    entry.headerHints = roleMatches.slice(0, 3);
  } else {
    entry.fileMissing = true;
  }
}

fs.writeFileSync('.agents/explorer_survey_2/persona_title_audit.json', JSON.stringify(entries, null, 2));
console.log('Audited fallback titles across all 89 templates.');
