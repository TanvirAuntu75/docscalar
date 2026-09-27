import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();

// Load target files
const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf-8');
const manifestJson = readFileSync(resolve(rootDir, 'public/manifest.json'), 'utf-8');
const seoDataSource = readFileSync(resolve(rootDir, 'src/utils/seoData.js'), 'utf-8');
const notFoundSource = readFileSync(resolve(rootDir, 'src/pages/NotFound.jsx'), 'utf-8');
const signSidebarSource = readFileSync(resolve(rootDir, 'src/components/SignStudio/SignOptionsSidebar.jsx'), 'utf-8');
const imageConverterSource = readFileSync(resolve(rootDir, 'src/pages/image/ImageConverter.jsx'), 'utf-8');
const imageResizerSource = readFileSync(resolve(rootDir, 'src/pages/image/ImageResizer.jsx'), 'utf-8');
const translatePdfSource = readFileSync(resolve(rootDir, 'src/pages/document/TranslatePdf.jsx'), 'utf-8');
const textToPdfSource = readFileSync(resolve(rootDir, 'src/pages/document/TextToPdf.jsx'), 'utf-8');
const urlToPdfSource = readFileSync(resolve(rootDir, 'src/pages/utility/UrlToPdf.jsx'), 'utf-8');
const aiSummarizerEngineSource = readFileSync(resolve(rootDir, 'src/engines/document/aiSummarizer.js'), 'utf-8');
const addPageNumbersSource = readFileSync(resolve(rootDir, 'src/pages/pdf/AddPageNumbers.jsx'), 'utf-8');
const addWatermarkSource = readFileSync(resolve(rootDir, 'src/pages/pdf/AddWatermark.jsx'), 'utf-8');
const batesNumberingSource = readFileSync(resolve(rootDir, 'src/pages/pdf/BatesNumbering.jsx'), 'utf-8');
const compressPdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/CompressPdf.jsx'), 'utf-8');
const cropPdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/CropPdf.jsx'), 'utf-8');
const extractPagesSource = readFileSync(resolve(rootDir, 'src/pages/pdf/ExtractPages.jsx'), 'utf-8');
const imageToPdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/ImageToPdf.jsx'), 'utf-8');
const organizePdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/OrganizePdf.jsx'), 'utf-8');
const removePagesSource = readFileSync(resolve(rootDir, 'src/pages/pdf/RemovePages.jsx'), 'utf-8');
const rotatePdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/RotatePdf.jsx'), 'utf-8');
const signPdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/SignPdf.jsx'), 'utf-8');
const splitPdfSource = readFileSync(resolve(rootDir, 'src/pages/pdf/SplitPdf.jsx'), 'utf-8');
const registerSwSource = readFileSync(resolve(rootDir, 'src/registerServiceWorker.js'), 'utf-8');

// ==========================================
// 1. index.html Metadata & Schema.org Checks
// ==========================================
test("1. index.html title does NOT contain '100% Private'", () => {
  assert.equal(indexHtml.includes('DocScalar — Free Online PDF, Image & Document Tools | 100% Private'), false);
});

test("2. index.html meta description does NOT contain 'no upload needed'", () => {
  assert.equal(indexHtml.includes('no upload needed'), false);
});

test("3. index.html meta description does NOT contain 'Your files never leave your device'", () => {
  assert.equal(indexHtml.includes('Your files never leave your device'), false);
});

test("4. index.html og:description does NOT contain 'files never leave your device'", () => {
  assert.equal(indexHtml.includes('files never leave your device'), false);
});

test("5. index.html twitter:description does NOT contain '100% private'", () => {
  assert.equal(indexHtml.includes('100% private'), false);
});

test("6. index.html Schema.org does NOT contain '100% client-side'", () => {
  assert.equal(indexHtml.includes('100% client-side'), false);
});

test("7. index.html Schema.org does NOT contain '100% Client-side Processing'", () => {
  assert.equal(indexHtml.includes('100% Client-side Processing'), false);
});

test("8. index.html Schema.org features list contains 'Secure Document Processing'", () => {
  assert.ok(indexHtml.includes('"Secure Document Processing"'));
});

// ==========================================
// 2. public/manifest.json Checks
// ==========================================
test("9. manifest.json description does NOT contain '100% private in-browser'", () => {
  assert.equal(manifestJson.includes('100% private in-browser'), false);
});

test("10. manifest.json description contains 'Fast, secure document processing'", () => {
  assert.ok(manifestJson.includes('Fast, secure document processing'));
});

// ==========================================
// 3. src/utils/seoData.js Checks
// ==========================================
test("11. seoData.js merge-pdf description does NOT contain '100% private, client side'", () => {
  assert.equal(seoDataSource.includes('100% private, client side'), false);
});

test("12. seoData.js merge-pdf keywords do NOT contain 'client side'", () => {
  assert.equal(seoDataSource.includes('merge documents client side'), false);
});

test("13. seoData.js merge-pdf FAQ does NOT contain 'never touch external cloud servers'", () => {
  assert.equal(seoDataSource.includes('never touch external cloud servers'), false);
});

test("14. seoData.js split-pdf description does NOT contain 'Zero server uploads'", () => {
  assert.equal(seoDataSource.includes('Zero server uploads, completely private and fast'), false);
});

test("15. seoData.js split-pdf FAQ does NOT contain 'entirely in client memory'", () => {
  assert.equal(seoDataSource.includes('entirely in client memory via WebAssembly'), false);
});

