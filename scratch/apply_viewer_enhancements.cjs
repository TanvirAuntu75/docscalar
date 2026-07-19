const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/utility/DocumentViewer.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new React states
const stateTarget = `  // Layout Dials
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);`;

const stateReplacement = `  // Layout Dials
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Filters & Sidebar tabs states
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [leftSidebarTab, setLeftSidebarTab] = useState('queue');
  const [showSecureDeleteToast, setShowSecureDeleteToast] = useState(false);`;

content = content.replace(stateTarget, stateReplacement);

// 2. Add native fullscreen effect & reset functions after useJobPoller
const pollerTarget = `  // Initialize PPTX server converter poller
  const { startPolling, status: pollStatus, result: pollResult, error: pollError } = useJobPoller(BACKEND_URL);`;

const pollerReplacement = `  // Initialize PPTX server converter poller
  const { startPolling, status: pollStatus, result: pollResult, error: pollError } = useJobPoller(BACKEND_URL);

  // Reset tab to queue if active file changes or isn't a PDF
  useEffect(() => {
    if (activeFile?.extension !== 'pdf') {
      setLeftSidebarTab('queue');
    }
  }, [activeFile]);

  // Fullscreen hooks & triggers
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(\`Error attempting to enable fullscreen: \${err.message}\`);
      });
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);`;

content = content.replace(pollerTarget, pollerReplacement);

// 3. Add clearAllAndReset function after removeFile
const removeFileTarget = `  // Remove a file from queue
  const removeFile = (idxToRemove) => {
    setRawFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (activeIdx >= rawFiles.length - 1) {
      setActiveIdx(Math.max(0, rawFiles.length - 2));
    }
  };`;

const removeFileReplacement = `  // Remove a file from queue
  const removeFile = (idxToRemove) => {
    setRawFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (activeIdx >= rawFiles.length - 1) {
      setActiveIdx(Math.max(0, rawFiles.length - 2));
    }
  };

  // Securely close and clear all file data from browser memory
  const clearAllAndReset = useCallback(() => {
    files.forEach(f => {
      if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
    });
    cleanActiveUrls();
    setFiles([]);
    setRawFiles([]);
    setActiveIdx(0);
    setPdfDoc(null);
    setExcelBook(null);
    setZipFiles([]);
    setTextContent('');
    setCodeHtml('');
    setSandboxUrl('');
    setPptxSlides([]);
    setFlipH(false);
    setFlipV(false);
    setActiveFilter('none');
    setLeftSidebarTab('queue');
    setShowSecureDeleteToast(true);
    setTimeout(() => {
      setShowSecureDeleteToast(false);
    }, 4000);
  }, [files, cleanActiveUrls]);`;

content = content.replace(removeFileTarget, removeFileReplacement);

// 4. Secure Session Header Banner before Top Control Bar Toolbar
const layoutTarget = `        // Preview Workspace Layout
        <div className="flex-1 flex flex-col fixed inset-0 z-[60] bg-background">
          
          {/* Top Control Bar Toolbar */}`;

const layoutReplacement = `        // Preview Workspace Layout
        <div className="flex-1 flex flex-col fixed inset-0 z-[60] bg-background">
          
          {/* Secure Session Header Banner */}
          <div className="h-10 bg-[#0c1410] border-b border-green-500/20 px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                Secure Client-Side Session Active <span className="text-text-tertiary font-normal hidden sm:inline">| 100% Private, Zero Server Uploads</span>
              </span>
            </div>
            <button 
              onClick={clearAllAndReset}
              className="px-3 py-1 text-[10px] font-bold bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Close & Secure Delete
            </button>
          </div>
          
          {/* Top Control Bar Toolbar */}`;

content = content.replace(layoutTarget, layoutReplacement);

// 5. Replace single rotate button with Left/Right, Flip H/V and Filters select
const rotateTarget = `                  <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition ml-1"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>`;

