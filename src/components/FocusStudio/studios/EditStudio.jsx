import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Type, Highlighter, PenTool, Square, Circle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

export default function EditStudio({ file, params, onChange, nlpOp }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit Mode state
  const [tool, setTool] = useState('text'); // 'text' | 'pen' | 'highlight' | 'rect' | 'circle'
  const [color, setColor] = useState('#FF0000');
  const [thickness, setThickness] = useState(3);
  const [fontSize, setFontSize] = useState(14);
  const [inputText, setInputText] = useState('DRAFT');

  // List of active annotations
  const [annotations, setAnnotations] = useState(params.overlays || []);

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [startPoint, setStartPoint] = useState({ xPercent: 0, yPercent: 0 });

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Load PDF
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
      } catch (err) {
        console.error("Failed to load PDF in EditStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (loadedPdf) loadedPdf.destroy();
    };
  }, [file]);

  // Render Page preview
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

        drawOverlayAnnotations();
      } catch (err) {
        console.error("Error rendering PDF page in EditStudio:", err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex, annotations]);

  // Redraw when drawing states change
  useEffect(() => {
    if (pdfDocument) {
      drawOverlayAnnotations();
    }
  }, [isDrawing, currentPoints, startPoint]);

  // Sync edits back to StitchCanvas params
  useEffect(() => {
    if (loading) return;
    onChange({
      overlays: annotations
    });
  }, [annotations, loading]);

  // Draw annotations on the canvas layer
  const drawOverlayAnnotations = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const w = overlay.width;
    const h = overlay.height;

    // Render completed page annotations
    const pageAnnos = annotations.filter(a => a.pageIndex === activePageIndex);
    pageAnnos.forEach(a => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = a.thickness || 2;

      if (a.type === 'pen' || a.type === 'highlight') {
        if (a.type === 'highlight') {
          ctx.strokeStyle = convertHexToRgba(a.color, 0.4);
          ctx.lineWidth = 14;
        }
        ctx.beginPath();
        const pts = a.points || [];
        pts.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.xPercent * w, pt.yPercent * h);
          else ctx.lineTo(pt.xPercent * w, pt.yPercent * h);
        });
        ctx.stroke();
      } else if (a.type === 'shape') {
        const sx = a.startPt.xPercent * w;
        const sy = a.startPt.yPercent * h;
        const ex = a.endPt.xPercent * w;
        const ey = a.endPt.yPercent * h;

        if (a.shapeType === 'rectangle') {
          ctx.strokeRect(sx, sy, ex - sx, ey - sy);
        } else if (a.shapeType === 'circle') {
          ctx.beginPath();
          const rx = Math.abs(ex - sx) / 2;
          const ry = Math.abs(ey - sy) / 2;
          ctx.ellipse(sx + rx, sy + ry, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else if (a.type === 'text') {
        ctx.font = `${a.size || 14}px sans-serif`;
        ctx.fillText(a.text, a.xPercent * w, a.yPercent * h);
      }
    });

    // Draw active drawing shape preview
    if (isDrawing) {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      
      if (tool === 'pen' || tool === 'highlight') {
        if (tool === 'highlight') {
          ctx.strokeStyle = convertHexToRgba(color, 0.45);
          ctx.lineWidth = 14;
        }
        ctx.beginPath();
        currentPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.xPercent * w, pt.yPercent * h);
          else ctx.lineTo(pt.xPercent * w, pt.yPercent * h);
        });
        ctx.stroke();
      } else if (tool === 'rect' || tool === 'circle') {
        const sx = startPoint.xPercent * w;
        const sy = startPoint.yPercent * h;
        const ex = currentPoints[currentPoints.length - 1]?.xPercent * w || sx;
        const ey = currentPoints[currentPoints.length - 1]?.yPercent * h || sy;

        if (tool === 'rect') {
          ctx.strokeRect(sx, sy, ex - sx, ey - sy);
        } else if (tool === 'circle') {
          ctx.beginPath();
          const rx = Math.abs(ex - sx) / 2;
          const ry = Math.abs(ey - sy) / 2;
          ctx.ellipse(sx + rx, sy + ry, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
  };

  const convertHexToRgba = (hex, alpha) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : hex;
  };

  // Drawing event triggers
  const getCoords = (e) => {
    const overlay = overlayCanvasRef.current;
    const rect = overlay.getBoundingClientRect();
    return {
      xPercent: (e.clientX - rect.left) / rect.width,
      yPercent: (e.clientY - rect.top) / rect.height
    };
  };

  const handleMouseDown = (e) => {
    const pt = getCoords(e);
    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoints([pt]);

    if (tool === 'text') {
      const newTextAnno = {
        id: `text-${Math.random().toString(36).substring(7)}`,
        type: 'text',
        pageIndex: activePageIndex,
        xPercent: pt.xPercent,
        yPercent: pt.yPercent,
        text: inputText,
        size: fontSize,
        color
      };
      setAnnotations([...annotations, newTextAnno]);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pt = getCoords(e);
    setCurrentPoints(prev => [...prev, pt]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const endPoint = currentPoints[currentPoints.length - 1];
    if (!endPoint) return;

    if (tool === 'pen' || tool === 'highlight') {
      const newAnno = {
        id: `pen-${Math.random().toString(36).substring(7)}`,
        type: tool,
        pageIndex: activePageIndex,
        points: currentPoints,
        color,
        thickness: tool === 'highlight' ? 12 : thickness,
        opacity: tool === 'highlight' ? 0.4 : 1.0
      };
      setAnnotations([...annotations, newAnno]);
    } else if (tool === 'rect' || tool === 'circle') {
      const newAnno = {
        id: `shape-${Math.random().toString(36).substring(7)}`,
        type: 'shape',
        shapeType: tool === 'rect' ? 'rectangle' : 'circle',
        pageIndex: activePageIndex,
        startPt: startPoint,
        endPt: endPoint,
        color,
        thickness
      };
      setAnnotations([...annotations, newAnno]);
    }

    setCurrentPoints([]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
      {/* Visual Canvas Panel */}
      <div className="flex-1 flex flex-col items-center gap-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading document editor...</div>
        ) : (
          <div className="relative overflow-auto max-h-[500px] border border-white/10 rounded-xl bg-slate-900 shadow-inner flex items-center justify-center p-4">
            <div className="relative">
              <canvas ref={pdfCanvasRef} className="shadow-2xl rounded-lg" />
              <canvas
                ref={overlayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="absolute top-0 left-0 w-full h-full z-10 rounded-lg cursor-crosshair"
              />
            </div>
          </div>
        )}

        {/* Page Nav */}
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

      {/* Editor Controls sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Drawing Tools</h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'text', label: 'T', icon: Type },
              { id: 'pen', label: 'Draw', icon: PenTool },
              { id: 'highlight', label: 'Highlight', icon: Highlighter },
              { id: 'rect', label: 'Rect', icon: Square },
              { id: 'circle', label: 'Circle', icon: Circle }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  tool === t.id ? 'bg-primary text-white' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                }`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Type tools settings */}
          {tool === 'text' && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stamp Text Content</span>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Font Size</span>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Color palette */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stroke Color</span>
            <div className="flex gap-2">
              {['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFFFFF', '#000000'].map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                    color === c ? 'scale-110 border-white ring-1 ring-primary' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Line weight slider */}
          {tool !== 'text' && (
            <div className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
              <span>Stroke Thickness:</span>
              <input
                type="range"
                min="1"
                max="15"
                value={thickness}
                onChange={(e) => setThickness(parseInt(e.target.value))}
                className="w-full accent-primary h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Annotations lists */}
        {annotations.length > 0 && (
          <div className="flex-1 bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto max-h-[220px]">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Overlays</h3>
              <button
                onClick={() => setAnnotations([])}
                className="text-[10px] text-slate-400 hover:text-red-400 cursor-pointer"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {annotations.map((a, i) => (
                <div key={a.id || i} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-xs text-slate-300">
                  <span className="capitalize">{a.type} (Page {a.pageIndex + 1})</span>
                  <button
                    onClick={() => setAnnotations(prev => prev.filter(x => x.id !== a.id))}
                    className="text-slate-500 hover:text-red-400 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
