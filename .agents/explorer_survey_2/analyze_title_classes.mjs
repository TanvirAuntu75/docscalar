import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

const titleClassMap = [];

for (const file of templateFiles) {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  const templateKey = file.replace('.js', '');

  // Find data-df-field="title" line
  const lines = content.split('\n');
  let titleLine = '';
  lines.forEach(l => {
    if (l.includes('data-df-field="title"')) titleLine = l.trim();
  });

  const tagMatch = titleLine.match(/<([a-z0-9]+)/i);
  const classMatch = titleLine.match(/class="([^"]*)"/i);

  titleClassMap.push({
    templateKey,
    file,
    tag: tagMatch ? tagMatch[1] : 'div',
    existingClass: classMatch ? classMatch[1] : '',
    titleLine
  });
}

fs.writeFileSync('.agents/explorer_survey_2/title_class_map.json', JSON.stringify(titleClassMap, null, 2));

const uniqueClasses = {};
titleClassMap.forEach(t => {
  uniqueClasses[t.existingClass] = (uniqueClasses[t.existingClass] || 0) + 1;
});

console.log('Title Class Distribution across 89 templates:');
console.log(JSON.stringify(uniqueClasses, null, 2));
