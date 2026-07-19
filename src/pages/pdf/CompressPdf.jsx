import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch, uploadFileSecure, BACKEND_URL} from '../../utils/api';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { compressPdf as localCompressPdf } from '../../engines/pdf/compressPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';

export default function CompressPdf() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(0.6);
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
      const finalName = `${originalName}_compressed.pdf`;
      
      // We can fetch the compressed file metadata (like size)
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          setResult({
            isUrl: true,
            downloadUrl: downloadUrl,
            blob: blob,
            name: finalName,
            originalSize: files[0].size,
            newSize: blob.size
          });
          saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
        })
        .catch(err => {
          console.error('Failed to parse backend output size:', err);
          // Fallback if size fetch fails
          setResult({
            isUrl: true,
            downloadUrl: downloadUrl,
            name: finalName,
            originalSize: files[0].size,
            newSize: Math.round(files[0].size * 0.7) // estimate
          });
        });

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server compression failed. Falling back to local engine...');
      runLocalCompression(files[0]);
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  const handleCompress = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const file = files[0];

    if (backendActive) {
      try {
        // Step 1: Upload file (uses chunked upload if large and premium)
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        setProgress(30);

        // Step 2: Queue the job
        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('quality', quality);

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/compress-pdf`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) {
          throw new Error('Failed to queue compression task.');
        }

        const convertData = await convertRes.json();
        
        // Step 3: Trigger the poller
        poller.startPolling(convertData.job_id);

      } catch (err) {
        console.warn('Backend compression failed, falling back to Client Side:', err);
        setError('Server compression failed. Running Client Side compression...');
        runLocalCompression(file);
      }
    } else {
      // Local Client Side compression fallback
      runLocalCompression(file);
    }
  };

  const runLocalCompression = async (file) => {
    setProcessing(true);
    setProgress(10);
    try {
      const blob = await localCompressPdf(file, { quality }, (pct) => {
        setProgress(pct);
      });
      const finalName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
      
      setResult({
        isUrl: false,
        blob: blob,
        name: finalName,
        originalSize: file.size,
        newSize: blob.size
      });

      try {
        await saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Compression failed');
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
    setResult(null);
    setError(null);
    setProgress(0);
    poller.resetPoller();
  };

  const savings = result ? Math.round((1 - result.newSize / result.originalSize) * 100) : 0;

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce PDF file size while maintaining vectors, searchability, and text layers"
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
              {backendActive ? 'Ghostscript Engine Active (Vector Preservation)' : 'Client Side Fallback Active (Raster Lossy)'}
            </span>
          </div>
        )}
        </>
      }
      files={files}
      onFileSwitch={(idx) => {
        setFiles(prev => {
          if (idx < 0 || idx >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return next;
        });
      }}>
      <SEOHead 
        title="Compress PDF Online Free — Reduce PDF Size | DocForge" 
        description="Reduce PDF file size while maintaining readability. Ghostscript/PyMuPDF server optimization and Client Side fallback."
      />

      

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />
          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out] max-w-md mx-auto mt-6 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] text-left">
              <h3 className="text-md font-semibold mb-4 text-var(--text-primary)">Compression Settings</h3>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-var(--text-secondary) uppercase tracking-wider mb-2">
                  Quality: {Math.round(quality * 100)}% ({quality > 0.7 ? 'High (less compression)' : quality > 0.4 ? 'Medium (recommended)' : 'Low (max compression)'})
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="95" 
                  value={quality * 100} 
                  onChange={(e) => setQuality(e.target.value / 100)} 
                  className="w-full h-1 bg-[var(--background-color)] rounded-lg appearance-none cursor-pointer accent-red-500" 
                />
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
              <p className="progress-status text-center text-sm">Optimizing document streams... {progress}%</p>
            </div>
          )}
          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleCompress} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Compressing...' : 'Compress PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Document Compressed!</div>
          <div className="result-info">
            {formatFileSize(result.originalSize)} → {formatFileSize(result.newSize)} ({savings > 0 ? `${savings}% smaller` : 'No size reduction (try lower quality)'})
          </div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Compress Another</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}