import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, RotateCcw, Trash2, Copy, RefreshCw, Undo, ArrowLeftRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../../utils/pdfConfig';
import { releaseCanvas, safeDestroyPdf, safeCancelRenderTask } from '../../../utils/canvasLifecycle';
import { computeThumbnailViewport } from '../../../utils/thumbnailHelper';
import { useVisibilityObserver } from '../../../utils/viewportVirtualizer';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Individual Page Card Component to isolate canvas rendering lifecycle
function PageCard({ card, idx, pdfDoc, onRotate, onDelete, onDuplicate, onDragStart, onDragOver, onDrop }) {
  const [cardRef, isVisible] = useVisibilityObserver({ rootMargin: '200px', threshold: 0.01 });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !isVisible) {
      // Offscreen or doc missing: guarantee canvas context and backing bitmap release
      releaseCanvas(canvasRef.current);
      return;
    }
    let isCancelled = false;
    let renderTask = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(card.originalIndex + 1);
        if (isCancelled) return;
        const viewport = computeThumbnailViewport(page, { targetWidth: 160, maxDpr: 2 });
        const canvas = canvasRef.current;
        if (canvas && !isCancelled) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          renderTask = page.render({ canvasContext: ctx, viewport });
          await renderTask.promise;
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Failed to render canvas preview for page index ${card.originalIndex}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      safeCancelRenderTask(renderTask);
      releaseCanvas(canvasRef.current);
    };
  }, [pdfDoc, card.originalIndex, isVisible]);

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, idx)}
      className="relative bg-white border border-orange-100 rounded-xl p-2 select-none cursor-grab active:cursor-grabbing hover:border-orange-500/80 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(249,115,22,0.12)] transition-all duration-300 group flex flex-col items-center justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
    >
      {/* Thumbnail Canvas Preview with CSS Rotation or Skeleton Placeholder */}
      <div className="relative aspect-[3/4] w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[140px]">
        {isVisible ? (
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '92%',
              maxHeight: '92%',
              width: 'auto',
              height: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 0 10px rgba(249,115,22,0.05)',
              borderRadius: '6px',
              transform: `rotate(${card.rotation}deg)`,
              transition: 'transform 0.25s ease-in-out',
              objectFit: 'contain'
            }}
            className="pointer-events-none"
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center bg-slate-50/80 text-slate-300 animate-pulse select-none"
            data-testid="page-skeleton"
            aria-label={`Page ${card.originalIndex + 1} skeleton placeholder`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200/70 mb-2 flex items-center justify-center text-slate-400 font-medium text-xs">
              {card.originalIndex + 1}
            </div>
            <div className="w-16 h-2 rounded bg-slate-200/60" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-orange-500 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold z-10 shadow-sm">
          P. {card.originalIndex + 1}
        </div>
      </div>

      {/* Footer Info and Hover Tools */}
      <div className="flex items-center justify-between w-full text-slate-500 text-xs px-1">
        <span className="font-semibold text-slate-700">
          Pos {idx + 1}
          {card.rotation !== 0 && (
            <span className="text-orange-500 ml-1">({card.rotation > 0 ? `+${card.rotation}` : card.rotation}°)</span>
          )}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRotate(card.id, -90)}
            className="p-1 rounded bg-slate-100 hover:bg-orange-500 text-slate-600 hover:text-white border border-slate-200/50 cursor-pointer"
            title="Rotate -90°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRotate(card.id, 90)}
            className="p-1 rounded bg-slate-100 hover:bg-orange-500 text-slate-600 hover:text-white border border-slate-200/50 cursor-pointer"
            title="Rotate +90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(card.id)}
            className="p-1 rounded bg-slate-100 hover:bg-orange-500 text-slate-600 hover:text-white border border-slate-200/50 cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 rounded bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200/50 cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrganizeStudio({ file, params, onChange, nlpOp }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCards, setPageCards] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const dragIndexRef = useRef(null);

  // Load PDF document and initial page mappings
  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setPageCards([]);
      return;
    }

    let active = true;
    let loadedPdf = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setPdfDoc(null);
        setPageCards([]);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
        if (!active) {
          safeDestroyPdf(pdf);
          return;
        }
        loadedPdf = pdf;
        setPdfDoc(pdf);
        const count = pdf.numPages;
        const initialCards = Array.from({ length: count }, (_, idx) => ({
          id: `page-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          originalIndex: idx,
          rotation: 0
        }));
        setPageCards(initialCards);
        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize PDF structure in OrganizeStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      safeDestroyPdf(loadedPdf);
    };
  }, [file]);

  // Sync state changes back to StitchCanvas workflow parameters
  useEffect(() => {
    if (loading) return;
    onChange({
      pageConfigs: pageCards.map((c) => ({
        originalIndex: c.originalIndex,
        rotation: c.rotation
      }))
    });
  }, [pageCards, loading]);

  // Handle NLP prompt compiled operations
  useEffect(() => {
    if (!nlpOp) return;

    if (nlpOp.moveOp) {
      const { from, to } = nlpOp.moveOp;
      if (from >= 0 && from < pageCards.length && to >= 0 && to < pageCards.length) {
        setPageCards(prev => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      }
    } else if (nlpOp.deleteOp) {
      const { pageIndex } = nlpOp.deleteOp;
      if (pageIndex >= 0 && pageIndex < pageCards.length) {
        const item = pageCards[pageIndex];
        setPageCards(prev => prev.filter((_, idx) => idx !== pageIndex));
        setTrash(prev => [...prev, item]);
      }
    } else if (nlpOp.rotateOp) {
      const { pageIndex, angle } = nlpOp.rotateOp;
      if (pageIndex >= 0 && pageIndex < pageCards.length) {
        setPageCards(prev => prev.map((c, idx) => {
          if (idx !== pageIndex) return c;
          const currentRotation = c.rotation;
          const rotateDelta = angle || 90;
          return { ...c, rotation: (currentRotation + rotateDelta) % 360 };
        }));
      }
    }
  }, [nlpOp]);

  // Drag and Drop reordering logic
  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e) => {
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

  // Individual Actions
  const handleRotate = (id, direction = 90) => {
    setPageCards(prev => prev.map(c => {
      if (c.id === id) {
        let newRotation = (c.rotation + direction) % 360;
        if (newRotation < 0) newRotation += 360;
        return { ...c, rotation: newRotation };
      }
      return c;
    }));
  };

  const handleDelete = (id) => {
    const item = pageCards.find(c => c.id === id);
    setPageCards(prev => prev.filter(c => c.id !== id));
    if (item) setTrash(prev => [...prev, item]);
  };

  const handleDuplicate = (id) => {
    const item = pageCards.find(c => c.id === id);
    if (!item) return;
    const duplicatedItem = {
      ...item,
      id: `dup-${item.id}-${Date.now()}`
    };
    const index = pageCards.findIndex(c => c.id === id);
    setPageCards(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicatedItem);
      return next;
    });
  };

  const handleRestore = (item) => {
    setTrash(prev => prev.filter(c => c.id !== item.id));
    setPageCards(prev => [...prev, item]);
  };

  // Bulk Actions
  const handleRotateAll = (direction = 90) => {
    setPageCards(prev => prev.map(c => {
      let newRotation = (c.rotation + direction) % 360;
      if (newRotation < 0) newRotation += 360;
      return { ...c, rotation: newRotation };
    }));
  };

  const handleReverseAll = () => {
    setPageCards(prev => [...prev].reverse());
  };

  const handleResetAll = () => {
    if (!pdfDoc) return;
    const count = pdfDoc.numPages;
    const initialCards = Array.from({ length: count }, (_, idx) => ({
      id: `page-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      originalIndex: idx,
      rotation: 0
    }));
    setPageCards(initialCards);
    setTrash([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 w-full text-slate-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary" />
        <div className="text-sm font-medium font-sans">Extracting PDF pages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Top Bulk Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-orange-100 pb-3">
        <button
          onClick={() => handleRotateAll(90)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 border border-slate-200/50 text-slate-700 hover:text-orange-600 text-xs font-semibold cursor-pointer transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5 text-orange-500" />
          Rotate All +90°
        </button>
        <button
          onClick={() => handleRotateAll(-90)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 border border-slate-200/50 text-slate-700 hover:text-orange-600 text-xs font-semibold cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
          Rotate All -90°
        </button>
        <button
          onClick={handleReverseAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 border border-slate-200/50 text-slate-700 hover:text-orange-600 text-xs font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500" />
          Reverse Order
        </button>
        <button
          onClick={handleResetAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 border border-slate-200/50 text-slate-700 hover:text-orange-600 text-xs font-semibold cursor-pointer transition-colors ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Reset All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-[300px]">
        {pageCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-orange-200/60 bg-orange-50/5 rounded-2xl text-slate-400 gap-2">
            <div className="font-sans text-sm">All pages deleted. Use the trash panel below to restore them.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 bg-orange-50/15 border border-orange-100/50 rounded-2xl p-5">
            {pageCards.map((card, idx) => (
              <PageCard
                key={card.id}
                card={card}
                idx={idx}
                pdfDoc={pdfDoc}
                onRotate={handleRotate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trash / Deleted pages bin drawer */}
      {trash.length > 0 && (
        <div className="border-t border-orange-100 pt-4 mt-auto">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
            <Trash2 className="w-4 h-4 text-orange-500" /> Deleted Pages Bin ({trash.length})
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 pr-2">
            <AnimatePresence>
              {trash.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex-shrink-0 relative w-20 bg-white border border-slate-200 rounded-lg p-1.5 group hover:border-orange-300 transition-colors flex flex-col items-center gap-2"
                >
                  <div className="relative aspect-[3/4] w-full bg-slate-100 rounded-md overflow-hidden flex items-center justify-center opacity-60">
                    <div className="absolute inset-0 bg-slate-800/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(t)}
                    className="flex items-center justify-center gap-1 w-full text-[10px] text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 border border-orange-200/40 rounded py-0.5 cursor-pointer font-medium font-sans transition-colors"
                  >
                    <Undo className="w-2.5 h-2.5" /> Restore
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
