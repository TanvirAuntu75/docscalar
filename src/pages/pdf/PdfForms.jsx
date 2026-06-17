import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { getFormFields, fillFormFields } from '../../engines/pdf/pdfForms';
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
      setScanMessage('');
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
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
          setScanMessage('Scan complete: No interactive form fields detected in this PDF.');
        } else {
          setScanMessage(`Scan complete: Found ${fields.length} interactive fields.`);
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
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

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

  const handleFill = async () => {
    if (!files.length) return;
    if (formFields.length === 0) {
      setError('No fields are available to fill.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await fillFormFields(files[0], fieldValues, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_filled.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'PDF Forms', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save filled PDF locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Failed to fill PDF forms.');
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
    setScanMessage('');
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Fill PDF Forms Online Free — Edit Fillable PDFs | DocForge" 
        description="Fill and save interactive PDF form fields instantly in your browser. Client-side processing protects form privacy completely."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="pdf-forms" size={48} />
        </div>
        <h1>PDF Forms Filler</h1>
        <p className="tool-page-subtitle">Fill interactive PDF text boxes, checkboxes, and select dropdown fields easily</p>
      </div>

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

          {files.length > 0 && !scanning && formFields.length > 0 && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              marginTop: '1.5rem'
            }}>

              <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Interactive Document Viewer</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page {activePageIndex + 1} / {totalPages}
                </span>
              </div>

              {/* Pagination */}
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

              {/* Canvas Workspace */}
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
                }}
              >
                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>

                  {/* PDF render layer */}
                  <canvas
                    ref={pdfCanvasRef}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '600px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      borderRadius: '4px',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Absolute HTML Interactive Overlay */}
                  <div
                    ref={overlayCanvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 15,
                      pointerEvents: 'none'
                    }}
                  >
                    {formFields.map((field) => {
                      if (!field.widgets || field.widgets.length === 0) return null;

                      return field.widgets.map((widget, wIdx) => {
                        if (widget.pageIndex !== activePageIndex) return null;

                        // pdf-lib origin is bottom-left, HTML is top-left
                        const pdfRect = widget.rect;
                        const pageSize = widget.pageSize;

                        const xPercent = pdfRect.x / pageSize.width;
                        const yPercent = (pageSize.height - pdfRect.y - pdfRect.height) / pageSize.height;
                        const wPercent = pdfRect.width / pageSize.width;
                        const hPercent = pdfRect.height / pageSize.height;

                        const currentValue = fieldValues[field.name] ?? '';

                        // Shared styles for inputs over canvas
                        const inputStyle = {
                          position: 'absolute',
                          left: `${xPercent * 100}%`,
                          top: `${yPercent * 100}%`,
                          width: `${wPercent * 100}%`,
                          height: `${hPercent * 100}%`,
                          background: field.type === 'text' || field.type === 'select' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          color: '#000',
                          fontSize: '0.8rem',
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
                                opacity: 0.8 // slight transparency so background text isn't entirely hidden
                              }}
                              title={field.name}
                            >
                              <option value="">-</option>
                              {field.options && field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
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
                              backgroundColor: currentValue ? 'rgba(255,255,255,0.9)' : 'rgba(59, 130, 246, 0.15)'
                            }}
                            title={field.name}
                          />
                        );
                      });
                    })}
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

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleFill} 
              disabled={!files.length || processing || formFields.length === 0}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Compiling...' : 'Fill PDF Form'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Form Saved!</div>
          <div className="result-info">
            Your filled form document is compiled and saved as <strong>{result.name}</strong>.
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
    </div>
  );
}
