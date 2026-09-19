// ═══════════════════════════════════════════════════════════════════════════════
// WYSIWYG Canvas Engine: Pure DOM Direct-Edit Controller, Cutoff Line,
// Word Box Gridlines & Selection Lifecycle Manager
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Injects a visual 1123px A4 page cutoff boundary divider into the iframe document.
 */
export function injectPageCutoffLine(doc, topPx = 1123) {
  if (!doc || !doc.body || typeof doc.getElementById !== 'function') return null;

  // If the document already renders discrete sheets (#page-2 or .cv-page-2),
  // then overflowing content has already been intelligently captured onto Page 2.
  // We do NOT inject a cutoff line cutting through Page 1!
  const hasDiscretePage2 = Boolean(doc.getElementById('page-2') || doc.querySelector?.('.cv-page-2'));
  if (hasDiscretePage2) {
    removePageCutoffLine(doc);
    return null;
  }

  let breakLine = doc.getElementById('docscalar-page-break-line');
  if (!breakLine) {
    breakLine = doc.createElement('div');
    breakLine.id = 'docscalar-page-break-line';
    breakLine.setAttribute(
      'style',
      `position: absolute; left: 0; right: 0; top: ${topPx}px; border-top: 2px dashed rgba(239, 68, 68, 0.45); pointer-events: none; z-index: 9999;`
    );

    const labelSpan = doc.createElement('span');
    labelSpan.setAttribute(
      'style',
      'position: absolute; right: 12px; top: -10px; font-size: 10px; font-family: sans-serif; background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: 600;'
    );
    labelSpan.textContent = `Page 1 Cutoff (${topPx}px)`;
    breakLine.appendChild(labelSpan);

    doc.body.appendChild(breakLine);
  } else {
    breakLine.style.top = `${topPx}px`;
  }
  return breakLine;
}

/**
 * Cleanly strips the visual 1123px A4 page cutoff boundary from the document.
 */
export function removePageCutoffLine(doc) {
  if (!doc || typeof doc.getElementById !== 'function') return;
  const breakLine = doc.getElementById('docscalar-page-break-line');
  if (breakLine) {
    try {
      breakLine.remove();
    } catch (_) {}
  }
}

/**
 * Accurately measures the unscaled content height of the iframe document.
 * Temporarily hides the visual cutoff line to guarantee zero measurement distortion.
 */
export function measureContentHeight(doc) {
  if (!doc || !doc.body) return 1123;
  const breakLine = doc.getElementById('docscalar-page-break-line');
  const originalDisplay = breakLine ? breakLine.style.display : null;
  if (breakLine) {
    breakLine.style.display = 'none';
  }

  let h = 0;
  try {
    const body = doc.body;
    h = body.scrollHeight || 0;
  } catch (_) {}

  if (breakLine) {
    breakLine.style.display = originalDisplay || '';
  }

  return h > 0 ? h : 1123;
}

/**
 * Toggle invisible Word-style box alignment gridlines on the document.
 */
export function updateGridlinesOnDoc(doc, enabled) {
  if (!doc || !doc.body || typeof doc.getElementById !== 'function') return;
  let styleEl = doc.getElementById('docscalar-gridline-styles');
  if (!enabled) {
    doc.body.classList.remove('docscalar-box-grid');
    if (styleEl) {
      styleEl.textContent = '';
      try { styleEl.remove(); } catch (_) {}
    }
    return;
  }
  doc.body.classList.add('docscalar-box-grid');
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = 'docscalar-gridline-styles';
    const target = doc.head || doc.body;
    if (typeof target?.appendChild === 'function') {
      target.appendChild(styleEl);
    }
  }
  styleEl.textContent = `
    .docscalar-box-grid [data-df-field] {
      outline: 1px dashed rgba(99, 102, 241, 0.55) !important;
      outline-offset: 1.5px !important;
    }
    .docscalar-box-grid section,
    .docscalar-box-grid .main-section,
    .docscalar-box-grid .sidebar,
    .docscalar-box-grid .main-content,
    .docscalar-box-grid .entry-item,
    .docscalar-box-grid .contact-bar,
    .docscalar-box-grid .contact-row {
      outline: 1px dotted rgba(148, 163, 184, 0.5) !important;
    }
    @media print {
      #docscalar-gridline-styles,
      .docscalar-box-grid,
      .docscalar-box-grid * {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  `;
}

/**
 * Pure, idempotent controller to cleanly tear down direct inline editing in an iframe document.
 */
