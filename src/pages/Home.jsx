import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ToolCard from '../components/ToolCard';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import ToolIcon from '../components/ToolIcon';
import SEOHead from '../components/SEOHead';
import AdPlaceholder from '../components/AdPlaceholder';
import { CATEGORIES, TOOLS } from '../utils/constants';
import { saveFile, getFiles, deleteFile, clearFiles } from '../utils/db';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Import actual conversion engines
import { docxToPdf } from '../engines/document/docxToPdf';
import { textToPdf } from '../engines/document/textToPdf';
import { compressPdf } from '../engines/pdf/compressPdf';
import { rotatePdf } from '../engines/pdf/rotatePdf';
import { pdfToImages, pdfToImagesStream } from '../engines/pdf/pdfToImage';
import { mergePdfs } from '../engines/pdf/mergePdf';
import { splitPdf } from '../engines/pdf/splitPdf';
import { compressImage } from '../engines/image/compressImage';
import { convertImageFormat } from '../engines/image/convertFormat';
import { resizeImage } from '../engines/image/resizeImage';
import { imagesToPdf } from '../engines/pdf/imageToPdf';
import JSZip from 'jszip';

// Self-contained file size formatter
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const getFileBadge = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'docx':
    case 'doc':
      return { label: 'W', bg: 'bg-blue-600', text: 'text-white' };
    case 'pdf':
      return { label: 'PDF', bg: 'bg-red-600', text: 'text-white' };
    case 'md':
      return { label: 'MD', bg: 'bg-teal-600', text: 'text-white' };
    case 'txt':
      return { label: 'TXT', bg: 'bg-gray-600', text: 'text-white' };
    default:
      return { label: ext.toUpperCase(), bg: 'bg-purple-600', text: 'text-white' };
  }
};

