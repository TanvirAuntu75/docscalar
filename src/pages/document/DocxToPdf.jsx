import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link, useNavigate } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { docxToPdf, isLegacyDocFormat, extractDocxElements } from '../../engines/document/docxToPdf';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  FileText,
  Sparkles,
  Download,
  Zap,
  FileCheck,
  Layout,
  Archive,
  ArrowLeft,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function DocxToPdf() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [zoomScale, setZoomScale] = useState(1.0);
  const [docLoading, setDocLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isLegacyDoc, setIsLegacyDoc] = useState(false);
  const [docxTelemetry, setDocxTelemetry] = useState(null);
  const [renderCount, setRenderCount] = useState(0);

  // Conversion Configuration State
  const [engineMode, setEngineMode] = useState('server'); // 'client' | 'server'
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [outputFileName, setOutputFileName] = useState('');

  // Processing, Poller & Cancellation
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const previewContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const poller = useJobPoller(BACKEND_URL);

  // 1. Check Server Availability
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, {
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok && isMounted) {
          setBackendActive(true);
          setEngineMode('server');
        }
      } catch (e) {
        if (isMounted) {
          setBackendActive(false);
          setEngineMode('client');
        }
      }
    };
    checkServer();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('docx-to-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.docx', {
              type: f.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.orientation) setOrientation(draft.orientation);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('DOCX to PDF draft recovery notice:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0 && !result) {
      saveStudioDraft('docx-to-pdf', {
        files,
        engineMode,
        pageSize,
        orientation,
        outputFileName
      });
    }
  }, [files, engineMode, pageSize, orientation, outputFileName, result]);

  // 4. Render Live Word Document Preview using docx-preview
  useEffect(() => {
    if (files.length === 0) return;

    if (!previewContainerRef.current) {
      const frame = requestAnimationFrame(() => setRenderCount((c) => c + 1));
      return () => cancelAnimationFrame(frame);
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isMounted = true;

    const renderPreview = async () => {
      setDocLoading(true);
      setPreviewError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        if (!isMounted) return;

        // Check if legacy Word 97-2003 format
        const isLegacy = isLegacyDocFormat(arrayBuffer) || currentFile.name.toLowerCase().endsWith('.doc');
        setIsLegacyDoc(isLegacy);

        let telemetry = {
          paragraphsCount: 0,
          tablesCount: 0,
          estWords: 0,
          hasTables: false,
          format: isLegacy ? 'Word 97-2003 (.doc)' : 'OpenXML (.docx)'
        };

        let elements = [];
        if (!isLegacy) {
          // Extract telemetry from OpenXML package
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const docXmlFile = zip.file('word/document.xml');
            if (docXmlFile) {
              const xmlStr = await docXmlFile.async('string');
              elements = extractDocxElements(xmlStr);
              let pCount = 0;
              let tCount = 0;
              let wordCount = 0;
              elements.forEach((el) => {
                if (el.isTable) tCount++;
                else pCount++;
                if (el.text) {
                  const words = el.text.trim().split(/\s+/).filter(Boolean);
                  wordCount += words.length;
                }
              });
              telemetry = {
                paragraphsCount: pCount,
                tablesCount: tCount,
                estWords: wordCount,
                hasTables: tCount > 0,
                format: 'OpenXML (.docx)'
              };
            }
          } catch (zipErr) {
            console.warn('Docx telemetry extraction notice:', zipErr);
          }
        } else {
          setPreviewError('Legacy Word (.doc) format detected. Full Precision mode is recommended for complete formatting.');
          if (backendActive) setEngineMode('server');
        }

        if (isMounted) setDocxTelemetry(telemetry);

        if (!outputFileName || files.length > 1) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}.pdf`);
        }

        if (!isLegacy) {
          const { renderAsync } = await import('docx-preview');
          if (!isMounted) return;

          if (previewContainerRef.current) {
            previewContainerRef.current.innerHTML = '';
            try {
              await renderAsync(arrayBuffer, previewContainerRef.current, null, {
                className: 'docx',
                inWrapper: true,
                breakPages: true,
                useBase64URL: true,
                renderHeaders: true,
                renderFooters: true,
                renderFootnotes: true,
                renderEndnotes: true
              });
            } catch (renderErr) {
              console.warn('docx-preview renderAsync failed, rendering extracted content:', renderErr);
              if (previewContainerRef.current && elements.length > 0) {
                const escapeHtml = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                previewContainerRef.current.innerHTML = `
                  <div class="docx p-8 sm:p-12 bg-white text-slate-900 rounded-sm shadow-xl max-w-full">
                    ${elements.map(el => el.isTable 
                      ? `<div class="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs">[Table: ${el.rows?.length || 0} rows]</div>`
                      : `<p class="my-2 text-sm leading-relaxed text-slate-800">${escapeHtml(el.text)}</p>`
                    ).join('')}
                  </div>
                `;
              }
            }
          }
        } else {
          // Legacy .doc preview fallback
          if (previewContainerRef.current) {
            previewContainerRef.current.innerHTML = `
              <div class="docx p-12 bg-white text-center rounded-sm shadow-xl max-w-full">
                <span class="material-symbols-outlined text-[48px] text-amber-500 mb-2">description</span>
                <p class="font-bold text-slate-700">Legacy Word 97-2003 Document (.doc)</p>
                <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">Full Precision conversion will compile this document natively via LibreOffice.</p>
              </div>
            `;
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Live Word preview notice:', err);
          setPreviewError('Simplified preview active. The document will convert with full fidelity.');
        }
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };

    renderPreview();

    return () => {
      isMounted = false;
    };
  }, [files, activeFileIndex, backendActive, renderCount]);

  // 5. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            isBatch: false,
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/pdf', 'DOCX to PDF', blob);
          clearStudioDraft('docx-to-pdf');
        })
        .catch(() => {
          setResult({
            isBatch: false,
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Full Precision conversion could not be completed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Converting Word document with desktop rendering engine...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // 6. Cancel Active Conversion
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    poller.resetPoller();
    setProcessing(false);
    setProgress(0);
    setStatusMessage('');
    setError('Conversion cancelled by user.');
  };

  // 7. Execute Single or Batch DOCX to PDF Conversion
  const handleConvert = async (batchMode = false) => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);

    abortControllerRef.current = new AbortController();

    try {
      if (batchMode && files.length > 1) {
        // Multi-File Batch Conversion
        setStatusMessage(`Converting batch of ${files.length} Word documents...`);
        const zip = new JSZip();
        const convertedItems = [];

        for (let idx = 0; idx < files.length; idx++) {
          if (abortControllerRef.current?.signal?.aborted) {
            throw new Error('Batch conversion was cancelled.');
          }

          const currentDoc = files[idx];
          const baseName = currentDoc.name.replace(/\.[^.]+$/, '');
          const pdfName = `${baseName}.pdf`;
          const baseProgress = Math.round((idx / files.length) * 100);

          setStatusMessage(`Converting document ${idx + 1} of ${files.length}: ${currentDoc.name}`);
          setProgress(baseProgress + 2);

          let pdfBlob;
          if (engineMode === 'server' && backendActive) {
            const uploadData = await uploadFileSecure(BACKEND_URL, currentDoc);
            if (!uploadData.success) throw new Error(`Upload failed for ${currentDoc.name}`);

            const convertFormData = new FormData();
            convertFormData.append('file_id', uploadData.file_id);
            convertFormData.append('filename', uploadData.filename);
            convertFormData.append('target_format', 'pdf');

            const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, {
              method: 'POST',
              body: convertFormData
            });
            if (!convertRes.ok) throw new Error(`Failed to convert ${currentDoc.name}`);
            const convertData = await convertRes.json();

            // Poll synchronously for batch item
            let completed = false;
            let attempts = 0;
            while (!completed && attempts < 60) {
              await new Promise(r => setTimeout(r, 1000));
              attempts++;
              const stRes = await apiFetch(`${BACKEND_URL}/api/job/${convertData.job_id}/status`);
              if (stRes.ok) {
                const stData = await stRes.json();
                if (stData.status === 'finished') {
                  const downRes = await apiFetch(stData.download_url);
                  pdfBlob = await downRes.blob();
                  completed = true;
                } else if (stData.status === 'failed') {
                  throw new Error(stData.error || `Failed to convert ${currentDoc.name}`);
                }
              }
            }
            if (!pdfBlob) throw new Error(`Conversion timed out for ${currentDoc.name}`);
          } else {
            pdfBlob = await docxToPdf(
              currentDoc,
              { pageSize, orientation },
              (subPct) => {
                const docStep = Math.round((subPct / 100) * (90 / files.length));
                setProgress(Math.min(95, baseProgress + docStep));
              }
            );
          }

          zip.file(pdfName, pdfBlob);
          convertedItems.push({
            name: pdfName,
            blob: pdfBlob,
            size: pdfBlob.size
          });

          await saveFile(pdfName, pdfBlob.size, 'application/pdf', 'DOCX to PDF', pdfBlob);
        }

        setStatusMessage('Packaging batch ZIP archive...');
        setProgress(96);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `converted_pdf_documents_${Date.now()}.zip`;

        setProcessing(false);
        setResult({
          isBatch: true,
          zipBlob,
          name: zipName,
          size: zipBlob.size,
          items: convertedItems,
          engineMode
        });
        await clearStudioDraft('docx-to-pdf');
      } else {
        // Single Active File Conversion
        const file = files[activeFileIndex] || files[0];
        const rawName = outputFileName.trim();
        const finalName = rawName.endsWith('.pdf') ? rawName : `${rawName || file.name.replace(/\.[^.]+$/, '')}.pdf`;

        if (engineMode === 'server') {
          if (!backendActive) {
            throw new Error('Cloud conversion engine is currently offline. Please switch to Fast Mode.');
          }
          setStatusMessage('Preparing document for high-precision conversion...');
          const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
          if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed.');

          setProgress(35);
          setStatusMessage('Queueing PDF conversion task...');

          const convertFormData = new FormData();
          convertFormData.append('file_id', uploadData.file_id);
          convertFormData.append('filename', uploadData.filename);
          convertFormData.append('target_format', 'pdf');

          const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, {
            method: 'POST',
            body: convertFormData,
            signal: abortControllerRef.current.signal
          });

          if (!convertRes.ok) throw new Error('Failed to queue conversion task.');
          const convertData = await convertRes.json();
          poller.startPolling(convertData.job_id);
        } else {
          // Client Browser Engine
          setStatusMessage('Rendering Word document into PDF pages...');
          const pdfBlob = await docxToPdf(
            file,
            { pageSize, orientation },
            (p) => {
              setProgress(p);
              setStatusMessage(`Compiling PDF pages... ${p}%`);
            }
          );

          setProcessing(false);
          setResult({
            isBatch: false,
            blob: pdfBlob,
            name: finalName,
            size: pdfBlob.size,
            engineMode: 'client'
          });

          await saveFile(finalName, pdfBlob.size, 'application/pdf', 'DOCX to PDF', pdfBlob);
          await clearStudioDraft('docx-to-pdf');
        }
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during DOCX to PDF conversion.');
    }
  };

  const downloadFile = (item = null) => {
    if (!result) return;
    if (item && item.blob) {
      saveAs(item.blob, item.name);
      return;
    }
    if (result.isBatch && result.zipBlob) {
      saveAs(result.zipBlob, result.name);
    } else if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  // Return to workspace without clearing the file queue
  const handleReturnToWorkspace = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
  };

  const resetWorkspace = () => {
    clearStudioDraft('docx-to-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    setDocxTelemetry(null);
    poller.resetPoller();
  };

  return (
    <ToolPageLayout
      toolId="docx-to-pdf"
      title="Word to PDF"
      description="Convert Microsoft Word (.docx, .doc) documents into crisp, printable PDF files with layout preservation."
      files={files}
      setFiles={setFiles}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Word to PDF Converter Online — Convert DOCX to PDF | DocScalar"
        description="Convert Microsoft Word documents (.docx, .doc) to PDF with precision layout fidelity. Fast, encrypted conversion and desktop high-fidelity support."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative" role="region" aria-label="Word to PDF Workspace">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Document Viewport                               */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                        <select
                          aria-label="Active document selector"
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[180px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[220px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] rounded-lg text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                      <Layout size={13} className="text-[var(--color-primary)]" />
                      <span className="uppercase">{pageSize}</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span className="capitalize">{orientation}</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span className="text-[11px] text-[var(--color-primary)] flex items-center gap-1">
                        {engineMode === 'server' ? (
                          <>
                            <Sparkles size={12} />
                            <span>Full Precision</span>
                          </>
                        ) : (
                          <>
                            <Zap size={12} />
                            <span>Fast Mode</span>
                          </>
                        )}
                      </span>
                    </div>

                    {isLegacyDoc && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        DOC 97-2003
                      </span>
                    )}
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                      <input
                        type="range"
                        aria-label="Preview zoom scale"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label="Reset workspace"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas Stage */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center relative bg-pattern select-none">
                <div
                  className={`relative transition-all duration-200 origin-top flex flex-col items-center w-full ${
                    orientation === 'landscape' ? 'max-w-[1180px]' : 'max-w-[850px]'
                  }`}
                  style={{
                    transform: `scale(${zoomScale})`
                  }}
                >
                  {/* Loading Spinner Overlay */}
                  {docLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center min-h-[450px] gap-3 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs text-[var(--text-secondary)] rounded-sm border border-[var(--border-subtle)] shadow-xl">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      <span className="text-xs font-semibold">Reading Word document layout...</span>
                    </div>
                  )}

                  {previewError && (
                    <div className="w-full mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{previewError}</span>
                    </div>
                  )}

                  {/* docx-preview Host Container — always mounted so ref is never nullified */}
                  <div
                    ref={previewContainerRef}
                    data-orientation={orientation}
                    data-pagesize={pageSize}
                    className={`docx-preview-host w-full flex flex-col items-center docx-preview-${orientation} docx-preview-${pageSize}`}
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">picture_as_pdf</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    PDF Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  {files.length > 1 ? `${files.length} Files` : 'DOCX'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Pre-Flight Document Telemetry */}
                {docxTelemetry && (
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Document Format</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        isLegacyDoc
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}>
                        {docxTelemetry.format}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Est. Word Count</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {isLegacyDoc ? 'N/A (Binary)' : `~${docxTelemetry.estWords.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                      <span className="font-medium">Structure</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {isLegacyDoc ? 'Legacy Binary' : `${docxTelemetry.paragraphsCount} p / ${docxTelemetry.tablesCount} ${docxTelemetry.tablesCount === 1 ? 'tbl' : 'tbls'}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* 1. Conversion Engine */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Conversion Engine
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]" role="group" aria-label="Engine Mode">
                    <button
                      type="button"
                      aria-pressed={engineMode === 'client'}
                      onClick={() => setEngineMode('client')}
                      disabled={isLegacyDoc}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'client'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      } ${isLegacyDoc ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Zap size={14} />
                      <span>Fast Mode</span>
                      <span className={`text-[10px] ${engineMode === 'client' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Instant · Private</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={engineMode === 'server'}
                      onClick={() => setEngineMode('server')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'server'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Full Precision</span>
                      <span className={`text-[10px] ${engineMode === 'server' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>Native Layout</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] px-1">
                    {isLegacyDoc
                      ? 'Legacy Word 97-2003 format requires Full Precision mode.'
                      : engineMode === 'server'
                      ? 'Full layout fidelity using native document rendering.'
                      : 'Instant vector compiler for private offline execution.'}
                  </span>
                </div>

                {/* 2. Page Size */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Page Size
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]" role="group" aria-label="Page Size">
                    {[
                      { id: 'a4', label: 'A4 (210×297mm)' },
                      { id: 'letter', label: 'US Letter' }
                    ].map((ps) => (
                      <button
                        key={ps.id}
                        type="button"
                        aria-pressed={pageSize === ps.id}
                        onClick={() => setPageSize(ps.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          pageSize === ps.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ps.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Orientation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]" role="group" aria-label="Orientation">
                    {[
                      { id: 'portrait', label: 'Portrait' },
                      { id: 'landscape', label: 'Landscape' }
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={orientation === o.id}
                        onClick={() => setOrientation(o.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          orientation === o.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Output File Name (Single File Mode) */}
                {files.length === 1 && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Output PDF Name
                    </label>
                    <input
                      type="text"
                      aria-label="Custom output PDF name"
                      value={outputFileName}
                      onChange={(e) => setOutputFileName(e.target.value)}
                      placeholder="document.pdf"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]" aria-live="polite">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5 truncate max-w-[190px]">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        {statusMessage || 'Compiling PDF document...'}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="self-end text-[11px] text-red-500 hover:underline cursor-pointer font-semibold flex items-center gap-1 pt-1"
                    >
                      <XCircle size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Buttons */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleConvert(false)}
                  disabled={processing || files.length === 0 || (engineMode === 'server' && !backendActive)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Converting ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{files.length > 1 ? `Convert Active (${files[activeFileIndex]?.name.slice(0, 16)}...)` : 'Convert to PDF'}</span>
                    </>
                  )}
                </button>

                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleConvert(true)}
                    disabled={processing || (engineMode === 'server' && !backendActive)}
                    className="w-full py-2.5 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                  >
                    <Archive size={14} className="text-[var(--color-primary)]" />
                    <span>Convert All {files.length} Documents (ZIP)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              {result.isBatch ? <Archive size={40} /> : <span className="material-symbols-outlined text-[40px]">check_circle</span>}
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {result.isBatch ? 'Batch PDFs Created!' : 'PDF Document Created!'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {result.isBatch
                  ? `Successfully converted ${result.items.length} Word documents into standard PDF files.`
                  : 'Your Microsoft Word document has been converted into a high-fidelity PDF.'}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                  {result.isBatch ? 'Documents' : 'Page Size'}
                </span>
                <span className="text-base font-extrabold text-[var(--text-primary)] uppercase">
                  {result.isBatch ? result.items.length : pageSize}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Orientation</span>
                <span className="text-base font-extrabold text-[var(--color-primary)] capitalize">{orientation}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                  {result.engineMode === 'server' ? 'Full Precision' : 'Fast Mode'}
                </span>
              </div>
            </div>

            {/* Batch items list if applicable */}
            {result.isBatch && result.items && (
              <div className="w-full max-h-40 overflow-y-auto p-2 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col gap-1.5 text-left">
                {result.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-primary)] rounded-lg text-xs">
                    <span className="truncate max-w-[240px] font-medium text-[var(--text-primary)]">{it.name}</span>
                    <button
                      type="button"
                      onClick={() => downloadFile(it)}
                      className="text-[var(--color-primary)] hover:underline text-[11px] font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={() => downloadFile()}
              >
                <Download size={18} />
                <span>{result.isBatch ? 'Download All (ZIP)' : 'Download PDF'}</span>
              </button>

              {files.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[170px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                  onClick={handleReturnToWorkspace}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Documents</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[160px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>New Session</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3 text-center">
                Continue Working with Your PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/compress-pdf');
                      return;
                    }
                    const pdfFile = new File([result.blob], result.name || 'document.pdf', {
                      type: 'application/pdf'
                    });
                    navigate('/compress-pdf', { state: { initialFiles: [pdfFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/sign-pdf');
                      return;
                    }
                    const pdfFile = new File([result.blob], result.name || 'document.pdf', {
                      type: 'application/pdf'
                    });
                    navigate('/sign-pdf', { state: { initialFiles: [pdfFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!result?.blob) {
                      navigate('/edit-pdf');
                      return;
                    }
                    const pdfFile = new File([result.blob], result.name || 'document.pdf', {
                      type: 'application/pdf'
                    });
                    navigate('/edit-pdf', { state: { initialFiles: [pdfFile] } });
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">edit_document</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Edit PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Modify pages & text</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
