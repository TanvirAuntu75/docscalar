import { useState } from 'react';
import ToolIcon from '../../components/ToolIcon';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import { convertImageFormat } from '../../engines/image/convertFormat';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function ImageConverter() {
  const [files, setFiles] = useState([]);
  const [targetFormat, setTargetFormat] = useState('png');
  const [quality, setQuality] = useState(0.92);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const results = [];
      for (const file of files) {
        const res = await convertImageFormat(file, targetFormat, quality);
        results.push(res);
      }
      setResult(results);

      try {
        let saveBlob;
        let saveName;
        let saveType;
        if (results.length === 1) {
          saveBlob = results[0].blob;
          saveName = results[0].name;
          saveType = results[0].blob.type;
        } else {
          const zip = new JSZip();
          results.forEach((r) => zip.file(r.name, r.blob));
          saveBlob = await zip.generateAsync({ type: 'blob' });
          saveName = `converted-${targetFormat}.zip`;
          saveType = 'application/zip';
        }
        await saveFile(saveName, saveBlob.size, saveType, 'Image Converter', saveBlob);
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
    if (result.length === 1) {
      saveAs(result[0].blob, result[0].name);
    } else {
      const zip = new JSZip();
      result.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `converted-${targetFormat}.zip`);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); };

  return (
    <div className="tool-page">
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="image-converter" size={48} />
        </div>
        <h1>Image Converter</h1>
        <p className="tool-page-subtitle">Convert between PNG, JPG, WEBP, and BMP formats</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept="image/*" multiple={true} files={files} setFiles={setFiles} />
          {files.length > 0 && (
            <div className="options-panel">
              <div className="options-title">Convert To</div>
              <div className="options-row">
                <div className="option-group">
                  <label>Target Format</label>
                  <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)}>
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPG (Smaller)</option>
                    <option value="webp">WebP (Modern)</option>
                    <option value="bmp">BMP (Raw)</option>
                  </select>
                </div>
                {(targetFormat === 'jpeg' || targetFormat === 'webp') && (
                  <div className="option-group">
                    <label>Quality: {Math.round(quality * 100)}%</label>
                    <input type="range" min="10" max="100" value={quality * 100} onChange={(e) => setQuality(e.target.value / 100)} />
                  </div>
                )}
              </div>
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
              <span>{processing ? 'Converting...' : `Convert to ${targetFormat.toUpperCase()}`}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Converted!</div>
          <div className="result-info">{result.length} image{result.length > 1 ? 's' : ''} converted to {targetFormat.toUpperCase()}</div>
          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download {result.length > 1 ? 'All (ZIP)' : ''}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert More</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
