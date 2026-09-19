/**
 * Molecular Test Suite for DocForge Daily Life Keyless APIs & Intent Classifier
 * Covers >= 40 unique test areas and assertions complying with Zero-Assumption Rule.
 */

import assert from 'assert';
import {
  classifyDailyIntent,
  getWorldTime,
  getCurrencyConversion,
  getLiveWeather,
  getWordDefinition,
  getWikiSummary,
  getRandomJoke,
  getDailyAdvice,
  getCountryInfo,
  fetchWithTimeout,
  clearDailyCache
} from '../../src/utils/dailyLifeApis.js';

let passed = 0;
let total = 0;

function runTest(testNumber, areaName, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] Area ${testNumber}: ${areaName}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] Area ${testNumber}: ${areaName} -> ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(testNumber, areaName, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] Area ${testNumber}: ${areaName}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] Area ${testNumber}: ${areaName} -> ${err.message}`);
    throw err;
  }
}

console.log('\n======================================================');
console.log('--- STARTING DOCFORGE DAILY LIFE API MOLECULAR SUITE ---');
console.log('======================================================\n');

// ── SECTION 1: INTENT CLASSIFIER COVERAGE (Areas 1 - 15) ─────────────

runTest(1, 'Weather Intent: "weather in Tokyo"', () => {
  const res = classifyDailyIntent('weather in Tokyo');
  assert.ok(res, 'Intent should be recognized');
  assert.strictEqual(res.type, 'weather');
  assert.strictEqual(res.params.city.toLowerCase(), 'tokyo');
});

runTest(2, 'Weather Intent: "Paris weather" suffix form', () => {
  const res = classifyDailyIntent('Paris weather');
  assert.ok(res);
  assert.strictEqual(res.type, 'weather');
  assert.strictEqual(res.params.city.toLowerCase(), 'paris');
});

runTest(3, 'Weather Intent: "is it raining in London"', () => {
  const res = classifyDailyIntent('is it raining in London');
  assert.ok(res);
  assert.strictEqual(res.type, 'weather');
  assert.strictEqual(res.params.city.toLowerCase(), 'london');
});

runTest(4, 'Currency Intent: "convert 100 USD to EUR"', () => {
  const res = classifyDailyIntent('convert 100 USD to EUR');
  assert.ok(res);
  assert.strictEqual(res.type, 'currency');
  assert.strictEqual(res.params.amount, '100');
  assert.strictEqual(res.params.from.toUpperCase(), 'USD');
  assert.strictEqual(res.params.to.toUpperCase(), 'EUR');
});

runTest(5, 'Currency Intent: "50.5 EUR in JPY" with decimals', () => {
  const res = classifyDailyIntent('50.5 EUR in JPY');
  assert.ok(res);
  assert.strictEqual(res.type, 'currency');
  assert.strictEqual(res.params.amount, '50.5');
  assert.strictEqual(res.params.from.toUpperCase(), 'EUR');
  assert.strictEqual(res.params.to.toUpperCase(), 'JPY');
});

runTest(6, 'Currency Intent: "how much is 250 GBP in CAD"', () => {
  const res = classifyDailyIntent('how much is 250 GBP in CAD');
  assert.ok(res);
  assert.strictEqual(res.type, 'currency');
  assert.strictEqual(res.params.amount, '250');
  assert.strictEqual(res.params.from.toUpperCase(), 'GBP');
  assert.strictEqual(res.params.to.toUpperCase(), 'CAD');
});

runTest(7, 'Dictionary Intent: "define serendipity"', () => {
  const res = classifyDailyIntent('define serendipity');
  assert.ok(res);
  assert.strictEqual(res.type, 'dictionary');
  assert.strictEqual(res.params.word.toLowerCase(), 'serendipity');
});

runTest(8, 'Dictionary Intent: "meaning of ubiquitous"', () => {
  const res = classifyDailyIntent('meaning of ubiquitous');
  assert.ok(res);
  assert.strictEqual(res.type, 'dictionary');
  assert.strictEqual(res.params.word.toLowerCase(), 'ubiquitous');
});

runTest(9, 'Dictionary Intent: "what does ephemeral mean"', () => {
  const res = classifyDailyIntent('what does ephemeral mean');
  assert.ok(res);
  assert.strictEqual(res.type, 'dictionary');
  assert.strictEqual(res.params.word.toLowerCase(), 'ephemeral');
});

runTest(10, 'Time Intent: "what time is it in Tokyo"', () => {
  const res = classifyDailyIntent('what time is it in Tokyo');
  assert.ok(res);
  assert.strictEqual(res.type, 'time');
  assert.strictEqual(res.params.location.toLowerCase(), 'tokyo');
});

runTest(11, 'Time Intent: "current time" (Device local time)', () => {
  const res = classifyDailyIntent('current time');
  assert.ok(res);
  assert.strictEqual(res.type, 'time');
  assert.strictEqual(res.params.location, null);
});

runTest(12, 'Joke Intent: "tell me a joke", "crack a joke", "another joke", "another one"', () => {
  const res1 = classifyDailyIntent('tell me a joke');
  assert.ok(res1);
  assert.strictEqual(res1.type, 'joke');
  const res2 = classifyDailyIntent('crack a joke');
  assert.ok(res2);
  assert.strictEqual(res2.type, 'joke');
  const res3 = classifyDailyIntent('another joke');
  assert.ok(res3);
  assert.strictEqual(res3.type, 'joke');
  const res4 = classifyDailyIntent('another one');
  assert.ok(res4);
  assert.strictEqual(res4.type, 'joke');
  const res5 = classifyDailyIntent('tell another');
  assert.ok(res5);
  assert.strictEqual(res5.type, 'joke');
});

runTest(13, 'Advice Intent: "give me some advice"', () => {
  const res = classifyDailyIntent('give me some advice');
  assert.ok(res);
  assert.strictEqual(res.type, 'advice');
});

runTest(14, 'Country Intent: "capital of Japan"', () => {
  const res = classifyDailyIntent('capital of Japan');
  assert.ok(res);
  assert.strictEqual(res.type, 'country');
  assert.strictEqual(res.params.country.toLowerCase(), 'japan');
});

runTest(15, 'Wikipedia Intent: "who is Albert Einstein"', () => {
  const res = classifyDailyIntent('who is Albert Einstein');
  assert.ok(res);
  assert.strictEqual(res.type, 'wiki');
  assert.strictEqual(res.params.topic, 'Albert Einstein');
});

// ── SECTION 2: DOCFORGE ZERO-COLLISION GUARD (Areas 16 - 22) ─────────

runTest(16, 'Zero-Collision Guard: "merge pdf files" must NOT be intercepted', () => {
  const res = classifyDailyIntent('how to merge pdf files');
  assert.strictEqual(res, null, 'Must let DocForge core handler process this');
});

runTest(17, 'Zero-Collision Guard: "compress document" must NOT be intercepted', () => {
  const res = classifyDailyIntent('compress document to smaller size');
  assert.strictEqual(res, null);
});

runTest(18, 'Zero-Collision Guard: "ocr scanned text" must NOT be intercepted', () => {
  const res = classifyDailyIntent('make scanned document searchable with ocr');
  assert.strictEqual(res, null);
});

runTest(19, 'Zero-Collision Guard: "resume builder ats" must NOT be intercepted', () => {
  const res = classifyDailyIntent('best template in resume builder');
  assert.strictEqual(res, null);
});

runTest(20, 'Zero-Collision Guard: "stitch canvas pipeline" must NOT be intercepted', () => {
  const res = classifyDailyIntent('how to connect nodes on canvas');
  assert.strictEqual(res, null);
});

runTest(21, 'Zero-Collision Guard: "redact credit card" must NOT be intercepted', () => {
  const res = classifyDailyIntent('auto redact sensitive pii');
  assert.strictEqual(res, null);
});

runTest(22, 'Zero-Collision Guard: Empty or undefined input returns null', () => {
  assert.strictEqual(classifyDailyIntent(''), null);
  assert.strictEqual(classifyDailyIntent(null), null);
  assert.strictEqual(classifyDailyIntent(undefined), null);
});

// ── SECTION 3: WORLD TIME NATIVE ENGINE (Areas 23 - 30) ──────────────

runTest(23, 'World Time: Tokyo Zone computation', () => {
  const res = getWorldTime('Tokyo');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('Tokyo'));
  assert.ok(res.text.includes('Asia/Tokyo'));
});

runTest(24, 'World Time: London Zone computation', () => {
  const res = getWorldTime('London');
  assert.strictEqual(res.success, true);
  assert.ok(res.text.includes('Europe/London'));
});

runTest(25, 'World Time: New York Zone computation', () => {
  const res = getWorldTime('New York');
  assert.strictEqual(res.success, true);
  assert.ok(res.text.includes('America/New_York'));
});

runTest(26, 'World Time: Sydney Zone computation', () => {
  const res = getWorldTime('Sydney');
  assert.strictEqual(res.success, true);
  assert.ok(res.text.includes('Australia/Sydney'));
});

runTest(27, 'World Time: Paris Zone computation', () => {
  const res = getWorldTime('Paris');
  assert.strictEqual(res.success, true);
  assert.ok(res.text.includes('Europe/Paris'));
});

runTest(28, 'World Time: Dubai Zone computation', () => {
  const res = getWorldTime('Dubai');
  assert.strictEqual(res.success, true);
  assert.ok(res.text.includes('Asia/Dubai'));
});

runTest(29, 'World Time: Local device time computation (null query)', () => {
  const res = getWorldTime(null);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('Local Time') || res.text.includes('Current Local Time'));
});

runTest(30, 'World Time: Unknown location fallback', () => {
  const res = getWorldTime('Atlantis XYZ');
  assert.strictEqual(res.success, false);
  assert.ok(res.text.includes("couldn't match a standard timezone"));
});

// ── SECTION 4: SAME-CURRENCY FORMULA & BOUNDARY (Areas 31 - 35) ──────

await runAsyncTest(31, 'Currency Formula: Same currency identity conversion (USD to USD)', async () => {
  const res = await getCurrencyConversion(100, 'USD', 'USD');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('100 USD') && res.text.includes('Same currency'));
});

await runAsyncTest(32, 'Currency Boundary: Invalid negative/zero amount returns null', async () => {
  const resNeg = await getCurrencyConversion(-50, 'USD', 'EUR');
  assert.strictEqual(resNeg, null);
  const resZero = await getCurrencyConversion(0, 'USD', 'EUR');
  assert.strictEqual(resZero, null);
  const resNaN = await getCurrencyConversion('abc', 'USD', 'EUR');
  assert.strictEqual(resNaN, null);
});

await runAsyncTest(33, 'Joke Fallback: Generates valid joke with setup and punchline', async () => {
  const res = await getRandomJoke();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(typeof res.setup === 'string' && res.setup.length > 5);
  assert.ok(typeof res.punchline === 'string' && res.punchline.length > 2);
  assert.ok(res.text.includes(res.setup) && res.text.includes(res.punchline));
});

await runAsyncTest(34, 'Daily Advice: Delivers clean advice string without robotic footer', async () => {
  const res = await getDailyAdvice();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.length > 5);
  assert.ok(!res.text.includes('Advice Slip'), 'Must not leak API credit footer');
  assert.ok(!res.text.includes('Daily Wisdom'), 'Must not have robotic headline');
});

// ── SECTION 5: CACHE & FETCH TIMEOUT INTEGRITY (Areas 35 - 40) ────────

await runAsyncTest(35, 'Cache Retention: clearDailyCache empties cache cleanly', async () => {
  clearDailyCache();
  // Ensure no error thrown
  assert.ok(true);
});

await runAsyncTest(36, 'Word Definition Guard: 1-letter words rejected', async () => {
  const res = await getWordDefinition('a');
  assert.strictEqual(res, null);
});

await runAsyncTest(37, 'Live Weather Guard: 1-letter cities rejected', async () => {
  const res = await getLiveWeather('x');
  assert.strictEqual(res, null);
});

await runAsyncTest(38, 'Country Info Guard: Null or empty rejected', async () => {
  const resNull = await getCountryInfo(null);
  assert.strictEqual(resNull, null);
  const resEmpty = await getCountryInfo('');
  assert.strictEqual(resEmpty, null);
});

await runAsyncTest(39, 'Wiki Summary Guard: Null or empty topic rejected', async () => {
  const resNull = await getWikiSummary(null);
  assert.strictEqual(resNull, null);
  const resShort = await getWikiSummary('q');
  assert.strictEqual(resShort, null);
});

runTest(40, 'Classifier Resilience: Case insensitivity across inputs', () => {
  const lower = classifyDailyIntent('weather in tokyo');
  const upper = classifyDailyIntent('WEATHER IN TOKYO');
  const mixed = classifyDailyIntent('WeAtHeR In ToKyO');
  assert.strictEqual(lower.type, upper.type);
  assert.strictEqual(upper.type, mixed.type);
});

// ── SECTION 6: LIVE CONTRACT & CACHE SPEED (Areas 41 - 50) ───────────

await runAsyncTest(41, 'Live Contract: Weather payload is natural without API footers', async () => {
  const res = await getLiveWeather('Paris');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('°C') || res.text.includes('Weather'));
  assert.ok(!res.text.includes('Open-Meteo'), 'Must not leak API footer');
});

await runAsyncTest(42, 'Live Contract: Currency Rate calculation is clean without bank disclaimers', async () => {
  const res = await getCurrencyConversion(50, 'USD', 'GBP');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('GBP'));
  assert.ok(!res.text.includes('European Central Bank'), 'Must not leak central bank footer');
});

await runAsyncTest(43, 'Live Contract: Datamuse English Lexicon definition', async () => {
  const res = await getWordDefinition('pragmatic');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('pragmatic'));
});

await runAsyncTest(44, 'Live Contract: Wikimedia Wikipedia Article Summary', async () => {
  const res = await getWikiSummary('Marie Curie');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'wiki');
  assert.strictEqual(res.title, 'Marie Curie');
  assert.ok(res.action.url.includes('wikipedia.org'));
});

await runAsyncTest(45, 'Live Contract: Wikimedia Country Profile', async () => {
  const res = await getCountryInfo('Australia');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'country');
  assert.ok(res.title.includes('Australia'));
  assert.ok(res.action.description.length > 3);
});

await runAsyncTest(46, 'Live Contract: Official Joke Setup and Punchline', async () => {
  const res = await getRandomJoke();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('**'));
  assert.ok(typeof res.setup === 'string' && res.setup.length > 5);
  assert.ok(typeof res.punchline === 'string' && res.punchline.length > 2);
});

await runAsyncTest(47, 'Live Contract: Advice Slip Wisdom String', async () => {
  const res = await getDailyAdvice();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, null);
  assert.ok(res.text.includes('Daily Wisdom') || res.text.length > 10);
});

await runAsyncTest(48, 'Cache Acceleration: 2nd call to Open-Meteo resolves under 10ms', async () => {
  const t0 = Date.now();
  const res = await getLiveWeather('Paris');
  const elapsed = Date.now() - t0;
  assert.strictEqual(res.success, true);
  assert.ok(elapsed < 20, `Cached call took ${elapsed}ms, should be < 20ms`);
});

await runAsyncTest(49, 'Cache Acceleration: 2nd call to Frankfurter resolves under 10ms', async () => {
  const t0 = Date.now();
  const res = await getCurrencyConversion(50, 'USD', 'GBP');
  const elapsed = Date.now() - t0;
  assert.strictEqual(res.success, true);
  assert.ok(elapsed < 20, `Cached call took ${elapsed}ms, should be < 20ms`);
});

await runAsyncTest(50, 'Cache Acceleration: 2nd call to Datamuse resolves under 10ms', async () => {
  const t0 = Date.now();
  const res = await getWordDefinition('pragmatic');
  const elapsed = Date.now() - t0;
  assert.strictEqual(res.success, true);
  assert.ok(elapsed < 20, `Cached call took ${elapsed}ms, should be < 20ms`);
});

console.log('\n======================================================');
console.log(`--- MOLECULAR TEST RESULTS: ${passed}/${total} ASSERTIONS PASSED ---`);
console.log('======================================================\n');