const getEstimatedTime = (fileSize, progress) => {
  const totalSeconds = Math.max(3, Math.ceil(fileSize / (1024 * 1024)));
  const remainingSeconds = Math.max(1, Math.ceil(totalSeconds * (1 - progress / 100)));
  const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const secs = (remainingSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, userEmail, userTier, proLicenseKey, isPro, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  // PRO Workspace state
  const [workspaceQueue, setWorkspaceQueue] = useState([]);
  const [gpuBoostEnabled, setGpuBoostEnabled] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('workspace');
  const [queueFilter, setQueueFilter] = useState('all');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toolsCategoryFilter, setToolsCategoryFilter] = useState('all');
  // Collapsible sidebar (hidden by default, Gemini-style)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Upload canvas state — set when a file is dropped/selected
  const [canvasFile, setCanvasFile] = useState(null);
  const [canvasTools, setCanvasTools] = useState([]);
  const [canvasLocked, setCanvasLocked] = useState(null); // null=unknown, true=locked, false=unlocked
  const [canvasDetecting, setCanvasDetecting] = useState(false);


  // Handle category query parameters (e.g. ?category=pdf) to filter tools or switch tabs
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      if (category === 'pdf' || category === 'image' || category === 'utility') {
        if (isAuthenticated) {
          setActiveSidebarTab('converter');
          setToolsCategoryFilter(category);
        } else {
          if (category === 'pdf') {
            setActiveTab('organize-pdf');
          } else {
            setActiveTab(category);
          }
          // Scroll to guest tools directory section
          setTimeout(() => {
            const el = document.getElementById('features');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isAuthenticated]);

  const getActionTitle = (actionId) => {
    const actionTitles = {
      'compress-pdf': 'Compress PDF',
      'merge-pdf': 'Merge PDF',
      'split-pdf': 'Split PDF',
      'pdf-to-image': 'PDF to Images',
      'rotate-pdf': 'Rotate PDF',
      'protect-pdf': 'Protect PDF',
      'unlock-pdf': 'Unlock PDF',
      'docx-to-pdf': 'DOCX to PDF',
      'text-to-pdf': 'Text to PDF',
      'image-compressor': 'Image Compressor',
      'image-converter': 'Image Converter',
      'image-resizer': 'Image Resizer',
      'image-to-pdf': 'Images to PDF',
      'ai-summarizer': 'Smart Reformatter',
    };
    return actionTitles[actionId] || actionId;
  };

  const handleQuickAccessAction = (action) => {
    if (action === 'filter-pdf') {
      setActiveSidebarTab('converter');
      setToolsCategoryFilter('pdf');
    } else if (action === 'filter-image') {
      setActiveSidebarTab('converter');
      setToolsCategoryFilter('image');
    } else if (action === 'filter-convert') {
      setActiveSidebarTab('converter');
      setToolsCategoryFilter('convert');
    } else if (action === 'tab-reformatter') {
      setActiveSidebarTab('reformatter');
    }
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });
  const [storageUsage, setStorageUsage] = useState({ used: '1.2 GB', quota: '50 GB', percent: 2 });
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // Upgrade Modal states
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalTarget, setUpgradeModalTarget] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        const usedGB = (usage / (1024 * 1024 * 1024)).toFixed(1);
        const quotaGB = (quota / (1024 * 1024 * 1024)).toFixed(0);
        const pct = Math.round((usage / quota) * 100) || 0;
        setStorageUsage({
          used: `${usedGB} GB`,
          quota: `${quotaGB} GB`,
          percent: pct
        });
      }).catch(() => {
        setStorageUsage({ used: '1.2 GB', quota: '50 GB', percent: 2 });
      });
    }
  }, [workspaceQueue]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  // Guest landing page inline uploader modal states
  const [selectedFile, setSelectedFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState([]);
  const [heroConvertingFile, setHeroConvertingFile] = useState(null);
  const [heroConversionProgress, setHeroConversionProgress] = useState(0);
  const [heroConversionState, setHeroConversionState] = useState('idle'); // 'idle' | 'converting' | 'completed'
  const [isDraggingOverHero, setIsDraggingOverHero] = useState(false);
  const fileInputRef = useRef(null);
  const workspaceInputRef = useRef(null);
  const toolsRef = useRef(null);

  const toolsSearchRef = useRef(null);
  const guestToolsSearchRef = useRef(null);

  const SIDEBAR_TABS = ['workspace', 'queue', 'converter', 'reformatter', 'templates', 'settings'];

  const focusCard = (direction) => {
    const cards = Array.from(document.querySelectorAll('[data-tool-card]'));
    if (cards.length === 0) return;

    const activeEl = document.activeElement;
    const isCardFocused = activeEl && activeEl.hasAttribute('data-tool-card');

    if (!isCardFocused) {
      if (['ArrowDown', 'ArrowRight'].includes(direction)) {
        cards[0].focus();
        return true;
      } else if (['ArrowUp', 'ArrowLeft'].includes(direction)) {
        cards[cards.length - 1].focus();
        return true;
      }
      return false;
    }

    const currentIndex = cards.indexOf(activeEl);
    let nextIndex = currentIndex;

    // Approximate grid navigation: 1, 2, 3, or 4 columns depending on screen size.
    // For simplicity, Left/Right moves by 1.
    // Up/Down moves by finding the closest card vertically, or moving by a fixed offset
    // Let's get column count by comparing Y offsets of the first few cards.
    let columns = 1;
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].getBoundingClientRect().top > cards[0].getBoundingClientRect().top + 10) {
        columns = i;
        break;
      }
      if (i === cards.length - 1) columns = cards.length;
    }

    switch (direction) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, cards.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + columns, cards.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - columns, 0);
        break;
    }

    if (nextIndex !== currentIndex) {
      cards[nextIndex].focus();
      cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }

    return true; // prevent default to stop scrolling if at edge but focused on a card
  };

  useKeyboardShortcuts({
    '/': (e) => {
      e.preventDefault();
      if (isAuthenticated) {
        setActiveSidebarTab('converter');
        setTimeout(() => toolsSearchRef.current?.focus(), 0);
      } else {
        setTimeout(() => {
          guestToolsSearchRef.current?.focus();
          guestToolsSearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
      }
    },
    'Escape': (e) => {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      setSearchQuery('');
      setModalOpen(false);
      setOpenDropdownId(null);
      setOpenMenuId(null);
      if (confirmDialog) {
        setConfirmDialog(null);
      }
    },
    'ArrowRight': (e) => {
      if (focusCard('ArrowRight')) e.preventDefault();
    },
    'ArrowLeft': (e) => {
      if (focusCard('ArrowLeft')) e.preventDefault();
    },
    'ArrowDown': (e) => {
      if (focusCard('ArrowDown')) e.preventDefault();
    },
    'ArrowUp': (e) => {
      if (focusCard('ArrowUp')) e.preventDefault();
    }
  });

  // local simulated conversion progress effect for hero visual
  useEffect(() => {
    let interval;
    if (heroConversionState === 'converting') {
      interval = setInterval(() => {
        setHeroConversionProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setHeroConversionState('completed');
            setTimeout(() => {
              setModalOpen(true);
              setHeroConversionState('idle');
            }, 800);
            return 100;
          }
          const increment = Math.max(4, Math.floor((100 - prev) * 0.18));
          return Math.min(100, prev + increment);
        });
      }, 70);
    }
    return () => clearInterval(interval);
  }, [heroConversionState]);

  const handleWorkspaceFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    addFilesToWorkspaceQueue(selected);
  };

  const handleWorkspaceDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    addFilesToWorkspaceQueue(dropped);
  };

  const addFilesToWorkspaceQueue = (newFiles) => {
    // Filter out unsupported files first
    const validFiles = newFiles.filter(file => {
      const actions = getActionsForFile(file.name);
      if (!actions) {
        showToast(`⚠️ Unsupported file type: ${file.name}. Only PDF, DOCX, TXT, and images are supported.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Single file → show the interactive Upload Canvas
    if (validFiles.length === 1) {
      const file = validFiles[0];
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      // Reset canvas state
      setCanvasFile(file);
      setCanvasLocked(null);
      setCanvasDetecting(ext === '.pdf');
      setCanvasTools(ext === '.pdf' ? [] : (getActionsForFile(file.name) || []));

      if (ext === '.pdf') {
        // Async: detect lock state, then set tools
        detectPdfLock(file).then((isLocked) => {
          setCanvasLocked(isLocked);
          setCanvasTools(isLocked ? PDF_LOCKED_ACTIONS : PDF_UNLOCKED_ACTIONS);
          setCanvasDetecting(false);
        });
      }
      return;
    }

    // Multi-file → go straight to queue
    addFilesToQueueDirect(validFiles);
  };


  // Internal: add files directly to queue (used for multi-file drop & "Add to Queue" from canvas)
  const addFilesToQueueDirect = (validFiles) => {
    // Enforce limits: PRO users have 50 files limit.
    const limit = 50;
    const currentCount = workspaceQueue.length;
    const remainingSlots = Math.max(0, limit - currentCount);

    let allowedFiles = validFiles;
    if (validFiles.length > remainingSlots) {
      showToast('⚠️ Workspace is limited to 50 active files. Please clear completed items.');
      allowedFiles = validFiles.slice(0, remainingSlots);
    }

    if (allowedFiles.length === 0) return;

    const items = allowedFiles.map((file, idx) => {
      const actions = getActionsForFile(file.name);
      return {
        id: `ws-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        detectedActions: actions.map(a => a.id),
        selectedAction: actions[0]?.id || null,
        status: 'PendingAction', // 'PendingAction' | 'Processing' | 'Completed' | 'Failed'
        progress: 0,
        resultBlob: null,
        resultName: null,
        timestamp: Date.now(), // Store timestamp to show relative time
      };
    });

    setWorkspaceQueue(prev => [...prev, ...items]);
  };


  const executeWorkspaceAction = async (itemId, action) => {
    const itemIndex = workspaceQueue.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    const item = workspaceQueue[itemIndex];

    setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'Processing', selectedAction: action, progress: 0 } : i));

    const file = item.file;
    let outputBlob;
    let outputName = item.name;
    let outputType = item.type;

    try {
      if (action === 'docx-to-pdf' || action === 'DOCX to PDF' || action === 'DOCX to PDF (GPU Cloud)') {
        outputBlob = await docxToPdf(file, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'text-to-pdf' || action === 'Text to PDF' || action === 'Text to PDF (GPU Cloud)') {
        const text = await file.text();
        outputBlob = await textToPdf(text, { title: file.name }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'compress-pdf' || action === 'Compress PDF' || action === 'Compress PDF (GPU Cloud)') {
        outputBlob = await compressPdf(file, { quality: 0.6 }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
        outputType = 'application/pdf';
      } else if (action === 'rotate-pdf' || action === 'Rotate PDF' || action === 'Rotate PDF (GPU Cloud)') {
        outputBlob = await rotatePdf(file, 90, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_rotated.pdf';
        outputType = 'application/pdf';
      } else if (action === 'pdf-to-image' || action === 'PDF to Images' || action === 'PDF to Images (GPU Cloud)') {
        // Stream pages into ZIP — worker enforces 200-page cap for batch queue
        const zip = new JSZip();
        await pdfToImagesStream(
          file,
          { format: 'jpeg', quality: 0.85, scale: 1.5, maxPages: 200 },
          async ({ name, blob }) => { zip.file(name, blob); },
          (pct) => {
            setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
          }
        );
        outputBlob = await zip.generateAsync({ type: 'blob' });
        outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
        outputType = 'application/zip';
      } else if (action === 'merge-pdf' || action === 'Merge PDFs' || action === 'Merge PDFs (GPU Cloud)') {
        outputBlob = await mergePdfs([file], (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_merged.pdf';
        outputType = 'application/pdf';
      } else if (action === 'split-pdf' || action === 'Split PDF' || action === 'Split PDF (GPU Cloud)') {
        const { blobs, names } = await splitPdf(file, 'all', '', (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        if (blobs.length === 1) {
          outputBlob = blobs[0];
          outputName = names[0];
          outputType = blobs[0].type;
        } else {
          const zip = new JSZip();
          blobs.forEach((b, idx) => zip.file(names[idx], b));
          outputBlob = await zip.generateAsync({ type: 'blob' });
          outputName = file.name.replace(/\.[^.]+$/, '') + '-split.zip';
          outputType = 'application/zip';
        }
      } else if (action === 'image-compressor' || action === 'Image Compressor') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await compressImage(file, 0.7);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-converter' || action === 'Image Converter') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await convertImageFormat(file, 'png', 0.92);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-resizer' || action === 'Image Resizer') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await resizeImage(file, { mode: 'percentage', percentage: 50 });
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-to-pdf' || action === 'Images to PDF') {
        outputBlob = await imagesToPdf([file], (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const textMsg = `Smart Reformatter requires the conversion server backend. This local file is: ${file.name}`;
        outputBlob = new Blob([textMsg], { type: 'text/plain' });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_reformatted.txt';
        outputType = 'text/plain';
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      }

      setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { 
        ...i, 
        status: 'Completed', 
        progress: 100,
        resultBlob: outputBlob,
        resultName: outputName,
        completedAt: Date.now(),
      } : i));
      showToast(`Successfully processed ${file.name}!`);

    } catch (err) {
      console.error('Error running conversion engine:', err);
      setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'Failed', progress: 0 } : i));
      showToast(`Error converting ${file.name}`);
    }
  };

  const handleDownloadWorkspaceResult = (item) => {
    if (item.resultBlob && item.resultName) {
      saveAs(item.resultBlob, item.resultName);
      showToast(`Downloading ${item.resultName}`);
    }
  };

  // Canvas: user picks a tool → queue file and start immediately
  const handleCanvasToolSelect = (toolAction) => {
    if (!canvasFile) return;
    const actions = getActionsForFile(canvasFile.name);
    const itemId = `ws-${Date.now()}-0-${Math.random().toString(36).substr(2, 9)}`;
    const newItem = {
      id: itemId,
      file: canvasFile,
      name: canvasFile.name,
      size: canvasFile.size,
      type: canvasFile.type,
      detectedActions: actions ? actions.map(a => a.id) : [toolAction.id],
      selectedAction: toolAction.id,
      status: 'PendingAction',
      progress: 0,
      resultBlob: null,
      resultName: null,
      timestamp: Date.now(),
    };
    setWorkspaceQueue(prev => [...prev, newItem]);
    setCanvasFile(null);
    setCanvasTools([]);
    // Auto-start the conversion
    setTimeout(() => executeWorkspaceAction(itemId, toolAction.id), 80);
  };

  // Canvas: "Add to Queue" without immediately running
  const handleCanvasAddToQueue = () => {
    if (!canvasFile) return;
    addFilesToQueueDirect([canvasFile]);
    setCanvasFile(null);
    setCanvasTools([]);
    showToast(`${canvasFile.name} added to queue.`);
  };

  const removeWorkspaceQueueItem = (itemId) => {
    setWorkspaceQueue(prev => prev.filter(i => i.id !== itemId));
  };


  const toggleStarItem = (itemId) => {
    setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, starred: !i.starred } : i));
  };

  const togglePlayPauseItem = (item) => {
    if (item.status === 'Processing') {
      setWorkspaceQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'Paused' } : i));
      showToast(`Paused processing ${item.name}`);
    } else if (item.status === 'PendingAction' || item.status === 'Paused' || item.status === 'Failed') {
      executeWorkspaceAction(item.id, item.selectedAction);
    }
  };

  // Load workspace history when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaceHistory();
    }
  }, [isAuthenticated]);

  const loadWorkspaceHistory = async () => {
    setLoadingHistory(true);
    try {
      const logs = await getFiles();
      setWorkspaceFiles(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const scrollToTools = () => {
    toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Helper to resolve actions based on file extension
  // NOTE: icon field is now the tool ID — rendered via <ToolIcon> in the canvas
  const PDF_UNLOCKED_ACTIONS = [
    { id: 'compress-pdf',  title: 'Compress PDF' },
    { id: 'merge-pdf',     title: 'Merge PDF' },
    { id: 'split-pdf',     title: 'Split PDF' },
    { id: 'pdf-to-image',  title: 'PDF to Images' },
    { id: 'rotate-pdf',    title: 'Rotate PDF' },
    { id: 'protect-pdf',   title: 'Protect PDF' },
  ];

  const PDF_LOCKED_ACTIONS = [
    { id: 'unlock-pdf',   title: 'Unlock PDF' },
  ];

  const IMAGE_ACTIONS = [
    { id: 'image-compressor', title: 'Compress Image' },
    { id: 'image-converter',  title: 'Convert Format' },
    { id: 'image-resizer',    title: 'Resize Image' },
    { id: 'image-to-pdf',     title: 'Image to PDF' },
  ];

  const getActionsForFile = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    const actionsMap = {
      '.pdf':  PDF_UNLOCKED_ACTIONS, // may be overridden after lock detection
      '.docx': [
        { id: 'docx-to-pdf',    title: 'DOCX to PDF' },
        { id: 'ai-summarizer',  title: 'Smart Reformatter' },
      ],
      '.txt': [
        { id: 'text-to-pdf',   title: 'Text to PDF' },
        { id: 'ai-summarizer', title: 'Smart Reformatter' },
      ],
      '.png':  IMAGE_ACTIONS,
      '.jpg':  IMAGE_ACTIONS,
      '.jpeg': IMAGE_ACTIONS,
      '.webp': IMAGE_ACTIONS,
      '.bmp':  IMAGE_ACTIONS,
      '.gif':  IMAGE_ACTIONS,
    };
    return actionsMap[ext] || null;
  };

  // Detect whether a PDF file is password-protected using PDF.js
  const detectPdfLock = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      await loadingTask.promise;
      return false; // opened fine → unlocked
    } catch (err) {
      if (err && err.name === 'PasswordException') {
        return true; // password required → locked
      }
      return false; // other error → treat as unlocked
    }
  };

  // Guest Landing Page single uploader flow
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFileGuest(files[0]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDropGuest = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFileGuest(files[0]);
    }
  };

  const processFileGuest = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const actions = getActionsForFile(file.name);
    
    if (actions && actions.length > 0) {
      // Size limits based on tier
      const maxFileSize = userTier === 'pro'
        ? 1024 * 1024 * 1024
        : (isAuthenticated ? 100 * 1024 * 1024 : 10 * 1024 * 1024);
      
      const maxFileSizeStr = userTier === 'pro' ? '1GB' : (isAuthenticated ? '100MB' : '10MB');
      const tierName = userTier === 'pro' ? 'Pro' : (isAuthenticated ? 'Free Account' : 'Guest Mode');

      if (file.size > maxFileSize) {
        showToast(`⚠️ File too large: ${file.name} (${formatSize(file.size)}). Max allowed is ${maxFileSizeStr} in ${tierName}.`);
        return;
      }

      setSelectedFile(file);
      setSuggestedTools(actions.map(a => {
        let path = `/${a.id}`;
        // Special case: 'ai-summarizer' maps to '/smart-convert'
        if (a.id === 'ai-summarizer') {
          path = '/smart-convert';
        }
        return {
          id: a.id,
          title: a.title,
          path: path,
          icon: a.icon
        };
      }));
      // Start interactive conversion animation in the 3D card visual
      setHeroConvertingFile(file);
      setHeroConversionProgress(0);
      setHeroConversionState('converting');
    } else {
      showToast(`Unsupported file type (${ext}). Please upload a PDF, Word document, Text file, or Image.`);
    }
  };

  const handleToolSelect = (toolPath) => {
    setModalOpen(false);
    // Find the tool by path to check tier access
    const tool = TOOLS.find(t => t.path === toolPath);
    if (tool) {
      const minTier = tool.minTier || 'guest';
      const isAuthorized = 
        minTier === 'guest' || 
        (minTier === 'free' && isAuthenticated) || 
        (minTier === 'pro' && isPro);
      if (!isAuthorized) {
        setUpgradeModalTarget(tool);
        setUpgradeModalOpen(true);
        return;
      }
    }
    navigate(toolPath, { state: { initialFile: selectedFile } });
  };

  // App Workspace Batch Uploader flow
  const handleBatchFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    addFilesToBatchQueue(selected);
  };

  const handleBatchDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    addFilesToBatchQueue(dropped);
  };

  const addFilesToBatchQueue = (newFiles) => {
    // 1. Filter out unsupported files first
    const validFiles = newFiles.filter(file => {
      const actions = getActionsForFile(file.name);
      if (!actions) {
        showToast(`⚠️ Unsupported file type: ${file.name}. Only PDF, DOCX, TXT, and images are supported.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Filter files based on size limits per tier
    const maxFileSize = userTier === 'pro'
      ? 1024 * 1024 * 1024
      : (isAuthenticated ? 100 * 1024 * 1024 : 10 * 1024 * 1024);
    const maxFileSizeStr = userTier === 'pro' ? '1GB' : (isAuthenticated ? '100MB' : '10MB');
    const tierName = userTier === 'pro' ? 'Pro' : (isAuthenticated ? 'Free Account' : 'Guest Mode');

    const sizeFilteredFiles = validFiles.filter(file => {
      if (file.size > maxFileSize) {
        showToast(`⚠️ File too large: ${file.name} (${formatSize(file.size)}). Max allowed is ${maxFileSizeStr} in ${tierName}.`);
        return false;
      }
      return true;
    });

    if (sizeFilteredFiles.length === 0) return;

    // 2. Enforce limits on the remaining valid files
    const limit = userTier === 'pro' ? 50 : (isAuthenticated ? 5 : 1);
    const currentCount = batchQueue.length;
    const remainingSlots = Math.max(0, limit - currentCount);

    let allowedFiles = sizeFilteredFiles;
    if (sizeFilteredFiles.length > remainingSlots) {
      if (userTier === 'pro') {
        showToast('⚠️ Pro accounts are limited to 50 files per batch queue.');
      } else if (isAuthenticated) {
        showToast('⚠️ Free accounts are limited to 5 files per batch queue. Upgrade to PRO for up to 50 files!');
      } else {
        showToast('⚠️ Guest mode is limited to 1 file in the batch queue. Create a free account to queue up to 5 files!');
      }
      allowedFiles = sizeFilteredFiles.slice(0, remainingSlots);
    }

    if (allowedFiles.length === 0) return;

    const items = allowedFiles.map(file => {
      const actions = getActionsForFile(file.name);
      return {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        action: actions[0]?.id || 'Smart Reformatter',
        status: 'Ready', // 'Ready' | 'Processing' | 'Completed' | 'Failed'
        progress: 0,
      };
    });

    setBatchQueue(prev => [...prev, ...items]);
  };

  const removeQueueItem = (idx) => {
    if (isProcessingBatch) return;
    setBatchQueue(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQueueItemAction = (idx, action) => {
    if (isProcessingBatch) return;
    setBatchQueue(prev => prev.map((item, i) => i === idx ? { ...item, action } : item));
  };

  const executeBatchProcess = async () => {
    if (batchQueue.length === 0 || isProcessingBatch) return;
    setIsProcessingBatch(true);

    for (let i = 0; i < batchQueue.length; i++) {
      if (batchQueue[i].status === 'Completed') continue;

      setActiveBatchIndex(i);
      setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'Processing' } : item));
      setBatchProgress(0);

      const file = batchQueue[i].file;
      const action = batchQueue[i].action;
      let outputBlob;
      let outputName = batchQueue[i].name;
      let outputType = batchQueue[i].type;

      try {
        if (action === 'DOCX to PDF') {
          outputBlob = await docxToPdf(file, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Text to PDF') {
          const text = await file.text();
          outputBlob = await textToPdf(text, { title: file.name }, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Compress PDF') {
          outputBlob = await compressPdf(file, { quality: 0.6 }, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Rotate PDF') {
          outputBlob = await rotatePdf(file, 90, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_rotated.pdf';
          outputType = 'application/pdf';
        } else if (action === 'PDF to Images') {
          // Stream pages into ZIP — worker enforces 200-page cap for batch queue
          const zip = new JSZip();
          await pdfToImagesStream(
            file,
            { format: 'jpeg', quality: 0.85, scale: 1.5, maxPages: 200 },
            async ({ name, blob }) => { zip.file(name, blob); },
            (pct) => {
              setBatchProgress(pct);
              setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
            }
          );
          outputBlob = await zip.generateAsync({ type: 'blob' });
          outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
          outputType = 'application/zip';
        } else if (action === 'Merge PDFs') {
          outputBlob = await mergePdfs([file], (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_merged.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Split PDF') {
          const { blobs, names } = await splitPdf(file, 'all', '', (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          if (blobs.length === 1) {
            outputBlob = blobs[0];
            outputName = names[0];
            outputType = blobs[0].type;
          } else {
            const zip = new JSZip();
            blobs.forEach((b, idx) => zip.file(names[idx], b));
            outputBlob = await zip.generateAsync({ type: 'blob' });
            outputName = file.name.replace(/\.[^.]+$/, '') + '-split.zip';
            outputType = 'application/zip';
          }
        } else if (action === 'Image Compressor') {
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await compressImage(file, 0.7);
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Image Converter') {
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await convertImageFormat(file, 'png', 0.92);
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Image Resizer') {
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await resizeImage(file, { mode: 'percentage', percentage: 50 });
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Images to PDF') {
          outputBlob = await imagesToPdf([file], (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else {
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const textMsg = `Smart Reformatter requires the conversion server backend. This local file is: ${file.name}`;
          outputBlob = new Blob([textMsg], { type: 'text/plain' });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_reformatted.txt';
          outputType = 'text/plain';
          setBatchProgress(100);
        }
      } catch (err) {
        console.error('Error running conversion engine in batch:', err);
        setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'Failed', progress: 0 } : item));
        continue;
      }

      // Save output to IndexedDB database
      let actionName = action;
      if (gpuBoostEnabled && userTier === 'pro') {
        actionName += ' (GPU Cloud)';
      }
      await saveFile(
        outputName,
        outputBlob.size,
        outputType,
        actionName,
        outputBlob
      );

      setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'Completed', progress: 100 } : item));
      setBatchProgress(0);
    }

    setIsProcessingBatch(false);
    setActiveBatchIndex(-1);
    showToast(`Successfully processed ${batchQueue.length} file(s)!`);
    setBatchQueue([]);
    loadWorkspaceHistory(); // Refresh IndexedDB file list
  };

  const handleDownloadFile = (record) => {
    saveAs(record.blob, record.name);
    showToast(`Downloading ${record.name}`);
  };

  const handleDeleteRecord = async (id) => {
    try {
      await deleteFile(id);
      loadWorkspaceHistory();
      showToast('Record deleted from local workspace.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearWorkspace = () => {
    setConfirmDialog({
      title: 'Clear Local History',
      message: 'Are you sure you want to clear your local file history? All saved files will be deleted from your browser database.',
      onConfirm: async () => {
        try {
          await clearFiles();
          loadWorkspaceHistory();
          showToast('Local workspace cleared.');
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePopularClick = (item) => {
    navigate(item.path);
  };

  const popularConversions = [
    { title: 'Word to PDF', icon: 'description', desc: 'Convert Word documents to PDF format with perfect formatting.', path: '/docx-to-pdf', implemented: true, featured: true },
    { title: 'Compress PDF', icon: 'compress', desc: 'Reduce file size while optimizing for maximal quality.', path: '/compress-pdf', implemented: true },
    { title: 'JPG to PDF', icon: 'image', desc: 'Convert and arrange images into a single PDF document.', path: '/image-to-pdf', implemented: true },
    { title: 'Merge PDF', icon: 'join_inner', desc: 'Combine multiple PDFs into one unified document.', path: '/merge-pdf', implemented: true },
    { title: 'PDF to Images', icon: 'image', desc: 'Convert PDF pages to high-quality PNG or JPG images.', path: '/pdf-to-image', implemented: true },
    { title: 'View All 13 Tools', icon: 'apps', desc: 'Explore our complete collection of document utilities.', path: 'scroll', implemented: true },
  ];

  // ⚡ Bolt: Wrapped filteredTools in useMemo to prevent recalculating the filter on every re-render.
  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const categoryToMatch = isAuthenticated ? toolsCategoryFilter : activeTab;
      
      let matchesTab = true;
      if (categoryToMatch !== 'all') {
        if (categoryToMatch === 'pdf') {
          matchesTab = tool.category.endsWith('-pdf') || tool.category.startsWith('pdf-') || tool.category === 'edit-pdf';
        } else if (categoryToMatch === 'convert') {
          matchesTab = tool.category.startsWith('convert-');
        } else {
          matchesTab = tool.category === categoryToMatch;
        }
      }

      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [isAuthenticated, activeTab, toolsCategoryFilter, searchQuery]);

  const isWorkspaceView = isAuthenticated;

  return (
    <div className={`bg-background text-on-background min-h-screen relative font-body-md antialiased text-left ${isWorkspaceView ? 'overflow-hidden flex h-screen w-screen' : 'overflow-x-hidden pt-24'}`}>
      <SEOHead
        title="DocForge (Dynamic Workspace)"
        description="Access free local PDF, image, and document tools. 100% private conversion, compression, and editing. No file uploads required."
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 bg-surface border border-primary/30 text-on-surface px-6 py-4 rounded-xl shadow-lg z-50 flex items-center gap-3 max-w-sm animate-bounce">
          <span className="material-symbols-outlined text-primary">info</span>
          <span className="font-label-mono text-label-mono text-on-background">{toastMessage}</span>
        </div>
      )}

      {/* Guest Match Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-on-background/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline rounded-xl p-8 max-w-md w-full shadow-2xl relative animate-[fadeIn_0.22s_ease-out]">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-background flex items-center justify-center p-1"
              title="Close dialog"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <h3 className="font-h3 text-h3 text-on-background mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              File Selected
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 truncate font-medium">
              {selectedFile?.name}
            </p>
            <div className="flex flex-col gap-3">
              <p className="font-label-mono text-label-mono text-outline uppercase tracking-wider mb-1">Select tool to proceed:</p>
              {suggestedTools.map((tool) => (
                <button
                  key={tool.path}
                  onClick={() => handleToolSelect(tool.path)}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant hover:border-primary rounded-lg text-left font-body-md text-on-background hover:bg-surface-container-high group transition-all"
                >
                  <span className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
                      <ToolIcon id={tool.id} size={28} />
                    </div>
                    <span className="font-semibold">{tool.title}</span>
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[18px]">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          AUTHENTICATED WORKSPACE VIEW
          ────────────────────────────────────────────────────────── */}
      {isAuthenticated ? (
        /* ──────────────────────────────────────────────────────────
            USER WORKSPACE (Side-by-side Layout)
            ────────────────────────────────────────────────────────── */
        <>
          {/* LEFT SIDEBAR — collapsible, push-style */}
          <aside
            className={`h-full bg-surface-container flex flex-col border-r border-outline-variant flex-shrink-0 text-left select-none py-3.5 px-4 overflow-hidden transition-all duration-300 ease-in-out`}
            style={{
              width: sidebarOpen ? '288px' : '0px',
              minWidth: sidebarOpen ? '288px' : '0px',
              opacity: sidebarOpen ? 1 : 0,
              paddingLeft: sidebarOpen ? undefined : '0px',
              paddingRight: sidebarOpen ? undefined : '0px',
              pointerEvents: sidebarOpen ? 'auto' : 'none',
            }}
          >
            {/* Logo Brand */}
            <div className="flex items-center gap-3 mb-4 font-h2 text-xl font-bold tracking-tight select-none">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 14.5C19 14.5 21 12.5 21 10C21 7.5 19 7 19 7C19 7 19 4 13 4C7 4 7 7 7 7C7 7 3 7.5 3 10C3 12.5 5 14.5 5 14.5L3 19H21L19 14.5Z" fill="currentColor"/>
                <path d="M8 19H16V20H8V19Z" fill="currentColor" opacity="0.8"/>
                <circle cx="12" cy="2" r="1" fill="#f97316"/>
                <circle cx="7" cy="3" r="0.75" fill="#f97316" opacity="0.7"/>
                <circle cx="17" cy="3" r="0.75" fill="#f97316" opacity="0.7"/>
              </svg>
              <span className="text-on-background">Doc<span className="text-primary">Forge</span></span>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex flex-col gap-3">
              {/* WORKSPACE STUDIO SECTION */}
              <div className="flex flex-col gap-1">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-3 mb-1 select-none font-bold">Workspace Studio</span>
                {[
                  { id: 'workspace', label: 'Studio Workspace', icon: 'grid_view' },
                  { id: 'queue', label: 'Batch Queue', icon: 'queue', badge: workspaceQueue.length },
                ].map((item) => {
                  const isActive = activeSidebarTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSidebarTab(item.id);
                        setOpenDropdownId(null);
                        setOpenMenuId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-primary text-white' : 'bg-surface-container-highest border border-outline-variant text-on-surface-variant'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* OFFLINE UTILITIES SECTION */}
              <div className="flex flex-col gap-1 mt-3.5">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-3 mb-1 select-none font-bold">Offline Utilities</span>
                {[
                  { id: 'converter', label: 'Tools Directory', icon: 'sync_alt' },
                  { id: 'reformatter', label: 'Reformatter', icon: 'history_edu' },
                  { id: 'templates', label: 'Templates', icon: 'chrome_reader_mode' },
                ].map((item) => {
                  const isActive = activeSidebarTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSidebarTab(item.id);
                        setOpenDropdownId(null);
                        setOpenMenuId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SYSTEM SECTION */}
              <div className="flex flex-col gap-1 mt-3.5">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-3 mb-1 select-none font-bold">System</span>
                {[
                  { id: 'settings', label: 'Preferences', icon: 'settings' },
                ].map((item) => {
                  const isActive = activeSidebarTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSidebarTab(item.id);
                        setOpenDropdownId(null);
                        setOpenMenuId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto pt-3.5 flex flex-col gap-2.5">
              {/* Upgrade Promo / Pro Badge */}
              {userTier === 'pro' ? (
                <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-2.5 flex items-center gap-2.5 select-none relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined fill text-[18px]">workspace_premium</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-label-mono text-[8px] uppercase tracking-wider text-primary font-bold">PRO PLAN</div>
                    <p className="font-body-sm text-[10px] text-on-surface-variant font-semibold truncate">Premium unlocked</p>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-primary/25 rounded-2xl p-3 shadow-sm relative overflow-hidden flex flex-col gap-2.5 text-left border-outline-variant/80">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/5 rounded-bl-[40px] pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="material-symbols-outlined text-primary text-[15px] fill">workspace_premium</span>
                      <span className="font-label-mono text-[8.5px] uppercase tracking-wider text-[#9d4300] dark:text-[#ff7f1c] font-bold">PRO UPGRADE</span>
                    </div>
                    <h4 className="font-bold text-[10.5px] text-on-background leading-none">Unlock Desktop Power</h4>
                    <p className="font-body-sm text-[9.5px] text-on-surface-variant leading-tight mt-1 font-medium">
                      Get parallel batch tasks up to 50 files & WASM GPU Cloud speed.
                    </p>
                  </div>
                  <Link
                    to="/pricing"
                    className="w-full btn-theme-primary py-1.5 rounded-lg font-button text-[10px] font-bold text-center shadow-sm flex items-center justify-center gap-1 relative z-10"
                  >
                    Upgrade Now
                  </Link>
                </div>
              )}

              {/* Local Storage Card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-2.5 flex flex-col gap-1.5 select-none">
                <div className="flex justify-between items-center text-[10px] font-semibold text-on-surface-variant">
                  <span className="text-[10.5px]">Local Storage</span>
                  <span className="text-[10.5px] font-bold text-on-background">{storageUsage.used} / {storageUsage.quota}</span>
                </div>
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden border border-outline-variant/50">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${storageUsage.percent}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-outline">
                  <span>Browser database</span>
                  <span className="font-bold text-on-background">{storageUsage.percent}%</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN DASHBOARD CONTENT AREA */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* Workspace Header */}
            <header className="h-[60px] border-b border-outline-variant flex items-center justify-between px-4 flex-shrink-0 select-none bg-surface/90 backdrop-blur-md relative z-30">
              {/* Left: sidebar toggle + branding */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Gemini-style sidebar toggle button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-8 h-8 rounded-xl border border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center transition-all bg-surface hover:bg-primary/5"
                  title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  aria-label="Toggle sidebar"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {sidebarOpen ? 'menu_open' : 'menu'}
                  </span>
                </button>
                <div className="flex flex-col justify-center text-left min-w-0">
                  <h1 className="font-bold text-[15px] text-on-background leading-tight">
                    Welcome back, <span className="text-primary">{userEmail ? userEmail.split('@')[0] : 'there'}</span> ✏️
                  </h1>
                  <p className="text-[10px] text-on-surface-variant font-medium leading-none mt-0.5">Create. Convert. Perfect.</p>
                </div>
              </div>
              {activeSidebarTab !== 'converter' && (
                <div className="flex-1 max-w-[320px] mx-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-container border border-outline-variant rounded-xl focus-within:border-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">search</span>
                    <input
                      type="text"
                      placeholder="Search tools, files..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (activeSidebarTab !== 'converter' && e.target.value) {
                          setActiveSidebarTab('converter');
                        }
                      }}
                      className="bg-transparent border-none outline-none w-full text-xs text-on-background placeholder:text-outline font-medium"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="w-8 h-8 rounded-xl border border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center transition-all bg-surface relative" title="Notifications">
                  <span className="material-symbols-outlined text-[18px]">notifications</span>
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"></span>
                </button>
                <button onClick={handleThemeToggle} className="w-8 h-8 rounded-xl border border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center transition-all bg-surface" title="Toggle theme">
                  <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                </button>
                <div className="relative">
                  <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="flex items-center gap-1 p-1 hover:bg-surface-container rounded-full transition-all">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-[#FDBA74] flex items-center justify-center font-bold text-[11px] text-white shadow-sm ring-2 ring-primary/20 select-none">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : 'D'}
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-outline">keyboard_arrow_down</span>
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 bg-surface border border-outline-variant rounded-xl shadow-lg py-1.5 z-50 min-w-[180px] text-left">
                      <div className="px-3 py-1.5 text-[10px] text-on-surface-variant font-medium border-b border-outline-variant/60 truncate max-w-[200px]">{userEmail}</div>
                      <Link to="/dashboard" className="w-full text-left px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container font-semibold flex items-center gap-1.5 border-t border-outline-variant/60">
                        <span className="material-symbols-outlined text-[15px]">account_circle</span>My Account
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left px-3.5 py-2 text-xs text-error hover:bg-error-container/10 font-bold border-t border-outline-variant/60 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">logout</span>Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Tab Views */}
            <div className="flex-1 overflow-y-auto bg-background relative z-10">

              {/* WORKSPACE + QUEUE: two-column canvas */}
              {(activeSidebarTab === 'workspace' || activeSidebarTab === 'queue') && (
                <div className="flex gap-5 p-5 min-h-full">

                  {/* LEFT COLUMN */}
                  <div className="flex-1 flex flex-col gap-4 min-w-0">

                    {/* UPLOAD CANVAS — shown when a file is dropped/selected */}
                    {activeSidebarTab === 'workspace' && canvasFile ? (
                      <div className="canvas-slide-up relative rounded-3xl overflow-hidden flex-shrink-0 border border-outline-variant"
                        style={{ minHeight: '340px', background: 'linear-gradient(145deg, var(--color-bg-surface, #faf8f4) 0%, var(--color-bg-surface-container, #f3ede6) 100%)' }}
                      >
                        {/* Close canvas button */}
                        <button
                          onClick={() => { setCanvasFile(null); setCanvasTools([]); setCanvasLocked(null); setCanvasDetecting(false); }}
                          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl border border-outline-variant hover:border-error text-outline hover:text-error flex items-center justify-center transition-all bg-surface/80 backdrop-blur-sm"
                          title="Dismiss"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>

                        <div className="flex flex-col items-center justify-center gap-5 py-10 px-8 text-center relative z-10">
                          {/* File card with 3D glow + lock badge */}
                          <div
                            className="file-card-glow relative flex flex-col items-center gap-3 px-10 py-6 rounded-2xl border border-primary/20 bg-surface cursor-default select-none shadow-sm"
                            style={{ minWidth: '200px' }}
                          >
                            {/* Lock / Unlock status badge — top-right of card */}
                            {canvasLocked === true && (
                              <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md">
                                <span className="material-symbols-outlined text-[12px] fill">lock</span>
                                LOCKED
                              </div>
                            )}
                            {canvasLocked === false && (
                              <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 bg-success text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md">
                                <span className="material-symbols-outlined text-[12px] fill">lock_open</span>
                                UNLOCKED
                              </div>
                            )}

                            {/* File type badge */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-md ${getFileBadge(canvasFile.name).bg} ${getFileBadge(canvasFile.name).text}`}>
                              {getFileBadge(canvasFile.name).label}
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <p className="font-bold text-[13px] text-on-background max-w-[180px] truncate">{canvasFile.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{formatSize(canvasFile.size)}</p>
                            </div>
                          </div>

                          {/* Tool chips header / detecting state */}
                          {canvasDetecting ? (
                            <div className="flex flex-col items-center gap-3">
                              <p className="text-[11px] font-bold text-outline uppercase tracking-widest">Analysing file…</p>
                              <div className="flex gap-2">
                                {[0, 1, 2, 3].map(i => (
                                  <div
                                    key={i}
                                    className="h-10 rounded-xl bg-surface-container border border-outline-variant/50"
                                    style={{ width: `${90 + i * 14}px`, animation: `pulse 1.4s ease-in-out ${i * 0.18}s infinite` }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Status message for locked PDFs */}
                              {canvasLocked === true && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
                                  <span className="material-symbols-outlined text-[14px] fill">lock</span>
                                  This PDF is password-protected. Unlock it first.
                                </div>
                              )}

                              <p className="text-[11px] font-bold text-outline uppercase tracking-widest">
                                {canvasLocked === true ? 'Available Action' : 'What would you like to do?'}
                              </p>

                              {/* 3D animated tool chip cards with ToolIcon */}
                              <div className="flex flex-wrap justify-center gap-2.5 max-w-[560px]">
                                {canvasTools.map((tool, idx) => (
                                  <button
                                    key={tool.id}
                                    onClick={() => handleCanvasToolSelect(tool)}
                                    className="tool-chip-in group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl border border-outline-variant hover:border-primary bg-surface hover:bg-primary/8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] text-left"
                                    style={{ animationDelay: `${idx * 65}ms` }}
                                  >
                                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                                      <ToolIcon id={tool.id} size={28} />
                                    </div>
                                    <span className="text-[12px] font-semibold text-on-background group-hover:text-primary transition-colors whitespace-nowrap">{tool.title}</span>
                                    <span className="material-symbols-outlined text-[13px] text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">arrow_forward</span>
                                  </button>
                                ))}
                              </div>

                              {/* Add to queue instead */}
                              <button
                                onClick={handleCanvasAddToQueue}
                                className="text-[11px] text-on-surface-variant hover:text-primary font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant hover:border-primary/40 px-4 py-1.5 rounded-xl"
                              >
                                <span className="material-symbols-outlined text-[13px]">add_to_queue</span>
                                Add to Queue instead
                              </button>
                            </>
                          )}
                        </div>
                        <input type="file" ref={workspaceInputRef} onChange={handleWorkspaceFileSelect} multiple={true} className="hidden" accept=".pdf,.docx,.txt,image/*" />
                      </div>


                    ) : activeSidebarTab === 'workspace' ? (
                      /* GRADIENT HERO DROP ZONE (default — no file selected) */
                      <div
                        onClick={() => workspaceInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleWorkspaceDrop}
                        className="relative rounded-2xl overflow-hidden cursor-pointer select-none group flex-shrink-0"
                        style={{ minHeight: '185px' }}
                      >
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(20,75%,75%) 0%, hsl(35,70%,78%) 35%, hsl(14,75%,80%) 65%, hsl(28,80%,82%) 100%)' }} />
                        <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 120%, hsl(40,85%,85%) 0%, transparent 65%)' }} />
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-9 px-6 text-center">
                          <div className="rounded-2xl bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300" style={{ width: '52px', height: '52px' }}>
                            <span className="material-symbols-outlined text-[26px] fill" style={{ color: 'var(--color-primary)' }}>upload_file</span>
                          </div>
                          <div>
                            <p className="font-bold text-[15px] text-white drop-shadow-sm">Drop your documents anywhere</p>
                            <p className="text-[11px] text-white/80 mt-0.5 font-medium">or click to upload</p>
                            <p className="text-[10px] text-white/60 mt-0.5">Supports DOCX, PDF, TXT, MD &amp; more</p>
                          </div>
                          <button
                            className="btn-theme-primary mt-1 px-7 py-2.5 rounded-xl font-bold text-[13px] shadow-lg active:scale-95 transition-all duration-200 hover:opacity-90"
                            onClick={(e) => { e.stopPropagation(); workspaceInputRef.current?.click(); }}
                          >Select Files</button>
                        </div>
                        <input type="file" ref={workspaceInputRef} onChange={handleWorkspaceFileSelect} multiple={true} className="hidden" accept=".pdf,.docx,.txt,image/*" />
                      </div>
                    ) : null}


                    {/* QUEUE HEADER */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[14px] text-on-background">Your Queue</h3>
                          <span className="text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded-full">{workspaceQueue.length}</span>
                          <span className="text-[10px] text-on-surface-variant font-medium hidden sm:inline">Processing locally &amp; securely</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {workspaceQueue.length > 0 && (
                            <button onClick={() => setWorkspaceQueue([])} className="text-[11px] text-on-surface-variant hover:text-error border border-outline-variant hover:border-error px-2.5 py-1 rounded-lg transition-all font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">delete</span>Clear
                            </button>
                          )}
                          <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} className="text-[11px] text-on-surface-variant border border-outline-variant bg-surface px-2.5 py-1.5 rounded-lg font-semibold focus:outline-none focus:border-primary cursor-pointer appearance-none pr-6 shadow-sm" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238c7164' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '12px' }}>
                            <option value="all">All Tasks</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
                      </div>
                    {/* Active list cards */}
                    {workspaceQueue.filter(item => {
                      if (queueFilter === 'all') return true;
                      if (queueFilter === 'pending') return item.status === 'PendingAction' || item.status === 'Paused';
                      if (queueFilter === 'processing') return item.status === 'Processing';
                      if (queueFilter === 'completed') return item.status === 'Completed';
                      if (queueFilter === 'failed') return item.status === 'Failed';
                      return true;
                    }).length === 0 ? (
                      <div className="py-16 text-center text-on-surface-variant border border-dashed border-outline-variant/60 rounded-3xl bg-surface-container-low/20 flex flex-col items-center justify-center p-6 select-none animate-[fadeIn_0.15s_ease-out]">
                        <span className="material-symbols-outlined text-[36px] text-outline/50 mb-3">upload_file</span>
                        <p className="text-sm font-bold text-on-background">Drop a document to start processing locally</p>
                        <p className="text-xs text-on-surface-variant mt-1 max-w-sm leading-relaxed font-medium">
                          Your files never leave your device. Fast, secure, and fully private local computations.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {workspaceQueue.filter(item => {
                          if (queueFilter === 'all') return true;
                          if (queueFilter === 'pending') return item.status === 'PendingAction' || item.status === 'Paused';
                          if (queueFilter === 'processing') return item.status === 'Processing';
                          if (queueFilter === 'completed') return item.status === 'Completed';
                          if (queueFilter === 'failed') return item.status === 'Failed';
                          return true;
                        }).map((item) => {
                          const badge = getFileBadge(item.name);
                          const isRowDropdownOpen = openDropdownId === item.id || openMenuId === item.id;
                          return (
                            <div 
                              key={item.id} 
                              className={`p-4 bg-surface-container-low border border-outline-variant rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-surface-container-low/80 ${
                                item.status === 'Processing' ? 'border-primary/50 ring-1 ring-primary/20' : ''
                              } ${isRowDropdownOpen ? 'relative z-30' : 'relative z-10'}`}
                            >
                              {/* Left details */}
                              <div className="flex items-center gap-4 min-w-0 flex-1 text-left">
                                <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <h4 className="font-body-md text-[14px] font-bold text-on-background truncate max-w-[200px] md:max-w-[250px] lg:max-w-[300px]">
                                      {item.name}
                                    </h4>
                                    <button 
                                      onClick={() => toggleStarItem(item.id)}
                                      className="text-outline hover:text-amber-500 transition-colors p-0.5"
                                    >
                                      <span className={`material-symbols-outlined text-[16px] ${item.starred ? 'fill text-amber-500' : ''}`}>
                                        star
                                      </span>
                                    </button>
                                  </div>
                                  <p className="font-body-sm text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5">
                                    <span>{formatSize(item.size)}</span>
                                    <span>•</span>
                                    <span>{formatRelativeTime(item.timestamp)}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Center suggested action button with selector dropdown */}
                              <div className="flex-shrink-0 md:w-48 text-left z-20">
                                {item.status === 'Completed' || item.status === 'Processing' ? (
                                  <span className="px-3.5 py-2 bg-surface border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface-variant select-none inline-block">
                                    {getActionTitle(item.selectedAction)}
                                  </span>
                                ) : (
                                  <div className="relative">
                                    <button
                                      disabled={item.status === 'Processing'}
                                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                                      className="w-full px-3.5 py-2 border border-outline-variant hover:border-primary rounded-xl text-xs font-semibold bg-surface hover:bg-surface-container flex items-center justify-between gap-1.5 transition-all text-on-background shadow-sm"
                                    >
                                      <span className="truncate">{getActionTitle(item.selectedAction)}</span>
                                      {item.detectedActions.length > 1 && (
                                        <span className="material-symbols-outlined text-[16px] text-outline">keyboard_arrow_down</span>
                                      )}
                                    </button>
                                    
                                    {openDropdownId === item.id && item.detectedActions.length > 1 && (
                                      <div className="absolute top-full left-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-lg py-1.5 z-40 min-w-[175px] text-left">
                                        {item.detectedActions.map((act) => (
                                          <button
                                            key={act}
                                            onClick={() => {
                                              setWorkspaceQueue(prev => prev.map(i => i.id === item.id ? { ...i, selectedAction: act } : i));
                                              setOpenDropdownId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-surface-container text-on-background font-semibold"
                                          >
                                            {getActionTitle(act)}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Right progress indicator */}
                              <div className="flex-shrink-0 w-full md:w-56 text-left flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span className={
                                    item.status === 'Completed' ? 'text-success' : 
                                    item.status === 'Processing' ? 'text-primary' : 
                                    item.status === 'Failed' ? 'text-error' : 'text-amber-500'
                                  }>
                                    {item.status === 'Processing' ? 'Converting...' : 
                                     item.status === 'Completed' ? 'Completed' : 
                                     item.status === 'Failed' ? 'Failed' : 'Queued'}
                                  </span>
                                  {item.status === 'Processing' && (
                                    <span className="text-primary font-label-mono">{item.progress}%</span>
                                  )}
                                  {item.status === 'Completed' && (
                                    <span className="text-success font-label-mono">100%</span>
                                  )}
                                </div>
                                
                                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-outline-variant/50">
                                  <div 
                                    className={`h-full transition-all duration-200 ${
                                      item.status === 'Completed' ? 'bg-success' : 
                                      item.status === 'Processing' ? 'bg-primary' : 
                                      item.status === 'Failed' ? 'bg-error' : 'bg-outline-variant/40'
                                    }`}
                                    style={{ width: `${item.status === 'Completed' ? 100 : item.progress}%` }}
                                  />
                                </div>

                                <div className="text-[10px] text-outline font-semibold">
                                  {item.status === 'Processing' && (
                                    <span>Estimated time: {getEstimatedTime(item.size, item.progress)}</span>
                                  )}
                                  {item.status === 'Completed' && (
                                    <span>Completed {formatRelativeTime(item.completedAt)}</span>
                                  )}
                                  {item.status === 'PendingAction' && (
                                    <span>Waiting to start</span>
                                  )}
                                  {item.status === 'Failed' && (
                                    <span className="text-error">Conversion failed. Click retry.</span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons (play/pause/trash) */}
                              <div className="flex items-center gap-2 flex-shrink-0 select-none">
                                {item.status === 'Processing' ? (
                                  <>
                                    <button 
                                      onClick={() => togglePlayPauseItem(item)}
                                      className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-xl transition-all bg-surface text-outline shadow-sm"
                                      title="Pause"
                                    >
                                      <span className="material-symbols-outlined text-[16px] fill">pause</span>
                                    </button>
                                    <button 
                                      onClick={() => removeWorkspaceQueueItem(item.id)}
                                      className="p-2 border border-outline-variant hover:border-error hover:text-error rounded-xl transition-all bg-surface text-outline shadow-sm"
                                      title="Cancel"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                  </>
                                ) : item.status === 'Completed' ? (
                                  <>
                                    <button 
                                      onClick={() => handleDownloadWorkspaceResult(item)}
                                      className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-xl transition-all bg-surface text-outline shadow-sm"
                                      title="Download File"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">download</span>
                                    </button>
                                    <div className="relative">
                                      <button 
                                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                                        className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-xl transition-all bg-surface text-outline shadow-sm"
                                        title="More actions"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                                      </button>
                                      {openMenuId === item.id && (
                                        <div className="absolute top-full right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-lg py-1 z-40 min-w-[120px] text-left">
                                          <button 
                                            onClick={() => {
                                              removeWorkspaceQueueItem(item.id);
                                              setOpenMenuId(null);
                                            }}
                                            className="w-full px-3.5 py-2 text-xs text-error hover:bg-error-container/10 font-semibold flex items-center gap-1.5 text-left"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                            Remove log
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => togglePlayPauseItem(item)}
                                      className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-xl transition-all bg-surface text-outline shadow-sm"
                                      title="Start"
                                    >
                                      <span className="material-symbols-outlined text-[16px] fill text-primary">play_arrow</span>
                                    </button>
                                    <button 
                                      onClick={() => removeWorkspaceQueueItem(item.id)}
                                      className="p-2 border border-outline-variant hover:border-error hover:text-error rounded-xl transition-all bg-surface text-outline shadow-sm"
                                      title="Remove"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Quick Access + Pro Tip */}
                  <div className="w-[210px] flex-shrink-0 flex flex-col gap-4">
                    <div>
                      <h3 className="font-bold text-[12px] text-on-background mb-3 uppercase tracking-wider">Quick Access</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'PDF Tools',    icon: 'picture_as_pdf', action: 'filter-pdf' },
                          { label: 'Image Tools',  icon: 'image',          action: 'filter-image' },
                          { label: 'Convert',      icon: 'sync_alt',       action: 'filter-convert' },
                          { label: 'Merge',        icon: 'merge',          path: '/merge-pdf' },
                          { label: 'Compress',     icon: 'compress',       path: '/compress-pdf' },
                          { label: 'Reformat',     icon: 'history_edu',    action: 'tab-reformatter' },
                        ].map((item) => {
                          const isAction = !!item.action;
                          const Content = (
                            <>
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover/qa:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-[20px] fill text-primary">{item.icon}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-on-surface-variant group-hover/qa:text-primary transition-colors leading-tight">{item.label}</span>
                            </>
                          );
                          
                          if (isAction) {
                            return (
                              <button
                                key={item.label}
                                onClick={() => handleQuickAccessAction(item.action)}
                                className="w-full flex flex-col items-center gap-2 p-3 rounded-2xl border border-solid border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/8 transition-all duration-200 group/qa text-center cursor-pointer"
                              >
                                {Content}
                              </button>
                            );
                          }
                          
                          return (
                            <Link
                              key={item.label}
                              to={item.path}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-solid border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/8 transition-all duration-200 group/qa text-center cursor-pointer"
                            >
                              {Content}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {userTier !== 'pro' && (
                      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-3">
                        <div>
                          <div className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Pro Tip</div>
                          <p className="text-[12px] font-bold text-on-background leading-snug">Batch Queue saves time</p>
                          <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Process multiple files at once with one click</p>
                        </div>
                        <Link
                          to="/pricing"
                          className="w-full text-center py-2 px-3 rounded-xl font-bold text-[11px] bg-primary text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                        >Upgrade to Pro</Link>
                      </div>
                    )}
                    {userTier === 'pro' && (
                      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px] fill">workspace_premium</span>
                        <p className="text-[12px] font-bold text-on-background">Pro Plan Active</p>
                        <p className="text-[10px] text-on-surface-variant">All features unlocked</p>
                      </div>
                    )}
                  </div>


                </div>
              )}


              {/* tab === converter */}
              {activeSidebarTab === 'converter' && (
                <div className="flex flex-col gap-6 text-left p-5 md:p-6 lg:p-8 min-h-full">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="font-h2 text-xl font-bold text-on-background">Tools Directory</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Launch any local conversion tool directly</p>
                    </div>
                    <div className="relative w-full md:w-[320px]">
                      <input
                        ref={toolsSearchRef}
                        type="text"
                        placeholder="Search tools (e.g. compress, convert)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2.5 pl-9 pr-9 bg-surface border border-outline-variant rounded-xl text-on-background text-xs focus:outline-none focus:border-primary transition-all shadow-sm"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px] select-none">
                        search
                      </span>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-background flex items-center justify-center"
                          title="Clear search"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Category Filter Tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
                    {[
                      { id: 'all', label: 'All Tools', icon: 'grid_view' },
                      { id: 'pdf', label: 'PDF Tools', icon: 'picture_as_pdf' },
                      { id: 'image', label: 'Image Tools', icon: 'image' },
                      { id: 'utility', label: 'Utilities', icon: 'build' },
                    ].map((tab) => {
                      const isActive = toolsCategoryFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setToolsCategoryFilter(tab.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isActive
                              ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_2px_8px_rgba(var(--color-primary-rgb),0.04)]'
                              : 'bg-surface border-outline-variant/60 text-on-surface-variant hover:text-on-background hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTools.map((tool) => {
                      const minTier = tool.minTier || 'guest';
                      const isAuthorized = 
                        minTier === 'guest' || 
                        (minTier === 'free' && isAuthenticated) || 
                        (minTier === 'pro' && isPro);
                      
                      return (
                        <div 
                          key={tool.id}
                          onClick={() => {
                            if (isAuthorized) {
                              navigate(tool.path);
                            } else {
                              setUpgradeModalTarget(tool);
                              setUpgradeModalOpen(true);
                            }
                          }}
                          className="bg-surface-container-low border border-outline-variant hover:border-primary rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col text-left group shadow-sm relative overflow-hidden"
                        >
                          {!isAuthorized && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-container-high border border-outline-variant px-2 py-0.5 rounded-full select-none shadow-sm z-10">
                              <span className="material-symbols-outlined text-outline text-[12px]">lock</span>
                              <span className="font-label-mono text-[9px] text-outline font-bold uppercase tracking-wider">
                                {minTier === 'pro' ? 'Pro' : 'Free'}
                              </span>
                            </div>
                          )}
                          <div className="w-10 h-10 flex items-center justify-center select-none mb-4">
                            <ToolIcon id={tool.id} size={36} />
                          </div>
                          <h4 className="font-body-md text-sm font-bold text-on-background mb-1 group-hover:text-primary transition-colors">{tool.title}</h4>
                          <p className="font-body-sm text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed mb-4">{tool.description}</p>
                          <div className="mt-auto flex justify-end text-outline group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* tab === reformatter */}
              {activeSidebarTab === 'reformatter' && (
                !isPro ? (
                  <div className="flex items-center justify-center p-5 md:p-6 lg:p-8 min-h-[500px]">
                    <div className="max-w-[500px] w-full p-8 bg-surface-container-low border border-outline-variant rounded-2xl shadow-sm text-center animate-in fade-in slide-in-from-bottom duration-300">
                      <span className="material-symbols-outlined text-[48px] text-primary mb-4 select-none">
                        history_edu
                      </span>
                      <h2 className="font-h2 text-lg font-bold text-on-background mb-3">
                        Smart Document Reformatter
                      </h2>
                      <p className="font-body-sm text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed font-medium">
                        Standardize, clean, and format document spacing, layouts, and typefaces instantly based on academic and corporate presets. This tool is exclusive to DocForge Pro.
                      </p>
                      <button
                        onClick={() => navigate('/pricing')}
                        className="font-button text-xs bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm font-bold"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 text-left p-5 md:p-6 lg:p-8 min-h-full">
                    <div>
                      <h2 className="font-h2 text-xl font-bold text-on-background">Smart Document Reformatter</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Standardize, clean, and format documents using pre-set styling criteria</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                        <label className="font-label-mono text-[10px] text-outline uppercase tracking-wider font-bold">Input Document Text</label>
                        <textarea 
                          placeholder="Paste text here to reformat or select a document from the workspace..."
                          className="w-full h-80 p-4 bg-surface border border-outline-variant rounded-xl text-xs text-on-background focus:outline-none focus:border-primary font-mono resize-none shadow-inner"
                        />
                        <div className="flex justify-between items-center flex-wrap gap-4 mt-2">
                          <span className="text-[10px] text-outline">Character count: 0</span>
                          <button className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
                            Apply formatting
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                        <h3 className="font-body-md text-sm font-bold text-on-background">Reformat Presets</h3>
                        <p className="font-body-sm text-[11px] text-on-surface-variant">Choose the target layout and structural styling system</p>
                        
                        <div className="flex flex-col gap-2.5">
                          {[
                            { id: 'academic', title: 'Academic Layout', desc: 'APA/MLA standards, double space, Times New Roman' },
                            { id: 'executive', title: 'Executive Report', desc: 'Modern professional design, high readability font' },
                            { id: 'clean', title: 'Clean Markdown', desc: 'Standard headers, bullet lines, syntax formatting' },
                            { id: 'creative', title: 'Creative Draft', desc: 'Relaxed margins, serif editorial typeface' }
                          ].map((preset, idx) => (
                            <label key={preset.id} className="p-3 border border-outline-variant hover:border-primary rounded-xl cursor-pointer flex gap-3 bg-surface hover:bg-surface-container-low transition-all shadow-sm">
                              <input type="radio" name="preset" defaultChecked={idx === 0} className="mt-0.5 accent-primary" />
                              <div className="min-w-0">
                                <div className="font-body-md text-xs font-bold text-on-background">{preset.title}</div>
                                <p className="font-body-sm text-[10px] text-on-surface-variant truncate font-medium">{preset.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* tab === templates */}
              {activeSidebarTab === 'templates' && (
                <div className="flex flex-col gap-6 text-left p-5 md:p-6 lg:p-8 min-h-full">
                  <div>
                    <h2 className="font-h2 text-xl font-bold text-on-background">Document Templates</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Pre-formatted document designs for various use cases</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { title: 'Project Proposal', type: 'DOCX', desc: 'Includes cover page, executive summary, and project details tables.', minTier: 'free' },
                      { title: 'Professional Resume', type: 'PDF', desc: 'Modern two-column layout optimized for applicant tracking systems (CV Builder).', minTier: 'pro' },
                      { title: 'Meeting Minutes', type: 'TXT', desc: 'Standard corporate framework for recording agenda, notes, and tasks.', minTier: 'free' },
                      { title: 'Technical Guide', type: 'MD', desc: 'Markdown layout with code blocks, tables, and nested checklists.', minTier: 'free' }
                    ].map((tmpl, idx) => {
                      const isTmplPro = tmpl.minTier === 'pro';
                      const hasAccess = !isTmplPro || isPro;
                      return (
                        <div key={idx} className="bg-surface-container-low border border-outline-variant hover:border-primary rounded-2xl p-5 flex flex-col text-left transition-all hover:-translate-y-0.5 shadow-sm relative overflow-hidden group">
                          {!hasAccess && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-container-high border border-outline-variant px-2 py-0.5 rounded-full select-none shadow-sm z-10">
                              <span className="material-symbols-outlined text-outline text-[12px]">lock</span>
                              <span className="font-label-mono text-[9px] text-outline font-bold uppercase tracking-wider">Pro</span>
                            </div>
                          )}
                          <span className="font-label-mono text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full w-max mb-4">
                            {tmpl.type} Template
                          </span>
                          <h4 className="font-body-md text-sm font-bold text-on-background mb-1.5">{tmpl.title}</h4>
                          <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mb-6 font-medium">{tmpl.desc}</p>
                          <button 
                            onClick={() => {
                              if (hasAccess) {
                                showToast(`Loading template: ${tmpl.title}...`);
                              } else {
                                setUpgradeModalTarget({ title: 'CV Creator & Resume Templates', minTier: 'pro' });
                                setUpgradeModalOpen(true);
                              }
                            }}
                            className="mt-auto bg-surface border border-outline-variant hover:border-primary hover:text-primary text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm"
                          >
                            Use Template
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* tab === settings */}
              {activeSidebarTab === 'settings' && (
                <div className="flex flex-col gap-6 text-left max-w-2xl p-5 md:p-6 lg:p-8 min-h-full">
                  <div>
                    <h2 className="font-h2 text-xl font-bold text-on-background">Workspace Settings</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Configure your local workspace parameters</p>
                  </div>
                  
                  <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
                    {/* GPU Acceleration */}
                    <div className="flex justify-between items-center gap-4 pb-5 border-b border-outline-variant/60">
                      <div>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1">WASM GPU Cloud Acceleration</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant font-medium">Utilize parallel GPU processing where available for larger files</p>
                      </div>
                      <button 
                        onClick={() => setGpuBoostEnabled(!gpuBoostEnabled)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 flex-shrink-0 ${
                          gpuBoostEnabled ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all duration-200 ${
                          gpuBoostEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    
                    {/* Theme Selection */}
                    <div className="flex justify-between items-center gap-4 pb-5 border-b border-outline-variant/60">
                      <div>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1">Color Theme Mode</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant font-medium">Toggle light mode and dark mode styles</p>
                      </div>
                      <button 
                        onClick={handleThemeToggle}
                        className="px-4 py-2 border border-outline-variant hover:border-primary rounded-xl text-xs font-bold bg-surface hover:bg-surface-container transition-all flex items-center gap-2 shadow-sm text-on-background"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </span>
                        <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                      </button>
                    </div>
                    
                    {/* Cache Database Stats */}
                    <div className="flex justify-between items-center gap-4 pb-5 border-b border-outline-variant/60">
                      <div>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1">IndexedDB Cache</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant font-medium">Clear saved logs and conversion output caches</p>
                      </div>
                      <button 
                        onClick={handleClearWorkspace}
                        className="px-4 py-2 border border-error/30 hover:border-error hover:bg-error-container/10 text-error rounded-xl text-xs font-bold bg-surface transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                        <span>Clear Workspace Cache</span>
                      </button>
                    </div>
                    
                    {/* Version Details */}
                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                      <span>DocForge Local Version</span>
                      <span className="font-label-mono text-[10px] bg-surface-container border border-outline-variant px-2.5 py-0.5 rounded-full">v3.4.2-PRO</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      ) : (
        /* ──────────────────────────────────────────────────────────
            GUEST LANDING VIEW (Unauthenticated Visitors)
            ────────────────────────────────────────────────────────── */
        <>
          <section className="relative max-w-container-max mx-auto px-gutter pt-lg pb-2xl flex flex-col lg:flex-row gap-2xl items-center overflow-hidden">
            {/* Premium mesh background gradient orbs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[80px] pointer-events-none select-none z-0"></div>
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px] pointer-events-none select-none z-0 animate-[pulse_8s_infinite]"></div>
            
            {/* Left Side Content */}
            <div className="flex-1 flex flex-col items-start text-left relative z-10 w-full">

              <h1 className="font-display-hero text-display-hero-mobile sm:text-display-hero text-on-background mb-6 leading-[1.05] tracking-tight font-extrabold">
                Your files never<br />leave <em className="not-italic text-primary">this tab.</em>
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-lg leading-relaxed font-medium">
                Desktop-grade PDF tools — merge, compress, convert, sign, OCR — processed entirely on your device. No uploads. No servers reading your documents. Ever.
              </p>
              
              {/* Trust Badge Strip */}
              <div className="flex rounded-2xl border border-outline-variant/65 bg-surface-container-low/75 backdrop-blur-md overflow-hidden w-full max-w-md mb-8 shadow-sm">
                <div className="flex-1 px-4 py-3.5 flex items-center justify-center gap-2.5 font-body-sm text-[12px] font-bold text-on-surface-variant border-r border-outline-variant/40 last:border-r-0 select-none">
                  <span className="material-symbols-outlined text-[16px] text-primary fill">cloud_off</span>
                  <span>Zero Uploads</span>
                </div>
                <div className="flex-1 px-4 py-3.5 flex items-center justify-center gap-2.5 font-body-sm text-[12px] font-bold text-on-surface-variant border-r border-outline-variant/40 last:border-r-0 select-none">
                  <span className="material-symbols-outlined text-[16px] text-primary fill">memory</span>
                  <span>Runs Locally</span>
                </div>
                <div className="flex-1 px-4 py-3.5 flex items-center justify-center gap-2.5 font-body-sm text-[12px] font-bold text-on-surface-variant border-r border-outline-variant/40 last:border-r-0 select-none">
                  <span className="material-symbols-outlined text-[16px] text-primary fill">delete_sweep</span>
                  <span>Auto Cleared</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-md items-center mb-8 w-full sm:w-auto">
                <button 
                  onClick={scrollToTools}
                  className="font-button text-button btn-theme-primary px-6 py-4 rounded-xl shadow-sm flex items-center justify-center font-bold w-full sm:w-auto"
                >
                  Start Converting for Free
                </button>
                <button 
                  onClick={scrollToTools}
                  className="font-button text-button bg-transparent hover:bg-surface-container-high text-on-background border border-outline-variant px-6 py-4 rounded-xl transition-all font-semibold w-full sm:w-auto"
                >
                  Browse All Tools
                </button>
              </div>

              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.txt,image/*"
              />
            </div>

            {/* Right Side Interactive 3D Card Visual */}
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={() => setIsDraggingOverHero(true)}
              onDragLeave={() => setIsDraggingOverHero(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOverHero(false);
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  processFileGuest(files[0]);
                }
              }}
              className="flex-1 hidden lg:flex justify-end items-center relative h-[500px] w-full select-none group pr-8"
            >
              <div className="absolute inset-0 bg-pattern opacity-10 rounded-2xl pointer-events-none"></div>
              
              {/* Perspective deck */}
              <div className="relative w-[340px] h-[400px] [perspective:1000px] [transform-style:preserve-3d]">
                
                {/* Back Card: Output Preview - Opacity and border visibility increased */}
                <div className={`absolute w-[300px] h-[360px] top-10 -right-4 bg-surface border border-outline-variant/90 rounded-3xl shadow-md rotate-[8deg] translate-z-[-20px] opacity-80 group-hover:rotate-[12deg] group-hover:translate-x-2 transition-all duration-500 flex flex-col p-6 items-center justify-center ${
                  isDraggingOverHero ? 'border-primary/50 translate-x-2' : ''
                }`}>
                  <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4 select-none">
                    description
                  </span>
                  <p className="font-label-mono text-[10px] text-outline/65 truncate max-w-[200px] font-bold">
                    {heroConvertingFile ? `${heroConvertingFile.name.split('.').slice(0, -1).join('.')}_final.pdf` : 'Output_Document.pdf'}
                  </p>
                </div>

                {/* Front Card: Active Processing / Dropzone */}
                <div className={`absolute w-[320px] h-[380px] top-0 left-0 bg-white dark:bg-zinc-900 border-2 ${
                  isDraggingOverHero || heroConversionState === 'converting' ? 'border-primary shadow-glow-primary scale-[1.02]' : 'border-outline-variant group-hover:border-primary shadow-xl'
                } rounded-3xl p-6 [transform:rotate(-3deg)] group-hover:[transform:rotate(0deg)_translateY(-8px)] transition-all duration-500 flex flex-col justify-between overflow-hidden`}>
                  
                  {/* Glow bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-[#FDBA74] to-primary opacity-90"></div>

                  {heroConversionState === 'idle' ? (
                    // IDLE state
                    <>
                      <div className="flex items-center gap-3.5 pb-4 border-b border-outline-variant/45 text-left">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                          <span className="material-symbols-outlined text-[20px] fill">upload_file</span>
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-on-background">Drag or Drop here</h4>
                          <p className="text-[10px] text-on-surface-variant/80 font-semibold">Convert locally in browser</p>
                        </div>
                      </div>

                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="flex-1 border-2 border-dashed border-outline-variant/50 rounded-2xl my-5 flex flex-col items-center justify-center p-5 text-center bg-surface-container-low/20 group-hover:bg-primary/5 hover:bg-primary/5 hover:border-primary transition-all duration-300 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[36px] text-outline/50 group-hover:text-primary transition-colors mb-2">
                          cloud_upload
                        </span>
                        <p className="text-xs font-bold text-on-background leading-snug">
                          Drop file or click to select
                        </p>
                        <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-normal font-medium">
                          PDF, DOCX, TXT, Images
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/85 font-bold text-left">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                        Client-side · 100% Private
                      </div>
                    </>
                  ) : (
                    // ACTIVE processing
                    <>
                      <div className="flex items-center gap-3.5 pb-4 border-b border-outline-variant/45 text-left">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          heroConversionState === 'completed' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
                        }`}>
                          {heroConvertingFile ? heroConvertingFile.name.split('.').pop().toUpperCase() : 'PDF'}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-on-background truncate">
                            {heroConvertingFile ? heroConvertingFile.name : 'Document.pdf'}
                          </h4>
                          <p className="text-[10px] text-on-surface-variant/85 font-bold">
                            {heroConvertingFile ? formatSize(heroConvertingFile.size) : '0 Bytes'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 my-5 flex flex-col items-center justify-center p-5 text-center">
                        {heroConversionState === 'converting' ? (
                          <>
                            <div className="font-label-mono text-xs text-primary font-bold animate-pulse mb-2">
                              PROCESSING LOCAL ENGINE...
                            </div>
                            <p className="text-[10px] text-on-surface-variant/75 mb-6 font-medium">
                              Converting files inside this browser tab
                            </p>
                            
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden border border-outline-variant/20 mb-2">
                              <div 
                                className="h-full bg-primary transition-all duration-100 ease-out" 
                                style={{ width: `${heroConversionProgress}%` }}
                              />
                            </div>
                            <span className="font-label-mono text-[10px] font-bold text-primary">{heroConversionProgress}%</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mb-3 scale-105 animate-[fadeIn_0.25s_ease-out]">
                              <span className="material-symbols-outlined text-[24px]">done</span>
                            </div>
                            <h4 className="text-xs font-bold text-on-background mb-1">Success! Local Process Ready</h4>
                            <p className="text-[10px] text-on-surface-variant/80 font-medium">Opening tool selection...</p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/85 font-bold text-left">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        No data sent to server
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Access Strip */}
          <div className="bg-surface-container-low border-t border-b border-outline-variant/40 w-full overflow-x-auto no-scrollbar py-1">
            <div className="flex max-w-container-max mx-auto px-6 divide-x divide-outline-variant/30">
              {[
                { title: 'Merge PDF', icon: 'call_merge', path: '/merge-pdf' },
                { title: 'Split PDF', icon: 'content_cut', path: '/split-pdf' },
                { title: 'Compress PDF', icon: 'compress', path: '/compress-pdf' },
                { title: 'OCR PDF', icon: 'search', path: '/ocr-pdf' },
                { title: 'PDF to Word', icon: 'description', path: '/pdf-to-word' },
                { title: 'PDF to Excel', icon: 'table_chart', path: '/pdf-to-excel' },
                { title: 'Protect PDF', icon: 'lock', path: '/protect-pdf' },
              ].map((t, idx) => (
                <Link 
                  key={idx} 
                  to={t.path} 
                  className="flex items-center gap-2.5 px-6 py-4 text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline select-none">{t.icon}</span>
                  <span>{t.title}</span>
                </Link>
              ))}
              <button 
                onClick={scrollToTools} 
                className="flex items-center gap-1.5 px-6 py-4 text-xs font-extrabold text-primary hover:bg-primary/5 transition-all whitespace-nowrap text-left"
              >
                <span>View All 24 Tools</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Why DocForge */}
          <section className="py-2xl">
            <div className="max-w-container-max mx-auto px-gutter text-left">
              <span className="font-label-mono text-label-mono text-primary uppercase tracking-wider mb-2.5 block">Why DocForge</span>
              <h2 className="font-h2 text-h2 text-on-background mb-3">Built different, by design.</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl leading-relaxed mb-12 font-medium">
                Every other PDF tool uploads your files to their servers. We don't. That's not just a feature — it's the security foundation everything else is built on.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                {[
                  {
                    num: '01',
                    icon: 'lock',
                    iconBg: 'bg-primary/10 text-primary',
                    title: 'Truly private',
                    desc: 'Your documents process inside your browser using JavaScript and WASM engines. They never touch our servers. Legal contracts, medical records, financial data — safe by architecture, not just policy.',
                  },
                  {
                    num: '02',
                    icon: 'bolt',
                    iconBg: 'bg-amber-500/10 text-amber-500',
                    title: 'Instant results',
                    desc: 'No upload queues, no server processing delay, and no download waiting times. Operations run at native speed — most merges and compressions take under 2 seconds on any modern device.',
                  },
                  {
                    num: '03',
                    icon: 'memory',
                    iconBg: 'bg-success/10 text-success',
                    title: 'Desktop-grade engines',
                    desc: 'Powered by highly optimized WebAssembly ports of industry-standard tools (like Tesseract OCR, pdf-lib, and image compressors) running directly in your browser. No quality compromises.',
                  }
                ].map((card, idx) => (
                  <div 
                    key={idx} 
                    className="bg-surface-container border border-outline-variant/60 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/45 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[260px] text-left hover:-translate-y-1"
                  >
                    <div className="absolute top-6 right-6 font-display-hero text-[56px] font-extrabold text-outline-variant/30 leading-none select-none group-hover:scale-105 transition-transform duration-300">
                      {card.num}
                    </div>
                    <div>
                      <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center mb-6`}>
                        <span className="material-symbols-outlined text-[24px] fill">{card.icon}</span>
                      </div>
                      <h3 className="font-h3 text-[18px] font-bold text-on-background mb-3">{card.title}</h3>
                      <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed font-medium">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-2xl bg-surface-container-low border-t border-b border-outline-variant/40">
            <div className="max-w-container-max mx-auto px-gutter text-center">
              <span className="font-label-mono text-label-mono text-primary uppercase tracking-wider mb-2.5 block">Pricing</span>
              <h2 className="font-h2 text-h2 text-on-background mb-3">Start free. Upgrade when you need more.</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto leading-relaxed mb-12 font-medium">
                No credit card required to start. Standard client-side utilities are always 100% free.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl max-w-3xl mx-auto text-left">
                {/* Free Plan */}
                <div className="bg-surface border border-outline-variant/65 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[440px]">
                  <div>
                    <span className="font-label-mono text-[10px] text-outline uppercase tracking-wider font-bold mb-4 block">Standard Utility</span>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="font-display-hero text-[56px] text-on-background leading-none font-bold">$0</span>
                      <span className="font-label-mono text-[10px] text-outline uppercase font-semibold">Always Free</span>
                    </div>
                    <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed mb-6 font-medium">
                      Run standard client-side conversions and edits instantly in your browser.
                    </p>
                    <hr className="border-outline-variant/40 mb-6" />
                    <ul className="flex flex-col gap-3.5 mb-8">
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        All client-side tools (Merge, Split, Compress)
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        No upload wait, no account required
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        Files up to 100 MB
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        Zero tracking or server processing
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={scrollToTools}
                    className="w-full font-button text-[13px] font-bold py-3.5 rounded-xl border border-outline-variant hover:bg-surface-container-high transition-colors text-center text-on-background"
                  >
                    Start Converting
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-surface border-2 border-primary rounded-3xl p-8 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[440px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary text-white font-label-mono text-[9px] font-bold px-3 py-1.5 uppercase tracking-wider rounded-bl-xl select-none">
                    Featured
                  </div>
                  <div>
                    <span className="font-label-mono text-[10px] text-primary uppercase tracking-wider font-bold mb-4 block">DocForge Pro</span>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="font-display-hero text-[56px] text-on-background leading-none font-bold">$9</span>
                      <span className="font-label-mono text-[10px] text-outline uppercase font-semibold">/ Month</span>
                    </div>
                    <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed mb-6 font-medium">
                      For professionals who need batch operations and document restructuring.
                    </p>
                    <hr className="border-outline-variant/40 mb-6" />
                    <ul className="flex flex-col gap-3.5 mb-8">
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        Parallel batch task queue (up to 50 files)
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        WASM GPU Cloud acceleration
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        Smart Layout Reformatter presets
                      </li>
                      <li className="flex items-center gap-3 font-body-sm text-[13px] text-on-background font-medium">
                        <span className="material-symbols-outlined text-primary text-[18px] fill">check_circle</span>
                        Support for files up to 1 GB
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="w-full font-button text-[13px] font-bold py-3.5 rounded-xl btn-theme-primary text-center shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {isPro ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] fill">workspace_premium</span>
                        Active Pro Plan
                      </>
                    ) : (
                      'Get Pro Upgrade'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── All Tools Directory Section ── */}
          <section ref={toolsRef} id="all-tools" className="py-2xl relative">
            <div className="max-w-container-max mx-auto px-gutter text-left">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                  <h2 className="font-h2 text-h2 text-on-background mb-2">
                    All <span className="text-primary">Tools</span>
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Access our complete library of secure local tools.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-[320px]">
                  <input
                    ref={guestToolsSearchRef}
                    type="text"
                    placeholder="Search tools (e.g. compress, convert)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3 pl-10 pr-10 bg-surface border border-outline-variant/60 rounded-xl text-on-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 shadow-sm"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm select-none">
                    search
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-background flex items-center justify-center"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2.5 overflow-x-auto pb-4 mb-8 border-b border-outline-variant/40 no-scrollbar">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-200 border ${
                    activeTab === 'all'
                      ? 'bg-primary text-white border-transparent shadow-sm'
                      : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container-high hover:text-on-background'
                  }`}
                >
                  All Tools
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-200 border ${
                      activeTab === cat.id
                        ? 'bg-primary text-white border-transparent shadow-sm'
                        : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container-high hover:text-on-background'
                    }`}
                  >
                    <span>{cat.title}</span>
                  </button>
                ))}
              </div>

              {/* Filtered Tool Grid */}
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter animate-[fadeIn_0.22s_ease-out]">
                  {filteredTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-on-surface-variant border border-dashed border-outline-variant rounded-2xl bg-surface shadow-sm">
                  <span className="material-symbols-outlined text-[48px] text-outline mb-3 select-none">
                    search_off
                  </span>
                  <p className="font-body-lg text-body-lg mb-4 text-on-background">No tools matched your search for "{searchQuery}"</p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                    className="btn-theme-primary font-label-mono text-label-mono px-6 py-3 rounded-lg shadow-sm"
                  >
                    Clear Search
                  </button>
                </div>
              )}

            </div>
          </section>
        </>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6 select-none animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[24px]">warning</span>
              <h3 className="text-sm font-bold text-on-background">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error-container/20 hover:text-error text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {upgradeModalOpen && upgradeModalTarget && (
        <div className="fixed inset-0 bg-on-background/25 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface border border-outline-variant rounded-2xl p-8 max-w-md w-full shadow-2xl relative text-left flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button 
              onClick={() => setUpgradeModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-background flex items-center justify-center p-1 select-none"
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[24px]">
                {upgradeModalTarget.minTier === 'pro' ? 'workspace_premium' : 'account_circle'}
              </span>
              <span className="font-h3 text-base font-bold text-on-background">
                {upgradeModalTarget.minTier === 'pro' ? 'Unlock DocForge Pro' : 'Free Account Required'}
              </span>
            </div>

            <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
              {upgradeModalTarget.minTier === 'pro' 
                ? `The "${upgradeModalTarget.title}" tool requires a DocForge Pro subscription. Upgrade to access all 38 local/AI utilities, unlimited file queue limits, and larger sizes.`
                : `The "${upgradeModalTarget.title}" tool is free to use but requires a registered account to manage local files and preferences.`
              }
            </p>

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {upgradeModalTarget.minTier === 'pro' ? (
                <button
                  onClick={() => {
                    setUpgradeModalOpen(false);
                    navigate('/pricing');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors shadow-sm"
                >
                  View Pro Plans
                </button>
              ) : (
                <button
                  onClick={() => {
                    setUpgradeModalOpen(false);
                    navigate('/signup');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Create Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
