// DocForge Local IndexedDB Utility for Local First Data Storage
const DB_NAME = 'docforge_db';
const DB_VERSION = 2; // Upgraded version to support canvas layout saving
const STORE_NAME = 'file_history';
const CANVAS_STORE_NAME = 'canvas_state';

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CANVAS_STORE_NAME)) {
        db.createObjectStore(CANVAS_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      reject('Failed to open local database: ' + e.target.error);
    };
  });
}

export async function saveFile(name, size, type, action, blob) {
  try {
    // Eviction Strategy: Keep only the last 10 files (LRU)
    const records = await getFiles();
    const MAX_CACHED_FILES = 10;
    if (records.length >= MAX_CACHED_FILES) {
      // Sort chronologically (oldest first)
      const sortedByAge = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      const toDeleteCount = records.length - MAX_CACHED_FILES + 1;
      for (let i = 0; i < toDeleteCount; i++) {
        if (sortedByAge[i]) {
          try {
            await deleteFile(sortedByAge[i].id);
          } catch (err) {
            console.error('Failed to evict old file:', err);
          }
        }
      }
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        name,
        size,
        type,
        action,
        date: new Date().toISOString(),
        blob // Stores raw binary Blob directly
      };

      const request = store.add(record);

      request.onsuccess = () => {
        try {
          const historyRaw = localStorage.getItem('conversionHistory');
          let history = [];
          if (historyRaw) {
            history = JSON.parse(historyRaw);
          }
          history.unshift({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            filename: name,
            toolName: action,
            timestamp: new Date().toISOString()
          });
          if (history.length > 100) {
            history = history.slice(0, 100);
          }
          localStorage.setItem('conversionHistory', JSON.stringify(history));
        } catch (err) {
          console.error('Failed to save conversion history to localStorage:', err);
        }
        resolve(request.result); // Returns key (id)
      };

      request.onerror = (e) => {
        reject('Failed to save file locally: ' + e.target.error);
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function getFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort files chronologically, newest first
        const sorted = (request.result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(sorted);
      };

      request.onerror = (e) => {
        reject('Failed to retrieve file history: ' + e.target.error);
      };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function deleteFile(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject('Failed to delete file from local database: ' + e.target.error);
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function clearFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject('Failed to clear file database: ' + e.target.error);
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function saveCanvasState(state) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.put({ key: 'current', state, date: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject('Failed to save canvas state: ' + e.target.error);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function loadCanvasState() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result ? request.result.state : null);
      request.onerror = (e) => reject('Failed to load canvas state: ' + e.target.error);
    });
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function clearCanvasState() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.delete('current');
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject('Failed to clear canvas state: ' + e.target.error);
    });
  } catch (err) {
    console.error(err);
  }
}

/**
 * Persist active studio drafts (Organize, Merge, Sign, Image-to-PDF) to survive browser reloads.
 */
export async function saveStudioDraft(key, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.put({ key: `studio_draft_${key}`, data, date: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject('Failed to save studio draft: ' + e.target.error);
    });
  } catch (err) {
    console.warn('Studio draft save skipped:', err);
  }
}

export async function loadStudioDraft(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.get(`studio_draft_${key}`);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = (e) => reject('Failed to load studio draft: ' + e.target.error);
    });
  } catch (err) {
    console.warn('Studio draft load skipped:', err);
    return null;
  }
}

export async function clearStudioDraft(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.delete(`studio_draft_${key}`);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject('Failed to clear studio draft: ' + e.target.error);
    });
  } catch (err) {
    console.warn('Studio draft clear skipped:', err);
  }
}

