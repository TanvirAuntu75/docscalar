import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ToolCard from '../components/ToolCard';
import ToolIcon from '../components/ToolIcon';
import SEOHead from '../components/SEOHead';
import AdPlaceholder from '../components/AdPlaceholder';
import { CATEGORIES, TOOLS } from '../utils/constants';
import { saveFile, getFiles, deleteFile, clearFiles } from '../utils/db';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';

// Import actual conversion engines
import { docxToPdf } from '../engines/document/docxToPdf';
import { textToPdf } from '../engines/document/textToPdf';
import { compressPdf } from '../engines/pdf/compressPdf';
import { rotatePdf } from '../engines/pdf/rotatePdf';
import { pdfToImages } from '../engines/pdf/pdfToImage';
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

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });
  const [storageUsage, setStorageUsage] = useState({ used: '1.2 GB', quota: '50 GB', percent: 2 });
  const [confirmDialog, setConfirmDialog] = useState(null);

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
      if (action === 'DOCX to PDF' || action === 'DOCX to PDF (GPU Cloud)') {
        outputBlob = await docxToPdf(file, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'Text to PDF' || action === 'Text to PDF (GPU Cloud)') {
        const text = await file.text();
        outputBlob = await textToPdf(text, { title: file.name }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
        outputType = 'application/pdf';
      } else if (action === 'Compress PDF' || action === 'Compress PDF (GPU Cloud)') {
        outputBlob = await compressPdf(file, { quality: 0.6 }, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_compressed.pdf';
        outputType = 'application/pdf';
      } else if (action === 'Rotate PDF' || action === 'Rotate PDF (GPU Cloud)') {
        outputBlob = await rotatePdf(file, 90, (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_rotated.pdf';
        outputType = 'application/pdf';
      } else if (action === 'PDF to Images' || action === 'PDF to Images (GPU Cloud)') {
        const { blobs, names } = await pdfToImages(file, { format: 'png', quality: 0.92, scale: 2 }, (pct) => {
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
          outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
          outputType = 'application/zip';
        }
      } else if (action === 'Merge PDFs' || action === 'Merge PDFs (GPU Cloud)') {
        outputBlob = await mergePdfs([file], (pct) => {
          setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: pct } : i));
        });
        outputName = file.name.replace(/\.[^.]+$/, '') + '_merged.pdf';
        outputType = 'application/pdf';
      } else if (action === 'Split PDF' || action === 'Split PDF (GPU Cloud)') {
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
      } else if (action === 'Image Compressor') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await compressImage(file, 0.7);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'Image Converter') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await convertImageFormat(file, 'png', 0.92);
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'Image Resizer') {
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 50 } : i));
        const result = await resizeImage(file, { mode: 'percentage', percentage: 50 });
        outputBlob = result.blob;
        outputName = result.name;
        outputType = result.blob.type;
        setWorkspaceQueue(prev => prev.map(i => i.id === itemId ? { ...i, progress: 100 } : i));
      } else if (action === 'Images to PDF') {
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
  const getActionsForFile = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    const actionsMap = {
      '.pdf': [
        { id: 'compress-pdf', title: 'Compress PDF', icon: '📦' },
        { id: 'merge-pdf', title: 'Merge PDF', icon: '📎' },
        { id: 'split-pdf', title: 'Split PDF', icon: '✂️' },
        { id: 'pdf-to-image', title: 'PDF to Images', icon: '🖼️' },
        { id: 'rotate-pdf', title: 'Rotate PDF', icon: '🔄' },
        { id: 'protect-pdf', title: 'Protect PDF', icon: '🔒' },
        { id: 'unlock-pdf', title: 'Unlock PDF', icon: '🔓' },
      ],
      '.docx': [
        { id: 'docx-to-pdf', title: 'DOCX to PDF', icon: '📄' },
        { id: 'ai-summarizer', title: 'Smart Reformatter', icon: '🪄' },
      ],
      '.txt': [
        { id: 'text-to-pdf', title: 'Text to PDF', icon: '📝' },
        { id: 'ai-summarizer', title: 'Smart Reformatter', icon: '🪄' },
      ],
      '.png': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
      '.jpg': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
      '.jpeg': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
      '.webp': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
      '.bmp': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
      '.gif': [
        { id: 'image-compressor', title: 'Image Compressor', icon: '📦' },
        { id: 'image-converter', title: 'Image Converter', icon: '🔄' },
        { id: 'image-resizer', title: 'Image Resizer', icon: '📐' },
        { id: 'image-to-pdf', title: 'Images to PDF', icon: '📄' },
      ],
    };

    return actionsMap[ext] || null;
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

    // 2. Enforce limits on the remaining valid files
    const limit = userTier === 'pro' ? 50 : 5;
    const currentCount = batchQueue.length;
    const remainingSlots = Math.max(0, limit - currentCount);

    let allowedFiles = validFiles;
    if (validFiles.length > remainingSlots) {
      if (userTier === 'pro') {
        showToast('⚠️ Pro accounts are limited to 50 files per batch queue.');
      } else {
        showToast('⚠️ Free accounts are limited to 5 files per batch queue. Upgrade to PRO for up to 50 files!');
      }
      allowedFiles = validFiles.slice(0, remainingSlots);
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
          const { blobs, names } = await pdfToImages(file, { format: 'png', quality: 0.92, scale: 2 }, (pct) => {
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
            outputName = file.name.replace(/\.[^.]+$/, '') + '-images.zip';
            outputType = 'application/zip';
          }
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
      const matchesTab = activeTab === 'all' || tool.category === activeTab;
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

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
          {/* LEFT SIDEBAR */}
          <aside className="w-68 md:w-72 h-full bg-surface-container flex flex-col border-r border-outline-variant flex-shrink-0 text-left select-none p-5 overflow-y-auto">
            {/* Logo Brand */}
            <div className="flex items-center gap-3 mb-8 font-h2 text-xl font-bold tracking-tight select-none">
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
            <nav className="flex-1 flex flex-col gap-5">
              {/* WORKSPACE STUDIO SECTION */}
              <div className="flex flex-col gap-1">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-4 mb-1 select-none font-bold">Workspace Studio</span>
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
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
              <div className="flex flex-col gap-1 mt-6">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-4 mb-1 select-none font-bold">Offline Utilities</span>
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
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SYSTEM SECTION */}
              <div className="flex flex-col gap-1 mt-6">
                <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider px-4 mb-1 select-none font-bold">System</span>
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
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-body-md text-sm text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_12px_rgba(var(--color-primary-rgb),0.05)] border border-primary/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill text-primary' : 'text-outline'}`}>
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
            <div className="mt-8 flex flex-col gap-4">
              {/* Upgrade Promo / Pro Badge */}
              {userTier === 'pro' ? (
                <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3.5 select-none relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined fill text-[22px]">workspace_premium</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-label-mono text-[9px] uppercase tracking-wider text-primary font-bold">PRO PLAN</div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant font-semibold truncate">Premium unlocked</p>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-primary/25 rounded-2xl p-4.5 shadow-sm relative overflow-hidden flex flex-col gap-3.5 text-left border-outline-variant/80">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/5 rounded-bl-[40px] pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-[18px] fill">workspace_premium</span>
                      <span className="font-label-mono text-[9px] uppercase tracking-wider text-[#9d4300] dark:text-[#ff7f1c] font-bold">PRO UPGRADE</span>
                    </div>
                    <h4 className="font-bold text-[11px] text-on-background leading-normal">Unlock Desktop Power</h4>
                    <p className="font-body-sm text-[10px] text-on-surface-variant leading-normal mt-0.5 font-medium">
                      Get parallel batch tasks up to 50 files & WASM GPU Cloud speed.
                    </p>
                  </div>
                  <Link
                    to="/pricing"
                    className="w-full btn-theme-primary py-2 rounded-xl font-button text-[11px] font-bold text-center shadow-sm flex items-center justify-center gap-1.5 relative z-10"
                  >
                    Upgrade Now
                  </Link>
                </div>
              )}

              {/* Local Storage Card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-col gap-2 select-none">
                <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                  <span className="text-[11px]">Local Storage</span>
                  <span className="text-[11px] font-bold text-on-background">{storageUsage.used} / {storageUsage.quota}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/50">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${storageUsage.percent}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-outline">
                  <span>Browser database</span>
                  <span className="font-bold text-on-background">{storageUsage.percent}%</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN DASHBOARD CONTENT AREA */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Dashboard Header */}
            <header className="h-20 border-b border-outline-variant flex items-center justify-between px-8 flex-shrink-0 select-none bg-surface-container-low/40 backdrop-blur-md relative z-30">
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display-hero text-xl font-bold text-on-background capitalize">
                    {activeSidebarTab}
                  </h1>
                  {userTier === 'pro' ? (
                    <span className="bg-primary/10 border border-primary/30 text-primary font-label-mono text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.08)]">
                      <span className="material-symbols-outlined text-[10px] fill">workspace_premium</span>
                      Pro
                    </span>
                  ) : (
                    <span className="bg-outline-variant/30 border border-outline text-outline font-label-mono text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 select-none">
                      Free
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Your offline-first document studio
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Offline Mode Status Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/30 rounded-full text-success font-label-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  <span>Offline Mode</span>
                </div>

                {/* Theme Toggle Icon Button */}
                <button 
                  onClick={handleThemeToggle}
                  className="w-9 h-9 rounded-xl border border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center transition-all bg-surface hover:bg-surface-container-low"
                  title="Toggle theme"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>

                {/* User Dropdown Avatar */}
                <div className="relative">
                  <button 
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 hover:bg-surface-container rounded-full transition-all text-on-surface"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-[#FDBA74] flex items-center justify-center font-bold text-xs text-white shadow-sm ring-2 ring-primary/20 select-none">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : 'D'}
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline">keyboard_arrow_down</span>
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 bg-surface border border-outline-variant rounded-xl shadow-lg py-1.5 z-50 min-w-[180px] text-left">
                      <div className="px-3 py-1.5 text-[10px] text-on-surface-variant font-medium border-b border-outline-variant/60 truncate max-w-[200px]">
                        {userEmail}
                      </div>
                      <Link 
                        to="/dashboard"
                        className="w-full text-left px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container font-semibold flex items-center gap-1.5 border-t border-outline-variant/60"
                      >
                        <span className="material-symbols-outlined text-[15px]">account_circle</span>
                        My Account
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-3.5 py-2 text-xs text-error hover:bg-error-container/10 font-bold border-t border-outline-variant/60 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[15px]">logout</span>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Tab Views Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background relative z-10">
              
              {/* tab === workspace or queue */}
              {(activeSidebarTab === 'workspace' || activeSidebarTab === 'queue') && (
                <div className="flex flex-col gap-6">
                  {/* Always show drag & drop file uploader (collapsed if queue is active, or full) */}
                  {activeSidebarTab === 'workspace' && (
                    <div 
                      onClick={() => workspaceInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleWorkspaceDrop}
                      className="w-full bg-surface-container/30 border border-dashed border-outline-variant hover:border-primary rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:shadow-glow-primary transition-all duration-300 relative group overflow-hidden select-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      
                      <div className="flex items-center gap-5 z-10 text-left">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                          <span className="material-symbols-outlined text-[28px] fill">upload_file</span>
                        </div>
                        <div>
                          <h3 className="font-h3 text-[17px] font-bold text-on-background mb-1">Drag & drop documents here</h3>
                          <p className="font-body-sm text-xs text-on-surface-variant font-medium">Supports DOCX, PDF, TXT, MD and more</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 z-10 flex-shrink-0">
                        <button 
                          className="font-button text-xs bg-primary text-white hover:bg-primary-dark px-5 py-3 rounded-xl transition-all shadow-sm font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            workspaceInputRef.current?.click();
                          }}
                        >
                        </button>
                      </div>
                      
                      <input 
                        type="file"
                        ref={workspaceInputRef}
                        onChange={handleWorkspaceFileSelect}
                        multiple={true}
                        className="hidden"
                        accept=".pdf,.docx,.txt,image/*"
                      />
                    </div>
                  )}

                  {/* Workspace Queue Section */}
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60 flex-wrap gap-4">
                      <div className="text-left">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-h3 text-[17px] font-bold text-on-background">Workspace Queue</h3>
                          <span className="text-xs bg-surface-container border border-outline-variant font-bold text-on-surface-variant px-2.5 py-0.5 rounded-full">
                            {workspaceQueue.length}
                          </span>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1 font-medium">
                          Documents are processed locally and never leave your device.
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {workspaceQueue.length > 0 && (
                          <button 
                            onClick={() => setWorkspaceQueue([])}
                            className="text-xs text-on-surface-variant hover:text-error border border-outline-variant hover:border-error px-3.5 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 bg-surface hover:bg-error-container/10 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            Clear Completed
                          </button>
                        )}
                        
                        <div className="relative">
                          <select 
                            value={queueFilter}
                            onChange={(e) => setQueueFilter(e.target.value)}
                            className="text-xs text-on-surface-variant border border-outline-variant bg-surface px-3.5 py-2 rounded-xl font-semibold focus:outline-none focus:border-primary cursor-pointer pr-8 appearance-none relative shadow-sm"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238c7164' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
                          >
                            <option value="all">All Tasks</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
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
                                    {item.selectedAction}
                                  </span>
                                ) : (
                                  <div className="relative">
                                    <button
                                      disabled={item.status === 'Processing'}
                                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                                      className="w-full px-3.5 py-2 border border-outline-variant hover:border-primary rounded-xl text-xs font-semibold bg-surface hover:bg-surface-container flex items-center justify-between gap-1.5 transition-all text-on-background shadow-sm"
                                    >
                                      <span className="truncate">{item.selectedAction}</span>
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
                                            {act}
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
              )}

              {/* tab === converter */}
              {activeSidebarTab === 'converter' && (
                <div className="flex flex-col gap-6 text-left">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="font-h2 text-xl font-bold text-on-background">Tools Directory</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Launch any local conversion tool directly</p>
                    </div>
                    <div className="relative w-full md:w-[320px]">
                      <input
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

                  {/* Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTools.map((tool) => (
                      <div 
                        key={tool.id}
                        onClick={() => navigate(tool.path)}
                        className="bg-surface-container-low border border-outline-variant hover:border-primary rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col text-left group shadow-sm"
                      >
                        <div className="w-10 h-10 flex items-center justify-center select-none mb-4">
                          <ToolIcon id={tool.id} size={36} />
                        </div>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1 group-hover:text-primary transition-colors">{tool.title}</h4>
                        <p className="font-body-sm text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed mb-4">{tool.description}</p>
                        <div className="mt-auto flex justify-end text-outline group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* tab === reformatter */}
              {activeSidebarTab === 'reformatter' && (
                <div className="flex flex-col gap-6 text-left">
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
              )}

              {/* tab === templates */}
              {activeSidebarTab === 'templates' && (
                <div className="flex flex-col gap-6 text-left">
                  <div>
                    <h2 className="font-h2 text-xl font-bold text-on-background">Document Templates</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Pre-formatted document designs for various use cases</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { title: 'Project Proposal', type: 'DOCX', desc: 'Includes cover page, executive summary, and project details tables.' },
                      { title: 'Professional Resume', type: 'PDF', desc: 'Modern two-column layout optimized for applicant tracking systems.' },
                      { title: 'Meeting Minutes', type: 'TXT', desc: 'Standard corporate framework for recording agenda, notes, and tasks.' },
                      { title: 'Technical Guide', type: 'MD', desc: 'Markdown layout with code blocks, tables, and nested checklists.' }
                    ].map((tmpl, idx) => (
                      <div key={idx} className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col text-left hover:border-primary transition-all shadow-sm">
                        <span className="font-label-mono text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full w-max mb-4">
                          {tmpl.type} Template
                        </span>
                        <h4 className="font-body-md text-sm font-bold text-on-background mb-1.5">{tmpl.title}</h4>
                        <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mb-6 font-medium">{tmpl.desc}</p>
                        <button className="mt-auto bg-surface border border-outline-variant hover:border-primary hover:text-primary text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm">
                          Use Template
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* tab === settings */}
              {activeSidebarTab === 'settings' && (
                <div className="flex flex-col gap-6 text-left max-w-2xl">
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
    </div>
  );
}
