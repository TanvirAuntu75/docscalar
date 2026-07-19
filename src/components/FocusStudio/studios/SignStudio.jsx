import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PenTool, Type, Upload, RotateCcw, ShieldCheck } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

export default function SignStudio({ file, params, onChange, nlpOp }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(params.pageIndex || 0);
  const [loading, setLoading] = useState(true);

  // Signature creation states
  const [tab, setTab] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [sigColor, setSigColor] = useState('#000000');
  const [typedName, setTypedName] = useState('Your Name');
  const [selectedFont, setSelectedFont] = useState('Satisfy');
  const [signatureDataUrl, setSignatureDataUrl] = useState(params.signatureDataUrl || null);

  // Position states
  const [xPercent, setXPercent] = useState(params.xPercent ?? 0.5);
  const [yPercent, setYPercent] = useState(params.yPercent ?? 0.8);
  const [widthPercent, setWidthPercent] = useState(params.widthPercent ?? 0.25);

  const drawCanvasRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const viewerWrapperRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingSig, setIsDraggingSig] = useState(false);

  // Load cursive fonts for typing tab
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Pacifico&family=Satisfy&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

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
        console.error("Failed to load PDF in SignStudio:", err);
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (loadedPdf) loadedPdf.destroy();
    };
  }, [file]);

  // Render current page
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
        console.error("Error rendering PDF page in SignStudio:", err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex]);

  // Synchronize changes back to StitchCanvas params
  useEffect(() => {
    if (signatureDataUrl) {
      onChange({
        signatureDataUrl,
        pageIndex: activePageIndex,
        xPercent,
        yPercent,
        widthPercent
      });
    }
  }, [signatureDataUrl, activePageIndex, xPercent, yPercent, widthPercent]);

  // NLP trigger listener
  useEffect(() => {
    if (!nlpOp) return;

    if (nlpOp.placement) {
      const { vAlign, hAlign, page } = nlpOp.placement;
      if (page >= 0 && page < totalPages) setActivePageIndex(page);

      // Map alignments
      let nx = 0.5;
      let ny = 0.5;
      if (hAlign === 'left') nx = 0.2;
      else if (hAlign === 'right') nx = 0.8;

      if (vAlign === 'top') ny = 0.2;
      else if (vAlign === 'bottom') ny = 0.8;

      setXPercent(nx);
      setYPercent(ny);
    }
  }, [nlpOp, totalPages]);

  // Signature Draw Pad Logic
  const getCanvasCoords = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = drawCanvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = drawCanvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    captureCanvas();
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const captureCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  // Typable Signature Renderer
  const renderTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 600 48px ${selectedFont}`;
    ctx.fillStyle = sigColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    if (tab === 'type') {
      renderTypedSignature();
    }
  }, [typedName, selectedFont, sigColor, tab]);

  // Upload Signature logic
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureDataUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Drag Placement overlays
  const handleDragSignature = (e) => {
    if (!isDraggingSig) return;
    const container = viewerWrapperRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    setXPercent(px);
    setYPercent(py);
  };

  const handleDragEnd = () => {
    setIsDraggingSig(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
      {/* Page Viewer Grid */}
      <div className="flex-1 flex flex-col items-center gap-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading document pages...</div>
        ) : (
          <div 
            ref={viewerWrapperRef}
            onMouseMove={handleDragSignature}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            className="relative overflow-auto max-h-[500px] border border-white/10 rounded-xl bg-slate-900 shadow-inner flex items-center justify-center p-4 select-none"
          >
            <div className="relative">
              <canvas ref={pdfCanvasRef} className="shadow-2xl rounded-lg" />
              
              {/* Drag placement widget */}
              {signatureDataUrl && (
                <div
                  onMouseDown={(e) => { e.preventDefault(); setIsDraggingSig(true); }}
                  className={`absolute z-20 cursor-move border transition-shadow ${
                    isDraggingSig ? 'border-primary shadow-[0_0_15px_rgba(124,58,237,0.5)]' : 'border-dashed border-primary/60 hover:border-primary'
                  }`}
                  style={{
                    left: `${xPercent * 100}%`,
                    top: `${yPercent * 100}%`,
                    width: `${widthPercent * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                  }}
                >
                  <img src={signatureDataUrl} alt="Signature Placement" className="w-full pointer-events-none" />
                </div>
              )}
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

      {/* Editor Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* Creator panel */}
        <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex border-b border-white/5 pb-2">
            {[
              { id: 'draw', icon: PenTool, label: 'Draw' },
              { id: 'type', icon: Type, label: 'Type' },
              { id: 'upload', icon: Upload, label: 'Upload' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id === 'draw') setSignatureDataUrl(null); }}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
                  tab === t.id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Color Selector */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span>Ink Color:</span>
            <div className="flex gap-2">
              {['#000000', '#0000FF', '#FF0000'].map(color => (
                <button
                  key={color}
                  onClick={() => setSigColor(color)}
                  className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                    sigColor === color ? 'scale-110 border-white ring-1 ring-primary' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Body based on tab */}
          {tab === 'draw' && (
            <div className="flex flex-col gap-2">
              <div className="relative aspect-[5/2] w-full bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-inner">
                <canvas
                  ref={drawCanvasRef}
                  width={300}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
              <button
                onClick={clearCanvas}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl py-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Ink Pad
              </button>
            </div>
          )}

          {tab === 'type' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                placeholder="Type signature name..."
              />
              <div className="grid grid-cols-3 gap-2">
                {['Satisfy', 'Caveat', 'Pacifico'].map(font => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={`border text-[10px] py-1 rounded-lg cursor-pointer transition-colors ${
                      selectedFont === font ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 bg-slate-900/40 text-center gap-2 cursor-pointer relative hover:border-white/20 transition-colors">
              <Upload className="w-6 h-6 text-slate-400" />
              <div className="text-[10px] text-slate-300">Click to upload signature image</div>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Resize control slider */}
        {signatureDataUrl && (
          <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 text-xs font-semibold text-slate-400">
            <span>Signature Scale:</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.01"
                value={widthPercent}
                onChange={(e) => setWidthPercent(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-white w-8 text-right">{Math.round(widthPercent * 100)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2.5 mt-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Drag the signature widget on the page preview grid to adjust its exact location.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
