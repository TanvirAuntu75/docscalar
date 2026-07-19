// In desktop (Tauri) mode, the backend runs locally on a fixed port.
// window.__TAURI__ is injected automatically by the Tauri runtime when inside a WebView.
const IS_TAURI = typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
const DESKTOP_BACKEND = 'http://127.0.0.1:8765';

export const BACKEND_URL =
  IS_TAURI
    ? DESKTOP_BACKEND
    : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000');

/**
 * Secure wrapper around native fetch that automatically injects the stored JWT
 * access token in the Authorization header for API requests.
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = options.headers || {};
  
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
  
  return fetch(url, {
    ...options,
    headers: newHeaders
  });
}

/**
 * Uploads a file securely.
 * If the file is > 25MB and the user has a token, it uses the chunked upload endpoint.
 * Otherwise, it uses the standard single POST upload endpoint.
 */
export async function uploadFileSecure(backendUrl, file, onProgress) {
  const token = localStorage.getItem('accessToken');
  const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB chunks

  if (file.size > 25 * 1024 * 1024 && token) {
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
    formData.append('file', file);

    const res = await apiFetch(`${backendUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Upload failed.');
    }

    return res.json();
  }
}
