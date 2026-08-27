import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'
import * as serviceWorker from './registerServiceWorker'

// Global Crash Logger to prevent silent white screens — filters out non-fatal network/UI warnings
window.addEventListener('error', (event) => {
  console.warn('[Global Error Event]:', event.message || event.error);
  // Ignore non-fatal script errors (ResizeObserver, network drops, CDN/worker asset preloads)
  if (/ResizeObserver|Script error|ChunkLoadError|Failed to fetch|Load failed|NetworkError|importScripts|WorkerGlobalScope|transformers/i.test(event.message || '')) {
    return;
  }
  displayCrashScreen(`Fatal Error: ${event.message}`, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Unhandled Rejection Event]:', event.reason);
  const msg = event.reason?.message || String(event.reason || '');
  if (/ResizeObserver|ChunkLoadError|Failed to fetch|Load failed|Canceled|NetworkError|importScripts|WorkerGlobalScope|transformers/i.test(msg)) {
    return;
  }
  displayCrashScreen(`Unhandled Promise: ${msg}`, event.reason?.stack);
});

function displayCrashScreen(title, stack) {
  if (document.getElementById('docforge-crash-screen')) return;
  const div = document.createElement('div');
  div.id = 'docforge-crash-screen';
  div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090b0f;color:#ef4444;z-index:99999;padding:40px;overflow:auto;font-family:sans-serif;';
  div.innerHTML = `<h2 style="color:white;margin-bottom:20px">DocForge Engine Exception</h2>
    <div style="background:#131722;padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);">
      <h3 style="margin-top:0;color:#f87171">${title}</h3>
      <pre style="color:#94a3b8;white-space:pre-wrap;font-size:12px;font-family:monospace;background:#090b0f;padding:16px;border-radius:8px;">${stack || 'No stack trace available'}</pre>
    </div>
    <div style="margin-top:24px;display:flex;gap:12px">
      <button onclick="window.location.reload()" style="background:#f97316;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold">Reload App</button>
      <button onclick="document.getElementById('docforge-crash-screen').remove()" style="background:#1e293b;color:white;border:1px solid #334155;padding:10px 20px;border-radius:6px;cursor:pointer">Dismiss</button>
    </div>`;
  document.body.appendChild(div);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
)

serviceWorker.register();
