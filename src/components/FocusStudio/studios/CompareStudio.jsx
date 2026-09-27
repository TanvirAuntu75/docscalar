import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Split, Layers, Sparkles } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../../../utils/pdfConfig';
import { releaseCanvas, safeDestroyPdf, safeCancelRenderTask } from '../../../utils/canvasLifecycle';

export default function CompareStudio({ files, params, onChange, nlpOp }) {
  const fileA = files[0];
  const fileB = files[1];

  const [pdfA, setPdfA] = useState(null);
  const [pdfB, setPdfB] = useState(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'overlay'
  const [sliderVal, setSliderVal] = useState(50); // for overlay swipe (0-100)
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);

  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const canvasAOverlayRef = useRef(null);
  const canvasBOverlayRef = useRef(null);
  const containerRef = useRef(null);

  // Teardown canvas memory on unmount
  useEffect(() => {
    return () => {
      releaseCanvas(canvasARef.current);
      releaseCanvas(canvasBRef.current);
      releaseCanvas(canvasAOverlayRef.current);
      releaseCanvas(canvasBOverlayRef.current);
    };
  }, []);

  // Load PDF A
  useEffect(() => {
    let active = true;
    let loadedPdf = null;
    const loadA = async () => {
      if (!fileA) return;
      try {
        const arrayBuffer = await fileA.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
        if (active) {
          loadedPdf = pdf;
          setPdfA(pdf);
        } else {
          safeDestroyPdf(pdf);
        }
      } catch (err) {
        console.error("Failed to load PDF A:", err);
      }
    };
    loadA();
    return () => {
      active = false;
      safeDestroyPdf(loadedPdf);
    };
  }, [fileA]);

  // Load PDF B
  useEffect(() => {
    let active = true;
    let loadedPdf = null;
    const loadB = async () => {
      if (!fileB) return;
      try {
        const arrayBuffer = await fileB.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
        if (active) {
          loadedPdf = pdf;
          setPdfB(pdf);
        } else {
          safeDestroyPdf(pdf);
        }
      } catch (err) {
        console.error("Failed to load PDF B:", err);
      }
    };
    loadB();
    return () => {
      active = false;
      safeDestroyPdf(loadedPdf);
    };
  }, [fileB]);

  // Handle NLP triggers
  useEffect(() => {
    if (!nlpOp) return;

    if (nlpOp.jumpToPage !== undefined) {
      const pageNum = nlpOp.jumpToPage + 1;
      if (pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
      }
    }
    if (nlpOp.viewMode) {
      setViewMode(nlpOp.viewMode === 'split' ? 'side-by-side' : 'overlay');
    }
  }, [nlpOp, totalPages]);

  // Sync page counts
  useEffect(() => {
    if (pdfA && pdfB) {
      const count = Math.min(pdfA.numPages, pdfB.numPages);
      setTotalPages(count);
      setCurrentPage(1);
      setLoading(false);
    }
  }, [pdfA, pdfB]);

  // Render canvases
  useEffect(() => {
    if (!pdfA || !pdfB) return;

    let cancelled = false;
    const renderTasks = [];

    const renderCanvases = async () => {
      try {
        // Explicitly evict previous canvas buffers before allocating new viewports on page transitions
        releaseCanvas([
          canvasARef.current,
          canvasBRef.current,
          canvasAOverlayRef.current,
          canvasBOverlayRef.current
        ]);

        // Render A Page
        const pageA = await pdfA.getPage(currentPage);
        if (cancelled) return;
        const viewportA = pageA.getViewport({ scale: 0.85 });

        const canvasA = canvasARef.current;
        if (canvasA && !cancelled) {
          canvasA.width = viewportA.width;
          canvasA.height = viewportA.height;
          const ctxA = canvasA.getContext('2d');
          const taskA = pageA.render({ canvasContext: ctxA, viewport: viewportA });
          renderTasks.push(taskA);
          await taskA.promise;
        }

        const canvasAOverlay = canvasAOverlayRef.current;
        if (canvasAOverlay && !cancelled) {
          canvasAOverlay.width = viewportA.width;
          canvasAOverlay.height = viewportA.height;
          const ctxAOverlay = canvasAOverlay.getContext('2d');
          const taskAOverlay = pageA.render({ canvasContext: ctxAOverlay, viewport: viewportA });
          renderTasks.push(taskAOverlay);
          await taskAOverlay.promise;
        }

        // Render B Page
        const pageB = await pdfB.getPage(currentPage);
        if (cancelled) return;
        const viewportB = pageB.getViewport({ scale: 0.85 });

        const canvasB = canvasBRef.current;
        if (canvasB && !cancelled) {
          canvasB.width = viewportB.width;
          canvasB.height = viewportB.height;
          const ctxB = canvasB.getContext('2d');
          const taskB = pageB.render({ canvasContext: ctxB, viewport: viewportB });
          renderTasks.push(taskB);
          await taskB.promise;
        }

        const canvasBOverlay = canvasBOverlayRef.current;
        if (canvasBOverlay && !cancelled) {
          canvasBOverlay.width = viewportB.width;
          canvasBOverlay.height = viewportB.height;
          const ctxBOverlay = canvasBOverlay.getContext('2d');
          const taskBOverlay = pageB.render({ canvasContext: ctxBOverlay, viewport: viewportB });
          renderTasks.push(taskBOverlay);
          await taskBOverlay.promise;
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Error rendering compare canvases:", err);
        }
      }
    };

    renderCanvases();

    return () => {
      cancelled = true;
      safeCancelRenderTask(renderTasks);
      releaseCanvas([
        canvasARef.current,
        canvasBRef.current,
        canvasAOverlayRef.current,
        canvasBOverlayRef.current
      ]);
    };
  }, [pdfA, pdfB, currentPage, viewMode]);

  // Notify parent of state parameters
  useEffect(() => {
    if (!loading) {
      onChange({
        currentPage,
        viewMode
      });
    }
  }, [currentPage, viewMode, loading]);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const val = ((clientX - rect.left) / rect.width) * 100;
    setSliderVal(Math.max(0, Math.min(100, val)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 w-full text-slate-400">
        <Sparkles className="w-8 h-8 animate-pulse text-cyan-400 mb-2" />
        <div className="text-sm font-medium">Extracting documents for diff matching...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Header toolbars */}
      <div className="flex justify-between items-center w-full px-2">
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 border border-white/5 rounded-xl">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'side-by-side' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" /> Side-By-Side
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'overlay' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Overlay Swipe
          </button>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-4 bg-slate-900/60 px-4 py-1.5 border border-white/5 rounded-xl">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main viewer canvas viewport */}
      <div 
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className="flex-1 min-h-[350px] bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center overflow-auto relative select-none"
      >
        {viewMode === 'side-by-side' ? (
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl justify-center items-center">
            {/* PDF A */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Document A (Original)</div>
              <canvas ref={canvasARef} className="shadow-2xl rounded-lg border border-white/10" />
            </div>

            {/* PDF B */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Document B (Modified)</div>
              <canvas ref={canvasBRef} className="shadow-2xl rounded-lg border border-white/10" />
            </div>
          </div>
        ) : (
          /* Swipe overlay mode */
          <div className="relative shadow-2xl rounded-lg border border-white/10 overflow-hidden bg-slate-900" style={{ width: canvasAOverlayRef.current?.width || 'auto', height: canvasAOverlayRef.current?.height || 'auto' }}>
            {/* Canvas B at bottom */}
            <canvas ref={canvasBOverlayRef} className="block w-full h-full" />
            
            {/* Canvas A clipped overlay */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${sliderVal}%` }}
            >
              <canvas ref={canvasAOverlayRef} className="max-w-none" style={{ width: canvasBOverlayRef.current?.width, height: canvasBOverlayRef.current?.height }} />
            </div>

            {/* Slider bar indicator */}
            <div
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              className="absolute top-0 bottom-0 w-1 bg-cyan-500 cursor-ew-resize flex items-center justify-center hover:shadow-[0_0_15px_rgba(8,145,178,0.8)] transition-shadow z-30"
              style={{ left: `${sliderVal}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 text-[10px] font-extrabold select-none shadow-md">
                ↔
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
