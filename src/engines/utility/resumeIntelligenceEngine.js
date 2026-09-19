/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DocScalar Resume Intelligence & Local Automation Engine (Pro Max Suite)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Zero-dependency, privacy-first local intelligence algorithms for:
 * 1. ATS Health & Impact Scoring (0-100 score + actionable diagnostic checklist)
 * 2. Smart Bullet Enhancer (Google XYZ formula: Accomplished [X], measured by [Y], by doing [Z])
 * 3. Role-Based Smart Autocomplete (12 career tracks with curated skills, summaries, bullets)
 * 4. Job Description ATS Keyword Matcher (Pasted Job Description -> Match % + Missing Keywords)
 * 5. 1-Click Punctuation, Date & Format Normalizer
 * 6. Smart Page Overflow & Spacing Auto-Tuner (Snaps overflow content onto 1 clean page)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeTwoPagePartition } from './paginationEngine.js';
import { simulateAtsTextExtraction, extractSpatialTextElements } from './spatialParserEngine.js';
import {
  analyzeSemanticJobMatch,
  CONCEPT_TAXONOMY_GRAPH,
  TAXONOMY_CATEGORIES,
  TAXONOMY_CATEGORY_LABELS,
  extractTechnicalTerms
} from './semanticMatcherEngine.js';

export {
  simulateAtsTextExtraction,
  extractSpatialTextElements,
  analyzeSemanticJobMatch,
  CONCEPT_TAXONOMY_GRAPH,
  TAXONOMY_CATEGORIES,
  TAXONOMY_CATEGORY_LABELS,
  extractTechnicalTerms
};

// ── 1. High Impact Action Verb Dictionary (120+ Power Verbs by Category) ──
export const POWER_VERBS = {
  leadership: ['Led', 'Lead', 'Directed', 'Direct', 'Guided', 'Guide', 'Managed', 'Manage', 'Coordinated', 'Coordinate', 'Oversee', 'Oversaw', 'Supervised', 'Supervise', 'Mentored', 'Facilitated', 'Collaborated', 'Cultivated', 'Mobilized', 'Trained', 'Advised', 'Influenced', 'Chaired', 'Organized', 'Administered', 'Controlled'],
  engineering: ['Architected', 'Engineered', 'Automated', 'Refactored', 'Optimized', 'Deployed', 'Overhauled', 'Containerized', 'Modernized', 'Scaled', 'Implemented', 'Developed', 'Develop', 'Built', 'Configured', 'Maintained', 'Integrated', 'Launched', 'Fixed', 'Tested', 'Updated', 'Migrated', 'Resolved', 'Secured', 'Upgraded', 'Traced', 'Diagnosed', 'Adapted'],
  innovation: ['Pioneered', 'Invented', 'Conceived', 'Devised', 'Originated', 'Conceptualized', 'Introduced', 'Established', 'Formulated', 'Designed', 'Created', 'Drafted', 'Modified', 'Formatted'],
  growth: ['Accelerated', 'Increased', 'Grew', 'Expanded', 'Boosted', 'Delivered', 'Maximized', 'Amplified', 'Outperformed', 'Augmented', 'Multiplied', 'Produced', 'Executed', 'Operated'],
  efficiency: ['Streamlined', 'Consolidated', 'Eliminated', 'Minimized', 'Expedited', 'Trimmed', 'Standardized', 'Centralized', 'Pruned', 'Restructured', 'Addressed', 'Clarified', 'Solved', 'Navigated', 'Supported'],
  analytical: ['Conducted', 'Conduct', 'Authored', 'Author', 'Benchmarked', 'Quantified', 'Decoded', 'Synthesized', 'Diagnosed', 'Audited', 'Evaluated', 'Mapped', 'Forecasted', 'Uncovered', 'Analyzed', 'Researched', 'Documented', 'Presented', 'Negotiated', 'Planned', 'Assessed', 'Identified', 'Examined', 'Measured', 'Monitored', 'Reviewed', 'Verified', 'Calculated', 'Collected', 'Extracted', 'Inspected', 'Validated']
};

export const ALL_POWER_VERBS = Object.values(POWER_VERBS).flat();

export const WEAK_VERB_MAP = {
  'worked on': 'Architected and implemented',
  'helped with': 'Collaborated to build',
  'responsible for': 'Directed and executed',
  'did': 'Executed and delivered',
  'made': 'Engineered and shipped',
  'managed': 'Directed and managed',
  'handled': 'Managed and resolved',
  'wrote': 'Authored and documented',
  'used': 'Applied',
  'fixed': 'Diagnosed, debugged, and resolved',
  'tested': 'Authored automated test suites for',
  'built': 'Engineered and shipped',
  'changed': 'Refactored and optimized',
  'created': 'Built and launched',
  'assisted': 'Partnered across teams to deliver',
  'supported': 'Maintained SLA reliability and uptime for'
};

