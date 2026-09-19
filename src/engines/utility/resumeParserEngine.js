// ═══════════════════════════════════════════════════════════════════════════════
// DocForge Enterprise PDF Resume Parser & Intelligent Field Extractor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes unicode whitespace, zero-width characters, and non-standard bullets.
 */
export function cleanRawText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// Regex patterns for section boundaries
const SECTION_HEADERS = {
  summary: /^(?:executive\s+|professional\s+)?(?:summary|profile|about(?:\s+me)?|objective|career\s+objective)\b/i,
  experience: /^(?:work\s+|professional\s+|career\s+)?(?:experience|employment(?:\s+history)?|work\s+history)\b/i,
  education: /^(?:education|academic(?:\s+background|\s+history)?|studies|degrees|qualifications)\b/i,
  skills: /^(?:technical\s+|core\s+)?(?:skills|competencies|technologies|proficiencies|expertise|areas\s+of\s+expertise|tools\s+&\s+skills)\b/i,
  projects: /^(?:key\s+|personal\s+|academic\s+)?(?:projects|portfolio|initiatives)\b/i,
  certifications: /^(?:certifications|certificates|licenses(?:\s+and\s+certifications)?|accreditations)\b/i,
  references: /^(?:references|referees)\b/i,
  languages: /^(?:languages|language\s+proficiency)\b/i
};

// Known custom presets to map clean semantic slugs
export const CUSTOM_SECTION_PRESETS = {
  publications: /^(?:research\s+&?\s*)?(?:publications|papers|journal\s+articles|conference\s+proceedings)\b/i,
  awards: /^(?:honors|awards|achievements|accolades|fellowships|grants)(?:\s*(?:&|and)\s*(?:honors|awards|achievements|accolades))?\b/i,
  volunteering: /^(?:volunteer\s+(?:experience|work|service)|volunteering|community\s+service)\b/i,
  patents: /^(?:patents|intellectual\s+property)\b/i,
  leadership: /^(?:leadership|leadership\s+&\s+(?:activities|service)|campus\s+involvement|extracurricular(?:\s+activities)?)\b/i,
  affiliations: /^(?:professional\s+)?(?:affiliations|memberships|associations)\b/i,
  interests: /^(?:interests|hobbies|personal\s+interests)\b/i,
  additional: /^(?:additional\s+(?:information|details|activities)|other)\b/i
};

