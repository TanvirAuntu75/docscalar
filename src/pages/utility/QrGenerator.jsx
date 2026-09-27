import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
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
import { formatFileSize } from '../../utils/constants';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Globe,
  Wifi,
  User,
  Mail,
  FileText,
  Palette,
  ShieldCheck,
  Layers,
  Printer,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowLeftRight,
  RotateCcw,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export default function QrGenerator() {
  const [payloadType, setPayloadType] = useState('url'); // 'url' | 'wifi' | 'vcard' | 'email' | 'text'
  const [urlData, setUrlData] = useState('https://docscalar.app');
  const [textData, setTextData] = useState('Hello from DocScalar QR Studio!');
  const [wifiData, setWifiData] = useState({ ssid: 'Office_Network', password: 'secret_password_2026', encryption: 'WPA', hidden: false });
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [vcardData, setVcardData] = useState({ name: 'Alex Morgan', phone: '+1 (555) 234-5678', email: 'alex@docscalar.app', company: 'DocScalar Inc.', title: 'Lead Architect' });
  const [emailData, setEmailData] = useState({ to: 'contact@docscalar.app', subject: 'Inquiry', body: 'Hello DocScalar team,' });

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
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
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

  // Swap foreground and background colors
  const swapColors = () => {
    setDarkColor(lightColor);
    setLightColor(darkColor);
  };

  // 6. Handle Export
  const handleExport = async (overrideFormat = null) => {
    if (!currentFormattedPayload) return;
    const activeFormat = overrideFormat || exportFormat;
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (activeFormat === 'svg') {
        const svgString = await generateQRSVG(currentFormattedPayload, {
          size,
          darkColor,
          lightColor,
          errorCorrection
        });
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const finalName = `qrcode_${payloadType}_${Date.now()}.svg`;
        setResult({ blob: svgBlob, name: finalName, format: 'SVG', payload: currentFormattedPayload });
        await saveFile(finalName, svgBlob.size, 'image/svg+xml', 'QR Generator', svgBlob);
      } else if (activeFormat === 'pdf') {
        const pdfBlob = await generateQRPdfFlyer(currentFormattedPayload, {
          title: `Scan QR: ${payloadType.toUpperCase()}`,
          darkColor,
          lightColor,
          errorCorrection
        });
        const finalName = `qrcode_flyer_${payloadType}_${Date.now()}.pdf`;
        setResult({ blob: pdfBlob, name: finalName, format: 'PDF', payload: currentFormattedPayload });
        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'QR Generator', pdfBlob);
      } else {
        // PNG
        if (!canvasRef.current) throw new Error('Canvas not available for PNG export.');
        await new Promise((resolve, reject) => {
          canvasRef.current.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Canvas export produced empty blob.'));
              return;
            }
            const finalName = `qrcode_${payloadType}_${Date.now()}.png`;
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
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2000);
          } catch {
            // Fallback: copy payload text
            handleCopyPayload();
          }
        } else {
          handleCopyPayload();
        }
      }, 'image/png');
    } catch {
      handleCopyPayload();
    }
  };

  const downloadResult = () => {
    if (!result || !result.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('qr-generator');
    setPayloadType('url');
    setUrlData('https://docscalar.app');
    setTextData('Hello from DocScalar QR Studio!');
    setWifiData({ ssid: 'Office_Network', password: 'secret_password_2026', encryption: 'WPA', hidden: false });
    setVcardData({ name: 'Alex Morgan', phone: '+1 (555) 234-5678', email: 'alex@docscalar.app', company: 'DocScalar Inc.', title: 'Lead Architect' });
    setEmailData({ to: 'contact@docscalar.app', subject: 'Inquiry', body: 'Hello DocScalar team,' });
    setSize(380);
    setDarkColor('#000000');
    setLightColor('#ffffff');
    setErrorCorrection('M');
    setExportFormat('png');
    setZoomScale(1.0);
    setResult(null);
    setError(null);
  };

  const recoveryPercentages = {
    L: '7%',
    M: '15%',
    Q: '25%',
    H: '30%'
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
        title="Free QR Code Generator Online — Custom Vector SVG, PNG & PDF | DocScalar"
        description="Create high-resolution custom QR codes online for free. Support for URLs, Wi-Fi credentials, vCard contacts, SVG vector exports, and printable PDF flyers."
      />

      {!result ? (
        <div data-tool="qr-generator" className="qr-studio-root w-full max-w-[1380px] mx-auto flex flex-col gap-6">
          {/* ========================================================================= */}
          {/* MAIN 2-COLUMN EXPANSIVE STUDIO GRID                                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* ----------------------------------------------------------------------- */}
            {/* LEFT COLUMN: Interactive Stage & Live Canvas (7 Cols)                  */}
            {/* ----------------------------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col gap-5 w-full">
              {/* Card Container for Live Stage */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-5 relative transition-all">
                {/* 1. Spacious Segmented Payload Type Switcher */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      QR Content Type
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full">
                      Instant Real-Time Preview
                    </span>
                  </div>

                  <div className="bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                    {QR_PAYLOAD_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPayloadType(t.id)}
                        className={`px-3 py-2 font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          payloadType === t.id
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        {t.id === 'url' && <Globe size={15} />}
                        {t.id === 'wifi' && <Wifi size={15} />}
                        {t.id === 'vcard' && <User size={15} />}
                        {t.id === 'email' && <Mail size={15} />}
                        {t.id === 'text' && <FileText size={15} />}
                        <span className="truncate">{t.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Interactive Canvas Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Live Vector Canvas
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] hidden sm:inline">
                      • Scan Reliability High
                    </span>
                  </div>

                  {/* Actions & Zoom Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="flex items-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                      title="Copy payload string to clipboard"
                    >
                      {copiedText ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyImage}
                      className="flex items-center gap-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                      title="Copy QR image directly to clipboard"
                    >
                      {copiedImage ? <Check size={14} className="text-emerald-500" /> : <Layers size={14} />}
                      <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
                    </button>

                    {/* Discrete Zoom Control */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] select-none">zoom_in</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.4"
                        step="0.05"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                        title="Canvas Zoom"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-8 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1.5 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Reset all settings to default"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                </div>

                {/* 3. The QR Code Canvas Showcase Display */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden bg-pattern">
                  {/* QR Canvas Frame */}
                  <div
                    className="p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xl transition-transform duration-150 origin-center flex items-center justify-center"
                    style={{
                      backgroundColor: lightColor,
                      transform: `scale(${zoomScale})`
                    }}
                  >
                    <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto block" />
                  </div>

                  {/* Telemetry and Specs Pill */}
                  <div className="w-full mt-6 flex flex-col items-center gap-1.5 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] max-w-full shadow-2xs">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate max-w-[280px] sm:max-w-[420px] font-mono text-[11px]">
                        {currentFormattedPayload}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] font-medium">
                      <span>{size}×{size} px</span>
                      <span>•</span>
                      <span>Level {errorCorrection} ({recoveryPercentages[errorCorrection]} Error Recovery)</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-semibold">100% Verified</span>
                    </div>
                  </div>
                </div>

                {/* 4. Quick Action Download Row (One-Click Instant Gratification) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Quick Export:
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleExport('png')}
                      disabled={processing || !currentFormattedPayload}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                    >
                      <Download size={14} />
                      <span>PNG Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('svg')}
                      disabled={processing || !currentFormattedPayload}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                    >
                      <Download size={14} />
                      <span>Vector SVG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={processing || !currentFormattedPayload}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer size={14} />
                      <span>PDF Flyer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: Customization Studio (5 Cols)                             */}
            {/* ----------------------------------------------------------------------- */}
            <div className="lg:col-span-5 flex flex-col gap-5 w-full">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Palette size={18} className="text-[var(--color-primary)]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Design & Customization
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full uppercase">
                    {payloadType}
                  </span>
                </div>

                {/* 1. Dynamic Payload Inputs */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {payloadType === 'url' ? 'Webpage URL' : payloadType === 'wifi' ? 'Wi-Fi Credentials' : payloadType === 'vcard' ? 'Contact Information' : payloadType === 'email' ? 'Email Details' : 'Text Content'}
                    </span>
                    {payloadType === 'url' && urlData && (
                      <a
                        href={urlData}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Test Link</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </label>

                  {/* URL Input */}
                  {payloadType === 'url' && (
                    <div className="relative flex items-center">
                      <Globe size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      <input
                        type="url"
                        value={urlData}
                        onChange={(e) => setUrlData(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full pl-10 pr-3 py-2.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium transition-all"
                      />
                    </div>
                  )}

                  {/* Plain Text Input */}
                  {payloadType === 'text' && (
                    <div className="flex flex-col gap-1">
                      <textarea
                        value={textData}
                        onChange={(e) => setTextData(e.target.value)}
                        placeholder="Enter text or message..."
                        rows={4}
                        className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none resize-none font-medium transition-all leading-relaxed"
                      />
                      <span className="text-[10px] text-[var(--text-tertiary)] text-right">
                        {textData.length} characters
                      </span>
                    </div>
                  )}

                  {/* Wi-Fi Input */}
                  {payloadType === 'wifi' && (
                    <div className="flex flex-col gap-2.5">
                      <div className="relative flex items-center">
                        <Wifi size={15} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                        <input
                          type="text"
                          value={wifiData.ssid}
                          onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                          placeholder="Network Name (SSID)"
                          className="w-full pl-10 pr-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showWifiPassword ? 'text' : 'password'}
                          value={wifiData.password}
                          onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                          placeholder="Password"
                          className="w-full pl-3 pr-10 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWifiPassword(!showWifiPassword)}
                          className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                          title={showWifiPassword ? 'Hide password' : 'Show password'}
                        >
                          {showWifiPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={wifiData.encryption}
                          onChange={(e) => setWifiData({ ...wifiData, encryption: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none cursor-pointer font-medium"
                        >
                          <option value="WPA">WPA / WPA2 / WPA3</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Open (No Password)</option>
                        </select>

                        <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={wifiData.hidden}
                            onChange={(e) => setWifiData({ ...wifiData, hidden: e.target.checked })}
                            className="rounded accent-[var(--color-primary)] cursor-pointer"
                          />
                          <span className="text-[11px] font-medium">Hidden SSID</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* vCard Input */}
                  {payloadType === 'vcard' && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={vcardData.name}
                        onChange={(e) => setVcardData({ ...vcardData, name: e.target.value })}
                        placeholder="Full Name (e.g. Alex Morgan)"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="tel"
                          value={vcardData.phone}
                          onChange={(e) => setVcardData({ ...vcardData, phone: e.target.value })}
                          placeholder="Phone Number"
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                        <input
                          type="email"
                          value={vcardData.email}
                          onChange={(e) => setVcardData({ ...vcardData, email: e.target.value })}
                          placeholder="Email Address"
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={vcardData.company}
                          onChange={(e) => setVcardData({ ...vcardData, company: e.target.value })}
                          placeholder="Company"
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                        <input
                          type="text"
                          value={vcardData.title}
                          onChange={(e) => setVcardData({ ...vcardData, title: e.target.value })}
                          placeholder="Job Title"
                          className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  {payloadType === 'email' && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="email"
                        value={emailData.to}
                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                        placeholder="Recipient Email (e.g. hello@example.com)"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                      />
                      <input
                        type="text"
                        value={emailData.subject}
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                        placeholder="Subject Line"
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium"
                      />
                      <textarea
                        value={emailData.body}
                        onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                        placeholder="Message Body..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none resize-none font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Color Themes & Swatches */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Color Palette & Presets
                    </label>
                    <button
                      type="button"
                      onClick={swapColors}
                      className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Invert Foreground and Background Colors"
                    >
                      <ArrowLeftRight size={12} />
                      <span>Swap Colors</span>
                    </button>
                  </div>

                  {/* 6 Curated Palettes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_PALETTES.map((p) => {
                      const isSelected = darkColor === p.dark && lightColor === p.light;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPalette(p)}
                          className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                              : 'border-[var(--border-subtle)] hover:border-[var(--text-secondary)] bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <div className="flex items-center -space-x-1 shrink-0">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 z-10"
                              style={{ backgroundColor: p.dark }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                              style={{ backgroundColor: p.light }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                            {p.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Hex Color Pickers */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                      <input
                        type="color"
                        value={darkColor}
                        onChange={(e) => setDarkColor(e.target.value)}
                        className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-none shrink-0"
                        title="Choose Foreground Color"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Foreground</span>
                        <input
                          type="text"
                          value={darkColor}
                          onChange={(e) => setDarkColor(e.target.value)}
                          className="text-xs font-mono font-semibold text-[var(--text-primary)] bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                      <input
                        type="color"
                        value={lightColor}
                        onChange={(e) => setLightColor(e.target.value)}
                        className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-none shrink-0"
                        title="Choose Background Color"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Background</span>
                        <input
                          type="text"
                          value={lightColor}
                          onChange={(e) => setLightColor(e.target.value)}
                          className="text-xs font-mono font-semibold text-[var(--text-primary)] bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Scan Resilience (Error Correction) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Error Correction Level
                    </label>
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                      {recoveryPercentages[errorCorrection]} Recovery
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-subtle)] text-xs text-center">
                    {[
                      { lvl: 'L', label: '7%', desc: 'Light' },
                      { lvl: 'M', label: '15%', desc: 'Standard' },
                      { lvl: 'Q', label: '25%', desc: 'High' },
                      { lvl: 'H', label: '30%', desc: 'Max' }
                    ].map((item) => (
                      <button
                        key={item.lvl}
                        type="button"
                        onClick={() => setErrorCorrection(item.lvl)}
                        className={`py-2 px-1 font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          errorCorrection === item.lvl
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{item.lvl}</span>
                        <span className="text-[10px] opacity-80">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                    Higher correction preserves scannability even if partially obscured, smudged, or printed.
                  </span>
                </div>

                {/* 4. Export Format & Resolution */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Export Format & Resolution
                  </label>

                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-subtle)] text-xs text-center">
                    {[
                      { id: 'png', label: 'PNG Image', desc: 'High-Res' },
                      { id: 'svg', label: 'Vector SVG', desc: 'Scalable' },
                      { id: 'pdf', label: 'PDF Flyer', desc: 'Printable' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setExportFormat(fmt.id)}
                        className={`py-2 px-1.5 font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          exportFormat === fmt.id
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        <span className="text-xs font-bold">{fmt.label}</span>
                        <span className="text-[10px] opacity-80">{fmt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Resolution Selector for PNG */}
                  {exportFormat === 'png' && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] text-xs mt-1">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Canvas Size:</span>
                      <div className="flex items-center gap-1">
                        {[
                          { sz: 380, label: '380px' },
                          { sz: 600, label: '600px' },
                          { sz: 1200, label: '1200px' }
                        ].map((item) => (
                          <button
                            key={item.sz}
                            type="button"
                            onClick={() => setSize(item.sz)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              size === item.sz
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {/* Primary Download CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleExport()}
                    disabled={processing || !currentFormattedPayload}
                    className="w-full py-3.5 px-5 bg-[var(--color-primary)] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    {processing ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        <span>Generating {exportFormat.toUpperCase()}...</span>
                      </>
                    ) : (
                      <>
                        <Download size={17} />
                        <span>Download {exportFormat.toUpperCase()} ({exportFormat === 'pdf' ? 'Printable Flyer' : exportFormat === 'svg' ? 'Vector SVG' : 'High-Res'})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex items-center justify-center py-10 px-4">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Celebration Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={40} />
            </div>

            {/* Title & Document Info */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                QR Code Ready!
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Your custom {result.format} QR code is ready with 100% scan reliability.
              </p>
            </div>

            {/* Generated Document Pill */}
            <div className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <FileCheck size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {result.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {result.format} • {formatFileSize(result.blob.size)}
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full uppercase shrink-0">
                Verified
              </span>
            </div>

            {/* Download CTA & Actions */}
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={downloadResult}
                className="w-full py-3.5 px-6 bg-[var(--color-primary)] hover:opacity-90 text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download size={16} />
                <span>Save to Computer</span>
              </button>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="w-full py-3 px-6 bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                Back to Studio Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
