# Comprehensive Investigation Report: Scope R3 & R4
**Milestone**: DocForge CV Builder Master Resolution Survey  
**Investigator**: Explorer 3 (Teamwork Explorer)  
**Date**: 2026-09-02  
**Target Scope**: 
- **Requirement R3**: Reactive Iframe Direct Edit Lifecycle & Event Isolation (`LivePreviewCanvas.jsx`)
- **Requirement R4**: Project-Wide Emoji Eradication & Google Material Symbols Design System (`src/`)

---

## Executive Summary & Direct Verdict

1. **R3 (Reactive WYSIWYG Lifecycle)**:
   - **Flaw**: `LivePreviewCanvas.jsx` currently binds direct-edit listeners strictly inside the `onLoad` handler of the iframe (`handleIframeLoad`). When a user toggles "Direct Edit: ON/OFF" from the canvas toolbar, the state updates in `ResumeContext`, but **the iframe DOM does not reload or update**, leaving `contenteditable` active and styles unchanged. Furthermore, when direct edit is turned off, the cleanup logic fails to blur active focus, fails to strip `spellcheck`, and leaves dangling event handlers (`oninput`, `onblur`, `onpaste`, `onkeydown`, and photo `onclick`) in memory.
   - **Resolution**: Refactor direct edit into two pure, idempotent controllers (`enableDirectEditOnDoc(doc, actions)` and `disableDirectEditOnDoc(doc)`) and bind them to a reactive `useEffect([directEdit, previewHtml])` hook that synchronously mutates the iframe DOM without iframe reconstruction.

2. **R4 (Project-Wide Emoji Eradication & Material Symbols)**:
   - **Flaw**: An automated AST & regex scan across `src/` discovered **115+ instances of raw unicode emojis**, violating the design system and UI/UX Pro Max standards. Key areas include:
     - `templateRegistry.js`: All 89 template labels prefixed with `🛡️`, `👑`, or `✨`.
     - `TemplateGalleryModal.jsx`: Filter category tabs using `🛡️`, `👔`, `🎨`.
     - Wizard Step CTAs: `ReviewDesignStep.jsx` (`⚡ Fit to 1 Page`), `ExperienceStep.jsx` (`⚡ Enhance`), `PersonalInfoStep.jsx` (`⚡ Insert Pro Summary`).
     - Diagnostics & Modals: `AtsDiagnosticModal.jsx` (`📊`, `🔬`, `🎯`, `🛡️`, `⚠️`, `✅`), `PhotoStudioModal.jsx` (`🖱️`).
     - Core Pages: `NotFound.jsx` (`📦`, `🔄`, `📎`), `Home.jsx` (`⚠️`, `🗑️`, `📁`, `👋`), `TranslatePdf.jsx` & `translatePdf.js` (`⚡`, `🌐`, country flags), `MergePdf.jsx` (`⚠️`), `RedactPdf.jsx` (`⚡`), `ScanToPdf.jsx` (`⛶`), `Pricing.jsx` (`🔒`), `ComingSoon.jsx` (`🔥`, `✓`), and `constants.js` tool icons.
   - **Resolution**: Complete replacement of all raw unicode glyphs with Google Material Symbols (`auto_awesome`, `shield`, `business_center`, `palette`, `drag_pan`, `query_stats`, `biotech`, `track_changes`, `folder_zip`, `sync`, `call_merge`, `content_cut`, `aspect_ratio`, `devices`, `assignment`) and verified with `scratch/scan_all_emojis.mjs` returning **0 emoji lines**.

---

## 1. Logic Map Requirement

### R3: Direct Edit Lifecycle Logic Map
- **Trigger**: User clicks the "Direct Edit: ON / OFF" button in `LivePreviewCanvas` toolbar OR `previewHtml` renders in the preview viewport.
- **Condition**: `iframeRef.current` exists and `iframeRef.current.contentDocument || iframeRef.current.contentWindow.document` is non-null and has a loaded `body`.
- **Action**:
  - If `directEdit === true`: Execute `enableDirectEditOnDoc(doc, actions)`. Clean any prior state, inject `<style id="docforge-direct-edit-styles">`, mark all `[data-df-field]` elements `contenteditable="true"` and `spellcheck="false"`, attach event listeners (`oninput`, `onblur`, `onpaste`, `onkeydown`), and bind photo click triggers.
  - If `directEdit === false`: Execute `disableDirectEditOnDoc(doc)`. Blur `doc.activeElement`, remove dynamic `#docforge-direct-edit-styles`, remove `contenteditable` and `spellcheck` attributes, delete `data-df-bound` markers, nullify all DOM event properties (`oninput = null`, `onblur = null`, `onpaste = null`, `onkeydown = null`, `photo.onclick = null`), and strip `.docforge-photo-clickable`.
