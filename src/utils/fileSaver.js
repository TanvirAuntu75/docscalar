import { saveAs as originalSaveAs } from 'file-saver/dist/FileSaver.min.js';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';

export async function saveAs(blobOrUrl, name, opts) {
  const IS_TAURI = typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
  
  if (IS_TAURI) {
    try {
      if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('http')) {
        await open(blobOrUrl);
        return;
      } else {
        // It's a blob or file
        const filePath = await save({ defaultPath: name });
        if (filePath) {
          const buffer = await blobOrUrl.arrayBuffer();
          await writeFile(filePath, new Uint8Array(buffer));
        }
        return;
      }
    } catch (err) {
      console.error("Tauri download failed:", err);
    }
  }

  // Fallback to original file-saver
  return originalSaveAs(blobOrUrl, name, opts);
}

export default { saveAs };
