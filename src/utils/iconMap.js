import { 
  Combine, Scissors, Trash2, FileDown, Grid, Camera, FileArchive, Hammer, ScanText, 
  FileText, Presentation, Table, ShieldCheck, Lock, Unlock, EyeOff, Eye,
  GitCompare, Stamp, Hash, Sparkles, Languages, RefreshCw, Maximize2, QrCode, 
  FileImage, Workflow, FolderOpen, Link2, Briefcase, Image as ImageIcon, Wrench, LayoutGrid, Gauge, ArrowLeftRight, ShieldAlert,
  FileSpreadsheet, FileCode, FilePenLine, FileCheck, FileUp
} from 'lucide-react';

import SignatureIcon from '../components/SignatureIcon';

export const categoryIcons = {
  organize: LayoutGrid,
  optimize: Gauge,
  'convert-to': FileUp,
  'convert-from': FileDown,
  'security-ai': ShieldAlert
};

export const toolIconsMap = {
  // Organize PDF
  'merge-pdf': Combine,
  'split-pdf': Scissors,
  'remove-pages': Trash2,
  'extract-pages': FileDown,
  'organize-pdf': Grid,
  'scan-to-pdf': Camera,
  
  // Optimize PDF
  'compress-pdf': FileArchive,
  'repair-pdf': Hammer,
  'ocr-pdf': ScanText,
  
  // Convert PDF
  'image-to-pdf': FileImage,
  'docx-to-pdf': FileText,
  'word-to-pdf': FileText,
  'powerpoint-to-pdf': Presentation,
  'excel-to-pdf': FileSpreadsheet,
  'html-to-pdf': FileCode,
  'pdf-to-word': FileText,
  'pdf-to-excel': FileSpreadsheet,
  'pdf-to-powerpoint': Presentation,
  'pdf-to-pdfa': FileCheck,
  'text-to-pdf': FilePenLine,
  'pdf-to-image': FileImage,
  'pdf-to-jpg': FileImage,
  
  // Security & Intelligence
  'protect-pdf': Lock,
  'unlock-pdf': Unlock,
  'sign-pdf': SignatureIcon,
  'redact-pdf': EyeOff,
  'compare-pdf': GitCompare,
  'add-watermark': Stamp,
  'add-page-numbers': Hash,
  'ai-summarizer': Sparkles,
  'ai-translator': Languages,
  
  // Image & Utilities
  'image-converter': RefreshCw,
  'image-compressor': ImageIcon,
  'image-resizer': Maximize2,
  'qr-generator': QrCode,
  'conversion-pipeline': Workflow,
  'unzip-file': FolderOpen,
  'url-to-pdf': Link2,
  'resume-builder': Briefcase,
  'document-viewer': Eye
};

export const getToolThemeClasses = (toolId) => {
  return {
    bg: 'bg-gray-50 dark:bg-[#121212]',
    border: 'border border-gray-200 dark:border-white/10 group-hover:border-[#E8672B] dark:group-hover:border-[#E8672B] group-hover:shadow-[0_0_15px_rgba(232,103,43,0.35)] dark:group-hover:shadow-[0_0_15px_rgba(232,103,43,0.45)]',
    text: 'text-gray-600 dark:text-white/80 group-hover:text-[#E8672B] dark:group-hover:text-[#E8672B]'
  };
};
