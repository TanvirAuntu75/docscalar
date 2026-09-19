# Handoff Report — Explorer 3 (Template Geometry, Stamping & Test Infrastructure)

## 1. Observation

Direct empirical observations across the workspace:

- **Template Registry**:
  - `src/engines/utility/resumeTemplates.js` exports exactly 85 generator functions matching the 85 files in `src/engines/utility/templates/`.
- **Mock Data Resurrection (84 / 85 Templates)**:
  - In `src/engines/utility/templates/mariana.js:652`, `diagonal_wedge.js:561`, `olivia.js`, etc., `data.name || 'Candidate Name'` is hardcoded.
  - In `src/engines/utility/templates/terracotta_arch.js:19`, `(data.name || 'Adeline Palmerston').trim().split(' ')` is hardcoded.
  - In `src/engines/utility/templates/adam_fletcher.js:19`, `(data.name || 'Adam Fletcher').trim().split(' ')` is hardcoded.
  - Executing `.agents/explorer_0_3/check_empty_payload_pollution.mjs` against all 85 templates with `data = { name: '', title: '', ... }` confirmed that **84 / 85 templates** output mock data strings (`'Candidate Name'` or persona names) into the rendered HTML.
  - Executing `.agents/explorer_0_3/check_empty_headers.mjs` confirmed that **59 / 85 templates** render empty `<h3>Contact</h3>` headers with underline bars on empty payloads.
- **WYSIWYG Attribute Stamping & Duplication (71 / 85 Templates)**:
  - In `src/engines/utility/templates/mariana.js:22`: `<a href="mailto:${data.email}" class="val" data-df-field="email" style="color: inherit; text-decoration: none;" data-df-field="email" data-df-field="email">` has 3 duplicate attributes.
  - Executing `.agents/explorer_0_3/audit_attributes.mjs` revealed that **71 / 85 templates** have duplicate `data-df-field` tags on single DOM elements.
  - Skills stamping is missing in 45 / 85 templates (`data-df-field="skill:${idx}"`).
  - Projects stamping is missing in 56 / 85 templates (`data-df-field="proj:${idx}:*"`).
  - References stamping is missing in 75 / 85 templates.
  - Custom sections stamping is missing in 74 / 85 templates.
  - Composite field concatenation violations: In `terracotta_arch.js:428`, `<div class="exp-meta" data-df-field="exp:${idx}:date">${e.company || ''}${e.company && (e.start || e.end) ? ' | ' : ''}${e.start || ''}${e.start && e.end ? ' - ' : ''}${e.end || ''}</div>` binds both company and date to a single date attribute.
- **Avatar Masking & Photo Containers (54 / 85 Templates)**:
  - Executing `.agents/explorer_0_3/audit_photos.mjs` revealed that only **28 / 85 templates** have a dedicated outer masking container with `overflow: hidden; border-radius: 50%`. 54 templates render bare `<img>` tags or unclipped containers.
  - In `src/engines/utility/printUtils.js:15`, `injectPhotoCropStyles` applies transforms specifically to `.avatar`, failing on templates using `.profile-photo`.
- **Vector Geometry & Print Engine**:
  - Executing `.agents/explorer_0_3/audit_geometry.mjs` revealed 70 Sidebar Split, 3 Diagonal Polygon, 7 Single Column, and 5 Arch Capsule archetypes.
  - 13 templates use `.resume-canvas` instead of `.cv-page`, escaping the print rules defined in `src/engines/utility/printUtils.js:54`.
  - Only 6 / 85 templates include `:last-child` page-break avoidance (`page-break-after: avoid !important`).
  - 9 templates contain raw Unicode/emoji glyphs (`✦`, `❖`, `☀`, `❄`, `☼`, `❧`, `🌲`, `♦`).
- **Existing Test Infrastructure**:
  - `scripts/audit_suite.py` contains a 10-phase full-stack runner (AST, Ruff, Bandit, Semgrep, Pytest, RAG benchmark, Vite build) but zero template DOM assertions.
  - `scripts/test_render_all.mjs` only checks `html.length > 1000` with 1 default payload.
  - `scripts/audit_adversarial_templates.mjs` only tests for runtime crashes across 6 payloads without inspecting output strings or DOM attributes.

---

## 2. Logic Chain

1. **Premise 1 (Zero-Pollution Rule)**: Cleared user fields must never render sample/mock strings (R1).
   - *Observation*: 84 templates use `data.name || 'Candidate Name'` or persona names (`'Adam Fletcher'`).
   - *Inference*: Clearing user fields resurfaces mock data strings in production.
   - *Fix*: Replace all `data.name || 'Mock'` with `${data.name || ''}` and conditionally render headers based on content presence.

