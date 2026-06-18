import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function ScanToPdf() {
  const [capturedPages, setCapturedPages] = useState([]); // Array of { id, dataUrl, rotation }
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pdfName, setPdfName] = useState('scanned_document');

  const videoRef = useRef(null);

  // Clean up WebRTC camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera stream access failed:', err);
      setCameraError('Failed to access camera. Please check camera permissions in your browser.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Capture a snapshot frame from the video stream
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      setCapturedPages(prev => [
        ...prev,
        {
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          dataUrl,
          rotation: 0
        }
      ]);
      setError(null);
    } catch (err) {
      setError('Snapshot capture failed.');
    }
  };

  // Handle local image file uploading as scans (Fallback)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPages(prev => [
          ...prev,
          {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            dataUrl: reader.result,
            rotation: 0
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    setError(null);
  };

  const rotatePage = (id) => {
    setCapturedPages(prev =>
      prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)
    );
  };

  const deletePage = (id) => {
    setCapturedPages(prev => prev.filter(p => p.id !== id));
  };

  const movePage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= capturedPages.length) return;

    setCapturedPages(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return list;
    });
  };

  // Render image to canvas to bake the rotation before saving
  const bakeImageRotation = (dataUrl, rotation) => {
    return new Promise((resolve) => {
      if (rotation === 0) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = dataUrl;
    });
  };

  const compilePdf = async () => {
    if (capturedPages.length === 0) {
      setError('Please capture or upload at least one page to compile.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < capturedPages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const page = capturedPages[i];
        // Bake rotation
        const finalImgData = await bakeImageRotation(page.dataUrl, page.rotation);
        pdf.addImage(finalImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const outputBlob = pdf.output('blob');
      const finalName = (pdfName.trim() || 'scanned_document') + '.pdf';

      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Scan to PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save scanned file locally:', dbErr);
      }

    } catch (err) {
      setError('Failed to compile scanned pages into PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const handleReset = () => {
    setCapturedPages([]);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <ToolPageLayout
      toolId="scan-to-pdf"
      title="Scan to PDF"
      description="Capture documents via webcam/phone camera and compile them into a PDF"
    >
      <SEOHead 
        title="Scan to PDF Online Free — Camera Scanner | DocForge" 
        description="Capture documents with your device camera or upload photos, rotate slides, and bundle them into a clean A4 PDF file client-side."
      />
      
      

      {!result ? (
        <>
          <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            marginTop: '1.5rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'window.innerWidth > 992 ? "1fr 1.2fr" : "1fr"',
              gap: '2rem'
            }} className="lg:grid-cols-2">

              {/* Column 1: WebRTC Camera Sandbox */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="options-title">1. Document Capture Stream</div>

                {cameraActive ? (
                  <div style={{ position: 'relative', background: '#000000', borderRadius: '12px', overflow: 'hidden', minHeight: '260px', aspectRatio: '1.33' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                    />
                    
                    {/* Capture target guidelines grid */}
                    <div style={{
                      position: 'absolute',
                      top: '10%',
                      left: '10%',
                      right: '10%',
                      bottom: '10%',
                      border: '1px dashed rgba(255, 255, 255, 0.45)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Align Document Boundaries
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-secondary)',
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    minHeight: '260px'
                  }}>
                    <span className="material-symbols-outlined text-[48px]" style={{ color: 'var(--text-secondary)' }}>photo_camera</span>
                    <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.25rem 0' }}>Camera is Deactivated</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px', marginBottom: '1.25rem' }}>
                      Activate your webcam or mobile back camera to scan pages directly.
                    </p>
                    <button className="btn btn-primary" onClick={startCamera} style={{ padding: '0.6rem 1.2rem' }}>
                      🔌 Open Live Camera
                    </button>
                  </div>
                )}

                {cameraError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', textAlign: 'center' }}>{cameraError}</p>
                )}

                {cameraActive && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={stopCamera} style={{ flex: 1, padding: '0.6rem' }}>
                      ⏹️ Stop Camera
                    </button>
                    <button className="btn btn-primary" onClick={captureFrame} style={{ flex: 1.5, padding: '0.6rem', fontWeight: 'bold' }}>
                      📸 Capture Page
                    </button>
                  </div>
                )}

                {/* File Upload Fallback */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Or Upload Photo Scans (Local Files)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              {/* Column 2: Captured Pages List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>2. Scanned Page List</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Pages: {capturedPages.length}
                  </span>
                </div>

                {capturedPages.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '1rem',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }} className="no-scrollbar">
                    {capturedPages.map((page, idx) => (
                      <div
                        key={page.id}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0.5rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        {/* Page Thumb Container */}
                        <div style={{
                          width: '100%',
                          height: '110px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          borderRadius: '4px',
                          background: '#000',
                          position: 'relative'
                        }}>
                          <img
                            src={page.dataUrl}
                            alt={`Capture Page ${idx + 1}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              transform: `rotate(${page.rotation}deg)`,
                              transition: 'transform 0.15s ease'
                            }}
                          />
                        </div>

                        {/* Page index badge */}
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', margin: '0.4rem 0 0.35rem 0' }}>
                          Page {idx + 1}
                        </span>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.25rem', width: '100%', justifyContent: 'center' }}>
                          <button
                            onClick={() => movePage(idx, -1)}
                            disabled={idx === 0}
                            style={{ padding: '2px 4px', fontSize: '9px' }}
                            className="btn btn-secondary"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => rotatePage(page.id)}
                            style={{ padding: '2px 6px', fontSize: '9px', display: 'flex', alignItems: 'center' }}
                            className="btn btn-secondary"
                          >
                            <span className="material-symbols-outlined text-[12px] select-none">rotate_right</span>
                          </button>
                          <button
                            onClick={() => deletePage(page.id)}
                            style={{ padding: '2px 6px', fontSize: '9px', color: 'var(--color-danger)' }}
                            className="btn btn-secondary"
                          >
                            <span className="material-symbols-outlined text-[12px] select-none">delete</span>
                          </button>
                          <button
                            onClick={() => movePage(idx, 1)}
                            disabled={idx === capturedPages.length - 1}
                            style={{ padding: '2px 4px', fontSize: '9px' }}
                            className="btn btn-secondary"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    border: '1px dashed var(--border-subtle)',
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    📸 Scanned page snapshots will populate here.
                  </div>
                )}

                {/* PDF Filename config */}
                {capturedPages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Document Filename</label>
                    <input
                      type="text"
                      value={pdfName}
                      onChange={(e) => setPdfName(e.target.value)}
                      placeholder="scanned_document"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

            </div>
          </div>

          {processing && (
            <div className="progress-container" style={{ marginTop: '1.5rem' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '80%' }} />
              </div>
              <p className="progress-status">Packing pages & baking rotations into PDF... 80%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button
              className="btn btn-primary btn-lg flex items-center justify-center gap-2"
              onClick={compilePdf}
              disabled={capturedPages.length === 0 || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Compiling...' : 'Compile Scanned PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Scanned & Compiled!</div>
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
              <span>Scan Another Document</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
