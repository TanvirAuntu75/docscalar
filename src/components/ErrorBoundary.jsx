import React from 'react';
import SEOHead from './SEOHead';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    const isTauri = typeof window !== 'undefined' && (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined');
    const isChunkError = 
      error && 
      (error.name === 'ChunkLoadError' || 
       /chunk|dynamically imported module|failed to fetch/i.test(error.message || ''));
       
    // Only attempt self-healing reload in Web mode (never in Tauri desktop app to avoid white screen loops)
    if (isChunkError && !isTauri) {
      const lastReload = parseInt(sessionStorage.getItem('chunk_error_reload') || '0', 10);
      if (Date.now() - lastReload > 30000) {
        sessionStorage.setItem('chunk_error_reload', Date.now().toString());
        console.warn('[ErrorBoundary] ChunkLoadError detected in Web mode. Refreshing...');
        window.location.reload();
      }
    }
  }

  handleReset = async () => {
    sessionStorage.removeItem('chunk_error_reload');
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
      } catch {}
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        for (let key of keys) {
          await caches.delete(key);
        }
      } catch {}
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/?_t=' + Date.now();
  };

  handleTryAgain = async () => {
    sessionStorage.removeItem('chunk_error_reload');
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
      } catch {}
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        for (let key of keys) {
          await caches.delete(key);
        }
      } catch {}
    }
    window.location.href = window.location.pathname + '?_t=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-background min-h-[75vh] flex flex-col justify-center items-center px-margin-mobile py-xl relative overflow-hidden">
          <SEOHead title="Error — DocScalar" description="Something went wrong." />

          <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>
          <div className="absolute inset-0 app-bg-mesh pointer-events-none"></div>

          <div className="relative z-10 max-w-lg w-full">
            <div className="bg-glass backdrop-blur-xl border border-outline-variant p-8 sm:p-12 rounded-2xl shadow-xl text-center transition-all">
              <div className="w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-error/20">
                <span className="material-symbols-outlined text-[40px]">
                  warning
                </span>
              </div>

              <h1 className="font-h2 text-h2 text-on-background mb-3">Oops! Something went wrong.</h1>

              <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
                We encountered an unexpected error while trying to load this tool. Don't worry, your files are safe.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="font-button text-button bg-primary text-white px-8 py-3.5 rounded-lg hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">home</span>
                  Go Back Home
                </button>
                <button
                  onClick={this.handleTryAgain}
                  className="font-button text-button bg-surface text-on-background border border-outline-variant hover:border-primary hover:bg-surface-bright px-8 py-3.5 rounded-lg active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Try Again
                </button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-8 text-left bg-surface-container-highest p-4 rounded-lg overflow-auto max-h-48 border border-outline-variant">
                  <p className="font-label-mono text-label-mono text-error mb-2 font-bold">Development Error Details:</p>
                  <pre className="text-xs text-on-surface-variant font-mono whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
