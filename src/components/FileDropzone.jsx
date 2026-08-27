import { useRef, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatFileSize, TOOLS } from '../utils/constants';

export default function FileDropzone({ accept, multiple, files = [], setFiles = () => {}, maxFiles = 50, compact = false }) {
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const dragCounter = useRef(0);
  const [toast, setToast] = useState(null);

  // Dynamic route resolution matching
  const currentPath = location.pathname.replace(/\/$/, '');
  const activeTool = TOOLS.find(
    (t) => t.path === currentPath || t.path === currentPath + '/'
  );

  useEffect(() => {
    if (location.state && setFiles && (location.state.initialFiles || location.state.initialFile)) {
      if (location.state.initialFiles && Array.isArray(location.state.initialFiles) && location.state.initialFiles.length > 0) {
        setFiles(location.state.initialFiles);
      } else if (location.state.initialFile) {
        setFiles([location.state.initialFile]);
      }
      navigate(location.pathname, { replace: true, state: null });
      try {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (_) {}
    }
  }, [location.state, location.pathname, navigate, setFiles]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Parse accepted rules to generate beautiful tag chips
  const getAcceptedChips = () => {
    if (!accept) return [<span key="all" className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">ALL FILES</span>];
    return accept.split(',').map((rule) => {
      const cleanRule = rule.trim().toUpperCase().replace('.', '');
      let colorClass = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      
      if (cleanRule === 'PDF') {
        colorClass = 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/20';
      } else if (['DOC', 'DOCX', 'TXT'].includes(cleanRule)) {
        colorClass = 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200/20';
      } else if (['XLS', 'XLSX', 'CSV'].includes(cleanRule)) {
        colorClass = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20';
      } else if (['PPT', 'PPTX'].includes(cleanRule)) {
        colorClass = 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200/20';
      } else if (['PNG', 'JPG', 'JPEG', 'WEBP', 'BMP', 'IMAGE/*'].includes(cleanRule)) {
        colorClass = 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200/20';
      }
      
      return (
        <span key={rule} className={`px-2 py-0.5 text-[10px] font-bold font-label-mono rounded-md border ${colorClass} uppercase tracking-wider`}>
          {cleanRule === 'IMAGE/*' ? 'IMAGES' : cleanRule}
        </span>
      );
    });
  };

  const handleFiles = useCallback((newFiles) => {
    let arr = Array.from(newFiles);

    // Validate files against accept criteria
    if (accept && accept !== '*') {
      const rules = accept.split(',').map((rule) => rule.trim().toLowerCase());
      arr = arr.filter((file) => {
        const name = file.name.toLowerCase();
        const mime = file.type.toLowerCase();
        return rules.some((rule) => {
          if (rule.startsWith('.')) {
            return name.endsWith(rule);
          } else if (rule.endsWith('/*')) {
            const group = rule.split('/')[0];
            return mime.startsWith(group + '/');
          } else {
            return mime === rule;
          }
        });
      });

      if (arr.length < newFiles.length) {
        setToast({
          type: 'warning',
          message: `Only files matching "${accept}" are allowed for this tool. Unsupported files were ignored.`
        });
      }
    }

    // Client Side memory validation alert for large files
    const largeFiles = arr.filter((file) => file.size > 30 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setToast({
        type: 'warning',
        message: 'Large file(s) detected (over 30MB). Processing large files Client Side may slow down or freeze your browser tab.'
      });
    }

    if (arr.length === 0) return;

    if (multiple) {
      setFiles((prev) => {
        const combined = [...prev, ...arr];
        return combined.slice(0, maxFiles);
      });
    } else {
      setFiles(arr.slice(0, 1));
    }
  }, [multiple, setFiles, maxFiles, accept]);

  // Global window drag-and-drop listener to trigger the fullscreen drop overlay
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      if (!e.dataTransfer.types.includes('Files')) return;

      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      if (!e.dataTransfer.types.includes('Files')) return;

      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsWindowDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleFiles]);

  // Manage memory objects for image previews
  useEffect(() => {
    const previews = {};
    files.forEach((file, idx) => {
      if (file.type.startsWith('image/')) {
        previews[idx] = URL.createObjectURL(file);
      }
    });
    setImagePreviews(previews);

    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, [setFiles]);

  // Item reordering drag handlers
  const handleDragStartItem = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data to allow drag
    e.dataTransfer.setData('text/plain', index);

    // Optional: Make it semi-transparent while dragging
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnterItem = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      const draggedItem = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(targetIndex, 0, draggedItem);
      return newFiles;
    });

    setDraggedIndex(targetIndex);
  };

  const handleDragEndItem = (e) => {
    setDraggedIndex(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  // Retrieve contextual layout information matching this tool
  const getToolMetadata = () => {
    const defaultMeta = {
      typeName: 'File',
      typeNamePlural: 'Files',
      icon: 'upload_file',
      maxSize: '200MB',
      badges: [
        { icon: 'shield_lock', label: 'Client Side Processing' },
        { icon: 'cloud_off', label: 'No File Upload' },
        { icon: 'verified_user', label: '100% Secure' }
      ],
      steps: [
        { title: 'Upload File', desc: 'Select or drag your file to get started.' },
        { title: 'Configure Options', desc: 'Adjust settings to tailor the processing.' },
        { title: 'Process', desc: 'Our Client Side converter processes the file instantly.' },
        { title: 'Download', desc: 'Save your optimized file to your device.' }
      ],
      tips: [
        'Large files may take a few seconds to process locally.',
        'Ensure the file is not corrupted or password-protected.',
        'Close other browser tabs for optimal Client Side speed.',
        'Your documents are private and never touch our servers.'
      ],
      cards: [
        { icon: 'bolt', title: 'Lightning Fast', desc: 'Process and convert files in milliseconds.' },
        { icon: 'offline_pin', title: 'Client Side First', desc: 'No internet connection? No problem. Works locally.' },
        { icon: 'high_quality', title: 'Zero Quality Loss', desc: 'Smart algorithms keep document styles and text crisp.' },
        { icon: 'security', title: '100% Private', desc: 'Your data stays secure on your machine.' }
      ]
    };

    if (!activeTool) {
      if (accept && accept.includes('pdf')) {
        return getPdfMeta(defaultMeta);
      } else if (accept && accept.includes('image')) {
        return getImageMeta(defaultMeta);
      } else if (accept && (accept.includes('docx') || accept.includes('doc') || accept.includes('xlsx') || accept.includes('pptx') || accept.includes('txt') || accept.includes('html'))) {
        return getDocMeta(defaultMeta);
      }
      return defaultMeta;
    }

    const category = activeTool.category;
    const toolId = activeTool.id;

    if (toolId === 'document-viewer') {
      return defaultMeta;
    }

    if (category === 'image' || toolId === 'image-to-pdf' || toolId === 'scan-to-pdf') {
      // image-to-pdf and scan-to-pdf: images go in, limit is 40MB
      return getImageMeta(defaultMeta, activeTool);
    } else if (category === 'convert-to-pdf' || category === 'convert-from-pdf' || toolId === 'text-to-pdf') {
      // Determine the correct max size to display based on the specific tool
      let docMaxSize = '15MB';
      if (toolId === 'html-to-pdf' || toolId === 'text-to-pdf') docMaxSize = '15MB';
      else if (toolId === 'docx-to-pdf' || toolId === 'powerpoint-to-pdf' || toolId === 'excel-to-pdf') docMaxSize = '15MB';
      else if (category === 'convert-from-pdf') docMaxSize = '200MB'; // PDF → something: input is a PDF
      return getDocMeta(defaultMeta, activeTool, docMaxSize);
    } else {
      return getPdfMeta(defaultMeta, activeTool);
    }
  };

  const getPdfMeta = (defaults, tool) => {
    const isMultiple = tool?.multiple || multiple || false;
    return {
      ...defaults,
      typeName: 'PDF',
      typeNamePlural: 'PDFs',
      icon: 'compress',
      maxSize: '200MB',
      badges: [
        { icon: 'verified_user', label: 'Client Side Processing' },
        { icon: 'lock', label: 'No File Upload' },
        { icon: 'shield', label: '100% Secure' }
      ],
      steps: tool?.id === 'compress-pdf' ? [
        { title: 'Upload PDF', desc: 'Select or drag your PDF file to get started.' },
        { title: 'Smart Compression', desc: 'Our advanced algorithm compresses the file without losing quality.' },
        { title: 'Preview Results', desc: 'Preview the compressed PDF and compare the size difference.' },
        { title: 'Download', desc: 'Save your optimized PDF file instantly.' }
      ] : tool?.id === 'merge-pdf' ? [
        { title: 'Upload PDFs', desc: 'Select multiple PDF files from your device.' },
        { title: 'Arrange Order', desc: 'Drag and drop files to rearrange their merging order.' },
        { title: 'Merge Pages', desc: 'Combine all selected PDFs into a single document.' },
        { title: 'Download', desc: 'Save your merged PDF file instantly.' }
      ] : [
        { title: 'Upload PDF', desc: `Select or drag your ${isMultiple ? 'PDF files' : 'PDF document'} to start.` },
        { title: 'Configure Settings', desc: 'Adjust options like page numbers, watermarks, or rotation.' },
        { title: 'Process PDF', desc: 'Our in-browser engine runs the action locally.' },
        { title: 'Download PDF', desc: 'Save your updated document instantly.' }
      ],
      tips: [
        'For scanned documents, OCR can increase searchable text density.',
        'Remove unnecessary pages before running compression or repair.',
        'High-resolution images inside PDFs will increase final file size.',
        'Vector PDFs compress better than scanned PDFs.'
      ],
      cards: [
        { icon: 'draw', title: 'Preserve Vectors', desc: 'Keep vectors and shapes crisp and clear.' },
        { icon: 'text_fields', title: 'Searchable Text', desc: 'Maintain text layers for full searchability.' },
        { icon: 'high_quality', title: 'Quality Optimized', desc: 'Smart compression ensures best quality output.' },
        { icon: 'security', title: '100% Secure', desc: 'Your files never leave your device.' }
      ]
    };
  };

  const getImageMeta = (defaults, tool) => {
    return {
      ...defaults,
      typeName: 'Image',
      typeNamePlural: 'Images',
      icon: 'image',
      maxSize: '40MB',
      badges: [
        { icon: 'photo_camera', label: 'In-Browser Compression' },
        { icon: 'cloud_off', label: 'Client Side Enabled' },
        { icon: 'verified_user', label: '100% Private' }
      ],
      steps: [
        { title: 'Upload Images', desc: 'Select or drag your image files to get started.' },
        { title: 'Adjust Settings', desc: 'Configure output format, dimensions, or compression level.' },
        { title: 'Process Images', desc: 'Files are processed instantly directly in your browser.' },
        { title: 'Download Output', desc: 'Download your converted images individually or as a ZIP.' }
      ],
      tips: [
        'WEBP format offers superior quality-to-size compression ratios.',
        'Use exact dimensions to prevent scaling artifacts when resizing.',
        'Transparent alpha channels are only supported by PNG and WEBP.',
        'Batch mode allows converting dozens of images in a single click.'
      ],
      cards: [
        { icon: 'high_quality', title: 'Quality Preserved', desc: 'Optimized conversion keeps colors and gradients vibrant.' },
        { icon: 'bolt', title: 'Super Fast', desc: 'Images are processed in milliseconds, saving bandwidth.' },
        { icon: 'layers', title: 'Format Versatility', desc: 'Seamlessly convert between PNG, JPG, WEBP, and BMP.' },
        { icon: 'security', title: '100% Secure', desc: 'Your photos and personal graphics remain on your device.' }
      ]
    };
  };

  const getDocMeta = (defaults, tool, maxSize = '15MB') => {
    const isFromPdf = tool?.category === 'convert-from-pdf';
    const isHtmlTool = tool?.id === 'html-to-pdf';
    return {
      ...defaults,
      typeName: isFromPdf ? 'PDF' : 'Document',
      typeNamePlural: isFromPdf ? 'PDFs' : 'Documents',
      icon: isFromPdf ? 'picture_as_pdf' : 'description',
      maxSize,
      badges: isHtmlTool ? [
        { icon: 'description', label: 'Smart Layout Parsing' },
        { icon: 'cloud_upload', label: 'Server Side Rendering' },
        { icon: 'verified_user', label: '100% Secure' }
      ] : [
        { icon: 'description', label: 'Smart Layout Parsing' },
        { icon: 'cloud_off', label: 'No File Upload' },
        { icon: 'verified_user', label: '100% Secure' }
      ],
      steps: [
        { title: 'Select Document', desc: 'Upload your document file from your computer.' },
        { title: 'Analyze Structure', desc: 'Our layout engine maps out fonts, tables, and spacing.' },
        { title: 'Convert Format', desc: 'High-fidelity transcription translates the file format.' },
        { title: 'Download Output', desc: 'Save your newly formatted document instantly.' }
      ],
      tips: [
        'Complex tables and sheets are converted with high structural fidelity.',
        'Embedded font assets are preserved for consistent cross-platform reading.',
        'Avoid password-locked files for automated layout conversions.',
        'Standard page margins provide the most accurate layout translation.'
      ],
      cards: [
        { icon: 'view_agenda', title: 'Layout Preservation', desc: 'Retain tabular boundaries, margins, and column grids.' },
        { icon: 'text_snippet', title: 'Font Integration', desc: 'All text content remains selectable, editable, and indexable.' },
        { icon: 'high_quality', title: 'High Fidelity', desc: 'Professional-grade rendering matching standard desktop viewers.' },
        { icon: 'security', title: '100% Secure', desc: 'Processing runs locally or gets encrypted and deleted instantly.' }
      ]
    };
  };

  const meta = getToolMetadata();

  return (
    <div className={`h-full flex flex-col w-full ${files.length === 0 ? 'dropzone-empty' : ''}`}>
      {/* 1. Immersive Full-Screen Drag Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 bg-[#FAF8F4]/80 dark:bg-[#131313]/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-8 transition-all duration-300 select-none">
          <div className="w-full max-w-xl p-16 rounded-[40px] border-2 border-dashed border-primary/50 bg-white/60 dark:bg-[#1c1b1b]/50 shadow-2xl flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[48px] animate-bounce">cloud_upload</span>
            </div>
            <h2 className="text-2xl font-h2 font-bold text-gray-900 dark:text-gray-100">Drop files to upload</h2>
            <p className="text-sm text-text-secondary text-center max-w-md leading-relaxed">
              Release your files anywhere on this page to instantly load them into DocForge.
            </p>
          </div>
        </div>
      )}

      {files.length === 0 ? (
        compact ? (
          /* A simplified nested dropzone for dashboards or multi-file layouts */
          <div
            className={`dropzone relative overflow-hidden w-full rounded-2xl border border-outline-variant/40 dark:border-zinc-800/80 bg-gradient-to-br from-white/70 to-white/35 dark:from-[#1c1b1b]/70 dark:to-[#131313]/35 backdrop-blur-md p-6 text-center cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-none hover:shadow-[0_12px_40px_rgba(0,0,0,0.035)] hover:border-primary/40 transition-all duration-300 group ${
              dragOver ? 'border-primary/50 bg-[#fdf9f2] dark:bg-zinc-800/20 shadow-glow-primary scale-[0.995]' : ''
            }`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="relative w-20 h-20 flex items-center justify-center mx-auto mb-2">
              <div className="absolute inset-0 bg-primary/5 rounded-full scale-100 group-hover:scale-110 transition-all duration-300" />
              
              <svg className="w-10 h-10 text-primary relative z-10" style={{ overflow: 'visible' }} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Document Tray */}
                <path d="M12 40 L8 44 V52 C8 54.2 9.8 56 12 56 H52 C54.2 56 56 54.2 56 52 V44 L52 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 44 H44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                
                {/* Floating Sheet */}
                <g className="animate-[bounce_2.5s_ease-in-out_infinite]">
                  <rect x="22" y="14" width="20" height="26" rx="2" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="3" />
                  <line x1="27" y1="20" x2="37" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="27" y1="25" x2="37" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="27" y1="30" x2="33" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Down arrow pointing to tray */}
                <path d="M32 26 V38 M28 34 L32 38 L36 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[pulse_1.5s_infinite]" />
              </svg>
            </div>

            <div className="relative z-10 select-none">
              <h4 className="text-sm font-bold text-text-primary tracking-tight">
                Drag & drop your {meta.typeName} here
              </h4>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white text-[11px] font-bold shadow-sm hover:scale-[1.02] transition-all mt-3 mb-2 cursor-pointer">
                Browse Device
              </div>
              <p className="text-[10px] text-text-tertiary">Max file size: {meta.maxSize}</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={accept || undefined}
              multiple={multiple}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        ) : (
          /* Upgraded premium landing layout */
          <div className="animate-[fadeIn_0.25s_ease-out] w-full max-w-5xl mx-auto">
            
            {/* upgraded dropzone container */}
            <div
              className={`dropzone-upgraded-container cursor-pointer select-none group ${dragOver ? 'drag-active' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Premium Vector Upload Graphic with original bounce/pulse animations */}
              <div className="relative w-28 h-28 flex items-center justify-center mx-auto mb-6">
                {/* Background ripple layers */}
                <div className="absolute inset-0 bg-primary/5 rounded-full scale-100 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300" />
                <div className="absolute inset-4 bg-primary/10 rounded-full scale-100 group-hover:scale-95 transition-all duration-300" />
                
                <svg className="w-14 h-14 text-primary relative z-10" style={{ overflow: 'visible' }} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Document Tray */}
                  <path d="M12 40 L8 44 V52 C8 54.2 9.8 56 12 56 H52 C54.2 56 56 54.2 56 52 V44 L52 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 44 H44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                  
                  {/* Floating Sheet */}
                  <g className="animate-[bounce_2.5s_ease-in-out_infinite]">
                    <rect x="22" y="14" width="20" height="26" rx="2" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="3" />
                    <line x1="27" y1="20" x2="37" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="27" y1="25" x2="37" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="27" y1="30" x2="33" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Down arrow pointing to tray */}
                  <path d="M32 26 V38 M28 34 L32 38 L36 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[pulse_1.5s_infinite]" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-text-primary tracking-tight mb-1">
                Drag & drop your {multiple ? meta.typeNamePlural : meta.typeName} here
              </h2>
              <p className="text-sm text-text-secondary mb-4">or</p>
              
              <button className="dropzone-btn-primary mb-3">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Choose {multiple ? meta.typeNamePlural : meta.typeName} File
              </button>
              
              <p className="text-xs text-text-tertiary">Max file size: {meta.maxSize}</p>

              <input
                ref={inputRef}
                type="file"
                accept={accept || undefined}
                multiple={multiple}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* how it works / tips information grid */}
            <div className="info-grid-container">
              <div className="steps-list-wrapper">
                <h3 className="text-lg font-bold text-text-primary mb-2">How it works</h3>
                {meta.steps.map((step, idx) => (
                  <div key={idx} className="step-item-node">
                    <div className="step-icon-number">{idx + 1}</div>
                    <div className="step-details">
                      <h4>{step.title}</h4>
                      <p>{step.desc}</p>
                    </div>
                    {idx < meta.steps.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '11px',
                        top: '26px',
                        bottom: '-18px',
                        width: '2px',
                        borderLeft: '2px dashed var(--border-medium)',
                        zIndex: 1
                      }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="tips-sidebar-box">
                <div className="tips-title-header">
                  <span className="material-symbols-outlined">lightbulb</span>
                  Tips for Best Results
                </div>
                <ul className="tips-check-list">
                  {meta.tips.map((tip, idx) => (
                    <li key={idx}>
                      <span className="material-symbols-outlined">check_circle</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* value props bottom grid */}
            <div className="value-props-bottom-grid">
              {meta.cards.map((card, idx) => (
                <div key={idx} className="value-prop-feature-card">
                  <div className="value-prop-icon-wrapper">
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>

            {/* trust locker tagline */}
            <div className="trust-lock-footer-row select-none">
              <span className="material-symbols-outlined">lock</span>
              Your files are safe and secure. We process everything in your browser.
            </div>
          </div>
        )
      ) : (
        /* 3. Upgraded Workspace Canvas Queue */
        <div className="workspace-canvas relative flex-1 flex flex-col items-center min-h-[380px] w-full pt-3 pb-8 px-8 bg-surface/30 dark:bg-[#1c1b1b]/30 rounded-3xl border border-outline-variant/40 dark:border-zinc-800/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.01)]">
          {/* Workspace Header Panel */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/30 dark:border-zinc-800/40 select-none">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h4 className="text-sm font-bold text-text-primary tracking-wide uppercase">
                Upload Queue ({files.length} file{files.length > 1 ? 's' : ''})
              </h4>
            </div>
            
            <div className="flex items-center gap-3">
              {multiple && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/60 dark:border-zinc-700 hover:border-primary hover:text-primary text-xs font-bold transition-all cursor-pointer bg-surface hover:bg-surface-bright"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Files
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiles([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200/50 hover:border-red-500 hover:text-red-500 text-xs font-bold text-red-600/80 transition-all cursor-pointer bg-red-50/20 hover:bg-red-50/70 dark:bg-red-950/10 dark:hover:bg-red-950/20"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Clear All
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex flex-wrap gap-6 items-center justify-center w-full max-w-4xl overflow-y-auto py-4 flex-1">
            {files.map((file, i) => {
              const extension = file.name.split('.').pop().toLowerCase();
              const isImage = file.type.startsWith('image/');

              return (
                <div
                  key={`${file.name}-${i}`}
                  draggable={multiple}
                  onDragStart={(e) => handleDragStartItem(e, i)}
                  onDragEnter={(e) => handleDragEnterItem(e, i)}
                  onDragEnd={handleDragEndItem}
                  onDragOver={(e) => e.preventDefault()}
                  className={`w-48 h-64 bg-surface border border-outline-variant/50 dark:border-zinc-800/70 rounded-2xl flex flex-col justify-between p-4 relative group shadow-[0_4px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:border-primary/40 transition-all duration-200 ${draggedIndex === i ? 'opacity-50 border-dashed border-primary scale-105' : ''} ${multiple ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  {/* Remove file button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-surface border border-outline-variant text-text-secondary hover:text-error hover:border-error flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold cursor-pointer text-xs"
                    title="Remove file"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>

                  {/* Card Thumbnail / Preview */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-low rounded-xl border border-outline-variant/30 p-2 mb-4 select-none relative overflow-hidden">
                    {isImage && imagePreviews[i] ? (
                      <img src={imagePreviews[i]} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        {/* Visual Document Outline */}
                        <svg className="w-12 h-16 text-outline" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="22" height="28" rx="2" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="2"/>
                          <line x1="5" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1"/>
                          <line x1="5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="5" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="5" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        
                        {/* File extension badge */}
                        <span className="absolute bottom-4 bg-primary/10 border border-primary/20 text-primary font-label-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          {extension}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="text-left select-none">
                    <div className="font-body-md text-xs font-bold text-text-primary truncate w-full" title={file.name}>
                      {file.name}
                    </div>
                    <div className="font-body-sm text-[10px] text-text-tertiary font-semibold mt-0.5">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Inline Add Card inside grid */}
            {multiple && (
              <div
                onClick={() => inputRef.current?.click()}
                className="w-48 h-64 border border-dashed border-outline-variant/65 hover:border-primary/50 hover:text-primary rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-surface/10 hover:bg-surface/30 transition-all select-none p-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-surface border border-outline-variant flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px] select-none">add</span>
                </div>
                <span className="font-body-md text-xs font-bold text-text-secondary group-hover:text-primary transition-colors">Add files</span>
              </div>
            )}
          </div>
          
          <input
            ref={inputRef}
            type="file"
            accept={accept || undefined}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-[#1C1917] border border-[#44403C] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-[fadeInUp_0.3s_ease-out] select-none max-w-sm">
          <span className={`material-symbols-outlined text-[20px] select-none flex-shrink-0 ${
            toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-amber-500' : 'text-primary'
          }`}>
            {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info'}
          </span>
          <span className="text-xs font-semibold leading-relaxed text-white/90">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto text-white/45 hover:text-white transition-colors text-xs select-none p-1 font-bold">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
