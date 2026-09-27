// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Resume Studio Central React Context & State Provider
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useReducer, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { resumeReducer, initialResumeState, ACTION_TYPES, defaultData } from './resumeReducer.js';
import {
  createHistoryStack,
  pushHistoryState,
  undoHistoryState,
  redoHistoryState,
  canUndo as checkCanUndo,
  canRedo as checkCanRedo,
  attachHistoryKeyboardListener
} from '../engines/utility/historyEngine.js';
import { TEMPLATE_MAP, loadTemplate } from '../engines/utility/templateRegistry.js';
import {
  calculateAtsHealthScore,
  enhanceBullet,
  getRoleIntelligence,
  sanitizeResumeTextFormatting,
  autoTunePageFit,
  analyzeJobKeywordMatch,
  analyzeSemanticJobMatch,
  simulateAtsTextExtraction
} from '../engines/utility/resumeIntelligenceEngine.js';
import { injectPhotoCropStyles, injectPrintStyles } from '../engines/utility/printUtils.js';
import { exportResumeToDocx } from '../engines/utility/docxExporter.js';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../utils/api.js';
import { saveAs } from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist';

// Setup PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

const DRAFT_STORAGE_KEY = 'docscalar_resume_draft_v1';

import { sanitizeData, sanitizeDeep } from '../engines/utility/resumeParserEngine.js';
import { ensureTemplateFieldParity } from '../engines/utility/universalTemplateParity.js';
export { sanitizeData };

const getSavedDraft = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return null;
};

