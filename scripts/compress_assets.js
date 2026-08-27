import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const DIST_DIR = './dist';
const filesToCompress = ['.js', '.css', '.html', '.svg', '.json', '.wasm', '.onnx'];

async function compressFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!filesToCompress.includes(ext)) return;

  try {
    const stats = fs.statSync(filePath);
    const isLargeFile = stats.size > 30 * 1024 * 1024; // 30 MB

    // Generate Gzip (.gz)
    const gzipQuality = isLargeFile ? 6 : 9;
    const gzip = zlib.createGzip({ level: gzipQuality });
    const gzipStream = fs.createReadStream(filePath);
    const writeGzipStream = fs.createWriteStream(filePath + '.gz');
    await pipeline(gzipStream, gzip, writeGzipStream);

    // Generate Brotli (.br)
    const brotliQuality = isLargeFile ? 6 : 11;
    const brotli = zlib.createBrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: brotliQuality,
      }
    });
    const brotliStream = fs.createReadStream(filePath);
    const writeBrotliStream = fs.createWriteStream(filePath + '.br');
    await pipeline(brotliStream, brotli, writeBrotliStream);

    console.log(`[Compressed] ${path.basename(filePath)} (size: ${(stats.size / 1024 / 1024).toFixed(1)}MB, gzip=${gzipQuality}, brotli=${brotliQuality}) -> .gz, .br`);
  } catch (err) {
    console.error(`Failed to compress ${filePath}:`, err);
  }
}

async function walk(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory ${dir} does not exist. Skipping compression.`);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile()) {
      // Don't re-compress already compressed files
      if (fullPath.endsWith('.gz') || fullPath.endsWith('.br')) continue;
      await compressFile(fullPath);
    }
  }
}

console.log('Starting post-build asset compression...');
await walk(DIST_DIR);
console.log('Post-build asset compression completed successfully.');
