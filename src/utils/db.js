// DocScalar IndexedDB Utility for Offline Cache & Draft Storage
import { scheduleIdleTask, runWhenIdle } from './idleTask.js';

const DB_NAME = 'docscalar_db';
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
        // Defer conversionHistory localStorage serialization to idle frame so UI thread stays responsive
        scheduleIdleTask(() => {
          try {
            if (typeof localStorage === 'undefined') return;
            const historyRaw = localStorage.getItem('conversionHistory');
            let history = [];
            if (historyRaw) {
              try {
                const parsed = JSON.parse(historyRaw);
                history = Array.isArray(parsed) ? parsed : [];
              } catch (_) {
                history = [];
              }
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
            try {
              localStorage.setItem('conversionHistory', JSON.stringify(history));
            } catch (quotaErr) {
              // Auto-recovery for quota-limited storage (e.g. mobile Safari private mode)
              try {
                history = history.slice(0, 25);
                localStorage.setItem('conversionHistory', JSON.stringify(history));
              } catch (fallbackErr) {
                console.warn('Failed to persist conversion history even after quota trimming:', fallbackErr);
              }
            }
          } catch (err) {
            console.error('Failed to save conversion history to localStorage:', err);
          }
        }, { timeout: 2000 });

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

let pendingCanvasSaveTask = null;
let canvasSaveSequence = 0;

export async function saveCanvasState(state) {
  const currentSeq = ++canvasSaveSequence;

  if (pendingCanvasSaveTask && typeof pendingCanvasSaveTask.cancel === 'function') {
    // Cancel superseded in-flight idle task to prevent redundant writes and race conditions
    try {
      pendingCanvasSaveTask.cancel(new Error('Superseded by newer canvas state'));
    } catch (_) {}
  }

  const task = runWhenIdle(async () => {
    // Abort if superseded or cleared before idle frame execution
    if (currentSeq !== canvasSaveSequence) {
      return null;
    }

    try {
      const db = await openDB();

      // Double-check sequence after awaiting openDB to eliminate race condition
      if (currentSeq !== canvasSaveSequence) {
        return null;
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(CANVAS_STORE_NAME);
        const request = store.put({ key: 'current', state, date: new Date().toISOString() });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject('Failed to save canvas state: ' + e.target.error);
      });
    } catch (err) {
      console.error('Failed to save canvas state:', err);
      throw err;
    } finally {
      if (pendingCanvasSaveTask === task) {
        pendingCanvasSaveTask = null;
      }
    }
  }, 2000);

  pendingCanvasSaveTask = task;

  // Gracefully handle cancellation so superseded callers don't trigger unhandled promise rejections
  return task.catch((err) => {
    if (err?.message === 'Superseded by newer canvas state' || err?.message === 'Superseded by canvas clear' || err?.message?.includes('cancelled')) {
      return null;
    }
    throw err;
  });
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
  // Invalidate any in-flight or queued saveCanvasState tasks to prevent resurrection of cleared state
  canvasSaveSequence++;
  if (pendingCanvasSaveTask && typeof pendingCanvasSaveTask.cancel === 'function') {
    try {
      pendingCanvasSaveTask.cancel(new Error('Superseded by canvas clear'));
    } catch (_) {}
    pendingCanvasSaveTask = null;
  }

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

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Direct internal pruning function that executes immediately and guarantees
 * completion of the delete transaction before resolving.
 */
export async function _pruneExpiredStudioDraftsDirect(maxAgeMs = DRAFT_TTL_MS) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      let isSettled = false;
      const settle = (count) => {
        if (!isSettled) {
          isSettled = true;
          resolve(count);
        }
      };

      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.getAll();

      let pruned = 0;

      request.onsuccess = () => {
        const records = request.result || [];
        const now = Date.now();

        for (const rec of records) {
          if (rec.key && rec.key.startsWith('studio_draft_')) {
            const age = rec.date ? now - new Date(rec.date).getTime() : Infinity;
            if (age > maxAgeMs) {
              store.delete(rec.key);
              pruned++;
            }
          }
        }
        // Fallback resolution in case runtime or mock environment does not fire oncomplete
        setTimeout(() => settle(pruned), 10);
      };

      // Ensure transaction finishes committing so storage quota is actually freed
      transaction.oncomplete = () => {
        settle(pruned);
      };

      transaction.onerror = () => {
        settle(0);
      };

      request.onerror = () => {
        settle(0);
      };
    });
  } catch (err) {
    console.warn('Direct pruning of expired studio drafts failed:', err);
    return 0;
  }
}

const pendingPruneTasks = new Map();

