import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const emptyPayload = {
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

const nullPayload = {};

const richPayload = {
  name: 'Jane Doe',
  title: 'Principal Software Architect',
  photoUrl: '/images/candidates/mariana.jpg',
  email: 'jane.doe@example.com',
  phone: '+1 (555) 987-6543',
  location: 'San Francisco, CA',
  website: 'janedoe.dev',
  linkedin: 'linkedin.com/in/janedoe',
  summary: 'Seasoned architect with 12+ years of experience leading distributed systems engineering.',
  experience: [
    {
      id: 'exp1',
      company: 'Acme Corp',
      role: 'Staff Engineer',
      start: '2021',
      end: 'PRESENT',
      highlights: ['Led core platform modernization.', 'Reduced latency by 40%.']
    },
    {
      id: 'exp2',
      company: 'Beta Labs',
      role: 'Senior Engineer',
      start: '2018',
      end: '2021',
      highlights: ['Built real-time streaming pipeline.', 'Mentored 6 engineers.']
    }
  ],
  education: [
    {
      id: 'edu1',
      school: 'MIT',
      degree: 'M.S. Computer Science',
      start: '2016',
      end: '2018',
      note: 'GPA: 4.0 / 4.0'
    }
  ],
  skills: ['TypeScript', 'Node.js', 'React', 'Distributed Systems', 'PostgreSQL'],
  certifications: ['AWS Certified Solutions Architect', 'CKA Kubernetes'],
  projects: [
    {
      id: 'proj1',
      name: 'Cloud Orchestrator',
      description: 'Open source orchestration framework.',
      url: 'github.com/janedoe/orchestrator'
    }
  ],
  references: [
    {
      id: 'ref1',
      name: 'Dr. John Smith',
      relation: 'VP Engineering / Former Manager',
      phone: '+1 (555) 123-4567',
      email: 'john.smith@example.com'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [{ title: 'English', value: 'Native' }, { title: 'French', value: 'Fluent' }]
    }
  ]
};

const mockTokens = [
  'Mariana Anderson', 'Adeline Palmerston', 'Marcus Sterling', 'Olivia Sterling', 'Jonathan Brewer',
  'Adora Montminy', 'Emma Sinclair', 'Clara Oswald', 'Charles Rodriguez', 'Kathleen Jenkins',
  'Adam Fletcher', 'Richard Fowler', 'Evelyn St. Claire', 'Mateo Sanchez', 'Marcus Wilson',
  'Richard Sanchez', 'Yuki Sanchez', 'Alexander Hayes', 'Mei Sanchez', 'David Howard',
  'Sebastian Bennett', 'Layla Schumacher', 'Alex Mercer', 'Catrine Olive', 'Adora Sharma',
  'Lorna Alvarado', 'Lorna Slate', 'Mariana Wilson', 'Jason Vance', 'Kelly Blackwell',
  'Donna Stroupe', 'Elena Rostova', 'David Berlin', 'Claire Laurent', 'Chloe Bennett',
  'Isabel Schumacher', 'Julian Hayes', 'Henri Laurent', 'Clara Cambridge', 'Astrid Lindqvist',
  'Howard Ong', 'Genevieve Bordeaux', 'Kenji Takahashi', 'Dr. Stefan Weber', 'Freja Lind',
  'Harper Montgomery', 'Hana Tanaka', 'Alexander Vance', 'Dominik Weber', 'Javier Gomez',
  'Korina Villanueva', 'Alessandra Rossi', 'Ciara O’Connor', 'Elias Lindqvist', 'Prof. Lawrence Sterling',
  'Isabel Mercado', 'Camille Beaulieu', 'Matteo Moretti', 'Signe Møller', 'Wyatt Sterling',
  'Jonathan Patterson', 'Alistair MacLeod', 'Ji-hoon Park', 'Oksana Kovalenko', 'Derrick Chen',
  'Alfredo Torres', 'Harrison Ford', 'Tarek Mansour', 'Carlos Vega', 'Ren Sato',
  'Marcus Vance', 'Jordan Hayes', 'Gianna Bellini', 'Lars van der Meer', 'Frederik Lind',
  'Arthur Pendelton', 'Václav Dvořák', 'Arthur Vance', 'Astrid Jónsdóttir', 'Valentina Soler',
  'Liam MacIntyre', 'Amélie Laurent', 'Noah Vance', 'Thabo Ndlovu', 'Matti Virtanen',
  'hello@reallygreatsite.com', 'reallygreatsite.com', '123-456-7890', '+123-456-7890',
  '123 Anywhere St', 'Ginyard International', 'Borcelle Digital Media', 'Fauget Studio',
  'Borcelle University', 'Wardiere Inc', 'Candidate Name', 'Your Name',
  'Adeline', 'Palmerston', 'Mariana', 'Anderson', 'Alfredo', 'Torres', 'Arthur', 'Pendelton'
];

async function run() {
  const results = [];
  console.log(`Auditing ${files.length} template files dynamically...`);

  for (const file of files) {
    const filePath = path.join(templatesDir, file);
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const fnName = Object.keys(mod).find(k => typeof mod[k] === 'function');
    const fn = mod[fnName];

    const item = {
      file,
      fnName,
      emptyPayload: { ok: false, error: null, outputLength: 0, resurrectedMockStrings: [] },
      nullPayload: { ok: false, error: null, outputLength: 0, resurrectedMockStrings: [] },
      richPayload: { ok: false, error: null, outputLength: 0 }
    };

    // Test 1: Empty payload
    try {
      const html = fn(emptyPayload);
      item.emptyPayload.ok = true;
      item.emptyPayload.outputLength = html.length;

      for (const token of mockTokens) {
        if (html.includes(token)) {
          item.emptyPayload.resurrectedMockStrings.push(token);
        }
      }
    } catch (err) {
      item.emptyPayload.error = err.message;
    }

    // Test 2: Null payload (empty object {})
    try {
      const html = fn(nullPayload);
      item.nullPayload.ok = true;
      item.nullPayload.outputLength = html.length;

      for (const token of mockTokens) {
        if (html.includes(token)) {
          item.nullPayload.resurrectedMockStrings.push(token);
        }
      }
    } catch (err) {
      item.nullPayload.error = err.message;
    }

    // Test 3: Rich payload
    try {
      const html = fn(richPayload);
      item.richPayload.ok = true;
      item.richPayload.outputLength = html.length;
    } catch (err) {
      item.richPayload.error = err.message;
    }

    results.push(item);
  }

  fs.writeFileSync('.agents/explorer_0_2/runtime_test_results.json', JSON.stringify(results, null, 2));

  const failedEmpty = results.filter(r => !r.emptyPayload.ok);
  const failedNull = results.filter(r => !r.nullPayload.ok);
  const failedRich = results.filter(r => !r.richPayload.ok);
  const resurrectedInEmpty = results.filter(r => r.emptyPayload.resurrectedMockStrings.length > 0);
  const resurrectedInNull = results.filter(r => r.nullPayload.resurrectedMockStrings.length > 0);

  console.log(`\nRuntime Test Summary across ${results.length} templates:`);
  console.log(`Failed on emptyPayload: ${failedEmpty.length}`);
  console.log(`Failed on nullPayload: ${failedNull.length}`);
  console.log(`Failed on richPayload: ${failedRich.length}`);
  console.log(`Templates resurrecting mock strings on emptyPayload: ${resurrectedInEmpty.length} / ${results.length}`);
  console.log(`Templates resurrecting mock strings on nullPayload: ${resurrectedInNull.length} / ${results.length}`);

  if (failedEmpty.length > 0) {
    console.log('\nTemplates that threw error on emptyPayload:');
    failedEmpty.forEach(f => console.log(`  - ${f.file} (${f.fnName}): ${f.emptyPayload.error}`));
  }

  if (failedNull.length > 0) {
    console.log('\nTemplates that threw error on nullPayload ({}):');
    failedNull.forEach(f => console.log(`  - ${f.file} (${f.fnName}): ${f.nullPayload.error}`));
  }

  if (resurrectedInEmpty.length > 0) {
    console.log('\nSample templates with resurrected mock strings on empty payload:');
    resurrectedInEmpty.forEach(r => {
      console.log(`  - ${r.file}: [${r.emptyPayload.resurrectedMockStrings.join(', ')}]`);
    });
  }
}

run().catch(console.error);
