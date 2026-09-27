// In desktop (Tauri) mode, the backend runs locally on a fixed port.
// window.__TAURI__ is injected automatically by the Tauri runtime when inside a WebView.
const IS_TAURI = typeof window !== 'undefined' && (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined');
const DESKTOP_BACKEND = 'http://127.0.0.1:8765';

export function getBackendUrl() {
  if (IS_TAURI) {
    return DESKTOP_BACKEND;
  }
  // Explicitly configured via build/env variable takes highest precedence
  if (import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname, port, origin } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    // If running on local dev/preview ports (e.g. Vite dev :5173 or preview :4173), target local FastAPI server
    if (isLocalhost && port !== '8000' && port !== '80' && port !== '') {
      return 'http://127.0.0.1:8000';
    }
    // In all web production environments (e.g. http://138.2.81.40 or custom domain), use the active server origin
    if (origin && origin !== 'null') {
      return origin;
    }
  }
  return import.meta.env?.DEV ? 'http://127.0.0.1:8000' : '';
}

export const BACKEND_URL = getBackendUrl();

/**
 * Resolves any relative API path against the configured BACKEND_URL.
 * Leaves absolute URLs (http://, https://, blob:, data:) untouched.
 */
export function resolveApiUrl(url) {
  const base = getBackendUrl();
  if (!url) return base;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

/**
 * Secure wrapper around native fetch that automatically injects the stored JWT
 * access token in the Authorization header for API requests, and resolves relative URLs.
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = options.headers || {};
  const targetUrl = resolveApiUrl(url);
  
  // Format headers correctly whether they are a Headers object or a plain object
  let newHeaders;
  if (headers instanceof Headers) {
    newHeaders = new Headers(headers);
    if (token) {
      newHeaders.set('Authorization', `Bearer ${token}`);
    }
  } else {
    newHeaders = { ...headers };
    if (token) {
      newHeaders['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(targetUrl, {
    ...options,
    headers: newHeaders
  });

  // Intercept expired or revoked authentication tokens
  if (response.status === 401 && token) {
    localStorage.removeItem('accessToken');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('docscalar:auth-expired'));
    }
  }

  return response;
}

/**
 * Uploads a file securely.
 * If the file is > 25MB, it uses the chunked upload endpoint (supports both guest and authenticated users).
 * Otherwise, it uses the standard single POST upload endpoint.
 */
export async function uploadFileSecure(backendUrl, file, onProgress) {
  const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB chunks

  if (file.size > 25 * 1024 * 1024) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = crypto.randomUUID();

    let lastResult = null;
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunkBlob, file.name);
      formData.append('upload_id', uploadId);
      formData.append('chunk_index', chunkIndex);
      formData.append('total_chunks', totalChunks);
      formData.append('filename', file.name);

      const res = await apiFetch(`${backendUrl}/api/upload/chunk`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Chunk upload failed.');
      }

      lastResult = await res.json();

      if (onProgress) {
        onProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
      }
    }

    if (lastResult && lastResult.completed) {
      return lastResult;
    }
    throw new Error('Upload completed but metadata was not received.');
  } else {
    // Regular single file upload
    const formData = new FormData();
    formData.append('file', file, file.name || 'document.pdf');

    const res = await apiFetch(`${backendUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Upload failed.');
    }

    if (onProgress) {
      onProgress(100);
    }

    return res.json();
  }
}
