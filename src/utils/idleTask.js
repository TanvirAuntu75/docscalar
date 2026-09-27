/**
 * DocScalar Non-Blocking Cooperative Idle Task Scheduler
 * Implements W3C Cooperative Scheduling of Background Tasks with cross-browser fallback
 * for Safari, Web Workers, Node.js, and legacy environments lacking requestIdleCallback.
 */

function getGlobalScope() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof self !== 'undefined') return self;
  if (typeof global !== 'undefined') return global;
  return {};
}

function getNativeIdleFns() {
  const g = getGlobalScope();
  const rIC = typeof g.requestIdleCallback === 'function' ? g.requestIdleCallback.bind(g) : null;
  const cIC = typeof g.cancelIdleCallback === 'function' ? g.cancelIdleCallback.bind(g) : null;
  return { rIC, cIC };
}

let taskIdCounter = 0;
const activeTaskRegistry = new Map();

/**
 * Schedule a cooperative background task during browser idle periods.
 * When requestIdleCallback is available, delegates natively with the configured timeout.
 * When unavailable (e.g. Safari, Node test runners), falls back to setTimeout passing
 * a mock IdleDeadline object adhering to the W3C specification.
 *
 * @param {Function} callback - Invoked with IdleDeadline { didTimeout: boolean, timeRemaining: () => number }
 * @param {Object|number} [options={ timeout: 2000 }] - Options object or timeout in milliseconds
 * @returns {number} Task ID handle to be passed to cancelIdleTask
 */
export function scheduleIdleTask(callback, options = { timeout: 2000 }) {
  if (typeof callback !== 'function') {
    throw new TypeError('scheduleIdleTask: callback must be a function');
  }

  let timeout = 2000;
  let onCancelCallback = null;

  if (typeof options === 'number') {
    timeout = Math.max(0, options);
  } else if (typeof options === 'object' && options !== null) {
    if (options.timeout !== undefined) {
      const parsed = Number(options.timeout);
      timeout = !isNaN(parsed) ? Math.max(0, parsed) : 2000;
    }
    if (typeof options.onCancel === 'function') {
      onCancelCallback = options.onCancel;
    }
  }

  const taskId = ++taskIdCounter;
  const { rIC, cIC } = getNativeIdleFns();

  if (rIC) {
    try {
      let executed = false;
      const nativeHandle = rIC((deadline) => {
        executed = true;
        activeTaskRegistry.delete(taskId);
        try {
          const res = callback(deadline);
          if (res && typeof res.catch === 'function') {
            res.catch((err) => {
              console.error('Error executing idle task (native async):', err);
            });
          }
        } catch (err) {
          console.error('Error executing idle task (native):', err);
        }
      }, { timeout });

      if (!executed) {
        activeTaskRegistry.set(taskId, {
          type: 'native',
          handle: nativeHandle,
          cancelFn: cIC,
          onCancel: onCancelCallback
        });
      }

      return taskId;
    } catch (nativeErr) {
      activeTaskRegistry.delete(taskId);
      // In case native rIC throws unexpectedly (e.g. restricted context), gracefully fall through to fallback
      console.warn('Native requestIdleCallback threw, falling back to timer-based idle scheduler:', nativeErr);
    }
  }

  // Cross-browser fallback (Safari, Node.js, Web Workers)
  const scheduledTime = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();

  const timerDelay = Math.min(timeout, 1);
  const timerHandle = setTimeout(() => {
    activeTaskRegistry.delete(taskId);
    const startExecTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    const elapsedSinceSchedule = startExecTime - scheduledTime;
    const didTimeout = elapsedSinceSchedule >= timeout;

    // Simulated 50ms idle frame slice conforming to W3C idle scheduling spec
    // Note: W3C spec Section 4.1.2 mandates that timeRemaining() MUST return 0 if didTimeout is true
    const deadline = {
      didTimeout,
      timeRemaining: () => {
        if (didTimeout) return 0;
        const now = (typeof performance !== 'undefined' && performance.now)
          ? performance.now()
          : Date.now();
        const spent = now - startExecTime;
        return Math.max(0, 50 - spent);
      }
    };

    try {
      const res = callback(deadline);
      if (res && typeof res.catch === 'function') {
        res.catch((err) => {
          console.error('Error executing idle task (fallback async):', err);
        });
      }
    } catch (err) {
      console.error('Error executing idle task (fallback):', err);
    }
  }, timerDelay);

  activeTaskRegistry.set(taskId, {
    type: 'fallback',
    handle: timerHandle,
    cancelFn: clearTimeout,
    onCancel: onCancelCallback
  });

  return taskId;
}

