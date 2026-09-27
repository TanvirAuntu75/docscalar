import { useState, useEffect, useCallback } from 'react';

/**
 * ModelDownloadToast — a non-blocking, minimal floating indicator that shows
 * when AI models are downloading in the background. Sits above the chatbot FAB
 * in the bottom-right corner. Auto-dismisses after completion.
 *
 * Listens to 'model-download-progress' CustomEvents dispatched by classifier.js.
 */
export default function ModelDownloadToast() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'downloading' | 'ready' | 'error' | 'idle'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const handleEvent = useCallback((e) => {
    const d = e.detail;
    if (!d) return;

    if (d.type === 'loading') {
      setVisible(true);
      setPhase('downloading');
      const pct = Math.round(d.progress || 0);
      setProgress(pct);
      const fileName = d.file ? d.file.split('/').pop() : 'model';
      if (d.status === 'done') {
        setStatusText(`Downloaded ${fileName}`);
      } else {
        setStatusText(`Downloading ${fileName}...`);
      }
    } else if (d.type === 'status') {
      setVisible(true);
      if (phase !== 'ready') setPhase('downloading');
      setStatusText(d.message || 'Preparing AI engine...');
    } else if (d.type === 'ready') {
      setPhase('ready');
      setProgress(100);
      setStatusText('AI engine ready');
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setDismissing(true);
        setTimeout(() => {
          setVisible(false);
          setDismissing(false);
          setPhase('idle');
        }, 400);
      }, 3000);
    } else if (d.type === 'error') {
      setPhase('error');
      setStatusText('AI model failed to load');
      setTimeout(() => {
        setDismissing(true);
        setTimeout(() => {
          setVisible(false);
          setDismissing(false);
          setPhase('idle');
        }, 400);
      }, 5000);
    }
  }, [phase]);

  useEffect(() => {
    window.addEventListener('model-download-progress', handleEvent);
    return () => window.removeEventListener('model-download-progress', handleEvent);
  }, [handleEvent]);

  if (!visible) return null;

  const isReady = phase === 'ready';
  const isError = phase === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px',
        right: '24px',
        zIndex: 9998,
        width: '280px',
        background: isError
          ? 'rgba(127, 29, 29, 0.92)'
          : 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.3)' : isReady ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        opacity: dismissing ? 0 : 1,
        transform: dismissing ? 'translateY(12px) scale(0.95)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'modelToastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes modelToastSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modelToastPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .model-toast-animated { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        {/* Status indicator dot */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isError ? '#ef4444' : isReady ? '#22c55e' : '#f97316',
          boxShadow: `0 0 6px ${isError ? '#ef4444' : isReady ? '#22c55e' : '#f97316'}`,
          animation: isReady || isError ? 'none' : 'modelToastPulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: isError ? '#fca5a5' : isReady ? '#86efac' : '#e2e8f0',
          letterSpacing: '0.02em',
        }}>
          {isError ? 'Download Failed' : isReady ? 'AI Ready' : 'DocScalar AI'}
        </span>
      </div>

      {/* Status text */}
      <p style={{
        margin: '0 0 8px 0',
        fontSize: '11px',
        color: 'rgba(148, 163, 184, 0.9)',
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {statusText}
      </p>

      {/* Progress bar (only during download) */}
      {!isReady && !isError && (
        <div style={{
          width: '100%',
          height: '3px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.max(progress, 2)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #f97316, #fb923c)',
            borderRadius: '2px',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      )}

      {/* Checkmark for ready state */}
      {isReady && (
        <div style={{
          width: '100%',
          height: '3px',
          background: 'rgba(34, 197, 94, 0.3)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: '#22c55e',
            borderRadius: '2px',
          }} />
        </div>
      )}
    </div>
  );
}
