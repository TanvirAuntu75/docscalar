## 2026-09-02T13:43:40Z
Scope: Milestone M2 — Candidate Title & Section Heading Resilient Stamping (Requirement R2 + Template Registry cleanup).
Exclusive File Ownership:
- `src/engines/utility/templateRegistry.js`
- `src/components/ResumeStudio/TemplateGalleryModal.jsx`
- All 89 templates in `src/engines/utility/templates/*.js`

Tasks:
1. `src/engines/utility/templateRegistry.js`:
   - Add curated `candidateTitle` to all 89 `TEMPLATE_MAP` entries based on `.agents/explorer_survey_2/proposed_candidate_titles.json`.
   - Strip all raw unicode emoji prefixes (`🛡️`, `👑`, `✨`) from all 89 template labels (e.g. `'🛡️ Harvard Classic'` -> `'Harvard Classic'`).
2. `src/components/ResumeStudio/TemplateGalleryModal.jsx`:
   - In `handleSelectTemplate` (lines 59-73): When selecting a template, auto-populate `title` with `item.candidateTitle` if the current title is empty or default (`'Marketing Manager'`).
   - Replace raw emoji category tabs with Google Material Symbols (`grid_view`, `shield`, `business_center`, `palette`).
3. All 89 templates in `src/engines/utility/templates/*.js`:
   - Replace destructive `${safeData.title ? ... : ''}` omission guards with resilient `<div class="candidate-title ${existingClasses}" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>` to ensure title DOM nodes remain visible and click-to-editable in WYSIWYG mode.
   - Section Headings: Ensure every section renderer outputs `<h2 class="section-heading ${existingClasses}" data-df-field="heading:<sectionKey>">${safeData.sectionTitles?.[sectionKey] || defaultHeading}</h2>` regardless of where the section is moved in `sectionOrder`.
4. Verification:
   - Run: `node tests/frontend/test_template_catalog_matrix.mjs` or `node scratch/test_template_catalog_matrix.mjs` (must pass 1,780/1,780 assertions, 100%).
