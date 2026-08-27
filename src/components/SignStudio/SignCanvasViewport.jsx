import { useState, useRef, useEffect } from 'react';
import SignFieldOverlay from './SignFieldOverlay';
import SignThumbnailSidebar from './SignThumbnailSidebar';

/**
 * Individual PDF Page Viewport Container
 */
function DocumentPageContainer({
  pdfDocument,
  pageIndex,
  scale,
  fields,
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onRemoveField,
  onDuplicateField,
  onApplyAll,
  onEditField,
  totalPages,
  onDropField,
  onDimensionsChange
}) {
  const canvasRef = useRef(null);
  const pageOverlayRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [rendered, setRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        setIsRendering(true);

        // Safely cancel any active render in flight
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const page = await pdfDocument.getPage(pageIndex + 1);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const width = unscaledViewport.width;
        const height = unscaledViewport.height;
        
        setPageSize({ width, height });
        if (onDimensionsChange) {
          onDimensionsChange({ width, height });
        }

        // Super-Sampled High-DPI Resolution:
        // Ensures crisp, print-quality rendering for complex Asian kanji, Indic scripts, and fine typography at all zoom levels
        const deviceDpr = window.devicePixelRatio || 1;
        const superSampleFactor = Math.max(deviceDpr, 2.0);
        const renderScale = Math.max(scale * superSampleFactor * 1.5, 2.0);
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Immediately paint crisp white background to prevent any black/transparent flash
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
          intent: 'display'
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setRendered(true);
          setIsRendering(false);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Render error on page ${pageIndex + 1}:`, err);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDocument, pageIndex, scale]);

  // Handle dropping field from sidebar palette
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/docforge-sign-field');
    if (!rawData) return;
    try {
      const fieldData = JSON.parse(rawData);
      const rect = pageOverlayRef.current.getBoundingClientRect();
      const dropX = Math.max(0, Math.min(1 - (fieldData.width || 0.25), (e.clientX - rect.left) / rect.width));
      const dropY = Math.max(0, Math.min(1 - (fieldData.height || 0.08), (e.clientY - rect.top) / rect.height));

      onDropField({
        ...fieldData,
        pageIndex,
        x: dropX,
        y: dropY
      });
    } catch (err) {
      console.error('Failed to parse dropped field data:', err);
    }
  };

  const visualWidth = Math.round(pageSize.width * scale);
  const visualHeight = Math.round(pageSize.height * scale);

  return (
    <div
      id={`sign-page-${pageIndex}`}
      data-page-index={pageIndex}
      style={{
        width: `${visualWidth}px`,
        height: `${visualHeight}px`,
        maxWidth: `${visualWidth}px`,
        maxHeight: `${visualHeight}px`,
        minWidth: `${visualWidth}px`,
        minHeight: `${visualHeight}px`,
        aspectRatio: `${pageSize.width} / ${pageSize.height}`,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--border-subtle)',
        borderRadius: '6px',
        backgroundColor: '#ffffff'
      }}
      className="relative flex-shrink-0 transition-all duration-75 select-none my-6 mx-auto overflow-hidden bg-white"
    >
      {/* High-DPI PDF.js Render Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${visualWidth}px`,
          height: `${visualHeight}px`,
          display: 'block',
          backgroundColor: '#ffffff',
          imageRendering: '-webkit-optimize-contrast'
        }}
        className="block pointer-events-none bg-white"
      />

      {/* Sleek Minimal Top Loading Hairline (No Dark Blocking Covers) */}
      {isRendering && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--color-primary)]/20 overflow-hidden z-20">
          <div className="w-full h-full bg-[var(--color-primary)] animate-pulse" />
        </div>
      )}

      {/* Interactive Overlay Plane */}
      <div
        ref={pageOverlayRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="absolute inset-0 z-10"
      >
        {fields.map((field) => (
          <SignFieldOverlay
            key={field.id}
            field={field}
            isSelected={selectedFieldId === field.id}
            onSelect={onSelectField}
            onUpdate={onUpdateField}
            onRemove={onRemoveField}
            onDuplicate={onDuplicateField}
            onApplyAll={onApplyAll}
            onEdit={onEditField}
            totalPages={totalPages}
            containerRef={pageOverlayRef}
          />
        ))}
      </div>
    </div>
  );
}

