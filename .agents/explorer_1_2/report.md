# Architectural Survey & Modular Blueprint: R2 God-Component Decomposition & Undo/Redo Engine

**Author**: Explorer 2 (`teamwork_preview_explorer`)  
**Target Milestone**: R2 (God-Component Modularization & Undo/Redo Engine)  
**Working Directory**: `.agents/explorer_1_2`  
**Date**: 2026-09-01T15:53:00Z  

---

## 1. Executive Verdict & Architecture Overview

`src/pages/utility/ResumeBuilder.jsx` is currently a 4,273-line monolithic god-component combining:
1. Multi-step wizard form editing (8 tabs: steps 0–7)
2. Live sandboxed iframe preview canvas with dynamic responsive scaling and direct WYSIWYG text-editing event bridges
3. Template gallery viewer with 89 real-time mini iframe preview cards
4. ATS scoring diagnostics, X-Ray scanner, and semantic Job Description matching modals
5. Profile photo cropping, scaling, and canvas adjustment studio
6. JSON backup import/export and PDF/Print compilation engines
7. Local storage draft persistence, cross-tab multi-window synchronization, and un-mount flush hooks

This monolithic architecture creates tight coupling, rendering bottlenecks, caret-focus drops during in-template direct editing, and renders undo/redo impossible.

### Target State Architecture:
- **Centralized State & Dispatch**: `src/context/ResumeContext.jsx` & `src/context/resumeReducer.js`
- **Immutable Snapshot History Engine**: `src/engines/utility/historyEngine.js` (Ring-buffer immutable stack, max 40 snapshots, global keyboard shortcuts `Ctrl+Z` / `Ctrl+Y`)
- **14 Focused Subcomponents** in `src/components/ResumeStudio/`:
  - `PersonalInfoStep.jsx` (Step 0)
  - `ExperienceStep.jsx` (Step 1)
  - `EducationStep.jsx` (Step 2)
  - `SkillsStep.jsx` (Step 3)
  - `SummaryProjectsStep.jsx` (Step 4)
  - `AdditionalInfoStep.jsx` (Step 5)
  - `SectionManagerStep.jsx` (Step 6)
  - `ReviewDesignStep.jsx` (Step 7)
  - `LivePreviewCanvas.jsx` (Live iframe canvas, zoom, responsive fit, direct-edit toggle)
  - `TemplateGalleryModal.jsx` (Gallery screen + modal with category filters and preview cards)
  - `AtsDiagnosticModal.jsx` (ATS Health, X-Ray scanner, Job Description matcher)
  - `PhotoStudioModal.jsx` (Interactive avatar crop, pan, zoom, and rotate modal)
  - `JsonBackupModal.jsx` (Import/export JSON backup with validation and toast feedback)
  - `StudioHeaderNav.jsx` (Top action bar: ATS score pill, formatting cleaner, print, template switch, PDF export)
- **Ultra-Slim Top-Level Container**: `src/pages/utility/ResumeBuilder.jsx` reduced from 4,273 lines to < 180 lines, wrapping `<ResumeProvider>` around the layout.

---

## 2. Forensic Analysis of Monolithic `ResumeBuilder.jsx`

### Functional Clusters & Source Line Ranges:

| Line Range | Cluster / Functionality | Responsibilities & Observed Logic |
|---|---|---|
| **L1–116** | Imports & PDF.js Worker | Imports 89 template generators, `pdfjs-dist`, icons, intelligence helpers (`calculateAtsHealthScore`, `enhanceBullet`, `getRoleIntelligence`, etc.). |
| **L120–386** | In-Template WYSIWYG Bridge | Injects `<style>` and contenteditable event listeners (`DOCFORGE_INLINE_INPUT`, `DOCFORGE_INLINE_FOCUS`, `DOCFORGE_INLINE_BLUR`, `DOCFORGE_ADD_HIGHLIGHT_AFTER`, `DOCFORGE_REMOVE_HIGHLIGHT_PATH`) into the sandboxed template HTML. |
| **L388–524** | Default Resume State | `defaultData` payload containing name, title, contact, 3 experience entries, 2 education entries, 10 skills, 2 projects, 2 references, and `custom_languages`. |
| **L526–618** | `TEMPLATE_MAP` Registry | Dictionary mapping 89 template keys to labels, generate functions, badges, ATS ratings (100, 85, 70), ATS tiers (`ultra`, `corporate`, `creative`), candidate portrait paths, and candidate names. |
| **L619–1196** | `ResumePreview` Subcomponent | Live iframe canvas, `ResizeObserver` for scale calculation (`fit-width` vs `fit-page` vs `custom`), zoom toolbar (+/-), Direct Edit toggle, line-spacing toggle, and auto-tuning trigger (`autoTunePageFit`). |
| **L1198–1282** | UI Primitives | `SectionCard`, `FieldRow`, `sanitizeData` recursive HTML escaper, and shared input styles. |
| **L1284–1380** | `TemplateCard` Subcomponent | Mini-card with isolated `ResizeObserver` scaling iframe preview for catalog showcase. |
| **L1381–1751** | Top-Level State & Storage | Draft auto-save (debounced 400ms with quota-exceeded fallback), `beforeunload` flush save, multi-tab `storage` event synchronization, section movement (`moveSection`), and PDF text extraction parser (`importResumeFromPdf`). |
| **L1752–2208** | Resume Mutators & Handlers | `parseAndPopulateResume`, `handleExportJson`, `handleImportJson`, `setField`, `setExpField`, `addExp`, `removeExp`, `setEduField`, `addSkill`, `removeSkill`, `addProj`, `addRef`, `addCert`. |
| **L2209–2397** | Intelligence, Print & Export | `useMemo` hooks for ATS health, spatial diagnostics, role matching, job keyword matching (`analyzeSemanticJobMatch`), `handleAutoSanitize`, `handleDirectPrint`, `handleExport` (backend Playwright). |
| **L2410–2660** | Gallery & Getting Started | Full-screen template gallery (`screen === 'gallery'`) with tier filter tabs (`all`, `ats`, `corporate`, `creative`), pagination (`visibleTemplateCount`), and getting started view (`screen === 'start'`). |
| **L2661–2800** | Studio Header & Tab Strip | Top action bar (ATS Score pill, clean formatting, reset, backup JSON, restore JSON, full preview, print, change template, download CV) and 8-step wizard tab strip. |
| **L2818–3481** | Wizard Steps (0 to 7) | Step 0 (Personal Info), Step 1 (Experience), Step 2 (Education), Step 3 (Skills), Step 4 (Summary & Projects), Step 5 (Additional), Step 6 (Section & Title Serial Manager), Step 7 (Design & Review Options). |
| **L3581–3929** | ATS Diagnostics Modal | Full breakdown modal with 3 tabs: Health score dimensions, X-Ray plain text scanner with scramble radar, and Job Description keyword analyzer. |
| **L3930–4109** | Fullscreen Preview Modal | Full-screen backdrop portal with zoom modes (Fit Page, Fit Width, 75%, 100%, 125%) and export buttons. |
| **L4110–4250** | Photo Studio Modal | Circular mask viewport with Zoom/Scale (1x–3x), X-offset (-100px to +100px), and Y-offset (-100px to +100px). |
| **L4251–4273** | Direct Print Hidden Iframe | Hidden DOM iframe for direct browser `@media print` executions. |

---

## 3. Modular Decomposition Plan: 14 Subcomponents

All subcomponents will reside under `src/components/ResumeStudio/`.