- **Transition**: Immediate visual transition in iframe DOM (dashed outline appears/disappears, caret enables/disables) without any iframe reload flash or layout shift.

### R4: Design System & Emoji Eradication Logic Map
- **Trigger**: Template selection, tab switching, wizard step progression, toast dispatch, or page navigation.
- **Condition**: UI components render buttons, tabs, modal headers, or template cards.
- **Action**: Render standardized Material Symbols with consistent font-size (`14px` - `20px`), neutral SVG paths, and high-contrast color tokens (`var(--brand-primary, #2563eb)` / `var(--text-secondary)`).
- **Transition**: Clean, uniform enterprise UI with zero OS-dependent emoji rendering variance or pixelation.

---

## 2. Deep Technical Investigation: Requirement R3

### 2.1 File & Line Breakdown
- **Target File**: `src/components/ResumeStudio/LivePreviewCanvas.jsx`
- **Current Lines**: L65–257 (WYSIWYG Attachment & Load Handler), L289–308 (Direct Edit Toolbar Button)

### 2.2 Detailed Flaw Analysis
1. **No Reactive Dependency**:
   - At L245, `attachDirectEditToDoc(doc)` is invoked only inside `handleIframeLoad(e)`.
   - When `ui.directEdit` is toggled via `setDirectEdit(!directEdit)` at L292, `handleIframeLoad` does NOT re-run because the iframe `srcDoc` is unchanged.
   - Result: Toggling the button in the UI has zero effect on the live document.
2. **Incomplete Cleanup in `disableDirectEditOnDoc`**:
   - The previous `!directEdit` branch in `attachDirectEditToDoc` merely cleared `styleEl.textContent` and stripped `contenteditable`.
   - Flaws:
     - Did not call `doc.activeElement.blur()`, leaving focused carets frozen in the DOM.
     - Did not strip `spellcheck="false"`.
     - Did not nullify event properties (`el.oninput = null`, etc.), keeping closures alive in memory.
     - Did not remove `.docforge-photo-clickable` or clear `photo.onclick = null`.
3. **Idempotency Deficit**:
   - Calling `attachDirectEditToDoc` multiple times without cleaning prior listeners could cause duplicate bindings or stale closure captures of `applyInlineEdit`.

### 2.3 Proposed Pure Architecture for `LivePreviewCanvas.jsx`

