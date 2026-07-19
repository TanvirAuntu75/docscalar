import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { getFormFields, fillFormFields, compileFormWithNewFields } from '../../engines/pdf/pdfForms';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfForms() {
  const {
    files,
    setFiles,
    processing,
    setProcessing,
    progress,
    setProgress,
    result,
    setResult,
    error,
    setError,
    reset
  } = useFileProcessor();

  const [formFields, setFormFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Mode: 'fill' (filling existing fields) vs 'create' (placing new fields)
  const [activeMode, setActiveMode] = useState('fill');
  const [creatorTool, setCreatorTool] = useState('text'); // 'text', 'checkbox', 'select', 'radio'
  const [createdFields, setCreatedFields] = useState([]); // List of { id, name, type, options, value, pageIndex, rect: { startXPercent, startYPercent, endXPercent, endYPercent } }
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [flattenFields, setFlattenFields] = useState(false);

  const updateFieldProperty = (id, prop, val) => {
    setCreatedFields(prev => prev.map(f => f.id === id ? { ...f, [prop]: val } : f));
  };

  const snapValue = (val) => {
    if (!snapToGrid) return val;
    // Snap to nearest 2.5% step
    return Math.round(val / 0.025) * 0.025;
  };

  // Drag-and-draw states for placing custom fields
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  // Canvas rendering state
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Scan PDF for form fields when file loaded
  useEffect(() => {
    if (files.length === 0) {
      setFormFields([]);
      setFieldValues({});
      setCreatedFields([]);
      setScanMessage('');
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setActiveMode('fill');
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const scanFormAndLoadPdf = async () => {
      setScanning(true);
      setScanMessage('Scanning document structure and rendering pages...');
      setError(null);

      try {
        // 1. Load document via PDF.js for rendering
        const arrayBuffer = await files[0].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);

        // 2. Extract fields via PDF-lib
        const fields = await getFormFields(files[0]);
        if (isCancelled) return;
        setFormFields(fields);
        
        // Initialize state values map
        const initialVals = {};
        fields.forEach(f => {
          initialVals[f.name] = f.value;
        });
        setFieldValues(initialVals);
        
        if (fields.length === 0) {
          setScanMessage('No interactive fields detected. Toggle to "Create Fields" mode to place new ones.');
          setActiveMode('create'); // Auto-switch to helper mode if none found
        } else {
          setScanMessage(`Scan complete: Found ${fields.length} interactive fields.`);
          setActiveMode('fill');
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to process PDF form. Make sure the document is not corrupted.');
        }
      } finally {
        if (!isCancelled) setScanning(false);
      }
    };

    scanFormAndLoadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, setError]);

  // Render active page
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        // Use a scale that provides good resolution
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        // Size both canvases identically
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex]);

  const handleValueChange = (name, val) => {
    setFieldValues(prev => ({
      ...prev,
      [name]: val
    }));
  };

  // Creator drag and draw interactions
  const handleStartDrag = (e) => {
    if (activeMode !== 'create') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const snapX = snapValue(x / rect.width);
    const snapY = snapValue(y / rect.height);

    setDragStart({ xPercent: snapX, yPercent: snapY });
    setDragCurrent({ xPercent: snapX, yPercent: snapY });
  };

  const handleDrag = (e) => {
    if (activeMode !== 'create' || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const snapX = snapValue(x / rect.width);
    const snapY = snapValue(y / rect.height);

    setDragCurrent({ xPercent: snapX, yPercent: snapY });
  };

  const handleStopDrag = () => {
    if (activeMode !== 'create' || !dragStart || !dragCurrent) return;

    const start = dragStart;
    const end = dragCurrent;
    setDragStart(null);
    setDragCurrent(null);

    const dx = Math.abs(start.xPercent - end.xPercent);
    const dy = Math.abs(start.yPercent - end.yPercent);

    // Enforce minimum box size before popping the prompt
    if (dx > 0.015 && dy > 0.015) {
      let name = window.prompt('Enter a unique name for this form field (letters, numbers, and underscores only):');
      if (name) {
        name = name.trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (!name) {
          alert('Field name must contain alphanumeric characters.');
          return;
        }

        const isRadio = creatorTool === 'radio';
        // Radio button fields with the same name can exist as options of the same radio group
        const nameExists = formFields.some(f => f.name.toLowerCase() === name.toLowerCase()) ||
                           createdFields.some(f => f.name.toLowerCase() === name.toLowerCase() && f.type !== 'radio');

        if (nameExists) {
          alert('A field with this name already exists. Please choose a unique name.');
          return;
        }

        let options = null;
        let radioValue = '';

        if (creatorTool === 'select') {
          const optionsInput = window.prompt('Enter list dropdown options, separated by commas (e.g. Option A, Option B):');
          if (!optionsInput) return;
          options = optionsInput.split(',').map(o => o.trim()).filter(Boolean);
          if (options.length === 0) {
            alert('Dropdown must have at least one option.');
            return;
          }
        } else if (creatorTool === 'radio') {
          const valInput = window.prompt('Enter the value for this radio option (e.g. Yes):');
          if (!valInput) return;
          radioValue = valInput.trim();
        }

        const newField = {
          id: Math.random().toString(36).substr(2, 5),
          name,
          type: creatorTool,
          options,
          value: radioValue,
          pageIndex: activePageIndex,
          rect: {
            startXPercent: start.xPercent,
            startYPercent: start.yPercent,
            endXPercent: end.xPercent,
            endYPercent: end.yPercent
          },
          backgroundColor: '#ffffff',
          borderColor: '#2563eb',
          borderWidth: 1
        };

        setCreatedFields(prev => [...prev, newField]);
        setSelectedFieldId(newField.id);
        setFieldValues(prev => ({
          ...prev,
          [name]: prev[name] !== undefined ? prev[name] : (creatorTool === 'checkbox' ? false : '')
        }));
      }
    }
  };

  const deleteCreatedField = (id, name) => {
    setCreatedFields(prev => prev.filter(f => f.id !== id));
    setFieldValues(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Compile filled or created PDF form
  const handleFill = async () => {
    if (!files.length) return;
    if (formFields.length === 0 && createdFields.length === 0) {
      setError('No fields are available to fill or compile.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      let outputBlob;
      if (createdFields.length > 0) {
        outputBlob = await compileFormWithNewFields(files[0], createdFields, fieldValues, setProgress, flattenFields);
      } else {
        outputBlob = await fillFormFields(files[0], fieldValues, setProgress, flattenFields);
      }

      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_filled.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'PDF Forms', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save compiled PDF locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Failed to fill/compile PDF forms.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const handleReset = () => {
    reset();
    setFormFields([]);
    setFieldValues({});
    setCreatedFields([]);
    setScanMessage('');
    setActiveMode('fill');
  };

  // Combine native formFields and custom createdFields for overlay inputs in Fill mode
  const allInteractiveFields = [
    ...formFields,
    ...createdFields.map(f => {
      const minX = Math.min(f.rect.startXPercent, f.rect.endXPercent);
      const maxX = Math.max(f.rect.startXPercent, f.rect.endXPercent);
      const minY = Math.min(f.rect.startYPercent, f.rect.endYPercent);
      const maxY = Math.max(f.rect.startYPercent, f.rect.endYPercent);

      return {
        name: f.name,
        type: f.type,
        options: f.options,
        widgets: [{
          pageIndex: f.pageIndex,
          value: f.value,
          rect: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          },
          isCustom: true
        }]
      };
    })
  ];

  const selectedField = createdFields.find(f => f.id === selectedFieldId);

  return (
    <ToolPageLayout
      toolId="pdf-forms"
      title="PDF Form Creator & Filler"
      description="Fill out interactive forms or place new text fields and checkboxes onto PDF pages visually"
      files={files}
      onFileSwitch={(idx) => {
        setFiles(prev => {
          if (idx < 0 || idx >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return next;
        });
      }}>
      <SEOHead 
        title="PDF Form Creator & Filler Online Free — Edit Fillable PDFs | DocForge" 
        description="Place fillable fields visually or fill and save interactive PDF form fields instantly in your browser. 100% private Client Side processing."
      />

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {scanning && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
              <span style={{ fontSize: '0.85rem' }}>{scanMessage}</span>
            </div>
          )}

          {!scanning && scanMessage && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
              💡 {scanMessage}
            </div>
          )}

          {files.length > 0 && !scanning && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>

              {/* Layout Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.2fr',
                gap: '2rem'
              }} className="lg:grid-cols-2">

                {/* Column 1: Controls & Sidebar listing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Workspace Actions</div>

                  {/* Mode Selectors */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setActiveMode('fill')}
                      className={`btn ${activeMode === 'fill' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                    >
                      📝 Fill Fields
                    </button>
                    <button
                      onClick={() => setActiveMode('create')}
                      className={`btn ${activeMode === 'create' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                    >
                      🛠️ Create Fields
                    </button>
                  </div>

                  {activeMode === 'create' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-[fadeIn_0.15s]">
                        {/* Creator Tool Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Field Widget Type</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                            <button
                              onClick={() => setCreatorTool('text')}
                              className={`btn ${creatorTool === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                            >
                              🔤 Text Input
                            </button>
                            <button
                              onClick={() => setCreatorTool('checkbox')}
                              className={`btn ${creatorTool === 'checkbox' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                            >
                              ☑️ Checkbox
                            </button>
                            <button
                              onClick={() => setCreatorTool('select')}
                              className={`btn ${creatorTool === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                            >
                              List Dropdown
                            </button>
                            <button
                              onClick={() => setCreatorTool('radio')}
                              className={`btn ${creatorTool === 'radio' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                            >
                              🔘 Radio Group
                            </button>
                          </div>
                        </div>

                        {/* Grid Snapping Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginTop: '0.2rem' }}>
                          <input
                            type="checkbox"
                            checked={snapToGrid}
                            onChange={(e) => setSnapToGrid(e.target.checked)}
                            style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            id="grid-snap-toggle"
                          />
                          <label htmlFor="grid-snap-toggle" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            🧲 Snap-to-Grid Alignment
                          </label>
                        </div>
                      
                      {/* Custom Placed Fields List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                          Created Fields ({createdFields.length})
                        </label>
                        {createdFields.length === 0 ? (
                          <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
                            Drag-and-draw on the canvas page grid to place new fields.
                          </div>
                        ) : (
                          <div style={{
                            maxHeight: '180px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            paddingRight: '0.25rem'
                          }} className="scrollbar-none">
                            {createdFields.map(f => (
                              <div
                                key={f.id}
                                onClick={() => setSelectedFieldId(f.id)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.4rem 0.6rem',
                                  background: selectedFieldId === f.id ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                  borderRadius: '6px',
                                  border: selectedFieldId === f.id ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: '500' }}>
                                  {f.type === 'text' ? '🔤' : f.type === 'checkbox' ? '☑️' : f.type === 'select' ? 'List' : '🔘'} {f.name} {f.type === 'radio' && `(${f.value})`}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>p.{f.pageIndex + 1}</span>
                                  <button
                                    onClick={() => deleteCreatedField(f.id, f.name)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0 }}
                                    title="Delete field"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Field Styling Config */}
                      {selectedField && (
                        <div style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          marginTop: '0.4rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>🛠️ Field Styling: {selectedField.name}</span>
                            <button onClick={() => setSelectedFieldId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>Background Color</label>
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <input
                                  type="color"
                                  value={selectedField.backgroundColor || '#ffffff'}
                                  onChange={(e) => updateFieldProperty(selectedField.id, 'backgroundColor', e.target.value)}
                                  style={{ width: '24px', height: '24px', padding: 0, border: '1px solid var(--border-subtle)', cursor: 'pointer', backgroundColor: 'transparent' }}
                                />
                                <span style={{ fontSize: '0.65rem' }}>{selectedField.backgroundColor || '#ffffff'}</span>
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>Border Color</label>
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <input
                                  type="color"
                                  value={selectedField.borderColor || '#2563eb'}
                                  onChange={(e) => updateFieldProperty(selectedField.id, 'borderColor', e.target.value)}
                                  style={{ width: '24px', height: '24px', padding: 0, border: '1px solid var(--border-subtle)', cursor: 'pointer', backgroundColor: 'transparent' }}
                                />
                                <span style={{ fontSize: '0.65rem' }}>{selectedField.borderColor || '#2563eb'}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.15rem' }}>Border Width: {selectedField.borderWidth || 1}px</label>
                            <input
                              type="range"
                              min="0"
                              max="4"
                              value={selectedField.borderWidth || 1}
                              onChange={(e) => updateFieldProperty(selectedField.id, 'borderWidth', parseInt(e.target.value))}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="animate-[fadeIn_0.15s_ease-out]">
                      {/* Sidebar quick field inputs */}
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Fillable Form Inputs ({allInteractiveFields.length})
                      </label>
                      {allInteractiveFields.length === 0 ? (
                        <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
                          No fillable fields detected. Try switching to "Create Fields" mode.
                        </div>
                      ) : (
                        <div style={{
                          maxHeight: '260px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          paddingRight: '0.25rem'
                        }} className="scrollbar-none">
                          {allInteractiveFields.map((field) => (
                            <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                {field.name} {field.widgets[0]?.isCustom && <span style={{ color: 'var(--color-primary)', fontSize: '0.6rem' }}>(Created)</span>}
                              </label>
                              {field.type === 'checkbox' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!(fieldValues[field.name] ?? false)}
                                    onChange={(e) => handleValueChange(field.name, e.target.checked)}
                                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                    id={`side-${field.name}`}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Checked / Active</span>
                                </div>
                              ) : field.type === 'select' ? (
                                <select
                                  value={fieldValues[field.name] ?? ''}
                                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                                  className="btn btn-secondary"
                                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', textAlign: 'left' }}
                                >
                                  <option value="">- Select -</option>
                                  {field.options && field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={fieldValues[field.name] ?? ''}
                                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.6rem',
                                    fontSize: '0.75rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                  }}
                                  placeholder={`Fill ${field.name}...`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', lineHeight: '1.4', marginTop: '0.5rem' }}>
                    💡 <strong>Quick Instructions:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: '0', listStyleType: 'disc' }}>
                      <li>Use <strong>Fill Fields</strong> mode to type text or check boxes overlaying document pages.</li>
                      <li>Use <strong>Create Fields</strong> mode to draw and stamp custom fillable widgets onto the PDF.</li>
                      <li>All input variables remain Client Side in browser cache.</li>
                    </ul>
                  </div>
                </div>

                {/* Column 2: Document Workspace Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Interactive Workspace</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Page {activePageIndex + 1} / {totalPages}
                    </span>
                  </div>

                  {/* Pagination list */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.35rem',
                      overflowX: 'auto',
                      paddingBottom: '0.5rem',
                      whiteSpace: 'nowrap'
                    }} className="no-scrollbar">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePageIndex(idx)}
                          className={`btn ${activePageIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            minWidth: '40px',
                            border: activePageIndex === idx ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)'
                          }}
                        >
                          Page {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive document canvas wrapper */}
                  <div
                    ref={containerRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '1.5rem',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>

                      {/* PDF render layer */}
                      <canvas
                        ref={pdfCanvasRef}
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: '480px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                          borderRadius: '4px',
                          pointerEvents: 'none'
                        }}
                      />

                      {/* Absolute Interactive Overlay (Division) */}
                      <div
                        ref={overlayCanvasRef}
                        onMouseDown={handleStartDrag}
                        onMouseMove={handleDrag}
                        onMouseUp={handleStopDrag}
                        onMouseLeave={handleStopDrag}
                        onTouchStart={handleStartDrag}
                        onTouchMove={handleDrag}
                        onTouchEnd={handleStopDrag}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: 15,
                          cursor: activeMode === 'create' ? 'crosshair' : 'default',
                          pointerEvents: activeMode === 'create' ? 'auto' : 'none',
                          backgroundImage: snapToGrid && activeMode === 'create'
                             ? 'radial-gradient(var(--border-subtle) 1px, transparent 1px)'
                             : 'none',
                           backgroundSize: '2.5% 2.5%'
                        }}
                      >
                        {/* Drag boundary outline visual overlay in creator mode */}
                        {activeMode === 'create' && dragStart && dragCurrent && (
                          <div style={{
                            position: 'absolute',
                            left: `${Math.min(dragStart.xPercent, dragCurrent.xPercent) * 100}%`,
                            top: `${Math.min(dragStart.yPercent, dragCurrent.yPercent) * 100}%`,
                            width: `${Math.abs(dragStart.xPercent - dragCurrent.xPercent) * 100}%`,
                            height: `${Math.abs(dragStart.yPercent - dragCurrent.yPercent) * 100}%`,
                            border: '1.5px dashed var(--color-primary)',
                            background: 'rgba(59, 130, 246, 0.12)',
                            pointerEvents: 'none'
                          }} />
                        )}

                        {/* Dashed boxes for createdFields when in creator mode */}
                        {activeMode === 'create' && createdFields
                          .filter(f => f.pageIndex === activePageIndex)
                          .map(f => {
                            const minX = Math.min(f.rect.startXPercent, f.rect.endXPercent);
                            const maxX = Math.max(f.rect.startXPercent, f.rect.endXPercent);
                            const minY = Math.min(f.rect.startYPercent, f.rect.endYPercent);
                            const maxY = Math.max(f.rect.startYPercent, f.rect.endYPercent);
                            const isSelected = selectedFieldId === f.id;

                            return (
                              <div
                                key={f.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFieldId(f.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  left: `${minX * 100}%`,
                                  top: `${minY * 100}%`,
                                  width: `${(maxX - minX) * 100}%`,
                                  height: `${(maxY - minY) * 100}%`,
                                  border: `${f.borderWidth ?? 1}px dashed ${f.borderColor ?? '#2563eb'}`,
                                  background: f.backgroundColor ?? 'rgba(59, 130, 246, 0.05)',
                                  boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  pointerEvents: 'auto',
                                  cursor: 'pointer',
                                  fontSize: '0.65rem',
                                  color: f.borderColor ?? 'var(--color-primary)',
                                  fontWeight: '600',
                                  boxSizing: 'border-box'
                                }}
                                title={f.name}
                              >
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px' }}>
                                  {f.name}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteCreatedField(f.id, f.name); }}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: 'var(--color-danger)',
                                    color: '#FFF',
                                    border: 'none',
                                    fontSize: '9px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                  }}
                                  title="Remove field"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      {/* Fill Mode active inputs overlays */}
                      {activeMode === 'fill' && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: 16,
                          pointerEvents: 'none'
                        }}>
                          {allInteractiveFields.map((field) => {
                            if (!field.widgets || field.widgets.length === 0) return null;

                            return field.widgets.map((widget, wIdx) => {
                              if (widget.pageIndex !== activePageIndex) return null;

                              let xPercent, yPercent, wPercent, hPercent;

                              if (widget.isCustom) {
                                // Already in percentages
                                xPercent = widget.rect.x;
                                yPercent = widget.rect.y;
                                wPercent = widget.rect.width;
                                hPercent = widget.rect.height;
                              } else {
                                // Native PDF-lib widget bounds (needs division)
                                const pdfRect = widget.rect;
                                const pageSize = widget.pageSize;

                                xPercent = pdfRect.x / pageSize.width;
                                yPercent = (pageSize.height - pdfRect.y - pdfRect.height) / pageSize.height;
                                wPercent = pdfRect.width / pageSize.width;
                                hPercent = pdfRect.height / pageSize.height;
                              }

                              const currentValue = fieldValues[field.name] ?? '';

                              // Style parameters for inputs overlaying canvas
                              const inputStyle = {
                                position: 'absolute',
                                left: `${xPercent * 100}%`,
                                top: `${yPercent * 100}%`,
                                width: `${wPercent * 100}%`,
                                height: `${hPercent * 100}%`,
                                background: field.type === 'text' || field.type === 'select' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                color: '#000',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                fontFamily: 'sans-serif',
                                pointerEvents: 'auto',
                                outline: 'none',
                                padding: '0 4px',
                                margin: 0,
                                boxSizing: 'border-box'
                              };

                              if (field.type === 'checkbox') {
                                return (
                                  <input
                                    key={`${field.name}-${wIdx}`}
                                    type="checkbox"
                                    checked={!!currentValue}
                                    onChange={(e) => handleValueChange(field.name, e.target.checked)}
                                    style={{
                                      ...inputStyle,
                                      accentColor: 'var(--color-primary)',
                                      cursor: 'pointer'
                                    }}
                                    title={field.name}
                                  />
                                );
                              }

                              if (field.type === 'select') {
                                return (
                                  <select
                                    key={`${field.name}-${wIdx}`}
                                    value={currentValue}
                                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      cursor: 'pointer',
                                      opacity: 0.9,
                                      backgroundColor: '#FFF'
                                    }}
                                    title={field.name}
                                  >
                                    <option value="">- Select -</option>
                                    {field.options && field.options.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                );
                              }

                              if (field.type === 'radio') {
                                return (
                                  <input
                                    key={`${field.name}-${wIdx}`}
                                    type="radio"
                                    name={field.name}
                                    value={widget.value || ''}
                                    checked={currentValue === (widget.value || '')}
                                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      accentColor: 'var(--color-primary)',
                                      cursor: 'pointer',
                                      borderRadius: '50%'
                                    }}
                                    title={`${field.name} (${widget.value})`}
                                  />
                                );
                              }

                              return (
                                <input
                                  key={`${field.name}-${wIdx}`}
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                                  style={{
                                    ...inputStyle,
                                    backgroundColor: currentValue ? 'rgba(255,255,255,0.92)' : 'rgba(59, 130, 246, 0.15)'
                                  }}
                                  title={field.name}
                                  placeholder="Fill field..."
                                />
                                );
                            });
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status">Filling fields and saving PDF... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
            <input 
              type="checkbox"
              id="flatten-pdf-toggle"
              checked={flattenFields}
              onChange={(e) => setFlattenFields(e.target.checked)}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <label htmlFor="flatten-pdf-toggle" style={{ fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
              🔒 Flatten PDF Form fields (makes them permanent and non-editable)
            </label>
          </div>

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleFill} 
              disabled={!files.length || processing || (formFields.length === 0 && createdFields.length === 0)}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Compiling...' : 'Fill & Compile PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Interactive PDF Form Saved!</div>
          <div className="result-info">
            Your interactive PDF form has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Fill Another Form</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