```
src/components/ResumeStudio/
├── index.js                     # Unified barrel exports
├── StudioHeaderNav.jsx          # Top action bar with ATS score, export, print, draft status
├── LivePreviewCanvas.jsx        # Live iframe, zoom, scale, direct-edit & 1-page fit
├── TemplateGalleryModal.jsx     # Template gallery showcase & filter modal / screen
├── AtsDiagnosticModal.jsx       # ATS health breakdown, X-Ray scanner, JD matcher
├── PhotoStudioModal.jsx         # Avatar photo upload, crop, pan, zoom, rotate
├── JsonBackupModal.jsx          # JSON import/export & backup manager
├── steps/
│   ├── PersonalInfoStep.jsx     # Wizard Step 0: Name, title, contact, photo trigger, role tips
│   ├── ExperienceStep.jsx       # Wizard Step 1: Work history, highlights, XYZ bullet enhancer
│   ├── EducationStep.jsx        # Wizard Step 2: Degrees, schools, graduation dates, GPA notes
│   ├── SkillsStep.jsx           # Wizard Step 3: Skills pill matrix, tag adder, role skills
│   ├── SummaryProjectsStep.jsx  # Wizard Step 4: Executive summary, projects, URL, enhancer
│   ├── AdditionalInfoStep.jsx   # Wizard Step 5: Certifications, references, custom blocks
│   ├── SectionManagerStep.jsx   # Wizard Step 6: DnD / serial reordering, custom section titles
│   └── ReviewDesignStep.jsx     # Wizard Step 7: Accent color, 8 fonts, layout, margins, spacing
└── shared/
    ├── SectionCard.jsx          # Reusable glassmorphic section card container
    ├── FieldRow.jsx             # Accessible label and input wrapper
    └── TemplateCard.jsx         # Isolated responsive mini-preview card
```

### Detailed Component Specifications & Contracts:

#### 1. `PersonalInfoStep.jsx` (Step 0)
- **Props**: None (reads from `useResumeContext()`).
- **State Consumed**: `data.name`, `data.title`, `data.email`, `data.phone`, `data.location`, `data.linkedin`, `data.website`, `data.photoUrl`, `data.photoCrop`.
- **Actions Dispatched**: `SET_FIELD`, `OPEN_PHOTO_STUDIO`.
- **Integrations**: `getRoleIntelligence(data.title)` to display smart role recommendations for quick 1-click summary and skills insertion.

#### 2. `ExperienceStep.jsx` (Step 1)
- **Props**: None (reads from `useResumeContext()`).
- **State Consumed**: `data.experience`.
- **Actions Dispatched**: `ADD_EXPERIENCE`, `REMOVE_EXPERIENCE`, `SET_EXP_FIELD`, `ADD_EXP_HIGHLIGHT`, `REMOVE_EXP_HIGHLIGHT`, `SET_EXP_HIGHLIGHT`, `ENHANCE_BULLET`.
- **Integrations**: `enhanceBullet(highlight)` integration with 1-click "⚡ Enhance with Action Verbs" button.

#### 3. `EducationStep.jsx` (Step 2)
- **Props**: None.
- **State Consumed**: `data.education`.
- **Actions Dispatched**: `ADD_EDUCATION`, `REMOVE_EDUCATION`, `SET_EDU_FIELD`.

#### 4. `SkillsStep.jsx` (Step 3)
- **Props**: None.
- **State Consumed**: `data.skills`, `data.title`.
- **Actions Dispatched**: `ADD_SKILL`, `REMOVE_SKILL`, `SET_SKILLS`.
- **Features**: Comma-separated bulk tag input, duplicate prevention, and tailored role recommendations from `ROLE_INTELLIGENCE_DICTIONARY`.

#### 5. `SummaryProjectsStep.jsx` (Step 4)
- **Props**: None.
- **State Consumed**: `data.summary`, `data.projects`.
- **Actions Dispatched**: `SET_FIELD`, `ADD_PROJECT`, `REMOVE_PROJECT`, `SET_PROJ_FIELD`, `ENHANCE_PROJECT_DESCRIPTION`.
- **Features**: Live character counter, 1-click role summary generator, project bullet enhancer.

#### 6. `AdditionalInfoStep.jsx` (Step 5)
- **Props**: None.
- **State Consumed**: `data.certifications`, `data.references`, `data.customSections`.
- **Actions Dispatched**: `ADD_CERTIFICATION`, `REMOVE_CERTIFICATION`, `ADD_REFERENCE`, `REMOVE_REFERENCE`, `SET_REF_FIELD`, `ADD_CUSTOM_SECTION_ITEM`, `REMOVE_CUSTOM_SECTION_ITEM`.