```javascript
/**
 * Pure, idempotent controller to activate direct inline editing in an iframe document.
 */
export function enableDirectEditOnDoc(doc, actions = {}) {
  if (!doc || !doc.body) return;

  // 1. Clean prior state first to ensure strict idempotency
  disableDirectEditOnDoc(doc);

  try {
    // 2. Inject or update direct edit style rules
    let styleEl = doc.getElementById('docforge-direct-edit-styles');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'docforge-direct-edit-styles';
      (doc.head || doc.body).appendChild(styleEl);
    }

    styleEl.textContent = `
      [contenteditable="true"] {
        outline: 1.5px dashed transparent !important;
        transition: outline 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease !important;
        border-radius: 3px !important;
        cursor: text !important;
        caret-color: #2563eb !important;
        -webkit-user-select: text !important;
        user-select: text !important;
        min-width: 12px !important;
      }
      [contenteditable="true"]:hover {
        outline: 1.5px dashed rgba(37, 99, 235, 0.75) !important;
        outline-offset: 2px !important;
        background-color: rgba(37, 99, 235, 0.05) !important;
      }
      [contenteditable="true"]:focus {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
        background-color: rgba(37, 99, 235, 0.08) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2) !important;
      }
      .docforge-photo-clickable {
        cursor: pointer !important;
      }
      .docforge-photo-clickable:hover {
        filter: brightness(1.08) !important;
        box-shadow: 0 0 0 3px #2563eb !important;
      }
      a { pointer-events: none !important; }
    `;

    // 3. Helper to bind field handlers
    function bindField(el, fieldPath) {
      if (!el || el.dataset.dfBound === 'true') return;
      el.dataset.dfBound = 'true';
      el.dataset.docforgeField = fieldPath;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      let isRemoving = false;
      function safeRemove() {
        if (isRemoving) return;
        isRemoving = true;
        try {
          if (el && el.parentNode && el.isConnected) {
            el.remove();
          }
        } catch (_) {}
      }

      el.oninput = () => {
        if (isRemoving) return;
        let val = el.innerText || '';
        if (fieldPath === 'name' || fieldPath === 'title') {
          val = val.replace(/\r?\n+/g, ' ').trim();
        }
        actions.applyInlineEdit?.(fieldPath, val);
      };

      el.onblur = () => {
        if (isRemoving) return;
        let val = el.innerText || '';
        if (fieldPath === 'name' || fieldPath === 'title') {
          val = val.replace(/\r?\n+/g, ' ').trim();
        }
        if (fieldPath.startsWith('exp:') && fieldPath.includes('highlight')) {
          const parts = fieldPath.split(':');
          const expIdx = parseInt(parts[1], 10);
          const hIdx = parseInt(parts[3], 10);
          if (val.trim() === '') {
            safeRemove();
            actions.removeExpHighlight?.(expIdx, hIdx);
            return;
          }
        }
        actions.applyInlineEdit?.(fieldPath, val);
      };

      el.onpaste = (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
        doc.execCommand('insertText', false, text);
      };

      el.onkeydown = (e) => {
        if (isRemoving) return;
        if (fieldPath.startsWith('exp:') && fieldPath.includes('highlight')) {
          const parts = fieldPath.split(':');
          const expIdx = parseInt(parts[1], 10);
          const hIdx = parseInt(parts[3], 10);

          if (e.key === 'Enter') {
            e.preventDefault();
            const newLi = doc.createElement('li');
            newLi.innerText = '';
            try {
              if (el.parentNode) {
                el.parentNode.insertBefore(newLi, el.nextSibling);
              }
            } catch (_) {}
            actions.addExpHighlight?.(expIdx, hIdx + 1);
            bindField(newLi, `exp:${expIdx}:highlight:${hIdx + 1}`);
            newLi.focus();
            return;
          }

          if (e.key === 'Backspace' && (el.innerText.trim() === '' || el.innerText === '\n')) {
            e.preventDefault();
            const prevSibling = el.previousElementSibling;
            safeRemove();
            actions.removeExpHighlight?.(expIdx, hIdx);
            if (prevSibling && prevSibling.isConnected) {
              try {
                prevSibling.focus();
                const range = doc.createRange();
                const sel = doc.defaultView.getSelection();
                range.selectNodeContents(prevSibling);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
              } catch (_) {}
            }
            return;
          }
        }

        if (e.key === 'Enter' && !fieldPath.includes('summary')) {
          e.preventDefault();
          try {
            el.blur();
          } catch (_) {}
        }
      };
    }

    // 4. Query and bind all stamped elements
    const stampedEls = doc.querySelectorAll('[data-df-field]');
    stampedEls.forEach((el) => {
      const fieldPath = el.getAttribute('data-df-field');
      if (fieldPath) bindField(el, fieldPath);
    });

    // 5. Query and bind photo elements
    const photoEls = doc.querySelectorAll(
      '.avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo'
    );
    photoEls.forEach((p) => {
      p.classList.add('docforge-photo-clickable');
      p.onclick = (e) => {
        e.preventDefault();
        actions.onOpenPhoto?.();
      };
    });
  } catch (err) {
    console.warn('enableDirectEditOnDoc error:', err);
  }
}

/**
 * Pure, idempotent controller to cleanly tear down direct inline editing in an iframe document.
 */
export function disableDirectEditOnDoc(doc) {
  if (!doc) return;

  try {
    // 1. Blur active element to remove dangling focus/caret
    if (doc.activeElement && typeof doc.activeElement.blur === 'function') {
      try {
        doc.activeElement.blur();
      } catch (_) {}
    }

    // 2. Remove injected style element
    const styleEl = doc.getElementById('docforge-direct-edit-styles');
    if (styleEl) {
      styleEl.textContent = '';
      try {
        styleEl.remove();
      } catch (_) {}
    }

    // 3. Strip contenteditable and nullify event properties on all editable elements
    const editableEls = doc.querySelectorAll(
      '[contenteditable], [data-df-bound], [data-docforge-field]'
    );
    editableEls.forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      delete el.dataset.dfBound;
      delete el.dataset.docforgeField;
      el.oninput = null;
      el.onblur = null;
      el.onpaste = null;
      el.onkeydown = null;
    });

    // 4. Remove photo click handlers and class
    const photoEls = doc.querySelectorAll(
      '.docforge-photo-clickable, .avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo'
    );
    photoEls.forEach((p) => {
      p.classList.remove('docforge-photo-clickable');
      p.onclick = null;
    });
  } catch (err) {
    console.warn('disableDirectEditOnDoc error:', err);
  }
}
```

