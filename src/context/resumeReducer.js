// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Studio Central State Reducer
// ═══════════════════════════════════════════════════════════════════════════════

import { applyInlineFieldEdit } from '../engines/utility/wysiwygStateEngine.js';

const getInitialName = () => {
  if (typeof window !== 'undefined') {
    try {
      const first = localStorage.getItem('profile_firstName');
      const last = localStorage.getItem('profile_lastName');
      if (first || last) {
        return `${first || ''} ${last || ''}`.trim();
      }
    } catch (_) {}
  }
  return 'Mariana Anderson';
};

export const defaultData = {
  name: getInitialName(),
  title: 'Marketing Manager',
  photoUrl: '/images/candidates/mariana.jpg',
  photoCrop: { scale: 1.0, x: 0, y: 0, rotate: 0, filter: 'none' },
  email: 'hello@reallygreatsite.com',
  phone: '+123-456-7890',
  location: '123 Anywhere St., Any City',
  website: 'reallygreatsite.com',
  linkedin: 'linkedin.com/in/mariana-anderson',
  github: '',
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
      note: 'GPA: 3.9 / 4.0 · Dean’s Honor List',
      gpa: '3.9'
    },
    {
      id: 'edu2',
      school: 'Borcelle University',
      degree: 'Bachelor of Science in Business & Marketing',
      start: '2014',
      end: '2018',
      note: 'Graduated Magna Cum Laude · GPA: 3.85 / 4.0',
      gpa: '3.85'
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
      title: 'Campaign "Grow"',
      description: 'Scaled enterprise pipeline generating 150% ROI and 25,000 qualified marketing leads within 9 months.',
      url: 'ginyard.co/campaign-grow'
    },
    {
      id: 'proj2',
      name: 'Brand Replatforming',
      title: 'Brand Replatforming',
      description: 'Redesigned corporate identity and digital asset library, increasing customer NPS by 18 points.',
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
  ],
  sectionTitles: {
    summary: 'About Me',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Expertise',
    projects: 'Projects',
    certifications: 'Certifications',
    references: 'References'
  }
};

export const initialResumeState = {
  data: { ...defaultData },
  theme: {
    activeTemplate: 'mariana',
    themeColor: 'default',
    themeFont: 'Inter',
    themeLayout: 'auto', // 'auto' | 'single' | 'split'
    pageMargin: 24,        // px (10 to 45)
    lineSpacing: 1.4,      // (1.1 to 1.9)
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references', 'custom_languages']
  },
  ui: {
    screen: 'gallery',     // 'gallery' | 'start' | 'editor'
    wizardStep: 0,         // 0 to 7
    activeSection: 'personal',
    directEdit: false,
    fullscreenPreview: false,
    zoomMode: 'fit',
    atsModalOpen: false,
    atsModalTab: 'health',
    photoStudioOpen: false,
    jsonModalOpen: false,
    templateGalleryOpen: false,
    templateCategoryFilter: 'all',
    visibleTemplateCount: 20
  },
  runtime: {
    previewHtml: '',
    draftSaved: true,
    processing: false,
    progress: 0,
    result: null,
    error: null,
    backendActive: false
  }
};