#### 7. `SectionManagerStep.jsx` (Step 6)
- **Props**: None.
- **State Consumed**: `sectionOrder`, `data.sectionTitles`, `data.customSections`.
- **Actions Dispatched**: `SET_SECTION_ORDER`, `MOVE_SECTION`, `SET_SECTION_TITLE`, `ADD_CUSTOM_SECTION`.
- **Features**: Quick Ordering Presets (Standard Chronological, Skills First, Projects First, Academic First), Up/Down serial ordering buttons, editable section headings mapped to all 89 templates, and dynamic custom section creation.

#### 8. `ReviewDesignStep.jsx` (Step 7)
- **Props**: None.
- **State Consumed**: `themeColor`, `themeFont`, `themeLayout`, `pageMargin`, `lineSpacing`.
- **Actions Dispatched**: `SET_THEME_COLOR`, `SET_THEME_FONT`, `SET_THEME_LAYOUT`, `SET_PAGE_MARGIN`, `SET_LINE_SPACING`.
- **Features**: Color picker + hex input, 8 Google Fonts dropdown (`fontRegistry.js`), Layout Grid toggle (`single` vs `split`), page margin slider (10–45px), line spacing slider (1.1–1.9).

#### 9. `LivePreviewCanvas.jsx`
- **Props**: `onOpenPhoto`, `onAddHighlight`, `onRemoveHighlight`.
- **State Consumed**: `previewHtml`, `directEdit`, `lineSpacing`, `pageMargin`, `data`.
- **Actions Dispatched**: `SET_DIRECT_EDIT`, `SET_LINE_SPACING`, `SET_PAGE_MARGIN`, `APPLY_INLINE_EDIT`, `AUTO_TUNE_PAGE_FIT`.
- **Features**: Responsive scaling engine (`ResizeObserver`), zoom modes (`fit-width`, `fit-page`, `custom`), direct WYSIWYG caret protection, page height calculation, "⚡ Fit to 1 Page" smart optimizer.

#### 10. `TemplateGalleryModal.jsx`
- **Props**: `isOpen`, `onClose`.
- **State Consumed**: `activeTemplate`, `screen`, `templateCategoryFilter`.
- **Actions Dispatched**: `SET_ACTIVE_TEMPLATE`, `SET_SCREEN`, `SET_TEMPLATE_FILTER`.
- **Features**: Filter tabs (`All (89)`, `🛡️ 100% ATS Ultra (4)`, `👔 Corporate & Executive`, `🎨 Modern & Creative`), lazy loading card grid with candidate photos, 1-click template switch.

#### 11. `AtsDiagnosticModal.jsx`
- **Props**: `isOpen`, `onClose`.
- **State Consumed**: `data`, `activeTemplate`, `previewHtml`.
- **Actions Dispatched**: `ADD_SKILL`, `SET_ACTIVE_TEMPLATE`.
- **Tabs**:
  1. `health`: 0–100 score, grade, 5 weighted dimensions (Metrics, Verbs, Completeness, Links, Structure), actionable improvement suggestions.
  2. `xray`: Plain text extraction simulation, Y-band coordinate sorting, and Scramble percentage meter.
  3. `jd`: Job posting paste area, real-time match %, missing keywords with 1-click `[+ Add to Skills]` chips.

#### 12. `PhotoStudioModal.jsx`
- **Props**: `isOpen`, `onClose`.
- **State Consumed**: `data.photoUrl`, `data.photoCrop`.
- **Actions Dispatched**: `SET_FIELD` (`photoUrl`, `photoCrop`).
- **Features**: Drag-and-drop image upload, automatic client-side compression (max 400x400 to prevent localStorage quota errors), Zoom/Scale slider (1x–3x), X-offset (-100px to +100px), Y-offset (-100px to +100px), circular mask preview.

