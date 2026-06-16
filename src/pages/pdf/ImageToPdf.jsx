import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import { imagesToPdf } from '../../engines/pdf/imageToPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function ImageToPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true); setProgress(0); setError(null); setResult(null);
    try {
      const blob = await imagesToPdf(files, setProgress);
      setResult(blob);
      try {
        await saveFile('images-combined.pdf', blob.size, 'application/pdf', 'Images to PDF', blob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); setProgress(0); };

  return (
    <div className="tool-page">
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="image-to-pdf" size={48} />
        </div>
        <h1>Images to PDF</h1>
        <p className="tool-page-subtitle">Combine multiple images into a single PDF document</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept="image/*" multiple={true} files={files} setFiles={setFiles} />

          {files.length > 1 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: 'var(--font-size-sm)' }}>
              📌 Images will be added in the order shown above. Drag to reorder coming soon!
            </p>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>Building PDF... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleConvert} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Building PDF...' : `Create PDF (${files.length} image${files.length !== 1 ? 's' : ''})`}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Created!</div>
          <div className="result-info">{files.length} images combined into one PDF</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={() => saveAs(result, 'images-combined.pdf')}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert Another</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
