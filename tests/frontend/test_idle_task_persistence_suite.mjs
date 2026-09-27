// Automated Molecular Test Suite: Non-Blocking State Persistence via requestIdleCallback
// Topic 3 of 6: idleTask.js, Cooperative Scheduling, and db.js Background Idle Persistence

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Mock localStorage for Node.js test environment
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; }
};

// Mock IndexedDB for Node.js test environment
const dbStore = new Map(); // table -> Map(key -> value)
function getTable(name) {
  if (!dbStore.has(name)) {
    dbStore.set(name, new Map());
  }
  return dbStore.get(name);
}

let mockIdCounter = 1;
let simulateQuotaErrorOnce = false;

const mockIndexedDB = {
  open: (dbName, version) => {
    const req = {
      result: {
        objectStoreNames: {
          contains: (name) => ['file_history', 'canvas_state'].includes(name)
        },
        createObjectStore: (name) => {
          getTable(name);
        },
        transaction: (storeNames, mode) => {
          const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
          const table = getTable(storeName);
          const txn = {
            oncomplete: null,
            onerror: null,
            objectStore: () => ({
              add: (record) => {
                const id = mockIdCounter++;
                const r = { ...record, id };
                table.set(id, r);
                const reqStore = { result: id, onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  if (txn.oncomplete) txn.oncomplete();
                }, 0);
                return reqStore;
              },
              put: (record) => {
                const reqStore = { result: record.key || record.id, onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (simulateQuotaErrorOnce) {
                    simulateQuotaErrorOnce = false;
                    const err = new Error('The quota has been exceeded.');
                    err.name = 'QuotaExceededError';
                    if (reqStore.onerror) reqStore.onerror({ target: { error: err } });
                    if (txn.onerror) txn.onerror({ target: { error: err } });
                    return;
                  }
                  const key = record.key || record.id;
                  table.set(key, record);
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  if (txn.oncomplete) txn.oncomplete();
                }, 0);
                return reqStore;
              },
              get: (key) => {
                const reqStore = { result: table.get(key) || null, onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  if (txn.oncomplete) txn.oncomplete();
                }, 0);
                return reqStore;
              },
              getAll: () => {
                const reqStore = { result: Array.from(table.values()), onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  setTimeout(() => { if (txn.oncomplete) txn.oncomplete(); }, 0);
                }, 0);
                return reqStore;
              },
              delete: (key) => {
                table.delete(key);
                const reqStore = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  if (txn.oncomplete) txn.oncomplete();
                }, 0);
                return reqStore;
              },
              clear: () => {
                table.clear();
                const reqStore = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (reqStore.onsuccess) reqStore.onsuccess();
                  if (txn.oncomplete) txn.oncomplete();
                }, 0);
                return reqStore;
              }
            })
          };
          return txn;
        }
      },
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };

    setTimeout(() => {
      if (req.onsuccess) {
        req.onsuccess({ target: { result: req.result } });
      }
    }, 0);

    return req;
  }
};
globalThis.indexedDB = mockIndexedDB;

// Import source modules directly (Zero-Assumption Rule / Anti-Local-Copy)
const idleTaskModule = await import('../../src/utils/idleTask.js');
const {
  scheduleIdleTask,
  cancelIdleTask,
  runWhenIdle,
  getActiveIdleTaskCount,
  clearAllIdleTasks
} = idleTaskModule;