#### 13. `JsonBackupModal.jsx`
- **Props**: `isOpen`, `onClose`.
- **Actions Dispatched**: `IMPORT_DATA`, `RESET_DRAFT`.
- **Features**: JSON file export with version 2.0 metadata, JSON drag-and-drop restore with schema validation, PDF resume import via `pdfjs-dist` text coordinate extraction.

#### 14. `StudioHeaderNav.jsx`
- **Props**: `onExportPdf`, `onPrint`, `onOpenAtsModal`, `onOpenGallery`, `onOpenJsonModal`, `onOpenFullscreen`.
- **State Consumed**: `draftSaved`, `atsHealth.score`, `atsHealth.color`, `processing`, `canUndo`, `canRedo`.
- **Actions Dispatched**: `UNDO`, `REDO`, `AUTO_SANITIZE`, `RESET_DRAFT`.
- **Features**: Live autosave indicator (`Draft saved`), ATS score pill button, instant Clean Formatting button, Undo/Redo buttons (`Ctrl+Z` / `Ctrl+Y`), Full Preview, Print/PDF direct export, Change Template, Download CV primary button.

---

## 4. Single Source of Truth: `ResumeContext.jsx` & `resumeReducer.js`

### State Schema Contract:
```javascript
export const initialResumeState = {
  // Resume Content Data
  data: {
    name: 'Mariana Anderson',
    title: 'Marketing Manager',
    photoUrl: '/images/candidates/mariana.jpg',
    photoCrop: { scale: 1, x: 0, y: 0 },
    email: 'hello@reallygreatsite.com',
    phone: '+123-456-7890',
    location: '123 Anywhere St., Any City',
    website: 'reallygreatsite.com',
    linkedin: 'linkedin.com/in/mariana-anderson',
    summary: '...',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    references: [],
    customSections: [],
    sectionTitles: {}
  },
  // Theme & Styling Options
  theme: {
    activeTemplate: 'mariana',
    themeColor: 'default',
    themeFont: 'Inter',
    themeLayout: 'single', // 'single' | 'split'
    pageMargin: 24,       // px (10-45)
    lineSpacing: 1.4,      // (1.1-1.9)
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages']
  },
  // UI Navigation & Modals
  ui: {
    screen: 'editor', // 'gallery' | 'start' | 'editor'
    wizardStep: 0,    // 0 to 7
    activeSection: 'personal',
    directEdit: true,
    fullscreenPreview: false,
    atsModalOpen: false,
    atsModalTab: 'health',
    photoStudioOpen: false,
    jsonModalOpen: false,
    templateGalleryOpen: false,
    templateCategoryFilter: 'all',
    zoomMode: 'fit'
  },
  // Engine Runtime Status
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
```

### Reducer Action Taxonomy (`resumeReducer.js`):

```javascript
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
  
  // History
  UNDO: 'HISTORY/UNDO',
  REDO: 'HISTORY/REDO'
};
```

---

## 5. Ring-Buffer Undo/Redo Engine (`historyEngine.js`)

