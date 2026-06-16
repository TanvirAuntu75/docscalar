import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { organizePdf } from '../../engines/pdf/organizePdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function OrganizePdf() {
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

  const [pageCards, setPageCards] = useState([]); // array of { id: string, originalIndex: number, rotation: number }
  const canvasRefs = useRef({});
  const dragIndexRef = useRef(null);

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
            } catch (err) {
              console.error(`Error rendering thumbnail for page ${i + 1}:`, err);
            }
          }
        }, 100);

      } catch (err) {
        if (!isCancelled) {
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
  }, [files, setProcessing, setError]);

  // Rotations
  const rotatePage = (idx, amount) => {
    setPageCards(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const deletePage = (idx) => {
    setPageCards(prev => prev.filter((_, i) => i !== idx));
  };

  // Drag and Drop handlers
  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // Required to prevent bugs in Firefox
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = dragIndexRef.current;
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    setPageCards(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      return updated;
    });
    dragIndexRef.current = null;
  };

  const handleOrganize = async () => {
    if (!files.length) return;
    if (pageCards.length === 0) {
      setError('Document cannot be empty. Select at least one page.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await organizePdf(files[0], pageCards, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_organized.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB local cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Organize PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'PDF organization execution failed.');
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
    setPageCards([]);
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Organize PDF Pages Online Free (100% Local) | DocForge" 
        description="Reorder, rotate, delete and manage PDF pages visually using drag and drop locally in your browser. Fully private, no server uploads."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="organize-pdf" size={48} />
        </div>
        <h1>Organize PDF</h1>
        <p className="tool-page-subtitle">Drag and drop pages to reorder, click to rotate, or remove pages visually</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && pageCards.length > 0 && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]">
              <div className="options-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%', marginBottom: '1.25rem' }}>
                <span>Interactive Layout Grid</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total: {pageCards.length} pages
                </span>
              </div>

              {/* Grid Canvas drag-and-drop workspace */}
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
                      draggable={!processing}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '0.75rem 0.5rem',
                        borderRadius: '12px',
                        background: 'var(--bg-primary)',
                        border: '1.5px solid var(--border-subtle)',
                        cursor: 'grab',
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
                        <button
                          onClick={() => deletePage(idx)}
                          className="material-symbols-outlined"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'var(--color-danger)',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          delete
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
                      <div style={{ display: 'flex', justifyContent: 'between', width: '90%', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
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
              <p className="progress-status">Recompiling PDF page structures... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleOrganize} 
              disabled={!files.length || processing || pageCards.length === 0}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Reorganizing...' : 'Apply & Compile PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Reorganized!</div>
          <div className="result-info">
            Your document has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Workspace</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
