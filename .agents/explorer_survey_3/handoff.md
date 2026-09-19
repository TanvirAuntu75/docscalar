# Handoff Report: Explorer Survey 3 (Scope R3 & R4)

**To**: Orchestrator / Lead Architect  
**From**: Explorer 3  
**Date**: 2026-09-02  
**Scope**: 
- Requirement R3: Reactive Iframe Direct Edit Lifecycle & Event Isolation (`src/components/ResumeStudio/LivePreviewCanvas.jsx`)
- Requirement R4: Project-Wide Emoji Eradication & Google Material Symbols Design System (`src/`)

---

## 1. Observation

1. **`LivePreviewCanvas.jsx` Lifecycle Bottleneck**:
   - `src/components/ResumeStudio/LivePreviewCanvas.jsx:L65-257`: `attachDirectEditToDoc(doc)` was only executed in `handleIframeLoad` (L245).
   - `src/components/ResumeStudio/LivePreviewCanvas.jsx:L292`: The Direct Edit button calls `setDirectEdit(!directEdit)`. Because `previewHtml` / `srcDoc` is unchanged, the iframe does NOT reload, and no code updates the iframe DOM.
   - `src/components/ResumeStudio/LivePreviewCanvas.jsx:L74-81`: The previous disable branch only removed the `contenteditable` attribute on `[contenteditable="true"]` and set `styleEl.textContent = ''`. It failed to:
     - Blur `doc.activeElement` (L74-81).
     - Remove `spellcheck="false"`.
     - Nullify `el.oninput`, `el.onblur`, `el.onpaste`, `el.onkeydown` (L133-215).
     - Remove `.docforge-photo-clickable` and nullify `photo.onclick` (L226-233).

2. **Codebase-Wide Emoji Inventory**:
   - Running `node scratch/scan_all_emojis.mjs` revealed **115+ instances of raw unicode emojis** across 17 files in `src/`:
     - `src/engines/utility/templateRegistry.js:L98-186`: All 89 template labels have `🛡️`, `👑`, or `✨` prefixes.
     - `src/components/ResumeStudio/TemplateGalleryModal.jsx:L31-33`: Category tabs use `🛡️ 100% ATS Ultra`, `👔 Corporate`, `🎨 Modern & Creative`.
     - `src/components/ResumeStudio/steps/ReviewDesignStep.jsx:L225`: `⚡ Fit to 1 Page`.
     - `src/components/ResumeStudio/steps/ExperienceStep.jsx:L198`: `⚡ Enhance`.
     - `src/components/ResumeStudio/steps/PersonalInfoStep.jsx:L236`: `⚡ Insert Pro Summary`.
     - `src/components/ResumeStudio/AtsDiagnosticModal.jsx:L139,157,175,228,326,327`: `📊`, `🔬`, `🎯`, `🛡️`, `⚠️`, `✅`.
     - `src/components/ResumeStudio/PhotoStudioModal.jsx:L194`: `🖱️`.
     - `src/pages/NotFound.jsx:L25,37,49`: `📦`, `🔄`, `📎`.
     - `src/pages/Home.jsx:L494,550,854,917,934,950,952,954,1191,1342,1435,1495,1708`: `⚠️`, `⚡`, `🗑️`, `📁`, `👋`.
     - `src/pages/document/TranslatePdf.jsx:L575,668` & `src/engines/document/translatePdf.js:L22-38`: `⚡`, `🌐`, and 17 country flags.
     - `src/pages/pdf/MergePdf.jsx:L722`: `⚠️`.
     - `src/pages/pdf/RedactPdf.jsx:L870`: `⚡`.
     - `src/pages/pdf/ScanToPdf.jsx:L384`: `⛶`.
     - `src/pages/Pricing.jsx:L572`: `🔒`.
     - `src/pages/utility/ComingSoon.jsx:L237,303`: `🔥`, `✓`.
     - `src/utils/constants.js:L67,81,153,369,557,571,585,629,671`: `📎`, `✂️`, `📦`, `🔄`, `📐`, `📱`, `📋`.

---

## 2. Logic Chain

