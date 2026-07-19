import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import FileDropzone from '../../components/FileDropzone';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';


// Setup pdfjs worker


// Import docx-preview


// Import SheetJS


// Import JSZip


// Import highlight.js


// Import pptx-to-html


import { 
  Eye, Download, ZoomIn, ZoomOut, RotateCw, Maximize, Minimize, 
  ChevronLeft, ChevronRight, Search, FileText, X, Play, Pause, 
  Volume2, FolderOpen, ExternalLink, RefreshCw, FileCode,
  Table as TableIcon, FileImage, FileAudio, FileVideo, AlertCircle, Wrench
} from 'lucide-react';

const SMART_ACTIONS = {
  pdf: [
    { label: 'Compress PDF', path: '/compress-pdf' },
    { label: 'Split PDF', path: '/split-pdf' },
    { label: 'Sign PDF', path: '/sign-pdf' },
    { label: 'OCR PDF', path: '/ocr-pdf' },
    { label: 'Merge PDF', path: '/merge-pdf' },
    { label: 'Redact PDF', path: '/redact-pdf' }
  ],
  docx: [
    { label: 'Convert to PDF', path: '/docx-to-pdf' },
    { label: 'AI Translate', path: '/ai-translator' },
    { label: 'AI Summarizer', path: '/ai-summarizer' }
  ],
  xlsx: [
    { label: 'Convert to PDF', path: '/excel-to-pdf' }
  ],
  csv: [
    { label: 'Convert to PDF', path: '/excel-to-pdf' }
  ],
  pptx: [
    { label: 'Convert to PDF', path: '/powerpoint-to-pdf' }
  ],
  image: [
    { label: 'Compress Image', path: '/image-compressor' },
    { label: 'Resize Image', path: '/image-resizer' },
    { label: 'Convert Format', path: '/image-converter' },
    { label: 'Bundle to PDF', path: '/image-to-pdf' }
  ],
  text: [
    { label: 'Convert to PDF', path: '/text-to-pdf' }
  ]
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function DocumentViewer({ file = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  // State Management
  const [rawFiles, setRawFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [pdfjs, setPdfjs] = useState(null);
  const [xlsxModule, setXlsxModule] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Layout Dials
  const filterDropdownRef = useRef(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Filters & Sidebar tabs states
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [leftSidebarTab, setLeftSidebarTab] = useState('queue');
  const [showSecureDeleteToast, setShowSecureDeleteToast] = useState(false);

  // Viewport Control States
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // PDF states
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);

  // Excel states
  const [excelBook, setExcelBook] = useState(null);
  const [excelActiveSheet, setExcelActiveSheet] = useState('');
  const [excelData, setExcelData] = useState([]);

  // ZIP explorer states
  const [zipFiles, setZipFiles] = useState([]);
  const [zipActiveEntry, setZipActiveEntry] = useState(null);
  const [zipSubFilePreview, setZipSubFilePreview] = useState(null);

  // Code/Text states
  const [textContent, setTextContent] = useState('');
  const [codeHtml, setCodeHtml] = useState('');

  // Audio/Video custom controls states
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // PPTX Server job states
  const [backendActive, setBackendActive] = useState(false);
  const [pptxSlides, setPptxSlides] = useState([]);
  const [pptxActiveSlide, setPptxActiveSlide] = useState(0);

  // HTML sandbox blob
  const [sandboxUrl, setSandboxUrl] = useState('');

  // Refs
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const docxRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);

  // Get active file object
  const activeFile = files[activeIdx] || null;

  // Initialize PPTX server converter poller
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
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
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
  }, []);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        console.log('[DocumentViewer] Cleaning up PDF document instance');
        try {
          pdfDoc.destroy();
        } catch (e) {}
      }
    };
  }, [pdfDoc]);

  // Clean all file blob URLs
  const cleanActiveUrls = useCallback(() => {
    if (sandboxUrl) {
      URL.revokeObjectURL(sandboxUrl);
      setSandboxUrl('');
    }
    if (zipSubFilePreview?.url) {
      URL.revokeObjectURL(zipSubFilePreview.url);
      setZipSubFilePreview(null);
    }
  }, [sandboxUrl, zipSubFilePreview]);

  // Clean all file blob URLs
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
      });
      cleanActiveUrls();
    };
  }, [files, cleanActiveUrls]);

  // Check server health
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch('/health');
        if (res.ok) setBackendActive(true);
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // Synchronize formatted files list whenever rawFiles state updates
  useEffect(() => {
    if (rawFiles.length > 0) {
      const formatted = rawFiles.map(file => {
        // Keep track of existing blob URLs to avoid memory leaks
        const existing = files.find(f => f.fileObject === file);
        if (existing) return existing;
        
        const ext = file.name.split('.').pop().toLowerCase();
        return {
          fileObject: file,
          name: file.name,
          size: file.size,
          extension: ext,
          blobUrl: URL.createObjectURL(file)
        };
      });

      // Revoke URLs for files that were removed
      files.forEach(f => {
        if (!rawFiles.includes(f.fileObject) && f.blobUrl) {
          URL.revokeObjectURL(f.blobUrl);
        }
      });

      setFiles(formatted);
    } else {
      files.forEach(f => {
        if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
      });
      setFiles([]);
    }
  }, [rawFiles]);

  // Preload files from props or route state
  useEffect(() => {
    if (file) {
      setRawFiles([file]);
      setActiveIdx(0);
    } else if (location.state && location.state.initialFiles && Array.isArray(location.state.initialFiles) && location.state.initialFiles.length > 0) {
      setRawFiles(location.state.initialFiles);
      setActiveIdx(0);
    }
  }, [file, location.state]);

  // Remove a file from queue
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
  }, [files, cleanActiveUrls]);

  // Dropzone files handler
  const handleDropzoneFiles = (newFileObjects) => {
    setRawFiles(prev => [...prev, ...newFileObjects]);
  };

  // PPTX Server Conversion poller watcher
  useEffect(() => {
    if (activeFile?.extension === 'pptx' || activeFile?.extension === 'ppt') {
      if (pollStatus === 'finished' && pollResult) {
        // Fetch generated PDF to preview
        apiFetch(pollResult.downloadUrl)
          .then(res => res.blob())
          .then(blob => {
            const pdfBlobUrl = URL.createObjectURL(blob);
            setZipSubFilePreview({
              name: activeFile.name.replace(/\.[^.]+$/, '') + '.pdf',
              url: pdfBlobUrl,
              extension: 'pdf'
            });
            setLoading(false);
          })
          .catch(err => {
            setError('Failed to fetch rendered slide presentation.');
            setLoading(false);
          });
      } else if (pollStatus === 'failed') {
        setError(pollError || 'Server Side PowerPoint rendering failed. Switching to local slideshow fallback...');
        loadLocalPptx(activeFile.fileObject);
      }
    }
  }, [pollStatus, pollResult, pollError, activeFile]);

  // Local PPTX Parser
  const loadLocalPptx = async (fileObj) => {
    try {
      setLoading(true);
      const { pptxToHtml } = await import('@jvmr/pptx-to-html');
      const buffer = await fileObj.arrayBuffer();
      const slides = await pptxToHtml(buffer, {
        width: 800,
        height: 450,
        scaleToFit: true,
        letterbox: true
      });
      if (slides && slides.length > 0) {
        setPptxSlides(slides);
        setPptxActiveSlide(0);
      } else {
        throw new Error('No slides found');
      }
    } catch (err) {
      setError('Client Side slide renderer failed. View file details or metadata below.');
    } finally {
      setLoading(false);
    }
  };

  // Core File Loader format router
  const loadActivePreview = useCallback(async () => {
    if (!activeFile) return;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setExcelBook(null);
    setZipFiles([]);
    setTextContent('');
    setCodeHtml('');
    setPptxSlides([]);
    cleanActiveUrls();

    // Default view controls
    setZoom(1);
    setRotation(0);

    const fileObj = activeFile.fileObject;
    const ext = activeFile.extension;

    // Size limit check
    if (fileObj.size > 150 * 1024 * 1024) {
      setError('File is too large for browser preview. Use download or conversion tools directly.');
      setLoading(false);
      return;
    }

    try {
      switch (ext) {
        case 'pdf': {
          const pdfjsModule = await import('pdfjs-dist');
          pdfjsModule.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
          setPdfjs(pdfjsModule);
          const buffer = await fileObj.arrayBuffer();
          const doc = await pdfjsModule.getDocument({ data: buffer }).promise;
          setPdfDoc(doc);
          setPdfTotalPages(doc.numPages);
          setPdfPage(1);
          setLoading(false);
          break;
        }
        case 'docx': {
          // docx renders asynchronously to DOM
          setLoading(false);
          break;
        }
        case 'xlsx':
        case 'xls': {
          const XLSX = await import('xlsx');
          setXlsxModule(XLSX);
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0], XLSX);
          setLoading(false);
          break;
        }
        case 'csv': {
          const XLSX = await import('xlsx');
          setXlsxModule(XLSX);
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0], XLSX);
          setLoading(false);
          break;
        }
        case 'pptx':
        case 'ppt': {
          if (backendActive) {
            // Trigger server job PPTX to PDF
            const uploadData = await uploadFileSecure(BACKEND_URL, fileObj);
            if (uploadData.success) {
              const res = await apiFetch(`${BACKEND_URL}/api/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file_id: uploadData.file_id,
                  filename: uploadData.filename,
                  target_format: 'pdf'
                })
              });
              if (res.ok) {
                const data = await res.json();
                startPolling(data.job_id);
              } else {
                throw new Error('Server conversion endpoint is temporarily unavailable');
              }
            } else {
              throw new Error('PPTX upload failed');
            }
          } else {
            // Client Side client PPTX builder fallback
            await loadLocalPptx(fileObj);
          }
          break;
        }
        case 'zip': {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(fileObj);
          const entries = [];
          zip.forEach((path, entry) => {
            entries.push(entry);
          });
          setZipFiles(entries);
          setLoading(false);
          break;
        }
        case 'txt':
        case 'log':
        case 'ini':
        case 'conf': {
          const text = await fileObj.text();
          setTextContent(text);
          setLoading(false);
          break;
        }
        case 'md': {
          const text = await fileObj.text();
          setTextContent(text);
          setLoading(false);
          break;
        }
        case 'html':
        case 'svg': {
          const url = URL.createObjectURL(fileObj);
          setSandboxUrl(url);
          setLoading(false);
          break;
        }
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'webp':
        case 'gif':
        case 'bmp':
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'mp4':
        case 'webm': {
          // Native DOM element viewers handle Blob URLs directly
          setLoading(false);
          break;
        }
        default: {
          // Code language checks or fallback
          const isCodeExt = [
            'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'h', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bat'
          ].includes(ext);

          if (isCodeExt) {
            const text = await fileObj.text();
            setTextContent(text);
            const hljsModule = (await import('highlight.js')).default;
            const hlResult = hljsModule.highlightAuto(text);
            setCodeHtml(hlResult.value);
          } else {
            // Read 1KB text fallback for hex metadata preview
            const text = await fileObj.slice(0, 1024).text();
            setTextContent(text);
          }
          setLoading(false);
          break;
        }
      }
    } catch (err) {
      setError(err.message || 'Error occurred parsing file preview.');
      setLoading(false);
    }
  }, [activeFile, backendActive, startPolling, cleanActiveUrls]);

  // Reload preview when active index shifts
  useEffect(() => {
    loadActivePreview();
  }, [activeIdx, activeFile, loadActivePreview]);

  // Render PDF page onto canvas
  useEffect(() => {
    if (!pdfDoc || activeFile?.extension !== 'pdf' || !pdfjs) return;

    let isCurrent = true;
    const renderPdf = async () => {
      try {
        const page = await pdfDoc.getPage(pdfPage);
        if (!isCurrent) return;

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale: zoom * pixelRatio });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        // Render visual canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;

        if (!isCurrent) return;

        // Render search/copy text layer on top of canvas page bounds
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${viewport.width / pixelRatio}px`;
          textLayerDiv.style.height = `${viewport.height / pixelRatio}px`;

          const textContent = await page.getTextContent();
          if (!isCurrent) return;

          // Modern pdfjs-dist TextLayer integration using original unscaled viewport
          const originalViewport = page.getViewport({ scale: zoom });
          const textLayer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: originalViewport
          });
          await textLayer.render();
        }
      } catch (err) {
        console.error('Error rendering PDF page:', err);
      }
    };

    renderPdf();

    return () => {
      isCurrent = false;
    };
  }, [pdfDoc, pdfPage, zoom, activeFile]);

  // Render Word document to layout elements
  useEffect(() => {
    if (activeFile?.extension !== 'docx' || !docxRef.current || loading) return;

    let isCurrent = true;
    const renderDocx = async () => {
      try {
        const container = docxRef.current;
        container.innerHTML = '<div class="text-center py-8 text-text-secondary">Rendering document styles...</div>';
        const { renderAsync } = await import('docx-preview');
        await renderAsync(activeFile.fileObject, container, null, {
          className: 'docx',
          inWrapper: true
        });
      } catch (err) {
        if (isCurrent) {
          setError('Failed to render Word document outline locally.');
        }
      }
    };

    renderDocx();

    return () => {
      isCurrent = false;
    };
  }, [activeFile, loading]);

  // Helper load Excel worksheets
  const loadExcelSheet = (wb, sheetName, XLSX = xlsxModule) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Performance guard: slice sheets above 1000 rows
    setExcelData(data.slice(0, 1000));
  };

  // ZIP click file preview excavator
  const handleZipSubFileClick = async (entry) => {
    if (entry.dir) return;
    try {
      setLoading(true);
      setZipActiveEntry(entry.name);
      
      const bytes = await entry.async('arraybuffer');
      const ext = entry.name.split('.').pop().toLowerCase();
      
      // Determine MIME types
      let mime = 'application/octet-stream';
      if (ext === 'pdf') mime = 'application/pdf';
      else if (['png','jpg','jpeg','gif','webp','bmp'].includes(ext)) mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      else if (['mp3','wav','ogg'].includes(ext)) mime = `audio/${ext}`;
      else if (['mp4','webm'].includes(ext)) mime = `video/${ext}`;
      else if (ext === 'html') mime = 'text/html';
      else if (ext === 'svg') mime = 'image/svg+xml';
      
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      
      setZipSubFilePreview({
        name: entry.name.split('/').pop(),
        url: url,
        extension: ext,
        fileObject: blob // Raw Blob matches file stream api
      });
      setLoading(false);
    } catch (err) {
      setError('Could not extract nested file from ZIP archive.');
      setLoading(false);
    }
  };

  // Dispatch File to target tool
  const handleSendToTool = (path) => {
    if (!activeFile) return;
    cleanActiveUrls();
    // Wrap file in array to conform to location state files pool structure
    navigate(path, { state: { initialFiles: [activeFile.fileObject] } });
  };

  // Keyboard navigation overrides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

  // Audio elements event trackers
  const togglePlayState = () => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.play();
      setIsPlaying(true);
    }
  };

  const handleMediaTimeUpdate = () => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    setMediaProgress(media.currentTime);
  };

  const handleMediaLoaded = () => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    setMediaDuration(media.duration);
  };

  const handleScrubChange = (e) => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    const time = parseFloat(e.target.value);
    media.currentTime = time;
    setMediaProgress(time);
  };

  const handleVolumeChange = (e) => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    const vol = parseFloat(e.target.value);
    media.volume = vol;
    setVolume(vol);
  };

  // Custom visual markdown formatter
  const formatMarkdown = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Heading 1
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold tracking-tight text-[#f8fafc] mt-4 mb-2 pb-1 border-b border-outline-variant/40">{line.substring(2)}</h1>;
      }
      // Heading 2
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold tracking-tight text-[#f8fafc] mt-3 mb-2">{line.substring(3)}</h2>;
      }
      // Bullet list items
      if (line.startsWith('- ')) {
        return <li key={i} className="list-disc list-inside text-xs leading-relaxed text-[#cbd5e1] ml-4 my-1">{line.substring(2)}</li>;
      }
      // Separator rule
      if (line.trim() === '---') {
        return <hr key={i} className="border-outline-variant/40 my-4" />;
      }
      // Normal text
      return <p key={i} className="text-xs leading-relaxed text-[#cbd5e1] my-2">{line}</p>;
    });
  };

  return (
    <div className={`flex flex-col bg-background text-on-background select-none ${
      files.length === 0 
        ? 'min-h-screen py-12 overflow-y-auto' 
        : 'h-screen fixed inset-0 z-50 overflow-hidden'
    }`}>
      <SEOHead 
        title="Document Viewer | DocForge" 
        description="Preview any document type fully Client Side and Client Side on DocForge."
      />

      {files.length === 0 ? (
        // Empty state landing upload dropzone
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-pattern">
          <div className="max-w-[700px] w-full p-12 glass-panel subtle-border rounded-3xl text-center flex flex-col gap-6 relative shadow-lg">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary mx-auto">
              <Eye className="w-8 h-8 animate-pulse" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-headings text-on-background">
                All-in-One Preview Studio
              </h1>
              <p className="text-xs text-text-tertiary max-w-md mx-auto leading-relaxed">
                Upload any PDF, Word, Excel, PowerPoint, ZIP, image, audio, or code file to preview it fully Client Side. Your files never touch our servers.
              </p>
            </div>

            <FileDropzone 
              files={rawFiles}
              setFiles={setRawFiles}
              accept="*" 
              multiple={true}
            />
          </div>
        </div>
      ) : (
        // Preview Workspace Layout
        <div className="flex-1 flex flex-col fixed inset-0 z-[60] bg-background">

          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Sidebar Left: File Switcher List */}
            <div 
              className={`border-r border-outline-variant/40 bg-secondary flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
              }`}
            >
                {/* iOS Segmented Pill Controls */}
                <div className="relative flex p-1 bg-black/20 rounded-full border border-white/5 m-3 flex-shrink-0 font-medium text-[10px] uppercase select-none">
                  {/* Sliding Background Indicator */}
                  {activeFile?.extension === 'pdf' && pdfDoc ? (
                    <div 
                      className="absolute top-1 bottom-1 rounded-full bg-primary/25 border border-primary/20 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ 
                        left: leftSidebarTab === 'queue' ? '4px' : 'calc(50% + 2px)', 
                        width: 'calc(50% - 6px)' 
                      }}
                    />
                  ) : (
                    <div 
                      className="absolute top-1 bottom-1 left-1 right-1 rounded-full bg-primary/25 border border-primary/20 shadow-md transition-all duration-300"
                    />
                  )}
                  <button
                    onClick={() => setLeftSidebarTab('queue')}
                    className={`flex-1 py-1.5 rounded-full text-[9px] font-extrabold text-center transition-colors relative z-10 duration-200 active:scale-95 ${
                      leftSidebarTab === 'queue'
                        ? 'text-primary'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Queue ({files.length})
                  </button>
                  {activeFile?.extension === 'pdf' && pdfDoc && (
                    <button
                      onClick={() => setLeftSidebarTab('pages')}
                      className={`flex-1 py-1.5 rounded-full text-[9px] font-extrabold text-center transition-colors relative z-10 duration-200 active:scale-95 ${
                        leftSidebarTab === 'pages'
                          ? 'text-primary'
                          : 'text-text-tertiary hover:text-text-secondary'
                      }`}
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
                        className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.97] duration-200 apple-spring-item ${
                          activeIdx === i 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-white/0 border-transparent text-text-secondary hover:bg-white/5'
                        }`}
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

            {/* Central Preview Viewport */}
            <div className="flex-1 flex flex-col bg-tertiary overflow-auto items-center justify-center p-4 relative" ref={viewportRef}>
              
              {/* Top-Left Floating Title Capsule */}
              <div className="absolute top-4 left-4 z-50 h-10 px-4 rounded-full border border-outline-variant/40 bg-secondary/80 backdrop-blur-md shadow-lg flex items-center gap-2.5">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full uppercase">
                  {activeFile.extension}
                </span>
                <span className="text-xs font-semibold text-on-background max-w-[180px] truncate">
                  {activeFile.name}
                </span>
              </div>

              {/* Top-Center Floating Controls Dock */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 h-12 px-3 rounded-full border border-outline-variant/40 bg-secondary/85 backdrop-blur-md shadow-2xl flex items-center gap-1.5 transition-all duration-300">
                
                {/* Sidebar toggle */}
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 duration-200 ${sidebarOpen ? 'bg-primary/20 text-primary border border-primary/15' : 'bg-white/5 hover:bg-white/10'}`}
                  title="Toggle Sidebar"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                
                {/* PDF Page navigation */}
                {activeFile.extension === 'pdf' && (
                  <div className="flex items-center gap-1.5 px-1.5 border-r border-outline-variant/40 mr-1">
                    <button 
                      onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                      disabled={pdfPage <= 1}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition active:scale-95 duration-200"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-semibold font-mono min-w-[32px] text-center">
                      {pdfPage}/{pdfTotalPages}
                    </span>
                    <button 
                      onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p + 1))}
                      disabled={pdfPage >= pdfTotalPages}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition active:scale-95 duration-200"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Pan / Zoom toggles */}
                {['pdf','docx','xlsx','xls','csv','pptx','ppt','txt','log','ini','conf','md','png','jpg','jpeg','webp','gif','bmp'].includes(activeFile.extension) && (
                  <div className="flex items-center gap-1.5 border-r border-outline-variant/40 pr-2 mr-1">
                    <button 
                      onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition active:scale-95 duration-200"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-semibold font-mono min-w-[38px] text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button 
                      onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition active:scale-95 duration-200"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition ml-1 active:scale-95 duration-200"
                      title="Rotate Left"
                    >
                      <RotateCw className="w-4 h-4 -scale-x-100" />
                    </button>
                    <button 
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition active:scale-95 duration-200"
                      title="Rotate Right"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setFlipH(!flipH)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 duration-200 ${flipH ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                      title="Flip Horizontal (Mirror)"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v20M2 12h8M14 12h8M6 8l-4 4 4 4M18 8l4 4-4 4" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setFlipV(!flipV)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 duration-200 ${flipV ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                      title="Flip Vertical"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v20M12 2l-4 4M12 22l4-4M2 12h20" />
                      </svg>
                    </button>

                    {/* Custom Filter Popover Dropdown */}
                    <div className="relative flex items-center" ref={filterDropdownRef}>
                      <button 
                        onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                        className={`h-8 px-2.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition active:scale-95 duration-200 ${
                          activeFilter !== 'none' 
                            ? 'bg-primary/20 border-primary/30 text-primary' 
                            : 'bg-white/5 hover:bg-white/10 border-outline-variant/40 text-text-secondary'
                        }`}
                      >
                        <span>{activeFilter === 'none' ? 'No Filter' : activeFilter === 'invert' ? 'Dark Mode' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}</span>
                        <svg className={`w-3 h-3 transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {filterDropdownOpen && (
                        <div 
                          className="absolute top-10 right-0 z-50 w-44 p-1.5 rounded-2xl border border-outline-variant/40 shadow-2xl flex flex-col gap-0.5 dropdown-fade-in"
                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                          {[
                            { val: 'none', label: 'Normal View' },
                            { val: 'invert', label: 'Dark Reading Mode' },
                            { val: 'grayscale', label: 'Grayscale' },
                            { val: 'sepia', label: 'Sepia' }
                          ].map(item => (
                            <button
                              key={item.val}
                              onClick={() => {
                                setActiveFilter(item.val);
                                setFilterDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-xl text-[10px] font-bold text-left transition flex items-center justify-between ${
                                activeFilter === item.val
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-text-secondary hover:bg-white/5'
                              }`}
                            >
                              <span>{item.label}</span>
                              {activeFilter === item.val && (
                                <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fullscreen & details toggles */}
                <button 
                  onClick={toggleNativeFullscreen}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition active:scale-95 duration-200"
                  title="Focus Mode"
                >
                  {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                
                <button 
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 duration-200 ${detailsOpen ? 'bg-primary/20 text-primary border border-primary/15' : 'bg-white/5 hover:bg-white/10'}`}
                  title="Toggle Actions Sidebar"
                >
                  <Wrench className="w-4 h-4" />
                </button>
              </div>

              {/* Top-Right Floating Secure Close */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button 
                  onClick={clearAllAndReset}
                  className="h-10 px-4 rounded-full border border-red-500/20 bg-red-600/90 text-white text-[10px] font-bold hover:bg-red-700 transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-lg shadow-red-600/5 hover:shadow-red-600/20"
                >
                  <X className="w-3.5 h-3.5" />
                  Close & Secure Delete
                </button>
              </div>
              
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 gap-3">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-medium text-text-tertiary">Loading document layout...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-4 max-w-md text-center p-6 subtle-border bg-red-500/5 rounded-2xl border-red-500/10">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <p className="text-xs leading-relaxed text-text-secondary">{error}</p>
                </div>
              )}

              {!loading && !error && activeFile && (
                <div 
                  className="w-full h-full flex overflow-auto p-4 pt-20 relative"
                  
                >
                  {/* format rendering branch switch */}

                  {/* 1. PDF Renderer */}
                  {activeFile.extension === 'pdf' && (
                    <div 
                      className="relative border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-xl m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, filter'
                      }}
                    >
                      <canvas ref={canvasRef} className="block" />
                      <div ref={textLayerRef} className="absolute inset-0 text-transparent pointer-events-auto select-text font-mono opacity-80" />
                    </div>
                  )}

                  {/* 2. DOCX Renderer */}
                  {activeFile.extension === 'docx' && (
                    <div 
                      className="w-full max-w-[800px] bg-white text-black p-8 border border-outline-variant/60 rounded-xl shadow-xl overflow-y-auto max-h-full leading-normal m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, filter'
                      }}
                    >
                      <div ref={docxRef} />
                    </div>
                  )}

                  {/* 3. EXCEL & CSV Grid Renderer */}
                  {(activeFile.extension === 'xlsx' || activeFile.extension === 'xls' || activeFile.extension === 'csv') && (
                    <div className="w-full h-full flex flex-col bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden m-auto">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-tertiary border-b border-outline-variant/60 z-10 font-bold">
                            <tr>
                              {excelData[0]?.map((_, colIdx) => (
                                <th key={colIdx} className="px-4 py-2.5 border-r border-outline-variant/40 col-header font-semibold text-text-secondary select-none">
                                  {xlsxModule?.utils.encode_col(colIdx)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelData.map((row, rowIdx) => (
                              <tr key={rowIdx} className="border-b border-outline-variant/40 hover:bg-white/5 transition-colors">
                                {row.map((cell, colIdx) => (
                                  <td key={colIdx} className="px-4 py-2 border-r border-outline-variant/40 text-text-secondary font-mono">
                                    {cell !== null && cell !== undefined ? String(cell) : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {excelBook && excelBook.SheetNames.length > 1 && (
                        <div className="h-10 bg-tertiary border-t border-outline-variant/40 flex items-center px-2 gap-1 overflow-x-auto no-scrollbar">
                          {excelBook.SheetNames.map(sheetName => (
                            <button
                              key={sheetName}
                              onClick={() => {
                                setExcelActiveSheet(sheetName);
                                loadExcelSheet(excelBook, sheetName);
                              }}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${
                                excelActiveSheet === sheetName
                                  ? 'bg-primary/20 text-primary border border-primary/20'
                                  : 'text-text-tertiary hover:bg-white/5'
                              }`}
                            >
                              {sheetName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. PPTX Slider Renderer */}
                  {pptxSlides.length > 0 && (
                    <div className="flex flex-col items-center gap-4 max-w-full m-auto">
                      <div 
                        className="bg-white border border-outline-variant/60 rounded-xl shadow-xl overflow-hidden text-black relative flex items-center justify-center origin-center transition-all duration-200"
                        style={{ 
                          width: '800px', 
                          height: '450px',
                          transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                          filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transformStyle: 'preserve-3d',
                          willChange: 'transform, filter'
                        }}
                        dangerouslySetInnerHTML={{ __html: pptxSlides[pptxActiveSlide] }}
                      />
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setPptxActiveSlide(s => Math.max(0, s - 1))}
                          disabled={pptxActiveSlide === 0}
                          className="px-4 py-1.5 rounded-xl border border-outline-variant/40 bg-white/5 hover:bg-white/10 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-white/5 transition"
                        >
                          Prev
                        </button>
                        <span className="text-xs font-mono">
                          Slide {pptxActiveSlide + 1} of {pptxSlides.length}
                        </span>
                        <button 
                          onClick={() => setPptxActiveSlide(s => Math.min(pptxSlides.length - 1, s + 1))}
                          disabled={pptxActiveSlide === pptxSlides.length - 1}
                          className="px-4 py-1.5 rounded-xl border border-outline-variant/40 bg-white/5 hover:bg-white/10 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-white/5 transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PPTX Rendered PDF sub-view */}
                  {(activeFile.extension === 'pptx' || activeFile.extension === 'ppt') && zipSubFilePreview?.extension === 'pdf' && (
                    <div className="w-full h-full flex items-center justify-center m-auto">
                      <iframe 
                        src={zipSubFilePreview.url} 
                        className="w-full h-full border-none rounded-xl"
                        title="PowerPoint PDF Rendered Slide Preview"
                      />
                    </div>
                  )}

                  {/* 5. ZIP Archive Catalog Explorer */}
                  {zipFiles.length > 0 && (
                    <div className="w-full h-full flex bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden m-auto">
                      <div className="w-72 border-r border-outline-variant/40 overflow-y-auto no-scrollbar flex flex-col flex-shrink-0">
                        <div className="p-3 border-b border-outline-variant/40">
                          <span className="text-[10px] uppercase font-bold text-text-tertiary">ZIP Contents</span>
                        </div>
                        <div className="p-1 flex flex-col gap-1">
                          {zipFiles.map((entry, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleZipSubFileClick(entry)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                                zipActiveEntry === entry.name
                                  ? 'bg-primary/10 border-primary/20 text-primary'
                                  : 'text-text-secondary hover:bg-white/5'
                              }`}
                            >
                              <div className="text-text-tertiary flex-shrink-0">
                                {entry.dir ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <span className="text-[11px] font-mono truncate leading-none">
                                {entry.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Zip Entry Content Viewport */}
                      <div className="flex-1 bg-background flex items-center justify-center p-4 overflow-auto">
                        {zipSubFilePreview ? (
                          <div className="w-full h-full flex flex-col">
                            <div className="h-8 flex items-center justify-between border-b border-outline-variant/40 pb-2 mb-2">
                              <span className="text-xs font-semibold text-on-background truncate">
                                {zipSubFilePreview.name}
                              </span>
                              <button 
                                onClick={() => cleanActiveUrls()}
                                className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex-1 flex items-center justify-center overflow-auto">
                              {/* Recursively handle ZIP sub previews */}
                              {zipSubFilePreview.extension === 'pdf' && (
                                <iframe src={zipSubFilePreview.url} className="w-full h-full border-none rounded-xl" title="pdf sub preview" />
                              )}
                              {['png','jpg','jpeg','webp','gif','bmp'].includes(zipSubFilePreview.extension) && (
                                <img src={zipSubFilePreview.url} className="max-h-full max-w-full rounded-xl object-contain" alt="" />
                              )}
                              {['mp3','wav','ogg'].includes(zipSubFilePreview.extension) && (
                                <audio controls src={zipSubFilePreview.url} className="w-3/4 max-w-md" />
                              )}
                              {['mp4','webm'].includes(zipSubFilePreview.extension) && (
                                <video controls src={zipSubFilePreview.url} className="max-h-full max-w-full rounded-xl" />
                              )}
                              {['txt','log','ini','conf','js','jsx','ts','tsx','py','java','cpp','h','css','json','xml','yaml','yml'].includes(zipSubFilePreview.extension) && (
                                <pre className="w-full text-left p-4 bg-white/5 border border-outline-variant/40 rounded-xl font-mono text-[11px] overflow-auto leading-relaxed select-text">
                                  {zipSubFilePreview.extension}
                                </pre>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-text-tertiary flex flex-col gap-2">
                            <Wrench className="w-8 h-8 text-white/10 mx-auto" />
                            <p className="text-xs">Select a file from ZIP catalog list to preview</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 6. Plain Text Viewer */}
                  {(activeFile.extension === 'txt' || activeFile.extension === 'log' || activeFile.extension === 'ini' || activeFile.extension === 'conf') && (
                    <pre 
                      className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto leading-relaxed max-h-full select-text text-text-secondary whitespace-pre-wrap m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, filter'
                      }}
                    >
                      {textContent}
                    </pre>
                  )}

                  {/* 7. Markdown Parser View */}
                  {activeFile.extension === 'md' && (
                    <div 
                      className="w-full max-w-[800px] text-left p-8 bg-secondary border border-outline-variant/40 rounded-xl font-sans text-xs overflow-auto max-h-full select-text leading-relaxed m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, filter'
                      }}
                    >
                      {formatMarkdown(textContent)}
                    </div>
                  )}

                  {/* 8. Code Syntax Highlighter (highlight.js) */}
                  {codeHtml && (
                    <pre 
                      className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto max-h-full leading-relaxed select-text m-auto origin-center transition-all duration-200"
                      style={{ 
                        transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, filter'
                      }}
                    >
                      <code className="hljs" dangerouslySetInnerHTML={{ __html: codeHtml }} />
                    </pre>
                  )}

                  {/* 9. Interactive Images view (Pan & Zoom wrapper) */}
                  {['png','jpg','jpeg','webp','gif','bmp'].includes(activeFile.extension) && (
                    <div 
                      className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                      <img 
                        ref={imageRef}
                        src={activeFile.blobUrl} 
                        style={{ 
                          transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                          filter: activeFilter === 'invert' ? 'invert(1) hue-rotate(180deg)' : activeFilter === 'grayscale' ? 'grayscale(1)' : activeFilter === 'sepia' ? 'sepia(1)' : 'none',
                          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transformStyle: 'preserve-3d',
                          willChange: 'transform, filter',
                          imageRendering: 'high-quality' 
                        }}
                        className="max-h-full max-w-full rounded-xl object-contain select-none shadow-2xl" 
                        alt={activeFile.name} 
                      />
                    </div>
                  )}

                  {/* 10. Sandboxed HTML / SVG frame */}
                  {sandboxUrl && (
                    <div className="w-full h-full border border-outline-variant/40 rounded-xl overflow-hidden bg-white m-auto">
                      <iframe 
                        src={sandboxUrl} 
                        sandbox="" 
                        title="Sandboxed user file preview frame"
                        className="w-full h-full border-none"
                      />
                    </div>
                  )}

                  {/* 11. Custom Video Player UI */}
                  {['mp4','webm'].includes(activeFile.extension) && (
                    <div className="relative max-h-full max-w-4xl border border-outline-variant/60 rounded-xl overflow-hidden shadow-2xl m-auto">
                      <video 
                        ref={videoRef}
                        src={activeFile.blobUrl}
                        className="block max-h-full w-full object-contain"
                        onTimeUpdate={handleMediaTimeUpdate}
                        onLoadedMetadata={handleMediaLoaded}
                        onClick={togglePlayState}
                      />
                      
                      {/* Controls layer overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background to-background/0 flex flex-col gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max={mediaDuration || 100}
                          value={mediaProgress} 
                          onChange={handleScrubChange}
                          className="w-full accent-primary bg-white/10 h-1.5 rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={togglePlayState}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition text-on-background"
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill" />}
                            </button>
                            <span className="text-[10px] font-mono text-text-secondary">
                              {Math.floor(mediaProgress / 60)}:{(Math.floor(mediaProgress % 60) + '').padStart(2,'0')} / {Math.floor(mediaDuration / 60)}:{(Math.floor(mediaDuration % 60) + '').padStart(2,'0')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Volume2 className="w-3.5 h-3.5 text-text-secondary" />
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              value={volume}
                              onChange={handleVolumeChange}
                              className="w-20 accent-primary bg-white/10 h-1 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 12. Custom Audio Player + animated waveform */}
                  {['mp3','wav','ogg'].includes(activeFile.extension) && (
                    <div className="w-full max-w-md p-6 glass-panel subtle-border rounded-3xl flex flex-col gap-6 relative shadow-lg">
                      <audio 
                        ref={audioRef}
                        src={activeFile.blobUrl}
                        onTimeUpdate={handleMediaTimeUpdate}
                        onLoadedMetadata={handleMediaLoaded}
                      />
                      
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                          <FileAudio className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="text-xs font-semibold truncate leading-tight text-on-background">
                            {activeFile.name}
                          </span>
                          <span className="text-[10px] text-text-tertiary">
                            {formatSize(activeFile.size)}
                          </span>
                        </div>
                      </div>

                      {/* Music animated visualizer bars */}
                      <div className="h-10 flex items-end justify-center gap-1.5 px-6">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              height: isPlaying ? `${Math.floor(Math.random() * 32) + 8}px` : '4px',
                              transition: 'height 0.15s ease-out'
                            }} 
                            className="w-1.5 bg-primary/40 rounded-full" 
                          />
                        ))}
                      </div>

                      <div className="flex flex-col gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max={mediaDuration || 100}
                          value={mediaProgress} 
                          onChange={handleScrubChange}
                          className="w-full accent-primary bg-white/10 h-1 rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary px-1">
                          <span>{Math.floor(mediaProgress / 60)}:{(Math.floor(mediaProgress % 60) + '').padStart(2,'0')}</span>
                          <span>{Math.floor(mediaDuration / 60)}:{(Math.floor(mediaDuration % 60) + '').padStart(2,'0')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button 
                          onClick={togglePlayState}
                          className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition shadow-lg shadow-primary/20 mx-auto"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill translate-x-0.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fallback details preview */}
                  {!loading && !error && !codeHtml && !textContent && !pptxSlides.length && !zipFiles.length && !sandboxUrl && 
                    !['pdf','docx','xlsx','xls','csv','png','jpg','jpeg','webp','gif','bmp','mp3','wav','ogg','mp4','webm'].includes(activeFile.extension) && (
                      <div className="flex flex-col items-center gap-4 max-w-md text-center">
                        <Wrench className="w-12 h-12 text-white/10" />
                        <h3 className="text-sm font-semibold text-on-background">No interactive visual preview</h3>
                        <p className="text-[11px] leading-relaxed text-text-tertiary max-w-xs">
                          DocForge doesn't support interactive previews for this file format yet. Check metadata details in the right actions panel.
                        </p>
                      </div>
                  )}

                </div>
              )}
            </div>

            {/* Sidebar Right: Details & Smart Actions */}
            <div 
              className={`border-l border-outline-variant/40 bg-secondary flex flex-col flex-shrink-0 overflow-y-auto no-scrollbar transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                detailsOpen && activeFile ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-l-0 pointer-events-none'
              }`}
            >
                
                {/* File Details Section */}
                <div className="p-4 border-b border-outline-variant/40 flex flex-col gap-3 text-left">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary">
                    File Details
                  </span>
                  <div className="flex flex-col gap-2 font-mono text-[10px] text-text-secondary">
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span>Name:</span>
                      <span className="text-on-background max-w-[160px] truncate">{activeFile.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span>Format:</span>
                      <span className="text-on-background font-semibold uppercase">{activeFile.extension}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span>Size:</span>
                      <span className="text-on-background">{formatSize(activeFile.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Smart Actions Router Panel */}
                <div className="p-4 flex flex-col gap-3 text-left flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-tertiary">
                    Smart Actions
                  </span>
                  
                  <div className="flex flex-col gap-2">
                    {SMART_ACTIONS[activeFile.extension]?.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendToTool(action.path)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-primary/10 border border-outline-variant/40 hover:border-primary/20 text-left transition-all duration-200 active:scale-[0.97] group"
                      >
                        <span className="text-xs font-semibold text-text-secondary group-hover:text-primary transition">
                          {action.label}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-tertiary group-hover:text-primary transition" />
                      </button>
                    ))}

                    <button
                      onClick={() => saveAs(activeFile.fileObject, activeFile.name)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-accent/10 border border-outline-variant/40 hover:border-accent/20 text-left transition-all duration-200 mt-2 active:scale-[0.97] group"
                    >
                      <span className="text-xs font-semibold text-text-secondary group-hover:text-accent transition">
                        Download File
                      </span>
                      <Download className="w-3.5 h-3.5 text-text-tertiary group-hover:text-accent transition" />
                    </button>
                  </div>
                </div>
              </div>

          </div>
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
      className={`relative flex flex-col items-center gap-1.5 p-1 rounded-xl border text-center transition cursor-pointer select-none active:scale-[0.96] duration-200 apple-spring-item ${
        isActive 
          ? 'bg-primary/10 border-primary/40 text-primary' 
          : 'bg-white/0 border-transparent text-text-secondary hover:bg-white/5'
      }`}
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
}