// ── 2. Role-Based Content Packages (12 Career Tracks) ──
export const ROLE_INTELLIGENCE_DICTIONARY = {
  'devops_cloud_engineer': {
    title: 'DevOps / Cloud Engineer',
    keywords: ['devops', 'sre', 'site reliability', 'cloud engineer', 'infrastructure', 'platform engineer', 'systems engineer'],
    skills: ['Kubernetes (K8s)', 'Terraform (IaC)', 'Docker', 'AWS / GCP / Azure', 'CI/CD (GitHub Actions / GitLab)', 'Linux & Bash Scripting', 'Prometheus & Grafana', 'Zero Trust Security', 'Helm', 'Disaster Recovery & High Availability'],
    summary: 'DevOps and Site Reliability Engineer specializing in automated Infrastructure as Code (IaC), container architecture, and multi region cloud resilience. Experienced in eliminating deployment bottlenecks, securing zero downtime microservice migrations, and reducing infrastructure costs.',
    bullets: [
      'Architected multi region Kubernetes clusters with autoscaling policies, maintaining 99.99% availability during peak traffic spikes.',
      'Automated cloud provisioning via modular Terraform templates, cutting environment bootstrapping time from 3 days to 12 minutes.',
      'Integrated continuous vulnerability scanning and secrets rotation into CI/CD pipelines, achieving 100% compliance with SOC2 standards.'
    ]
  },
  'cybersecurity_engineer': {
    title: 'Cybersecurity Analyst',
    keywords: ['cybersecurity', 'security analyst', 'infosec', 'penetration tester', 'soc analyst', 'ethical hacker', 'information security'],
    skills: ['SIEM (Splunk / Sentinel)', 'Vulnerability Assessment & Pentesting', 'Incident Response & Forensics', 'Zero Trust Architecture', 'Firewall & EDR Management', 'OWASP Top 10 Hardening', 'Identity & Access Management (IAM)', 'Compliance (NIST / ISO 27001 / SOC2)', 'Network Packet Analysis (Wireshark)', 'Python / Bash Scripting'],
    summary: 'Security professional dedicated to threat hunting, vulnerability mitigation, and zero trust enterprise posture. Experienced in conducting proactive penetration tests, remediating critical CVEs, and delivering rapid incident containment across distributed infrastructure.',
    bullets: [
      'Deployed automated threat detection pipelines across 5,000+ enterprise endpoints, reducing Mean Time to Detect (MTTD) by 54%.',
      'Conducted adversarial red team penetration tests and code security audits, identifying and patching 18 critical zero day attack vectors.',
      'Architected enterprise IAM role based access control policies, achieving 100% compliance with NIST and ISO 27001 benchmarks.'
    ]
  },
  'qa_automation_engineer': {
    title: 'QA Automation Engineer',
    keywords: ['qa', 'quality assurance', 'sdet', 'test automation', 'automation engineer', 'tester'],
    skills: ['Selenium / Playwright / Cypress', 'JavaScript / TypeScript', 'Python', 'API Testing (Postman / REST Assured)', 'CI/CD Test Integration (GitHub Actions)', 'Load Testing (k6 / JMeter)', 'Test Plan Authoring & Strategy', 'Cross Browser Compatibility', 'Bug Tracking & Jira', 'BDD / Cucumber'],
    summary: 'Quality Assurance and SDET specializing in scalable test automation frameworks and regression suite acceleration. Focused on shifting quality left, eliminating release blockers, and guaranteeing zero critical bugs in production.',
    bullets: [
      'Engineered full coverage Playwright automation test suite with 450+ integration scenarios, reducing manual testing overhead by 70%.',
      'Integrated automated smoke and regression pipelines into GitHub Actions, catching 99.4% of breaking regressions prior to staging deployment.',
      'Formulated distributed k6 load testing scripts simulating 50,000 concurrent users to validate microservice autoscaling thresholds.'
    ]
  },
  'data_scientist': {
    title: 'Data Scientist',
    keywords: ['data scientist', 'machine learning', 'ml engineer', 'ai engineer', 'data science', 'deep learning'],
    skills: ['Python', 'PyTorch / TensorFlow', 'Scikit Learn', 'SQL & Data Warehousing', 'Statistical Modeling & Hypothesis Testing', 'Natural Language Processing (NLP)', 'Predictive Analytics', 'Pandas & NumPy', 'Data Visualization (Tableau / PowerBI)', 'MLOps & Model Deployment'],
    summary: 'Data Scientist with deep expertise in statistical modeling, machine learning architecture, and predictive analytics. Skilled in mining large datasets to derive actionable enterprise intelligence, deploying production ML pipelines, and establishing rigorous experimentation frameworks.',
    bullets: [
      'Engineered gradient boosted predictive models forecasting user churn with 92.4% AUC ROC, saving $450K in customer attrition annually.',
      'Designed automated ETL and feature engineering pipelines processing 10M+ daily records using Apache Spark and PostgreSQL.',
      'Deployed real time recommendation inference engine with sub 50ms latency, driving a 22% increase in average order value (AOV).'
    ]
  },
  'ui_ux_designer': {
    title: 'UI/UX Designer',
    keywords: ['ui/ux', 'ux designer', 'product designer', 'visual designer', 'ux/ui', 'interaction designer'],
    skills: ['Figma / FigJam', 'Design Systems & Component Libraries', 'Wireframing & Prototyping', 'User Research & Usability Testing', 'Information Architecture', 'Interaction Design', 'Micro Animations', 'Accessibility (WCAG 2.1 AA)', 'Design Tokens', 'Cross Team Handoff'],
    summary: 'Product and UI/UX Designer dedicated to crafting accessible, elegant, and conversion optimized digital experiences. Adept at conducting generative user research, architecting scalable design systems, and bridging product strategy with high fidelity visual craft.',
    bullets: [
      'Led enterprise design system overhaul with 120+ modular Figma components, accelerating frontend sprint velocity by 35%.',
      'Conducted 40+ moderated usability interviews and cognitive walkthroughs, redesigning core checkout flows to boost completion rate by 19%.',
      'Designed responsive device specifications with strict WCAG AA contrast and accessibility compliance.'
    ]
  },
  'product_manager': {
    title: 'Product Manager',
    keywords: ['product manager', 'product lead', 'product owner', 'group product manager', 'technical pm'],
    skills: ['Product Strategy & Roadmapping', 'User Journey Mapping', 'AB Testing & Experimentation', 'Data Analytics & SQL', 'Agile / Scrum Leadership', 'Market Research & Competitive Analysis', 'Cross Team Collaboration', 'OKRs & KPIs', 'PRD Authoring', 'Customer Discovery'],
    summary: 'Product Manager experienced in leading product life cycles from discovery to market launch. Focused on translating customer needs into feature roadmaps, driving revenue growth, and aligning design, engineering, and executive stakeholders.',
    bullets: [
      'Directed product discovery, scoping, and launch for flagship mobile features, driving a 34% increase in 30 day user retention.',
      'Formulated data backed AB testing matrix across customer onboarding funnels, increasing conversion rates by $1.8M ARR in Q3.',
      'Managed sprint prioritization and roadmap delivery across 4 product squads, cutting feature cycle time by 28%.'
    ]
  },
  'marketing_manager': {
    title: 'Marketing Manager',
    keywords: ['growth marketing', 'digital marketer', 'brand manager', 'content marketing', 'marketing lead'],
    skills: ['Growth Strategy', 'SEO & Organic Content Optimization', 'Paid Acquisition (PPC / Meta / LinkedIn)', 'Email Automation & CRM (HubSpot)', 'Google Analytics 4 & Funnel Tracking', 'Brand Positioning & Messaging', 'Budget Allocation', 'Copywriting & Creative Direction', 'Conversion Rate Optimization (CRO)', 'Influencer & Partner Marketing'],
    summary: 'Growth Marketing Manager with a demonstrated history of scaling organic acquisition, executing high ROI omnichannel paid campaigns, and crafting compelling brand narratives. Expert in optimizing CAC/LTV ratios and building automated conversion engines.',
    bullets: [
      'Led integrated multichannel marketing campaigns that generated 45,000+ qualified leads and boosted inbound revenue by 62%.',
      'Engineered comprehensive SEO keyword architecture and content strategy, growing organic search traffic by 180% in 12 months.',
      'Optimized paid acquisition spend across Google Ads and LinkedIn, reducing blended Customer Acquisition Cost (CAC) by 26%.'
    ]
  },
  'finance_analyst': {
    title: 'Financial Analyst',
    keywords: ['financial analyst', 'fp&a', 'investment banking', 'corporate finance', 'financial planner'],
    skills: ['Financial Modeling & DCF', 'Budgeting & Forecasting (FP&A)', 'Advanced Excel / VBA', 'Variance Analysis', 'ERP Systems (SAP / NetSuite)', 'SQL & PowerBI', 'Capital Structure & Valuation', 'Audit & Compliance', 'Cash Flow Optimization', 'Executive Board Reporting'],
    summary: 'Financial Analyst adept at financial forecasting, variance modeling, and strategic capital allocation. Skilled in evaluating large investment opportunities, streamlining executive reporting cadences, and uncovering operational cost efficiencies.',
    bullets: [
      'Constructed dynamic 5 year operating models and sensitivity analyses to support $25M in strategic corporate expansion rounds.',
      'Directed monthly variance and forecasting reviews across 8 regional business units, identifying $750K in redundant overhead savings.',
      'Automated executive financial reporting dashboards using SQL and PowerBI, cutting monthly close analysis turnaround by 4 days.'
    ]
  },
  'sales_account_executive': {
    title: 'Account Executive',
    keywords: ['account executive', 'sales manager', 'b2b sales', 'business development', 'sales director', 'sales representative'],
    skills: ['Enterprise B2B Sales', 'MEDDPICC / Solution Selling', 'Salesforce CRM & Pipeline Management', 'Executive Discovery & Demos', 'Contract Negotiation & Closing', 'Inbound & Outbound Prospecting', 'Quota Attainment (120%+)', 'Client Relationship Management', 'Sales Forecasting', 'Territory Planning'],
    summary: 'Enterprise Account Executive with consistent quota attainment, closing strategic enterprise contracts and expanding annual contract value across Fortune 500 accounts.',
    bullets: [
      'Generated $3.4M in new Annual Contract Value (ACV), achieving 138% of fiscal sales quota across enterprise accounts.',
      'Led discovery calls and executive sales presentations with C level stakeholders, cutting average deal sales cycle from 90 to 52 days.',
      'Maintained 100% CRM forecast accuracy while growing regional pipeline from $1.2M to $6.8M within 14 months.'
    ]
  },
  'customer_success_manager': {
    title: 'Customer Success Manager',
    keywords: ['customer success', 'csm', 'client success', 'account manager', 'client relations'],
    skills: ['Net Revenue Retention (NRR)', 'Customer Onboarding & Adoption', 'Churn Prevention & Health Scoring', 'Gainsight / Salesforce', 'Executive Business Reviews (EBRs)', 'Cross Selling & Upselling', 'Customer Journey Mapping', 'SaaS Renewals', 'Voice of Customer (VoC)', 'Stakeholder Management'],
    summary: 'Customer Success Manager focused on maximizing client retention, accelerating product adoption, and driving high net retention. Strong history of turning at risk accounts into enterprise brand advocates.',
    bullets: [
      'Managed a $4.8M ARR book of enterprise SaaS accounts, increasing Net Revenue Retention (NRR) from 104% to 118%.',
      'Instituted proactive customer health scoring telemetry in Gainsight, reducing annual logo churn by 32%.',
      'Conducted 50+ Quarterly Executive Business Reviews (QBRs), identifying $650K in annual expansion and upsell opportunities.'
    ]
  },
  'human_resources_specialist': {
    title: 'HR Business Partner',
    keywords: ['human resources', 'hr generalist', 'hrbp', 'talent acquisition', 'recruiter', 'people operations'],
    skills: ['Talent Acquisition & Sourcing', 'Employee Relations & Conflict Resolution', 'HRIS (Workday / BambooHR)', 'Performance Management & OKRs', 'Onboarding & Offboarding Lifecycle', 'Compensation & Benefits Strategy', 'DE&I Initiatives', 'Labor Law & Compliance', 'Culture & Engagement Surveys', 'Organizational Development'],
    summary: 'People and HR professional dedicated to talent acquisition, employee retention, and building high output organizational cultures. Skilled in modernizing HRIS workflows, scaling teams, and maintaining regulatory compliance.',
    bullets: [
      'Managed full cycle talent acquisition and onboarding for 85+ technical and executive hires, reducing Time to Hire from 45 to 24 days.',
      'Overhauled company wide performance review and leveling rubric, increasing internal employee satisfaction score by 24 points.',
      'Implemented automated Workday workflows that saved 15 administrative hours per week across People Operations.'
    ]
  },
  'software_engineer': {
    title: 'Software Engineer',
    keywords: ['software engineer', 'software developer', 'frontend', 'backend', 'full stack', 'fullstack', 'web developer', 'programmer', 'coder', 'application developer'],
    skills: ['TypeScript', 'JavaScript (ES6+)', 'React / Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL / REST APIs', 'CI/CD Pipelines', 'AWS / Cloud', 'Git & GitHub', 'Distributed Systems', 'Automated Testing (Jest / Vitest)'],
    summary: 'Software Engineer specializing in building scalable web architectures, microservices, and responsive user interfaces. Focused on optimizing application throughput, reducing latency, and delivering clean, maintainable code across agile engineering teams.',
    bullets: [
      'Architected and deployed high concurrency cloud services processing over 1.5M daily API requests with 99.98% uptime.',
      'Refactored legacy state management and rendering pipeline, boosting core Web Vitals and reducing Time to Interactive (TTI) by 42%.',
      'Engineered automated CI/CD deployment workflows and integration test suites, reducing release regression rates by 65%.'
    ]
  }
};

