import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Custom hook for polling backend task conversion jobs.
 * @param {string} apiBaseUrl - Base backend URL (e.g. http://localhost:8000)
 */
export function useJobPoller(apiBaseUrl = 'http://localhost:8000') {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'queued' | 'started' | 'finished' | 'failed'
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const startTimeRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);
  const pollWorkerRef = useRef(null);

  const startPolling = useCallback((id) => {
    setJobId(id);
    setStatus('queued');
    setProgress(10);
    setStatusMessage('Queued on server...');
    setError(null);
    setResult(null);
    startTimeRef.current = Date.now();
    consecutiveFailuresRef.current = 0;
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const MAX_POLL_TIME = 15 * 60 * 1000; // 15 minutes max duration for large scanned documents

    const pollJob = async () => {
      // Check for timeout
      if (startTimeRef.current && (Date.now() - startTimeRef.current > MAX_POLL_TIME)) {
        setStatus('failed');
        setError('Processing timed out. Please try again.');
        return;
      }

      try {
        const response = await apiFetch(`${apiBaseUrl}/api/job/${jobId}/status`);
        if (!response.ok) {
          throw new Error('Failed to retrieve task status');
        }
        
        const data = await response.json();
        consecutiveFailuresRef.current = 0; // reset on successful fetch
        
        if (data.status === 'finished') {
          setStatus('finished');
          setProgress(100);
          setStatusMessage('Completed');
          setResult({
            success: true,
            downloadUrl: `${apiBaseUrl}${data.download_url}`
          });
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || 'Conversion task failed on server');
        } else if (data.status === 'started') {
          setStatus('started');
          setProgress(data.progress || 30);
          setStatusMessage(data.message || 'Processing on server...');
        } else if (data.status === 'queued') {
          setStatus('queued');
          setProgress(data.progress || 10);
          setStatusMessage(data.message || 'Queued on server...');
        }
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 8) {
          setStatus('failed');
          setError('Network connection lost. The server is unreachable after multiple attempts.');
        }
      }
    };

    // Run first check immediately
    pollJob();

    // Use Web Worker timer to avoid Chrome/Edge throttling when tab is hidden or minimized
    const workerTimerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (!timer) {
            timer = setInterval(function() { self.postMessage('tick'); }, 1200);
          }
        } else if (e.data === 'stop') {
          if (timer) { clearInterval(timer); timer = null; }
        }
      };
    `;
    const workerBlob = new Blob([workerTimerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    try {
      const worker = new Worker(workerUrl);
      pollWorkerRef.current = worker;
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          pollJob();
        }
      };
      worker.postMessage('start');
    } catch (e) {
      // Fallback to standard interval
      const fallbackInterval = setInterval(pollJob, 1200);
      pollWorkerRef.current = { terminate: () => clearInterval(fallbackInterval), postMessage: () => {} };
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollJob(); // Immediate poll when user returns to tab
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollWorkerRef.current) {
        pollWorkerRef.current.postMessage('stop');
        pollWorkerRef.current.terminate();
        pollWorkerRef.current = null;
      }
      URL.revokeObjectURL(workerUrl);
    };
  }, [jobId, apiBaseUrl]);

  const resetPoller = useCallback(() => {
    setJobId(null);
    setStatus('idle');
    setProgress(0);
    setStatusMessage('');
    setResult(null);
    setError(null);
    consecutiveFailuresRef.current = 0;
  }, []);

  return {
    jobId,
    status,
    progress,
    statusMessage,
    result,
    error,
    startPolling,
    resetPoller
  };
}