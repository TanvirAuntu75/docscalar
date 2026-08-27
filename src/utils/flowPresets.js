/**
 * DocForge Workflow Blueprints & Shareable DAG Flow Engine
 */

export const WORKFLOW_PRESETS = [
  {
    id: 'contract-prep',
    name: 'Contract & Legal Prep',
    description: 'Redact sensitive PII, convert to PDF/A archive, and apply digital signature.',
    category: 'Legal',
    nodes: [
      { id: 'op-redact', toolId: 'redact-pdf', x: 400, y: 150, params: {} },
      { id: 'op-pdfa', toolId: 'pdf-to-pdfa', x: 680, y: 150, params: {} },
      { id: 'op-sign', toolId: 'sign-pdf', x: 960, y: 150, params: {} }
    ],
    connections: [
      { from: 'op-redact', to: 'op-pdfa' },
      { from: 'op-pdfa', to: 'op-sign' }
    ]
  },
  {
    id: 'document-assembly',
    name: 'Document Assembly',
    description: 'Merge multiple document briefs, apply sequential page numbers, and compress output.',
    category: 'Assembly',
    nodes: [
      { id: 'op-merge', toolId: 'merge-pdf', x: 400, y: 200, params: {} },
      { id: 'op-pagenum', toolId: 'add-page-numbers', x: 680, y: 200, params: { format: 'Page {n} of {total}' } },
      { id: 'op-compress', toolId: 'compress-pdf', x: 960, y: 200, params: { quality: 0.7, mode: 'lossless' } }
    ],
    connections: [
      { from: 'op-merge', to: 'op-pagenum' },
      { from: 'op-pagenum', to: 'op-compress' }
    ]
  },
  {
    id: 'legal-discovery',
    name: 'Legal Discovery Bates Stamp',
    description: 'Apply sequential Bates stamps across document sets for litigation production.',
    category: 'Legal',
    nodes: [
      { id: 'op-bates', toolId: 'bates-numbering', x: 400, y: 180, params: { prefix: 'CONF-', digits: 6, startNumber: 1 } },
      { id: 'op-compress', toolId: 'compress-pdf', x: 680, y: 180, params: { quality: 0.75, mode: 'lossless' } }
    ],
    connections: [
      { from: 'op-bates', to: 'op-compress' }
    ]
  },
  {
    id: 'invoice-batch',
    name: 'Financial Invoice Batch',
    description: 'Convert PDF invoices to Excel spreadsheets with typed data extraction.',
    category: 'Finance',
    nodes: [
      { id: 'op-excel', toolId: 'pdf-to-excel', x: 400, y: 180, params: {} }
    ],
    connections: []
  },
  {
    id: 'academic-draft',
    name: 'Academic Draft Prep',
    description: 'Convert Word DOCX to PDF, stamp "DRAFT" watermark, and add page numbers.',
    category: 'Academic',
    nodes: [
      { id: 'op-docx', toolId: 'docx-to-pdf', x: 400, y: 180, params: {} },
      { id: 'op-watermark', toolId: 'add-watermark', x: 680, y: 180, params: { text: 'DRAFT', opacity: 0.3 } },
      { id: 'op-pagenum', toolId: 'add-page-numbers', x: 960, y: 180, params: { format: 'Page {n} of {total}' } }
    ],
    connections: [
      { from: 'op-docx', to: 'op-watermark' },
      { from: 'op-watermark', to: 'op-pagenum' }
    ]
  },
  {
    id: 'secure-archive',
    name: 'Secure Long-Term Archive',
    description: 'Encrypt document with AES-256 password protection and convert to PDF/A-1b.',
    category: 'Security',
    nodes: [
      { id: 'op-protect', toolId: 'protect-pdf', x: 400, y: 180, params: {} },
      { id: 'op-pdfa', toolId: 'pdf-to-pdfa', x: 680, y: 180, params: {} }
    ],
    connections: [
      { from: 'op-protect', to: 'op-pdfa' }
    ]
  }
];

/**
 * Serializes canvas DAG flow into a compact URL-safe base64 string
 */
export function encodeFlowToUrl(operations) {
  try {
    const compact = operations.map(op => ({
      t: op.toolId,
      p: op.params || {},
      x: Math.round(op.x || 0),
      y: Math.round(op.y || 0),
      i: op.inputIds || [],
      m: op.inputPortMap || {}
    }));
    const jsonStr = JSON.stringify(compact);
    return encodeURIComponent(btoa(jsonStr));
  } catch (e) {
    console.error('Failed to encode flow:', e);
    return '';
  }
}

/**
 * Deserializes base64 flow string into operations graph
 */
export function decodeFlowFromUrl(urlHash) {
  try {
    const jsonStr = atob(decodeURIComponent(urlHash));
    const compact = JSON.parse(jsonStr);
    return compact.map((item, idx) => ({
      id: `op-shared-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`,
      toolId: item.t,
      params: item.p || {},
      x: item.x || (300 + idx * 260),
      y: item.y || 200,
      inputIds: item.i || [],
      inputPortMap: item.m || {},
      outputId: null,
      status: 'idle',
      progress: 0
    }));
  } catch (e) {
    console.error('Failed to decode flow:', e);
    return null;
  }
}

/**
 * Saves named flow to local storage
 */
export function saveFlowToStorage(flowName, operations) {
  try {
    const saved = JSON.parse(localStorage.getItem('docforge_saved_flows') || '[]');
    const filtered = saved.filter(f => f.name !== flowName);
    filtered.push({
      name: flowName,
      date: new Date().toISOString(),
      operations: operations.map(op => ({
        toolId: op.toolId,
        params: op.params,
        x: op.x,
        y: op.y,
        inputIds: op.inputIds
      }))
    });
    localStorage.setItem('docforge_saved_flows', JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to save flow to storage:', e);
    return false;
  }
}

/**
 * Retrieves all saved custom flows from local storage
 */
export function loadSavedFlows() {
  try {
    return JSON.parse(localStorage.getItem('docforge_saved_flows') || '[]');
  } catch (e) {
    return [];
  }
}