/**
 * Resolves a matching role intelligence package from arbitrary user input.
 */
export function getRoleIntelligence(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.toLowerCase().trim();

  // First pass: exact title match
  for (const [, role] of Object.entries(ROLE_INTELLIGENCE_DICTIONARY)) {
    if (role.title.toLowerCase() === q) return role;
  }

  // Second pass: match keywords
  // A query matches a keyword if:
  // 1. query contains the keyword (e.g. "Senior Frontend Engineer" contains "frontend")
  // 2. keyword equals the query or starts with the query (for prefixes like "dev" -> "developer", "front" -> "frontend")
  // 3. Any individual word in the keyword starts with the query (provided query length >= 3 and query isn't generic "man" or "ing")
  const candidateMatches = [];
  for (const [, role] of Object.entries(ROLE_INTELLIGENCE_DICTIONARY)) {
    for (const kw of role.keywords) {
      const kwLower = kw.toLowerCase();
      const kwWords = kwLower.split(/\s+/);
      const isExactOrContains = q.includes(kwLower);
      const isPrefixOfKeyword = kwLower.startsWith(q);
      const isWordPrefix = q.length >= 3 && q !== 'man' && q !== 'ing' && kwWords.some(w => w.startsWith(q));

      if (isExactOrContains || isPrefixOfKeyword || isWordPrefix) {
        candidateMatches.push({ role, kwLength: kw.length });
      }
    }
  }

  if (candidateMatches.length > 0) {
    candidateMatches.sort((a, b) => b.kwLength - a.kwLength);
    return candidateMatches[0].role;
  }

  return null;
}

