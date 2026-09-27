import { useEffect } from 'react';

/**
 * SignatureSecurityInfoModal
 * 
 * Provides an authoritative, transparent comparison between:
 * 1. Simple Electronic Signatures (SES) - Instant, private client-side visual signatures
 * 2. Digital Signatures [PRO] (eIDAS / AES) - Cryptographically sealed X.509 PKI signatures with tamper evidence
 */
export default function SignatureSecurityInfoModal({ isOpen, onClose }) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden text-[var(--text-primary)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <h2 id="security-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                Signature Security & Legal Standards
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Understand the difference between Simple and Certified Digital Signatures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Side-by-Side Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Simple Signature (SES) */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">draw</span>
                  Simple Signature
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  SES · Standard
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Applies a visual signature or initials stamp directly onto document pages. Fast, lightweight, and processed 100% in your browser.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[11px] font-semibold text-[var(--text-primary)]">Key Characteristics:</div>
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-emerald-500 mt-0.5">check</span>
                    <span>100% client-side privacy via WebAssembly</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-emerald-500 mt-0.5">check</span>
                    <span>Visual handwritten, typed, or uploaded signature</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-emerald-500 mt-0.5">check</span>
                    <span>Document flattening & SHA-256 Audit Trail</span>
                  </li>
                </ul>
              </div>
              <div className="mt-auto pt-2 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-subtle)]">
                <strong className="text-[var(--text-primary)]">Best for:</strong> Internal approvals, day-to-day business documents, receipts, routine sign-offs, and NDAs.
              </div>
            </div>

            {/* Card 2: Digital Signature (PRO) */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--color-primary)]/40 rounded-xl p-4 flex flex-col gap-3 relative shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">verified_user</span>
                  Digital Signature
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PRO · eIDAS / AES
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Cryptographically seals the document byte stream using pyHanko & X.509 PKI digital certificates. Provides tamper-evident legal integrity.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[11px] font-semibold text-[var(--text-primary)]">Key Characteristics:</div>
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5">verified</span>
                    <span><strong>Tamper-Evident:</strong> Any change invalidates seal</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5">verified</span>
                    <span>Adobe Acrobat Reader verified green checkmark</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5">verified</span>
                    <span>Custom PKCS#12 (.pfx / .p12) enterprise keys</span>
                  </li>
                </ul>
              </div>
              <div className="mt-auto pt-2 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-subtle)]">
                <strong className="text-[var(--text-primary)]">Best for:</strong> Binding legal contracts, high-value procurement, compliance filings, and enterprise agreements.
              </div>
            </div>

          </div>

          {/* Technical Comparison Table */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Technical & Legal Comparison
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                  <tr>
                    <th className="py-2.5 px-3">Feature</th>
                    <th className="py-2.5 px-3 text-center">Simple Signature (SES)</th>
                    <th className="py-2.5 px-3 text-center bg-amber-500/5 text-amber-700 dark:text-amber-300">
                      Digital Signature [PRO]
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Visual Placement</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Yes</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Client-Side Privacy (WASM)</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">100% In-Browser</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)] bg-amber-500/5">Secure pyHanko Engine</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">X.509 PKI Cryptographic Certificate</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">No</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Tamper-Evident Byte Seal</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">No (Flattened)</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">Yes (Cryptographic)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Adobe Reader Green Checkmark</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">No</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">Yes (Certified)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Custom Enterprise .pfx / .p12 Upload</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">No</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Legal Standard</td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">SES (US ESIGN / UETA)</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold bg-amber-500/5">AES / eIDAS (EU 910/2014)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal Compliance Summary */}
          <div className="bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-bold text-[var(--text-primary)]">Legal Validity Notice: </span>
            Both Simple and Digital signatures comply with global digital transaction laws (US ESIGN Act, UETA, and EU eIDAS). Digital Signature [PRO] offers the highest evidentiary weight with non-repudiation and cryptographic tamper detection.
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
}
