import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { editPdf } from '../../engines/pdf/editPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function EditPdf() {
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

  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Editing parameters
  const [activeTool, setActiveTool] = useState('pen'); // 'pen', 'text'
  const [strokeColor, setStrokeColor] = useState('#EF4444'); // Red default
  const [thickness, setThickness] = useState(3); // Line thickness or Font size
  
  // Annotation states
  const [annotations, setAnnotations] = useState([]); // List of { id, type, pageIndex, points, xPercent, yPercent, text, color, thickness, size }
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  // Text placement state
  const [textPlacement, setTextPlacement] = useState(null); // { xPercent, yPercent }
  const [tempText, setTempText] = useState('');

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setAnnotations([]);
      setTextPlacement(null);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setProcessing(false);
      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF document. Verify it is not corrupted.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, setProcessing, setError]);

  // Render active page and overlay annotations
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const viewport = page.getViewport({ scale: 1.0 });
        
        // Size both canvases identically
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Redraw page-specific pen annotations on the overlay canvas
        redrawOverlayAnnotations();

      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex, annotations]);

  // Redraw pen annotations on top of the overlay canvas
  const redrawOverlayAnnotations = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Redraw committed pen lines
    const pageAnnos = annotations.filter(a => a.pageIndex === activePageIndex);
    pageAnnos.forEach(anno => {
      if (anno.type === 'pen') {
        const points = anno.points || [];
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = anno.color;
        ctx.lineWidth = anno.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(points[0].xPercent * overlay.width, points[0].yPercent * overlay.height);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].xPercent * overlay.width, points[i].yPercent * overlay.height);
        }
        ctx.stroke();
      } else if (anno.type === 'text') {
        ctx.fillStyle = anno.color;
        ctx.font = `bold ${anno.size}px sans-serif`;
        ctx.fillText(anno.text, anno.xPercent * overlay.width, anno.yPercent * overlay.height);
      }
    });
  };

  // Drawing Handlers
  const handleStartDraw = (e) => {
    if (activeTool !== 'pen') return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pt = {
      xPercent: x / rect.width,
      yPercent: y / rect.height
    };

    setIsDrawing(true);
    setCurrentPathPoints([pt]);
  };

  const handleDraw = (e) => {
    if (!isDrawing || activeTool !== 'pen') return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pt = {
      xPercent: x / rect.width,
      yPercent: y / rect.height
    };

    setCurrentPathPoints(prev => [...prev, pt]);

    // Live draw on overlay canvas context
    const ctx = overlay.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const lastPt = currentPathPoints[currentPathPoints.length - 1];
    if (lastPt) {
      ctx.moveTo(lastPt.xPercent * overlay.width, lastPt.yPercent * overlay.height);
      ctx.lineTo(pt.xPercent * overlay.width, pt.yPercent * overlay.height);
      ctx.stroke();
    }

    if (e.cancelable) e.preventDefault();
  };

  const handleStopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPathPoints.length > 1) {
      setAnnotations(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 5),
          type: 'pen',
          pageIndex: activePageIndex,
          points: currentPathPoints,
          color: strokeColor,
          thickness
        }
      ]);
    }
    setCurrentPathPoints([]);
  };

  // Click on canvas to place text comment
  const handleCanvasClick = (e) => {
    if (activeTool !== 'text') return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTextPlacement({
      xPercent: x / rect.width,
      yPercent: y / rect.height
    });
    setTempText('');
  };

  const commitTextAnnotation = () => {
    if (!tempText.trim() || !textPlacement) {
      setTextPlacement(null);
      return;
    }

    setAnnotations(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 5),
        type: 'text',
        pageIndex: activePageIndex,
        xPercent: textPlacement.xPercent,
        yPercent: textPlacement.yPercent,
        text: tempText,
        color: strokeColor,
        size: thickness * 4 // Map scale: thin values scale up for font size
      }
    ]);
    setTextPlacement(null);
    setTempText('');
  };

  const clearPageAnnotations = () => {
    setAnnotations(prev => prev.filter(a => a.pageIndex !== activePageIndex));
    setTextPlacement(null);
  };

  // Compile annotated PDF
  const handleSave = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await editPdf(files[0], annotations, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_edited.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Edit PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save edited PDF locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Annotation injection failed.');
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
    setPdfDocument(null);
    setTotalPages(0);
    setActivePageIndex(0);
    setAnnotations([]);
    setTextPlacement(null);
  };

  return (
    <ToolPageLayout
      toolId="edit-pdf"
      title="Edit PDF Document"
      description="Draw pen annotations or place text callouts onto document pages visually"
    >
      <SEOHead 
        title="Edit PDF Online Free — Annotate & Draw on PDF | DocForge" 
        description="Add freehand drawings, text notes, and comments to PDF pages online. 100% private client-side vector annotations injection."
      />
      
      

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              
              {/* Responsive Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'window.innerWidth > 992 ? "1fr 1.2fr" : "1fr"',
                gap: '2rem'
              }} className="lg:grid-cols-2">

                {/* Column 1: Annotation Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Editing Toolbar</div>

                  {/* Active Tool Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Choose Tool</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => { setActiveTool('pen'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'pen' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                      >
                        🖋️ Pen / Highlight
                      </button>
                      <button
                        onClick={() => setActiveTool('text')}
                        className={`btn ${activeTool === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                      >
                        🔤 Text Callout
                      </button>
                    </div>
                  </div>

                  {/* Color Palette Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ink / Text Color</label>
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      {['#EF4444', '#000000', '#2563EB', '#10B981', '#F59E0B'].map(colorCode => (
                        <button
                          key={colorCode}
                          onClick={() => setStrokeColor(colorCode)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: colorCode,
                            border: strokeColor === colorCode ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'scale 0.1s'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Thickness / Font Size Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 'bold' }}>
                        {activeTool === 'pen' ? 'Stroke Thickness' : 'Text Size scale'}
                      </span>
                      <span>{thickness}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={thickness}
                      onChange={(e) => setThickness(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={clearPageAnnotations} style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}>
                      🧹 Clear Current Page
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', lineHeight: '1.4' }}>
                    📝 <strong>Guide:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: '0', listStyleType: 'disc' }}>
                      {activeTool === 'pen' ? (
                        <li>Click/drag mouse directly on the page canvas to draw.</li>
                      ) : (
                        <li>Click on the canvas location to overlay an inline text field. Press enter to save the text.</li>
                      )}
                      <li>Annotations are drawn permanently on vector layers before download.</li>
                    </ul>
                  </div>
                </div>

                {/* Column 2: Canvas Workspace */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Sandbox Workspace</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Page {activePageIndex + 1} / {totalPages}
                    </span>
                  </div>

                  {/* Synchronized pagination list */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.35rem',
                      overflowX: 'auto',
                      paddingBottom: '0.5rem',
                      whiteSpace: 'nowrap'
                    }} className="no-scrollbar">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setActivePageIndex(idx); setTextPlacement(null); }}
                          className={`btn ${activePageIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            minWidth: '40px',
                            border: activePageIndex === idx ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)'
                          }}
                        >
                          Page {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive editor sandbox */}
                  <div 
                    ref={containerRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '1.5rem',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                      
                      {/* PDF render layer */}
                      <canvas
                        ref={pdfCanvasRef}
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: '440px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                          borderRadius: '4px',
                          pointerEvents: 'none'
                        }}
                      />

                      {/* Transparent draw/overlay interaction layer */}
                      <canvas
                        ref={overlayCanvasRef}
                        onMouseDown={handleStartDraw}
                        onMouseMove={handleDraw}
                        onMouseUp={handleStopDraw}
                        onMouseLeave={handleStopDraw}
                        onTouchStart={handleStartDraw}
                        onTouchMove={handleDraw}
                        onTouchEnd={handleStopDraw}
                        onClick={handleCanvasClick}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          cursor: activeTool === 'pen' ? 'crosshair' : 'text',
                          zIndex: 15
                        }}
                      />

                      {/* Inline text callout editor */}
                      {textPlacement && (
                        <div style={{
                          position: 'absolute',
                          left: `${textPlacement.xPercent * 100}%`,
                          top: `${textPlacement.yPercent * 100}%`,
                          transform: 'translateY(-50%)',
                          zIndex: 30,
                          display: 'flex',
                          gap: '0.25rem',
                          background: '#FFF',
                          border: '1.5px solid var(--color-primary)',
                          borderRadius: '4px',
                          padding: '2px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                          <input
                            type="text"
                            value={tempText}
                            onChange={(e) => setTempText(e.target.value)}
                            placeholder="Type here..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitTextAnnotation();
                              else if (e.key === 'Escape') setTextPlacement(null);
                            }}
                            style={{
                              border: 'none',
                              fontSize: '11px',
                              padding: '2px 4px',
                              outline: 'none',
                              color: '#000',
                              width: '110px'
                            }}
                          />
                          <button
                            onClick={commitTextAnnotation}
                            style={{ fontSize: '10px', padding: '1px 5px', color: '#white', background: 'var(--color-primary)', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                          >
                            ✓
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status">Injecting vector modifications into PDF streams... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleSave} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Injecting...' : 'Save & Compile PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Annotations Injected!</div>
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
