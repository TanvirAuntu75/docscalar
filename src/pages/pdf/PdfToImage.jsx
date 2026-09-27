import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { pdfToImages, pdfToImagesStream } from '../../engines/pdf/pdfToImage';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useDpiQuality } from '../../hooks/useDpiQuality';
import { DpiQualitySelector } from '../../components/DpiQualitySelector';
import { BACKEND_URL, apiFetch, uploadFileSecure } from '../../utils/api';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SUPPORTS_DIR_PICKER = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export default function PdfToImage() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Conversion Settings
  const { dpi, setDpi } = useDpiQuality();
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg' | 'webp'
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(dpi === 72 ? 1 : dpi === 300 ? 4 : dpi === 600 ? 8 : 2);
  const [exportMode, setExportMode] = useState(SUPPORTS_DIR_PICKER ? 'folder' : 'zip');

  // Synchronize scale multiplier with unified studio DPI preset
  useEffect(() => {
    if (dpi === 72) setScale(1);
    else if (dpi === 150) setScale(2);
    else if (dpi === 300) setScale(4);
    else if (dpi === 600) setScale(8);
  }, [dpi]);
  const [pageScope, setPageScope] = useState('all'); // 'all' | 'custom'
  const [customRange, setCustomRange] = useState('');
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [outputArchiveName, setOutputArchiveName] = useState('');

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
  const [streamedPages, setStreamedPages] = useState(0);
  const [totalStreamPages, setTotalStreamPages] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const previewBlobsRef = useRef([]);
  const fileInputRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('pdf-to-image');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.format) setFormat(draft.format);
          if (draft.quality !== undefined) setQuality(draft.quality);
          if (draft.scale !== undefined) setScale(draft.scale);
          if (draft.exportMode) setExportMode(draft.exportMode);
          if (draft.pageScope) setPageScope(draft.pageScope);
          if (draft.customRange) setCustomRange(draft.customRange);
          if (draft.outputArchiveName) setOutputArchiveName(draft.outputArchiveName);
        }
      } catch (err) {
        console.warn('PDF to Image draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('pdf-to-image', {
        files,
        format,
        quality,
        scale,
        exportMode,
        pageScope,
        customRange,
        outputArchiveName
      });
    }
  }, [files, format, quality, scale, exportMode, pageScope, customRange, outputArchiveName]);

  // 3. Render Active PDF Page Thumbnails
  useEffect(() => {
    if (files.length === 0) {
      setPageThumbnails([]);
      setTotalPages(0);
      setSelectedPages(new Set());
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
        setSelectedPages(new Set(Array.from({ length: count }, (_, i) => i + 1)));

        const thumbs = [];
        for (let i = 1; i <= Math.min(count, 50); i++) {
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
          if (!outputArchiveName) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputArchiveName(`${base}-images.zip`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to load page thumbnails for PDF:', err);
          setLoadingThumbnails(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // Parse page list to convert
  const targetPageIndices = useMemo(() => {
    if (totalPages === 0) return [];
    if (pageScope === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (pageScope === 'custom' && customRange.trim()) {
      const indices = new Set();
      const parts = customRange.split(',').map((s) => s.trim());
      parts.forEach((p) => {
        if (p.includes('-')) {
          const [start, end] = p.split('-').map((n) => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              if (i >= 1 && i <= totalPages) indices.add(i);
            }
          }
        } else {
          const num = parseInt(p);
          if (!isNaN(num) && num >= 1 && num <= totalPages) indices.add(num);
        }
      });
      return Array.from(indices).sort((a, b) => a - b);
    }
    return Array.from(selectedPages).sort((a, b) => a - b);
  }, [totalPages, pageScope, customRange, selectedPages]);

  const togglePageSelection = (pageNumber) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
      }
      return next;
    });
  };

  const selectAllPages = () => {
    setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)));
    setPageScope('all');
  };

  const deselectAllPages = () => {
    setSelectedPages(new Set());
  };

  const handleConvert = async () => {
    if (!files.length) return;
    const file = files[activeFileIndex] || files[0];
    setProcessing(true);
    setProgress(0);
    setProgressStage('Initializing image rendering engine...');
    setStreamedPages(0);
    setTotalStreamPages(targetPageIndices.length);
    setError(null);
    setResult(null);
    previewBlobsRef.current = [];

    const conversionOptions = {
      format: format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png',
      quality,
      scale,
      pageIndices: targetPageIndices.length < totalPages ? targetPageIndices : undefined
    };

    try {
      if (exportMode === 'folder' && SUPPORTS_DIR_PICKER) {
        // Direct Folder Export via File System Access API
        let dirHandle;
        try {
          dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        } catch (e) {
          setProcessing(false);
          return;
        }

        const baseFolder = file.name.replace(/\.[^.]+$/, '');
        const folderName = `${baseFolder}-images`;
        let subDir;
        try {
          subDir = await dirHandle.getDirectoryHandle(folderName, { create: true });
        } catch {
          subDir = dirHandle;
        }

        let savedCount = 0;
        const previewUrls = [];

        await pdfToImagesStream(
          file,
          conversionOptions,
          async ({ name, blob, pageIndex, totalPages: tp, progress: pg }) => {
            if (previewBlobsRef.current.length < 6) {
              const objUrl = URL.createObjectURL(blob);
              previewBlobsRef.current.push({ url: objUrl, name });
              previewUrls.push(objUrl);
            }

            const fileHandle = await subDir.getFileHandle(name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            savedCount++;
            setStreamedPages(savedCount);
            setProgress(pg);
            setProgressStage(`Writing image ${savedCount} of ${tp} to disk...`);
          },
          (p) => setProgress(p)
        );

        setResult({
          mode: 'folder',
          totalPages: savedCount,
          folderName,
          format: format.toUpperCase(),
          scale: `${scale}× (${dpi} DPI)`,
          previews: previewBlobsRef.current,
          previewUrls
        });

        await clearStudioDraft('pdf-to-image');
      } else {
        // ZIP Archive Mode - Server-First Execution (Eliminates Browser V8 Heap Ram Spike)
        let zipBlob = null;
        const finalName = outputArchiveName || `${file.name.replace(/\.[^.]+$/, '')}-images.zip`;
        let serverSuccess = false;

        try {
          setProgressStage('Processing high-resolution pages on dedicated server...');
          const uploadRes = await uploadFileSecure(BACKEND_URL, file, (p) => {
            setProgress(Math.round(p * 0.25));
          });
          const { file_id, filename } = uploadRes;

          const formData = new FormData();
          formData.append('file_id', file_id);
          formData.append('filename', filename);
          formData.append('dpi', String(dpi || 150));
          formData.append('format', format);
          if (pageScope === 'custom' && targetPageIndices.length > 0) {
            formData.append('pages', JSON.stringify(targetPageIndices.map(i => i + 1)));
          }

          const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/pdf-to-image`, {
            method: 'POST',
            body: formData
          });

          if (convertRes.ok) {
            const { job_id } = await convertRes.json();
            let pollStatus = 'queued';
            let tries = 0;
            while (pollStatus !== 'finished' && pollStatus !== 'failed' && tries < 300) {
              await new Promise(r => setTimeout(r, 1000));
              tries++;
              const stRes = await apiFetch(`${BACKEND_URL}/api/job/${job_id}/status`);
              if (stRes.ok) {
                const stData = await stRes.json();
                pollStatus = stData.status;
                if (pollStatus === 'finished' && stData.download_url) {
                  const dlRes = await fetch(`${BACKEND_URL}${stData.download_url}`);
                  if (dlRes.ok) {
                    zipBlob = await dlRes.blob();
                    serverSuccess = true;
                  }
                  break;
                } else if (pollStatus === 'failed') {
                  break;
                } else {
                  setProgress(25 + Math.min(65, tries * 2));
                  setProgressStage(`Server rendering pages (${25 + Math.min(65, tries * 2)}%)...`);
                }
              }
            }
          }
        } catch (serverErr) {
          console.warn('[PdfToImage] Server rendering unavailable, falling back to client JS:', serverErr);
        }

        if (!serverSuccess || !zipBlob) {
          // Client-Side Fallback
          setProgressStage('Rendering high-resolution pages in parallel...');
          const { blobs, names } = await pdfToImages(file, conversionOptions, (p) => {
            setProgress(Math.round(p * 0.7));
            setProgressStage(`Rendering pages (${Math.round(p * 0.7)}%)...`);
          });

          setProgressStage('Packaging images into compressed ZIP archive...');
          const zip = new JSZip();
          blobs.forEach((b, i) => zip.file(names[i], b));

          zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
            setProgress(70 + Math.round(meta.percent * 0.3));
          });
        }

        const previewUrls = previewBlobsRef.current.slice(0, 6).map((b) => b.url || URL.createObjectURL(b));

        setResult({
          mode: 'zip',
          zipBlob,
          name: finalName,
          size: zipBlob.size,
          totalPages: totalPages || 1,
          format: format.toUpperCase(),
          scale: `${scale}× (${dpi} DPI)`,
          previewUrls
        });

        await saveFile(finalName, zipBlob.size, 'application/zip', 'PDF to Images', zipBlob);
        await clearStudioDraft('pdf-to-image');
      }
    } catch (err) {
      console.error('PDF to Images conversion error:', err);
      setError(err.message || 'Conversion failed. Please verify the PDF is not password protected or corrupted.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadZip = () => {
    if (!result?.zipBlob) return;
    saveAs(result.zipBlob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('pdf-to-image');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressStage('');
    setPageScope('all');
    setCustomRange('');
    setFormat('png');
    setScale(2);
    setQuality(0.92);
  };

  const filteredThumbs = useMemo(() => {
    if (!searchQuery.trim()) return pageThumbnails;
    const q = searchQuery.trim();
    return pageThumbnails.filter((t) => t.pageNumber.toString().includes(q));
  }, [pageThumbnails, searchQuery]);

  return (
    <ToolPageLayout
      toolId="pdf-to-image"
      title="PDF to Images Studio"
      description="Convert PDF pages into crystal-clear PNG, JPG, or WebP images with custom DPI resolutions."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="PDF to Images Online Free — High-Resolution Page Converter | DocScalar"
        description="Convert PDF pages to lossless PNG, JPG, or WebP images. Stream directly to disk or download as a ZIP archive."
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
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-medium)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
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
                      <div className="h-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    {totalPages > 0 && (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] shrink-0">
                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                        <span>{targetPageIndices.length} / {totalPages} Selected</span>
                      </div>
                    )}

                    {/* Quick Selection Buttons */}
                    <button
                      type="button"
                      onClick={selectAllPages}
                      className="h-8 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer transition-colors shrink-0"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllPages}
                      className="h-8 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] cursor-pointer transition-colors shrink-0"
                    >
                      Clear
                    </button>
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
                        className="h-8 pl-7 pr-2.5 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-24"
                      />
                    </div>

                    {/* Grid Density Zoom */}
                    <div className="h-8 flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setZoomLevel(3)}
                        className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${zoomLevel === 3 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Compact View"
                      >
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${zoomLevel === 1 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Standard View"
                      >
                        <span className="material-symbols-outlined text-[16px]">view_module</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(2)}
                        className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${zoomLevel === 2 ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'}`}
                        title="Large View"
                      >
                        <span className="material-symbols-outlined text-[16px]">crop_free</span>
                      </button>
                    </div>

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

              {/* Central Visual Document Grid */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-pattern select-none">
                {loadingThumbnails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Generating page thumbnails...</span>
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
                    {filteredThumbs.map((thumb) => {
                      const isSelected = selectedPages.has(thumb.pageNumber);
                      return (
                        <div
                          key={thumb.pageNumber}
                          onClick={() => togglePageSelection(thumb.pageNumber)}
                          className={`group relative flex flex-col bg-[var(--bg-primary)] rounded-xl border overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                              : 'border-[var(--border-subtle)] opacity-60 hover:opacity-100'
                          }`}
                        >
                          {/* Header Checkbox Pill */}
                          <div className="px-2.5 py-1.5 flex items-center justify-between bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                            <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                              Page #{thumb.pageNumber}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 accent-[var(--color-primary)] cursor-pointer"
                            />
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
                      );
                    })}
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
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">image</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Image Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {targetPageIndices.length} Pages
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Image Format Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output Format
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'png', label: 'PNG', desc: 'Lossless' },
                      { id: 'jpeg', label: 'JPG', desc: 'Compact' },
                      { id: 'webp', label: 'WebP', desc: 'Modern' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormat(fmt.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                          format === fmt.id
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{fmt.label}</span>
                        <span className="text-[9px] opacity-75">{fmt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Quality Slider (for JPG & WebP) */}
                  {format !== 'png' && (
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-1.5 mt-1 animate-[fadeIn_0.15s_ease-out]">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[var(--text-secondary)]">Image Quality</span>
                        <span className="text-[var(--color-primary)] font-bold">{Math.round(quality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Rendering DPI / Scale */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Resolution / DPI Scale
                  </span>
                  <DpiQualitySelector
                    dpi={dpi}
                    onChange={(newDpi) => {
                      setDpi(newDpi);
                      if (newDpi === 72) setScale(1);
                      else if (newDpi === 150) setScale(2);
                      else if (newDpi === 300) setScale(4);
                      else if (newDpi === 600) setScale(8);
                    }}
                    mode="segmented"
                  />
                </div>

                {/* 3. Page Selection Scope */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Pages to Convert
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPageScope('all')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pageScope === 'all'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      All ({totalPages})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageScope('custom')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pageScope === 'custom'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {pageScope === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. 1-3, 5, 8"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none animate-[fadeIn_0.15s_ease-out]"
                    />
                  )}
                </div>

                {/* 4. Export Mode */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Export Delivery Mode
                  </span>

                  {SUPPORTS_DIR_PICKER && (
                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      exportMode === 'folder'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                    }`}>
                      <input
                        type="radio"
                        name="exportMode"
                        value="folder"
                        checked={exportMode === 'folder'}
                        onChange={() => setExportMode('folder')}
                        className="mt-0.5 accent-[var(--color-primary)] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Direct Folder Export</span>
                          <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            Fast Stream
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Stream-saves images directly to disk with zero memory limits.
                        </p>
                      </div>
                    </label>
                  )}

                  <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    exportMode === 'zip'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                  }`}>
                    <input
                      type="radio"
                      name="exportMode"
                      value="zip"
                      checked={exportMode === 'zip'}
                      onChange={() => setExportMode('zip')}
                      className="mt-0.5 accent-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Download ZIP Archive</span>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        Bundles all converted images into a single downloadable .zip archive.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 5. Custom Output Filename */}
                {exportMode === 'zip' && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Output ZIP Filename
                    </label>
                    <input
                      type="text"
                      value={outputArchiveName}
                      onChange={(e) => setOutputArchiveName(e.target.value)}
                      placeholder="document-images.zip"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)] shrink-0">
                          progress_activity
                        </span>
                        <span className="truncate" title={progressStage || 'Converting...'}>
                          {progressStage || 'Converting...'}
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
                  onClick={handleConvert}
                  disabled={processing || files.length === 0 || targetPageIndices.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>{exportMode === 'folder' ? `Exporting (${streamedPages}/${totalStreamPages})...` : `Converting (${progress}%)...`}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {exportMode === 'folder' ? 'folder_open' : 'photo_library'}
                      </span>
                      <span>{exportMode === 'folder' ? 'Export to Folder' : `Convert ${targetPageIndices.length} Pages`}</span>
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
          <div className="max-w-2xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Conversion Complete!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.mode === 'folder'
                  ? `${result.totalPages} pages saved directly to "${result.folderName}" on your device.`
                  : `${result.totalPages} high-resolution ${result.format} images bundled into ZIP archive.`}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.mode === 'folder' ? 'folder_open' : 'folder_zip'}
                </span>
                <span className="truncate max-w-[220px]">{result.name || result.folderName}</span>
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
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.totalPages}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{result.format}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Resolution</span>
                <span className="text-xs font-bold text-[var(--text-primary)] mt-1">{result.scale}</span>
              </div>
            </div>

            {/* Visual Image Preview Grid */}
            {result.previewUrls && result.previewUrls.length > 0 && (
              <div className="w-full flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] text-left">
                  Sample Rendered Images
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)]">
                  {result.previewUrls.map((url, i) => (
                    <div key={i} className="aspect-3/4 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-xs">
                      <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              {result.mode === 'zip' && (
                <button
                  type="button"
                  className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={downloadZip}
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Download ZIP Archive</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Convert Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with PDF Tools
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/image-to-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">picture_as_pdf</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Images to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Combine images</p>
                  </div>
                </Link>

                <Link
                  to="/extract-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">call_split</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Extract Pages</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Export PDF pages</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
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