2. **Premise 2 (State Sync & WYSIWYG Contract)**: Direct inline DOM editing relies on `data-df-field` attributes matching `wysiwygStateEngine.js` (R3).
   - *Observation*: 71 templates have duplicate tags, 45 miss skill tags, 56 miss project tags, 75 miss reference tags, and ~14 templates concatenate company and dates into single date tags.
   - *Inference*: Inline editing corrupts state when clicking concatenated elements, and misses unstamped skill/project/custom sections.
   - *Fix*: Remove duplicate tags, stamp all sections canonically, and isolate composite sub-fields into dedicated child spans (`<span class="exp-company" data-df-field="exp:${idx}:company">` and `<span class="exp-date" data-df-field="exp:${idx}:date">`).

3. **Premise 3 (Photo Zoom Tolerance)**: Interactive photo cropping (`photoCrop`) injects `transform: scale(1.0-3.0) translate(...)` (R4).
   - *Observation*: 54 templates lack `overflow: hidden; border-radius: 50%` wrapper containers around `<img>`.
   - *Inference*: Zooming candidate photos causes the image rectangle to bleed into adjacent sidebars and headers.
   - *Fix*: Standardize all candidate images into `<div class="avatar-mask"><img class="avatar" src="..." /></div>` with `overflow: hidden; border-radius: 50%` (or styled arch) on `.avatar-mask`.

4. **Premise 4 (Discrete A4 Parity & Print Fidelity)**: Resumes must adhere to $794\text{px} \times 1123\text{px}$ with `@media print` parity and zero trailing blank pages (R2, R3).
   - *Observation*: 13 templates use `.resume-canvas` instead of `.cv-page`, 79 templates lack `:last-child` page-break avoidance, and 9 templates use raw emoji glyphs.
   - *Inference*: PDF exports generate trailing blank pages and unstyled print renders on non-`.cv-page` templates.
   - *Fix*: Standardize container classes to `.cv-page`, add `.cv-page:last-child { page-break-after: avoid !important; }`, update `printUtils.js` to target `.cv-page, .resume-canvas`, and replace emoji glyphs with clean SVGs.

5. **Premise 5 (Strict Molecular Verification)**: Verification requires at least 30 distinct test areas and up to 100 assertions with zero fake passes.
   - *Observation*: Current test scripts only check `try/catch` and output length.
   - *Inference*: A dedicated automated test suite (`tests/frontend/test_template_catalog_matrix.mjs`) is required to test all 85 templates across empty payloads, full payloads, photo masking, and print geometry.

---

## 3. Caveats

- **Two-Page Pagination Scope**: While 5 templates implement `computeTwoPagePartition`, implementing dynamic pagination across all remaining 80 templates requires architectural coordination with the pagination engine to preserve each template's unique visual identity and sidebar proportion.
- **Photo Crop Transform Target**: `printUtils.js` must be updated to target both `.avatar` and `.profile-photo` during migration so that legacy or in-transition templates do not regress.
- **Custom Section Variability**: Custom sections can contain unstructured text, key-value items, or language tags. Templates should dynamically detect and stamp `data-df-field="custom:${cs.id}:${idx}:title"` and `data-df-field="custom:${cs.id}:${idx}:value"`.

---

## 4. Conclusion

The 85-template catalog requires systematic hardening across 5 concrete pillars:
1. **Pillar 1: Zero-Pollution Cleansing** across all 85 template files.
2. **Pillar 2: Universal WYSIWYG Attribute Stamping & Composite Isolation** across all interactive elements.
3. **Pillar 3: Universal Avatar Masking Containers** with `overflow: hidden; border-radius: 50%` (or arch/pill shapes).
4. **Pillar 4: Discrete A4 & Print Geometry Standardization** with `.cv-page`, `-webkit-print-color-adjust: exact`, `:last-child` page-break avoidance, and emoji glyph removal.
5. **Pillar 5: Comprehensive Automated Molecular Test Suite** executing 340+ test runs across all 85 templates.

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Mock Data Pollution Verification**:
   ```bash
   node .agents/explorer_0_3/check_empty_payload_pollution.mjs
   ```
   *Expected result*: Confirms 84 / 85 templates resurrect mock data on empty payload.

2. **Attribute Stamping & Duplication Verification**:
   ```bash
   node .agents/explorer_0_3/audit_attributes.mjs
   ```
   *Expected result*: Confirms 71 / 85 templates have duplicate `data-df-field` attributes and reveals stamping gaps for skills, projects, references, and custom sections.

3. **Avatar Masking Verification**:
   ```bash
   node .agents/explorer_0_3/audit_photos.mjs
   ```
   *Expected result*: Confirms 54 / 85 templates lack dedicated `overflow: hidden` photo masking containers.

4. **Geometry, Emoji & Print Verification**:
   ```bash
   node .agents/explorer_0_3/audit_geometry.mjs
   ```
   *Expected result*: Confirms archetype breakdown, 9 emoji glyph files, and 13 `.resume-canvas` non-standard container files.

5. **Full Exploration Report**:
   Inspect `.agents/explorer_0_3/report.md` for complete tabular breakdowns and forensic data.