const rotateReplacement = `                  <button 
                    onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition ml-1"
                    title="Rotate Left"
                  >
                    <RotateCw className="w-4 h-4 -scale-x-100" />
                  </button>
                  <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
                    title="Rotate Right"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setFlipH(!flipH)}
                    className={\`w-8 h-8 rounded-lg flex items-center justify-center transition \${flipH ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 hover:bg-white/10'}\`}
                    title="Flip Horizontal (Mirror)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h8M14 12h8M6 8l-4 4 4 4M18 8l4 4-4 4" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setFlipV(!flipV)}
                    className={\`w-8 h-8 rounded-lg flex items-center justify-center transition \${flipV ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 hover:bg-white/10'}\`}
                    title="Flip Vertical"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M12 2l-4 4M12 22l4-4M2 12h20" />
                    </svg>
                  </button>
                  <select 
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="text-[10px] md:text-xs bg-white/5 hover:bg-white/10 border border-outline-variant/40 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-on-background transition cursor-pointer"
                  >
                    <option value="none" className="bg-[#1e1e2e]">Normal View</option>
                    <option value="invert" className="bg-[#1e1e2e]">Dark Reading Mode</option>
                    <option value="grayscale" className="bg-[#1e1e2e]">Grayscale</option>
                    <option value="sepia" className="bg-[#1e1e2e]">Sepia</option>
                  </select>`;

content = content.replace(rotateTarget, rotateReplacement);

// 6. Connect Fullscreen button to toggleNativeFullscreen
const fullscreenTarget = `              <button 
                onClick={() => setFullscreen(!fullscreen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant/40 bg-white/5 hover:bg-white/10 transition"
                title="Focus Mode"
              >
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}`;

const fullscreenReplacement = `              <button 
                onClick={toggleNativeFullscreen}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant/40 bg-white/5 hover:bg-white/10 transition"
                title="Focus Mode"
              >
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}`;

content = content.replace(fullscreenTarget, fullscreenReplacement);

// 7. Dynamic tabbed sidebar update
const sidebarTarget = `            {/* Sidebar Left: File Switcher List */}
            {sidebarOpen && (
              <div className="w-64 border-r border-outline-variant/40 bg-secondary flex flex-col flex-shrink-0">
                <div className="p-3 border-b border-outline-variant/40 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary">
                    File Queue ({files.length})
                  </span>
                  <label className="text-[10px] font-bold text-primary hover:underline cursor-pointer">
                    + Add Files
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handleDropzoneFiles(Array.from(e.target.files))}
                    />
                  </label>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 no-scrollbar">
                  {files.map((file, i) => (
                    <div 
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={\`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer \${
                        activeIdx === i 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-white/0 border-transparent text-text-secondary hover:bg-white/5'
                      }\`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-outline-variant/40 flex items-center justify-center flex-shrink-0 text-text-secondary">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="text-xs font-semibold truncate leading-tight text-on-background">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-text-tertiary leading-none">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}`;

const sidebarReplacement = `            {/* Sidebar Left: File Switcher List */}
            {sidebarOpen && (
              <div className="w-64 border-r border-outline-variant/40 bg-secondary flex flex-col flex-shrink-0">
                {/* Dynamic Sidebar Tab Headers */}
                <div className="flex border-b border-outline-variant/40 flex-shrink-0 bg-black/10">
                  <button
                    onClick={() => setLeftSidebarTab('queue')}
                    className={\`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition \${
                      leftSidebarTab === 'queue'
                        ? 'border-primary text-primary bg-[#1e1e2e]/30'
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }\`}
                  >
                    Queue ({files.length})
                  </button>
                  {activeFile?.extension === 'pdf' && pdfDoc && (
                    <button
                      onClick={() => setLeftSidebarTab('pages')}
                      className={\`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition \${
                        leftSidebarTab === 'pages'
                          ? 'border-primary text-primary bg-[#1e1e2e]/30'
                          : 'border-transparent text-text-tertiary hover:text-text-secondary'
                      }\`}
                    >
                      Pages ({pdfTotalPages})
                    </button>
                  )}
                </div>

                {leftSidebarTab === 'queue' && (
                  <div className="p-3 border-b border-outline-variant/40 flex items-center justify-between bg-black/5 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary">
                      Files Queue
                    </span>
                    <label className="text-[10px] font-bold text-primary hover:underline cursor-pointer">
                      + Add Files
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleDropzoneFiles(Array.from(e.target.files))}
                      />
                    </label>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 no-scrollbar">
                  {leftSidebarTab === 'queue' ? (
                    files.map((file, i) => (
                      <div 
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={\`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer \${
                          activeIdx === i 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-white/0 border-transparent text-text-secondary hover:bg-white/5'
                        }\`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-outline-variant/40 flex items-center justify-center flex-shrink-0 text-text-secondary">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="text-xs font-semibold truncate leading-tight text-on-background">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-text-tertiary leading-none">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 justify-items-center py-2">
                      {Array.from({ length: pdfTotalPages }, (_, i) => (
                        <PdfThumbnail
                          key={i}
                          pdfDoc={pdfDoc}
                          pageNumber={i + 1}
                          isActive={pdfPage === i + 1}
                          onClick={() => setPdfPage(i + 1)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}`;

