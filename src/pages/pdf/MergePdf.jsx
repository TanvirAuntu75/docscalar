import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import { mergePdfs } from '../../engines/pdf/mergePdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function MergePdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true); setProgress(0); setError(null); setResult(null);
    try {
      const blob = await mergePdfs(files, setProgress);
      setResult(blob);
      try {
        await saveFile('merged.pdf', blob.size, 'application/pdf', 'Merge PDFs', blob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Merge failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); setProgress(0); };

  return (
    <div className="tool-page">
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="merge-pdf" size={48} />
        </div>
        <h1>Merge PDFs</h1>
        <p className="tool-page-subtitle">Combine multiple PDF files into one document</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={true} files={files} setFiles={setFiles} />

          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>Merging... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleMerge} disabled={files.length < 2 || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Merging...' : `Merge ${files.length} PDFs`}</span>
            </button>
          </div>
          {files.length === 1 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontSize: 'var(--font-size-sm)' }}>Add at least 2 PDFs to merge</p>}
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDFs Merged!</div>
          <div className="result-info">{files.length} files combined into one</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={() => saveAs(result, 'merged.pdf')}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Merged PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Merge More</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
