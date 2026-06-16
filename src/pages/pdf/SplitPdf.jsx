import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { splitPdf, getPdfPageCount, parseRange } from '../../engines/pdf/splitPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function SplitPdf() {
  const {
    files,
    setFiles,
    processing,
    setProcessing,
    progress,
    setProgress,
    result,
    setResult,
    error,
    setError,
    reset: baseReset,
  } = useFileProcessor();

  const [mode, setMode] = useState('all');
  const [range, setRange] = useState('');
  const [pageCount, setPageCount] = useState(0);

  const handleFilesChange = async (newFiles) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      try {
        const count = await getPdfPageCount(newFiles[0]);
        setPageCount(count);
        setError(null);
      } catch (err) {
        setPageCount(0);
        setError('Failed to read PDF pages. Please verify this is a valid PDF file.');
      }
    } else {
      setPageCount(0);
    }
  };

  const handleSplit = async () => {
    if (!files.length) return;
    setError(null);
    setResult(null);

    // Validation for range mode
    if (mode === 'range') {
      if (!range.trim()) {
        setError('Please enter a page range (e.g. 1-3, 5).');
        return;
      }
      const parsedIndices = parseRange(range, pageCount);
      if (parsedIndices.length === 0) {
        setError('Invalid page range or no matching pages found for this PDF.');
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    try {
      const res = await splitPdf(files[0], mode, range, setProgress);
      setResult(res);

      try {
        let saveBlob;
        let saveName;
        let saveType;
        if (res.blobs.length === 1) {
          saveBlob = res.blobs[0];
          saveName = res.names[0];
          saveType = res.blobs[0].type;
        } else {
          const zip = new JSZip();
          res.blobs.forEach((b, i) => zip.file(res.names[i], b));
          saveBlob = await zip.generateAsync({ type: 'blob' });
          saveName = `${files[0].name.replace(/\.[^.]+$/, '')}-split.zip`;
          saveType = 'application/zip';
        }
        await saveFile(saveName, saveBlob.size, saveType, 'Split PDF', saveBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Split failed');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    if (result.blobs.length === 1) {
      saveAs(result.blobs[0], result.names[0]);
    } else {
      const zip = new JSZip();
      result.blobs.forEach((b, i) => zip.file(result.names[i], b));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'split-pages.zip');
    }
  };

  const reset = () => {
    baseReset();
    setPageCount(0);
    setRange('');
    setMode('all');
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Split PDF Pages Online Free (Extract PDF Pages)" 
        description="Split PDF files online free of charge. Extract specific page ranges or split every page into a separate PDF. 100% private."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="split-pdf" size={48} />
        </div>
        <h1>Split PDF</h1>
        <p className="tool-page-subtitle">Extract pages or split a PDF into multiple files</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={handleFilesChange} />

          {pageCount > 0 && (
            <div className="options-panel">
              <div className="options-title">Split Options ({pageCount} pages detected)</div>
              <div className="options-row">
                <div className="option-group">
                  <label>Mode</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="all">Split every page</option>
                    <option value="range">Extract specific pages</option>
                  </select>
                </div>
                {mode === 'range' && (
                  <div className="option-group">
                    <label>Pages (e.g. 1-3, 5, 7-9)</label>
                    <input type="text" value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3, 5, 7-9" />
                  </div>
                )}
              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container"><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div></div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>Splitting... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleSplit} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Splitting...' : 'Split PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Split Complete!</div>
          <div className="result-info">{result.blobs.length} file{result.blobs.length > 1 ? 's' : ''} created</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download {result.blobs.length > 1 ? 'All (ZIP)' : ''}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Split Another</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
