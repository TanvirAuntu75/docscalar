// Service Worker Registration Helper for Local First Caching

export function register() {
  const isProd = import.meta.env.PROD;

  if (!('serviceWorker' in navigator)) return;

  const isTauri = typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';

  if (!isProd || isTauri) {
    // Disable service worker in development and Tauri desktop app to prevent stale asset caching
    unregister();
    return;
  }

  // Flag to prevent infinite reload loop
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registered with scope:', registration.scope);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[Service Worker] New content available — please refresh.');
              } else {
                console.log('[Service Worker] Content cached for offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        for (let registration of registrations) {
          registration.unregister()
            .then((success) => {
              if (success) {
                console.log('[Service Worker] Unregistered old development service worker:', registration.scope);
              }
            });
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Unregister failed:', error);
      });
  }
}