export function disableDirectEditOnDoc(doc) {
  if (!doc || typeof doc.getElementById !== 'function' || typeof doc.querySelectorAll !== 'function') return;

  try {
    // 0. Remove visual page cutoff boundary line
    removePageCutoffLine(doc);

    // 1. Blur active element to remove dangling focus/caret
    if (doc.activeElement && typeof doc.activeElement.blur === 'function') {
      try {
        doc.activeElement.blur();
      } catch (_) {}
    }

    // 2. Remove injected style element
    const styleEl = doc.getElementById('docscalar-direct-edit-styles');
    if (styleEl) {
      styleEl.textContent = '';
      try {
        styleEl.remove();
      } catch (_) {}
    }

    // 3. Strip contenteditable, spellcheck, and nullify event properties on all editable elements
    const editableEls = doc.querySelectorAll(
      '[contenteditable], [data-df-bound], [data-docscalar-field]'
    );
    editableEls.forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      if (el.dataset) {
        delete el.dataset.dfBound;
        delete el.dataset.docscalarField;
      }
      el.onfocus = null;
      el.oninput = null;
      el.onblur = null;
      el.onpaste = null;
      el.onkeydown = null;
    });

    // 4. Remove photo click handlers and class
    const photoEls = doc.querySelectorAll(
      '.docscalar-photo-clickable, [data-df-field="photo"], .avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo, .avatar-mask'
    );
    photoEls.forEach((p) => {
      p.classList.remove('docscalar-photo-clickable');
      p.onclick = null;
    });

    // 5. Remove selection listener references if stored
    if (typeof doc._dfCleanupSelection === 'function') {
      try {
        doc._dfCleanupSelection();
        delete doc._dfCleanupSelection;
      } catch (_) {}
    }
  } catch (err) {
    console.warn('disableDirectEditOnDoc error:', err);
  }
}

/**
 * Pure, idempotent controller to activate direct inline editing in an iframe document.
 */
