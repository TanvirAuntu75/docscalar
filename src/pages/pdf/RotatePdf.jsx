import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import { rotatePdf } from '../../engines/pdf/rotatePdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RotatePdf() {
  const [files, setFiles] = useState([]);
  const [pageCards, setPageCards] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const canvasRefs = useRef({});

  // Load PDF and render thumbnails when file changes
  useEffect(() => {
    if (files.length === 0) {
      setPageCards([]);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdfThumbnails = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        const count = pdf.numPages;

        const cards = Array.from({ length: count }, (_, idx) => ({
          id: `page-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          originalIndex: idx,
          rotation: 0
        }));
        setPageCards(cards);
        setProcessing(false);

        // Async render page previews to canvas
        setTimeout(async () => {
          for (let i = 0; i < count; i++) {
            if (isCancelled) break;
            try {
              const page = await pdf.getPage(i + 1);
              const viewport = page.getViewport({ scale: 0.35 });
              const canvas = canvasRefs.current[cards[i].id];
              if (canvas) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
              }
            } catch (errRender) {
              console.error(`Error rendering thumbnail for page ${i + 1}:`, errRender);
            }
          }
        }, 100);

      } catch (errLoad) {
        if (!isCancelled) {
          console.error("PDF Parsing error:", errLoad);
          setProcessing(false);
          setError('Failed to parse PDF document. Please verify the file is readable.');
        }
      }
    };

    loadPdfThumbnails();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files]);

  const handleRotate = async () => {
    if (!files.length) return;
    setProcessing(true); setProgress(0); setError(null); setResult(null);
    try {
      const rotationsArray = pageCards.map(c => c.rotation);
      const blob = await rotatePdf(files[0], rotationsArray, setProgress);
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

  const rotateAll = (amount) => {
    setPageCards(prev => prev.map(c => {
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const rotatePage = (idx, amount) => {
    setPageCards(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const reset = () => { setFiles([]); setPageCards([]); setResult(null); setError(null); setProgress(0); };

  return (
    <div className="tool-page">
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="rotate-pdf" size={48} />
        </div>
        <h1>Rotate PDF</h1>
        <p className="tool-page-subtitle">Rotate individual pages or all pages by 90°, 180°, or 270°</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />
          {files.length > 0 && !processing && pageCards.length > 0 && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]">
              <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.25rem' }}>
                <span>Page Rotation</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => rotateAll(-90)} className="btn btn-secondary btn-sm flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rotate_left</span> All Left
                  </button>
                  <button onClick={() => rotateAll(90)} className="btn btn-secondary btn-sm flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rotate_right</span> All Right
                  </button>
                </div>
              </div>

              {/* Grid Canvas workspace */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1.5rem',
                maxHeight: '480px',
                overflowY: 'auto',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }} className="no-scrollbar">
                {pageCards.map((card, idx) => {
                  return (
                    <div
                      key={card.id}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '0.75rem 0.5rem',
                        borderRadius: '12px',
                        background: 'var(--bg-primary)',
                        border: '1.5px solid var(--border-subtle)',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      className="group hover:border-primary hover:shadow-glow-primary"
                    >
                      {/* Action Toolbar on Card Hover */}
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        display: 'flex',
                        gap: '0.25rem',
                        zIndex: 10,
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }} className="group-hover:opacity-100">
                        <button
                          onClick={() => rotatePage(idx, -90)}
                          className="material-symbols-outlined"
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          rotate_left
                        </button>
                        <button
                          onClick={() => rotatePage(idx, 90)}
                          className="material-symbols-outlined"
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          rotate_right
                        </button>
                      </div>

                      {/* PDF Thumbnail Canvas with smooth CSS Rotation transform */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        minHeight: '140px',
                        alignItems: 'center',
                        overflow: 'hidden',
                        width: '100%'
                      }}>
                        <canvas
                          ref={el => canvasRefs.current[card.id] = el}
                          style={{
                            maxWidth: '90%',
                            maxHeight: '120px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            borderRadius: '4px',
                            transform: `rotate(${card.rotation}deg)`,
                            transition: 'transform 0.25s ease-in-out'
                          }}
                        />
                      </div>

                      {/* Card Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '90%', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        <span>Page {card.originalIndex + 1}</span>
                        {card.rotation !== 0 && (
                          <span style={{ color: 'var(--color-primary)' }}>+{card.rotation}°</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <span>{processing ? 'Applying Rotations...' : 'Apply Rotations'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Rotated!</div>
          <div className="result-info">Document pages successfully rotated.</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={() => saveAs(result, 'rotated.pdf')}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
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
