import { useEffect, useRef, useState } from 'react';

/**
 * Individual Page Thumbnail Card matching iLovePDF
 */
function PageThumbnailItem({
  pdfDocument,
  pageIndex,
  isActive,
  fieldCount,
  onClick
}) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocument) return;

    const renderThumb = async () => {
      try {
        const page = await pdfDocument.getPage(pageIndex + 1);
        if (isCancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport
        };

        await page.render(renderContext).promise;
        if (!isCancelled) setRendered(true);
      } catch (err) {
        console.warn(`Thumbnail render error on page ${pageIndex + 1}:`, err);
      }
    };

    renderThumb();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, pageIndex]);

  return (
    <div className="relative group flex flex-col items-center select-none">
      <button
        onClick={() => onClick(pageIndex)}
        className={`relative w-full aspect-[1/1.35] bg-white rounded shadow-sm overflow-hidden flex items-center justify-center border-2 transition-all cursor-pointer ${
          isActive
            ? 'border-primary shadow-md ring-2 ring-primary/20'
            : 'border-outline-variant/50 hover:border-primary/60 hover:shadow'
        }`}
      >
        <canvas ref={canvasRef} className="w-full h-full object-contain block pointer-events-none" />
        {!rendered && (
          <div className="absolute inset-0 bg-surface-container/60 animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-on-surface-variant/40 font-mono">{pageIndex + 1}</span>
          </div>
        )}

        {/* Active Blue Indicator Dot on Right Edge */}
        {isActive && (
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-3 bg-primary rounded-l-sm pointer-events-none" />
        )}
      </button>

      {/* Page Number Label */}
      <span className={`text-[11px] font-medium mt-1 transition-colors ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
        {pageIndex + 1}
      </span>

      {/* iLovePDF-style Placed Fields Badge */}
      {fieldCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-[#e53e3e] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-scaleIn">
          {fieldCount}
        </div>
      )}
    </div>
  );
}

export default function SignThumbnailStrip({
  pdfDocument,
  totalPages,
  activePageIndex,
  onSelectPage,
  getFieldCountForPage
}) {
  return (
    <aside className="w-24 flex-shrink-0 bg-surface-container-low border-r border-outline-variant/40 flex flex-col h-full overflow-hidden select-none">
      {/* Scrollable Thumbnails List */}
      <div className="flex-1 p-2.5 overflow-y-auto flex flex-col gap-4 no-scrollbar">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <PageThumbnailItem
            key={idx}
            pdfDocument={pdfDocument}
            pageIndex={idx}
            isActive={activePageIndex === idx}
            fieldCount={getFieldCountForPage ? getFieldCountForPage(idx) : 0}
            onClick={onSelectPage}
          />
        ))}
      </div>
    </aside>
  );
}
