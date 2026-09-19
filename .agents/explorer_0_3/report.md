# 85-Template Catalog Architectural Exploration & Test Infrastructure Report

**Explorer**: Explorer 3 (Investigation & Synthesis)  
**Date**: 2026-08-30  
**Target Scope**: `src/engines/utility/templates/` (85 Template Engines), `src/engines/utility/` (Core Engines), `tests/`, `scripts/`  
**Reference Specification**: `.agents/ORIGINAL_REQUEST.md`  

---

## Executive Summary

A comprehensive, automated, deep-code inspection was conducted across all **85 resume template generator files** in `src/engines/utility/templates/`, as well as shared utility engines (`paginationEngine.js`, `wysiwygStateEngine.js`, `printUtils.js`, `resumeTemplates.js`), workspace test scripts (`scripts/`, `tests/`), and editor components (`ResumeBuilder.jsx`).

The investigation revealed critical catalog-wide defects across all four core requirements:
1. **Mock Data Pollution (84 / 85 Templates Affected)**: 84 templates resurrect fake/sample names (e.g., `'Candidate Name'`, `'Adeline Palmerston'`, `'Adam Fletcher'`, `'Howard Ong'`, `'Richard Sanchez'`) and 59 templates render empty "Contact" section headers when provided an empty payload.
2. **WYSIWYG Attribute Stamping Deficits & Duplications (71 / 85 Templates Affected)**: Massive tagging gaps exist for skills (45 missing), projects (56 missing), references (75 missing), and custom sections (74 missing). Furthermore, 71 templates contain corrupted duplicate `data-df-field` attributes on single DOM nodes (e.g., `data-df-field="email" data-df-field="email"`), and multiple templates commit composite-field concatenation violations.
3. **Avatar Masking & Zoom Overflow Vulnerabilities (54 / 85 Templates Affected)**: Only 28 templates wrap photos in dedicated clipping containers with `overflow: hidden; border-radius: 50%`. 54 templates render bare `<img>` tags or unconstrained wrappers, causing candidate photos to overflow and bleed into adjacent headers and sidebars during interactive zooming (`photoCrop`).
4. **Vector Geometry, Pagination & Print Inconsistencies**: Only 5 of 85 templates implement the universal `computeTwoPagePartition` engine; 80 templates lack dynamic page partitioning, causing unconstrained overflow clipping. Only 6 templates define `:last-child` page-break avoidance, risking trailing blank pages during print/PDF export. 9 templates still use decorative emoji/Unicode glyphs.
5. **Test Harness Deficiencies**: Existing test scripts (`audit_adversarial_templates.mjs`, `test_render_all.mjs`) only verify that templates do not throw runtime exceptions. They perform zero assertions on mock pollution, attribute coverage, composite isolation, or print styling.

---

## 1. Vector Geometry, Headers, Sidebars & A4 Dimensions

### 1.1 Archetype Distribution
The 85 templates in `src/engines/utility/templates/` fall into 4 distinct layout archetypes:

| Archetype | Count | Key Structural Characteristics | Representative Templates |
| :--- | :---: | :--- | :--- |
| **Sidebar Split** | 70 | 33%/67% or 30%/70% two-column split, colored sidebar background, vertical timeline | `mariana.js`, `olivia.js`, `charles.js`, `sanchez_dark.js` |
| **Arch / Capsule** | 5 | Rounded outer frame (`border-radius: 28px`), arched photo capsule (`border-radius: 110px`), horizontal accent stripes | `terracotta_arch.js`, `adeline_palmerston.js`, `sebastian_bennett.js` |
| **Diagonal / Polygon** | 3 | CSS `clip-path: polygon(...)` angled headers, overlapping accent wedges, 5-dot rating meters | `diagonal_wedge.js`, `adora_montminy.js`, `korina_villanueva.js` |
| **Single Column / Stacked** | 7 | Full-width header banner with centered or left-aligned horizontal sections | `adam_fletcher.js`, `manhattan_noir.js`, `osaka_minimal.js` |

