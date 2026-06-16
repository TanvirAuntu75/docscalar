import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { cropPdf } from '../../engines/pdf/cropPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CropPdf() {
  const {
    files,
    setFiles,
    processing,
    setProcessing,
    progress,
    setProgress,
    result,
    setResult,
    error,
    setError,
    reset
  } = useFileProcessor();

  const [pdfDocument, setPdfDocument] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Crop margins in percentages (0 to 100)
  const [leftMargin, setLeftMargin] = useState(10);
  const [rightMargin, setRightMargin] = useState(10);
  const [topMargin, setTopMargin] = useState(10);
  const [bottomMargin, setBottomMargin] = useState(10);

  const canvasRef = useRef(null);

  // Reset margins when left/right or top/bottom exceed 100%
  useEffect(() => {
    if (leftMargin + rightMargin >= 95) {
      setRightMargin(95 - leftMargin);
    }
  }, [leftMargin]);

  useEffect(() => {
    if (leftMargin + rightMargin >= 95) {
      setLeftMargin(95 - rightMargin);
    }
  }, [rightMargin]);

  useEffect(() => {
    if (topMargin + bottomMargin >= 95) {
      setBottomMargin(95 - topMargin);
    }
  }, [topMargin]);

  useEffect(() => {
    if (topMargin + bottomMargin >= 95) {
      setTopMargin(95 - bottomMargin);
    }
  }, [bottomMargin]);

  // Load PDF document
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePage(1);
      return;
    }

    let activePdf = null;
    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setProcessing(false);
      } catch (err) {
        setProcessing(false);
        setError('Failed to parse PDF document. It might be corrupted or protected.');
      }
    };
    loadPdf();
    return () => {
      if (activePdf) activePdf.destroy();
    };
  }, [files, setProcessing, setError]);

  // Render current page preview
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Error rendering PDF page preview:', err);
      }
    };
    renderPage();
  }, [pdfDocument, activePage]);

  // Run crop execution
  const handleCrop = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const bounds = {
        xPercent: leftMargin / 100,
        yPercent: topMargin / 100,
        widthPercent: (100 - leftMargin - rightMargin) / 100,
        heightPercent: (100 - topMargin - bottomMargin) / 100
      };

      const outputBlob = await cropPdf(files[0], bounds, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_cropped.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Crop PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save cropped file locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Cropping execution failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const handleReset = () => {
    reset();
    setPdfDocument(null);
    setTotalPages(0);
    setActivePage(1);
    setLeftMargin(10);
    setRightMargin(10);
    setTopMargin(10);
    setBottomMargin(10);
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Crop PDF Pages Online Free (100% Client-Side) | DocForge" 
        description="Crop document margins visually in your browser. Fully private, adjusting page boundaries locally without uploading to server."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="crop-pdf" size={48} />
        </div>
        <h1>Crop PDF</h1>
        <p className="tool-page-subtitle">Crop page margins visually and apply new boundary sizes to your PDF document</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'window.innerWidth > 992 ? "1.1fr 1fr" : "1fr"',
                gap: '2rem'
              }} className="lg:grid-cols-2">
                
                {/* Column 1: Sliders Config */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Adjust Crop Margins</div>

                  {/* Left Margin Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Left Margin</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{leftMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={leftMargin}
                      onChange={(e) => setLeftMargin(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Right Margin Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Right Margin</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{rightMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={rightMargin}
                      onChange={(e) => setRightMargin(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Top Margin Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Top Margin</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{topMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={topMargin}
                      onChange={(e) => setTopMargin(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Bottom Margin Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Bottom Margin</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{bottomMargin}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={bottomMargin}
                      onChange={(e) => setBottomMargin(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle)', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4'
                  }}>
                    💡 <strong>Crop Settings:</strong> Adjust margins using sliders. The transparent dotted box in the preview page shows the cropping boundaries. The crop changes will apply to all pages of the document.
                  </div>
                </div>

                {/* Column 2: Visual Cropping Box */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  minHeight: '350px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      Boundary Preview
                    </span>
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => setActivePage(p => Math.max(1, p - 1))}
                          disabled={activePage === 1}
                          style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                          className="btn btn-secondary"
                        >
                          ◀
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Page {activePage} / {totalPages}
                        </span>
                        <button 
                          onClick={() => setActivePage(p => Math.min(totalPages, p + 1))}
                          disabled={activePage === totalPages}
                          style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                          className="btn btn-secondary"
                        >
                          ▶
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <canvas
                      ref={canvasRef}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '420px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        borderRadius: '4px',
                        background: '#FFF'
                      }}
                    />

                    {/* Interactive crop borders overlays */}
                    <div style={{
                      position: 'absolute',
                      left: `${leftMargin}%`,
                      top: `${topMargin}%`,
                      right: `${rightMargin}%`,
                      bottom: `${bottomMargin}%`,
                      border: '2px dashed var(--color-primary)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)', // dim background outside crop bounds
                      borderRadius: '2px',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--color-primary)',
                        color: '#FFFFFF',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        Crop Box Bounds
                      </div>
                    </div>
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
              <p className="progress-status">Cropping page boxes... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleCrop} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Cropping...' : 'Crop PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">crop</span>
          </div>
          <div className="result-title">PDF Cropped!</div>
          <div className="result-info">
            Your document has been resized and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Tool</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
