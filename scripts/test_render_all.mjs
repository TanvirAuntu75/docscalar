import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const defaultData = {
  name: 'Mariana Anderson',
  title: 'Marketing Manager',
  photoUrl: '/images/candidates/mariana.jpg',
  email: 'hello@reallygreatsite.com',
  phone: '+123-456-7890',
  location: '123 Anywhere St., Any City',
  website: 'reallygreatsite.com',
  linkedin: 'linkedin.com/in/mariana-anderson',
  summary: 'Marketing Director with 7 years of experience leading growth marketing, acquisition funnels, and creative teams. Built campaigns that expanded brand reach by 45% and generated 3.8M dollars in annual pipeline across paid media, organic search, and lifecycle retention.',
  experience: [
    {
      id: 'exp1',
      company: 'Ginyard International Co.',
      role: 'Senior Marketing Manager',
      start: '2022',
      end: 'PRESENT',
      highlights: [
        'Develop and execute comprehensive multichannel marketing campaigns that generated $3.8M in net new pipeline and expanded brand reach across North American markets.',
        'Lead and mentor a marketing team of 8 specialists across content, SEO, paid media, and lifecycle automation to consistently achieve quarterly KPIs.',
        'Oversee brand positioning and customer acquisition strategy, reducing customer acquisition cost (CAC) by 28% while improving lead conversion.'
      ]
    },
    {
      id: 'exp2',
      company: 'Borcelle Digital Media',
      role: 'Marketing & Growth Specialist',
      start: '2020',
      end: '2022',
      highlights: [
        'Managed digital ad spend of $1.2M across Google Ads, Meta, and LinkedIn, improving clickthrough rates by 35% and ROAS by 2.4x.',
        'Led conversion rate optimization and AB testing on core landing pages, resulting in an 18% lift in demo completion rates.',
        'Coordinated product launches with engineering and product management teams to ensure unified brand messaging and market readiness.'
      ]
    },
    {
      id: 'exp3',
      company: 'Fauget Studio',
      role: 'Associate Campaign Strategist',
      start: '2018',
      end: '2020',
      highlights: [
        'Conducted extensive market research and competitor benchmarking to identify high-growth audience segments and emerging industry trends.',
        'Authored engaging copy, case studies, and email drip sequences that increased subscriber retention and email open rates by 24%.'
      ]
    }
  ],
  education: [
    {
      id: 'edu1',
      school: 'Borcelle University',
      degree: 'Master of Business Management (MBM)',
      start: '2020',
      end: '2022',
      note: 'GPA: 3.9 / 4.0 · Dean’s Honor List'
    },
    {
      id: 'edu2',
      school: 'Borcelle University',
      degree: 'Bachelor of Science in Business & Marketing',
      start: '2014',
      end: '2018',
      note: 'Graduated Magna Cum Laude · GPA: 3.85 / 4.0'
    }
  ],
  skills: [
    'Strategic Planning - Expert',
    'Project Management - Expert',
    'Digital Marketing - Expert',
    'Data Analytics & BI - Advanced',
    'Team Leadership - Advanced',
    'Brand Architecture - Advanced',
    'UI/UX Design - Advanced',
    'Public Relations - Intermediate',
    'Budget Allocation - Expert',
    'Time Management - Expert'
  ],
  certifications: [
    'Certified Digital Marketing Professional (CDMP) · DMI 2024',
    'Reforge Growth & Retention Strategy Certification',
    'HubSpot Inbound & Content Marketing Master'
  ],
  projects: [
    {
      id: 'proj1',
      name: 'Campaign "Grow"',
      description: 'Scaled enterprise pipeline generating 150% ROI and 25,000 qualified marketing leads within 9 months.',
      url: 'ginyard.co/campaign-grow'
    },
    {
      id: 'proj2',
      name: 'Brand Replatforming',
      description: 'Redesigned corporate identity and digital asset library, elevating customer NPS by 18 points.',
      url: 'ginyard.co/rebrand'
    }
  ],
  references: [
    {
      id: 'ref1',
      name: 'Benjamin Shah',
      relation: 'Wardiere Inc. / Chief Technology Officer',
      phone: '+1 (555) 234-5678',
      email: 'b.shah@wardiere.com'
    },
    {
      id: 'ref2',
      name: 'Bailey Dupont',
      relation: 'Ginyard Co. / VP of Global Operations',
      phone: '+1 (555) 876-5432',
      email: 'b.dupont@ginyard.com'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { id: 'lang1', title: 'English', value: 'Native / Fluent' },
        { id: 'lang2', title: 'Spanish', value: 'Professional Working' },
        { id: 'lang3', title: 'French', value: 'Conversational' }
      ]
    }
  ]
};

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

console.log(`Auditing and dynamically executing ${files.length} template generators directly...`);
let passed = 0;
for (const file of files) {
  try {
    const fileUrl = pathToFileURL(path.join(templatesDir, file)).href;
    const mod = await import(fileUrl);
    const fnName = Object.keys(mod)[0];
    const fn = mod[fnName];
    if (typeof fn === 'function') {
      const html = fn(defaultData);
      if (html && html.length > 1000) {
        passed++;
      } else {
        console.warn(`[WARN] ${file}: Output length is ${html?.length || 0} bytes`);
      }
    }
  } catch (err) {
    console.error(`[ERROR] ${file}:`, err.message);
  }
}

console.log(`\n✓ Successfully executed and verified ${passed}/${files.length} template engines with full-page density!`);
