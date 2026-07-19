import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { apiFetch, uploadFileSecure, BACKEND_URL} from '../../utils/api';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { splitPdf as localSplitPdf } from '../../engines/pdf/splitPdf';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function SplitPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Split tabs state
  const [activeTab, setActiveTab] = useState('range'); // 'range' | 'extract' | 'size'
  
  // Tab 1: Range options
  const [rangeMode, setRangeMode] = useState('custom'); // 'custom' | 'fixed' | 'bookmarks' | 'blank'
  const [customRanges, setCustomRanges] = useState([{ id: 1, start: 1, end: 1 }]);
  const [fixedInterval, setFixedInterval] = useState(2);
  const [mergeRanges, setMergeRanges] = useState(false);

  // Tab 2: Extract options
  const [extractMode, setExtractMode] = useState('selected'); // 'all' | 'selected'
  const [selectedPages, setSelectedPages] = useState([]); // 0-indexed page indices
  const [mergeExtracted, setMergeExtracted] = useState(true);

  // Tab 3: Size options
  const [maxSizeMb, setMaxSizeMb] = useState(5);

  // PDF.js State for Preview
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const canvasRefs = useRef([]);
  const pdfInstanceRef = useRef(null);

  // Server state
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const poller = useJobPoller(BACKEND_URL);

  // Check server availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
        }
      } catch (e) {
        setBackendActive(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    checkServer();
  }, []);

  // Update PDF page count and render thumbnails in background
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setSelectedPages([]);
      setThumbnails([]);
      setCustomRanges([{ id: 1, start: 1, end: 1 }]);
      pdfInstanceRef.current = null;
      return;
    }

    if (activeFileIndex >= files.length) {
      setActiveFileIndex(0);
      return;
    }

    let isCancelled = false;

    const loadPdfThumbnails = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[activeFileIndex];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        pdfInstanceRef.current = pdf;
        const count = pdf.numPages;
        setTotalPages(count);
        
        // Default select all pages
        const allIndices = Array.from({ length: count }, (_, idx) => idx);
        setSelectedPages(allIndices);

        // Adjust default custom range end to last page
        setCustomRanges([{ id: 1, start: 1, end: count }]);
        
        const thumbs = Array.from({ length: count }, (_, idx) => idx + 1);
        setThumbnails(thumbs);
        setProcessing(false);

        // Render thumbnails sequentially
        setTimeout(async () => {
          for (let i = 1; i <= count; i++) {
            if (isCancelled) break;
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 0.25 });
              const canvas = canvasRefs.current[i - 1];
              if (canvas) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
              }
            } catch (err) {
              console.error(`Error rendering thumbnail for page ${i}:`, err);
            }
          }
        }, 100);

      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF pages. Please verify this is a valid PDF file.');
        }
      }
    };

    loadPdfThumbnails();

    return () => {
      isCancelled = true;
      if (pdfInstanceRef.current) {
        pdfInstanceRef.current.destroy();
      }
    };
  }, [files, activeFileIndex]);

  // Handle server job updates
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_split.zip`;
      
      setResult({
        downloadUrl: downloadUrl,
        name: finalName,
        filesCount: poller.result.filesCount || 2
      });

      // Save file history entry
      fetch(BACKEND_URL + downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/zip', 'Split PDF', blob).catch(err => {
            console.error('Failed to save to local workspace:', err);
          });
        })
        .catch(console.error);

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server Side split failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // Add/Remove Custom Range Rows
  const addCustomRange = () => {
    const nextId = customRanges.length > 0 ? Math.max(...customRanges.map(r => r.id)) + 1 : 1;
    setCustomRanges([...customRanges, { id: nextId, start: 1, end: totalPages }]);
  };

  const removeCustomRange = (id) => {
    setCustomRanges(customRanges.filter(r => r.id !== id));
  };

  const updateCustomRange = (id, field, val) => {
    setCustomRanges(customRanges.map(r => {
      if (r.id === id) {
        const intVal = parseInt(val) || 1;
        return { ...r, [field]: Math.max(1, Math.min(totalPages, intVal)) };
      }
      return r;
    }));
  };

  // Thumbnail bulk helpers
  const handleSelectAll = () => {
    setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx));
  };

  const handleSelectOdd = () => {
    setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx).filter(idx => idx % 2 === 0));
  };

  const handleSelectEven = () => {
    setSelectedPages(Array.from({ length: totalPages }, (_, idx) => idx).filter(idx => idx % 2 !== 0));
  };

  const handleClearSelection = () => {
    setSelectedPages([]);
  };

  const togglePageSelection = (idx) => {
    if (selectedPages.includes(idx)) {
      setSelectedPages(selectedPages.filter(p => p !== idx));
    } else {
      setSelectedPages([...selectedPages, idx].sort((a, b) => a - b));
    }
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null;
  };

  const handleSplit = async () => {
    if (!files.length) return;
    setError(null);
    setResult(null);

    // Resolve split parameters
    let modeArg = 'all';
    let rangeArg = '';
    let extraArg = {};

    if (activeTab === 'range') {
      if (rangeMode === 'custom') {
        modeArg = 'custom-ranges';
        // Map custom range array to backend list
        const rangesList = customRanges.map(r => [r.start, r.end]);
        rangeArg = JSON.stringify(rangesList);
        extraArg = { merge_ranges: mergeRanges };
      } else if (rangeMode === 'fixed') {
        modeArg = 'fixed-ranges';
        rangeArg = String(fixedInterval);
      } else if (rangeMode === 'bookmarks') {
        modeArg = 'by-bookmarks';
      } else if (rangeMode === 'blank') {
        modeArg = 'by-blank-page';
      }
    } else if (activeTab === 'extract') {
      if (extractMode === 'all') {
        modeArg = 'all';
      } else {
        modeArg = 'select-pages';
        // Convert to 1-based page list
        rangeArg = selectedPages.map(p => p + 1).join(',');
        extraArg = { merge_output: mergeExtracted };
        if (selectedPages.length === 0) {
          setError('Please select at least one page to extract.');
          return;
        }
      }
    } else if (activeTab === 'size') {
      modeArg = 'size-limit';
      extraArg = { max_bytes: maxSizeMb * 1024 * 1024 };
    }

    setProcessing(true);
    setProgress(0);

    // Execute Server Side or local fallback
    if (backendActive && ['custom-ranges', 'fixed-ranges', 'select-pages', 'size-limit', 'by-bookmarks', 'by-blank-page', 'all'].includes(modeArg)) {
      try {
        const file = files[activeFileIndex];
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        setProgress(30);

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('mode', modeArg);
        convertFormData.append('range', rangeArg);
        convertFormData.append('extra_params', JSON.stringify(extraArg));

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert/split-pdf`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) {
          throw new Error('Failed to queue split task on server.');
        }

        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);

      } catch (err) {
        console.warn('Backend split failed, falling back to local JS execution:', err);
        runLocalFallback(modeArg, rangeArg, extraArg);
      }
    } else {
      runLocalFallback(modeArg, rangeArg, extraArg);
    }
  };

  const runLocalFallback = async (modeArg, rangeArg, extraArg) => {
    try {
      let localMode = 'all';
      let localRange = '';

      if (modeArg === 'fixed-ranges') {
        localMode = 'equal-intervals';
        localRange = rangeArg;
      } else if (modeArg === 'custom-ranges') {
        localMode = 'range';
        // Parse list of lists back into string range format
        const list = JSON.parse(rangeArg);
        localRange = list.map(r => `${r[0]}-${r[1]}`).join(',');
      } else if (modeArg === 'select-pages') {
        localMode = 'range';
        localRange = rangeArg;
      } else if (modeArg === 'all') {
        localMode = 'all';
      } else {
        // Size limits, outline bookmarks, blank pages are server-only features
        throw new Error('Bookmark outline, size splitting, and blank page splits require connection to the backend server.');
      }

      setProgress(40);
      const res = await localSplitPdf(files[activeFileIndex], localMode, localRange, setProgress);
      setProgress(100);
      setProcessing(false);

      setResult({
        localResult: res,
        name: `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}-split.zip`,
        filesCount: res.blobs.length
      });

      // Save to indexDB
      let saveBlob;
      let saveName = `${files[activeFileIndex].name.replace(/\.[^.]+$/, '')}-split.zip`;
      if (res.blobs.length === 1) {
        saveBlob = res.blobs[0];
        saveName = res.names[0];
        await saveFile(saveName, saveBlob.size, saveBlob.type, 'Split PDF', saveBlob);
      } else {
        const zip = new JSZip();
        res.blobs.forEach((b, i) => zip.file(res.names[i], b));
        saveBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        await saveFile(saveName, saveBlob.size, 'application/zip', 'Split PDF', saveBlob);
      }

    } catch (err) {
      setError(err.message || 'Split failed');
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    if (result.downloadUrl) {
      // Backend result download
      saveAs(BACKEND_URL + result.downloadUrl, result.name);
    } else if (result.localResult) {
      // Local fallback download
      const { blobs, names } = result.localResult;
      if (blobs.length === 1) {
        saveAs(blobs[0], names[0]);
      } else {
        const zip = new JSZip();
        blobs.forEach((b, i) => zip.file(names[i], b));
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        saveAs(zipBlob, result.name);
      }
    }
  };

  const reset = () => {
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
    setTotalPages(0);
    setThumbnails([]);
  };

  return (
    <ToolPageLayout
      toolId="split-pdf"
      title="Split PDF"
      description="Extract specific pages, partition ranges, split by sizes, or divide outline bookmarks."
      files={files}
      onFileSwitch={() => {}}
      suppressSwitcher={true}
    >
      <SEOHead 
        title="Split PDF Pages Online Free - Advanced Split Options" 
        description="Split PDF pages online. Choose Custom Ranges, Fixed Intervals, Size-Based limits, or Visual selection grid thumbnail extractor. Fully responsive & private."
      />

      {!result ? (
        <>
          {files.length === 0 && (
            <FileDropzone accept=".pdf" multiple={true} files={files} setFiles={setFiles} />
          )}

          {files.length > 0 && totalPages > 0 && (
            <>
              {/* LEFT COLUMN: Visual Preview Grid / Canvas */}
              <div 
                className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto no-scrollbar relative"
              >
                <div className="sticky top-0 z-20 flex flex-col w-full shadow-sm bg-[var(--bg-primary)] px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
                  {/* Enhanced Header with Dropdown and Add Files */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {files.length > 1 ? (
                        <div className="flex flex-col">
                          <label className="text-xs text-[var(--text-tertiary)] font-bold uppercase mb-1">Active File</label>
                          <select 
                            value={activeFileIndex}
                            onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                            className="bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] text-[var(--text-primary)] px-2 py-1 rounded text-sm focus:outline-none focus:border-primary max-w-[200px]"
                          >
                            {files.map((f, i) => (
                              <option key={i} value={i}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <h3 className="font-semibold text-sm text-[var(--text-secondary)]">Document Pages ({totalPages} pages)</h3>
                      )}
                      
                      <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1 h-[32px] mt-auto">
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Add Files
                        <input type="file" multiple accept=".pdf" className="hidden" onChange={handleAddFiles} />
                      </label>
                    </div>

                    {activeTab === 'extract' && extractMode === 'selected' && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-dark text-white rounded transition">All</button>
                        <button onClick={handleSelectOdd} className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-bg-tertiary)] hover:bg-neutral text-[var(--text-primary)] border border-[color:var(--border-color)] rounded transition">Odd</button>
                        <button onClick={handleSelectEven} className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-bg-tertiary)] hover:bg-neutral text-[var(--text-primary)] border border-[color:var(--border-color)] rounded transition">Even</button>
                        <button onClick={handleClearSelection} className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-danger)] text-white rounded hover:bg-red-600 transition">Clear</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="workspace-canvas w-full">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '1.5rem',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {thumbnails.map((pageNum, idx) => {
                      const isSelected = selectedPages.includes(idx);
                      const showCheck = activeTab === 'extract' && extractMode === 'selected';
                      
                      return (
                        <div 
                          key={idx} 
                          onClick={() => showCheck && togglePageSelection(idx)}
                          className={`relative flex flex-col items-center p-3 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                            showCheck && isSelected 
                              ? 'border-[var(--color-primary)] shadow-glow-primary' 
                              : 'border-[color:var(--border-color)] bg-[var(--color-bg-primary)] hover:border-primary'
                          }`}
                        >
                          {showCheck && (
                            <div className={`absolute top-2 left-2 z-10 transition-colors`}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly
                                className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                              />
                            </div>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            minHeight: '140px',
                            alignItems: 'center',
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <canvas
                              ref={el => canvasRefs.current[idx] = el}
                              style={{
                                maxWidth: '90%',
                                maxHeight: '120px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                          
                          <span className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
                            Page {pageNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Settings Panel */}
              <div className="options-panel animate-[fadeIn_0.22s_ease-out]">
                
                {/* Tabs Selector */}
                <div className="bg-[var(--color-bg-secondary)] border border-[color:var(--border-color)] rounded-xl p-1.5 flex gap-1 mb-5">
                  <button 
                    onClick={() => setActiveTab('range')} 
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === 'range' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Ranges
                  </button>
                  <button 
                    onClick={() => setActiveTab('extract')} 
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === 'extract' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Extract
                  </button>
                  <button 
                    onClick={() => setActiveTab('size')} 
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      activeTab === 'size' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Size Limit
                  </button>
                </div>

                {/* Settings Panel Content */}
                <div className="flex flex-col gap-5">
                  
                  {/* TAB 1: RANGE SPLITTING OPTIONS */}
                  {activeTab === 'range' && (
                    <>
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Range Mode</label>
                        <select 
                          value={rangeMode} 
                          onChange={(e) => setRangeMode(e.target.value)}
                          className="bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="custom">Custom Ranges</option>
                          <option value="fixed">Fixed Ranges</option>
                          <option value="bookmarks">Split by Bookmarks</option>
                          <option value="blank">Split at Blank Pages</option>
                        </select>
                      </div>

                      {rangeMode === 'custom' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Custom Ranges</label>
                            <button 
                              onClick={addCustomRange} 
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              + Add Range
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {customRanges.map((r, i) => (
                              <div key={r.id} className="flex items-center gap-2 bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] rounded-lg p-2">
                                <span className="text-xs text-[var(--text-secondary)] font-medium">#{i + 1}</span>
                                <div className="flex items-center gap-1.5 flex-1">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max={totalPages} 
                                    value={r.start} 
                                    onChange={(e) => updateCustomRange(r.id, 'start', e.target.value)}
                                    className="w-14 bg-[var(--color-bg-secondary)] border border-[color:var(--border-color)] rounded text-xs px-1.5 py-1 text-center focus:outline-none focus:border-primary"
                                  />
                                  <span className="text-xs text-[var(--text-secondary)]">to</span>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max={totalPages} 
                                    value={r.end} 
                                    onChange={(e) => updateCustomRange(r.id, 'end', e.target.value)}
                                    className="w-14 bg-[var(--color-bg-secondary)] border border-[color:var(--border-color)] rounded text-xs px-1.5 py-1 text-center focus:outline-none focus:border-primary"
                                  />
                                </div>
                                {customRanges.length > 1 && (
                                  <button 
                                    onClick={() => removeCustomRange(r.id)} 
                                    className="p-1 text-[var(--color-danger)] hover:bg-[var(--color-bg-secondary)] rounded transition"
                                  >
                                    <span className="material-symbols-outlined text-[16px] select-none">delete</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-[var(--text-secondary)]">
                            <input 
                              type="checkbox" 
                              checked={mergeRanges} 
                              onChange={(e) => setMergeRanges(e.target.checked)} 
                              className="rounded border-[color:var(--border-color)] text-primary focus:ring-primary w-4 h-4"
                            />
                            <span>Merge all ranges into one PDF</span>
                          </label>
                        </div>
                      )}

                      {rangeMode === 'fixed' && (
                        <div className="flex flex-col gap-3">
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pages Per Split File</label>
                          <input 
                            type="number" 
                            min="1" 
                            max={totalPages} 
                            value={fixedInterval} 
                            onChange={(e) => setFixedInterval(Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                          <p className="text-xs text-[var(--text-secondary)]">
                            Splits the document into files of {fixedInterval} pages each.
                          </p>
                        </div>
                      )}

                      {(rangeMode === 'bookmarks' || rangeMode === 'blank') && (
                        <div className="flex flex-col gap-2">
                          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg p-3 text-xs flex gap-2">
                            <span className="material-symbols-outlined text-[16px] select-none mt-0.5">info</span>
                            <span>
                              {rangeMode === 'bookmarks' 
                                ? 'Splits the PDF at every bookmark in the Table of Contents outline.'
                                : 'Detects blank separator pages and splits the content pages between them.'}
                            </span>
                          </div>
                          {!backendActive && (
                            <p className="text-xs text-[var(--color-danger)] font-medium mt-1">
                              ⚠️ Requires backend connection to run bookmarks or blank page split.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* TAB 2: EXTRACT PAGES OPTIONS */}
                  {activeTab === 'extract' && (
                    <>
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Extraction Mode</label>
                        <select 
                          value={extractMode} 
                          onChange={(e) => setExtractMode(e.target.value)}
                          className="bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="selected">Extract Selected Pages</option>
                          <option value="all">Extract All Pages (1-page files)</option>
                        </select>
                      </div>

                      {extractMode === 'selected' && (
                        <div className="flex flex-col gap-3">
                          <div className="text-xs text-[var(--text-secondary)] font-semibold">
                            Selected: <strong className="text-primary">{selectedPages.length}</strong> of {totalPages} pages
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-[var(--text-secondary)]">
                            <input 
                              type="checkbox" 
                              checked={mergeExtracted} 
                              onChange={(e) => setMergeExtracted(e.target.checked)} 
                              className="rounded border-[color:var(--border-color)] text-primary focus:ring-primary w-4 h-4"
                            />
                            <span>Merge extracted pages into one PDF</span>
                          </label>
                        </div>
                      )}

                      {extractMode === 'all' && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          Extracts every page in the document as a separate, single-page PDF file.
                        </p>
                      )}
                    </>
                  )}

                  {/* TAB 3: SIZE LIMIT SPLITTING OPTIONS */}
                  {activeTab === 'size' && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Max File Size (MB)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={maxSizeMb} 
                        onChange={(e) => setMaxSizeMb(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-[var(--color-bg-primary)] border border-[color:var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      <p className="text-xs text-[var(--text-secondary)]">
                        Partitions the document into files so that no single output PDF exceeds {maxSizeMb} MB.
                      </p>
                      {!backendActive && (
                        <p className="text-xs text-[var(--color-danger)] font-medium mt-1">
                          ⚠️ Requires backend connection to calculate page size limits.
                        </p>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Progress Container inside Sidebar */}
              {processing && (
                <div className="progress-container flex flex-col gap-2">
                  <div className="progress-bar-container w-full bg-[var(--color-bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                    <div className="progress-bar-fill bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="progress-status text-xs text-center text-[var(--text-secondary)]">Splitting... {progress}%</p>
                </div>
              )}

              {/* Error messages inside sidebar */}
              {error && (
                <p className="text-xs text-[var(--color-danger)] text-center font-semibold" style={{ gridColumn: '2', gridRow: '5', padding: '0 1.5rem', margin: '0' }}>
                  {error}
                </p>
              )}

              {/* ACTION BAR inside Sidebar */}
              <div className="action-bar">
                <button 
                  onClick={handleSplit} 
                  disabled={processing || (activeTab === 'extract' && extractMode === 'selected' && selectedPages.length === 0)}
                  className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 btn-lg"
                >
                  {processing && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{processing ? 'Processing...' : 'Split PDF'}</span>
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="result-area max-w-md mx-auto bg-[var(--color-bg-secondary)] border border-[color:var(--border-color)] rounded-xl p-8 text-center flex flex-col items-center gap-4 mt-8 animate-[fadeIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-[64px] text-green-500 select-none">check_circle</span>
          <h2 className="text-xl font-bold">Split Complete!</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Successfully generated {result.filesCount} separate PDF file{result.filesCount > 1 ? 's' : ''}.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <button className="btn btn-success flex-1 py-3 flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download ZIP</span>
            </button>
            <button className="btn btn-secondary py-3 px-4 flex items-center justify-center" onClick={reset}>
              <span className="material-symbols-outlined text-[20px] select-none">restart_alt</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