### 1.2 A4 Subpixel Dimensions ($794\text{px} \times 1123\text{px}$) & Container Inconsistencies
- **Inconsistent Container Class Names**:
  - 69 templates use `.cv-page`
  - 13 templates use `.resume-canvas` (e.g. `adam_fletcher.js`, `adeline_palmerston.js`, `adora_montminy.js`, `alfredo_torres.js`, `arthur_pendelton.js`, `donna_stroupe.js`, `howard_ong.js`, `isabel_mercado.js`, `isabel_schumacher.js`, `lorna_alvarado.js`, `marcus_vance.js`, `richard_sanchez.js`, `terracotta_arch.js`)
  - 3 templates use custom wrappers without `.cv-page`
- **Impact on Global Print Engine**: `src/engines/utility/printUtils.js` defines print styles exclusively targeting `.cv-page` (`.cv-page { box-shadow: none !important; ... }`). As a result, the 13 `.resume-canvas` templates do NOT inherit standard print resets from `injectPrintStyles`.
- **Recommendation**: Standardize all 85 templates to use `<div class="cv-page" id="page-1">` (or dual classes `class="cv-page resume-canvas"`), and update `printUtils.js` to target `.cv-page, .resume-canvas`.

### 1.3 Pagination Engine Adoption Gap
- Only **5 templates** (`mariana.js`, `olivia.js`, `jonathan.js`, `diagonal_wedge.js`, `adeline_palmerston.js` or subset) currently import and invoke `computeTwoPagePartition` from `../paginationEngine.js`.
- **80 templates** are strictly single-page fixed sheets with `overflow: hidden; height: 1123px;`. When user experiences or projects exceed page capacity, content is abruptly clipped off the bottom edge.

### 1.4 Vector Shapes & Anti-Emoji Compliance
- **SVG Vector Graphics**: 60 templates properly render clean inline SVGs for contact details and section icons.
- **Emoji / Unicode Glyph Violations**: 9 templates contain raw Unicode symbols as bullet points or icons, violating the strict anti-slop rules:
  - `buenos_aires_tango.js` (`✦`)
  - `cairo_gold.js` (`❖`)
  - `cape_town_sunset.js` (`☀`)
  - `helsinki_frost.js` (`❄`)
  - `lyon_lavender.js` (`✦`)
  - `madrid_sun.js` (`☼`)
  - `prague_brass.js` (`❧`)
  - `vancouver_pine.js` (`🌲`)
  - `vienna_crest.js` (`♦`)
- **Recommendation**: Replace all 9 Unicode glyphs with clean inline SVGs or standard typographic bullets (`•`).

---

## 2. Zero-Pollution & Mock Data Cleansing Audit

### 2.1 The Mock Data Resurrection Bug
When a user clears their resume form or starts from an empty state (`data = { name: '', title: '', ... }`), 84 out of 85 templates resurrect mock data strings via logical OR fallbacks:

```javascript
// Example in mariana.js:652
<h1 data-df-field="name">${data.name || 'Candidate Name'}</h1>

// Example in terracotta_arch.js:19
const nameParts = (data.name || 'Adeline Palmerston').trim().split(' ');
const firstName = nameParts[0] || 'Adeline';

// Example in adam_fletcher.js:19
const nameParts = (data.name || 'Adam Fletcher').trim().split(' ');
```

