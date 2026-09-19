import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const results = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const templateKey = file.replace('.js', '');

  // Extract the title snippet around data-df-field="title"
  const lines = content.split('\n');
  let titleSnippet = '';
  lines.forEach((l, idx) => {
    if (l.includes('data-df-field="title"')) {
      // Get context of 3 lines before and after
      const start = Math.max(0, idx - 2);
      const end = Math.min(lines.length - 1, idx + 2);
      titleSnippet = lines.slice(start, end + 1).map((x, i) => `${start + i + 1}: ${x}`).join('\n');
    }
  });

  results.push({
    file,
    templateKey,
    hasDataDfFieldTitle: content.includes('data-df-field="title"'),
    titleSnippet
  });
}

fs.writeFileSync('.agents/explorer_survey_2/title_snippets.json', JSON.stringify(results, null, 2));
console.log('Saved title snippets for all', results.length, 'templates');
