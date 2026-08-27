import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { getFormFields, fillFormFields, compileFormWithNewFields, exportFormToCsv, exportFormToJson } from '../../engines/pdf/pdfForms';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  FileSpreadsheet,
  Code,
  Upload,
  Download,
  Check,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const CREATOR_TOOLS = [
  { id: 'text', label: 'Text Field', icon: 'text_fields', desc: 'Single-line or multi-line text input' },
  { id: 'checkbox', label: 'Checkbox', icon: 'check_box', desc: 'Toggle boolean checkbox box' },
  { id: 'select', label: 'Dropdown', icon: 'arrow_drop_down_circle', desc: 'Select option dropdown list' },
  { id: 'radio', label: 'Radio Group', icon: 'radio_button_checked', desc: 'Mutual exclusion radio option' }
];

export default function PdfForms() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);

  // Forms state
  const [formFields, setFormFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Mode: 'fill' vs 'create'
  const [activeMode, setActiveMode] = useState('fill');
  const [creatorTool, setCreatorTool] = useState('text');
  const [createdFields, setCreatedFields] = useState([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [flattenFields, setFlattenFields] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');

  // Drag-and-draw states for placing custom fields
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  // Canvas Viewport State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  const snapValue = (val) => {
    if (!snapToGrid) return val;
    return Math.round(val / 0.025) * 0.025; // 2.5% grid
  };

  const updateFieldProperty = (id, prop, val) => {
    setCreatedFields(prev => prev.map(f => (f.id === id ? { ...f, [prop]: val } : f)));
  };

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('pdf-forms');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'form.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.activeMode) setActiveMode(draft.activeMode);
          if (draft.creatorTool) setCreatorTool(draft.creatorTool);
          if (draft.createdFields) setCreatedFields(draft.createdFields);
          if (draft.fieldValues) setFieldValues(draft.fieldValues);
          if (draft.snapToGrid !== undefined) setSnapToGrid(draft.snapToGrid);
          if (draft.flattenFields !== undefined) setFlattenFields(draft.flattenFields);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('PDF forms draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('pdf-forms', {
        files,
        activeMode,
        creatorTool,
        createdFields,
        fieldValues,
        snapToGrid,
        flattenFields,
        outputFileName
      });
    }
  }, [files, activeMode, creatorTool, createdFields, fieldValues, snapToGrid, flattenFields, outputFileName]);

  // 3. Scan PDF for form fields and load document pages
  useEffect(() => {
    if (files.length === 0) {
      setFormFields([]);
      setFieldValues({});
      setCreatedFields([]);
      setScanMessage('');
      setPdfDocument(null);
      setTotalPages(0);
      setCurrentPage(1);
      setActiveMode('fill');
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const scanFormAndLoadPdf = async () => {
      setScanning(true);
      setCanvasLoading(true);
      setScanMessage('Scanning document structure and AcroForm fields...');
      setError(null);

      try {
        const file = files[activeFileIndex] || files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);

        // Extract fields via PDF-lib
        const fields = await getFormFields(file);
        if (isCancelled) return;
        setFormFields(fields);

        // Initialize state values map if empty
        setFieldValues(prev => {
          const initialVals = { ...prev };
          fields.forEach(f => {
            if (initialVals[f.name] === undefined) {
              initialVals[f.name] = f.value;
            }
          });
          return initialVals;
        });

        if (fields.length === 0) {
          setScanMessage('No existing interactive fields detected. Switch to "Place New Fields" to add fields.');
          if (createdFields.length === 0) {
            setActiveMode('create');
          }
        } else {
          setScanMessage(`Scan complete: Found ${fields.length} interactive fields.`);
          setActiveMode('fill');
        }

        if (!outputFileName) {
          const base = file.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_filled.pdf`);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to process PDF form. Make sure the document is not password locked or corrupted.');
        }
      } finally {
        if (!isCancelled) {
          setScanning(false);
          setCanvasLoading(false);
        }
      }
    };

    scanFormAndLoadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, activeFileIndex]);

  // 4. Render Active PDF Page to Live Viewport Canvas
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Error rendering form PDF page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, zoomScale]);

  const handleValueChange = (name, val) => {
    setFieldValues(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleStartDrag = (e) => {
    if (activeMode !== 'create') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const snapX = snapValue(x);
    const snapY = snapValue(y);
    setDragStart({ xPercent: snapX, yPercent: snapY });
    setDragCurrent({ xPercent: snapX, yPercent: snapY });
  };

  const handleDrag = (e) => {
    if (activeMode !== 'create' || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDragCurrent({ xPercent: snapValue(x), yPercent: snapValue(y) });
  };

  const handleStopDrag = () => {
    if (activeMode !== 'create' || !dragStart || !dragCurrent) return;

    const start = dragStart;
    const end = dragCurrent;
    setDragStart(null);
    setDragCurrent(null);

    const dx = Math.abs(start.xPercent - end.xPercent);
    const dy = Math.abs(start.yPercent - end.yPercent);

    if (dx > 0.015 && dy > 0.015) {
      const generatedName = `${creatorTool}_${createdFields.length + 1}`;
      const isRadio = creatorTool === 'radio';
      let options = creatorTool === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : null;
      let radioValue = isRadio ? `Option_${createdFields.length + 1}` : '';

      const newField = {
        id: Math.random().toString(36).substr(2, 6),
        name: generatedName,
        type: creatorTool,
        options,
        value: radioValue,
        pageIndex: currentPage - 1,
        rect: {
          startXPercent: Math.min(start.xPercent, end.xPercent),
          startYPercent: Math.min(start.yPercent, end.yPercent),
          endXPercent: Math.max(start.xPercent, end.xPercent),
          endYPercent: Math.max(start.yPercent, end.yPercent)
        },
        backgroundColor: '#ffffff',
        borderColor: '#2563eb',
        borderWidth: 1
      };

      setCreatedFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setFieldValues(prev => ({
        ...prev,
        [generatedName]: prev[generatedName] !== undefined ? prev[generatedName] : (creatorTool === 'checkbox' ? false : '')
      }));
    }
  };

  const deleteCreatedField = (id, name) => {
    setCreatedFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    setFieldValues(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleFill = async () => {
    if (!files.length) return;
    if (formFields.length === 0 && createdFields.length === 0) {
      setError('No fields are available to fill or compile.');
      return;
    }

    setProcessing(true);
    setProgress(15);
    setError(null);
    setResult(null);

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_filled.pdf`;

    try {
      setProgress(40);
      let outputBlob;
      if (createdFields.length > 0) {
        outputBlob = await compileFormWithNewFields(file, createdFields, fieldValues, (p) => setProgress(p), flattenFields);
      } else {
        outputBlob = await fillFormFields(file, fieldValues, (p) => setProgress(p), flattenFields);
      }

      setProgress(85);
      const totalFieldsCount = formFields.length + createdFields.length;

      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        pageCount: totalPages,
        fieldCount: totalFieldsCount,
        flattened: flattenFields
      });

      await saveFile(finalName, outputBlob.size, 'application/pdf', 'PDF Forms', outputBlob);
      await clearStudioDraft('pdf-forms');
      setProgress(100);
    } catch (err) {
      console.error('PDF form compilation error:', err);
      setError(err.message || 'Failed to fill and compile PDF form.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('pdf-forms');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setFormFields([]);
    setFieldValues({});
    setCreatedFields([]);
    setSelectedFieldId(null);
    setScanMessage('');
    setActiveMode('fill');
    setCreatorTool('text');
    setFlattenFields(false);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  const handleExportCsv = () => {
    const allFields = [...formFields, ...createdFields];
    if (!allFields.length) return;
    const csv = exportFormToCsv(allFields, fieldValues);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${(files[activeFileIndex]?.name || 'form').replace(/\.[^.]+$/, '')}_data.csv`);
  };

  const handleExportJson = () => {
    const allFields = [...formFields, ...createdFields];
    if (!allFields.length) return;
    const json = exportFormToJson(allFields, fieldValues);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `${(files[activeFileIndex]?.name || 'form').replace(/\.[^.]+$/, '')}_data.json`);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const data = parsed.fields || parsed;
        setFieldValues(prev => ({ ...prev, ...data }));
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activePageIndex = currentPage - 1;
  const pageCreatedFields = createdFields.filter(f => f.pageIndex === activePageIndex);
  const selectedField = createdFields.find(f => f.id === selectedFieldId);

  return (
    <ToolPageLayout
      toolId="pdf-forms"
      title="PDF Forms Studio"
      description="Fill interactive forms, place new fillable fields visually, or flatten PDF forms into static documents."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF Form Creator & Filler Online Free — Edit Fillable PDFs | DocForge"
        description="Place fillable fields visually or fill and save interactive PDF form fields instantly in your browser. 100% private Client Side processing."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Canvas Viewport                                */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[180px]">{files[0]?.name}</span>
                      </div>
                    )}

                    {/* Page Navigation Capsule */}
                    {totalPages > 0 && (
                      <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-2 text-[var(--text-primary)] select-none">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {/* Mode Switcher Buttons */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setActiveMode('fill')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
                          activeMode === 'fill'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        <span>Fill Fields</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode('create')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
                          activeMode === 'create'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">add_box</span>
                        <span>Place New Fields</span>
                      </button>
                    </div>

                    {/* Creator Tool Quick Strip (Visible in create mode) */}
                    {activeMode === 'create' && (
                      <div className="hidden lg:flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                        {CREATOR_TOOLS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setCreatorTool(t.id)}
                            className={`p-1.5 rounded-md cursor-pointer transition-all ${
                              creatorTool === t.id
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            title={`${t.label}: ${t.desc}`}
                          >
                            <span className="material-symbols-outlined text-[16px] block">{t.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Zoom, Grid & Reset */}
                  <div className="flex items-center gap-2">
                    {activeMode === 'create' && (
                      <button
                        type="button"
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          snapToGrid
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        }`}
                        title="Snap to 2.5% Grid"
                      >
                        <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
                        <span className="hidden sm:inline">Grid Snap</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Frame with Live Forms Layer */}
              <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none"
              >
                <div
                  className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  {/* Rendered PDF Page Base Canvas */}
                  <canvas
                    ref={pdfCanvasRef}
                    className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none block"
                  />

                  {/* Loading Spinner Overlay */}
                  {(canvasLoading || scanning) && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{scanMessage || 'Loading form document...'}</span>
                    </div>
                  )}

                  {/* Drag-to-Place Drawing Overlay Layer (In create mode) */}
                  {activeMode === 'create' && (
                    <div
                      onPointerDown={handleStartDrag}
                      onPointerMove={handleDrag}
                      onPointerUp={handleStopDrag}
                      className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20 touch-none"
                    >
                        {/* Drag preview box */}
                        {dragStart && dragCurrent && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${Math.min(dragStart.xPercent, dragCurrent.xPercent) * 100}%`,
                              top: `${Math.min(dragStart.yPercent, dragCurrent.yPercent) * 100}%`,
                              width: `${Math.abs(dragStart.xPercent - dragCurrent.xPercent) * 100}%`,
                              height: `${Math.abs(dragStart.yPercent - dragCurrent.yPercent) * 100}%`
                            }}
                            className="border-2 border-dashed border-blue-500 bg-blue-500/20 rounded pointer-events-none flex items-center justify-center text-[10px] font-bold text-blue-700"
                          >
                            New {creatorTool}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Widgets & Created Fields Overlays */}
                    {pageCreatedFields.map((field) => {
                      const isSelected = selectedFieldId === field.id;
                      const left = `${field.rect.startXPercent * 100}%`;
                      const top = `${field.rect.startYPercent * 100}%`;
                      const width = `${(field.rect.endXPercent - field.rect.startXPercent) * 100}%`;
                      const height = `${(field.rect.endYPercent - field.rect.startYPercent) * 100}%`;

                      return (
                        <div
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          style={{
                            position: 'absolute',
                            left,
                            top,
                            width,
                            height,
                            zIndex: 25
                          }}
                          className={`group transition-all ${
                            isSelected
                              ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 z-30'
                              : 'hover:ring-1 hover:ring-blue-400'
                          }`}
                        >
                          {field.type === 'checkbox' ? (
                            <div className="w-full h-full flex items-center justify-center bg-white/90 border border-blue-500 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(fieldValues[field.name])}
                                onChange={(e) => handleValueChange(field.name, e.target.checked)}
                                className="w-full h-full accent-[var(--color-primary)] cursor-pointer"
                              />
                            </div>
                          ) : field.type === 'select' ? (
                            <select
                              value={fieldValues[field.name] || ''}
                              onChange={(e) => handleValueChange(field.name, e.target.value)}
                              className="w-full h-full bg-white/90 text-slate-800 text-[11px] font-medium border border-blue-500 rounded px-1 outline-none cursor-pointer"
                            >
                              <option value="">Select an option</option>
                              {field.options?.map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-white/90 border border-blue-500 rounded-full cursor-pointer">
                              <input
                                type="radio"
                                name={field.name}
                                checked={fieldValues[field.name] === field.value}
                                onChange={() => handleValueChange(field.name, field.value)}
                                className="w-3/4 h-3/4 accent-[var(--color-primary)] cursor-pointer"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={fieldValues[field.name] || ''}
                              onChange={(e) => handleValueChange(field.name, e.target.value)}
                              placeholder={field.name}
                              className="w-full h-full bg-blue-50/90 text-slate-800 text-[11px] font-medium border border-dashed border-blue-500 rounded px-1.5 outline-none focus:bg-white focus:border-solid focus:border-[var(--color-primary)]"
                            />
                          )}

                          {activeMode === 'create' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCreatedField(field.id, field.name);
                              }}
                              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Field"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">dynamic_form</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Forms Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {formFields.length + createdFields.length} Fields
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Quick Data Exchange Actions */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Form Data Exchange
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Export Form Data to CSV spreadsheet"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold">CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer"
                      title="Export Form Data to JSON structure"
                    >
                      <Code className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-bold">JSON</span>
                    </button>

                    <label className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1 text-[var(--text-primary)] transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold">Import</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Inspector / Field Configuration */}
                {activeMode === 'create' && selectedField ? (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Field Inspector
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteCreatedField(selectedField.id, selectedField.name)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-tertiary)]">Field Name</span>
                      <input
                        type="text"
                        value={selectedField.name}
                        onChange={(e) => updateFieldProperty(selectedField.id, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono font-bold focus:border-[var(--color-primary)] outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-tertiary)]">Field Type</span>
                      <select
                        value={selectedField.type}
                        onChange={(e) => updateFieldProperty(selectedField.id, 'type', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-semibold outline-none cursor-pointer"
                      >
                        <option value="text">Text Input</option>
                        <option value="checkbox">Checkbox Box</option>
                        <option value="select">Dropdown Select</option>
                        <option value="radio">Radio Group Option</option>
                      </select>
                    </div>

                    {selectedField.type === 'select' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-tertiary)]">Dropdown Options (Comma separated)</span>
                        <input
                          type="text"
                          value={selectedField.options?.join(', ') || ''}
                          onChange={(e) => updateFieldProperty(selectedField.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Document Fields List
                      </label>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {formFields.length + createdFields.length} total
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                      {[...formFields, ...createdFields].map((f, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[var(--text-primary)] truncate max-w-[140px]">{f.name}</span>
                            <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {f.type}
                            </span>
                          </div>
                          {f.type === 'checkbox' ? (
                            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(fieldValues[f.name])}
                                onChange={(e) => handleValueChange(f.name, e.target.checked)}
                                className="w-3.5 h-3.5 accent-[var(--color-primary)] cursor-pointer"
                              />
                              <span>Checked</span>
                            </label>
                          ) : (
                            <input
                              type="text"
                              value={fieldValues[f.name] || ''}
                              onChange={(e) => handleValueChange(f.name, e.target.value)}
                              placeholder={`Enter ${f.name}...`}
                              className="w-full px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Flatten Form Option */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Flatten Form Fields</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Bake into static permanent text</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={flattenFields}
                      onChange={(e) => setFlattenFields(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* 4. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_filled.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Compiling form document...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleFill}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Compiling ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Save & Compile PDF Form</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Form Saved!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.flattened
                  ? 'All form fields have been baked and flattened into permanent PDF content.'
                  : 'Interactive AcroForm values and widgets have been embedded.'}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Fields</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.fieldCount || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Mode</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {result.flattened ? 'Flattened' : 'Interactive'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Form PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Fill Another Form</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Digital signature</p>
                  </div>
                </Link>

                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
