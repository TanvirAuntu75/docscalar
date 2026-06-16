import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';

const BACKEND_URL = 'http://localhost:8000';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ita', name: 'Italian (Italiano)' },
  { code: 'por', name: 'Portuguese (Português)' },
  { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
  { code: 'jpn', name: 'Japanese (日本語)' }
];

export default function OcrPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  
  // Backend availability state
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  const poller = useJobPoller(BACKEND_URL);

  // Check if server is running on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
        }
      } catch (e) {
        setBackendActive(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    checkServer();
  }, []);

  // Monitor backend task status
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_ocr.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'OCR PDF', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'OCR engine failed on server. Make sure Tesseract is installed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleRunOcr = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    const file = files[0];

    try {
      if (!backendActive) {
        throw new Error('Connection to OCR server is inactive. High-fidelity server-side OCR requires a running backend.');
      }

      // Step 1: Upload file to FastAPI backend
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to OCR server failed.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      setProgress(40);

      // Step 2: Queue the job
      const convertFormData = new FormData();
      convertFormData.append('file_id', uploadData.file_id);
      convertFormData.append('filename', uploadData.filename);
      convertFormData.append('language', selectedLanguage);

      const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/ocr-pdf`, {
        method: 'POST',
        body: convertFormData
      });

      if (!convertRes.ok) {
        throw new Error('Failed to queue OCR task.');
      }

      const convertData = await convertRes.json();
      
      // Step 3: Trigger the poller
      poller.startPolling(convertData.job_id);

    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during OCR processing.');
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.downloadUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      saveAs(blob, result.name);
    } catch (err) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.setAttribute('download', result.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    poller.resetPoller();
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="OCR PDF Online Free — Searchable PDF Converter | DocForge" 
        description="Make scanned PDFs searchable with professional server-side OCR. High accuracy text recognition for documents."
      />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="ocr-pdf" size={48} />
        </div>
        <h1>OCR PDF</h1>
        <p className="tool-page-subtitle">Make scanned documents selectable and searchable with professional server-side text recognition</p>
        
        {!checkingBackend && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: backendActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              color: backendActive ? 'var(--color-success-light)' : 'var(--color-warning)',
              border: `1px solid ${backendActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: backendActive ? 'var(--color-success)' : 'var(--color-warning)'
              }} />
              {backendActive ? 'ocrmypdf Engine Active' : 'OCR Server Offline'}
            </span>
          </div>
        )}
      </div>

      {!result ? (
        <>
          <FileDropzone 
            accept=".pdf,application/pdf" 
            multiple={false} 
            files={files} 
            setFiles={setFiles} 
          />
          
          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out] max-w-md mx-auto mt-6 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] text-left">
              <h3 className="text-md font-semibold mb-4 text-var(--text-primary)">OCR Configuration</h3>
              
              <div className="mb-4">
                <label className="block text-xs font-semibold text-var(--text-secondary) uppercase tracking-wider mb-2">
                  Document Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] text-var(--text-primary) text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container max-w-md mx-auto mt-6">
              <div className="progress-bar mb-2">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status text-center text-sm">Recognizing text and embedding layers... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          
          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleRunOcr} 
              disabled={!files.length || processing || !backendActive}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Running OCR...' : 'Run OCR'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">search</span>
          </div>
          <div className="result-title">OCR Recognition Complete!</div>
          <div className="result-info">
            Your searchable PDF has been generated and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Searchable PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}