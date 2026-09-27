import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { imagesToPdf } from '../../engines/pdf/imageToPdf';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { formatFileSize } from '../../utils/constants';

export default function ImageToPdf() {
  const [files, setFiles] = useState([]);
  const [imageItems, setImageItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Studio Options
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [pageSize, setPageSize] = useState('a4'); // 'fit' | 'a4' | 'letter'
  const [margin, setMargin] = useState(0); // 0 = none, 15 = small, 30 = big
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2); // 1 = small, 2 = medium, 3 = large

  // Drag & drop reordering state
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Restore draft session on mount if available
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('image-to-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'image.jpg', {
              type: f.type || 'image/jpeg',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.orientation) setOrientation(draft.orientation);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.margin !== undefined) setMargin(draft.margin);
          if (draft.autoEnhance !== undefined) setAutoEnhance(draft.autoEnhance);
        }
      } catch (err) {
        console.warn('Image draft restoration failed:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save draft session when files change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('image-to-pdf', {
        files,
        orientation,
        pageSize,
        margin,
        autoEnhance
      });
    }
  }, [files, orientation, pageSize, margin, autoEnhance]);

  // Sync files to imageItems with object URLs
  useEffect(() => {
    if (files.length === 0) {
      setImageItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
      return;
    }

    setImageItems((prevItems) => {
      const existingMap = new Map(prevItems.map((item) => [item.file, item]));
      const nextItems = files.map((file) => {
        if (existingMap.has(file)) {
          return existingMap.get(file);
        }
        return {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          rotation: 0
        };
      });

      // Cleanup revoked items
      prevItems.forEach((item) => {
        if (!files.includes(item.file)) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      return nextItems;
    });
  }, [files]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      imageItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  // Add more files handler (with strict image type filtering)
  const handleAddMoreFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|svg|bmp|tiff?|gif)$/i.test(f.name)
    );
    if (!newFiles.length) return;
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  // Reorder handlers (Drag and Drop)
  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIndex = dragIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    setImageItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      // Sync files state
      setFiles(next.map((item) => item.file));
      return next;
    });
    dragIndexRef.current = null;
  };

  // Move left / right
  const moveItem = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= imageItems.length) return;
    setImageItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      setFiles(next.map((item) => item.file));
      return next;
    });
  };

  // Rotate individual item
  const rotateItem = (index, degrees) => {
    setImageItems((prev) => {
      const next = [...prev];
      const current = next[index].rotation || 0;
      next[index] = {
        ...next[index],
        rotation: (current + degrees + 360) % 360
      };
      return next;
    });
  };

  // Rotate all items
  const rotateAll = (degrees) => {
    setImageItems((prev) =>
      prev.map((item) => ({
        ...item,
        rotation: ((item.rotation || 0) + degrees + 360) % 360
      }))
    );
  };

  // Remove individual item
  const removeItem = (index) => {
    setImageItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      setFiles(next.map((item) => item.file));
      return next;
    });
  };

  // Sort by filename
  const sortByName = () => {
    setImageItems((prev) => {
      const next = [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' }));
      setFiles(next.map((item) => item.file));
      return next;
    });
  };

  // Reverse order
  const reverseOrder = () => {
    setImageItems((prev) => {
      const next = [...prev].reverse();
      setFiles(next.map((item) => item.file));
      return next;
    });
  };

  // Convert execution
  const handleConvert = async () => {
    if (!imageItems.length) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const orderedFiles = imageItems.map((item) => item.file);
      const rotations = imageItems.map((item) => item.rotation || 0);
      const options = {
        orientation,
        pageSize,
        margin,
        autoEnhance
      };

      const blob = await imagesToPdf(orderedFiles, rotations, options, setProgress);
      setResult(blob);

      try {
        const outputName = imageItems.length === 1
          ? `${imageItems[0].file.name.replace(/\.[^/.]+$/, '')}.pdf`
          : 'images-combined.pdf';
        await saveFile(outputName, blob.size, 'application/pdf', 'Images to PDF', blob);
      } catch (dbErr) {
        console.error('Failed to save to workspace:', dbErr);
      }

      // Clear draft since conversion succeeded
      await clearStudioDraft('image-to-pdf');
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    clearStudioDraft('image-to-pdf');
    imageItems.forEach((item) => {
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFiles([]);
    setImageItems([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  // Grid columns styling helper
  const getGridTemplate = () => {
    if (zoomLevel === 1) return 'repeat(auto-fill, minmax(130px, 1fr))';
    if (zoomLevel === 3) return 'repeat(auto-fill, minmax(220px, 1fr))';
    return 'repeat(auto-fill, minmax(170px, 1fr))';
  };

  return (
    <ToolPageLayout
      toolId="image-to-pdf"
      title="Images to PDF"
      description="Convert images (JPG, PNG, WebP) into a clean, professional PDF document."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Images to PDF Converter — Convert JPG & PNG to PDF | DocScalar"
        description="Convert JPG, PNG, WebP, and SVG images to PDF with custom orientation, margins, and page sizes. High-fidelity, private conversion."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp,.tiff,.gif"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Image Canvas Workspace                         */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto relative bg-[var(--bg-tertiary)]">
              {/* Sticky Workspace Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="h-8 px-3.5 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs text-xs font-semibold select-none shrink-0">
                      <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                      <span>Add Images</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp,.tiff,.gif"
                        className="hidden"
                        onChange={handleAddMoreFiles}
                        title=""
                        tabIndex={-1}
                      />
                    </label>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    <button
                      type="button"
                      onClick={() => rotateAll(-90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all images left 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_left</span>
                      <span className="hidden sm:inline">Rotate Left</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotateAll(90)}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Rotate all images right 90°"
                    >
                      <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                      <span className="hidden sm:inline">Rotate Right</span>
                    </button>

                    <button
                      type="button"
                      onClick={sortByName}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Sort images alphabetically"
                    >
                      <span className="material-symbols-outlined text-[15px]">sort_by_alpha</span>
                      <span className="hidden md:inline">Sort A-Z</span>
                    </button>

                    <button
                      type="button"
                      onClick={reverseOrder}
                      className="h-8 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Reverse image sequence"
                    >
                      <span className="material-symbols-outlined text-[15px]">swap_vert</span>
                      <span className="hidden md:inline">Reverse</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] hidden lg:inline">
                      {imageItems.length} {imageItems.length === 1 ? 'image' : 'images'}
                    </span>

                    {/* Card Size / Zoom Slider */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_out</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                        className="w-16 h-1 accent-[var(--color-primary)] cursor-pointer"
                        title="Adjust image card size"
                      />
                      <span className="material-symbols-outlined text-[13px] text-[var(--text-secondary)]">zoom_in</span>
                    </div>

                    <button
                      type="button"
                      onClick={reset}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Clear all images"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Grid of Images */}
              <div className="workspace-canvas flex-1 p-4 sm:p-6">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: getGridTemplate(),
                    gap: zoomLevel === 1 ? '0.75rem' : '1.25rem'
                  }}
                  className="w-full"
                >
                  {imageItems.map((item, index) => {
                    const isDragging = dragIndexRef.current === index;
                    const isOver = dragOverIndex === index;

                    return (
                      <div
                        key={item.id}
                        draggable={!processing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group relative flex flex-col bg-[var(--bg-primary)] border rounded-xl overflow-hidden select-none transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                          isOver
                            ? 'border-2 border-[var(--color-primary)] scale-[1.02] shadow-lg ring-2 ring-[var(--color-primary)]/20'
                            : isDragging
                            ? 'opacity-40 border-dashed border-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--color-primary)]/60'
                        }`}
                      >
                        {/* Sequence Number Badge */}
                        <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          #{index + 1}
                        </div>

                        {/* Hover Quick Action Buttons */}
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-xs p-0.5 rounded-lg shadow-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateItem(index, -90);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Rotate Left 90°"
                          >
                            <span className="material-symbols-outlined text-[13px]">rotate_left</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateItem(index, 90);
                            }}
                            className="p-1 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                            title="Rotate Right 90°"
                          >
                            <span className="material-symbols-outlined text-[13px]">rotate_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(index);
                            }}
                            className="p-1 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded transition-colors cursor-pointer"
                            title="Remove Image"
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>
                        </div>

                        {/* Image Preview Container */}
                        <div className="w-full aspect-[4/5] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            style={{
                              transform: `rotate(${item.rotation || 0}deg)`,
                              transition: 'transform 0.2s ease-out'
                            }}
                            className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
                            draggable={false}
                          />
                        </div>

                        {/* Card Footer Details & Reorder Arrows */}
                        <div className="p-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate" title={item.file.name}>
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              {formatFileSize(item.file.size)}
                              {item.rotation !== 0 && (
                                <span className="ml-1 text-[var(--color-primary)] font-bold">
                                  ({item.rotation}°)
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(index, -1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Left"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            </button>
                            <button
                              type="button"
                              disabled={index === imageItems.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(index, 1);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Right"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add More Drop Target Card */}
                  <label
                    className="flex flex-col items-center justify-center aspect-[4/5] bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-primary)] border-2 border-dashed border-[var(--border-medium)] hover:border-[var(--color-primary)] rounded-xl cursor-pointer transition-all gap-2 group p-4 text-center select-none shadow-xs"
                    title="Click or drag to add more images"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] group-hover:bg-[var(--color-primary)]/10 text-[var(--text-secondary)] group-hover:text-[var(--color-primary)] flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[24px]">add</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)]">
                      Add More
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      JPG, PNG, WebP
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp,.tiff,.gif"
                      className="hidden"
                      onChange={handleAddMoreFiles}
                      title=""
                      tabIndex={-1}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tune</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Image to PDF Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {imageItems.length} {imageItems.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Page Orientation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Page Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        orientation === 'portrait'
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold shadow-xs'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">portrait</span>
                      <span className="text-xs">Portrait</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        orientation === 'landscape'
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold shadow-xs'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">landscape</span>
                      <span className="text-xs">Landscape</span>
                    </button>
                  </div>
                </div>

                {/* 2. Page Size */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Page Size
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {[
                      { id: 'fit', label: 'Fit Image' },
                      { id: 'a4', label: 'A4' },
                      { id: 'letter', label: 'US Letter' }
                    ].map((ps) => (
                      <button
                        key={ps.id}
                        type="button"
                        onClick={() => setPageSize(ps.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          pageSize === ps.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ps.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Page Margins */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Margins
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {[
                      { id: 0, label: 'No Margin' },
                      { id: 15, label: 'Small' },
                      { id: 30, label: 'Big' }
                    ].map((mg) => (
                      <button
                        key={mg.id}
                        type="button"
                        onClick={() => setMargin(mg.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          margin === mg.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Processing Enhancements */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">auto_fix_high</span>
                        Auto-Enhance Text
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Optimizes contrast for scanned receipts & docs
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoEnhance}
                      onChange={(e) => setAutoEnhance(e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                    />
                  </label>
                </div>

                {/* Progress Bar (Visible while converting) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Building PDF...
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
                  onClick={handleConvert}
                  disabled={!imageItems.length || processing}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Building PDF ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Convert to PDF</span>
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
        /* RESULT VIEW: Premium High-Fidelity Download Card                           */
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
                PDF Created Successfully!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {imageItems.length} {imageItems.length === 1 ? 'image' : 'images'} converted and merged into a single PDF.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">
                  {imageItems.length === 1
                    ? `${imageItems[0].file.name.replace(/\.[^/.]+$/, '')}.pdf`
                    : 'images-combined.pdf'}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={() => {
                  const outputName = imageItems.length === 1
                    ? `${imageItems[0].file.name.replace(/\.[^/.]+$/, '')}.pdf`
                    : 'images-combined.pdf';
                  saveAs(result, outputName);
                }}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={reset}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Convert More Images</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