### 2.2 Forensic Breakdown of Pollution Types
1. **Generic Placeholders (68 Templates)**: Inject `'Candidate Name'` into `<h1>` when `data.name` is falsy.
2. **Specific Mock Personas (16 Templates)**: Inject hardcoded sample names when `data.name` is empty:
   - `adeline_palmerston.js` -> `'Adeline Palmerston'`
   - `adam_fletcher.js` -> `'Adam Fletcher'`
   - `adora_montminy.js` -> `'Adora Montminy'`
   - `alfredo_torres.js` -> `'Alfredo Torres'`
   - `arthur_pendelton.js` -> `'Arthur Pendelton'`
   - `donna_stroupe.js` -> `'Donna Stroupe'`
   - `howard_ong.js` -> `'Howard Ong'`
   - `isabel_mercado.js` -> `'Isabel Mercado'`
   - `isabel_schumacher.js` -> `'Isabel Schumacher'`
   - `jonathan_patterson.js` -> `'Jonathan Patterson'`
   - `kelly_mint.js` -> `'Kelly Blackwell'`
   - `korina_villanueva.js` -> `'Korina Villanueva'`
   - `lorna_alvarado.js` -> `'Lorna Alvarado'`
   - `marcus_vance.js` -> `'Marcus Vance'`
   - `richard_sanchez.js` -> `'Richard Sanchez'`
   - `sebastian_bennett.js` -> `'Sebastian Bennett'`
   - `terracotta_arch.js` -> `'Adeline Palmerston'`
3. **Orphan Section Headers on Empty State (59 Templates)**: In 59 templates, the "Contact" header block (`<div class="sidebar-section"><h3>Contact</h3>...</div>`) is rendered unconditionally, even when `phone`, `email`, `location`, `website`, and `linkedin` are all empty strings.
4. **Hardcoded Document Titles**: Several templates include hardcoded document `<title>` tags (e.g. `<title>Adam Fletcher - Resume</title>`) instead of dynamic `<title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>`.

---

## 3. Universal WYSIWYG Attribute Stamping (`data-df-field`)

### 3.1 Canonical Taxonomy Compliance Matrix
Based on `src/engines/utility/wysiwygStateEngine.js`, the canonical contract requires exact path stamping:

| Field Domain | Canonical Format | Template Coverage | Status & Gaps |
| :--- | :--- | :---: | :--- |
| **Candidate Name** | `data-df-field="name"` | 85 / 85 (100%) | Fully stamped |
| **Job Title** | `data-df-field="title"` | 85 / 85 (100%) | Fully stamped |
| **Summary / Bio** | `data-df-field="summary"` | 84 / 85 (99%) | 1 missing (`isabel_schumacher.js`) |
| **Email Address** | `data-df-field="email"` | 85 / 85 (100%) | Stamped, but 71 have duplicate tags |
| **Phone Number** | `data-df-field="phone"` | 80 / 85 (94%) | 5 missing |
| **Location / Address** | `data-df-field="location"` | 80 / 85 (94%) | 5 missing |
| **Website** | `data-df-field="website"` | 48 / 85 (56%) | 37 omit website entirely |
| **LinkedIn** | `data-df-field="linkedin"` | 48 / 85 (56%) | 37 omit linkedin entirely |
| **Work Experience** | `exp:${idx}:role`, `exp:${idx}:company`, `exp:${idx}:date`, `exp:${idx}:highlight:${hIdx}` | 85 / 85 (100%) | Stamped, but with composite concatenation bugs in ~14 templates |
| **Education** | `edu:${idx}:degree`, `edu:${idx}:school`, `edu:${idx}:date` | 85 / 85 (100%) | Stamped, but with composite concatenation bugs in ~14 templates |
| **Skills & Expertise** | `skill:${idx}` | **40 / 85 (47%)** | **45 templates completely lack `data-df-field` on skills!** |
| **Key Projects** | `proj:${idx}:name`, `proj:${idx}:url`, `proj:${idx}:description` | **29 / 85 (34%)** | **56 templates lack `data-df-field` on projects!** |
| **Certifications** | `cert:${idx}` | 72 / 85 (85%) | 13 templates lack `data-df-field` on certs |
| **References** | `ref:${idx}:name`, `ref:${idx}:relation`, `ref:${idx}:contact` | **10 / 85 (12%)** | **75 templates lack references stamping!** |
| **Custom Sections** | `custom:${cs.id}:${idx}:title`, `custom:${cs.id}:${idx}:value` | **11 / 85 (13%)** | **74 templates lack custom sections stamping!** |

