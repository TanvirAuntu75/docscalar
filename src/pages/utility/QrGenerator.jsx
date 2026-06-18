import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { generateQRToCanvas, generateQRSVG } from '../../engines/utility/qrGenerate';
import { saveAs } from 'file-saver';

export default function QrGenerator() {
  const [text, setText] = useState('https://docforge.app');
  const [size, setSize] = useState(256);
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!text.trim()) {
      setError('Please enter some text or URL.');
      return;
    }
    setError(null);

    const updateQR = async () => {
      try {
        if (canvasRef.current) {
          await generateQRToCanvas(canvasRef.current, text, {
            size,
            darkColor,
            lightColor,
            errorCorrection,
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to generate QR code');
      }
    };

    const timer = setTimeout(updateQR, 150); // Small debounce for rendering performance
    return () => clearTimeout(timer);
  }, [text, size, darkColor, lightColor, errorCorrection]);

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        saveAs(blob, 'qr-code.png');
      }
    }, 'image/png');
  };

  const handleDownloadSVG = async () => {
    try {
      const svgString = await generateQRSVG(text, {
        size,
        darkColor,
        lightColor,
        errorCorrection,
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, 'qr-code.svg');
    } catch (err) {
      setError(err.message || 'Failed to generate SVG');
    }
  };

  return (
    <ToolPageLayout
      toolId="qr-generator"
      title="QR Code Generator"
      description="Create customizable, high-resolution QR codes for URLs, text, and contact info"
    >
      <SEOHead 
        title="Free QR Code Generator Online (Custom QR Codes)" 
        description="Generate custom QR codes online for free. Adjust size, foreground/background colors, and error correction levels instantly."
      />
      

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '900px', margin: '0 auto', alignItems: 'start' }} className="responsive-grid">
        <div className="options-panel" style={{ margin: 0 }}>
          <div className="options-title">Customize QR Code</div>
          
          <div className="option-group" style={{ marginBottom: '1.5rem' }}>
            <label>Text or URL</label>
            <textarea
              style={{ minHeight: '80px' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. https://my-website.com"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {text.length} characters
            </span>
          </div>

          <div className="option-group" style={{ marginBottom: '1.5rem' }}>
            <label>Size: {size} x {size} px</label>
            <input
              type="range"
              min="128"
              max="1024"
              step="32"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="option-group" style={{ flex: 1 }}>
              <label>Foreground Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem var(--space-sm)' }}
                />
              </div>
            </div>
            
            <div className="option-group" style={{ flex: 1 }}>
              <label>Background Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem var(--space-sm)' }}
                />
              </div>
            </div>
          </div>

          <div className="option-group">
            <label>Error Correction Level</label>
            <select value={errorCorrection} onChange={(e) => setErrorCorrection(e.target.value)}>
              <option value="L">Low (7% recovery rate)</option>
              <option value="M">Medium (15% recovery rate, recommended)</option>
              <option value="Q">Quartile (25% recovery rate)</option>
              <option value="H">High (30% recovery rate)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-subtle)', textAlign: 'center', minHeight: '380px', justifyContent: 'center' }}>
          <div style={{
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            display: 'inline-flex',
            maxWidth: '100%',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)'
          }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: error ? 'none' : 'block' }} />
            {error && <div style={{ color: 'var(--color-danger)', padding: '1rem', maxWidth: '200px' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
            <button
              className="btn btn-success btn-lg flex items-center justify-center gap-2"
              onClick={handleDownloadPNG}
              disabled={!!error}
              style={{ flex: 1 }}
            >
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>PNG</span>
            </button>
            <button
              className="btn btn-success btn-lg flex items-center justify-center gap-2"
              onClick={handleDownloadSVG}
              disabled={!!error}
              style={{ flex: 1 }}
            >
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>SVG</span>
            </button>
          </div>
        </div>
      </div>

      <AdPlaceholder format="leaderboard" />
      
      <style>{`
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </ToolPageLayout>
  );
}
