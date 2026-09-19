# Project: DocForge CV Builder Master Resolution & Flaw Elimination

## Architecture
DocForge CV Builder is a privacy-first, client-side document crafting environment built on React 18, Vite, and Vanilla CSS. It comprises:
1. **Template & Runtime Engine (`src/engines/utility/`)**:
   - `paginationEngine.js`: Deterministic multi-page height budgeting, dynamic column routing, discrete Page 2 budgeting, spacing ladder auto-tuning.
   - `universalTemplateRuntime.js`: Universal section ordering dispatcher, multi-page partition rendering (`p1MainHtml`, `p2MainHtml`), zero-ghost-header sanitization, and layout reflow.
   - `templateRegistry.js`: Master metadata catalog for all 89 templates with curated `candidateTitle` and clean label design.
   - `templates/*.js`: 89 distinct CV template rendering engines outputting resilient candidate titles and normalized section heading DOM nodes.
2. **Interactive UI & WYSIWYG Canvas (`src/components/ResumeStudio/`)**:
   - `LivePreviewCanvas.jsx`: Reactive iframe WYSIWYG direct editing with isolated lifecycle controllers (`enableDirectEditOnDoc`, `disableDirectEditOnDoc`).
   - `TemplateGalleryModal.jsx`: Interactive template catalog with auto-populating persona titles and Google Material Symbols category tabs.
   - Studio Steps & Modals: Material Symbols icon design system across Review, Experience, Personal Info, ATS Diagnostic, and Photo Studio.
3. **Application Pages & Global Utilities (`src/pages/`, `src/utils/`)**:
   - Clean, emoji-free interfaces with standard Google Material Symbols across `Home.jsx`, `NotFound.jsx`, `TranslatePdf.jsx`, `MergePdf.jsx`, and `constants.js`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Remove `+ 90` constant & Add Spacing Ladder | Eliminate artificial 90px inflation; apply micro-tuning ladder (lineSpacing 1.45->1.25, pageMargin 0->6px, gap 16->10px) on <=12% single page budget | M1 | Survey (R1) |
| 2 | Dynamic Column Routing in Pagination | Integrate `computeColumnRouting` so Education, Skills, and Languages deduct height when routed to Main column | M1 | Survey (R1) |
| 3 | Discrete Page 2 Budgeting | Compute `page2Budget` and maintain `p2RemainingBudget` instead of dumping overflow unconditionally into Page 2 | M1 | Survey (R1) |
| 4 | Character-Scaled Height Estimation | Enhance `estimateJobHeight` (92 vs 62 chars/line for single/split, measure `description`) and `estimateRefHeight` (line spacing & multi-line contacts) | M1 | Survey (R1) |
| 5 | Multi-Page Partition Rendering Integration | Ensure `universalTemplateRuntime.js` and templates render `runtime.p1MainHtml` and `runtime.p2MainHtml` cleanly | M1 | Survey (R1) |
| 6 | Curated `candidateTitle` in `TEMPLATE_MAP` | Annotate all 89 templates in `templateRegistry.js` with professional persona candidate titles | M2 | Survey (R2) |
| 7 | Template Gallery Title Auto-Population | Auto-populate `title` with `item.candidateTitle` when selecting a template if title is empty or default in `TemplateGalleryModal.jsx` | M2 | Survey (R2) |
| 8 | Resilient Title Stamping across 89 Templates | Replace destructive `${safeData.title ? ... : ''}` guards with resilient `<div class="candidate-title" data-df-field="title" style="min-height: 1.2em;">${safeData.title \|\| 'Professional Title'}</div>` | M2 | Survey (R2) |
| 9 | Normalized Section Heading Stamping | Ensure all section renderers output `<h2 class="section-heading" data-df-field="heading:<sectionKey>">${title}</h2>` across all templates | M2 | Survey (R2) |
| 10 | Idempotent Direct Edit Controllers | Implement pure `enableDirectEditOnDoc(doc, actions)` and `disableDirectEditOnDoc(doc)` in `LivePreviewCanvas.jsx` | M3 | Survey (R3) |
| 11 | Reactive `useEffect` for Iframe WYSIWYG | Reactively toggle direct editing on iframe DOM upon `[directEdit, previewHtml]` changes without reload | M3 | Survey (R3) |
| 12 | Deep Event Listener & DOM Attribute Isolation | Nullify all event handlers (`oninput`, `onblur`, etc.), strip `contenteditable`/`spellcheck`, blur active element on edit disable | M3 | Survey (R3) |
| 13 | Template Registry Label Emoji Eradication | Strip raw unicode emojis (`🛡️`, `👑`, `✨`) from all 89 template labels in `templateRegistry.js` | M4 | Survey (R4) |
| 14 | Template Gallery Category Tabs Material Symbols | Replace emoji tabs with `grid_view`, `shield`, `business_center`, `palette` | M4 | Survey (R4) |
| 15 | Resume Studio Action Buttons Material Symbols | Replace `⚡` with Material Symbol `auto_awesome` in `ReviewDesignStep.jsx`, `ExperienceStep.jsx`, `PersonalInfoStep.jsx` | M4 | Survey (R4) |
| 16 | ATS Diagnostic Modal Material Symbols | Replace emoji tab prefixes (`📊`, `🔬`, `🎯`, `🛡️`, `⚠️`, `✅`) with Material Symbols | M4 | Survey (R4) |
| 17 | Photo Studio & Global Page Emoji Eradication | Replace emojis in `PhotoStudioModal.jsx`, `NotFound.jsx`, `Home.jsx`, `TranslatePdf.jsx`, `MergePdf.jsx`, and `constants.js` | M4 | Survey (R4) |
| 18 | Master Molecular Matrix & Acceptance Verification | Pass 163/163 runtime assertions, 1,780/1,780 template matrix assertions, 0 emojis in `src/`, and clean Vite production build | M5 | Survey (E2E) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Pagination & Intelligent 2-Page Budgeting Engine | Features 1-5 (`paginationEngine.js`, `universalTemplateRuntime.js`) | None | DONE (208/208 tests passed) |
| M2 | Candidate Title & Section Heading Resilient Stamping | Features 6-9 (`templateRegistry.js`, `TemplateGalleryModal.jsx`, 89 templates) | None | DONE (1780/1780 tests passed) |
| M3 | Reactive Iframe Direct Edit Lifecycle & Event Isolation | Features 10-12 (`LivePreviewCanvas.jsx`) | M2 (title stamping) | IN_PROGRESS (worker: 82aafcd7-d331-4b50-9fe5-7ae22642d9fe) |
| M4 | Project-Wide Emoji Eradication & Material Symbols Design System | Features 13-17 (`templateRegistry.js`, studio steps, modals, pages, constants) | None | DONE (0 emojis in assigned files) |
| M5 | Master Molecular Matrix & Final Gating | Feature 18 (All test suites: runtime 163/163, matrix 1780/1780, emoji scan 0, npm run build) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### `paginationEngine.js` ↔ `universalTemplateRuntime.js` & Templates
- `computeTwoPagePartition(safeData, sectionOrder, layoutRules, isSingleLayout)`:
  - Input: `safeData` (object), `sectionOrder` (array of string keys), `layoutRules` (object), `isSingleLayout` (boolean).
  - Output: `{ p1MainItems: [], p2MainItems: [], onPage2: boolean, autoTunedSpacing?: object }`.
