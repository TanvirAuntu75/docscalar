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

export default function UnlockPdf() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Backend connectivity status
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  const poller = useJobPoller(BACKEND_URL);

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

  // Monitor job status
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_unlocked.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB local cache
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'Unlock PDF', blob);
        })
        .catch(err => console.error('Failed to sync unlocked PDF locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Password verification failed. Make sure the credentials are correct.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleUnlock = async () => {
    if (!files.length) return;
    if (!password) {
      setError('A password is required to decrypt this document.');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    const file = files[0];

    try {
      if (!backendActive) {
        throw new Error('Connection to decryption server is offline. This tool requires a live backend.');
      }

      // Step 1: Upload file to FastAPI uploads folder
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to decryption server failed.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      setProgress(40);

      // Step 2: Queue the PyMuPDF unlock job
      const unlockFormData = new FormData();
      unlockFormData.append('file_id', uploadData.file_id);
      unlockFormData.append('filename', uploadData.filename);
      unlockFormData.append('password', password);

      const unlockRes = await apiFetch(`${BACKEND_URL}/api/security/unlock`, {
        method: 'POST',
        body: unlockFormData
      });

      if (!unlockRes.ok) {
        throw new Error('Failed to verify password or queue unlock task.');
      }

      const unlockData = await unlockRes.json();
      
      // Step 3: Trigger the poller
      poller.startPolling(unlockData.job_id);

    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during decryption.');
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
    setPassword('');
    setResult(null);
    setError(null);
    setProgress(0);
    poller.resetPoller();
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Unlock PDF Online Free — Remove PDF Password | DocForge" 
        description="Decrypt password-protected PDF files instantly. Remove user restrictions, permission locks, and owner security details securely."
      />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="unlock-pdf" size={48} />
        </div>
        <h1>Unlock PDF</h1>
        <p className="tool-page-subtitle">Decrypt your secure PDF files and strip away all password protection requirements</p>
        
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
              background: backendActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              color: backendActive ? 'var(--color-success-light)' : 'var(--color-danger)',
              border: `1px solid ${backendActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: backendActive ? 'var(--color-success)' : 'var(--color-danger)'
              }} />
              {backendActive ? 'Security Engine Active (AES-256)' : 'Security Engine Offline'}
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
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]">
              <div className="options-title">Decryption Authorization</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Enter Document Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password required to decrypt this file..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="material-symbols-outlined"
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '20px',
                        userSelect: 'none'
                      }}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </button>
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
              <p className="progress-status">Verifying credentials and decrypting PDF stream... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          
          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleUnlock} 
              disabled={!files.length || processing || !backendActive}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Decrypting...' : 'Unlock PDF'}</span>
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <span className="material-symbols-outlined text-[16px] text-primary align-middle mr-1.5 select-none">lock_open</span><strong>Security Notice:</strong> Unlocking requires you to provide the original password of the PDF. This tool removes the password constraint so the document can be opened directly in the future.
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">lock_open</span>
          </div>
          <div className="result-title">PDF Decrypted!</div>
          <div className="result-info" style={{ maxWidth: '400px', margin: '0.5rem auto' }}>
            Document password protection removed successfully. Saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Unlocked PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Unlock Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}