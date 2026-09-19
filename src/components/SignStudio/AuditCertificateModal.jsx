import { useState } from 'react';

export default function AuditCertificateModal({
  isOpen,
  onClose,
  certificateData,
  onDownloadCertificate,
  onDownloadSignedPdf
}) {
  if (!isOpen || !certificateData) return null;

  const {
    documentName,
    certificateId,
    signedHash,
    originalHash,
    signerName,
    signerEmail,
    securityTier,
    timestamp,
    fieldsCount
  } = certificateData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-surface border border-outline-variant/60 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-on-background">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">verified</span>
            <div>
              <h3 className="font-h3 text-sm font-bold text-on-background">Document Signed Successfully</h3>
              <p className="text-[11px] text-on-surface-variant">Tamper-evident legal audit seal attached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-background hover:bg-surface-container-high rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          
          {/* Status Box */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-xs text-primary">{documentName}</span>
              <span className="font-mono text-[10px] text-on-surface-variant">ID: {certificateId}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs">
              Verified Stamped
            </span>
          </div>

          {/* Details Table */}
          <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Signer Identity</span>
              <span className="font-bold text-on-background">{signerName} ({signerEmail})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Security Protocol</span>
              <span className="font-bold text-on-background">{securityTier}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Fields Stamped</span>
              <span className="font-bold text-on-background">{fieldsCount} fields</span>
            </div>
            <div className="flex flex-col gap-1 py-1">
              <span className="text-on-surface-variant font-medium">SHA-256 Document Checksum</span>
              <span className="font-mono text-[10px] text-primary break-all bg-surface p-2 rounded-lg border border-outline-variant/40">
                {signedHash}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-outline-variant/30 bg-surface-container">
          <button
            onClick={onDownloadCertificate}
            className="px-4 py-2.5 border border-outline-variant hover:border-primary text-on-background font-bold text-xs rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            Download Certificate PDF
          </button>

          <button
            onClick={onDownloadSignedPdf}
            className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download Signed PDF
          </button>
        </div>

      </div>
    </div>
  );
}