### 3.2 Duplicate Tag Stamp Defect (71 Templates)
In 71 templates, prior regex replacements introduced duplicate attribute stamps on the same DOM element:

```html
<!-- Example from mariana.js:22, amsterdam_orange.js, etc. -->
<a href="mailto:${data.email}" class="val" data-df-field="email" data-df-field="email" data-df-field="email">${data.email}</a>
```
This violates valid HTML syntax and creates AST parse bloat.

### 3.3 Composite-Field Concatenation Violations
In several templates (e.g. `terracotta_arch.js`, `adam_fletcher.js`, `adeline_palmerston.js`), multiple fields are concatenated into a single DOM element with a single `data-df-field` attribute:

```javascript
// Defective pattern in terracotta_arch.js:428
<div class="exp-meta" data-df-field="exp:${idx}:date">
  ${e.company || ''}${e.company && (e.start || e.end) ? ' | ' : ''}${e.start || ''}${e.start && e.end ? ' - ' : ''}${e.end || ''}
</div>
```
When a user clicks this element to edit inline, typing overwrites `company | 2020 - 2022` directly into `exp:${idx}:date`, completely corrupting the state.

**Mandatory Solution (Composite Isolation)**: Separate sub-fields into dedicated child spans:
```javascript
<div class="exp-meta">
  <span class="exp-company" data-df-field="exp:${idx}:company">${e.company || ''}</span>
  ${e.company && (e.start || e.end) ? '<span class="sep"> | </span>' : ''}
  <span class="exp-date" data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
</div>
```

---

## 4. Avatar Masking & Circular Zoom Tolerance

### 4.1 Root Cause Analysis of Photo Blowout
`ResumeBuilder.jsx` supports interactive candidate photo zooming and panning (`photoCrop: { scale: 1.0 to 3.0, x: -100 to 100, y: -100 to 100 }`).
`printUtils.js` injects dynamic CSS transforms:
```css
.avatar {
  transform: scale(1.5) translate(10px, -5px) !important;
  transform-origin: center center !important;
}
```

### 4.2 Audit Findings
- **82 templates** render a photo.
- **Only 28 templates** have a dedicated outer container with `overflow: hidden; border-radius: 50%` (or arch shape).
- **54 templates** render `<img class="profile-photo" ...>` directly or wrap it in a `<div>` that lacks `overflow: hidden`.
- When `transform: scale(1.5)` is applied, the image expands beyond its visual boundary, bleeding into headers, sidebars, and text columns.
- Furthermore, 16 templates use class name `.profile-photo` while `injectPhotoCropStyles` only targets `.avatar`.

### 4.3 Standard Masking Specification
Every template must implement the two-tier masking architecture:

