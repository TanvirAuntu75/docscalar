import { useState } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { unOcrPdf } from '../../engines/pdf/unOcrPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function UnOcrPdf() {
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
    reset
  } = useFileProcessor();

  const [scale, setScale] = useState(2.0);

  const handleUnOcr = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await unOcrPdf(files[0], { scale }, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_flattened.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Un-OCR PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save flattened PDF locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Failed to flatten PDF document.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  return (
    <ToolPageLayout
      toolId="un-ocr-pdf"
      title="Un-OCR PDF (Flatten PDF)"
      description="Flatten a PDF by converting all page layers into static images, removing searchable and selectable text layers."
      suppressSwitcher={true}>
      <SEOHead 
        title="Un-OCR PDF Online Free — Flatten PDF Pages | DocForge" 
        description="Flatten searchable PDFs into purely rasterized, image-only documents. Strips text layers, font dictionaries, and interactive fields Client Side."
      />
      
      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="flex flex-col gap-4 max-w-md mx-auto mt-6 p-4 bg-surface-container border border-outline-variant rounded-xl text-left">
              <span className="text-xs font-bold text-on-background">Configuration Settings</span>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs text-outline font-medium">Output Resolution (Scale)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 1.5, label: 'Standard (1.5x)', desc: 'Faster compile' },
                    { value: 2.0, label: 'High (2.0x)', desc: 'Recommended' },
                    { value: 3.0, label: 'Ultra (3.0x)', desc: 'Best details' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScale(opt.value)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                        scale === opt.value
                          ? 'border-primary bg-primary-container/10 text-primary'
                          : 'border-outline-variant bg-surface hover:bg-surface-container-high text-on-background'
                      }`}
                    >
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className="text-[10px] text-outline mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container mt-6">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status">Rasterizing pages & destroying text layers... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleUnOcr} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Flattening...' : 'Un-OCR PDF'}</span>
            </button>
          </div>

          <div className="max-w-[600px] mx-auto mt-8 p-4 bg-surface-container-low border border-outline-variant rounded-2xl text-left text-xs text-on-surface-variant leading-relaxed shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-primary select-none mt-0.5">security</span>
              <div>
                <strong className="text-on-background font-bold">How Un-OCR (Flattening) works:</strong>
                <p className="mt-1">
                  Searchable PDFs contain transparent text overlays placed over page images. This utility renders each page as a clean, high-resolution graphic (rasterizing the document) and packs it into a fresh PDF container. 
                </p>
                <p className="mt-1 font-medium text-primary">
                  All vector paths, font definitions, metadata, and hidden copyable text layers are permanently destroyed, making it impossible for automated systems or readers to select, copy, or search the text.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Flattened & Text Layers Removed!</div>
          <div className="result-info">
            Your document has been successfully un-OCRed and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Flattened PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Flatten Another PDF</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
