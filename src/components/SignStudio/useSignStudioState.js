import { useState, useCallback, useRef } from 'react';
import { clampFieldBounds } from '../../utils/pdfCoordinates.js';

/**
 * Default relative dimensions by field type [widthRatio, heightRatio]
 */
export const DEFAULT_FIELD_DIMENSIONS = {
  signature: { width: 0.26, height: 0.08 },
  initials: { width: 0.14, height: 0.06 },
  date: { width: 0.28, height: 0.045 },
  name: { width: 0.28, height: 0.045 },
  email: { width: 0.30, height: 0.045 },
  title: { width: 0.26, height: 0.045 },
  company: { width: 0.28, height: 0.045 },
  text: { width: 0.32, height: 0.05 },
  stamp: { width: 0.24, height: 0.10 },
  seal: { width: 0.18, height: 0.18 },
  checkbox: { width: 0.035, height: 0.035 }
};

/**
 * Generates unique field IDs
 */
function generateFieldId(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Custom hook for managing placed fields, active selections, and undo/redo stacks
 * across multi-page PDF documents.
 */
export function useSignStudioState(initialFields = []) {
  const [fields, setFields] = useState(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Undo / Redo history state
  const [history, setHistory] = useState([initialFields]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Ref to track latest fields without waiting for state rerender in rapid events
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  /**
   * Pushes a new snapshot onto the history stack
   */
  const recordHistory = useCallback((newFields) => {
    setHistory((prevHistory) => {
      const updatedHistory = prevHistory.slice(0, historyIndex + 1);
      if (updatedHistory.length >= 30) {
        updatedHistory.shift();
      }
      return [...updatedHistory, newFields];
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 29));
  }, [historyIndex]);

  /**
   * Adds a new field onto a specific page
   */
  const addField = useCallback((fieldData) => {
    const type = fieldData.type || 'signature';
    const defaults = DEFAULT_FIELD_DIMENSIONS[type] || { width: 0.2, height: 0.06 };

    const width = fieldData.width || defaults.width;
    const height = fieldData.height || defaults.height;
    
    // Default to center of page if x/y not provided
    const rawX = fieldData.x !== undefined ? fieldData.x : 0.5 - (width / 2);
    const rawY = fieldData.y !== undefined ? fieldData.y : 0.5 - (height / 2);
    
    const clamped = clampFieldBounds(rawX, rawY, width, height);

    const newField = {
      id: fieldData.id || generateFieldId(type),
      type,
      pageIndex: fieldData.pageIndex || 0,
      x: clamped.xRatio,
      y: clamped.yRatio,
      width: clamped.widthRatio,
      height: clamped.heightRatio,
      value: fieldData.value || '',
      dataUrl: fieldData.dataUrl || null,
      color: fieldData.color || '#000000',
      fontFamily: fieldData.fontFamily || (type === 'signature' || type === 'initials' ? 'Satisfy' : 'Helvetica'),
      fontSize: fieldData.fontSize || (type === 'name' ? 14 : 12),
      textAlign: fieldData.textAlign || 'center',
      bgStyle: fieldData.bgStyle || 'transparent',
      checkStyle: fieldData.checkStyle || 'check',
      checked: fieldData.checked || false,
      dateFormat: fieldData.dateFormat || 'MM/DD/YYYY',
      stampPreset: fieldData.stampPreset || null
    };

    setFields((prev) => {
      const next = [...prev, newField];
      recordHistory(next);
      return next;
    });

    setSelectedFieldId(newField.id);
    return newField;
  }, [recordHistory]);

  /**
   * Updates an existing field with a partial patch
   */
  const updateField = useCallback((id, patch, commitToHistory = true) => {
    setFields((prev) => {
      const next = prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...patch };
        if (patch.x !== undefined || patch.y !== undefined || patch.width !== undefined || patch.height !== undefined) {
          const clamped = clampFieldBounds(
            updated.x,
            updated.y,
            updated.width,
            updated.height
          );
          updated.x = clamped.xRatio;
          updated.y = clamped.yRatio;
          updated.width = clamped.widthRatio;
          updated.height = clamped.heightRatio;
        }
        return updated;
      });

      if (commitToHistory) {
        recordHistory(next);
      }
      return next;
    });
  }, [recordHistory]);

  /**
   * Removes a field by ID
   */
  const removeField = useCallback((id) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id);
      recordHistory(next);
      return next;
    });
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  }, [recordHistory]);

  /**
   * Duplicates a field on the same page with a slight offset
   */
  const duplicateField = useCallback((id) => {
    const target = fieldsRef.current.find((f) => f.id === id);
    if (!target) return null;

    const offset = 0.025;
    const clamped = clampFieldBounds(
      target.x + offset,
      target.y + offset,
      target.width,
      target.height
    );

    const cloned = {
      ...target,
      id: generateFieldId(target.type),
      x: clamped.xRatio,
      y: clamped.yRatio
    };

    setFields((prev) => {
      const next = [...prev, cloned];
      recordHistory(next);
      return next;
    });

    setSelectedFieldId(cloned.id);
    return cloned;
  }, [recordHistory]);

  /**
   * Clones a field to all pages of the document (ideal for Initials or Stamps)
   */
  const applyFieldToAllPages = useCallback((id, totalPages) => {
    const target = fieldsRef.current.find((f) => f.id === id);
    if (!target || totalPages <= 1) return;

    const newFieldsToAdd = [];
    for (let p = 0; p < totalPages; p++) {
      if (p === target.pageIndex) continue;
      newFieldsToAdd.push({
        ...target,
        id: generateFieldId(target.type),
        pageIndex: p
      });
    }

    setFields((prev) => {
      const next = [...prev, ...newFieldsToAdd];
      recordHistory(next);
      return next;
    });
  }, [recordHistory]);

  /**
   * Aligns a field relative to page margins and axes
   */
  const alignField = useCallback((id, alignmentType) => {
    const target = fieldsRef.current.find((f) => f.id === id);
    if (!target) return;

    let patch = {};
    switch (alignmentType) {
      case 'center-h':
        patch = { x: 0.5 - (target.width / 2) };
        break;
      case 'left-margin':
        patch = { x: 0.08 };
        break;
      case 'right-margin':
        patch = { x: 0.92 - target.width };
        break;
      case 'bottom-line':
        patch = { y: 0.88 - target.height };
        break;
      case 'top-margin':
        patch = { y: 0.08 };
        break;
      default:
        break;
    }

    if (Object.keys(patch).length > 0) {
      updateField(id, patch, true);
    }
  }, [updateField]);

  /**
   * Nudges a field by delta percentages (keyboard arrow controls)
   */
  const nudgeField = useCallback((id, dx, dy) => {
    const target = fieldsRef.current.find((f) => f.id === id);
    if (!target) return;
    updateField(id, { x: target.x + dx, y: target.y + dy }, true);
  }, [updateField]);

  /**
   * Undo to previous snapshot
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setFields(targetState);
      setSelectedFieldId(null);
    }
  }, [history, historyIndex]);

  /**
   * Redo to next snapshot
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setFields(targetState);
      setSelectedFieldId(null);
    }
  }, [history, historyIndex]);

  /**
   * Clears all placed fields
   */
  const clearAllFields = useCallback(() => {
    setFields([]);
    recordHistory([]);
    setSelectedFieldId(null);
  }, [recordHistory]);

  /**
   * Get all fields for a specific page index
   */
  const getFieldsForPage = useCallback((pageIndex) => {
    return fields.filter((f) => f.pageIndex === pageIndex);
  }, [fields]);

  /**
   * Get count of placed fields for a specific page
   */
  const getFieldCountForPage = useCallback((pageIndex) => {
    return fields.filter((f) => f.pageIndex === pageIndex).length;
  }, [fields]);

  return {
    fields,
    setFields,
    selectedFieldId,
    setSelectedFieldId,
    addField,
    updateField,
    removeField,
    duplicateField,
    applyFieldToAllPages,
    alignField,
    nudgeField,
    clearAllFields,
    getFieldsForPage,
    getFieldCountForPage,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
}
