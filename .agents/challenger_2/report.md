# Challenger 2 Adversarial Stress Report — Milestones M3 & M4

**Date**: 2026-09-02  
**Challenger Archetype**: Empirical Adversarial Challenger & Critic  
**Working Directory**: `.agents/challenger_2/`  
**Test Suite Script**: `scratch/test_challenger_2_adversarial.mjs`  
**Overall Verdict**: **REQUEST_CHANGES**  

---

## Executive Summary

| Category / Area | Assertions Executed | Passed | Failed | Status |
|---|---|---|---|---|
| **M3: Direct Edit Rapid Toggle Lifecycle** | 35 | 35 | 0 | **PASSED** (100%) |
| **M3: Direct Edit Inline Mutations & Keystrokes** | 15 | 15 | 0 | **PASSED** (100%) |
| **M3: WYSIWYG State Engine Matrix & Delimiters** | 15 | 15 | 0 | **PASSED** (100%) |
| **M4: Template Catalog Matrix & Title Stamping** | 102 | 102 | 0 | **PASSED** (100%) |
| **M4: Project-Wide Emoji AST / Regex Scan** | 2 | 1 | 1 | **FAILED** (64 violations in `src/`) |
| **M4: Production Vite Build (`npm run build`)** | 1 | 1 | 0 | **PASSED** (1m 57s) |
| **TOTAL** | **170** | **169** | **1** | **REQUEST_CHANGES** |

---

## Detailed Empirical Findings

### 1. Milestone M3: Reactive Iframe Direct Edit Lifecycle & Event Isolation (PASSED)

Empirically verified on synthetic DOM iframe documents and template DOM nodes with 50 back-to-back rapid toggle cycles:

- **Clean Attachment (ON)**:
  - Correctly injects `<style id="docforge-direct-edit-styles">` into document head/body with dashed focus/hover outlines and text caret styles.
  - Automatically queries all `[data-df-field]` nodes and sets `contenteditable="true"`, `spellcheck="false"`, `dataset.dfBound="true"`.
  - Binds dedicated `oninput`, `onblur`, `onpaste`, and `onkeydown` listeners.
  - Queries all avatar/photo classes (`.avatar`, `.profile-photo`, `.photo-container`, `img.avatar`) and adds `.docforge-photo-clickable` with `onclick` hook to open photo studio.
- **Idempotency & Clean Teardown (OFF)**:
  - Invokes `doc.activeElement.blur()` to remove any dangling caret/focus states.
  - Removes `<style id="docforge-direct-edit-styles">` completely from DOM.
  - Strips `contenteditable` and `spellcheck` attributes from all editable elements.
  - Deletes `dataset.dfBound` and `dataset.docforgeField`.
  - Strictly nullifies all event properties: `el.oninput = null`, `el.onblur = null`, `el.onpaste = null`, `el.onkeydown = null`, `photo.onclick = null`.
  - Removes `.docforge-photo-clickable` class and sets `photo.onclick = null`.
- **Rapid Toggle Stress Test**:
  - 50 continuous back-to-back `enableDirectEditOnDoc` and `disableDirectEditOnDoc` iterations yielded 0 memory leaks, 0 duplicate style tags, and 100% nullified event properties on final disable.

### 2. Milestone M3: Direct Edit Inline Mutations & Keystroke Edge Cases (PASSED)

- **Candidate Title & Name Mutations**:
  - `oninput` and `onblur` trigger `applyInlineEdit('title', val)` with whitespace normalization (multiple spaces collapsed to single space).
  - Pressing `Enter` on single-line fields (`name`, `title`, `company`) invokes `e.preventDefault()` and `el.blur()` to prevent accidental newline DOM mangling.
  - Pressing `Enter` on `summary` is NOT prevented, correctly allowing multi-paragraph summaries.
- **Experience Bullet Enter Key (`addExpHighlight`)**:
  - Pressing `Enter` on an experience bullet (`exp:0:highlight:0`) calls `e.preventDefault()`, creates a new `<li>` element, inserts it via `parentNode.insertBefore(newLi, el.nextSibling)`, dynamically binds `exp:0:highlight:1` with keyboard listeners, focuses the new bullet, and dispatches `actions.addExpHighlight(0, 1)`.
- **Experience Bullet Backspace Key (`removeExpHighlight`)**:
  - Pressing `Backspace` on an empty bullet (`innerText === ''` or `'\n'`) calls `e.preventDefault()`, safely removes the element from DOM (`safeRemove`), dispatches `actions.removeExpHighlight(0, 1)`, and moves focus/caret to the end of the previous sibling bullet (`previousElementSibling`).
- **Empty Bullet Blur Cleanup**:
  - Blurring an empty bullet automatically invokes `safeRemove()` and dispatches `actions.removeExpHighlight`.
- **Detached Node & Exception Safety**:
  - Firing input/blur/keydown events on already detached DOM nodes executes without throwing `NotFoundError` or `TypeError`.

### 3. Milestone M3: WYSIWYG State Engine & Delimiter Parsing (PASSED)

