import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import {
  generateQRToCanvas,
  generateQRSVG,
  generateQRPdfFlyer,
  formatQrPayload,
  QR_PAYLOAD_TYPES,
  COLOR_PALETTES
} from '../../engines/utility/qrGenerate';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  QrCode,
  Sparkles,
  Download,
  Copy,
  Check,
  FileCheck,
  Globe,
  Wifi,
  User,
  Mail,
  FileText,
  Palette,
  ShieldCheck,
  Layers,
  Printer
} from 'lucide-react';

export default function QrGenerator() {
  const [payloadType, setPayloadType] = useState('url'); // 'url' | 'wifi' | 'vcard' | 'email' | 'text'
  const [urlData, setUrlData] = useState('https://docforge.app');
  const [textData, setTextData] = useState('Hello from DocForge QR Studio!');
  const [wifiData, setWifiData] = useState({ ssid: 'Office_Network', password: 'secret_password_2026', encryption: 'WPA', hidden: false });
  const [vcardData, setVcardData] = useState({ name: 'Alex Morgan', phone: '+1 (555) 234-5678', email: 'alex@docforge.app', company: 'DocForge Inc.', title: 'Lead Architect' });
  const [emailData, setEmailData] = useState({ to: 'contact@docforge.app', subject: 'Inquiry', body: 'Hello DocForge team,' });

  // Customization State
  const [size, setSize] = useState(380);
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [exportFormat, setExportFormat] = useState('png'); // 'png' | 'svg' | 'pdf'
  const [zoomScale, setZoomScale] = useState(1.0);

  // Result & UI State
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('qr-generator');
        if (draft && isMounted) {
          if (draft.payloadType) setPayloadType(draft.payloadType);
          if (draft.urlData) setUrlData(draft.urlData);
          if (draft.textData) setTextData(draft.textData);
          if (draft.wifiData) setWifiData(draft.wifiData);
          if (draft.vcardData) setVcardData(draft.vcardData);
          if (draft.emailData) setEmailData(draft.emailData);
          if (draft.size) setSize(draft.size);
          if (draft.darkColor) setDarkColor(draft.darkColor);
          if (draft.lightColor) setLightColor(draft.lightColor);
          if (draft.errorCorrection) setErrorCorrection(draft.errorCorrection);
        }
      } catch (err) {
        console.warn('QR Generator draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    saveStudioDraft('qr-generator', {
      payloadType,
      urlData,
      textData,
      wifiData,
      vcardData,
      emailData,
      size,
      darkColor,
      lightColor,
      errorCorrection
    });
  }, [payloadType, urlData, textData, wifiData, vcardData, emailData, size, darkColor, lightColor, errorCorrection]);

  // 3. Compute Current Formatted Payload String
  const currentFormattedPayload = (() => {
    switch (payloadType) {
      case 'wifi':
        return formatQrPayload('wifi', wifiData);
      case 'vcard':
        return formatQrPayload('vcard', vcardData);
      case 'email':
        return formatQrPayload('email', emailData);
      case 'text':
        return textData;
      case 'url':
      default:
        return urlData;
    }
  })();

  // 4. Render QR to Canvas in Real Time
  useEffect(() => {
    if (!currentFormattedPayload || !currentFormattedPayload.trim()) {
      setError('Please provide data for the QR code payload.');
      return;
    }
    setError(null);

    const updateCanvas = async () => {
      try {
        if (canvasRef.current) {
          await generateQRToCanvas(canvasRef.current, currentFormattedPayload, {
            size,
            darkColor,
            lightColor,
            errorCorrection
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to generate QR code.');
      }
    };

    const timer = setTimeout(updateCanvas, 60);
    return () => clearTimeout(timer);
  }, [currentFormattedPayload, size, darkColor, lightColor, errorCorrection]);

  // 5. Apply Color Preset
  const applyPalette = (palette) => {
    setDarkColor(palette.dark);
    setLightColor(palette.light);
  };

  // 6. Handle Export
  const handleExport = async () => {
    if (!currentFormattedPayload) return;
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (exportFormat === 'svg') {
        const svgString = await generateQRSVG(currentFormattedPayload, {
          size,
          darkColor,
          lightColor,
          errorCorrection
        });
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const finalName = `qrcode_${payloadType}.svg`;
        setResult({ blob: svgBlob, name: finalName, format: 'SVG', payload: currentFormattedPayload });
        await saveFile(finalName, svgBlob.size, 'image/svg+xml', 'QR Generator', svgBlob);
      } else if (exportFormat === 'pdf') {
        const pdfBlob = await generateQRPdfFlyer(currentFormattedPayload, {
          title: `Scan QR: ${payloadType.toUpperCase()}`,
          darkColor,
          lightColor,
          errorCorrection
        });
        const finalName = `qrcode_flyer_${payloadType}.pdf`;
        setResult({ blob: pdfBlob, name: finalName, format: 'PDF', payload: currentFormattedPayload });
        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'QR Generator', pdfBlob);
      } else {
        // PNG
        if (!canvasRef.current) throw new Error('Canvas not available for PNG export.');
        await new Promise((resolve) => {
          canvasRef.current.toBlob(async (blob) => {
            const finalName = `qrcode_${payloadType}.png`;
            setResult({ blob, name: finalName, format: 'PNG', payload: currentFormattedPayload });
            await saveFile(finalName, blob.size, 'image/png', 'QR Generator', blob);
            resolve();
          }, 'image/png');
        });
      }
      await clearStudioDraft('qr-generator');
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyPayload = () => {
    if (!currentFormattedPayload) return;
    navigator.clipboard.writeText(currentFormattedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResult = () => {
    if (!result || !result.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('qr-generator');
    setPayloadType('url');
    setUrlData('https://docforge.app');
    setTextData('Hello from DocForge QR Studio!');
    setSize(380);
    setDarkColor('#000000');
    setLightColor('#ffffff');
    setErrorCorrection('M');
    setResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout
      toolId="qr-generator"
      title="QR Code Studio"
      description="Create customizable, high-resolution vector QR codes for URLs, Wi-Fi networks, contact vCards, emails, and printable flyers."
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Free QR Code Generator Online — Custom Vector SVG, PNG & PDF | DocForge"
        description="Create high-resolution custom QR codes online for free. Support for URLs, Wi-Fi credentials, vCard contacts, SVG vector exports, and printable PDF flyers."
      />

      {!result ? (
        <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
          {/* ========================================================================= */}
          {/* LEFT / CENTER: Interactive Live QR Stage                                  */}
          {/* ========================================================================= */}
          <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
            {/* Sticky Top Toolbar */}
            <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
              <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
                {/* Payload Type Switcher Pill */}
                <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                  {QR_PAYLOAD_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPayloadType(t.id)}
                      className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        payloadType === t.id
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {t.id === 'url' && <Globe size={13} />}
                      {t.id === 'wifi' && <Wifi size={13} />}
                      {t.id === 'vcard' && <User size={13} />}
                      {t.id === 'email' && <Mail size={13} />}
                      {t.id === 'text' && <FileText size={13} />}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Canvas Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="flex items-center gap-1 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                    title="Copy payload string"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                    <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={zoomScale}
                      onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                      {Math.round(zoomScale * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={resetWorkspace}
                    className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                    title="Reset workspace"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Viewport Canvas Stage */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
              <div
                className="relative bg-[var(--bg-primary)] shadow-2xl rounded-3xl border border-[var(--border-subtle)] p-8 flex flex-col items-center gap-6 transition-transform duration-150 origin-center max-w-md w-full"
                style={{ transform: `scale(${zoomScale})` }}
              >
                {/* QR Code Canvas Frame */}
                <div
                  className="p-4 rounded-2xl border border-[var(--border-subtle)] shadow-inner flex items-center justify-center transition-colors"
                  style={{ backgroundColor: lightColor }}
                >
                  <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto" />
                </div>

                {/* Payload Telemetry Pill */}
                <div className="w-full flex flex-col items-center gap-1 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] max-w-full">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[260px]">{currentFormattedPayload}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                    {size}x{size} px • Level {errorCorrection} ({(errorCorrection === 'L' ? '7%' : errorCorrection === 'M' ? '15%' : errorCorrection === 'Q' ? '25%' : '30%')} Recovery)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: Studio Options Sidebar                                             */}
          {/* ========================================================================= */}
          <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Customization
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full uppercase">
                {payloadType}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Dynamic Payload Input Form */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  {payloadType === 'url' ? 'Webpage URL' : payloadType === 'wifi' ? 'Wi-Fi Details' : payloadType === 'vcard' ? 'Contact Information' : payloadType === 'email' ? 'Email Details' : 'Text Content'}
                </label>

                {payloadType === 'url' && (
                  <input
                    type="url"
                    value={urlData}
                    onChange={(e) => setUrlData(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                )}

                {payloadType === 'text' && (
                  <textarea
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    placeholder="Enter any text..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none resize-none"
                  />
                )}

                {payloadType === 'wifi' && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={wifiData.ssid}
                      onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                      placeholder="Network Name (SSID)"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <input
                      type="text"
                      value={wifiData.password}
                      onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                      placeholder="Password"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <select
                      value={wifiData.encryption}
                      onChange={(e) => setWifiData({ ...wifiData, encryption: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">No Password (Open)</option>
                    </select>
                  </div>
                )}

                {payloadType === 'vcard' && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={vcardData.name}
                      onChange={(e) => setVcardData({ ...vcardData, name: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <input
                      type="tel"
                      value={vcardData.phone}
                      onChange={(e) => setVcardData({ ...vcardData, phone: e.target.value })}
                      placeholder="Phone Number"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <input
                      type="email"
                      value={vcardData.email}
                      onChange={(e) => setVcardData({ ...vcardData, email: e.target.value })}
                      placeholder="Email Address"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}

                {payloadType === 'email' && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={emailData.to}
                      onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                      placeholder="Recipient Email"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      placeholder="Subject Line"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 2. Color Palettes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Color Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COLOR_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPalette(p)}
                      className="p-1.5 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary)] flex items-center gap-1.5 text-left cursor-pointer transition-all bg-[var(--bg-secondary)]"
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: p.dark }}
                      />
                      <span className="text-[10px] font-semibold text-[var(--text-primary)] truncate">
                        {p.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Pickers */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <input
                      type="color"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">Foreground</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <input
                      type="color"
                      value={lightColor}
                      onChange={(e) => setLightColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">Background</span>
                  </div>
                </div>
              </div>

              {/* 3. Error Correction */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Error Correction Level
                </span>
                <div className="grid grid-cols-4 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs text-center">
                  {['L', 'M', 'Q', 'H'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setErrorCorrection(lvl)}
                      className={`py-1 font-bold rounded-lg transition-all cursor-pointer ${
                        errorCorrection === lvl
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Export Format Selector */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Export Format
                </span>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs text-center">
                  {[
                    { id: 'png', label: 'PNG Image' },
                    { id: 'svg', label: 'Vector SVG' },
                    { id: 'pdf', label: 'PDF Flyer' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setExportFormat(fmt.id)}
                      className={`py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                        exportFormat === fmt.id
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Sticky Primary CTA Action Button */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <button
                type="button"
                onClick={handleExport}
                disabled={processing || !currentFormattedPayload}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Exporting QR Code...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download {exportFormat.toUpperCase()} ({exportFormat === 'pdf' ? 'Flyer' : exportFormat === 'svg' ? 'Vector' : 'High-Res'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/10">
              <QrCode size={40} />
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                QR Code Generated!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your custom {result.format} QR code is ready with high scan reliability.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-[var(--color-primary)]" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.blob?.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.blob.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Format</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">{result.format}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Level</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{errorCorrection}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Resolution</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">{size}x{size}</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadResult}
              >
                <Download size={18} />
                <span>Download {result.format} File ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Create Another QR</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocForge
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/url-to-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">link</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">URL to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Capture webpage to PDF</p>
                  </div>
                </Link>

                <Link
                  to="/image-converter"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-purple-500">image</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Converter</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Convert PNG, JPG, WEBP</p>
                  </div>
                </Link>

                <Link
                  to="/add-watermark"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">water_drop</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Add Watermark</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Stamp QR onto PDF</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
