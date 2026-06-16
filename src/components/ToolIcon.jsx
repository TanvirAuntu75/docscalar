import React from 'react';

export default function ToolIcon({ id, size = 48 }) {
  // Brand color gradients & tokens matching DocForge's editor brand
  const getGradientInfo = () => {
    switch (id) {
      // 1. PDF Organize/Edit/Page Actions (Warm Coral Red)
      case 'merge-pdf':
      case 'split-pdf':
      case 'remove-pages':
      case 'extract-pages':
      case 'organize-pdf':
      case 'rotate-pdf':
      case 'crop-pdf':
      case 'compare-pdf':
      case 'pdf-to-pdfa':
      case 'add-page-numbers':
        return { primary: 'url(#grad-red)', secondary: 'url(#grad-red-soft)', text: '#d92516' };

      // 2. Compress/Optimize (Emerald Green)
      case 'compress-pdf':
      case 'ocr-pdf':
      case 'repair-pdf':
        return { primary: 'url(#grad-green)', secondary: 'url(#grad-green-soft)', text: '#047857' };

      // 3. Word/Text conversions (Royal Blue)
      case 'docx-to-pdf':
      case 'word-to-pdf':
      case 'pdf-to-word':
      case 'text-to-pdf':
        return { primary: 'url(#grad-blue)', secondary: 'url(#grad-blue-soft)', text: '#1d4ed8' };

      // 4. Excel conversions (Forest Green)
      case 'excel-to-pdf':
      case 'pdf-to-excel':
        return { primary: 'url(#grad-forest)', secondary: 'url(#grad-forest-soft)', text: '#064e3b' };

      // 5. PowerPoint conversions (Orange)
      case 'powerpoint-to-pdf':
      case 'pdf-to-powerpoint':
        return { primary: 'url(#grad-orange)', secondary: 'url(#grad-orange-soft)', text: '#c2410c' };

      // 6. Image tools & PDF Forms (Royal Purple)
      case 'image-converter':
      case 'image-compressor':
      case 'image-resizer':
      case 'pdf-to-image':
      case 'image-to-pdf':
      case 'edit-pdf':
      case 'add-watermark':
      case 'pdf-forms':
        return { primary: 'url(#grad-purple)', secondary: 'url(#grad-purple-soft)', text: '#6d28d9' };

      // 7. Security/QR/Sign (Amber Gold)
      case 'protect-pdf':
      case 'unlock-pdf':
      case 'sign-pdf':
      case 'redact-pdf':
      case 'qr-generator':
        return { primary: 'url(#grad-amber)', secondary: 'url(#grad-amber-soft)', text: '#b45309' };

      // 8. AI/Translate (Luminous Teal)
      case 'ai-summarizer':
      case 'translate-pdf':
        return { primary: 'url(#grad-teal)', secondary: 'url(#grad-teal-soft)', text: '#115e59' };

      default:
        return { primary: 'url(#grad-grey)', secondary: 'url(#grad-grey-soft)', text: '#1f2937' };
    }
  };

  const grads = getGradientInfo();

  const renderIconContent = () => {
    switch (id) {
      // 1. Merge PDF
      case 'merge-pdf':
        return (
          <>
            <style>{`
              .group:hover .merge-back { transform: translate(-2px, -2px); }
              .group:hover .merge-front { transform: translate(2px, 2px); }
              .group:hover .merge-arrow { transform: scale(1.15) translate(1px, -1px); }
            `}</style>
            {/* Back page (Coral gradient) */}
            <g className="merge-back" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <rect x="8" y="10" width="22" height="30" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <path d="M12 18h14M12 24h14M12 30h8" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            </g>
            {/* Front page (Glassmorphism overlay) */}
            <g className="merge-front" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <rect x="18" y="6" width="22" height="30" rx="3.5" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.5" />
              <path d="M22 14h14M22 20h14M22 26h8" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </g>
            {/* Interactive Merge Arrow */}
            <g className="merge-arrow" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <circle cx="24" cy="24" r="5.5" fill={grads.primary} />
              <path d="M22 24h4M24 22l2 2-2 2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      // 2. Split PDF
      case 'split-pdf':
        return (
          <>
            <style>{`
              .group:hover .split-left { transform: translateX(-4px); }
              .group:hover .split-right { transform: translateX(4px); }
              .group:hover .split-line { opacity: 0; }
              @keyframes scissor-cut {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-15deg); }
              }
              .group:hover .split-scissors { animation: scissor-cut 0.6s ease-in-out infinite; }
            `}</style>
            {/* Left page half */}
            <g className="split-left" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <path d="M12 6h12v36H12a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <path d="M13 14h6M13 20h8M13 26h4" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            </g>
            {/* Right page half */}
            <g className="split-right" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <path d="M24 6h12a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3H24V6z" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.5" />
              <path d="M28 14h7M28 20h5M28 26h6" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </g>
            {/* Cut line (fades on hover) */}
            <line className="split-line" x1="24" y1="6" x2="24" y2="42" stroke={grads.text} strokeWidth="1.5" strokeDasharray="3 3" style={{ transition: 'opacity 0.3s ease' }} />
            {/* Interactive scissor icon */}
            <g className="split-scissors" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <g transform="translate(-10, -10)">
                <circle cx="28" cy="30" r="3" fill="none" stroke={grads.text} strokeWidth="1.5" />
                <circle cx="28" cy="38" r="3" fill="none" stroke={grads.text} strokeWidth="1.5" />
                <path d="M30 31l8 6M30 37l8-6" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </g>
          </>
        );

      // 3. Remove Pages
      case 'remove-pages':
        return (
          <>
            <style>{`
              .group:hover .remove-card { transform: scale(0.7) translate(8px, -8px); opacity: 0.1; }
              .group:hover .remove-badge { transform: scale(1.15); }
            `}</style>
            {/* Four page grid */}
            <rect x="8" y="8" width="13" height="17" rx="2" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.2" />
            <rect x="8" y="27" width="13" height="13" rx="2" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.2" />
            <rect x="27" y="27" width="13" height="13" rx="2" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.2" />
            {/* Removed target page */}
            <g className="remove-card" style={{ transformOrigin: '33px 16px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <rect x="27" y="8" width="13" height="17" rx="2" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.2" />
              <path d="M30 13h7M30 17h5" stroke={grads.text} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
            </g>
            {/* Delete minus badge */}
            <g className="remove-badge" style={{ transformOrigin: '34px 14px', transition: 'all 0.3s ease' }} transform="translate(34, 14)">
              <circle cx="0" cy="0" r="5.5" fill="#ba1a1a" stroke="white" strokeWidth="1.2" />
              <line x1="-3" y1="0" x2="3" y2="0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </>
        );

      // 4. Extract Pages
      case 'extract-pages':
        return (
          <>
            <style>{`
              .group:hover .extract-page { transform: translate(3px, -5px); }
              .group:hover .extract-front { transform: translateY(1px); }
            `}</style>
            {/* Back sheet stack */}
            <g className="extract-front" style={{ transition: 'all 0.4s ease' }}>
              <rect x="8" y="18" width="24" height="28" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" opacity="0.5" />
              <rect x="12" y="14" width="24" height="28" rx="3.5" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.5" />
              <path d="M16 22h16M16 28h16M16 34h8" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </g>
            {/* Flying extracted page */}
            <g className="extract-page" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="24" y="8" width="16" height="20" rx="3" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.5" />
              <path d="M28 14h8M28 18h4" stroke={grads.text} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
              <polygon points="34,10 38,10 38,14" fill={grads.text} />
            </g>
          </>
        );

      // 5. Organize PDF
      case 'organize-pdf':
        return (
          <>
            <style>{`
              .group:hover .org-p1 { transform: translate(3px, 3px); }
              .group:hover .org-p2 { transform: translate(-3px, -3px); }
              .group:hover .org-p3 { transform: translate(-3px, 3px); }
              .group:hover .org-p4 { transform: translate(3px, -3px); }
            `}</style>
            {/* 4 small pages dynamically swapping */}
            <g className="org-p1" style={{ transition: 'all 0.4s ease' }}>
              <rect x="6" y="6" width="14" height="14" rx="2.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.2" />
            </g>
            <g className="org-p2" style={{ transition: 'all 0.4s ease' }}>
              <rect x="28" y="28" width="14" height="14" rx="2.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.2" />
            </g>
            <g className="org-p3" style={{ transition: 'all 0.4s ease' }}>
              <rect x="28" y="6" width="14" height="14" rx="2.5" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.2" />
            </g>
            <g className="org-p4" style={{ transition: 'all 0.4s ease' }}>
              <rect x="6" y="28" width="14" height="14" rx="2.5" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.2" />
            </g>
            {/* Center swap arrow indicator */}
            <path d="M20 20l8 8M20 28l8-8" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </>
        );

      // 6. Scan to PDF
      case 'scan-to-pdf':
        return (
          <>
            <style>{`
              @keyframes scan-laser {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(22px); }
              }
              .group:hover .scan-laser-line { animation: scan-laser 2s ease-in-out infinite; }
              .group:hover .scan-camera-lens { transform: scale(1.1); }
            `}</style>
            {/* Scanner Bed */}
            <rect x="8" y="6" width="32" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <path d="M12 14h24M12 20h16" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            {/* Camera badge */}
            <g className="scan-camera-lens" style={{ transformOrigin: '24px 28px', transition: 'all 0.4s ease' }}>
              <circle cx="24" cy="28" r="8" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <circle cx="24" cy="28" r="3" fill={grads.text} />
              <rect x="22" y="18" width="4" height="2" fill={grads.text} rx="0.5" />
            </g>
            {/* Laser scanning bar */}
            <g className="scan-laser-line" style={{ transformOrigin: 'center' }}>
              <line x1="6" y1="10" x2="42" y2="10" stroke={grads.text} strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="10" x2="42" y2="10" stroke={grads.text} strokeWidth="6" opacity="0.1" strokeLinecap="round" />
            </g>
          </>
        );

      // 7. Rotate PDF
      case 'rotate-pdf':
        return (
          <>
            <style>{`
              @keyframes rotate-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .group:hover .rotate-arrow { animation: rotate-spin 1.8s linear infinite; }
              .group:hover .rotate-sheet { transform: scale(0.96); }
            `}</style>
            {/* Document sheet */}
            <g className="rotate-sheet" style={{ transformOrigin: 'center', transition: 'all 0.3s ease' }}>
              <rect x="12" y="8" width="24" height="32" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <path d="M16 16h16M16 22h16M16 28h10" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            </g>
            {/* Spinning rotation arrow overlay */}
            <g className="rotate-arrow" style={{ transformOrigin: '24px 24px' }}>
              <path d="M38 24a14 14 0 1 1-4.1-9.9" fill="none" stroke={grads.text} strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="34,10 39,14.5 32,15.5" fill={grads.text} />
            </g>
          </>
        );

      // 8. Crop PDF
      case 'crop-pdf':
        return (
          <>
            <style>{`
              .group:hover .crop-border { transform: scale(0.94); }
              .group:hover .crop-sheet { opacity: 0.3; }
            `}</style>
            {/* Outer sheet */}
            <rect x="12" y="8" width="24" height="32" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" className="crop-sheet" style={{ transition: 'all 0.3s ease' }} />
            {/* Crop tool lines */}
            <g className="crop-border" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <line x1="6" y1="12" x2="42" y2="12" stroke={grads.text} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="12" y1="6" x2="12" y2="42" stroke={grads.text} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="6" y1="36" x2="42" y2="36" stroke={grads.text} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="36" y1="6" x2="36" y2="42" stroke={grads.text} strokeWidth="2.2" strokeLinecap="round" />
              <rect x="12" y="12" width="24" height="24" fill="none" stroke={grads.text} strokeWidth="1.5" strokeDasharray="3 3" rx="2" />
            </g>
          </>
        );

      // 9. Compare PDF
      case 'compare-pdf':
        return (
          <>
            <style>{`
              @keyframes slider-move {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(4px); }
              }
              .group:hover .compare-slider { animation: slider-move 2s ease-in-out infinite; }
              .group:hover .compare-s1 { transform: translateX(-2px); }
              .group:hover .compare-s2 { transform: translateX(2px); }
            `}</style>
            {/* Page 1 (Red) */}
            <g className="compare-s1" style={{ transition: 'all 0.4s ease' }}>
              <rect x="6" y="8" width="16" height="32" rx="3" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <line x1="10" y1="16" x2="18" y2="16" stroke={grads.text} strokeWidth="1.5" opacity="0.3" />
              <line x1="10" y1="22" x2="18" y2="22" stroke={grads.text} strokeWidth="1.5" opacity="0.3" />
              <line x1="10" y1="28" x2="15" y2="28" stroke={grads.text} strokeWidth="1.5" opacity="0.3" />
            </g>
            {/* Page 2 (Glass comparison) */}
            <g className="compare-s2" style={{ transition: 'all 0.4s ease' }}>
              <rect x="26" y="8" width="16" height="32" rx="3" fill="url(#glass)" stroke={grads.primary} strokeWidth="1.5" />
              <line x1="30" y1="16" x2="38" y2="16" stroke={grads.text} strokeWidth="1.5" opacity="0.4" />
              <line x1="30" y1="24" x2="38" y2="24" stroke={grads.text} strokeWidth="1.5" opacity="0.4" />
              <line x1="30" y1="32" x2="36" y2="32" stroke={grads.text} strokeWidth="1.5" opacity="0.4" />
            </g>
            {/* Interactive scanning separator */}
            <g className="compare-slider" style={{ transition: 'all 0.4s ease' }}>
              <line x1="24" y1="4" x2="24" y2="44" stroke={grads.text} strokeWidth="2" strokeLinecap="round" />
              <circle cx="24" cy="24" r="3.5" fill={grads.text} />
            </g>
          </>
        );

      // 10. PDF to PDF/A (Archiving standard)
      case 'pdf-to-pdfa':
        return (
          <>
            <style>{`
              .group:hover .pdfa-drawer { transform: translate(3px, -3px); }
              .group:hover .pdfa-badge { transform: translateY(-1px) scale(1.05); }
            `}</style>
            {/* Main sheet outline */}
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Archive drawer background graphic */}
            <g className="pdfa-drawer" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="14" y="12" width="20" height="11" rx="2" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <circle cx="24" cy="17.5" r="1.2" fill={grads.text} />
            </g>
            {/* ISO standard certificate badge */}
            <g className="pdfa-badge" style={{ transformOrigin: 'center', transition: 'all 0.3s ease' }}>
              <rect x="14" y="27" width="20" height="11" rx="2.5" fill={grads.primary} />
              <text x="24" y="35" fill="white" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.2">PDF/A</text>
            </g>
          </>
        );

      // 11. Compress PDF
      case 'compress-pdf':
        return (
          <>
            <style>{`
              .group:hover .compress-arrows { transform: scaleY(0.7) scaleX(0.7); }
              .group:hover .compress-sheet { transform: scale(0.9) scaleY(0.85); }
            `}</style>
            {/* Sheet outline */}
            <g className="compress-sheet" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="12" y="10" width="24" height="28" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <path d="M16 18h16M16 24h16M16 30h10" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            </g>
            {/* Compression arrows */}
            <g className="compress-arrows" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <path d="M24 2v6M21 5l3 3 3-3M24 46v-6M21 43l3-3 3 3" fill="none" stroke={grads.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      // 12. OCR PDF
      case 'ocr-pdf':
        return (
          <>
            <style>{`
              @keyframes ocr-sweep {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(24px); }
              }
              .group:hover .ocr-line { animation: ocr-sweep 1.8s ease-in-out infinite; }
              .group:hover .ocr-scanned-text { opacity: 0.85; }
              .group:hover .ocr-raw-dots { opacity: 0.1; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Raw un-OCRed dots/dashes */}
            <g className="ocr-raw-dots" style={{ transition: 'all 0.4s ease' }} opacity="0.5">
              <circle cx="16" cy="14" r="1" fill={grads.text} />
              <circle cx="22" cy="14" r="1" fill={grads.text} />
              <circle cx="28" cy="14" r="1" fill={grads.text} />
              <circle cx="16" cy="22" r="1" fill={grads.text} />
              <circle cx="22" cy="22" r="1" fill={grads.text} />
              <circle cx="16" cy="30" r="1" fill={grads.text} />
            </g>
            {/* OCRed clean lines */}
            <g className="ocr-scanned-text" style={{ transition: 'all 0.4s ease' }} opacity="0">
              <line x1="14" y1="14" x2="34" y2="14" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14" y1="22" x2="30" y2="22" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14" y1="30" x2="26" y2="30" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" />
            </g>
            {/* Scanning line indicator */}
            <g className="ocr-line" style={{ transformOrigin: 'center' }}>
              <line x1="8" y1="11" x2="40" y2="11" stroke={grads.text} strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="11" x2="40" y2="11" stroke={grads.text} strokeWidth="5" opacity="0.1" strokeLinecap="round" />
            </g>
          </>
        );

      // 13. Repair PDF
      case 'repair-pdf':
        return (
          <>
            <style>{`
              @keyframes repair-wiggle {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(15deg); }
              }
              .group:hover .repair-wrench { animation: repair-wiggle 0.8s ease-in-out infinite; }
              .group:hover .repair-crack { opacity: 0.15; stroke-dashoffset: 5; }
              .group:hover .repair-stars { transform: scale(1.15); opacity: 1; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Document crack (damaged text flow) */}
            <path className="repair-crack" d="M16 16l4 2-2 4 4 2-3 4" fill="none" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
            {/* Interactive healing tool */}
            <g className="repair-wrench" style={{ transformOrigin: '28px 28px', transition: 'all 0.4s ease' }}>
              <rect x="23" y="23" width="10" height="13" rx="2" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <circle cx="28" cy="27" r="2" fill="none" stroke={grads.text} strokeWidth="1.5" />
              <path d="M26 31h4" stroke={grads.text} strokeWidth="1.5" />
            </g>
            {/* Shiny recovery sparkles */}
            <g className="repair-stars" style={{ transformOrigin: 'center', transition: 'all 0.4s ease', opacity: 0 }}>
              <path d="M14 26l1-2 1 2-1 1zM20 12l1.5-2.5 1.5 2.5-1.5 1.5z" fill={grads.text} />
            </g>
          </>
        );

      // 14. Word to PDF
      case 'docx-to-pdf':
      case 'word-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Word doc card (Blue) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-blue-soft)" stroke="url(#grad-blue)" strokeWidth="1.5" />
              <text x="15" y="28" fill="#1d4ed8" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">W</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 15. PDF to Word
      case 'pdf-to-word':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* PDF doc card (Red) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="15" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* Word doc card (Blue) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-blue-soft)" stroke="url(#grad-blue)" strokeWidth="1.5" />
              <text x="33" y="28" fill="#1d4ed8" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">W</text>
            </g>
          </>
        );

      // 16. Excel to PDF
      case 'excel-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Excel doc card (Forest Green) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-forest-soft)" stroke="url(#grad-forest)" strokeWidth="1.5" />
              <text x="15" y="28" fill="#064e3b" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">X</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 17. PDF to Excel
      case 'pdf-to-excel':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* PDF doc card (Red) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="15" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* Excel doc card (Forest Green) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-forest-soft)" stroke="url(#grad-forest)" strokeWidth="1.5" />
              <text x="33" y="28" fill="#064e3b" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">X</text>
            </g>
          </>
        );

      // 18. PowerPoint to PDF
      case 'powerpoint-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* PowerPoint doc card (Orange) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-orange-soft)" stroke="url(#grad-orange)" strokeWidth="1.5" />
              <text x="15" y="28" fill="#c2410c" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">P</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 19. PDF to PowerPoint
      case 'pdf-to-powerpoint':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* PDF doc card (Red) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="15" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PowerPoint doc card (Orange) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-orange-soft)" stroke="url(#grad-orange)" strokeWidth="1.5" />
              <text x="33" y="28" fill="#c2410c" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">P</text>
            </g>
          </>
        );

      // 20. Text to PDF
      case 'text-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Plain text doc card (Blue) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-blue-soft)" stroke="url(#grad-blue)" strokeWidth="1.5" />
              <line x1="9" y1="18" x2="21" y2="18" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9" y1="24" x2="21" y2="24" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9" y1="30" x2="16" y2="30" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 21. Edit PDF
      case 'edit-pdf':
        return (
          <>
            <style>{`
              @keyframes edit-write {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(-2px, 2px); }
              }
              .group:hover .edit-pen { animation: edit-write 1.2s ease-in-out infinite; }
              .group:hover .edit-line-draw { stroke-dashoffset: 0; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <path d="M15 14h18M15 20h18M15 26h10" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            {/* Draw effect line */}
            <path className="edit-line-draw" d="M15 26h10" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="10" strokeDashoffset="10" style={{ transition: 'all 0.5s ease-in-out' }} />
            {/* Writing instrument */}
            <g className="edit-pen" style={{ transformOrigin: '28px 20px', transition: 'all 0.4s ease' }}>
              <path d="M28 20l7-7 2.5 2.5-7 7-2.5-2.5z" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <polygon points="28,20 26,22 28,21" fill={grads.text} />
            </g>
          </>
        );

      // 22. Add Watermark
      case 'add-watermark':
        return (
          <>
            <style>{`
              .group:hover .watermark-stamp { transform: translate(24px, 24px) rotate(-20deg) scale(1.15); opacity: 1; }
              .group:hover .watermark-sheet { opacity: 0.5; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" className="watermark-sheet" style={{ transition: 'all 0.3s ease' }} />
            <path d="M14 14h20M14 20h20M14 26h12" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            {/* Watermark stamp overlay */}
            <g className="watermark-stamp" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: 0.7 }} transform="translate(24, 24) rotate(-20)">
              <rect x="-17" y="-6" width="34" height="12" rx="2" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <text x="0" y="3" fill={grads.text} fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.8">DRAFT</text>
            </g>
          </>
        );

      // 23. PDF Forms
      case 'pdf-forms':
        return (
          <>
            <style>{`
              .group:hover .form-check { transform: scale(1.1); stroke-dashoffset: 0; }
              .group:hover .form-radio { fill: ${grads.text}; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Checkbox item */}
            <g transform="translate(14, 13)">
              <rect x="0" y="0" width="8" height="8" rx="1.8" fill="none" stroke={grads.text} strokeWidth="1.5" />
              <path className="form-check" d="M2.2 4.2l1.6 1.6 2.6-3.2" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="9" strokeDashoffset="9" style={{ transition: 'all 0.3s ease' }} />
              <line x1="13" y1="4" x2="21" y2="4" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </g>
            {/* Radio item */}
            <g transform="translate(14, 25)">
              <circle cx="4" cy="4" r="4" fill="none" stroke={grads.text} strokeWidth="1.5" />
              <circle className="form-radio" cx="4" cy="4" r="1.8" fill="none" style={{ transition: 'all 0.3s ease' }} />
              <line x1="13" y1="4" x2="21" y2="4" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </g>
          </>
        );

      // 24. Image Converter
      case 'image-converter':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Source image card (Purple) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-purple-soft)" stroke="url(#grad-purple)" strokeWidth="1.5" />
              <circle cx="10" cy="16" r="2" fill="#6d28d9" />
              <path d="M8 30l4-4 4 4 4-4 2 2" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* Destination image card (Purple) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-purple-soft)" stroke="url(#grad-purple)" strokeWidth="1.5" />
              <circle cx="28" cy="16" r="2" fill="#6d28d9" />
              <path d="M26 30l3-3 3 3 3-3 2 2" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      // 25. Image Compressor
      case 'image-compressor':
        return (
          <>
            <style>{`
              .group:hover .compress-arrows { transform: scaleX(0.75); }
              .group:hover .compress-img { transform: scaleX(0.88); }
            `}</style>
            {/* Landscape image card */}
            <g className="compress-img" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="8" y="12" width="32" height="24" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <circle cx="14" cy="18" r="2" fill={grads.text} opacity="0.5" />
              <path d="M12 28l5-5 5 5 7-7 4 4" fill="none" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Outer squeezing arrows */}
            <g className="compress-arrows" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <path d="M2 24h6M5 21l3 3-3 3M46 24h-6M43 21l-3 3 3 3" fill="none" stroke={grads.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      // 26. Image Resizer
      case 'image-resizer':
        return (
          <>
            <style>{`
              .group:hover .resize-bounds { transform: scale(1.08); }
              .group:hover .resize-img { transform: scale(0.92); }
            `}</style>
            {/* Image card */}
            <g className="resize-img" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }}>
              <rect x="11" y="11" width="26" height="26" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
              <circle cx="17" cy="17" r="2.2" fill={grads.text} opacity="0.4" />
              <path d="M14 30l4-4 4 4 5-5 4 4" fill="none" stroke={grads.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Resize Target Frame */}
            <g className="resize-bounds" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="6" y="6" width="36" height="36" fill="none" stroke={grads.text} strokeWidth="1.5" strokeDasharray="3 3" rx="2" />
              <rect x="4" y="4" width="4" height="4" fill={grads.text} rx="0.5" />
              <rect x="38" y="4" width="4" height="4" fill={grads.text} rx="0.5" />
              <rect x="4" y="38" width="4" height="4" fill={grads.text} rx="0.5" />
              <rect x="38" y="38" width="4" height="4" fill={grads.text} rx="0.5" />
            </g>
          </>
        );

      // 27. PDF to Image
      case 'pdf-to-image':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* PDF doc card (Red) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="15" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* Image card (Purple) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-purple-soft)" stroke="url(#grad-purple)" strokeWidth="1.5" />
              <circle cx="28" cy="16" r="2" fill="#6d28d9" />
              <path d="M26 30l3-3 3 3 3-3 2 2" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        );

      // 28. Image to PDF
      case 'image-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Image card (Purple) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-purple-soft)" stroke="url(#grad-purple)" strokeWidth="1.5" />
              <circle cx="10" cy="16" r="2" fill="#6d28d9" />
              <path d="M8 30l4-4 4 4 4-4 2 2" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 29. Add Page Numbers
      case 'add-page-numbers':
        return (
          <>
            <style>{`
              .group:hover .num-p1 { transform: translateY(-3px); opacity: 1; }
              .group:hover .num-p2 { transform: translateY(3px); opacity: 1; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
            <path d="M14 14h20M14 20h20" stroke="#d92516" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            {/* Sequential page tag 1 */}
            <g className="num-p1" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <circle cx="18" cy="28" r="4.5" fill="url(#glass)" stroke="#d92516" strokeWidth="1" />
              <text x="18" y="31.2" fill="#d92516" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">1</text>
            </g>
            {/* Sequential page tag 2 */}
            <g className="num-p2" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <circle cx="30" cy="28" r="4.5" fill="url(#glass)" stroke="#d92516" strokeWidth="1" />
              <text x="30" y="31.2" fill="#d92516" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">2</text>
            </g>
          </>
        );

      // 30. HTML to PDF
      case 'html-to-pdf':
        return (
          <>
            <style>{`
              .group:hover .conv-from { transform: translateX(-3px); }
              .group:hover .conv-to { transform: translateX(3px); }
              .group:hover .conv-arrow { transform: scaleX(1.2); }
            `}</style>
            {/* Code tag card (Grey) */}
            <g className="conv-from" style={{ transition: 'all 0.4s ease' }}>
              <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#grad-grey-soft)" stroke="url(#grad-grey)" strokeWidth="1.5" />
              <text x="15" y="27" fill="#4b5563" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">&lt;/&gt;</text>
            </g>
            {/* Switch arrow */}
            <g className="conv-arrow" style={{ transformOrigin: '24px 24px', transition: 'all 0.4s ease' }}>
              <path d="M22 24h4" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
              <polygon points="25,21 28,24 25,27" fill="#4b5563" />
            </g>
            {/* PDF doc card (Red) */}
            <g className="conv-to" style={{ transition: 'all 0.4s ease' }}>
              <rect x="23" y="10" width="20" height="28" rx="3" fill="url(#grad-red-soft)" stroke="url(#grad-red)" strokeWidth="1.5" />
              <text x="33" y="27" fill="#d92516" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
            </g>
          </>
        );

      // 31. Protect PDF
      case 'protect-pdf':
        return (
          <>
            <style>{`
              .group:hover .lock-shackle { transform: translateY(2px); }
              .group:hover .lock-body { transform: scale(1.05); }
            `}</style>
            <rect x="10" y="12" width="28" height="30" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <g className="lock-body" style={{ transformOrigin: '24px 28px', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="16" y="22" width="16" height="12" rx="2" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <circle cx="24" cy="27" r="1.5" fill={grads.text} />
              <path d="M24 28.5v2" stroke={grads.text} strokeWidth="1" strokeLinecap="round" />
            </g>
            {/* Shackle */}
            <path className="lock-shackle" d="M20 22v-6a4 4 0 0 1 8 0v6" fill="none" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" style={{ transition: 'all 0.35s ease' }} />
          </>
        );

      // 32. Unlock PDF
      case 'unlock-pdf':
        return (
          <>
            <style>{`
              @keyframes lock-unlock {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-2px) rotate(-12deg); }
              }
              .group:hover .unlock-shackle { animation: lock-unlock 0.8s ease-in-out infinite; }
              .group:hover .lock-body { transform: scale(1.05); }
            `}</style>
            <rect x="10" y="12" width="28" height="30" rx="3.5" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <g className="lock-body" style={{ transformOrigin: '24px 28px', transition: 'all 0.4s ease' }}>
              <rect x="16" y="22" width="16" height="12" rx="2" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <circle cx="24" cy="27" r="1.5" fill={grads.text} />
              <path d="M24 28.5v2" stroke={grads.text} strokeWidth="1" strokeLinecap="round" />
            </g>
            {/* Unlocked Shackle */}
            <path className="unlock-shackle" d="M20 22v-10a4 4 0 0 1 8 0v4" fill="none" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" style={{ transformOrigin: '20px 22px', transition: 'all 0.4s ease' }} />
          </>
        );

      // 33. Sign PDF
      case 'sign-pdf':
        return (
          <>
            <style>{`
              @keyframes sign-write {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(-2px, 1px); }
              }
              .group:hover .sign-pen { animation: sign-write 1.2s ease-in-out infinite; }
              .group:hover .sign-line { stroke-dashoffset: 0; }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <line x1="14" y1="30" x2="34" y2="30" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            {/* Signature stroke */}
            <path className="sign-line" d="M16 28c2-3 4-3 6 0s4 3 6 0 4-3 6 0" fill="none" stroke={grads.text} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="30" strokeDashoffset="30" style={{ transition: 'all 0.8s ease-in-out' }} />
            {/* Pen */}
            <g className="sign-pen" style={{ transformOrigin: '30px 18px', transition: 'all 0.4s ease' }}>
              <path d="M30 18l5-5 2 2-5 5-2-2z" fill="url(#glass)" stroke={grads.text} strokeWidth="1.5" />
              <polygon points="30,18 28,20 29,19" fill={grads.text} />
            </g>
          </>
        );

      // 34. Redact PDF
      case 'redact-pdf':
        return (
          <>
            <style>{`
              .group:hover .redact-block-1 { transform: scaleX(1.1); }
              .group:hover .redact-block-2 { transform: scaleX(1.15); }
              .group:hover .redact-shield { transform: scale(1.1); }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Text lines */}
            <line x1="14" y1="14" x2="34" y2="14" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            <line x1="14" y1="20" x2="34" y2="20" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            <line x1="14" y1="26" x2="26" y2="26" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            {/* Redacted censor marks */}
            <rect className="redact-block-1" x="18" y="11.5" width="12" height="5" rx="1" fill="#1f2937" style={{ transformOrigin: '18px 14px', transition: 'all 0.4s ease' }} />
            <rect className="redact-block-2" x="13" y="17.5" width="16" height="5" rx="1" fill="#1f2937" style={{ transformOrigin: '13px 20px', transition: 'all 0.4s ease' }} />
            {/* Censor shield badge */}
            <g className="redact-shield" style={{ transformOrigin: '28px 28px', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <path d="M25 24h6v5c0 3.5-3 5-3 5s-3-1.5-3-5v-5z" fill={grads.primary} stroke="white" strokeWidth="1" />
            </g>
          </>
        );

      // 35. QR Generator
      case 'qr-generator':
        return (
          <>
            <style>{`
              @keyframes qr-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
              .group:hover .qr-corner { transform: scale(1.05); }
              .group:hover .qr-pixel { animation: qr-blink 1.2s ease-in-out infinite; }
            `}</style>
            <rect x="6" y="6" width="36" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* QR Corner anchors */}
            <g className="qr-corner" style={{ transformOrigin: 'center', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <rect x="10" y="10" width="8" height="8" rx="1.5" fill="none" stroke={grads.text} strokeWidth="1.8" />
              <rect x="13" y="13" width="2" height="2" fill={grads.text} />
              <rect x="30" y="10" width="8" height="8" rx="1.5" fill="none" stroke={grads.text} strokeWidth="1.8" />
              <rect x="33" y="13" width="2" height="2" fill={grads.text} />
              <rect x="10" y="30" width="8" height="8" rx="1.5" fill="none" stroke={grads.text} strokeWidth="1.8" />
              <rect x="13" y="33" width="2" height="2" fill={grads.text} />
            </g>
            {/* Blinking bits */}
            <g className="qr-pixel" fill={grads.text}>
              <rect x="22" y="12" width="2" height="2" />
              <rect x="26" y="10" width="2" height="2" />
              <rect x="20" y="16" width="2" height="2" />
              <rect x="24" y="20" width="2" height="2" />
              <rect x="20" y="24" width="2" height="2" />
              <rect x="26" y="24" width="2" height="2" />
              <rect x="14" y="22" width="2" height="2" />
              <rect x="30" y="22" width="2" height="2" />
              <rect x="34" y="20" width="2" height="2" />
              <rect x="32" y="26" width="2" height="2" />
              <rect x="22" y="30" width="2" height="2" />
              <rect x="26" y="32" width="2" height="2" />
              <rect x="30" y="30" width="2" height="2" />
            </g>
          </>
        );

      // 36. AI Summarizer
      case 'ai-summarizer':
        return (
          <>
            <style>{`
              @keyframes sparkle-glow {
                0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
                50% { transform: scale(1.2) rotate(45deg); opacity: 0.6; }
              }
              .group:hover .ai-star { animation: sparkle-glow 1.4s ease-in-out infinite; }
              .group:hover .ai-lines { transform: translateY(1px); }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <g className="ai-lines" style={{ transition: 'all 0.3s ease' }}>
              <line x1="14" y1="24" x2="34" y2="24" stroke={grads.primary} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
              <line x1="14" y1="30" x2="28" y2="30" stroke={grads.primary} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
            </g>
            {/* Sparkle star */}
            <g className="ai-star" style={{ transformOrigin: '24px 12px' }}>
              <path d="M24 4l1.5 4.5L30 10l-4.5 1.5L24 16l-1.5-4.5L18 10l4.5-1.5z" fill={grads.text} />
              <path d="M32 16l0.8 1.8 1.8 0.8-1.8 0.8-0.8 1.8-0.8-1.8-1.8-0.8 1.8-0.8z" fill={grads.text} />
            </g>
          </>
        );

      // 37. Translate PDF
      case 'translate-pdf':
        return (
          <>
            <style>{`
              @keyframes globe-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .group:hover .trans-globe { animation: globe-spin 12s linear infinite; }
              .group:hover .trans-badge-a { transform: translate(-1.5px, 1.5px); }
              .group:hover .trans-badge-b { transform: translate(1.5px, -1.5px); }
            `}</style>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            {/* Globe wireframe */}
            <g className="trans-globe" style={{ transformOrigin: '24px 20px' }}>
              <circle cx="24" cy="20" r="9.5" fill="url(#glass)" stroke={grads.text} strokeWidth="1.2" />
              <path d="M14.5 20h19M24 10.5c2 3 2 16 0 19M24 10.5c-2 3-2 16 0 19" fill="none" stroke={grads.text} strokeWidth="1" />
            </g>
            {/* Double Translation Badge bubbles */}
            <g className="trans-badge-a" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }} transform="translate(12, 28)">
              <rect x="0" y="0" width="9" height="9" rx="2" fill="white" stroke={grads.text} strokeWidth="1" />
              <text x="4.5" y="7.2" fill={grads.text} fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">A</text>
            </g>
            <g className="trans-badge-b" style={{ transformOrigin: 'center', transition: 'all 0.4s ease' }} transform="translate(27, 28)">
              <rect x="0" y="0" width="9" height="9" rx="2" fill="white" stroke={grads.text} strokeWidth="1" />
              <text x="4.5" y="7.5" fill={grads.text} fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">文</text>
            </g>
          </>
        );

      // Default
      default:
        return (
          <>
            <rect x="10" y="6" width="28" height="36" rx="4" fill={grads.secondary} stroke={grads.primary} strokeWidth="1.5" />
            <path d="M14 14h20M14 20h20M14 26h14" stroke={grads.primary} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none v3d-icon"
    >
      <defs>
        {/* Glossy glass reflection overlay */}
        <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        
        {/* Coral Red Gradients */}
        <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="grad-red-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5f5" />
          <stop offset="100%" stopColor="#fee2e2" />
        </linearGradient>
        
        {/* Emerald Green Gradients */}
        <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="grad-green-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        
        {/* Royal Blue Gradients */}
        <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="grad-blue-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>

        {/* Forest Green Gradients */}
        <linearGradient id="grad-forest" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="grad-forest-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>

        {/* Orange Gradients */}
        <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="grad-orange-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="100%" stopColor="#ffedd5" />
        </linearGradient>

        {/* Purple Gradients */}
        <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="grad-purple-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#faf5ff" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>

        {/* Amber Gradients */}
        <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="grad-amber-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>

        {/* Teal Gradients */}
        <linearGradient id="grad-teal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#99f6e4" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>
        <linearGradient id="grad-teal-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#ccfbf1" />
        </linearGradient>

        {/* Grey Gradients */}
        <linearGradient id="grad-grey" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="50%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="grad-grey-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="100%" stopColor="#f3f4f6" />
        </linearGradient>
      </defs>
      {renderIconContent()}
    </svg>
  );
}
