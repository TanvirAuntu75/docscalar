import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Trash2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

export default function RedactStudio({ file, params, onChange, nlpOp }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [redactions, setRedactions] = useState(params.boxes || []);
  const [textPatterns, setTextPatterns] = useState(params.textPatterns || []);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [hasTextLayer, setHasTextLayer] = useState(true);
  const [loading, setLoading] = useState(true);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Load PDF document on mount
  useEffect(() => {
    let active = true;
    let loadedPdf = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!active) {
          pdf.destroy();
          return;
        }
        loadedPdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);

        // Check if PDF has selectable text layer
        const firstPage = await pdf.getPage(1);
        const textContent = await firstPage.getTextContent();
        setHasTextLayer(textContent.items.length > 0);
      } catch (err) {
        console.error("Failed to load PDF in RedactStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (loadedPdf) loadedPdf.destroy();
    };
  }, [file]);

  // Synchronize internal state changes back to parent
  useEffect(() => {
    if (loading) return;
    onChange({
      boxes: redactions,
      textPatterns
    });
  }, [redactions, textPatterns, loading]);

  // Handle NLP operations directed here
  useEffect(() => {
    if (!nlpOp) return;

    if (nlpOp.addPattern) {
      const { type, value } = nlpOp.addPattern;
      // Prevent duplicates
      const exists = textPatterns.some(p => p.type === type && p.value === value);
      if (!exists) {
        setTextPatterns(prev => [...prev, { type, value }]);
      }
    } else if (nlpOp.blackoutPage !== undefined) {
      const pIdx = nlpOp.blackoutPage;
      if (pIdx >= 0 && pIdx < totalPages) {
        setActivePageIndex(pIdx);
        // Add full-page redaction box if not already there
        const exists = redactions.some(r => r.page === pIdx && r.x === 0 && r.y === 0 && r.width === 1 && r.height === 1);
        if (!exists) {
          setRedactions(prev => [...prev, {
            id: `blackout-p${pIdx}-${Date.now()}`,
            page: pIdx,
            x: 0,
            y: 0,
            width: 1,
            height: 1
          }]);
        }
      }
    }
  }, [nlpOp, totalPages]);

  // Render current page
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        drawOverlayRedactions();
      } catch (err) {
        console.error('Error rendering PDF page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex, redactions]);

  // Redraw overlays when dragging or list changes
  useEffect(() => {
    if (pdfDocument) {
      drawOverlayRedactions();
    }
  }, [isDragging, dragEnd, redactions]);

  const drawOverlayRedactions = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw saved redactions for current page
    const pageRedacts = redactions.filter(r => r.page === activePageIndex);
    pageRedacts.forEach(r => {
      const rx = r.x * overlay.width;
      const ry = r.y * overlay.height;
      const rw = r.width * overlay.width;
      const rh = r.height * overlay.height;

      // Filled semi-transparent black
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(rx, ry, rw, rh);

      // Red dashed border
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Draw temporary dragging box
    if (isDragging) {
      const rx = Math.min(dragStart.x, dragEnd.x);
      const ry = Math.min(dragStart.y, dragEnd.y);
      const rw = Math.abs(dragStart.x - dragEnd.x);
      const rh = Math.abs(dragStart.y - dragEnd.y);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  };

  // Drag-and-draw bounding boxes with subpixel coordinate scaling
  const getCanvasCoords = (e) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = overlay.width / rect.width;
    const scaleY = overlay.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setDragEnd(coords);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setDragEnd(coords);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const w = overlay.width;
    const h = overlay.height;
    if (w <= 0 || h <= 0) return;

    const x0 = Math.min(dragStart.x, dragEnd.x) / w;
    const y0 = Math.min(dragStart.y, dragEnd.y) / h;
    const x1 = Math.max(dragStart.x, dragEnd.x) / w;
    const y1 = Math.max(dragStart.y, dragEnd.y) / h;

    const rw = x1 - x0;
    const rh = y1 - y0;

    // Reject tiny clicks
    if (rw > 0.005 && rh > 0.005) {
      const newRedact = {
        id: `rect-${Math.random().toString(36).substring(7)}`,
        page: activePageIndex,
        x: x0,
        y: y0,
        width: rw,
        height: rh,
        isRatio: true
      };
      setRedactions([...redactions, newRedact]);
    }
  };

  // Keyboard navigation & quick delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActivePageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  const removeRedaction = (id) => {
    setRedactions(prev => prev.filter(r => r.id !== id));
  };

  const removePattern = (index) => {
    setTextPatterns(prev => prev.filter((_, i) => i !== index));
  };

  const addStaticPattern = (type) => {
    const exists = textPatterns.some(p => p.type === type);
    if (!exists) {
      setTextPatterns([...textPatterns, { type }]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 w-full text-slate-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary" />
        <div className="text-sm font-medium">Loading document view...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
      {/* Left Pane: PDF Viewer with Canvas overlay */}
      <div className="flex-1 flex flex-col items-center gap-4 bg-slate-950/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
        {/* Warning if scanned PDF / no text layer */}
        {!hasTextLayer && (
          <div className="w-full flex items-center gap-2 bg-yellow-950/40 border border-yellow-800/30 rounded-xl p-3 text-xs text-yellow-300">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>This document appears to be scanned. NLP pattern matching won't work — please draw boxes manually.</span>
          </div>
        )}

        <div className="relative flex-1 overflow-auto max-h-[500px] border border-white/10 rounded-xl bg-slate-900 shadow-inner flex items-center justify-center p-4">
          <div className="relative cursor-crosshair">
            <canvas ref={pdfCanvasRef} className="shadow-2xl max-w-full rounded-lg" />
            <canvas
              ref={overlayCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="absolute top-0 left-0 w-full h-full z-10 rounded-lg touch-none"
            />
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center justify-between w-full max-w-xs mt-2">
          <button
            onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
            disabled={activePageIndex === 0}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-300 font-medium">Page {activePageIndex + 1} of {totalPages}</span>
          <button
            onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={activePageIndex === totalPages - 1}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right Pane: Redaction list / Pattern selection */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Smart Patterns</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => addStaticPattern('email')}
              className="flex items-center justify-between text-xs text-slate-300 hover:text-white bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
            >
              <span>Email Addresses</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              onClick={() => addStaticPattern('phone')}
              className="flex items-center justify-between text-xs text-slate-300 hover:text-white bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
            >
              <span>Phone Numbers</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              onClick={() => addStaticPattern('ssn')}
              className="flex items-center justify-between text-xs text-slate-300 hover:text-white bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
            >
              <span>Social Security Numbers</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto max-h-[300px]">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Active Redactions</h3>
          
          {redactions.length === 0 && textPatterns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 text-center py-8">
              No active redaction rules. Draw boxes on the document page or click a pattern template.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Pattern rules */}
              {textPatterns.map((pat, idx) => (
                <div key={`pat-${idx}`} className="flex items-center justify-between bg-cyan-950/20 border border-cyan-800/20 rounded-xl p-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-cyan-300">Pattern Rule</span>
                    <span className="text-slate-400 font-mono capitalize">
                      {pat.type === 'literal' ? `"${pat.value}"` : `${pat.type}s`}
                    </span>
                  </div>
                  <button
                    onClick={() => removePattern(idx)}
                    className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Box rules */}
              {redactions.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-xl p-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-300">Manual Box</span>
                    <span className="text-slate-400 font-mono">Page {r.page + 1} — w: {Math.round(r.width * 100)}% h: {Math.round(r.height * 100)}%</span>
                  </div>
                  <button
                    onClick={() => removeRedaction(r.id)}
                    className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