### Implementation Blueprint:
```javascript
// ═══════════════════════════════════════════════════════════════════════════════
// DocForge Immutable History Engine (Ring-Buffer Stack)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_HISTORY = 40;

/**
 * Creates a clean history stack data structure.
 */
export function createHistoryStack(initialState, maxSize = DEFAULT_MAX_HISTORY) {
  return {
    past: [],
    present: initialState,
    future: [],
    maxSize
  };
}

/**
 * Pushes a new state snapshot onto the history stack.
 * Drops oldest snapshots when exceeding maxSize.
 * Clears future redo branch.
 */
export function pushHistoryState(stack, nextState) {
  if (!stack) return createHistoryStack(nextState);
  if (stack.present === nextState) return stack;

  const past = [...stack.past, stack.present];
  const trimmedPast = past.length > stack.maxSize ? past.slice(past.length - stack.maxSize) : past;

  return {
    past: trimmedPast,
    present: nextState,
    future: [],
    maxSize: stack.maxSize
  };
}

/**
 * Traverses backward one step in time.
 */
export function undoHistoryState(stack) {
  if (!stack || stack.past.length === 0) return stack;

  const previous = stack.past[stack.past.length - 1];
  const newPast = stack.past.slice(0, -1);

  return {
    past: newPast,
    present: previous,
    future: [stack.present, ...stack.future],
    maxSize: stack.maxSize
  };
}

/**
 * Traverses forward one step in time.
 */
export function redoHistoryState(stack) {
  if (!stack || stack.future.length === 0) return stack;

  const next = stack.future[0];
  const newFuture = stack.future.slice(1);

  return {
    past: [...stack.past, stack.present],
    present: next,
    future: newFuture,
    maxSize: stack.maxSize
  };
}

export function canUndo(stack) {
  return Boolean(stack && stack.past && stack.past.length > 0);
}

export function canRedo(stack) {
  return Boolean(stack && stack.future && stack.future.length > 0);
}

/**
 * Keyboard shortcuts hook listening for Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z.
 */
export function attachHistoryKeyboardListener({ onUndo, onRedo, canUndoCheck, canRedoCheck }) {
  const handleKeyDown = (e) => {
    // Ignore if target is inside an input/textarea with active selection unless it's a structural undo
    const isModifier = e.ctrlKey || e.metaKey;
    if (!isModifier) return;

    if (e.key === 'z' || e.key === 'Z') {
      if (e.shiftKey) {
        // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
        if (canRedoCheck()) {
          e.preventDefault();
          onRedo();
        }
      } else {
        // Undo: Ctrl+Z or Cmd+Z
        if (canUndoCheck()) {
          e.preventDefault();
          onUndo();
        }
      }
    } else if (e.key === 'y' || e.key === 'Y') {
      // Redo: Ctrl+Y
      if (canRedoCheck()) {
        e.preventDefault();
        onRedo();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
```

---

## 6. Logic Map & Edge-Case Protection Matrix

### Logic Map 1: Direct In-Template Inline Editing with Caret Preservation
* **Trigger**: User types inside iframe contenteditable element (`input` event).
* **Condition**: `directEdit === true && isConnected === true`.
* **Action**:
  1. Iframe sends `DOCFORGE_INLINE_INPUT` postMessage with `fieldPath` and `value`.
  2. Set `isLocalTypingRef = true` with 1500ms timeout lock.
  3. Reducer applies `APPLY_INLINE_EDIT` to update `state.data`.
  4. Template generator effect skips iframe DOM re-creation while `isLocalTypingRef === true` so caret is not destroyed.
* **Transition**: Live score and word count indicators update instantly without DOM teardown.

### Logic Map 2: Undo / Redo Execution
* **Trigger**: User presses `Ctrl+Z` or clicks "Undo" in `StudioHeaderNav`.
* **Condition**: `canUndo(history) === true` (`history.past.length > 0`).
* **Action**:
  1. Reducer calls `undoHistoryState(history)`.
  2. `state.data` and `state.theme` revert to previous snapshot.
  3. `state.runtime.previewHtml` regenerates from restored snapshot.
* **Transition**: UI forms, wizard inputs, and preview iframe reflect historical snapshot with zero delay.

### Logic Map 3: LocalStorage Auto-Save with Quota Fallback
* **Trigger**: Any change to `data`, `theme`, or `wizardStep`.
* **Condition**: Debounce timer fires after 400ms.
* **Action**:
  1. Prepare sanitized payload `{ data, theme, ui }`.
  2. Attempt `localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))`.
  3. If `QuotaExceededError` occurs (e.g. 5MB base64 photo), strip `photoUrl` from stored payload and save text data safely.
* **Transition**: Set `state.runtime.draftSaved = true` with green check badge in `StudioHeaderNav`.

---

## 7. Quantitative Test Density & Verification Plan (30-100 Test Suite)

To comply with the Strict Molecular Testing Protocol, we will design an automated verification suite in `scratch/test_r2_modularization_and_history.mjs` executing **over 45 distinct test areas**:

1. **State Reducer Area (12 tests)**:
   - Initial draft hydration and fallback to `defaultData`.
   - `SET_FIELD` top-level field mutations (name, title, contact).
   - `ADD_EXPERIENCE` and `REMOVE_EXPERIENCE` array mutations.
   - `SET_EXP_HIGHLIGHT` and highlight deletion guards.
   - `ADD_EDUCATION` and `REMOVE_EDUCATION`.
   - `ADD_SKILL` with comma-split parsing and duplicate deduplication.
   - `ADD_CUSTOM_SECTION`, title renaming, and item mutations.
   - `SET_SECTION_ORDER` and `MOVE_SECTION` index boundary checks.
   - `SET_THEME_COLOR`, `SET_THEME_FONT`, `SET_THEME_LAYOUT`, `SET_PAGE_MARGIN`, `SET_LINE_SPACING`.
   - `AUTO_SANITIZE` date range em-dash conversion.
   - `AUTO_TUNE_PAGE_FIT` dynamic spacing adjustments.
   - `RESET_DRAFT` restoration.

2. **History Engine Area (10 tests)**:
   - `createHistoryStack` initializes empty past and future.
   - `pushHistoryState` accumulates past snapshots.
   - `pushHistoryState` enforces `maxSize` (ring-buffer capping).
   - `pushHistoryState` clears future on new mutations.
   - `undoHistoryState` restores exact previous state.
   - `redoHistoryState` restores exact future state.
   - `canUndo` and `canRedo` truth invariants.
   - Rapid sequence: 10 mutations -> 5 undos -> 2 redos -> 1 mutation matches deterministic snapshot.
   - Undo/Redo preserves immutable reference equality.
   - Keyboard shortcut handler attaches and detaches without leaks.

3. **Subcomponent Import & Prop Contract Area (14 tests)**:
   - Verification that all 14 subcomponents import from `src/components/ResumeStudio/` cleanly.
   - Verification of zero cyclical dependencies across the 14 subcomponents.
   - Verification of correct context consumer hooks (`useResumeContext`).
   - Verification of `ResumeBuilder.jsx` container rendering `<ResumeProvider>`.

4. **Multi-Window Sync & Storage Resilience Area (9 tests)**:
   - `storage` event listener deserialization.
   - `beforeunload` synchronous flush serialization.
   - QuotaExceeded fallback handling on large payload.
   - JSON backup export schema format (version 2.0).
   - JSON backup restore schema parsing and validation.

---

## 8. Summary of Target File Paths

| File | Type | Responsibility |
|---|---|---|
| `src/context/ResumeContext.jsx` | React Context | Global Provider, storage syncing, keyboard listeners, history wrapper |
| `src/context/resumeReducer.js` | Reducer | Canonical reducer handling 35+ atomic and compound actions |
| `src/engines/utility/historyEngine.js` | Pure Engine | Ring-buffer snapshot stack, undo, redo, and keyboard hotkeys |
| `src/components/ResumeStudio/index.js` | Barrel | Centralized clean exports for studio elements |
| `src/components/ResumeStudio/StudioHeaderNav.jsx` | Component | Top action bar, ATS score pill, print, undo/redo, download button |
| `src/components/ResumeStudio/LivePreviewCanvas.jsx` | Component | Iframe canvas, responsive zoom, direct-edit bridge |
| `src/components/ResumeStudio/TemplateGalleryModal.jsx` | Component | Categorized template catalog showcase |
| `src/components/ResumeStudio/AtsDiagnosticModal.jsx` | Component | ATS health diagnostics, X-Ray scanner, JD matcher |
| `src/components/ResumeStudio/PhotoStudioModal.jsx` | Component | Photo upload, circular mask crop, pan/zoom sliders |
| `src/components/ResumeStudio/JsonBackupModal.jsx` | Component | Backup and restore JSON / PDF importer |
| `src/components/ResumeStudio/steps/*.jsx` | Components | 8 wizard step components (Steps 0–7) |
| `src/components/ResumeStudio/shared/*.jsx` | Components | `SectionCard.jsx`, `FieldRow.jsx`, `TemplateCard.jsx` |
| `src/pages/utility/ResumeBuilder.jsx` | Page View | Clean container mounting `<ResumeProvider>` and `<ToolPageLayout>` |