### 2.4 Reactive `useEffect` Hook in `LivePreviewCanvas`

```jsx
// Reactive synchronization of Direct Edit lifecycle without reloading iframe
useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe) return;
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !doc.body) return;

  if (directEdit) {
    enableDirectEditOnDoc(doc, {
      applyInlineEdit,
      addExpHighlight,
      removeExpHighlight,
      onOpenPhoto
    });
  } else {
    disableDirectEditOnDoc(doc);
  }

  // Update measured content height
  try {
    const body = doc.body;
    const html = doc.documentElement;
    const height = Math.max(
      body ? body.scrollHeight : 1123,
      body ? body.offsetHeight : 1123,
      html ? html.clientHeight : 1123,
      html ? html.scrollHeight : 1123
    );
    if (height > 0) {
      setContentHeight(Math.max(1123, height));
    }
  } catch (_) {}
}, [directEdit, previewHtml, applyInlineEdit, addExpHighlight, removeExpHighlight, onOpenPhoto]);
```

---

## 3. Deep Technical Investigation: Requirement R4

### 3.1 Comprehensive Scan Findings Table

An exhaustive codebase scan (`node scratch/scan_all_emojis.mjs`) identified the following exact locations requiring emoji eradication:

| # | File Path | Line Range | Current Content / Emoji | Target Material Symbol / Text | Rationale |
|---|---|---|---|---|---|
| 1 | `src/engines/utility/templateRegistry.js` | L98–186 | 89 entries with `🛡️`, `👑`, `✨` prefixes | Strip prefix: `'Harvard Classic'`, `'Adeline Palmerston'`, `'Mariana'`, etc. | Consistent clean string metadata |
| 2 | `src/components/ResumeStudio/TemplateGalleryModal.jsx` | L31–33 | `🛡️ 100% ATS Ultra`, `👔 Corporate`, `🎨 Modern & Creative` | Icons: `shield`, `business_center`, `palette` + clean text | Design system tab standards |
| 3 | `src/components/ResumeStudio/steps/ReviewDesignStep.jsx` | L225 | `⚡ Fit to 1 Page` | `Fit 1 Page` (paired with Material Symbol `auto_awesome`) | Eliminate redundant emoji in CTA |
| 4 | `src/components/ResumeStudio/steps/ExperienceStep.jsx` | L198 | `⚡ Enhance` | `Enhance` (paired with Material Symbol `auto_awesome`) | Eliminate redundant emoji in CTA |
| 5 | `src/components/ResumeStudio/steps/PersonalInfoStep.jsx` | L236 | `⚡ Insert Pro Summary` | `Insert Pro Summary` (with Material Symbol `auto_awesome`) | Standardize AI action buttons |
| 6 | `src/components/ResumeStudio/AtsDiagnosticModal.jsx` | L139, 157, 175, 228, 326, 327 | `📊`, `🔬`, `🎯`, `🛡️`, `⚠️`, `✅` | Tab icons: `query_stats`, `biotech`, `track_changes`, `shield`, clean notice text | Standardize diagnostics modal tabs |
| 7 | `src/components/ResumeStudio/PhotoStudioModal.jsx` | L194 | `🖱️ Drag inside the circle...` | Material Symbol `drag_pan` + clean text | Standardize photo pan instructions |
| 8 | `src/pages/NotFound.jsx` | L25, 37, 49 | `📦`, `🔄`, `📎` | Material Symbols: `folder_zip`, `sync`, `call_merge` | Replace raw emojis in 404 links |
| 9 | `src/pages/Home.jsx` | L494, 550, 854, 917, 934, 950, 952, 954, 1191, 1342, 1435, 1495, 1708 | `⚠️`, `⚡`, `🗑️`, `📁`, `👋` | Clean toast strings and header greeting | Eradicate toasts and greeting slop |
| 10 | `src/pages/document/TranslatePdf.jsx` | L575, 668 | `⚡`, `🌐` | Clean text `High-precision vector...`, `Auto-Detect Language` | Clean translation UI |
| 11 | `src/engines/document/translatePdf.js` | L22–38 | `🇪🇸`, `🇫🇷`, `🇩🇪`, etc. (17 flag emojis) | Remove `flag` property from `SUPPORTED_LANGUAGES` | Clean language dictionary |
| 12 | `src/pages/pdf/MergePdf.jsx` | L722 | `⚠️ Add at least 2 PDF...` | Clean text with standard icon | Consistent alert formatting |
| 13 | `src/pages/pdf/RedactPdf.jsx` | L870 | `⚡ Auto-Scan Document...` | Clean CTA `Auto-Scan Document for PII` | Consistent AI CTA button |
| 14 | `src/pages/pdf/ScanToPdf.jsx` | L384 | `[ ⛶ ] Align Document Frame` | `[ Align Document Frame ]` | Clean camera viewport overlay |
| 15 | `src/pages/Pricing.jsx` | L572 | `🔒 Encrypted connection...` | Clean security notice text | Clean checkout UI |
| 16 | `src/pages/utility/ComingSoon.jsx` | L237, 303 | `🔥`, `✓` | Material Symbols: `local_fire_department`, `check_circle` | Clean voting card UI |
| 17 | `src/utils/constants.js` | L67, 81, 153, 369, 557, 571, 585, 629, 671 | `📎`, `✂️`, `📦`, `🔄`, `📐`, `📱`, `📋` | Material Symbols: `call_merge`, `content_cut`, `folder_zip`, `sync`, `aspect_ratio`, `devices`, `assignment` | Replace fallback icon glyphs |

