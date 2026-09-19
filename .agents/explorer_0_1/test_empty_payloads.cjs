const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const rootDir = path.resolve('.');
const templatesDir = path.join(rootDir, 'src', 'engines', 'utility', 'templates');

async function run() {
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

  const emptyData = {
    name: '',
    title: '',
    photoUrl: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    references: [],
    customSections: []
  };

  const results = [];

  for (const file of files) {
    const slug = file.replace('.js', '');
    const moduleUrl = pathToFileURL(path.join(templatesDir, file)).href;
    const mod = await import(moduleUrl);
    
    // Find the exported function
    const fnKey = Object.keys(mod).find(k => k.startsWith('generate'));
    const fn = mod[fnKey];
    
    if (!fn) {
      results.push({ slug, file, error: 'NO_EXPORTED_FUNCTION' });
      continue;
    }

    try {
      const html = fn(emptyData);
      
      // Check for mock strings that might have resurrected
      const suspiciousStrings = [
        'Adam Fletcher', 'Adeline Palmerston', 'Mariana Anderson', 'Olivia Sterling', 'Jonathan Brewer',
        'Emma Sinclair', 'Charles Rodriguez', 'Kathleen Jenkins', 'Richard Fowler', 'Mateo Sanchez',
        'Marcus Wilson', 'Yuki Sanchez', 'Mei Sanchez', 'David Howard', 'Layla Schumacher',
        'Alex Mercer', 'Catrine Olive', 'Adora Sharma', 'Lorna Alvarado', 'Mariana Wilson',
        'Jason Vance', 'Lorna Slate', 'Kelly Blackwell', 'Donna Stroupe', 'Elena Rostova',
        'David Berlin', 'Claire Laurent', 'Chloe Bennett', 'Isabel Schumacher', 'Julian Hayes',
        'Henri Laurent', 'Clara Cambridge', 'Astrid Lindqvist', 'Howard Ong', 'Genevieve Bordeaux',
        'Kenji Takahashi', 'Dr. Stefan Weber', 'Stefan Weber', 'Freja Lind', 'Harper Montgomery', 'Hana Tanaka',
        'Alexander Vance', 'Dominik Weber', 'Javier Gomez', 'Korina Villanueva', 'Alessandra Rossi',
        'Ciara O’Connor', 'Ciara O\'Connor', 'Elias Lindqvist', 'Prof. Lawrence Sterling', 'Lawrence Sterling',
        'Isabel Mercado', 'Camille Beaulieu', 'Matteo Moretti', 'Signe Møller', 'Signe Moller',
        'Wyatt Sterling', 'Jonathan Patterson', 'Alistair MacLeod', 'Ji-hoon Park', 'Oksana Kovalenko',
        'Derrick Chen', 'Alfredo Torres', 'Harrison Ford', 'Tarek Mansour', 'Carlos Vega', 'Ren Sato',
        'Marcus Vance', 'Jordan Hayes', 'Gianna Bellini', 'Lars van der Meer', 'Frederik Lind',
        'Arthur Pendelton', 'Václav Dvořák', 'Vaclav Dvorak', 'Arthur Vance', 'Astrid Jónsdóttir',
        'Astrid Jonsdottir', 'Valentina Soler', 'Liam MacIntyre', 'Amélie Laurent', 'Amelie Laurent',
        'Noah Vance', 'Thabo Ndlovu', 'Matti Virtanen', 'Richard Sanchez', 'Sebastian Bennett',
        'Clara Oswald', 'Marcus Sterling', 'Evelyn St. Claire', 'Alexander Hayes',
        'reallygreatsite.com', '123-456-7890', 'Borcelle', 'Pixel Point', 'Wardiere',
        'Studio Shodwe', 'GDM Co', 'Larana', 'Fauget', 'Ingoude', 'hello@', 'Candidate Name'
      ];

      const foundSuspicious = suspiciousStrings.filter(s => html.includes(s));

      // Check if html has data-df-field tags
      const dfCount = (html.match(/data-df-field/g) || []).length;

      // Check if html contains pagination/discrete pages
      const pageCount = (html.match(/class="[^"]*cv-page/g) || []).length;

      results.push({
        slug,
        file,
        fnKey,
        rendersSuccessfully: true,
        htmlLength: html.length,
        foundSuspicious,
        dfCount,
        pageCount
      });
    } catch (err) {
      results.push({
        slug,
        file,
        fnKey,
        rendersSuccessfully: false,
        error: err.message
      });
    }
  }

  fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'empty_payload_audit.json'), JSON.stringify(results, null, 2));
  console.log('Empty payload audit complete for all ' + results.length + ' templates.');
  
  const failedRenders = results.filter(r => !r.rendersSuccessfully);
  console.log('Failed renders count:', failedRenders.length);

  const polluted = results.filter(r => r.foundSuspicious && r.foundSuspicious.length > 0);
  console.log('Templates with mock data on empty payload:', polluted.length);
  console.log('Polluted templates count by string:');
  const mockOccurrences = {};
  polluted.forEach(p => {
    p.foundSuspicious.forEach(s => {
      mockOccurrences[s] = (mockOccurrences[s] || 0) + 1;
    });
  });
  console.log(mockOccurrences);
}

run();
