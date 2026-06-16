import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { docxToPdf } from '../../engines/document/docxToPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';

const BACKEND_URL = 'http://localhost:8000';

export default function DocxToPdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
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
      const finalName = `${originalName}.pdf`;
      setResult({
        isUrl: true,
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'DOCX to PDF', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server conversion failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(10);

    const file = files[0];

    if (backendActive) {
      try {
        // Step 1: Upload file to FastAPI backend
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await apiFetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error('Upload to conversion server failed.');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        // Step 2: Queue the job
        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('target_format', 'pdf');

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) {
          throw new Error('Failed to queue conversion task.');
        }

        const convertData = await convertRes.json();
        
        // Step 3: Trigger the poller
        poller.startPolling(convertData.job_id);

      } catch (err) {
        setProcessing(false);
        setError(err.message || 'Server connection error. Falling back to local conversion...');
        // Fallback to client-side immediately on failure
        runClientSideFallback(file);
      }
    } else {
      // Offline client-side conversion fallback
      runClientSideFallback(file);
    }
  };

  const runClientSideFallback = async (file) => {
    setProcessing(true);
    setProgress(20);
    try {
      const pdfBlob = await docxToPdf(file, (pct) => {
        setProgress(pct);
      });
      const originalName = file.name.replace(/\.[^.]+$/, '');
      const finalName = `${originalName}.pdf`;
      setResult({
        isUrl: false,
        blob: pdfBlob,
        name: finalName
      });
      try {
        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'DOCX to PDF', pdfBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Conversion failed. Please try a different DOCX file.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    if (result.isUrl) {
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
    } else {
      saveAs(result.blob, result.name);
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
        title="Convert DOCX to PDF Online Free (100% Local)" 
        description="Convert Word documents (.docx) to PDF format instantly in your browser. Fully private, no server upload required. Your documents stay safe."
      />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="docx-to-pdf" size={48} />
        </div>
        <h1>Word to PDF Converter</h1>
        <p className="tool-page-subtitle">Convert Microsoft Word (.docx) files to high-quality PDF documents</p>
        
        {/* Backend Connectivity Status Badge */}
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
              {backendActive ? 'LibreOffice Engine Active' : 'Offline Engine Active (formatting may shift)'}
            </span>
          </div>
        )}
      </div>

      {!result ? (
        <>
          <FileDropzone 
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            multiple={false} 
            files={files} 
            setFiles={setFiles} 
          />
          
          {files.length > 0 && !processing && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Selected file: <strong>{files[0].name}</strong>
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
                {backendActive ? 'Converting on server via LibreOffice...' : 'Converting locally in browser...'} {progress}%
              </p>
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
              <span>{processing ? 'Converting...' : 'Convert to PDF'}</span>
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            🔒 <strong>100% Private Local Conversion:</strong> If offline, your file is converted entirely inside your browser. If online, it's processed on a secure, temporary server container and deleted automatically after 30 minutes.
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Conversion Complete!</div>
          <div className="result-info">
            Your Word document has been converted to <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
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