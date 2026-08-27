import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDateByPattern, validateAndFormatDate, formatTypingDate } from '../../utils/dateFormats.js';

/**
 * 8-Point Resize Handle definitions
 */
const RESIZE_HANDLES = [
  { dir: 'nw', cursor: 'nwse-resize', style: 'top-[-5px] left-[-5px]' },
  { dir: 'n',  cursor: 'ns-resize',   style: 'top-[-5px] left-1/2 -translate-x-1/2' },
  { dir: 'ne', cursor: 'nesw-resize', style: 'top-[-5px] right-[-5px]' },
  { dir: 'e',  cursor: 'ew-resize',   style: 'top-1/2 -translate-y-1/2 right-[-5px]' },
  { dir: 'se', cursor: 'nwse-resize', style: 'bottom-[-5px] right-[-5px]' },
  { dir: 's',  cursor: 'ns-resize',   style: 'bottom-[-5px] left-1/2 -translate-x-1/2' },
  { dir: 'sw', cursor: 'nesw-resize', style: 'bottom-[-5px] left-[-5px]' },
  { dir: 'w',  cursor: 'ew-resize',   style: 'top-1/2 -translate-y-1/2 left-[-5px]' }
];

export default function SignFieldOverlay({
  field,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onApplyAll,
  onEdit,
  totalPages = 1,
  containerRef
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState(null);
  const [isEditingInline, setIsEditingInline] = useState(false);

  const startDragPosRef = useRef({ mouseX: 0, mouseY: 0, fieldX: 0, fieldY: 0 });
  const startResizeRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 });
  const elementRef = useRef(null);

  // Reset inline edit mode when field loses selection
  useEffect(() => {
    if (!isSelected) {
      setIsEditingInline(false);
    }
  }, [isSelected]);

  // Keyboard navigation when selected
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const step = e.shiftKey ? 0.02 : 0.005;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onRemove(field.id);
          break;
        case 'Enter':
        case ' ':
          if (field.type === 'checkbox') {
            e.preventDefault();
            onUpdate(field.id, { checked: !field.checked });
          } else if (['text', 'name', 'date'].includes(field.type)) {
            e.preventDefault();
            setIsEditingInline(true);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onUpdate(field.id, { x: Math.max(0, field.x - step) });
          break;
        case 'ArrowRight':
          e.preventDefault();
          onUpdate(field.id, { x: Math.min(1 - field.width, field.x + step) });
          break;
        case 'ArrowUp':
          e.preventDefault();
          onUpdate(field.id, { y: Math.max(0, field.y - step) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          onUpdate(field.id, { y: Math.min(1 - field.height, field.y + step) });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, field, onUpdate, onRemove]);

  // Drag start handler
  const handleDragStart = (e) => {
    if (isEditingInline || e.target.closest('.field-action-btn') || e.target.closest('.resize-handle') || e.target.tagName === 'INPUT') return;
    e.stopPropagation();
    onSelect(field.id);

    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startDragPosRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      fieldX: field.x,
      fieldY: field.y
    };
  };

  // Resize start handler
  const handleResizeStart = (e, dir) => {
    e.stopPropagation();
    onSelect(field.id);

    setIsResizing(true);
    setResizeDir(dir);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startResizeRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      x: field.x,
      y: field.y,
      w: field.width,
      h: field.height
    };
  };

  // Global mousemove / touchmove listener for active drag or resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handlePointerMove = (e) => {
      const container = containerRef?.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = (clientX - startDragPosRef.current.mouseX) / rect.width;
        const deltaY = (clientY - startDragPosRef.current.mouseY) / rect.height;

        let newX = startDragPosRef.current.fieldX + deltaX;
        let newY = startDragPosRef.current.fieldY + deltaY;

        // Center magnetic snap (threshold 1.2% ratio)
        const centerX = 0.5 - (field.width / 2);
        if (Math.abs(newX - centerX) < 0.012) {
          newX = centerX;
        }

        // Clamp to page
        newX = Math.max(0, Math.min(1 - field.width, newX));
        newY = Math.max(0, Math.min(1 - field.height, newY));

        onUpdate(field.id, { x: newX, y: newY }, false);
      } else if (isResizing && resizeDir) {
        const deltaX = (clientX - startResizeRef.current.mouseX) / rect.width;
        const deltaY = (clientY - startResizeRef.current.mouseY) / rect.height;

        let { x, y, w, h } = startResizeRef.current;
        const minW = 0.03;
        const minH = 0.02;

        if (resizeDir.includes('e')) {
          w = Math.max(minW, Math.min(1 - x, w + deltaX));
        }
        if (resizeDir.includes('s')) {
          h = Math.max(minH, Math.min(1 - y, h + deltaY));
        }
        if (resizeDir.includes('w')) {
          const maxDeltaX = w - minW;
          const actualDeltaX = Math.max(-x, Math.min(maxDeltaX, deltaX));
          x += actualDeltaX;
          w -= actualDeltaX;
        }
        if (resizeDir.includes('n')) {
          const maxDeltaY = h - minH;
          const actualDeltaY = Math.max(-y, Math.min(maxDeltaY, deltaY));
          y += actualDeltaY;
          h -= actualDeltaY;
        }

        onUpdate(field.id, { x, y, width: w, height: h }, false);
      }
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate(field.id, { x: field.x, y: field.y }, true);
      }
      if (isResizing) {
        setIsResizing(false);
        setResizeDir(null);
        onUpdate(field.id, { x: field.x, y: field.y, width: field.width, height: field.height }, true);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, isResizing, resizeDir, field, onUpdate, containerRef]);

  // Render visual content based on field type
  const renderFieldContent = () => {
    switch (field.type) {
      case 'signature':
      case 'initials':
      case 'stamp':
        if (field.dataUrl) {
          return (
            <img
              src={field.dataUrl}
              alt={field.type}
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          );
        }
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 text-primary text-xs font-bold border border-dashed border-primary/40 rounded-lg p-1 select-none pointer-events-none">
            <span className="material-symbols-outlined text-[16px]">draw</span>
            <span className="text-[10px] truncate max-w-full">
              {field.type === 'initials' ? 'Initials' : field.type === 'stamp' ? 'Stamp' : 'Signature'}
            </span>
          </div>
        );

      case 'date': {
        const pattern = field.dateFormat || 'MM/DD/YYYY';
        const defaultFormatted = formatDateByPattern(new Date(), pattern);
        const displayDate = field.value !== undefined && field.value !== '' ? field.value : defaultFormatted;
        const isWhiteBg = field.bgStyle === 'white' || field.bgStyle === 'solid';

        if (isEditingInline) {
          return (
            <input
              type="text"
              autoFocus
              value={field.value !== undefined ? field.value : displayDate}
              onChange={(e) => {
                const sanitized = formatTypingDate(e.target.value, pattern);
                onUpdate(field.id, { value: sanitized }, false);
              }}
              onBlur={() => {
                setIsEditingInline(false);
                const validated = validateAndFormatDate(field.value, pattern);
                onUpdate(field.id, { value: validated }, true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsEditingInline(false);
                  const validated = validateAndFormatDate(field.value, pattern);
                  onUpdate(field.id, { value: validated }, true);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full h-full bg-white border border-[var(--color-primary)] rounded px-1 font-mono text-xs font-semibold text-slate-900 outline-none shadow-inner select-text"
              placeholder={pattern}
            />
          );
        }
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className={`w-full h-full flex items-center justify-center ${isWhiteBg ? 'bg-white' : 'bg-transparent'} select-none cursor-text overflow-hidden`}
            title="Double-click to edit date or change format in sidebar"
          >
            <svg viewBox="0 0 120 24" className="w-full h-full pointer-events-none select-none" preserveAspectRatio="xMidYMid meet">
              <text
                x="60"
                y="17"
                textAnchor="middle"
                fill={field.color || '#000000'}
                fontFamily="Courier, monospace"
                fontWeight="600"
                fontSize="15"
              >
                {displayDate}
              </text>
            </svg>
          </div>
        );
      }

      case 'name':
      case 'email':
      case 'title':
      case 'company':
      case 'text': {
        const isEmail = field.type === 'email';
        const fallbackText = field.type === 'name' ? 'Signer Name'
          : field.type === 'email' ? 'signer@example.com'
          : field.type === 'title' ? 'Job Title'
          : field.type === 'company' ? 'Company Name'
          : 'Custom Text';
        const displayVal = field.value || fallbackText;
        const isWhiteBg = field.bgStyle === 'white' || field.bgStyle === 'solid';
        const align = field.textAlign || 'center';
        const svgAlign = align === 'left' ? 'xMinYMid meet' : align === 'right' ? 'xMaxYMid meet' : 'xMidYMid meet';
        const svgAnchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
        const svgX = align === 'left' ? '4' : align === 'right' ? '116' : '60';

        if (isEditingInline) {
          return (
            <input
              type={isEmail ? 'email' : 'text'}
              autoFocus
              value={field.value || ''}
              onChange={(e) => onUpdate(field.id, { value: e.target.value }, false)}
              onBlur={() => {
                setIsEditingInline(false);
                onUpdate(field.id, { value: field.value }, true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setIsEditingInline(false);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full h-full bg-white border border-[var(--color-primary)] rounded px-1 text-xs font-semibold text-slate-900 outline-none shadow-inner select-text"
              placeholder={fallbackText}
            />
          );
        }
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingInline(true);
            }}
            className={`w-full h-full flex items-center ${isWhiteBg ? 'bg-white' : 'bg-transparent'} select-none cursor-text overflow-hidden`}
            title={`Double-click to edit ${field.type}`}
          >
            <svg viewBox="0 0 120 24" className="w-full h-full pointer-events-none select-none" preserveAspectRatio={svgAlign}>
              <text
                x={svgX}
                y="17"
                textAnchor={svgAnchor}
                fill={field.color || '#000000'}
                fontFamily={field.fontFamily || (field.type === 'name' ? 'Helvetica, Arial, sans-serif' : 'inherit')}
                fontWeight={field.type === 'name' ? 'bold' : '500'}
                fontSize="14"
              >
                {displayVal}
              </text>
            </svg>
          </div>
        );
      }

      case 'checkbox': {
        const checkIcon = field.checkStyle === 'cross' ? 'close' : field.checkStyle === 'square' ? 'square' : 'check';
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(field.id, { checked: !field.checked });
            }}
            className="w-full h-full flex items-center justify-center bg-white border-2 border-slate-400 rounded select-none shadow-xs cursor-pointer hover:border-[var(--color-primary)] transition-colors"
            title="Click to toggle checkbox"
          >
            {field.checked !== false && (
              <span className={`material-symbols-outlined text-[var(--color-primary)] ${field.checkStyle === 'square' ? 'text-[12px]' : 'text-[18px]'} font-bold`}>
                {checkIcon}
              </span>
            )}
          </div>
        );
      }

      case 'seal':
        if (field.dataUrl) {
          return (
            <img
              src={field.dataUrl}
              alt="Seal"
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          );
        }
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-600 text-xs font-bold border border-dashed border-blue-400/40 rounded-lg p-1 select-none pointer-events-none">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="text-[10px] truncate">Official Seal</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={elementRef}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      style={{
        position: 'absolute',
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
        cursor: isEditingInline ? 'text' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      className={`group select-none z-20 ${
        isSelected
          ? 'ring-1.5 ring-[var(--color-primary)] bg-[var(--color-primary)]/5 rounded-xs'
          : 'border-0 outline-none'
      }`}
    >
      {/* Visual Field Content */}
      <div className="w-full h-full relative overflow-hidden">
        {renderFieldContent()}
      </div>

      {/* 8-Point Resize Handles (Visible when selected) */}
      {isSelected && !isEditingInline && (
        <>
          {RESIZE_HANDLES.map((h) => (
            <div
              key={h.dir}
              onMouseDown={(e) => handleResizeStart(e, h.dir)}
              onTouchStart={(e) => handleResizeStart(e, h.dir)}
              style={{ cursor: h.cursor }}
              className={`resize-handle absolute w-2.5 h-2.5 bg-white border-2 border-[var(--color-primary)] rounded-sm shadow-sm z-30 ${h.style}`}
            />
          ))}

          {/* Floating Context Action Capsule */}
          <div
            className="field-action-btn absolute left-1/2 -translate-x-1/2 -top-10 bg-[var(--bg-primary)] border border-[var(--border-medium)] shadow-xl rounded-xl px-1.5 py-1 flex items-center gap-1 z-40 animate-[fadeIn_0.1s_ease-out]"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Edit Button for Signatures / Initials */}
            {(field.type === 'signature' || field.type === 'initials') && onEdit && (
              <button
                onClick={() => onEdit(field)}
                className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                title="Change Signature Style"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
              </button>
            )}

            {/* Edit Text Button for Text / Name / Date / Email / Title / Company */}
            {['text', 'name', 'date', 'email', 'title', 'company'].includes(field.type) && (
              <button
                onClick={() => setIsEditingInline(true)}
                className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                title="Edit Text (Double-click)"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
              </button>
            )}

            {/* Toggle Checkbox Button */}
            {field.type === 'checkbox' && (
              <button
                onClick={() => onUpdate(field.id, { checked: !field.checked })}
                className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                title={field.checked ? 'Uncheck' : 'Check'}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {field.checked ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>
            )}

            {/* Duplicate Button */}
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(field.id)}
                className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                title="Duplicate Field"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
              </button>
            )}

            {/* Apply to All Pages Button (for initials, stamps) */}
            {totalPages > 1 && onApplyAll && (
              <button
                onClick={() => onApplyAll(field.id, totalPages)}
                className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                title="Apply to All Pages"
              >
                <span className="material-symbols-outlined text-[15px]">auto_stories</span>
              </button>
            )}

            {/* Delete Button */}
            {onRemove && (
              <button
                onClick={() => onRemove(field.id)}
                className="p-1 hover:bg-red-500/10 text-[var(--color-danger)] rounded-lg transition-colors cursor-pointer"
                title="Delete Field (Del)"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
