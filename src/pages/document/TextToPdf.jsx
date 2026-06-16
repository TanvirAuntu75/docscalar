import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';

import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { textToPdf } from '../../engines/document/textToPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function TextToPdf() {
  const [inputType, setInputType] = useState('text'); // 'text' | 'file'
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // When files are uploaded in 'file' mode, read the .txt content
  useEffect(() => {
    if (inputType === 'file' && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
      };
      reader.onerror = () => {
        setError('Failed to read text file');
      };
      reader.readAsText(file);
    }
  }, [files, inputType]);

  const handleConvert = async () => {
    const finalContent = text.trim();
    if (!finalContent) {
      setError('Please provide text to convert.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);
    try {
      const pdfBlob = await textToPdf(finalContent, { 
        fontSize: Number(fontSize),
        lineSpacing: Number(lineSpacing),
        title: title || 'DocForge Document' 
      }, (pct) => {
        setProgress(pct);
      });

      const fileName = title.trim() ? title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'text-document';
      const finalName = `${fileName}.pdf`;
      setResult({
        blob: pdfBlob,
        name: finalName
      });
      try {
        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'Text to PDF', pdfBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const reset = () => {
    setFiles([]);
    setText('');
    setResult(null);
    setError(null);
    setProgress(0);
  };

  // Estimate pages based on character count and margins
  const getEstimatedPages = () => {
    if (!text) return 0;
    const lines = text.split('\n');
    let totalLines = 0;
    lines.forEach(l => {
      // average line wrapping width (approx 80 chars)
      totalLines += Math.max(1, Math.ceil(l.length / 80));
    });
    // approx 35 lines per A4 page
    const estimatedPages = Math.ceil(totalLines / 35);
    return Math.max(1, estimatedPages);
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Convert TXT to PDF Online Free (Text to PDF)" 
        description="Convert plain text files (.txt) or custom text notes to styled PDF documents. 100% free local conversion."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="text-to-pdf" size={48} />
        </div>
        <h1>Text to PDF Converter</h1>
        <p className="tool-page-subtitle">Convert raw text, notes, or uploaded txt files into formatted PDF documents</p>
      </div>

      {!result ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            <button 
              className={`btn ${inputType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setInputType('text'); setFiles([]); }}
              style={{ flex: 1 }}
            >
              Type or Paste Text
            </button>
            <button 
              className={`btn ${inputType === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setInputType('file'); setText(''); }}
              style={{ flex: 1 }}
            >
              Upload TXT File
            </button>
          </div>

          {inputType === 'text' ? (
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 1rem' }}>
              <textarea
                style={{
                  width: '100%',
                  minHeight: '250px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  outline: 'none',
                }}
                placeholder="Enter or paste your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <span>{text.length} characters</span>
                {text && <span>Est. Page Count: ~{getEstimatedPages()}</span>}
              </div>
            </div>
          ) : (
            <FileDropzone accept=".txt,text/plain" multiple={false} files={files} setFiles={setFiles} />
          )}

          {(text.trim().length > 0 || files.length > 0) && (
            <div className="options-panel">
              <div className="options-title">Formatting Options</div>
              <div className="options-row">
                <div className="option-group">
                  <label>Document Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter document title (e.g. My Notes)"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>
                <div className="option-group">
                  <label>Font Size</label>
                  <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                    <option value="10">10 pt (Compact)</option>
                    <option value="12">12 pt (Standard)</option>
                    <option value="14">14 pt (Medium)</option>
                    <option value="16">16 pt (Large)</option>
                    <option value="18">18 pt (Very Large)</option>
                    <option value="24">24 pt (Headline)</option>
                  </select>
                </div>
                <div className="option-group">
                  <label>Line Spacing</label>
                  <select value={lineSpacing} onChange={(e) => setLineSpacing(e.target.value)}>
                    <option value="1.0">1.0 (Single)</option>
                    <option value="1.15">1.15 (Default)</option>
                    <option value="1.5">1.5 (1.5 lines)</option>
                    <option value="2.0">2.0 (Double)</option>
                  </select>
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
              <p className="progress-status">
                Generating PDF... {progress}%
              </p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleConvert} 
              disabled={(!text.trim() && !files.length) || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Converting...' : 'Generate PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Created!</div>
          <div className="result-info">
            Generated file: <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Create Another</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
