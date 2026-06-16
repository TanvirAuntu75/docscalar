import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { getFormFields, fillFormFields } from '../../engines/pdf/pdfForms';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

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

  // Scan PDF for form fields when file loaded
  useEffect(() => {
    if (files.length === 0) {
      setFormFields([]);
      setFieldValues({});
      setScanMessage('');
      return;
    }

    const scanForm = async () => {
      setScanning(true);
      setScanMessage('Scanning document structure for interactive fields...');
      setError(null);

      try {
        const fields = await getFormFields(files[0]);
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
        setError('Failed to scan PDF form fields. Make sure the document structure is valid.');
      } finally {
        setScanning(false);
      }
    };

    scanForm();
  }, [files, setError]);

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
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{ marginTop: '1.5rem' }}>
              <div className="options-title" style={{ marginBottom: '1.25rem' }}>Fill Document Fields</div>

              {/* Dynamic form inputs container */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0.5rem'
              }} className="no-scrollbar">
                {formFields.map((field) => {
                  const currentValue = fieldValues[field.name] ?? '';
                  return (
                    <div 
                      key={field.name}
                      style={{
                        display: 'flex',
                        flexDirection: field.type === 'checkbox' ? 'row-reverse' : 'column',
                        alignItems: field.type === 'checkbox' ? 'center' : 'stretch',
                        justifyContent: field.type === 'checkbox' ? 'flex-end' : 'stretch',
                        gap: '0.4rem',
                        padding: '0.75rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px'
                      }}
                    >
                      <label style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '600', 
                        color: 'var(--text-primary)',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        cursor: field.type === 'checkbox' ? 'pointer' : 'default',
                        userSelect: 'none'
                      }} htmlFor={`field-${field.name}`}>
                        {field.name.replace(/\[\d+\]/g, '').replace(/_/g, ' ') || 'Unnamed Field'}
                      </label>

                      {field.type === 'text' && (
                        <input
                          id={`field-${field.name}`}
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleValueChange(field.name, e.target.value)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            outline: 'none'
                          }}
                        />
                      )}

                      {field.type === 'checkbox' && (
                        <input
                          id={`field-${field.name}`}
                          type="checkbox"
                          checked={!!currentValue}
                          onChange={(e) => handleValueChange(field.name, e.target.checked)}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer'
                          }}
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          id={`field-${field.name}`}
                          value={currentValue}
                          onChange={(e) => handleValueChange(field.name, e.target.value)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">-- Select Option --</option>
                          {field.options && field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
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
