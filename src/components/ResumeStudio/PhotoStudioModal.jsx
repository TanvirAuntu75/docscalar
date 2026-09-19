// ═══════════════════════════════════════════════════════════════════════════════
// Photo Studio Modal: Interactive Pan, Zoom, 90° Rotate & 5 Portrait Filters
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useResumeContext } from '../../context/ResumeContext.jsx';

const FILTERS = [
  { id: 'none', label: 'Natural Color', css: 'none' },
  { id: 'bw', label: 'B&W Classic', css: 'grayscale(100%)' },
  { id: 'crisp', label: 'High Contrast', css: 'contrast(125%) brightness(105%)' },
  { id: 'warm', label: 'Warm Portrait', css: 'sepia(20%) saturate(110%)' },
  { id: 'noir', label: 'Cool Noir', css: 'grayscale(100%) contrast(140%) brightness(95%)' }
];

const normalizeFilterId = (raw) => {
  if (raw === 'grayscale') return 'bw';
  if (raw === 'high_contrast') return 'crisp';
  if (raw === 'cool_noir') return 'noir';
  return raw || 'none';
};

export default function PhotoStudioModal({
  isOpen,
  onClose
}) {
  const { data, setField } = useResumeContext();

  const photoUrl = data.photoUrl || '/images/candidates/candidate_1.jpg';
  const initialCrop = data.photoCrop || { scale: 1.0, x: 0, y: 0, rotate: 0, filter: 'none' };

  const [scale, setScale] = useState(initialCrop.scale || 1.0);
  const [offset, setOffset] = useState({ x: initialCrop.x || 0, y: initialCrop.y || 0 });
  const [rotate, setRotate] = useState(initialCrop.rotate || 0);
  const [filter, setFilter] = useState(normalizeFilterId(initialCrop.filterPreset || initialCrop.filter));

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(data.photoCrop?.scale || 1.0);
      setOffset({ x: data.photoCrop?.x || 0, y: data.photoCrop?.y || 0 });
      setRotate(data.photoCrop?.rotate || 0);
      setFilter(normalizeFilterId(data.photoCrop?.filterPreset || data.photoCrop?.filter));
    }
  }, [isOpen, data.photoCrop]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    // Bound movement between -150 and 150px
    setOffset({
      x: Math.max(-150, Math.min(150, newX)),
      y: Math.max(-150, Math.min(150, newY))
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleRotate90 = () => {
    setRotate(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1.0);
    setOffset({ x: 0, y: 0 });
    setRotate(0);
    setFilter('none');
  };

  const handleSave = () => {
    setField('photoCrop', {
      scale,
      x: offset.x,
      y: offset.y,
      rotate,
      filter,
      filterPreset: filter
    });
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const currentFilterObj = FILTERS.find(f => f.id === filter) || FILTERS[0];

  return (
    <div
      className="cv-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--brand-primary, #2563eb)' }}>
              crop
            </span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
              Photo Studio & Crop Alignment
            </h2>
          </div>
          <button type="button" className="cv-btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Viewport Canvas */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'var(--bg-secondary)'
          }}
        >
          {/* Circular Mask Frame with Drag Pointer */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 0 0 4px var(--brand-primary, #2563eb), 0 10px 25px rgba(0,0,0,0.25)',
              background: '#000000',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none'
            }}
            title="Click and drag to pan image"
          >
            <img
              src={photoUrl}
              alt="Photo Crop Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px) rotate(${rotate}deg)`,
                filter: currentFilterObj.css,
                pointerEvents: 'none',
                transition: isDragging ? 'none' : 'transform 0.1s ease, filter 0.15s ease'
              }}
            />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>drag_pan</span>
            Drag inside the circle to pan. Use sliders below to zoom and rotate.
          </span>
        </div>

        {/* Controls */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Zoom Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
              <span>Zoom / Scale</span>
              <span>{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </div>

          {/* Rotate & Reset Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={handleRotate90}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rotate_right</span>
              Rotate 90°
            </button>
            <button
              type="button"
              className="cv-btn-ghost"
              onClick={handleReset}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              Reset
            </button>
          </div>

          {/* 5 Portrait Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Studio Portrait Filters
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cv-btn-secondary ${filter === f.id ? 'active' : ''}`}
                  onClick={() => setFilter(f.id)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '999px',
                    background: filter === f.id ? 'rgba(37, 99, 235, 0.12)' : undefined,
                    borderColor: filter === f.id ? 'var(--brand-primary, #2563eb)' : undefined
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="cv-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              Save Crop Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
