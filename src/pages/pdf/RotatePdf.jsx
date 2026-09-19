import { useState, useEffect, useRef, useCallback } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { organizePdf } from '../../engines/pdf/organizePdf';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { formatFileSize } from '../../utils/constants';
import useSmartCropper from '../../hooks/useSmartCropper';
import { SmartCropperToolbarButton } from '../../components/SmartCropperToolbarButton';
import { detectSmartBorders, computeCleanPdfCropBox } from '../../utils/pdfZoneScanner';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RotatePdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [pageCards, setPageCards] = useState([]);
  const canvasRefs = useRef({});
  const rawCanvasCacheRef = useRef({});
  const detectionCacheRef = useRef({});

  const cropper = useSmartCropper({ totalPages: pageCards.length });

  const [zoomLevel, setZoomLevel] = useState(2); // 1 = Small, 2 = Medium, 3 = Large
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeInput, setRangeInput] = useState('');
  const [outputFileName, setOutputFileName] = useState('rotated.pdf');
  const parsedFilesCount = useRef(0);
  const fileInputRef = useRef(null);

  // Restore draft session on mount if available
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('rotate-pdf');
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
        console.warn('Rotate draft restoration failed:', err);
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
      saveStudioDraft('rotate-pdf', {
        files,
        outputFileName
      });
    }
  }, [files, outputFileName]);

  const paintThumbnailCanvas = useCallback((cardId, isCropped) => {
    const canvas = canvasRefs.current[cardId];
    const offCanvas = rawCanvasCacheRef.current[cardId];
    const det = detectionCacheRef.current[cardId];
    if (!canvas || !offCanvas) return;

    canvas.width = offCanvas.width;
    canvas.height = offCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offCanvas, 0, 0);

    if (isCropped && det?.hasScanBorders && det?.borderResult) {
      cropper.applyCanvasPreview(canvas, det.scale || 0.35, det.borderResult, det.baseViewport, true);
    }
  }, [cropper]);

  useEffect(() => {
    if (pageCards.length > 0) {
      pageCards.forEach((c) => {
        paintThumbnailCanvas(c.id, cropper.isActive);
      });
    }
  }, [cropper.isActive, pageCards.length, paintThumbnailCanvas]);

  // Load PDF and render thumbnails when file changes
  useEffect(() => {
    if (files.length === 0 || files.length < parsedFilesCount.current) {
      setPageCards([]);
      rawCanvasCacheRef.current = {};
      detectionCacheRef.current = {};
      parsedFilesCount.current = 0;
      if (files.length === 0) return;
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
            id: `page-${fileIndex}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
            fileIndex,
            originalIndex: idx,
            rotation: 0,
            selected: false,
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
          setOutputFileName(`${files[0].name.replace(/\.[^.]+$/, '')}_rotated.pdf`);
        } else {
          setOutputFileName('rotated_merged.pdf');
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

                const offCanvas = document.createElement('canvas');
                offCanvas.width = viewport.width;
                offCanvas.height = viewport.height;
                const ctx = offCanvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                rawCanvasCacheRef.current[targetCard.id] = offCanvas;

                let borderResult = null;
                let hasScanBorders = false;
                let cropBox = null;
                try {
                  borderResult = detectSmartBorders(offCanvas, viewport);
                  hasScanBorders = borderResult && borderResult.hasBlackBorders === true &&
                    (borderResult.cropTop > 0 || borderResult.cropBottom > 0 || borderResult.cropLeft > 0 || borderResult.cropRight > 0);
                  if (hasScanBorders) {
                    cropBox = computeCleanPdfCropBox(borderResult, { width: page.view[2], height: page.view[3] }, viewport.scale);
                    targetCard.hasScanBorders = true;
                    targetCard.cropBox = cropBox;
                  } else {
                    targetCard.hasScanBorders = false;
                    targetCard.cropBox = null;
                  }
                } catch (e) {
                  targetCard.hasScanBorders = false;
                  targetCard.cropBox = null;
                }

                detectionCacheRef.current[targetCard.id] = {
                  hasScanBorders,
                  cropBox,
                  borderResult,
                  scale: viewport.scale,
                  baseViewport: { width: page.view[2], height: page.view[3] }
                };

                paintThumbnailCanvas(targetCard.id, cropper.isActive || hasScanBorders);
              } catch (err) {
                console.warn(`Error rendering thumbnail for file ${item.fileIndex}, page ${i + 1}:`, err);
              }
            }
          }
          if (!isCancelled) {
            setPageCards((prev) =>
              prev.map((c) => {
                const matched = newCards.find((nc) => nc.id === c.id);
                return matched ? { ...c, hasScanBorders: matched.hasScanBorders, cropBox: matched.cropBox } : c;
              })
            );
            if (newCards.some((c) => c.hasScanBorders)) {
              cropper.activate();
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

  const toggleSelection = (idx) =>
    setPageCards((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
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

  const rotateSelected = (amount) => {
    setPageCards((prev) =>
      prev.map((c) => {
        if (!c.selected) return c;
        let newRot = (c.rotation + amount + 360) % 360;
        return { ...c, rotation: newRot };
      })
    );
  };

  const resetSelected = () => {
    setPageCards((prev) =>
      prev.map((c) => {
        if (!c.selected) return c;
        return { ...c, rotation: 0 };
      })
    );
  };

  const rotateAll = (amount) => {
    setPageCards((prev) =>
      prev.map((c) => ({
        ...c,
        rotation: (c.rotation + amount + 360) % 360
      }))
    );
  };

  const resetAllRotations = () => {
    setPageCards((prev) =>
      prev.map((c) => ({
        ...c,
        rotation: 0
      }))
    );
  };

  const handleRotate = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const fileCropBoxes = {};
      pageCards.forEach((c) => {
        if (c.cropBox && cropper.isActive) {
          if (!fileCropBoxes[c.fileIndex]) fileCropBoxes[c.fileIndex] = {};
          fileCropBoxes[c.fileIndex][c.originalIndex] = c.cropBox;
        }
      });
      const cropOptions = {
        ...cropper.getEngineOptions(),
        autoCropBlackBorders: cropper.isActive,
        smartCrop: cropper.isActive,
        fileCropBoxes,
        cleanMargin: cropper.cleanMargin || 0,
        enabledEdges: cropper.enabledEdges
      };
      const outputBlob = await organizePdf(files, pageCards, setProgress, cropOptions);
      const finalName = outputFileName.trim().endsWith('.pdf')
        ? outputFileName.trim()
        : `${outputFileName.trim()}.pdf`;

      setResult({
        blob: outputBlob,
        name: finalName || 'rotated.pdf'
      });

      try {
        await saveFile(finalName || 'rotated.pdf', outputBlob.size, 'application/pdf', 'Rotate PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

      // Clear session draft upon completion
      await clearStudioDraft('rotate-pdf');
    } catch (err) {
      setError(err.message || 'PDF rotation execution failed.');
    } finally {
      setProcessing(false);
    }
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

  const resetWorkspace = () => {
    clearStudioDraft('rotate-pdf');
    setFiles([]);
    setPageCards([]);
    setResult(null);
    setError(null);
    setProgress(0);
    parsedFilesCount.current = 0;
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
      return filename.includes(lowerQ) || pageStr.includes(lowerQ);
    });

  const selectedCount = pageCards.filter((c) => c.selected).length;
  const rotatedCount = pageCards.filter((c) => c.rotation !== 0).length;

  return (
    <ToolPageLayout
      toolId="rotate-pdf"
      title="Rotate PDF"
      description="Rotate individual pages or all pages from multiple PDFs visually."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Rotate PDF Pages Online Free (100% Local) | DocScalar"
        description="Rotate PDF pages from multiple files visually locally in your browser. Fully private, no server uploads."
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
            {/* LEFT / CENTER: Interactive Rotation Canvas Workspace                      */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative bg-[var(--bg-tertiary)]">
              {/* Sticky Workspace Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2.5 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <label className="h-8 px-3.5 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs text-xs font-semibold select-none shrink-0">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Add PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                        title=""
                        tabIndex={-1}
                      />
                    </label>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    <button
                      type="button"
                      onClick={() => rotateAll(-90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all pages left 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_left</span>
                      <span className="hidden sm:inline">Rotate All Left</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotateAll(90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all pages right 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                      <span className="hidden sm:inline">Rotate All Right</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotateAll(180)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Flip all pages 180°"
                    >
                      <span className="material-symbols-outlined text-[15px]">screen_rotation</span>
                      <span className="hidden md:inline">Flip 180°</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetAllRotations}
                      disabled={rotatedCount === 0}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Reset all rotations to 0°"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      <span className="hidden md:inline">Reset All (0°)</span>
                    </button>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />
                    <SmartCropperToolbarButton cropper={cropper} />
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
                        Rotate Left (-90°)
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateSelected(90)}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Rotate Right (+90°)
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateSelected(180)}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Flip 180°
                      </button>
                      <button
                        type="button"
                        onClick={resetSelected}
                        className="btn btn-secondary btn-sm text-xs py-1"
                      >
                        Reset to 0°
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

                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleSelection(uiIndex)}
                        className={`group relative flex flex-col bg-[var(--bg-primary)] border rounded-xl overflow-hidden select-none transition-all shadow-xs hover:shadow-md cursor-pointer ${
                          card.selected
                            ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/5'
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
                          {cropper.isActive ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cropper.revert();
                              }}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/50 shrink-0"
                              title="Smart Cropping Active — Click to restore original document"
                            >
                              <span className="material-symbols-outlined text-[11px]">check_circle</span>
                              <span>Cropped</span>
                            </button>
                          ) : card.hasScanBorders ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cropper.activate();
                              }}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/50 shrink-0"
                              title="Photocopy scan borders detected — Click to remove scan borders"
                            >
                              <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                              <span>Borders Detected</span>
                            </button>
                          ) : (
                            <div
                              className="text-[9px] font-semibold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 bg-white text-slate-600 border border-slate-200 shrink-0 select-none cursor-default"
                              title="Clean digital document: zero scan borders detected"
                            >
                              <span className="material-symbols-outlined text-[11px] text-slate-500">check_circle</span>
                              <span>Clean Page</span>
                            </div>
                          )}
                        </div>

                        {/* Hover Quick Action Buttons */}
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-xs p-0.5 rounded-lg shadow-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(uiIndex, -90);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Rotate Left 90°"
                          >
                            <span className="material-symbols-outlined text-[13px]">rotate_left</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(uiIndex, 90);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Rotate Right 90°"
                          >
                            <span className="material-symbols-outlined text-[13px]">rotate_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(uiIndex, 180);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Flip 180°"
                          >
                            <span className="material-symbols-outlined text-[13px]">screen_rotation</span>
                          </button>
                        </div>

                        {/* Page Preview Container */}
                        <div className={`w-full aspect-[4/5] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative transition-all ${
                          cropper.isActive && card.hasScanBorders ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''
                        }`}>
                          <canvas
                            ref={(el) => (canvasRefs.current[card.id] = el)}
                            style={{
                              transform: `rotate(${card.rotation || 0}deg)`,
                              transition: 'transform 0.25s ease-out'
                            }}
                            className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-xs"
                          />
                        </div>

                        {/* Card Footer Details */}
                        <div className="p-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={card.fileLabel}>
                              {card.fileLabel}
                            </p>
                          </div>
                          {card.rotation !== 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                              +{card.rotation}°
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-tertiary)]">0°</span>
                          )}
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
                      Rotate More Pages
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleAddFiles}
                      title=""
                      tabIndex={-1}
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">rotate_right</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Rotate Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {pageCards.length} {pageCards.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Quick Global Rotation Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Global Orientation
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => rotateAll(90)}
                      className="btn btn-secondary btn-sm text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">rotate_right</span>
                      <span>Right (90°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateAll(-90)}
                      className="btn btn-secondary btn-sm text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">rotate_left</span>
                      <span>Left (90°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateAll(180)}
                      className="btn btn-secondary btn-sm text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">screen_rotation</span>
                      <span>Flip (180°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetAllRotations}
                      disabled={rotatedCount === 0}
                      className="btn btn-secondary btn-sm text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Reset (0°)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Selection & Range Filters */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Selection
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

                {/* 3. Output File Name */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="rotated.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 4. Rotation Metrics Overview */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Rotation Status
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Total Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">{pageCards.length} pages</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Rotated Pages</span>
                      <span className="font-bold text-[var(--color-primary)]">{rotatedCount} pages</span>
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
                        Baking rotations...
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
                  onClick={handleRotate}
                  disabled={!pageCards.length || processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Rotating ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Rotate PDF</span>
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
                PDF Successfully Rotated!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your page orientations have been permanently baked and saved.
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
                <span>Rotate Another</span>
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
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">view_module</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reorder pages</p>
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
