import { useState } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { compressImage } from '../../engines/image/compressImage';
import { formatFileSize } from '../../utils/constants';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function ImageCompressor() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(0.7);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCompress = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const results = [];
      for (const file of files) {
        const res = await compressImage(file, quality);
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
          saveName = 'compressed-images.zip';
          saveType = 'application/zip';
        }
        await saveFile(saveName, saveBlob.size, saveType, 'Image Compressor', saveBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Compression failed');
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
      saveAs(zipBlob, 'compressed-images.zip');
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  const calculateTotalSavings = () => {
    if (!result) return { percent: 0, saved: 0 };
    const original = result.reduce((acc, r) => acc + r.originalSize, 0);
    const compressed = result.reduce((acc, r) => acc + r.newSize, 0);
    const saved = original - compressed;
    const percent = original > 0 ? Math.round((saved / original) * 100) : 0;
    return { percent, saved };
  };

  const { percent: totalPercent, saved: totalSaved } = calculateTotalSavings();

  return (
    <ToolPageLayout
      toolId="image-compressor"
      title="Image Compressor"
      description="Reduce image file size with customizable quality settings"
      suppressSwitcher={true}>
      <SEOHead 
        title="Compress Image Online Free: Reduce Image File Size" 
        description="Compress JPG, PNG, and WebP images online for free. Adjust quality to reduce image size instantly without uploading files to a server."
      />
      

      {!result ? (
        <>
          <FileDropzone accept="image/*" multiple={true} files={files} setFiles={setFiles} />
          {files.length > 0 && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out] max-w-md mx-auto mt-6 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] text-left">
              <h3 className="text-base font-semibold mb-4 text-[var(--text-primary)]">Compression Settings</h3>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Quality: {Math.round(quality * 100)}% ({quality > 0.7 ? 'High (less compression)' : quality > 0.4 ? 'Medium (recommended)' : 'Low (max compression)'})
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality * 100}
                  onChange={(e) => setQuality(e.target.value / 100)}
                  className="w-full h-1 bg-[var(--background-color)] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                  Lower quality means smaller file sizes. 70% is recommended for best quality-to-size ratio.
                </span>
              </div>
            </div>
          )}
          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleCompress} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Compressing...' : `Compress ${files.length} Image${files.length !== 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Compression Complete!</div>
          <div className="result-info">
            {totalSaved < 0 ? (
              <>Increased total size by <strong>{formatFileSize(Math.abs(totalSaved))}</strong> (+{Math.abs(totalPercent)}% larger)</>
            ) : (
              <>Reduced total size by <strong>{formatFileSize(totalSaved)}</strong> ({totalPercent}% smaller)</>
            )}
          </div>

          <div style={{ width: '100%', maxWidth: '600px', margin: '1.5rem auto', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {result.map((item, idx) => {
              const saved = item.originalSize - item.newSize;
              const percent = Math.round((saved / item.originalSize) * 100);
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: idx < result.length - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: '0.9rem' }}>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px', color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {formatFileSize(item.originalSize)} ➔ {formatFileSize(item.newSize)}{' '}
                    <span style={{ color: percent > 0 ? 'var(--color-success-light)' : 'var(--color-danger)', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                      ({percent > 0 ? `-${percent}%` : `+${Math.abs(percent)}%`})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download {result.length > 1 ? 'All (ZIP)' : 'Compressed Image'}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Compress More</span>
            </button>
          </div>
        </div>
      )}
      
      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
