import { useState, useEffect, useRef } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { removePages } from '../../engines/pdf/removePages';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function RemovePages() {
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
  const [selectedIndices, setSelectedIndices] = useState([]); // 0-indexed pages to remove
  const [thumbnails, setThumbnails] = useState([]);
  const canvasRefs = useRef([]);

  // Load PDF and render thumbnails when file changes
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setSelectedIndices([]);
      setThumbnails([]);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdfThumbnails = async () => {
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
        const count = pdf.numPages;
        setTotalPages(count);
        
        const thumbs = [];
        for (let i = 1; i <= count; i++) {
          thumbs.push(i);
        }
        setThumbnails(thumbs);
        setProcessing(false);

        // Async render page previews to canvas in background
        setTimeout(async () => {
          for (let i = 1; i <= count; i++) {
            if (isCancelled) break;
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 0.3 }); // Small preview scale
              const canvas = canvasRefs.current[i - 1];
              if (canvas) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
              }
            } catch (err) {
              console.error(`Error rendering thumbnail for page ${i}:`, err);
            }
          }
        }, 100);

      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF pages. Please verify the document is not corrupted.');
        }
      }
    };

    loadPdfThumbnails();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, setProcessing, setError]);

  const togglePageSelection = (idx) => {
    setSelectedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleRemove = async () => {
    if (!files.length) return;
    if (selectedIndices.length === 0) {
      setError('Please select at least one page to remove.');
      return;
    }
    if (selectedIndices.length === totalPages) {
      setError('You cannot remove all pages from a PDF. At least one page must remain.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await removePages(files[0], selectedIndices, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_modified.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Remove Pages', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Page removal execution failed.');
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
    setSelectedIndices([]);
    setThumbnails([]);
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Remove Pages from PDF Online Free (100% Client-Side) | DocForge" 
        description="Select and delete specific pages from your PDF file instantly in your browser. Fully private, no server upload required."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="remove-pages" size={48} />
        </div>
        <h1>Remove PDF Pages</h1>
        <p className="tool-page-subtitle">Select and delete unwanted pages from your PDF document</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && thumbnails.length > 0 && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]">
              <div className="options-title" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
                <span>Select pages to delete</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Selected: {selectedIndices.length} / {totalPages} pages
                </span>
              </div>

              {/* PDF Page Previews Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '1.25rem',
                maxHeight: '450px',
                overflowY: 'auto',
                marginTop: '1.25rem',
                padding: '0.5rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }} className="no-scrollbar">
                {thumbnails.map((pageNum, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={pageNum}
                      onClick={() => togglePageSelection(idx)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-primary)',
                        border: `2px solid ${isSelected ? 'var(--color-danger)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      className="group"
                    >
                      {/* Selection Overlay */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--color-danger)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}>
                          <span className="material-symbols-outlined text-[12px] font-bold" style={{ color: 'white' }}>close</span>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '130px', alignItems: 'center' }}>
                        <canvas
                          ref={el => canvasRefs.current[idx] = el}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '120px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            borderRadius: '4px',
                            opacity: isSelected ? 0.45 : 1,
                            transition: 'opacity 0.2s'
                          }}
                        />
                      </div>
                      
                      <span style={{ 
                        marginTop: '0.75rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '600', 
                        color: isSelected ? 'var(--color-danger)' : 'var(--text-secondary)'
                      }}>
                        Page {pageNum}
                      </span>
                    </div>
                  );
                })}
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
              <p className="progress-status">Processing PDF pages... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleRemove} 
              disabled={!files.length || processing || selectedIndices.length === 0}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Removing...' : 'Remove Selected Pages'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Pages Deleted!</div>
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
              <span>Reset Tool</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
