import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { addPageNumbers } from '../../engines/pdf/addPageNumbers';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function AddPageNumbers() {
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

  const [format, setFormat] = useState('Page {page} of {total}');
  const [position, setPosition] = useState('footer-center');
  const [fontSize, setFontSize] = useState(10);
  const [startNumber, setStartNumber] = useState(1);
  const [color, setColor] = useState('#000000');

  const handleProcess = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const options = {
        format,
        position,
        fontSize,
        startNumber,
        color
      };

      const outputBlob = await addPageNumbers(files[0], options, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_numbered.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Add Page Numbers', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Page numbering failed.');
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
    setFormat('Page {page} of {total}');
    setPosition('footer-center');
    setFontSize(10);
    setStartNumber(1);
    setColor('#000000');
  };

  // Helper to place formatting preview text in the mock page
  const getPreviewTextPosition = () => {
    const base = {
      position: 'absolute',
      pointerEvents: 'none',
      fontSize: `${Math.max(8, fontSize * 0.9)}px`,
      color: color,
      fontWeight: '500',
      transition: 'all 0.15s ease'
    };

    switch (position) {
      case 'header-left':
        return { ...base, top: '8px', left: '12px' };
      case 'header-center':
        return { ...base, top: '8px', left: '50%', transform: 'translateX(-50%)' };
      case 'header-right':
        return { ...base, top: '8px', right: '12px' };
      case 'footer-left':
        return { ...base, bottom: '8px', left: '12px' };
      case 'footer-right':
        return { ...base, bottom: '8px', right: '12px' };
      case 'footer-center':
      default:
        return { ...base, bottom: '8px', left: '50%', transform: 'translateX(-50%)' };
    }
  };

  // Helper to show visual format string preview
  const getPreviewString = () => {
    return format
      .replace('{page}', String(startNumber))
      .replace('{total}', String(startNumber + 9)); // Assume a 10 page document for mockup
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Add Page Numbers to PDF Online Free (100% Client-Side) | DocForge" 
        description="Add headers or footers with page numbering tags to your PDF file instantly in your browser. Complete styling and configuration options."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="add-page-numbers" size={48} />
        </div>
        <h1>Add Page Numbers</h1>
        <p className="tool-page-subtitle">Draw customized page numbers dynamically on document headers or footers</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'window.innerWidth > 768 ? "1.2fr 1fr" : "1fr"',
                gap: '2rem'
              }} className="md:grid-cols-2">
                
                {/* Configuration Columns */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Page Numbering Configurator</div>

                  {/* Format Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Number Format</label>
                    <input
                      type="text"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      placeholder="e.g. Page {page} of {total}"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                      💡 Use <code>{'{page}'}</code> for current page and <code>{'{total}'}</code> for total pages.
                    </span>
                  </div>

                  {/* Positioning Choice */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Position</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="footer-center">Footer Center</option>
                      <option value="footer-left">Footer Left</option>
                      <option value="footer-right">Footer Right</option>
                      <option value="header-center">Header Center</option>
                      <option value="header-left">Header Left</option>
                      <option value="header-right">Header Right</option>
                    </select>
                  </div>

                  {/* Font Size & Color */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Font Size (pt)</label>
                      <input
                        type="number"
                        min="6"
                        max="36"
                        value={fontSize}
                        onChange={(e) => setFontSize(Math.max(6, parseInt(e.target.value) || 10))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.8rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Text Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          style={{
                            width: '45px',
                            height: '38px',
                            padding: '0',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'transparent'
                          }}
                        />
                        <input
                          type="text"
                          value={color.toUpperCase()}
                          onChange={(e) => setColor(e.target.value)}
                          maxLength={7}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.8rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Start Number */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Start Numbering From</label>
                    <input
                      type="number"
                      min="1"
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Live Preview Column */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  minHeight: '350px'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Positioning Preview Mockup
                  </span>

                  <div style={{
                    position: 'relative',
                    width: '210px',
                    height: '297px',
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px 16px',
                    gap: '8px'
                  }}>
                    {/* Simulated Text Lines */}
                    <div style={{ width: '50%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '90%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '85%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '95%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '40%', height: '6px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '8px' }} />

                    <div style={{ width: '70%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '88%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '92%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '60%', height: '6px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '8px' }} />

                    <div style={{ width: '60%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '95%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '80%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />

                    {/* Page Number Preview Element */}
                    <div style={getPreviewTextPosition()}>
                      {getPreviewString()}
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
              <p className="progress-status">Generating and drawing page numbers... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleProcess} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Drawing Numbers...' : 'Add Page Numbers'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Page Numbers Added!</div>
          <div className="result-info">
            Your document has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Tool</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