content = content.replace(sidebarTarget, sidebarReplacement);

// 8. Remove rotate transform style from outer container
content = content.replace(
  'style={{ transform: `rotate(${rotation}deg)` }}',
  ''
);

// 9. PDF Renderer transform & filters style application
const pdfRendererTarget = `                  {/* 1. PDF Renderer */}
                  {activeFile.extension === 'pdf' && (
                    <div className="relative border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-xl m-auto">
                      <canvas ref={canvasRef} className="block" />
                      <div ref={textLayerRef} className="absolute inset-0 text-transparent pointer-events-auto select-text font-mono opacity-80" />
                    </div>
                  )}`;

const pdfRendererReplacement = `                  {/* 1. PDF Renderer */}
                  {activeFile.extension === 'pdf' && (
                    <div 
                      className="relative border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-xl m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: \`rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none'
                      }}
                    >
                      <canvas ref={canvasRef} className="block" />
                      <div ref={textLayerRef} className="absolute inset-0 text-transparent pointer-events-auto select-text font-mono opacity-80" />
                    </div>
                  )}`;

content = content.replace(pdfRendererTarget, pdfRendererReplacement);

// 10. DOCX Renderer transform & filters style application
const docxRendererTarget = `                  {/* 2. DOCX Renderer */}
                  {activeFile.extension === 'docx' && (
                    <div className="w-full max-w-[800px] bg-white text-black p-8 border border-outline-variant/60 rounded-xl shadow-xl overflow-y-auto max-h-full leading-normal m-auto">
                      <div ref={docxRef} />
                    </div>
                  )}`;

const docxRendererReplacement = `                  {/* 2. DOCX Renderer */}
                  {activeFile.extension === 'docx' && (
                    <div 
                      className="w-full max-w-[800px] bg-white text-black p-8 border border-outline-variant/60 rounded-xl shadow-xl overflow-y-auto max-h-full leading-normal m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: \`rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none'
                      }}
                    >
                      <div ref={docxRef} />
                    </div>
                  )}`;

content = content.replace(docxRendererTarget, docxRendererReplacement);

// 11. Plain Text Renderer transform & filters style application
const textRendererTarget = `                  {/* 6. Plain Text Viewer */}
                  {(activeFile.extension === 'txt' || activeFile.extension === 'log' || activeFile.extension === 'ini' || activeFile.extension === 'conf') && (
                    <pre className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto leading-relaxed max-h-full select-text text-text-secondary whitespace-pre-wrap m-auto">
                      {textContent}
                    </pre>
                  )}`;

const textRendererReplacement = `                  {/* 6. Plain Text Viewer */}
                  {(activeFile.extension === 'txt' || activeFile.extension === 'log' || activeFile.extension === 'ini' || activeFile.extension === 'conf') && (
                    <pre 
                      className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto leading-relaxed max-h-full select-text text-text-secondary whitespace-pre-wrap m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: \`rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none'
                      }}
                    >
                      {textContent}
                    </pre>
                  )}`;

content = content.replace(textRendererTarget, textRendererReplacement);

// 12. Markdown Renderer transform & filters style application
const mdRendererTarget = `                  {/* 7. Markdown Parser View */}
                  {activeFile.extension === 'md' && (
                    <div className="w-full max-w-[800px] text-left p-8 bg-secondary border border-outline-variant/40 rounded-xl font-sans text-xs overflow-auto max-h-full select-text leading-relaxed m-auto">
                      {formatMarkdown(textContent)}
                    </div>
                  )}`;

