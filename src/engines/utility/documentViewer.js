/* Omnichannel Document Studio Viewer Engine: Multi-Format Parser & Inspector */

export const SUPPORTED_VIEWER_FORMATS = {
  pdf: ['pdf'],
  docx: ['docx', 'doc'],
  excel: ['xlsx', 'xls', 'csv'],
  pptx: ['pptx', 'ppt'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'],
  code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'php', 'sql', 'sh', 'xml', 'yaml', 'yml'],
  text: ['txt', 'md', 'rtf', 'log'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'avi'],
  archive: ['zip', 'tar', 'gz', 'rar', '7z']
};

export const SMART_ACTIONS = {
  pdf: [
    { label: 'Compress PDF', path: '/compress-pdf', icon: 'compress' },
    { label: 'Split PDF', path: '/split-pdf', icon: 'call_split' },
    { label: 'Sign PDF', path: '/sign-pdf', icon: 'border_color' },
    { label: 'OCR PDF', path: '/ocr-pdf', icon: 'find_in_page' },
    { label: 'Merge PDF', path: '/merge-pdf', icon: 'merge' },
    { label: 'Redact PDF', path: '/redact-pdf', icon: 'ink_eraser' }
  ],
  docx: [
    { label: 'Convert to PDF', path: '/docx-to-pdf', icon: 'picture_as_pdf' }
  ],
  excel: [
    { label: 'Convert to PDF', path: '/excel-to-pdf', icon: 'picture_as_pdf' }
  ],
  pptx: [
    { label: 'Convert to PDF', path: '/powerpoint-to-pdf', icon: 'picture_as_pdf' }
  ],
  image: [
    { label: 'Compress Image', path: '/image-compressor', icon: 'compress' },
    { label: 'Resize Image', path: '/image-resizer', icon: 'straighten' },
    { label: 'Convert Format', path: '/image-converter', icon: 'transform' },
    { label: 'Bundle to PDF', path: '/image-to-pdf', icon: 'picture_as_pdf' }
  ],
  text: [
    { label: 'Convert to PDF', path: '/text-to-pdf', icon: 'picture_as_pdf' }
  ],
  archive: [
    { label: 'Unpack Archive', path: '/unzip-file', icon: 'folder_open' }
  ]
};

/**
 * Detect file category from extension and mime type
 */
export function detectFileType(fileName = '', mimeType = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  for (const [category, extensions] of Object.entries(SUPPORTED_VIEWER_FORMATS)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType === 'application/pdf') return 'pdf';

  return 'unknown';
}

/**
 * Parse document metadata and determine quick smart actions
 */
export function parseDocumentMeta(file) {
  const name = file.name || 'document';
  const size = file.size || 0;
  const mime = file.type || '';
  const category = detectFileType(name, mime);
  const ext = (name.split('.').pop() || '').toUpperCase();

  return {
    name,
    size,
    category,
    extension: ext,
    mime,
    smartActions: SMART_ACTIONS[category] || [],
    isRenderable: category !== 'unknown'
  };
}
