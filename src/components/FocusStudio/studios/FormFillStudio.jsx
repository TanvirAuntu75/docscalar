import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../../utils/pdfConfig';
import { getFormFields } from '../../../engines/pdf/pdfForms';
import { releaseCanvas, safeDestroyPdf, safeCancelRenderTask } from '../../../utils/canvasLifecycle';

export default function FormFillStudio({ file, params, onChange, nlpOp }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [formFields, setFormFields] = useState([]);
  const [fieldValues, setFieldValues] = useState(params.fieldValues || {});

  const pdfCanvasRef = useRef(null);

  // Teardown canvas memory on unmount
  useEffect(() => {
    return () => {
      releaseCanvas(pdfCanvasRef.current);
    };
  }, []);

  // Load PDF and extract form fields
  useEffect(() => {
    let active = true;
    let loadedPdf = null;

    const loadAndScan = async () => {
      try {
        setLoading(true);
        setPdfDocument(null);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
        if (!active) {
          safeDestroyPdf(pdf);
          return;
        }
        loadedPdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);

        const extractedFields = await getFormFields(file);
        if (!active) return;
        setFormFields(extractedFields);

        // Initialize values map
        const initialVals = { ...params.fieldValues };
        extractedFields.forEach(f => {
          if (initialVals[f.name] === undefined) {
            initialVals[f.name] = f.value || '';
          }
        });
        setFieldValues(initialVals);
        setLoading(false);
      } catch (err) {
        console.error("Failed to parse form in FormFillStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadAndScan();

    return () => {
      active = false;
      safeDestroyPdf(loadedPdf);
    };
  }, [file]);

  // Synchronize changes back to parent StitchCanvas
  useEffect(() => {
    if (!loading) {
      onChange({ fieldValues });
    }
  }, [fieldValues, loading]);

  // Handle NLP triggers inside form fill
  useEffect(() => {
    if (!nlpOp) return;

    // Direct mapping of custom key-value pairs (e.g. set 'Field' to 'Value')
    // Handled in parent NLP or simple regex:
    const keys = Object.keys(nlpOp);
    if (keys.length > 0) {
      setFieldValues(prev => {
        const next = { ...prev };
        keys.forEach(k => {
          // If key matches a field, set it
          const matchingField = formFields.find(f => f.name.toLowerCase() === k.toLowerCase());
          if (matchingField) {
            next[matchingField.name] = nlpOp[k];
          }
        });
        return next;
      });
    }
  }, [nlpOp, formFields]);

  // Render page canvas preview
  useEffect(() => {
    if (!pdfDocument) return;

    let renderTask = null;
    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        if (cancelled) return;

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Error rendering PDF page in FormFillStudio:", err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      safeCancelRenderTask(renderTask);
    };
  }, [pdfDocument, activePageIndex]);

  const handleValueChange = (name, val) => {
    setFieldValues(prev => ({
      ...prev,
      [name]: val
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 w-full text-slate-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary" />
        <div className="text-sm font-medium">Scanning PDF form fields...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
      {/* Live Form Overlay Panel */}
      <div className="flex-1 flex flex-col items-center gap-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
        {formFields.length === 0 ? (
          <div className="w-full flex items-center gap-2 bg-yellow-950/40 border border-yellow-800/30 rounded-xl p-3 text-xs text-yellow-300 mb-2">
            <span>No interactive fillable fields were detected on this PDF document.</span>
          </div>
        ) : (
          <div className="relative overflow-auto max-h-[500px] border border-white/10 rounded-xl bg-slate-900 shadow-inner flex items-center justify-center p-4">
            <div className="relative">
              <canvas ref={pdfCanvasRef} className="shadow-2xl rounded-lg" />
              
              {/* Form Input fields absolute overlays */}
              <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                {formFields.map((field) => {
                  if (!field.widgets || field.widgets.length === 0) return null;

                  return field.widgets.map((widget, wIdx) => {
                    if (widget.pageIndex !== activePageIndex) return null;

                    const pdfRect = widget.rect;
                    const pageSize = widget.pageSize;

                    const xPercent = pdfRect.x / pageSize.width;
                    const yPercent = (pageSize.height - pdfRect.y - pdfRect.height) / pageSize.height;
                    const wPercent = pdfRect.width / pageSize.width;
                    const hPercent = pdfRect.height / pageSize.height;

                    const currentValue = fieldValues[field.name] ?? '';

                    const baseStyle = {
                      position: 'absolute',
                      left: `${xPercent * 100}%`,
                      top: `${yPercent * 100}%`,
                      width: `${wPercent * 100}%`,
                      height: `${hPercent * 100}%`,
                      pointerEvents: 'auto',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontSize: '11px',
                      fontWeight: '600'
                    };

                    if (field.type === 'checkbox') {
                      return (
                        <input
                          key={`${field.name}-${wIdx}`}
                          type="checkbox"
                          checked={!!currentValue}
                          onChange={(e) => handleValueChange(field.name, e.target.checked)}
                          style={{
                            ...baseStyle,
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer'
                          }}
                        />
                      );
                    }

                    if (field.type === 'select') {
                      return (
                        <select
                          key={`${field.name}-${wIdx}`}
                          value={currentValue}
                          onChange={(e) => handleValueChange(field.name, e.target.value)}
                          aria-label={field.name}
                          className="bg-slate-900 border border-cyan-500/40 text-white rounded focus:border-cyan-400 text-xs px-1 cursor-pointer"
                          style={baseStyle}
                        >
                          <option value="">- Select -</option>
                          {field.options && field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );
                    }

                    if (field.type === 'radio') {
                      const radioVal = widget.onValue || (field.options && field.options[wIdx]) || widget.name || field.name;
                      return (
                        <div
                          key={`${field.name}-${wIdx}`}
                          style={baseStyle}
                          className="flex items-center justify-center bg-blue-500/10 border border-blue-400/40 rounded-full cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={radioVal}
                            checked={currentValue === radioVal}
                            onChange={() => handleValueChange(field.name, radioVal)}
                            title={`${field.name}: ${radioVal}`}
                            aria-label={`${field.name}: ${radioVal}`}
                            className="w-3/4 h-3/4 accent-[var(--color-primary)] cursor-pointer"
                          />
                        </div>
                      );
                    }

                    // Default text input
                    return (
                      <input
                        key={`${field.name}-${wIdx}`}
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleValueChange(field.name, e.target.value)}
                        aria-label={field.name}
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/30 focus:border-primary text-white rounded px-1 text-xs"
                        style={baseStyle}
                      />
                    );
                  });
                })}
              </div>
            </div>
          </div>
        )}

        {/* Page Nav */}
        <div className="flex items-center justify-between w-full max-w-xs mt-2">
          <button
            onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
            disabled={activePageIndex === 0}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-300 font-medium">Page {activePageIndex + 1} of {totalPages}</span>
          <button
            onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={activePageIndex === totalPages - 1}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar Form Fields Listing */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="flex-1 bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto max-h-[420px]">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Form Elements ({formFields.length})</h3>
          {formFields.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-6">No fields detected.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {formFields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-slate-400">{field.name}</span>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={!!(fieldValues[field.name] ?? false)}
                        onChange={(e) => handleValueChange(field.name, e.target.checked)}
                        className="w-4 h-4 accent-primary rounded bg-slate-900 border-white/10 cursor-pointer"
                        aria-label={field.name}
                      />
                      <span>Active</span>
                    </label>
                  ) : field.type === 'select' ? (
                    <select
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      aria-label={field.name}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">- Select -</option>
                      {field.options && field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'radio' ? (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {(field.options && field.options.length > 0
                        ? field.options
                        : (field.widgets && field.widgets.length > 0
                            ? field.widgets.map((w, idx) => w.onValue || `Option ${idx + 1}`)
                            : [field.value || 'Option 1'])
                      ).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-slate-200 text-xs">
                          <input
                            type="radio"
                            name={`sidebar-${field.name}`}
                            value={opt}
                            checked={(fieldValues[field.name] ?? '') === opt}
                            onChange={() => handleValueChange(field.name, opt)}
                            className="w-4 h-4 accent-primary bg-slate-900 border-white/10 cursor-pointer"
                            aria-label={`${field.name}: ${opt}`}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      aria-label={field.name}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 flex gap-2 text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>Interactive fields are filled directly inside the PDF preview grid or via the sidebar forms list.</span>
        </div>
      </div>
    </div>
  );
}
