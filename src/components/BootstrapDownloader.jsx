import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/api';

export default function BootstrapDownloader({ onComplete }) {
  const [status, setStatus] = useState({
    installed: false,
    status: 'idle',
    step: 'Checking portable dependencies...',
    percent: 0,
    speed_mb: 0.0,
    error: null
  });

  const [installTriggered, setInstallTriggered] = useState(false);

  // Poll status every 800ms
  useEffect(() => {
    let intervalId;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/bootstrap/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);

          if (data.installed || data.status === 'completed') {
            clearInterval(intervalId);
            setTimeout(() => {
              onComplete();
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Error fetching bootstrap status:', err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 800);

    return () => clearInterval(intervalId);
  }, [onComplete]);

  // Trigger install once on mount
  const handleStartInstall = async () => {
    if (installTriggered) return;
    setInstallTriggered(true);
    try {
      await fetch(`${BACKEND_URL}/api/bootstrap/install`, { method: 'POST' });
    } catch (err) {
      console.error('Error triggering bootstrap install:', err);
    }
  };

  useEffect(() => {
    if (status.status === 'idle' && !status.installed) {
      handleStartInstall();
    }
  }, [status.status, status.installed]);

  const getStatusText = () => {
    if (status.status === 'downloading') {
      return `Downloading Runtimes... (${status.speed_mb} MB/s)`;
    }
    if (status.status === 'extracting') {
      return 'Extracting and installing libraries...';
    }
    if (status.status === 'completed') {
      return 'Installation Complete! Loading DocForge...';
    }
    if (status.status === 'failed') {
      return 'Installation Failed. Please restart the app.';
    }
    return status.step;
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#090b0f] text-white p-6 relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      <div className="w-full max-w-md bg-[#131720]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 text-center flex flex-col items-center gap-6">
        {/* Animated loader ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
          <div className={`absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full ${status.status !== 'failed' && status.status !== 'completed' ? 'animate-spin' : ''}`} />
          
          {/* Accent dynamic dot */}
          <div className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_8px_#f97316]" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Setting up DocForge Studio
          </h2>
          <p className="text-sm text-slate-400">
            Downloading local PaddleOCR ONNX models and LibreOffice Portable binaries.
          </p>
        </div>

        {/* Progress bar container */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span className="truncate max-w-[280px]">{getStatusText()}</span>
            <span>{status.percent}%</span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(249,115,22,0.4)]"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>

        {status.error && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 rounded-lg text-xs leading-relaxed text-left w-full overflow-auto max-h-24">
            <span className="font-semibold">Error details:</span> {status.error}
          </div>
        )}

        <div className="text-[10px] text-slate-500 leading-normal">
          This process is required only on the first run. <br />
          DocForge runs Locally with full hardware support once initialized.
        </div>
      </div>
    </div>
  );
}