- `applyInlineFieldEdit` verified across all composite field paths:
  - Top-level: `name`, `title`, `summary`, `email`, `phone`, `location`, `website`, `linkedin`, `github`.
  - Section Headings: `heading:experience` auto-strips `(Continued)` and `(cont.)` pagination suffixes.
  - Experience Company: smart-parses delimiter strings (`Google · Mountain View` -> `Google`, `Stripe | San Francisco` -> `Stripe`).
  - Experience & Education Dates: parses en-dash ranges (`2020 – 2024` -> `start: 2020, end: 2024`) and `to` ranges (`Jan 2019 to Present` -> `start: Jan 2019, end: Present`).
  - Reference Contact: extracts email address and phone numbers from freeform text.
  - Custom Sections: updates custom section titles and items dynamically.
  - Unicode text cleansing: strips zero-width spaces (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`) and normalizes non-breaking spaces (`\u00A0`).
  - Reducer integration: `resumeReducer` processes `ACTION_TYPES.APPLY_INLINE_EDIT` seamlessly and marks `draftSaved: false`.

### 4. Milestone M4: Template Catalog Matrix & Title Stamping (PASSED)

- All 89 templates in `TEMPLATE_MAP` verified:
  - 89/89 have valid non-empty `candidateTitle` values (e.g. `Executive Director & Operations Lead`, `Senior Full-Stack Software Engineer`, `Investment Banking Strategist`).
  - 89/89 have 0 raw unicode emojis in `label`.
  - 89/89 have 0 raw unicode emojis in `candidateTitle`.

### 5. Milestone M4: Production Vite Build (PASSED)

- `npm run build` completed with exit code 0 in 1m 57s:
  - `dist/` artifacts generated cleanly.
  - Zero syntax or bundling errors.

---

## 🚨 Critical Defect / Failure Mode: Remaining Unicode Emojis in `src/` (Milestone M4)

### Violation Analysis
Requirement **R4** explicitly requires:
> "Full Emoji Eradication across the entire application design system. Static scan across `src/` confirms 0 raw emoji characters in template labels, category tabs, and action buttons."

The adversarial scanner scanned **286 source files** in `src/` and uncovered **64 occurrences of raw unicode emojis** across **10 source files**:

### Itemized Emoji Violations:

1. **`src/components/ResumeStudio/steps/SectionManagerStep.jsx`**:
   - Line 40: `label: '⚡ Skills & Tech First'` -> Replace with Material Symbol `bolt` / `auto_awesome`
   - Line 45: `label: '🚀 Projects & Portfolio First'` -> Replace with Material Symbol `rocket_launch`
   - Line 50: `label: '🎓 Academic & Research First'` -> Replace with Material Symbol `school`

2. **`src/components/ResumeStudio/steps/SummaryProjectsStep.jsx`**:
   - Line 166: `⚡ Enhance` -> Replace with Material Symbol `auto_awesome` + `Enhance`

3. **`src/components/ResumeStudio/JsonBackupModal.jsx`**:
   - Lines 32, 79: `✅ Resume data restored...` -> Strip `✅`
   - Lines 37, 40, 84, 87: `❌ Failed to parse...` -> Strip `❌`
   - Line 51: `⏳ Extracting text...` -> Strip `⏳`

4. **`src/components/AIChatBot.jsx`**:
   - Lines 287-291: `🔄 Rotate Pages`, `🗂️ Reorder in Grid`, `✂️ Crop Margins`, `🗑️ Delete Blank Pages`, `📑 Extract Page Range`
   - Line 311: `➔` arrow
   - Lines 398-402: `📑 Merge PDFs`, `⚡ Compress PDF`, `🔍 OCR Searchable PDF`, `📄 Resume Builder`, `🎨 Stitch Canvas`

5. **`src/components/StitchCanvas.jsx`**:
   - 26 toast strings and labels containing `✨`, `⚠️`, `📥`, `❌`, `📤`, `🔗`, `💾`, `🔴`, `🚀`, `🪄`, `✅`, `📦`, `✓`, `✗`

6. **`src/components/ToolPageLayout.jsx`**:
   - Line 203: `{idx === 0 ? '👉 ' : ''}`

7. **`src/engines/utility/resumeIntelligenceEngine.js`**:
   - Lines 614, 616, 619: Suggestions containing `⚠️ Multi-Column...`, `⚠️ Headshot Photo...`, `⚠️ Complex Creative Layout...`

8. **`src/components/SignStudio/SignOptionsSidebar.jsx` & `AuditCertificateModal.jsx`**:
   - `✓ Check`, `✗ Cross`, `✓ Verified Stamped`

9. **`src/components/LandingPage.jsx`**:
   - Lines 945, 1351, 1381, 1412: `✓`

---

## Required Corrective Actions Before Final Approval

1. **Resume Studio Steps & Modals**:
   - In `SectionManagerStep.jsx`, replace emoji prefixes with Material Symbols.
   - In `SummaryProjectsStep.jsx`, replace `⚡ Enhance` with Material Symbol `auto_awesome` + `Enhance`.
   - In `JsonBackupModal.jsx`, strip `✅`, `❌`, `⏳` from all status messages.
2. **Adjacent Tools & Engines**:
   - In `AIChatBot.jsx`, `StitchCanvas.jsx`, `ToolPageLayout.jsx`, and `resumeIntelligenceEngine.js`, strip raw unicode emojis and replace with Material Symbols or plain text.
3. Re-run `node scratch/test_challenger_2_adversarial.mjs` until assertion #170 passes with 0 emoji findings.

---

## Verdict

**REQUEST_CHANGES** (M3 and Vite Build are solid and verified 100%; M4 requires emoji cleanup in Resume Studio steps/modals and adjacent components).