export function enableDirectEditOnDoc(doc, actions = {}) {
  if (!doc || !doc.body || typeof doc.getElementById !== 'function' || typeof doc.querySelectorAll !== 'function') return;

  // 1. Clean prior state first to ensure strict idempotency
  disableDirectEditOnDoc(doc);

  try {
    // 2. Inject visual 1123px A4 page cutoff boundary divider
    injectPageCutoffLine(doc, 1123);

    // 3. Inject or update direct edit style rules
    let styleEl = doc.getElementById('docscalar-direct-edit-styles');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'docscalar-direct-edit-styles';
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
        min-width: 24px !important;
        min-height: 1.2em !important;
      }
      span[contenteditable="true"], a[contenteditable="true"], strong[contenteditable="true"], em[contenteditable="true"], b[contenteditable="true"], i[contenteditable="true"] {
        display: inline-block;
      }
      [contenteditable="true"]:empty::before {
        content: attr(data-placeholder) !important;
        color: #94a3b8 !important;
        opacity: 0.65 !important;
        pointer-events: none !important;
        font-style: italic !important;
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
      .docscalar-photo-clickable {
        cursor: pointer !important;
      }
      .docscalar-photo-clickable:hover {
        filter: brightness(1.08) !important;
        box-shadow: 0 0 0 3px #2563eb !important;
      }
      a { pointer-events: none !important; }
      @media print {
        #docscalar-page-break-line,
        #docscalar-gridline-styles,
        .cv-floating-word-toolbar {
          display: none !important;
        }
        .docscalar-box-grid,
        .docscalar-box-grid * {
          outline: none !important;
          box-shadow: none !important;
        }
        [contenteditable="true"] {
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          background-color: transparent !important;
        }
        [contenteditable="true"]:empty::before {
          content: "" !important;
          display: none !important;
        }
      }
    `;

    // 3. Helper to bind field handlers
    function bindField(el, fieldPath) {
      if (!el || (el.dataset && el.dataset.dfBound === 'true')) return;
      if (
        fieldPath === 'photo' ||
        (typeof el.matches === 'function' && el.matches('.avatar-mask, .profile-photo, .avatar, .photo-container')) ||
        (typeof el.closest === 'function' && el.closest('.avatar-mask, .profile-photo, .avatar, .photo-container'))
      ) return;
      if (el.dataset) {
        el.dataset.dfBound = 'true';
        el.dataset.docscalarField = fieldPath;
      }
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      if (!el.getAttribute('data-placeholder')) {
        let ph = 'Type here...';
        if (fieldPath === 'name') ph = 'Full Name';
        else if (fieldPath === 'title') ph = 'Professional Title';
        else if (fieldPath === 'summary') ph = 'Write professional summary...';
        else if (fieldPath === 'location') ph = 'City, Country';
        else if (fieldPath === 'phone') ph = '+1 (555) 000-0000';
        else if (fieldPath === 'email') ph = 'email@example.com';
        else if (fieldPath.includes('company')) ph = 'Company Name';
        else if (fieldPath.includes('role')) ph = 'Job Role';
        else if (fieldPath.includes('school')) ph = 'Institution / University';
        else if (fieldPath.includes('degree')) ph = 'Degree / Major';
        else if (fieldPath.includes('highlight')) ph = 'Accomplishment or bullet point...';
        el.setAttribute('data-placeholder', ph);
      }

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

      let initialText = '';
      el.onfocus = () => {
        initialText = (el.innerText || '').trim();
        doc._dfIsTyping = true;
        actions.onTypingStart?.();
      };

      let heightDebounceTimer = null;
      el.oninput = () => {
        if (isRemoving) return;
        doc._dfIsTyping = true;
        let val = el.innerText || '';
        // Preserve spaces while typing so user can enter multi-word text
        if (fieldPath === 'name' || fieldPath === 'title') {
          val = val.replace(/[\r\n]+/g, ' ');
        }
        actions.applyInlineEdit?.(fieldPath, val);
        if (typeof actions.onContentHeightChange === 'function') {
          if (heightDebounceTimer) clearTimeout(heightDebounceTimer);
          heightDebounceTimer = setTimeout(() => {
            actions.onContentHeightChange(measureContentHeight(doc));
          }, 150);
        }
      };

      el.onblur = () => {
        if (isRemoving) return;
        doc._dfIsTyping = false;
        if (heightDebounceTimer) {
          clearTimeout(heightDebounceTimer);
          heightDebounceTimer = null;
        }
        let val = el.innerText || '';
        if (fieldPath === 'name' || fieldPath === 'title') {
          val = val.replace(/\s+/g, ' ').trim();
        }

        // NO-OP BLUR GUARD: If text is unchanged from initial focus, do not trigger state update or iframe reload!
        if (val.trim() === initialText) {
          actions.onTypingEnd?.();
          return;
        }

        if (fieldPath.startsWith('exp:') && fieldPath.includes('highlight')) {
          const parts = fieldPath.split(':');
          const expIdx = parseInt(parts[1], 10);
          const hIdx = parseInt(parts[3], 10);
          if (val.trim() === '') {
            safeRemove();
            actions.removeExpHighlight?.(expIdx, hIdx);
            actions.onTypingEnd?.();
            return;
          }
        }
        actions.applyInlineEdit?.(fieldPath, val);
        actions.onContentHeightChange?.(measureContentHeight(doc));
        actions.onTypingEnd?.();
      };

      el.onpaste = (e) => {
        e.preventDefault();
        const text = (e.clipboardData || (doc.defaultView && doc.defaultView.clipboardData) || window.clipboardData)?.getData('text/plain') || '';
        if (typeof doc.execCommand === 'function') {
          doc.execCommand('insertText', false, text);
        } else {
          const selection = (doc.defaultView || window).getSelection?.();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(doc.createTextNode(text));
          }
        }
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
            try {
              newLi.focus();
            } catch (_) {}
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
                const win = doc.defaultView || window;
                const sel = win.getSelection?.();
                if (sel) {
                  range.selectNodeContents(prevSibling);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
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
      if (
        fieldPath === 'photo' ||
        (typeof el.matches === 'function' && el.matches('.avatar-mask, .profile-photo, .avatar, .photo-container')) ||
        (typeof el.closest === 'function' && el.closest('.avatar-mask, .profile-photo, .avatar, .photo-container'))
      ) {
        el.removeAttribute('contenteditable');
        el.classList.add('docscalar-photo-clickable');
        el.onclick = (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          actions.onOpenPhoto?.();
        };
        return;
      }
      if (fieldPath) bindField(el, fieldPath);
    });

    // 5. Query and bind photo elements
    const photoEls = doc.querySelectorAll(
      '.avatar, .profile-photo, .photo-container, img.avatar, img.profile-photo, .avatar-mask'
    );
    photoEls.forEach((p) => {
      p.removeAttribute('contenteditable');
      p.classList.add('docscalar-photo-clickable');
      p.onclick = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        actions.onOpenPhoto?.();
      };
    });

    // 6. Selection change listener for Floating Word Formatting Ribbon
    const handleSelection = () => {
      const win = doc.defaultView || window;
      const sel = win.getSelection ? win.getSelection() : null;
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        actions.onSelectionChange?.(null);
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          actions.onSelectionChange?.(null);
          return;
        }
        actions.onSelectionChange?.({
          text: sel.toString(),
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height
          }
        });
      } catch (_) {
        actions.onSelectionChange?.(null);
      }
    };

    doc.addEventListener('selectionchange', handleSelection);
    doc.addEventListener('mouseup', handleSelection);
    doc.addEventListener('keyup', handleSelection);

    doc._dfCleanupSelection = () => {
      doc.removeEventListener('selectionchange', handleSelection);
      doc.removeEventListener('mouseup', handleSelection);
      doc.removeEventListener('keyup', handleSelection);
    };
  } catch (err) {
    console.warn('enableDirectEditOnDoc error:', err);
  }
}
