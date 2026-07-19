import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Crop, Maximize } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

export default function CropStudio({ file, params, onChange, nlpOp }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Crop rectangle bounding box coordinates in percentage (0 to 1)
  const [cropBounds, setCropBounds] = useState({
    x: params.xPercent ?? 0.1,
    y: params.yPercent ?? 0.1,
    width: params.widthPercent ?? 0.8,
    height: params.heightPercent ?? 0.8
  });

  const [applyToAll, setApplyToAll] = useState(true);
  const [dragHandle, setDragHandle] = useState(null); // 'nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w', 'move'
  const dragStart = useRef({ x: 0, y: 0, box: {} });

  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);

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
        console.error("Failed to load PDF in CropStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (loadedPdf) loadedPdf.destroy();
    };
  }, [file]);

  // Render current page preview
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error("Error rendering PDF page in CropStudio:", err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex]);

  // Sync parameters back to parent StitchCanvas operator
  useEffect(() => {
    // Convert percentage ratios to PDF coordinate space points
    // Standard PDF page is letter/A4 (~595 x 842 points)
    // When executing, cropPdf engine takes exact points
    const canvas = pdfCanvasRef.current;
    const w = canvas ? canvas.width : 595;
    const h = canvas ? canvas.height : 842;

    onChange({
      x: cropBounds.x * w,
      y: cropBounds.y * h,
      width: cropBounds.width * w,
      height: cropBounds.height * h,
      xPercent: cropBounds.x,
      yPercent: cropBounds.y,
      widthPercent: cropBounds.width,
      heightPercent: cropBounds.height,
      applyToAll
    });
  }, [cropBounds, applyToAll]);

  // Drag handles controller
  const handlePointerDown = (handle, e) => {
    e.preventDefault();
    setDragHandle(handle);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBounds }
    };
  };

  const handlePointerMove = (e) => {
    if (!dragHandle || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.x) / rect.width;
    const dy = (e.clientY - dragStart.current.y) / rect.height;

    const box = dragStart.current.box;
    const next = { ...box };

    if (dragHandle === 'move') {
      next.x = Math.max(0, Math.min(1 - box.width, box.x + dx));
      next.y = Math.max(0, Math.min(1 - box.height, box.y + dy));
    } else {
      if (dragHandle.includes('w')) {
        const newX = Math.max(0, Math.min(box.x + box.width - 0.05, box.x + dx));
        next.width = box.x + box.width - newX;
        next.x = newX;
      }
      if (dragHandle.includes('e')) {
        next.width = Math.max(0.05, Math.min(1 - box.x, box.width + dx));
      }
      if (dragHandle.includes('n')) {
        const newY = Math.max(0, Math.min(box.y + box.height - 0.05, box.y + dy));
        next.height = box.y + box.height - newY;
        next.y = newY;
      }
      if (dragHandle.includes('s')) {
        next.height = Math.max(0.05, Math.min(1 - box.y, box.height + dy));
      }
    }

    setCropBounds(next);
  };

  const handlePointerUp = () => {
    setDragHandle(null);
  };

  const handleResetCrop = () => {
    setCropBounds({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
      {/* Viewer Panel */}
      <div 
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        className="flex-1 flex flex-col items-center gap-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden select-none"
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading document pages...</div>
        ) : (
          <div className="relative overflow-auto max-h-[500px] border border-white/10 rounded-xl bg-slate-900 shadow-inner flex items-center justify-center p-4">
            <div className="relative" ref={overlayRef}>
              <canvas ref={pdfCanvasRef} className="shadow-2xl rounded-lg" />
              
              {/* Crop box overlay */}
              <div
                className="absolute border border-cyan-500 bg-cyan-500/10 shadow-[0_0_10px_rgba(8,145,178,0.2)] rounded"
                style={{
                  left: `${cropBounds.x * 100}%`,
                  top: `${cropBounds.y * 100}%`,
                  width: `${cropBounds.width * 100}%`,
                  height: `${cropBounds.height * 100}%`
                }}
              >
                {/* Drag inside box to move */}
                <div
                  onMouseDown={(e) => handlePointerDown('move', e)}
                  className="w-full h-full cursor-move"
                />

                {/* Corner Resizing points */}
                <div onMouseDown={(e) => handlePointerDown('nw', e)} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-nwse-resize" />
                <div onMouseDown={(e) => handlePointerDown('ne', e)} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-nesw-resize" />
                <div onMouseDown={(e) => handlePointerDown('se', e)} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-nwse-resize" />
                <div onMouseDown={(e) => handlePointerDown('sw', e)} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-nesw-resize" />

                {/* Side Resizing points */}
                <div onMouseDown={(e) => handlePointerDown('n', e)} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-ns-resize" />
                <div onMouseDown={(e) => handlePointerDown('e', e)} className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-ew-resize" />
                <div onMouseDown={(e) => handlePointerDown('s', e)} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-ns-resize" />
                <div onMouseDown={(e) => handlePointerDown('w', e)} className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-slate-950 rounded-full cursor-ew-resize" />
              </div>
            </div>
          </div>
        )}

        {/* Page navigation */}
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
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Crop Options</h3>
          
          <label className="flex items-center gap-3 text-xs font-semibold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-4 h-4 accent-primary rounded bg-slate-900 border-white/10"
            />
            <span>Apply Crop to All Pages</span>
          </label>

          <button
            onClick={handleResetCrop}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl py-2 cursor-pointer transition-colors"
          >
            <Maximize className="w-3.5 h-3.5" /> Full Page (Reset)
          </button>
        </div>

        {/* Diagnostic dimensions display */}
        <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Left Margin:</span>
            <span className="font-mono text-white">{Math.round(cropBounds.x * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Top Margin:</span>
            <span className="font-mono text-white">{Math.round(cropBounds.y * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Crop Width:</span>
            <span className="font-mono text-white">{Math.round(cropBounds.width * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Crop Height:</span>
            <span className="font-mono text-white">{Math.round(cropBounds.height * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