```html
<div class="avatar-container">
  <div class="avatar-mask">
    <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
  </div>
</div>
```
With CSS:
```css
.avatar-mask {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

---

## 5. Existing Test Suites & Harness Assessment

### 5.1 Current Test Infrastructure Inventory

| File Path | Runner / Framework | What It Currently Tests | Gaps / Missing Capabilities |
| :--- | :--- | :--- | :--- |
| `scripts/audit_suite.py` | Python 10-phase runner | AST syntax, Ruff linting, Bandit security, Semgrep OWASP, Pytest backend, Vite build | Does not test template DOM or resume generation |
| `scripts/test_render_all.mjs` | Node.js ESM script | Executes all 85 templates with 1 default mock payload; checks `html.length > 1000` | Only tests 1 static payload; does not check empty state or attribute correctness |
| `scripts/audit_adversarial_templates.mjs` | Node.js ESM script | Executes 85 templates against 6 edge-case datasets (empty, null, long strings, XSS); checks for fatal crashes | Only checks `try/catch` and output string length > 50; ignores mock data resurrection and attribute validity |
| `scripts/test_template_renders.py` | Python script | Regex search for `'experience' in code` | Static text search only; does not execute code |
| `tests/frontend/test_100_queries.js` | Node.js ESM script | 110-query semantic hybrid search benchmark for tool catalog | Tests tool search only; unrelated to templates |
| `backend/tests/` | Pytest | PDF conversions, Ghostscript PDF/A, auth, billing, OCR | Backend only |

### 5.2 Test Harness Recommendations

To comply with the Strict Molecular Testing Protocol (Rule 4) and guarantee zero regressions across all 85 templates:

1. **Automated Catalog Matrix Test Suite (`tests/frontend/test_template_catalog_matrix.mjs`)**:
   - Create an automated, standalone Node.js test harness that imports all 85 generator functions directly from `src/engines/utility/resumeTemplates.js`.
   - Execute 4 distinct payload passes per template (340 total execution runs):
     1. **Empty Payload Pass**: Zero mock strings allowed in output (e.g. assert no `'Candidate Name'`, `'Adeline Palmerston'`, `'Adam Fletcher'`, etc.).
     2. **Full Canonical Payload Pass**: Assert 100% presence of canonical `data-df-field` attributes (`name`, `title`, `summary`, `email`, `phone`, `location`, `exp:0:role`, `exp:0:company`, `exp:0:date`, `edu:0:degree`, `edu:0:school`, `skill:0`, `proj:0:name`, `cert:0`, `ref:0:name`, `custom:*`).
     3. **Photo Masking Pass**: Assert that `<img` is enclosed within a container declaring `overflow: hidden` and `border-radius`.
     4. **Print & A4 Geometry Pass**: Assert discrete A4 dimensions ($794\text{px} \times 1123\text{px}$), `@media print`, `-webkit-print-color-adjust: exact`, and `:last-child` page-break avoidance.
2. **Master Audit Suite Integration (`scripts/audit_suite.py`)**:
   - Add Phase 11 to `scripts/audit_suite.py`: `run_template_catalog_audit()`.
   - Gate the entire build and CI pipeline on 100% pass rate across all 85 templates.

---

## 6. Actionable Implementation Roadmap

| Priority | Phase | Target Files | Key Actions |
| :---: | :--- | :--- | :--- |
| **P0** | **Catalog Zero-Pollution Cleansing** | All 85 files in `src/engines/utility/templates/` | Remove `|| 'Candidate Name'`, `|| 'Adeline Palmerston'`, etc. Replace with `${data.name || ''}`. Conditionally guard empty Contact headers (`hasContact`). |
| **P0** | **Attribute Stamping & Deduplication** | All 85 files in `src/engines/utility/templates/` | Remove duplicate `data-df-field` attributes. Stamp missing `skill:${idx}`, `proj:${idx}:*`, `cert:${idx}`, `ref:${idx}:*`, `custom:*`. Enforce composite-field isolation on company/date and school/date. |
| **P1** | **Universal Avatar Masking** | All 85 files in `src/engines/utility/templates/` | Standardize photo markup to `.avatar-mask > .avatar` with `overflow: hidden; border-radius: 50%` (or arch). Update `printUtils.js` to target `.avatar, .profile-photo`. |
| **P1** | **Print & A4 Geometry Standardization** | All 85 files in `src/engines/utility/templates/`, `printUtils.js` | Enforce `.cv-page` container class ($794\text{px} \times 1123\text{px}$), clean page breaks (`page-break-after: always; .cv-page:last-child { page-break-after: avoid; }`), and sanitize 9 emoji glyphs. |
| **P0** | **340-Test Molecular Verification Suite** | `tests/frontend/test_template_catalog_matrix.mjs`, `scripts/audit_suite.py` | Implement comprehensive automated test harness with >300 individual falsifiable assertions across all 85 templates. |

---

*Report prepared by Explorer 3 for DocForge 85-Template Catalog Project.*