/**
 * Safely cancels a scheduled idle task by its task ID or raw handle.
 *
 * @param {number|any} id - The task ID returned by scheduleIdleTask or native handle
 * @param {any} [reason] - Optional reason passed to registered onCancel callbacks
 */
export function cancelIdleTask(id, reason) {
  if (!id) return;

  if (activeTaskRegistry.has(id)) {
    const task = activeTaskRegistry.get(id);
    activeTaskRegistry.delete(id);
    try {
      if (task.type === 'native' && typeof task.cancelFn === 'function') {
        task.cancelFn(task.handle);
      } else if (task.type === 'fallback') {
        clearTimeout(task.handle);
      }
    } catch (err) {
      console.warn('Failed to cancel idle task from registry:', err);
    }

    if (typeof task.onCancel === 'function') {
      try {
        task.onCancel(reason || new Error('Idle task cancelled'));
      } catch (_) {}
    }
    return;
  }

  // Fallback for callers passing raw handles directly
  const { cIC } = getNativeIdleFns();
  if (cIC) {
    try {
      cIC(id);
    } catch (_) {}
  }
  try {
    clearTimeout(id);
  } catch (_) {}
}

/**
 * Promise helper that executes an async function during idle time and resolves with its result.
 *
 * @param {Function} asyncFn - Async function to run during idle frame. Receives (deadline).
 * @param {number|Object} [timeoutOrOptions=2000] - Maximum milliseconds or options object { timeout }
 * @returns {Promise<any>} Resolves with the return value of asyncFn, or rejects on error/cancellation
 */
export function runWhenIdle(asyncFn, timeoutOrOptions = 2000) {
  if (typeof asyncFn !== 'function') {
    return Promise.reject(new TypeError('runWhenIdle: asyncFn must be a function'));
  }

  let timeout = 2000;
  if (typeof timeoutOrOptions === 'number') {
    timeout = Math.max(0, timeoutOrOptions);
  } else if (typeof timeoutOrOptions === 'object' && timeoutOrOptions !== null) {
    if (timeoutOrOptions.timeout !== undefined) {
      const parsed = Number(timeoutOrOptions.timeout);
      timeout = !isNaN(parsed) ? Math.max(0, parsed) : 2000;
    }
  }

  let taskId = null;
  let rejectPromise = null;
  let isSettled = false;

  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;
    taskId = scheduleIdleTask(async (deadline) => {
      try {
        const result = await asyncFn(deadline);
        isSettled = true;
        resolve(result);
      } catch (err) {
        isSettled = true;
        reject(err);
      }
    }, {
      timeout,
      onCancel: (err) => {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      }
    });
  });

  promise.cancel = (reason = new Error('Idle task cancelled')) => {
    if (!isSettled && taskId !== null) {
      isSettled = true;
      cancelIdleTask(taskId, reason);
      if (rejectPromise) {
        rejectPromise(reason);
      }
    }
  };
  promise.taskId = taskId;

  return promise;
}

/**
 * Returns the count of currently queued/in-flight idle tasks.
 * Useful for diagnostics, health checks, and test assertions.
 *
 * @returns {number}
 */
export function getActiveIdleTaskCount() {
  return activeTaskRegistry.size;
}

/**
 * Cancels and purges all currently active idle tasks.
 */
export function clearAllIdleTasks() {
  const taskIds = Array.from(activeTaskRegistry.keys());
  for (const id of taskIds) {
    cancelIdleTask(id);
  }
  activeTaskRegistry.clear();
}
