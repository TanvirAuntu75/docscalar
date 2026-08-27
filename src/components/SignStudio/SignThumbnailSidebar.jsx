import { useState, useEffect, useRef } from 'react';

/**
 * Renders a single lightweight PDF page thumbnail
 */
function PageThumbnailItem({
  pdfDocument,
  pageIndex,
  isActive,
  fieldCount,
  onSelect
}) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  const renderTaskRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocument) return;

    const renderThumb = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const page = await pdfDocument.getPage(pageIndex + 1);
        if (isCancelled) return;

        // Target thumbnail width around 136px for clear, comfortable page preview
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const thumbScale = 136 / unscaledViewport.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: thumbScale * dpr });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) setRendered(true);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Thumbnail render error on page ${pageIndex + 1}:`, err);
        }
      }
    };

    renderThumb();
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDocument, pageIndex]);

  return (
    <div
      onClick={() => onSelect(pageIndex)}
      className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)] shadow-sm'
          : 'hover:bg-[var(--bg-tertiary)] opacity-80 hover:opacity-100'
      }`}
    >
      {/* Thumbnail Card */}
      <div className="relative w-[136px] bg-white rounded-lg shadow-sm overflow-hidden border border-[var(--border-subtle)] aspect-[1/1.35] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block pointer-events-none bg-white"
        />

        {!rendered && (
          <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800 animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">...</span>
          </div>
        )}

        {/* Field Count Badge */}
        {fieldCount > 0 && (
          <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">draw</span>
            <span>{fieldCount}</span>
          </div>
        )}
      </div>

      {/* Page Number Label */}
      <span
        className={`text-xs font-semibold transition-colors px-2 py-0.5 rounded-full ${
          isActive
            ? 'text-[var(--color-primary)] font-bold bg-[var(--color-primary)]/15'
            : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
        }`}
      >
        {pageIndex + 1}
      </span>
    </div>
  );
}

export default function SignThumbnailSidebar({
  pdfDocument,
  totalPages = 1,
  activePageIndex = 0,
  onSelectPage,
  fields = [],
  isOpen = true,
  onToggle
}) {
  const sidebarRef = useRef(null);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (!sidebarRef.current) return;
    const activeEl = sidebarRef.current.querySelector(`[data-thumb-index="${activePageIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activePageIndex]);

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-4 px-1.5 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] z-10">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Show Page Thumbnails"
        >
          <span className="material-symbols-outlined text-[20px]">view_sidebar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[170px] min-w-[170px] max-w-[170px] h-full flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] select-none z-10 transition-all">
      
      {/* Header */}
      <div className="p-3 px-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Pages ({totalPages})
        </span>
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Hide Thumbnails"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
      </div>

      {/* Thumbnails Scroll List */}
      <div
        ref={sidebarRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar"
      >
        {Array.from({ length: totalPages }).map((_, index) => {
          const pageFieldCount = fields.filter((f) => f.pageIndex === index).length;
          return (
            <div key={index} data-thumb-index={index}>
              <PageThumbnailItem
                pdfDocument={pdfDocument}
                pageIndex={index}
                isActive={activePageIndex === index}
                fieldCount={pageFieldCount}
                onSelect={onSelectPage}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