// Date range pattern: e.g. "2020 – 2022", "Jan 2021 - Present", "03/2019 – 08/2021", "2018 - 2021"
export const DATE_RANGE_REGEX = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?\b(?:19|20)\d{2}\b(?:\s*(?:[-–—/]+|\bto\b)\s*(?:(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?\b(?:19|20)\d{2}\b|present|current|now))?/i;

export const BULLET_START_REGEX = /^\s*(?:[•*▪▫►✔✓]\s*|[-–—]\s+)/;

export const PAGINATION_REGEX = /^(?:page\s+\d+(?:\s+of\s+\d+)?|\b\d+\s*\/\s*\d+\b|\b\d+\s*\|\s*page\b|page\s+\d+)$/i;

const COMMON_ROLE_TITLES = /\b(?:engineer|developer|manager|director|architect|lead|analyst|designer|consultant|specialist|officer|administrator|coordinator|associate|intern|vp|vice president|founder|co-founder)\b/i;

const SECTION_INDICATOR_KEYWORDS = /\b(?:experience|history|background|activities|service|involvement|publications|papers|articles|research|awards|honors|achievements|accolades|projects|portfolio|skills|competencies|technologies|tools|languages|interests|hobbies|patents|engagements|speaking|talks|exhibitions|affiliations|memberships|associations|training|education|credentials|information|details)\b/i;

/**
 * Detects standalone uppercase or title-case lines representing custom section headings.
 */
export function detectGenericSectionHeader(clean) {
  if (!clean || typeof clean !== 'string') return false;
  const s = clean.trim().replace(/^[:#*\-_—\s]+|[:#*\-_—\s]+$/g, '');
  if (s.length < 3 || s.length > 40) return false;
  if (BULLET_START_REGEX.test(s) || DATE_RANGE_REGEX.test(s)) return false;
  if (s.includes('@') || /https?:\/\/|www\./i.test(s) || /\+?\d{3}/.test(s)) return false;
  if (/[.,;]$/.test(s)) return false;
  if (COMMON_ROLE_TITLES.test(s) && /\b(?:engineer|developer|manager|director|architect|lead|analyst|designer|consultant|specialist|officer|administrator|coordinator|associate|intern|vp|vice president)\b/i.test(s)) return false;
  if (/\b(?:inc\.?|llc|corp\.?|corporation|ltd\.?|university|college|school)\b/i.test(s)) return false;

  const lettersOnly = s.replace(/[^a-zA-Z]/g, '');
  const words = s.split(/\s+/).filter(Boolean);

  // Markdown or delimited header e.g. "### Key Achievements" or "--- Speaking ---"
  if (s.startsWith('#') || s.startsWith('---') || s.endsWith(':')) {
    return true;
  }

  // ALL CAPS (at least 3 letters)
  if (lettersOnly.length >= 3 && lettersOnly === lettersOnly.toUpperCase()) {
    // Exclude if it looks like a personal name (2 short words without section keyword)
    if (words.length <= 2 && !SECTION_INDICATOR_KEYWORDS.test(s)) {
      return false;
    }
    return true;
  }

  // Title Case: MUST contain a section indicator keyword to prevent false matching candidate names
  if (words.length >= 1 && words.length <= 4 && SECTION_INDICATOR_KEYWORDS.test(s)) {
    const isTitleCased = words.every((w, idx) => {
      if (idx > 0 && /^(?:and|of|in|for|the|&)$/i.test(w)) return true;
      return /^[A-Z]/.test(w);
    });
    if (isTitleCased && lettersOnly.length >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a line matches a known section header or arbitrary custom section
 */
export function identifySectionHeader(line) {
  let clean = line.trim().replace(/^[:#*\-_—\s]+|[:#*\-_—\s]+$/g, '');
  if (clean.length === 0 || clean.length > 50) return null;

  // Strip continuation markers e.g. "Work Experience (Continued)" -> "Work Experience"
  const cleanNoCont = clean.replace(/\s*\(?(?:continued|cont\.?|cont'd)\)?$/i, '').trim();

  // Tier 1: Canonical Standard Sections
  for (const [secKey, regex] of Object.entries(SECTION_HEADERS)) {
    if (regex.test(clean) || regex.test(cleanNoCont)) {
      return secKey;
    }
  }

  // Tier 2: Custom Presets
  for (const [secKey, regex] of Object.entries(CUSTOM_SECTION_PRESETS)) {
    if (regex.test(clean) || regex.test(cleanNoCont)) {
      return `custom_${secKey}`;
    }
  }

  // Tier 3: Generic Section Header Sniffer
  if (detectGenericSectionHeader(cleanNoCont)) {
    const slug = cleanNoCont.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return `custom_${slug || 'section'}`;
  }

  return null;
}

/**
 * Parses raw text extracted from a PDF resume and returns a structured resume data object.
 * @param {string} fullText - Raw text extracted from PDF
 * @returns {object} Normalized resume data object compatible with ResumeContext
 */
export function parsePdfResumeText(fullText) {
  const cleaned = cleanRawText(fullText || '');
  const rawLines = cleaned.split('\n').map((l) => l.trim());
  const lines = rawLines.filter(Boolean);

  const result = {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    references: [],
    customSections: [],
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

  if (lines.length === 0) return result;

  // ── 1. Contact & Identity Extraction ──
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (identifySectionHeader(line)) {
      break;
    }
    if (
      !result.name &&
      line.length >= 2 &&
      line.length <= 40 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !/^(?:curriculum\s+vitae|resume|page\s+\d+|cv)\b/i.test(line) &&
      !/\d{3}/.test(line)
    ) {
      result.name = line.replace(/^[#*\s]+/, '').trim();
      continue;
    }
    if (
      result.name &&
      !result.title &&
      line.length >= 3 &&
      line.length <= 60 &&
      !line.includes('@') &&
      !line.includes('+') &&
      !line.includes('http')
    ) {
      result.title = line.trim();
    }
  }

  // Email Address
  const emailMatch = cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0].trim();

  // Phone Number
  const phoneMatch = cleaned.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  // LinkedIn Profile
  const linkedinMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[a-zA-Z0-9_-]+|li\/[a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) result.linkedin = linkedinMatch[0].replace(/^https?:\/\/(?:www\.)?/, '').trim();

  // GitHub Profile
  const githubMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  if (githubMatch) result.github = githubMatch[0].replace(/^https?:\/\/(?:www\.)?/, '').trim();

  // Website / Portfolio
  const cleanForSite = cleaned
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com)\/[^\s]+/gi, '');
  const siteMatch = cleanForSite.match(/(?:https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|io|dev|me|app|ai|co)(?:\/[^\s]*)?)/i);
  if (siteMatch) result.website = siteMatch[0].replace(/^https?:\/\//, '').trim();

  // Location heuristic
  const locationMatch = cleaned.match(/\b([A-Z][a-zA-Z\s.-]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s.-]+))\b/);
  if (locationMatch && !locationMatch[1].toLowerCase().includes('university') && !locationMatch[1].toLowerCase().includes('company')) {
    result.location = locationMatch[1].trim();
  }

  // ── 2. Section Segmentation with Multi-Page Filtration ──
  const sections = {};
  const sectionTitleMap = {};
  let currentSec = 'header';
  sections[currentSec] = [];

  const candidateNameRegex = result.name
    ? new RegExp(`^${result.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*[-–—|]\\s*(?:resume|cv|page\\s*\\d+)?)?$`, 'i')
    : null;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Filter pagination noise (e.g. "Page 2 of 2", "2 / 3", "1 | Page")
    if (PAGINATION_REGEX.test(trimmed)) {
      continue;
    }

    // Filter repeated candidate name header across subsequent pages
    if (candidateNameRegex && currentSec !== 'header' && candidateNameRegex.test(trimmed)) {
      continue;
    }

    const detectedSec = identifySectionHeader(trimmed);
    if (detectedSec) {
      currentSec = detectedSec;
      if (!sections[currentSec]) sections[currentSec] = [];

      let cleanTitle = trimmed
        .replace(/^[:#*\-_—\s]+|[:#*\-_—\s]+$/g, '')
        .replace(/\s*\(?(?:continued|cont\.?|cont'd)\)?$/i, '')
        .trim();
      if (cleanTitle && cleanTitle === cleanTitle.toUpperCase() && cleanTitle.length > 2) {
        cleanTitle = cleanTitle.toLowerCase().replace(/(?:^|\s|[-/&])\w/g, (c) => c.toUpperCase());
      }
      if (!sectionTitleMap[currentSec]) {
        sectionTitleMap[currentSec] = cleanTitle;
      }
      continue;
    }
    sections[currentSec].push(trimmed);
  }

  // ── 3. Summary Section ──
  if (sections.summary && sections.summary.length > 0) {
    result.summary = sections.summary.join(' ').replace(/\s+/g, ' ').slice(0, 700).trim();
    if (sectionTitleMap.summary) result.sectionTitles.summary = sectionTitleMap.summary;
  }

  // ── 4. Experience Section ──
  if (sections.experience && sections.experience.length > 0) {
    result.experience = parseExperienceLines(sections.experience.filter(Boolean));
    if (sectionTitleMap.experience) result.sectionTitles.experience = sectionTitleMap.experience;
  }

  // ── 5. Education Section ──
  if (sections.education && sections.education.length > 0) {
    result.education = parseEducationLines(sections.education.filter(Boolean));
    if (sectionTitleMap.education) result.sectionTitles.education = sectionTitleMap.education;
  }

  // ── 6. Skills Section ──
  if (sections.skills && sections.skills.length > 0) {
    result.skills = parseSkillsLines(sections.skills.filter(Boolean));
    if (sectionTitleMap.skills) result.sectionTitles.skills = sectionTitleMap.skills;
  }

  // ── 7. Projects Section ──
  if (sections.projects && sections.projects.length > 0) {
    result.projects = parseProjectsLines(sections.projects.filter(Boolean));
    if (sectionTitleMap.projects) result.sectionTitles.projects = sectionTitleMap.projects;
  }

  // ── 8. Certifications Section ──
  if (sections.certifications && sections.certifications.length > 0) {
    result.certifications = parseCertificationsLines(sections.certifications.filter(Boolean));
    if (sectionTitleMap.certifications) result.sectionTitles.certifications = sectionTitleMap.certifications;
  }

  // ── 9. References Section ──
  if (sections.references && sections.references.length > 0) {
    result.references = parseReferencesLines(sections.references.filter(Boolean));
    if (sectionTitleMap.references) result.sectionTitles.references = sectionTitleMap.references;
  }

  // ── 10. Languages Section ──
  if (sections.languages && sections.languages.length > 0) {
    const langItems = parseLanguagesLines(sections.languages.filter(Boolean));
    if (langItems.length > 0) {
      result.customSections.push({
        id: 'custom_languages',
        title: sectionTitleMap.languages || 'Languages',
        items: langItems
      });
      result.sectionTitles.custom_languages = sectionTitleMap.languages || 'Languages';
    }
  }

  // ── 11. Custom & Unrecognized Sections ──
  for (const [secKey, linesArr] of Object.entries(sections)) {
    if (secKey.startsWith('custom_') && secKey !== 'custom_languages') {
      const secTitle = sectionTitleMap[secKey] || secKey.replace(/^custom_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const parsedCs = parseCustomSectionLines(linesArr.filter(Boolean), secKey, secTitle);
      if (parsedCs.items.length > 0) {
        result.customSections.push(parsedCs);
        result.sectionTitles[secKey] = secTitle;
      }
    }
  }

  return result;
}

/**
 * Parses raw lines from an experience section into structured entries.
 */
function parseExperienceLines(lines) {
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_RANGE_REGEX);
    const isBullet = BULLET_START_REGEX.test(line);
    const hasDelimiter = (line.includes(' | ') || line.includes(' · ') || line.includes(' at ')) && !isBullet;
    const hasRoleKeyword = COMMON_ROLE_TITLES.test(line) && !isBullet;

    // Check if line is a pure date line for current entry without dates set
    const isPureDateLine = dateMatch && !isBullet && (line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim().length === 0);

    if (isPureDateLine && currentEntry) {
      const rawDate = dateMatch[0].trim();
      const dateParts = rawDate.split(/\s*(?:[-–—/]+|\bto\b)\s*/i);
      currentEntry.startDate = dateParts[0]?.trim() || '2020';
      currentEntry.endDate = dateParts[1]?.trim() || 'Present';
      currentEntry.start = currentEntry.startDate;
      currentEntry.end = currentEntry.endDate;
      continue;
    }

    // Check if line starts a new position:
    // Case A: Role keyword line without bullets (e.g. "Staff Software Architect")
    // Case B: Delimited line (e.g. "Role | Company" or "Company · Location")
    // Case C: Date range line when no current entry
    const startsNewPosition = (hasRoleKeyword && !isBullet) || hasDelimiter || (dateMatch && !isBullet && !currentEntry);

    if (startsNewPosition) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      let role = '';
      let company = '';
      let startDate = '2020';
      let endDate = 'Present';

      if (hasRoleKeyword && !hasDelimiter) {
        // Line 1 is pure role: e.g. "Staff Software Architect"
        role = line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim();

        // Check if line 2 is company (e.g. "Google Inc. · Mountain View, CA")
        if (i + 1 < lines.length && !BULLET_START_REGEX.test(lines[i + 1])) {
          const nextLine = lines[i + 1].trim();
          const nextHasDate = DATE_RANGE_REGEX.test(nextLine);
          const nextIsPureDate = nextHasDate && (nextLine.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim().length === 0);

          if (!nextIsPureDate) {
            // Next line is company / location
            company = nextLine.split(/[·|]/)[0].replace(DATE_RANGE_REGEX, '').trim();
            i++; // consumed company line
          }
        }
      } else if (hasDelimiter) {
        // Line contains delimiter: e.g. "Role · Company" or "Role at Company"
        let parts;
        if (line.includes(' | ')) parts = line.split(' | ');
        else if (line.includes(' · ')) parts = line.split(' · ');
        else parts = line.split(' at ');

        if (COMMON_ROLE_TITLES.test(parts[0])) {
          role = parts[0].replace(DATE_RANGE_REGEX, '').trim();
          company = parts[1].replace(DATE_RANGE_REGEX, '').trim();
        } else if (parts[1] && COMMON_ROLE_TITLES.test(parts[1])) {
          company = parts[0].replace(DATE_RANGE_REGEX, '').trim();
          role = parts[1].replace(DATE_RANGE_REGEX, '').trim();
        } else {
          role = parts[0].replace(DATE_RANGE_REGEX, '').trim();
          company = parts[1].replace(DATE_RANGE_REGEX, '').trim();
        }
      } else {
        role = line.replace(DATE_RANGE_REGEX, '').trim();
      }

      // Check for dates on current line or following line
      if (dateMatch) {
        const rawDate = dateMatch[0].trim();
        const dateParts = rawDate.split(/\s*(?:[-–—/]+|\bto\b)\s*/i);
        startDate = dateParts[0]?.trim() || '2020';
        endDate = dateParts[1]?.trim() || 'Present';
      } else if (i + 1 < lines.length && DATE_RANGE_REGEX.test(lines[i + 1]) && !BULLET_START_REGEX.test(lines[i + 1])) {
        const nextDateMatch = lines[i + 1].match(DATE_RANGE_REGEX);
        if (nextDateMatch) {
          const rawDate = nextDateMatch[0].trim();
          const dateParts = rawDate.split(/\s*(?:[-–—/]+|\bto\b)\s*/i);
          startDate = dateParts[0]?.trim() || '2020';
          endDate = dateParts[1]?.trim() || 'Present';
        }
        i++; // consumed date line
      }

      currentEntry = {
        id: `exp_${Date.now()}_${entries.length + 1}`,
        role: role || 'Professional Role',
        company: company || 'Company / Organization',
        startDate,
        endDate,
        start: startDate,
        end: endDate,
        highlights: []
      };
      continue;
    }

    if (currentEntry) {
      if (isBullet) {
        const cleanBullet = line.replace(BULLET_START_REGEX, '').trim();
        if (cleanBullet) currentEntry.highlights.push(cleanBullet);
      } else if (currentEntry.highlights.length > 0) {
        const lastIdx = currentEntry.highlights.length - 1;
        currentEntry.highlights[lastIdx] = `${currentEntry.highlights[lastIdx]} ${line}`;
      } else if (!currentEntry.company || currentEntry.company === 'Company / Organization') {
        currentEntry.company = line;
      } else {
        currentEntry.highlights.push(line);
      }
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

/**
 * Parses raw lines from an education section into structured entries.
 */
function parseEducationLines(lines) {
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_RANGE_REGEX);
    const hasDegreeWord = /\b(?:bachelor|master|b\.s\.|m\.s\.|b\.a\.|m\.b\.a\.|ph\.?d|doctor|associate|degree|diploma|certificate)\b/i.test(line);
    const hasSchoolWord = /\b(?:university|college|institute|school|academy|polytechnic)\b/i.test(line);

    if (hasDegreeWord || hasSchoolWord) {
      const shouldPush = currentEntry && (
        (hasDegreeWord && currentEntry.degree && currentEntry.degree !== 'Degree / Major') ||
        (hasSchoolWord && currentEntry.school && currentEntry.school !== 'Institution / University')
      );

      if (shouldPush) {
        entries.push(currentEntry);
        currentEntry = null;
      }

      let startDate = '2016';
      let endDate = '2020';
      if (dateMatch) {
        const rawDate = dateMatch[0].trim();
        const dateParts = rawDate.split(/\s*(?:[-–—/]+|\bto\b)\s*/i);
        startDate = dateParts[0]?.trim() || '2016';
        endDate = dateParts[1]?.trim() || '2020';
      }

      if (!currentEntry) {
        currentEntry = {
          id: `edu_${Date.now()}_${entries.length + 1}`,
          degree: hasDegreeWord ? line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim() : 'Degree / Major',
          school: hasSchoolWord ? line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim() : 'Institution / University',
          startDate,
          endDate,
          start: startDate,
          end: endDate,
          note: '',
          gpa: ''
        };
      } else {
        if (hasDegreeWord) {
          currentEntry.degree = line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim();
        }
        if (hasSchoolWord) {
          currentEntry.school = line.replace(DATE_RANGE_REGEX, '').replace(/^[|·,•\s]+|[|·,•\s]+$/g, '').trim();
        }
        if (dateMatch) {
          currentEntry.startDate = startDate;
          currentEntry.endDate = endDate;
          currentEntry.start = startDate;
          currentEntry.end = endDate;
        }
      }
      continue;
    }

    if (dateMatch && currentEntry) {
      const rawDate = dateMatch[0].trim();
      const dateParts = rawDate.split(/\s*(?:[-–—/]+|\bto\b)\s*/i);
      currentEntry.startDate = dateParts[0]?.trim() || '2016';
      currentEntry.endDate = dateParts[1]?.trim() || '2020';
      currentEntry.start = currentEntry.startDate;
      currentEntry.end = currentEntry.endDate;
      continue;
    }

    if (currentEntry) {
      const gpaMatch = line.match(/\b(?:gpa[:\s]*)?([0-4]\.\d{1,2}(?:\s*\/\s*4\.0)?)\b/i);
      if (gpaMatch) {
        currentEntry.gpa = gpaMatch[1];
        currentEntry.note = `GPA: ${gpaMatch[1]}`;
      } else if (/honors|magna|cum\s+laude|dean/i.test(line)) {
        currentEntry.note = currentEntry.note ? `${currentEntry.note} · ${line}` : line;
      } else if (currentEntry.degree === 'Degree / Major') {
        currentEntry.degree = line;
      }
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

/**
 * Parses raw lines from a skills section into unique string tokens.
 */
function parseSkillsLines(lines) {
  const skills = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[A-Za-z\s]+:\s*/, '');
    const tokens = cleanLine.split(/[,•|·\t/]/).map((s) => s.trim()).filter(Boolean);
    for (const tok of tokens) {
      const cleanedTok = tok.replace(BULLET_START_REGEX, '').trim();
      if (cleanedTok.length >= 2 && cleanedTok.length <= 40 && !skills.includes(cleanedTok)) {
        skills.push(cleanedTok);
      }
    }
  }
  return skills;
}

/**
 * Parses raw lines from a projects section into structured entries.
 */
function parseProjectsLines(lines) {
  const projects = [];
  let currentProj = null;

  for (const line of lines) {
    const isBullet = BULLET_START_REGEX.test(line);
    const urlMatch = line.match(/(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);

    if (!isBullet && line.length < 60 && !currentProj) {
      currentProj = {
        id: `proj_${Date.now()}_${projects.length + 1}`,
        name: line,
        title: line,
        description: '',
        url: urlMatch ? urlMatch[0] : ''
      };
    } else if (currentProj) {
      if (isBullet) {
        const bulletText = line.replace(BULLET_START_REGEX, '').trim();
        currentProj.description = currentProj.description ? `${currentProj.description} ${bulletText}` : bulletText;
      } else if (urlMatch && !currentProj.url) {
        currentProj.url = urlMatch[0];
      } else {
        projects.push(currentProj);
        currentProj = {
          id: `proj_${Date.now()}_${projects.length + 1}`,
          name: line,
          title: line,
          description: '',
          url: ''
        };
      }
    }
  }

  if (currentProj) projects.push(currentProj);
  return projects;
}

/**
 * Parses raw lines from a certifications section into structured string or object entries.
 */
function parseCertificationsLines(lines) {
  const certs = [];
  for (const line of lines) {
    const clean = line.replace(BULLET_START_REGEX, '').trim();
    if (clean.length >= 3 && !certs.includes(clean)) {
      certs.push(clean);
    }
  }
  return certs;
}

/**
 * Parses raw lines from a references section into structured reference objects.
 */
export function parseReferencesLines(lines) {
  const refs = [];
  let currentRef = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip generic placeholder text
    if (/references?\s+(?:available|furnished)\s+upon\s+request/i.test(rawLine)) {
      continue;
    }

    const emailMatch = rawLine.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawLine.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const isBullet = BULLET_START_REGEX.test(rawLine);
    const cleanLine = rawLine.replace(BULLET_START_REGEX, '').trim();

    // Check if line is purely contact info (phone/email)
    const isPureContact = (emailMatch || phoneMatch) && (
      cleanLine.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
               .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
               .replace(/^[|·,•\s\-:()phoneEmail/]+|[|·,•\s\-:()phoneEmail/]+$/gi, '')
               .trim().length === 0
    );

    if (isPureContact && currentRef) {
      if (emailMatch && !currentRef.email) currentRef.email = emailMatch[0].trim();
      if (phoneMatch && !currentRef.phone) currentRef.phone = phoneMatch[0].trim();
      continue;
    }

    // Delimited single-line reference: e.g. "Benjamin Shah - CTO @ Acme (b.shah@acme.com)"
    const hasDelimiter = cleanLine.includes(' - ') || cleanLine.includes(' | ') || cleanLine.includes(' · ') || cleanLine.includes(' — ');
    if (hasDelimiter && (emailMatch || phoneMatch || isBullet)) {
      if (currentRef) refs.push(currentRef);
      const parts = cleanLine.split(/\s*[-–—|·]\s*/);
      const name = parts[0]?.replace(BULLET_START_REGEX, '').trim() || 'Reference Name';
      const relation = parts[1]?.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '').replace(/\+?[0-9\s\-()]{7,}/g, '').trim() || '';
      currentRef = {
        id: `ref_${Date.now()}_${refs.length + 1}`,
        name,
        relation,
        phone: phoneMatch ? phoneMatch[0].trim() : '',
        email: emailMatch ? emailMatch[0].trim() : ''
      };
      refs.push(currentRef);
      currentRef = null;
      continue;
    }

    // New reference entry start: Name line
    const isLikelyName = /^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3}$/.test(cleanLine) ||
                         /^(?:dr\.|prof\.|mr\.|ms\.|mrs\.)\s+[A-Z][a-zA-Z.'-]+/i.test(cleanLine);

    if (isLikelyName && (!currentRef || currentRef.name)) {
      if (currentRef) refs.push(currentRef);
      currentRef = {
        id: `ref_${Date.now()}_${refs.length + 1}`,
        name: cleanLine,
        relation: '',
        phone: phoneMatch ? phoneMatch[0].trim() : '',
        email: emailMatch ? emailMatch[0].trim() : ''
      };
      continue;
    }

    if (currentRef) {
      if (emailMatch && !currentRef.email) currentRef.email = emailMatch[0].trim();
      if (phoneMatch && !currentRef.phone) currentRef.phone = phoneMatch[0].trim();

      const nonContactText = cleanLine
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
        .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
        .replace(/^[|·,•\s\-:()phoneEmail/]+|[|·,•\s\-:()phoneEmail/]+$/gi, '')
        .trim();

      if (nonContactText && !currentRef.relation) {
        currentRef.relation = nonContactText;
      }
    } else {
      currentRef = {
        id: `ref_${Date.now()}_${refs.length + 1}`,
        name: cleanLine.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '').trim() || 'Reference Name',
        relation: '',
        phone: phoneMatch ? phoneMatch[0].trim() : '',
        email: emailMatch ? emailMatch[0].trim() : ''
      };
    }
  }

  if (currentRef) refs.push(currentRef);
  return refs;
}

/**
 * Parses raw lines from a languages section into structured items.
 */
export function parseLanguagesLines(lines) {
  const items = [];
  for (const line of lines) {
    const cleanLine = line.replace(BULLET_START_REGEX, '').trim();
    if (!cleanLine) continue;

    const parts = cleanLine.split(/[,;]/);
    for (const part of parts) {
      const p = part.trim();
      if (!p) continue;
      const parenMatch = p.match(/^([A-Za-z\s]+)\s*\(([^)]+)\)$/);
      const delimMatch = p.match(/^([A-Za-z\s]+)\s*[:\-–—]\s*(.+)$/);

      if (parenMatch) {
        items.push({
          id: `lang_${items.length + 1}`,
          title: parenMatch[1].trim(),
          value: parenMatch[2].trim()
        });
      } else if (delimMatch) {
        items.push({
          id: `lang_${items.length + 1}`,
          title: delimMatch[1].trim(),
          value: delimMatch[2].trim()
        });
      } else if (p.length >= 2 && p.length <= 25) {
        items.push({
          id: `lang_${items.length + 1}`,
          title: p,
          value: 'Proficient'
        });
      }
    }
  }
  return items;
}

/**
 * Parses raw lines from an arbitrary custom section into structured items.
 */
export function parseCustomSectionLines(lines, secId, secTitle) {
  const items = [];
  let itemIdx = 1;

  for (const line of lines) {
    const clean = line.replace(BULLET_START_REGEX, '').trim();
    if (!clean) continue;

    const delimMatch = clean.match(/^([^:–—-]+)\s*[:–—]\s*(.+)$/);
    if (delimMatch && delimMatch[1].length <= 35) {
      items.push({
        id: `item_${itemIdx++}`,
        title: delimMatch[1].trim(),
        value: delimMatch[2].trim()
      });
    } else {
      items.push({
        id: `item_${itemIdx++}`,
        title: clean,
        value: ''
      });
    }
  }

  return {
    id: secId,
    title: secTitle,
    items
  };
}

// Recursively sanitize strings for XSS safety
export function sanitizeDeep(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDeep);
  }
  if (obj !== null && typeof obj === 'object') {
    const res = {};
    for (const key in obj) {
      res[key] = sanitizeDeep(obj[key]);
    }
    return res;
  }
  return obj;
}

export function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  const res = sanitizeDeep(data);

  if (res.skills && Array.isArray(res.skills)) {
    res.skills = res.skills.filter(s => typeof s === 'string' && s.trim().length > 0);
  } else {
    res.skills = [];
  }
  if (res.experience && Array.isArray(res.experience)) {
    res.experience = res.experience.map(e => ({
      ...e,
      highlights: Array.isArray(e.highlights) ? e.highlights.filter(h => typeof h === 'string' && h.trim().length > 0) : []
    }));
  } else {
    res.experience = [];
  }
  if (res.education && !Array.isArray(res.education)) res.education = [];
  if (res.projects && !Array.isArray(res.projects)) res.projects = [];
  if (res.certifications && !Array.isArray(res.certifications)) res.certifications = [];
  if (res.references && Array.isArray(res.references)) {
    res.references = res.references.map((r, idx) => ({
      id: r.id || `ref_${idx + 1}`,
      name: typeof r.name === 'string' ? r.name : 'Reference Name',
      relation: typeof r.relation === 'string' ? r.relation : '',
      phone: typeof r.phone === 'string' ? r.phone : '',
      email: typeof r.email === 'string' ? r.email : ''
    }));
  } else {
    res.references = [];
  }
  if (res.customSections && Array.isArray(res.customSections)) {
    res.customSections = res.customSections.map(cs => ({
      ...cs,
      items: Array.isArray(cs.items) ? cs.items.filter(it => it && (it.title || it.value)) : []
    }));
  }

  const defaultTitles = {
    summary: 'About Me',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Expertise',
    projects: 'Projects',
    certifications: 'Certifications',
    references: 'References'
  };

  const rawTitles = (res.sectionTitles && typeof res.sectionTitles === 'object' && !Array.isArray(res.sectionTitles))
    ? res.sectionTitles
    : {};

  const cleanTitles = { ...defaultTitles };
  for (const k in rawTitles) {
    if (typeof rawTitles[k] === 'string' && rawTitles[k].trim()) {
      cleanTitles[k] = rawTitles[k].trim();
    }
  }
  res.sectionTitles = cleanTitles;

  return res;
}

/**
 * Spatially extracts PDF text items while preserving column reading order.
 * In a two-column resume, prevents items in the left sidebar and right body
 * from interleaving across identical vertical (Y) coordinates.
 *
 * @param {Array} rawItems - Array of { text, x, y, width, height }
 * @returns {string} Page text with columns separated in natural reading order
 */
export function extractPageTextWithColumns(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return '';
  const items = rawItems.filter((it) => it && typeof it.text === 'string' && it.text.trim());
  if (items.length === 0) return '';

  const xs = items.map((it) => Number(it.x) || 0);
  const xRights = items.map((it) => (Number(it.x) || 0) + (Number(it.width) || 0));
  const ys = items.map((it) => Number(it.y) || 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xRights);
  const maxY = Math.max(...ys);
  const pageWidth = maxX - minX;

  // Multi-column gutter detection
  let bestGutter = null;
  let minStraddles = Infinity;

  if (pageWidth > 150 && items.length >= 6) {
    const minG = minX + pageWidth * 0.20;
    const maxG = minX + pageWidth * 0.65;

    for (let g = minG; g <= maxG; g += 10) {
      const bodyItems = items.filter((it) => it.y < maxY - 60);
      const leftCount = bodyItems.filter((it) => it.x + (it.width || 15) <= g).length;
      const rightCount = bodyItems.filter((it) => it.x >= g).length;
      const straddles = bodyItems.filter((it) => it.x < g && it.x + (it.width || 15) > g).length;

      if (leftCount >= 2 && rightCount >= 2 && straddles <= 2 && straddles < minStraddles) {
        minStraddles = straddles;
        bestGutter = g;
      }
    }
  }

  const groupItemsToLines = (itemList) => {
    const linesMap = {};
    itemList.forEach((item) => {
      const yKey = Math.round(item.y);
      const matchY = Object.keys(linesMap).find((y) => Math.abs(Number(y) - yKey) < 3);
      if (matchY) {
        linesMap[matchY].push(item);
      } else {
        linesMap[yKey] = [item];
      }
    });

    const sortedYKeys = Object.keys(linesMap).sort((a, b) => Number(b) - Number(a));
    return sortedYKeys.map((yKey) => {
      const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);
      return lineItems.map((item) => item.text).join(' ');
    });
  };

  if (bestGutter) {
    const headerItems = items.filter((it) => it.y >= maxY - 80);
    const leftItems = items.filter((it) => it.y < maxY - 80 && it.x < bestGutter);
    const rightItems = items.filter((it) => it.y < maxY - 80 && it.x >= bestGutter);

    const headerLines = groupItemsToLines(headerItems);
    const leftLines = groupItemsToLines(leftItems);
    const rightLines = groupItemsToLines(rightItems);

    return [...headerLines, ...leftLines, ...rightLines].join('\n');
  }

  return groupItemsToLines(items).join('\n');
}

export default {
  parsePdfResumeText,
  cleanRawText,
  identifySectionHeader,
  detectGenericSectionHeader,
  parseReferencesLines,
  parseLanguagesLines,
  parseCustomSectionLines,
  extractPageTextWithColumns,
  sanitizeDeep,
  sanitizeData
};

