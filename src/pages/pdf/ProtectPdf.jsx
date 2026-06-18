import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';

const BACKEND_URL = 'http://localhost:8000';

export default function ProtectPdf() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowEdit, setAllowEdit] = useState(false);
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
      const finalName = `${originalName}_protected.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB local cache
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'Protect PDF', blob);
        })
        .catch(err => console.error('Failed to sync protected PDF locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server protection task failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleProtect = async () => {
    if (!files.length) return;
    if (!password) {
      setError('Please provide an encryption password to secure this PDF.');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    const file = files[0];

    try {
      if (!backendActive) {
        throw new Error('Connection to security server is inactive. This tool requires a live backend.');
      }

      // Step 1: Upload file to FastAPI uploads folder
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to security server failed.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      setProgress(40);

      // Step 2: Queue the PyMuPDF AES-256 protect job
      const protectFormData = new FormData();
      protectFormData.append('file_id', uploadData.file_id);
      protectFormData.append('filename', uploadData.filename);
      protectFormData.append('password', password);
      protectFormData.append('allow_print', String(allowPrint));
      protectFormData.append('allow_copy', String(allowCopy));
      protectFormData.append('allow_edit', String(allowEdit));

      const protectRes = await apiFetch(`${BACKEND_URL}/api/security/protect`, {
        method: 'POST',
        body: protectFormData
      });

      if (!protectRes.ok) {
        throw new Error('Failed to queue protection task on server.');
      }

      const protectData = await protectRes.json();
      
      // Step 3: Trigger the poller
      poller.startPolling(protectData.job_id);

    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during protection.');
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

  // Basic password strength helper
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'var(--text-secondary)' };
    if (password.length < 6) return { label: 'Weak', color: 'var(--color-danger)' };
    if (password.length < 10) return { label: 'Medium', color: 'var(--color-warning)' };
    return { label: 'Strong', color: 'var(--color-success)' };
  };

  const strength = getPasswordStrength();

  return (
    <ToolPageLayout
      toolId="protect-pdf"
      title="Protect PDF"
      description="Encrypt your PDF document with a password to restrict access and permissions"
      headerContent={
        <>
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
        </>
      }
    >
      <SEOHead 
        title="Protect PDF Online Free — Encrypt PDF with Password | DocForge" 
        description="Secure your PDF document with AES-256 encryption. Set custom passwords and restrict printing, copying, and modifications."
      />
      
      

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
              <div className="options-title">Security Configurations</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                {/* Password Input Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Set Document Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password to open document..."
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
                  {password && (
                    <div style={{ fontSize: '0.75rem', color: strength.color, fontWeight: '600', display: 'flex', gap: '0.25rem' }}>
                      Strength: <span>{strength.label}</span>
                    </div>
                  )}
                </div>

                {/* Permissions Checkboxes Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderT: '1px solid var(--border-subtle)', pt: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Permissions Constraints</label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="allowPrint"
                      checked={allowPrint}
                      onChange={(e) => setAllowPrint(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="allowPrint" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                      Allow Printing
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="allowCopy"
                      checked={allowCopy}
                      onChange={(e) => setAllowCopy(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="allowCopy" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                      Allow Content Copying & Text Selection
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="allowEdit"
                      checked={allowEdit}
                      onChange={(e) => setAllowEdit(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="allowEdit" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                      Allow Page Modifying & Form Editing
                    </label>
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
              <p className="progress-status">Encrypting PDF stream... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          
          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleProtect} 
              disabled={!files.length || processing || !backendActive}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Encrypting...' : 'Encrypt PDF'}</span>
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <span className="material-symbols-outlined text-[16px] text-primary align-middle mr-1.5 select-none">shield</span><strong>Standard Encryption:</strong> Locked PDF documents use secure AES-256 algorithms. The user password will be required by any standard reader (Adobe, Chrome, Apple Preview) to open the file.
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">lock</span>
          </div>
          <div className="result-title">PDF Encrypted!</div>
          <div className="result-info" style={{ maxWidth: '400px', margin: '0.5rem auto' }}>
            Your secured document is compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Secured PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Protect Another File</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}