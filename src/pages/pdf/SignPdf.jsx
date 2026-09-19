import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { loadPdfDocument } from '../../utils/pdfConfig';
import * as pdfjsLib from 'pdfjs-dist';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { signPdf } from '../../engines/pdf/signPdf';
import { generateAuditCertificatePdf, computeSha256Hash } from '../../engines/pdf/auditCertificate';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { useJobPoller } from '../../hooks/useJobPoller';
import { apiFetch, uploadFileSecure } from '../../utils/api';

import { useSignStudioState } from '../../components/SignStudio/useSignStudioState';
import SignCanvasViewport from '../../components/SignStudio/SignCanvasViewport';
import SignOptionsSidebar from '../../components/SignStudio/SignOptionsSidebar';
import SignatureCreatorModal from '../../components/SignStudio/SignatureCreatorModal';
import AuditCertificateModal from '../../components/SignStudio/AuditCertificateModal';
import useSmartCropper from '../../hooks/useSmartCropper';
import { useAuth } from '../../context/AuthContext';
import { scanDocumentSignatureZones } from '../../engines/pdf/signatureLineDetector';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function SignPdf() {
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

  const { isPro, userEmail } = useAuth();

  // Multi-field state hook
  const {
    fields,
    setFields,
    selectedFieldId,
    setSelectedFieldId,
    addField,
    updateField,
    removeField,
    duplicateField,
    applyFieldToAllPages,
    alignField,
    nudgeField,
    clearAllFields,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSignStudioState([]);

  // Document & Page state
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const cropper = useSmartCropper({ totalPages });

  // Active signature & initials memory
  const [signatureData, setSignatureData] = useState(null);
  const [initialsData, setInitialsData] = useState(null);

  // Modals state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigModalTargetType, setSigModalTargetType] = useState('signature');
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [signedPdfBlob, setSignedPdfBlob] = useState(null);

  // Options & Security settings
  const [securityMode, setSecurityMode] = useState('simple'); // 'simple' | 'digital'
  const [flattenDocument, setFlattenDocument] = useState(true);
  const [generateCertificate, setGenerateCertificate] = useState(true);
  const [detectedZones, setDetectedZones] = useState([]);
  const [digitalCertSettings, setDigitalCertSettings] = useState({
    commonName: 'DocScalar Verified Signer',
    email: userEmail || 'signer@docscalar.local'
  });

  // Sync userEmail if auth loaded after mount
  useEffect(() => {
    if (userEmail) {
      setDigitalCertSettings((prev) => ({
        ...prev,
        email: prev.email === 'signer@docscalar.local' ? userEmail : prev.email
      }));
    }
  }, [userEmail]);

  // Poller for Backend X.509 pyHanko signing
  const poller = useJobPoller(BACKEND_URL);

  // Initialize pre-rendered default signature and initials on mount
  useEffect(() => {
    try {
      const sigCanvas = document.createElement('canvas');
      sigCanvas.width = 400;
      sigCanvas.height = 120;
      const sigCtx = sigCanvas.getContext('2d');
      sigCtx.font = '54px "Satisfy", cursive, sans-serif';
      sigCtx.fillStyle = '#000000';
      sigCtx.textAlign = 'center';
      sigCtx.textBaseline = 'middle';
      sigCtx.fillText('Signer Name', 200, 60);
      const defaultSigUrl = sigCanvas.toDataURL('image/png');
      setSignatureData({
        mode: 'type',
        value: 'Signer Name',
        fontFamily: 'Satisfy',
        color: '#000000',
        dataUrl: defaultSigUrl
      });

      const initCanvas = document.createElement('canvas');
      initCanvas.width = 180;
      initCanvas.height = 120;
      const initCtx = initCanvas.getContext('2d');
      initCtx.font = '54px "Satisfy", cursive, sans-serif';
      initCtx.fillStyle = '#000000';
      initCtx.textAlign = 'center';
      initCtx.textBaseline = 'middle';
      initCtx.fillText('SN', 90, 60);
      const defaultInitUrl = initCanvas.toDataURL('image/png');
      setInitialsData({
        mode: 'type',
        value: 'SN',
        fontFamily: 'Satisfy',
        color: '#000000',
        dataUrl: defaultInitUrl
      });
    } catch (err) {
      console.warn('Default signature canvas initialization error:', err);
    }
  }, []);

  // Load PDF when file is selected
  useEffect(() => {
    if (files.length === 0) {
      setTotalPages(0);
      setPdfDocument(null);
      setActivePageIndex(0);
      setFields([]);
      return;
    }

    let isCancelled = false;

    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfDocument(arrayBuffer).promise;
        if (isCancelled) return;

        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setActivePageIndex(0);
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load PDF in Sign Studio:', err);
          setError('Failed to parse PDF document. It may be corrupt or password-protected.');
        }
      } finally {
        if (!isCancelled) setProcessing(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [files]);

  // Background signature line & AcroForm detection
  useEffect(() => {
    if (!pdfDocument) {
      setDetectedZones([]);
      return;
    }

    let isCancelled = false;
    scanDocumentSignatureZones(pdfDocument)
      .then((scanRes) => {
        if (!isCancelled && scanRes?.zones) {
          setDetectedZones(scanRes.zones);
        }
      })
      .catch((scanErr) => {
        console.warn('Signature line detection non-fatal error:', scanErr);
      });

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument]);

  // Handle poller results for backend digital signature job
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      setProgress(100);

      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_signed.pdf';
      apiFetch(poller.result.downloadUrl)
        .then((r) => r.blob())
        .then(async (blob) => {
          setSignedPdfBlob(blob);
          setResult({ blob, name: finalName });

          try {
            await saveFile(finalName, blob.size, 'application/pdf', 'Sign PDF', blob);
          } catch (dbErr) {
            console.error('Failed to save signed file locally:', dbErr);
          }

          if (generateCertificate) {
            const originalBuffer = await files[0].arrayBuffer();
            const signedBuffer = await blob.arrayBuffer();
            const originalHash = await computeSha256Hash(originalBuffer);
            const signedHash = await computeSha256Hash(signedBuffer);

            const certInfo = {
              documentName: files[0].name,
              documentSize: blob.size,
              pageCount: totalPages,
              originalHash,
              signedHash,
              signerName: digitalCertSettings.commonName || 'Verified Signer',
              signerEmail: digitalCertSettings.email || 'signer@docscalar.local',
              securityTier: 'X.509 Digital Cryptographic Seal',
              fieldsCount: fields.length,
              timestamp: new Date()
            };

            const certRes = await generateAuditCertificatePdf(certInfo);
            setCertificateData({ ...certInfo, blob: certRes.blob, certificateId: certRes.certificateId });
          }
        })
        .catch(() => {
          setProcessing(false);
          setError('Failed to fetch digitally signed PDF from backend.');
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Digital signing failed.');
    }
  }, [poller.status, poller.result, poller.error]);

  // Signature Creation Modal Handlers
  const handleOpenSigModal = (targetType = 'signature') => {
    setSigModalTargetType(targetType);
    setSigModalOpen(true);
  };

  const handleApplySignature = (sigResult) => {
    if (sigResult.type === 'initials') {
      setInitialsData(sigResult);
    } else {
      setSignatureData(sigResult);
    }
  };

  // Add field to current active page
  const handleAddFieldToActivePage = (fieldParams) => {
    addField({
      ...fieldParams,
      pageIndex: activePageIndex
    });
  };

  // Auto-apply detected signature zone
  const handleApplyDetectedZone = (zone) => {
    if (!zone) return;
    if (zone.pageIndex !== activePageIndex) {
      setActivePageIndex(zone.pageIndex);
    }

    const fieldType = zone.type || 'signature';
    const fieldData = {
      pageIndex: zone.pageIndex,
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      signerRole: 'signer_1'
    };

    if (fieldType === 'signature') {
      fieldData.type = 'signature';
      fieldData.dataUrl = signatureData?.dataUrl;
      fieldData.value = signatureData?.value || 'Signature';
    } else if (fieldType === 'initials') {
      fieldData.type = 'initials';
      fieldData.dataUrl = initialsData?.dataUrl;
      fieldData.value = initialsData?.value || 'Initials';
    } else if (fieldType === 'date') {
      fieldData.type = 'date';
      fieldData.value = new Date().toLocaleDateString('en-US');
    } else {
      fieldData.type = 'text';
      fieldData.value = zone.label || 'Signer Name';
    }

    addField(fieldData);
  };

  // Replace PDF file handler
  const handleReplacePdf = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles([file]);
      clearAllFields();
      setDetectedZones([]);
    }
  };

  // Main Signing Execution Action
  const handleExecuteSigning = async () => {
    if (fields.length === 0) {
      setError('Please place at least one signature or field on the document before signing.');
      return;
    }

    setProcessing(true);
    setError(null);
    setProgress(10);

    const file = files[0];
    const finalFileName = file.name.replace(/\.[^.]+$/, '') + '_signed.pdf';

    try {
      // 1. Digital Signature Mode (FastAPI pyHanko backend)
      if (securityMode === 'digital') {
        setProgress(20);
        const clientStampedBlob = await signPdf(file, fields, {
          flatten: flattenDocument,
          onProgress: (pct) => setProgress(Math.round(20 + pct * 0.4))
        });

        const stampedFile = new File([clientStampedBlob], finalFileName, { type: 'application/pdf' });
        const uploadData = await uploadFileSecure(BACKEND_URL, stampedFile, (pct) => setProgress(Math.round(40 + pct * 0.2)));
        
        const signFormData = new FormData();
        signFormData.append('file_id', uploadData.file_id);
        signFormData.append('filename', uploadData.filename);
        if (digitalCertSettings.commonName) signFormData.append('common_name', digitalCertSettings.commonName);
        if (digitalCertSettings.email) signFormData.append('email', digitalCertSettings.email);
        if (digitalCertSettings.passphrase) signFormData.append('passphrase', digitalCertSettings.passphrase);
        if (digitalCertSettings.customCertificateFile) {
          signFormData.append('certificate', digitalCertSettings.customCertificateFile);
        }

        const signRes = await apiFetch(`${BACKEND_URL}/api/pdf/digitally-sign`, {
          method: 'POST',
          body: signFormData
        });

        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          throw new Error(errData.detail || 'Backend digital signing service failed to initialize.');
        }

        const data = await signRes.json();
        if (data.job_id) {
          poller.startPolling(data.job_id);
        } else {
          throw new Error('Invalid response from digital signing service.');
        }
        return;
      }

      // 2. Simple Electronic Signature Mode (100% Client-Side WASM)
      const cropperOptions = await (cropper.getEngineOptionsAsync
        ? cropper.getEngineOptionsAsync(file, pdfjsLib, (pct) => setProgress(Math.round(pct * 0.25)))
        : cropper.getEngineOptions());

      const signedBlob = await signPdf(file, fields, {
        flatten: flattenDocument,
        onProgress: (pct) => setProgress(pct),
        ...cropperOptions
      });

      setSignedPdfBlob(signedBlob);
      setResult({ blob: signedBlob, name: finalFileName });

      try {
        await saveFile(finalFileName, signedBlob.size, 'application/pdf', 'Sign PDF', signedBlob);
      } catch (dbErr) {
        console.warn('Failed to save to local IndexedDB:', dbErr);
      }

      if (generateCertificate) {
        const originalBuffer = await file.arrayBuffer();
        const signedBuffer = await signedBlob.arrayBuffer();
        const originalHash = await computeSha256Hash(originalBuffer);
        const signedHash = await computeSha256Hash(signedBuffer);

        const certInfo = {
          documentName: file.name,
          documentSize: signedBlob.size,
          pageCount: totalPages,
          originalHash,
          signedHash,
          signerName: signatureData?.value || digitalCertSettings.commonName || 'Signer',
          signerEmail: digitalCertSettings.email || 'signer@docscalar.local',
          securityTier: 'Simple Electronic Signature (SES)',
          fieldsCount: fields.length,
          timestamp: new Date()
        };

        const certRes = await generateAuditCertificatePdf(certInfo);
        setCertificateData({ ...certInfo, blob: certRes.blob, certificateId: certRes.certificateId });
      }
    } catch (err) {
      console.error('Signing failed:', err);
      setError(err.message || 'Failed to sign the document. Please try again.');
    } finally {
      if (securityMode !== 'digital') {
        setProcessing(false);
      }
    }
  };

  // Download Certificate PDF helper
  const handleDownloadCertificate = () => {
    if (certificateData?.blob) {
      const certName = files[0].name.replace(/\.[^.]+$/, '') + '_Audit_Certificate.pdf';
      saveAs(certificateData.blob, certName);
    }
  };

  // Download Signed PDF helper
  const handleDownloadSignedPdf = () => {
    if (signedPdfBlob) {
      const signedName = files[0].name.replace(/\.[^.]+$/, '') + '_signed.pdf';
      saveAs(signedPdfBlob, signedName);
    }
  };

  // Reset helper
  const handleReset = () => {
    reset();
    setFields([]);
    setDetectedZones([]);
    setResult(null);
    setCertificateData(null);
    setSignedPdfBlob(null);
    cropper.revert();
  };

  return (
    <ToolPageLayout
      toolId="sign-pdf"
      title="Sign PDF"
      description="Place signatures, initials, dates, and stamps on your PDF document."
      files={files}
      hasResult={Boolean(result)}
    >
      <SEOHead
        title="Sign PDF Online Free (100% Local & Private) | DocScalar"
        description="Sign PDF documents securely online. Draw or type handwritten signatures, place initials, dates, and stamps with 100% client-side privacy and tamper-evident SHA-256 audit certificates."
      />

      {!result ? (
        <>
          {files.length === 0 ? (
            <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />
          ) : (
            <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
              {/* Studio Canvas Viewport (Left / Center) */}
              {pdfDocument ? (
                <SignCanvasViewport
                  cropper={cropper}
                  pdfDocument={pdfDocument}
                  totalPages={totalPages}
                  activePageIndex={activePageIndex}
                  setActivePageIndex={setActivePageIndex}
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={setSelectedFieldId}
                  onUpdateField={updateField}
                  onRemoveField={removeField}
                  onDuplicateField={duplicateField}
                  onApplyAll={applyFieldToAllPages}
                  onAlignField={alignField}
                  onNudgeField={nudgeField}
                  undo={undo}
                  redo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onEditField={(f) => handleOpenSigModal(f.type === 'initials' ? 'initials' : 'signature')}
                  onAddField={addField}
                  onReplacePdf={handleReplacePdf}
                  onOpenSignatureModal={handleOpenSigModal}
                  detectedZones={detectedZones}
                  onApplyDetectedZone={handleApplyDetectedZone}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  <span className="material-symbols-outlined text-[48px] animate-spin text-[var(--color-primary)] mb-4">progress_activity</span>
                  <p className="text-sm font-medium">Loading document preview...</p>
                </div>
              )}

              {/* Studio Options & Actions Sidebar (Right) */}
              <SignOptionsSidebar
                cropper={cropper}
                signatureData={signatureData}
                initialsData={initialsData}
                onOpenSignatureModal={() => handleOpenSigModal('signature')}
                onOpenInitialsModal={() => handleOpenSigModal('initials')}
                onAddFieldToActivePage={handleAddFieldToActivePage}
                fields={fields}
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                onUpdateField={updateField}
                onRemoveField={removeField}
                onDuplicateField={duplicateField}
                onAlignField={alignField}
                onApplyAll={applyFieldToAllPages}
                activePageIndex={activePageIndex}
                totalPages={totalPages}
                onClearAllFields={clearAllFields}
                securityMode={securityMode}
                setSecurityMode={setSecurityMode}
                flattenDocument={flattenDocument}
                setFlattenDocument={setFlattenDocument}
                generateCertificate={generateCertificate}
                setGenerateCertificate={setGenerateCertificate}
                digitalCertSettings={digitalCertSettings}
                setDigitalCertSettings={setDigitalCertSettings}
                onExecuteSigning={handleExecuteSigning}
                processing={processing}
                progress={progress}
                error={error}
                isPro={isPro}
                detectedZones={detectedZones}
                onApplyDetectedZone={handleApplyDetectedZone}
              />
            </div>
          )}
        </>
      ) : (
        /* Result State matching OrganizePdf */
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">PDF Signed Successfully!</div>
          <div className="result-info">
            Your document has been compiled and saved with {fields.length} stamped field{fields.length !== 1 ? 's' : ''}.
          </div>

          <div className="action-bar flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={handleDownloadSignedPdf}>
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Download Signed PDF</span>
            </button>

            {certificateData?.blob && (
              <button className="btn btn-secondary btn-lg flex items-center justify-center gap-2" onClick={handleDownloadCertificate}>
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>Download Audit Certificate</span>
              </button>
            )}

            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Sign Another Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Signature & Initials Creation Modal */}
      <SignatureCreatorModal
        isOpen={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onApply={handleApplySignature}
        targetType={sigModalTargetType}
        defaultName={digitalCertSettings.commonName || 'Signer Name'}
      />

      {/* Audit Certificate Modal (if triggered manually) */}
      <AuditCertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        certificateData={certificateData}
        onDownloadCertificate={handleDownloadCertificate}
        onDownloadSignedPdf={handleDownloadSignedPdf}
      />

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