1. **R3 Logic Chain**:
   - *Premise 1*: An iframe's DOM is isolated from the outer React component tree and will not re-render unless its `srcDoc` changes or an imperative script mutates its `contentDocument`.
   - *Premise 2*: Toggling `ui.directEdit` in React state does not alter `previewHtml` (since `previewHtml` is computed from resume content data, not UI toggle state).
   - *Inference 1*: Therefore, `LivePreviewCanvas.jsx` requires a reactive `useEffect` watching `[directEdit, previewHtml]` that imperatively accesses `iframeRef.current.contentDocument` and applies changes immediately.
   - *Premise 3*: If event handlers (`oninput`, `onblur`, `onpaste`, `onkeydown`, `onclick`) remain on DOM nodes when direct edit is toggled off, any accidental DOM events will still trigger state mutations in `ResumeContext`.
   - *Inference 2*: Therefore, `disableDirectEditOnDoc(doc)` must explicitly nullify all handler properties (`el.oninput = null`, etc.), delete `dataset` markers, strip `contenteditable`/`spellcheck`, blur `doc.activeElement`, and remove `#docforge-direct-edit-styles`.

2. **R4 Logic Chain**:
   - *Premise 1*: DocForge design system strictly prohibits raw unicode emojis (AI slop / unbranded OS-dependent glyphs) and requires Google Material Symbols.
   - *Premise 2*: 115+ instances of raw unicode emojis exist across template metadata, modal tabs, CTA buttons, and toast notifications.
   - *Inference 1*: All 89 template labels in `templateRegistry.js` must be stripped of prefixes, and all UI tabs/buttons must be updated with standard Google Material Symbols (`auto_awesome`, `shield`, `business_center`, `palette`, `drag_pan`, `query_stats`, `biotech`, `track_changes`, `folder_zip`, `sync`, `call_merge`, etc.).
   - *Inference 2*: Verification must be automated via `scratch/scan_all_emojis.mjs` asserting 0 emoji lines across `src/`.

---

## 3. Caveats

1. **Canvas Stamp Star Glyphs**: In `src/utils/stampGenerator.js:L179`, `★` is used to render decorative star seals directly onto an HTML Canvas graphic (not rendered as HTML text). This is part of the physical stamp drawing algorithm, not a UI emoji.
2. **Pre-existing Builds & Tests**: `npm run build`, `test_template_catalog_matrix.mjs` (1,780 assertions), and `test_r1_universal_runtime.mjs` (163 assertions) all pass cleanly.
3. **Template Title Stamping (R2 Co-dependency)**: Once R2 updates all 89 templates to output `<div class="candidate-title" data-df-field="title">`, `enableDirectEditOnDoc` will automatically bind direct editing to candidate titles without requiring template-specific exceptions.

---

## 4. Conclusion

- Scope R3 and Scope R4 have been thoroughly surveyed, root-caused, and architected.
- Detailed drop-in implementations for `enableDirectEditOnDoc`, `disableDirectEditOnDoc`, the reactive `useEffect` in `LivePreviewCanvas.jsx`, and the full 17-file emoji replacement mapping are documented in `report.md`.
- Implementation can proceed with high confidence and deterministic verification.

---

## 5. Verification Method

1. **Direct Edit Lifecycle Verification**:
   - Mount `LivePreviewCanvas` with standard resume payload.
   - Click "Direct Edit: OFF": Assert in iframe DOM that `contenteditable` is absent, `#docforge-direct-edit-styles` is absent, and `el.oninput === null`.
   - Click "Direct Edit: ON": Assert in iframe DOM that `contenteditable="true"` is restored, dashed outline style tag is injected, and typing in `[data-df-field="title"]` updates state.
2. **Codebase-Wide Emoji Eradication**:
   - Run: `node scratch/scan_all_emojis.mjs`
   - Expected Output: `✅ ZERO EMOJIS FOUND IN src/! Clean design system.` (0 emoji lines).
3. **Full Build & Regression Invariants**:
   - Run: `node tests/frontend/test_template_catalog_matrix.mjs` (1,780/1,780 passed).
   - Run: `node tests/frontend/test_r1_universal_runtime.mjs` (163/163 passed).
   - Run: `npm run build` (Exit code 0).
