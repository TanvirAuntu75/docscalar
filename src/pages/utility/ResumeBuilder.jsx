import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { apiFetch, uploadFileSecure } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import {
  generateMarianaHtml,
  generateOliviaHtml,
  generateJonathanHtml,
  generateEmmaHtml,
  generateCharlesHtml,
  generateKathleenHtml,
  generateRichardHtml,
  generateSanchezDarkHtml,
  generateWilsonLightHtml,
  generateSanchezMonoHtml,
  generateSanchezWaveHtml,
  generateOngBurgundyHtml,
  generateSchumacherCharcoalHtml,
  generateZivOliveHtml,
  generateAdoraDiagonalHtml,
  generateWilsonMinimalHtml,
  generateAlvaradoSlateHtml
} from '../../engines/utility/resumeTemplates';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const injectPhotoCropStyles = (html, data) => {
  if (data && data.photoCrop) {
    const { scale, x, y } = data.photoCrop;
    const styleInjection = `
      <style>
        .avatar {
          transform: scale(${scale}) translate(${x}px, ${y}px) !important;
          transform-origin: center center !important;
        }
      </style>
    `;
    return html.replace('</head>', `${styleInjection}</head>`);
  }
  return html;
};

const getInitialName = () => {
  try {
    const first = localStorage.getItem('profile_firstName');
    const last = localStorage.getItem('profile_lastName');
    if (first || last) {
      return `${first || ''} ${last || ''}`.trim();
    }
  } catch (e) {}
  return 'Mariana Anderson';
};

// ─── Default Resume Data ───────────────────────────────────────────────────────
const defaultData = {
  name: getInitialName(),
  title: 'Marketing Manager',
  photoUrl: '/images/candidates/candidate_1.jpg',
  photoCrop: { scale: 1, x: 0, y: 0 },
  email: 'hello@reallygreatsite.com',
  phone: '123-456-7890',
  location: '123 Anywhere St., Any City',
  website: 'reallygreatsite.com',
  linkedin: 'linkedin.com/in/mariana-anderson',
  summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque. Sed leo nisl, semper ac hendrerit a, sollicitudin in arcu.',
  experience: [
    {
      id: 'exp1',
      company: 'Ginyard International Co.',
      role: 'Marketing Manager',
      start: '2022',
      end: '2025',
      highlights: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pharetra in lorem at laoreet. Donec hendrerit libero eget est tempor, quis tempus arcu elementum.',
        'In elementum elit at dui tristique feugiat. Mauris convallis, mi at mattis malesuada, neque nulla volutpat dolor, hendrerit faucibus eros nibh ut nunc.',
      ],
    },
    {
      id: 'exp2',
      company: 'Ginyard International Co.',
      role: 'Inside Sales Representative',
      start: '2020',
      end: '2022',
      highlights: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pharetra in lorem at laoreet. Donec hendrerit libero eget est tempor, quis tempus arcu elementum.',
      ],
    },
    {
      id: 'exp3',
      company: 'Ginyard International Co.',
      role: 'Inside Sales Representative',
      start: '2018',
      end: '2020',
      highlights: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pharetra in lorem at laoreet. Donec hendrerit libero eget est tempor, quis tempus arcu elementum.',
      ],
    },
  ],
  education: [
    {
      id: 'edu1',
      school: 'Borcelle University',
      degree: 'Bachelor of Business Management',
      start: '2020',
      end: '2023',
      note: '',
    },
    {
      id: 'edu2',
      school: 'Borcelle University',
      degree: 'Bachelor of Business Management',
      start: '2012',
      end: '2016',
      note: '',
    },
  ],
  skills: ['UI/UX - Expert', 'Visual Design - Expert', 'Wireframes - Advanced', 'Storyboards - Advanced', 'User Flows - Intermediate', 'Process Flows - Intermediate'],
  certifications: ['Certified Digital Marketing Professional (2024)'],
  projects: [
    {
      id: 'proj1',
      name: 'Campaign "Grow"',
      description: 'Led digital marketing campaigns generating 150% ROI and 20k new leads.',
      url: 'ginyard.co/campaign-grow',
    },
  ],
  references: [
    {
      id: 'ref1',
      name: 'Harumi Kobayashi',
      relation: 'Wardiere Inc. / CEO',
      phone: '123-456-7890',
      email: 'hello@reallygreatsite.com'
    },
    {
      id: 'ref2',
      name: 'Bailey Dupont',
      relation: 'Wardiere Inc. / CEO',
      phone: '123-456-7890',
      email: 'hello@reallygreatsite.com'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { id: 'lang1', title: 'English', value: '' },
        { id: 'lang2', title: 'Spanish', value: '' }
      ]
    }
  ]
};

const TEMPLATE_MAP = {
  mariana:       { label: '✨ Mariana',       fn: generateMarianaHtml,       badge: 'Premium Headshot',    photoUrl: '/images/candidates/candidate_1.jpg',  candidateName: 'Mariana Anderson' },
  olivia:        { label: '✨ Olivia',        fn: generateOliviaHtml,        badge: 'Premium Bronze',      photoUrl: '/images/candidates/candidate_3.jpg',  candidateName: 'Olivia Sterling' },
  jonathan:      { label: '✨ Jonathan',      fn: generateJonathanHtml,      badge: 'Classic Serif',       photoUrl: '/images/candidates/candidate_10.jpg', candidateName: 'Jonathan Brewer' },
  emma:          { label: '✨ Emma',          fn: generateEmmaHtml,          badge: 'Balanced Split',      photoUrl: '/images/candidates/candidate_5.jpg',  candidateName: 'Emma Sinclair' },
  charles:       { label: '✨ Charles',       fn: generateCharlesHtml,       badge: 'Ocean Teal',          photoUrl: '/images/candidates/candidate_4.jpg',  candidateName: 'Charles Rodriguez' },
  kathleen:      { label: '✨ Kathleen',      fn: generateKathleenHtml,      badge: 'Modern Accent',       photoUrl: '/images/candidates/candidate_14.jpg', candidateName: 'Kathleen Jenkins' },
  richard:       { label: '✨ Richard',       fn: generateRichardHtml,       badge: 'Split Band',          photoUrl: '/images/candidates/candidate_2.jpg',  candidateName: 'Richard Fowler' },
  sanchez_dark:  { label: '✨ Sanchez Dark',  fn: generateSanchezDarkHtml,  badge: 'Timeline Sidebar',    photoUrl: '/images/candidates/candidate_6.jpg',  candidateName: 'Mateo Sanchez' },
  wilson_light:  { label: '✨ Wilson Light',  fn: generateWilsonLightHtml,  badge: 'Modern Navy',         photoUrl: '/images/candidates/candidate_9.jpg',  candidateName: 'Marcus Wilson' },
  sanchez_mono:  { label: '✨ Sanchez Mono',  fn: generateSanchezMonoHtml,  badge: 'Minimalist Timeline', photoUrl: '/images/candidates/candidate_7.jpg',  candidateName: 'Yuki Sanchez' },
  sanchez_wave:  { label: '✨ Sanchez Wave',  fn: generateSanchezWaveHtml,  badge: 'Elegant Waves',       photoUrl: '/images/candidates/candidate_8.jpg',  candidateName: 'Mei Sanchez' },
  ong_burgundy:  { label: '✨ Howard Burgundy',fn: generateOngBurgundyHtml,  badge: 'Burgundy Classic',    photoUrl: '/images/candidates/candidate_11.jpg', candidateName: 'David Howard' },
  schumacher_charcoal: { label: '✨ Schumacher Charcoal', fn: generateSchumacherCharcoalHtml, badge: 'Curved Headshot', photoUrl: '/images/candidates/candidate_13.jpg', candidateName: 'Layla Schumacher' },
  ziv_olive:     { label: '✨ Catrine Olive',  fn: generateZivOliveHtml,      badge: 'Sage Split',          photoUrl: '/images/candidates/candidate_12.jpg', candidateName: 'Catrine Olive' },
  adora_diagonal: { label: '✨ Adora Diagonal', fn: generateAdoraDiagonalHtml, badge: 'Diagonal Waves',     photoUrl: '/images/candidates/candidate_15.jpg', candidateName: 'Adora Sharma' },
  wilson_minimal: { label: '✨ Wilson Minimal', fn: generateWilsonMinimalHtml, badge: 'Elegant Border',     photoUrl: '/images/candidates/candidate_1.jpg',  candidateName: 'Mariana Wilson' },
  alvarado_slate: { label: '✨ Lorna Slate',    fn: generateAlvaradoSlateHtml, badge: 'Slate Ribbon',        photoUrl: '/images/candidates/candidate_3.jpg',  candidateName: 'Lorna Slate' },
};

