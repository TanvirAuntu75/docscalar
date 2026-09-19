# Handoff Report: Requirement R2 (Candidate Title & Section Heading Resilient Stamping)

## 1. Observation
1. **Template Registry Metadata Gap (`src/engines/utility/templateRegistry.js`)**:
   - `TEMPLATE_MAP` defines 89 templates (lines 98–187).
   - An automated AST scan (`.agents/explorer_survey_2/parse_template_map.mjs`) confirmed that **0 of 89 templates** possess a `candidateTitle` property.
   - Example entries:
     - `harvard_classic`: `{ label: '🛡️ Harvard Classic', candidateName: 'David H. Sterling' }`
     - `silicon_valley_ats`: `{ label: '🛡️ Silicon Valley ATS', candidateName: 'Alex Chen' }`
     - `wall_street_executive`: `{ label: '🛡️ Wall Street Exec', candidateName: 'Julian Thorne' }`
     - `oxford_minimalist`: `{ label: '🛡️ Oxford Minimalist', candidateName: 'Dr. Lawrence Sterling' }`

2. **Template Gallery Selection Desynchronization (`src/components/ResumeStudio/TemplateGalleryModal.jsx:L59-73`)**:
   - `handleSelectTemplate` updates `name` if `isDefaultName` is true, and `photoUrl` if `isDefaultPhoto` is true.
   - It performs zero checks or updates on `title`, leaving the user's title stuck on `'Marketing Manager'` (default from `resumeReducer.js:L22`) regardless of which template persona is selected.

3. **Destructive Omission Guards (`src/engines/utility/templates/*.js`)**:
   - 45 templates use explicit ternary guards like `${safeData.title ? `<div class="title" data-df-field="title">${safeData.title}</div>` : ''}`.
   - In 100% of the 89 templates, rendering with `safeData.title = ""` results in 0 elements matching `[data-df-field="title"]` in the DOM.
   - 70 templates lack the `.candidate-title` class name (using `.title`, `.job-title`, `.role`, etc.).

4. **Section Heading Stamping Gaps**:
   - 48 templates lack a `references` heading renderer or stamp.
   - 36 templates lack `data-df-field="heading:summary"`.
   - 10 templates lack `data-df-field="heading:certifications"`.
   - 51 templates lack dynamic section reflow when `sectionOrder` changes.

5. **1,780-Assertion Matrix Simulation (`.agents/explorer_survey_2/test_template_matrix_sim.mjs`)**:
   - Ran 20 empirical invariant checks across all 89 templates ($89 \times 20 = 1,780\text{ assertions}$).
   - **Passed**: 1,472
   - **Failed**: 308 (89 empty title drops, 70 missing candidate-title class, 51 static section orderings, 48 missing references, 30 missing A4 constraints, 10 missing certs, 6 missing edu items, 2 missing projects, 2 missing name stamps).

---

## 2. Logic Chain
1. **User Experience Impact**:
   - When a user initializes a CV with an empty title or clears their title in the editor form, the preview iframe DOM loses the title node completely.
   - In WYSIWYG mode (`LivePreviewCanvas.jsx`), clicking on the empty space where the title should be does nothing because no DOM node exists with `data-df-field="title"`.
   - This breaks inline direct-editing and violates the Core Acceptance Criteria for Editing & Event Lifecycle.
2. **Template Switcher Consistency**:
   - When users browse the Template Gallery, switching between different industry personas (e.g. from a Software Engineer template to a Wall Street Finance template) properly updates the candidate name and photo, but leaves the candidate title mismatched.
   - Providing `candidateTitle` in `TEMPLATE_MAP` and synchronizing it in `TemplateGalleryModal.jsx` when `title` is default/empty guarantees professional realism on every template selection.
3. **Resilient Stamping Drop-In Structure**:
   - Replacing `${safeData.title ? ... : ''}` with `<div class="candidate-title ${existingClass}" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>` guarantees:
     a. The title DOM node is ALWAYS present in the DOM tree.
     b. It has a non-zero height (`min-height: 1.2em;`), preventing vertical layout collapse.
     c. It displays a click-to-edit placeholder `'Professional Title'` when empty.
     d. It maintains existing template CSS classes (`title`, `job-title`, `role`, etc.) so that all font sizes, line heights, colors, and margins remain 100% pixel-perfect.
4. **Section Heading Normalization**:
   - Ensuring all section renderers output `<h2 class="section-heading ${existingClass}" data-df-field="heading:<sectionKey>">${safeData.sectionTitles?.[sectionKey] || defaultHeading}</h2>` enables inline section renaming via WYSIWYG and ensures section headings persist wherever a section is moved in `sectionOrder`.

---

## 3. Caveats
1. **CSS Selector Specificity**:
   - When adding `.candidate-title` to templates that previously used `.title` or `.job-title`, we must preserve the existing class (e.g. `class="candidate-title title"`) to avoid breaking template-specific CSS rules that target `.main-header .title`.
2. **Multi-Page Partition Headers**:
   - On Page 2 continuations, templates should NOT re-stamp the candidate title (Page 2 body contains overflow content only, without repeating the primary candidate title header).
3. **Custom Sections with Non-Standard Keys**:
   - Section heading stamping must support custom sections with dynamic IDs (`data-df-field="heading:${cs.id}"`) and dynamically read `cs.title`.

---

## 4. Conclusion
Requirement R2 is fully analyzed, scoped, and architected. The complete 89-template persona title registry has been curated and verified. The drop-in replacement for `TemplateGalleryModal.jsx` has been formulated. The exact resilient title stamping pattern and section heading standard have been designed. The 1,780-assertion test matrix has been pre-tested and provides an unambiguous pass/fail target for the implementation phase.

---

## 5. Verification Method
1. **Metadata Verification**:
   - Verify that all 89 entries in `src/engines/utility/templateRegistry.js` contain non-empty `candidateTitle` strings matching `.agents/explorer_survey_2/proposed_candidate_titles.json`.
2. **Template Gallery Modal Verification**:
   - Open `TemplateGalleryModal.jsx`, select any template with default/empty title, and verify `setField('title', item.candidateTitle)` fires.
3. **Resilient Title Stamping Verification**:
   - Render any of the 89 templates with `data.title = ""` or `data.title = undefined`.
   - Inspect rendered HTML string: must contain `data-df-field="title"`, `class="candidate-title"`, and `style="min-height: 1.2em;"`.
4. **Section Heading Verification**:
   - Verify every section (experience, education, skills, summary, projects, certifications, references, custom) contains `data-df-field="heading:<key>"`.
5. **Full Matrix Test Execution**:
   - Run `node scratch/test_template_catalog_matrix.mjs`.
   - Result must be: **1,780 / 1,780 assertions passed (100%)**.
