# Original User Request

## Initial Request — 2026-09-02T13:33:20Z

# Teamwork Project Prompt — Master Resolution & Flaw Elimination

Comprehensive resolution of all 4 core CV Builder anomalies and any adjacent flaws across DocForge: Multi-Page Height Budgeting & 2-Page Auto-Fitting, Candidate Title & Section Heading Resilient Stamping, Iframe Direct Edit Reactive Lifecycle, and Full Emoji Eradication across the entire application design system.

Working directory: c:/Users/Tanvir Alam/Downloads/New folder upscaled
Integrity mode: development

## Requirements

### R1. Deterministic Multi-Page Pagination & Intelligent 2-Page Budgeting Engine (P0)
- **Target Files & Locations**:
  - `src/engines/utility/paginationEngine.js:L113`: Remove the flawed `+ 90` constant.
  - `src/engines/utility/paginationEngine.js:L129-130`: Replace static `mainKeys` filtering with dynamic column detection via `computeColumnRouting(safeData, sectionOrder, layoutRules, isSingleLayout)` so Education, Skills, and Languages deduct height when routed to the main column.
  - `src/engines/utility/paginationEngine.js:L145-276`: Add discrete `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight` and maintain `p2RemainingBudget` instead of dumping overflow unconditionally into `p2`.
  - `src/engines/utility/paginationEngine.js:L9-51`: Harden `estimateJobHeight` to measure both `highlights` and `e.description` based on column width (`isSingleColumn ? 92 : 62` chars/line). Harden `estimateRefHeight` to account for `lineSpacing` and multi-line contact rows.
  - `src/engines/utility/universalTemplateRuntime.js`: Integrate multi-page partition rendering (`runtime.p1MainHtml`, `runtime.p2MainHtml`) across all templates.
  - Spacing ladder auto-tuning: When total content height is within 12% of single page budget, apply micro-tuning (`lineSpacing: 1.45 -> 1.25`, `pageMargin: 0px -> 6px`, section gaps: `16px -> 10px`) before forcing a 2-page split.

### R2. Candidate Title & Section Heading Resilient Stamping (P0)
- **Target Files & Locations**:
  - `src/engines/utility/templateRegistry.js:L97-186`: Add `candidateTitle` to all 89 `TEMPLATE_MAP` entries (e.g. `Alex Chen` -> `Senior Full-Stack Software Engineer`, `David H. Sterling` -> `Executive Director & Operations Lead`, `Julian Thorne` -> `Investment Banking Strategist`, `Dr. Lawrence Sterling` -> `Senior Research Fellow & Academician`).
  - `src/components/ResumeStudio/TemplateGalleryModal.jsx:L59-73`: When selecting a template, auto-populate `title` with `item.candidateTitle` if the current title is empty or default.
  - All 89 templates in `src/engines/utility/templates/*.js`: Replace destructive `${safeData.title ? ... : ''}` omission guards with resilient `<div class="candidate-title" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>` to ensure title DOM nodes remain visible and click-to-editable in WYSIWYG mode.
  - Section Headings: Ensure every section renderer outputs `<h2 class="section-heading" data-df-field="heading:<sectionKey>">${title}</h2>` regardless of where the section is moved in `sectionOrder`.

### R3. Reactive Iframe Direct Edit Lifecycle & Event Isolation (P1)
- **Target Files & Locations**:
  - `src/components/ResumeStudio/LivePreviewCanvas.jsx`: Refactor WYSIWYG logic into two pure, idempotent controllers:
    - `enableDirectEditOnDoc(doc, actions)`: Cleans prior state, injects dashed hover/focus outlines, binds input/blur/paste/keydown handlers, and activates photo clicks.
    - `disableDirectEditOnDoc(doc)`: Blurs `doc.activeElement`, clears dynamic style elements, strips `contenteditable` and `spellcheck` attributes, and explicitly nullifies all DOM properties (`el.oninput = null`, `el.onblur = null`, `el.onpaste = null`, `el.onkeydown = null`, `photo.onclick = null`).
  - `LivePreviewCanvas.jsx`: Add a reactive `useEffect` watching `[directEdit, previewHtml]` to dynamically enable/disable editing inside the iframe DOM immediately upon button click without requiring iframe reload.

### R4. Project-Wide Emoji Eradication & Material Symbols Design System (P1)
- **Target Files & Locations**:
  - `src/engines/utility/templateRegistry.js:L97-186`: Strip all raw unicode emoji prefixes (`🛡️`, `👑`, `✨`) from all 89 template labels.
  - `src/components/ResumeStudio/TemplateGalleryModal.jsx:L31-33`: Replace raw emoji category tabs with Google Material Symbols (`grid_view`, `shield`, `business_center`, `palette`).
  - `src/components/ResumeStudio/steps/ReviewDesignStep.jsx:L225`: Replace `⚡ Fit to 1 Page` with `Fit 1 Page` and Material Symbol `auto_awesome`.
  - `src/components/ResumeStudio/steps/ExperienceStep.jsx:L198`: Replace `⚡ Enhance` with `Enhance` and Material Symbol `auto_awesome`.
  - `src/components/ResumeStudio/steps/PersonalInfoStep.jsx:L236`: Replace `⚡ Insert Pro Summary` with `Insert Pro Summary` and Material Symbol `auto_awesome`.
  - `src/components/ResumeStudio/AtsDiagnosticModal.jsx`: Replace emoji tab prefixes (`📊`, `🔬`, `🎯`, `🛡️`) with Material Symbols (`query_stats`, `biotech`, `track_changes`, `shield`).
  - `src/components/ResumeStudio/PhotoStudioModal.jsx:L194`: Replace `🖱️` with `drag_pan`.
  - `src/pages/NotFound.jsx:L25,37,49`: Replace `📦`, `🔄`, `📎` with Material Symbols (`folder_zip`, `sync`, `call_merge`).
  - `src/pages/Home.jsx`: Replace toast and greeting emojis (`⚠️`, `🗑️`, `📁`, `👋`) with standard text and icons.

## Acceptance Criteria

### Pagination & Height Budgeting
- [ ] 12-item resume with references renders Page 1 and Page 2 without clipping text or dropping references beyond 1123px.
- [ ] Dynamic column routing calculates exact heights for Education and Skills in main column without budget drift.
- [ ] Reordering Education before Experience preserves the Experience `<h2 class="section-heading">` and renders all experience entries cleanly.

### Editing & Event Lifecycle
- [ ] Toggling `Direct Edit: OFF` immediately disables `contenteditable`, removes dashed outlines, and stops `oninput`/`onblur` event dispatches in the iframe DOM.
- [ ] Clicking on Candidate Title in any template with an empty title allows inline editing and updates state.

### Design System Compliance
- [ ] Static scan across `src/` confirms 0 raw emoji characters in template labels, category tabs, and action buttons.
- [ ] All action buttons and modal headers render uniform Material Symbols with consistent stroke widths.

## Verification Resources & Commands
- `node scratch/test_r1_universal_runtime.mjs` (must pass 163/163)
- `node scratch/test_template_catalog_matrix.mjs` (must pass 1,780/1,780)
- `node scratch/scan_all_emojis.mjs` (must report 0 emoji lines in src/)
- `npm run build` (must exit 0)