- Dynamic Column Routing: Calls `computeColumnRouting(safeData, sectionOrder, layoutRules, isSingleLayout)` to categorize sections into `mainItems` and `sidebarItems`.
- Spacing Ladder Micro-Tuning: When total estimated content is within 12% of `page1Budget`, computes adjusted `{ lineSpacing, pageMargin, sectionGap }` so content fits seamlessly on 1 page before splitting.

### `templateRegistry.js` ↔ `TemplateGalleryModal.jsx`
- `TEMPLATE_MAP[templateKey]`:
  - Contains `{ label: string (no emojis), candidateName: string, candidateTitle: string, atsTier: string, ... }`.
- `TemplateGalleryModal.jsx`:
  - When user selects template, if `data.title` is empty or default (`'Marketing Manager'`), auto-populates `data.title = item.candidateTitle`.

### Resilient Title & Section Heading DOM Contracts
- Candidate Title: `<div class="candidate-title ${existingClasses}" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>`
- Section Headings: `<h2 class="section-heading ${existingClasses}" data-df-field="heading:${sectionKey}">${safeData.sectionTitles?.[sectionKey] || defaultHeading}</h2>`

### Direct Edit Lifecycle Contracts in `LivePreviewCanvas.jsx`
- `enableDirectEditOnDoc(doc, actions)`: Pure, idempotent initializer that attaches outlines and binds DOM handlers to `[data-df-field]`.
- `disableDirectEditOnDoc(doc)`: Pure, idempotent cleanup that removes outlines, nullifies all event handlers, strips `contenteditable`/`spellcheck`, and blurs active elements.
- Reactive Hook: `useEffect(() => { ... }, [directEdit, previewHtml])` dynamically toggles editing state on `iframeRef.current.contentDocument`.

## Code Layout
- `src/engines/utility/paginationEngine.js` — Core pagination, height budgeting, column routing, auto-tuning.
- `src/engines/utility/universalTemplateRuntime.js` — Universal section ordering, HTML dispatching, layout reflow.
- `src/engines/utility/templateRegistry.js` — Template registry, metadata, persona candidate titles, labels.
- `src/engines/utility/templates/*.js` — 89 CV template renderers.
- `src/components/ResumeStudio/LivePreviewCanvas.jsx` — Iframe preview canvas & direct edit WYSIWYG lifecycle.
- `src/components/ResumeStudio/TemplateGalleryModal.jsx` — Template gallery modal.
- `src/components/ResumeStudio/steps/*.jsx` — Studio steps (PersonalInfo, Experience, ReviewDesign).
- `src/components/ResumeStudio/AtsDiagnosticModal.jsx`, `PhotoStudioModal.jsx` — Studio modals.
- `src/pages/*.jsx` — Application pages (`Home.jsx`, `NotFound.jsx`, etc.).
- `scratch/` & `tests/frontend/` — Verification test suites (`test_r1_universal_runtime.mjs`, `test_template_catalog_matrix.mjs`, `scan_all_emojis.mjs`).
