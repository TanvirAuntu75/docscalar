import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import { rotatePdf } from '../../engines/pdf/rotatePdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function RotatePdf() {
  const [files, setFiles] = useState([]);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRotate = async () => {
    if (!files.length) return;
    setProcessing(true); setProgress(0); setError(null); setResult(null);
    try {
      const blob = await rotatePdf(files[0], angle, setProgress);
      setResult(blob);
      try {
        await saveFile(files[0].name.replace(/\.[^.]+$/, '') + '_rotated.pdf', blob.size, 'application/pdf', 'Rotate PDF', blob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Rotation failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); setProgress(0); };

  return (
    <div className="tool-page">
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="rotate-pdf" size={48} />
        </div>
        <h1>Rotate PDF</h1>
        <p className="tool-page-subtitle">Rotate all pages by 90°, 180°, or 270°</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />
          {files.length > 0 && (
            <div className="options-panel">
              <div className="options-title">Rotation</div>
              <div className="options-row">
                <div className="option-group">
                  <label>Angle</label>
                  <select value={angle} onChange={(e) => setAngle(Number(e.target.value))}>
                    <option value={90}>90° Clockwise</option>
                    <option value={180}>180°</option>
                    <option value={270}>90° Counter-clockwise</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container"><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div></div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>Rotating... {progress}%</p>
            </div>
          )}
          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleRotate} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Rotating...' : 'Rotate PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Rotated!</div>
          <div className="result-info">All pages rotated {angle}°</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={() => saveAs(result, 'rotated.pdf')}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Rotate Another</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
