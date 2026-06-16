import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { signPdf } from '../../engines/pdf/signPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function SignPdf() {
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

  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);

  // Signature creation state
  const [sigMode, setSigMode] = useState('draw'); // 'draw', 'type', 'upload'
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  
  // Signature settings
  const [sigColor, setSigColor] = useState('#000000'); // Ink color
  const [typedName, setTypedName] = useState('John Doe');
  const [fontFamily, setFontFamily] = useState('Satisfy'); // 'Satisfy', 'Caveat', 'Pacifico'
  
  // Canvas drawing ref
  const drawingCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Placement positioning state
  const [xPercent, setXPercent] = useState(0.5); // Center relative X (0.0 to 1.0)
  const [yPercent, setYPercent] = useState(0.5); // Center relative Y (0.0 to 1.0)
  const [widthPercent, setWidthPercent] = useState(0.25); // Scale of PDF page width
  const [sigAspectRatio, setSigAspectRatio] = useState(2.5); // Width/Height

  const pageContainerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load Google Fonts for handwritten script styles
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Pacifico&family=Satisfy&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Clean up signature preview URLs
  useEffect(() => {
    return () => {
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    };
  }, [signatureUrl]);

  // Load PDF document when file changes
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setPdfDocument(null);
      setActivePageIndex(0);
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
          setError('Failed to parse PDF document. Please verify it is not password-protected or corrupted.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, setProcessing, setError]);

  // Render active page in main preview canvas
  useEffect(() => {
    if (!pdfDocument) return;

    const renderActivePage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;

        // Render at a decent resolution for editing
        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Error rendering active PDF page:', err);
      }
    };
    renderActivePage();
  }, [pdfDocument, activePageIndex]);

  // Drawing Pad Canvas Event Handlers
  const startDrawing = (e) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get mouse/touch coordinates
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Prevent scrolling on touch devices while drawing
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convert canvas drawing to PNG Blob
  const saveDrawnSignature = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    // Check if canvas has drawing content (not fully transparent)
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imgData.data.some(channel => channel !== 0);

    if (!hasDrawing) {
      setError('Please draw something on the signature pad first.');
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
      setSignatureBlob(blob);
      setSignatureUrl(URL.createObjectURL(blob));
      setSigAspectRatio(canvas.width / canvas.height);
      setError(null);
    }, 'image/png');
  };

  // Generate Typed text signature image
  const saveTypedSignature = () => {
    if (!typedName.trim()) {
      setError('Please enter a name for the signature.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Transparent background, colored signature text
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = sigColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSetting = '48px Satisfy';
    if (fontFamily === 'Caveat') fontSetting = '58px Caveat';
    else if (fontFamily === 'Pacifico') fontSetting = '42px Pacifico';

    ctx.font = fontSetting;
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
      setSignatureBlob(blob);
      setSignatureUrl(URL.createObjectURL(blob));
      setSigAspectRatio(canvas.width / canvas.height);
      setError(null);
    }, 'image/png');
  };

  // Handle local image upload as signature
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const img = new Image();
    const localUrl = URL.createObjectURL(file);
    img.onload = () => {
      setSigAspectRatio(img.width / img.height);
      fetch(localUrl)
        .then(res => res.blob())
        .then(blob => {
          setSignatureBlob(blob);
          if (signatureUrl) URL.revokeObjectURL(signatureUrl);
          setSignatureUrl(URL.createObjectURL(blob));
          setError(null);
        });
    };
    img.src = localUrl;
  };

  // Handle Dragging signature overlay
  const handleDragStart = (e) => {
    setIsDragging(true);
    if (e.cancelable) e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const container = pageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Clamp coordinates to bounds of the page preview container
    const relativeX = Math.max(0, Math.min(x / rect.width, 1));
    const relativeY = Math.max(0, Math.min(y / rect.height, 1));

    setXPercent(relativeX);
    setYPercent(relativeY);

    if (e.cancelable) e.preventDefault();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Run signing engine
  const handleSign = async () => {
    if (!files.length) return;
    if (!signatureBlob) {
      setError('Please create or upload a signature first.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const options = {
        signaturePngBlob: signatureBlob,
        pageIndex: activePageIndex,
        xPercent,
        yPercent,
        widthPercent
      };

      const outputBlob = await signPdf(files[0], options, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_signed.pdf';
      
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB local cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Sign PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save signed file locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Signature placement failed.');
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
    setTotalPages(0);
    setActivePageIndex(0);
    setPdfDocument(null);
    setSignatureBlob(null);
    setSignatureUrl(null);
    clearDrawing();
    setXPercent(0.5);
    setYPercent(0.5);
    setWidthPercent(0.25);
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Sign PDF Online Free — Place Signature on PDF | DocForge" 
        description="Create your electronic signature (draw, type, or upload) and visually place it on any page of your PDF file completely client-side."
      />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="sign-pdf" size={48} />
        </div>
        <h1>Sign PDF</h1>
        <p className="tool-page-subtitle">Electronically sign your PDF document by drawing, typing, or uploading a signature</p>
      </div>

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

                {/* Column 1: Signature Builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">1. Create Your Signature</div>

                  {/* Mode tabs */}
                  <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px' }}>
                    {['draw', 'type', 'upload'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { setSigMode(mode); setError(null); }}
                        className={`btn ${sigMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', border: 'none', background: sigMode === mode ? 'var(--color-primary)' : 'transparent', color: sigMode === mode ? '#fff' : 'var(--text-secondary)' }}
                      >
                        {mode === 'draw' ? '🖋️ Draw' : mode === 'type' ? '🔤 Type' : '📤 Upload'}
                      </button>
                    ))}
                  </div>

                  {/* Settings based on mode */}
                  {sigMode === 'draw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Draw Signature</label>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {['#000000', '#1D4ED8', '#B91C1C'].map(c => (
                            <button
                              key={c}
                              onClick={() => setSigColor(c)}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: c,
                                border: sigColor === c ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ position: 'relative', background: '#FFFFFF', border: '2px dashed var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                        <canvas
                          ref={drawingCanvasRef}
                          width={400}
                          height={160}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          style={{ display: 'block', width: '100%', height: '160px', cursor: 'crosshair', background: '#FFFFFF' }}
                        />
                        {/* Signing line */}
                        <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: '30px', height: '1px', background: '#E5E7EB', pointerEvents: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={clearDrawing} style={{ flex: 1, padding: '0.55rem' }}>Clear Pad</button>
                        <button className="btn btn-primary" onClick={saveDrawnSignature} style={{ flex: 1, padding: '0.55rem' }}>Confirm Signature</button>
                      </div>
                    </div>
                  )}

                  {sigMode === 'type' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Type Your Name</label>
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.8rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Font Style</label>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {['#000000', '#1D4ED8', '#B91C1C'].map(c => (
                            <button
                              key={c}
                              onClick={() => setSigColor(c)}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: c,
                                border: sigColor === c ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        {['Satisfy', 'Caveat', 'Pacifico'].map((font) => (
                          <button
                            key={font}
                            onClick={() => setFontFamily(font)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.5rem 0.25rem',
                              fontFamily: font,
                              fontSize: '1.05rem',
                              border: fontFamily === font ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                              background: fontFamily === font ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)'
                            }}
                          >
                            {typedName || 'Signature'}
                          </button>
                        ))}
                      </div>

                      <button className="btn btn-primary" onClick={saveTypedSignature} style={{ marginTop: '0.5rem', padding: '0.6rem' }}>
                        Confirm Typed Signature
                      </button>
                    </div>
                  )}

                  {sigMode === 'upload' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Upload Signature Image</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageUpload}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        💡 Recommend drawing on clean white paper and photographing or using a transparent PNG.
                      </span>
                    </div>
                  )}

                  {/* Active Signature Info */}
                  {signatureUrl && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '1rem',
                      background: 'rgba(16, 185, 129, 0.04)',
                      border: '1.5px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '8px',
                      alignItems: 'center',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-success-light)', fontWeight: 'bold' }}>
                        Active Signature Loaded
                      </span>
                      <img
                        src={signatureUrl}
                        alt="Active Electronic Signature"
                        style={{
                          maxHeight: '60px',
                          maxWidth: '80%',
                          objectFit: 'contain',
                          background: '#FFF',
                          padding: '4px',
                          borderRadius: '4px',
                          border: '1px solid #E5E7EB'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Column 2: Visual Placement & Page Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. Position Signature</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Page {activePageIndex + 1} / {totalPages}
                    </span>
                  </div>

                  {/* Page index buttons row */}
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
                          onClick={() => setActivePageIndex(idx)}
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

                  {/* The interactive signature overlay sandbox */}
                  <div 
                    ref={pageContainerRef}
                    onMouseMove={handleDragMove}
                    onTouchMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onTouchEnd={handleDragEnd}
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
                      <canvas
                        ref={pdfCanvasRef}
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: '450px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                          borderRadius: '4px',
                          pointerEvents: 'none'
                        }}
                      />

                      {/* Floating overlay signature representing active signature placement */}
                      {signatureUrl && (
                        <div
                          onMouseDown={handleDragStart}
                          onTouchStart={handleDragStart}
                          style={{
                            position: 'absolute',
                            left: `${xPercent * 100}%`,
                            top: `${yPercent * 100}%`,
                            width: `${widthPercent * 100}%`,
                            // height dynamically derived via aspect ratio of signature png
                            aspectRatio: sigAspectRatio,
                            transform: 'translate(-50%, -50%)',
                            border: isDragging ? '1.5px solid var(--color-primary)' : '1.5px dashed var(--color-primary)',
                            background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.03)',
                            borderRadius: '4px',
                            cursor: 'move',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 20,
                            touchAction: 'none'
                          }}
                        >
                          <img
                            src={signatureUrl}
                            alt="place signature"
                            style={{
                              width: '90%',
                              height: '90%',
                              objectFit: 'contain',
                              pointerEvents: 'none'
                            }}
                          />
                          
                          {/* Anchor tooltip indicator */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-20px',
                            background: 'var(--color-primary)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: '600',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                          }}>
                            Drag to Position
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Size (Scale) Slider */}
                  {signatureUrl && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 'bold' }}>Signature Scale Width</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{Math.round(widthPercent * 100)}% of Page</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.6"
                        step="0.01"
                        value={widthPercent}
                        onChange={(e) => setWidthPercent(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                      />
                    </div>
                  )}

                  {!signatureUrl && (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      border: '1px dashed var(--border-subtle)'
                    }}>
                      📝 Please build your signature in the left panel to begin visual placement.
                    </div>
                  )}
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
              <p className="progress-status">Embedding and saving signature... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleSign} 
              disabled={!files.length || processing || !signatureBlob}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Signing Document...' : 'Place Signature'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Document Signed!</div>
          <div className="result-info">
            Your e-signed document has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Tool</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
