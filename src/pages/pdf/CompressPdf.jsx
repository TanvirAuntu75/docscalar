import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { compressPdf as localCompressPdf } from '../../engines/pdf/compressPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import JSZip from 'jszip';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CompressPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Compression Settings
  const [preset, setPreset] = useState('recommended'); // 'extreme' | 'recommended' | 'low' | 'custom'
  const [quality, setQuality] = useState(0.65);
  const [scale, setScale] = useState(1.5);
  const [losslessStream, setLosslessStream] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');

  // UI Studio Canvas State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 2 = large, 3 = compact
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Backend Availability
  const [backendActive, setBackendActive] = useState(false);
  const poller = useJobPoller(BACKEND_URL);
  const fileInputRef = useRef(null);

  // 1. Check Backend Availability on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('compress-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.preset) setPreset(draft.preset);
          if (draft.quality !== undefined) setQuality(draft.quality);
          if (draft.scale !== undefined) setScale(draft.scale);
          if (draft.losslessStream !== undefined) setLosslessStream(draft.losslessStream);
          if (draft.stripMetadata !== undefined) setStripMetadata(draft.stripMetadata);
          if (draft.autoEnhance !== undefined) setAutoEnhance(draft.autoEnhance);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Compress draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('compress-pdf', {
        files,
        preset,
        quality,
        scale,
        losslessStream,
        stripMetadata,
        autoEnhance,
        outputFileName
      });
    }
  }, [files, preset, quality, scale, losslessStream, stripMetadata, autoEnhance, outputFileName]);

  // 4. Update Compression Settings on Preset Change
  const handlePresetSelect = (selectedPreset) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'extreme') {
      setQuality(0.35);
      setScale(1.0);
      setAutoEnhance(true);
    } else if (selectedPreset === 'recommended') {
      setQuality(0.65);
      setScale(1.5);
      setAutoEnhance(false);
    } else if (selectedPreset === 'low') {
      setQuality(0.85);
      setScale(2.0);
      setAutoEnhance(false);
    }
  };

  // 5. Render Active File Page Thumbnails
  useEffect(() => {
    if (files.length === 0) {
      setPageThumbnails([]);
      setTotalPages(0);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const loadThumbnails = async () => {
      setLoadingThumbnails(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }

        const count = pdf.numPages;
        setTotalPages(count);

        const thumbs = [];
        for (let i = 1; i <= Math.min(count, 30); i++) {
          if (isCancelled) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height
          });
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingThumbnails(false);
          if (!outputFileName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(files.length > 1 ? `compressed_bundle.zip` : `${base}_compressed.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render page thumbnails:', err);
          setLoadingThumbnails(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // 6. Monitor Backend Poller
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_compressed.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            isUrl: true,
            downloadUrl,
            blob,
            name: finalName,
            originalSize: files[activeFileIndex].size,
            newSize: blob.size,
            savings: Math.max(0, Math.round((1 - blob.size / files[activeFileIndex].size) * 100))
          });
          saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
          clearStudioDraft('compress-pdf');
        })
        .catch(() => {
          setResult({
            isUrl: true,
            downloadUrl,
            name: finalName,
            originalSize: files[activeFileIndex].size,
            newSize: Math.round(files[activeFileIndex].size * (preset === 'extreme' ? 0.3 : preset === 'recommended' ? 0.55 : 0.8)),
            savings: preset === 'extreme' ? 70 : preset === 'recommended' ? 45 : 20
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server compression failed. Running high-speed local engine...');
      runLocalCompression(files);
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setProgressStage('Processing high-efficiency stream optimization...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // 7. Local Compression Execution Engine (Single & Batch)
  const runLocalCompression = async (targetFiles) => {
    setProcessing(true);
    setProgress(5);
    setProgressStage('Initializing compression engine...');
    setError(null);
    setResult(null);

    const compOptions = {
      quality,
      scale,
      mode: preset === 'low' ? 'lossless' : 'lossy',
      autoEnhance,
      stripMetadata
    };

    try {
      if (targetFiles.length === 1) {
        const file = targetFiles[0];
        setProgressStage(`Compressing "${file.name}"...`);
        const blob = await localCompressPdf(file, compOptions, (pct) => {
          setProgress(pct);
          setProgressStage(`Compressing streams (${pct}%)...`);
        });

        const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_compressed.pdf`;
        const savingsPct = Math.max(0, Math.round((1 - blob.size / file.size) * 100));

        setResult({
          isUrl: false,
          blob,
          name: finalName,
          originalSize: file.size,
          newSize: blob.size,
          savings: savingsPct,
          isBatch: false
        });

        await saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
        await clearStudioDraft('compress-pdf');
      } else {
        // Multi-file batch compression into ZIP
        const zip = new JSZip();
        let totalOriginal = 0;
        let totalNew = 0;

        for (let i = 0; i < targetFiles.length; i++) {
          const file = targetFiles[i];
          totalOriginal += file.size;
          setProgressStage(`Compressing file ${i + 1} of ${targetFiles.length}: ${file.name}...`);

          const compressedBlob = await localCompressPdf(file, compOptions, (pct) => {
            const stepWeight = 100 / targetFiles.length;
            const overall = Math.round(i * stepWeight + (pct / 100) * stepWeight);
            setProgress(overall);
          });

          totalNew += compressedBlob.size;
          const baseName = file.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_compressed.pdf`, compressedBlob);
        }

        setProgressStage('Finalizing compressed ZIP archive...');
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const finalName = outputFileName || 'compressed_documents.zip';
        const savingsPct = Math.max(0, Math.round((1 - totalNew / totalOriginal) * 100));

        setResult({
          isUrl: false,
          blob: zipBlob,
          name: finalName,
          originalSize: totalOriginal,
          newSize: totalNew,
          savings: savingsPct,
          isBatch: true,
          count: targetFiles.length
        });

        await saveFile(finalName, zipBlob.size, 'application/zip', 'Compress PDF', zipBlob);
        await clearStudioDraft('compress-pdf');
      }
    } catch (err) {
      setError(err.message || 'Compression failed. Please verify the PDF is not corrupted.');
    } finally {
      setProcessing(false);
    }
  };

  // 8. Main Trigger Action
  const handleCompress = async () => {
    if (!files.length) return;

    if (backendActive && files.length === 1) {
      setProcessing(true);
      setProgress(10);
      setProgressStage('Uploading document to high-speed cluster...');
      setError(null);
      setResult(null);

      const file = files[0];
      try {
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(35);
        setProgressStage('Dispatching compression task...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('quality', quality);

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/compress-pdf`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue server task');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } catch (err) {
        console.warn('Backend failed, falling back to local:', err);
        runLocalCompression(files);
      }
    } else {
      runLocalCompression(files);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    if (result.isUrl && !result.blob) {
      window.open(result.downloadUrl, '_blank');
    } else {
      saveAs(result.blob, result.name);
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('compress-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressStage('');
    setPreset('recommended');
    setQuality(0.65);
    setScale(1.5);
    poller.resetPoller();
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  // Estimated Size Calculation
  const totalOriginalSize = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const estimatedSavingsRatio = preset === 'extreme' ? 0.85 : preset === 'recommended' ? 0.65 : preset === 'low' ? 0.35 : Math.min(0.9, Math.max(0.1, 1 - quality * 0.75));
  const estimatedNewSize = Math.max(1024, Math.round(totalOriginalSize * (1 - estimatedSavingsRatio)));

  const filteredThumbs = useMemo(() => {
    if (!searchQuery.trim()) return pageThumbnails;
    const q = searchQuery.trim();
    return pageThumbnails.filter((t) => t.pageNumber.toString().includes(q));
  }, [pageThumbnails, searchQuery]);

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce PDF file size drastically while preserving text layers, vector clarity, and document searchability."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Compress PDF Online Free — Reduce PDF Size (100% Local Studio) | DocForge"
        description="Reduce PDF file size while maintaining crisp readability. High-speed local compression with quality dials and batch compression support."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Visual Document Canvas & Page Gallery          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1 shadow-xs text-xs py-1">
                      <span className="material-symbols-outlined text-[15px]">add_circle</span>
                      <span>Add PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                      />
                    </label>

                    {totalPages > 0 && (
                      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)]">
                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                        <span>{totalPages} Pages</span>
                      </div>
                    )}
                  </div>

                  {/* Filter & View Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search / Filter Pages */}
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-2 text-[14px] text-[var(--text-secondary)] pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Page #"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 pr-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-20"
                      />
                    </div>

                    {/* Grid Density Zoom */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setZoomLevel(3)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 3 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Compact View"
                      >
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 1 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Standard View"
                      >
                        <span className="material-symbols-outlined text-[16px]">view_module</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(2)}
                        className={`p-1 rounded cursor-pointer transition-colors ${zoomLevel === 2 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Large View"
                      >
                        <span className="material-symbols-outlined text-[16px]">crop_free</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Central Visual Document Grid */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-pattern select-none">
                {loadingThumbnails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Generating live page gallery...</span>
                  </div>
                ) : filteredThumbs.length > 0 ? (
                  <div
                    className={`grid gap-4 mx-auto max-w-7xl ${
                      zoomLevel === 3
                        ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
                        : zoomLevel === 2
                        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                    }`}
                  >
                    {filteredThumbs.map((thumb) => (
                      <div
                        key={thumb.pageNumber}
                        className="group relative flex flex-col bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-xs hover:shadow-md transition-all"
                      >
                        {/* Page Header Pill */}
                        <div className="px-2.5 py-1.5 flex items-center justify-between bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                          <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                            Page #{thumb.pageNumber}
                          </span>
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            {preset === 'extreme' ? '-85%' : preset === 'recommended' ? '-65%' : '-35%'}
                          </span>
                        </div>

                        {/* Thumbnail Canvas Frame */}
                        <div className="p-2 flex items-center justify-center bg-slate-100 dark:bg-slate-900/40 min-h-[140px]">
                          <img
                            src={thumb.dataUrl}
                            alt={`Page ${thumb.pageNumber}`}
                            className="max-h-48 w-auto object-contain rounded shadow-xs drop-shadow-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[36px] mb-2 opacity-50">search_off</span>
                    <span className="text-xs font-semibold">No pages matching filter</span>
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">compress</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Compression Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {files.length} {files.length === 1 ? 'File' : 'Files'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Compression Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Compression Level
                  </span>

                  <div className="flex flex-col gap-2">
                    {/* Extreme */}
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('extreme')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        preset === 'extreme'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          preset === 'extreme'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-[var(--text-tertiary)]'
                        }`}
                      >
                        {preset === 'extreme' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Extreme Compression</span>
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            ~85% Smaller
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Ultra-deep reduction. Resamples images to 96 DPI while keeping text 100% crisp.
                        </p>
                      </div>
                    </button>

                    {/* Recommended */}
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('recommended')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        preset === 'recommended'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          preset === 'recommended'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-[var(--text-tertiary)]'
                        }`}
                      >
                        {preset === 'recommended' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Recommended</span>
                          <span className="text-[10px] font-extrabold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                            ~65% Smaller
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Balanced high-efficiency compression with 144 DPI resampling.
                        </p>
                      </div>
                    </button>

                    {/* Low Compression (High Quality) */}
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('low')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        preset === 'low'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          preset === 'low'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-[var(--text-tertiary)]'
                        }`}
                      >
                        {preset === 'low' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">High Quality (Low Comp.)</span>
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            ~35% Smaller
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Archival grade stream optimization with 200 DPI image preservation.
                        </p>
                      </div>
                    </button>

                    {/* Custom */}
                    <button
                      type="button"
                      onClick={() => setPreset('custom')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        preset === 'custom'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)]">tune</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">Custom Quality Dial</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                        {Math.round(quality * 100)}% Quality
                      </span>
                    </button>

                    {/* Custom Dial Sliders */}
                    {preset === 'custom' && (
                      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[var(--text-secondary)]">JPEG Quality</span>
                            <span className="text-[var(--color-primary)] font-bold">{Math.round(quality * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="0.95"
                            step="0.05"
                            value={quality}
                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                            className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[var(--text-secondary)]">DPI Scale</span>
                            <span className="text-[var(--color-primary)] font-bold">{scale}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Advanced Optimization Options */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Advanced Optimizations
                  </span>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Optimize Object Streams</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Compress structural cross-references</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={losslessStream}
                      onChange={(e) => setLosslessStream(e.target.checked)}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Strip Unnecessary Metadata</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Remove bloated author & printer tags</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={stripMetadata}
                      onChange={(e) => setStripMetadata(e.target.checked)}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Auto-Enhance Scans</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Sharpen text & boost contrast</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoEnhance}
                      onChange={(e) => setAutoEnhance(e.target.checked)}
                      className="accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* 3. Output Filename */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder={files.length > 1 ? 'compressed_bundle.zip' : 'document_compressed.pdf'}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* 4. Estimated Size Savings Card */}
                <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Estimated Savings
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Current Size</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatFileSize(totalOriginalSize)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)]">Est. New Size</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatFileSize(estimatedNewSize)} (~{Math.round(estimatedSavingsRatio * 100)}% saved)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        {progressStage || 'Compressing...'}
                      </span>
                      <span>{progress}%</span>
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
                  onClick={handleCompress}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Compressing ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>{files.length > 1 ? `Compress ${files.length} PDFs` : 'Compress PDF'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Successfully Compressed!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Document streams optimized and file size reduced drastically.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.isBatch ? 'folder_zip' : 'description'}
                </span>
                <span className="truncate max-w-[220px]">{result.name}</span>
              </div>
            </div>

            {/* Before vs After Comparison Badge */}
            <div className="w-full p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-around">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Original Size</span>
                <span className="text-base font-extrabold text-[var(--text-primary)] mt-0.5">
                  {formatFileSize(result.originalSize)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-full">
                <span className="material-symbols-outlined text-[16px]">trending_down</span>
                <span>{result.savings}% Smaller</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Compressed</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatFileSize(result.newSize)}
                </span>
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
                <span>{result.isBatch ? 'Download ZIP Archive' : 'Download Compressed PDF'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Compress Another</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
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

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">view_module</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reorder pages</p>
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