import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'
import * as serviceWorker from './registerServiceWorker'

// Check if an error or rejection originates from third-party browser extensions or benign runtime events
function isThirdPartyOrExtensionError(msg = '', stack = '', filename = '') {
  const combined = `${msg} ${stack} ${filename}`;
  // 1. Browser extensions (Chrome, Firefox, Safari, Edge)
  if (/chrome-extension:\/\/|moz-extension:\/\/|safari-extension:\/\/|safari-web-extension:\/\/|extension:\/\//i.test(combined)) {
    return true;
  }
  // 2. Non-fatal benign browser events and dynamic loader warnings
  if (/ResizeObserver|Script error|ChunkLoadError|Failed to fetch|Load failed|Canceled|NetworkError|importScripts|WorkerGlobalScope|transformers/i.test(combined)) {
    return true;
  }
  return false;
}

// Global Crash Logger to prevent silent white screens — filters out non-fatal network/UI warnings and browser extension exceptions
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  const stack = event.error?.stack || '';
  const filename = event.filename || '';

  if (isThirdPartyOrExtensionError(msg, stack, filename)) {
    console.warn('[Ignored Third-Party/Extension Error]:', msg || event.error);
    return;
  }

  console.warn('[Global Error Event]:', event.message || event.error);
  displayCrashScreen(`Fatal Error: ${event.message}`, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '');
  const stack = event.reason?.stack || '';

  if (isThirdPartyOrExtensionError(msg, stack)) {
    console.warn('[Ignored Third-Party/Extension Rejection]:', event.reason);
    return;
  }

  console.warn('[Unhandled Rejection Event]:', event.reason);
  displayCrashScreen(`Unhandled Promise: ${msg}`, event.reason?.stack);
});

function displayCrashScreen(title, stack) {
  if (document.getElementById('docscalar-crash-screen')) return;
  const div = document.createElement('div');
  div.id = 'docscalar-crash-screen';
  div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090b0f;color:#ef4444;z-index:99999;padding:40px;overflow:auto;font-family:sans-serif;';
  div.innerHTML = `<h2 style="color:white;margin-bottom:20px">DocScalar Engine Exception</h2>
    <div style="background:#131722;padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);">
      <h3 style="margin-top:0;color:#f87171">${title}</h3>
      <pre style="color:#94a3b8;white-space:pre-wrap;font-size:12px;font-family:monospace;background:#090b0f;padding:16px;border-radius:8px;">${stack || 'No stack trace available'}</pre>
    </div>
    <div style="margin-top:24px;display:flex;gap:12px">
      <button onclick="window.location.reload()" style="background:#f97316;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold">Reload App</button>
      <button onclick="document.getElementById('docscalar-crash-screen').remove()" style="background:#1e293b;color:white;border:1px solid #334155;padding:10px 20px;border-radius:6px;cursor:pointer">Dismiss</button>
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