/**
 * Prune studio drafts older than maxAgeMs to protect mobile storage quota.
 * Scheduled during browser idle frames to eliminate startup thread contention.
 * Defaults to 24 hours. Coalesces concurrent calls for the same maxAgeMs.
 */
export function pruneExpiredStudioDrafts(maxAgeMs = DRAFT_TTL_MS) {
  if (pendingPruneTasks.has(maxAgeMs)) {
    return pendingPruneTasks.get(maxAgeMs);
  }

  const task = runWhenIdle(async () => {
    try {
      return await _pruneExpiredStudioDraftsDirect(maxAgeMs);
    } finally {
      pendingPruneTasks.delete(maxAgeMs);
    }
  }, 3000);

  const sharedPromise = task.catch((err) => {
    pendingPruneTasks.delete(maxAgeMs);
    throw err;
  });

  pendingPruneTasks.set(maxAgeMs, sharedPromise);
  return sharedPromise;
}

const pendingDraftSaveTasks = new Map();
const draftSaveSequences = new Map();

/**
 * Persist active studio drafts (Organize, Merge, Sign, Image-to-PDF) to survive browser reloads.
 * Implements QuotaExceededError recovery with automatic storage sweep.
 * Scheduled during browser idle frames to prevent blocking typing or canvas dragging.
 * Deduplicates and cancels superseded in-flight saves per key to prevent write storms and race conditions.
 */
export async function saveStudioDraft(key, data) {
  const currentSeq = (draftSaveSequences.get(key) || 0) + 1;
  draftSaveSequences.set(key, currentSeq);

  if (pendingDraftSaveTasks.has(key)) {
    const existingTask = pendingDraftSaveTasks.get(key);
    if (existingTask && typeof existingTask.cancel === 'function') {
      try {
        existingTask.cancel(new Error(`Superseded by newer draft for ${key}`));
      } catch (_) {}
    }
  }

  const task = runWhenIdle(async () => {
    // Abort if superseded or cleared before idle frame execution
    if (draftSaveSequences.get(key) !== currentSeq) {
      return null;
    }

    try {
      const db = await openDB();

      // Double-check sequence after awaiting openDB
      if (draftSaveSequences.get(key) !== currentSeq) {
        return null;
      }

      const putPromise = () =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
          const store = transaction.objectStore(CANVAS_STORE_NAME);
          const request = store.put({ key: `studio_draft_${key}`, data, date: new Date().toISOString() });
          request.onsuccess = () => resolve();
          request.onerror = (e) => reject(e.target?.error || e);
        });

      try {
        await putPromise();
      } catch (err) {
        // QuotaExceededError recovery: prune drafts older than 1 hour directly and retry immediately
        console.warn('Draft save error, attempting storage quota recovery:', err);
        await _pruneExpiredStudioDraftsDirect(60 * 60 * 1000);
        try {
          if (draftSaveSequences.get(key) === currentSeq) {
            await putPromise();
          }
        } catch (retryErr) {
          console.warn('Studio draft save skipped after quota recovery attempt:', retryErr);
        }
      }
    } catch (err) {
      console.warn('Studio draft save skipped:', err);
    } finally {
      if (pendingDraftSaveTasks.get(key) === task) {
        pendingDraftSaveTasks.delete(key);
      }
    }
  }, 2000);

  pendingDraftSaveTasks.set(key, task);

  return task.catch((err) => {
    if (err?.message?.includes('Superseded') || err?.message?.includes('cancelled')) {
      return null;
    }
    throw err;
  });
}

export async function loadStudioDraft(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.get(`studio_draft_${key}`);
      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }
        // Invalidate if older than 24 hours
        const age = record.date ? Date.now() - new Date(record.date).getTime() : Infinity;
        if (age > DRAFT_TTL_MS) {
          store.delete(`studio_draft_${key}`);
          resolve(null);
          return;
        }
        resolve(record.data || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Studio draft load skipped:', err);
    return null;
  }
}

export async function clearStudioDraft(key) {
  // Invalidate any in-flight or queued saveStudioDraft tasks for this key to prevent resurrection
  draftSaveSequences.set(key, (draftSaveSequences.get(key) || 0) + 1);
  if (pendingDraftSaveTasks.has(key)) {
    const existingTask = pendingDraftSaveTasks.get(key);
    if (existingTask && typeof existingTask.cancel === 'function') {
      try {
        existingTask.cancel(new Error(`Superseded by draft clear for ${key}`));
      } catch (_) {}
    }
    pendingDraftSaveTasks.delete(key);
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(CANVAS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE_NAME);
      const request = store.delete(`studio_draft_${key}`);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Studio draft clear skipped:', err);
  }
}

