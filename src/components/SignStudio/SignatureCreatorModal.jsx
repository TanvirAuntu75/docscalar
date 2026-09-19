import { useState, useRef, useEffect, useCallback } from 'react';

const FONTS = [
  { name: 'Satisfy', label: 'Satisfy' },
  { name: 'Caveat', label: 'Caveat' },
  { name: 'Pacifico', label: 'Pacifico' },
  { name: 'Great Vibes', label: 'Great Vibes' },
  { name: 'Dancing Script', label: 'Dancing Script' },
  { name: 'Alex Brush', label: 'Alex Brush' }
];

const INK_COLORS = [
  { label: 'Legal Black', value: '#000000' },
  { label: 'Contract Navy', value: '#002060' },
  { label: 'Royal Blue', value: '#1E40AF' },
  { label: 'Forest Green', value: '#0D5C3A' },
  { label: 'Crimson Red', value: '#B91C1C' },
  { label: 'Seal Gold', value: '#B45309' }
];

/**
 * Trims empty transparent border pixels around a canvas to export a tight PNG
 */
function cropTransparentCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasPixel = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = d[(y * w + x) * 4 + 3];
      if (alpha > 15) {
        hasPixel = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixel) return null;

  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad);
  maxY = Math.min(h, maxY + pad);
  const cropW = Math.max(1, maxX - minX);
  const cropH = Math.max(1, maxY - minY);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d');
  outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL('image/png');
}

/**
 * Strips white/gray paper background from uploaded signature photos
 */
function processPaperBackground(imageSource, threshold = 220) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
      resolve(imageSource);
    };
    img.onload = () => {
      let targetW = img.naturalWidth || img.width;
      let targetH = img.naturalHeight || img.height;
      const MAX_DIM = 1600;
      if (targetW > MAX_DIM || targetH > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
        targetW = Math.max(1, Math.round(targetW * ratio));
        targetH = Math.max(1, Math.round(targetH * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance >= threshold) {
          d[i + 3] = 0; // Pure alpha transparency
        } else {
          // Smooth edge falloff
          const edge = threshold - 35;
          if (luminance > edge) {
            d[i + 3] = Math.round(((threshold - luminance) / 35) * 255);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const cropped = cropTransparentCanvas(canvas) || canvas.toDataURL('image/png');
      resolve(cropped);
    };
    img.src = imageSource;
  });
}

/**
 * Generates transparent PNG data URL from cursive font text
 */
function generateTypedSignatureDataUrl(text, font, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 800, 240);

  let fontSize = 60;
  ctx.font = `${fontSize}px "${font}", cursive, sans-serif`;
  const metrics = ctx.measureText(text || '');
  if (metrics.width > 740 && metrics.width > 0) {
    fontSize = Math.max(20, Math.floor(fontSize * (740 / metrics.width)));
    ctx.font = `${fontSize}px "${font}", cursive, sans-serif`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 400, 120);
  return cropTransparentCanvas(canvas) || canvas.toDataURL('image/png');
}

