// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar WYSIWYG State Sync Engine
// Pure Canonical Reducer for In-Template Direct Field Edits
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cleanses invisible Unicode control characters and zero-width spaces that corrupt links and length calculations.
 */
export const cleanUnicodeText = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
};

/**
 * Pure state reducer applying in-place edits from the preview iframe WYSIWYG bridge.
 * Parses continuous canonical field paths (`exp:idx:subField`, `custom:csId:idx:subField`, etc.),
 * performs smart separator parsing for dates and reference contacts, and returns updated immutable state.
 */
export const applyInlineFieldEdit = (prevState, fieldPath, rawValue) => {
  if (!prevState || !fieldPath) return prevState;
  const value = cleanUnicodeText(rawValue);
  const next = JSON.parse(JSON.stringify(prevState));

  if (fieldPath === 'name') next.name = value;
  else if (fieldPath === 'title') next.title = value;
  else if (fieldPath === 'summary') next.summary = value;
  else if (fieldPath === 'email') next.email = value;
  else if (fieldPath === 'phone') next.phone = value;
  else if (fieldPath === 'location') next.location = value;
  else if (fieldPath === 'website') next.website = value;
  else if (fieldPath === 'linkedin') next.linkedin = value;
  else if (fieldPath === 'github') next.github = value;
  else if (fieldPath === 'photoUrl' || fieldPath === 'photo') next.photoUrl = value;
  else if (fieldPath.startsWith('heading:')) {
    const sectionKey = fieldPath.split(':')[1];
    if (sectionKey) {
      const cleanHeading = value.replace(/\s*\((?:Continued|cont\.?)\)\s*$/i, '').trim();
      next.sectionTitles = {
        ...(next.sectionTitles || {}),
        [sectionKey]: cleanHeading
      };
    }
  }
  else if (fieldPath.startsWith('exp:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    const subField = parts[2];
    if (next.experience && next.experience[idx]) {
      const exps = [...next.experience];
      if (subField === 'role' || subField === 'end') {
        exps[idx] = { ...exps[idx], [subField]: value };
      } else if (subField === 'company') {
        let comp = value;
        if (comp.includes(' · ')) comp = comp.split(' · ')[0].trim();
        else if (comp.includes(' | ')) comp = comp.split(' | ')[0].trim();
        exps[idx] = { ...exps[idx], company: comp };
      } else if (subField === 'start' || subField === 'date') {
        let rawDate = value;
        if (rawDate.includes(' · ')) rawDate = rawDate.split(' · ')[0].trim();
        else if (rawDate.includes(' | ')) rawDate = rawDate.split(' | ')[0].trim();
        const dateParts = rawDate.split(/\s*[-–—]\s*|\s+to\s+/i);
        if (dateParts.length >= 2) {
          exps[idx] = { ...exps[idx], start: dateParts[0].trim(), end: dateParts[1].trim() };
        } else {
          exps[idx] = { ...exps[idx], start: rawDate.trim() };
        }
      } else if (subField === 'highlight') {
        const hIdx = parseInt(parts[3], 10);
        const action = parts[4];
        const highlights = [...(exps[idx].highlights || [])];
        if (action === 'delete' || value === '__DELETE__') {
          highlights.splice(hIdx, 1);
        } else {
          highlights[hIdx] = value;
        }
        exps[idx] = { ...exps[idx], highlights };
      }
      next.experience = exps;
    }
  } else if (fieldPath.startsWith('edu:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    const subField = parts[2];
    if (next.education && next.education[idx]) {
      const edus = [...next.education];
      if (subField === 'degree' || subField === 'end' || subField === 'note') {
        edus[idx] = { ...edus[idx], [subField]: value };
      } else if (subField === 'school') {
        let sch = value;
        if (sch.includes(' · ')) sch = sch.split(' · ')[0].trim();
        else if (sch.includes(' | ')) sch = sch.split(' | ')[0].trim();
        edus[idx] = { ...edus[idx], school: sch };
      } else if (subField === 'start' || subField === 'date') {
        let rawDate = value;
        if (rawDate.includes(' · ')) rawDate = rawDate.split(' · ')[0].trim();
        else if (rawDate.includes(' | ')) rawDate = rawDate.split(' | ')[0].trim();
        const dateParts = rawDate.split(/\s*[-–—]\s*|\s+to\s+/i);
        if (dateParts.length >= 2) {
          edus[idx] = { ...edus[idx], start: dateParts[0].trim(), end: dateParts[1].trim() };
        } else {
          edus[idx] = { ...edus[idx], start: rawDate.trim() };
        }
      }
      next.education = edus;
    }
  } else if (fieldPath.startsWith('skill:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    if (next.skills && next.skills[idx] !== undefined) {
      const skills = [...next.skills];
      skills[idx] = value;
      next.skills = skills;
    }
  } else if (fieldPath.startsWith('proj:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    const subField = parts[2];
    if (next.projects && next.projects[idx]) {
      const projs = [...next.projects];
      if (subField === 'highlight') {
        const hIdx = parseInt(parts[3], 10);
        const action = parts[4];
        const highlights = [...(projs[idx].highlights || [])];
        if (action === 'delete' || value === '__DELETE__') {
          highlights.splice(hIdx, 1);
        } else {
          highlights[hIdx] = value;
        }
        projs[idx] = { ...projs[idx], highlights };
      } else {
        projs[idx] = { ...projs[idx], [subField]: value };
      }
      next.projects = projs;
    }
  } else if (fieldPath.startsWith('cert:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    const subField = parts[2];
    if (next.certifications && next.certifications[idx] !== undefined) {
      const certs = [...next.certifications];
      if (subField && typeof certs[idx] === 'object' && certs[idx] !== null) {
        certs[idx] = { ...certs[idx], [subField]: value };
      } else if (typeof certs[idx] === 'object' && certs[idx] !== null) {
        certs[idx] = { ...certs[idx], name: value };
      } else {
        certs[idx] = value;
      }
      next.certifications = certs;
    }
  } else if (fieldPath.startsWith('ref:')) {
    const parts = fieldPath.split(':');
    const idx = parseInt(parts[1], 10);
    const subField = parts[2];
    if (next.references && next.references[idx]) {
      const refs = [...next.references];
      if (subField === 'name' || subField === 'relation' || subField === 'phone' || subField === 'email') {
        refs[idx] = { ...refs[idx], [subField]: value };
      } else if (subField === 'contact') {
        const emailMatch = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const phoneMatch = value.match(/(\+?[0-9][0-9\s\-()]{6,}[0-9])/);
        refs[idx] = {
          ...refs[idx],
          email: emailMatch ? emailMatch[1] : (refs[idx].email || ''),
          phone: phoneMatch ? phoneMatch[1] : (refs[idx].phone || '')
        };
      }
      next.references = refs;
    }
  } else if (fieldPath.startsWith('custom:')) {
    const parts = fieldPath.split(':');
    const csId = parts[1];
    if (parts.length === 3 && parts[2] === 'title') {
      if (next.customSections) {
        next.customSections = next.customSections.map(cs => (cs.id === csId ? { ...cs, title: value } : cs));
      }
    } else {
      const itemIdx = parseInt(parts[2], 10);
      const subField = parts[3] || 'title';
      if (next.customSections) {
        next.customSections = next.customSections.map(cs => {
          if (cs.id === csId) {
            const items = Array.isArray(cs.items) ? [...cs.items] : [];
            if (items[itemIdx] === undefined) {
              items[itemIdx] = { title: value, value: '' };
            } else if (typeof items[itemIdx] === 'string') {
              items[itemIdx] = value;
            } else if (typeof items[itemIdx] === 'object' && items[itemIdx] !== null) {
              items[itemIdx] = { ...items[itemIdx], [subField]: value };
            } else {
              items[itemIdx] = value;
            }
            return { ...cs, items };
          }
          return cs;
        });
      }
    }
  }

  return next;
};
