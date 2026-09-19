import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

const headingAnalysis = [];

for (const file of templateFiles) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const templateKey = file.replace('.js', '');

  const lines = content.split('\n');
  const headings = [];

  lines.forEach((line, idx) => {
    if (line.includes('data-df-field="heading:')) {
      const fieldMatch = line.match(/data-df-field="heading:([^"]+)"/);
      const tagMatch = line.match(/<([a-z0-9]+)/i);
      const classMatch = line.match(/class="([^"]*)"/i);
      
      headings.push({
        lineNum: idx + 1,
        sectionKey: fieldMatch ? fieldMatch[1] : 'unknown',
        tag: tagMatch ? tagMatch[1] : 'unknown',
        className: classMatch ? classMatch[1] : 'NONE',
        line: line.trim()
      });
    }
  });

  headingAnalysis.push({
    file,
    templateKey,
    headingCount: headings.length,
    headings
  });
}

fs.writeFileSync('.agents/explorer_survey_2/all_headings_analysis.json', JSON.stringify(headingAnalysis, null, 2));

// Aggregate tag and class occurrences
const classCounts = {};
headingAnalysis.forEach(t => {
  t.headings.forEach(h => {
    const key = `<${h.tag}> .${h.className}`;
    classCounts[key] = (classCounts[key] || 0) + 1;
  });
});

console.log('Heading Tag & Class Distribution across all templates:');
console.log(JSON.stringify(classCounts, null, 2));
