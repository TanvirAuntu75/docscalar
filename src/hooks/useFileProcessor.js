import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to manage file processing state, progress, errors, and results
 * with built-in memory leak protection for Object URLs.
 */
export default function useFileProcessor() {
  const location = useLocation();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (location.state && location.state.initialFile) {
      setFiles([location.state.initialFile]);
      // Clean up router state so refreshing doesn't duplicate the action
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Keep track of all generated object URLs for automatic garbage collection
  const objectUrlsRef = useRef([]);

  /**
   * Safe wrapper around URL.createObjectURL that registers the URL for future cleanup.
   */
  const createSafeObjectURL = useCallback((blob) => {
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  /**
   * Revoke all registered object URLs to reclaim system memory.
   */
  const revokeAllObjectURLs = useCallback(() => {
    if (objectUrlsRef.current.length > 0) {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Error revoking object URL:', e);
        }
      });
      objectUrlsRef.current = [];
    }
  }, []);

  /**
   * Resets all state variables and revokes all registered object URLs.
   */
  const reset = useCallback(() => {
    setFiles([]);
    setProcessing(false);
    setProgress(0);
    setResult(null);
    setError(null);
    revokeAllObjectURLs();
  }, [revokeAllObjectURLs]);

  // Clean up all object URLs when the component using this hook unmounts
  useEffect(() => {
    return () => {
      revokeAllObjectURLs();
    };
  }, [revokeAllObjectURLs]);

  return {
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
    reset,
    createSafeObjectURL,
  };
}
