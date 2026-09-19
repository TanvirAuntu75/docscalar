import fs from 'fs';
import path from 'path';

const templatesDir = 'src/engines/utility/templates';
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const templateArchetypes = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const usesPartition = content.includes('computeTwoPagePartition');
  const hasPage2 = content.includes('page-2') || content.includes('cv-page-white') || content.includes('hasPage2');
  const numPages = (content.match(/class=["'][^"']*cv-page[^"']*["']/g) || []).length;
  
  // Extract all literal strings that might be mock data
  const sampleDataRegex = /(?:name|title|company|role|school|degree|summary|profile|about|description|highlights)\s*[:=]\s*(['"`][^'"`]{3,}['"`])/g;
  const mockLiterals = [];
  let m;
  while ((m = sampleDataRegex.exec(content)) !== null) {
    if (!m[1].includes('#') && !m[1].includes('px') && !m[1].includes('rgb') && !m[1].includes('var(') && !m[1].includes('solid') && !m[1].includes('sans-serif') && !m[1].includes('display') && !m[1].includes('none')) {
      mockLiterals.push(m[0]);
    }
  }

  // Check how `data` is destructured or accessed
  const dataAccesses = [];
  const daRegex = /data\.([a-zA-Z0-9_]+)/g;
  while ((m = daRegex.exec(content)) !== null) {
    dataAccesses.push(m[1]);
  }
  const uniqueDataAccess = [...new Set(dataAccesses)];

  // Check if there are default parameters
  const fnMatch = content.match(/export\s+function\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/);
  const fnHeader = fnMatch ? fnMatch[0] : '';

  // Check avatar markup
  const avatarSnippet = (content.match(/<img[^>]*avatar[^>]*>/i) || [''])[0];
  const avatarContainer = (content.match(/<(?:div|span)[^>]*avatar[^>]*>[\s\S]{0,200}<\/img>/i) || [''])[0];

  templateArchetypes.push({
    file,
    fnName: fnMatch ? fnMatch[1] : 'unknown',
    fnHeader: fnHeader.replace(/\n\s*/g, ' '),
    usesPartition,
    hasPage2,
    numPages,
    uniqueDataAccess,
    mockLiteralsCount: mockLiterals.length,
    mockLiteralsSample: mockLiterals.slice(0, 10),
    avatarSnippet,
    lineCount: content.split('\n').length
  });
}

fs.writeFileSync('.agents/explorer_0_2/template_archetypes.json', JSON.stringify(templateArchetypes, null, 2));
console.log('Archetypes analyzed. Sample output:');
console.log(templateArchetypes.slice(0, 5));
