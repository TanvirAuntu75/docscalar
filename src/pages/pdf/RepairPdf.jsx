import { useState } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { repairPdf } from '../../engines/pdf/repairPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function RepairPdf() {
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

  const handleRepair = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const outputBlob = await repairPdf(files[0], setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_repaired.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Repair PDF', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save repaired PDF locally:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Failed to repair PDF structure. The file may be fully unreadable.');
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
      toolId="repair-pdf"
      title="Repair PDF"
      description="Fix damaged or unreadable PDF documents by reconstructing their cross-reference index tables"
    >
      <SEOHead 
        title="Repair PDF Online Free — Fix Corrupted PDFs | DocForge" 
        description="Fix corrupted, damaged, or unreadable PDF structures. Rebuild cross-reference tables and recover document objects client-side."
      />
      

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Selected document: <strong>{files[0].name}</strong> ({(files[0].size / 1024).toFixed(1)} KB)
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status">Reconstructing object xref index table... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleRepair} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Repairing...' : 'Repair PDF'}</span>
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <span className="material-symbols-outlined text-[16px] text-primary align-middle mr-1.5 select-none">build</span><strong>How PDF Repair works:</strong> Cross-reference tables (XREFs) index where objects are in a file. If offsets shift, PDF readers fail to open it. DocForge parses the raw object streams, builds a clean standard XREF, and saves a 100% compliant file locally.
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-primary select-none">build</span>
          </div>
          <div className="result-title">PDF Structure Repaired!</div>
          <div className="result-info">
            Your document has been re-indexed and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download Repaired PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Repair Another PDF</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
