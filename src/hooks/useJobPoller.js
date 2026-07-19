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
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);

  const startPolling = useCallback((id) => {
    setJobId(id);
    setStatus('queued');
    setProgress(10);
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
        clearInterval(pollIntervalRef.current);
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
          clearInterval(pollIntervalRef.current);
          setStatus('finished');
          setProgress(100);
          setResult({
            success: true,
            downloadUrl: `${apiBaseUrl}${data.download_url}`
          });
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setStatus('failed');
          setError(data.error || 'Conversion task failed on server');
        } else if (data.status === 'started') {
          setStatus('started');
          setProgress(data.progress || 50);
        } else if (data.status === 'queued') {
          setStatus('queued');
          setProgress(25);
        }
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 5) {
          clearInterval(pollIntervalRef.current);
          setStatus('failed');
          setError('Network connection lost. The server is unreachable after multiple attempts.');
        }
      }
    };

    // Run first check immediately
    pollJob();

    // Set interval to check every 1.5 seconds
    pollIntervalRef.current = setInterval(pollJob, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [jobId, apiBaseUrl]);

  const resetPoller = useCallback(() => {
    setJobId(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
    consecutiveFailuresRef.current = 0;
  }, []);

  return {
    jobId,
    status,
    progress,
    result,
    error,
    startPolling,
    resetPoller
  };
}