import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import ToolCard from '../components/ToolCard';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import ToolIcon from '../components/ToolIcon';
import SEOHead from '../components/SEOHead';
import AdPlaceholder from '../components/AdPlaceholder';
import { CATEGORIES, TOOLS } from '../utils/constants';
import LandingPage from '../components/LandingPage';
import { saveFile, getFiles, deleteFile, clearFiles } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { prefetchIdleRoutes } from '../utils/prefetchRoute';

const StitchCanvas = lazy(() => import('../components/StitchCanvas'));

// Lightweight client-side download helper replacing file-saver
const saveAs = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

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
  const location = useLocation();
  const { isAuthenticated, userEmail, userTier, proLicenseKey, isPro, logout } = useAuth();
  
  const first = localStorage.getItem('profile_firstName') || '';
  const last = localStorage.getItem('profile_lastName') || '';
  const full = `${first} ${last}`.trim();
  const userName = full || (userEmail ? userEmail.split('@')[0] : 'Guest');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

    // PRO Workspace state
  const [workspaceQueue, setWorkspaceQueue] = useState([]);
  const [clearCanvasSignal, setClearCanvasSignal] = useState(0);
  const [hasCanvasOperations, setHasCanvasOperations] = useState(false);
  const [gpuBoostEnabled, setGpuBoostEnabled] = useState(() => localStorage.getItem('gpuBoostEnabled') !== 'false');
  const [autoEnhanceEnabled, setAutoEnhanceEnabled] = useState(() => localStorage.getItem('autoEnhanceEnabled') !== 'false');
  const [activeSidebarTab, setActiveSidebarTab] = useState(() => localStorage.getItem('docscalar_sidebar_tab') || localStorage.getItem('docforge_sidebar_tab') || 'workspace');
  const setSidebarTab = (tab) => { setActiveSidebarTab(tab); localStorage.setItem('docscalar_sidebar_tab', tab); };
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [templateEditContent, setTemplateEditContent] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toolsCategoryFilter, setToolsCategoryFilter] = useState('all');
  // Collapsible sidebar (Gemini-style, open by default, persists to localStorage)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Synchronize sidebar tab on path change
  useEffect(() => {
    if (location.pathname === '/canvas') {
      setActiveSidebarTab('workspace');
    }
  }, [location.pathname]);

  // Predictive Idle Route Prefetching: warm up top conversion tools after 2s idle delay
  useEffect(() => {
    const idleTimer = setTimeout(() => {
      prefetchIdleRoutes();
    }, 2000);
    return () => clearTimeout(idleTimer);
  }, []);

  // Tool Picker overlay — shown when user clicks a pending queue item
  const [toolPickerItem, setToolPickerItem] = useState(null);



  // Batch flow states & helpers
  const [selectedQueueItemIds, setSelectedQueueItemIds] = useState([]);

  const getFileTypeGroup = (fileName) => {
    if (!fileName) return 'other';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['docx', 'doc'].includes(ext)) return 'docx';
    if (['txt', 'md'].includes(ext)) return 'txt';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['pptx', 'ppt'].includes(ext)) return 'pptx';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'xlsx';
    if (['html', 'htm'].includes(ext)) return 'html';
    return 'other';
  };

  const getSelectedTypeGroup = () => {
    if (selectedQueueItemIds.length === 0) return null;
    const firstSelected = workspaceQueue.find(i => i.id === selectedQueueItemIds[0]);
    return firstSelected ? getFileTypeGroup(firstSelected.name) : null;
  };

  const toggleQueueItemSelection = (id) => {
    setSelectedQueueItemIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

    const getBatchActionsForGroup = (group) => {
    if (group === 'pdf') {
      return TOOLS.filter(t => t.accept && t.accept.split(',').map(a => a.trim().toLowerCase()).includes('.pdf')).map(t => t.id);
    }
    if (group === 'image') {
      return TOOLS.filter(t => t.accept && (t.accept === 'image/*' || t.accept.split(',').map(a => a.trim().toLowerCase()).some(ext => ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)))).map(t => t.id);
    }
    if (group === 'docx') {
      return TOOLS.filter(t => t.accept && t.accept.split(',').map(a => a.trim().toLowerCase()).includes('.docx')).map(t => t.id);
    }
    if (group === 'txt') {
      return TOOLS.filter(t => t.accept && t.accept.split(',').map(a => a.trim().toLowerCase()).includes('.txt')).map(t => t.id);
    }
    return [];
  };

  const handleBatchQueueAction = (actionId) => {
    const selectedItems = workspaceQueue.filter(i => selectedQueueItemIds.includes(i.id));
    const files = selectedItems.map(i => i.file).filter(Boolean);
    if (files.length === 0) return;

    let toolPath = `/${actionId}`;

    // Check authorization based on minTier config
    const tool = TOOLS.find(t => t.path === toolPath || t.id === actionId);
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

    // Navigate with multiple preloaded files
    navigate(toolPath, { state: { initialFiles: files } });
    
    // Clear selection
    setSelectedQueueItemIds([]);
  };

  // Sync selection with current queue items
  useEffect(() => {
    setSelectedQueueItemIds(prev => prev.filter(id => workspaceQueue.some(item => item.id === id)));
  }, [workspaceQueue]);

  // Missing states recovered from refactor
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [batchQueue, setBatchQueue] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);


  // Handle category query parameters (e.g. ?category=pdf) to filter tools or switch tabs
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      if (category === 'pdf' || category === 'image' || category === 'utility') {
        if (isAuthenticated) {
          setSidebarTab('converter');
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

  // Redirect logged-in users from root / to /workspace
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/') {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

    const getActionTitle = (actionId) => {
    const tool = TOOLS.find(t => t.id === actionId);
    if (tool) return tool.title;

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
      'ai-summarizer': 'AI Summarizer',
    };
    return actionTitles[actionId] || actionId;
  };

  const handleQuickAccessAction = (action) => {
    if (action === 'filter-pdf') {
      setSidebarTab('converter');
      setToolsCategoryFilter('pdf');
    } else if (action === 'filter-image') {
      setSidebarTab('converter');
      setToolsCategoryFilter('image');
    } else if (action === 'filter-convert') {
      setSidebarTab('converter');
      setToolsCategoryFilter('convert');
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

  const SIDEBAR_TABS = ['workspace', 'queue', 'converter', 'templates', 'settings'];

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
        setSidebarTab('converter');
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
      setToolPickerItem(null);
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
        showToast(`Unsupported file type: ${file.name}. Only PDF, DOCX, TXT, and images are supported.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      // Single file -> show overlay first!
      const file = validFiles[0];
      const actions = getActionsForFile(file.name);
      setToolPickerItem({
        file,
        name: file.name,
        size: file.size,
        detectedActions: actions ? actions.map(a => a.id) : [],
        _isUploadPending: true, // mark it as a pending upload
      });
      return;
    }

    if (validFiles.length > 1) {
      // Check if all files have the same type group
      const firstGroup = getFileTypeGroup(validFiles[0].name);
      const allSameGroup = validFiles.every(file => getFileTypeGroup(file.name) === firstGroup);

      if (allSameGroup && firstGroup !== 'other') {
        // Multi-file same-category -> show batch overlay!
        setToolPickerItem({
          files: validFiles,
          name: `${validFiles.length} files selected`,
          size: validFiles.reduce((acc, f) => acc + f.size, 0),
          detectedActions: getBatchActionsForGroup(firstGroup),
          _isUploadPending: true,
          isBatch: true,
          batchGroup: firstGroup
        });
        return;
      }
    }

    // Multiple files → go directly to queue (tool selection via canvas overlay)
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
      showToast('Workspace is limited to 50 active files. Please clear completed items.');
      allowedFiles = validFiles.slice(0, remainingSlots);
    }

    if (allowedFiles.length === 0) return;

    const items = allowedFiles.map((file, idx) => {
      const actions = getActionsForFile(file.name);
      const currentCount = workspaceQueue.length;
      const x = 80 + Math.floor((currentCount + idx) / 4) * 260;
      const y = 80 + ((currentCount + idx) % 4) * 160;

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
        x,
        y,
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
        const { docxToPdf } = await import('../engines/document/docxToPdf');
        outputBlob = await docxToPdf(file, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'text-to-pdf' || action === 'Text to PDF' || action === 'Text to PDF (GPU Cloud)') {
        const { textToPdf } = await import('../engines/document/textToPdf');
        const text = await file.text();
        outputBlob = await textToPdf(text, { title: file.name }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'compress-pdf' || action === 'Compress PDF' || action === 'Compress PDF (GPU Cloud)') {
        const { compressPdf } = await import('../engines/pdf/compressPdf');
        outputBlob = await compressPdf(file, { quality: 0.6 }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
        outputType = 'application/pdf';
      } else if (action === 'rotate-pdf' || action === 'Rotate PDF' || action === 'Rotate PDF (GPU Cloud)') {
        const { rotatePdf } = await import('../engines/pdf/rotatePdf');
        outputBlob = await rotatePdf(file, 90, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_rotated.pdf';
        outputType = 'application/pdf';
      } else if (action === 'pdf-to-image' || action === 'PDF to Images' || action === 'PDF to Images (GPU Cloud)') {
        // Stream pages into ZIP — worker enforces 200-page cap for batch queue
        const { default: JSZip } = await import('jszip');
        const { pdfToImagesStream } = await import('../engines/pdf/pdfToImage');
        const zip = new JSZip();
        await pdfToImagesStream(
          file,
          { format: 'jpeg', quality: 0.85, scale: 1.5, maxPages: 200 },
          async ({ name, blob }) => { zip.file(name, blob); },
          (pct) => {
            setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
          }
        );
        outputBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
        outputType = 'application/zip';
      } else if (action === 'merge-pdf' || action === 'Merge PDFs' || action === 'Merge PDFs (GPU Cloud)') {
        const { mergePdfs } = await import('../engines/pdf/mergePdf');
        outputBlob = await mergePdfs([file], (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_merged.pdf';
        outputType = 'application/pdf';
      } else if (action === 'split-pdf' || action === 'Split PDF' || action === 'Split PDF (GPU Cloud)') {
        const { splitPdf } = await import('../engines/pdf/splitPdf');
        const { default: JSZip } = await import('jszip');
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
          outputBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
          outputName = file.name.replace(/\.[^.]+$/, '') + '-split.zip';
          outputType = 'application/zip';
        }
      } else if (action === 'image-compressor' || action === 'Image Compressor') {
        const { compressImage } = await import('../engines/image/compressImage');
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await compressImage(file, 0.7);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-converter' || action === 'Image Converter') {
        const { convertImageFormat } = await import('../engines/image/convertFormat');
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await convertImageFormat(file, 'png', 0.92);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-resizer' || action === 'Image Resizer') {
        const { resizeImage } = await import('../engines/image/resizeImage');
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await resizeImage(file, { mode: 'percentage', percentage: 50 });
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'image-to-pdf' || action === 'Images to PDF') {
        const { imagesToPdf } = await import('../engines/pdf/imageToPdf');
        outputBlob = await imagesToPdf([file], (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const textMsg = `Processed text document content: ${file.name}`;
        outputBlob = new Blob([textMsg], { type: 'text/plain' });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_processed.txt';
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

      // Tool Picker Overlay: user selects a tool for a pending queue item
  const handleToolPickerSelect = (toolAction) => {
    if (!toolPickerItem) return;
    const item = toolPickerItem;
    setToolPickerItem(null);

    let toolPath = `/${toolAction.id}`;

    // Check authorization based on minTier config
    const tool = TOOLS.find(t => t.path === toolPath || t.id === toolAction.id);
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

        if (item.isBatch) {
      navigate(toolPath, { state: { initialFiles: item.files } });
    } else {
      navigate(toolPath, { state: { initialFile: item.file } });
    }
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
    const getActionsForFile = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    
    const matchedTools = TOOLS.filter(tool => {
      if (!tool.accept) return false;
      
      // If it's an image, check if tool accepts image/*
      const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
      if (isImage && tool.accept === 'image/*') {
        return true;
      }
      
      // Otherwise split and check
      const accepts = tool.accept.split(',').map(a => a.trim());
      return accepts.includes(ext);
    });

    if (matchedTools.length === 0) return [];

    return matchedTools.map(t => ({ id: t.id, title: t.title }));
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
        showToast(`File too large: ${file.name} (${formatSize(file.size)}). Max allowed is ${maxFileSizeStr} in ${tierName}.`);
        return;
      }

      setSelectedFile(file);
      setSuggestedTools(actions.map(a => {
        let path = `/${a.id}`;
        // ai-summarizer route uses the standard pattern
        if (a.id === 'ai-summarizer') {
          path = '/ai-summarizer';
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
        showToast(`Unsupported file type: ${file.name}. Only PDF, DOCX, TXT, and images are supported.`);
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
        showToast(`File too large: ${file.name} (${formatSize(file.size)}). Max allowed is ${maxFileSizeStr} in ${tierName}.`);
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
        showToast('Pro accounts are limited to 50 files per batch queue.');
      } else if (isAuthenticated) {
        showToast('Free accounts are limited to 5 files per batch queue. Upgrade to PRO for up to 50 files!');
      } else {
        showToast('Guest mode is limited to 1 file in the batch queue. Create a free account to queue up to 5 files!');
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
          const { docxToPdf } = await import('../engines/document/docxToPdf');
          outputBlob = await docxToPdf(file, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Text to PDF') {
          const { textToPdf } = await import('../engines/document/textToPdf');
          const text = await file.text();
          outputBlob = await textToPdf(text, { title: file.name }, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Compress PDF') {
          const { compressPdf } = await import('../engines/pdf/compressPdf');
          outputBlob = await compressPdf(file, { quality: 0.6 }, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Rotate PDF') {
          const { rotatePdf } = await import('../engines/pdf/rotatePdf');
          outputBlob = await rotatePdf(file, 90, (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_rotated.pdf';
          outputType = 'application/pdf';
        } else if (action === 'PDF to Images') {
          // Stream pages into ZIP — worker enforces 200-page cap for batch queue
          const { default: JSZip } = await import('jszip');
          const { pdfToImagesStream } = await import('../engines/pdf/pdfToImage');
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
          outputBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
          outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
          outputType = 'application/zip';
        } else if (action === 'Merge PDFs') {
          const { mergePdfs } = await import('../engines/pdf/mergePdf');
          outputBlob = await mergePdfs([file], (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_merged.pdf';
          outputType = 'application/pdf';
        } else if (action === 'Split PDF') {
          const { splitPdf } = await import('../engines/pdf/splitPdf');
          const { default: JSZip } = await import('jszip');
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
            outputBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            outputName = file.name.replace(/\.[^.]+$/, '') + '-split.zip';
            outputType = 'application/zip';
          }
        } else if (action === 'Image Compressor') {
          const { compressImage } = await import('../engines/image/compressImage');
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await compressImage(file, 0.7);
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Image Converter') {
          const { convertImageFormat } = await import('../engines/image/convertFormat');
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await convertImageFormat(file, 'png', 0.92);
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Image Resizer') {
          const { resizeImage } = await import('../engines/image/resizeImage');
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const result = await resizeImage(file, { mode: 'percentage', percentage: 50 });
          outputBlob = result.blob;
          outputName = result.name;
          outputType = result.blob.type;
          setBatchProgress(100);
        } else if (action === 'Images to PDF') {
          const { imagesToPdf } = await import('../engines/pdf/imageToPdf');
          outputBlob = await imagesToPdf([file], (pct) => {
            setBatchProgress(pct);
            setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item));
          });
          outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
          outputType = 'application/pdf';
        } else {
          setBatchProgress(50);
          setBatchQueue(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 50 } : item));
          const textMsg = `Processed text document content: ${file.name}`;
          outputBlob = new Blob([textMsg], { type: 'text/plain' });
          outputName = file.name.replace(/\.[^.]+$/, '') + '_processed.txt';
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

  // Bolt: Wrapped filteredTools in useMemo to prevent recalculating the filter on every re-render.
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

  const isWorkspaceView = isAuthenticated && location.pathname === '/canvas';
  const workspaceHeight = isWorkspaceView ? '100vh' : 'auto';

  return (
    <div 
      className={`bg-background text-on-background relative font-body-md antialiased text-left ${isWorkspaceView ? 'overflow-hidden flex w-screen' : 'min-h-screen'}`}
      style={isWorkspaceView ? { height: workspaceHeight } : {}}
    >
      <SEOHead
        title="DocScalar (Dynamic Workspace)"
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

                  {/* Floating Batch Actions Bar */}
                  {selectedQueueItemIds.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface/90 backdrop-blur-xl border border-primary/20 rounded-2xl py-3 px-5 shadow-2xl flex items-center gap-4 animate-[floatingBarSlideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold text-on-background select-none">
                          {selectedQueueItemIds.length} files selected ({selectedTypeGroup ? selectedTypeGroup.toUpperCase() : 'mixed'})
                        </span>
                      </div>

                      <div className="w-[1px] h-6 bg-outline-variant/60" />

                      <div className="flex items-center gap-2">
                        {selectedTypeGroup === 'pdf' && (
                          <>
                            <button
                              onClick={() => handleBatchQueueAction('merge-pdf')}
                              className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-dark transition-all flex items-center gap-1.5 cursor-pointer border-none"
                            >
                              <span className="material-symbols-outlined text-[15px]">merge</span>
                              Merge
                            </button>
                                                        <button
                              onClick={() => handleBatchQueueAction('compare-pdf')}
                              disabled={selectedQueueItemIds.length < 2}
                              className="px-3.5 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface hover:border-primary font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                            >
                              <span className="material-symbols-outlined text-[15px]">difference</span>
                              Compare ({selectedQueueItemIds.length})
                            </button>
                          </>
                        )}

                        {selectedTypeGroup === 'image' && (
                          <button
                            onClick={() => handleBatchQueueAction('image-to-pdf')}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-dark transition-all flex items-center gap-1.5 cursor-pointer border-none"
                          >
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                            Combine to PDF
                          </button>
                        )}

                        {/* General Actions */}
                        <button
                          onClick={() => {
                            const selectedItems = workspaceQueue.filter(i => selectedQueueItemIds.includes(i.id));
                            const files = selectedItems.map(i => i.file).filter(Boolean);
                            setToolPickerItem({
                              files,
                              name: `${files.length} selected files`,
                              size: files.reduce((acc, f) => acc + f.size, 0),
                              detectedActions: getBatchActionsForGroup(selectedTypeGroup),
                              _isUploadPending: false,
                              isBatch: true,
                              batchGroup: selectedTypeGroup || 'mixed'
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface hover:border-primary font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">apps</span>
                          Choose Tool
                        </button>

                        <button
                          onClick={() => {
                            setWorkspaceQueue(prev => prev.filter(i => !selectedQueueItemIds.includes(i.id)));
                            setSelectedQueueItemIds([]);
                            showToast(`Cleared ${selectedQueueItemIds.length} items`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-outline-variant/60 hover:border-error text-outline hover:text-error font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:bg-error-container/5 bg-transparent"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                </div>
        </div>
      )}

      {/* Tool Picker Overlay — Pro Workspace Canvas */}
      {isAuthenticated && toolPickerItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setToolPickerItem(null); }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-background/75 backdrop-blur-2xl" />

          {/* Picker card */}
          <div className="relative z-10 bg-surface border border-outline-variant/80 rounded-3xl p-8 max-w-5xl w-full mx-6 shadow-2xl flex flex-col max-h-[85vh] animate-[scaleIn_0.22s_cubic-bezier(0.34,1.56,0.64,1)]">
                        {/* File header */}
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-outline-variant flex-shrink-0">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${getFileBadge(toolPickerItem.name).bg} ${getFileBadge(toolPickerItem.name).text}`}>
                {toolPickerItem.isBatch ? `${toolPickerItem.files.length}F` : getFileBadge(toolPickerItem.name).label}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[17px] text-on-background truncate">
                  {toolPickerItem.isBatch ? `${toolPickerItem.files.length} Files Selected (${toolPickerItem.batchGroup ? toolPickerItem.batchGroup.toUpperCase() : 'PDF'}s)` : toolPickerItem.name}
                </p>
                <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">
                  {formatSize(toolPickerItem.size)} · {toolPickerItem.isBatch ? 'Choose a batch tool to process these files' : 'Choose a tool to open this file'}
                </p>
                {toolPickerItem.isBatch && (
                  <details className="mt-2 text-[11px] text-outline cursor-pointer select-none">
                    <summary className="font-semibold hover:text-primary transition-colors">Show selected files ({toolPickerItem.files.length})</summary>
                    <ul className="mt-1 max-h-24 overflow-y-auto list-disc pl-4 text-[10.5px] text-on-surface-variant flex flex-col gap-0.5">
                      {toolPickerItem.files.map((file, i) => (
                        <li key={i} className="truncate">{file.name}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <button
                onClick={() => setToolPickerItem(null)}
                className="w-9 h-9 rounded-xl border border-outline-variant hover:border-error/70 text-outline hover:text-error flex items-center justify-center transition-all flex-shrink-0"
                title="Close (Esc)"
              >
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>

            {/* Scrollable grid area */}
            <div className="flex-1 overflow-y-auto pr-1 py-1 scrollbar-none">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">
                {toolPickerItem.isBatch ? 'Select a batch tool to run' : 'What would you like to do with this file?'}
              </p>

              {/* Tool cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(toolPickerItem.detectedActions || []).map((actionId, idx) => (
                  <button
                    key={actionId}
                    onClick={() => handleToolPickerSelect({ id: actionId, title: getActionTitle(actionId) })}
                    className="tool-chip-in group flex flex-col items-center gap-3 p-5 rounded-2xl border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-primary/8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer text-center"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="w-12 h-12 flex items-center justify-center">
                      <ToolIcon id={actionId} size={40} />
                    </div>
                    <span className="text-[13px] font-semibold text-on-background group-hover:text-primary transition-colors leading-tight">{getActionTitle(actionId)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional: Add to Queue button for pending uploads */}
            {toolPickerItem._isUploadPending && (
              <div className="pt-5 mt-4 border-t border-outline-variant/60 flex justify-end flex-shrink-0">
                <button
                  onClick={() => {
                    if (toolPickerItem.isBatch) {
                      addFilesToQueueDirect(toolPickerItem.files);
                    } else {
                      addFilesToQueueDirect([toolPickerItem.file]);
                    }
                    setToolPickerItem(null);
                    showToast(toolPickerItem.isBatch ? `Added ${toolPickerItem.files.length} files to batch queue` : "File added to your batch queue");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant hover:border-primary text-on-surface hover:text-primary font-semibold text-[13px] flex items-center gap-2 cursor-pointer bg-surface-container-low hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">queue</span>
                  {toolPickerItem.isBatch ? 'Add all to Batch Queue' : 'Add to Batch Queue'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTHENTICATED WORKSPACE VIEW */}
      {isWorkspaceView ? (
        /* USER WORKSPACE (Full Screen Layout, No Sidebar) */
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">



                        {/* Tab Views */}
            <div className={`flex-1 ${activeSidebarTab === 'workspace' || activeSidebarTab === 'queue' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} bg-background relative z-10`}>

              {/* WORKSPACE + QUEUE: canvas */}
              {(activeSidebarTab === 'workspace' || activeSidebarTab === 'queue') && (
                <div className="flex p-3 bg-[#e8e4dc] dark:bg-[#0c0c0c] gap-0 flex-1 min-h-0 overflow-hidden relative transition-colors duration-300">
                  {/* LEFT COLUMN */}
                  <div className="flex-1 flex flex-col gap-0 min-w-0 h-full overflow-hidden relative">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Loading workspace...</div>}>
                      <StitchCanvas
                        workspaceQueue={workspaceQueue}
                        setWorkspaceQueue={setWorkspaceQueue}
                        isPro={isPro}
                        userEmail={userEmail}
                        isAuthenticated={isAuthenticated}
                        showToast={showToast}
                        addFilesToQueueDirect={addFilesToQueueDirect}
                        clearCanvasSignal={clearCanvasSignal}
                        onOperationsChange={setHasCanvasOperations}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        theme={theme}
                        handleThemeToggle={handleThemeToggle}
                        profileDropdownOpen={profileDropdownOpen}
                        setProfileDropdownOpen={setProfileDropdownOpen}
                        handleLogout={handleLogout}
                        hasCanvasOperations={hasCanvasOperations}
                        setClearCanvasSignal={setClearCanvasSignal}
                      />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* tab === converter */}
              {activeSidebarTab === 'converter' && (
                <div className="flex flex-col gap-6 text-left p-5 md:p-6 lg:p-8 min-h-full">
                  
                  {/* Centered Welcome Header */}
                  <div className="flex flex-col items-center text-center gap-4 mt-4 mb-2">
                    <div className="max-w-xl">
                      <h2 className="font-h2 text-3xl font-extrabold text-on-background tracking-tight">
                        Welcome, <span className="text-primary">{userName}</span>
                      </h2>
                      <p className="font-body-md text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                        Launch any local conversion tool directly from your workspace studio to start working
                      </p>
                    </div>

                    {/* Category Filter Tabs (Centered Capsule Style) */}
                    <div className="flex items-center justify-center gap-1 p-1 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-inner max-w-lg w-auto mt-2">
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
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border border-transparent cursor-pointer ${
                              isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                                : 'bg-transparent text-on-surface-variant hover:text-on-background hover:bg-surface-container-high/40'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px] select-none">
                              {tab.icon}
                            </span>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
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



              {/* tab === templates */}
              {activeSidebarTab === 'templates' && (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-6 text-center px-8">
                  <div className="w-20 h-20 rounded-3xl bg-surface-container-low border border-outline-variant flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">construction</span>
                  </div>
                  <div>
                    <h2 className="font-h2 text-2xl font-bold text-on-background mb-2">Document Templates</h2>
                    <p className="font-body-sm text-sm text-on-surface-variant max-w-sm leading-relaxed">
                      We are building a powerful template studio with editable, downloadable professional documents.
                      <br /><br />
                      <strong className="text-primary">Coming Soon</strong> — check back in a future update.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary text-xs font-bold px-5 py-2.5 rounded-full">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    In Development
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
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1">Hardware Graphics Acceleration</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant font-medium">Use device hardware acceleration for faster rendering</p>
                      </div>
                      <button 
                        onClick={() => {
                          const val = !gpuBoostEnabled;
                          setGpuBoostEnabled(val);
                          localStorage.setItem('gpuBoostEnabled', val ? 'true' : 'false');
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 flex-shrink-0 ${
                          gpuBoostEnabled ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all duration-200 ${
                          gpuBoostEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Auto-Enhance Output */}
                    <div className="flex justify-between items-center gap-4 pb-5 border-b border-outline-variant/60">
                      <div>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1">Auto-Enhance Outputs</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant font-medium">Boost page contrast, deskew layout, and optimize clarity for image scans and PDFs</p>
                      </div>
                      <button 
                        onClick={() => {
                          const val = !autoEnhanceEnabled;
                          setAutoEnhanceEnabled(val);
                          localStorage.setItem('autoEnhanceEnabled', val ? 'true' : 'false');
                          showToast(`Auto-Enhance Output ${val ? 'enabled' : 'disabled'}`);
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 flex-shrink-0 ${
                          autoEnhanceEnabled ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all duration-200 ${
                          autoEnhanceEnabled ? 'translate-x-5' : 'translate-x-0'
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
                      <span>DocScalar Local Version</span>
                      <span className="font-label-mono text-[10px] bg-surface-container border border-outline-variant px-2.5 py-0.5 rounded-full">v3.4.2-PRO</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
      ) : (
        /* STANDALONE DASHBOARD VIEW OR GUEST LANDING VIEW */
        <div className="flex-1 w-full flex flex-col relative z-10 select-text">
          {isAuthenticated && location.pathname === '/workspace' ? (
            /* STANDALONE DASHBOARD VIEW (NO SIDEBAR!) */
            <div className="max-w-[1400px] mx-auto w-full px-5 md:px-6 lg:px-8 py-10 min-h-full">
              
              {/* Centered Welcome Header */}
              <div className="flex flex-col items-center text-center gap-4 mt-4 mb-2">
                <div className="max-w-xl">
                  <h2 className="font-h2 text-3xl font-extrabold text-on-background tracking-tight">
                    Welcome, <span className="text-primary">{userName}</span>
                  </h2>
                  <p className="font-body-md text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                    Launch any local conversion tool directly from your workspace studio to start working
                  </p>
                </div>

                {/* Category Filter Tabs (Centered Capsule Style) */}
                <div className="flex items-center justify-center gap-1 p-1 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-inner max-w-lg w-auto mt-2">
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
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border border-transparent cursor-pointer ${
                          isActive
                            ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                            : 'bg-transparent text-on-surface-variant hover:text-on-background hover:bg-surface-container-high/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] select-none">
                          {tab.icon}
                        </span>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
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
          ) : (
            /* GUEST LANDING VIEW (Unauthenticated Visitors) */
            <>
              <LandingPage 
                isAuthenticated={isAuthenticated}
                isPro={isPro}
                onUploadClick={() => fileInputRef.current?.click()}
                onDropFile={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOverHero(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    processFileGuest(files[0]);
                  }
                }}
                isDragging={isDraggingOverHero}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={() => setIsDraggingOverHero(true)}
                onDragLeave={() => setIsDraggingOverHero(false)}
              />
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.txt,image/*"
              />
            </>
          )}
        </div>
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
                {upgradeModalTarget.minTier === 'pro' ? 'DocScalar Pro Required' : 'Free Account Required'}
              </span>
            </div>

            <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
              {upgradeModalTarget.minTier === 'pro' 
                ? `The "${upgradeModalTarget.title}" tool requires a DocScalar Pro subscription. Upgrade to access all 38 local/AI utilities, unlimited file queue limits, and larger sizes.`
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

