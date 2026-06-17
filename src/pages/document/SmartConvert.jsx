import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { useJobPoller } from '../../hooks/useJobPoller';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

const BACKEND_URL = 'http://localhost:8000';

export default function SmartConvert() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState('clean'); // 'clean' | 'summarize' | 'translate'
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [serverActive, setServerActive] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);

  const poller = useJobPoller(BACKEND_URL);

  // Check if backend is available
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        setServerActive(res.ok);
      } catch (e) {
        setServerActive(false);
      } finally {
        setCheckingServer(false);
      }
    };
    checkServer();
  }, []);

  // Sync poller state
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const modeSuffixes = { clean: '_formatted', summarize: '_summary', translate: '_translated', extract_tables: '_tables' };
      const extension = mode === 'extract_tables' ? '.md' : '.pdf';
      const finalName = `${originalName}${modeSuffixes[mode] || '_processed'}${extension}`;
      const downloadUrl = poller.result.downloadUrl;

      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB local history
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          const mimeType = mode === 'extract_tables' ? 'text/markdown' : 'application/pdf';
          saveFile(finalName, blob.size, mimeType, 'Smart Reformatter', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Document formatting failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, mode]);

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const file = files[0];
      
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to formatting server failed.');
      }

      const uploadData = await uploadRes.json();

      // Step 2: Queue SmartConvert Job
      const convertFormData = new FormData();
      convertFormData.append('file_id', uploadData.file_id);
      convertFormData.append('filename', uploadData.filename);
      convertFormData.append('mode', mode);

      const convertRes = await apiFetch(`${BACKEND_URL}/api/smart-convert`, {
        method: 'POST',
        body: convertFormData
      });

      if (!convertRes.ok) {
        throw new Error('Failed to queue formatting task.');
      }

      const convertData = await convertRes.json();
      
      // Step 3: Start status polling
      poller.startPolling(convertData.job_id);

    } catch (err) {
      setProcessing(false);
      setError(err.message || 'Formatting server connection failed.');
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
      // Fallback: Use dynamic anchor element to bypass popup blocker
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
        title="Smart Document Reformatter: Offline Layout & Formatting Engine" 
        description="Enhance, summarize, and translate documents for free using a local formatting rules engine. 100% private, offline processing."
      />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="ai-summarizer" size={48} />
        </div>
        <h1>Smart Reformatter</h1>
        <p className="tool-page-subtitle">Refine document formatting, translate languages, or generate summaries using local rules engine</p>

        {!checkingServer && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: serverActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              color: serverActive ? 'var(--color-success-light)' : 'var(--color-danger)',
              border: `1px solid ${serverActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: serverActive ? 'var(--color-success)' : 'var(--color-danger)'
              }} />
              {serverActive ? 'Local Formatting Server Active' : 'Formatting Server Offline (Launch Local Python Backend)'}
            </span>
          </div>
        )}
      </div>

      {!result ? (
        <>
          <FileDropzone 
            accept=".txt,.docx" 
            multiple={false} 
            files={files} 
            setFiles={setFiles} 
          />

          {files.length > 0 && !processing && (
            <div className="options-panel">
              <div className="options-title">Formatting Mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="mode-selector-grid">
                <button 
                  className={`btn ${mode === 'clean' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('clean')}
                  style={{ flexDirection: 'column', padding: '1rem', height: '100px', fontSize: '0.9rem' }}
                >
                  <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✨</span>
                  <strong>Fix Formatting</strong>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>Clean typos & layouts</span>
                </button>
                <button 
                  className={`btn ${mode === 'summarize' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('summarize')}
                  style={{ flexDirection: 'column', padding: '1rem', height: '100px', fontSize: '0.9rem' }}
                >
                  <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📝</span>
                  <strong>Summarize + Convert</strong>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>Get main highlights</span>
                </button>
                <button 
                  className={`btn ${mode === 'extract_tables' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('extract_tables')}
                  style={{ flexDirection: 'column', padding: '1rem', height: '100px', fontSize: '0.9rem' }}
                >
                  <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</span>
                  <strong>Extract Tables Only</strong>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>Pull tables to CSV/Markdown</span>
                </button>
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
                Processing text with local formatting engine... {progress}%
              </p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleConvert} 
              disabled={!files.length || processing || !serverActive}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Processing...' : 'Process Document'}</span>
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            💡 <strong>Requires Local Server:</strong> This tool utilizes the local Python/FastAPI server and runs your desktop model entirely on your machine. To activate it:
            <br />
            1. Run `python main.py` inside the backend directory.
            <br />
            2. Make sure the local formatting runner (Ollama/LM Studio) is running.
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Formatting Complete!</div>
          <div className="result-info">
            Generated file: <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>{mode === 'extract_tables' ? 'Download Markdown' : 'Download PDF'}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Process Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
      
      <style>{`
        @media (max-width: 600px) {
          .mode-selector-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}