export const ACTION_TYPES = {
  // Top-level fields
  SET_FIELD: 'RESUME/SET_FIELD',
  
  // Experience
  SET_EXP_FIELD: 'RESUME/SET_EXP_FIELD',
  ADD_EXPERIENCE: 'RESUME/ADD_EXPERIENCE',
  REMOVE_EXPERIENCE: 'RESUME/REMOVE_EXPERIENCE',
  SET_EXP_HIGHLIGHT: 'RESUME/SET_EXP_HIGHLIGHT',
  ADD_EXP_HIGHLIGHT: 'RESUME/ADD_EXP_HIGHLIGHT',
  REMOVE_EXP_HIGHLIGHT: 'RESUME/REMOVE_EXP_HIGHLIGHT',
  
  // Education
  SET_EDU_FIELD: 'RESUME/SET_EDU_FIELD',
  ADD_EDUCATION: 'RESUME/ADD_EDUCATION',
  REMOVE_EDUCATION: 'RESUME/REMOVE_EDUCATION',
  
  // Skills
  ADD_SKILL: 'RESUME/ADD_SKILL',
  REMOVE_SKILL: 'RESUME/REMOVE_SKILL',
  SET_SKILLS: 'RESUME/SET_SKILLS',
  
  // Projects
  SET_PROJ_FIELD: 'RESUME/SET_PROJ_FIELD',
  ADD_PROJECT: 'RESUME/ADD_PROJECT',
  REMOVE_PROJECT: 'RESUME/REMOVE_PROJECT',
  
  // Certifications & References
  ADD_CERTIFICATION: 'RESUME/ADD_CERTIFICATION',
  REMOVE_CERTIFICATION: 'RESUME/REMOVE_CERTIFICATION',
  SET_REF_FIELD: 'RESUME/SET_REF_FIELD',
  ADD_REFERENCE: 'RESUME/ADD_REFERENCE',
  REMOVE_REFERENCE: 'RESUME/REMOVE_REFERENCE',
  
  // Custom Sections & Titles
  ADD_CUSTOM_SECTION: 'RESUME/ADD_CUSTOM_SECTION',
  UPDATE_CUSTOM_SECTION_TITLE: 'RESUME/UPDATE_CUSTOM_SECTION_TITLE',
  UPDATE_CUSTOM_SECTION_ITEM: 'RESUME/UPDATE_CUSTOM_SECTION_ITEM',
  REMOVE_CUSTOM_SECTION: 'RESUME/REMOVE_CUSTOM_SECTION',
  SET_SECTION_TITLE: 'RESUME/SET_SECTION_TITLE',
  SET_SECTION_ORDER: 'RESUME/SET_SECTION_ORDER',
  MOVE_SECTION: 'RESUME/MOVE_SECTION',
  
  // Theme & Styling
  SET_THEME_COLOR: 'THEME/SET_COLOR',
  SET_THEME_FONT: 'THEME/SET_FONT',
  SET_THEME_LAYOUT: 'THEME/SET_LAYOUT',
  SET_PAGE_MARGIN: 'THEME/SET_PAGE_MARGIN',
  SET_LINE_SPACING: 'THEME/SET_LINE_SPACING',
  SET_ACTIVE_TEMPLATE: 'THEME/SET_ACTIVE_TEMPLATE',
  
  // UI & Modals
  SET_SCREEN: 'UI/SET_SCREEN',
  SET_WIZARD_STEP: 'UI/SET_WIZARD_STEP',
  SET_ACTIVE_SECTION: 'UI/SET_ACTIVE_SECTION',
  SET_DIRECT_EDIT: 'UI/SET_DIRECT_EDIT',
  SET_MODAL_STATE: 'UI/SET_MODAL_STATE',
  SET_TEMPLATE_FILTER: 'UI/SET_TEMPLATE_FILTER',
  SET_ZOOM_MODE: 'UI/SET_ZOOM_MODE',
  
  // Runtime & Preview
  SET_PREVIEW_HTML: 'RUNTIME/SET_PREVIEW_HTML',
  SET_DRAFT_SAVED: 'RUNTIME/SET_DRAFT_SAVED',
  SET_PROCESSING: 'RUNTIME/SET_PROCESSING',
  SET_PROGRESS: 'RUNTIME/SET_PROGRESS',
  SET_RESULT: 'RUNTIME/SET_RESULT',
  SET_ERROR: 'RUNTIME/SET_ERROR',
  SET_BACKEND_ACTIVE: 'RUNTIME/SET_BACKEND_ACTIVE',
  
  // Compound / High-Level Mutations
  APPLY_INLINE_EDIT: 'RESUME/APPLY_INLINE_EDIT',
  AUTO_SANITIZE: 'RESUME/AUTO_SANITIZE',
  AUTO_TUNE_PAGE_FIT: 'RESUME/AUTO_TUNE_PAGE_FIT',
  IMPORT_DATA: 'RESUME/IMPORT_DATA',
  RESET_DRAFT: 'RESUME/RESET_DRAFT',
  
  // History Actions
  UNDO: 'HISTORY/UNDO',
  REDO: 'HISTORY/REDO'
};

