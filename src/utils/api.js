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
