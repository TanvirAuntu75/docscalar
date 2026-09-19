import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const emptyData = {
  name: '',
  title: '',
  phone: '',
  email: '',
  location: '',
  website: '',
  linkedin: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  references: [],
  customSections: []
};

// Known mock names / strings that shouldn't appear
const mockNamePatterns = [
  'Adeline Palmerston', 'Adam Fletcher', 'Adora Montminy', 'Alfredo Torres',
  'Arthur Pendelton', 'Clara Oswald', 'Charles Rodriguez', 'Donna Stroupe',
  'David Berlin', 'Elena Rostova', 'Emma Sinclair', 'Genevieve Bordeaux',
  'Howard Ong', 'Henri Laurent', 'Isabel Schumacher', 'Isabel Mercado',
  'Jonathan Brewer', 'Jonathan Patterson', 'Kathleen Jenkins', 'Kelly Blackwell',
  'Korina Villanueva', 'Layla Schumacher', 'Lorna Alvarado', 'Marcus Vance',
  'Marcus Wilson', 'Mariana Anderson', 'Mateo Sanchez', 'Olivia Sterling',
  'Richard Sanchez', 'Richard Fowler', 'Sebastian Bennett', 'Yuki Sanchez',
  'Candidate Name', 'Your Name', 'John Doe', 'Jane Doe', 'Really Great Site',
  'hello@reallygreatsite.com', '123 Anywhere St.', '+123-456-7890'
];

console.log(`Checking ${files.length} templates for mock data resurrection on empty payload...`);

let pollutedCount = 0;
const results = [];

for (const file of files) {
  try {
    const fileUrl = pathToFileURL(path.join(templatesDir, file)).href;
    const mod = await import(fileUrl);
    const fnName = Object.keys(mod).find(k => k.startsWith('generate'));
    const fn = mod[fnName] || mod.default;
    
    const html = fn(emptyData);
    
    const detectedPollution = [];
    for (const pattern of mockNamePatterns) {
      if (html.toLowerCase().includes(pattern.toLowerCase())) {
        detectedPollution.push(pattern);
      }
    }
    
    if (detectedPollution.length > 0) {
      pollutedCount++;
      results.push({ file, detectedPollution });
    }
  } catch (err) {
    console.error(`Error in ${file}:`, err.message);
  }
}

console.log(`\nPolluted Templates: ${pollutedCount} / ${files.length}`);
results.forEach(r => {
  console.log(`- ${r.file}: found [${r.detectedPollution.join(', ')}]`);
});

fs.writeFileSync('.agents/explorer_0_3/pollution_results.json', JSON.stringify(results, null, 2));