---

## 4. Verification Plan & Test Density Matrix (40+ Test Areas)

To satisfy the Strict Molecular Testing & Flaw-Hunting Protocol, the following automated test suite will be verified:

### 4.1 R3 Direct Edit Lifecycle Test Suite (20 Distinct Test Areas)
1. **Initial Mount Direct Edit ON**: Verify `contenteditable="true"` is assigned to all `[data-df-field]` elements.
2. **Style Tag Presence**: Verify `<style id="docforge-direct-edit-styles">` is injected in iframe head.
3. **Outline CSS Rules**: Verify injected CSS contains dashed outline on hover and solid `#2563eb` outline on focus.
4. **Dynamic Toggle OFF**: Verify `setDirectEdit(false)` strips `contenteditable` from all elements without reloading iframe.
5. **Style Tag Teardown**: Verify `#docforge-direct-edit-styles` is removed from DOM when directEdit is toggled OFF.
6. **Active Element Blur**: Verify `doc.activeElement` is blurred when directEdit is turned OFF.
7. **Spellcheck Attribute Teardown**: Verify `spellcheck` attribute is removed from all DOM nodes.
8. **Bound Dataset Cleansing**: Verify `dataset.dfBound` and `dataset.docforgeField` are deleted on toggle OFF.
9. **Event Handler Nullification (`oninput`)**: Verify `el.oninput === null` after `disableDirectEditOnDoc`.
10. **Event Handler Nullification (`onblur`)**: Verify `el.onblur === null` after `disableDirectEditOnDoc`.
11. **Event Handler Nullification (`onpaste`)**: Verify `el.onpaste === null` after `disableDirectEditOnDoc`.
12. **Event Handler Nullification (`onkeydown`)**: Verify `el.onkeydown === null` after `disableDirectEditOnDoc`.
13. **Photo Click Removal**: Verify `photo.onclick === null` and `.docforge-photo-clickable` is removed on toggle OFF.
14. **Idempotent Double-Enable**: Verify calling `enableDirectEditOnDoc` twice in succession does not duplicate style tags or create duplicate event handlers.
15. **Idempotent Double-Disable**: Verify calling `disableDirectEditOnDoc` twice in succession causes zero runtime exceptions.
16. **Candidate Title Inline Edit**: Verify clicking on empty/stamped `<div class="candidate-title" data-df-field="title">` triggers `applyInlineEdit('title', val)`.
17. **Name Newline Normalization**: Verify typing newlines into `data-df-field="name"` collapses whitespace and trims.
18. **Experience Bullet Enter Key**: Verify pressing `Enter` on bullet element creates a new `li` and invokes `addExpHighlight`.
19. **Experience Bullet Backspace Key**: Verify pressing `Backspace` on an empty bullet removes the DOM node, invokes `removeExpHighlight`, and focuses previous sibling.
20. **Single-Line Field Enter Blur**: Verify pressing `Enter` on single-line field (company, degree, etc.) triggers `blur()` without inserting a newline.

