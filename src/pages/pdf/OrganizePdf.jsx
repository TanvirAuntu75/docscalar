import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import { loadPdfDocument } from '../../utils/pdfConfig';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { organizePdf } from '../../engines/pdf/organizePdf';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { formatFileSize } from '../../utils/constants';

export default function OrganizePdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [pageCards, setPageCards] = useState([]);
  const canvasRefs = useRef({});
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [zoomLevel, setZoomLevel] = useState(2); // 1 = Small, 2 = Medium, 3 = Large
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeInput, setRangeInput] = useState('');
  const [outputFileName, setOutputFileName] = useState('organized.pdf');
  const parsedFilesCount = useRef(0);
  const fileInputRef = useRef(null);

  // Restore draft session on mount if available
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('organize-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save draft session when files change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('organize-pdf', {
        files,
        outputFileName
      });
    }
  }, [files, outputFileName]);

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
          const pdf = await loadPdfDocument(arrayBuffer).promise;
          if (isCancelled) {
            pdf.destroy();
            return;
          }
          activePdfs.push(pdf);
          newPdfRefs.push({ pdf, fileIndex });

          const count = pdf.numPages;
          const cards = Array.from({ length: count }, (_, idx) => ({
            id: `page-${fileIndex}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
            fileIndex,
            originalIndex: idx,
            rotation: 0,
            selected: false,
            isBlank: false,
            fileLabel: files.length > 1 ? `${file.name.substring(0, 14)}... (P. ${idx + 1})` : `Page ${idx + 1}`
          }));
          newCards = [...newCards, ...cards];
        }

        if (isCancelled) return;

        setPageCards((prev) => [...prev, ...newCards]);
        parsedFilesCount.current = files.length;
        setProcessing(false);

        // Set default output filename
        if (files.length === 1) {
          setOutputFileName(`${files[0].name.replace(/\.[^.]+$/, '')}_organized.pdf`);
        } else {
          setOutputFileName('organized_merged.pdf');
        }

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
                const targetCard = newCards.find((c) => c.fileIndex === item.fileIndex && c.originalIndex === i);
                if (!targetCard) continue;

                const canvas = canvasRefs.current[targetCard.id];
                if (canvas) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  const ctx = canvas.getContext('2d');
                  await page.render({ canvasContext: ctx, viewport }).promise;
                }
              } catch (err) {
                console.warn(`Error rendering thumbnail for file ${item.fileIndex}, page ${i + 1}:`, err);
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
      activePdfs.forEach((p) => p.destroy());
    };
  }, [files]);

  // Rotations
  const rotatePage = (idx, amount) => {
    setPageCards((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        let newRot = (c.rotation + amount + 360) % 360;
        return { ...c, rotation: newRot };
      })
    );
  };

  // Delete page
  const deletePage = (idx) => {
    setPageCards((prev) => prev.filter((_, i) => i !== idx));
  };

  // Duplicate page
  const duplicatePage = (idx) => {
    setPageCards((prev) => {
      const next = [...prev];
      const target = next[idx];
      const clone = {
        ...target,
        id: `page-clone-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        selected: false
      };
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  // Insert Blank Page
  const insertBlankPage = (atIndex = null) => {
    const blankCard = {
      id: `page-blank-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fileIndex: -1,
      originalIndex: -1,
      rotation: 0,
      selected: false,
      isBlank: true,
      fileLabel: 'Blank Page'
    };

    setPageCards((prev) => {
      if (atIndex === null || atIndex === undefined) {
        return [...prev, blankCard];
      }
      const next = [...prev];
      next.splice(atIndex + 1, 0, blankCard);
      return next;
    });
  };

  // Selection Handlers
  const toggleSelection = (idx) => {
    setPageCards((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const selectAll = () => setPageCards((prev) => prev.map((c) => ({ ...c, selected: true })));
  const clearSelection = () => setPageCards((prev) => prev.map((c) => ({ ...c, selected: false })));
  const selectOdd = () => setPageCards((prev) => prev.map((c, i) => ({ ...c, selected: i % 2 === 0 })));
  const selectEven = () => setPageCards((prev) => prev.map((c, i) => ({ ...c, selected: i % 2 !== 0 })));

  const handleRangeSelect = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      const val = rangeInput.trim();
      if (!val) return;
      const indicesToSelect = new Set();
      val.split(',').forEach((part) => {
        const range = part.trim().split('-');
        if (range.length === 2) {
          const start = parseInt(range[0]) - 1;
          const end = parseInt(range[1]) - 1;
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(0, start); i <= Math.min(pageCards.length - 1, end); i++) {
              indicesToSelect.add(i);
            }
          }
        } else {
          const num = parseInt(part.trim()) - 1;
          if (!isNaN(num) && num >= 0 && num < pageCards.length) {
            indicesToSelect.add(num);
          }
        }
      });

      setPageCards((prev) => prev.map((c, i) => ({ ...c, selected: indicesToSelect.has(i) })));
      if (e.key === 'Enter') setRangeInput('');
    }
  };

  // Bulk Actions on Selection
  const deleteSelected = () => setPageCards((prev) => prev.filter((c) => !c.selected));
  const rotateSelected = (amount) => {
    setPageCards((prev) =>
      prev.map((c) => {
        if (!c.selected) return c;
        let newRot = (c.rotation + amount + 360) % 360;
        return { ...c, rotation: newRot };
      })
    );
  };

  // Sorting
  const reverseOrder = () => setPageCards((prev) => [...prev].reverse());
  const rotateAll = (amount) => {
    setPageCards((prev) =>
      prev.map((c) => ({
        ...c,
        rotation: (c.rotation + amount + 360) % 360
      }))
    );
  };

  const shuffleOrder = () => {
    setPageCards((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const sortByName = () => {
    setPageCards((prev) =>
      [...prev].sort((a, b) => {
        if (a.isBlank) return 1;
        if (b.isBlank) return -1;
        const nameA = files[a.fileIndex]?.name || '';
        const nameB = files[b.fileIndex]?.name || '';
        if (nameA === nameB) {
          return a.originalIndex - b.originalIndex;
        }
        return nameA.localeCompare(nameB);
      })
    );
  };

  const mixPages = () => {
    setPageCards((prev) => {
      const groups = {};
      prev.forEach((c) => {
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
    e.dataTransfer.setData('text/plain', idx);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIdx = dragIndexRef.current;
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    setPageCards((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      return updated;
    });
    dragIndexRef.current = null;
  };

  // Move individual item left/right
  const moveItem = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= pageCards.length) return;
    setPageCards((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  // Execute Organize & Compile
  const handleOrganize = async () => {
    if (!files.length) return;
    if (pageCards.length === 0) {
      setError('Document cannot be empty. Please keep at least one page.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await organizePdf(files, pageCards, setProgress);
      const finalName = outputFileName.trim().endsWith('.pdf')
        ? outputFileName.trim()
        : `${outputFileName.trim()}.pdf`;

      setResult({
        blob: outputBlob,
        name: finalName || 'organized.pdf'
      });

      try {
        await saveFile(finalName || 'organized.pdf', outputBlob.size, 'application/pdf', 'Organize PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

      // Clear draft since compilation succeeded
      await clearStudioDraft('organize-pdf');
    } catch (err) {
      setError(err.message || 'PDF organization execution failed.');
    } finally {
      setProcessing(false);
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('organize-pdf');
    setFiles([]);
    setPageCards([]);
    setResult(null);
    setError(null);
    setProgress(0);
    parsedFilesCount.current = 0;
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (newFiles.length) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const getGridTemplate = () => {
    switch (zoomLevel) {
      case 1:
        return 'repeat(auto-fill, minmax(120px, 1fr))';
      case 3:
        return 'repeat(auto-fill, minmax(220px, 1fr))';
      default:
        return 'repeat(auto-fill, minmax(165px, 1fr))';
    }
  };

  const visibleCards = pageCards
    .map((c, idx) => ({ ...c, uiIndex: idx }))
    .filter((c) => {
      if (!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      const pageStr = (c.originalIndex + 1).toString();
      const filename = files[c.fileIndex]?.name.toLowerCase() || '';
      return filename.includes(lowerQ) || pageStr.includes(lowerQ) || (c.isBlank && 'blank'.includes(lowerQ));
    });

  const selectedCount = pageCards.filter((c) => c.selected).length;

  return (
    <ToolPageLayout
      toolId="organize-pdf"
      title="Organize PDF"
      description="Sort, filter, merge, and organize pages from multiple PDFs visually."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Organize PDF Pages Online Free (100% Local) | DocForge"
        description="Reorder, rotate, delete, mix, and manage PDF pages from multiple files visually using drag and drop locally in your browser. Fully private, no server uploads."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Page Canvas Workspace                          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative bg-[var(--bg-tertiary)]">
              {/* Sticky Workspace Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="btn btn-primary btn-sm cursor-pointer flex items-center gap-1.5 shadow-xs">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Add PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => insertBlankPage()}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      title="Insert a blank page"
                    >
                      <span className="material-symbols-outlined text-[15px]">note_add</span>
                      <span className="hidden sm:inline">Blank Page</span>
                    </button>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    <button
                      type="button"
                      onClick={() => rotateAll(-90)}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      title="Rotate all pages left 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_left</span>
                      <span className="hidden sm:inline">Rotate Left</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotateAll(90)}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      title="Rotate all pages right 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                      <span className="hidden sm:inline">Rotate Right</span>
                    </button>

                    <button
                      type="button"
                      onClick={sortByName}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      title="Sort pages by source document name"
                    >
                      <span className="material-symbols-outlined text-[15px]">sort_by_alpha</span>
                      <span className="hidden md:inline">Sort</span>
                    </button>

                    <button
                      type="button"
                      onClick={reverseOrder}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      title="Reverse page sequence"
                    >
                      <span className="material-symbols-outlined text-[15px]">swap_vert</span>
                      <span className="hidden md:inline">Reverse</span>
                    </button>

                    <button
                      type="button"
                      onClick={mixPages}
                      disabled={files.length < 2}
                      className="btn btn-secondary btn-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={files.length < 2 ? 'Upload at least 2 files to mix' : 'Interleave pages from multiple PDFs'}
                    >
                      <span className="material-symbols-outlined text-[15px]">blender</span>
                      <span className="hidden lg:inline">Mix Pages</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="relative hidden md:block">
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-[15px] text-[var(--text-secondary)] pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Filter pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg outline-none focus:border-[var(--color-primary)] w-32 focus:w-44 transition-all"
                      />
                    </div>

                    {/* Card Size / Zoom Slider */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_out</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                        className="w-16 h-1 accent-[var(--color-primary)] cursor-pointer"
                        title="Adjust page thumbnail size"
                      />
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_in</span>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Clear all pages"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    </button>
                  </div>
                </div>

                {/* Selection Action Bar (Visible when pages are selected) */}
                {selectedCount > 0 && (
                  <div className="px-4 py-2 bg-[var(--color-primary)]/10 border-t border-[var(--color-primary)]/20 flex items-center justify-between flex-wrap gap-2 animate-[fadeIn_0.15s_ease-out]">
                    <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_box</span>
                      {selectedCount} {selectedCount === 1 ? 'Page Selected' : 'Pages Selected'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => rotateSelected(-90)}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Rotate Left
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateSelected(90)}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Rotate Right
                      </button>
                      <button
                        type="button"
                        onClick={deleteSelected}
                        className="btn btn-danger btn-sm text-xs py-1 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete ({selectedCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="btn btn-ghost btn-sm text-xs py-1 text-[var(--text-secondary)]"
                      >
                        Deselect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Grid of PDF Pages */}
              <div className="workspace-canvas flex-1 p-4 sm:p-6">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: getGridTemplate(),
                    gap: zoomLevel === 1 ? '0.75rem' : '1.25rem'
                  }}
                  className="w-full"
                >
                  {visibleCards.map((card) => {
                    const { uiIndex } = card;
                    const isDragging = dragIndexRef.current === uiIndex;
                    const isOver = dragOverIndex === uiIndex;

                    return (
                      <div
                        key={card.id}
                        draggable={!processing}
                        onDragStart={(e) => handleDragStart(e, uiIndex)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, uiIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, uiIndex)}
                        onClick={() => toggleSelection(uiIndex)}
                        className={`group relative flex flex-col bg-[var(--bg-primary)] border rounded-xl overflow-hidden select-none transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                          card.selected
                            ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                            : isOver
                            ? 'border-2 border-[var(--color-primary)] scale-[1.02] shadow-lg ring-2 ring-[var(--color-primary)]/20'
                            : isDragging
                            ? 'opacity-40 border-dashed border-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--color-primary)]/60'
                        }`}
                      >
                        {/* Sequence Number Badge & Checkbox */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={card.selected}
                            onChange={() => toggleSelection(uiIndex)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            #{uiIndex + 1}
                          </span>
                        </div>

                        {/* Hover Quick Action Buttons */}
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-xs p-0.5 rounded-lg shadow-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(uiIndex, 90);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Rotate Page Right 90°"
                          >
                            <span className="material-symbols-outlined text-[13px]">rotate_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePage(uiIndex);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Duplicate Page"
                          >
                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(uiIndex);
                            }}
                            className="p-1 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded transition-colors cursor-pointer"
                            title="Delete Page"
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>
                        </div>

                        {/* Page Preview Container */}
                        <div className="w-full aspect-[4/5] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                          {card.isBlank ? (
                            <div className="flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-1">
                              <span className="material-symbols-outlined text-3xl">note</span>
                              <span className="text-[10px] font-bold text-[var(--text-secondary)]">Blank Page</span>
                            </div>
                          ) : (
                            <canvas
                              ref={(el) => (canvasRefs.current[card.id] = el)}
                              style={{
                                transform: `rotate(${card.rotation || 0}deg)`,
                                transition: 'transform 0.2s ease-out'
                              }}
                              className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-xs"
                            />
                          )}
                        </div>

                        {/* Card Footer Details & Reorder Arrows */}
                        <div className="p-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={card.fileLabel}>
                              {card.fileLabel}
                            </p>
                            {card.rotation !== 0 && (
                              <p className="text-[10px] text-[var(--color-primary)] font-bold">
                                +{card.rotation}°
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={uiIndex === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(uiIndex, -1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Left"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            </button>
                            <button
                              type="button"
                              disabled={uiIndex === pageCards.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(uiIndex, 1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Right"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add More Drop Target Card */}
                  <label
                    className="flex flex-col items-center justify-center aspect-[4/5] bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-primary)] border-2 border-dashed border-[var(--border-medium)] hover:border-[var(--color-primary)] rounded-xl cursor-pointer transition-all gap-2 group p-4 text-center select-none shadow-xs"
                    title="Click or drag to add more PDF documents"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] group-hover:bg-[var(--color-primary)]/10 text-[var(--text-secondary)] group-hover:text-[var(--color-primary)] flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[24px]">add</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)]">
                      Add PDFs
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Append More Pages
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleAddFiles}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tune</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Organize Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {pageCards.length} {pageCards.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Selection & Range Filters */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Quick Selection
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="btn btn-secondary btn-sm text-xs py-1.5 justify-center"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="btn btn-secondary btn-sm text-xs py-1.5 justify-center"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={selectOdd}
                      className="btn btn-secondary btn-sm text-xs py-1.5 justify-center"
                    >
                      Odd Pages
                    </button>
                    <button
                      type="button"
                      onClick={selectEven}
                      className="btn btn-secondary btn-sm text-xs py-1.5 justify-center"
                    >
                      Even Pages
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Select Range (e.g. 1-4, 7)
                    </label>
                    <input
                      type="text"
                      placeholder="Type range and press Enter"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      onKeyDown={handleRangeSelect}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Output File Name */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="organized.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 3. Document Metrics */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Structure Overview
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Source Files</span>
                      <span className="font-bold text-[var(--text-primary)]">{files.length} documents</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Compiled Pages</span>
                      <span className="font-bold text-[var(--color-primary)]">{pageCards.length} pages</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Visible while processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Recompiling PDF...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleOrganize}
                  disabled={!pageCards.length || processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Organizing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Organize PDF</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Premium High-Fidelity Download Card                           */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Successfully Organized!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your document has been compiled and saved locally.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.blob.size)}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={() => saveAs(result.blob, result.name)}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Organize Another</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </Link>

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </Link>

                <Link
                  to="/document-viewer"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">visibility</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">View PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Inspect in viewer</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
