import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import { useJobPoller } from '../../hooks/useJobPoller';
import { apiFetch } from '../../utils/api';
import { saveAs } from 'file-saver';
import { saveFile } from '../../utils/db';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function UrlToPdf() {
  const [url, setUrl] = useState('https://wikipedia.org');
  const [paperFormat, setPaperFormat] = useState('A4'); // 'A4', 'Letter', 'Legal'
  const [landscape, setLandscape] = useState(false);
  const [printBackground, setPrintBackground] = useState(true);
  const [marginType, setMarginType] = useState('default'); // 'default', 'none', 'minimum'
  
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [backendActive, setBackendActive] = useState(false);

  const poller = useJobPoller(BACKEND_URL);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(2000) });
        setBackendActive(res.ok);
      } catch { setBackendActive(false); }
    };
    check();
  }, []);

  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      setProgress(100);
      
      const domainName = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'webpage';
      const finalName = `${domainName}.pdf`;
      
      apiFetch(poller.result.downloadUrl)
        .then(r => r.blob())
        .then(async (blob) => {
          setResult({
            blob: blob,
            name: finalName
          });
          try {
            await saveFile(finalName, blob.size, 'application/pdf', 'URL to PDF', blob);
          } catch (dbErr) {
            console.error('Failed to save URL PDF locally:', dbErr);
          }
        })
        .catch(() => {
          setError('Failed to download PDF from backend.');
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'URL to PDF conversion failed.');
    }
  }, [poller.status, poller.result, poller.error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || !url.startsWith('http')) {
      setError('Please enter a valid website URL starting with http:// or https://');
      return;
    }

    if (!backendActive) {
      setError('Backend server is not active. This conversion tool requires the FastAPI backend running. Start it with run_project.bat.');
      return;
    }

    setProcessing(true);
    setProgress(20);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('url', url.trim());
      formData.append('format', paperFormat);
      formData.append('landscape', String(landscape));
      formData.append('print_background', String(printBackground));
      formData.append('margin_type', marginType);

      const res = await apiFetch(`${BACKEND_URL}/api/convert/url-to-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({ detail: 'URL conversion failed' }));
        throw new Error(detail.detail || 'URL conversion failed');
      }

      const data = await res.json();
      setProgress(50);
      poller.start(data.job_id);
    } catch (err) {
      setError(err.message || 'Failed to submit URL converter job');
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  return (
    <ToolPageLayout
      toolId="url-to-pdf"
      title="URL to PDF Converter"
      description="Convert any webpage, online article, or HTML link into a print-ready PDF in seconds."
    >
      <SEOHead 
        title="URL to PDF Converter - Save Webpages as PDF Online" 
        description="Convert website links and webpages to high-quality PDF files. Preserves layouts, styling, background colors, and graphics."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }} className="responsive-grid">
        <div className="options-panel" style={{ margin: 0 }}>
          <div className="options-title">Website Details</div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="option-group">
              <label htmlFor="url-input">Webpage URL Link</label>
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://en.wikipedia.org/wiki/PDF"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="option-group">
                <label htmlFor="format-select">Page Format</label>
                <select
                  id="format-select"
                  value={paperFormat}
                  onChange={(e) => setPaperFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div className="option-group">
                <label htmlFor="margin-select">Margins</label>
                <select
                  id="margin-select"
                  value={marginType}
                  onChange={(e) => setMarginType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="default">Default</option>
                  <option value="none">No Margins</option>
                  <option value="minimum">Minimum Margins</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="orientation-toggle"
                  checked={landscape}
                  onChange={(e) => setLandscape(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="orientation-toggle" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                  Landscape Orientation
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="background-graphics-toggle"
                  checked={printBackground}
                  onChange={(e) => setPrintBackground(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="background-graphics-toggle" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                  Print Background Graphics & Styles
                </label>
              </div>
            </div>

            {processing && (
              <div className="progress-container" style={{ margin: 0 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-status" style={{ fontSize: '0.78rem' }}>Generating print-ready PDF... {progress}%</p>
              </div>
            )}

            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-lg flex items-center justify-center gap-2"
              disabled={processing}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Converting Link...' : 'Convert URL to PDF'}</span>
            </button>
          </form>
        </div>

        <div className="preview-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: 0 }}>
          <div className="options-title">Converter Preview</div>
          {result ? (
            <div className="result-area animate-[fadeIn_0.22s_ease-out]" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
              <div className="result-title" style={{ marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Conversion Complete!</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem 0' }}>
                Your webpage PDF has been downloaded. You can download it again below:
              </p>
              <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile} style={{ width: '100%' }}>
                <span className="material-symbols-outlined text-[20px] select-none">download</span>
                <span>Download PDF</span>
              </button>
            </div>
          ) : (
            <div style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              <span className="material-symbols-outlined text-[44px] text-zinc-400 select-none" style={{ marginBottom: '0.5rem' }}>language</span>
              <div>Enter an online link address on the left side panel to generate and seal print-ready PDF files.</div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
