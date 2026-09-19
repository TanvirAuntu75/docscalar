import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const STUDIO_PAGES = [
  'src/pages/pdf/OcrPdf.jsx',
  'src/pages/pdf/UnOcrPdf.jsx',
  'src/pages/pdf/PdfToImage.jsx',
  'src/pages/document/PdfToExcel.jsx',
  'src/pages/document/PdfToPowerpoint.jsx',
  'src/pages/document/PdfToPdfa.jsx',
  'src/pages/document/HtmlToPdf.jsx',
  'src/pages/document/ExcelToPdf.jsx',
  'src/pages/document/PowerpointToPdf.jsx',
  'src/pages/document/TextToPdf.jsx',
  'src/pages/document/TranslatePdf.jsx',
  'src/pages/document/AiSummarizer.jsx',
  'src/pages/image/ImageConverter.jsx',
  'src/pages/image/ImageResizer.jsx',
  'src/pages/image/ImageCompressor.jsx',
  'src/pages/utility/UrlToPdf.jsx',
  'src/pages/pdf/ScanToPdf.jsx',
  'src/pages/pdf/RedactPdf.jsx',
  'src/pages/utility/ConversionPipeline.jsx',
];

function extractProgressBarBlock(content, relPath) {
  const match = content.match(/\{processing\s*&&\s*\([\s\S]*?style=\{\{\s*width:\s*`\$\{progress\}%`\s*\}\}\s*\/>[\s\S]*?\)\}/);
  if (!match) {
    throw new Error(`Could not find processing progress bar block in ${relPath}`);
  }
  return match[0];
}

describe('Studio Progress Bar Fluid Typography & Layout Parity Master Suite (80 Areas)', () => {
  // Test Areas 1 to 19: Zero max-w-[200px] in any progress bar block
  STUDIO_PAGES.forEach((relPath, idx) => {
    test(`Area ${idx + 1}: ${path.basename(relPath)} progress bar has zero max-w-[200px] pixel clamping`, () => {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const barBlock = extractProgressBarBlock(content, relPath);
      assert.strictEqual(
        barBlock.includes('max-w-[200px]'),
        false,
        `${relPath} progress bar still contains banned max-w-[200px] pixel clamping!`
      );
    });
  });

  // Test Areas 20 to 38: Fluid min-w-0 flex-1 container in progress bar block
  STUDIO_PAGES.forEach((relPath, idx) => {
    test(`Area ${idx + 20}: ${path.basename(relPath)} progress bar implements fluid min-w-0 flex-1 container`, () => {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const barBlock = extractProgressBarBlock(content, relPath);
      assert.strictEqual(
        barBlock.includes('min-w-0 flex-1'),
        true,
        `${relPath} progress bar missing fluid 'min-w-0 flex-1' container!`
      );
    });
  });

  // Test Areas 39 to 57: Inner truncate span with title tooltip in progress bar block
  STUDIO_PAGES.forEach((relPath, idx) => {
    test(`Area ${idx + 39}: ${path.basename(relPath)} progress bar has inner span with truncate and title tooltip`, () => {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const barBlock = extractProgressBarBlock(content, relPath);
      const hasTruncateTitle = /<span[^>]*className=["'][^"']*truncate[^"']*["'][^>]*title=/.test(barBlock);
      assert.strictEqual(
        hasTruncateTitle,
        true,
        `${relPath} progress bar missing inner <span className="truncate" title={...}>!`
      );
    });
  });

  // Test Areas 58 to 76: shrink-0 on icons / percentage in progress bar block
  STUDIO_PAGES.forEach((relPath, idx) => {
    test(`Area ${idx + 58}: ${path.basename(relPath)} progress bar applies shrink-0 to prevent icon/metric squishing`, () => {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const barBlock = extractProgressBarBlock(content, relPath);
      assert.strictEqual(
        barBlock.includes('shrink-0'),
        true,
        `${relPath} progress bar missing 'shrink-0' layout protection!`
      );
    });
  });

  // Test Area 77: OcrPdf.jsx dynamic poller message
  test('Area 77: OcrPdf.jsx streams poller.statusMessage dynamically to state', () => {
    const fullPath = path.join(rootDir, 'src/pages/pdf/OcrPdf.jsx');
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.strictEqual(
      content.includes('poller.statusMessage ||'),
      true,
      'OcrPdf.jsx must stream poller.statusMessage dynamically!'
    );
  });

  // Test Area 78: OcrPdf.jsx poller.statusMessage in dependency array
  test('Area 78: OcrPdf.jsx includes poller.statusMessage in effect dependency array', () => {
    const fullPath = path.join(rootDir, 'src/pages/pdf/OcrPdf.jsx');
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.strictEqual(
      content.includes('poller.statusMessage'),
      true,
      'OcrPdf.jsx must include poller.statusMessage in hook synchronization!'
    );
    const hasInDeps = /\[poller\.status,\s*poller\.result,\s*poller\.error,\s*poller\.progress,\s*poller\.statusMessage/.test(content);
    assert.strictEqual(
      hasInDeps,
      true,
      'OcrPdf.jsx effect dependency array must include poller.statusMessage!'
    );
  });

  // Test Area 79: No outer flex container with truncate in OcrPdf.jsx
  test('Area 79: OcrPdf.jsx does not apply truncate directly on outer flex container', () => {
    const fullPath = path.join(rootDir, 'src/pages/pdf/OcrPdf.jsx');
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.strictEqual(
      content.includes('flex items-center gap-1.5 truncate'),
      false,
      'OcrPdf.jsx must not put truncate directly on outer flex element!'
    );
  });

  // Test Area 80: Font-mono styling on progress percentage across all studio progress bars
  test('Area 80: All 19 studio progress bars render percentage with font-mono text-[11px]', () => {
    for (const relPath of STUDIO_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const barBlock = extractProgressBarBlock(content, relPath);
      assert.strictEqual(
        barBlock.includes('font-mono'),
        true,
        `${relPath} progress bar percentage should use monospace font styling!`
      );
    }
  });
});
