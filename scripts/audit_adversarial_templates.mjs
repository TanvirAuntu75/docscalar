
import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';

const templatesDir = './src/engines/utility/templates';
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

console.log(`Auditing ${files.length} templates against 6 adversarial edge-case datasets...`);

const edgeCases = [
  {
    name: "Completely Empty / Null Data",
    data: {
      name: "",
      title: "",
      phone: "",
      email: "",
      location: "",
      website: "",
      linkedin: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      customSections: []
    }
  },
  {
    name: "Undefined / Missing Properties",
    data: {}
  },
  {
    name: "Special Characters & XSS Payloads",
    data: {
      name: '<script>alert("XSS")</script> John & Jane Doe',
      title: "Senior <b>Director</b> of R&D",
      summary: "Special symbols: &amp; &lt; &gt; &quot; &#39; © ® ™ € £ ¥",
      skills: ["C++", "C#", "HTML & CSS", "<Canvas> API", "Node.js & Express"],
      experience: [
        {
          role: "Lead <Architect> & 'Engineer'",
          company: "Acme & Co. <San Francisco>",
          date: "2020 & Present",
          highlights: ["Boosted performance by >50% & reduced latency by <10ms."]
        }
      ],
      education: [
        { degree: "B.S. in Computer Science & Math", school: "MIT & Harvard", date: "2016-2020" }
      ]
    }
  },
  {
    name: "Extreme Length Strings (Text Overflow)",
    data: {
      name: "DR. ALEXANDRIA MAXIMILIANA VON SCHWARZENBERG-HOHENZOLLERN III",
      title: "Executive Vice President of Global Cross-Functional Distributed Cloud Engineering Operations",
      phone: "+1 (555) 123-4567 ext. 987654321 / +44 20 7946 0999 (Emergency)",
      email: "alexandria.maximilian.von.schwarzenberg.hohenzollern@enterprise-megacorp-international-systems.io",
      location: "San Francisco / London / Zurich / Tokyo Distributed Command Hub",
      website: "https://www.verylongdomainnamethatexceedsnormalexpectedlengthlimitsandboundaries.org/profile/alexandria",
      linkedin: "https://linkedin.com/in/alexandria-maximiliana-von-schwarzenberg-hohenzollern-executive",
      summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ".repeat(4),
      skills: Array(30).fill("High-Performance Distributed Systems Architecture & Enterprise Governance"),
      experience: Array(8).fill({
        role: "Senior Principal Lead Enterprise System Solutions Architect & Engineering General Manager",
        company: "International Global Megacorp Technologies Incorporated • San Francisco & Global Regions",
        date: "2018 – 2024 (Full-Time Continuous Executive Tenure)",
        highlights: Array(6).fill("Spearheaded enterprise-wide operational transformation resulting in over $500M+ in verified cost optimization across 14 global data centers and 12,000 engineers.")
      }),
      education: Array(5).fill({
        degree: "Doctor of Philosophy (Ph.D.) in Advanced Computational Neural Architectures & Parallel Algorithms",
        school: "Massachusetts Institute of Technology (MIT) School of Engineering",
        date: "2010 – 2016 (Summa Cum Laude with Highest Academic Honors)"
      })
    }
  },
  {
    name: "Missing / Null Sub-arrays",
    data: {
      name: "Jane Doe",
      title: "Engineer",
      skills: null,
      experience: null,
      education: null,
      projects: null,
      certifications: null,
      customSections: null
    }
  }
];

let issues = [];

for (const file of files) {
  const filePath = path.resolve(templatesDir, file);
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl);
  const fnName = Object.keys(mod).find(k => k.startsWith('generate'));
  const fn = mod[fnName] || mod.default;

  for (const ec of edgeCases) {
    try {
      const html = fn(ec.data, 'default', 'Inter', ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'], 'single', 24, 1.4);
      if (typeof html !== 'string' || html.length < 50) {
        issues.push({ file, edgeCase: ec.name, error: `Invalid output: length ${html ? html.length : 0}` });
      }
    } catch (err) {
      issues.push({ file, edgeCase: ec.name, error: err.message });
    }
  }
}

console.log(`
Audit Complete: Tested ${files.length * edgeCases.length} permutations.`);
if (issues.length === 0) {
  console.log("[OK] Zero fatal crashes across all edge cases!");
} else {
  console.log(`Found ${issues.length} potential edge-case issues:`);
  issues.forEach(i => console.log(`  - [${i.file}] ${i.edgeCase}: ${i.error}`));
}
