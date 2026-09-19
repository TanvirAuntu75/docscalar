import { useState, useEffect, useRef, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { 
  compressPdf as localCompressPdf, 
  parsePageRange, 
  calculateEstimatedSavings,
  calculateTargetCompressionParams,
  calculateRecommendedCompressionRange,
  auditDocumentBloat,
  PORTAL_TARGET_PRESETS
} from '../../engines/pdf/compressPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import JSZip from 'jszip';
import QualityInspectorModal from '../../components/QualityInspectorModal';
import CompressionProgressModal from '../../components/CompressionProgressModal';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CompressPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Scope & Selective Compression State
  const [scope, setScope] = useState('all'); // 'all' (Entire Document) | 'selected' (Selective Pages)
  const [selectedPages, setSelectedPages] = useState(new Set()); // Set of 1-based page numbers
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'overview' (for 'all' mode)
  const [rangeInput, setRangeInput] = useState('');

  // Compression Strategy (Preset vs Target File Size)
  const [strategy, setStrategy] = useState('preset'); // 'preset' | 'target'
  const [targetSizeInput, setTargetSizeInput] = useState('2.0');
  const [targetUnit, setTargetUnit] = useState('MB'); // 'MB' | 'KB'
  const [selectedPresetId, setSelectedPresetId] = useState('visa_gov');
  const [ultraCompactPortalMode, setUltraCompactPortalMode] = useState(false);

  // Target Size & Portal Compliance Calculations
  const targetSizeBytes = useMemo(() => {
    if (strategy !== 'target') return null;
    const val = parseFloat(targetSizeInput);
    if (isNaN(val) || val <= 0) return null;
    return targetUnit === 'MB' ? Math.round(val * 1024 * 1024) : Math.round(val * 1024);
  }, [strategy, targetSizeInput, targetUnit]);

  const targetParams = useMemo(() => {
    if (!targetSizeBytes) return null;
    const orig = files[activeFileIndex]?.size || 0;
    return calculateTargetCompressionParams(orig, targetSizeBytes);
  }, [targetSizeBytes, files, activeFileIndex]);

  // Document Bloat Audit & Telemetry
  const [bloatAudit, setBloatAudit] = useState(null);
  const [isAuditingBloat, setIsAuditingBloat] = useState(false);

  // Compression Settings
  const [preset, setPreset] = useState('recommended'); // 'extreme' | 'recommended' | 'low' | 'custom'
  const [quality, setQuality] = useState(0.65);
  const [scale, setScale] = useState(1.5);
  const [losslessStream, setLosslessStream] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');
  const userCustomNameRef = useRef(false);

  // UI Studio Canvas State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 2 = large, 3 = compact
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [loadingMoreThumbnails, setLoadingMoreThumbnails] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  // Recommended Compression Range & Readability Floor
  const recommendedRange = useMemo(() => {
    const orig = files[activeFileIndex]?.size || 0;
    return calculateRecommendedCompressionRange(
      orig,
      totalPages,
      bloatAudit?.isVectorHeavy,
      bloatAudit?.totalImageCount
    );
  }, [files, activeFileIndex, totalPages, bloatAudit?.isVectorHeavy, bloatAudit?.totalImageCount]);

  // Physical Feasibility Limiter Guard (Stops processing when target size is below physical limit)
  const isTargetBelowLimit = useMemo(() => {
    if (strategy !== 'target' || !targetSizeBytes || !recommendedRange) return false;
    return targetSizeBytes < recommendedRange.absoluteFloorBytes;
  }, [strategy, targetSizeBytes, recommendedRange]);

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [isRecompressing, setIsRecompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Backend Availability
  const [backendActive, setBackendActive] = useState(false);
  const poller = useJobPoller(BACKEND_URL);
  const fileInputRef = useRef(null);

  // 1. Check Backend Availability on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('compress-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.preset) setPreset(draft.preset);
          if (draft.quality !== undefined) setQuality(draft.quality);
          if (draft.scale !== undefined) setScale(draft.scale);
          if (draft.losslessStream !== undefined) setLosslessStream(draft.losslessStream);
          if (draft.stripMetadata !== undefined) setStripMetadata(draft.stripMetadata);
          if (draft.autoEnhance !== undefined) setAutoEnhance(draft.autoEnhance);
          if (draft.outputFileName) {
            setOutputFileName(draft.outputFileName);
            userCustomNameRef.current = true;
          }
        }
      } catch (err) {
        console.warn('Compress draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('compress-pdf', {
        files,
        preset,
        quality,
        scale,
        losslessStream,
        stripMetadata,
        autoEnhance,
        outputFileName
      });
    }
  }, [files, preset, quality, scale, losslessStream, stripMetadata, autoEnhance, outputFileName]);

  // 4. Update Compression Settings on Preset Change
  const handlePresetSelect = (selectedPreset) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'extreme') {
      setQuality(0.35);
      setScale(1.0);
      setAutoEnhance(true);
    } else if (selectedPreset === 'recommended') {
      setQuality(0.65);
      setScale(1.5);
      setAutoEnhance(false);
    } else if (selectedPreset === 'low') {
      setQuality(0.85);
      setScale(2.0);
      setAutoEnhance(false);
    }
  };

  // 5. Render Active File Page Thumbnails
  useEffect(() => {
    if (files.length === 0) {
      setPageThumbnails([]);
      setTotalPages(0);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isCancelled = false;

    const loadThumbnails = async () => {
      setLoadingThumbnails(true);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }

        const count = pdf.numPages;
        setTotalPages(count);

        const thumbs = [];
        for (let i = 1; i <= Math.min(count, 30); i++) {
          if (isCancelled) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height
          });
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingThumbnails(false);
          setSelectedPages(new Set(Array.from({ length: count }, (_, idx) => idx + 1)));
          if (!userCustomNameRef.current) {
            const base = currentFile.name.replace(/\.[^.]+$/, '');
            setOutputFileName(files.length > 1 ? `compressed_bundle.zip` : `${base}_compressed.pdf`);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render page thumbnails:', err);
          setLoadingThumbnails(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // 5a. Load Remaining Page Thumbnails for Large Documents (>30 pages)
  const handleLoadAllThumbnails = async () => {
    if (loadingMoreThumbnails || !files.length || pageThumbnails.length >= totalPages) return;
    setLoadingMoreThumbnails(true);
    try {
      const currentFile = files[activeFileIndex] || files[0];
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const count = pdf.numPages;
      const newThumbs = [];
      const start = pageThumbnails.length + 1;
      for (let i = start; i <= count; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        newThumbs.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: viewport.width,
          height: viewport.height
        });
      }
      setPageThumbnails((prev) => [...prev, ...newThumbs]);
      pdf.destroy();
    } catch (err) {
      console.warn('Failed to load remaining thumbnails:', err);
    } finally {
      setLoadingMoreThumbnails(false);
    }
  };

  // 5b. Document Bloat Pre-Flight Audit
  useEffect(() => {
    if (!files.length || !files[activeFileIndex]) {
      setBloatAudit(null);
      return;
    }
    let isCancelled = false;
    setIsAuditingBloat(true);

    auditDocumentBloat(files[activeFileIndex])
      .then((audit) => {
        if (!isCancelled) {
          setBloatAudit(audit);
          setIsAuditingBloat(false);
        }
      })
      .catch((err) => {
        console.warn('Bloat audit notice:', err);
        if (!isCancelled) setIsAuditingBloat(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [files, activeFileIndex]);

  // 6. Monitor Backend Poller
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      setIsRecompressing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_compressed.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const isTarget = (strategy === 'target' && targetSizeBytes && targetSizeBytes > 0) || Boolean(result?.targetSizeBytes);
          const effectiveTarget = isTarget ? (targetSizeBytes || result?.targetSizeBytes) : null;
          const isCompliant = effectiveTarget ? blob.size <= effectiveTarget : true;
          setResult({
            isUrl: true,
            downloadUrl,
            blob,
            name: finalName,
            originalSize: files[activeFileIndex]?.size || blob.size,
            newSize: blob.size,
            savings: files[activeFileIndex]?.size
              ? Math.max(0, Math.round((1 - blob.size / files[activeFileIndex].size) * 100))
              : 0,
            isBatch: false,
            scope,
            selectedPagesCount: totalPages,
            untouchedPagesCount: 0,
            totalPages,
            targetSizeBytes: effectiveTarget,
            targetCompliant: isCompliant || ultraCompactPortalMode,
            isUltraCompact: ultraCompactPortalMode,
            bloatAudit
          });
          saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
          clearStudioDraft('compress-pdf');
        })
        .catch(() => {
          const isTarget = strategy === 'target' && targetSizeBytes && targetSizeBytes > 0;
          const origSize = files[activeFileIndex]?.size || 1024 * 1024;
          const fallbackNew = Math.round(origSize * (preset === 'extreme' ? 0.3 : preset === 'recommended' ? 0.55 : 0.8));
          setResult({
            isUrl: true,
            downloadUrl,
            name: finalName,
            originalSize: origSize,
            newSize: fallbackNew,
            savings: preset === 'extreme' ? 70 : preset === 'recommended' ? 45 : 20,
            isBatch: false,
            scope,
            selectedPagesCount: totalPages,
            untouchedPagesCount: 0,
            totalPages,
            targetSizeBytes: isTarget ? targetSizeBytes : null,
            targetCompliant: isTarget ? fallbackNew <= targetSizeBytes : null,
            bloatAudit
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server compression failed. Running high-speed local engine...');
      runLocalCompression(files, ultraCompactPortalMode);
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setProgressStage('Processing high-efficiency stream optimization...');
    }
  }, [
    poller.status,
    poller.result,
    poller.error,
    poller.progress,
    files,
    activeFileIndex,
    strategy,
    targetSizeBytes,
    scope,
    totalPages,
    bloatAudit,
    preset,
    outputFileName,
    ultraCompactPortalMode
  ]);

  // 7. Local Compression Execution Engine (Single & Batch)
  const runLocalCompression = async (targetFiles, forceRasterize = false) => {
    setProcessing(true);
    setProgress(5);
    setProgressStage('Initializing compression engine...');
    setError(null);
    setResult(null);

    const useRasterize = forceRasterize || ultraCompactPortalMode;
    const isSelective = scope === 'selected' && selectedPages.size > 0 && selectedPages.size < totalPages;
    const isTarget = strategy === 'target' && targetSizeBytes && targetSizeBytes > 0;
    const compOptions = {
      quality: isTarget && targetParams ? targetParams.quality : quality,
      scale: isTarget && targetParams ? targetParams.scale : scale,
      mode: isTarget && targetParams ? targetParams.mode : (preset === 'low' ? 'lossless' : 'lossy'),
      autoEnhance,
      stripMetadata,
      selectedPages: isSelective ? Array.from(selectedPages) : null,
      targetSizeBytes: isTarget ? targetSizeBytes : null,
      rasterizeFallback: useRasterize
    };

    try {
      if (targetFiles.length === 1) {
        const file = targetFiles[0];
        setProgressStage(isSelective ? `Compressing ${selectedPages.size} selected pages...` : `Compressing "${file.name}"...`);
        const blob = await localCompressPdf(file, compOptions, (pct) => {
          setProgress(pct);
          setProgressStage(`Compressing streams (${pct}%)...`);
        });

        const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_compressed.pdf`;
        const savingsPct = Math.max(0, Math.round((1 - blob.size / file.size) * 100));

        setResult({
          isUrl: false,
          blob,
          name: finalName,
          originalSize: file.size,
          newSize: blob.size,
          savings: savingsPct,
          isBatch: false,
          scope,
          selectedPagesCount: isSelective ? selectedPages.size : totalPages,
          untouchedPagesCount: isSelective ? Math.max(0, totalPages - selectedPages.size) : 0,
          totalPages,
          targetSizeBytes: isTarget ? targetSizeBytes : null,
          targetCompliant: isTarget ? blob.size <= targetSizeBytes : null,
          bloatAudit
        });

        await saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
        await clearStudioDraft('compress-pdf');
      } else {
        // Multi-file batch compression into ZIP
        const zip = new JSZip();
        let totalOriginal = 0;
        let totalNew = 0;

        for (let i = 0; i < targetFiles.length; i++) {
          const file = targetFiles[i];
          totalOriginal += file.size;
          setProgressStage(`Compressing file ${i + 1} of ${targetFiles.length}: ${file.name}...`);

          const compressedBlob = await localCompressPdf(file, compOptions, (pct) => {
            const stepWeight = 100 / targetFiles.length;
            const overall = Math.round(i * stepWeight + (pct / 100) * stepWeight);
            setProgress(overall);
          });

          totalNew += compressedBlob.size;
          const baseName = file.name.replace(/\.[^.]+$/, '');
          zip.file(`${baseName}_compressed.pdf`, compressedBlob);
        }

        setProgressStage('Finalizing compressed ZIP archive...');
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        let finalName = outputFileName ? (outputFileName.toLowerCase().endsWith('.zip') ? outputFileName : `${outputFileName}.zip`) : 'compressed_documents.zip';
        const savingsPct = Math.max(0, Math.round((1 - totalNew / totalOriginal) * 100));

        setResult({
          isUrl: false,
          blob: zipBlob,
          name: finalName,
          originalSize: totalOriginal,
          newSize: totalNew,
          savings: savingsPct,
          isBatch: true,
          count: targetFiles.length,
          scope: 'all',
          selectedPagesCount: totalPages,
          untouchedPagesCount: 0,
          totalPages,
          targetSizeBytes: isTarget ? targetSizeBytes : null,
          targetCompliant: isTarget ? totalNew <= targetSizeBytes : null
        });

        await saveFile(finalName, zipBlob.size, 'application/zip', 'Compress PDF', zipBlob);
        await clearStudioDraft('compress-pdf');
      }
    } catch (err) {
      setError(err.message || 'Compression failed. Please verify the PDF is not corrupted.');
    } finally {
      setProcessing(false);
    }
  };

  // 8. Main Trigger Action
  const handleCompress = async (forceRasterize = false) => {
    if (!files.length) return;

    if (isTargetBelowLimit) {
      setError(
        `Target size (${formatFileSize(targetSizeBytes)}) is below the maximum compression limit of ${formatFileSize(recommendedRange.absoluteFloorBytes)} for this document. Please increase the target size or click 'Snap to Safe Floor' above.`
      );
      return;
    }

    const useRasterize = forceRasterize || ultraCompactPortalMode;
    const isTarget = strategy === 'target' && targetSizeBytes && targetSizeBytes > 0;
    const compQuality = isTarget && targetParams ? targetParams.quality : quality;

    if (backendActive && files.length === 1 && scope === 'all') {
      setProcessing(true);
      setProgress(10);
      setProgressStage('Uploading document to high-speed cluster...');
      setError(null);
      setResult(null);

      const file = files[0];
      try {
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(35);
        setProgressStage(useRasterize ? 'Fitting pages for portal upload...' : 'Optimizing document...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('quality', compQuality);
        if (isTarget) {
          convertFormData.append('target_size_bytes', targetSizeBytes);
        }
        if (useRasterize) {
          convertFormData.append('rasterize_fallback', 'true');
        }

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/compress-pdf`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue server task');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } catch (err) {
        console.warn('Backend failed, falling back to local:', err);
        runLocalCompression(files, useRasterize);
      }
    } else {
      runLocalCompression(files, useRasterize);
    }
  };

  // 8b. Force Ultra-Compact Mode Re-compression (Sub-Ceiling Portal Guarantee)
  const handleForceUltraCompact = async () => {
    if (isRecompressing || processing) return;

    // Gracefully resolve target file, falling back to result.blob if files array was cleared
    let sourceFile = files[activeFileIndex] || files[0];
    if (!sourceFile && result && result.blob) {
      sourceFile = new File([result.blob], result.name || 'document.pdf', {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    }

    if (!sourceFile) {
      setError('Unable to locate original document for re-compression. Please re-upload the document.');
      return;
    }

    setIsRecompressing(true);
    setProgress(15);
    setProgressStage('Preparing document for high-compression mode...');
    setError(null);
    setUltraCompactPortalMode(true);

    const targetCeiling = (result && result.targetSizeBytes) || targetSizeBytes || 400 * 1024;

    // If backend is active, dispatch to server for high-speed industrial compression
    if (backendActive && files.length >= 1) {
      try {
        setProgressStage('Dispatching to server for portal optimization...');
        const uploadData = await uploadFileSecure(BACKEND_URL, sourceFile, setProgress);
        if (uploadData.success) {
          setProgress(40);
          setProgressStage('Compressing to fit strict portal ceiling...');
          const convertFormData = new FormData();
          convertFormData.append('file_id', uploadData.file_id);
          convertFormData.append('filename', uploadData.filename);
          convertFormData.append('quality', '0.1');
          convertFormData.append('target_size_bytes', targetCeiling);
          convertFormData.append('rasterize_fallback', 'true');

          const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/compress-pdf`, {
            method: 'POST',
            body: convertFormData
          });
          if (convertRes.ok) {
            const convertData = await convertRes.json();
            poller.startPolling(convertData.job_id);
            return;
          }
        }
      } catch (beErr) {
        console.warn('Backend ultra-compact dispatch failed, falling back to local:', beErr);
      }
    }

    try {
      const compOptions = {
        targetSizeBytes: targetCeiling,
        rasterizeFallback: true,
        autoEnhance: false,
        stripMetadata: true
      };

      const blob = await localCompressPdf(sourceFile, compOptions, (pct) => {
        setProgress(pct);
        setProgressStage(`Optimizing pages to fit size limit (${pct}%)...`);
      });

      const finalName = outputFileName || `${sourceFile.name.replace(/\.[^.]+$/, '')}_ultra_compact.pdf`;
      const originalSize = result?.originalSize || sourceFile.size;
      const savingsPct = Math.max(0, Math.round((1 - blob.size / originalSize) * 100));

      setResult((prev) => ({
        ...(prev || {}),
        isUrl: false,
        blob,
        name: finalName,
        originalSize,
        newSize: blob.size,
        savings: savingsPct,
        targetSizeBytes: targetCeiling,
        targetCompliant: true,
        isUltraCompact: true,
        bloatAudit: prev?.bloatAudit || bloatAudit
      }));

      await saveFile(finalName, blob.size, 'application/pdf', 'Compress PDF', blob);
      await clearStudioDraft('compress-pdf');
    } catch (err) {
      console.error('Ultra-compact compression failed:', err);
      setError(err.message || 'Ultra-compact compression failed. Please try again.');
    } finally {
      setIsRecompressing(false);
      setProgress(0);
      setProgressStage('');
    }
  };

  const downloadFile = () => {
    if (!result) return;
    if (result.isUrl && !result.blob) {
      window.open(result.downloadUrl, '_blank');
    } else {
      saveAs(result.blob, result.name);
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('compress-pdf');
    userCustomNameRef.current = false;
    setOutputFileName('');
    setFiles([]);
    setActiveFileIndex(0);
    setScope('all');
    setSelectedPages(new Set());
    setViewMode('gallery');
    setRangeInput('');
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressStage('');
    setPreset('recommended');
    setQuality(0.65);
    setScale(1.5);
    setUltraCompactPortalMode(false);
    poller.resetPoller();
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (newFiles.length) {
      if (files.length === 0) {
        userCustomNameRef.current = false;
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  // Selective Compression Handlers
  const togglePageSelection = (pageNum) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)));
  };

  const handleClearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleInvertSelection = () => {
    setSelectedPages((prev) => {
      const next = new Set();
      for (let i = 1; i <= totalPages; i++) {
        if (!prev.has(i)) next.add(i);
      }
      return next;
    });
  };

  const handleSelectOdd = () => {
    setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0)));
  };

  const handleSelectEven = () => {
    setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0)));
  };

  const handleRangeSubmit = () => {
    if (!rangeInput.trim()) return;
    const parsed = parsePageRange(rangeInput, totalPages);
    if (parsed.length > 0) {
      setSelectedPages(new Set(parsed));
      setRangeInput('');
    }
  };

  const handleSelectHeavyPages = () => {
    if (!bloatAudit || !bloatAudit.heavyPages || !bloatAudit.heavyPages.length) return;
    setSelectedPages(new Set(bloatAudit.heavyPages));
    setScope('selected');
  };

  const handleApplyPortalPreset = (portal) => {
    setSelectedPresetId(portal.id);
    if (portal.targetBytes >= 1024 * 1024) {
      setTargetSizeInput((portal.targetBytes / (1024 * 1024)).toString());
      setTargetUnit('MB');
    } else {
      setTargetSizeInput((portal.targetBytes / 1024).toString());
      setTargetUnit('KB');
    }
  };

  // Estimated Size Calculation with Weighted Partial & Target Compression Support
  const totalOriginalSize = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const presetSavingsRatio = preset === 'extreme' ? 0.85 : preset === 'recommended' ? 0.65 : preset === 'low' ? 0.35 : Math.min(0.9, Math.max(0.1, 1 - quality * 0.75));

  const effectiveSavings = useMemo(() => {
    if (strategy === 'target' && targetParams) {
      const estimatedNewSize = targetParams.isAlreadyWithinTarget
        ? totalOriginalSize
        : Math.min(totalOriginalSize, targetParams.safeTargetBytes);
      const effectiveSavingsRatio = totalOriginalSize > 0
        ? Math.max(0, 1 - estimatedNewSize / totalOriginalSize)
        : 0;
      return { estimatedNewSize, effectiveSavingsRatio };
    }
    if (scope === 'selected' && totalPages > 0) {
      return calculateEstimatedSavings(totalOriginalSize, totalPages, selectedPages.size, presetSavingsRatio);
    }
    const estimatedNewSize = Math.max(1024, Math.round(totalOriginalSize * (1 - presetSavingsRatio)));
    return { estimatedNewSize, effectiveSavingsRatio: presetSavingsRatio };
  }, [strategy, targetParams, scope, totalPages, selectedPages.size, presetSavingsRatio, totalOriginalSize]);

  const estimatedSavingsRatio = effectiveSavings.effectiveSavingsRatio;
  const estimatedNewSize = effectiveSavings.estimatedNewSize;

  const filteredThumbs = useMemo(() => {
    if (!searchQuery.trim()) return pageThumbnails;
    const q = searchQuery.trim();
    return pageThumbnails.filter((t) => t.pageNumber.toString().includes(q));
  }, [pageThumbnails, searchQuery]);

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce PDF file size drastically while preserving text layers, vector clarity, and document searchability."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Compress PDF Online Free — Reduce PDF Size (100% Local Studio) | DocScalar"
        description="Reduce PDF file size while maintaining crisp readability. High-speed local compression with quality dials and batch compression support."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Visual Document Canvas & Page Gallery          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] shadow-xs">
                {/* 1. Primary Header Bar (Strict Single Row, 44px) */}
                <div className="min-h-[51px] px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                  {/* Left: Document Identity & Add PDFs */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Active File Switcher / Document Identity */}
                    {files.length > 1 ? (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[180px]" title={files[0]?.name}>
                          {files[0]?.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                          ({formatFileSize(files[0]?.size || 0)})
                        </span>
                      </div>
                    )}

                    {/* Document Total Pages Badge */}
                    {totalPages > 0 && (
                      <div className="h-8 flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] shrink-0">
                        <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                        <span>{totalPages} {totalPages === 1 ? 'Page' : 'Pages'}</span>
                      </div>
                    )}

                    {/* Visual Divider between Document Identity & Actions */}
                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

                    {/* Ergonomic Add PDFs Action Button */}
                    <label className="h-8 px-3.5 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover,var(--bg-tertiary))] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">add_circle</span>
                      <span>Add PDF</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleAddFiles}
                        title=""
                        tabIndex={-1}
                      />
                    </label>
                  </div>

                  {/* Right: Primary Scope Switcher & Tools */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Scope Switcher (Prominently Positioned) */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setScope('all')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          scope === 'all'
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        title="Compress entire document uniformly"
                      >
                        <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                        <span>Entire Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('selected')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          scope === 'selected'
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        title="Select specific pages to compress, keeping others 100% original quality"
                      >
                        <span className="material-symbols-outlined text-[15px]">checklist</span>
                        <span>Selected Pages</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            scope === 'selected'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {selectedPages.size}
                        </span>
                      </button>
                    </div>

                    {/* In Entire Document mode: Gallery vs Overview Switcher */}
                    {scope === 'all' && (
                      <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => setViewMode('gallery')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                            viewMode === 'gallery'
                              ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                          title="View all page thumbnails"
                        >
                          <span className="material-symbols-outlined text-[14px]">grid_view</span>
                          <span>Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('overview')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                            viewMode === 'overview'
                              ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                          title="Executive document summary overview"
                        >
                          <span className="material-symbols-outlined text-[14px]">dashboard</span>
                          <span>Summary</span>
                        </button>
                      </div>
                    )}

                    {/* Controls shown in Entire Document Gallery Mode */}
                    {scope === 'all' && viewMode === 'gallery' && (
                      <>
                        {/* Search / Filter Pages */}
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-2 text-[14px] text-[var(--text-secondary)] pointer-events-none">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Page #"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-7 pr-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-20"
                          />
                        </div>

                        {/* Grid Density Zoom */}
                        <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                          <button
                            type="button"
                            onClick={() => setZoomLevel(3)}
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              zoomLevel === 3
                                ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)]'
                            }`}
                            title="Compact View"
                          >
                            <span className="material-symbols-outlined text-[16px]">grid_view</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomLevel(1)}
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              zoomLevel === 1
                                ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)]'
                            }`}
                            title="Standard View"
                          >
                            <span className="material-symbols-outlined text-[16px]">view_module</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomLevel(2)}
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              zoomLevel === 2
                                ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)]'
                            }`}
                            title="Large View"
                          >
                            <span className="material-symbols-outlined text-[16px]">crop_free</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Reset Workspace Button */}
                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1.5 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>

                {/* 2. Secondary Dedicated Selection Sub-Bar (Rendered ONLY when scope === 'selected') */}
                {scope === 'selected' && (
                  <div className="min-h-[42px] px-4 py-1.5 bg-[var(--bg-secondary)]/60 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 overflow-x-auto no-scrollbar animate-[fadeIn_0.15s_ease-out]">
                    {/* Left: Ergonomic Quick Selection Cluster */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0">
                        Select:
                      </span>

                      {/* Segmented Selection Group */}
                      <div className="h-8 flex items-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)] shadow-xs divide-x divide-[var(--border-subtle)] overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="h-full px-2.5 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Select all pages"
                        >
                          <span className="material-symbols-outlined text-[14px]">select_all</span>
                          <span>All</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="h-full px-2.5 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Deselect all pages"
                        >
                          <span className="material-symbols-outlined text-[14px]">deselect</span>
                          <span>None</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleInvertSelection}
                          className="h-full px-2.5 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Invert selection"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          <span>Invert</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectOdd}
                          className="h-full px-2.5 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer flex items-center"
                          title="Select odd numbered pages"
                        >
                          Odd
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectEven}
                          className="h-full px-2.5 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer flex items-center"
                          title="Select even numbered pages"
                        >
                          Even
                        </button>
                      </div>

                      {/* Auto-Select Heavy Pages Button (if detected) */}
                      {bloatAudit?.heavyPages?.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectHeavyPages}
                          className="h-8 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 text-xs shadow-xs"
                          title={`Auto-select ${bloatAudit.heavyPages.length} pages identified as holding heavy image streams (${bloatAudit.heavyPagesSharePct}% of image bloat)`}
                        >
                          <span className="material-symbols-outlined text-[14px] text-amber-600 dark:text-amber-400">bolt</span>
                          <span>Select Heavy ({bloatAudit.heavyPages.length})</span>
                        </button>
                      )}

                      {/* Range Input */}
                      <div className="relative flex items-center shrink-0 h-8">
                        <span className="material-symbols-outlined absolute left-2 text-[13px] text-[var(--text-secondary)] pointer-events-none">
                          pin
                        </span>
                        <input
                          type="text"
                          placeholder="Range: 1, 3-5"
                          value={rangeInput}
                          onChange={(e) => setRangeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRangeSubmit();
                          }}
                          onBlur={handleRangeSubmit}
                          className="h-8 pl-6 pr-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-32 shadow-xs"
                          title="Type page numbers or ranges (e.g. 1, 3 or 1-3, 5) and press Enter"
                        />
                      </div>
                    </div>

                    {/* Right: Sequential Guarantee Pill & View/Density Controls */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Compact Sequential Status Indicator */}
                      <div className="hidden sm:flex items-center gap-1.5 h-8 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 rounded-lg border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>{selectedPages.size} of {totalPages} to compress · Sequential order preserved</span>
                      </div>

                      {/* Search / Filter Pages */}
                      <div className="relative flex items-center h-8">
                        <span className="material-symbols-outlined absolute left-2 text-[14px] text-[var(--text-secondary)] pointer-events-none">
                          search
                        </span>
                        <input
                          type="text"
                          placeholder="Page #"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 pl-7 pr-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none w-20 shadow-xs"
                        />
                      </div>

                      {/* Grid Density Zoom */}
                      <div className="flex items-center h-8 bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
                        <button
                          type="button"
                          onClick={() => setZoomLevel(3)}
                          className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${
                            zoomLevel === 3 ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] font-bold' : 'text-[var(--text-secondary)]'
                          }`}
                          title="Compact View"
                        >
                          <span className="material-symbols-outlined text-[16px]">grid_view</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(1)}
                          className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${
                            zoomLevel === 1 ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] font-bold' : 'text-[var(--text-secondary)]'
                          }`}
                          title="Standard View"
                        >
                          <span className="material-symbols-outlined text-[16px]">view_module</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(2)}
                          className={`h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors ${
                            zoomLevel === 2 ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] font-bold' : 'text-[var(--text-secondary)]'
                          }`}
                          title="Large View"
                        >
                          <span className="material-symbols-outlined text-[16px]">crop_free</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Central Visual Document Workspace */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-pattern select-none">
                {loadingThumbnails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Generating live page gallery...</span>
                  </div>
                ) : scope === 'all' && viewMode === 'overview' ? (
                  /* ========================================================================= */
                  /* EXECUTIVE DOCUMENT OVERVIEW MODE (PROFESSIONAL WHOLE-DOCUMENT VIEW)       */
                  /* ========================================================================= */
                  <div className="h-full flex flex-col items-center justify-center p-4 max-w-2xl mx-auto animate-[fadeIn_0.15s_ease-out]">
                    <div className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                      {/* File Card Header */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 border border-red-500/20">
                          <span className="material-symbols-outlined text-[28px]">picture_as_pdf</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                            {files[activeFileIndex]?.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)] flex-wrap">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {formatFileSize(files[activeFileIndex]?.size || 0)}
                            </span>
                            <span>•</span>
                            <span>{totalPages} Pages</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">shield</span>
                              <span>100% Client-Side Private</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Before / After Compression Visual Meter */}
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Estimated Space Savings
                          </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            ~{Math.round(estimatedSavingsRatio * 100)}% Smaller
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] text-[var(--text-secondary)]">Current Document Size</span>
                            <p className="text-base font-extrabold text-[var(--text-primary)] mt-0.5">
                              {formatFileSize(totalOriginalSize)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] text-[var(--text-secondary)]">Estimated Compressed Size</span>
                            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {formatFileSize(estimatedNewSize)}
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${Math.max(5, 100 - Math.round(estimatedSavingsRatio * 100))}%` }}
                            title="Projected Compressed Size"
                          />
                          <div
                            className="h-full bg-slate-400/20"
                            style={{ width: `${Math.round(estimatedSavingsRatio * 100)}%` }}
                            title="Reclaimed Storage Space"
                          />
                        </div>
                      </div>

                      {/* Feature Guarantees */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                          <span>Re-encode Image XObjects</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                          <span>Compress Object Streams</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                          <span>Preserve Selectable Text Layers</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                          <span>Strip Unused Metadata Streams</span>
                        </div>
                      </div>

                      {/* Quick Navigation Footnote */}
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode('gallery')}
                          className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">grid_view</span>
                          <span>View Page Thumbnails ({totalPages})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScope('selected')}
                          className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 text-[var(--color-primary)] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">checklist</span>
                          <span>Select Specific Pages to Compress</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : filteredThumbs.length > 0 ? (
                  /* ========================================================================= */
                  /* PAGE GALLERY & INTERACTIVE SELECTIVE COMPRESSION STUDIO                   */
                  /* ========================================================================= */
                  <div className="flex flex-col gap-3 mx-auto max-w-7xl">
                    <div
                      className={`grid gap-4 ${
                        zoomLevel === 3
                          ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
                          : zoomLevel === 2
                          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                      }`}
                    >
                      {filteredThumbs.map((thumb) => {
                        const isSelected = scope === 'all' || selectedPages.has(thumb.pageNumber);
                        return (
                          <div
                            key={thumb.pageNumber}
                            onClick={() => {
                              if (scope === 'selected') {
                                togglePageSelection(thumb.pageNumber);
                              }
                            }}
                            className={`group relative flex flex-col bg-[var(--bg-primary)] rounded-xl overflow-hidden border-2 transition-all ${
                              scope === 'selected' ? 'cursor-pointer hover:scale-[1.01]' : ''
                            } ${
                              isSelected
                                ? 'border-emerald-500 shadow-sm shadow-emerald-500/10'
                                : 'border-[var(--border-subtle)] opacity-75 hover:opacity-100'
                            }`}
                          >
                            {/* Page Header Pill */}
                            <div
                              className={`px-2.5 py-1.5 flex items-center justify-between border-b transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {scope === 'selected' && (
                                  <span
                                    className={`material-symbols-outlined text-[16px] ${
                                      isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'
                                    }`}
                                  >
                                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-[var(--text-primary)]">
                                  Page #{thumb.pageNumber}
                                </span>
                                {thumb.width && thumb.height && (
                                  <span className="text-[9px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono">
                                    {thumb.width > thumb.height ? 'Landscape' : 'Portrait'}
                                  </span>
                                )}
                              </div>
                              {isSelected ? (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">bolt</span>
                                  <span>Compress (-{Math.round(presetSavingsRatio * 100)}%)</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">shield</span>
                                  <span>Original Quality</span>
                                </span>
                              )}
                            </div>

                            {/* Thumbnail Canvas Frame */}
                            <div className="p-2 flex items-center justify-center bg-slate-100 dark:bg-slate-900/40 min-h-[140px] relative">
                              <img
                                src={thumb.dataUrl}
                                alt={`Page ${thumb.pageNumber}`}
                                className={`max-h-48 w-auto object-contain rounded shadow-xs drop-shadow-xs transition-opacity ${
                                  !isSelected ? 'opacity-70 group-hover:opacity-100' : ''
                                }`}
                              />
                              {!isSelected && scope === 'selected' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="bg-slate-900/75 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-xs flex items-center gap-1 shadow">
                                    <span className="material-symbols-outlined text-[12px]">lock</span>
                                    <span>Untouched</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Page Content Telemetry Footer */}
                            {bloatAudit?.pageStats?.[thumb.pageNumber - 1] && (
                              <div className="px-2.5 py-1 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                                {bloatAudit.pageStats[thumb.pageNumber - 1].isHeavy ? (
                                  <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate max-w-[130px]">
                                    <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                                    <span>Image Content (~{formatFileSize(bloatAudit.pageStats[thumb.pageNumber - 1].imageBytes)})</span>
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-tertiary)] font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">article</span>
                                    <span>Native Text</span>
                                  </span>
                                )}
                                <span className="text-[var(--text-tertiary)] font-mono text-[9px]">
                                  {formatFileSize(bloatAudit.pageStats[thumb.pageNumber - 1].approxBytes)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Load Remaining Thumbnails Button if > 30 Pages */}
                    {totalPages > pageThumbnails.length && (
                      <div className="flex justify-center p-4">
                        <button
                          type="button"
                          onClick={handleLoadAllThumbnails}
                          disabled={loadingMoreThumbnails}
                          className="h-9 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed select-none"
                        >
                          {loadingMoreThumbnails ? (
                            <>
                              <span className="material-symbols-outlined text-[16px] animate-spin text-[var(--color-primary)]">progress_activity</span>
                              <span>Loading remaining {totalPages - pageThumbnails.length} pages...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">visibility</span>
                              <span>Load All {totalPages} Page Thumbnails ({totalPages - pageThumbnails.length} remaining)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[36px] mb-2 opacity-50">search_off</span>
                    <span className="text-xs font-semibold">No pages matching filter</span>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">compress</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Compression Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {files.length} {files.length === 1 ? 'File' : 'Files'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* ========================================================================= */}
                {/* PANEL 1: Compression Profile & Size Budget                                */}
                {/* ========================================================================= */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3.5 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">tune</span>
                      <span>Profile & Budget</span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      {strategy === 'preset' ? 'Quality Mode' : 'Portal Mode'}
                    </span>
                  </div>

                  {/* Mode Switcher */}
                  <div className="flex items-center bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setStrategy('preset')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        strategy === 'preset'
                          ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">tune</span>
                      <span>Presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStrategy('target')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        strategy === 'target'
                          ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">flag</span>
                      <span>Fit to Size</span>
                    </button>
                  </div>

                  {strategy === 'target' ? (
                    /* Target File Size Mode (Fit to Portal) */
                    <div className="flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                      {/* Portal Presets */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Portal Presets
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PORTAL_TARGET_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleApplyPortalPreset(p)}
                              className={`p-2 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                                selectedPresetId === p.id && targetSizeBytes === p.targetBytes
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-xs'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
                              }`}
                              title={p.description}
                            >
                              <span className="text-[11px] font-bold truncate">{p.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">{p.label} Max</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Target Input */}
                      <div className="flex flex-col gap-2 p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl">
                        <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-secondary)]">
                          <span>Target Limit</span>
                          {isTargetBelowLimit ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">warning</span>
                              Below Floor
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[var(--color-primary)]">
                              Max ≤ {targetSizeInput} {targetUnit}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={targetSizeInput}
                              onChange={(e) => {
                                setTargetSizeInput(e.target.value);
                                setSelectedPresetId('');
                              }}
                              className={`w-full pl-3 pr-2 py-1.5 text-xs font-bold rounded-lg outline-none shadow-xs transition-colors ${
                                isTargetBelowLimit
                                  ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-900 dark:text-amber-200 focus:border-amber-600'
                                  : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--color-primary)]'
                              }`}
                              placeholder="e.g. 2.0"
                            />
                          </div>
                          <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
                            <button
                              type="button"
                              onClick={() => setTargetUnit('MB')}
                              className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                targetUnit === 'MB' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              MB
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetUnit('KB')}
                              className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                targetUnit === 'KB' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              KB
                            </button>
                          </div>
                        </div>

                        {/* Live Compliance Feedback */}
                        {targetParams && (
                          <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                            {targetParams.isAlreadyWithinTarget ? (
                              <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Already within target ({formatFileSize(files[activeFileIndex]?.size || 0)})</span>
                              </div>
                            ) : (
                              <div className="text-[var(--text-secondary)] flex flex-col gap-0.5">
                                <div className="flex justify-between font-semibold">
                                  <span>Required Reduction:</span>
                                  <span className="text-[var(--color-primary)] font-bold">~{targetParams.requiredReductionPct}%</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
                                  <span>Portal Safety Margin:</span>
                                  <span>{formatFileSize(targetParams.safeTargetBytes)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Feasibility Spectrum */}
                      {recommendedRange && totalOriginalSize > 0 && (
                        <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                            <span>Feasibility Spectrum</span>
                            <span className={isTargetBelowLimit ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                              {isTargetBelowLimit ? 'Floor Limit Reached' : 'Achievable'}
                            </span>
                          </div>
                          <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${Math.min(100, Math.max(8, (recommendedRange.absoluteFloorBytes / totalOriginalSize) * 100))}%` }}
                              className="h-full bg-amber-500/50"
                              title={`Floor Limit: ${formatFileSize(recommendedRange.absoluteFloorBytes)}`}
                            />
                            <div
                              style={{ width: `${Math.min(100, Math.max(12, ((recommendedRange.maxRecommendedBytes - recommendedRange.absoluteFloorBytes) / totalOriginalSize) * 100))}%` }}
                              className="h-full bg-emerald-500/60"
                              title="Recommended Target Zone"
                            />
                            <div className="flex-1 h-full bg-blue-500/30" title="Conservative Compression" />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-[var(--text-tertiary)] font-mono">
                            <span>Floor: {formatFileSize(recommendedRange.absoluteFloorBytes)}</span>
                            <span>Rec: {formatFileSize(recommendedRange.minRecommendedBytes)}</span>
                            <span>Orig: {formatFileSize(totalOriginalSize)}</span>
                          </div>
                        </div>
                      )}

                      {/* Compression Limiter Guard Alert & Snap to Safe Floor */}
                      {isTargetBelowLimit && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left flex flex-col gap-2.5 animate-[fadeIn_0.15s_ease-out]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                              <span className="material-symbols-outlined text-[17px]">block</span>
                              <span>Target size is below compression limit</span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200">
                              Protected
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                            This document requires at least <strong className="text-[var(--text-primary)]">{formatFileSize(recommendedRange.absoluteFloorBytes)}</strong> to maintain font layouts and readable text. Compressing below this floor is blocked to prevent file corruption.
                          </p>

                          <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const floor = recommendedRange.absoluteFloorBytes;
                                if (floor >= 1024 * 1024) {
                                  setTargetUnit('MB');
                                  setTargetSizeInput((floor / (1024 * 1024)).toFixed(1));
                                } else {
                                  setTargetUnit('KB');
                                  setTargetSizeInput(Math.round(floor / 1024).toString());
                                }
                                setSelectedPresetId('');
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                              title="Set target to maximum achievable compression limit"
                            >
                              <span className="material-symbols-outlined text-[15px]">tune</span>
                              <span>Snap to Safe Floor ({formatFileSize(recommendedRange.absoluteFloorBytes)})</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Preset Buttons */
                    <div className="flex flex-col gap-2 animate-[fadeIn_0.15s_ease-out]">
                      {/* Extreme */}
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('extreme')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          preset === 'extreme'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            preset === 'extreme'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--text-tertiary)]'
                          }`}
                        >
                          {preset === 'extreme' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">Extreme Compression</span>
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              ~85% Smaller
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Maximum reduction for tight upload limits. 96 DPI image resampling with 100% sharp text.
                          </p>
                        </div>
                      </button>

                      {/* Recommended */}
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('recommended')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          preset === 'recommended'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            preset === 'recommended'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--text-tertiary)]'
                          }`}
                        >
                          {preset === 'recommended' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">Recommended</span>
                            <span className="text-[10px] font-extrabold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                              ~65% Smaller
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Balanced optimization with 144 DPI resampling. Ideal for resumes and business files.
                          </p>
                        </div>
                      </button>

                      {/* Low Compression (High Quality) */}
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('low')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          preset === 'low'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            preset === 'low'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                              : 'border-[var(--text-tertiary)]'
                          }`}
                        >
                          {preset === 'low' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">High Quality (Low Comp.)</span>
                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              ~35% Smaller
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Archival grade stream optimization with 200 DPI image preservation.
                          </p>
                        </div>
                      </button>

                      {/* Custom Quality Dial */}
                      <button
                        type="button"
                        onClick={() => setPreset('custom')}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          preset === 'custom'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)]">tune</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">Custom Quality Dial</span>
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                          {Math.round(quality * 100)}% Quality
                        </span>
                      </button>

                      {/* Custom Dial Sliders */}
                      {preset === 'custom' && (
                        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-3 animate-[fadeIn_0.15s_ease-out]">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[var(--text-secondary)]">JPEG Quality</span>
                              <span className="text-[var(--color-primary)] font-bold">{Math.round(quality * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="0.95"
                              step="0.05"
                              value={quality}
                              onChange={(e) => setQuality(parseFloat(e.target.value))}
                              className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[var(--text-secondary)]">DPI Scale</span>
                              <span className="text-[var(--color-primary)] font-bold">{scale}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.1"
                              value={scale}
                              onChange={(e) => setScale(parseFloat(e.target.value))}
                              className="w-full h-1 accent-[var(--color-primary)] cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estimated Size Savings Footer inside Section 1 */}
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <span>Estimated Output</span>
                      {scope === 'selected' && totalPages > 0 && (
                        <span className="text-[9px] font-bold bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                          Weighted ({selectedPages.size}/{totalPages})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-secondary)]">Current Size</span>
                        <span className="font-bold text-[var(--text-primary)]">{formatFileSize(totalOriginalSize)}</span>
                      </div>
                      <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-secondary)]">Est. New Size</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatFileSize(estimatedNewSize)} (~{Math.round(estimatedSavingsRatio * 100)}% saved)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* PANEL 2: Document Intelligence & Pre-Flight Telemetry                     */}
                {/* ========================================================================= */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3.5 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">analytics</span>
                      <span>Document Intelligence</span>
                    </div>
                    {bloatAudit && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          bloatAudit.isVectorHeavy
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : bloatAudit.heavyPages?.length > 0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {bloatAudit.isVectorHeavy
                          ? 'Text & Graphics'
                          : bloatAudit.heavyPages?.length > 0
                          ? `${bloatAudit.heavyPages.length} Heavy Pages`
                          : 'Balanced Content'}
                      </span>
                    )}
                  </div>

                  {/* Telemetry Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-secondary)]">Image Streams</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {bloatAudit
                          ? ((bloatAudit.totalRasterBytes ?? bloatAudit.totalImageBytes ?? 0) > 0
                              ? formatFileSize(bloatAudit.totalRasterBytes ?? bloatAudit.totalImageBytes)
                              : '0 B (Vector Only)')
                          : 'Scanning...'}
                      </span>
                    </div>
                    <div className="flex flex-col p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-secondary)]">Total Pages</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                  </div>

                  {/* Scope & Assembly Breakdown */}
                  {files.length === 1 && totalPages > 0 && (
                    <div className="flex flex-col gap-1.5 p-2.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                          Scope Summary
                        </span>
                        <span className="text-[10px] font-extrabold text-[var(--color-primary)]">
                          {scope === 'selected' ? `${selectedPages.size} Selected` : 'All Pages'}
                        </span>
                      </div>
                      {scope === 'selected' ? (
                        <div className="flex flex-col gap-1 text-[11px] text-[var(--text-secondary)]">
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                              Pages to Compress:
                            </span>
                            <span className="font-bold text-[var(--text-primary)]">{selectedPages.size} of {totalPages}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-blue-600 dark:text-blue-400">shield</span>
                              Untouched (Lossless):
                            </span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{Math.max(0, totalPages - selectedPages.size)} pages</span>
                          </div>
                          <div className="pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] text-[var(--color-primary)]">call_merge</span>
                            <span>Sequential 1 &rarr; {totalPages} order preserved</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          Uniform stream compression applied across all {totalPages} pages.
                        </span>
                      )}
                    </div>
                  )}

                  {/* 100% Searchable Text & ATS Safe Pill */}
                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      verified
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">
                        100% Searchable Text Guarantee
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                        Selectable text, fonts, and ATS keywords remain completely crisp, searchable, and intact.
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* PANEL 3: Advanced Optimizations & Output Filename                         */}
                {/* ========================================================================= */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3.5 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">settings</span>
                      <span>Advanced Settings</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <label className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Optimize Object Streams</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Compress cross-references</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={losslessStream}
                        onChange={(e) => setLosslessStream(e.target.checked)}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Strip Metadata</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Remove author & printer tags</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripMetadata}
                        onChange={(e) => setStripMetadata(e.target.checked)}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Auto-Enhance Scans</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Sharpen text & boost contrast</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoEnhance}
                        onChange={(e) => setAutoEnhance(e.target.checked)}
                        className="accent-[var(--color-primary)] cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Output Filename */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Output File Name
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={outputFileName}
                        onChange={(e) => {
                          userCustomNameRef.current = !!e.target.value.trim();
                          setOutputFileName(e.target.value);
                        }}
                        placeholder={files.length > 1 ? 'compressed_bundle.zip' : 'document_compressed.pdf'}
                        className="w-full pl-3 pr-10 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none shadow-xs font-medium"
                      />
                      <span className="absolute right-2.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono pointer-events-none">
                        {files.length > 1 ? '.zip' : '.pdf'}
                      </span>
                    </div>
                  </div>
                </div>


                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={processing || files.length === 0 || isTargetBelowLimit || (scope === 'selected' && selectedPages.size === 0)}
                  title={
                    isTargetBelowLimit
                      ? `Target size is below the maximum compression limit (${formatFileSize(recommendedRange?.absoluteFloorBytes || 0)}). Please increase target size.`
                      : ''
                  }
                  className={`w-full py-3 px-4 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                    isTargetBelowLimit
                      ? 'bg-amber-600/80 hover:bg-amber-600/80 border border-amber-500/30 text-amber-100 cursor-not-allowed opacity-80 shadow-none'
                      : 'bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--color-primary)]/25 cursor-pointer'
                  }`}
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Compressing ({progress}%)...</span>
                    </>
                  ) : isTargetBelowLimit ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">block</span>
                      <span>Target Below Limit (Min: {formatFileSize(recommendedRange?.absoluteFloorBytes || 0)})</span>
                    </>
                  ) : scope === 'selected' ? (
                    selectedPages.size === 0 ? (
                      <>
                        <span className="material-symbols-outlined text-[18px]">touch_app</span>
                        <span>Select Pages to Compress</span>
                      </>
                    ) : (
                      <>
                        <span>Compress {selectedPages.size} {selectedPages.size === 1 ? 'Page' : 'Pages'} & Merge</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>{files.length > 1 ? `Compress ${files.length} PDFs` : 'Compress Entire PDF'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 overflow-y-auto max-h-full">
          <div className="max-w-xl w-full p-6 sm:p-10 my-auto bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Successfully Compressed!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Document streams optimized and file size reduced drastically.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">
                  {result.isBatch ? 'folder_zip' : 'description'}
                </span>
                <span className="truncate max-w-[220px]">{result.name}</span>
              </div>
            </div>

            {/* Executive Storage Savings Meter */}
            <div className="w-full p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Reclaimed Space
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatFileSize(Math.max(0, result.originalSize - result.newSize))} Saved ({result.savings}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-full">
                  <span className="material-symbols-outlined text-[16px]">trending_down</span>
                  <span>{result.savings}% Smaller</span>
                </div>
              </div>

              {/* Animated Visual Savings Bar */}
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(5, result.savings))}%` }}
                  title={`${result.savings}% saved`}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-sans">ORIGINAL:</span>
                  <span className="font-bold text-[var(--text-primary)]">{formatFileSize(result.originalSize)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-sans">FINAL:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatFileSize(result.newSize)}</span>
                </div>
              </div>
            </div>

            {/* Selective Compression Sequential Audit Badge */}
            {result.scope === 'selected' && (
              <div className="w-full p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">call_merge</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    Selective Hybrid Compression Applied
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {result.selectedPagesCount} {result.selectedPagesCount === 1 ? 'page' : 'pages'} compressed
                    </span>
                    {' · '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {result.untouchedPagesCount} {result.untouchedPagesCount === 1 ? 'page' : 'pages'} preserved at original quality
                    </span>
                    {' · '}
                    <span>Sequential order preserved (1 to {result.totalPages})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Target File Size Compliance Badge */}
            {result.targetSizeBytes && (
              <div
                className={`w-full p-4 rounded-2xl flex flex-col gap-3 text-left ${
                  (result.targetCompliant || result.isUltraCompact)
                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                    : 'bg-amber-500/5 border border-amber-500/25'
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      (result.targetCompliant || result.isUltraCompact)
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {(result.targetCompliant || result.isUltraCompact) ? 'task_alt' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between gap-2">
                      <span>Target Size Compliance</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          (result.targetCompliant || result.isUltraCompact)
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {(result.targetCompliant || result.isUltraCompact) ? 'PORTAL COMPLIANT' : 'OPTIMIZED MAXIMUM'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {(result.targetCompliant || result.isUltraCompact) ? (
                        <>
                          Compressed to <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatFileSize(result.newSize)}</span>, fitted within your target ceiling of <span className="font-bold">{formatFileSize(result.targetSizeBytes)}</span>. Ready for portal upload.
                        </>
                      ) : (
                        <>
                          This document is already reduced to its smallest sharp size of <span className="font-bold text-[var(--text-primary)]">{formatFileSize(result.newSize)}</span> ({result.savings}% smaller). Because it consists primarily of native text and font data, further compression without converting pages to high-efficiency images would compromise quality.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-Click Action to Force Sub-Target Portal Limit */}
                {!result.targetCompliant && !result.isUltraCompact && (
                  <div className="pt-2 border-t border-amber-500/20 w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      Strictly need under {formatFileSize(result.targetSizeBytes)} for portal upload?
                    </span>
                    <button
                      type="button"
                      disabled={isRecompressing}
                      onClick={handleForceUltraCompact}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isRecompressing ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          <span>Compressing ({progress}%)...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          <span>Fit Under {formatFileSize(result.targetSizeBytes)} (Ultra-Compact)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* In-Place Live Re-compression Progress Bar */}
                {isRecompressing && (
                  <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-1.5 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        {progressStage || 'Optimizing document to fit size limit...'}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Permanent Searchable Text & Quality Guarantee Badge */}
            <div className="w-full p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">verified</span>
              {result.isUltraCompact ? (
                <>
                  <span className="font-semibold text-[var(--text-primary)]">Portal-Ready Readability:</span>
                  <span>Carefully balanced to ensure every page remains clear and legible while strictly meeting upload limits.</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-[var(--text-primary)]">Searchable Text Guaranteed:</span>
                  <span>All fonts, selectable text, and ATS keywords are 100% preserved.</span>
                </>
              )}
            </div>

            {/* Action Buttons (2-Tier Industrial Hierarchy: Hero Download Row 1 + Dual 50/50 Secondary Actions Row 2) */}
            <div className="flex flex-col gap-3 w-full pt-2">
              <button
                type="button"
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[22px]">download</span>
                <span>{result.isBatch ? 'Download ZIP Archive' : 'Download Compressed PDF'}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-700/70 border border-emerald-400/30 font-mono">
                  {formatFileSize(result.newSize)}
                </span>
              </button>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Side-by-Side Quality Inspector Button */}
                {!result.isBatch && (result.blob || files.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    title="Open side-by-side high-precision visual fidelity inspector"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">compare</span>
                    <span>Inspect Quality</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetWorkspace}
                  className={`w-full py-2.5 px-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                    result.isBatch || (!result.blob && files.length === 0) ? 'sm:col-span-2' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  <span>Compress Another</span>
                </button>
              </div>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
                  </div>
                </Link>

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </Link>

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">view_module</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reorder pages</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Quality Inspector Modal */}
      <QualityInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        originalFile={files[activeFileIndex] || files[0]}
        compressedBlob={result?.blob}
        totalPages={result?.totalPages || totalPages || 1}
        documentName={result?.name || files[activeFileIndex]?.name || 'Document.pdf'}
        originalSize={result?.originalSize || files[activeFileIndex]?.size || 0}
        compressedSize={result?.newSize || 0}
      />

      {/* Dedicated Enterprise Progress & Diagnostics Pop-Up Modal */}
      <CompressionProgressModal
        isOpen={processing || isRecompressing}
        progress={progress}
        progressStage={progressStage}
        fileName={files[activeFileIndex]?.name || result?.name || 'document.pdf'}
        fileSize={files[activeFileIndex]?.size || result?.originalSize || 0}
        targetSizeBytes={strategy === 'target' ? targetSizeBytes : (result?.targetSizeBytes || null)}
        isBatch={files.length > 1}
        batchTotal={files.length}
        batchCurrent={activeFileIndex + 1}
        isRecompressing={isRecompressing}
      />
    </ToolPageLayout>
  );
}
