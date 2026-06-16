import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { pdfToImages } from '../../engines/pdf/pdfToImage';
import { formatFileSize } from '../../utils/constants';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function PdfToImage() {
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
    reset,
    createSafeObjectURL
  } = useFileProcessor();

  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const { blobs, names } = await pdfToImages(files[0], { format, quality, scale }, setProgress);
      // Pre-generate object URLs for the first 4 pages for rendering previews
      const urls = blobs.slice(0, 4).map((blob) => createSafeObjectURL(blob));
      setResult({ blobs, names, urls });

      try {
        let saveBlob;
        let saveName;
        let saveType;
        if (blobs.length === 1) {
          saveBlob = blobs[0];
          saveName = names[0];
          saveType = blobs[0].type;
        } else {
          const zip = new JSZip();
          blobs.forEach((b, i) => zip.file(names[i], b));
          saveBlob = await zip.generateAsync({ type: 'blob' });
          saveName = `${files[0].name.replace(/\.[^.]+$/, '')}-images.zip`;
          saveType = 'application/zip';
        }
        await saveFile(saveName, saveBlob.size, saveType, 'PDF to Images', saveBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Conversion failed');
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
      saveAs(zipBlob, 'pdf-pages.zip');
    }
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Convert PDF to Image Online Free (High Quality Pages)" 
        description="Convert PDF pages to high-quality PNG or JPG images instantly in your browser. 100% private, no file uploads to servers."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="pdf-to-image" size={48} />
        </div>
        <h1>PDF to Images</h1>
        <p className="tool-page-subtitle">Convert each PDF page to high-quality PNG or JPG images</p>
      </div>

      {!result && (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && (
            <div className="options-panel">
              <div className="options-title">Conversion Options</div>
              <div className="options-row">
                <div className="option-group">
                  <label>Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPG (Smaller size)</option>
                  </select>
                </div>
                <div className="option-group">
                  <label>Scale</label>
                  <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                    <option value={1}>1x (Fast)</option>
                    <option value={2}>2x (Recommended)</option>
                    <option value={3}>3x (High Quality)</option>
                  </select>
                </div>
                {format === 'jpeg' && (
                  <div className="option-group">
                    <label>Quality: {Math.round(quality * 100)}%</label>
                    <input type="range" min="10" max="100" value={quality * 100} onChange={(e) => setQuality(e.target.value / 100)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>Converting... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleConvert} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Converting...' : 'Convert to Images'}</span>
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Conversion Complete!</div>
          <div className="result-info">{result.blobs.length} pages converted</div>
          <div className="result-preview">
            {result.urls.map((url, i) => (
              <img key={i} src={url} alt={`Page ${i + 1}`} />
            ))}
            {result.blobs.length > 4 && <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>+{result.blobs.length - 4} more</span>}
          </div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download {result.blobs.length > 1 ? 'All (ZIP)' : ''}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert Another</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
