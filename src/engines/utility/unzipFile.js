/* Unzip & Archive Explorer Engine: In-Browser Decompression & Inspection */
import JSZip from 'jszip';

async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported ZIP archive input.');
}

/**
 * Infer MIME type from file path extension
 */
export function getMimeType(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const mimeMap = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Inspect a ZIP archive and return a list of all entries with metadata.
 */
export async function inspectZipArchive(file) {
  const arrayBuffer = await extractBytes(file);
  const zip = await JSZip.loadAsync(arrayBuffer);
  const entries = [];

  zip.forEach((relativePath, zipEntry) => {
    entries.push({
      path: relativePath,
      name: relativePath.split('/').filter(Boolean).pop() || relativePath,
      isDirectory: zipEntry.dir,
      date: zipEntry.date,
      comment: zipEntry.comment || '',
      mime: getMimeType(relativePath),
      compressedSize: zipEntry._data ? zipEntry._data.compressedSize || 0 : 0,
      uncompressedSize: zipEntry._data ? zipEntry._data.uncompressedSize || 0 : 0
    });
  });

  return {
    archiveName: file.name || 'archive.zip',
    totalEntries: entries.length,
    totalFiles: entries.filter((e) => !e.isDirectory).length,
    totalFolders: entries.filter((e) => e.isDirectory).length,
    entries
  };
}

/**
 * Extract selected or all entries from a ZIP archive.
 */
export async function extractZipEntries(file, selectedPaths = null, onProgress = () => {}) {
  const arrayBuffer = await extractBytes(file);
  const zip = await JSZip.loadAsync(arrayBuffer);
  const extracted = [];

  const allPaths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  const targetPaths = selectedPaths && selectedPaths.length > 0
    ? allPaths.filter((p) => selectedPaths.includes(p))
    : allPaths;

  const total = targetPaths.length;

  for (let i = 0; i < total; i++) {
    const p = targetPaths[i];
    const zipEntry = zip.files[p];
    const mime = getMimeType(p);
    const blob = await zipEntry.async('blob');

    const fileName = p.split('/').filter(Boolean).pop() || p;
    extracted.push({
      path: p,
      name: fileName,
      blob: new Blob([blob], { type: mime }),
      size: blob.size,
      mime
    });

    onProgress(Math.round(((i + 1) / total) * 100));
  }

  return extracted;
}

/**
 * Direct Extraction for Node / In-Thread Test Suite
 */
export async function directUnzip(file, selectedPaths = null) {
  return await extractZipEntries(file, selectedPaths);
}