// ── 3. Smart Bullet Point Enhancer (Google XYZ Formula) & Natural Metric Synthesizer ──

export const IMPACT_DOMAINS = {
  efficiency: {
    name: 'Efficiency, Latency & Automation',
    keywords: [
      'streamlin', 'automat', 'optimiz', 'consolidat', 'refactor', 'expedit', 'eliminat',
      'speed', 'latency', 'performance', 'bottleneck', 'workflow', 'pipeline', 'manual',
      'overhead', 'faster', 'cut', 'reduc', 'trim', 'standardiz', 'throughput', 'turnaround',
      'cost', 'efficient', 'minimize', 'prune', 'accelerat', 'fast'
    ],
    clauses: [
      'resulting in a 28% reduction in operational turnaround time',
      'cutting recurring manual processing overhead by 35%',
      'reducing cycle latency by 42%',
      'slashing deployment pipeline execution time by 30%',
      'improving workflow throughput by 25%',
      'saving 15+ engineering hours per week in manual overhead',
      'lowering cloud compute and infrastructure costs by 22%'
    ]
  },
  growth: {
    name: 'Growth, Revenue & Adoption',
    keywords: [
      'amplif', 'maximiz', 'boost', 'expand', 'generat', 'lift', 'scale', 'increas',
      'grow', 'growth', 'revenue', 'sales', 'conversion', 'retention', 'arr', 'mrr', 'nps',
      'adoption', 'customer', 'client', 'lead', 'acquisition', 'market', 'outperform', 'acv',
      'profit', 'roi', 'monetiz', 'engagement', 'user', 'traffic', 'inbound', 'outbound'
    ],
    clauses: [
      'driving a 34% increase in user engagement and quarterly conversions',
      'contributing to a 25% lift in annual pipeline revenue',
      'expanding active enterprise account adoption by 40%',
      'delivering an estimated $1.2M in annual recurring business value',
      'increasing customer retention and Net Promoter Score by 22 points',
      'boosting customer acquisition rate by 30% across key target segments',
      'driving a 28% increase in organic user conversions'
    ]
  },
  scale: {
    name: 'Scale, Traffic & High Availability',
    keywords: [
      'architect', 'engineer', 'scale', 'deploy', 'overhaul', 'containeriz', 'moderniz',
      'infrastruct', 'cloud', 'cluster', 'uptime', 'sla', 'load', 'concurrency',
      'kubernetes', 'k8s', 'distributed', 'backend', 'database', 'server', 'microservice',
      'high availability', 'failover', 'horizontal', 'aws', 'gcp', 'azure', 'docker',
      'traffic', 'request', 'volume', 'endpoint'
    ],
    clauses: [
      'supporting 1.5M+ daily active requests with 99.99% system uptime',
      'enabling scalable architecture across multi region cloud infrastructure',
      'maintaining 99.99% service agreement uptime across all production releases',
      'reducing cloud infrastructure operational overhead by 24%',
      'scaling backend services to reliably absorb a 4x surge in peak traffic',
      'maintaining 99.95% service availability across distributed multi tenant environments'
    ]
  },
  quality: {
    name: 'Quality, Security & Reliability',
    keywords: [
      'test', 'audit', 'harden', 'secur', 'diagnos', 'benchmark', 'formulat', 'quality',
      'compliance', 'vulnerab', 'cve', 'soc2', 'iso', 'nist', 'hipaa', 'defect', 'bug',
      'regression', 'coverage', 'incident', 'mttd', 'mttr', 'cyber', 'patch', 'protect',
      'zero day', 'remediat', 'flaw', 'risk', 'safeguard', 'reliable', 'reliability', 'e2e',
      'playwright', 'cypress', 'selenium', 'jest', 'vitest'
    ],
    clauses: [
      'expanding automated test coverage from 60% to 92%',
      'reducing production bug recurrence and regression rates by 45%',
      'achieving 100% compliance with industry security and audit benchmarks',
      'cutting Mean Time to Detect (MTTD) security incidents by 38%',
      'reducing critical software defects in production by 52%',
      'eliminating 18+ critical vulnerability risks prior to release'
    ]
  },
  leadership: {
    name: 'Leadership, Velocity & Delivery',
    keywords: [
      'direct', 'mentor', 'cultivat', 'coordinat', 'lead', 'manage',
      'guid', 'supervis', 'mobiliz', 'cross functional', 'squad', 'sprint', 'roadmap',
      'stakeholder', 'initiative', 'team', 'delivery', 'collaborat', 'chair', 'facilitat',
      'coach', 'align', 'hire', 'onboard', 'manage', 'champion'
    ],
    clauses: [
      'accelerating sprint velocity by 25% across 4 engineering squads',
      'achieving 100% on time milestone delivery across enterprise initiatives',
      'improving team delivery efficiency by 30%',
      'advancing engineering best practices and cutting onboarding ramp up time by 40%',
      'aligning 5 stakeholder teams to deliver core product milestones 3 weeks ahead of schedule'
    ]
  },
  general: {
    name: 'General & Productivity Fallback',
    keywords: [],
    clauses: [
      'driving a 25% increase in operational efficiency',
      'delivering measurable workflow productivity gains across the organization',
      'improving user satisfaction ratings by 28%',
      'generating a 20% improvement in key performance deliverables',
      'enhancing workflow reliability and execution velocity by 30%'
    ]
  }
};

/**
 * Deterministically classifies text into the best matching impact domain
 * and synthesizes a natural, quantified achievement clause.
 */
