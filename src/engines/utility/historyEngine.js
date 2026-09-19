// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Immutable History Engine (Ring-Buffer Stack)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_HISTORY = 40;

/**
 * Creates an immutable history stack initialized with the given state.
 * @param {*} initialState - Initial snapshot
 * @param {number} maxSize - Maximum snapshots retained in past buffer
 * @returns {{past: Array, present: *, future: Array, maxSize: number}}
 */
export function createHistoryStack(initialState, maxSize = DEFAULT_MAX_HISTORY) {
  return {
    past: [],
    present: initialState,
    future: [],
    maxSize: Number.isFinite(maxSize) && maxSize > 0 ? maxSize : DEFAULT_MAX_HISTORY
  };
}

/**
 * Pushes a new state snapshot onto the history stack.
 * - Drops the oldest snapshot when past.length exceeds maxSize (ring-buffer capping).
 * - Clears the future redo branch on any new mutation branch.
 * - Returns the existing stack reference if nextState matches present identity.
 * 
 * @param {Object} stack - Existing history stack
 * @param {*} nextState - New snapshot to record
 * @returns {Object} New history stack
 */
export function pushHistoryState(stack, nextState) {
  if (!stack) {
    return createHistoryStack(nextState);
  }
  if (stack.present === nextState) {
    return stack;
  }

  const past = [...(stack.past || []), stack.present];
  const maxSize = stack.maxSize || DEFAULT_MAX_HISTORY;
  const trimmedPast = past.length > maxSize ? past.slice(past.length - maxSize) : past;

  return {
    past: trimmedPast,
    present: nextState,
    future: [],
    maxSize
  };
}

/**
 * Traverses backward one snapshot in time (Undo).
 * Preserves stack if past is empty.
 * 
 * @param {Object} stack - History stack
 * @returns {Object} New history stack with reverted present
 */
export function undoHistoryState(stack) {
  if (!stack || !Array.isArray(stack.past) || stack.past.length === 0) {
    return stack;
  }

  const previous = stack.past[stack.past.length - 1];
  const newPast = stack.past.slice(0, -1);
  const future = [stack.present, ...(stack.future || [])];

  return {
    past: newPast,
    present: previous,
    future,
    maxSize: stack.maxSize || DEFAULT_MAX_HISTORY
  };
}

/**
 * Traverses forward one snapshot in time (Redo).
 * Preserves stack if future is empty.
 * 
 * @param {Object} stack - History stack
 * @returns {Object} New history stack with advanced present
 */
export function redoHistoryState(stack) {
  if (!stack || !Array.isArray(stack.future) || stack.future.length === 0) {
    return stack;
  }

  const next = stack.future[0];
  const newFuture = stack.future.slice(1);
  const past = [...(stack.past || []), stack.present];

  return {
    past,
    present: next,
    future: newFuture,
    maxSize: stack.maxSize || DEFAULT_MAX_HISTORY
  };
}

/**
 * Checks if an undo operation is valid.
 * @param {Object} stack 
 * @returns {boolean}
 */
export function canUndo(stack) {
  return Boolean(stack && Array.isArray(stack.past) && stack.past.length > 0);
}

/**
 * Checks if a redo operation is valid.
 * @param {Object} stack 
 * @returns {boolean}
 */
export function canRedo(stack) {
  return Boolean(stack && Array.isArray(stack.future) && stack.future.length > 0);
}

/**
 * Global keyboard listener hook for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Cmd+Shift+Z / Ctrl+Shift+Z).
 * 
 * @param {Object} options
 * @param {Function} options.onUndo - Callback executed on undo hotkey
 * @param {Function} options.onRedo - Callback executed on redo hotkey
 * @param {Function} [options.canUndoCheck] - Optional predicate to check if undo is enabled
 * @param {Function} [options.canRedoCheck] - Optional predicate to check if redo is enabled
 * @returns {Function} Cleanup function to remove event listener
 */
export function attachHistoryKeyboardListener({ onUndo, onRedo, canUndoCheck = () => true, canRedoCheck = () => true }) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleKeyDown = (e) => {
    const isModifier = e.ctrlKey || e.metaKey;
    if (!isModifier) return;

    // Do not intercept hotkeys if user is editing inside an active input, textarea, or contenteditable element
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    const isEditingField = targetTag === 'input' || 
      targetTag === 'textarea' || 
      Boolean(e.target && (e.target.isContentEditable || e.target.contentEditable === 'true' || e.target.getAttribute?.('contenteditable') === 'true'));

    if (isEditingField) {
      return; // Allow native browser undo/redo inside input/textarea/contenteditable
    }

    const key = e.key ? e.key.toLowerCase() : '';

    if (key === 'z') {
      if (e.shiftKey) {
        // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
        if (canRedoCheck()) {
          e.preventDefault();
          if (typeof onRedo === 'function') onRedo();
        }
      } else {
        // Undo: Ctrl+Z or Cmd+Z
        // If in an input, let standard browser input undo work unless explicitly in global mode
        if (canUndoCheck()) {
          e.preventDefault();
          if (typeof onUndo === 'function') onUndo();
        }
      }
    } else if (key === 'y') {
      // Redo: Ctrl+Y or Cmd+Y
      if (canRedoCheck()) {
        e.preventDefault();
        if (typeof onRedo === 'function') onRedo();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