const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  // Initialize hydrated state
  const initialDraft = useMemo(() => getSavedDraft(), []);
  
  const hydratedInitialState = useMemo(() => {
    if (!initialDraft) return initialResumeState;
    return {
      ...initialResumeState,
      data: initialDraft.data ? { ...defaultData, ...initialDraft.data } : initialResumeState.data,
      theme: {
        ...initialResumeState.theme,
        activeTemplate: (initialDraft.activeTemplate && TEMPLATE_MAP[initialDraft.activeTemplate]) 
          ? initialDraft.activeTemplate 
          : (initialDraft.theme?.activeTemplate && TEMPLATE_MAP[initialDraft.theme.activeTemplate])
          ? initialDraft.theme.activeTemplate
          : initialResumeState.theme.activeTemplate,
        themeColor: initialDraft.themeColor || initialDraft.theme?.themeColor || initialResumeState.theme.themeColor,
        themeFont: initialDraft.themeFont || initialDraft.theme?.themeFont || initialResumeState.theme.themeFont,
        themeLayout: initialDraft.themeLayout || initialDraft.theme?.themeLayout || initialResumeState.theme.themeLayout,
        pageMargin: initialDraft.pageMargin !== undefined ? initialDraft.pageMargin : (initialDraft.theme?.pageMargin !== undefined ? initialDraft.theme.pageMargin : initialResumeState.theme.pageMargin),
        lineSpacing: initialDraft.lineSpacing !== undefined ? initialDraft.lineSpacing : (initialDraft.theme?.lineSpacing !== undefined ? initialDraft.theme.lineSpacing : initialResumeState.theme.lineSpacing),
        sectionOrder: Array.isArray(initialDraft.sectionOrder) ? initialDraft.sectionOrder : (Array.isArray(initialDraft.theme?.sectionOrder) ? initialDraft.theme.sectionOrder : initialResumeState.theme.sectionOrder)
      },
      ui: {
        ...initialResumeState.ui,
        screen: initialDraft.screen || initialDraft.ui?.screen || initialResumeState.ui.screen,
        wizardStep: initialDraft.wizardStep !== undefined ? initialDraft.wizardStep : (initialDraft.ui?.wizardStep !== undefined ? initialDraft.ui.wizardStep : initialResumeState.ui.wizardStep),
        activeSection: initialDraft.activeSection || initialDraft.ui?.activeSection || initialResumeState.ui.activeSection
      },
      runtime: {
        ...initialResumeState.runtime,
        draftSaved: true
      }
    };
  }, [initialDraft]);

  const [state, baseDispatch] = useReducer(resumeReducer, hydratedInitialState);

  // History Stack Ref
  const historyRef = useRef(createHistoryStack({
    data: hydratedInitialState.data,
    theme: hydratedInitialState.theme
  }, 40));

  const [, setHistoryVersion] = React.useState(0);
  const [templateVersion, setTemplateVersion] = useState(0);

  // Asynchronously load active template generator if not yet cached
  useEffect(() => {
    let isMounted = true;
    const key = state.theme.activeTemplate || 'mariana';
    if (!TEMPLATE_MAP[key]?.fn) {
      loadTemplate(key).then(() => {
        if (isMounted) setTemplateVersion(v => v + 1);
      });
    }
    return () => { isMounted = false; };
  }, [state.theme.activeTemplate]);

  // Custom Dispatch wrapper with automatic history snapshot recording
  const dispatch = useCallback((action) => {
    if (!action || !action.type) return;

    // Actions that mutate state in an undoable way
    const isUndoable = (
      action.type.startsWith('RESUME/') ||
      action.type.startsWith('THEME/')
    ) && action.type !== 'RESUME/IMPORT_DATA';

    baseDispatch(action);

    if (isUndoable) {
      // Capture after reducer processes state on next tick or synchronously
      setTimeout(() => {
        // Will be updated in synchronization effect
      }, 0);
    }
  }, []);

  // Update history stack on data/theme changes with 600ms text-burst coalescence
  const prevSnapshotRef = useRef(JSON.stringify({ data: state.data, theme: state.theme }));
  const lastSnapshotTimeRef = useRef(0);
  const historyDebounceTimerRef = useRef(null);
  const prevDataCountsRef = useRef({
    exp: state.data?.experience?.length || 0,
    edu: state.data?.education?.length || 0,
    skills: state.data?.skills?.length || 0,
    proj: state.data?.projects?.length || 0,
    certs: state.data?.certifications?.length || 0,
    template: state.theme?.activeTemplate,
    themeColor: state.theme?.themeColor
  });

  useEffect(() => {
    const currentJson = JSON.stringify({ data: state.data, theme: state.theme });
    if (currentJson === prevSnapshotRef.current) return;

    prevSnapshotRef.current = currentJson;

    // Check if change is a discrete structural action (array count changed or template/color changed)
    const isDiscrete =
      (state.data?.experience?.length || 0) !== prevDataCountsRef.current.exp ||
      (state.data?.education?.length || 0) !== prevDataCountsRef.current.edu ||
      (state.data?.skills?.length || 0) !== prevDataCountsRef.current.skills ||
      (state.data?.projects?.length || 0) !== prevDataCountsRef.current.proj ||
      (state.data?.certifications?.length || 0) !== prevDataCountsRef.current.certs ||
      state.theme?.activeTemplate !== prevDataCountsRef.current.template ||
      state.theme?.themeColor !== prevDataCountsRef.current.themeColor;

    // Update tracked counts
    prevDataCountsRef.current = {
      exp: state.data?.experience?.length || 0,
      edu: state.data?.education?.length || 0,
      skills: state.data?.skills?.length || 0,
      proj: state.data?.projects?.length || 0,
      certs: state.data?.certifications?.length || 0,
      template: state.theme?.activeTemplate,
      themeColor: state.theme?.themeColor
    };

    const now = Date.now();
    const timeSinceLast = now - lastSnapshotTimeRef.current;

    if (isDiscrete || timeSinceLast >= 600) {
      // Clear any pending timer and push new snapshot immediately
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      historyRef.current = pushHistoryState(historyRef.current, {
        data: state.data,
        theme: state.theme
      });
      lastSnapshotTimeRef.current = now;
      setHistoryVersion(v => v + 1);

      // Start 600ms inactivity timer to close coalescing window
      historyDebounceTimerRef.current = setTimeout(() => {
        lastSnapshotTimeRef.current = 0;
      }, 600);
    } else {
      // Coalesce continuous typing burst by updating the present snapshot in-place
      historyRef.current = {
        ...historyRef.current,
        present: {
          data: state.data,
          theme: state.theme
        }
      };
      // Reset inactivity timer
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
      }
      historyDebounceTimerRef.current = setTimeout(() => {
        lastSnapshotTimeRef.current = 0;
      }, 600);
    }
  }, [state.data, state.theme]);

  // Undo / Redo operations
  const undo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    lastSnapshotTimeRef.current = 0;

    if (!checkCanUndo(historyRef.current)) return;
    const nextHistory = undoHistoryState(historyRef.current);
    historyRef.current = nextHistory;
    setHistoryVersion(v => v + 1);

    const snapshot = nextHistory.present;
    if (snapshot) {
      prevSnapshotRef.current = JSON.stringify(snapshot);
      baseDispatch({
        type: ACTION_TYPES.IMPORT_DATA,
        payload: {
          data: snapshot.data,
          theme: snapshot.theme
        }
      });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    lastSnapshotTimeRef.current = 0;

    if (!checkCanRedo(historyRef.current)) return;
    const nextHistory = redoHistoryState(historyRef.current);
    historyRef.current = nextHistory;
    setHistoryVersion(v => v + 1);

    const snapshot = nextHistory.present;
    if (snapshot) {
      prevSnapshotRef.current = JSON.stringify(snapshot);
      baseDispatch({
        type: ACTION_TYPES.IMPORT_DATA,
        payload: {
          data: snapshot.data,
          theme: snapshot.theme
        }
      });
    }
  }, []);

  const canUndo = checkCanUndo(historyRef.current);
  const canRedo = checkCanRedo(historyRef.current);

  // Global Keyboard Listener (Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  useEffect(() => {
    const cleanup = attachHistoryKeyboardListener({
      onUndo: undo,
      onRedo: redo,
      canUndoCheck: () => checkCanUndo(historyRef.current),
      canRedoCheck: () => checkCanRedo(historyRef.current)
    });
    return cleanup;
  }, [undo, redo]);

  // Debounced LocalStorage Draft Auto-Save
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          screen: state.ui.screen,
          data: state.data,
          activeTemplate: state.theme.activeTemplate,
          themeColor: state.theme.themeColor,
          themeFont: state.theme.themeFont,
          themeLayout: state.theme.themeLayout,
          pageMargin: state.theme.pageMargin,
          lineSpacing: state.theme.lineSpacing,
          sectionOrder: state.theme.sectionOrder,
          wizardStep: state.ui.wizardStep,
          activeSection: state.ui.activeSection,
          updatedAt: Date.now()
        };
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
          baseDispatch({ type: ACTION_TYPES.SET_DRAFT_SAVED, payload: true });
        } catch (storageErr) {
          // If storage quota exceeded (e.g. large base64 image), strip image and save text data
          if (payload.data && payload.data.photoUrl && payload.data.photoUrl.length > 150000) {
            const fallbackPayload = {
              ...payload,
              data: { ...payload.data, photoUrl: '' }
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fallbackPayload));
            baseDispatch({ type: ACTION_TYPES.SET_DRAFT_SAVED, payload: true });
          }
        }
      } catch (_) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [state.data, state.theme, state.ui.screen, state.ui.wizardStep, state.ui.activeSection]);

  // Synchronous flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const payload = {
          screen: state.ui.screen,
          data: state.data,
          activeTemplate: state.theme.activeTemplate,
          themeColor: state.theme.themeColor,
          themeFont: state.theme.themeFont,
          themeLayout: state.theme.themeLayout,
          pageMargin: state.theme.pageMargin,
          lineSpacing: state.theme.lineSpacing,
          sectionOrder: state.theme.sectionOrder,
          wizardStep: state.ui.wizardStep,
          activeSection: state.ui.activeSection,
          updatedAt: Date.now()
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.data, state.theme, state.ui.screen, state.ui.wizardStep, state.ui.activeSection]);

  // Cross-Tab Multi-Window Synchronization
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === DRAFT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.data) {
            baseDispatch({
              type: ACTION_TYPES.IMPORT_DATA,
              payload: {
                data: parsed.data,
                theme: {
                  activeTemplate: parsed.activeTemplate || parsed.theme?.activeTemplate || 'mariana',
                  themeColor: parsed.themeColor || parsed.theme?.themeColor || 'default',
                  themeFont: parsed.themeFont || parsed.theme?.themeFont || 'Inter',
                  themeLayout: parsed.themeLayout || parsed.theme?.themeLayout || 'auto',
                  pageMargin: parsed.pageMargin !== undefined ? parsed.pageMargin : 24,
                  lineSpacing: parsed.lineSpacing !== undefined ? parsed.lineSpacing : 1.4,
                  sectionOrder: parsed.sectionOrder || parsed.theme?.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages']
                },
                ui: {
                  screen: parsed.screen || 'editor',
                  wizardStep: parsed.wizardStep !== undefined ? parsed.wizardStep : 0,
                  activeSection: parsed.activeSection || 'personal'
                }
              }
            });
          }
        } catch (_) {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync editor screen class with document body
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (state.ui.screen === 'editor') {
        document.body.classList.add('studio-editor-active');
      } else {
        document.body.classList.remove('studio-editor-active');
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('studio-editor-active');
      }
    };
  }, [state.ui.screen]);

  // Compute live Preview HTML
  const previewHtml = useMemo(() => {
    const templateItem = TEMPLATE_MAP[state.theme.activeTemplate] || TEMPLATE_MAP.mariana;
    if (!templateItem || typeof templateItem.fn !== 'function') return '';

    try {
      const sanitized = sanitizeData(state.data);
      const rawHtml = templateItem.fn(
        sanitized,
        state.theme.themeColor,
        state.theme.themeFont,
        state.theme.sectionOrder,
        state.theme.themeLayout,
        state.theme.pageMargin,
        state.theme.lineSpacing
      );
      const enrichedHtml = ensureTemplateFieldParity(rawHtml, sanitized, state.theme);
      const htmlWithCrop = injectPhotoCropStyles(enrichedHtml, { photoCrop: state.data.photoCrop });
      return htmlWithCrop || enrichedHtml || rawHtml || '';
    } catch (err) {
      console.error('Error generating preview HTML:', err);
      return '';
    }
  }, [
    state.data,
    state.data.photoCrop,
    state.theme.activeTemplate,
    state.theme.themeColor,
    state.theme.themeFont,
    state.theme.sectionOrder,
    state.theme.themeLayout,
    state.theme.pageMargin,
    state.theme.lineSpacing,
    templateVersion
  ]);

  // Compute live ATS Health Score
  const atsHealth = useMemo(() => {
    return calculateAtsHealthScore(state.data, state.theme.activeTemplate, previewHtml);
  }, [state.data, state.theme.activeTemplate, previewHtml]);

  // Check Backend Health
  useEffect(() => {
    apiFetch('/health')
      .then(res => {
        if (res.ok) baseDispatch({ type: ACTION_TYPES.SET_BACKEND_ACTIVE, payload: true });
      })
      .catch(() => {
        baseDispatch({ type: ACTION_TYPES.SET_BACKEND_ACTIVE, payload: false });
      });
  }, []);

  // ── Action Dispatcher Helpers ──
  const setField = useCallback((field, value) => {
    dispatch({ type: ACTION_TYPES.SET_FIELD, payload: { field, value } });
  }, [dispatch]);

  const setExpField = useCallback((index, field, value) => {
    dispatch({ type: ACTION_TYPES.SET_EXP_FIELD, payload: { index, field, value } });
  }, [dispatch]);

  const addExp = useCallback(() => {
    dispatch({ type: ACTION_TYPES.ADD_EXPERIENCE });
  }, [dispatch]);

  const removeExp = useCallback((id, index) => {
    dispatch({ type: ACTION_TYPES.REMOVE_EXPERIENCE, payload: { id, index } });
  }, [dispatch]);

  const addExpHighlight = useCallback((expIndex, highlightIndex) => {
    dispatch({ type: ACTION_TYPES.ADD_EXP_HIGHLIGHT, payload: { expIndex, highlightIndex } });
  }, [dispatch]);

  const setExpHighlight = useCallback((expIndex, highlightIndex, value) => {
    dispatch({ type: ACTION_TYPES.SET_EXP_HIGHLIGHT, payload: { expIndex, highlightIndex, value } });
  }, [dispatch]);

  const removeExpHighlight = useCallback((expIndex, highlightIndex) => {
    dispatch({ type: ACTION_TYPES.REMOVE_EXP_HIGHLIGHT, payload: { expIndex, highlightIndex } });
  }, [dispatch]);

  const setEduField = useCallback((index, field, value) => {
    dispatch({ type: ACTION_TYPES.SET_EDU_FIELD, payload: { index, field, value } });
  }, [dispatch]);

  const addEdu = useCallback(() => {
    dispatch({ type: ACTION_TYPES.ADD_EDUCATION });
  }, [dispatch]);

  const removeEdu = useCallback((id, index) => {
    dispatch({ type: ACTION_TYPES.REMOVE_EDUCATION, payload: { id, index } });
  }, [dispatch]);

  const addSkill = useCallback((skill) => {
    dispatch({ type: ACTION_TYPES.ADD_SKILL, payload: skill });
  }, [dispatch]);

  const removeSkill = useCallback((skillOrIndex) => {
    dispatch({ type: ACTION_TYPES.REMOVE_SKILL, payload: skillOrIndex });
  }, [dispatch]);

  const setSkills = useCallback((skills) => {
    dispatch({ type: ACTION_TYPES.SET_SKILLS, payload: skills });
  }, [dispatch]);

  const setProjField = useCallback((index, field, value) => {
    dispatch({ type: ACTION_TYPES.SET_PROJ_FIELD, payload: { index, field, value } });
  }, [dispatch]);

  const addProj = useCallback(() => {
    dispatch({ type: ACTION_TYPES.ADD_PROJECT });
  }, [dispatch]);

  const removeProj = useCallback((id, index) => {
    dispatch({ type: ACTION_TYPES.REMOVE_PROJECT, payload: { id, index } });
  }, [dispatch]);

  const addCert = useCallback((cert) => {
    dispatch({ type: ACTION_TYPES.ADD_CERTIFICATION, payload: cert });
  }, [dispatch]);

  const removeCert = useCallback((certOrIndex) => {
    dispatch({ type: ACTION_TYPES.REMOVE_CERTIFICATION, payload: certOrIndex });
  }, [dispatch]);

  const setRefField = useCallback((index, field, value) => {
    dispatch({ type: ACTION_TYPES.SET_REF_FIELD, payload: { index, field, value } });
  }, [dispatch]);

  const addRef = useCallback(() => {
    dispatch({ type: ACTION_TYPES.ADD_REFERENCE });
  }, [dispatch]);

  const removeRef = useCallback((id, index) => {
    dispatch({ type: ACTION_TYPES.REMOVE_REFERENCE, payload: { id, index } });
  }, [dispatch]);

  const addCustomSection = useCallback((section) => {
    dispatch({ type: ACTION_TYPES.ADD_CUSTOM_SECTION, payload: section });
  }, [dispatch]);

  const updateCustomSectionTitle = useCallback((id, title) => {
    dispatch({ type: ACTION_TYPES.UPDATE_CUSTOM_SECTION_TITLE, payload: { id, title } });
  }, [dispatch]);

  const updateCustomSectionItem = useCallback((sectionId, itemIndex, item) => {
    dispatch({ type: ACTION_TYPES.UPDATE_CUSTOM_SECTION_ITEM, payload: { sectionId, itemIndex, item } });
  }, [dispatch]);

  const removeCustomSection = useCallback((id) => {
    dispatch({ type: ACTION_TYPES.REMOVE_CUSTOM_SECTION, payload: { id } });
  }, [dispatch]);

  const setSectionTitle = useCallback((sectionKey, title) => {
    dispatch({ type: ACTION_TYPES.SET_SECTION_TITLE, payload: { sectionKey, title } });
  }, [dispatch]);

  const setSectionOrder = useCallback((order) => {
    dispatch({ type: ACTION_TYPES.SET_SECTION_ORDER, payload: order });
  }, [dispatch]);

  const moveSection = useCallback((fromIndex, toIndex) => {
    dispatch({ type: ACTION_TYPES.MOVE_SECTION, payload: { fromIndex, toIndex } });
  }, [dispatch]);

  const setThemeColor = useCallback((color) => {
    dispatch({ type: ACTION_TYPES.SET_THEME_COLOR, payload: color });
  }, [dispatch]);

  const setThemeFont = useCallback((font) => {
    dispatch({ type: ACTION_TYPES.SET_THEME_FONT, payload: font });
  }, [dispatch]);

  const setThemeLayout = useCallback((layout) => {
    dispatch({ type: ACTION_TYPES.SET_THEME_LAYOUT, payload: layout });
  }, [dispatch]);

  const setPageMargin = useCallback((margin) => {
    dispatch({ type: ACTION_TYPES.SET_PAGE_MARGIN, payload: margin });
  }, [dispatch]);

  const setLineSpacing = useCallback((spacing) => {
    dispatch({ type: ACTION_TYPES.SET_LINE_SPACING, payload: spacing });
  }, [dispatch]);

  const setActiveTemplate = useCallback((templateKey) => {
    dispatch({ type: ACTION_TYPES.SET_ACTIVE_TEMPLATE, payload: templateKey });
  }, [dispatch]);

  const setScreen = useCallback((screen) => {
    dispatch({ type: ACTION_TYPES.SET_SCREEN, payload: screen });
  }, [dispatch]);

  const setWizardStep = useCallback((step) => {
    dispatch({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: step });
  }, [dispatch]);

  const setActiveSection = useCallback((section) => {
    dispatch({ type: ACTION_TYPES.SET_ACTIVE_SECTION, payload: section });
  }, [dispatch]);

  const setDirectEdit = useCallback((bool) => {
    dispatch({ type: ACTION_TYPES.SET_DIRECT_EDIT, payload: bool });
  }, [dispatch]);

  const setModalState = useCallback((modalName, isOpen, tab) => {
    dispatch({ type: ACTION_TYPES.SET_MODAL_STATE, payload: { modalName, isOpen, tab } });
  }, [dispatch]);

  const setTemplateFilter = useCallback((filter) => {
    dispatch({ type: ACTION_TYPES.SET_TEMPLATE_FILTER, payload: filter });
  }, [dispatch]);

  const setZoomMode = useCallback((mode) => {
    dispatch({ type: ACTION_TYPES.SET_ZOOM_MODE, payload: mode });
  }, [dispatch]);

  const applyInlineEdit = useCallback((fieldPath, value) => {
    dispatch({ type: ACTION_TYPES.APPLY_INLINE_EDIT, payload: { fieldPath, value } });
  }, [dispatch]);

  const autoSanitize = useCallback(() => {
    dispatch({ type: ACTION_TYPES.AUTO_SANITIZE });
  }, [dispatch]);

  const autoTuneFit = useCallback((lineSpacing, pageMargin) => {
    dispatch({ type: ACTION_TYPES.AUTO_TUNE_PAGE_FIT, payload: { lineSpacing, pageMargin } });
  }, [dispatch]);

  const resetDraft = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET_DRAFT });
  }, [dispatch]);

  const importData = useCallback((payload) => {
    dispatch({ type: ACTION_TYPES.IMPORT_DATA, payload });
  }, [dispatch]);

  // ── Document Export & Print Operations ──
  const directPrint = useCallback(() => {
    if (!previewHtml) return;
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '794px';
    printFrame.style.height = '1123px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const styledHtml = injectPhotoCropStyles(injectPrintStyles(previewHtml), { photoCrop: state.data.photoCrop });

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(styledHtml);
    doc.close();

    printFrame.onload = () => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.warn('Direct print iframe error, falling back to window.print()', err);
        window.print();
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(printFrame);
          } catch (_) {}
        }, 1000);
      }
    };
  }, [previewHtml, state.data.photoCrop]);

  const exportPdf = useCallback(async () => {
    dispatch({ type: ACTION_TYPES.SET_PROCESSING, payload: true });
    dispatch({ type: ACTION_TYPES.SET_PROGRESS, payload: 15 });
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });

    try {
      const templateItem = TEMPLATE_MAP[state.theme.activeTemplate] || TEMPLATE_MAP.mariana;
      let generatorFn = templateItem?.fn;
      if (typeof generatorFn !== 'function') {
        generatorFn = await loadTemplate(state.theme.activeTemplate || 'mariana');
      }
      const sanitized = sanitizeData(state.data);
      const rawHtml = generatorFn(
        sanitized,
        state.theme.themeColor,
        state.theme.themeFont,
        state.theme.sectionOrder,
        state.theme.themeLayout,
        state.theme.pageMargin,
        state.theme.lineSpacing
      );

      const enrichedHtml = ensureTemplateFieldParity(rawHtml, sanitized, state.theme);
      const htmlWithStyles = injectPhotoCropStyles(injectPrintStyles(enrichedHtml), { photoCrop: state.data.photoCrop });
      const filename = `${(state.data.name || 'Resume').replace(/\s+/g, '_')}_Resume.pdf`;

      dispatch({ type: ACTION_TYPES.SET_PROGRESS, payload: 45 });

      const response = await apiFetch(`${BACKEND_URL}/api/convert/html-to-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlWithStyles,
          filename,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
          }
        })
      });

      if (!response.ok) {
        throw new Error('PDF conversion failed on server');
      }

      const blob = await response.blob();
      dispatch({ type: ACTION_TYPES.SET_PROGRESS, payload: 90 });
      saveAs(blob, filename);

      dispatch({
        type: ACTION_TYPES.SET_RESULT,
        payload: {
          name: filename,
          blob,
          url: URL.createObjectURL(blob)
        }
      });
    } catch (err) {
      console.warn('Backend PDF export error, triggering direct print fallback:', err);
      directPrint();
    } finally {
      dispatch({ type: ACTION_TYPES.SET_PROCESSING, payload: false });
      dispatch({ type: ACTION_TYPES.SET_PROGRESS, payload: 100 });
    }
  }, [state.data, state.theme, directPrint, dispatch]);

  const exportDocx = useCallback(async () => {
    try {
      dispatch({ type: ACTION_TYPES.SET_PROCESSING, payload: true });
      const options = {
        themeColor: state.theme.themeColor,
        themeFont: state.theme.themeFont,
        sectionOrder: state.theme.sectionOrder,
        sectionTitles: state.data.sectionTitles
      };
      await exportResumeToDocx(state.data, options);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'Failed to generate Word DOCX: ' + err.message });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_PROCESSING, payload: false });
    }
  }, [state.data, state.theme, dispatch]);

  const exportJson = useCallback(() => {
    try {
      const exportPayload = {
        version: '2.0',
        generator: 'DocScalar CV Studio',
        timestamp: new Date().toISOString(),
        data: state.data,
        theme: state.theme,
        ui: {
          screen: state.ui.screen,
          wizardStep: state.ui.wizardStep,
          activeSection: state.ui.activeSection
        }
      };
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = `${(state.data.name || 'Resume').replace(/\s+/g, '_')}_Backup.json`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Export JSON failed:', err);
    }
  }, [state.data, state.theme, state.ui]);

  const importJson = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed) {
        importData(parsed);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Invalid JSON file' };
  }, [importData]);

  const contextValue = {
    // State slices
    state,
    data: state.data,
    theme: state.theme,
    ui: state.ui,
    runtime: state.runtime,
    previewHtml,
    atsHealth,
    
    // History
    canUndo,
    canRedo,
    undo,
    redo,
    dispatch,

    // Action Dispatchers
    setField,
    setExpField,
    addExp,
    removeExp,
    addExpHighlight,
    setExpHighlight,
    removeExpHighlight,
    setEduField,
    addEdu,
    removeEdu,
    addSkill,
    removeSkill,
    setSkills,
    setProjField,
    addProj,
    removeProj,
    addCert,
    removeCert,
    setRefField,
    addRef,
    removeRef,
    addCustomSection,
    updateCustomSectionTitle,
    updateCustomSectionItem,
    removeCustomSection,
    setSectionTitle,
    setSectionOrder,
    moveSection,
    setThemeColor,
    setThemeFont,
    setThemeLayout,
    setPageMargin,
    setLineSpacing,
    setActiveTemplate,
    setScreen,
    setWizardStep,
    setActiveSection,
    setDirectEdit,
    setModalState,
    setTemplateFilter,
    setZoomMode,
    applyInlineEdit,
    autoSanitize,
    autoTuneFit,
    resetDraft,
    importData,

    // Document Exports
    exportPdf,
    exportDocx,
    exportJson,
    importJson,
    directPrint
  };

  return (
    <ResumeContext.Provider value={contextValue}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumeContext() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResumeContext must be used within a ResumeProvider');
  }
  return context;
}

export function useResume() {
  return useResumeContext();
}

export default ResumeContext;