export function synthesizeContextualMetric(text) {
  if (!text || typeof text !== 'string') return IMPACT_DOMAINS.general.clauses[0];
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9+#/.-]+/g) || [];

  let bestDomain = 'general';
  let maxScore = 0;

  for (const [domainKey, domain] of Object.entries(IMPACT_DOMAINS)) {
    if (domainKey === 'general') continue;
    let score = 0;
    for (const kw of domain.keywords) {
      if (kw.includes(' ')) {
        if (lower.includes(kw)) score += 2;
      } else {
        for (const w of words) {
          if (w === kw || (kw.length >= 4 && w.startsWith(kw))) {
            score += 1;
            break;
          }
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestDomain = domainKey;
    }
  }

  if (maxScore === 0) {
    bestDomain = 'general';
  }

  const selectedDomain = IMPACT_DOMAINS[bestDomain] || IMPACT_DOMAINS.general;
  const pool = selectedDomain.clauses;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/**
 * Automatically upgrades raw or weak bullet statements into quantified, high impact achievements.
 */
export function enhanceBullet(rawText) {
  if (!rawText || !rawText.trim()) {
    return '';
  }

  let text = rawText.trim().replace(/^[-*•]\s*/, '');

  // 1. Check if bullet already has a strong power verb
  const firstWord = text.split(' ')[0];
  const hasStrongVerb = ALL_POWER_VERBS.some(v => v.toLowerCase() === firstWord.toLowerCase());

  // 2. Replace weak phrases with strong verbs
  let upgradedText = text;
  for (const [weak, strong] of Object.entries(WEAK_VERB_MAP)) {
    const regex = new RegExp(`^${weak}\\b`, 'i');
    if (regex.test(upgradedText)) {
      upgradedText = upgradedText.replace(regex, strong);
      break;
    }
  }

  // If no strong verb at start, prepend an active power verb
  // But skip if first word is a number, URL, or the bullet is too short to be a real sentence
  const isPastTense = /ed$|ied$|elt$|ent$|ght$|ung$|ade$|rew$|ote$|ore$|ove$/i.test(firstWord);
  const startsWithNumber = /^\d/.test(firstWord);
  const isUrlOrPath = /[:/.]/.test(firstWord);
  const isTooShort = text.length < 10;
  if (!hasStrongVerb && !Object.keys(WEAK_VERB_MAP).some(w => text.toLowerCase().startsWith(w)) && !isPastTense && !startsWithNumber && !isUrlOrPath && !isTooShort) {
    const defaultVerb = 'Led';
    upgradedText = `${defaultVerb} ${upgradedText.charAt(0).toLowerCase() + upgradedText.slice(1)}`;
  }

  // 3. Inject Quantifiable Impact Metric if missing numbers/percentages
  const hasMetric = /(\d+%|\$\d+|\d+[kKmMbB]|\d+x|\d+\s*(?:percent|million|billion|users|clients|requests|ms|seconds|days|hours|teams|engineers|people|projects|years|months|weeks|customers|endpoints|transactions|applications|servers|databases|repositories|pipelines|deployments|releases|sprints|features|bugs|tickets|records|rows|queries|calls|pages|visits|sessions|conversions|leads|accounts|contracts|dollars|euros|pounds))/i.test(upgradedText);
  if (!hasMetric && !isTooShort) {
    // Clean trailing punctuation, prepositions, conjunctions, or incomplete connectors
    let base = upgradedText
      .replace(/\.+$/, '')
      .replace(/\s+(?:to|in order to|for|by|with|and|aiming to|helping to|designed to)\s*$/i, '')
      .replace(/[,;:]+$/, '')
      .trim();

    const impactClause = synthesizeContextualMetric(upgradedText);
    upgradedText = `${base}, ${impactClause}`;
  }

  // Final cleanup: eliminate any raw bracket tokens, normalize trailing punctuation to single period
  upgradedText = upgradedText.replace(/[\[\]]/g, '').trim();
  const trimmed = upgradedText.replace(/\s+$/, '');
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return trimmed.replace(/[,;:]+$/, '') + '.';
}

// ── 3.5 Template ATS Layout Compatibility Registry (89 Templates) ──
export const TEMPLATE_ATS_PROFILES = {
  // 100% Single Column ATS Ultra Templates (Pure Linear Document Flow, 0 Column Interleaving Risk)
  harvard_classic       : { layout: 'single_column', tier: 'ultra', photo: false, score: 20, label: 'Single Column ATS Ultra' },
  silicon_valley_ats    : { layout: 'single_column', tier: 'ultra', photo: false, score: 20, label: 'Single Column ATS Tech' },
  wall_street_executive : { layout: 'single_column', tier: 'ultra', photo: false, score: 20, label: 'Single Column ATS Finance' },
  oxford_minimalist     : { layout: 'single_column', tier: 'ultra', photo: false, score: 20, label: 'Single Column ATS Academic' },
  jonathan              : { layout: 'single_column', tier: 'ultra', photo: false, score: 19, label: 'Traditional Serif Linear' },
  vienna_crest          : { layout: 'single_column', tier: 'ultra', photo: true,  score: 18, label: 'Academic Vertical Stream' },
  edinburgh_navy        : { layout: 'single_column', tier: 'ultra', photo: true,  score: 18, label: 'Legal Classic Single Column' },
  helsinki_frost         : { layout: 'single_column', tier: 'ultra', photo: true,  score: 18, label: 'Frosted Linear Single Column' },
  oxford_burgundy       : { layout: 'single_column', tier: 'ultra', photo: true,  score: 18, label: 'Crest Shield Single Column' },

  // Two Column Sidebar Templates (explicitly registered for accuracy)
  charles               : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Sidebar (32%/68%)' },
  wilson_minimal        : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Split (65%/35%)' },
  osaka_minimal         : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Split Monospace' },
  stockholm_monochrome  : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Boxed Grid' },
  boston_crimson         : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Crimson Split' },
  arthur_pendelton      : { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column CSS Grid Sidebar' },

  // Creative / Matrix / Polygon Archetypes
  diagonal_wedge        : { layout: 'creative_polygon', tier: 'creative', photo: true, score: 4, label: 'Polygon Cut and 5 Dots' },
  floating_card_matrix  : { layout: 'creative_matrix', tier: 'creative', photo: true, score: 4, label: 'Modular Cards and Multi Block' },
  split_dual_block      : { layout: 'creative_box', tier: 'creative', photo: true, score: 5, label: 'Dual Block Box' },
  overlapping_badge     : { layout: 'creative_badge', tier: 'creative', photo: true, score: 4, label: 'Halo Badge Overlay' },
  card_matrix           : { layout: 'creative_matrix', tier: 'creative', photo: true, score: 5, label: 'Boxed Tech Cards' },
  adora_diagonal        : { layout: 'creative_polygon', tier: 'creative', photo: true, score: 4, label: 'Diagonal Waves' },
  date_capsule          : { layout: 'creative_capsule', tier: 'creative', photo: true, score: 5, label: 'Capsule Timeline' },
  ocean_block           : { layout: 'creative_block', tier: 'creative', photo: true, score: 5, label: 'Block Header & Grid' }
};

export function getTemplateAtsProfile(templateKey) {
  if (!templateKey) {
    // No template selected = no layout risk to penalize. Give benefit of the doubt.
    return { layout: 'unknown', tier: 'neutral', photo: false, score: 20, label: 'Standard Template' };
  }
  const key = typeof templateKey === 'string' ? templateKey.toLowerCase().trim() : '';
  if (TEMPLATE_ATS_PROFILES[key]) {
    return TEMPLATE_ATS_PROFILES[key];
  }
  // Default for all other 2-column sidebar templates in catalog
  return { layout: 'two_column_sidebar', tier: 'corporate', photo: true, score: 6, label: 'Two Column Sidebar Layout' };
}

// ── 4. Real Time ATS Resume Health & Completeness Scorer ──
/**
 * Deterministically computes a 0-100 ATS Health Score across 6 weighted dimensions,
 * evaluating both semantic content strength and template layout parser compatibility.
 */
export function calculateAtsHealthScore(data, templateKey = null, renderedHtml = null) {
  if (!data) return { score: 0, grade: 'N/A', breakdown: {}, suggestions: ['Please enter your resume details to begin.'], issues: ['Please enter your resume details to begin.'] };

  let totalScore = 0;
  const breakdown = {};
  const suggestions = [];

  // 1. Live 2D Spatial Layout Scanline Simulation (if HTML preview provided)
  let spatialAnalysis = null;
  if (renderedHtml && typeof renderedHtml === 'string' && renderedHtml.length > 50) {
    try {
      spatialAnalysis = simulateAtsTextExtraction(renderedHtml);
    } catch {
      spatialAnalysis = null;
    }
  }

  // Dimension 1: Measurable Metrics Density (Max 20 pts)
  const allBullets = [
    ...(data.experience || []).flatMap(e => e.highlights || []),
    ...(data.projects || []).flatMap(p => p.highlights || (p.description ? [p.description] : []))
  ].filter(Boolean);

  const metricRegex = /(\d+%|\$\d+|\d+[kKmMbB]|\d+x|\d+\s*(?:percent|million|billion|users|clients|requests|ms|seconds|days|hours|teams|engineers|people|projects|years|months|weeks|customers|endpoints|transactions|applications|servers|databases|repositories|pipelines|deployments|releases|sprints|features|bugs|tickets|records|rows|queries|calls|pages|visits|sessions|conversions|leads|accounts|contracts|dollars|euros|pounds))/i;
  const quantifiedBullets = allBullets.filter(b => metricRegex.test(b));
  const metricRatio = allBullets.length > 0 ? (quantifiedBullets.length / allBullets.length) : 0;
  const metricPoints = Math.round(Math.min(20, metricRatio * 28));
  breakdown.metrics = {
    score: metricPoints,
    max: 20,
    label: 'Measurable Metrics & Impact',
    passed: metricPoints >= 14
  };
  totalScore += metricPoints;

  if (metricPoints < 14) {
    suggestions.push('Add quantifiable metrics (percentages, dollar amounts, or numbers) to at least 50% of your experience bullets.');
  }

  // Dimension 2: Action-Verb Strength (Max 15 pts)
  const bulletsWithPowerVerbs = allBullets.filter(b => {
    const first = (b.trim().replace(/^[-*•]\s*/, '').split(' ')[0] || '').toLowerCase();
    return ALL_POWER_VERBS.some(pv => pv.toLowerCase() === first);
  });
  const verbRatio = allBullets.length > 0 ? (bulletsWithPowerVerbs.length / allBullets.length) : 0;
  const verbPoints = Math.round(Math.min(15, verbRatio * 20));
  breakdown.verbs = {
    score: verbPoints,
    max: 15,
    label: 'Action Verb Strength',
    passed: verbPoints >= 11
  };
  totalScore += verbPoints;

  if (verbPoints < 11) {
    suggestions.push('Begin each bullet point with an active verb showing clear ownership (such as Led, Built, Delivered, or Architected).');
  }

  // Dimension 3: Essential Section Completeness (Max 20 pts)
  let completenessPoints = 0;
  if (data.name && data.name.trim().length >= 2) completenessPoints += 3;
  if (data.title && data.title.trim().length >= 2) completenessPoints += 3;
  if (data.summary && data.summary.trim().length >= 25) completenessPoints += 4;
  if (data.experience && data.experience.length >= 1) completenessPoints += 4;
  if (data.education && data.education.length >= 1) completenessPoints += 3;
  if (data.skills && data.skills.length >= 5) completenessPoints += 3;

  breakdown.completeness = {
    score: completenessPoints,
    max: 20,
    label: 'Section Completeness',
    passed: completenessPoints >= 17
  };
  totalScore += completenessPoints;

  if (!data.summary || data.summary.length < 25) suggestions.push('Add a concise 2 to 3 sentence Professional Summary.');
  if (!data.skills || data.skills.length < 5) suggestions.push('Include at least 5 to 8 relevant core skills and technical keywords.');

  // Dimension 4: Contact & Professional Links (Max 15 pts)
  let contactPoints = 0;
  if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) contactPoints += 4;
  if (data.phone && data.phone.trim().length >= 7) contactPoints += 4;
  if (data.location && data.location.trim().length >= 2) contactPoints += 3;
  if (data.linkedin || data.website) contactPoints += 4;

  breakdown.contact = {
    score: contactPoints,
    max: 15,
    label: 'Contact & Online Presence',
    passed: contactPoints >= 11
  };
  totalScore += contactPoints;

  if (!data.linkedin && !data.website) suggestions.push('Add your LinkedIn profile or Portfolio URL to boost recruiter discovery.');

  // Dimension 5: Structure & Conciseness (Max 10 pts)
  let structurePoints = 10;
  const longBullets = allBullets.filter(b => b.length > 280);
  if (longBullets.length > 0) structurePoints -= Math.min(4, longBullets.length * 2);

  const incompleteJobs = (data.experience || []).filter(e => !e.role || !e.company);
  if (incompleteJobs.length > 0) structurePoints -= 4;

  structurePoints = Math.max(2, structurePoints);
  breakdown.structure = {
    score: structurePoints,
    max: 10,
    label: 'Structure & Conciseness',
    passed: structurePoints >= 8
  };
  totalScore += structurePoints;

  // Dimension 6: Layout & ATS Parser Compatibility (Max 20 pts)
  const templateProfile = getTemplateAtsProfile(templateKey);
  const layoutScore = templateProfile.score;
  const layoutPassed = layoutScore >= 16;
  breakdown.layout = {
    score: layoutScore,
    max: 20,
    label: 'Layout & ATS Compatibility',
    layoutType: templateProfile.label,
    tier: templateProfile.tier,
    passed: layoutPassed
  };
  totalScore += layoutScore;

  if (templateProfile.tier === 'corporate' || templateProfile.layout === 'two_column_sidebar') {
    suggestions.push('Multi Column or Sidebar Layout Detected: Legacy ATS parsers (Taleo, iCIMS, older Workday) scan character coordinates across the page, which can scramble sidebar skills and contacts into the work experience stream. Switch to a linear Single Column ATS Ultra template (like Harvard Classic or Silicon Valley ATS) for guaranteed parsing fidelity.');
    if (templateProfile.photo) {
      suggestions.push('Headshot Photo: Many corporate ATS filters and US and UK equal opportunity screeners strip or penalize resumes with photos. Remove photo for automated cold applications.');
    }
  } else if (templateProfile.tier === 'creative' || templateProfile.layout.startsWith('creative')) {
    suggestions.push('Complex Creative Layout: Non standard CSS grids, background polygons, and badge containers may break automated text extraction. Best suited for direct human networking rather than automated ATS portals.');
  }

  // Content Volume Anti-Gaming Guard
  const totalBulletCount = allBullets.length;
  const totalExpEntries = (data.experience || []).length;
  if (totalBulletCount === 0) {
    // No bullets at all - cap metrics, verbs, and structure to reflect actual contribution
    breakdown.metrics.score = 0;
    breakdown.metrics.passed = false;
    breakdown.verbs.score = 0;
    breakdown.verbs.passed = false;
    const cappedStructure = Math.min(structurePoints, 4);
    breakdown.structure.score = cappedStructure;
    breakdown.structure.passed = cappedStructure >= 8; // will always be false since max is 4
    totalScore = completenessPoints + contactPoints + cappedStructure + layoutScore;
  }
  if (totalBulletCount < 3 && totalScore > 65) totalScore = 65;
  if (totalExpEntries === 0 && totalScore > 50) totalScore = 50;

  totalScore = Math.min(100, Math.max(0, totalScore));

  // Synchronize breakdown dimension scores with totalScore so sum(breakdown.score) === totalScore
  const rawBreakdownSum = Object.values(breakdown).reduce((sum, item) => sum + (item.score || 0), 0);
  if (rawBreakdownSum > totalScore) {
    let excess = rawBreakdownSum - totalScore;
    const deductionOrder = ['structure', 'completeness', 'contact', 'layout', 'verbs', 'metrics'];
    for (const key of deductionOrder) {
      if (excess <= 0) break;
      if (breakdown[key] && breakdown[key].score > 0) {
        const deduct = Math.min(excess, breakdown[key].score);
        breakdown[key].score -= deduct;
        excess -= deduct;
      }
    }
  }

  let grade = 'Needs Work';
  let color = '#ef4444';
  if (totalScore >= 90) { grade = 'A+ (Excellent)'; color = '#10b981'; }
  else if (totalScore >= 80) { grade = 'A (Strong ATS Match)'; color = '#10b981'; }
  else if (totalScore >= 70) { grade = 'B (Good Foundation)'; color = '#3b82f6'; }
  else if (totalScore >= 55) { grade = 'C (Fair)'; color = '#f59e0b'; }

  return {
    score: totalScore,
    grade,
    color,
    breakdown,
    templateProfile,
    spatialAnalysis,
    suggestions: suggestions.length > 0 ? suggestions : ['Your resume content and layout are 100% optimized for ATS parsers and human recruiters!'],
    issues: suggestions.length > 0 ? suggestions : ['Your resume content and layout are 100% optimized for ATS parsers and human recruiters!']
  };
}

// ── 5. Job Description ATS Keyword Matcher ──
/**
 * Analyzes a raw job description text against the candidate's resume state,
 * extracting key technical keywords and computing an ATS Match % and missing keyword list.
 */
export function analyzeJobKeywordMatch(data, jobDescriptionText) {
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string' || !jobDescriptionText.trim()) {
    return {
      matchPercentage: 0,
      matchedKeywords: [],
      missingKeywords: [],
      totalKeywordsCount: 0,
      jobSummary: 'Please paste a job description to calculate keyword match.'
    };
  }

  // Known tech skills and industry keywords dictionary for high-precision extraction
  const KNOWN_KEYWORDS = [...new Set([
    'react', 'next.js', 'vue', 'angular', 'typescript', 'javascript', 'html', 'css', 'tailwind', 'sass',
    'node.js', 'express', 'python', 'django', 'fastapi', 'flask', 'java', 'spring boot', 'c++', 'c#', '.net',
    'golang', 'rust', 'ruby', 'rails', 'php', 'laravel', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ci/cd', 'github actions', 'graphql', 'rest api',
    'microservices', 'distributed systems', 'kafka', 'rabbitmq', 'elasticsearch', 'jest', 'cypress', 'playwright',
    'figma', 'ui/ux', 'agile', 'scrum', 'jira', 'product management', 'a/b testing', 'analytics', 'sql',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy', 'spark',
    'cybersecurity', 'siem', 'pentesting', 'nist', 'soc2', 'iso 27001', 'crm', 'salesforce', 'hubspot', 'seo'
  ])];

  const jdLower = jobDescriptionText.toLowerCase();

  function testKeywordPresence(text, kw) {
    // Special characters that break \b: +, #, ., /
    if (/[+#.\/]/.test(kw)) {
      return text.toLowerCase().includes(kw.toLowerCase());
    }
    const regex = new RegExp(`\\b${kw.replace(/[.+*?^$\{\}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  }

  // Extract all matching keywords present in the JD
  const requiredKeywords = KNOWN_KEYWORDS.filter(kw => testKeywordPresence(jdLower, kw));

  if (requiredKeywords.length === 0) {
    return {
      matchPercentage: 0,
      matchedKeywords: [],
      missingKeywords: [],
      totalKeywordsCount: 0,
      jobSummary: 'No recognized industry keywords detected. This matcher is optimized for tech, business, and data roles.'
    };
  }

  // Aggregate all resume text into a single searchable string
  const resumeText = [
    data?.title || '',
    data?.summary || '',
    ...(data?.skills || []),
    ...(data?.experience || []).flatMap(e => [e.company, e.role, ...(e.highlights || [])]),
    ...(data?.education || []).flatMap(edu => [edu.school, edu.degree, edu.note || '']),
    ...(data?.projects || []).flatMap(p => [p.name, p.description || '', ...(p.highlights || [])]),
    ...(data?.certifications || []).map(c => typeof c === 'object' ? c.name || '' : c || ''),
    ...(data?.customSections || []).flatMap(cs => [cs.title || '', ...(cs.items || []).map(it => typeof it === 'object' ? `${it.title || ''} ${it.value || ''}` : it || '')])
  ].join(' ').toLowerCase();

  const matchedKeywords = [];
  const missingKeywords = [];

  for (const kw of requiredKeywords) {
    if (testKeywordPresence(resumeText, kw)) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  const matchPercentage = Math.round((matchedKeywords.length / requiredKeywords.length) * 100);

  return {
    matchPercentage,
    matchedKeywords,
    missingKeywords,
    totalKeywordsCount: requiredKeywords.length,
    jobSummary: `Found ${requiredKeywords.length} key skills in job posting. Matched ${matchedKeywords.length} (${matchPercentage}%).`
  };
}

// ── 6. 1-Click Punctuation & Date Sanitizer ──
/**
 * Automatically cleans and standardizes dates, em-dashes, and punctuation across the resume state.
 */
export function sanitizeResumeTextFormatting(data) {
  if (!data) return data;
  const next = JSON.parse(JSON.stringify(data));

  // Sanitize Experience
  if (Array.isArray(next.experience)) {
    next.experience = next.experience.map(e => {
      let start = (e.start || '').trim().replace(/\s+-\s+/g, ' – ');
      let end = (e.end || '').trim().replace(/\s+-\s+/g, ' – ');
      let company = (e.company || '').trim();
      let role = (e.role || '').trim();
      let highlights = Array.isArray(e.highlights) ? e.highlights.map(h => {
        let clean = String(h || '').trim().replace(/^[•\-\*]\s*/, '').replace(/\s{2,}/g, ' ');
        if (clean && !/[.!?;:]$/.test(clean)) clean = clean.replace(/[,]+$/, '') + '.';
        return clean;
      }).filter(Boolean) : [];

      return { ...e, start, end, company, role, highlights };
    });
  }

  // Sanitize Education
  if (Array.isArray(next.education)) {
    next.education = next.education.map(edu => {
      let start = (edu.start || '').trim().replace(/\s+-\s+/g, ' – ');
      let end = (edu.end || '').trim().replace(/\s+-\s+/g, ' – ');
      let school = (edu.school || '').trim();
      let degree = (edu.degree || '').trim();
      return { ...edu, start, end, school, degree };
    });
  }

  // Sanitize Projects
  if (Array.isArray(next.projects)) {
    next.projects = next.projects.map(p => {
      let name = (p.name || '').trim();
      let desc = (p.description || '').trim();
      if (desc && !/[.!?;:]$/.test(desc)) desc = desc.replace(/[,]+$/, '') + '.';
      let highlights = Array.isArray(p.highlights) ? p.highlights.map(h => {
        let clean = (h || '').trim().replace(/^[•\-\*]\s*/, '').replace(/\s{2,}/g, ' ');
        if (clean && !/[.!?;:]$/.test(clean)) clean = clean.replace(/[,]+$/, '') + '.';
        return clean;
      }).filter(Boolean) : p.highlights;
      return { ...p, name, description: desc, highlights };
    });
  }

  // Sanitize Name & Title
  if (next.name) next.name = next.name.trim().replace(/\s{2,}/g, ' ');
  if (next.title) next.title = next.title.trim().replace(/\s{2,}/g, ' ');

  // Sanitize Summary
  if (next.summary) {
    next.summary = next.summary.trim().replace(/\s{2,}/g, ' ');
    if (next.summary && !/[.!?;:]$/.test(next.summary)) next.summary = next.summary.replace(/[,]+$/, '') + '.';
  }

  // Sanitize Skills (collapse double spaces)
  if (Array.isArray(next.skills)) {
    next.skills = next.skills.map(s => String(s || '').trim().replace(/\s{2,}/g, ' ')).filter(Boolean);
  }

  // Sanitize Custom Sections
  if (Array.isArray(next.customSections)) {
    next.customSections = next.customSections.map(cs => ({
      ...cs,
      title: (cs.title || '').trim(),
      items: Array.isArray(cs.items) ? cs.items.map(it => {
        if (typeof it === 'string') return it.trim().replace(/\s{2,}/g, ' ');
        if (typeof it === 'object' && it !== null) return { ...it, title: (it.title || '').trim(), value: (it.value || '').trim() };
        return it;
      }) : cs.items
    }));
  }

  return next;
}

// ── 7. Smart Page Overflow & Spacing Auto-Tuner ──
/**
 * Uses the exact bin-packing partition math in paginationEngine.js to calculate
 * optimal lineSpacing and pageMargin to fit overflowing content onto 1 clean page.
 */
export function autoTunePageFit(data, currentLineSpacing = 1.4, currentPageMargin = 0) {
  if (!data) return { lineSpacing: currentLineSpacing, pageMargin: currentPageMargin, fitsOnePage: true };

  // 1. Test current layout
  const currentTest = computeTwoPagePartition({ data, lineSpacing: currentLineSpacing, pageMargin: currentPageMargin });
  if (!currentTest.hasPage2) {
    return {
      lineSpacing: currentLineSpacing,
      pageMargin: currentPageMargin,
      fitsOnePage: true,
      appliedTuning: false,
      message: 'Content already fits cleanly onto 1 page.'
    };
  }

  // 2. Iterate through safe compact configurations (spacing: 1.35 -> 1.25, margin: 0 -> 8px)
  const candidateConfigs = [
    { lineSpacing: 1.35, pageMargin: 0 },
    { lineSpacing: 1.30, pageMargin: 0 },
    { lineSpacing: 1.25, pageMargin: 0 },
    { lineSpacing: 1.25, pageMargin: 4 },
    { lineSpacing: 1.22, pageMargin: 6 },
    { lineSpacing: 1.20, pageMargin: 8 }
  ];

  for (const config of candidateConfigs) {
    const test = computeTwoPagePartition({ data, lineSpacing: config.lineSpacing, pageMargin: config.pageMargin });
    if (!test.hasPage2) {
      return {
        lineSpacing: config.lineSpacing,
        pageMargin: config.pageMargin,
        fitsOnePage: true,
        appliedTuning: true,
        message: `Optimized line spacing to ${config.lineSpacing} and margins to fit on 1 page.`
      };
    }
  }

  // Content is genuinely a 2-page document
  return {
    lineSpacing: 1.4,
    pageMargin: 0,
    fitsOnePage: false,
    appliedTuning: false,
    message: 'Content length is optimal for a balanced 2-page document.'
  };
}
