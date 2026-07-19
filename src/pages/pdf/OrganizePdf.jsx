import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
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

  const [pageCards, setPageCards] = useState([]); 
  const canvasRefs = useRef({});
  const dragIndexRef = useRef(null);
  
  const [zoomLevel, setZoomLevel] = useState(2); // 1 = Small, 2 = Medium, 3 = Large
  const [searchQuery, setSearchQuery] = useState('');
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
  
  // Selection Handlers
  const toggleSelection = (idx) => {
    setPageCards(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };
  
  const selectAll = () => setPageCards(prev => prev.map(c => ({ ...c, selected: true })));
  const clearSelection = () => setPageCards(prev => prev.map(c => ({ ...c, selected: false })));
  const selectOdd = () => setPageCards(prev => prev.map((c, i) => ({ ...c, selected: (i % 2 === 0) })));
  const selectEven = () => setPageCards(prev => prev.map((c, i) => ({ ...c, selected: (i % 2 !== 0) })));
  
  const handleRangeSelect = (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (!val) return;
      const indicesToSelect = new Set();
      val.split(',').forEach(part => {
        const range = part.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0]) - 1;
          const end = parseInt(range[1]) - 1;
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(0, start); i <= Math.min(pageCards.length - 1, end); i++) {
              indicesToSelect.add(i);
            }
          }
        } else {
          const num = parseInt(part) - 1;
          if (!isNaN(num) && num >= 0 && num < pageCards.length) {
            indicesToSelect.add(num);
          }
        }
      });
      
      setPageCards(prev => prev.map((c, i) => ({ ...c, selected: indicesToSelect.has(i) })));
      e.target.value = ''; // clear after enter
    }
  };

  // Bulk Actions
  const deleteSelected = () => setPageCards(prev => prev.filter(c => !c.selected));
  const rotateSelected = (amount) => {
    setPageCards(prev => prev.map(c => {
      if (!c.selected) return c;
      let newRot = (c.rotation + amount) % 360;
      if (newRot < 0) newRot += 360;
      return { ...c, rotation: newRot };
    }));
  };

  // Sorting
  const reverseOrder = () => setPageCards(prev => [...prev].reverse());
  const shuffleOrder = () => {
    setPageCards(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };
  const sortByName = () => {
    setPageCards(prev => [...prev].sort((a, b) => {
      const nameA = files[a.fileIndex].name;
      const nameB = files[b.fileIndex].name;
      if (nameA === nameB) {
        return a.originalIndex - b.originalIndex;
      }
      return nameA.localeCompare(nameB);
    }));
  };
  const mixPages = () => {
    setPageCards(prev => {
      const groups = {};
      prev.forEach(c => {
        if (!groups[c.fileIndex]) groups[c.fileIndex] = [];
        groups[c.fileIndex].push(c);
      });
      
      const mixed = [];
      let round = 0;
      let added = true;
      while (added) {
        added = false;
        for (let fi = 0; fi < files.length; fi++) {
          if (groups[fi] && groups[fi].length > round) {
            mixed.push(groups[fi][round]);
            added = true;
          }
        }
        round++;
      }
      return mixed;
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
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
      const outputBlob = await organizePdf(files, pageCards, setProgress);
      const finalName = files.length === 1 
        ? files[0].name.replace(/\.[^.]+$/, '') + '_organized.pdf' 
        : 'organized_merged.pdf';
        
      setResult({
        blob: outputBlob,
        name: finalName
      });

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
    parsedFilesCount.current = 0;
  };
  
  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null;
  };
  
  const getGridTemplate = () => {
    switch(zoomLevel) {
      case 1: return 'repeat(auto-fill, minmax(100px, 1fr))';
      case 2: return 'repeat(auto-fill, minmax(150px, 1fr))';
      case 3: return 'repeat(auto-fill, minmax(220px, 1fr))';
      default: return 'repeat(auto-fill, minmax(150px, 1fr))';
    }
  };
  
  const visibleCards = pageCards.map((c, idx) => ({ ...c, uiIndex: idx }))
    .filter(c => {
      if (!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      const pageStr = (c.originalIndex + 1).toString();
      const filename = files[c.fileIndex]?.name.toLowerCase() || '';
      return filename.includes(lowerQ) || pageStr.includes(lowerQ);
    });
    
  const hasSelection = pageCards.some(c => c.selected);

  return (
    <ToolPageLayout
      toolId="organize-pdf"
      title="Organize PDF"
      description="Sort, filter, merge, and organize pages from multiple PDFs visually."
      files={files}
      onFileSwitch={(idx) => {
        // Removing this specific file switch logic because we handle multiple files as a single pool
      }}>
      <SEOHead 
        title="Organize PDF Pages Online Free (100% Local) | DocForge" 
        description="Reorder, rotate, delete, mix, and manage PDF pages from multiple files visually using drag and drop locally in your browser. Fully private, no server uploads."
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
                        <button className="btn btn-secondary btn-sm" onClick={reverseOrder} title="Reverse Order">
                          <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={shuffleOrder} title="Shuffle">
                          <span className="material-symbols-outlined text-[16px]">shuffle</span>
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={sortByName} title="Sort by Name">
                          <span className="material-symbols-outlined text-[16px]">sort_by_alpha</span>
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={mixPages} 
                          disabled={files.length < 2}
                          title={files.length < 2 ? "Upload at least 2 files to mix" : "Mix Pages from multiple PDFs"}
                        >
                          <span className="material-symbols-outlined text-[16px]">blender</span> Mix
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-2 top-1.5 text-[18px] text-[var(--text-secondary)]">search</span>
                          <input 
                            type="text" 
                            placeholder="Search pages..." 
                            className="pl-8 pr-3 py-1 text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded outline-none focus:border-[var(--color-primary)]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1 rounded">
                          <span className="material-symbols-outlined text-[14px] text-[var(--text-secondary)]">zoom_out</span>
                          <input 
                            type="range" 
                            min="1" max="3" 
                            value={zoomLevel} 
                            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="material-symbols-outlined text-[14px] text-[var(--text-secondary)]">zoom_in</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Selection Toolbar (shows when items are selected) */}
                    {hasSelection && (
                      <div className="selection-toolbar p-3 bg-blue-50 border-b border-blue-500/20 flex items-center justify-between dark:bg-blue-900/20">
                        <div className="text-sm font-semibold text-blue-500">
                          {pageCards.filter(c => c.selected).length} Pages Selected
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected(-90)}>Rotate Left</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected(90)}>Rotate Right</button>
                          <button className="btn btn-danger btn-sm" onClick={deleteSelected}>Delete Selected</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="workspace-canvas w-full flex-1">
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: getGridTemplate(),
                      gap: zoomLevel === 1 ? '1rem' : '1.5rem',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      background: 'var(--bg-secondary)',
                      minHeight: '100%'
                    }}>
                      {visibleCards.map((card) => {
                        const { uiIndex } = card; // actual index in the state array
                        return (
                          <div
                            key={card.id}
                            draggable={!processing}
                            onDragStart={(e) => handleDragStart(e, uiIndex)}
                            onDragOver={(e) => handleDragOver(e, uiIndex)}
                            onDrop={(e) => handleDrop(e, uiIndex)}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: zoomLevel === 1 ? '0.5rem' : '0.75rem 0.5rem',
                              borderRadius: '12px',
                              background: 'var(--bg-primary)',
                              border: card.selected ? '2px solid var(--color-primary)' : '1.5px solid var(--border-subtle)',
                              cursor: 'grab',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                            className={`group hover:shadow-glow-primary ${card.selected ? 'shadow-glow-primary' : ''}`}
                            onClick={() => toggleSelection(uiIndex)}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              zIndex: 10,
                            }}>
                              <input 
                                type="checkbox" 
                                checked={card.selected} 
                                onChange={() => toggleSelection(uiIndex)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                              />
                            </div>
                            
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
                                onClick={(e) => { e.stopPropagation(); rotatePage(uiIndex, 90); }}
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
                                onClick={(e) => { e.stopPropagation(); deletePage(uiIndex); }}
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
                              minHeight: zoomLevel === 1 ? '80px' : zoomLevel === 3 ? '180px' : '120px',
                              alignItems: 'center',
                              overflow: 'hidden',
                              width: '100%',
                              pointerEvents: 'none'
                            }}>
                              <canvas
                                ref={el => canvasRefs.current[card.id] = el}
                                style={{
                                  maxWidth: '90%',
                                  maxHeight: zoomLevel === 1 ? '80px' : zoomLevel === 3 ? '180px' : '120px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  borderRadius: '4px',
                                  transform: `rotate(${card.rotation}deg)`,
                                  transition: 'transform 0.25s ease-in-out'
                                }}
                              />
                            </div>

                            {/* Card Labels */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%', marginTop: '0.75rem', fontSize: zoomLevel === 1 ? '0.65rem' : '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
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
                      <button className="btn btn-secondary w-full justify-center text-sm" onClick={selectOdd}>Odd</button>
                      <button className="btn btn-secondary w-full justify-center text-sm" onClick={selectEven}>Even</button>
                    </div>
                    <div className="mt-2">
                      <label className="text-xs text-[var(--text-secondary)] mb-1 block">Select Range (e.g., 1-5, 8)</label>
                      <input 
                        type="text" 
                        placeholder="Press Enter to select" 
                        onKeyDown={handleRangeSelect}
                        className="w-full text-sm p-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                    Total Pages: <strong style={{ color: 'var(--color-primary)' }}>{pageCards.length}</strong>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Drag and drop pages to reorder them, use the top toolbar to mix multiple PDFs, or use the filters to bulk-select pages for rotation or deletion.
                  </div>
                </div>
              )}

              {processing && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="progress-status">Recompiling PDF page structures... {progress}%</p>
                </div>
              )}

              {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

              <div className="action-bar">
                <button 
                  className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
                  onClick={handleOrganize} 
                  disabled={processing || pageCards.length === 0}
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
          )}
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
    </ToolPageLayout>
  );
}
