import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { resizeImage } from '../../engines/image/resizeImage';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function ImageResizer() {
  const {
    files,
    setFiles,
    processing,
    setProcessing,
    result,
    setResult,
    error,
    setError,
    reset,
  } = useFileProcessor();

  const [mode, setMode] = useState('exact'); // 'exact' | 'percentage'
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [percentage, setPercentage] = useState(50);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState(null); // { w, h } for the first file

  // Load first file's dimensions to pre-fill/lock aspect ratio
  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (files.length > 0) {
      const img = new Image();
      try {
        objectUrl = URL.createObjectURL(files[0]);
        img.src = objectUrl;

        const cleanup = () => {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
        };

        img.onload = () => {
          if (active) {
            setOriginalDimensions({ w: img.width, h: img.height });
            setWidth(img.width);
            setHeight(img.height);
          }
          cleanup();
        };

        img.onerror = () => {
          if (active) {
            setError('Failed to load image preview. Please make sure it is a valid image file.');
          }
          cleanup();
        };
      } catch {
        if (active) {
          setError('Failed to process the selected file.');
        }
      }
    } else {
      setOriginalDimensions(null);
      setWidth('');
      setHeight('');
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [files, setError]);

  const handleWidthChange = (val) => {
    const num = val === '' ? '' : Number(val);
    setWidth(num);
    if (lockAspectRatio && originalDimensions && num > 0) {
      const ratio = originalDimensions.h / originalDimensions.w;
      setHeight(Math.round(num * ratio));
    }
  };

  const handleHeightChange = (val) => {
    const num = val === '' ? '' : Number(val);
    setHeight(num);
    if (lockAspectRatio && originalDimensions && num > 0) {
      const ratio = originalDimensions.w / originalDimensions.h;
      setWidth(Math.round(num * ratio));
    }
  };

  const handleResize = async () => {
    if (!files.length) return;
    setError(null);
    setResult(null);

    // Validation
    let targetW, targetH;
    if (mode === 'exact') {
      targetW = Number(width);
      targetH = Number(height);
      if (isNaN(targetW) || targetW <= 0 || isNaN(targetH) || targetH <= 0) {
        setError('Width and height must be positive numbers greater than 0.');
        return;
      }
    } else {
      const pct = Number(percentage);
      if (isNaN(pct) || pct <= 0) {
        setError('Percentage must be a positive number greater than 0.');
        return;
      }
      if (originalDimensions) {
        const scale = pct / 100;
        targetW = Math.round(originalDimensions.w * scale);
        targetH = Math.round(originalDimensions.h * scale);
      }
    }

    if (targetW && targetH) {
      if (targetW > 16384 || targetH > 16384) {
        setError(`Requested dimensions (${targetW} x ${targetH}) exceed the maximum supported browser canvas size of 16,384 pixels.`);
        return;
      }
      if (targetW * targetH > 268435456) {
        setError(`Requested resolution (${targetW} x ${targetH} = ${(targetW * targetH / 1000000).toFixed(1)}M pixels) exceeds the browser's maximum canvas area limit (268.4M pixels).`);
        return;
      }
    }

    setProcessing(true);
    try {
      const results = [];
      const opts = {
        mode,
        percentage: Number(percentage),
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined
      };

      for (const file of files) {
        // If exact and multiple files, aspect ratio lock applies relative to each file's dimensions
        let fileOpts = { ...opts };
        if (mode === 'exact' && files.length > 1 && lockAspectRatio) {
          const img = await createImageBitmap(file);
          const ratio = img.height / img.width;
          fileOpts.width = Number(width);
          fileOpts.height = Math.round(Number(width) * ratio);
        }

        const resolvedW = fileOpts.width || (originalDimensions ? originalDimensions.w : 1);
        const resolvedH = fileOpts.height || (originalDimensions ? originalDimensions.h : 1);
        if (resolvedW > 16384 || resolvedH > 16384 || (resolvedW * resolvedH) > 268435456) {
          throw new Error(`The target dimensions for "${file.name}" (${resolvedW} x ${resolvedH}) exceed browser canvas limits.`);
        }

        const res = await resizeImage(file, fileOpts);
        results.push(res);
      }
      setResult(results);

      try {
        let saveBlob;
        let saveName;
        let saveType;
        if (results.length === 1) {
          saveBlob = results[0].blob;
          saveName = results[0].name;
          saveType = results[0].blob.type;
        } else {
          const zip = new JSZip();
          results.forEach((r) => zip.file(r.name, r.blob));
          saveBlob = await zip.generateAsync({ type: 'blob' });
          saveName = 'resized-images.zip';
          saveType = 'application/zip';
        }
        await saveFile(saveName, saveBlob.size, saveType, 'Image Resizer', saveBlob);
      } catch (dbErr) {
        console.error('Failed to save file to local workspace:', dbErr);
      }
    } catch (err) {
      setError(err.message || 'Resizing failed');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    if (result.length === 1) {
      if (!result[0].blob) {
        setError('The resized image data is empty. The size may have exceeded browser constraints.');
        return;
      }
      saveAs(result[0].blob, result[0].name);
    } else {
      const zip = new JSZip();
      result.forEach((r) => {
        if (r.blob) {
          zip.file(r.name, r.blob);
        }
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'resized-images.zip');
    }
  };

  return (
    <ToolPageLayout
      toolId="image-resizer"
      title="Image Resizer"
      description="Resize multiple images to exact dimensions or relative percentage"
      suppressSwitcher={true}>
      <SEOHead 
        title="Resize Image Online Free (Change Image Dimensions)" 
        description="Resize images online free of charge. Resize by percentage or exact pixel dimensions (width/height) with aspect ratio locking. 100% private."
      />
      

      {!result ? (
        <>
          <FileDropzone accept="image/*" multiple={true} files={files} setFiles={setFiles} />
          {files.length > 0 && (
            <div className="options-panel">
              <div className="options-title">Resize Options</div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <button 
                  className={`btn ${mode === 'exact' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('exact')}
                  style={{ flex: 1 }}
                >
                  Exact Dimensions (px)
                </button>
                <button 
                  className={`btn ${mode === 'percentage' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('percentage')}
                  style={{ flex: 1 }}
                >
                  By Percentage (%)
                </button>
              </div>

              {mode === 'exact' ? (
                <div className="options-row">
                  <div className="option-group">
                    <label>Width (px)</label>
                    <input 
                      type="number" 
                      placeholder="Width"
                      min="1"
                      value={width} 
                      onChange={(e) => handleWidthChange(e.target.value)} 
                    />
                  </div>
                  <div className="option-group">
                    <label>Height (px)</label>
                    <input 
                      type="number" 
                      placeholder="Height"
                      min="1"
                      value={height} 
                      onChange={(e) => handleHeightChange(e.target.value)} 
                    />
                  </div>
                  <div className="option-group" style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '1.8rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={lockAspectRatio} 
                        onChange={(e) => setLockAspectRatio(e.target.checked)} 
                      />
                      Lock Aspect Ratio
                    </label>
                  </div>
                </div>
              ) : (
                <div className="options-row">
                  <div className="option-group" style={{ flex: 1 }}>
                    <label>Percentage: {percentage}%</label>
                    <input 
                      type="range" 
                      min="10" 
                      max="200" 
                      value={percentage} 
                      onChange={(e) => setPercentage(e.target.value)} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <span>Smaller (10%)</span>
                      <span>Original (100%)</span>
                      <span>Larger (200%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
          <div className="action-bar">
            <button className="btn btn-primary btn-lg flex items-center justify-center gap-2" onClick={handleResize} disabled={!files.length || processing}>
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Resizing...' : `Resize ${files.length} Image${files.length !== 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Resizing Complete!</div>
          <div className="result-info">
            Successfully resized {result.length} image{result.length !== 1 ? 's' : ''}.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadAll}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download {result.length > 1 ? 'All (ZIP)' : 'Resized Image'}</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={reset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Resize More</span>
            </button>
          </div>
        </div>
      )}
      
      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
