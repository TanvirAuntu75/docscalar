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

    // Self-healing: if it is a ChunkLoadError (common when updates are deployed),
    // automatically reload the page once to pull the new version.
    const isChunkError = 
      error && 
      (error.name === 'ChunkLoadError' || 
       /chunk|dynamically imported module|failed to fetch/i.test(error.message || ''));
       
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reload', 'true');
        console.warn('[ErrorBoundary] ChunkLoadError detected. Attempting self-healing page reload...');
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('chunk_error_reload');
    this.setState({ hasError: false, error: null });
    // Force redirect to clear any bad state in the URL or history
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-background min-h-[75vh] flex flex-col justify-center items-center px-margin-mobile py-xl relative overflow-hidden">
          <SEOHead title="Error — DocForge" description="Something went wrong." />

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
                  onClick={() => window.location.reload()}
                  className="font-button text-button bg-surface text-on-background border border-outline-variant hover:border-primary hover:bg-surface-bright px-8 py-3.5 rounded-lg active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Try Again
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
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
