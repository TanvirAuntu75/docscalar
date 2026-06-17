import { useState, useEffect } from 'react';
import ToolIcon from '../../components/ToolIcon';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { addWatermark } from '../../engines/pdf/addWatermark';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';

export default function AddWatermark() {
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

  const [type, setType] = useState('text'); // 'text' or 'image'
  const [text, setText] = useState('CONFIDENTIAL');
  const [color, setColor] = useState('#EF4444'); // Default confidential red
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [size, setSize] = useState(50); // FontSize for text, scale % for image
  const [position, setPosition] = useState('center'); // 'center', 'top-left', etc.
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Clean up image preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG or JPG).');
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleProcess = async () => {
    if (!files.length) return;
    if (type === 'image' && !imageFile) {
      setError('Please upload an image to use as a watermark.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const options = {
        type,
        text,
        color,
        opacity,
        rotation,
        size,
        position,
        imageFile: type === 'image' ? imageFile : null
      };

      const outputBlob = await addWatermark(files[0], options, setProgress);
      const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_watermarked.pdf';
      setResult({
        blob: outputBlob,
        name: finalName
      });

      // Save to IndexedDB workspace cache
      try {
        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Add Watermark', outputBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }

    } catch (err) {
      setError(err.message || 'Watermarking failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    saveAs(result.blob, result.name);
  };

  const handleReset = () => {
    reset();
    setType('text');
    setText('CONFIDENTIAL');
    setColor('#EF4444');
    setOpacity(0.3);
    setRotation(45);
    setSize(50);
    setPosition('center');
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  // Helper to map positions to CSS for preview
  const getPreviewPositionStyles = () => {
    const base = {
      position: 'absolute',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      opacity: opacity,
      transition: 'all 0.15s ease'
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: '20%', left: '25%' };
      case 'top-right':
        return { ...base, top: '20%', left: '75%' };
      case 'bottom-left':
        return { ...base, top: '80%', left: '25%' };
      case 'bottom-right':
        return { ...base, top: '80%', left: '75%' };
      case 'center':
      default:
        return { ...base, top: '50%', left: '50%' };
    }
  };

  return (
    <div className="tool-page">
      <SEOHead 
        title="Add Watermark to PDF Online Free (100% Client-Side) | DocForge" 
        description="Overlay custom text or image watermarks onto PDF pages. Choose font sizes, opacity, rotation, and alignment positions offline."
      />
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id="add-watermark" size={48} />
        </div>
        <h1>Add Watermark</h1>
        <p className="tool-page-subtitle">Overlay customizable text or images onto your PDF document pages</p>
      </div>

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              {/* Layout for options and preview inside the panel */}
              <div style={{
                gap: '2rem'
              }} className="flex flex-col">
                
                {/* Configuration Columns */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Watermark Configurator</div>

                  {/* Type Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Watermark Type</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setType('text')}
                        className={`btn ${type === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.6rem' }}
                      >
                        🔤 Text Watermark
                      </button>
                      <button
                        onClick={() => setType('image')}
                        className={`btn ${type === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.6rem' }}
                      >
                        🖼️ Image Watermark
                      </button>
                    </div>
                  </div>

                  {/* Text Mode Options */}
                  {type === 'text' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Watermark Text</label>
                        <input
                          type="text"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.8rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Text Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            style={{
                              width: '45px',
                              height: '38px',
                              padding: '0',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: 'transparent'
                            }}
                          />
                          <input
                            type="text"
                            value={color.toUpperCase()}
                            onChange={(e) => setColor(e.target.value)}
                            maxLength={7}
                            style={{
                              width: '100px',
                              padding: '0.65rem 0.8rem',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontFamily: 'monospace',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Image Mode Options */}
                  {type === 'image' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Select Image File</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageChange}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem'
                        }}
                      />
                      {imageFile && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          File: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Positioning Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Position</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.8rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>

                  {/* Opacity Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Opacity</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Size Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {type === 'text' ? 'Font Size (pt)' : 'Image Scale (%)'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{size}{type === 'text' ? 'pt' : '%'}</span>
                    </div>
                    <input
                      type="range"
                      min={type === 'text' ? '12' : '5'}
                      max={type === 'text' ? '120' : '100'}
                      step="1"
                      value={size}
                      onChange={(e) => setSize(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Rotation Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Rotation Angle</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                  </div>
                </div>

                {/* Live Preview Column */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  minHeight: '350px'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Live Watermark Preview
                  </span>

                  {/* A visual sheet mockup to render alignment */}
                  <div style={{
                    position: 'relative',
                    width: '210px',
                    height: '297px', // A4 aspect ratio
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    gap: '8px'
                  }}>
                    {/* Simulated Text Lines */}
                    <div style={{ width: '50%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '90%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '85%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '95%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '40%', height: '6px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '8px' }} />

                    <div style={{ width: '70%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '88%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '92%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '60%', height: '6px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '8px' }} />

                    <div style={{ width: '60%', height: '8px', background: '#E5E7EB', borderRadius: '2px' }} />
                    <div style={{ width: '95%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />
                    <div style={{ width: '80%', height: '6px', background: '#F3F4F6', borderRadius: '2px' }} />

                    {/* Watermark Overlay Element */}
                    <div style={getPreviewPositionStyles()}>
                      {type === 'text' ? (
                        <div style={{
                          color: color,
                          fontSize: `${Math.max(10, size * 0.28)}px`,
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                          textAlign: 'center'
                        }}>
                          {text || 'CONFIDENTIAL'}
                        </div>
                      ) : (
                        <div style={{
                          width: `${Math.max(20, size * 1.5)}px`,
                          height: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {imagePreviewUrl ? (
                            <img
                              src={imagePreviewUrl}
                              alt="watermark preview"
                              style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: '10px', color: '#9CA3AF', border: '1px dashed #9CA3AF', padding: '4px', borderRadius: '4px' }}>
                              No Image
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
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
              <p className="progress-status">Embedding watermark layer... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleProcess} 
              disabled={!files.length || processing || (type === 'image' && !imageFile)}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Embedding...' : 'Apply Watermark'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Watermark Applied!</div>
          <div className="result-info">
            Your watermarked document has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Tool</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </div>
  );
}