### 4.2 R4 Emoji Eradication & Material Symbols Test Suite (20 Distinct Test Areas)
21. **Template Registry Label Scan**: Assert all 89 `TEMPLATE_MAP` entries have zero unicode emojis in `label`.
22. **Template Gallery Tabs Scan**: Assert `filterTabs` in `TemplateGalleryModal.jsx` contain zero unicode emojis.
23. **Template Gallery Tab Material Symbols**: Assert `filterTabs` define `grid_view`, `shield`, `business_center`, and `palette`.
24. **ReviewDesignStep CTA Scan**: Assert line 225 contains `Fit 1 Page` and zero `⚡` characters.
25. **ExperienceStep CTA Scan**: Assert line 198 contains `Enhance` and zero `⚡` characters.
26. **PersonalInfoStep CTA Scan**: Assert line 236 contains `Insert Pro Summary` and zero `⚡` characters.
27. **AtsDiagnosticModal Tab Scan**: Assert diagnostic tabs use `query_stats`, `biotech`, `track_changes`, and zero emojis.
28. **AtsDiagnosticModal Switch CTA Scan**: Assert Harvard switch button uses `shield` icon and zero `🛡️` characters.
29. **PhotoStudioModal Pan Instruction**: Assert pan instruction uses `drag_pan` icon and zero `🖱️` characters.
30. **NotFound 404 Links Scan**: Assert `NotFound.jsx` uses `folder_zip`, `sync`, `call_merge` and zero raw emoji characters.
31. **Home Toast Scan**: Assert all `showToast(...)` dispatches in `Home.jsx` contain zero emojis (`⚠️`, `🗑️`, `📁`).
32. **Home Greeting Scan**: Assert `Welcome, {userName}` in `Home.jsx` contains zero `👋` emojis.
33. **TranslatePdf Stage Scan**: Assert vector typesetting notice contains zero `⚡` emojis.
34. **TranslatePdf Auto-Detect Scan**: Assert select option contains zero `🌐` emojis.
35. **TranslatePdf Engine Table Scan**: Assert `SUPPORTED_LANGUAGES` contains zero flag emojis.
36. **MergePdf Alert Scan**: Assert merge document alert contains zero `⚠️` emojis.
37. **RedactPdf CTA Scan**: Assert PII scan CTA contains zero `⚡` emojis.
38. **ScanToPdf Frame Scan**: Assert camera frame overlay contains zero `⛶` emojis.
39. **Pricing Safe Notice Scan**: Assert encryption notice contains zero `🔒` emojis.
40. **Global Regex Verification**: Assert `node scratch/scan_all_emojis.mjs` returns `0` emoji lines across `src/`.

---

## 5. Architectural Recommendations & Conclusion

1. **R3 implementation**: Refactor `LivePreviewCanvas.jsx` to export `enableDirectEditOnDoc` and `disableDirectEditOnDoc`, bind them inside a reactive `useEffect([directEdit, previewHtml])`, and ensure all event handlers are cleanly decoupled and nullified on teardown.
2. **R4 implementation**: Execute surgical search-and-replace across all 17 flagged files in `src/`, replacing raw emojis with Google Material Symbols.
3. **Continuous Enforcement**: Retain `scratch/scan_all_emojis.mjs` as a mandatory validation gate in the project's test suite to permanently prevent AI slop or emoji regression.