// ─── Helper: render preview inside iframe ─────────────────────────────────────
function ResumePreview({ html }) {
  return (
    <iframe
      srcDoc={html}
      title="Resume Preview"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#fff',
        display: 'block',
      }}
      sandbox="allow-same-origin"
    />
  );
}

// ─── Reusable section card ────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '0.45rem 0.65rem',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '70px' };

// Recursively escape string properties to prevent XSS injection in HTML templates
function sanitizeData(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }
  if (obj !== null && typeof obj === 'object') {
    const res = {};
    for (const key in obj) {
      res[key] = sanitizeData(obj[key]);
    }
    return res;
  }
  return obj;
}

// ─── Helper Card for Pixel-Perfect Responsive Scaling ────────────────────────
function TemplateCard({ templateKey, item, defaultData, themeColor, themeFont, setActiveTemplate, setScreen, data, setData }) {
  const [width, setWidth] = useState(250);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Measure the container width
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const cardData = {
    ...defaultData,
    name: item.candidateName || defaultData.name,
    photoUrl: item.photoUrl || '/images/candidates/candidate_1.jpg'
  };

  const rawMarkup = item.fn(cardData, themeColor, themeFont, ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'], 'single', 0, 1.4);
  const previewMarkup = rawMarkup.replace('</head>', '<style>html, body { overflow: hidden !important; }</style></head>');
  const scale = width / 794;

  return (
    <div className="cv-template-card" onClick={() => {
      setActiveTemplate(templateKey);
      setScreen('start');
      if (setData) {
        setData(prev => {
          const isDefaultPhoto = !prev.photoUrl || prev.photoUrl.includes('/images/candidates/') || prev.photoUrl.includes('unsplash.com');
          const defaultNames = Object.values(TEMPLATE_MAP).map(t => t.candidateName);
          defaultNames.push('Mariana Anderson');
          const isDefaultName = !prev.name || defaultNames.includes(prev.name);
          return {
            ...prev,
            ...(isDefaultName ? { name: item.candidateName || prev.name } : {}),
            ...(isDefaultPhoto ? { photoUrl: item.photoUrl || '/images/candidates/candidate_1.jpg' } : {})
          };
        });
      }
    }}>
      <div className="cv-template-badge">{item.badge}</div>
      <div ref={ref} className="cv-template-preview-wrapper">
        <iframe
          srcDoc={previewMarkup}
          title={item.label}
          className="cv-template-preview-iframe"
          scrolling="no"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden'
          }}
        />
        <div className="cv-template-overlay">
          <button className="btn btn-primary" style={{ fontWeight: '700', padding: '0.5rem 1.25rem', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
            Select Template
          </button>
        </div>
      </div>
      <div className="cv-template-card-label">
        <span>{item.label.replace(/^[^\w]*/, '')}</span>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary)' }}>arrow_forward</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResumeBuilder() {
  const [data, setData] = useState(defaultData);
  const [activeTemplate, setActiveTemplate] = useState('mariana');
  const [previewHtml, setPreviewHtml] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [backendActive, setBackendActive] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  // Wizard state hooks
  const [screen, setScreen] = useState('gallery'); // 'gallery' | 'start' | 'editor'
  const [wizardStep, setWizardStep] = useState(0); // 0 to 6 (Contact, Experience, Education, Skills, Summary, Additional, Review)
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | 'width' | '75' | '100' | '125'
  const [modalDimensions, setModalDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 850,
    height: typeof window !== 'undefined' ? window.innerHeight - 150 : 600
  });
  const [iframeHeight, setIframeHeight] = useState(1123);
  const modalViewportRef = useRef(null);

  useEffect(() => {
    if (!fullscreenPreview || !modalViewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setModalDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(modalViewportRef.current);
    return () => observer.disconnect();
  }, [fullscreenPreview]);

  useEffect(() => {
    if (!fullscreenPreview) {
      setIframeHeight(1123);
      setZoomMode('fit');
    }
  }, [fullscreenPreview]);

  const handleIframeLoad = (e) => {
    try {
      const iframe = e.target;
      if (iframe && iframe.contentWindow) {
        const doc = iframe.contentWindow.document;
        const body = doc.body;
        const html = doc.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        setIframeHeight(Math.max(1123, height));
      }
    } catch (err) {
      console.warn("Could not read iframe height", err);
    }
  };

  const [photoAdjustOpen, setPhotoAdjustOpen] = useState(false);
  const [tempCrop, setTempCrop] = useState({ scale: 1.0, x: 0, y: 0 });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setField('photoUrl', reader.result);
        setTempCrop({ scale: 1.0, x: 0, y: 0 });
        setPhotoAdjustOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCropModal = () => {
    setTempCrop({
      scale: data.photoCrop?.scale || 1.0,
      x: data.photoCrop?.x || 0,
      y: data.photoCrop?.y || 0
    });
    setPhotoAdjustOpen(true);
  };

  const handleSaveCrop = () => {
    setField('photoCrop', tempCrop);
    setPhotoAdjustOpen(false);
  };

  // Custom theme & section reordering states
  const [themeColor, setThemeColor] = useState('#3e4e68');
  const [themeFont, setThemeFont] = useState('Inter');
  const [sectionOrder, setSectionOrder] = useState(['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages']);
  const [themeLayout, setThemeLayout] = useState('single'); // 'single' vs 'split'
  const [pageMargin, setPageMargin] = useState(24); // px
  const [lineSpacing, setLineSpacing] = useState(1.4);

  const moveSection = (index, direction) => {
    const nextOrder = [...sectionOrder];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= nextOrder.length) return;
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;
    setSectionOrder(nextOrder);
  };

  const importResumeFromPdf = async (file) => {
    let pdf = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const pageTexts = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const items = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          height: item.height
        }));

        // Sort items by layout coordinates
        const linesMap = {};
        items.forEach(item => {
          const yKey = Math.round(item.y);
          const matchY = Object.keys(linesMap).find(y => Math.abs(Number(y) - yKey) < 3);
          if (matchY) {
            linesMap[matchY].push(item);
          } else {
            linesMap[yKey] = [item];
          }
        });

        const sortedYKeys = Object.keys(linesMap).sort((a, b) => Number(b) - Number(a));
        const pageLines = sortedYKeys.map(yKey => {
          const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);
          return lineItems.map(item => item.text).join(' ');
        });

        pageTexts.push(pageLines.join('\n'));
      }

      fullText = pageTexts.join('\n\n');
      parseAndPopulateResume(fullText);
    } catch (err) {
      alert('Failed to parse PDF resume: ' + err.message);
    } finally {
      if (pdf) {
        try {
          pdf.destroy();
        } catch (e) {}
      }
    }
  };

  const parseAndPopulateResume = (fullText) => {
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const parsed = {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      customSections: []
    };

    parsed.name = lines[0];

    if (lines[1] && lines[1].length < 40 && !lines[1].includes('@') && !lines[1].includes('+')) {
      parsed.title = lines[1];
    }

    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) parsed.email = emailMatch[0];

    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) parsed.phone = phoneMatch[0];

    const linkedinMatch = fullText.match(/(?:linkedin\.com\/in\/[a-zA-Z0-9_-]+|li\/[a-zA-Z0-9_-]+)/);
    if (linkedinMatch) parsed.linkedin = linkedinMatch[0];

    const githubMatch = fullText.match(/github\.com\/[a-zA-Z0-9_-]+/);
    if (githubMatch) parsed.website = githubMatch[0];

    let currentSection = '';
    let expAccumulator = null;
    let eduAccumulator = null;
    let projAccumulator = null;

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      if (/^(summary|professional summary|about|profile|objective)$/.test(lowerLine)) {
        currentSection = 'summary';
        continue;
      }
      if (/^(experience|work experience|employment|history|professional experience)$/.test(lowerLine)) {
        currentSection = 'experience';
        continue;
      }
      if (/^(education|academic|studies)$/.test(lowerLine)) {
        currentSection = 'education';
        continue;
      }
      if (/^(skills|core competencies|technical skills|technologies)$/.test(lowerLine)) {
        currentSection = 'skills';
        continue;
      }
      if (/^(projects|personal projects)$/.test(lowerLine)) {
        currentSection = 'projects';
        continue;
      }
      if (/^(certifications|licenses|certs)$/.test(lowerLine)) {
        currentSection = 'certifications';
        continue;
      }

      if (currentSection === 'summary') {
        parsed.summary += (parsed.summary ? ' ' : '') + line;
      } else if (currentSection === 'experience') {
        const dateRangeMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}).*?(Present|\d{4})/i);
        if (dateRangeMatch && line.length < 100 && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
          if (expAccumulator) {
            parsed.experience.push(expAccumulator);
          }
          let company = line;
          let role = '';
          const parts = line.split(/[–-–,]/);
          if (parts.length > 1) {
            company = parts[0].trim();
            role = parts[1].replace(dateRangeMatch[0], '').trim();
          }
          expAccumulator = {
            id: 'exp_' + Math.random().toString(36).substr(2, 5),
            company,
            role: role || 'Software Engineer',
            start: dateRangeMatch[1] || 'Start',
            end: dateRangeMatch[2] || 'End',
            highlights: []
          };
        } else if (expAccumulator) {
          const cleanedHighlight = line.replace(/^[•\-\*\s]+/, '').trim();
          if (cleanedHighlight) expAccumulator.highlights.push(cleanedHighlight);
        }
      } else if (currentSection === 'education') {
        const dateMatch = line.match(/\d{4}/);
        if ((line.includes('University') || line.includes('College') || line.includes('School') || line.includes('Institute')) && !line.startsWith('•')) {
          if (eduAccumulator) {
            parsed.education.push(eduAccumulator);
          }
          eduAccumulator = {
            id: 'edu_' + Math.random().toString(36).substr(2, 5),
            school: line,
            degree: 'Bachelor of Science',
            start: dateMatch ? dateMatch[0] : '2015',
            end: '2019',
            note: ''
          };
        } else if (eduAccumulator) {
          if (line.match(/(B\.S\.|B\.Sc\.|M\.S\.|M\.Sc\.|Ph\.D\.|Bachelor|Master|Degree)/i)) {
            eduAccumulator.degree = line;
          } else {
            eduAccumulator.note = (eduAccumulator.note ? eduAccumulator.note + ' · ' : '') + line;
          }
        }
      } else if (currentSection === 'skills') {
        const splitSkills = line.split(/[•,;|·\t]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 25);
        parsed.skills.push(...splitSkills);
      } else if (currentSection === 'projects') {
        if (line.length < 50 && !line.startsWith('•') && !line.startsWith('-')) {
          if (projAccumulator) {
            parsed.projects.push(projAccumulator);
          }
          projAccumulator = {
            id: 'proj_' + Math.random().toString(36).substr(2, 5),
            name: line,
            description: '',
            url: ''
          };
        } else if (projAccumulator) {
          projAccumulator.description += (projAccumulator.description ? ' ' : '') + line;
        }
      } else if (currentSection === 'certifications') {
        parsed.certifications.push(line);
      }
    }

    if (expAccumulator) parsed.experience.push(expAccumulator);
    if (eduAccumulator) parsed.education.push(eduAccumulator);
    if (projAccumulator) parsed.projects.push(projAccumulator);

    if (parsed.experience.length === 0) parsed.experience = defaultData.experience;
    if (parsed.education.length === 0) parsed.education = defaultData.education;
    if (parsed.skills.length === 0) parsed.skills = defaultData.skills;

    setData(parsed);
    alert('Resume imported and parsed successfully!');
  };

  const handleExportJson = () => {
    try {
      const sanitized = sanitizeData(data);
      const backup = {
        version: "2.0",
        data: sanitized,
        theme: {
          themeColor,
          themeFont,
          themeLayout,
          pageMargin,
          lineSpacing,
          sectionOrder
        }
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const filename = `${data.name.replace(/\s+/g, '_')}_resume_backup.json`;
      saveAs(blob, filename);
    } catch (err) {
      setError('Failed to export JSON backup.');
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && parsed.data) {
          setData(parsed.data);
          if (parsed.theme) {
            if (parsed.theme.themeColor) setThemeColor(parsed.theme.themeColor);
            if (parsed.theme.themeFont) setThemeFont(parsed.theme.themeFont);
            if (parsed.theme.themeLayout) setThemeLayout(parsed.theme.themeLayout);
            if (parsed.theme.pageMargin) setPageMargin(parsed.theme.pageMargin);
            if (parsed.theme.lineSpacing) setLineSpacing(parsed.theme.lineSpacing);
            if (parsed.theme.sectionOrder && Array.isArray(parsed.theme.sectionOrder)) {
              setSectionOrder(parsed.theme.sectionOrder);
            }
          }
          alert('Resume data and theme successfully imported!');
        } else {
          throw new Error('Invalid resume data structure');
        }
      } catch (err) {
        alert('Failed to parse JSON file. Make sure it is a valid DocForge resume backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const poller = useJobPoller(BACKEND_URL);

  // Check backend
  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(2000) });
        setBackendActive(res.ok);
      } catch { setBackendActive(false); }
    };
    check();
  }, []);

  // Regenerate live preview on any data/template change (debounced to prevent UI typing lag)
  useEffect(() => {
    const handler = setTimeout(() => {
      const generate = TEMPLATE_MAP[activeTemplate]?.fn;
      if (generate) {
        const sanitized = sanitizeData(data);
        const rawHtml = generate(sanitized, themeColor, themeFont, sectionOrder, themeLayout, pageMargin, lineSpacing);
        setPreviewHtml(injectPhotoCropStyles(rawHtml, sanitized));
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [data, activeTemplate, themeColor, themeFont, sectionOrder, themeLayout, pageMargin, lineSpacing]);

  // Handle poller results
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const name = `${data.name.replace(/\s+/g, '_')}_Resume.pdf`;
      setResult({ downloadUrl: poller.result.downloadUrl, name });
      apiFetch(poller.result.downloadUrl).then(r => r.blob()).then(blob => {
        saveFile(name, blob.size, 'application/pdf', 'Resume Builder', blob);
      }).catch(() => {});
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Conversion failed. Ensure the backend server is running.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 50);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, data.name]);

  // Update top-level field
  const setField = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  // Experience helpers
  const setExpField = (id, key, value) => setData(prev => ({
    ...prev,
    experience: prev.experience.map(e => e.id === id ? { ...e, [key]: value } : e),
  }));
  const setExpHighlight = (expId, idx, value) => setData(prev => ({
    ...prev,
    experience: prev.experience.map(e => e.id === expId
      ? { ...e, highlights: e.highlights.map((h, i) => i === idx ? value : h) }
      : e),
  }));
  const addExpHighlight = (expId) => setData(prev => ({
    ...prev,
    experience: prev.experience.map(e => e.id === expId
      ? { ...e, highlights: [...e.highlights, ''] }
      : e),
  }));
  const removeExpHighlight = (expId, idx) => setData(prev => ({
    ...prev,
    experience: prev.experience.map(e => e.id === expId
      ? { ...e, highlights: e.highlights.filter((_, i) => i !== idx) }
      : e),
  }));
  const addExp = () => setData(prev => ({
    ...prev,
    experience: [...prev.experience, { id: `exp${Date.now()}`, company: '', role: '', start: '', end: '', highlights: [''] }],
  }));
  const removeExp = (id) => setData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }));

  // Education helpers
  const setEduField = (id, key, value) => setData(prev => ({
    ...prev,
    education: prev.education.map(e => e.id === id ? { ...e, [key]: value } : e),
  }));
  const addEdu = () => setData(prev => ({
    ...prev,
    education: [...prev.education, { id: `edu${Date.now()}`, school: '', degree: '', start: '', end: '', note: '' }],
  }));
  const removeEdu = (id) => setData(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));

  // Skills helpers
  const [skillInput, setSkillInput] = useState('');
  const addSkill = () => {
    if (!skillInput.trim()) return;
    setData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
    setSkillInput('');
  };
  const removeSkill = (idx) => setData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== idx) }));

  // Project helpers
  const setProjField = (id, key, value) => setData(prev => ({
    ...prev,
    projects: prev.projects.map(p => p.id === id ? { ...p, [key]: value } : p),
  }));
  const addProj = () => setData(prev => ({
    ...prev,
    projects: [...prev.projects, { id: `proj${Date.now()}`, name: '', description: '', url: '' }],
  }));
  const removeProj = (id) => setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));

  // Reference helpers
  const setRefField = (id, key, value) => setData(prev => ({
    ...prev,
    references: (prev.references || []).map(r => r.id === id ? { ...r, [key]: value } : r),
  }));
  const addRef = () => setData(prev => ({
    ...prev,
    references: [...(prev.references || []), { id: `ref${Date.now()}`, name: '', relation: '', phone: '', email: '' }],
  }));
  const removeRef = (id) => setData(prev => ({
    ...prev,
    references: (prev.references || []).filter(r => r.id !== id),
  }));

  // Certification helpers
  const [certInput, setCertInput] = useState('');
  const addCert = () => {
    if (!certInput.trim()) return;
    setData(prev => ({ ...prev, certifications: [...prev.certifications, certInput.trim()] }));
    setCertInput('');
  };
  const removeCert = (idx) => setData(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== idx) }));

  // Export to PDF via Playwright backend
  const handleExport = async () => {
    if (!backendActive) {
      setError('Backend server is not running. Start it with run_project.bat to export PDF.');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const sanitized = sanitizeData(data);
      const rawHtml = TEMPLATE_MAP[activeTemplate].fn(sanitized, themeColor, themeFont, sectionOrder, themeLayout, pageMargin, lineSpacing);
      const htmlContent = injectPhotoCropStyles(rawHtml, sanitized);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([blob], `${data.name.replace(/\s+/g, '_')}_resume.html`, { type: 'text/html' });

      const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
      if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

      setProgress(45);

      const formData = new FormData();
      formData.append('file_id', uploadData.file_id);
      formData.append('filename', uploadData.filename);
      formData.append('target_format', 'pdf');

      const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, { method: 'POST', body: formData });
      if (!convertRes.ok) throw new Error('Failed to queue conversion.');

      const { job_id } = await convertRes.json();
      poller.startPolling(job_id);
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'Export failed.');
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.downloadUrl);
      const blob = await res.blob();
      saveAs(blob, result.name);
    } catch {
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = result.name;
      a.click();
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout 
      toolId="resume-builder" 
      title="Resume & CV Builder" 
      description="Design a beautiful, ATS-friendly resume with live preview templates. Export as a pixel-perfect PDF instantly."
      hideHeader={true}
      hideRelatedTools={true}
    >
      <SEOHead
        title="Free Resume Builder — Live Preview & PDF Export | DocForge"
        description="Build a polished professional resume with live A4 preview, choose from Modern, Classic, or Creative templates. Export an ATS-friendly PDF with one click. 100% free."
      />

      <div className="resume-builder-page" style={{ padding: screen === 'editor' ? '0.75rem' : '1.5rem 1rem' }}>

      {/* ═══ Result Screen ══════════════════════════════════════════════════════ */}
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '1.5rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(0, 110, 45, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-success)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Your Resume is Ready!</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Exported as <strong>{result.name}</strong> with the <strong>{TEMPLATE_MAP[activeTemplate]?.label}</strong> template.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-success btn-lg" onClick={downloadResult} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
              Download PDF
            </button>
            <button className="btn btn-secondary" onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
              Back to Editor
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ══ SCREEN 1: Template Gallery ══════════════════════════════════════ */}
          {screen === 'gallery' && (
            <div style={{ maxWidth: '1500px', margin: '0.25rem auto 1.5rem', padding: '0 1.5rem' }}>


              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Select Your Template</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To get started, select a resume template below. You can change this at any time.</p>
              </div>

              {/* Color swatch row */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose Theme Color</div>
                <div className="cv-color-swatches">
                  {[
                    { color: '#3e4e68', label: 'Slate Blue' },
                    { color: '#a97d5d', label: 'Bronze/Rose' },
                    { color: '#4e5d4c', label: 'Sage Green' },
                    { color: '#2c3549', label: 'Slate Navy' },
                    { color: '#802b3e', label: 'Burgundy' },
                    { color: '#2f2e2d', label: 'Charcoal' },
                  ].map((s) => (
                    <button
                      key={s.color}
                      className={`cv-color-swatch ${themeColor === s.color ? 'active' : ''}`}
                      style={{ backgroundColor: s.color }}
                      onClick={() => setThemeColor(s.color)}
                      title={s.label}
                    />
                  ))}
                </div>
              </div>

              {/* Template Grid */}
              <div className="cv-template-grid">
                {Object.entries(TEMPLATE_MAP).map(([key, item]) => (
                  <TemplateCard
                    key={key}
                    templateKey={key}
                    item={item}
                    defaultData={defaultData}
                    themeColor={themeColor}
                    themeFont={themeFont}
                    setActiveTemplate={setActiveTemplate}
                    setScreen={setScreen}
                    data={data}
                    setData={setData}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ══ SCREEN 2: How to Start ══════════════════════════════════════════ */}
          {screen === 'start' && (
            <div style={{ maxWidth: '800px', margin: '0.5rem auto 2rem', padding: '0 1rem' }}>


              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Choose how to start your resume</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get started quickly with your chosen template: <strong>{TEMPLATE_MAP[activeTemplate]?.label.replace(/^[^\w]*/, '')}</strong></p>
              </div>

              <div className="cv-start-cards">
                <div className="cv-start-card" onClick={() => { setScreen('editor'); setWizardStep(0); }}>
                  <span className="material-symbols-outlined">edit_note</span>
                  <div className="cv-start-title">Create a new resume</div>
                  <div className="cv-start-desc">Start fresh and type your details step by step. Ideal for building a clean new draft.</div>
                  <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }}>Start from scratch</button>
                </div>

                <div className="cv-start-card" style={{ position: 'relative' }} onClick={() => document.getElementById('pdf-resume-start-import').click()}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,110,45,0.12)', color: 'var(--color-success-light)', border: '1px solid rgba(0,110,45,0.2)', borderRadius: '20px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: '700' }}>⚡ Quickest way</div>
                  <span className="material-symbols-outlined">upload_file</span>
                  <div className="cv-start-title">I have already a resume</div>
                  <div className="cv-start-desc">Upload your current resume in PDF format. We will extract the text to pre-fill the forms instantly.</div>
                  <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>Upload & Improve</button>
                  <input
                    type="file"
                    id="pdf-resume-start-import"
                    accept=".pdf"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        await importResumeFromPdf(f);
                        setScreen('editor');
                        setWizardStep(0);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setScreen('gallery')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                  Back to Template Selection
                </button>
              </div>
            </div>
          )}

          {/* ══ SCREEN 3: Tabbed Wizard Editor ══════════════════════════════════ */}
          {screen === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              
              {/* Header Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                border: '1px solid var(--border-medium)',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>Build Your CV</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Create a professional CV that gets you noticed. Auto-sync active.</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={handleExportJson} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>backup</span>
                    Backup JSON
                  </button>
                  <label className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', margin: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>restore</span>
                    Restore JSON
                    <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
                  </label>
                  <button onClick={() => setFullscreenPreview(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                    Full Preview
                  </button>
                  <button onClick={() => setScreen('gallery')} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>dashboard</span>
                    Change Template
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={processing}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {processing ? (
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>download</span>
                    )}
                    {processing ? 'Exporting…' : 'Download CV'}
                  </button>
                </div>
              </div>

              {/* Wizard tab strip */}
              <div className="cv-wizard-tabs">
                {[
                  { label: 'Personal Info', step: 0 },
                  { label: 'Experience', step: 1 },
                  { label: 'Education', step: 2 },
                  { label: 'Skills', step: 3 },
                  { label: 'Summary', step: 4 },
                  { label: 'Additional', step: 5 },
                  { label: 'Review & Design', step: 6 }
                ].map((t) => {
                  const isActive = wizardStep === t.step;
                  const isCompleted = wizardStep > t.step;
                  return (
                    <button
                      key={t.step}
                      className={`cv-wizard-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => setWizardStep(t.step)}
                    >
                      <div className="cv-wizard-tab-number">{isCompleted ? '' : t.step + 1}</div>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '1rem',
                minHeight: 'calc(100vh - 110px)',
              }}>

                {/* Left Panel: Active Wizard Form */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '1.25rem',
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 110px)',
                  justifyContent: 'space-between'
                }}>

                  <div style={{ flex: 1, marginBottom: '1.5rem' }}>
                    {/* Tab Form: Personal Info */}
                    {wizardStep === 0 && (
                      <SectionCard title="Personal Information">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                          <FieldRow label="Full Name"><input style={inputStyle} value={data.name} onChange={e => setField('name', e.target.value)} placeholder="John Doe" /></FieldRow>
                          <FieldRow label="Professional Title"><input style={inputStyle} value={data.title} onChange={e => setField('title', e.target.value)} placeholder="Software Engineer" /></FieldRow>
                          <FieldRow label="Email"><input style={inputStyle} value={data.email} onChange={e => setField('email', e.target.value)} placeholder="john.doe@example.com" /></FieldRow>
                          <FieldRow label="Phone"><input style={inputStyle} value={data.phone} onChange={e => setField('phone', e.target.value)} placeholder="+1 (555) 123-4567" /></FieldRow>
                          <FieldRow label="Location"><input style={inputStyle} value={data.location} onChange={e => setField('location', e.target.value)} placeholder="New York, USA" /></FieldRow>
                          <FieldRow label="LinkedIn (optional)"><input style={inputStyle} value={data.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="linkedin.com/in/johndoe" /></FieldRow>
                          <FieldRow label="Website / Portfolio / GitHub (optional)"><input style={inputStyle} value={data.website} onChange={e => setField('website', e.target.value)} placeholder="johndoe.dev" /></FieldRow>
                          <FieldRow label="Photo / Headshot (optional)">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.2rem' }}>
                              {data.photoUrl ? (
                                <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', background: '#fff', flexShrink: 0 }}>
                                  <img src={data.photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px dashed var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '0.4rem', width: '100%', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                                  <label className="btn btn-secondary" style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.75rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer', margin: 0, border: '1px solid var(--border-medium)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload</span>
                                    Upload Photo
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                  </label>
                                  {data.photoUrl && (
                                    <button onClick={() => setField('photoUrl', '')} className="btn" style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(186,26,26,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(186,26,26,0.2)', borderRadius: '6px', cursor: 'pointer' }} title="Remove Photo">
                                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                    </button>
                                  )}
                                </div>
                                {data.photoUrl && (
                                  <button onClick={openCropModal} className="btn btn-secondary" style={{ width: '100%', padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', border: '1px solid var(--border-medium)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>crop</span>
                                    Adjust Photo Fit
                                  </button>
                                )}
                              </div>
                            </div>
                          </FieldRow>
                        </div>
                      </SectionCard>
                    )}

                    {/* Tab Form: Experience */}
                    {wizardStep === 1 && (
                      <SectionCard title="Work Experience">
                        {data.experience.map((exp) => (
                          <div key={exp.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-primary)', position: 'relative', marginBottom: '0.85rem' }}>
                            <button onClick={() => removeExp(exp.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.65rem' }}>
                              <FieldRow label="Company"><input style={inputStyle} placeholder="e.g. Google" value={exp.company} onChange={e => setExpField(exp.id, 'company', e.target.value)} /></FieldRow>
                              <FieldRow label="Role / Title"><input style={inputStyle} placeholder="e.g. Senior Frontend Developer" value={exp.role} onChange={e => setExpField(exp.id, 'role', e.target.value)} /></FieldRow>
                              <FieldRow label="Start Date"><input style={inputStyle} placeholder="e.g. Jan 2021" value={exp.start} onChange={e => setExpField(exp.id, 'start', e.target.value)} /></FieldRow>
                              <FieldRow label="End Date"><input style={inputStyle} placeholder="e.g. Present" value={exp.end} onChange={e => setExpField(exp.id, 'end', e.target.value)} /></FieldRow>
                            </div>
                            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role Highlights / Accomplishments</div>
                            {exp.highlights.map((h, hIdx) => (
                              <div key={hIdx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                <input style={{ ...inputStyle, flex: 1 }} value={h} onChange={e => setExpHighlight(exp.id, hIdx, e.target.value)} placeholder="Describe key contribution or metric..." />
                                <button onClick={() => removeExpHighlight(exp.id, hIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                              </div>
                            ))}
                            <button onClick={() => addExpHighlight(exp.id)} className="btn btn-secondary" style={{ marginTop: '0.4rem', fontSize: '0.72rem', padding: '0.3rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                              Add Bullet
                            </button>
                          </div>
                        ))}
                        <button onClick={addExp} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.55rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                          Add Work Experience
                        </button>
                      </SectionCard>
                    )}

                    {/* Tab Form: Education */}
                    {wizardStep === 2 && (
                      <SectionCard title="Education">
                        {data.education.map((edu) => (
                          <div key={edu.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-primary)', position: 'relative', marginBottom: '0.85rem' }}>
                            <button onClick={() => removeEdu(edu.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕</button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                              <FieldRow label="School / University"><input style={inputStyle} placeholder="e.g. Stanford University" value={edu.school} onChange={e => setEduField(edu.id, 'school', e.target.value)} /></FieldRow>
                              <FieldRow label="Degree / Field of Study"><input style={inputStyle} placeholder="e.g. M.Sc. Computer Science" value={edu.degree} onChange={e => setEduField(edu.id, 'degree', e.target.value)} /></FieldRow>
                              <FieldRow label="Start Year"><input style={inputStyle} placeholder="e.g. 2018" value={edu.start} onChange={e => setEduField(edu.id, 'start', e.target.value)} /></FieldRow>
                              <FieldRow label="End Year"><input style={inputStyle} placeholder="e.g. 2020" value={edu.end} onChange={e => setEduField(edu.id, 'end', e.target.value)} /></FieldRow>
                              <div style={{ gridColumn: '1/-1' }}>
                                <FieldRow label="Note / Honours / GPA (optional)"><input style={inputStyle} placeholder="e.g. GPA: 3.9 · Graduated with Honours" value={edu.note} onChange={e => setEduField(edu.id, 'note', e.target.value)} /></FieldRow>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button onClick={addEdu} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.55rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                          Add Education
                        </button>
                      </SectionCard>
                    )}

                    {/* Tab Form: Skills */}
                    {wizardStep === 3 && (
                      <SectionCard title="Core Skills & Technologies">
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Add keywords, languages, or tools relevant to your target role to maximize ATS match.</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '36px', marginBottom: '0.75rem' }}>
                          {data.skills.map((s, i) => (
                            <span key={i} style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '20px', fontSize: '0.74rem', fontWeight: '700', padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              {s} <button onClick={() => removeSkill(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input style={{ ...inputStyle, flex: 1 }} value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder="Type skill and level (e.g. Figma - Expert) and press Enter" />
                          <button onClick={addSkill} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Add</button>
                        </div>
                      </SectionCard>
                    )}

                    {/* Tab Form: Summary */}
                    {wizardStep === 4 && (
                      <SectionCard title="Professional Summary">
                        <FieldRow label="About You / Summary Statement">
                          <textarea
                            style={{ ...textareaStyle, minHeight: '120px' }}
                            value={data.summary}
                            onChange={e => setField('summary', e.target.value)}
                            placeholder="Write a brief 2-4 sentence summary of your background, key strengths, and what you aim to bring to a new role..."
                          />
                        </FieldRow>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '0.25rem' }}>
                          {data.summary?.length || 0} characters
                        </div>
                      </SectionCard>
                    )}

                    {/* Tab Form: Additional */}
                    {wizardStep === 5 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* Projects Subcard */}
                        <SectionCard title="Projects">
                          {data.projects.map((proj) => (
                            <div key={proj.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-primary)', position: 'relative', marginBottom: '0.85rem' }}>
                              <button onClick={() => removeProj(proj.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕</button>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <FieldRow label="Project Name"><input style={inputStyle} placeholder="e.g. DocForge" value={proj.name} onChange={e => setProjField(proj.id, 'name', e.target.value)} /></FieldRow>
                                <FieldRow label="URL (optional)"><input style={inputStyle} placeholder="e.g. github.com/username/project" value={proj.url} onChange={e => setProjField(proj.id, 'url', e.target.value)} /></FieldRow>
                                <FieldRow label="Description"><textarea style={textareaStyle} placeholder="Describe the project, tools used, and results..." value={proj.description} onChange={e => setProjField(proj.id, 'description', e.target.value)} /></FieldRow>
                              </div>
                            </div>
                          ))}
                          <button onClick={addProj} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem', width: '100%' }}>+ Add Project</button>
                        </SectionCard>

                        {/* Certifications Subcard */}
                        <SectionCard title="Certifications">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.65rem' }}>
                            {data.certifications.map((c, i) => (
                              <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)' }}>{c}</span>
                                <button onClick={() => removeCert(i)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕</button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <input style={{ ...inputStyle, flex: 1 }} value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCert()} placeholder="e.g. Google UX Design Certificate (2024)" />
                            <button onClick={addCert} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Add</button>
                          </div>
                        </SectionCard>

                        {/* References Subcard */}
                        <SectionCard title="References">
                          {(data.references || []).map((ref) => (
                            <div key={ref.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', background: 'var(--bg-primary)', position: 'relative', marginBottom: '0.85rem' }}>
                              <button onClick={() => removeRef(ref.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕</button>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <FieldRow label="Reference Name"><input style={inputStyle} placeholder="e.g. Harumi Kobayashi" value={ref.name} onChange={e => setRefField(ref.id, 'name', e.target.value)} /></FieldRow>
                                <FieldRow label="Job Title & Company / Relation"><input style={inputStyle} placeholder="e.g. Wardiere Inc. / CEO" value={ref.relation} onChange={e => setRefField(ref.id, 'relation', e.target.value)} /></FieldRow>
                                <FieldRow label="Phone"><input style={inputStyle} placeholder="e.g. 123-456-7890" value={ref.phone} onChange={e => setRefField(ref.id, 'phone', e.target.value)} /></FieldRow>
                                <FieldRow label="Email"><input style={inputStyle} placeholder="e.g. hello@reallygreatsite.com" value={ref.email} onChange={e => setRefField(ref.id, 'email', e.target.value)} /></FieldRow>
                              </div>
                            </div>
                          ))}
                          <button onClick={addRef} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem', width: '100%' }}>+ Add Reference</button>
                        </SectionCard>

                        {/* Custom Sections Subcard */}
                        <SectionCard title="Custom Sections">
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            {(data.customSections || []).map((cs) => (
                              <button
                                key={cs.id}
                                className={`btn btn-secondary ${activeSection === cs.id ? 'active' : ''}`}
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderColor: activeSection === cs.id ? 'var(--color-primary)' : 'var(--border-subtle)' }}
                                onClick={() => setActiveSection(cs.id)}
                              >
                                {cs.title || 'Custom'}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                const newId = `custom_${Date.now()}`;
                                setData(prev => ({
                                  ...prev,
                                  customSections: [...(prev.customSections || []), { id: newId, title: 'Languages', items: [{ id: `item_${Date.now()}`, title: '', value: '' }] }]
                                }));
                                setSectionOrder(prev => [...prev, newId]);
                                setActiveSection(newId);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--color-success-light)' }}
                            >
                              + Add Custom Section
                            </button>
                          </div>

                          {activeSection.startsWith('custom_') && (() => {
                            const currentSec = data.customSections?.find(cs => cs.id === activeSection);
                            if (!currentSec) return null;
                            return (
                              <div style={{ border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.85rem', background: 'var(--bg-primary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.85rem' }}>
                                  <FieldRow label="Section Title">
                                    <input style={inputStyle} value={currentSec.title} onChange={(e) => { const val = e.target.value; setData(prev => ({ ...prev, customSections: prev.customSections.map(cs => cs.id === currentSec.id ? { ...cs, title: val } : cs) })); }} placeholder="e.g. Languages" />
                                  </FieldRow>
                                  <button onClick={() => { setData(prev => ({ ...prev, customSections: prev.customSections.filter(cs => cs.id !== currentSec.id) })); setSectionOrder(prev => prev.filter(id => id !== currentSec.id)); setActiveSection('personal'); }} className="btn btn-secondary" style={{ height: '35px', padding: '0 0.75rem', borderColor: '#ef4444', color: '#ef4444' }}>Delete</button>
                                </div>
                                {currentSec.items.map((item, idx) => (
                                  <div key={item.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.45rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <input style={inputStyle} value={item.title} onChange={(e) => { const val = e.target.value; setData(prev => ({ ...prev, customSections: prev.customSections.map(cs => cs.id === currentSec.id ? { ...cs, items: cs.items.map(it => it.id === item.id ? { ...it, title: val } : it) } : cs) })); }} placeholder="e.g. English" />
                                    <input style={inputStyle} value={item.value} onChange={(e) => { const val = e.target.value; setData(prev => ({ ...prev, customSections: prev.customSections.map(cs => cs.id === currentSec.id ? { ...cs, items: cs.items.map(it => it.id === item.id ? { ...it, value: val } : it) } : cs) })); }} placeholder="e.g. Fluent" />
                                    <button onClick={() => { setData(prev => ({ ...prev, customSections: prev.customSections.map(cs => cs.id === currentSec.id ? { ...cs, items: cs.items.filter(it => it.id !== item.id) } : cs) })); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                                  </div>
                                ))}
                                <button onClick={() => { setData(prev => ({ ...prev, customSections: prev.customSections.map(cs => cs.id === currentSec.id ? { ...cs, items: [...cs.items, { id: `item_${Date.now()}`, title: '', value: '' }] } : cs) })); }} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', marginTop: '0.4rem' }}>+ Add Item</button>
                              </div>
                            );
                          })()}
                        </SectionCard>
                      </div>
                    )}

                    {/* Tab Form: Design & Review */}
                    {wizardStep === 6 && (
                      <SectionCard title="Design & Review Options">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                          <FieldRow label="Accent Color">
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                                style={{ width: '30px', height: '30px', border: '2px solid var(--border-medium)', borderRadius: '6px', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}
                              />
                              <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                                style={{ ...inputStyle, padding: '0.25rem 0.5rem', fontSize: '0.73rem', fontFamily: 'monospace' }}
                              />
                            </div>
                          </FieldRow>
                          <FieldRow label="Font Family">
                            <select value={themeFont} onChange={(e) => setThemeFont(e.target.value)}
                              style={{ ...inputStyle, padding: '0.35rem 0.5rem', fontSize: '0.73rem', cursor: 'pointer' }}>
                              <option value="Inter">Inter — Sleek Sans</option>
                              <option value="Open Sans">Open Sans — Warm</option>
                              <option value="Outfit">Outfit — Geometric</option>
                              <option value="Merriweather">Merriweather — Serif</option>
                              <option value="Roboto">Roboto — Clean Tech</option>
                            </select>
                          </FieldRow>
                          <FieldRow label="Layout Grid">
                            <select value={themeLayout} onChange={(e) => setThemeLayout(e.target.value)}
                              style={{ ...inputStyle, padding: '0.35rem 0.5rem', fontSize: '0.73rem', cursor: 'pointer' }}>
                              <option value="single">Single Column</option>
                              <option value="split">Two-Column Split</option>
                            </select>
                          </FieldRow>
                          <FieldRow label={`Page Margins (${pageMargin}px)`}>
                            <input type="range" min="10" max="45" value={pageMargin} onChange={(e) => setPageMargin(parseInt(e.target.value))}
                              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
                          </FieldRow>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FieldRow label={`Line Spacing (${lineSpacing})`}>
                              <input type="range" min="1.1" max="1.9" step="0.1" value={lineSpacing} onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
                            </FieldRow>
                          </div>
                        </div>

                        {/* Section reorder list */}
                        <div style={{ marginTop: '0.85rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>swap_vert</span>
                            Drag-Reorder Resume Sections
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {sectionOrder.map((secId, idx) => {
                              const labels = { summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Projects', certifications: 'Certifications' };
                              const custom = data.customSections?.find(c => c.id === secId);
                              const label = labels[secId] || (custom?.title || 'Custom');
                              return (
                                <div key={secId} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                  <span>{label}</span>
                                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 0.8, fontSize: '0.65rem' }}>▲</button>
                                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx === sectionOrder.length - 1 ? 0.3 : 0.8, fontSize: '0.65rem' }}>▼</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </SectionCard>
                    )}
                  </div>

                  {/* Wizard Bottom Navigation Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: '1rem'
                  }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setWizardStep(prev => Math.max(0, prev - 1))}
                      disabled={wizardStep === 0}
                      style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                      Back
                    </button>

                    {wizardStep < 6 ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                        style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}
                      >
                        Next Step
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-success"
                        onClick={handleExport}
                        disabled={processing}
                        style={{ padding: '0.45rem 1.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800' }}
                      >
                        {processing ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                        )}
                        {processing ? 'Generating PDF…' : 'Export & Download PDF'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel: Sticky Live Preview */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#12121e',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '0.75rem',
                  position: 'sticky',
                  top: '10px',
                  height: 'calc(100vh - 110px)',
                  overflow: 'hidden',
                  gap: '0.5rem',
                }}>
                  {/* Status updates / Alerts */}
                  {!backendActive && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                      Backend server is Client Side. PDF export requires running <strong>run_project.bat</strong>.
                    </div>
                  )}

                  {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.72rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span>
                      {error}
                    </div>
                  )}

                  {processing && (
                    <div style={{ marginBottom: '0.5rem', flexShrink: 0 }}>
                      <div style={{ height: '3px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.2rem' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gradient-primary)', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Rendering PDF... {progress}%</div>
                    </div>
                  )}

                  {/* Preview Paper */}
                  <div className="cv-preview-paper">
                    <ResumePreview html={previewHtml} />
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}

      </div>{/* end .resume-builder-page */}

      {/* ═══ Fullscreen Preview Modal ══════════════════════════════════════════ */}
      {/* ═══ Fullscreen Preview Modal ══════════════════════════════════════════ */}
      {fullscreenPreview && createPortal((() => {
        let scale = 1;
        const targetW = 794;
        const targetH = iframeHeight;
        const padding = 32;

        if (modalDimensions.width && modalDimensions.height) {
          const maxW = modalDimensions.width - padding;
          const maxH = modalDimensions.height - padding;

          if (zoomMode === 'fit') {
            scale = Math.min(maxW / targetW, maxH / targetH);
          } else if (zoomMode === 'width') {
            scale = maxW / targetW;
          } else if (zoomMode === '75') {
            scale = 0.75;
          } else if (zoomMode === '100') {
            scale = 1.0;
          } else if (zoomMode === '125') {
            scale = 1.25;
          }
        }
        
        scale = Math.max(0.15, Math.min(scale, 2.0));

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 17, 23, 0.96)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 1.5rem',
          }}>
            {/* Control Header */}
            <div style={{
              width: '100%',
              maxWidth: '950px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>pageview</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>Full CV Preview ({TEMPLATE_MAP[activeTemplate]?.label.replace(/^[^\w]*/, '')})</span>
              </div>
              
              {/* Zoom Controls Capsule */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.15rem',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '0.25rem',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                {[
                  { key: 'fit', label: 'Fit Page' },
                  { key: 'width', label: 'Fit Width' },
                  { key: '75', label: '75%' },
                  { key: '100', label: '100%' },
                  { key: '125', label: '125%' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setZoomMode(opt.key)}
                    style={{
                      background: zoomMode === opt.key ? 'var(--color-primary)' : 'transparent',
                      color: zoomMode === opt.key ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button 
                  onClick={handleExport} 
                  disabled={processing}
                  className="btn btn-primary" 
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {processing ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '15px' }}>sync</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                  )}
                  {processing ? 'Exporting…' : 'Download CV'}
                </button>
                <button 
                  onClick={() => setFullscreenPreview(false)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#374151', color: '#fff', border: 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                  Close
                </button>
              </div>
            </div>

            {/* Modal Viewport Container */}
            <div 
              ref={modalViewportRef}
              style={{
                width: '100%',
                maxWidth: '950px',
                flex: 1,
                display: 'flex',
                alignItems: zoomMode === 'fit' ? 'center' : 'flex-start',
                justifyContent: 'center',
                overflow: 'auto',
                minHeight: 0,
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Scaled A4 page wrapper */}
              <div style={{
                width: `${targetW * scale}px`,
                height: `${targetH * scale}px`,
                transition: 'width 0.15s ease-out, height 0.15s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fff',
                flexShrink: 0,
                position: 'relative',
              }}>
                <iframe
                  srcDoc={previewHtml}
                  onLoad={handleIframeLoad}
                  title="Full CV Preview Frame"
                  scrolling="no"
                  style={{
                    width: `${targetW}px`,
                    height: `${targetH}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    border: 'none',
                    background: '#fff',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* ═══ Photo Crop / Adjustment Modal ════════════════════════════════════ */}
      {photoAdjustOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 17, 23, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '450px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            color: 'var(--text-primary)',
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Adjust Profile Photo</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zoom and position your photo to fit the circular frame perfectly.</div>
            </div>

            {/* Circular Preview Mask */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '1rem 0',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px dashed var(--border-subtle)',
            }}>
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--color-primary)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                background: '#fff',
                position: 'relative',
              }}>
                <img 
                  src={data.photoUrl} 
                  alt="Adjustment Preview" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${tempCrop.scale}) translate(${tempCrop.x}px, ${tempCrop.y}px)`,
                    transformOrigin: 'center center',
                    transition: 'none',
                  }}
                />
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  <span>Zoom / Scale</span>
                  <span>{tempCrop.scale.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.02" 
                  value={tempCrop.scale} 
                  onChange={e => setTempCrop(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  <span>Horizontal Position (X)</span>
                  <span>{tempCrop.x}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={tempCrop.x} 
                  onChange={e => setTempCrop(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  <span>Vertical Position (Y)</span>
                  <span>{tempCrop.y}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={tempCrop.y} 
                  onChange={e => setTempCrop(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleSaveCrop}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.55rem', fontWeight: '700', fontSize: '0.8rem' }}
              >
                Apply Fitting
              </button>
              <button 
                onClick={() => {
                  setPhotoAdjustOpen(false);
                }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem', background: '#374151', color: '#fff', border: 'none' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