export default function SignCanvasViewport({
  fileName,
  pdfDocument,
  totalPages,
  activePageIndex,
  setActivePageIndex,
  fields,
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onRemoveField,
  onDuplicateField,
  onApplyAll,
  onAlignField = () => {},
  onNudgeField = () => {},
  undo = () => {},
  redo = () => {},
  canUndo = false,
  canRedo = false,
  onEditField,
  onAddField,
  onReplacePdf,
  onOpenSignatureModal
}) {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(totalPages > 1);
  const [currentPageDimensions, setCurrentPageDimensions] = useState({ width: 612, height: 792 });
  const viewportScrollRef = useRef(null);

  // Auto-fit page to viewport (Fit Page) on document load and dimensions change
  useEffect(() => {
    if (viewportScrollRef.current && currentPageDimensions.width > 0 && currentPageDimensions.height > 0) {
      const containerHeight = viewportScrollRef.current.clientHeight - 80;
      const containerWidth = viewportScrollRef.current.clientWidth - 80;
      if (containerHeight > 0 && containerWidth > 0) {
        const heightScale = containerHeight / (currentPageDimensions.height || 792);
        const widthScale = containerWidth / (currentPageDimensions.width || 612);
        const targetFitPageScale = Math.max(0.3, Math.min(2.0, Math.min(heightScale, widthScale) * 0.95));
        setZoomScale(Number(targetFitPageScale.toFixed(2)));
      }
    }
  }, [pdfDocument, currentPageDimensions.width, currentPageDimensions.height]);

  // Update showThumbnails when totalPages changes
  useEffect(() => {
    if (totalPages > 1) {
      setShowThumbnails(true);
    }
  }, [totalPages]);

  // Global Keyboard Shortcuts (Undo, Redo, Delete, Nudge, Duplicate, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is actively typing in an input or textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete / Backspace: Remove active field
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId) {
        e.preventDefault();
        onRemoveField(selectedFieldId);
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedFieldId) {
        e.preventDefault();
        onDuplicateField(selectedFieldId);
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        onSelectField(null);
        return;
      }

      // Arrow Nudging (1px or 5px with Shift)
      if (selectedFieldId) {
        const step = e.shiftKey ? 0.02 : 0.005;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onNudgeField(selectedFieldId, -step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNudgeField(selectedFieldId, step, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onNudgeField(selectedFieldId, 0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onNudgeField(selectedFieldId, 0, step);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, undo, redo, onRemoveField, onDuplicateField, onNudgeField, onSelectField]);

  // Non-passive native wheel listener to cleanly intercept trackpad 2-finger pinch
  useEffect(() => {
    const scrollEl = viewportScrollRef.current;
    if (!scrollEl) return;

    const handleNativeWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const zoomDelta = -e.deltaY * 0.003;
        const factor = Math.exp(zoomDelta);
        setZoomScale((prev) => {
          const next = Math.max(0.25, Math.min(3.0, prev * factor));
          return Number(next.toFixed(2));
        });
      }
    };

    scrollEl.addEventListener('wheel', handleNativeWheel, { passive: false });

    const handleGesture = (e) => {
      e.preventDefault();
    };
    scrollEl.addEventListener('gesturestart', handleGesture, { passive: false });
    scrollEl.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      scrollEl.removeEventListener('wheel', handleNativeWheel);
      scrollEl.removeEventListener('gesturestart', handleGesture);
      scrollEl.removeEventListener('gesturechange', handleGesture);
    };
  }, []);

  // Zoom preset buttons
  const fitWidth = () => {
    if (!viewportScrollRef.current) return;
    const containerWidth = viewportScrollRef.current.clientWidth - 80;
    const targetScale = Math.max(0.3, Math.min(2.5, (containerWidth / (currentPageDimensions.width || 612)) * 0.95));
    setZoomScale(Number(targetScale.toFixed(2)));
  };

  const fitPage = () => {
    if (!viewportScrollRef.current) return;
    const containerHeight = viewportScrollRef.current.clientHeight - 80;
    const containerWidth = viewportScrollRef.current.clientWidth - 80;
    const heightScale = containerHeight / (currentPageDimensions.height || 792);
    const widthScale = containerWidth / (currentPageDimensions.width || 612);
    const targetScale = Math.max(0.3, Math.min(2.0, Math.min(heightScale, widthScale) * 0.95));
    setZoomScale(Number(targetScale.toFixed(2)));
  };

  return (
    <div className="studio-canvas-area flex-1 flex flex-col min-h-0 h-full overflow-hidden relative select-none bg-[var(--bg-tertiary)]">
      
      {/* Sticky Workspace Toolbar */}
      <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
        <div className="p-2.5 px-5 flex items-center justify-between flex-wrap gap-3">
          
          {/* Left: Replace PDF, Draw Signature, Thumbnails & History */}
          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <button
                onClick={() => setShowThumbnails((prev) => !prev)}
                className={`btn btn-secondary btn-sm flex items-center gap-1.5 ${
                  showThumbnails ? 'bg-[var(--bg-tertiary)] text-[var(--color-primary)] font-bold' : ''
                }`}
                title={showThumbnails ? 'Hide Page Thumbnails' : 'Show Page Thumbnails'}
              >
                <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                <span className="hidden sm:inline">Pages</span>
              </button>
            )}

            <label className="btn btn-primary btn-sm cursor-pointer flex items-center gap-1.5 shadow-xs">
              <span className="material-symbols-outlined text-[16px]">file_upload</span>
              Replace PDF
              <input type="file" accept=".pdf" className="hidden" onChange={onReplacePdf} />
            </label>

            <button
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              onClick={() => onOpenSignatureModal('signature')}
            >
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">draw</span>
              Draw Signature
            </button>

            {/* Undo / Redo controls */}
            <div className="flex items-center gap-0.5 bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] ml-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <span className="material-symbols-outlined text-[16px]">redo</span>
              </button>
            </div>
          </div>

          {/* Center: Page Navigation */}
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-2 py-1 rounded-xl border border-[var(--border-subtle)] shadow-xs">
            <button
              className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              title="Previous Page"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <span className="text-xs font-bold text-[var(--text-primary)] px-2 min-w-[90px] text-center">
              Page {activePageIndex + 1} of {totalPages}
            </span>

            <button
              className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              disabled={activePageIndex === totalPages - 1}
              onClick={() => setActivePageIndex((p) => Math.min(totalPages - 1, p + 1))}
              title="Next Page"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Right: Zoom Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1 rounded-xl border border-[var(--border-subtle)] shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)]">zoom_out</span>
              <input
                type="range"
                min="25"
                max="200"
                step="5"
                value={Math.round(zoomScale * 100)}
                onChange={(e) => setZoomScale(parseInt(e.target.value) / 100)}
                className="w-24 accent-[var(--color-primary)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg"
              />
              <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)]">zoom_in</span>
              <span className="text-xs font-mono font-bold text-[var(--text-primary)] ml-1 w-10 text-right">
                {Math.round(zoomScale * 100)}%
              </span>
            </div>

            <button
              className="btn btn-secondary btn-sm px-2.5 py-1 text-xs font-medium"
              onClick={fitWidth}
            >
              Fit Width
            </button>
            <button
              className="btn btn-secondary btn-sm px-2.5 py-1 text-xs font-medium"
              onClick={fitPage}
            >
              Fit Page
            </button>
          </div>

        </div>
      </div>

      {/* Main Workspace Body with Left Thumbnail Strip + Centered Canvas */}
      <div className="flex-1 flex min-h-0 h-full w-full overflow-hidden relative">
        
        {/* Left Thumbnail Sidebar Navigator */}
        {totalPages > 1 && (
          <SignThumbnailSidebar
            pdfDocument={pdfDocument}
            totalPages={totalPages}
            activePageIndex={activePageIndex}
            onSelectPage={setActivePageIndex}
            fields={fields}
            isOpen={showThumbnails}
            onToggle={() => setShowThumbnails((prev) => !prev)}
          />
        )}

        {/* Main Center Canvas Scroll Area */}
        <div
          ref={viewportScrollRef}
          onClick={(e) => {
            if (e.target === viewportScrollRef.current || e.target.classList.contains('studio-canvas-scroll')) {
              onSelectField(null);
            }
          }}
          className="studio-canvas-scroll flex-1 w-full overflow-auto p-8 flex flex-col items-center justify-start select-none bg-[var(--bg-tertiary)] bg-pattern touch-none"
        >
          <DocumentPageContainer
            key={activePageIndex}
            pdfDocument={pdfDocument}
            pageIndex={activePageIndex}
            scale={zoomScale}
            fields={fields.filter((f) => f.pageIndex === activePageIndex)}
            selectedFieldId={selectedFieldId}
            onSelectField={onSelectField}
            onUpdateField={onUpdateField}
            onRemoveField={onRemoveField}
            onDuplicateField={onDuplicateField}
            onApplyAll={onApplyAll}
            onEditField={onEditField}
            totalPages={totalPages}
            onDropField={onAddField}
            onDimensionsChange={setCurrentPageDimensions}
          />
        </div>

      </div>

    </div>
  );
}