test("16. seoData.js ai-summarizer description does NOT contain '100% client side'", () => {
  assert.equal(seoDataSource.includes('concepts 100% client side'), false);
});

test("17. seoData.js ai-summarizer FAQ does NOT contain 'without cloud servers'", () => {
  assert.equal(seoDataSource.includes('without cloud servers'), false);
});

test("18. seoData.js ai-summarizer FAQ does NOT contain 'zero server uploads'", () => {
  assert.equal(seoDataSource.includes('with zero server uploads'), false);
});

test("19. seoData.js fallback title does NOT contain '100% Private'", () => {
  assert.equal(seoDataSource.includes("Online Free — 100% Private | DocScalar"), false);
});

test("20. seoData.js fallback description does NOT contain 'client side document processing'", () => {
  assert.equal(seoDataSource.includes("client side document processing in your browser"), false);
});

test("21. seoData.js fallback FAQ does NOT contain 'All client side tools run'", () => {
  assert.equal(seoDataSource.includes("All client side tools run in your web browser memory"), false);
});

// ==========================================
// 4. src/pages/NotFound.jsx Checks
// ==========================================
test("22. NotFound.jsx does NOT contain 'private local tools might be what you need'", () => {
  assert.equal(notFoundSource.includes('private local tools might be what you need'), false);
});

test("23. NotFound.jsx contains 'explore our most popular document tools below'", () => {
  assert.ok(notFoundSource.includes('explore our most popular document tools below'));
});

// ==========================================
// 5. SignOptionsSidebar & Studios Checks
// ==========================================
test("24. SignOptionsSidebar.jsx does NOT contain '100% Local Privacy'", () => {
  assert.equal(signSidebarSource.includes('100% Local Privacy'), false);
});

test("25. SignOptionsSidebar.jsx contains 'Instant & Private'", () => {
  assert.ok(signSidebarSource.includes('Instant & Private'));
});

test("26. ImageConverter.jsx does NOT contain 'zero server uploads'", () => {
  assert.equal(imageConverterSource.includes('zero server uploads'), false);
});

test("27. ImageConverter.jsx does NOT contain 'privacy-first local encoding'", () => {
  assert.equal(imageConverterSource.includes('privacy-first local encoding'), false);
});

test("28. ImageResizer.jsx does NOT contain '100% private in-browser resizing'", () => {
  assert.equal(imageResizerSource.includes('100% private in-browser resizing'), false);
});

test("29. TranslatePdf.jsx does NOT contain '100% private in-browser translation'", () => {
  assert.equal(translatePdfSource.includes('100% private in-browser translation'), false);
});

test("30. TextToPdf.jsx does NOT contain '100% private in-browser tool'", () => {
  assert.equal(textToPdfSource.includes('100% private in-browser tool'), false);
});

test("31. UrlToPdf.jsx does NOT contain '100% private processing'", () => {
  assert.equal(urlToPdfSource.includes('100% private processing'), false);
});

test("32. aiSummarizer.js does NOT contain '100% Private Client-Side Processing'", () => {
  assert.equal(aiSummarizerEngineSource.includes('100% Private Client-Side Processing'), false);
});

test("33. aiSummarizer.js contains 'Confidential & Secure Document Processing'", () => {
  assert.ok(aiSummarizerEngineSource.includes('Confidential & Secure Document Processing'));
});

// ==========================================
// 6. Studio Titles Leaking (100% Local) Checks
// ==========================================
test("34. AddPageNumbers.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(addPageNumbersSource.includes('(100% Local Studio)'), false);
});

test("35. AddWatermark.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(addWatermarkSource.includes('(100% Local Studio)'), false);
});

test("36. BatesNumbering.jsx does NOT contain '100% locally in your browser'", () => {
  assert.equal(batesNumberingSource.includes('100% locally in your browser'), false);
});

test("37. CompressPdf.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(compressPdfSource.includes('(100% Local Studio)'), false);
});

test("38. CropPdf.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(cropPdfSource.includes('(100% Local Studio)'), false);
});

test("39. ExtractPages.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(extractPagesSource.includes('(100% Local Studio)'), false);
});

test("40. ImageToPdf.jsx does NOT contain '(100% Local & Free)'", () => {
  assert.equal(imageToPdfSource.includes('(100% Local & Free)'), false);
});

test("41. OrganizePdf.jsx does NOT contain '(100% Local)'", () => {
  assert.equal(organizePdfSource.includes('(100% Local)'), false);
});

test("42. RemovePages.jsx does NOT contain '(100% Local Studio)'", () => {
  assert.equal(removePagesSource.includes('(100% Local Studio)'), false);
});

test("43. RotatePdf.jsx does NOT contain '(100% Local)'", () => {
  assert.equal(rotatePdfSource.includes('(100% Local)'), false);
});

test("44. SignPdf.jsx does NOT contain '(100% Local & Private)'", () => {
  assert.equal(signPdfSource.includes('(100% Local & Private)'), false);
});

test("45. SplitPdf.jsx does NOT contain '(100% Local)'", () => {
  assert.equal(splitPdfSource.includes('(100% Local)'), false);
});

test("46. registerServiceWorker.js does NOT contain 'Client Side use'", () => {
  assert.equal(registerSwSource.includes('Client Side use'), false);
});