export default function SignatureCreatorModal({
  isOpen,
  onClose,
  onApply,
  targetType = 'signature', // 'signature' | 'initials'
  defaultName = 'Tanvir Alam'
}) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'type' | 'upload' | 'vault'
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Type state
  const [typedText, setTypedText] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState('Satisfy');
  
  // Upload state
  const [rawUploadedImage, setRawUploadedImage] = useState(null);
  const [processedUploadedImage, setProcessedUploadedImage] = useState(null);
  const [autoRemovePaper, setAutoRemovePaper] = useState(true);
  const [paperThreshold, setPaperThreshold] = useState(215);

  // Vault state
  const [vault, setVault] = useState([]);
  const [saveToVault, setSaveToVault] = useState(true);

  // Canvas drawing state
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef([]);
  const [hasDrawnContent, setHasDrawnContent] = useState(false);

  // Load Google Fonts link dynamically
  useEffect(() => {
    const linkId = 'docscalar-cursive-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Load saved vault signatures from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('docscalar_signature_vault');
      if (stored) {
        setVault(JSON.parse(stored));
      }
    } catch {
      setVault([]);
    }
  }, [isOpen]);

  // Handle uploaded image background processing
  useEffect(() => {
    if (!rawUploadedImage) {
      setProcessedUploadedImage(null);
      return;
    }
    if (autoRemovePaper) {
      processPaperBackground(rawUploadedImage, paperThreshold).then(setProcessedUploadedImage);
    } else {
      setProcessedUploadedImage(rawUploadedImage);
    }
  }, [rawUploadedImage, autoRemovePaper, paperThreshold]);

  // Drawing event handlers with Quadratic Bézier smoothing and velocity dynamics
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now(), pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      time: Date.now(),
      pressure: (e.pressure !== undefined && e.pressure > 0) ? e.pressure : 0.5
    };
  };

  const handlePointerDown = (e) => {
    if (e.target.setPointerCapture && e.pointerId) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
    isDrawingRef.current = true;
    const pt = getCanvasCoords(e);
    pointsRef.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = selectedColor;
    const baseW = strokeWidth * 2; // 2x DPR
    ctx.lineWidth = baseW;

    // Draw small dot on initial touch
    ctx.fillStyle = selectedColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseW / 2, 0, Math.PI * 2);
    ctx.fill();
    setHasDrawnContent(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = getCanvasCoords(e);
    pointsRef.current.push(pt);

    const pts = pointsRef.current;
    if (pts.length >= 3) {
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = selectedColor;

      const p0 = pts[pts.length - 3];
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];

      // Velocity-based stroke tapering formula (authentic ink fountain pen)
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const dt = Math.max(1, p2.time - p1.time);
      const velocity = dist / dt;
      const speedFactor = Math.max(0.65, Math.min(1.35, 1 - (velocity - 1.2) * 0.15));
      const pressureFactor = 0.75 + (p2.pressure * 0.5);
      const computedLineWidth = Math.max(2.0, Math.min(strokeWidth * 4, strokeWidth * 2 * speedFactor * pressureFactor));

      ctx.lineWidth = computedLineWidth;

      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    isDrawingRef.current = false;
    if (e?.target?.releasePointerCapture && e?.pointerId) {
      try { e.target.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
    setHasDrawnContent(false);
  };

  // Apply signature handler
  const handleConfirm = () => {
    let finalDataUrl = null;
    let value = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawnContent) return;
      finalDataUrl = cropTransparentCanvas(canvas);
      value = 'Drawn Signature';
    } else if (activeTab === 'type') {
      if (!typedText.trim()) return;
      finalDataUrl = generateTypedSignatureDataUrl(typedText, selectedFont, selectedColor);
      value = typedText;
    } else if (activeTab === 'upload') {
      if (!processedUploadedImage) return;
      finalDataUrl = processedUploadedImage;
      value = 'Uploaded Signature';
    }

    if (!finalDataUrl) return;

    // Save to Vault if checked
    if (saveToVault) {
      const newItem = {
        id: `vault_${Date.now()}`,
        type: targetType,
        title: value,
        dataUrl: finalDataUrl,
        color: selectedColor,
        createdAt: new Date().toISOString()
      };
      try {
        const updatedVault = [newItem, ...vault.slice(0, 7)];
        localStorage.setItem('docscalar_signature_vault', JSON.stringify(updatedVault));
        setVault(updatedVault);
      } catch (err) {
        console.error('Failed to save signature to vault:', err);
      }
    }

    onApply({
      type: targetType,
      dataUrl: finalDataUrl,
      value,
      color: selectedColor,
      fontFamily: selectedFont
    });
    onClose();
  };

  const applyFromVault = (item) => {
    onApply({
      type: targetType,
      dataUrl: item.dataUrl,
      value: item.title,
      color: item.color || '#000000'
    });
    onClose();
  };

  const deleteFromVault = (e, id) => {
    e.stopPropagation();
    const updated = vault.filter((v) => v.id !== id);
    setVault(updated);
    try {
      localStorage.setItem('docscalar_signature_vault', JSON.stringify(updated));
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-surface border border-outline-variant/60 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-on-background">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-2xl">
              {targetType === 'initials' ? 'history_edu' : 'draw'}
            </span>
            <h3 className="font-h3 text-base font-bold text-on-background">
              {targetType === 'initials' ? 'Create Your Initials' : 'Create Your Signature'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-background hover:bg-surface-container-high rounded-full transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 pt-4 pb-2 border-b border-outline-variant/20">
          {[
            { id: 'draw', label: 'Draw', icon: 'gesture' },
            { id: 'type', label: 'Type', icon: 'text_fields' },
            { id: 'upload', label: 'Upload Image', icon: 'upload_file' },
            { id: 'vault', label: `Saved Vault (${vault.length})`, icon: 'bookmark' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-background'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          
          {/* Color & Pen Controls (for Draw & Type) */}
          {(activeTab === 'draw' || activeTab === 'type') && (
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Ink Color:</span>
                <div className="flex items-center gap-2">
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        selectedColor === c.value
                          ? 'border-primary scale-110 shadow-sm'
                          : 'border-outline-variant/50 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {activeTab === 'draw' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Thickness:</span>
                  {[2, 3.5, 5].map((w) => (
                    <button
                      key={w}
                      onClick={() => setStrokeWidth(w)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        strokeWidth === w
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {w === 2 ? 'Fine' : w === 3.5 ? 'Medium' : 'Bold'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: DRAW CANVAS */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="relative border-2 border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-low/40 overflow-hidden group">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={440}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-full h-[180px] block cursor-crosshair touch-none"
                />
                
                {/* Signing baseline */}
                <div className="absolute left-8 right-8 bottom-8 h-[1px] border-b border-dashed border-outline-variant/40 pointer-events-none flex justify-end pr-2">
                  <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest -mt-4">Sign Above</span>
                </div>

                {!hasDrawnContent && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-on-surface-variant/40 text-xs font-medium">
                    Draw your signature using mouse or finger
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={clearCanvas}
                  className="px-3.5 py-1.5 text-xs font-bold text-error border border-error/30 hover:bg-error-container/20 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Clear Canvas
                </button>
                <span className="text-[11px] text-on-surface-variant">Smooth Bézier ink with transparent alpha</span>
              </div>
            </div>
          )}

          {/* TAB 2: TYPE CALLIGRAPHY */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Your Name / Text</label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/60 rounded-xl text-on-background text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {FONTS.map((font) => (
                  <button
                    key={font.name}
                    onClick={() => setSelectedFont(font.name)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      selectedFont === font.name
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-outline-variant/40 bg-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-[10px] text-on-surface-variant uppercase font-mono">{font.label}</span>
                    <span
                      style={{ fontFamily: font.name, color: selectedColor }}
                      className="text-2xl mt-2 truncate block"
                    >
                      {typedText || 'Signature'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD WITH AUTO-ALPHA PAPER REMOVAL */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-2xl bg-surface-container-low/40 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
                <span className="text-xs font-bold text-on-background">Upload photo or scan of signature</span>
                <span className="text-[11px] text-on-surface-variant mt-1">Supports PNG, JPG, JPEG</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setRawUploadedImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              {rawUploadedImage && (
                <div className="flex flex-col gap-3 p-4 bg-surface-container rounded-2xl border border-outline-variant/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-on-background cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRemovePaper}
                        onChange={(e) => setAutoRemovePaper(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Auto-Remove Paper Background (Alpha Transparency)</span>
                    </label>
                  </div>

                  {autoRemovePaper && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-on-surface-variant">Filter Threshold:</span>
                      <input
                        type="range"
                        min="160"
                        max="245"
                        value={paperThreshold}
                        onChange={(e) => setPaperThreshold(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-[11px] font-mono text-on-surface-variant">{paperThreshold}</span>
                    </div>
                  )}

                  {/* Preview of processed transparent signature */}
                  <div className="p-4 bg-surface-container-high rounded-xl flex items-center justify-center min-h-[100px] border border-outline-variant/40">
                    {processedUploadedImage ? (
                      <img
                        src={processedUploadedImage}
                        alt="Signature Preview"
                        className="max-h-24 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-on-surface-variant">Processing transparent ink...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED SIGNATURES VAULT */}
          {activeTab === 'vault' && (
            <div className="flex flex-col gap-3">
              {vault.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl opacity-40">inventory_2</span>
                  <span>No saved signatures in your local browser vault yet.</span>
                  <span className="text-[11px] opacity-75">Signatures you create with "Save to Vault" enabled will appear here.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {vault.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => applyFromVault(item)}
                      className="group relative p-4 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary rounded-2xl cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono uppercase text-on-surface-variant">{item.title || 'Signature'}</span>
                        <button
                          onClick={(e) => deleteFromVault(e, item.id)}
                          className="text-on-surface-variant/40 hover:text-error transition-colors p-1"
                          title="Delete from vault"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                      <div className="h-16 flex items-center justify-center p-2 bg-surface rounded-xl border border-outline-variant/20">
                        <img src={item.dataUrl} alt={item.title} className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/30 bg-surface-container">
          <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={saveToVault}
              onChange={(e) => setSaveToVault(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span>Save to Local Vault</span>
          </label>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-background hover:bg-surface-container-high rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                (activeTab === 'draw' && !hasDrawnContent) ||
                (activeTab === 'type' && !typedText.trim()) ||
                (activeTab === 'upload' && !processedUploadedImage) ||
                activeTab === 'vault'
              }
              className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Apply Signature
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
