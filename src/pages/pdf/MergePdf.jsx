import { useState, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import { mergePdfs } from '../../engines/pdf/mergePdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function MergePdf() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const dragIndexRef = useRef(null);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true); setProgress(0); setError(null); setResult(null);
    try {
      const blob = await mergePdfs(files, setProgress);
      setResult(blob);
      try {
        await saveFile('merged.pdf', blob.size, 'application/pdf', 'Merge PDFs', blob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Merge failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); setProgress(0); };
  
  // Custom Add Files Handler
  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length) {
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null;
  };
  
  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Drag and Drop handlers
  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = dragIndexRef.current;
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    setFiles(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      return updated;
    });
    dragIndexRef.current = null;
  };

  // Sorting
  const sortByName = () => {
    setFiles(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const sortBySize = () => {
    setFiles(prev => [...prev].sort((a, b) => b.size - a.size)); // Descending by default
  };
  
  const reverseOrder = () => {
    setFiles(prev => [...prev].reverse());
  };

  // Helper to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolPageLayout
      toolId="merge-pdf"
      title="Merge PDFs"
      description="Combine multiple PDF files into one document and arrange them in the exact order you want."
      suppressSwitcher={true}>
      
      {!result ? (
        <>
          {files.length === 0 ? (
            <FileDropzone accept=".pdf" multiple={true} files={files} setFiles={setFiles} />
          ) : (
            <>
              {/* Files Queue Workspace */}
              <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-y-auto mb-6">
                <div className="workspace-toolbar p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-primary)] rounded-t-xl">
                  <div className="flex gap-2">
                    <label className="btn btn-primary btn-sm cursor-pointer flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Add More Files
                      <input type="file" multiple accept=".pdf" className="hidden" onChange={handleAddFiles} />
                    </label>
                    <button className="btn btn-secondary btn-sm" onClick={reverseOrder} title="Reverse Order">
                      <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={sortByName} title="Sort by Name (A-Z)">
                      <span className="material-symbols-outlined text-[16px]">sort_by_alpha</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={sortBySize} title="Sort by Size (Largest to Smallest)">
                      <span className="material-symbols-outlined text-[16px]">data_usage</span>
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)]">
                    {files.length} Files Selected
                  </div>
                </div>

                <div className="workspace-canvas w-full flex-1 bg-[var(--bg-secondary)] p-6 rounded-b-xl border border-t-0 border-[var(--border-subtle)]">
                  <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        draggable={!processing}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className="file-card group relative flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl cursor-grab hover:border-[var(--color-primary)] hover:shadow-glow-primary transition-all duration-200"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className="material-symbols-outlined text-4xl text-red-500 fill">picture_as_pdf</span>
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold text-[var(--text-primary)] truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">drag_indicator</span>
                          <button
                            onClick={() => removeFile(idx)}
                            className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 hover:text-red-500 text-[var(--text-secondary)] rounded"
                            title="Remove file"
                          >
                            close
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {processing && (
                <div className="progress-container mb-6">
                  <div className="progress-bar-container">
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <p className="progress-status" style={{ marginTop: '0.5rem' }}>Merging PDFs... {progress}%</p>
                </div>
              )}

              {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>{error}</p>}

              <div className="action-bar">
                <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleMerge} disabled={files.length < 2 || processing}>
                  {processing && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{processing ? 'Merging...' : `Merge ${files.length} PDFs`}</span>
                </button>
              </div>
              {files.length === 1 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontSize: 'var(--font-size-sm)' }}>Add at least 2 PDFs to merge</p>}
            </>
          )}
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDFs Merged!</div>
          <div className="result-info">{files.length} files combined into one</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={() => saveAs(result, 'merged.pdf')}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Merged PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Merge More</span>
            </button>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
