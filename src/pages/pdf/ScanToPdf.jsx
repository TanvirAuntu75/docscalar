import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import { compileScansToPdf } from '../../engines/pdf/scanToPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  Camera,
  VideoOff,
  FlipHorizontal,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ScanToPdf() {
  const [capturedPages, setCapturedPages] = useState([]); // Array of { id, dataUrl, rotation }
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [stream, setStream] = useState(null);
  const [, setCameraError] = useState(null);

  // Layout & Formatting Options
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter' | 'fit'
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [margin, setMargin] = useState(0); // 0 | 15 | 30
  const [enhanceFilter, setEnhanceFilter] = useState('enhance'); // 'enhance' | 'grayscale' | 'normal'
  const [autoCropBorders, setAutoCropBorders] = useState(true);
  const [pdfName, setPdfName] = useState('scanned_document.pdf');

  // Processing & Results
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('scan-to-pdf');
        if (draft && isMounted) {
          if (draft.capturedPages) setCapturedPages(draft.capturedPages);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.orientation) setOrientation(draft.orientation);
          if (draft.margin !== undefined) setMargin(draft.margin);
          if (draft.enhanceFilter) setEnhanceFilter(draft.enhanceFilter);
          if (draft.pdfName) setPdfName(draft.pdfName);
        }
      } catch (err) {
        console.warn('Scan to PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (capturedPages.length > 0) {
      saveStudioDraft('scan-to-pdf', {
        capturedPages,
        pageSize,
        orientation,
        margin,
        enhanceFilter,
        pdfName
      });
    }
  }, [capturedPages, pageSize, orientation, margin, enhanceFilter, pdfName]);

  // Clean up WebRTC camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access unavailable. Please verify browser permissions or upload photo scans.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  // Capture frame from video feed
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (enhanceFilter === 'enhance') {
        ctx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
      } else if (enhanceFilter === 'grayscale') {
        ctx.filter = 'grayscale(1) contrast(1.3) brightness(1.05)';
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      setCapturedPages((prev) => [
        ...prev,
        {
          id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          dataUrl,
          rotation: 0
        }
      ]);
      setError(null);
    } catch {
      setError('Snapshot capture failed.');
    }
  };

  // Upload local photo scan files
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;

    uploadedFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPages((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            dataUrl: reader.result,
            rotation: 0
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const rotatePage = (id) => {
    setCapturedPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deletePage = (id) => {
    setCapturedPages((prev) => prev.filter((p) => p.id !== id));
  };

  const movePage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= capturedPages.length) return;

    setCapturedPages((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return list;
    });
  };

  const clearAllPages = () => {
    setCapturedPages([]);
  };

  // Compile Scanned Pages into PDF
  const handleCompilePdf = async () => {
    if (capturedPages.length === 0) {
      setError('Please capture or upload at least one page to compile.');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(20);
    setStatusMessage('Baking scan geometry & compiling pages...');

    try {
      const finalName = pdfName.trim().endsWith('.pdf') ? pdfName.trim() : `${pdfName.trim() || 'scanned_document'}.pdf`;

      const outputBlob = await compileScansToPdf(capturedPages, {
        pageSize,
        orientation,
        margin: parseInt(margin, 10),
        filter: enhanceFilter,
        autoCropBlackBorders: autoCropBorders,
        cleanMargin: 18
      });

      setProgress(100);
      setResult({
        blob: outputBlob,
        name: finalName,
        size: outputBlob.size,
        totalPages: capturedPages.length
      });

      await saveFile(finalName, outputBlob.size, 'application/pdf', 'Scan to PDF', outputBlob);
      await clearStudioDraft('scan-to-pdf');
    } catch (err) {
      setError(err.message || 'Failed to compile scanned pages into PDF.');
    } finally {
      setProcessing(false);
      setStatusMessage('');
    }
  };

  const downloadFile = () => {
    if (!result?.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('scan-to-pdf');
    setCapturedPages([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    stopCamera();
  };

  return (
    <ToolPageLayout
      toolId="scan-to-pdf"
      title="Scan to PDF Studio"
      description="Capture documents with your device camera or upload image scans to compile a clean, high-resolution PDF."
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Scan to PDF Online Free — Camera Document Scanner | DocScalar"
        description="Capture documents with your webcam or mobile camera, adjust rotations, apply scan enhancements, and bundle into a clean PDF. 100% Client-side."
      />

      {!result ? (
        <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
          {/* ========================================================================= */}
          {/* LEFT / CENTER: Camera Sandbox & Scanned Pages Filmstrip Viewport           */}
          {/* ========================================================================= */}
          <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
            {/* Sticky Canvas Toolbar */}
            <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
              <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Camera Status Capsule */}
                  <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                    <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{cameraActive ? 'Camera Live' : 'Camera Off'}</span>
                  </div>

                  {/* Camera Controls */}
                  {cameraActive ? (
                    <>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="h-8 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/10 text-red-500 border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                      >
                        <VideoOff size={13} />
                        <span>Stop</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="h-8 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        title="Switch Camera (Front / Back)"
                      >
                        <FlipHorizontal size={13} />
                        <span className="capitalize">{facingMode}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="h-8 px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Camera size={14} />
                      <span>Open Camera</span>
                    </button>
                  )}

                  {/* Scanned Pages Counter */}
                  <span className="h-8 flex items-center px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                    {capturedPages.length} Scanned {capturedPages.length === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>

                {/* Right Upload & Reset Actions */}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-medium)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  >
                    <Upload size={13} />
                    <span>Upload Images</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetWorkspace}
                    className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                    title="Reset workspace"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Viewport Stage */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col gap-6 relative bg-pattern select-none">
              {/* Top Section: Live Camera Sandbox */}
              {cameraActive ? (
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 animate-[fadeIn_0.15s_ease-out]">
                  <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden bg-black shadow-2xl border-2 border-[var(--border-subtle)]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover block"
                    />

                    {/* Alignment Guidelines Frame */}
                    <div className="absolute inset-8 border-2 border-dashed border-white/60 pointer-events-none rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">crop_free</span>
                        Align Document Frame
                      </span>
                    </div>

                    {/* Snapshot Button Pill Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={captureFrame}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-full shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <Camera size={18} />
                        <span>Capture Page ({capturedPages.length + 1})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : capturedPages.length === 0 ? (
                /* Empty State Camera Prompt */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--color-primary)] mb-4 shadow-sm">
                    <Camera size={36} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Ready to Scan Documents</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
                    Activate your device camera to capture pages sequentially, or upload existing image files.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="btn btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Camera size={16} />
                      <span>Start Camera Scanner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>Upload Photos</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Bottom Section: Scanned Page Gallery */}
              {capturedPages.length > 0 && (
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                      <Layers size={14} className="text-[var(--color-primary)]" />
                      <span>Captured Document Pages ({capturedPages.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearAllPages}
                      className="text-[11px] text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {capturedPages.map((page, idx) => (
                      <div
                        key={page.id}
                        className="relative rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-2.5 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Page Preview Thumbnail */}
                        <div className="w-full aspect-3/4 rounded-xl overflow-hidden bg-slate-900 shadow-xs flex items-center justify-center relative">
                          <img
                            src={page.dataUrl}
                            alt={`Scanned Page ${idx + 1}`}
                            style={{
                              transform: `rotate(${page.rotation}deg)`,
                              transition: 'transform 0.15s ease'
                            }}
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />

                          {/* Page Number Badge */}
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white">
                            P.{idx + 1}
                          </div>
                        </div>

                        {/* Page Action Controls */}
                        <div className="flex items-center justify-between w-full gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => movePage(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] cursor-pointer"
                            title="Move Left"
                          >
                            <ChevronLeft size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => rotatePage(page.id)}
                            className="p-1 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer"
                            title="Rotate 90° Right"
                          >
                            <RotateCw size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePage(page.id)}
                            className="p-1 rounded-md bg-[var(--bg-secondary)] hover:bg-red-500/10 text-red-500 cursor-pointer"
                            title="Delete Page"
                          >
                            <Trash2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => movePage(idx, 1)}
                            disabled={idx === capturedPages.length - 1}
                            className="p-1 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] cursor-pointer"
                            title="Move Right"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: Studio Options Sidebar                                             */}
          {/* ========================================================================= */}
          <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">document_scanner</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Scan Options
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                {capturedPages.length} Pages
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Page Dimension Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Page Size
                </span>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setPageSize('a4')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      pageSize === 'a4' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('letter')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      pageSize === 'letter' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    US Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('fit')}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      pageSize === 'fit' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Fit Image
                  </button>
                </div>
              </div>

              {/* 2. Orientation */}
              {pageSize !== 'fit' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Orientation
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setOrientation('auto')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        orientation === 'auto' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        orientation === 'portrait' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        orientation === 'landscape' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Margin Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Page Margins
                </span>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setMargin(0)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      margin === 0 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    None (0pt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin(15)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      margin === 15 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Compact (15pt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin(30)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      margin === 30 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Standard (30pt)
                  </button>
                </div>
              </div>

              {/* 4. Enhancement Filter */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Document Enhancement
                </span>
                <div className="flex flex-col gap-1.5 bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filter"
                      value="enhance"
                      checked={enhanceFilter === 'enhance'}
                      onChange={() => setEnhanceFilter('enhance')}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="font-semibold">Auto-Enhance Document (High Contrast)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filter"
                      value="grayscale"
                      checked={enhanceFilter === 'grayscale'}
                      onChange={() => setEnhanceFilter('grayscale')}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                    <span>Grayscale (Paper Scan)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filter"
                      value="normal"
                      checked={enhanceFilter === 'normal'}
                      onChange={() => setEnhanceFilter('normal')}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                    <span>Original Image Colors</span>
                  </label>
                </div>
              </div>

              {/* VisionClean: Universal Smart Cropper */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <label className="flex items-start justify-between gap-2 p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-emerald-500">auto_fix_high</span>
                      Auto-Crop Shadows & Borders
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-tight">
                      Content-aware detection trims scan deskew artifacts while preserving all writing.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoCropBorders}
                    onChange={(e) => setAutoCropBorders(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer mt-0.5"
                  />
                </label>
              </div>

              {/* 5. Custom Output Filename */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Output Document Name
                </label>
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="scanned_document.pdf"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                />
              </div>

              {/* Progress Bar (While Processing) */}
              {processing && (
                <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)] shrink-0">
                        progress_activity
                      </span>
                      <span className="truncate" title={statusMessage || 'Compiling PDF document...'}>
                        {statusMessage || 'Compiling PDF document...'}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Sticky Primary CTA Action Button */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <button
                type="button"
                onClick={handleCompilePdf}
                disabled={processing || capturedPages.length === 0}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Compiling PDF...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Compile Scanned PDF ({capturedPages.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">document_scanner</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Scanned & Compiled!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your scanned pages have been formatted and bundled into a clean PDF document.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.totalPages || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Page Format</span>
                <span className="text-base font-extrabold text-[var(--color-primary)] uppercase">{pageSize}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Filter</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">{enhanceFilter}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Scanned PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Scan Another Document</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This Scanned Document
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/ocr-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">document_scanner</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">OCR PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Make text searchable</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </Link>

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
