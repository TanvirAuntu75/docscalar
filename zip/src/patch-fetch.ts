if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get() { return originalFetch; },
        set(val) {
          console.warn('Ignored attempt to overwrite window.fetch');
        }
      });
    }
  } catch (e) {
    console.warn('Failed to patch fetch:', e);
  }
}
