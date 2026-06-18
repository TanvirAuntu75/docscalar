import { useState, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { pdfToImages, pdfToImagesStream } from '../../engines/pdf/pdfToImage';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Check if the browser supports the File System Access API (directory picker)
const SUPPORTS_DIR_PICKER = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

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

  const [format, setFormat]       = useState('png');
  const [quality, setQuality]     = useState(0.92);
  const [scale, setScale]         = useState(2);
  // 'folder' = Direct Folder Export (File System Access API)
  // 'zip'    = In-memory ZIP download (legacy fallback)
  const [exportMode, setExportMode] = useState(SUPPORTS_DIR_PICKER ? 'folder' : 'zip');

  // Live streaming counters
  const [streamedPages, setStreamedPages]   = useState(0);
  const [totalStreamPages, setTotalStreamPages] = useState(0);

  // Ref to accumulate preview blobs during streaming (first 4 only)
  const previewBlobsRef = useRef([]);

  // ─── Convert handler ───────────────────────────────────────────────────────
  const handleConvert = async () => {
    if (!files.length) return;
    const file = files[0];
    setProcessing(true);
    setProgress(0);
    setStreamedPages(0);
    setTotalStreamPages(0);
    setError(null);
    setResult(null);
    previewBlobsRef.current = [];

    try {
      if (exportMode === 'folder') {
        // ── Direct Folder Export via File System Access API ──────────────────
        let dirHandle;
        try {
          dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        } catch (e) {
          // User cancelled the picker — abort gracefully
          setProcessing(false);
          return;
        }

        const folderName = file.name.replace(/\.[^.]+$/, '') + '-images';
        let subDir;
        try {
          subDir = await dirHandle.getDirectoryHandle(folderName, { create: true });
        } catch {
          subDir = dirHandle; // fallback to root of chosen folder
        }

        let savedCount = 0;
        const { totalPages } = await pdfToImagesStream(
          file,
          { format, quality, scale },
          async ({ name, blob, pageIndex, totalPages: tp, progress: pg }) => {
            // Keep first 4 blobs for preview
            if (previewBlobsRef.current.length < 4) {
              previewBlobsRef.current.push({ url: createSafeObjectURL(blob), name });
            }

            // Write directly to disk
            const fileHandle = await subDir.getFileHandle(name, { create: true });
            const writable   = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            savedCount++;
            setStreamedPages(savedCount);
            setTotalStreamPages(tp);
            setProgress(pg);
          },
          setProgress
        );

        // Save a small metadata entry to local workspace DB
        try {
          await saveFile(
            `${folderName}.zip`,
            savedCount,
            'application/zip',
            'PDF to Images',
            null
          );
        } catch (_) { /* non-critical */ }

        setResult({
          mode: 'folder',
          totalPages,
          folderName,
          previews: previewBlobsRef.current,
        });

      } else {
        // ── ZIP mode — collect all blobs in memory (≤100 pages enforced by worker) ──
        const { blobs, names } = await pdfToImages(file, { format, quality, scale }, setProgress);

        const previewUrls = blobs.slice(0, 4).map(b => createSafeObjectURL(b));

        // Package into ZIP
        const zip = new JSZip();
        blobs.forEach((b, i) => zip.file(names[i], b));
        const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
          setProgress(Math.round(meta.percent));
        });
        const zipName = `${file.name.replace(/\.[^.]+$/, '')}-images.zip`;

        try {
          await saveFile(zipName, zipBlob.size, 'application/zip', 'PDF to Images', zipBlob);
        } catch (_) { /* non-critical */ }

        setResult({
          mode: 'zip',
          blobs,
          names,
          zipBlob,
          zipName,
          totalPages: blobs.length,
          previewUrls,
        });
      }
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Download (ZIP mode only) ──────────────────────────────────────────────
  const downloadZip = () => {
    if (!result?.zipBlob) return;
    saveAs(result.zipBlob, result.zipName);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const isLarge   = files.length > 0; // we don't know page count until worker runs
  const btnLabel  = processing
    ? exportMode === 'folder'
      ? `Saving page ${streamedPages}${totalStreamPages ? ` / ${totalStreamPages}` : ''}…`
      : `Converting… ${progress}%`
    : 'Convert to Images';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ToolPageLayout
      toolId="pdf-to-image"
      title="PDF to Images"
      description="Convert each PDF page to high-quality PNG or JPG images"
    >
      <SEOHead
        title="Convert PDF to Image Online Free (High Quality Pages)"
        description="Convert PDF pages to high-quality PNG or JPG images instantly in your browser. 100% private, no file uploads to servers."
      />

      {!result && (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && (
            <div className="options-panel">
              <div className="options-title">Conversion Options</div>
              <div className="options-row">

                {/* Format */}
                <div className="option-group">
                  <label>Format</label>
                  <select value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPG (Smaller size)</option>
                  </select>
                </div>

                {/* Scale */}
                <div className="option-group">
                  <label>Scale</label>
                  <select value={scale} onChange={e => setScale(Number(e.target.value))}>
                    <option value={1}>1× (Fast)</option>
                    <option value={2}>2× (Recommended)</option>
                    <option value={3}>3× (High Quality)</option>
                  </select>
                </div>

                {/* JPEG quality slider */}
                {format === 'jpeg' && (
                  <div className="option-group">
                    <label>Quality: {Math.round(quality * 100)}%</label>
                    <input
                      type="range" min="10" max="100"
                      value={quality * 100}
                      onChange={e => setQuality(e.target.value / 100)}
                    />
                  </div>
                )}
              </div>

              {/* ── Export Mode Selector ──────────────────────────────────── */}
              <div style={{ marginTop: '1.25rem' }}>
                <div className="options-title" style={{ marginBottom: '0.6rem' }}>Export Mode</div>

                {/* Direct Folder Export card */}
                {SUPPORTS_DIR_PICKER && (
                  <label
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.9rem 1rem',
                      borderRadius: '10px',
                      border: exportMode === 'folder'
                        ? '2px solid var(--color-primary)'
                        : '2px solid var(--border-color)',
                      background: exportMode === 'folder'
                        ? 'color-mix(in srgb, var(--color-primary) 8%, var(--bg-surface))'
                        : 'var(--bg-surface)',
                      cursor: 'pointer',
                      marginBottom: '0.65rem',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <input
                      type="radio" name="exportMode" value="folder"
                      checked={exportMode === 'folder'}
                      onChange={() => setExportMode('folder')}
                      style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>folder_open</span>
                        Direct Folder Export
                        <span style={{
                          fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
                          background: 'var(--color-primary)', color: '#fff',
                          padding: '1px 7px', borderRadius: '99px', marginLeft: '4px',
                        }}>RECOMMENDED</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        Pages are written directly to a folder on your drive, one by one. Works for PDFs of
                        any size — even 7,000+ pages. Zero memory crashes.
                      </div>
                    </div>
                  </label>
                )}

                {/* ZIP Download card */}
                <label
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    border: exportMode === 'zip'
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--border-color)',
                    background: exportMode === 'zip'
                      ? 'color-mix(in srgb, var(--color-primary) 8%, var(--bg-surface))'
                      : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <input
                    type="radio" name="exportMode" value="zip"
                    checked={exportMode === 'zip'}
                    onChange={() => setExportMode('zip')}
                    style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>folder_zip</span>
                      Download as ZIP
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      All images are packaged into a single ZIP file. Works in all browsers. Limited to
                      PDFs with up to <strong>100 pages</strong> — larger files may crash the browser tab.
                    </div>
                  </div>
                </label>

                {/* Warning: ZIP mode + no dir picker support */}
                {!SUPPORTS_DIR_PICKER && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.65rem 0.9rem',
                    borderRadius: '8px', fontSize: '13px',
                    background: 'color-mix(in srgb, #f59e0b 12%, var(--bg-surface))',
                    border: '1px solid #f59e0b', color: 'var(--text-primary)',
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b', marginTop: '1px' }}>warning</span>
                    <span>
                      Your browser doesn&apos;t support Direct Folder Export.
                      For large PDFs (&gt;100 pages), use <strong>Chrome</strong> or <strong>Edge</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {processing && (
            <div className="progress-container">
              <div className="progress-bar-container">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p className="progress-status" style={{ marginTop: '0.5rem' }}>
                {exportMode === 'folder' && totalStreamPages > 0
                  ? `Writing page ${streamedPages} of ${totalStreamPages} directly to your folder… (${progress}%)`
                  : `Converting… ${progress}%`}
              </p>
              {exportMode === 'folder' && totalStreamPages > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
                  Memory usage stays constant — pages are saved and released one by one
                </p>
              )}
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>
              {error}
            </p>
          )}

          <div className="action-bar">
            <button
              className="btn btn-primary btn-lg flex items-center justify-center gap-2"
              onClick={handleConvert}
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{btnLabel}</span>
            </button>
          </div>
        </>
      )}

      {/* ── Result Screen ───────────────────────────────────────────────────── */}
      {result && (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>

          <div className="result-title">Conversion Complete!</div>

          {result.mode === 'folder' ? (
            <>
              <div className="result-info">
                {result.totalPages.toLocaleString()} pages saved directly to{' '}
                <strong>&ldquo;{result.folderName}&rdquo;</strong> on your device
              </div>
              <div style={{
                margin: '0.75rem auto', padding: '0.7rem 1.1rem',
                maxWidth: '480px', borderRadius: '10px', fontSize: '13.5px',
                background: 'color-mix(in srgb, var(--color-success, #22c55e) 10%, var(--bg-surface))',
                border: '1px solid var(--color-success, #22c55e)',
                display: 'flex', gap: '0.5rem', alignItems: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-success, #22c55e)' }}>folder_open</span>
                <span>Open your chosen folder to find all the converted images.</span>
              </div>
              {/* Preview thumbnails (first 4 pages) */}
              {result.previews.length > 0 && (
                <div className="result-preview">
                  {result.previews.map((p, i) => (
                    <img key={i} src={p.url} alt={`Page ${i + 1} preview`} />
                  ))}
                  {result.totalPages > 4 && (
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>
                      +{result.totalPages - 4} more in your folder
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="result-info">{result.totalPages} pages converted</div>
              <div className="result-preview">
                {result.previewUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Page ${i + 1}`} />
                ))}
                {result.totalPages > 4 && (
                  <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>
                    +{result.totalPages - 4} more
                  </span>
                )}
              </div>
            </>
          )}

          <div className="action-bar">
            {result.mode === 'zip' && (
              <button
                className="btn btn-success btn-lg flex items-center justify-center gap-2"
                onClick={downloadZip}
              >
                <span className="material-symbols-outlined text-[20px] select-none">download</span>
                <span>Download ZIP</span>
              </button>
            )}
            <button
              className="btn btn-secondary flex items-center justify-center gap-1.5"
              onClick={reset}
            >
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Convert Another</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
