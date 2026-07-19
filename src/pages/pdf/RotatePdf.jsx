import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import useFileProcessor from '../../hooks/useFileProcessor';
import { organizePdf } from '../../engines/pdf/organizePdf'; 
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RotatePdf() {
  const {
    files, setFiles, processing, setProcessing,
    progress, setProgress, result, setResult,
    error, setError, reset
  } = useFileProcessor();

  const [pageCards, setPageCards] = useState([]); 
  const canvasRefs = useRef({});
  
  const parsedFilesCount = useRef(0);

  // Load PDF and render thumbnails when file changes
  useEffect(() => {
    if (files.length === 0) {
      setPageCards([]);
      parsedFilesCount.current = 0;
      return;
    }

    if (files.length <= parsedFilesCount.current) return;

    let activePdfs = [];
    let isCancelled = false;

    const loadNewFiles = async () => {
      setProcessing(true);
      setError(null);
      try {
        let newCards = [];
        let newPdfRefs = [];

        for (let fileIndex = parsedFilesCount.current; fileIndex < files.length; fileIndex++) {
          const file = files[fileIndex];
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          if (isCancelled) {
            pdf.destroy();
            return;
          }
          activePdfs.push(pdf);
          newPdfRefs.push({ pdf, fileIndex });
          
          const count = pdf.numPages;
          const cards = Array.from({ length: count }, (_, idx) => ({
            id: `page-${fileIndex}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            fileIndex,
            originalIndex: idx,
            rotation: 0,
            selected: false,
            fileLabel: files.length > 1 ? `${file.name.substring(0, 15)}... (P. ${idx + 1})` : `Page ${idx + 1}`
          }));
          newCards = [...newCards, ...cards];
        }

        if (isCancelled) return;

        setPageCards(prev => [...prev, ...newCards]);
        parsedFilesCount.current = files.length;
        setProcessing(false);

        // Async render page previews to canvas
        setTimeout(async () => {
          for (const item of newPdfRefs) {
            if (isCancelled) break;
            const pdf = item.pdf;
            const count = pdf.numPages;
            for (let i = 0; i < count; i++) {
              if (isCancelled) break;
              try {
                const page = await pdf.getPage(i + 1);
                const viewport = page.getViewport({ scale: 0.35 });
                const targetCard = newCards.find(c => c.fileIndex === item.fileIndex && c.originalIndex === i);
                if (!targetCard) continue;

                const canvas = canvasRefs.current[targetCard.id];
                if (canvas) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  const ctx = canvas.getContext('2d');
                  await page.render({ canvasContext: ctx, viewport }).promise;
                }
              } catch (err) {
                console.error(`Error rendering thumbnail for file ${item.fileIndex}, page ${i + 1}:`, err);
              }
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

    loadNewFiles();

    return () => {
      isCancelled = true;
      activePdfs.forEach(p => p.destroy());
    };
  }, [files, setProcessing, setError]);

  const rotatePage = (idx, amount) => {
    setPageCards(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const toggleSelection = (idx) => setPageCards(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  const selectAll = () => setPageCards(prev => prev.map(c => ({ ...c, selected: true })));
  const clearSelection = () => setPageCards(prev => prev.map(c => ({ ...c, selected: false })));
  const selectOdd = () => setPageCards(prev => prev.map((c, i) => ({ ...c, selected: (i % 2 === 0) })));
  const selectEven = () => setPageCards(prev => prev.map((c, i) => ({ ...c, selected: (i % 2 !== 0) })));

  const rotateSelected = (amount) => {
    setPageCards(prev => prev.map(c => {
      if (!c.selected) return c;
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const rotateAll = (amount) => {
    setPageCards(prev => prev.map(c => {
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  const handleRotate = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await organizePdf(files, pageCards, setProgress);
      const finalName = files.length === 1 
        ? files[0].name.replace(/\.[^.]+$/, '') + '_rotated.pdf' 
        : 'rotated_merged.pdf';
        
      setResult({
        blob: outputBlob,
        name: finalName
      });

      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Rotate PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'PDF rotation execution failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null;
  };

  const downloadFile = () => { if (result) saveAs(result.blob, result.name); };
  const handleReset = () => { reset(); setPageCards([]); parsedFilesCount.current = 0; };

  const hasSelection = pageCards.some(c => c.selected);

  return (
    <ToolPageLayout
      toolId="rotate-pdf"
      title="Rotate PDF"
      description="Rotate individual pages or all pages from multiple PDFs visually"
      files={files}
      onFileSwitch={() => {}}>
      <SEOHead 
        title="Rotate PDF Pages Online Free (100% Local) | DocForge" 
        description="Rotate PDF pages from multiple files visually locally in your browser. Fully private, no server uploads."
      />
      
      {!result ? (
        <>
          {files.length === 0 ? (
            <FileDropzone accept=".pdf" multiple={true} files={files} setFiles={setFiles} />
          ) : (
            <>
              {/* LEFT COLUMN: Page Previews Workspace */}
              {!processing && pageCards.length > 0 && (
                <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative">
                  <div className="sticky top-0 z-20 flex flex-col w-full shadow-sm">
                    <div className="workspace-toolbar p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-primary)]">
                      <div className="flex gap-2">
                        <label className="btn btn-primary btn-sm cursor-pointer flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">add_circle</span>
                          Add Files
                          <input type="file" multiple accept=".pdf" className="hidden" onChange={handleAddFiles} />
                        </label>
                        <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => rotateAll(-90)}>
                          <span className="material-symbols-outlined text-[16px]">rotate_left</span> Rotate All Left
                        </button>
                        <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => rotateAll(90)}>
                          <span className="material-symbols-outlined text-[16px]">rotate_right</span> Rotate All Right
                        </button>
                      </div>
                    </div>
                    
                    {/* Selection Toolbar */}
                    {hasSelection && (
                      <div className="selection-toolbar p-3 bg-blue-50 border-b border-blue-500/20 flex items-center justify-between dark:bg-blue-900/20">
                        <div className="text-sm font-semibold text-blue-500">
                          {pageCards.filter(c => c.selected).length} Pages Selected
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected(-90)}>Rotate Selected Left</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected(90)}>Rotate Selected Right</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="workspace-canvas w-full flex-1">
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '1.5rem',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      background: 'var(--bg-secondary)',
                      minHeight: '100%'
                    }}>
                      {pageCards.map((card, uiIndex) => {
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
                              border: card.selected ? '2px solid var(--color-primary)' : '1.5px solid var(--border-subtle)',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                            className={`group hover:shadow-glow-primary ${card.selected ? 'shadow-glow-primary' : ''}`}
                            onClick={() => toggleSelection(uiIndex)}
                          >
                            <div style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 10 }}>
                              <input 
                                type="checkbox" 
                                checked={card.selected} 
                                onChange={() => toggleSelection(uiIndex)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                              />
                            </div>
                            
                            <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '0.25rem', zIndex: 10, opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
                              <button
                                onClick={(e) => { e.stopPropagation(); rotatePage(uiIndex, -90); }}
                                className="material-symbols-outlined"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', cursor: 'pointer' }}
                              >rotate_left</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); rotatePage(uiIndex, 90); }}
                                className="material-symbols-outlined"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', cursor: 'pointer' }}
                              >rotate_right</button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', minHeight: '120px', alignItems: 'center', overflow: 'hidden', width: '100%', pointerEvents: 'none' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                              <div className="flex justify-between w-full">
                                <span>{card.fileLabel}</span>
                                {card.rotation !== 0 && (
                                  <span style={{ color: 'var(--color-primary)' }}>+{card.rotation}°</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* RIGHT COLUMN: Sidebar Options Panel */}
              {!processing && pageCards.length > 0 && (
                <div className="options-panel animate-[fadeIn_0.22s_ease-out] overflow-y-auto">
                  <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
                    <span>Filters & Selection</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    <button className="btn btn-secondary w-full justify-start text-sm" onClick={selectAll}>Select All</button>
                    <button className="btn btn-secondary w-full justify-start text-sm" onClick={clearSelection}>Clear Selection</button>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary w-full justify-center text-sm" onClick={selectOdd}>Odd Pages</button>
                      <button className="btn btn-secondary w-full justify-center text-sm" onClick={selectEven}>Even Pages</button>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                    Total Pages: <strong style={{ color: 'var(--color-primary)' }}>{pageCards.length}</strong>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Use the filters to bulk-select pages for rotation, or rotate them one by one.
                  </div>
                </div>
              )}

              {processing && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="progress-status">Rotating... {progress}%</p>
                </div>
              )}

              {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

              <div className="action-bar">
                <button 
                  className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
                  onClick={handleRotate} 
                  disabled={processing || pageCards.length === 0}
                >
                  {processing && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{processing ? 'Applying...' : 'Apply Rotations'}</span>
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Rotated!</div>
          <div className="result-info">Document pages successfully rotated.</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Rotate Another</span>
            </button>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