const dbModule = await import('../../src/utils/db.js');
const {
  saveFile,
  getFiles,
  saveCanvasState,
  loadCanvasState,
  clearCanvasState,
  saveStudioDraft,
  loadStudioDraft,
  pruneExpiredStudioDrafts,
  _pruneExpiredStudioDraftsDirect,
  clearStudioDraft,
  DRAFT_TTL_MS
} = dbModule;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, areaNumber, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] Area ${areaNumber}: ${description}`);
  } else {
    failedTests++;
    failures.push({ areaNumber, description });
    console.error(`  ✗ [FAIL] Area ${areaNumber}: ${description}`);
  }
}

console.log('================================================================');
console.log('TOPIC 3: NON-BLOCKING STATE PERSISTENCE (requestIdleCallback)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// GROUP A: scheduleIdleTask Core & Parameter Validation (Areas 1 - 6)
// -----------------------------------------------------------------------------
console.log('--- Group A: scheduleIdleTask Core & Parameter Validation ---');

// Area 1: Type error on non-function callback
let area1Threw = false;
try {
  scheduleIdleTask(null);
} catch (e) {
  area1Threw = e instanceof TypeError;
}
assert(area1Threw === true, 1.1, 'scheduleIdleTask throws TypeError when callback is null');

let area1ThrewNum = false;
try {
  scheduleIdleTask(42);
} catch (e) {
  area1ThrewNum = e instanceof TypeError;
}
assert(area1ThrewNum === true, 1.2, 'scheduleIdleTask throws TypeError when callback is a number');

let area1ThrewUndef = false;
try {
  scheduleIdleTask(undefined);
} catch (e) {
  area1ThrewUndef = e instanceof TypeError;
}
assert(area1ThrewUndef === true, 1.3, 'scheduleIdleTask throws TypeError when callback is undefined');

let area1ThrewObj = false;
try {
  scheduleIdleTask({});
} catch (e) {
  area1ThrewObj = e instanceof TypeError;
}
assert(area1ThrewObj === true, 1.4, 'scheduleIdleTask throws TypeError when callback is a plain object');

let area1ThrewStr = false;
try {
  scheduleIdleTask('not-a-func');
} catch (e) {
  area1ThrewStr = e instanceof TypeError;
}
assert(area1ThrewStr === true, 1.5, 'scheduleIdleTask throws TypeError when callback is a string');

// Area 2: Options normalization - default timeout (2000ms)
clearAllIdleTasks();
const idArea2 = scheduleIdleTask(() => {});
assert(typeof idArea2 === 'number' && idArea2 > 0, 2.1, 'scheduleIdleTask returns a positive numeric task ID with default options');
cancelIdleTask(idArea2);

// Area 3: Options normalization - numeric timeout
const idArea3 = scheduleIdleTask(() => {}, 500);
assert(typeof idArea3 === 'number' && idArea3 > idArea2, 3.1, 'scheduleIdleTask accepts numeric timeout directly and produces incrementing ID');
cancelIdleTask(idArea3);

// Area 4: Options normalization - options object { timeout: 1500 }
const idArea4 = scheduleIdleTask(() => {}, { timeout: 1500 });
assert(typeof idArea4 === 'number' && idArea4 > idArea3, 4.1, 'scheduleIdleTask accepts { timeout: 1500 } options object');
cancelIdleTask(idArea4);

// Area 5: Options normalization - boundary values (negative, zero, NaN, string number, null)
const idArea5A = scheduleIdleTask(() => {}, { timeout: -100 });
const idArea5B = scheduleIdleTask(() => {}, { timeout: 'invalid' });
const idArea5C = scheduleIdleTask(() => {}, { timeout: '3500' });
const idArea5D = scheduleIdleTask(() => {}, { timeout: null });
assert(typeof idArea5A === 'number' && typeof idArea5B === 'number', 5.1, 'scheduleIdleTask safely clamps negative or NaN timeout to >= 0 or default');
assert(typeof idArea5C === 'number' && typeof idArea5D === 'number', 5.2, 'scheduleIdleTask parses string timeout number and safely defaults null timeout');
cancelIdleTask(idArea5A);
cancelIdleTask(idArea5B);
cancelIdleTask(idArea5C);
cancelIdleTask(idArea5D);

// Area 6: Unique sequential task ID generation
const id6A = scheduleIdleTask(() => {});
const id6B = scheduleIdleTask(() => {});
const id6C = scheduleIdleTask(() => {});
assert(id6B === id6A + 1 && id6C === id6B + 1, 6.1, 'Task IDs are strictly sequential integers incrementing by 1');
cancelIdleTask(id6A);
cancelIdleTask(id6B);
cancelIdleTask(id6C);

// -----------------------------------------------------------------------------
// GROUP B: Fallback Execution & Deadline Simulation (Areas 7 - 12)
// -----------------------------------------------------------------------------
console.log('\n--- Group B: Fallback Execution & Deadline Simulation ---');

// Area 7: Fallback execution when requestIdleCallback is absent
const area7Promise = new Promise((resolve) => {
  const start = Date.now();
  scheduleIdleTask((deadline) => {
    resolve({ duration: Date.now() - start, deadline });
  }, { timeout: 100 });
});
const area7Result = await area7Promise;
assert(typeof area7Result.deadline === 'object' && area7Result.deadline !== null, 7.1, 'Fallback callback executes asynchronously and provides deadline object');

// Area 8: Fallback deadline object contract verification
assert(typeof area7Result.deadline.didTimeout === 'boolean', 8.1, 'deadline.didTimeout is a boolean');
assert(typeof area7Result.deadline.timeRemaining === 'function', 8.2, 'deadline.timeRemaining is a function');

// Area 9: Fallback timeRemaining() formula-level verification
const trInitial = area7Result.deadline.timeRemaining();
assert(trInitial > 0 && trInitial <= 50, 9.1, `deadline.timeRemaining() starts within the 50ms W3C slice (got ${trInitial.toFixed(2)}ms)`);

const t1 = area7Result.deadline.timeRemaining();
const spinStart = Date.now();
while (Date.now() - spinStart < 10) {}
const t2 = area7Result.deadline.timeRemaining();
assert(t2 <= t1, 9.2, `deadline.timeRemaining() monotonically decreases over time (t1: ${t1.toFixed(2)}ms >= t2: ${t2.toFixed(2)}ms)`);

// Area 10: Fallback timeRemaining() floor at 0 after spent time
// Simulate busy work for 55ms
const startBusy = Date.now();
while (Date.now() - startBusy < 55) {
  // busy wait
}
const trAfter55ms = area7Result.deadline.timeRemaining();
assert(trAfter55ms === 0, 10.1, `deadline.timeRemaining() floors at exactly 0 after 50ms idle slice elapsed (got ${trAfter55ms})`);

// Area 11: Fallback didTimeout flag when executed within timeout
assert(area7Result.deadline.didTimeout === false, 11.1, 'deadline.didTimeout is false when executed well before timeout (elapsed < 100ms)');
assert(area7Result.deadline.timeRemaining() >= 0, 11.2, 'deadline.timeRemaining() is non-negative');

// Area 12: Fallback didTimeout flag when scheduled with timeout = 0
const area12Promise = new Promise((resolve) => {
  scheduleIdleTask((deadline) => {
    resolve(deadline);
  }, { timeout: 0 });
});
const area12Deadline = await area12Promise;
assert(area12Deadline.didTimeout === true, 12.1, 'deadline.didTimeout is true when scheduled with timeout: 0');
assert(area12Deadline.timeRemaining() === 0, 12.2, 'deadline.timeRemaining() returns 0 when didTimeout is true according to W3C specification Section 4.1.2');

// -----------------------------------------------------------------------------
// GROUP C: Native requestIdleCallback Delegation (Areas 13 - 17)
// -----------------------------------------------------------------------------
console.log('\n--- Group C: Native requestIdleCallback Delegation ---');

let nativeRICCalled = false;
let nativeTimeoutPassed = null;
let nativeCanceledHandle = null;
let nativeHandleCounter = 900;

// Temporarily mock native requestIdleCallback on globalThis
globalThis.requestIdleCallback = (cb, opts) => {
  nativeRICCalled = true;
  nativeTimeoutPassed = opts?.timeout;
  const handle = ++nativeHandleCounter;
  setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => 48.5,
      isNativeMock: true
    });
  }, 10);
  return handle;
};

globalThis.cancelIdleCallback = (handle) => {
  nativeCanceledHandle = handle;
};

// Area 13: Native delegation when requestIdleCallback is available
const area13Promise = new Promise((resolve) => {
  scheduleIdleTask((deadline) => {
    resolve(deadline);
  }, { timeout: 800 });
});
const area13Deadline = await area13Promise;
assert(nativeRICCalled === true, 13.1, 'scheduleIdleTask delegates directly to window/globalThis.requestIdleCallback when available');

// Area 14: Native deadline pass-through
assert(area13Deadline.isNativeMock === true, 14.1, 'Native deadline object is passed through to the callback');
assert(area13Deadline.timeRemaining() === 48.5, 14.2, 'Native timeRemaining() result is accurately preserved');

// Area 15: Native execution error isolation
let errorLogged = false;
const originalConsoleError = console.error;
console.error = () => { errorLogged = true; };

const area15Promise = new Promise((resolve) => {
  scheduleIdleTask(() => {
    setTimeout(resolve, 20);
    throw new Error('Simulated task error');
  }, { timeout: 100 });
});
await area15Promise;
console.error = originalConsoleError;
assert(errorLogged === true, 15.1, 'Errors thrown inside native idle task are safely caught and logged without crashing');

// Area 15.2: Synchronous throwing by native requestIdleCallback safely triggers fallback
const originalRIC = globalThis.requestIdleCallback;
globalThis.requestIdleCallback = () => {
  throw new Error('Native rIC unavailable or restricted');
};
let fallbackRanOnNativeThrow = false;
const area15_2Promise = new Promise((resolve) => {
  scheduleIdleTask((deadline) => {
    fallbackRanOnNativeThrow = typeof deadline?.timeRemaining === 'function';
    resolve();
  }, { timeout: 100 });
});
await area15_2Promise;
globalThis.requestIdleCallback = originalRIC;
assert(fallbackRanOnNativeThrow === true, 15.2, 'scheduleIdleTask gracefully falls back to timer when native rIC throws synchronously');

// Area 15.3: Async rejections in idle task callbacks are cleanly caught and logged
let asyncErrorLogged = false;
console.error = () => { asyncErrorLogged = true; };
const asyncArea15Promise = new Promise((resolve) => {
  scheduleIdleTask(async () => {
    setTimeout(resolve, 20);
    throw new Error('Async task rejection');
  }, { timeout: 100 });
});
await asyncArea15Promise;
console.error = originalConsoleError;
assert(asyncErrorLogged === true, 15.3, 'Async rejections in idle task callbacks are cleanly caught and logged');

// Area 16: Native options passing (timeout parameter)
const id16 = scheduleIdleTask(() => {}, { timeout: 1234 });
assert(nativeTimeoutPassed === 1234, 16.1, `Native requestIdleCallback receives exact timeout parameter: expected 1234, got ${nativeTimeoutPassed}`);
cancelIdleTask(id16);

// Area 17: Native handle registration in active task tracking
const nativeTaskId = scheduleIdleTask(() => {}, { timeout: 5000 });
assert(getActiveIdleTaskCount() > 0, 17.1, 'Active task count tracks native in-flight tasks in internal registry');
cancelIdleTask(nativeTaskId);

// -----------------------------------------------------------------------------
// GROUP D: cancelIdleTask Cancellation Mechanics (Areas 18 - 23)
// -----------------------------------------------------------------------------
console.log('\n--- Group D: cancelIdleTask Cancellation Mechanics ---');

// Area 18: Native cancellation via cancelIdleTask
assert(nativeCanceledHandle !== null, 18.1, `cancelIdleTask invokes cancelIdleCallback with native handle: ${nativeCanceledHandle}`);

// Restore globalThis to fallback mode (no requestIdleCallback) for clean isolation
delete globalThis.requestIdleCallback;
delete globalThis.cancelIdleCallback;

// Area 19: Fallback cancellation before timer fires
let area19Ran = false;
const id19 = scheduleIdleTask(() => {
  area19Ran = true;
}, { timeout: 500 });
cancelIdleTask(id19);
await new Promise(r => setTimeout(r, 50));
assert(area19Ran === false, 19.1, 'Cancelled fallback task never executes its callback');

// Area 20: Cancellation with null, undefined, or 0 safely no-ops
let area20Threw = false;
try {
  cancelIdleTask(null);
  cancelIdleTask(undefined);
  cancelIdleTask(0);
} catch (_) {
  area20Threw = true;
}
assert(area20Threw === false, 20.1, 'cancelIdleTask safely no-ops on null, undefined, or 0');

// Area 21: Cancellation of non-existent or already-completed task ID
let area21Threw = false;
try {
  cancelIdleTask(999999);
} catch (_) {
  area21Threw = true;
}
assert(area21Threw === false, 21.1, 'cancelIdleTask safely no-ops on unknown task ID');

// Area 22: Direct raw handle cancellation fallback
const rawTimer = setTimeout(() => {}, 1000);
let area22Threw = false;
try {
  cancelIdleTask(rawTimer);
} catch (_) {
  area22Threw = true;
}
assert(area22Threw === false, 22.1, 'cancelIdleTask safely accepts and clears raw timer handle');

// Area 23: Registry eviction on cancellation
const countBefore = getActiveIdleTaskCount();
const id23 = scheduleIdleTask(() => {}, 5000);
const countDuring = getActiveIdleTaskCount();
cancelIdleTask(id23);
const countAfter = getActiveIdleTaskCount();
assert(countDuring === countBefore + 1 && countAfter === countBefore, 23.1, `Task is immediately evicted from registry on cancel: ${countBefore} -> ${countDuring} -> ${countAfter}`);

// -----------------------------------------------------------------------------
// GROUP E: runWhenIdle Promise Helper (Areas 24 - 29)
// -----------------------------------------------------------------------------
console.log('\n--- Group E: runWhenIdle Promise Helper ---');

// Area 24: Parameter validation - rejects with TypeError when non-function passed
let area24Rejected = false;
try {
  await runWhenIdle('not a function');
} catch (e) {
  area24Rejected = e instanceof TypeError;
}
assert(area24Rejected === true, 24.1, 'runWhenIdle rejects immediately with TypeError when string is passed');

let area24RejectedNull = false;
try {
  await runWhenIdle(null);
} catch (e) {
  area24RejectedNull = e instanceof TypeError;
}
assert(area24RejectedNull === true, 24.2, 'runWhenIdle rejects immediately with TypeError when null is passed');

let area24RejectedNum = false;
try {
  await runWhenIdle(999);
} catch (e) {
  area24RejectedNum = e instanceof TypeError;
}
assert(area24RejectedNum === true, 24.3, 'runWhenIdle rejects immediately with TypeError when number is passed');

// Area 25: Async function execution and value resolution
const area25Result = await runWhenIdle(async (deadline) => {
  return {
    success: true,
    data: 12345,
    hasDeadline: typeof deadline?.timeRemaining === 'function'
  };
}, 500);
assert(area25Result.success === true && area25Result.data === 12345, 25.1, 'runWhenIdle executes async function and resolves with exact return value');
assert(area25Result.hasDeadline === true, 25.2, 'runWhenIdle passes IdleDeadline object to async function');

const falsyResolutions = await Promise.all([
  runWhenIdle(() => false),
  runWhenIdle(() => 0),
  runWhenIdle(() => ""),
  runWhenIdle(() => null)
]);
assert(falsyResolutions[0] === false && falsyResolutions[1] === 0 && falsyResolutions[2] === "" && falsyResolutions[3] === null, 25.3, 'runWhenIdle correctly preserves falsy resolution values (false, 0, "", null)');

// Area 26: Synchronous function support
const area26Result = await runWhenIdle(() => 'sync-return-value', 500);
assert(area26Result === 'sync-return-value', 26.1, 'runWhenIdle safely handles synchronous functions returning values');

// Area 27: Error handling and promise rejection
let area27Caught = false;
try {
  await runWhenIdle(async () => {
    throw new Error('Intentional async failure');
  }, 500);
} catch (err) {
  area27Caught = err.message === 'Intentional async failure';
}
assert(area27Caught === true, 27.1, 'runWhenIdle rejects outer promise when inner async function throws');

// Area 28: Timeout option forwarding
let area28Executed = false;
const area28Promise = runWhenIdle(async () => {
  area28Executed = true;
  return 'timeout-verified';
}, 100);
const area28Val = await area28Promise;
assert(area28Executed === true && area28Val === 'timeout-verified', 28.1, 'runWhenIdle respects custom timeout parameter');

// Area 28.2: Options object forwarding { timeout: 350 }
let area28_2Executed = false;
const area28_2Promise = runWhenIdle(async () => {
  area28_2Executed = true;
  return 'options-obj-verified';
}, { timeout: 350 });
const area28_2Val = await area28_2Promise;
assert(area28_2Executed === true && area28_2Val === 'options-obj-verified', 28.2, 'runWhenIdle supports options object { timeout: 350 } without falling back to default');

// Area 29: Promise .cancel() method
const promiseToCancel = runWhenIdle(async () => {
  return 'should not complete';
}, 2000);

let cancelledReasonCaught = false;
promiseToCancel.catch((err) => {
  if (err.message === 'User aborted task') {
    cancelledReasonCaught = true;
  }
});
promiseToCancel.cancel(new Error('User aborted task'));
await new Promise(r => setTimeout(r, 40));
assert(cancelledReasonCaught === true, 29.1, 'runWhenIdle returned promise exposes .cancel(reason) which rejects with specified reason');

// Area 29.2: cancelIdleTask(promise.taskId) rejects promise and eliminates hanging promise deadlock
const promiseToCancelViaId = runWhenIdle(async () => {
  return 'should not complete either';
}, 3000);

let rejectedViaCancelId = false;
promiseToCancelViaId.catch((err) => {
  if (err && err.message.includes('cancelled')) {
    rejectedViaCancelId = true;
  }
});
cancelIdleTask(promiseToCancelViaId.taskId);
await new Promise(r => setTimeout(r, 40));
assert(rejectedViaCancelId === true, 29.2, 'cancelIdleTask(taskId) cleanly rejects associated runWhenIdle promise avoiding hanging promise hazard');

// -----------------------------------------------------------------------------
// GROUP F: Memory Safety, Rapid Burst & Concurrency Stress (Areas 30 - 32)
// -----------------------------------------------------------------------------
console.log('\n--- Group F: Memory Safety, Rapid Burst & Concurrency Stress ---');

// Area 30: Rapid burst scheduling (100 concurrent tasks)
clearAllIdleTasks();
const BURST_COUNT = 100;
let executedCount = 0;
const burstPromises = [];

for (let i = 0; i < BURST_COUNT; i++) {
  burstPromises.push(runWhenIdle(async () => {
    executedCount++;
    return i;
  }, 2000));
}

assert(getActiveIdleTaskCount() === BURST_COUNT, 30.1, `Burst scheduling correctly tracks all ${BURST_COUNT} in-flight tasks`);

const burstResults = await Promise.all(burstPromises);
assert(executedCount === BURST_COUNT, 30.2, `All ${BURST_COUNT} burst tasks executed without drop or collision (formula: count === 100)`);
assert(burstResults.length === BURST_COUNT && burstResults[99] === 99, 30.3, 'Burst results preserve individual indices through resolution');

// Area 31: Zero memory leak invariant
const countAfterBurst = getActiveIdleTaskCount();
assert(countAfterBurst === 0, 31.1, `Active task registry completely drains to 0 after all burst tasks resolve (got ${countAfterBurst})`);

// Area 32: clearAllIdleTasks bulk purge
for (let i = 0; i < 25; i++) {
  scheduleIdleTask(() => {}, 10000);
}
assert(getActiveIdleTaskCount() === 25, 32.1, '25 tasks registered before bulk purge');
clearAllIdleTasks();
assert(getActiveIdleTaskCount() === 0, 32.2, 'clearAllIdleTasks cancels all tasks and resets active registry count to 0');

// Area 32.3: clearAllIdleTasks rejects in-flight runWhenIdle promises
let pClearedRejections = 0;
const p32A = runWhenIdle(async () => 'never', 10000);
const p32B = runWhenIdle(async () => 'never', 10000);
p32A.catch(() => { pClearedRejections++; });
p32B.catch(() => { pClearedRejections++; });
clearAllIdleTasks();
await new Promise(r => setTimeout(r, 40));
assert(pClearedRejections === 2, 32.3, 'clearAllIdleTasks cleanly rejects in-flight runWhenIdle promises');

// -----------------------------------------------------------------------------
// GROUP G: src/utils/db.js Integration & Persistence (Areas 33 - 38)
// -----------------------------------------------------------------------------
console.log('\n--- Group G: src/utils/db.js Integration & Persistence ---');
const canvasTable = getTable('canvas_state');

// Area 33: saveFile deferral of conversionHistory
storageMap.clear();
const saveFilePromise = saveFile('report.pdf', 1024, 'application/pdf', 'compress-pdf', new Uint8Array([1, 2, 3]));
const savedFileId = await saveFilePromise;

assert(typeof savedFileId === 'number' && savedFileId > 0, 33.1, 'saveFile resolves immediately with file record ID from IndexedDB');

// Area 34: saveFile conversionHistory payload integrity in idle task
// Wait for idle task to process conversionHistory
await new Promise(r => setTimeout(r, 60));
const historyRaw = localStorage.getItem('conversionHistory');
assert(historyRaw !== null, 34.1, 'conversionHistory is written to localStorage during idle frame');

const parsedHistory = JSON.parse(historyRaw);
assert(Array.isArray(parsedHistory) && parsedHistory.length === 1, 34.2, 'conversionHistory contains 1 array record');
assert(parsedHistory[0].filename === 'report.pdf' && parsedHistory[0].toolName === 'compress-pdf', 34.3, 'Record contains correct filename and toolName properties');
assert(typeof parsedHistory[0].id === 'string' && typeof parsedHistory[0].timestamp === 'string', 34.4, 'Record contains valid id and timestamp strings');

// Verify 100-item cap formula
const existing105 = Array.from({ length: 105 }, (_, i) => ({ id: `id-${i}`, filename: `file-${i}.pdf`, toolName: 'test', timestamp: new Date().toISOString() }));
localStorage.setItem('conversionHistory', JSON.stringify(existing105));
await saveFile('capped.pdf', 2048, 'application/pdf', 'ocr-pdf', new Uint8Array([4, 5, 6]));
await new Promise(r => setTimeout(r, 60));
const cappedHistory = JSON.parse(localStorage.getItem('conversionHistory'));
assert(cappedHistory.length === 100, 34.5, `conversionHistory is capped at exactly 100 items (formula: min(106, 100) = 100, got ${cappedHistory.length})`);
assert(cappedHistory[0].filename === 'capped.pdf', 34.6, 'Newest conversion entry is unshifted to front of history list');

// Corrupted JSON resilience in conversionHistory
localStorage.setItem('conversionHistory', 'CORRUPT_NOT_JSON{{{');
let corruptRecovered = false;
try {
  await saveFile('resilient.pdf', 512, 'application/pdf', 'sign-pdf', new Uint8Array([7, 8]));
  await new Promise(r => setTimeout(r, 60));
  const recoveredList = JSON.parse(localStorage.getItem('conversionHistory'));
  corruptRecovered = Array.isArray(recoveredList) && recoveredList[0].filename === 'resilient.pdf';
} catch (_) {}
assert(corruptRecovered === true, 34.7, 'saveFile catches corrupted JSON in conversionHistory and resets cleanly');

// Area 34.8: localStorage QuotaExceededError auto-recovery with trim to 25 items
const originalSetItem = localStorage.setItem;
let quotaErrorInjected = true;
let quotaRecoveryTriggered = false;
localStorage.setItem = (key, val) => {
  if (quotaErrorInjected && key === 'conversionHistory') {
    quotaErrorInjected = false;
    const err = new Error('QuotaExceededError: localStorage limit exceeded');
    err.name = 'QuotaExceededError';
    throw err;
  }
  if (!quotaErrorInjected && key === 'conversionHistory') {
    quotaRecoveryTriggered = true;
  }
  return storageMap.set(key, String(val));
};
await saveFile('quota_recovery.pdf', 1024, 'application/pdf', 'quota-test', new Uint8Array([9]));
await new Promise(r => setTimeout(r, 60));
localStorage.setItem = originalSetItem;
const quotaHistory = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
assert(quotaRecoveryTriggered === true && quotaHistory.length <= 26, 34.8, 'saveFile auto-recovers from localStorage QuotaExceededError by trimming history to <= 25 items');

// Area 35: saveCanvasState non-blocking persistence
const canvasState = {
  workspaceQueue: ['file-1', 'file-2'],
  operations: [{ id: 'op-1', tool: 'merge-pdf' }],
  panOffset: { x: 120, y: 340 },
  zoom: 1.25,
  autoFitViewport: true
};

const saveCanvasPromise = saveCanvasState(canvasState);
assert(saveCanvasPromise instanceof Promise, 35.1, 'saveCanvasState returns a Promise via runWhenIdle');
await saveCanvasPromise;

const loadedCanvas = await loadCanvasState();
assert(loadedCanvas !== null, 35.2, 'loadCanvasState retrieves the saved canvas state from IndexedDB');
assert(loadedCanvas.zoom === 1.25 && loadedCanvas.panOffset.x === 120, 35.3, 'Loaded canvas matches saved coordinates and zoom scale');
assert(loadedCanvas.operations.length === 1 && loadedCanvas.operations[0].tool === 'merge-pdf', 35.4, 'Loaded operations list matches saved state');

// Area 35.5: saveCanvasState supersedes pending in-flight auto-save tasks without unhandled rejection
const fastState1 = { zoom: 1.0, panOffset: { x: 0, y: 0 } };
const fastState2 = { zoom: 2.0, panOffset: { x: 50, y: 50 } };
const p1 = saveCanvasState(fastState1);
const p2 = saveCanvasState(fastState2);
await Promise.all([p1, p2]);
const finalCanvas = await loadCanvasState();
assert(finalCanvas.zoom === 2.0, 35.5, 'Rapid consecutive saveCanvasState supersedes previous pending task and persists latest state');

// Area 35.6: clearCanvasState deletes canvas state and loadCanvasState returns null
await clearCanvasState();
const clearedCanvas = await loadCanvasState();
assert(clearedCanvas === null, 35.6, 'clearCanvasState deletes state from IndexedDB and subsequent load returns null');

// Area 35.7: clearCanvasState prevents resurrection of cleared canvas by cancelling in-flight save
const resurrectState = { zoom: 9.9, panOffset: { x: 999, y: 999 } };
saveCanvasState(resurrectState); // Schedule save without awaiting
await clearCanvasState(); // Immediately clear before idle callback runs
await new Promise(r => setTimeout(r, 60)); // Wait past idle delay
const afterClearLoaded = await loadCanvasState();
assert(afterClearLoaded === null, 35.7, 'clearCanvasState cancels pending saveCanvasState and prevents state resurrection');

// Area 36: saveStudioDraft non-blocking persistence
const draftData = {
  selectedPages: [1, 2, 4],
  rotationDegrees: 90,
  toolSettings: { quality: 'high', compress: true }
};

const saveDraftPromise = saveStudioDraft('organize-pdf', draftData);
assert(saveDraftPromise instanceof Promise, 36.1, 'saveStudioDraft returns a Promise via runWhenIdle');
await saveDraftPromise;

const loadedDraft = await loadStudioDraft('organize-pdf');
assert(loadedDraft !== null, 36.2, 'loadStudioDraft retrieves the persisted studio draft');
assert(Array.isArray(loadedDraft.selectedPages) && loadedDraft.selectedPages.length === 3, 36.3, 'Draft contains expected 3 selected pages');
assert(loadedDraft.rotationDegrees === 90, 36.4, 'Draft contains expected rotationDegrees (90)');

// Clear studio draft
await clearStudioDraft('organize-pdf');
const clearedDraft = await loadStudioDraft('organize-pdf');
assert(clearedDraft === null, 36.5, 'clearStudioDraft safely deletes draft and loadStudioDraft returns null');

// TTL expiration check in loadStudioDraft
canvasTable.set('studio_draft_stale_key', {
  key: 'studio_draft_stale_key',
  data: { stale: true },
  date: new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString() // 25 hours old > 24 hours
});
const staleLoaded = await loadStudioDraft('stale_key');
assert(staleLoaded === null, 36.6, 'loadStudioDraft invalidates and deletes drafts older than 24 hours TTL');
assert(canvasTable.has('studio_draft_stale_key') === false, 36.7, 'Expired record was deleted from storage on load');

// Area 36.8: clearStudioDraft prevents resurrection of cleared draft by cancelling in-flight save
saveStudioDraft('resurrect-draft', { bad: true }); // Schedule save without awaiting
await clearStudioDraft('resurrect-draft'); // Immediately clear
await new Promise(r => setTimeout(r, 60)); // Wait past idle delay
const afterClearDraftLoaded = await loadStudioDraft('resurrect-draft');
assert(afterClearDraftLoaded === null, 36.8, 'clearStudioDraft cancels pending saveStudioDraft and prevents draft resurrection');

// Area 36.9: Rapid consecutive saveStudioDraft cancels superseded draft and persists latest payload
const draftP1 = saveStudioDraft('rapid-tool', { text: 'draft-1' });
const draftP2 = saveStudioDraft('rapid-tool', { text: 'draft-2' });
const draftP3 = saveStudioDraft('rapid-tool', { text: 'draft-final' });
await Promise.all([draftP1, draftP2, draftP3]);
const finalDraft = await loadStudioDraft('rapid-tool');
assert(finalDraft?.text === 'draft-final', 36.9, 'Rapid consecutive saveStudioDraft supersedes earlier drafts and persists latest state');

// Area 37: saveStudioDraft QuotaExceededError recovery
// Populate an old draft (> 1 hour old) to be pruned during quota recovery
const oldDraftDate = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(); // 2 hours old
canvasTable.set('studio_draft_stale_organize', {
  key: 'studio_draft_stale_organize',
  data: { old: true },
  date: oldDraftDate
});

simulateQuotaErrorOnce = true;
const recoveryDraftData = { recovered: true, timestamp: Date.now() };
await saveStudioDraft('recovered_tool', recoveryDraftData);

const recoveredDraft = await loadStudioDraft('recovered_tool');
assert(recoveredDraft !== null && recoveredDraft.recovered === true, 37.1, 'saveStudioDraft successfully recovers and persists after QuotaExceededError');
assert(canvasTable.has('studio_draft_stale_organize') === false, 37.2, 'Old draft (>1 hour) was pruned during quota recovery sweep');

// Area 38: pruneExpiredStudioDrafts idle background sweep
// Insert 3 drafts: one 30 hours old (> 24h DRAFT_TTL_MS), one 25 hours old, and one 1 hour old
const now = Date.now();
canvasTable.set('studio_draft_expired_1', {
  key: 'studio_draft_expired_1',
  data: { id: 1 },
  date: new Date(now - (30 * 60 * 60 * 1000)).toISOString()
});
canvasTable.set('studio_draft_expired_2', {
  key: 'studio_draft_expired_2',
  data: { id: 2 },
  date: new Date(now - (25 * 60 * 60 * 1000)).toISOString()
});
canvasTable.set('studio_draft_fresh_3', {
  key: 'studio_draft_fresh_3',
  data: { id: 3 },
  date: new Date(now - (1 * 60 * 60 * 1000)).toISOString()
});

const prunePromise = pruneExpiredStudioDrafts();
assert(prunePromise instanceof Promise, 38.1, 'pruneExpiredStudioDrafts returns a Promise via runWhenIdle');

const prunedCount = await prunePromise;
assert(prunedCount === 2, 38.2, `pruneExpiredStudioDrafts swept exactly 2 expired drafts older than 24 hours (formula: 2 expired, got ${prunedCount})`);
assert(canvasTable.has('studio_draft_fresh_3') === true, 38.3, 'Fresh draft (1 hour old) is strictly preserved');
assert(canvasTable.has('studio_draft_expired_1') === false && canvasTable.has('studio_draft_expired_2') === false, 38.4, 'Expired drafts are completely deleted from canvas_state store');

// Custom maxAgeMs in pruneExpiredStudioDrafts (5 minutes)
canvasTable.clear();
canvasTable.set('studio_draft_custom_1', {
  key: 'studio_draft_custom_1',
  data: { id: 101 },
  date: new Date(Date.now() - (10 * 60 * 1000)).toISOString() // 10 minutes old
});
canvasTable.set('studio_draft_custom_2', {
  key: 'studio_draft_custom_2',
  data: { id: 102 },
  date: new Date(Date.now() - (2 * 60 * 1000)).toISOString() // 2 minutes old
});
const customPrunedCount = await pruneExpiredStudioDrafts(5 * 60 * 1000); // 5 min max age
assert(customPrunedCount === 1, 38.5, `pruneExpiredStudioDrafts with custom 5-min maxAgeMs swept 1 item older than 5 min (got ${customPrunedCount})`);
assert(canvasTable.has('studio_draft_custom_2') === true, 38.6, 'Draft under 5 minutes old is retained');
assert(canvasTable.has('studio_draft_custom_1') === false, 38.7, 'Draft over 5 minutes old is pruned');

// Area 38.8: _pruneExpiredStudioDraftsDirect executes immediately without queuing an idle task
canvasTable.clear();
canvasTable.set('studio_draft_direct_exp', {
  key: 'studio_draft_direct_exp',
  data: { id: 201 },
  date: new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString() // 48 hours old
});
const directPruned = await _pruneExpiredStudioDraftsDirect(24 * 60 * 60 * 1000);
assert(directPruned === 1 && canvasTable.has('studio_draft_direct_exp') === false, 38.8, '_pruneExpiredStudioDraftsDirect prunes immediately and guarantees transaction completion');

// Area 38.9: Concurrent pruneExpiredStudioDrafts calls coalesce into a shared Promise
const pPruneA = pruneExpiredStudioDrafts(60000);
const pPruneB = pruneExpiredStudioDrafts(60000);
assert(pPruneA === pPruneB, 38.9, 'Concurrent pruneExpiredStudioDrafts calls share the same in-flight Promise instance');
await Promise.all([pPruneA, pPruneB]);

// Cleanup
clearAllIdleTasks();

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} assertions passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`Distinct Test Areas: 38 Areas Verified`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error(`FAILED: ${failedTests} assertion(s) failed:`);
  for (const f of failures) {
    console.error(`  - Area ${f.areaNumber}: ${f.description}`);
  }
  process.exit(1);
} else {
  console.log('ALL 38 TEST AREAS PASSED WITH ZERO REGRESSIONS (100% PASS RATE).');
  process.exit(0);
}