const mdRendererReplacement = `                  {/* 7. Markdown Parser View */}
                  {activeFile.extension === 'md' && (
                    <div 
                      className="w-full max-w-[800px] text-left p-8 bg-secondary border border-outline-variant/40 rounded-xl font-sans text-xs overflow-auto max-h-full select-text leading-relaxed m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: \`rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none'
                      }}
                    >
                      {formatMarkdown(textContent)}
                    </div>
                  )}`;

content = content.replace(mdRendererTarget, mdRendererReplacement);

// 13. Code Highlighter transform & filters style application
const codeRendererTarget = `                  {/* 8. Code Syntax Highlighter (highlight.js) */}
                  {codeHtml && (
                    <pre className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto max-h-full leading-relaxed select-text m-auto">
                      <code className="hljs" dangerouslySetInnerHTML={{ __html: codeHtml }} />
                    </pre>
                  )}`;

const codeRendererReplacement = `                  {/* 8. Code Syntax Highlighter (highlight.js) */}
                  {codeHtml && (
                    <pre 
                      className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto max-h-full leading-relaxed select-text m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: \`rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none'
                      }}
                    >
                      <code className="hljs" dangerouslySetInnerHTML={{ __html: codeHtml }} />
                    </pre>
                  )}`;

content = content.replace(codeRendererTarget, codeRendererReplacement);

// 14. Image View transform & filters style application
const imageRendererTarget = `                  {/* 9. Interactive Images view (Pan & Zoom wrapper) */}
                  {['png','jpg','jpeg','webp','gif','bmp'].includes(activeFile.extension) && (
                    <div 
                      className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                      <img 
                        ref={imageRef}
                        src={activeFile.blobUrl} 
                        style={{ 
                          transform: \`scale(\${zoom})\`,
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
                        }}
                        className="max-h-full max-w-full rounded-xl object-contain select-none shadow-2xl" 
                        alt={activeFile.name} 
                      />
                    </div>
                  )}`;

const imageRendererReplacement = `                  {/* 9. Interactive Images view (Pan & Zoom wrapper) */}
                  {['png','jpg','jpeg','webp','gif','bmp'].includes(activeFile.extension) && (
                    <div 
                      className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                      <img 
                        ref={imageRef}
                        src={activeFile.blobUrl} 
                        style={{ 
                          transform: \`scale(\${zoom}) rotate(\${rotation}deg) scaleX(\${flipH ? -1 : 1}) scaleY(\${flipV ? -1 : 1})\`,
                          filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
                        }}
                        className="max-h-full max-w-full rounded-xl object-contain select-none shadow-2xl" 
                        alt={activeFile.name} 
                      />
                    </div>
                  )}`;

content = content.replace(imageRendererTarget, imageRendererReplacement);

// 15. Append PdfThumbnail component and secure toast layout
const bottomTarget = `            )}

          </div>
        </div>
      )}
    </div>
  );
}`;

const bottomReplacement = `            )}

          </div>
        </div>
      )}

      {/* Secure Wiping Notification Toast */}
      {showSecureDeleteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          All temporary files have been securely wiped from browser memory.
        </div>
      )}
    </div>
  );
}

// PDF Lazy-loaded Thumbnail component
function PdfThumbnail({ pdfDoc, pageNumber, isActive, onClick }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const observerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || !canvasRef.current) return;

    let isMounted = true;
    let renderTask = null;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;

        const viewport = page.getViewport({ scale: 0.15 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });
        await renderTask.promise;
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
      }
    };

    renderThumbnail();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [isVisible, pdfDoc, pageNumber]);

  return (
    <div 
      ref={observerRef}
      onClick={onClick}
      className={\`relative flex flex-col items-center gap-1.5 p-1 rounded-xl border text-center transition cursor-pointer select-none \${
        isActive 
          ? 'bg-primary/10 border-primary/40 text-primary' 
          : 'bg-white/0 border-transparent text-text-secondary hover:bg-white/5'
      }\`}
    >
      <div className="relative border border-outline-variant/60 rounded-lg overflow-hidden bg-white shadow-md flex items-center justify-center min-h-[120px] w-[85px]">
        {loading && (
          <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center">
            <span className="text-[9px] text-text-tertiary">Loading...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="block w-full h-auto object-contain" />
      </div>
      <span className="text-[9px] font-semibold">Page {pageNumber}</span>
    </div>
  );
}`;

content = content.replace(bottomTarget, bottomReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentViewer code enhancements applied successfully.');