/**
 * Pure state reducer for DocScalar Resume Studio
 */
export function resumeReducer(state, action) {
  if (!action || !action.type) return state;

  switch (action.type) {
    // ── Top-level Fields ──
    case ACTION_TYPES.SET_FIELD:
    case 'RESUME/SET_FIELD': {
      const { field, value } = action.payload || {};
      if (!field) return state;
      return {
        ...state,
        data: {
          ...state.data,
          [field]: value
        },
        runtime: {
          ...state.runtime,
          draftSaved: false
        }
      };
    }

    // ── Experience ──
    case ACTION_TYPES.ADD_EXPERIENCE:
    case 'RESUME/ADD_EXPERIENCE': {
      const newEntry = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        company: 'Company / Organization',
        role: 'Job Role / Title',
        start: '2022',
        end: 'PRESENT',
        highlights: ['Led key initiatives and exceeded delivery targets by 25%.']
      };
      return {
        ...state,
        data: {
          ...state.data,
          experience: [...(state.data?.experience || []), newEntry]
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_EXPERIENCE:
    case 'RESUME/REMOVE_EXPERIENCE': {
      const { id, index } = action.payload || {};
      const currentExp = state.data?.experience || [];
      const updatedExp = currentExp.filter((e, idx) => {
        if (id !== undefined && e.id === id) return false;
        if (index !== undefined && idx === index) return false;
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          experience: updatedExp
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_EXP_FIELD:
    case 'RESUME/SET_EXP_FIELD': {
      const { index, field, value } = action.payload || {};
      if (index === undefined || !field || !state.data?.experience?.[index]) return state;
      const updatedExp = [...state.data.experience];
      updatedExp[index] = {
        ...updatedExp[index],
        [field]: value
      };
      return {
        ...state,
        data: {
          ...state.data,
          experience: updatedExp
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.ADD_EXP_HIGHLIGHT:
    case 'RESUME/ADD_EXP_HIGHLIGHT': {
      const { expIndex, highlightIndex } = action.payload || {};
      if (expIndex === undefined || !state.data?.experience?.[expIndex]) return state;
      const updatedExp = [...state.data.experience];
      const targetExp = { ...updatedExp[expIndex] };
      const highlights = [...(targetExp.highlights || [])];

      if (typeof highlightIndex === 'number' && highlightIndex >= 0 && highlightIndex <= highlights.length) {
        highlights.splice(highlightIndex, 0, '');
      } else {
        highlights.push('');
      }

      targetExp.highlights = highlights;
      updatedExp[expIndex] = targetExp;
      return {
        ...state,
        data: {
          ...state.data,
          experience: updatedExp
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_EXP_HIGHLIGHT:
    case 'RESUME/SET_EXP_HIGHLIGHT': {
      const { expIndex, highlightIndex, value } = action.payload || {};
      if (expIndex === undefined || highlightIndex === undefined || !state.data?.experience?.[expIndex]) return state;
      const updatedExp = [...state.data.experience];
      const targetExp = { ...updatedExp[expIndex] };
      const highlights = [...(targetExp.highlights || [])];
      highlights[highlightIndex] = value !== undefined ? value : '';
      targetExp.highlights = highlights;
      updatedExp[expIndex] = targetExp;
      return {
        ...state,
        data: {
          ...state.data,
          experience: updatedExp
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_EXP_HIGHLIGHT:
    case 'RESUME/REMOVE_EXP_HIGHLIGHT': {
      const { expIndex, highlightIndex } = action.payload || {};
      if (expIndex === undefined || highlightIndex === undefined || !state.data?.experience?.[expIndex]) return state;
      const updatedExp = [...state.data.experience];
      const targetExp = { ...updatedExp[expIndex] };
      const highlights = (targetExp.highlights || []).filter((_, idx) => idx !== highlightIndex);
      targetExp.highlights = highlights;
      updatedExp[expIndex] = targetExp;
      return {
        ...state,
        data: {
          ...state.data,
          experience: updatedExp
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Education ──
    case ACTION_TYPES.ADD_EDUCATION:
    case 'RESUME/ADD_EDUCATION': {
      const newEdu = {
        id: 'edu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        school: 'University Name',
        degree: 'Degree Title / Field of Study',
        start: '2018',
        end: '2022',
        note: 'Dean’s Honor List · GPA: 3.8 / 4.0',
        gpa: ''
      };
      return {
        ...state,
        data: {
          ...state.data,
          education: [...(state.data?.education || []), newEdu]
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_EDUCATION:
    case 'RESUME/REMOVE_EDUCATION': {
      const { id, index } = action.payload || {};
      const currentEdu = state.data?.education || [];
      const updatedEdu = currentEdu.filter((e, idx) => {
        if (id !== undefined && e.id === id) return false;
        if (index !== undefined && idx === index) return false;
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          education: updatedEdu
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_EDU_FIELD:
    case 'RESUME/SET_EDU_FIELD': {
      const { index, field, value } = action.payload || {};
      if (index === undefined || !field || !state.data?.education?.[index]) return state;
      const updatedEdu = [...state.data.education];
      updatedEdu[index] = {
        ...updatedEdu[index],
        [field]: value
      };
      return {
        ...state,
        data: {
          ...state.data,
          education: updatedEdu
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Skills ──
    case ACTION_TYPES.ADD_SKILL:
    case 'RESUME/ADD_SKILL': {
      const raw = action.payload;
      if (!raw) return state;
      const currentSkills = [...(state.data?.skills || [])];
      
      const newSkills = typeof raw === 'string'
        ? raw.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 0)
        : Array.isArray(raw)
        ? raw.map(s => (typeof s === 'string' ? s.trim() : '')).filter(s => s.length > 0)
        : [];

      newSkills.forEach(skill => {
        // Case-insensitive deduplication check
        const exists = currentSkills.some(s => s.toLowerCase() === skill.toLowerCase());
        if (!exists) {
          currentSkills.push(skill);
        }
      });

      return {
        ...state,
        data: {
          ...state.data,
          skills: currentSkills
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_SKILL:
    case 'RESUME/REMOVE_SKILL': {
      const target = action.payload;
      const currentSkills = state.data?.skills || [];
      const updatedSkills = currentSkills.filter((s, idx) => {
        if (typeof target === 'number') return idx !== target;
        if (typeof target === 'string') return s !== target && s.toLowerCase() !== target.toLowerCase();
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          skills: updatedSkills
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_SKILLS:
    case 'RESUME/SET_SKILLS': {
      const skills = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        data: {
          ...state.data,
          skills
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Projects ──
    case ACTION_TYPES.ADD_PROJECT:
    case 'RESUME/ADD_PROJECT': {
      const newProj = {
        id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: 'Project Name',
        title: 'Project Name',
        description: 'Describe the project architecture, tech stack, and key metrics achieved.',
        url: ''
      };
      return {
        ...state,
        data: {
          ...state.data,
          projects: [...(state.data?.projects || []), newProj]
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_PROJECT:
    case 'RESUME/REMOVE_PROJECT': {
      const { id, index } = action.payload || {};
      const currentProj = state.data?.projects || [];
      const updatedProj = currentProj.filter((p, idx) => {
        if (id !== undefined && p.id === id) return false;
        if (index !== undefined && idx === index) return false;
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          projects: updatedProj
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_PROJ_FIELD:
    case 'RESUME/SET_PROJ_FIELD': {
      const { index, field, value } = action.payload || {};
      if (index === undefined || !field || !state.data?.projects?.[index]) return state;
      const updatedProj = [...state.data.projects];
      const target = { ...updatedProj[index], [field]: value };
      if (field === 'title') target.name = value;
      if (field === 'name') target.title = value;
      updatedProj[index] = target;
      return {
        ...state,
        data: {
          ...state.data,
          projects: updatedProj
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Certifications & References ──
    case ACTION_TYPES.ADD_CERTIFICATION:
    case 'RESUME/ADD_CERTIFICATION': {
      const raw = action.payload;
      if (!raw) return state;
      const certString = typeof raw === 'string' ? raw.trim() : (raw.title || '');
      if (!certString) return state;
      return {
        ...state,
        data: {
          ...state.data,
          certifications: [...(state.data?.certifications || []), certString]
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_CERTIFICATION:
    case 'RESUME/REMOVE_CERTIFICATION': {
      const target = action.payload;
      const current = state.data?.certifications || [];
      const updated = current.filter((c, idx) => {
        if (typeof target === 'number') return idx !== target;
        if (typeof target === 'string') return c !== target;
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          certifications: updated
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.ADD_REFERENCE:
    case 'RESUME/ADD_REFERENCE': {
      const newRef = {
        id: 'ref_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: 'Professional Reference',
        relation: 'Organization / Designation',
        phone: '+1 (555) 000-0000',
        email: 'reference@organization.com'
      };
      return {
        ...state,
        data: {
          ...state.data,
          references: [...(state.data?.references || []), newRef]
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_REFERENCE:
    case 'RESUME/REMOVE_REFERENCE': {
      const { id, index } = action.payload || {};
      const current = state.data?.references || [];
      const updated = current.filter((r, idx) => {
        if (id !== undefined && r.id === id) return false;
        if (index !== undefined && idx === index) return false;
        return true;
      });
      return {
        ...state,
        data: {
          ...state.data,
          references: updated
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_REF_FIELD:
    case 'RESUME/SET_REF_FIELD': {
      const { index, field, value } = action.payload || {};
      if (index === undefined || !field || !state.data?.references?.[index]) return state;
      const updated = [...state.data.references];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return {
        ...state,
        data: {
          ...state.data,
          references: updated
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Custom Sections & Titles ──
    case ACTION_TYPES.ADD_CUSTOM_SECTION:
    case 'RESUME/ADD_CUSTOM_SECTION': {
      const payload = action.payload || {};
      const secId = payload.id || ('custom_' + Date.now());
      const newSec = {
        id: secId,
        title: payload.title || 'Custom Section',
        items: Array.isArray(payload.items) ? payload.items : [{ id: 'item_1', title: 'Item Title', value: 'Details' }]
      };
      const currentCustom = [...(state.data?.customSections || []), newSec];
      const currentOrder = [...(state.theme?.sectionOrder || [])];
      if (!currentOrder.includes(secId)) {
        currentOrder.push(secId);
      }
      return {
        ...state,
        data: {
          ...state.data,
          customSections: currentCustom
        },
        theme: {
          ...state.theme,
          sectionOrder: currentOrder
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.UPDATE_CUSTOM_SECTION_TITLE:
    case 'RESUME/UPDATE_CUSTOM_SECTION_TITLE': {
      const { id, title } = action.payload || {};
      if (!id || !title) return state;
      const updated = (state.data?.customSections || []).map(cs => {
        if (cs.id === id) return { ...cs, title };
        return cs;
      });
      return {
        ...state,
        data: {
          ...state.data,
          customSections: updated
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.UPDATE_CUSTOM_SECTION_ITEM:
    case 'RESUME/UPDATE_CUSTOM_SECTION_ITEM': {
      const { id, sectionId, itemIndex, item } = action.payload || {};
      const targetSecId = sectionId || id;
      if (!targetSecId || itemIndex === undefined) return state;
      const updated = (state.data?.customSections || []).map(cs => {
        if (cs.id === targetSecId) {
          const items = [...(cs.items || [])];
          items[itemIndex] = typeof item === 'object' ? { ...items[itemIndex], ...item } : item;
          return { ...cs, items };
        }
        return cs;
      });
      return {
        ...state,
        data: {
          ...state.data,
          customSections: updated
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.REMOVE_CUSTOM_SECTION:
    case 'RESUME/REMOVE_CUSTOM_SECTION': {
      const { id } = action.payload || {};
      if (!id) return state;
      const updated = (state.data?.customSections || []).filter(cs => cs.id !== id);
      const updatedOrder = (state.theme?.sectionOrder || []).filter(k => k !== id);
      return {
        ...state,
        data: {
          ...state.data,
          customSections: updated
        },
        theme: {
          ...state.theme,
          sectionOrder: updatedOrder
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_SECTION_TITLE:
    case 'RESUME/SET_SECTION_TITLE': {
      const { sectionKey, key, title } = action.payload || {};
      const targetKey = sectionKey || key;
      if (!targetKey) return state;
      return {
        ...state,
        data: {
          ...state.data,
          sectionTitles: {
            ...(state.data?.sectionTitles || {}),
            [targetKey]: title
          }
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_SECTION_ORDER:
    case 'RESUME/SET_SECTION_ORDER': {
      const newOrder = Array.isArray(action.payload) ? action.payload : state.theme?.sectionOrder;
      return {
        ...state,
        theme: {
          ...state.theme,
          sectionOrder: newOrder
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.MOVE_SECTION:
    case 'RESUME/MOVE_SECTION': {
      const { fromIndex, toIndex } = action.payload || {};
      const order = [...(state.theme?.sectionOrder || [])];
      if (
        fromIndex === undefined ||
        toIndex === undefined ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= order.length ||
        toIndex >= order.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      return {
        ...state,
        theme: {
          ...state.theme,
          sectionOrder: order
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── Theme & Styling ──
    case ACTION_TYPES.SET_THEME_COLOR:
    case 'THEME/SET_COLOR': {
      const color = action.payload || 'default';
      return {
        ...state,
        theme: {
          ...state.theme,
          themeColor: color
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_THEME_FONT:
    case 'THEME/SET_FONT': {
      const font = action.payload || 'Inter';
      return {
        ...state,
        theme: {
          ...state.theme,
          themeFont: font
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_THEME_LAYOUT:
    case 'THEME/SET_LAYOUT': {
      const layout = action.payload === 'split' ? 'split' : 'single';
      return {
        ...state,
        theme: {
          ...state.theme,
          themeLayout: layout
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_PAGE_MARGIN:
    case 'THEME/SET_PAGE_MARGIN': {
      const margin = typeof action.payload === 'number' ? action.payload : 24;
      return {
        ...state,
        theme: {
          ...state.theme,
          pageMargin: margin
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_LINE_SPACING:
    case 'THEME/SET_LINE_SPACING': {
      const spacing = typeof action.payload === 'number' ? action.payload : 1.4;
      return {
        ...state,
        theme: {
          ...state.theme,
          lineSpacing: spacing
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.SET_ACTIVE_TEMPLATE:
    case 'THEME/SET_ACTIVE_TEMPLATE': {
      const template = action.payload;
      if (!template) return state;
      return {
        ...state,
        theme: {
          ...state.theme,
          activeTemplate: template
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    // ── UI Navigation & Modals ──
    case ACTION_TYPES.SET_SCREEN:
    case 'UI/SET_SCREEN': {
      const screen = action.payload || 'editor';
      return {
        ...state,
        ui: {
          ...state.ui,
          screen
        }
      };
    }

    case ACTION_TYPES.SET_WIZARD_STEP:
    case 'UI/SET_WIZARD_STEP': {
      const step = typeof action.payload === 'number' ? Math.max(0, Math.min(7, action.payload)) : 0;
      return {
        ...state,
        ui: {
          ...state.ui,
          wizardStep: step
        }
      };
    }

    case ACTION_TYPES.SET_ACTIVE_SECTION:
    case 'UI/SET_ACTIVE_SECTION': {
      return {
        ...state,
        ui: {
          ...state.ui,
          activeSection: action.payload || 'personal'
        }
      };
    }

    case ACTION_TYPES.SET_DIRECT_EDIT:
    case 'UI/SET_DIRECT_EDIT': {
      return {
        ...state,
        ui: {
          ...state.ui,
          directEdit: Boolean(action.payload)
        }
      };
    }

    case ACTION_TYPES.SET_MODAL_STATE:
    case 'UI/SET_MODAL_STATE': {
      const { modalName, isOpen, tab } = action.payload || {};
      if (!modalName) return state;
      const updatedUi = { ...state.ui };
      if (modalName === 'ats') {
        updatedUi.atsModalOpen = Boolean(isOpen);
        if (tab) updatedUi.atsModalTab = tab;
      } else if (modalName === 'photoStudio' || modalName === 'photoAdjust') {
        updatedUi.photoStudioOpen = Boolean(isOpen);
      } else if (modalName === 'json' || modalName === 'jsonBackup') {
        updatedUi.jsonModalOpen = Boolean(isOpen);
      } else if (modalName === 'templateGallery') {
        updatedUi.templateGalleryOpen = Boolean(isOpen);
      } else if (modalName === 'fullscreenPreview') {
        updatedUi.fullscreenPreview = Boolean(isOpen);
      }
      return {
        ...state,
        ui: updatedUi
      };
    }

    case ACTION_TYPES.SET_TEMPLATE_FILTER:
    case 'UI/SET_TEMPLATE_FILTER': {
      return {
        ...state,
        ui: {
          ...state.ui,
          templateCategoryFilter: action.payload || 'all'
        }
      };
    }

    case ACTION_TYPES.SET_ZOOM_MODE:
    case 'UI/SET_ZOOM_MODE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          zoomMode: action.payload || 'fit'
        }
      };
    }

    // ── Runtime & Preview ──
    case ACTION_TYPES.SET_PREVIEW_HTML:
    case 'RUNTIME/SET_PREVIEW_HTML': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          previewHtml: action.payload || ''
        }
      };
    }

    case ACTION_TYPES.SET_DRAFT_SAVED:
    case 'RUNTIME/SET_DRAFT_SAVED': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          draftSaved: Boolean(action.payload)
        }
      };
    }

    case ACTION_TYPES.SET_PROCESSING:
    case 'RUNTIME/SET_PROCESSING': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          processing: Boolean(action.payload)
        }
      };
    }

    case ACTION_TYPES.SET_PROGRESS:
    case 'RUNTIME/SET_PROGRESS': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          progress: typeof action.payload === 'number' ? action.payload : 0
        }
      };
    }

    case ACTION_TYPES.SET_RESULT:
    case 'RUNTIME/SET_RESULT': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          result: action.payload
        }
      };
    }

    case ACTION_TYPES.SET_ERROR:
    case 'RUNTIME/SET_ERROR': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          error: action.payload
        }
      };
    }

    case ACTION_TYPES.SET_BACKEND_ACTIVE:
    case 'RUNTIME/SET_BACKEND_ACTIVE': {
      return {
        ...state,
        runtime: {
          ...state.runtime,
          backendActive: Boolean(action.payload)
        }
      };
    }

    // ── Compound & Wysiwyg Actions ──
    case ACTION_TYPES.APPLY_INLINE_EDIT:
    case 'RESUME/APPLY_INLINE_EDIT': {
      const { fieldPath, value } = action.payload || {};
      if (!fieldPath) return state;
      const updatedData = applyInlineFieldEdit(state.data, fieldPath, value);
      return {
        ...state,
        data: updatedData,
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.AUTO_SANITIZE:
    case 'RESUME/AUTO_SANITIZE': {
      // Auto-sanitize dates with proper en-dash (–), trim whitespaces, strip bullet characters
      const cleanData = { ...state.data };

      const sanitizeDate = (d) => {
        if (!d || typeof d !== 'string') return d;
        return d.replace(/\s*-\s*/g, ' – ').replace(/\s+/g, ' ').trim();
      };

      const sanitizeBullet = (b) => {
        if (!b || typeof b !== 'string') return b;
        return b.replace(/^[•\-\*·\s]+/, '').replace(/\s+/g, ' ').trim();
      };

      if (Array.isArray(cleanData.experience)) {
        cleanData.experience = cleanData.experience.map(exp => ({
          ...exp,
          company: (exp.company || '').trim(),
          role: (exp.role || '').trim(),
          start: sanitizeDate(exp.start),
          end: sanitizeDate(exp.end),
          highlights: (exp.highlights || []).map(sanitizeBullet).filter(h => h.length > 0)
        }));
      }

      if (Array.isArray(cleanData.education)) {
        cleanData.education = cleanData.education.map(edu => ({
          ...edu,
          school: (edu.school || '').trim(),
          degree: (edu.degree || '').trim(),
          start: sanitizeDate(edu.start),
          end: sanitizeDate(edu.end),
          note: (edu.note || '').trim()
        }));
      }

      if (cleanData.summary) {
        cleanData.summary = cleanData.summary.replace(/\s+/g, ' ').trim();
      }

      return {
        ...state,
        data: cleanData,
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.AUTO_TUNE_PAGE_FIT:
    case 'RESUME/AUTO_TUNE_PAGE_FIT': {
      const { lineSpacing, pageMargin } = action.payload || {};
      return {
        ...state,
        theme: {
          ...state.theme,
          ...(lineSpacing !== undefined ? { lineSpacing } : {}),
          ...(pageMargin !== undefined ? { pageMargin } : {})
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.IMPORT_DATA:
    case 'RESUME/IMPORT_DATA': {
      const payload = action.payload || {};
      const incomingData = payload.data || payload;
      const incomingTheme = payload.theme || {};
      const incomingUi = payload.ui || {};

      // If imported data does not provide a photo, ensure photoUrl is blank so we never retain dummy stock photo
      const photoUrl = typeof incomingData.photoUrl === 'string' ? incomingData.photoUrl : '';

      // If imported data includes skills, completely overwrite default dummy skills
      const skills = Array.isArray(incomingData.skills) && incomingData.skills.length > 0
        ? incomingData.skills
        : (incomingData.skills || state.data.skills || []);

      // Ensure custom section IDs and references are retained in sectionOrder
      const currentOrder = (incomingTheme.sectionOrder || state.theme.sectionOrder || [
        'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references', 'custom_languages'
      ]).slice();

      if (incomingData.references?.length && !currentOrder.includes('references')) {
        currentOrder.push('references');
      }

      if (Array.isArray(incomingData.customSections)) {
        incomingData.customSections.forEach((cs) => {
          if (cs?.id && !currentOrder.includes(cs.id)) {
            currentOrder.push(cs.id);
          }
        });
      }

      return {
        ...state,
        data: {
          ...state.data,
          ...incomingData,
          photoUrl,
          skills
        },
        theme: {
          ...state.theme,
          ...incomingTheme,
          sectionOrder: currentOrder
        },
        ui: {
          ...state.ui,
          ...incomingUi
        },
        runtime: { ...state.runtime, draftSaved: false }
      };
    }

    case ACTION_TYPES.RESET_DRAFT:
    case 'RESUME/RESET_DRAFT': {
      return {
        ...initialResumeState,
        data: { ...defaultData },
        runtime: { ...initialResumeState.runtime, draftSaved: false }
      };
    }

    default:
      return state;
  }
}
