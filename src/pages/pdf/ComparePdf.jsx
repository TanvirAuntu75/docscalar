import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ComparePdf() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [pdfA, setPdfA] = useState(null);
  const [pdfB, setPdfB] = useState(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' or 'swipe'
  const [sliderVal, setSliderVal] = useState(50); // Swipe divider position (0-100)
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  
  // Overlay mode canvas refs
  const canvasAOverlayRef = useRef(null);
  const canvasBOverlayRef = useRef(null);
  
  const containerRef = useRef(null);

  // Load PDF A
  useEffect(() => {
    if (!fileA) {
      setPdfA(null);
      return;
    }
    let activePdf = null;
    const loadA = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await fileA.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        activePdf = pdf;
        setPdfA(pdf);
      } catch (err) {
        setError('Failed to parse PDF document A.');
      } finally {
        setLoading(false);
      }
    };
    loadA();
    return () => {
      if (activePdf) activePdf.destroy();
    };
  }, [fileA]);

  // Load PDF B
  useEffect(() => {
    if (!fileB) {
      setPdfB(null);
      return;
    }
    let activePdf = null;
    const loadB = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await fileB.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        activePdf = pdf;
        setPdfB(pdf);
      } catch (err) {
        setError('Failed to parse PDF document B.');
      } finally {
        setLoading(false);
      }
    };
    loadB();
    return () => {
      if (activePdf) activePdf.destroy();
    };
  }, [fileB]);

  // Sync page counts
  useEffect(() => {
    if (pdfA && pdfB) {
      const count = Math.min(pdfA.numPages, pdfB.numPages);
      setTotalPages(count);
      setCurrentPage(1);
    } else {
      setTotalPages(0);
    }
  }, [pdfA, pdfB]);

  // Render pages to canvases
  useEffect(() => {
    const renderCanvases = async () => {
      if (!pdfA || !pdfB) return;

      try {
        // Render A Page
        const pageA = await pdfA.getPage(currentPage);
        const viewportA = pageA.getViewport({ scale: 0.8 }); // Moderate scale for comparative rendering
        
        // Side-by-side A
        const canvasA = canvasARef.current;
        if (canvasA) {
          canvasA.width = viewportA.width;
          canvasA.height = viewportA.height;
          const ctxA = canvasA.getContext('2d');
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
        }

        // Overlay swipe A
        const canvasAOverlay = canvasAOverlayRef.current;
        if (canvasAOverlay) {
          canvasAOverlay.width = viewportA.width;
          canvasAOverlay.height = viewportA.height;
          const ctxAOverlay = canvasAOverlay.getContext('2d');
          await pageA.render({ canvasContext: ctxAOverlay, viewport: viewportA }).promise;
        }

        // Render B Page
        const pageB = await pdfB.getPage(currentPage);
        const viewportB = pageB.getViewport({ scale: 0.8 });

        // Side-by-side B
        const canvasB = canvasBRef.current;
        if (canvasB) {
          canvasB.width = viewportB.width;
          canvasB.height = viewportB.height;
          const ctxB = canvasB.getContext('2d');
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
        }

        // Overlay swipe B
        const canvasBOverlay = canvasBOverlayRef.current;
        if (canvasBOverlay) {
          canvasBOverlay.width = viewportB.width;
          canvasBOverlay.height = viewportB.height;
          const ctxBOverlay = canvasBOverlay.getContext('2d');
          await pageB.render({ canvasContext: ctxBOverlay, viewport: viewportB }).promise;
        }

      } catch (err) {
        console.error('Failed to render comparison pages:', err);
      }
    };

    renderCanvases();
  }, [pdfA, pdfB, currentPage, viewMode]);

  // Drag-and-swipe divider logic
  const handleDrag = (e) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    if (clientX === null) return;

    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderVal(percent);
  };

  const handleReset = () => {
    setFileA(null);
    setFileB(null);
    setPdfA(null);
    setPdfB(null);
    setTotalPages(0);
    setCurrentPage(1);
    setViewMode('side-by-side');
  };

  return (
    <ToolPageLayout
      toolId="compare-pdf"
      title="Compare PDF Revisions"
      description="Visually compare two PDF document revisions side-by-side or using a swipe overlay"
    >
      <SEOHead 
        title="Compare PDF Files Online Free — Visual PDF Diff | DocForge" 
        description="Compare two PDF documents side-by-side or with an overlay swipe slider. Easily spot changes and differences in text or drawing revisions."
      />
      
      

      {(!pdfA || !pdfB) ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'window.innerWidth > 768 ? "1fr 1fr" : "1fr"', gap: '1.5rem' }} className="md:grid-cols-2">
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                Document A (Original Version)
              </h3>
              {fileA ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(59,130,246,0.04)', border: '1.5px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                  📄 {fileA.name}
                  <button className="btn btn-secondary" onClick={() => setFileA(null)} style={{ display: 'block', margin: '0.75rem auto 0 auto', padding: '4px 12px', fontSize: '0.8rem' }}>Change File</button>
                </div>
              ) : (
                <FileDropzone accept=".pdf" multiple={false} files={[]} setFiles={(fs) => setFileA(fs[0])} compact={true} />
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                Document B (Revised Version)
              </h3>
              {fileB ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(59,130,246,0.04)', border: '1.5px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                  📄 {fileB.name}
                  <button className="btn btn-secondary" onClick={() => setFileB(null)} style={{ display: 'block', margin: '0.75rem auto 0 auto', padding: '4px 12px', fontSize: '0.8rem' }}>Change File</button>
                </div>
              ) : (
                <FileDropzone accept=".pdf" multiple={false} files={[]} setFiles={(fs) => setFileB(fs[0])} compact={true} />
              )}
            </div>
          </div>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
              <div className="loading-spinner" />
              <span>Parsing PDFs...</span>
            </div>
          )}
          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center' }}>{error}</p>}
        </div>
      ) : (
        <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Comparison Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem'
          }}>
            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '6px' }}>
              <button
                onClick={() => setViewMode('side-by-side')}
                className="btn btn-secondary"
                style={{
                  border: 'none',
                  background: viewMode === 'side-by-side' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'side-by-side' ? '#white' : 'var(--text-secondary)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem'
                }}
              >
                📊 Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('swipe')}
                className="btn btn-secondary"
                style={{
                  border: 'none',
                  background: viewMode === 'swipe' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'swipe' ? '#white' : 'var(--text-secondary)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem'
                }}
              >
                ↔️ Swipe Overlay
              </button>
            </div>

            {/* Pagination selector */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next ▶
              </button>
            </div>

            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Files</span>
            </button>
          </div>

          {/* Side-by-Side Render View */}
          {viewMode === 'side-by-side' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'window.innerWidth > 768 ? "1fr 1fr" : "1fr"',
              gap: '1.5rem',
              overflowY: 'auto'
            }} className="md:grid-cols-2">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Original (A)</span>
                <canvas ref={canvasARef} style={{ maxWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', background: '#FFF' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Revision (B)</span>
                <canvas ref={canvasBRef} style={{ maxWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', background: '#FFF' }} />
              </div>
            </div>
          )}

          {/* Swipe Overlay View */}
          {viewMode === 'swipe' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--color-primary)', borderRadius: '50%' }} />
                  Left: Original (A)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%' }} />
                  Right: Revision (B)
                </span>
              </div>

              {/* Swipe Sandbox */}
              <div
                ref={containerRef}
                onMouseMove={handleDrag}
                onTouchMove={handleDrag}
                onMouseUp={() => setIsDragging(false)}
                onTouchEnd={() => setIsDragging(false)}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  maxWidth: '100%',
                  userSelect: 'none',
                  cursor: isDragging ? 'ew-resize' : 'default'
                }}
              >
                {/* PDF A Canvas (Bottom layer) */}
                <canvas
                  ref={canvasAOverlayRef}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    background: '#FFF',
                    pointerEvents: 'none'
                  }}
                />

                {/* PDF B Canvas (Top layer with clipPath inset) */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  clipPath: `inset(0 0 0 ${sliderVal}%)`
                }}>
                  <canvas
                    ref={canvasBOverlayRef}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      background: '#FFF',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                {/* Vertical Swipe Divider Handle */}
                <div
                  onMouseDown={(e) => { setIsDragging(true); e.preventDefault(); }}
                  onTouchStart={(e) => { setIsDragging(true); e.preventDefault(); }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${sliderVal}%`,
                    width: '3px',
                    background: 'var(--color-primary)',
                    cursor: 'ew-resize',
                    zIndex: 20,
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* Swipe circle grab icon */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#FFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'ew-resize',
                    pointerEvents: 'none'
                  }}>
                    ⇄
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
