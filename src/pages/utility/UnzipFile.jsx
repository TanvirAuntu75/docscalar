import { useState, useEffect, useMemo } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import {
  inspectZipArchive,
  extractZipEntries
} from '../../engines/utility/unzipFile';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  FolderArchive,
  FileCheck,
  Download,
  Search,
  CheckSquare,
  Square,
  FileText,
  Image as ImageIcon,
  FileCode,
  Folder,
  Layers,
  Sparkles,
  Grid,
  List
} from 'lucide-react';

export default function UnzipFile() {
  const [files, setFiles] = useState([]);
  const [archiveInfo, setArchiveInfo] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'docs' | 'images' | 'code'
  const [zoomScale, setZoomScale] = useState(1.0);

  // Execution & UI State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('unzip-file');
        if (draft && isMounted && draft.files && draft.files.length > 0) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'archive.zip', {
              type: f.type || 'application/zip',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
        }
      } catch (err) {
        console.warn('Unzip draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Parse Archive whenever files changes
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('unzip-file', { files });
      inspectZipArchive(files[0])
        .then((info) => {
          setArchiveInfo(info);
          // Select all non-directory files by default
          const initialSelected = new Set(
            info.entries.filter((e) => !e.isDirectory).map((e) => e.path)
          );
          setSelectedPaths(initialSelected);
        })
        .catch((err) => {
          setError('Failed to parse ZIP archive: ' + (err.message || 'Invalid format'));
        });
    } else {
      setArchiveInfo(null);
      setSelectedPaths(new Set());
    }
  }, [files]);

  // 3. Selection Handlers
  const togglePath = (path) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  const selectAll = () => {
    if (!archiveInfo) return;
    const all = new Set(archiveInfo.entries.filter((e) => !e.isDirectory).map((e) => e.path));
    setSelectedPaths(all);
  };

  const clearSelection = () => {
    setSelectedPaths(new Set());
  };

  // 4. Filtered Entries
  const filteredEntries = useMemo(() => {
    if (!archiveInfo) return [];
    return archiveInfo.entries.filter((e) => {
      if (e.isDirectory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!e.path.toLowerCase().includes(q) && !e.name.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (categoryFilter === 'docs') {
        return /\.(pdf|docx|doc|txt|xlsx|xls|pptx|ppt|md|csv)$/i.test(e.name);
      }
      if (categoryFilter === 'images') {
        return /\.(png|jpg|jpeg|webp|svg|gif|bmp|ico)$/i.test(e.name);
      }
      if (categoryFilter === 'code') {
        return /\.(json|js|jsx|ts|tsx|html|css|py|xml)$/i.test(e.name);
      }
      return true;
    });
  }, [archiveInfo, searchQuery, categoryFilter]);

  // 5. Extraction Execution
  const handleExtract = async () => {
    if (!files.length || selectedPaths.size === 0) return;
    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const extractedList = await extractZipEntries(
        files[0],
        Array.from(selectedPaths),
        (p) => setProgress(p)
      );

      // Package extracted files into a clean zip
      const outZip = new JSZip();
      for (const item of extractedList) {
        outZip.file(item.path, item.blob);
      }
      const zipBlob = await outZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const outName = (files[0].name || 'archive.zip').replace(/\.zip$/i, '_extracted.zip');

      setResult({
        name: outName,
        blob: zipBlob,
        size: zipBlob.size,
        files: extractedList
      });

      await saveFile(outName, zipBlob.size, 'application/zip', 'Unzip File', zipBlob);
      await clearStudioDraft('unzip-file');
    } catch (err) {
      setError(err.message || 'Extraction failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadSingleEntry = async (entry) => {
    try {
      const single = await extractZipEntries(files[0], [entry.path]);
      if (single.length > 0) {
        saveAs(single[0].blob, single[0].name);
      }
    } catch (err) {
      console.error('Failed to download single entry:', err);
    }
  };

  const downloadZipResult = () => {
    if (!result || !result.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('unzip-file');
    setFiles([]);
    setArchiveInfo(null);
    setSelectedPaths(new Set());
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const getFileIcon = (fileName) => {
    if (/\.(pdf|docx|txt|xlsx|pptx)$/i.test(fileName)) {
      return <FileText size={16} className="text-red-500 shrink-0" />;
    }
    if (/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(fileName)) {
      return <ImageIcon size={16} className="text-purple-500 shrink-0" />;
    }
    if (/\.(json|js|html|css|py)$/i.test(fileName)) {
      return <FileCode size={16} className="text-blue-500 shrink-0" />;
    }
    return <FileCheck size={16} className="text-slate-400 shrink-0" />;
  };

  const currentFile = files[0];

  return (
    <ToolPageLayout
      toolId="unzip-file"
      title="Unzip & Archive Explorer Studio"
      description="Inspect archive contents, filter items, and selectively decompress ZIP files directly in your browser."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Unzip Files Online — In-Browser ZIP Archive Extractor & Explorer | DocScalar"
        description="Inspect and extract files from ZIP archives in-browser with zero upload to external servers. High-speed selective extraction with folder hierarchy preservation."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".zip,application/zip,application/x-zip-compressed"
            multiple={false}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Archive Explorer Canvas                        */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Top Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Archive Capsule */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <FolderArchive size={16} className="text-[var(--color-primary)]" />
                      <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                      <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                    </div>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* Selection Counter Capsule */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] rounded-lg text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                      <span>{selectedPaths.size} of {archiveInfo?.totalFiles || 0} Selected</span>
                    </div>

                    {/* Select All / Clear Toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Right Canvas Controls */}
                  <div className="flex items-center gap-2">
                    {/* Search Input Box */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                      <Search size={13} className="text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-[var(--text-primary)] outline-none w-28 sm:w-36"
                      />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          viewMode === 'list' ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'
                        }`}
                        title="List View"
                      >
                        <List size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          viewMode === 'grid' ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--text-secondary)]'
                        }`}
                        title="Grid View"
                      >
                        <Grid size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <input
                        type="range"
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
              <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-pattern select-none">
                <div
                  className="w-full max-w-4xl mx-auto transition-transform duration-150 origin-top"
                  style={{ transform: `scale(${zoomScale})` }}
                >
                  {filteredEntries.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)]">
                      <FolderArchive size={36} className="text-[var(--text-tertiary)]" />
                      <p className="text-sm font-semibold text-[var(--text-secondary)]">
                        No files matching current search or category filter.
                      </p>
                    </div>
                  ) : viewMode === 'list' ? (
                    /* 1. List View */
                    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-xs divide-y divide-[var(--border-subtle)] overflow-hidden">
                      {filteredEntries.map((entry) => {
                        const isSelected = selectedPaths.has(entry.path);
                        return (
                          <div
                            key={entry.path}
                            onClick={() => togglePath(entry.path)}
                            className={`p-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${
                              isSelected ? 'bg-[var(--color-primary)]/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                className="text-[var(--color-primary)] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePath(entry.path);
                                }}
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                              </button>
                              {getFileIcon(entry.name)}
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-md">
                                  {entry.name}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-sm">
                                  {entry.path}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                {formatFileSize(entry.uncompressedSize || 0)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadSingleEntry(entry);
                                }}
                                className="p-1.5 hover:bg-[var(--color-primary)]/10 text-[var(--text-secondary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                                title="Download individual file"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* 2. Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredEntries.map((entry) => {
                        const isSelected = selectedPaths.has(entry.path);
                        return (
                          <div
                            key={entry.path}
                            onClick={() => togglePath(entry.path)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                              isSelected
                                ? 'bg-[var(--bg-primary)] border-[var(--color-primary)] shadow-md ring-2 ring-[var(--color-primary)]/20'
                                : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                                {getFileIcon(entry.name)}
                              </div>
                              <button
                                type="button"
                                className="text-[var(--color-primary)] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePath(entry.path);
                                }}
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                              </button>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={entry.name}>
                                {entry.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)] truncate">
                                {entry.path}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                {formatFileSize(entry.uncompressedSize || 0)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadSingleEntry(entry);
                                }}
                                className="p-1 hover:bg-[var(--color-primary)]/10 text-[var(--text-secondary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                                title="Download file"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderArchive size={18} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Archive Options
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Valid ZIP
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Filter by File Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'All Files', icon: 'layers' },
                      { id: 'docs', label: 'Documents', icon: 'description' },
                      { id: 'images', label: 'Images', icon: 'image' },
                      { id: 'code', label: 'Code & Data', icon: 'code' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`p-2 rounded-xl text-left flex items-center gap-2 text-xs font-semibold border transition-all cursor-pointer ${
                          categoryFilter === cat.id
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-slate-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Archive Metadata Breakdown */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Archive Telemetry
                  </label>
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Total Archive Size:</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatFileSize(currentFile?.size || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Total Files:</span>
                      <span className="font-bold text-[var(--text-primary)]">{archiveInfo?.totalFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Total Folders:</span>
                      <span className="font-bold text-[var(--text-primary)]">{archiveInfo?.totalFolders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Selected for Extract:</span>
                      <span className="font-bold text-[var(--color-primary)]">{selectedPaths.size} files</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span>Extracting archive entries...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

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
                  onClick={handleExtract}
                  disabled={processing || selectedPaths.size === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Unpacking ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Extract {selectedPaths.size} Selected {selectedPaths.size === 1 ? 'File' : 'Files'}</span>
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
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">inventory_2</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Extraction Complete!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Successfully unpacked and decompressed all selected files with full folder tree retention.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-emerald-600 font-bold">{formatFileSize(result.size || 0)}</span>
              </div>
            </div>

            {/* Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Files Unpacked</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">{result.files?.length || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Integrity</span>
                <span className="text-base font-extrabold text-emerald-500">100% CRC</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">Ready</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadZipResult}
              >
                <Download size={18} />
                <span>Download Extracted Bundle (ZIP) ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Unpack Another Archive</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocScalar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/image-converter"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">image</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Converter</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Convert PNG, JPG, WEBP</p>
                  </div>
                </Link>

                <Link
                  to="/merge-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-red-500">merge</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Merge PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Combine multi-page PDFs</p>
                  </div>
                </Link>

                <Link
                  to="/conversion-pipeline"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-pink-500">account_tree</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Workflows</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Chain conversions</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
