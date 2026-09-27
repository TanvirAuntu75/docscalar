import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import interact from 'interactjs';
import anime from 'animejs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Link, useNavigate } from 'react-router-dom';
import DocumentViewer from '../pages/utility/DocumentViewer';
import GuestLimitModal from './GuestLimitModal';
import { getCanvasQuota, consumeCanvasQuota, openCanvasLimitModal } from '../utils/guestQuota';

// Import local WASM/JS conversion engines
import { convertPdfToWord } from '../engines/document/pdfToWord';
import { docxToPdf } from '../engines/document/docxToPdf';
import { excelToPdf } from '../engines/document/excelToPdf';
import { powerpointToPdf } from '../engines/document/powerpointToPdf';
import { htmlToPdf } from '../engines/document/htmlToPdf';
import { textToPdf } from '../engines/document/textToPdf';
import { compressPdf } from '../engines/pdf/compressPdf';
import { rotatePdf } from '../engines/pdf/rotatePdf';
import { pdfToImagesStream } from '../engines/pdf/pdfToImage';
import { mergePdfs } from '../engines/pdf/mergePdf';
import { splitPdf, getPdfPageCount } from '../engines/pdf/splitPdf';
import { compressImage } from '../engines/image/compressImage';
import { convertImageFormat } from '../engines/image/convertFormat';
import { resizeImage } from '../engines/image/resizeImage';
import { imagesToPdf } from '../engines/pdf/imageToPdf';
import { addWatermark } from '../engines/pdf/addWatermark';
import { addPageNumbers } from '../engines/pdf/addPageNumbers';
import { removePages } from '../engines/pdf/removePages';
import { extractPages } from '../engines/pdf/extractPages';
import { organizePdf } from '../engines/pdf/organizePdf';
import { cropPdf } from '../engines/pdf/cropPdf';
import { editPdf } from '../engines/pdf/editPdf';
import { fillFormFields } from '../engines/pdf/pdfForms';
import { signPdf } from '../engines/pdf/signPdf';
import { redactPdf } from '../engines/pdf/redactPdf';
import { repairPdf } from '../engines/pdf/repairPdf';
import { generateQR } from '../engines/utility/qrGenerate';
import { ocrPdf, terminateOcrPool } from '../engines/pdf/ocrPdf';
import { unOcrPdf } from '../engines/pdf/unOcrPdf';
import { applyBatesNumbering } from '../engines/pdf/batesNumbering';
import { saveCanvasState, loadCanvasState, clearCanvasState } from '../utils/db';
import { parseLocalNLPCommand, extractCommandParameters, optimizeCanvasLayout, validateCanvasConnections, executeAutoHeal, hasDependencyCycle, TOOL_REGISTRY, resolveDocumentTargets, detectFanOutTools, needsStudioParams, computeStructuralTopologyHash, planCanvasWorkflow, materializeCanvasOperations, reactCanvasToIntent, normalizeUserPrompt, MAX_INDIVIDUAL_CANVAS_CARDS, shouldUnpackCanvasCards, checkHasDownstreamConsumers } from '../utils/canvasBrain';
import { getToolValidation, findConversionPath, TOOLS_MANIFEST, normalizeExtension } from '../utils/toolsManifest';
import { WORKFLOW_PRESETS, encodeFlowToUrl, decodeFlowFromUrl, saveFlowToStorage, loadSavedFlows } from '../utils/flowPresets';
import { AnimatePresence } from 'framer-motion';
import FocusStudioPortal from './FocusStudio/FocusStudioPortal';
import { BACKEND_URL, apiFetch } from '../utils/api';

// Canonical Tool Validation derived from TOOLS_MANIFEST
const TOOL_VALIDATION = getToolValidation();

// Re-export canvas card thresholds and optimization helpers
export { MAX_INDIVIDUAL_CANVAS_CARDS, shouldUnpackCanvasCards, checkHasDownstreamConsumers };

/**
 * Disconnects a cable connection in the operations state cleanly.
 * Handles both direct input IDs and rewritten output file node IDs (ws-out-*),
 * as well as parameter connections and input port mappings.
 */
export const disconnectCableState = (operations, fromId, toId) => {
  if (!Array.isArray(operations)) return [];

  return operations.map(op => {
    // 1. If toId is an operation node, fromId is connected as an input (or is an output node of an upstream operator)
    if (op.id === toId) {
      const idsToRemove = new Set([fromId]);

      // If fromId is an output node (e.g. ws-out-*), trace it back to its upstream operator
      const upstreamOp = operations.find(o => o.outputId === fromId || (Array.isArray(o.outputIds) && o.outputIds.includes(fromId)));
      if (upstreamOp) {
        idsToRemove.add(upstreamOp.id);
      }

      // Also trace if fromId starts with ws-out- and any operator produced it
      if (typeof fromId === 'string' && fromId.startsWith('ws-out-')) {
        operations.forEach(o => {
          if (o.outputId === fromId || (Array.isArray(o.outputIds) && o.outputIds.includes(fromId))) {
            idsToRemove.add(o.id);
          }
        });
      }

      const nextInputs = (op.inputIds || []).filter(id => !idsToRemove.has(id));

      // Clean up inputPortMap
      const nextInputPortMap = op.inputPortMap ? { ...op.inputPortMap } : {};
      for (const id of idsToRemove) {
        delete nextInputPortMap[id];
      }

      // Clean up parameter connections in params
      let nextParams = op.params ? { ...op.params } : {};
      if (op.params) {
        for (const [key, val] of Object.entries(op.params)) {
          if (typeof val === 'string' && idsToRemove.has(val)) {
            delete nextParams[key];
          }
        }
      }

      // Clean up paramConnections if present
      let nextParamConnections = op.paramConnections ? { ...op.paramConnections } : undefined;
      if (nextParamConnections) {
        for (const [key, val] of Object.entries(nextParamConnections)) {
          if (typeof val === 'string' && idsToRemove.has(val)) {
            delete nextParamConnections[key];
          }
        }
      }

      const nextPrevInputs = op.prevInputIds ? op.prevInputIds.filter(id => !idsToRemove.has(id)) : undefined;

      return {
        ...op,
        inputIds: nextInputs,
        ...(op.inputPortMap ? { inputPortMap: nextInputPortMap } : {}),
        params: nextParams,
        ...(nextParamConnections ? { paramConnections: nextParamConnections } : {}),
        ...(nextPrevInputs ? { prevInputIds: nextPrevInputs } : {}),
        status: nextInputs.length === 0 ? 'idle' : op.status,
        progress: nextInputs.length === 0 ? 0 : op.progress
      };
    }

    // 2. If fromId is an operation node, and toId is its output file node
    if (op.id === fromId && (op.outputId === toId || (Array.isArray(op.outputIds) && op.outputIds.includes(toId)))) {
      const nextOutputIds = Array.isArray(op.outputIds) ? op.outputIds.filter(id => id !== toId) : [];
      const hasNoRemainingOutput = nextOutputIds.length === 0 && (!op.outputId || op.outputId === toId);
      return {
        ...op,
        outputId: op.outputId === toId ? (nextOutputIds[nextOutputIds.length - 1] || null) : op.outputId,
        outputIds: nextOutputIds,
        status: hasNoRemainingOutput ? 'idle' : op.status,
        progress: hasNoRemainingOutput ? 0 : op.progress
      };
    }

    return op;
  });
};

/**
 * Determines whether a drop point (dropX, dropY) falls within an operator's bounds.
 * Dynamically measures DOM height (cardElement.offsetHeight) or defaults to 380px,
 * cleanly accommodating 150px to 450px operator cards.
 */
export const isPointInOperatorDropTarget = (op, dropX, dropY, cardElement = null) => {
  if (!op || op.x === undefined || op.y === undefined) return false;
  const domEl = cardElement || (typeof document !== 'undefined' ? document.getElementById(`op-node-${op.id}`) : null);
  const opWidth = domEl?.offsetWidth || (op.status === 'idle' ? 210 : 160);
  const opHeight = domEl?.offsetHeight || 380;
  return (
    dropX >= op.x - 30 &&
    dropX <= op.x + opWidth + 30 &&
    dropY >= op.y - 30 &&
    dropY <= op.y + opHeight + 30
  );
};

/**
 * Computes total input file size in bytes for an operator from workspace queue or upstream operators.
 */
export const calculateInputSize = (targetOp, workspaceQueue = [], operations = []) => {
  if (!targetOp || !Array.isArray(targetOp.inputIds)) return 0;
  return targetOp.inputIds.reduce((acc, inputId) => {
    if (typeof inputId === 'string' && inputId.startsWith('op-')) {
      const upstream = operations.find(o => o.id === inputId);
      if (upstream) {
        if (upstream.telemetry?.outputSize) {
          return acc + upstream.telemetry.outputSize;
        }
        if (upstream.outputId) {
          const fileNode = workspaceQueue.find(q => q.id === upstream.outputId);
          return acc + (fileNode?.size || fileNode?.resultBlob?.size || fileNode?.file?.size || 0);
        }
      }
    } else {
      const fileNode = workspaceQueue.find(q => q.id === inputId);
      return acc + (fileNode?.size || fileNode?.file?.size || fileNode?.resultBlob?.size || 0);
    }
    return acc;
  }, 0);
};

/**
 * Calculates persistent operator execution telemetry:
 * duration, throughput (MB/s), size delta percentage, and output size.
 */
export const computeNodeTelemetry = ({ startTime, durationMs, inputSize = 0, outputSize = 0 }) => {
  const elapsedMs = durationMs !== undefined ? durationMs : (startTime ? Math.max(0, Date.now() - startTime) : 0);
  const durationSec = (elapsedMs / 1000).toFixed(1);
  const inSize = Number(inputSize) || 0;
  const outSize = Number(outputSize) || 0;
  const throughputMbSec = elapsedMs > 0 && inSize > 0 
    ? ((inSize / (1024 * 1024)) / (elapsedMs / 1000)).toFixed(1) 
    : null;
  const sizeDeltaPct = inSize > 0 && outSize > 0 
    ? Math.round(((outSize - inSize) / inSize) * 100) 
    : null;
  return { durationSec, throughputMbSec, sizeDeltaPct, outputSize: outSize };
};

/**
 * Formats glassmorphic telemetry pill text matching specification:
 * ${telemetry.durationSec}s · ${telemetry.throughputMbSec ? telemetry.throughputMbSec + ' MB/s · ' : ''}${telemetry.sizeDeltaPct ? (telemetry.sizeDeltaPct > 0 ? '+' : '') + telemetry.sizeDeltaPct + '%' : ''}
 */
export const formatTelemetryPill = (telemetry) => {
  if (!telemetry) return '';
  const { durationSec, throughputMbSec, sizeDeltaPct } = telemetry;
  const throughputPart = throughputMbSec ? `${throughputMbSec} MB/s · ` : '';
  const deltaPart = (sizeDeltaPct !== null && sizeDeltaPct !== undefined) 
    ? `${sizeDeltaPct > 0 ? '+' : ''}${sizeDeltaPct}%` 
    : '';
  const raw = `${durationSec}s · ${throughputPart}${deltaPart}`;
  return raw.replace(/ · $/, '');
};

const formatStatusText = (st) => {
  if (!st) return 'Processing';
  if (typeof st === 'string') return st;
  if (typeof st === 'object') {
    if (st.currentFile) {
      const idx = typeof st.currentIndex === 'number' ? `${st.currentIndex + 1}/${st.totalFiles || '?'}: ` : '';
      return `Merging ${idx}${st.currentFile}`;
    }
    if (st.stage) return String(st.stage);
    return 'Processing';
  }
  return String(st);
};

export default function StitchCanvas({
  workspaceQueue,
  setWorkspaceQueue,
  isPro,
  userEmail,
  isAuthenticated,
  showToast,
  addFilesToQueueDirect,
  clearCanvasSignal = 0,
  onOperationsChange,
  sidebarOpen,
  setSidebarOpen,
  theme,
  handleThemeToggle,
  profileDropdownOpen,
  setProfileDropdownOpen,
  handleLogout,
  hasCanvasOperations,
  setClearCanvasSignal,
}) {
  const navigate = useNavigate();

  // Stitch Canvas Preview Quota Tracking (10 actions/day for Free Accounts, Unlimited for Pro)
  const [canvasQuota, setCanvasQuota] = useState(() => getCanvasQuota(userEmail, isPro));

  useEffect(() => {
    const handleQuotaChanged = () => setCanvasQuota(getCanvasQuota(userEmail, isPro));
    window.addEventListener('docscalar:canvas-quota-changed', handleQuotaChanged);
    return () => window.removeEventListener('docscalar:canvas-quota-changed', handleQuotaChanged);
  }, [userEmail, isPro]);

  // Floating Overlays UI states
  const [isRightDockExpanded, setIsRightDockExpanded] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [canvasProfileOpen, setCanvasProfileOpen] = useState(false);
  const [activeStudio, setActiveStudio] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recipesMenuOpen, setRecipesMenuOpen] = useState(false);
  const [customFlows, setCustomFlows] = useState(() => loadSavedFlows());
  const menuRef = useRef(null);
  const recipesMenuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, gridX: 0, gridY: 0, activeSubmenu: null });
  // Canvas Viewport States
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [autoFitViewport, setAutoFitViewport] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [collapsedOps, setCollapsedOps] = useState({});
  const toggleOperatorCollapse = (opId) => {
    setCollapsedOps(prev => ({ ...prev, [opId]: !prev[opId] }));
  };
  
  // Selection and Drag States
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [batchChoiceModal, setBatchChoiceModal] = useState(null);
  // Bug #5 fix: queue instead of single slot to handle concurrent overwrite decisions
  const [overwriteQueue, setOverwriteQueue] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [opTimers, setOpTimers] = useState({});
  const [lastActiveNodes, setLastActiveNodes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeLogTab, setActiveLogTab] = useState('queue'); // 'queue' | 'audit'
  const [destructivePrompt, setDestructivePrompt] = useState(null);
  const [thresholdPrompt, setThresholdPrompt] = useState(null);
  const [clarificationPrompt, setClarificationPrompt] = useState(null);

  const addActiveNodes = (nodeIds) => {
    if (!nodeIds) return;
    const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    setLastActiveNodes(prev => {
      const next = ids.filter(id => id).concat(prev.filter(id => !ids.includes(id)));
      return next.slice(0, 20);
    });
  };

  const workspaceQueueRef = useRef(workspaceQueue);
  workspaceQueueRef.current = workspaceQueue;

  const formatTimer = (seconds) => {
    if (seconds === undefined) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const [isDragActive, setIsDragActive] = useState(false);
  const selectionStartRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const panStart = useRef({ x: 0, y: 0 });
  const lastUploadCoords = useRef(null);
  const executionQueueLock = useRef(Promise.resolve());
  const mouseStillTimeoutRef = useRef(null);

  // Node Port Coordinates State (used to anchor SVG Bezier lines)
  const [portCoords, setPortCoords] = useState({});

  // Active operations running on the canvas
  const [operations, setOperations] = useState([]);

  const operationsRef = useRef(operations);
  operationsRef.current = operations;

  // Connection topology signature — prevents running cycle & type validation on progress ticks
  const connectionTopologyKey = useMemo(() => {
    const qKey = workspaceQueue.map(f => `${f.id}:${f.name}`).join('|');
    const opKey = operations.map(o => `${o.id}:${o.toolId}:${(o.inputIds || []).join(',')}`).join('|');
    return `${qKey}__${opKey}`;
  }, [workspaceQueue, operations]);

  const canvasIssues = useMemo(() => {
    return validateCanvasConnections(operations, workspaceQueue);
  }, [connectionTopologyKey]);



  // ----------------------------------------------

  // Handle clear canvas signal from parent
  useEffect(() => {
    if (clearCanvasSignal > 0) {
      setOperations([]);
      setSelectedNodeIds([]);
    }
  }, [clearCanvasSignal]);

  // Click outside handler for floating dropdown menus
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (recipesMenuRef.current && !recipesMenuRef.current.contains(event.target)) {
        setRecipesMenuOpen(false);
      }
    }
    if (menuOpen || recipesMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, recipesMenuOpen]);

  // Selected nodes update active focus nodes list
  useEffect(() => {
    if (selectedNodeIds.length > 0) {
      addActiveNodes(selectedNodeIds);
    }
  }, [selectedNodeIds]);

  // Revert completed operators to idle if all of their output file cards are deleted from workspaceQueue
  useEffect(() => {
    const existingFileIds = new Set(workspaceQueue.map(q => q.id));
    setOperations(prev => {
      let hasChanges = false;
      const nextOps = prev.map(op => {
        if (op.status === 'completed') {
          const outputs = op.outputIds || (op.outputId ? [op.outputId] : []);
          if (outputs.length > 0 && outputs.every(id => !existingFileIds.has(id))) {
            hasChanges = true;
            return {
              ...op,
              status: 'idle',
              progress: 0,
              outputId: null,
              outputIds: []
            };
          }
        }
        return op;
      });
      return hasChanges ? nextOps : prev;
    });
  }, [workspaceQueue]);

  // Recalculate node ancestries topologically
  const lastTopologyKeyRef = useRef('');
  useEffect(() => {
    const currentTopologyKey = JSON.stringify([
      workspaceQueue.map(f => f.id),
      operations.map(o => [o.id, o.inputIds, o.outputIds || o.outputId])
    ]);
    if (currentTopologyKey === lastTopologyKeyRef.current) {
      return;
    }
    lastTopologyKeyRef.current = currentTopologyKey;

    let changed = false;
    const nextQueue = workspaceQueue.map(file => {
      const initialAncestry = [file.id];
      if ((!file.ancestry || JSON.stringify(file.ancestry) !== JSON.stringify(initialAncestry)) && !file.id.startsWith('ws-out-')) {
        changed = true;
        return { ...file, ancestry: initialAncestry };
      }
      return file;
    });

    const ancestries = {};
    nextQueue.forEach(f => {
      ancestries[f.id] = f.ancestry || [f.id];
    });
    operations.forEach(o => {
      ancestries[o.id] = o.ancestry || [o.id];
    });

    let iter = 0;
    let loopChanged = true;
    while (loopChanged && iter < 10) {
      loopChanged = false;
      iter++;

      operations.forEach(op => {
        const inputsAncestry = [];
        op.inputIds.forEach(inputId => {
          const inputAncestry = ancestries[inputId] || [inputId];
          inputsAncestry.push(...inputAncestry);
        });
        const uniqueInputs = Array.from(new Set(inputsAncestry));
        const newAncestry = [...uniqueInputs, op.id];
        if (!ancestries[op.id] || JSON.stringify(ancestries[op.id]) !== JSON.stringify(newAncestry)) {
          ancestries[op.id] = newAncestry;
          loopChanged = true;
          changed = true;
        }
      });

      operations.forEach(op => {
        const opAncestry = ancestries[op.id] || [op.id];
        const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
        outIds.forEach(outId => {
          const newAncestry = [...opAncestry, outId];
          if (!ancestries[outId] || JSON.stringify(ancestries[outId]) !== JSON.stringify(newAncestry)) {
            ancestries[outId] = newAncestry;
            loopChanged = true;
            changed = true;
          }
        });
      });
    }

    if (changed) {
      setWorkspaceQueue(prev => prev.map(f => {
        const computed = ancestries[f.id];
        if (computed && (!f.ancestry || JSON.stringify(f.ancestry) !== JSON.stringify(computed))) {
          return { ...f, ancestry: computed };
        }
        return f;
      }));

      setOperations(prev => prev.map(op => {
        const computed = ancestries[op.id];
        if (computed && (!op.ancestry || JSON.stringify(op.ancestry) !== JSON.stringify(computed))) {
          return { ...op, ancestry: computed };
        }
        return op;
      }));
    }
  }, [operations, workspaceQueue]);

  useEffect(() => {
    return () => {
      try {
        terminateOcrPool();
      } catch (e) {}
    };
  }, []);

  // Report operations status to parent
  useEffect(() => {
    if (onOperationsChange) {
      onOperationsChange(operations.length > 0);
    }
  }, [operations, onOperationsChange]);

  // Dragging connection line state
  const [draggingCable, setDraggingCable] = useState(null); // { fromId, type: 'output', currentX, currentY }

  // Bug #1 fix: local 3-param closure removed. Now using imported 4-param hasDependencyCycle
  // from canvasBrain.js which correctly accepts (startId, searchTargetId, operations, visited).

  const validateConnection = (sourceId, targetOpId, silent = false) => {
    const targetOp = operations.find(o => o.id === targetOpId);
    if (!targetOp) return false;
    if (sourceId === targetOpId) return false;

    // Pass current operations array as required by the 4-param signature
    if (hasDependencyCycle(sourceId, targetOpId, operations)) {
      if (!silent) {
        showToast("Error: Connection would create a circular dependency cycle.");
      }
      return false;
    }

    const validation = TOOL_VALIDATION[targetOp.toolId];
    if (!validation) return true;

    let ext = '';
    let fileName = '';
    let sourceOutputType = null;
    
    if (sourceId.startsWith('op-')) {
      const sourceOp = operations.find(o => o.id === sourceId);
      if (!sourceOp) return false;
      
      const sourceMeta = TOOL_REGISTRY[sourceOp.toolId] || TOOLS_MANIFEST[sourceOp.toolId];
      sourceOutputType = sourceMeta?.outputType || null;

      if (sourceOp.status === 'completed' && sourceOp.outputId) {
        const fileNode = workspaceQueue.find(q => q.id === sourceOp.outputId);
        if (fileNode) {
          fileName = fileNode.file?.name || fileNode.name || '';
          ext = normalizeExtension(fileName);
        }
      }
      
      if (!ext) {
        ext = sourceMeta?.outExt || '.pdf';
        fileName = `output${ext}`;
      }
    } else {
      const fileNode = workspaceQueue.find(q => q.id === sourceId);
      if (fileNode) {
        fileName = fileNode.file?.name || fileNode.name || '';
        ext = normalizeExtension(fileName);
        if (fileNode.outputType) {
          sourceOutputType = fileNode.outputType;
        }
      }
    }

    if (!ext) return false;

    // Prevent duplicate connections (direct or via upstream operator output)
    const newSourceResolved = sourceId.startsWith('op-') 
      ? (operations.find(o => o.id === sourceId)?.outputId || sourceId)
      : sourceId;

    const isDuplicate = targetOp.inputIds.some(existingId => {
      const existingResolved = existingId.startsWith('op-')
        ? (operations.find(o => o.id === existingId)?.outputId || existingId)
        : existingId;
      return existingResolved === newSourceResolved;
    });

    if (isDuplicate) {
      if (!silent) {
        showToast("Already connected: This file is already an input to this operator.");
      }
      return false;
    }

    if (!validation.accept || validation.accept.length === 0) return true;

    // Type Compatibility Check (No .zip wildcard)
    const acceptsDirectly = validation.accept.some(acc => {
      if (acc === 'image/*') {
        return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(ext);
      }
      return acc.toLowerCase() === ext.toLowerCase();
    });

    if (!acceptsDirectly) {
      // Check if BFS conversion path exists
      const sourceDesc = sourceOutputType || (ext === '.zip' ? { type: 'archive', contains: 'any' } : ext);
      const conversionPath = findConversionPath(sourceDesc, targetOp.toolId);

      if (conversionPath && conversionPath.length > 0) {
        if (!silent) {
          const healToolName = TOOL_REGISTRY[conversionPath[0]]?.name || conversionPath[0];
          showToast(`Connected! Pipeline will automatically adapt via '${healToolName}'.`, 'warning');
        }
        return true;
      }

      if (!silent) {
        showToast(`Incompatible: ${targetOp.toolId.replace('-', ' ')} does not accept "${fileName || ext}" as input.`);
        speakAnnouncement(`Incompatible connection type.`);
      }
      return false;
    }

    const currentInputsCount = targetOp.inputIds.length;
    const isMultiInputTool = ['merge-pdf', 'image-to-pdf'].includes(targetOp.toolId);
    const maxAllowed = isMultiInputTool ? (validation.maxInputs || 50) : 50;

    if (currentInputsCount >= maxAllowed) {
      if (!silent) {
        showToast(`Limit reached: ${targetOp.toolId.replace('-', ' ')} accepts at most ${maxAllowed} input files.`);
      }
      return false;
    }

    return true;
  };

  // Accessibility (A11y) Navigation and Announcement States
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const speakAnnouncement = (text) => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(text), 50);
  };

  // Command bar States
  const [commandInput, setCommandInput] = useState('');
  const commandTextareaRef = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Thinking...');
  const [showCommandsMenu, setShowCommandsMenu] = useState(false);

  // Auto-adjust command textarea height up to 160px with invisible scroller (Gemini / ChatGPT style)
  useEffect(() => {
    const el = commandTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 160;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, maxHeight)}px`;
  }, [commandInput]);

  // File Picker Ref
  const fileInputRef = useRef(null);

  // Execution cancellation tracking
  const activeAbortControllers = useRef({});
  const EXECUTION_TIMEOUT_MS = 90000; // 90 seconds max per operator

  // Undo/Redo Stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const pushHistoryState = () => {
    const snapshot = {
      workspaceQueue: workspaceQueue.map(item => ({ ...item })),
      operations: operations.map(op => ({ ...op, inputIds: [...op.inputIds], params: { ...op.params } }))
    };
    if (undoStack.current.length >= 5) {
      undoStack.current.shift();
    }
    undoStack.current.push(snapshot);
    redoStack.current = [];
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) {
      return;
    }
    const snapshot = undoStack.current.pop();
    const currentSnapshot = {
      workspaceQueue: workspaceQueue.map(item => ({ ...item })),
      operations: operations.map(op => ({ ...op, inputIds: [...op.inputIds], params: { ...op.params } }))
    };
    redoStack.current.push(currentSnapshot);
    setWorkspaceQueue(snapshot.workspaceQueue);
    setOperations(snapshot.operations);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) {
      return;
    }
    const snapshot = redoStack.current.pop();
    const currentSnapshot = {
      workspaceQueue: workspaceQueue.map(item => ({ ...item })),
      operations: operations.map(op => ({ ...op, inputIds: [...op.inputIds], params: { ...op.params } }))
    };
    undoStack.current.push(currentSnapshot);
    setWorkspaceQueue(snapshot.workspaceQueue);
    setOperations(snapshot.operations);
  };

  // Keyboard undo/redo and deletion shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.composedPath ? e.composedPath().some(el => el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName)) : (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      );
      if (isInput) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        setSelectedNodeIds([
          ...workspaceQueue.map(item => item.id),
          ...operations.map(op => op.id)
        ]);
        speakAnnouncement('Selected all canvas nodes.');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const targetsToDelete = selectedNodeIds.length > 0 ? selectedNodeIds : (focusedNodeId ? [focusedNodeId] : []);
        if (targetsToDelete.length > 0) {
          e.preventDefault();
          pushHistoryState();
          
          const opsToDelete = targetsToDelete.filter(id => id.startsWith('op-'));
          const filesToDelete = targetsToDelete.filter(id => !id.startsWith('op-'));
          
          if (opsToDelete.length > 0) {
            setOperations(prev => prev.filter(o => !opsToDelete.includes(o.id)));
          }
          if (filesToDelete.length > 0) {
            setWorkspaceQueue(prev => prev.filter(q => !filesToDelete.includes(q.id)));
            setOperations(prev => prev.map(op => {
              const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
              const remainingIds = outIds.filter(id => !filesToDelete.includes(id));
              if (remainingIds.length === 0 && outIds.length > 0) {
                return {
                  ...op,
                  outputId: null,
                  outputIds: [],
                  status: 'idle',
                  progress: 0
                };
              }
              return {
                ...op,
                outputId: remainingIds[remainingIds.length - 1] || null,
                outputIds: remainingIds
              };
            }));
          }
          
          setOperations(prev => prev.map(op => {
            const inputIds = op.inputIds.filter(id => !targetsToDelete.includes(id));
            return { ...op, inputIds };
          }));
          
          speakAnnouncement(`Deleted selected nodes.`);
          setSelectedNodeIds([]);
          setFocusedNodeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaceQueue, operations, selectedNodeIds, focusedNodeId]);

  // Clarification Modal Escape key listener
  useEffect(() => {
    if (!clarificationPrompt) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clarificationPrompt.resolve(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clarificationPrompt]);

  // IndexedDB Auto-save & Restore State
  const isStateLoadedRef = useRef(false);

  useEffect(() => {
    async function restoreState() {
      try {
        const saved = await loadCanvasState();
        if (saved) {
          const deserializedQueue = saved.workspaceQueue.map(item => {
            const deserializedItem = { ...item };
            if (item.fileBuffer) {
              deserializedItem.file = new File([item.fileBuffer], item.fileName, { type: item.fileType });
              delete deserializedItem.fileBuffer;
            }
            if (item.resultBlobBuffer) {
              deserializedItem.resultBlob = new Blob([item.resultBlobBuffer], { type: item.resultBlobType });
              delete deserializedItem.resultBlobBuffer;
            }
            return deserializedItem;
          });
          setWorkspaceQueue(deserializedQueue);
          
          // Reset processing nodes to idle to prevent UI hang on page reload/crash
          const sanitizedOps = (saved.operations || []).map(op => {
            if (op.status === 'processing') {
              return { ...op, status: 'idle', progress: 0 };
            }
            return op;
          });
          setOperations(sanitizedOps);
          setPanOffset(saved.panOffset || { x: 0, y: 0 });
          setZoom(saved.zoom || 1.0);
          if (saved.autoFitViewport !== undefined) {
            setAutoFitViewport(saved.autoFitViewport);
          }
        }

        // Check if a shared workflow flow parameter is passed in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const flowHash = urlParams.get('flow');
        if (flowHash) {
          const decodedOps = decodeFlowFromUrl(flowHash);
          if (decodedOps && decodedOps.length > 0) {
            setOperations(decodedOps);
            showToast('Loaded shared DAG workflow from link!', 'success');
          }
        }
      } catch (err) {
        console.error('Failed to restore canvas state:', err);
      } finally {
        isStateLoadedRef.current = true;
      }
    }
    restoreState();
  }, []);

  // Structural topology hash — gates IndexedDB writes strictly to node additions, moves, parameter edits,
  // permanently decoupling storage serialization from runtime op.progress (0-100%) ticks.
  const structuralTopologyHash = useMemo(() => {
    return computeStructuralTopologyHash(workspaceQueue, operations, panOffset, zoom, autoFitViewport);
  }, [workspaceQueue, operations, panOffset, zoom, autoFitViewport]);

  const lastSavedTopologyRef = useRef('');

  useEffect(() => {
    if (!isStateLoadedRef.current) return;
    if (structuralTopologyHash === lastSavedTopologyRef.current) return;
    
    const handler = setTimeout(async () => {
      lastSavedTopologyRef.current = structuralTopologyHash;
      const stateToSave = {
        workspaceQueue,
        operations,
        panOffset,
        zoom,
        autoFitViewport
      };

      try {
        await saveCanvasState(stateToSave);
      } catch (err) {
        console.error('Failed to auto-save canvas:', err);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [structuralTopologyHash, workspaceQueue, operations, panOffset, zoom, autoFitViewport]);


  // Quick Action Tools depending on active file type (supporting operator outputs for chaining)
  const activeFileType = useMemo(() => {
    if (selectedNodeIds.length === 0) return null;

    // Check if the selection is a single operator node
    if (selectedNodeIds.length === 1 && selectedNodeIds[0].startsWith('op-')) {
      const op = operations.find(o => o.id === selectedNodeIds[0]);
      if (op) {
        const opTool = op.toolId;
        // PDF outputting tools
        if ([
          'merge-pdf', 'compress-pdf', 'rotate-pdf', 'add-watermark', 
          'add-page-numbers', 'protect-pdf', 'docx-to-pdf', 'image-to-pdf', 
          'text-to-pdf', 'ocr-pdf', 'edit-pdf', 'pdf-forms', 'unlock-pdf', 'sign-pdf', 'redact-pdf'
        ].includes(opTool)) {
          return 'pdf';
        }
        // Image outputting tools
        if (['image-compressor', 'image-converter', 'image-resizer', 'pdf-to-image'].includes(opTool)) {
          return 'image';
        }
        return 'other';
      }
    }

    if (selectedNodeIds.length > 1) {
      // Check if all selected items are PDFs (or operators outputting PDF)
      const allPdf = selectedNodeIds.every(id => {
        if (id.startsWith('op-')) {
          const op = operations.find(o => o.id === id);
          return op && [
            'merge-pdf', 'compress-pdf', 'rotate-pdf', 'add-watermark', 
            'add-page-numbers', 'protect-pdf', 'docx-to-pdf', 'image-to-pdf', 
            'text-to-pdf', 'ocr-pdf', 'edit-pdf', 'pdf-forms', 'unlock-pdf', 'sign-pdf', 'redact-pdf'
          ].includes(op.toolId);
        }
        const item = workspaceQueue.find(q => q.id === id);
        return item && item.name.toLowerCase().endsWith('.pdf');
      });
      if (allPdf) return 'multi-pdf';

      const allImages = selectedNodeIds.every(id => {
        if (id.startsWith('op-')) {
          const op = operations.find(o => o.id === id);
          return op && ['image-compressor', 'image-converter', 'image-resizer', 'pdf-to-image'].includes(op.toolId);
        }
        const item = workspaceQueue.find(q => q.id === id);
        if (!item) return false;
        const ext = item.name.split('.').pop().toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext);
      });
      if (allImages) return 'multi-image';

      return 'mixed';
    }

    const item = workspaceQueue.find(q => q.id === selectedNodeIds[0]);
    if (!item) return null;
    const ext = item.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) return 'image';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'txt' || ext === 'md') return 'text';
    return 'other';
  }, [selectedNodeIds, workspaceQueue, operations]);

  const selectedCompletedFiles = useMemo(() => {
    return workspaceQueue.filter(item => selectedNodeIds.includes(item.id) && item.status === 'Completed' && item.resultBlob);
  }, [workspaceQueue, selectedNodeIds]);

  // Track and update port positions on render/node repositioning
  useEffect(() => {
    const updatePorts = () => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const coords = {};
      
      // Document nodes ports
      workspaceQueue.forEach(item => {
        const nodeEl = document.getElementById(`node-${item.id}`);
        if (nodeEl) {
          const rect = nodeEl.getBoundingClientRect();
          
          // Calculate ports in canvas coordinate space
          const inputX = (rect.left - canvasRect.left - panOffset.x) / zoom;
          const inputY = (rect.top + rect.height / 2 - canvasRect.top - panOffset.y) / zoom;
          
          const outputX = (rect.right - canvasRect.left - panOffset.x) / zoom;
          const outputY = (rect.top + rect.height / 2 - canvasRect.top - panOffset.y) / zoom;
          
          coords[item.id] = {
            input: { x: inputX, y: inputY },
            output: { x: outputX, y: outputY }
          };
        }
      });

      // Operator nodes ports
      operations.forEach(op => {
        const opEl = document.getElementById(`op-node-${op.id}`);
        if (opEl) {
          const rect = opEl.getBoundingClientRect();
          
          const inputX = (rect.left - canvasRect.left - panOffset.x) / zoom;
          const inputY = (rect.top + rect.height / 2 - canvasRect.top - panOffset.y) / zoom;
          
          const outputX = (rect.right - canvasRect.left - panOffset.x) / zoom;
          const outputY = (rect.top + rect.height / 2 - canvasRect.top - panOffset.y) / zoom;

          const isConditionRouter = op.toolId === 'condition-router';
          const trueY = (rect.top + rect.height * 0.32 - canvasRect.top - panOffset.y) / zoom;
          const falseY = (rect.top + rect.height * 0.68 - canvasRect.top - panOffset.y) / zoom;
          
          coords[op.id] = {
            input: { x: inputX, y: inputY },
            output: { x: outputX, y: outputY },
            'output-true': { x: outputX, y: isConditionRouter ? trueY : outputY },
            'output-false': { x: outputX, y: isConditionRouter ? falseY : outputY }
          };
        }
      });

      setPortCoords(coords);
    };

    updatePorts();
    // Re-run on layout-affecting state changes
    const timeout = setTimeout(updatePorts, 50);
    return () => clearTimeout(timeout);
  }, [workspaceQueue, operations, zoom, panOffset]);

  // Center canvas on mount if files exist
  useEffect(() => {
    if (workspaceQueue.length > 0 && panOffset.x === 0 && panOffset.y === 0) {
      handleFitToView();
    }
  }, [workspaceQueue.length]);

  // Window-level Pointer Listeners for Cable dragging to prevent stuck or floating lines
  useEffect(() => {
    if (!draggingCable) return;

    const handleWindowPointerMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - panOffset.x) / zoom;
      const currentY = (e.clientY - rect.top - panOffset.y) / zoom;
      setDraggingCable(prev => prev ? { ...prev, currentX, currentY } : null);
    };

    const handleWindowPointerUp = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = (e.clientX - rect.left - panOffset.x) / zoom;
      const dropY = (e.clientY - rect.top - panOffset.y) / zoom;

      // Find target operator card bounding box (expanded dimensions for settings inputs)
      const targetOp = operations.find(op => isPointInOperatorDropTarget(op, dropX, dropY));

      if (targetOp) {
        if (targetOp.id !== draggingCable.fromId) {
          if (validateConnection(draggingCable.fromId, targetOp.id)) {
            pushHistoryState();
            setOperations(prev => prev.map(o => {
              if (o.id === targetOp.id) {
                const inputIds = o.inputIds.includes(draggingCable.fromId)
                  ? o.inputIds
                  : [...o.inputIds, draggingCable.fromId];
                const inputPortMap = {
                  ...(o.inputPortMap || {}),
                  [draggingCable.fromId]: draggingCable.type || 'output'
                };
                return { ...o, inputIds, inputPortMap };
              }
              return o;
            }));
          }
        }
      }
      setDraggingCable(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [draggingCable, operations, zoom, panOffset]);

  // Keyboard listener for shortcuts

  // Format Helper
  const getFileBadge = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'docx':
      case 'doc':
        return { label: 'W', bg: 'bg-blue-600', text: 'text-white' };
      case 'pdf':
        return { label: 'PDF', bg: 'bg-red-600', text: 'text-white' };
      case 'md':
        return { label: 'MD', bg: 'bg-teal-600', text: 'text-white' };
      case 'txt':
        return { label: 'TXT', bg: 'bg-gray-600', text: 'text-white' };
      default:
        return { label: ext.toUpperCase(), bg: 'bg-purple-600', text: 'text-white' };
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Imperative wheel event listener to handle touchpad pinch zoom vs two-finger pan
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheelEvent = (e) => {
      e.preventDefault(); // Unconditionally block browser-level page zoom and page scrolling

      if (e.ctrlKey) {
        // Pinch-to-zoom gesture (or Ctrl + mouse wheel)
        const zoomFactor = 0.03;
        const newZoom = Math.min(2.0, Math.max(0.05, zoom + (e.deltaY < 0 ? zoomFactor : -zoomFactor)));
        
        // Zoom relative to current cursor coordinate
        const rect = canvasEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - panOffset.x) / zoom;
        const canvasY = (mouseY - panOffset.y) / zoom;
        
        setZoom(parseFloat(newZoom.toFixed(2)));
        setPanOffset({
          x: mouseX - canvasX * newZoom,
          y: mouseY - canvasY * newZoom
        });
      } else {
        // Two-finger scroll (pan gesture) or normal mouse wheel scroll
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    canvasEl.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', handleWheelEvent);
    };
  }, [zoom, panOffset]);

  // Spatial / Directional keyboard focus navigation (A11y)
  const navigateFocusDirection = (direction) => {
    const allNodes = [
      ...workspaceQueue.map(item => ({ id: item.id, x: item.x || 100, y: item.y || 100, name: item.name, type: 'document' })),
      ...operations.map(op => ({ id: op.id, x: op.x || 100, y: op.y || 100, name: op.toolId, type: 'operator' }))
    ];
    if (allNodes.length === 0) return;

    const currentFocused = allNodes.find(n => n.id === focusedNodeId) || allNodes[0];
    if (!focusedNodeId) {
      setFocusedNodeId(currentFocused.id);
      const el = document.getElementById(currentFocused.type === 'operator' ? `op-node-${currentFocused.id}` : `node-${currentFocused.id}`);
      if (el) el.focus();
      return;
    }

    let bestNode = null;
    let minScore = Infinity;

    allNodes.forEach(node => {
      if (node.id === currentFocused.id) return;

      const dx = node.x - currentFocused.x;
      const dy = node.y - currentFocused.y;

      let isValid = false;
      let score = Infinity;

      if (direction === 'ArrowLeft' && dx < -10) {
        isValid = true;
        score = Math.abs(dx) + Math.abs(dy) * 1.5;
      } else if (direction === 'ArrowRight' && dx > 10) {
        isValid = true;
        score = Math.abs(dx) + Math.abs(dy) * 1.5;
      } else if (direction === 'ArrowUp' && dy < -10) {
        isValid = true;
        score = Math.abs(dy) + Math.abs(dx) * 1.5;
      } else if (direction === 'ArrowDown' && dy > 10) {
        isValid = true;
        score = Math.abs(dy) + Math.abs(dx) * 1.5;
      }

      if (isValid && score < minScore) {
        minScore = score;
        bestNode = node;
      }
    });

    if (bestNode) {
      setFocusedNodeId(bestNode.id);
      const el = document.getElementById(bestNode.type === 'operator' ? `op-node-${bestNode.id}` : `node-${bestNode.id}`);
      if (el) el.focus();
      const friendlyName = bestNode.name.replace('-', ' ');
      speakAnnouncement(`Focused ${bestNode.type} node: ${friendlyName}.`);
    }
  };

  const handleCanvasKeyDown = (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      navigateFocusDirection(e.key);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (focusedNodeId) {
        setSelectedNodeIds(prev => {
          const isSel = prev.includes(focusedNodeId);
          const nextSel = isSel ? prev.filter(id => id !== focusedNodeId) : [...prev, focusedNodeId];
          const nodeName = workspaceQueue.find(q => q.id === focusedNodeId)?.name || operations.find(o => o.id === focusedNodeId)?.toolId || 'node';
          speakAnnouncement(`${isSel ? 'Deselected' : 'Selected'} ${nodeName.replace('-', ' ')}.`);
          return nextSel;
        });
      }
    } else if (e.key.toLowerCase() === 'c') {
      if (selectedNodeIds.length > 0 && focusedNodeId && focusedNodeId !== selectedNodeIds[0]) {
        const targetOp = operations.find(o => o.id === focusedNodeId);
        const sourceId = selectedNodeIds[0];
        
        if (targetOp) {
          if (validateConnection(sourceId, targetOp.id)) {
            pushHistoryState();
            setOperations(prev => prev.map(o => {
              if (o.id === targetOp.id) {
                const inputIds = o.inputIds.includes(sourceId)
                  ? o.inputIds
                  : [...o.inputIds, sourceId];
                return { ...o, inputIds };
              }
              return o;
            }));
          }
        }
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      setSelectedNodeIds([
        ...workspaceQueue.map(item => item.id),
        ...operations.map(op => op.id)
      ]);
      speakAnnouncement('Selected all canvas nodes.');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const targetsToDelete = selectedNodeIds.length > 0 ? selectedNodeIds : (focusedNodeId ? [focusedNodeId] : []);
      if (targetsToDelete.length > 0) {
        e.preventDefault();
        pushHistoryState();
        
        const opsToDelete = targetsToDelete.filter(id => id.startsWith('op-'));
        const filesToDelete = targetsToDelete.filter(id => !id.startsWith('op-'));
        
        if (opsToDelete.length > 0) {
          setOperations(prev => prev.filter(o => !opsToDelete.includes(o.id)));
        }
        if (filesToDelete.length > 0) {
          setWorkspaceQueue(prev => prev.filter(q => !filesToDelete.includes(q.id)));
          setOperations(prev => prev.map(op => {
            const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
            const remainingIds = outIds.filter(id => !filesToDelete.includes(id));
            if (remainingIds.length === 0 && outIds.length > 0) {
              return {
                ...op,
                outputId: null,
                outputIds: [],
                status: 'idle',
                progress: 0
              };
            }
            return {
              ...op,
              outputId: remainingIds[remainingIds.length - 1] || null,
              outputIds: remainingIds
            };
          }));
        }
        
        setOperations(prev => prev.map(op => {
          const inputIds = op.inputIds.filter(id => !targetsToDelete.includes(id));
          return { ...op, inputIds };
        }));
        
        speakAnnouncement(`Deleted selected nodes.`);
        setSelectedNodeIds([]);
        setFocusedNodeId(null);
      }
    }
  };

  const handlePointerDown = (e) => {
    // If clicking on empty canvas background (or middle mouse):
    if (e.target === canvasRef.current || e.target.classList.contains('stitch-dot-grid') || e.target.classList.contains('stitch-dot-grid-glow') || e.button === 1) {
      if ((e.shiftKey || e.metaKey) && e.button !== 1) {
        // Shift + Drag = Box / Marquee Selection
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = (e.clientX - rect.left - panOffset.x) / zoom;
        const startY = (e.clientY - rect.top - panOffset.y) / zoom;
        selectionStartRef.current = { x: startX, y: startY };
        hasDraggedRef.current = false;
        setSelectionBox({
          startX,
          startY,
          currentX: startX,
          currentY: startY
        });
        e.target.setPointerCapture(e.pointerId);
      } else {
        // Direct Viewport Pan (drag anywhere on empty canvas)
        setIsPanning(true);
        panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
        hasDraggedRef.current = false;
        if (!e.shiftKey && !e.metaKey && e.button !== 1) {
          setSelectedNodeIds([]);
        }
        e.target.setPointerCapture(e.pointerId);
      }
    }
  };

  const handleStartCableDrag = (e, fromId, type) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const fromX = (e.clientX - rect.left - panOffset.x) / zoom;
    const fromY = (e.clientY - rect.top - panOffset.y) / zoom;
    
    setDraggingCable({
      fromId,
      type,
      currentX: fromX,
      currentY: fromY
    });
  };

  const handlePointerLeave = () => {
    if (canvasRef.current) {
      const glowEl = canvasRef.current.querySelector('.stitch-dot-grid-glow');
      if (glowEl) {
        glowEl.style.opacity = '0';
      }
    }
    if (mouseStillTimeoutRef.current) {
      clearTimeout(mouseStillTimeoutRef.current);
    }
  };

  const handlePointerMove = (e) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const glowEl = canvasRef.current.querySelector('.stitch-dot-grid-glow');
      if (glowEl) {
        const maskVal = `radial-gradient(circle 160px at ${x}px ${y}px, black 20%, transparent 80%)`;
        glowEl.style.webkitMaskImage = maskVal;
        glowEl.style.maskImage = maskVal;
        glowEl.style.opacity = '1';

        if (mouseStillTimeoutRef.current) {
          clearTimeout(mouseStillTimeoutRef.current);
        }
        mouseStillTimeoutRef.current = setTimeout(() => {
          glowEl.style.opacity = '0';
        }, 1000);
      }
    }

    if (isPanning) {
      const newX = e.clientX - panStart.current.x;
      const newY = e.clientY - panStart.current.y;
      if (Math.abs(newX - panOffset.x) > 3 || Math.abs(newY - panOffset.y) > 3) {
        hasDraggedRef.current = true;
      }
      setPanOffset({
        x: newX,
        y: newY
      });
    } else if (draggingNodeId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - panOffset.x) / zoom - dragStartOffset.current.x;
      const y = (e.clientY - rect.top - panOffset.y) / zoom - dragStartOffset.current.y;
      
      setWorkspaceQueue(prev => prev.map(item => 
        item.id === draggingNodeId ? { ...item, x, y } : item
      ));

      setOperations(prev => prev.map(op => 
        op.id === draggingNodeId ? { ...op, x, y } : op
      ));
    } else if (selectionBox && selectionStartRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - panOffset.x) / zoom;
      const currentY = (e.clientY - rect.top - panOffset.y) / zoom;
      
      const dx = Math.abs(currentX - selectionStartRef.current.x);
      const dy = Math.abs(currentY - selectionStartRef.current.y);
      if (dx > 4 || dy > 4) {
        hasDraggedRef.current = true;
      }

      setSelectionBox(prev => prev ? {
        ...prev,
        currentX,
        currentY
      } : null);
      
      const startX = selectionStartRef.current.x;
      const startY = selectionStartRef.current.y;
      const x1 = Math.min(startX, currentX);
      const x2 = Math.max(startX, currentX);
      const y1 = Math.min(startY, currentY);
      const y2 = Math.max(startY, currentY);
      
      const newlySelectedNodeIds = [];
      
      for (const f of workspaceQueue) {
        const nodeX = f.x || 100;
        const nodeY = f.y || 100;
        if (nodeX + 220 >= x1 && nodeX <= x2 && nodeY + 130 >= y1 && nodeY <= y2) {
          newlySelectedNodeIds.push(f.id);
        }
      }
      
      for (const op of operations) {
        const nodeX = op.x || 100;
        const nodeY = op.y || 100;
        if (nodeX + 220 >= x1 && nodeX <= x2 && nodeY + 140 >= y1 && nodeY <= y2) {
          newlySelectedNodeIds.push(op.id);
        }
      }
      
      if (e.shiftKey || e.metaKey) {
        setSelectedNodeIds(prev => Array.from(new Set([...prev, ...newlySelectedNodeIds])));
      } else {
        setSelectedNodeIds(newlySelectedNodeIds);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      e.target.releasePointerCapture(e.pointerId);
    }
    if (selectionBox) {
      setSelectionBox(null);
      selectionStartRef.current = null;
      e.target.releasePointerCapture(e.pointerId);
    }
    if (draggingNodeId) {
      if (autoFitViewport) {
        handleFitToView();
      }
      setDraggingNodeId(null);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(2.0, parseFloat((z + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoom(z => Math.max(0.05, parseFloat((z - 0.1).toFixed(2))));
  const handleZoomReset = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate box enclosing all nodes and fit viewport within safe (non-overlayed) canvas area
  const handleFitToView = (customQueue, customOps, instant = false) => {
    const q = Array.isArray(customQueue) ? customQueue : workspaceQueue;
    const ops = Array.isArray(customOps) ? customOps : operations;
    if (!Array.isArray(q) || !Array.isArray(ops)) return;
    if (q.length === 0 && ops.length === 0) return;
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    q.forEach(item => {
      const x = typeof item.x === 'number' ? item.x : 100;
      const y = typeof item.y === 'number' ? item.y : 100;
      // Query physical DOM dimensions if mounted or fallback to default card width (220px) and height (150px)
      const el = typeof document !== 'undefined' ? document.getElementById(`node-${item.id}`) : null;
      const w = el ? el.offsetWidth : 220;
      const h = el ? el.offsetHeight : 150;
      
      const left = x - 8;
      const right = x + w + 8;
      const top = y - 8;
      const bottom = y + h + 8;

      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    });

    ops.forEach(op => {
      const x = typeof op.x === 'number' ? op.x : 100;
      const y = typeof op.y === 'number' ? op.y : 100;
      // Query physical DOM dimensions if mounted or fallback to default operator card width (260px) and height (240px)
      const el = typeof document !== 'undefined' ? document.getElementById(`op-node-${op.id}`) : null;
      const w = el ? el.offsetWidth : 260;
      const h = el ? el.offsetHeight : 240;
      const topExtra = op.status === 'processing' ? 36 : 8;

      const left = x - 8;
      const right = x + w + 8;
      const top = y - topExtra;
      const bottom = y + h + 8;

      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    });

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return;

    const clusterWidth = maxX - minX;
    const clusterHeight = maxY - minY;
    const clusterCenterX = minX + clusterWidth / 2;
    const clusterCenterY = minY + clusterHeight / 2;

    const rect = canvasRef.current?.getBoundingClientRect();
    const canvasW = rect?.width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const canvasH = rect?.height || (typeof window !== 'undefined' ? window.innerHeight : 800);

    // Overlay Safe Insets: guarantee nodes are NEVER occluded by floating UI widgets
    // Top Studio Navbar: height ~44px + top-4 (16px) => safe top inset 80px
    const insetTop = 80;
    // Bottom Stitch Chat Command Input Bar + Zoom Dock + Activity Logs: safe bottom inset 112px
    const insetBottom = 112;
    // Left Quick Action bar: safe left inset 68px
    const insetLeft = 68;
    // Right Vertical Tool Palette: safe right inset 80px
    const insetRight = 80;

    const safeW = Math.max(120, canvasW - insetLeft - insetRight);
    const safeH = Math.max(120, canvasH - insetTop - insetBottom);

    const safeCenterX = insetLeft + safeW / 2;
    const safeCenterY = insetTop + safeH / 2;

    // Buffer margin around the entire cluster of cards
    const margin = 32;
    const totalPaddedW = clusterWidth + margin * 2;
    const totalPaddedH = clusterHeight + margin * 2;

    // Scale calculation: allow scaling down as far as needed (down to 0.05 / 5%) so cards NEVER get cropped or overlayed
    const fitZoom = Math.min(
      safeW / Math.max(totalPaddedW, 50),
      safeH / Math.max(totalPaddedH, 50)
    );

    // Bound zoom between 0.05 (for massive spread-out canvases) and 1.0 (so small clusters are not overscaled)
    const targetZoom = Math.max(0.05, Math.min(1.0, fitZoom));

    // Target pan offsets so cluster center aligns precisely with the unobstructed safe viewport center
    const targetPx = Math.round(safeCenterX - clusterCenterX * targetZoom);
    const targetPy = Math.round(safeCenterY - clusterCenterY * targetZoom);

    // Smooth animation if interactive, or immediate update if instant
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function' && !instant) {
      const startZoom = zoom;
      const startPx = panOffset.x;
      const startPy = panOffset.y;
      
      const animTarget = { z: startZoom, x: startPx, y: startPy };
      anime({
        targets: animTarget,
        z: targetZoom,
        x: targetPx,
        y: targetPy,
        duration: 320,
        easing: 'easeOutQuart',
        update: () => {
          setZoom(parseFloat(animTarget.z.toFixed(3)));
          setPanOffset({ x: Math.round(animTarget.x), y: Math.round(animTarget.y) });
        }
      });
    } else {
      setZoom(parseFloat(targetZoom.toFixed(3)));
      setPanOffset({ x: targetPx, y: targetPy });
    }
  };

  // Node Drag Trigger
  const handleNodeDragStart = (e, nodeId, item) => {
    e.stopPropagation();
    
    // If not already selected, clear selection and select this node
    if (!selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds([nodeId]);
    }

    setDraggingNodeId(nodeId);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const nodeX = item.x || 100;
    const nodeY = item.y || 100;

    // Record cursor position relative to the node top-left corner
    const clickX = (e.clientX - rect.left - panOffset.x) / zoom;
    const clickY = (e.clientY - rect.top - panOffset.y) / zoom;

    dragStartOffset.current = {
      x: clickX - nodeX,
      y: clickY - nodeY
    };
  };

  // Select / Multi-Select Handlers
  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();

    if (e.shiftKey || e.metaKey) {
      if (selectedNodeIds.includes(nodeId)) {
        setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
      } else {
        setSelectedNodeIds(prev => [...prev, nodeId]);
      }
    } else {
      setSelectedNodeIds([nodeId]);
    }
  };

  const handleCanvasClick = (e) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (e.target === canvasRef.current || e.target.classList.contains('stitch-dot-grid') || e.target.classList.contains('stitch-dot-grid-glow')) {
      setSelectedNodeIds([]);
      setFocusedNodeId(null);
    }
  };

  // Execution Helpers
  const getNonCollidingCoords = (initialX, initialY, extraNodes = []) => {
    let opX = initialX;
    let opY = initialY;
    let collision = true;
    let iterations = 0;
    
    const allExistingNodes = [
      ...workspaceQueue,
      ...operations,
      ...extraNodes
    ];
    
    while (collision && iterations < 100) {
      collision = false;
      iterations++;
      
      for (const node of allExistingNodes) {
        const dx = Math.abs((node.x || 100) - opX);
        const dy = Math.abs((node.y || 100) - opY);
        if (dx < 250 && dy < 150) {
          collision = true;
          break;
        }
      }
      if (collision) {
        opY += 160; // Shift down
      }
    }
    return { x: opX, y: opY };
  };

  const createOutputPlaceholderNode = (name, x, y, ancestry = []) => {
    const outputId = `ws-out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const getMimeType = (fileName) => {
      const ext = fileName.split('.').pop().toLowerCase();
      const map = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        bmp: 'image/bmp',
        zip: 'application/zip',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        md: 'text/markdown',
      };
      return map[ext] || 'application/octet-stream';
    };

    const { x: safeX, y: safeY } = getNonCollidingCoords(x + 260, y);

    const placeholder = {
      id: outputId,
      name,
      size: 0,
      type: getMimeType(name),
      status: 'Processing',
      progress: 0,
      resultBlob: null,
      resultName: null,
      timestamp: Date.now(),
      x: safeX,
      y: safeY,
      ancestry: ancestry && ancestry.length > 0 ? [...ancestry, outputId] : [outputId]
    };

    setWorkspaceQueue(prev => [...prev, placeholder]);
    addActiveNodes(outputId);
    return outputId;
  };

  const createCompletedOutputNode = (name, x, y, blob, allocatedPositions = [], ancestry = [], pageRange = null) => {
    const outputId = `ws-out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const getMimeType = (fileName) => {
      const ext = (fileName || '').split('.').pop().toLowerCase();
      const map = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        bmp: 'image/bmp',
        zip: 'application/zip',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        md: 'text/markdown',
      };
      return map[ext] || 'application/octet-stream';
    };

    const currentQueue = workspaceQueueRef.current || workspaceQueue || [];
    const currentOps = operationsRef.current || operations || [];
    const positionsList = Array.isArray(allocatedPositions) ? allocatedPositions : [];

    let safeX = x + 300;
    let safeY = y;
    let collision = true;
    let iterations = 0;
    
    while (collision && iterations < 100) {
      collision = false;
      iterations++;
      
      for (const node of [...currentQueue, ...currentOps]) {
        const dx = Math.abs((node.x || 100) - safeX);
        const dy = Math.abs((node.y || 100) - safeY);
        if (dx < 280 && dy < 180) {
          collision = true;
          break;
        }
      }
      
      if (!collision) {
        for (const pos of positionsList) {
          const dx = Math.abs(pos.x - safeX);
          const dy = Math.abs(pos.y - safeY);
          if (dx < 280 && dy < 180) {
            collision = true;
            break;
          }
        }
      }
      
      if (collision) {
        safeY += 180;
        if (safeY > y + 540) {
          safeX += 280;
          safeY = y;
        }
      }
    }

    positionsList.push({ x: safeX, y: safeY });

    const outputNode = {
      id: outputId,
      name,
      size: blob?.size || 0,
      type: getMimeType(name),
      status: 'Completed',
      progress: 100,
      resultBlob: blob,
      resultName: name,
      timestamp: Date.now(),
      x: safeX,
      y: safeY,
      completedAt: Date.now(),
      ancestry: ancestry && ancestry.length > 0 ? [...ancestry, outputId] : [outputId],
      pageRange
    };

    setWorkspaceQueue(prev => [...prev, outputNode]);
    addActiveNodes(outputId);
    return outputId;
  };

  const handleDisconnectCable = (fromId, toId) => {
    pushHistoryState();
    setOperations(prev => disconnectCableState(prev, fromId, toId));
  };

  const handleExportWorkflow = () => {
    try {
      if (operations.length === 0) {
        showToast('No tools on canvas to export.');
        return;
      }
      
      // Clean operations list, saving only layout positions, toolIds, parameters, and structural inputIds
      const workflowOps = operations.map(op => ({
        id: op.id,
        toolId: op.toolId,
        x: op.x,
        y: op.y,
        params: op.params,
        inputIds: op.inputIds.filter(id => id.startsWith('op-')) // Preserves internal operator-to-operator lines, removes raw files
      }));

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workflowOps, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `docscalar_workflow_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast('Workflow exported successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to export workflow.');
    }
  };

  const handleImportWorkflow = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedOps = JSON.parse(event.target.result);
        if (!Array.isArray(importedOps)) {
          throw new Error('Invalid workflow format.');
        }

        // Validate structure of imported operations
        const validatedOps = importedOps.map(op => {
          if (!op.id || !op.toolId) {
            throw new Error('Invalid operator node in template.');
          }
          return {
            id: op.id,
            toolId: op.toolId,
            x: op.x || 100,
            y: op.y || 100,
            params: op.params || {},
            inputIds: op.inputIds || [],
            outputId: null,
            outputIds: [],
            status: 'idle',
            progress: 0
          };
        });

        pushHistoryState();
        setOperations(validatedOps);
        showToast('Workflow imported successfully!');
      } catch (err) {
        console.error(err);
        showToast('Invalid workflow file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Core WASM Engines inside the Canvas Flow
  // Execute Core WASM Engines inside the Canvas Flow
  const handleTriggerAction = async (actionId, forcedNodeIds = null) => {
    const targetNodeIds = forcedNodeIds || selectedNodeIds;
    
    // Default Parameters based on Tool Category
    let defaultParams = {};
    if (actionId === 'compress-pdf') {
      defaultParams = { quality: 0.65, mode: 'lossless' };
    } else if (actionId === 'split-pdf') {
      defaultParams = { mode: 'all', range: '' };
    } else if (actionId === 'rotate-pdf') {
      defaultParams = { angle: 90 };
    } else if (actionId === 'add-watermark') {
      defaultParams = { text: 'CONFIDENTIAL', opacity: 0.5, angle: 45 };
    } else if (actionId === 'add-page-numbers') {
      defaultParams = { format: 'Page {n} of {total}', position: 'bottom-right' };
    } else if (actionId === 'protect-pdf') {
      defaultParams = { password: '', permissions: { print: true, copy: true, modify: false } };
    } else if (actionId === 'image-compressor') {
      defaultParams = { quality: 0.7 };
    } else if (actionId === 'image-converter') {
      defaultParams = { format: 'png' };
    } else if (actionId === 'image-resizer') {
      defaultParams = { percentage: 75, mode: 'percentage', width: 800, height: 600 };
    }

    if (targetNodeIds.length === 0) {
      // Spawn at center of the viewport
      const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
      const canvasHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;
      
      const rawX = (canvasWidth / 2 - panOffset.x) / zoom - 80;
      const rawY = (canvasHeight / 2 - panOffset.y) / zoom - 50;

      const { x: opX, y: opY } = getNonCollidingCoords(rawX, rawY);

      const opId = `op-${Date.now()}`;
      const newOp = {
        id: opId,
        toolId: actionId,
        inputIds: [],
        outputId: null,
        status: 'idle',
        progress: 0,
        x: opX,
        y: opY,
        params: defaultParams
      };
      
      pushHistoryState();
      setOperations(prev => [...prev, newOp]);
      speakAnnouncement(`Added ${actionId.replace('-', ' ')} operator to canvas.`);
      return opId;
    }
    
    // Find selected items (supporting both files in workspaceQueue and operators in operations)
    const items = [];
    for (const id of targetNodeIds) {
      if (id.startsWith('op-')) {
        const opNode = operations.find(o => o.id === id);
        if (opNode) {
          items.push({
            id: opNode.id,
            file: { name: opNode.toolId + '_output.pdf' },
            x: opNode.x,
            y: opNode.y
          });
        }
      } else {
        const fileNode = workspaceQueue.find(q => q.id === id);
        if (fileNode) {
          items.push(fileNode);
        }
      }
    }

    if (items.length === 0) return;

    // Filter selected items by compatibility based on TOOL_VALIDATION
    const validation = TOOL_VALIDATION[actionId];
    const compatibleItems = [];
    const incompatibleItems = [];

    if (validation && validation.accept.length > 0) {
      for (const item of items) {
        const fileName = item.file?.name || item.name || '';
        const ext = '.' + fileName.split('.').pop().toLowerCase();
        const isZipWildcard = ext === '.zip' && !['merge-pdf', 'image-to-pdf'].includes(actionId);
        
        const isValid = isZipWildcard || validation.accept.some(acc => {
          if (acc === 'image/*') {
            return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
          }
          return acc === ext;
        });
        
        if (isValid) {
          compatibleItems.push(item);
        } else {
          incompatibleItems.push(item);
        }
      }
    } else {
      compatibleItems.push(...items);
    }

    // Determine layout placement
    let opX, opY;
    if (compatibleItems.length === 0) {
      // Spawn at center of the viewport if no compatible files are connected
      const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
      const canvasHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;
      const rawX = (canvasWidth / 2 - panOffset.x) / zoom - 80;
      const rawY = (canvasHeight / 2 - panOffset.y) / zoom - 50;
      const coords = getNonCollidingCoords(rawX, rawY);
      opX = coords.x;
      opY = coords.y;
    } else {
      // Limit to maxInputs if exceeded
      if (validation && compatibleItems.length > validation.maxInputs) {
        showToast(`Notice: Spawning with first ${validation.maxInputs} compatible files.`);
        compatibleItems.splice(validation.maxInputs);
      }
      
      const maxX = Math.max(...compatibleItems.map(item => item.x || 100));
      const avgY = compatibleItems.reduce((acc, item) => acc + (item.y || 100), 0) / compatibleItems.length;
      const coords = getNonCollidingCoords(maxX + 260, avgY);
      opX = coords.x;
      opY = coords.y;
    }

    // Clear selection
    setSelectedNodeIds([]);

    // Spawn Operation Card in 'idle' state
    const opId = `op-${Date.now()}`;
    const newOp = {
      id: opId,
      toolId: actionId,
      inputIds: compatibleItems.map(i => i.id),
      outputId: null,
      status: 'idle',
      progress: 0,
      x: opX,
      y: opY,
      params: defaultParams
    };

    pushHistoryState();
    setOperations(prev => [...prev, newOp]);
    speakAnnouncement(`Added ${actionId.replace('-', ' ')} operator to canvas.`);

    if (compatibleItems.length === 0 && items.length > 0) {
      showToast(`Incompatible files selected. Spawning empty ${actionId.replace('-', ' ')} tool.`, 'warning');
    }

    return opId;
  };

  const applyWorkflowPreset = (preset) => {
    if (!preset || !preset.nodes) return;
    pushHistoryState();

    const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
    const canvasHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;
    const startX = (canvasWidth / 2 - panOffset.x) / zoom - (preset.nodes.length * 140);
    const startY = (canvasHeight / 2 - panOffset.y) / zoom - 50;

    const idMap = {};
    const spawnedOps = preset.nodes.map((n, idx) => {
      const newId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`;
      idMap[n.id] = newId;
      return {
        id: newId,
        toolId: n.toolId,
        params: n.params || {},
        x: Math.round(startX + idx * 280),
        y: Math.round(startY),
        inputIds: [],
        inputPortMap: {},
        outputId: null,
        status: 'idle',
        progress: 0
      };
    });

    // Wire internal connections between nodes
    (preset.connections || []).forEach(conn => {
      const fromRealId = idMap[conn.from];
      const toOp = spawnedOps.find(o => o.id === idMap[conn.to]);
      if (fromRealId && toOp) {
        toOp.inputIds.push(fromRealId);
        if (conn.fromPort) {
          toOp.inputPortMap[fromRealId] = conn.fromPort;
        }
      }
    });

    setOperations(prev => [...prev, ...spawnedOps]);
    setRecipesMenuOpen(false);
    showToast(`Loaded ${preset.name} blueprint! Connect your files to begin.`, 'success');
  };

  const handleShareFlow = () => {
    if (operations.length === 0) {
      showToast('Add tools to canvas before sharing workflow.', 'info');
      return;
    }
    const flowHash = encodeFlowToUrl(operations);
    const shareUrl = `${window.location.origin}/canvas?flow=${flowHash}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Shareable workflow link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link to clipboard', 'error');
    });
  };

  const handleSaveCustomFlow = () => {
    if (operations.length === 0) {
      showToast('Add tools to canvas before saving blueprint.', 'info');
      return;
    }
    const flowName = window.prompt('Enter blueprint name:', `Custom Workflow ${new Date().toLocaleDateString()}`);
    if (!flowName || !flowName.trim()) return;
    saveFlowToStorage(flowName.trim(), operations);
    setCustomFlows(loadSavedFlows());
    showToast(`Saved custom blueprint "${flowName.trim()}"!`, 'success');
  };

  const applyCustomFlow = (savedFlow) => {
    if (!savedFlow || !savedFlow.operations) return;
    pushHistoryState();
    const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
    const canvasHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;
    const startX = (canvasWidth / 2 - panOffset.x) / zoom - (savedFlow.operations.length * 140);
    const startY = (canvasHeight / 2 - panOffset.y) / zoom - 50;

    const spawnedOps = savedFlow.operations.map((n, idx) => {
      return {
        id: `op-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`,
        toolId: n.toolId,
        params: n.params || {},
        x: Math.round(startX + idx * 280),
        y: Math.round(startY),
        inputIds: [],
        inputPortMap: {},
        outputId: null,
        status: 'idle',
        progress: 0
      };
    });

    setOperations(prev => [...prev, ...spawnedOps]);
    setRecipesMenuOpen(false);
    showToast(`Loaded "${savedFlow.name}" blueprint!`, 'success');
  };

  // Click-to-connect handler for selected nodes to operator input port
  const handleConnectSelectedToOperator = (opId) => {
    if (selectedNodeIds.length === 0) {
      showToast('Select one or more files first, then click the port to connect them.');
      return;
    }
    
    const op = operations.find(o => o.id === opId);
    if (!op) return;
    
    const validIdsToConnect = [];
    
    selectedNodeIds.forEach(id => {
      if (validateConnection(id, opId)) {
        validIdsToConnect.push(id);
      }
    });
    
    if (validIdsToConnect.length === 0) return;
    
    pushHistoryState();
    setOperations(prev => prev.map(o => {
      if (o.id === opId) {
        const uniqueInputIds = Array.from(new Set([...o.inputIds, ...validIdsToConnect]));
        return { ...o, inputIds: uniqueInputIds };
      }
      return o;
    }));
    
    setSelectedNodeIds([]);
    showToast(`Connected ${validIdsToConnect.length} files to ${op.toolId.replace('-', ' ')}!`);
  };

  // Helper to update operator parameters
  const updateOperatorParams = (opId, newParams) => {
    setOperations(prev => prev.map(op => {
      if (op.id === opId) {
        return { ...op, params: { ...op.params, ...newParams } };
      }
      return op;
    }));
  };

  const handleStudioCommit = (finalParams) => {
    if (!activeStudio) return;
    const { opId } = activeStudio;
    
    // Synchronously compute updated operations array to eliminate stale closure race conditions
    const currentOps = operationsRef.current || operations;
    const updatedOps = currentOps.map(op => {
      if (op.id === opId) {
        return { ...op, params: finalParams };
      }
      return op;
    });
    setOperations(updatedOps);
    setActiveStudio(null);

    // Execute operator passing synchronously computed latestOps
    executeOperator(opId, null, updatedOps, true).catch(() => {});
  };

  // Execute Operator WASM logic on Run Click (supporting automated recursive pipeline execution)
  // Cancel a running operator execution
  const cancelOperator = (opId) => {
    const controller = activeAbortControllers.current[opId];
    if (controller) {
      controller.abort();
      delete activeAbortControllers.current[opId];
    }
    setOperations(prev => prev.map(o => o.id === opId ? { ...o, status: 'idle', progress: 0 } : o));
    // Also reset the output placeholder if it exists
    const op = operations.find(o => o.id === opId);
    if (op && op.outputId) {
      setWorkspaceQueue(prev => prev.filter(item => item.id !== op.outputId));
      setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputId: null } : o));
    }
    speakAnnouncement('Operation cancelled.');
    showToast('Operation cancelled.');
  };

  // Retry a failed operator execution
  const retryOperator = (opId) => {
    setOperations(prev => prev.map(o => o.id === opId ? { ...o, status: 'idle', progress: 0, error: null, telemetry: null } : o));
    // Remove the failed output node if it exists
    const op = operations.find(o => o.id === opId);
    if (op && op.outputId) {
      setWorkspaceQueue(prev => prev.filter(item => item.id !== op.outputId));
      setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputId: null } : o));
    }
  };
  const executeServerJob = async (file, actionId, params = {}, progressCb) => {
    progressCb(10, 'Uploading...');
    // Step 1: Upload input file to server
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: uploadFormData
    });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to upload file to backend server.');
    }
    const uploadData = await uploadRes.json();
    const { file_id, filename } = uploadData;
    progressCb(30, 'Queued...');

    // Handle any additional files (for merge-pdf, image-to-pdf)
    const uploadedFiles = [{ file_id, filename }];
    if (params.additionalFiles && Array.isArray(params.additionalFiles)) {
      for (const addFile of params.additionalFiles) {
        if (!addFile) continue;
        const addFormData = new FormData();
        addFormData.append('file', addFile);
        const addRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: addFormData
        });
        if (addRes.ok) {
          const addData = await addRes.json();
          uploadedFiles.push(addData);
        }
      }
    }

    // Step 2: Trigger specific conversion route
    let convertUrl = '/api/convert';
    const convertFormData = new FormData();
    convertFormData.append('file_id', file_id);
    convertFormData.append('filename', filename);

    if (actionId === 'ocr-pdf') {
      convertUrl = '/api/convert/ocr-pdf';
      convertFormData.append('language', params.language || 'eng');
    } else if (actionId === 'merge-pdf') {
      convertUrl = '/api/convert/merge-pdf';
      convertFormData.append('files_json', JSON.stringify(uploadedFiles));
    } else if (actionId === 'image-to-pdf') {
      convertUrl = '/api/convert/image-to-pdf';
      convertFormData.append('files_json', JSON.stringify(uploadedFiles));
    } else if (actionId === 'rotate-pdf') {
      convertUrl = '/api/convert/rotate-pdf';
      if (params.angle !== undefined) convertFormData.append('angle', String(params.angle));
      if (params.pages) convertFormData.append('pages', JSON.stringify(params.pages));
    } else if (actionId === 'crop-pdf') {
      convertUrl = '/api/convert/crop-pdf';
      if (params.crop_boxes) convertFormData.append('crop_boxes', JSON.stringify(params.crop_boxes));
      if (params.margin_top !== undefined) convertFormData.append('margin_top', String(params.margin_top));
      if (params.margin_bottom !== undefined) convertFormData.append('margin_bottom', String(params.margin_bottom));
      if (params.margin_left !== undefined) convertFormData.append('margin_left', String(params.margin_left));
      if (params.margin_right !== undefined) convertFormData.append('margin_right', String(params.margin_right));
    } else if (actionId === 'add-watermark') {
      convertUrl = '/api/convert/add-watermark';
      if (params.watermark_type) convertFormData.append('watermark_type', params.watermark_type);
      if (params.text) convertFormData.append('text', params.text);
      if (params.color) convertFormData.append('color', params.color);
      if (params.opacity !== undefined) convertFormData.append('opacity', String(params.opacity));
      if (params.font_size !== undefined) convertFormData.append('font_size', String(params.font_size));
      if (params.rotation !== undefined) convertFormData.append('rotation', String(params.rotation));
    } else if (actionId === 'add-page-numbers') {
      convertUrl = '/api/convert/add-page-numbers';
      if (params.format_str || params.format) convertFormData.append('format_str', params.format_str || params.format);
      if (params.position) convertFormData.append('position', params.position);
      if (params.font_size !== undefined) convertFormData.append('font_size', String(params.font_size));
      if (params.start_page || params.startNumber) convertFormData.append('start_page', String(params.start_page || params.startNumber));
      if (params.margin !== undefined) convertFormData.append('margin', String(params.margin));
      if (params.color) convertFormData.append('color', params.color);
    } else if (actionId === 'pdf-to-image') {
      convertUrl = '/api/convert/pdf-to-image';
      if (params.dpi) convertFormData.append('dpi', String(params.dpi));
      if (params.format) convertFormData.append('format', params.format);
      if (params.pages) convertFormData.append('pages', JSON.stringify(params.pages));
    } else if (actionId === 'extract-pages') {
      convertUrl = '/api/convert/extract-pages';
      if (params.pages) convertFormData.append('pages', JSON.stringify(params.pages));
    } else if (actionId === 'remove-pages') {
      convertUrl = '/api/convert/remove-pages';
      if (params.pages) convertFormData.append('pages', JSON.stringify(params.pages));
    } else if (actionId === 'split-pdf') {
      convertUrl = '/api/convert/split-pdf';
      let modeVal = params.mode || 'all';
      let rangeVal = params.range || '';
      let extraParamsVal = {};

      if (modeVal === 'parts') {
        const numParts = params.parts || 2;
        const totalPages = await getPdfPageCount(file);
        const interval = Math.ceil(totalPages / numParts);
        modeVal = 'equal-intervals';
        rangeVal = String(interval);
      } else if (modeVal === 'fixed-ranges') {
        rangeVal = String(params.pages_per_split || 2);
      } else if (modeVal === 'size-limit') {
        const mb = params.max_size_mb || 5;
        extraParamsVal = { max_bytes: mb * 1024 * 1024 };
      }

      convertFormData.append('mode', modeVal);
      convertFormData.append('range', rangeVal);
      convertFormData.append('extra_params', JSON.stringify(extraParamsVal));
    } else if (actionId === 'pdf-to-word') {
      convertUrl = '/api/convert/pdf-to-docx';
    } else if (actionId === 'pdf-to-excel') {
      convertUrl = '/api/convert/pdf-to-excel';
    } else if (actionId === 'pdf-to-powerpoint') {
      convertUrl = '/api/convert/pdf-to-powerpoint';
    } else if (actionId === 'protect-pdf') {
      convertUrl = '/api/security/protect';
      convertFormData.append('password', params.password || '');
      const permissions = params.permissions || { print: true, copy: true, modify: false };
      convertFormData.append('allow_print', String(permissions.print !== false));
      convertFormData.append('allow_copy', String(permissions.copy !== false));
      convertFormData.append('allow_edit', String(permissions.modify !== false));
    } else if (actionId === 'unlock-pdf') {
      convertUrl = '/api/security/unlock';
      convertFormData.append('password', params.password || '');
    } else if (actionId === 'redact-pdf') {
      convertUrl = '/api/security/redact';
      const redactionBoxes = params.boxes || params.redactions || params.textPatterns || [];
      convertFormData.append('redactions_json', JSON.stringify(redactionBoxes));
      convertFormData.append('sanitize_metadata', String(params.sanitizeMetadata !== false));
    } else if (actionId === 'pdf-to-pdfa') {
      convertUrl = '/api/convert/pdf-to-pdfa';
    } else if (actionId === 'url-to-pdf') {
      convertUrl = '/api/convert/url-to-pdf';
      convertFormData.append('url', params.url || '');
    } else if (actionId === 'compress-pdf') {
      convertUrl = '/api/convert/compress-pdf';
      if (params.quality !== undefined) convertFormData.append('quality', String(params.quality));
      if (params.target_size_bytes !== undefined) convertFormData.append('target_size_bytes', String(params.target_size_bytes));
      if (params.rasterize_fallback !== undefined) convertFormData.append('rasterize_fallback', String(params.rasterize_fallback));
    } else if (actionId === 'repair-pdf') {
      convertUrl = '/api/repair-pdf';
      if (params.mode) convertFormData.append('mode', params.mode);
      if (params.strip_corrupt_metadata !== undefined) convertFormData.append('strip_corrupt_metadata', String(params.strip_corrupt_metadata));
    } else {
      // excel-to-pdf, powerpoint-to-pdf, compare-pdf, etc.
      convertFormData.append('target_format', 'pdf');
    }

    const convertRes = await fetch(BACKEND_URL + convertUrl, {
      method: 'POST',
      body: convertFormData
    });
    if (!convertRes.ok) {
      const errData = await convertRes.json().catch(() => ({}));
      throw new Error(errData.detail || 'Backend failed to queue processing task.');
    }
    const convertData = await convertRes.json();
    const { job_id } = convertData;
    progressCb(10, 'Queued on server...');

    // Step 3: Poll status using Web Worker timer to avoid background tab throttling
    let status = 'queued';
    let resultData = null;
    let tries = 0;
    let consecutiveFailures = 0;

    const workerTimerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (!timer) {
            timer = setInterval(function() { self.postMessage('tick'); }, 1200);
          }
        } else if (e.data === 'stop') {
          if (timer) { clearInterval(timer); timer = null; }
        }
      };
    `;
    const workerBlob = new Blob([workerTimerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    let pollWorker = null;
    try {
      pollWorker = new Worker(workerUrl);
      pollWorker.postMessage('start'); // Start the interval timer once
    } catch (e) {
      pollWorker = null;
    }

    const waitTick = () => new Promise(resolve => {
      let isResolved = false;
      let onVisRef = null;
      const onDone = () => {
        if (!isResolved) {
          isResolved = true;
          if (onVisRef) document.removeEventListener('visibilitychange', onVisRef);
          resolve();
        }
      };
      const onVis = () => {
        if (document.visibilityState === 'visible') {
          onDone();
        }
      };
      onVisRef = onVis;
      if (pollWorker) {
        const handler = (e) => {
          if (e.data === 'tick') {
            pollWorker.removeEventListener('message', handler);
            onDone();
          }
        };
        pollWorker.addEventListener('message', handler);
      } else {
        setTimeout(onDone, 1200);
      }
      document.addEventListener('visibilitychange', onVis);
    });

    try {
      while (status !== 'finished' && status !== 'failed' && tries < 600) {
        await waitTick();
        tries++;
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/job/${job_id}/status`);
          if (statusRes.ok) {
            consecutiveFailures = 0;
            const statusData = await statusRes.json();
            status = statusData.status;
            
            const serverProgress = statusData.progress || (status === 'started' ? Math.min(85, 15 + Math.floor((tries / 300) * 70)) : 10);
            const serverMessage = statusData.message || (status === 'started' ? 'Processing on server...' : 'Queued on server...');
            
            if (status === 'finished') {
              resultData = statusData;
              progressCb(95, 'Finalizing download...');
            } else if (status === 'failed') {
              throw new Error(statusData.error || 'Server task execution failed.');
            } else {
              progressCb(serverProgress, serverMessage);
            }
          } else {
            consecutiveFailures++;
            if (consecutiveFailures >= 8) {
              throw new Error('Failed to retrieve task status: Server returned error response.');
            }
          }
        } catch (pollErr) {
          if (pollErr.message && (pollErr.message.includes('Server task execution failed') || pollErr.message.includes('Failed to retrieve task status'))) {
            throw pollErr;
          }
          consecutiveFailures++;
          if (consecutiveFailures >= 8) {
            throw new Error('Network connection lost. The server is unreachable after multiple attempts.');
          }
        }
      }
    } finally {
      if (pollWorker) {
        pollWorker.postMessage('stop');
        pollWorker.terminate();
      }
      URL.revokeObjectURL(workerUrl);
    }

    if (!resultData || !resultData.download_url) {
      throw new Error('Server task did not yield download URL.');
    }

    // Step 4: Download result file
    progressCb(95, 'Downloading file...');
    const downloadRes = await fetch(BACKEND_URL + resultData.download_url);
    if (!downloadRes.ok) {
      throw new Error('Failed to retrieve converted file from server.');
    }
    const resultBlob = await downloadRes.blob();
    progressCb(100, 'Completed');
    return resultBlob;
  };

  const resolveMimeType = (filename, blobType) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    const map = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.html': 'text/html',
      '.txt': 'text/plain',
      '.zip': 'application/zip'
    };
    return map[ext] || blobType || 'application/octet-stream';
  };

  // ─── Component-level engine dispatcher ────────────────────────────────────
  // Standalone version of runEngine that takes actionId and params explicitly.
  // Used by the sequential AI pipeline runner so it doesn't need to be
  // inside the executeOperator closure.
  const runToolEngine = async (actionId, params, mainFile, allItems, progressCb) => {
    if (actionId === 'merge-pdf') {
      const files = allItems.map(i => i.file || i);
      try {
        console.log(`[runToolEngine] Running Server Side merge for ${files.length} files...`);
        return await executeServerJob(files[0], 'merge-pdf', { additionalFiles: files.slice(1) }, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side merge failed or offline, falling back to client:`, serverErr);
        return await mergePdfs(files, progressCb);
      }
    } else if (actionId === 'compress-pdf') {
      const quality = params.quality || 0.65;
      const scale = quality > 0.75 ? 1.5 : quality < 0.5 ? 0.9 : 1.2;
      const mode = params.mode || 'lossless';
      try {
        console.log(`[runToolEngine] Running Server Side compress for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'compress-pdf', params, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side compress failed or offline, falling back to client:`, serverErr);
        return await compressPdf(mainFile, { quality, scale, mode }, progressCb);
      }
    } else if (actionId === 'split-pdf') {
      try {
        console.log(`[runToolEngine] Running Server Side split for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'split-pdf', params, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side split failed, falling back to client JS:`, serverErr);
        let localMode = params.mode || 'all';
        let localRange = params.range || '';
        if (localMode === 'parts') {
          const numParts = params.parts || 2;
          const totalPages = await getPdfPageCount(mainFile);
          const interval = Math.ceil(totalPages / numParts);
          localMode = 'equal-intervals';
          localRange = String(interval);
        } else if (localMode === 'fixed-ranges') {
          localMode = 'equal-intervals';
          localRange = String(params.pages_per_split || 2);
        }
        const { blobs, names } = await splitPdf(mainFile, localMode, localRange, progressCb);
        if (blobs.length === 1) return blobs[0];
        const zip = new JSZip();
        blobs.forEach((b, idx) => zip.file(names[idx], b));
        return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      }
    } else if (actionId === 'docx-to-pdf') {
      try {
        return await executeServerJob(mainFile, actionId, params, progressCb);
      } catch (e) {
        return await docxToPdf(mainFile, progressCb);
      }
    } else if (actionId === 'image-to-pdf') {
      let imageFiles = [];
      const inputItems = allItems && allItems.length > 0 ? allItems : [mainFile];
      for (const item of inputItems) {
        const f = item.file || item;
        if (f.name && f.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(f);
          const zipEntries = [];
          for (const [filename, fileEntry] of Object.entries(zipContent.files)) {
            if (!fileEntry.dir) {
              const ext = '.' + filename.split('.').pop().toLowerCase();
              if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(ext)) {
                zipEntries.push({ filename, fileEntry });
              }
            }
          }
          zipEntries.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));
          for (const entry of zipEntries) {
            const blob = await entry.fileEntry.async('blob');
            imageFiles.push(new File([blob], entry.filename, { type: blob.type || 'image/png' }));
          }
        } else {
          imageFiles.push(f);
        }
      }
      return await imagesToPdf(imageFiles, progressCb);
    } else if (actionId === 'image-compressor') {
      progressCb(40);
      const result = await compressImage(mainFile, params.quality || 0.7);
      progressCb(100);
      return result.blob;
    } else if (actionId === 'image-converter') {
      progressCb(40);
      const result = await convertImageFormat(mainFile, params.format || 'png', 0.9);
      progressCb(100);
      return result.blob;
    } else if (actionId === 'image-resizer') {
      progressCb(40);
      const mode = params.mode || 'percentage';
      const options = mode === 'percentage'
        ? { mode: 'percentage', percentage: params.percentage || 75 }
        : { mode: 'exact', width: params.width || 800, height: params.height || 600 };
      const result = await resizeImage(mainFile, options);
      progressCb(100);
      return result.blob;
    } else if (actionId === 'rotate-pdf') {
      try {
        console.log(`[runToolEngine] Running Server Side rotate for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'rotate-pdf', { angle: params.angle || 90 }, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side rotate failed or offline, falling back to client:`, serverErr);
        return await rotatePdf(mainFile, params.angle || 90, progressCb);
      }
    } else if (actionId === 'add-watermark') {
      try {
        console.log(`[runToolEngine] Running Server Side watermark for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'add-watermark', { text: params.text || 'CONFIDENTIAL', opacity: params.opacity || 0.5 }, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side watermark failed or offline, falling back to client:`, serverErr);
        return await addWatermark(mainFile, { text: params.text || 'CONFIDENTIAL', opacity: params.opacity || 0.5 }, progressCb);
      }
    } else if (actionId === 'add-page-numbers') {
      try {
        console.log(`[runToolEngine] Running Server Side page numbering for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'add-page-numbers', { 
          format: params.format || 'Page {n} of {total}', 
          position: params.position || 'bottom-right', 
          startNumber: params.startNumber || 1 
        }, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side page numbering failed or offline, falling back to client:`, serverErr);
        return await addPageNumbers(mainFile, { 
          formatStr: params.format || 'Page {n} of {total}', 
          position: params.position || 'bottom-right', 
          startNumber: params.startNumber || 1,
          shrinkToFit: Boolean(params.shrinkToFit),
          shieldMode: params.shieldMode || 'auto',
          numberingStyle: params.numberingStyle || 'arabic'
        }, progressCb);
      }
    } else if (actionId === 'bates-numbering') {
      const { applyBatesNumbering } = await import('../engines/pdf/batesNumbering.js');
      const batesBytes = await applyBatesNumbering(mainFile, {
        prefix: params.prefix || 'CONF-',
        suffix: params.suffix || '',
        startNumber: params.startNumber || 1,
        digits: params.digits || 6,
        position: params.position || 'bottom-right',
        shrinkToFit: Boolean(params.shrinkToFit),
        shieldMode: params.shieldMode || 'auto'
      });
      progressCb(100);
      return new Blob([batesBytes], { type: 'application/pdf' });
    } else if (actionId === 'ocr-pdf') {
      const language = params.language || 'eng';
      try {
        console.log(`[runToolEngine] Running Server Side OCR for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'ocr-pdf', params, progressCb);
      } catch (serverErr) {
        console.warn('[runToolEngine] Server OCR failed or offline, falling back to client OCR:', serverErr.message);
        return await ocrPdf(mainFile, { language }, progressCb);
      }
    } else if (actionId === 'un-ocr-pdf') {
      const scale = params.scale || 2.0;
      return await unOcrPdf(mainFile, { scale }, progressCb);
    } else if (actionId === 'pdf-to-image') {
      const format = params.format || 'png';
      const dpi = params.dpi || 150;
      try {
        console.log(`[runToolEngine] Running Server Side PDF-to-image for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'pdf-to-image', { dpi, format }, progressCb);
      } catch (serverErr) {
        console.warn(`[runToolEngine] Server Side pdf-to-image failed or offline, falling back to client stream:`, serverErr);
        const scale = params.dpi ? params.dpi / 72 : 2.0;
        const blobs = [];
        const names = [];
        const files = (allItems || []).map(i => i.file).filter(Boolean);
        const finalFiles = files.length > 0 ? files : [mainFile];
        
        for (let idx = 0; idx < finalFiles.length; idx++) {
          const file = finalFiles[idx];
          const fileBase = file.name.replace(/\.[^.]+$/, '');
          const filePrefix = finalFiles.length > 1 ? `${fileBase}_` : '';
          
          const startPct = (idx / finalFiles.length) * 100;
          const endPct = ((idx + 1) / finalFiles.length) * 100;
          const subProgressCb = (pct) => {
            if (progressCb) {
              const totalPct = startPct + (pct / 100) * (endPct - startPct);
              progressCb(Math.round(totalPct));
            }
          };
          
          await pdfToImagesStream(file, { format, quality: 0.9, scale }, ({ name, blob }) => {
            blobs.push(blob);
            names.push(`${filePrefix}${name}`);
          }, subProgressCb);
        }

        const zip = new JSZip();
        blobs.forEach((b, idx) => zip.file(names[idx], b));
        return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      }
    } else if (actionId === 'excel-to-pdf') {
      try {
        return await executeServerJob(mainFile, actionId, params, progressCb);
      } catch (e) {
        return await excelToPdf(mainFile, progressCb);
      }
    } else if (actionId === 'powerpoint-to-pdf') {
      try {
        return await executeServerJob(mainFile, actionId, params, progressCb);
      } catch (e) {
        return await powerpointToPdf(mainFile, progressCb);
      }
    } else if (actionId === 'html-to-pdf') {
      try {
        return await executeServerJob(mainFile, actionId, params, progressCb);
      } catch (e) {
        return await htmlToPdf(mainFile, progressCb);
      }
    } else if (['pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'protect-pdf', 'unlock-pdf', 'redact-pdf', 'compare-pdf', 'pdf-to-pdfa', 'url-to-pdf'].includes(actionId)) {
      return await executeServerJob(mainFile, actionId, params, progressCb);
    } else if (actionId === 'unzip-file') {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(mainFile);
      const entries = Object.values(zipContent.files).filter(e => !e.dir);
      progressCb(100);
      if (entries.length >= 1) {
        const outputs = [];
        for (const entry of entries) {
          const blob = await entry.async('blob');
          outputs.push({ blob, name: entry.name });
        }
        return {
          blob: outputs[0].blob,
          name: outputs[0].name,
          outputs
        };
      }
      return mainFile;
    } else if (actionId === 'repair-pdf') {
      try {
        console.log(`[runToolEngine] Running Server Side repair for ${mainFile.name}...`);
        return await executeServerJob(mainFile, 'repair-pdf', params, progressCb);
      } catch (serverErr) {
        console.warn('[runToolEngine] Server Side repair failed or offline, falling back to client JS:', serverErr);
        const repairRes = await repairPdf(mainFile, { returnBlobOnly: true }, progressCb);
        return repairRes instanceof Blob ? repairRes : (repairRes.blob || repairRes);
      }
    } else if (actionId === 'bates-numbering') {
      const pdfBytes = await mainFile.arrayBuffer();
      const outputBytes = await applyBatesNumbering(pdfBytes, params);
      progressCb(100);
      return new Blob([outputBytes], { type: 'application/pdf' });
    } else if (actionId === 'condition-router') {
      const ruleType = params.ruleType || 'pageCount';
      const operator = params.operator || '>';
      const threshold = Number(params.thresholdValue) || 5;
      let pass = false;
      try {
        if (ruleType === 'pageCount') {
          const count = await getPdfPageCount(mainFile);
          if (operator === '>') pass = count > threshold;
          else if (operator === '<') pass = count < threshold;
          else if (operator === '==') pass = count === threshold;
          else if (operator === '>=') pass = count >= threshold;
          else if (operator === '<=') pass = count <= threshold;
        } else if (ruleType === 'fileSizeMB') {
          const sizeMB = mainFile.size / (1024 * 1024);
          if (operator === '>') pass = sizeMB > threshold;
          else if (operator === '<') pass = sizeMB < threshold;
          else if (operator === '==') pass = Math.round(sizeMB) === threshold;
        }
      } catch (e) {
        console.warn('Condition router evaluation fallback:', e);
      }
      progressCb(100);
      const outputBlob = new Blob([await mainFile.arrayBuffer()], { type: mainFile.type || 'application/pdf' });
      return {
        blob: outputBlob,
        name: mainFile.name,
        pass: pass,
        isConditionRouter: true
      };
    } else if (actionId === 'crop-pdf') {
      const bounds = params.bounds || { xPercent: 10, yPercent: 10, widthPercent: 80, heightPercent: 80 };
      return await cropPdf(mainFile, bounds, progressCb);
    } else if (actionId === 'edit-pdf') {
      const annotations = params.overlays || params.annotations || [];
      return await editPdf(mainFile, annotations, progressCb);
    } else if (actionId === 'pdf-forms') {
      const fieldValues = params.fieldValues || {};
      return await fillFormFields(mainFile, fieldValues, progressCb);
    } else if (actionId === 'sign-pdf') {
      const sigOptions = params.sigOptions || {};
      const fields = params.fields || (Array.isArray(sigOptions) ? sigOptions : [
        {
          id: 'sig_canvas_auto',
          type: 'signature',
          pageIndex: sigOptions.pageIndex ?? params.pageIndex ?? 0,
          x: sigOptions.xPercent ?? params.xPercent ?? 0.5,
          y: sigOptions.yPercent ?? params.yPercent ?? 0.5,
          width: sigOptions.widthPercent ?? params.widthPercent ?? 0.25,
          height: 0.08,
          dataUrl: sigOptions.signatureDataUrl || params.signatureDataUrl || null,
          blob: sigOptions.signaturePngBlob || null
        }
      ]);
      return await signPdf(mainFile, fields, { onProgress: progressCb });
    } else if (actionId === 'unzip-file') {
      progressCb(10);
      speakAnnouncement("Unzipping archive.");
      const zip = new JSZip();
      let zipContent;
      try {
        zipContent = await zip.loadAsync(mainFile);
      } catch (err) {
        throw new Error(`Invalid zip file archive: ${err.message}`);
      }
      
      progressCb(30);
      const fileKeys = Object.keys(zipContent.files).filter(name => !zipContent.files[name].dir);
      const totalFiles = fileKeys.length;
      if (totalFiles === 0) {
        throw new Error("No files found inside the ZIP archive.");
      }
      
      const outputs = [];
      for (let idx = 0; idx < totalFiles; idx++) {
        const filename = fileKeys[idx];
        const fileEntry = zipContent.files[filename];
        const blob = await fileEntry.async('blob');
        outputs.push({ blob, name: filename });
        
        const pct = Math.round(30 + ((idx + 1) / totalFiles) * 70);
        progressCb(pct);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      return { blob: mainFile, name: mainFile.name, outputs, outputIds: [] };
    } else if (actionId === 'remove-pages') {
      const indices = (params.pages || '').split(',').flatMap(p => {
        if (p.includes('-')) { const [s,e] = p.split('-').map(Number); return Array.from({length:e-s+1},(_,i)=>s+i-1); }
        const n = Number(p.trim()); return isNaN(n) ? [] : [n-1];
      });
      return await removePages(mainFile, indices, progressCb);
    } else if (actionId === 'extract-pages') {
      const indices = (params.pages || '').split(',').flatMap(p => {
        if (p.includes('-')) { const [s,e] = p.split('-').map(Number); return Array.from({length:e-s+1},(_,i)=>s+i-1); }
        const n = Number(p.trim()); return isNaN(n) ? [] : [n-1];
      });
      return await extractPages(mainFile, indices, progressCb);
    } else {
      throw new Error(`Tool "${actionId}" is not available in pipeline auto-execution.`);
    }
  };

  const triggerDownstreamOperators = (completedOpId, completedOutputIds, latestOpsList) => {
    console.log(`[triggerDownstreamOperators] Completed ${completedOpId}, outputIds:`, completedOutputIds);
    const downstreamOps = latestOpsList.filter(op => {
      if (op.status !== 'idle') return false;
      const isConnected = op.inputIds.some(id => id === completedOpId || completedOutputIds.includes(id));
      return isConnected;
    });
    console.log(`[triggerDownstreamOperators] Found downstream ops:`, downstreamOps.map(o => `${o.id} (${o.toolId})`));

    for (const downstreamOp of downstreamOps) {
      const allInputsReady = downstreamOp.inputIds.every(inputId => {
        if (inputId === completedOpId || completedOutputIds.includes(inputId)) return true;
        const fileNode = workspaceQueueRef.current.find(q => q.id === inputId);
        if (fileNode && (fileNode.file || fileNode.status === 'Completed')) return true;
        const upstream = latestOpsList.find(o => o.id === inputId || o.outputId === inputId || o.outputIds?.includes(inputId));
        if (upstream && upstream.status === 'completed') return true;
        return false;
      });
      console.log(`[triggerDownstreamOperators] downstream ${downstreamOp.id} (${downstreamOp.toolId}). allInputsReady=${allInputsReady}`);

      if (allInputsReady) {
        console.log(`[triggerDownstreamOperators] Scheduling execution for downstream ${downstreamOp.id} in 150ms, passing latestOpsList`);
        // Bug #6 fix: check if downstream operator is destructive — show warning before auto-triggering
        const downstreamReg = TOOL_REGISTRY[downstreamOp.toolId];
        if (downstreamReg?.destructive) {
          showToast(`Auto-trigger skipped for '${downstreamReg.name}' — it is a destructive operation. Click Play to run it manually.`, 'warning');
        } else {
          setTimeout(() => {
            // CRITICAL: pass latestOpsList so executeOperator sees upstream as 'completed',
            // not the stale React closure which still has it as 'idle'/'processing'
            executeOperator(downstreamOp.id, null, latestOpsList).catch(err => {
              console.error(`Auto-trigger failed for ${downstreamOp.toolId}:`, err);
            });
          }, 150);
        }
      }
    }
  };

  const executeOperator = async (opId, _visitedSet, latestOps, fromStudioCommit = false) => {
    const opsList = latestOps || operations;
    const op = opsList.find(o => o.id === opId);
    console.log(`[executeOperator] Called for ${opId} (${op?.toolId}). status=${op?.status}, hasLatestOps=${!!latestOps}`);
    if (!op || op.status === 'processing') {
      console.log(`[executeOperator] Aborting early: !op=${!op}, status=${op?.status}`);
      return;
    }

    // Stitch Canvas Preview Quota Enforcement (10 actions/day for Free Accounts, Unlimited for Pro)
    if (!isAuthenticated) {
      openCanvasLimitModal({ isGuest: true, reason: 'account_required' });
      return;
    }
    if (!isPro) {
      const quota = getCanvasQuota(userEmail, false);
      if (quota.remaining <= 0) {
        openCanvasLimitModal({ isGuest: false, reason: 'quota_exhausted', used: quota.used, limit: quota.limit });
        return;
      }
      consumeCanvasQuota(userEmail, false);
    }

    // --- Auto-Heal Format Mismatches BEFORE executing ---
    const currentQueue = workspaceQueueRef.current;
    const allIssues = validateCanvasConnections(opsList, currentQueue);
    const opIssues = allIssues.filter(issue => issue.opId === opId && issue.type === 'format-mismatch');

    if (opIssues.length > 0) {
      console.log(`[executeOperator] Found ${opIssues.length} format mismatches. Auto-healing sequentially...`);
      showToast(`Detected incompatible file formats! Auto-healing connection first...`, 'warning');
      speakAnnouncement(`Auto healing format mismatches.`);
      
      let nextOps = [...opsList];
      let nextQueue = [...currentQueue];
      const injectedOpIds = [];

      for (const issue of opIssues) {
        const result = executeAutoHeal(nextOps, nextQueue, issue);
        nextOps = result.operations;
        nextQueue = result.queue;
        const injectedOp = nextOps[nextOps.length - 1];
        if (injectedOp) {
          injectedOpIds.push(injectedOp.id);
        }
      }

      pushHistoryState();
      setOperations(nextOps);
      setWorkspaceQueue(nextQueue);
      
      // Wait for layout/state updates to propagate so the user sees the visual change on the canvas
      await new Promise(r => setTimeout(r, 450));

      // Now run the injected conversion operators one by one sequentially
      for (const injectedId of injectedOpIds) {
        const freshOps = operationsRef.current;
        const injectedOpObj = freshOps.find(o => o.id === injectedId);
        const suggestedName = TOOL_REGISTRY[injectedOpObj?.toolId]?.name || 'converter';
        showToast(`Running ${suggestedName} conversion...`, 'info');
        try {
          await executeOperator(injectedId, null, freshOps);
        } catch (err) {
          console.error(`[executeOperator] Sequential auto-heal operator failed:`, err);
        }
        // Small gap between executions to visualize progress
        await new Promise(r => setTimeout(r, 300));
      }

      // The downstream operator (the current one) will be automatically triggered by triggerDownstreamOperators of the last completed converter.
      // So we can return early from this current call of executeOperator.
      console.log(`[executeOperator] Sequential auto-healing completed. Returning early, downstream will run on trigger.`);
      return;
    }

    // --- Overwrite / Keep Both Check ---
    // Bug #5 fix: push onto overwriteQueue (not setOverwritePrompt) to handle concurrent decisions
    let overwriteChoice = 'replace';
    const existingIds = (op.outputIds || (op.outputId ? [op.outputId] : [])).filter(id => workspaceQueueRef.current.some(q => q.id === id));
    if (existingIds.length > 0 && op.status === 'completed') {
      overwriteChoice = await new Promise((resolve) => {
        setOverwriteQueue(prev => [...prev, { opId, existingIds, resolve }]);
      });
      if (overwriteChoice === 'cancel') {
        return;
      }
    }

    // --- Sequential Queue Lock for Top-Level Runs ---
    let releaseLock = () => {};
    const isTopLevel = !_visitedSet;
    if (isTopLevel) {
      await new Promise(resolve => {
        executionQueueLock.current = executionQueueLock.current
          .then(() => {
            resolve();
            return new Promise(release => {
              releaseLock = release;
            });
          })
          .catch(() => {
            resolve();
            return Promise.resolve();
          });
      });
    }

    // Declare variables used in catch/finally outside try
    const actionId = op.toolId;
    const abortController = new AbortController();
    let isTimeoutAborted = false;
    let timeoutId = null;
    let timerInterval = null;
    let mainFile = null;

    try {
      // --- Circular Dependency Detection ---
      const visited = _visitedSet || new Set();
    if (visited.has(opId)) {
      const cyclePath = [...visited, opId].join(' → ');
      showToast(`Circular dependency detected: ${cyclePath}. Aborting.`);
      speakAnnouncement('Circular dependency detected. Execution aborted.');
      throw new Error(`Circular dependency: ${cyclePath}`);
    }
    visited.add(opId);

    // --- Setup AbortController for timeout/cancellation ---
    activeAbortControllers.current[opId] = abortController;

    timeoutId = setTimeout(() => {
      isTimeoutAborted = true;
      abortController.abort();
    }, EXECUTION_TIMEOUT_MS);

    let isIncrementalMerge = false;
    let incrementalBaseFile = null;
    const existingOutputNode = op.outputId ? workspaceQueueRef.current.find(q => q.id === op.outputId) : null;

    if (actionId === 'merge-pdf' && 
        op.prevInputIds && 
        op.prevInputIds.length > 0 && 
        op.inputIds.length > op.prevInputIds.length &&
        existingOutputNode && 
        existingOutputNode.resultBlob) {
      
      const prefixMatch = op.prevInputIds.every((id, idx) => op.inputIds[idx] === id);
      if (prefixMatch) {
        isIncrementalMerge = true;
        const baseFile = new File([existingOutputNode.resultBlob], existingOutputNode.resultName || 'merged_document.pdf', {
          type: 'application/pdf'
        });
        incrementalBaseFile = {
          id: existingOutputNode.id,
          file: baseFile,
          name: baseFile.name,
          size: baseFile.size
        };
        showToast("Fast Merge: Appending new PDFs to existing merge result!", "success");
        speakAnnouncement("Incremental merge optimization active.");
      }
    }

    // Build items list, supporting both direct files and upstream operator outputs recursively
    const items = [];
    const seenFileIds = new Set();
    const generatedOutputs = [];

    const resolveInputIds = isIncrementalMerge ? op.inputIds.slice(op.prevInputIds.length) : op.inputIds;
    
    if (isIncrementalMerge && incrementalBaseFile) {
      items.push(incrementalBaseFile);
    }

    for (const inputId of resolveInputIds) {
      if (abortController.signal.aborted) throw new Error('Operation cancelled.');

      const upstreamOp = inputId.startsWith('op-')
        ? opsList.find(o => o.id === inputId)
        : opsList.find(o => o.outputId === inputId || o.outputIds?.includes(inputId));

      console.log(`[executeOperator] Resolving input ${inputId}. Found upstreamOp=${upstreamOp?.id} (${upstreamOp?.toolId}), status=${upstreamOp?.status}`);

      if (upstreamOp) {
        // If the upstream operator is not yet completed, run it recursively first
        let upstreamResult;
        if (upstreamOp.status !== 'completed') {
          upstreamResult = await executeOperator(upstreamOp.id, visited, opsList);
        }
          
          // Now fetch all outputs generated by this upstream operator.
          // CRITICAL: The latestOps snapshot passed from triggerDownstreamOperators may have
          // been taken BEFORE setOperations wrote outputId/outputIds into state.
          // So always check operationsRef.current for the freshest outputId/outputIds.
          const freshUpstream = operationsRef.current.find(o => o.id === upstreamOp.id) || upstreamOp;
          const oIds = (freshUpstream.outputIds?.length > 0 ? freshUpstream.outputIds : null)
            || (freshUpstream.outputId ? [freshUpstream.outputId] : [])
            || (upstreamOp.outputIds?.length > 0 ? upstreamOp.outputIds : null)
            || (upstreamOp.outputId ? [upstreamOp.outputId] : []);
          
          console.log(`[executeOperator] Resolved upstream ${upstreamOp.id} outputIds (fresh):`, oIds);
          let addedAny = false;
          
          // Prefer outputs array returned by recursive execution
          if (upstreamResult && upstreamResult.outputs && upstreamResult.outputs.length > 0) {
            for (const out of upstreamResult.outputs) {
              const file = new File([out.blob], out.name || 'input.pdf', {
                type: out.blob.type
              });
              items.push({ id: inputId, file, name: file.name, size: file.size });
              addedAny = true;
            }
          } else {
            // Fallback: resolve from workspaceQueue using output IDs list
            for (const outId of oIds) {
              if (seenFileIds.has(outId)) continue;
              seenFileIds.add(outId);
              
              const fileNode = workspaceQueueRef.current.find(q => q.id === outId);
              if (fileNode && fileNode.resultBlob) {
                const file = new File([fileNode.resultBlob], fileNode.resultName || fileNode.name || 'input.pdf', {
                  type: fileNode.resultBlob.type
                });
                items.push({ id: outId, file, name: file.name, size: file.size });
                addedAny = true;
              }
            }
          }
          
          if (!addedAny) {
            throw new Error(`Upstream operator ${upstreamOp.toolId} failed to yield output.`);
          }
      } else {
        if (seenFileIds.has(inputId)) continue;
        seenFileIds.add(inputId);
        
        const fileNode = workspaceQueueRef.current.find(q => q.id === inputId);
        if (fileNode) {
          if (fileNode.file) {
            items.push({
              id: fileNode.id,
              file: fileNode.file,
              name: fileNode.file.name,
              size: fileNode.file.size
            });
          } else if (fileNode.resultBlob) {
            const file = new File([fileNode.resultBlob], fileNode.resultName || fileNode.name || 'input.pdf', {
              type: fileNode.resultBlob.type
            });
            items.push({
              id: fileNode.id,
              file,
              name: file.name,
              size: file.size
            });
          } else {
            throw new Error(`File node "${fileNode.name || 'unnamed'}" is still processing or has invalid data.`);
          }
        }
      }
    }
    
    // Intercept Focus Studio tools (only if visual configurations are missing)
    if (needsStudioParams(actionId, op.params) && !fromStudioCommit) {
      console.log(`[executeOperator] Intercepting ${opId} for Focus Studio.`);
      const inputFiles = items.map(item => item.file);
      setActiveStudio({
        opId: op.id,
        toolId: op.toolId,
        inputFiles,
        extractedParams: op.params || {}
      });
      return; // Stop execution here until user commits
    }

    const validation = TOOL_VALIDATION[actionId];
    if (items.length === 0 && (!validation || validation.minInputs > 0)) {
      showToast('Error: No input files connected!');
      return;
    }

    const params = op.params || {};
    const isMultiInput = actionId === 'merge-pdf' || actionId === 'image-to-pdf';

    // --- Unzip background worker helper for multi-input tools only ---
    let processedItems = [];
    if (isMultiInput) {
      for (const item of items) {
        if (item.name.toLowerCase().endsWith('.zip')) {
          try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(item.file);
            const zipFiles = [];
            for (const [filename, fileEntry] of Object.entries(zipContent.files)) {
              if (!fileEntry.dir) {
                const ext = '.' + filename.split('.').pop().toLowerCase();
                const isAccepted = !validation || validation.accept.length === 0 || validation.accept.some(acc => {
                  if (acc === 'image/*') return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
                  return acc === ext;
                });
                if (isAccepted) {
                  const blob = await fileEntry.async('blob');
                  const file = new File([blob], filename, { type: resolveMimeType(filename, blob.type) });
                  zipFiles.push({
                    id: `${item.id}-zip-${filename}`,
                    file,
                    name: file.name,
                    size: file.size
                  });
                }
              }
            }
            if (zipFiles.length > 0) {
              processedItems.push(...zipFiles);
            } else {
              processedItems.push(item);
            }
          } catch (e) {
            console.error("Failed to unzip input file", e);
            processedItems.push(item);
          }
        } else {
          processedItems.push(item);
        }
      }
    } else {
      processedItems = [...items];
    }

    const finalItems = processedItems;

    if (finalItems.length === 0 && (!validation || validation.minInputs > 0)) {
      showToast('Error: No compatible input files connected!');
      return;
    }

    // Validate inputs
    if (validation) {
        if (finalItems.length < validation.minInputs) {
          throw new Error(`${op.toolId.replace('-', ' ')} requires at least ${validation.minInputs} inputs. Current: ${finalItems.length}`);
        }
        if (finalItems.length > validation.maxInputs && isMultiInput) {
          throw new Error(`${op.toolId.replace('-', ' ')} accepts at most ${validation.maxInputs} inputs. Current: ${finalItems.length}`);
        }
        if (validation.accept.length > 0) {
          for (const item of finalItems) {
            const ext = '.' + item.file.name.split('.').pop().toLowerCase();
            if (ext === '.zip' && !isMultiInput) continue; // Skip zip wildcard pre-validation for single/batch tools
            
            const isValid = validation.accept.some(acc => {
              if (acc === 'image/*') {
                return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
              }
              return acc === ext;
            });
            if (!isValid) {
              throw new Error(`Incompatible file type: "${item.file.name}" cannot be used with ${op.toolId.replace('-', ' ')}.`);
            }
          }
        }
      }

      // Set operator to processing
      setOperations(prev => prev.map(o => o.id === opId ? { ...o, status: 'processing', progress: 0 } : o));
      speakAnnouncement(`Started executing ${op.toolId.replace('-', ' ')}.`);

      // Start active execution timer
      const startTime = Date.now();
      setOpTimers(prev => ({ ...prev, [opId]: 0 }));
      const timerInterval = setInterval(() => {
        setOpTimers(prev => {
          if (prev[opId] === undefined) return prev;
          return { ...prev, [opId]: prev[opId] + 1 };
        });
      }, 1000);

      if (actionId === 'unzip-file') {
        const isAlreadyUnpacked = finalItems.length > 1 || (finalItems[0] && !finalItems[0].name.toLowerCase().endsWith('.zip'));
        if (isAlreadyUnpacked) {
          clearInterval(timerInterval);
          speakAnnouncement("Input is already unpacked. Skipping unzip step.");
          showToast("Skipped unzip: files are already extracted.", "info");
          
          const inSize = calculateInputSize(op, currentQueue, operationsRef.current);
          const telemetry = computeNodeTelemetry({ startTime, inputSize: inSize, outputSize: inSize });
          const outputIds = finalItems.map(item => item.id);
          const latestOpsAfterUnzip = operationsRef.current.map(o =>
            o.id === opId ? { ...o, outputId: outputIds[outputIds.length - 1], outputIds, status: 'completed', progress: 100, telemetry } : o
          );
          setOperations(latestOpsAfterUnzip);
          
          if (isTopLevel) {
            releaseLock();
            releaseLock = () => {};
          }
          
          triggerDownstreamOperators(opId, outputIds, latestOpsAfterUnzip);
          return { blob: new Blob([]), name: 'unzipped' };
        }

        const mainFile = finalItems[0].file;
        const progressCb = (pct, statusText) => {
          setOperations(prev => prev.map(o => o.id === opId ? { ...o, progress: pct, statusText: formatStatusText(statusText) } : o));
        };
        
        progressCb(10);
        speakAnnouncement("Unzipping archive.");
        
        const zip = new JSZip();
        let zipContent;
        try {
          zipContent = await zip.loadAsync(mainFile);
        } catch (err) {
          throw new Error("Invalid zip file archive. Could not unzip.");
        }
        
        progressCb(30);
        const fileKeys = Object.keys(zipContent.files).filter(name => !zipContent.files[name].dir);
        const totalFiles = fileKeys.length;
        if (totalFiles === 0) {
          throw new Error("No files found inside the ZIP archive.");
        }
        
        const hasDownstreamConsumers = operationsRef.current.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(op.id));
        const shouldUnpack = shouldUnpackCanvasCards(hasDownstreamConsumers, totalFiles, MAX_INDIVIDUAL_CANVAS_CARDS);
        
        const spawnedIds = [];
        if (shouldUnpack) {
          for (let idx = 0; idx < totalFiles; idx++) {
            const filename = fileKeys[idx];
            const fileEntry = zipContent.files[filename];
            
            // Chunk-by-chunk extraction to keep memory footprint light
            const blob = await fileEntry.async('blob');
            const file = new File([blob], filename, { type: resolveMimeType(filename, blob.type) });
            
            // Spawn output node in a clean 4-column grid layout
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const outputX = op.x + 280 + col * 260;
            const outputY = op.y + row * 160;
            
            const outputId = createCompletedOutputNode(file.name, outputX, outputY, file, [], op.ancestry);
            spawnedIds.push(outputId);
            generatedOutputs.push({ blob, name: file.name });
            
            // Update progress sequentially
            const pct = Math.round(30 + ((idx + 1) / totalFiles) * 70);
            progressCb(pct);
            
            // Yield to browser main thread to trigger garbage collection and UI paint
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } else {
          // Large batch (> 5 files) or intermediate unzip:
          // Keep all extracted items in generatedOutputs for memory-level passing to downstream tools
          for (let idx = 0; idx < totalFiles; idx++) {
            const filename = fileKeys[idx];
            const fileEntry = zipContent.files[filename];
            const blob = await fileEntry.async('blob');
            generatedOutputs.push({ blob, name: filename });
            const pct = Math.round(30 + ((idx + 1) / totalFiles) * 70);
            progressCb(pct);
          }
          const bundleName = `${mainFile.name.replace(/\.[^.]+$/, '')}_bundle.zip`;
          const bundleId = createCompletedOutputNode(bundleName, op.x + 280, op.y, mainFile, [], op.ancestry);
          spawnedIds.push(bundleId);
        }
        
        const latestOpsAfterUnzip = operationsRef.current.map(o =>
          o.id === opId ? { ...o, outputId: spawnedIds[spawnedIds.length - 1], outputIds: spawnedIds, status: 'completed', progress: 100 } : o
        );
        setOperations(latestOpsAfterUnzip);
        speakAnnouncement(`Successfully unzipped ${totalFiles} files.`);
        showToast(`Successfully extracted ${totalFiles} files!`);
        
        // Bug #2 fix: trigger downstream operators so mid-chain unzip doesn't stall the pipeline
        triggerDownstreamOperators(opId, spawnedIds, latestOpsAfterUnzip);
        
        return { blob: new Blob([]), name: 'unzipped' };
      }

      const runEngineWithPtop = async (mainFile, itemsForEngine, progressCb) => {
        const isPdf = mainFile && mainFile.name.toLowerCase().endsWith('.pdf');
        
        if (isPdf && params.pageRange) {
          const bypassList = ['protect-pdf', 'unlock-pdf', 'compare-pdf', 'pdf-forms', 'unzip-file', 'qr-generator'];
          if (bypassList.includes(actionId)) {
            return await runEngine(mainFile, itemsForEngine, progressCb);
          }

          const { parsePageRange, getPdfPageCount, extractPdfSubset, stitchPdfSubset } = await import('../utils/ptop.js');

          let fileBytes = new Uint8Array(await mainFile.arrayBuffer());
          let totalPages;
          try {
            totalPages = await getPdfPageCount(fileBytes);
          } catch (err) {
            throw new Error(`Failed to read PDF page count: ${err.message}`);
          }

          const targetIndices = parsePageRange(params.pageRange, totalPages);
          if (!targetIndices || targetIndices.length === 0) {
            throw new Error(`The targeted page range "${params.pageRange}" is invalid or out of bounds. The document has only ${totalPages} pages.`);
          }

          // Group 2: Inherently Page-Based Tools
          const isGroup2 = ['split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf'].includes(actionId);
          if (isGroup2) {
            if (actionId === 'split-pdf') {
              params.mode = 'range';
              params.range = params.pageRange;
            } else if (actionId === 'remove-pages' || actionId === 'extract-pages') {
              params.pages = params.pageRange;
              params.ptopPageIndices = targetIndices;
            } else if (actionId === 'organize-pdf') {
              const currentConfigs = params.pageConfigs || targetIndices.map(idx => ({ originalIndex: idx, rotation: 0 }));
              params.pageConfigs = currentConfigs.filter(cfg => targetIndices.includes(cfg.originalIndex));
            }
            return await runEngine(mainFile, itemsForEngine, progressCb);
          }

          // Group 3: PDF to Office Format Conversions
          const isPdfToOffice = ['pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'pdf-to-pdfa'].includes(actionId);
          if (isPdfToOffice) {
            if (targetIndices.length < totalPages) {
              progressCb(10);
              const subsetBytes = await extractPdfSubset(fileBytes, targetIndices);
              const subsetFile = new File([subsetBytes], mainFile.name, { type: 'application/pdf' });
              
              const result = await runEngine(subsetFile, [{ ...itemsForEngine[0], file: subsetFile }], progressCb);
              return result;
            }
            return await runEngine(mainFile, itemsForEngine, progressCb);
          }

          // Group 3: Office to PDF Format Conversions
          const isOfficeToPdf = ['docx-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'html-to-pdf', 'text-to-pdf', 'url-to-pdf'].includes(actionId);
          if (isOfficeToPdf) {
            const fullResultBlob = await runEngine(mainFile, itemsForEngine, progressCb);
            if (fullResultBlob) {
              const resBytes = new Uint8Array(await fullResultBlob.arrayBuffer());
              const resPages = await getPdfPageCount(resBytes);
              const resIndices = parsePageRange(params.pageRange, resPages);
              
              if (resIndices && resIndices.length > 0 && resIndices.length < resPages) {
                progressCb(90);
                const subsetBytes = await extractPdfSubset(resBytes, resIndices);
                const subsetBlob = new Blob([subsetBytes], { type: 'application/pdf' });
                progressCb(100);
                return subsetBlob;
              }
            }
            return fullResultBlob;
          }

          // Group 4: PDF to Image conversion
          if (actionId === 'pdf-to-image') {
            if (targetIndices.length < totalPages) {
              progressCb(10);
              const subsetBytes = await extractPdfSubset(fileBytes, targetIndices);
              const subsetFile = new File([subsetBytes], mainFile.name, { type: 'application/pdf' });
              
              const result = await runEngine(subsetFile, [{ ...itemsForEngine[0], file: subsetFile }], progressCb);
              return result;
            }
            return await runEngine(mainFile, itemsForEngine, progressCb);
          }

          // Group 1: PDF-to-PDF Modifiers (compress-pdf, rotate-pdf, ocr-pdf, etc.)
          const isPdfToPdfModifier = [
            'compress-pdf', 'rotate-pdf', 'ocr-pdf', 'add-watermark', 'add-page-numbers',
            'sign-pdf', 'edit-pdf', 'redact-pdf', 'repair-pdf', 'crop-pdf'
          ].includes(actionId);

          if (isPdfToPdfModifier) {
            if (targetIndices.length < totalPages) {
              progressCb(10);

              // Map/remap parameters to match sliced subset document boundaries
              if (actionId === 'add-page-numbers') {
                params.ptopTotalPages = totalPages;
                params.ptopPageIndices = targetIndices;
              } else if (actionId === 'edit-pdf' && params.annotations) {
                params.annotations = params.annotations
                  .map(anno => {
                    const origIdx = anno.pageIndex ?? 0;
                    const localIdx = targetIndices.indexOf(origIdx);
                    return { ...anno, pageIndex: localIdx };
                  })
                  .filter(anno => anno.pageIndex !== -1);
              } else if (actionId === 'sign-pdf' && params.sigOptions) {
                const origIdx = params.sigOptions.pageIndex ?? 0;
                const localIdx = targetIndices.indexOf(origIdx);
                if (localIdx === -1) {
                  throw new Error(`Target signature page ${origIdx + 1} is not in the targeted page range (${params.pageRange}). Please adjust your range to include page ${origIdx + 1}.`);
                }
                params.sigOptions = { ...params.sigOptions, pageIndex: localIdx };
              }
              
              // Extract target pages
              const subsetBytes = await extractPdfSubset(fileBytes, targetIndices);
              const subsetFile = new File([subsetBytes], `subset_${mainFile.name}`, { type: 'application/pdf' });
              
              // Run engine on target subset (scale engine progress to 10% - 85% range)
              let processedSubsetBlob;
              try {
                processedSubsetBlob = await runEngine(subsetFile, [{ ...itemsForEngine[0], file: subsetFile }], (pct) => {
                  progressCb(Math.round(10 + pct * 0.75));
                });
              } catch (engineErr) {
                throw engineErr;
              }

              // Stitch back
              progressCb(88);
              let processedSubsetBytes = new Uint8Array(await processedSubsetBlob.arrayBuffer());

              // [FIX] Validate the processed subset has the same page count as the target slice.
              // Some engines (e.g. OCR, watermark) may internally add/drop pages — catch this
              // early instead of silently stitching an incorrect number of pages.
              const { getPdfPageCount: _countPages } = await import('../utils/ptop.js');
              const processedPageCount = await _countPages(processedSubsetBytes).catch(() => -1);
              if (processedPageCount !== -1 && processedPageCount !== targetIndices.length) {
                console.warn(`[PTOP Stitcher] Page count mismatch: expected ${targetIndices.length}, got ${processedPageCount}. Falling back to server.`);
                processedSubsetBytes = null;
                return await executeServerJob(mainFile, actionId, params, progressCb);
              }
              
              let stitchedBytes;
              try {
                stitchedBytes = await stitchPdfSubset(fileBytes, processedSubsetBytes, targetIndices);
              } catch (stitchErr) {
                console.warn("[PTOP Stitcher] Stitching failed. Falling back to backend server restoration...", stitchErr);
                return await executeServerJob(mainFile, actionId, params, progressCb);
              } finally {
                // [FIX] Nullify large buffers immediately to release memory to GC
                processedSubsetBytes = null;
              }

              progressCb(100);
              const resultBlob = new Blob([stitchedBytes], { type: 'application/pdf' });
              stitchedBytes = null; // [FIX] Release stitched buffer after wrapping in Blob
              fileBytes = null;     // [FIX] Release source PDF buffer to allow GC
              return resultBlob;
            }
          }
        }

        return await runEngine(mainFile, itemsForEngine, progressCb);
      };

      const runEngine = async (mainFile, itemsForEngine, progressCb) => {
        let resultBlob;
        if (actionId === 'merge-pdf') {
          const files = itemsForEngine.map(i => i.file);
          try {
            console.log(`[runEngine] Running Server Side merge for ${files.length} files...`);
            resultBlob = await executeServerJob(files[0], 'merge-pdf', { additionalFiles: files.slice(1) }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side merge failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await mergePdfs(files, progressCb);
          }
        } else if (actionId === 'compress-pdf') {
          const quality = params.quality || 0.65;
          const scale = quality > 0.75 ? 1.5 : quality < 0.5 ? 0.9 : 1.2;
          const mode = params.mode || 'lossless';
          try {
            console.log(`[runEngine] Running Server Side compress for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'compress-pdf', params, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side compress failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await compressPdf(mainFile, { quality, scale, mode }, progressCb);
          }
        } else if (actionId === 'split-pdf') {
          try {
            console.log(`[runEngine] Running Server Side split for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'split-pdf', params, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side split failed, falling back to client JS:`, serverErr);
            let localMode = params.mode || 'all';
            let localRange = params.range || '';
            if (localMode === 'parts') {
              const numParts = params.parts || 2;
              const totalPages = await getPdfPageCount(mainFile);
              const interval = Math.ceil(totalPages / numParts);
              localMode = 'equal-intervals';
              localRange = String(interval);
            } else if (localMode === 'fixed-ranges') {
              localMode = 'equal-intervals';
              localRange = String(params.pages_per_split || 2);
            }
            const { blobs, names } = await splitPdf(mainFile, localMode, localRange, progressCb);
            if (blobs.length === 1) {
              resultBlob = blobs[0];
            } else {
              const zip = new JSZip();
              blobs.forEach((b, idx) => zip.file(names[idx], b));
              resultBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            }
          }
        } else if (actionId === 'docx-to-pdf') {
          resultBlob = await docxToPdf(mainFile, progressCb);
        } else if (actionId === 'image-to-pdf') {
          let imageFiles = [];
          const inputItems = itemsForEngine && itemsForEngine.length > 0 ? itemsForEngine : [mainFile];
          for (const item of inputItems) {
            const f = item.file || item;
            if (f.name && f.name.toLowerCase().endsWith('.zip')) {
              const zip = new JSZip();
              const zipContent = await zip.loadAsync(f);
              const zipEntries = [];
              for (const [filename, fileEntry] of Object.entries(zipContent.files)) {
                if (!fileEntry.dir) {
                  const ext = '.' + filename.split('.').pop().toLowerCase();
                  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(ext)) {
                    zipEntries.push({ filename, fileEntry });
                  }
                }
              }
              zipEntries.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));
              for (const entry of zipEntries) {
                const blob = await entry.fileEntry.async('blob');
                imageFiles.push(new File([blob], entry.filename, { type: blob.type || 'image/png' }));
              }
            } else {
              imageFiles.push(f);
            }
          }
          resultBlob = await imagesToPdf(imageFiles, progressCb);
        } else if (actionId === 'image-compressor') {
          progressCb(40);
          const quality = params.quality || 0.7;
          const result = await compressImage(mainFile, quality);
          resultBlob = result.blob;
          progressCb(100);
        } else if (actionId === 'image-converter') {
          progressCb(40);
          const format = params.format || 'png';
          const result = await convertImageFormat(mainFile, format, 0.9);
          resultBlob = result.blob;
          progressCb(100);
        } else if (actionId === 'image-resizer') {
          progressCb(40);
          const mode = params.mode || 'percentage';
          const percentage = params.percentage || 75;
          const width = params.width || 800;
          const height = params.height || 600;
          const options = mode === 'percentage' 
            ? { mode: 'percentage', percentage } 
            : { mode: 'exact', width, height };
          const result = await resizeImage(mainFile, options);
          resultBlob = result.blob;
          progressCb(100);
        } else if (actionId === 'rotate-pdf') {
          const angle = params.angle || 90;
          try {
            console.log(`[runEngine] Running Server Side rotate for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'rotate-pdf', { angle }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side rotate failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await rotatePdf(mainFile, angle, progressCb);
          }
        } else if (actionId === 'pdf-to-image') {
          const format = params.format || 'png';
          const dpi = params.dpi || 150;
          try {
            console.log(`[runEngine] Running Server Side PDF-to-image for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'pdf-to-image', { dpi, format }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side pdf-to-image failed or offline, falling back to client stream:`, serverErr);
            const scale = params.dpi ? params.dpi / 72 : 2.0;
            const blobs = [];
            const names = [];
            const files = (itemsForEngine || []).map(i => i.file).filter(Boolean);
            const finalFiles = files.length > 0 ? files : [mainFile];
            
            for (let idx = 0; idx < finalFiles.length; idx++) {
              const file = finalFiles[idx];
              const fileBase = file.name.replace(/\.[^.]+$/, '');
              const filePrefix = finalFiles.length > 1 ? `${fileBase}_` : '';
              
              const startPct = (idx / finalFiles.length) * 100;
              const endPct = ((idx + 1) / finalFiles.length) * 100;
              const subProgressCb = (pct) => {
                if (progressCb) {
                  const totalPct = startPct + (pct / 100) * (endPct - startPct);
                  progressCb(Math.round(totalPct));
                }
              };
              
              await pdfToImagesStream(file, { format, quality: 0.9, scale }, ({ name, blob }) => {
                blobs.push(blob);
                names.push(`${filePrefix}${name}`);
              }, subProgressCb);
            }

            const zip = new JSZip();
            blobs.forEach((b, idx) => zip.file(names[idx], b));
            resultBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
          }
        } else if (actionId === 'text-to-pdf') {
          const text = await mainFile.text();
          const fontSize = params.fontSize || 12;
          const lineSpacing = params.lineSpacing || 1.5;
          resultBlob = await textToPdf(text, { fontSize, lineSpacing, title: mainFile.name }, progressCb);
        } else if (actionId === 'add-watermark') {
          const text = params.text || 'CONFIDENTIAL';
          const opacity = params.opacity || 0.5;
          try {
            console.log(`[runEngine] Running Server Side watermark for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'add-watermark', { text, opacity }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side watermark failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await addWatermark(mainFile, { text, opacity }, progressCb);
          }
        } else if (actionId === 'add-page-numbers') {
          const formatStr = params.format || 'Page {n} of {total}';
          const position = params.position || 'bottom-right';
          const startNumber = params.startNumber || 1;
          try {
            console.log(`[runEngine] Running Server Side page numbering for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'add-page-numbers', { 
              format: formatStr, 
              position, 
              startNumber 
            }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side page numbering failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await addPageNumbers(mainFile, { 
              format: formatStr,
              formatStr, 
              position, 
              startNumber,
              ptopTotalPages: params.ptopTotalPages,
              ptopPageIndices: params.ptopPageIndices,
              shrinkToFit: Boolean(params.shrinkToFit),
              shieldMode: params.shieldMode || 'auto',
              numberingStyle: params.numberingStyle || 'arabic'
            }, progressCb);
          }
        } else if (actionId === 'bates-numbering') {
          const { applyBatesNumbering } = await import('../engines/pdf/batesNumbering.js');
          const batesBytes = await applyBatesNumbering(mainFile, {
            prefix: params.prefix || 'CONF-',
            suffix: params.suffix || '',
            startNumber: params.startNumber || 1,
            digits: params.digits || 6,
            position: params.position || 'bottom-right',
            shrinkToFit: Boolean(params.shrinkToFit),
            shieldMode: params.shieldMode || 'auto'
          });
          progressCb(100);
          resultBlob = new Blob([batesBytes], { type: 'application/pdf' });
        } else if (actionId === 'remove-pages') {
          const pagesStr = params.pages || '';
          let indices = [];
          if (params.ptopPageIndices) {
            indices = params.ptopPageIndices;
          } else {
            const parts = pagesStr.split(',');
            parts.forEach(part => {
              if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                  for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    indices.push(i - 1);
                  }
                }
              } else {
                const num = Number(part.trim());
                if (!isNaN(num) && num > 0) {
                  indices.push(num - 1);
                }
              }
            });
          }
          try {
            console.log(`[runEngine] Running Server Side remove-pages for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'remove-pages', { pages: indices.map(i => i + 1).join(',') }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side remove-pages failed, falling back to client JS:`, serverErr);
            resultBlob = await removePages(mainFile, indices, progressCb);
          }
        } else if (actionId === 'extract-pages') {
          const pagesStr = params.pages || '';
          let indices = [];
          if (params.ptopPageIndices) {
            indices = params.ptopPageIndices;
          } else {
            const parts = pagesStr.split(',');
            parts.forEach(part => {
              if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                  for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    indices.push(i - 1);
                  }
                }
              } else {
                const num = Number(part.trim());
                if (!isNaN(num) && num > 0) {
                  indices.push(num - 1);
                }
              }
            });
          }
          try {
            console.log(`[runEngine] Running Server Side extract-pages for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'extract-pages', { pages: indices.map(i => i + 1).join(',') }, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side extract-pages failed, falling back to client JS:`, serverErr);
            resultBlob = await extractPages(mainFile, indices, progressCb);
          }
        } else if (actionId === 'organize-pdf') {
          const pageConfigs = params.pageConfigs || [];
          // [FIX] Guard against empty pageConfigs producing a 0-page output PDF silently.
          // This can occur if a NLP command doesn't populate configs or PTOP range filtering
          // removes all configs. Throw a clear actionable error instead.
          if (pageConfigs.length === 0) {
            throw new Error('No valid pages are configured for this organize operation. Please set page order in the Organize PDF panel or specify a valid page range.');
          }
          resultBlob = await organizePdf(mainFile, pageConfigs, progressCb);
        } else if (actionId === 'crop-pdf') {
          const bounds = {
            xPercent: params.xPercent ?? (params.bounds?.xPercent ?? 0.1),
            yPercent: params.yPercent ?? (params.bounds?.yPercent ?? 0.1),
            widthPercent: params.widthPercent ?? (params.bounds?.widthPercent ?? 0.8),
            heightPercent: params.heightPercent ?? (params.bounds?.heightPercent ?? 0.8)
          };
          try {
            console.log(`[runEngine] Running Server Side crop for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'crop-pdf', params, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side crop failed or offline, falling back to client JS:`, serverErr);
            resultBlob = await cropPdf(mainFile, bounds, progressCb);
          }
        } else if (actionId === 'edit-pdf') {
          const annotations = params.overlays || params.annotations || [];
          resultBlob = await editPdf(mainFile, annotations, progressCb);
        } else if (actionId === 'pdf-forms') {
          const fieldValues = params.fieldValues || {};
          resultBlob = await fillFormFields(mainFile, fieldValues, progressCb);
        } else if (actionId === 'sign-pdf') {
          let fields = params.fields;
          if (!fields) {
            const sigOptions = params.sigOptions || {};
            const dataUrl = params.signatureDataUrl || sigOptions.signatureDataUrl || null;
            const sigBlob = sigOptions.signaturePngBlob || null;
            fields = [{
              id: 'sig_canvas_node',
              type: 'signature',
              pageIndex: params.pageIndex ?? sigOptions.pageIndex ?? 0,
              x: params.xPercent ?? sigOptions.xPercent ?? 0.5,
              y: params.yPercent ?? sigOptions.yPercent ?? 0.5,
              width: params.widthPercent ?? sigOptions.widthPercent ?? 0.25,
              height: 0.08,
              dataUrl: dataUrl,
              blob: sigBlob
            }];
          }
          resultBlob = await signPdf(mainFile, fields, { onProgress: progressCb });
        } else if (actionId === 'redact-pdf') {
          const redactParams = {
            boxes: params.boxes || [],
            textPatterns: params.textPatterns || []
          };
          resultBlob = await redactPdf(mainFile, redactParams, progressCb);
        } else if (actionId === 'repair-pdf') {
          try {
            console.log(`[runEngine] Running Server Side repair for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, 'repair-pdf', params, progressCb);
          } catch (serverErr) {
            console.warn('[runEngine] Server Side repair failed or offline, falling back to client JS:', serverErr);
            const repairRes = await repairPdf(mainFile, { returnBlobOnly: true }, progressCb);
            resultBlob = repairRes instanceof Blob ? repairRes : (repairRes.blob || repairRes);
          }
        } else if (actionId === 'ocr-pdf') {
          const language = params.language || 'eng';
          try {
            console.log(`[runEngine] Running Server Side OCR for ${mainFile.name}...`);
            resultBlob = await executeServerJob(mainFile, actionId, params, progressCb);
            console.log(`[runEngine] Backend Server Side OCR completed successfully for ${mainFile.name}`);
          } catch (serverErr) {
            console.warn(`[runEngine] Server Side OCR failed or offline, falling back to client Side OCR:`, serverErr);
            resultBlob = await ocrPdf(mainFile, { language }, progressCb);
            console.log(`[runEngine] Client Side OCR completed successfully for ${mainFile.name}`);
          }
        } else if (actionId === 'un-ocr-pdf') {
          const scale = params.scale || 2.0;
          resultBlob = await unOcrPdf(mainFile, { scale }, progressCb);
        } else if (actionId === 'qr-generator') {
          const text = params.text || 'https://docscalar.app';
          const size = params.size || 300;
          const darkColor = params.darkColor || '#000000';
          const lightColor = params.lightColor || '#ffffff';
          const qrDataUrl = await generateQR(text, { size, darkColor, lightColor });
          const res = await fetch(qrDataUrl);
          resultBlob = await res.blob();
          progressCb(100);
        } else if (actionId === 'excel-to-pdf') {
          resultBlob = await excelToPdf(mainFile, progressCb);
        } else if (actionId === 'powerpoint-to-pdf') {
          resultBlob = await powerpointToPdf(mainFile, progressCb);
        } else if (actionId === 'html-to-pdf') {
          resultBlob = await htmlToPdf(mainFile, progressCb);
        } else if (actionId === 'bates-numbering') {
          const pdfBytes = await mainFile.arrayBuffer();
          const outputBytes = await applyBatesNumbering(pdfBytes, params);
          progressCb(100);
          resultBlob = new Blob([outputBytes], { type: 'application/pdf' });
        } else if (actionId === 'condition-router') {
          const ruleType = params.ruleType || 'pageCount';
          const operator = params.operator || '>';
          const threshold = Number(params.thresholdValue) || 5;
          let pass = false;
          try {
            if (ruleType === 'pageCount') {
              const count = await getPdfPageCount(mainFile);
              if (operator === '>') pass = count > threshold;
              else if (operator === '<') pass = count < threshold;
              else if (operator === '==') pass = count === threshold;
              else if (operator === '>=') pass = count >= threshold;
              else if (operator === '<=') pass = count <= threshold;
            } else if (ruleType === 'fileSizeMB') {
              const sizeMB = mainFile.size / (1024 * 1024);
              if (operator === '>') pass = sizeMB > threshold;
              else if (operator === '<') pass = sizeMB < threshold;
              else if (operator === '==') pass = Math.abs(sizeMB - threshold) < 0.1;
              else if (operator === '>=') pass = sizeMB >= threshold;
              else if (operator === '<=') pass = sizeMB <= threshold;
            }
          } catch (condErr) {
            console.warn('[condition-router] Evaluation warning:', condErr);
          }
          progressCb(100);
          resultBlob = mainFile;
        } else if (actionId === 'unzip-file') {
          progressCb(30);
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(mainFile);
          const entries = Object.values(zipContent.files).filter(e => !e.dir);
          if (entries.length === 1) {
            resultBlob = await entries[0].async('blob');
          } else {
            resultBlob = mainFile;
          }
        } else if (actionId === 'pdf-to-word') {
          try {
            resultBlob = await executeServerJob(mainFile, actionId, params, progressCb);
          } catch (serverErr) {
            console.warn(`[runEngine] Server PDF to Word failed, falling back to local client engine:`, serverErr);
            resultBlob = await convertPdfToWord(mainFile, params, progressCb);
          }
        } else if (['pdf-to-excel', 'pdf-to-powerpoint', 'protect-pdf', 'unlock-pdf', 'redact-pdf', 'compare-pdf', 'pdf-to-pdfa', 'url-to-pdf'].includes(actionId)) {
          resultBlob = await executeServerJob(mainFile, actionId, params, progressCb);
        } else {
          throw new Error(`Tool "${actionId}" is not yet wired for canvas execution.`);
        }
        return resultBlob;
      };

      const getOutputNameForAction = (baseName, ext, actionId, params) => {
        if (actionId === 'compress-pdf') return `${baseName}_compressed.pdf`;
        if (actionId === 'split-pdf') return `${baseName}_split.zip`;
        if (['docx-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'image-to-pdf', 'html-to-pdf', 'text-to-pdf'].includes(actionId)) return `${baseName}.pdf`;
        if (actionId === 'image-compressor') return `${baseName}_compressed.${ext || 'jpg'}`;
        if (actionId === 'image-converter') return `${baseName}_converted.${params.format || 'png'}`;
        if (actionId === 'image-resizer') return `${baseName}_resized.${ext || 'png'}`;
        if (actionId === 'ocr-pdf') return `${baseName}_ocr.pdf`;
        if (actionId === 'un-ocr-pdf') return `${baseName}_flattened.pdf`;
        if (actionId === 'pdf-to-word') return `${baseName}.docx`;
        if (actionId === 'pdf-to-excel') return `${baseName}.xlsx`;
        if (actionId === 'pdf-to-powerpoint') return `${baseName}.pptx`;
        if (actionId === 'pdf-to-image') return `${baseName}_images.zip`;
        if (actionId === 'pdf-to-pdfa') return `${baseName}_pdfa.pdf`;
        if (actionId === 'bates-numbering') return `${baseName}_bates.pdf`;
        if (actionId === 'add-watermark') return `${baseName}_watermarked.pdf`;
        if (actionId === 'add-page-numbers') return `${baseName}_numbered.pdf`;
        if (actionId === 'remove-pages') return `${baseName}_modified.pdf`;
        if (actionId === 'extract-pages') return `${baseName}_extracted.pdf`;
        if (actionId === 'organize-pdf') return `${baseName}_organized.pdf`;
        if (actionId === 'crop-pdf') return `${baseName}_cropped.pdf`;
        if (actionId === 'edit-pdf') return `${baseName}_edited.pdf`;
        if (actionId === 'pdf-forms') return `${baseName}_filled.pdf`;
        if (actionId === 'sign-pdf') return `${baseName}_signed.pdf`;
        if (actionId === 'redact-pdf') return `${baseName}_redacted.pdf`;
        if (actionId === 'repair-pdf') return `${baseName}_repaired.pdf`;
        if (actionId === 'compare-pdf') return `${baseName}_comparison.pdf`;
        if (actionId === 'qr-generator') return `qr_code.png`;
        if (actionId === 'url-to-pdf') return `webpage_${Date.now()}.pdf`;
        if (actionId === 'condition-router') return `${baseName}_routed.pdf`;
        if (actionId === 'unzip-file') return `${baseName}_extracted.pdf`;
        return `${baseName}_output.pdf`;
      };

      let lastOutputId = null;
      let lastOutputName = '';
      let lastResultBlob = null;
      const batchOutputIds = [];

      if (!isMultiInput && (finalItems.length > 1 || (finalItems.length === 1 && finalItems[0].name.toLowerCase().endsWith('.zip')))) {
        // Batch Mode: process multiple inputs individually (or a single zip file)
        speakAnnouncement(`Started batch executing ${op.toolId.replace('-', ' ')}.`);

        const zipInputs = finalItems.filter(item => item.name.toLowerCase().endsWith('.zip'));
        const standardInputs = finalItems.filter(item => !item.name.toLowerCase().endsWith('.zip'));

        const zipFileLists = {};
        let totalFilesCount = standardInputs.length;

        // Resolve zip structures
        for (const item of zipInputs) {
          try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(item.file);
            const files = [];
            for (const [filename, fileEntry] of Object.entries(zipContent.files)) {
              if (!fileEntry.dir) {
                const ext = '.' + filename.split('.').pop().toLowerCase();
                const isAccepted = !validation || validation.accept.length === 0 || validation.accept.some(acc => {
                  if (acc === 'image/*') return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
                  return acc === ext;
                });
                if (isAccepted) {
                  files.push({ filename, fileEntry });
                }
              }
            }
            zipFileLists[item.id] = files;
            totalFilesCount += files.length;
          } catch (e) {
            console.error("Failed to parse zip file structure", e);
            zipFileLists[item.id] = [];
          }
        }

        if (totalFilesCount === 0) {
          throw new Error("No compatible files found in the connected inputs.");
        }

        const runLimit = async (itemsList, limit, fn) => {
          const results = [];
          const executing = [];
          for (const item of itemsList) {
            if (abortController.signal.aborted) throw new Error('Operation cancelled.');
            const p = Promise.resolve().then(() => fn(item));
            results.push(p);
            if (limit <= itemsList.length) {
              const e = p.then(() => executing.splice(executing.indexOf(e), 1));
              executing.push(e);
              if (executing.length >= limit) {
                await Promise.race(executing);
              }
            }
          }
          return Promise.all(results);
        };

        const allocatedPositions = [];
        let spawnedOutputsCount = 0;

        const getOrCreateBatchOutputId = (name, x, y, blob) => {
          if (overwriteChoice === 'replace' && spawnedOutputsCount < existingIds.length) {
            const extId = existingIds[spawnedOutputsCount];
            
            // Re-calculate non-colliding layout coordinates relative to operator's current location
            let safeX = x;
            let safeY = y;
            let collision = true;
            let iterations = 0;
            
            while (collision && iterations < 100) {
              collision = false;
              iterations++;
              for (const node of [...workspaceQueue.filter(q => q.id !== extId), ...operations]) {
                const dx = Math.abs((node.x || 100) - safeX);
                const dy = Math.abs((node.y || 100) - safeY);
                if (dx < 250 && dy < 150) {
                  collision = true;
                  break;
                }
              }
              if (collision) {
                safeY += 160;
              }
            }

            setWorkspaceQueue(prev => prev.map(q => q.id === extId ? {
              ...q,
              name,
              resultName: name,
              resultBlob: blob,
              size: blob.size,
              status: 'Completed',
              progress: 100,
              x: safeX,
              y: safeY,
              pageRange: params.pageRange || null
            } : q));
            spawnedOutputsCount++;
            return extId;
          } else {
            const newId = createCompletedOutputNode(name, x, y, blob, allocatedPositions, op.ancestry, params.pageRange || null);
            spawnedOutputsCount++;
            return newId;
          }
        };

        let processedCount = 0;
        const updateBatchProgress = () => {
          const overallPct = Math.round((processedCount * 100) / totalFilesCount);
          setOperations(prev => prev.map(o => o.id === opId ? { ...o, progress: overallPct } : o));
        };

        // 1. Process ZIP inputs (each zip input maps 1-to-1 to a zip output card)
        for (let zIdx = 0; zIdx < zipInputs.length; zIdx++) {
          const zipItem = zipInputs[zIdx];
          const files = zipFileLists[zipItem.id] || [];
          if (files.length === 0) continue;

          const succeededOutputs = [];
          const failedFiles = [];

          // Process files in parallel batches of 3, or sequentially (1) if targeting specific page ranges to avoid memory spikes
          const zipConcurrency = params.pageRange ? 1 : 3;
          await runLimit(files, zipConcurrency, async (fileEntryWrapper) => {
            if (abortController.signal.aborted) throw new Error('Operation cancelled.');
            const { filename, fileEntry } = fileEntryWrapper;
            const blob = await fileEntry.async('blob');
            const fileObj = new File([blob], filename, { type: resolveMimeType(filename, blob.type) });

            const baseName = filename.replace(/\.[^.]+$/, '').split('/').pop();
            const ext = filename.split('.').pop();
            const outputName = getOutputNameForAction(baseName, ext, actionId, params);

            try {
              const resultBlob = await runEngineWithPtop(fileObj, [{ id: `${zipItem.id}-zip-${filename}`, file: fileObj, name: fileObj.name }], () => {});
              succeededOutputs.push({ name: outputName, blob: resultBlob });
            } catch (err) {
              console.error(`Failed to process zip item "${filename}":`, err);
              failedFiles.push(filename);
            } finally {
              processedCount++;
              updateBatchProgress();
            }
          });

          if (succeededOutputs.length > 0) {
            const zip = new JSZip();
            succeededOutputs.forEach(out => {
              zip.file(out.name, out.blob);
            });
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            const zipName = `${zipItem.name.replace(/\.[^.]+$/, '')}_converted.zip`;

            // Spawn exactly one ZIP card for this ZIP input in a clean 4-column grid layout
            const col = spawnedOutputsCount % 4;
            const row = Math.floor(spawnedOutputsCount / 4);
            const outputX = op.x + 280 + col * 260;
            const outputY = op.y + row * 160;

            const outputId = getOrCreateBatchOutputId(zipName, outputX, outputY, zipBlob);
            generatedOutputs.push({ blob: zipBlob, name: zipName });

            batchOutputIds.push(outputId);
            lastOutputId = outputId;
            lastOutputName = zipName;
            lastResultBlob = zipBlob;

            setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputIds: [...batchOutputIds] } : o));
          }
        }

        // 2. Process Standard file inputs
        if (standardInputs.length > 0) {
          const standardSucceeded = [];
          const standardFailed = [];
          
          let packageStandardAsZip = standardInputs.length >= 10;
          if (standardInputs.length > 1) {
            const choice = await new Promise((resolve) => {
              setBatchChoiceModal({
                resolve,
                fileCount: standardInputs.length
              });
            });
            packageStandardAsZip = (choice === 'zip');
          }

          // Process standard files in parallel batches of 3, or sequentially (1) if targeting specific page ranges to avoid memory spikes
          const standardConcurrency = params.pageRange ? 1 : 3;
          await runLimit(standardInputs, standardConcurrency, async (currentItem) => {
            if (abortController.signal.aborted) throw new Error('Operation cancelled.');
            const currentFile = currentItem.file;

            const baseName = currentFile.name.replace(/\.[^.]+$/, '');
            const ext = currentFile.name.split('.').pop();
            const outputName = getOutputNameForAction(baseName, ext, actionId, params);

            try {
              const resultBlob = await runEngineWithPtop(currentFile, [currentItem], () => {});
              
              if (packageStandardAsZip) {
                standardSucceeded.push({ name: outputName, blob: resultBlob });
              } else {
                // Spawn individual node boxes on the canvas in a clean 4-column grid layout
                const col = spawnedOutputsCount % 4;
                const row = Math.floor(spawnedOutputsCount / 4);
                const outputX = op.x + 280 + col * 260;
                const outputY = op.y + row * 160;

                const outputId = getOrCreateBatchOutputId(outputName, outputX, outputY, resultBlob);
                generatedOutputs.push({ blob: resultBlob, name: outputName });

                batchOutputIds.push(outputId);
                lastOutputId = outputId;
                lastOutputName = outputName;
                lastResultBlob = resultBlob;

                setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputIds: [...batchOutputIds] } : o));
              }
            } catch (err) {
              console.error(`Failed to process standard item "${currentFile.name}":`, err);
              standardFailed.push(currentFile.name);
            } finally {
              processedCount++;
              updateBatchProgress();
            }
          });

          if (packageStandardAsZip && standardSucceeded.length > 0) {
            const zip = new JSZip();
            standardSucceeded.forEach(out => {
              zip.file(out.name, out.blob);
            });
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            const zipName = `${op.toolId}_batch_output.zip`;

            // Spawn the standard packaged ZIP output card in a clean 4-column grid layout
            const col = spawnedOutputsCount % 4;
            const row = Math.floor(spawnedOutputsCount / 4);
            const outputX = op.x + 280 + col * 260;
            const outputY = op.y + row * 160;

            const outputId = getOrCreateBatchOutputId(zipName, outputX, outputY, zipBlob);
            generatedOutputs.push({ blob: zipBlob, name: zipName });

            batchOutputIds.push(outputId);
            lastOutputId = outputId;
            lastOutputName = zipName;
            lastResultBlob = zipBlob;

            setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputIds: [...batchOutputIds] } : o));
          }
        }

        // Clean up leftover unused outputs if we did a replace with fewer outputs than existed
        if (overwriteChoice === 'replace' && spawnedOutputsCount < existingIds.length) {
          const unusedIds = existingIds.slice(spawnedOutputsCount);
          setWorkspaceQueue(prev => prev.filter(q => !unusedIds.includes(q.id)));
        }

        // Calculate batch execution telemetry
        const batchInputSize = (finalItems && finalItems.length > 0)
          ? finalItems.reduce((acc, item) => acc + (item.file?.size || item.size || 0), 0)
          : calculateInputSize(op, currentQueue, opsList);
        const batchOutputSize = generatedOutputs.reduce((acc, b) => acc + (b.blob?.size || 0), 0);
        const batchTelemetry = computeNodeTelemetry({ startTime, inputSize: batchInputSize, outputSize: batchOutputSize });

        // Mark operation as completed
        setOperations(prev => prev.map(o => o.id === opId ? { ...o, outputId: lastOutputId, outputIds: batchOutputIds, status: 'completed', progress: 100, telemetry: batchTelemetry } : o));
        setAuditLogs(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            opId: opId,
            toolId: actionId,
            status: 'success',
            message: `Completed batch '${TOOL_REGISTRY[actionId]?.name}' on ${finalItems.length} files generating ${batchOutputIds.length} result(s)`
          }
        ]);
        speakAnnouncement(`Successfully processed batch operations.`);

        const nextOps = opsList.map(o => o.id === opId ? { ...o, outputId: lastOutputId, outputIds: batchOutputIds, status: 'completed', progress: 100, telemetry: batchTelemetry } : o);

        // CRITICAL: Release the lock early so downstream operators can acquire it immediately
        if (isTopLevel) {
          releaseLock();
          releaseLock = () => {}; // prevent double-release in finally
        }

        triggerDownstreamOperators(opId, batchOutputIds, nextOps);

      } else {
        // Standard Mode: single input file or multi-input file tools
        const mainFile = finalItems[0]?.file || null;
        console.log(`[executeOperator] Standard mode runEngine starting for ${actionId} with file:`, mainFile?.name);
        const progressCb = (pct, statusText) => {
          setOperations(prev => prev.map(o => o.id === opId ? { ...o, progress: pct, statusText: formatStatusText(statusText) } : o));
          if (pct > 0 && pct < 100 && pct % 25 === 0) {
            speakAnnouncement(`Processing ${actionId.replace('-', ' ')}. Progress ${pct} percent.`);
          }
        };

        const resultBlob = await runEngineWithPtop(mainFile, finalItems, progressCb);
        console.log(`[executeOperator] runEngine completed for ${actionId}. Output blob size:`, resultBlob?.size);

        const baseName = mainFile ? mainFile.name.replace(/\.[^.]+$/, '') : (actionId === 'url-to-pdf' ? 'webpage' : 'qr_code');
        const ext = mainFile ? mainFile.name.split('.').pop() : (actionId === 'url-to-pdf' ? 'pdf' : 'png');
        let outputName = `${baseName}_output.pdf`;
        if (actionId === 'merge-pdf') outputName = 'merged_document.pdf';
        else if (actionId === 'compress-pdf') outputName = `${baseName}_compressed.pdf`;
        else if (actionId === 'split-pdf') outputName = `${baseName}_split.zip`;
        else if (actionId === 'pdf-to-image') outputName = `${baseName}_images.zip`;
        else if (['docx-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'image-to-pdf', 'html-to-pdf'].includes(actionId)) outputName = `${baseName}.pdf`;
        else if (actionId === 'image-compressor') outputName = `${baseName}_compressed.${ext}`;
        else if (actionId === 'image-converter') outputName = `${baseName}_converted.${params.format || 'png'}`;
        else if (actionId === 'image-resizer') outputName = `${baseName}_resized.${ext}`;
        else if (actionId === 'ocr-pdf') outputName = `${baseName}_ocr.pdf`;
        else if (actionId === 'pdf-to-word') outputName = `${baseName}.docx`;
        else if (actionId === 'pdf-to-excel') outputName = `${baseName}.xlsx`;
        else if (actionId === 'pdf-to-powerpoint') outputName = `${baseName}.pptx`;
        else if (actionId === 'qr-generator') outputName = 'qrcode.png';
        else if (actionId === 'url-to-pdf') outputName = 'webpage.pdf';

        let isSplitUnpack = false;
        let splitOutputIds = [];
        let splitOutputsList = [];

        const hasDownstreamConsumers = operations.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(op.id));

        if (actionId === 'split-pdf' || actionId === 'pdf-to-image' || actionId === 'unzip-file') {
          try {
            if (resultBlob && (resultBlob.type === 'application/zip' || (outputName && outputName.endsWith('.zip')))) {
              const zip = new JSZip();
              const zipContent = await zip.loadAsync(resultBlob);
              const fileKeys = Object.keys(zipContent.files).filter(name => !zipContent.files[name].dir);
              const totalFiles = fileKeys.length;
              
              const shouldUnpack = shouldUnpackCanvasCards(hasDownstreamConsumers, totalFiles, MAX_INDIVIDUAL_CANVAS_CARDS);

              if (shouldUnpack) {
                isSplitUnpack = true;
                for (let idx = 0; idx < totalFiles; idx++) {
                  const filename = fileKeys[idx];
                  const fileEntry = zipContent.files[filename];
                  const blob = await fileEntry.async('blob');
                  const mime = resolveMimeType(filename, blob.type);
                  const file = new File([blob], filename, { type: mime });
                  
                  const outputX = op.x + 280;
                  const offset = (idx - (totalFiles - 1) / 2) * 150;
                  const outputY = op.y + offset;
                  
                  const outId = createCompletedOutputNode(file.name, outputX, outputY, file, [], op.ancestry);
                  splitOutputIds.push(outId);
                  splitOutputsList.push({ blob, name: file.name });
                  generatedOutputs.push({ blob, name: file.name });
                }
              } else {
                // Large batch (> 5 files) or intermediate operator: retain all sub-files in generatedOutputs
                for (let idx = 0; idx < totalFiles; idx++) {
                  const filename = fileKeys[idx];
                  const fileEntry = zipContent.files[filename];
                  const blob = await fileEntry.async('blob');
                  splitOutputsList.push({ blob, name: filename });
                  generatedOutputs.push({ blob, name: filename });
                }
              }
            }
          } catch (zipErr) {
            console.warn('[executeOperator] Failed to load/unpack zip:', zipErr);
          }
        }

        let outputId;
        let outputIdsToTrack = [];
        if (isSplitUnpack) {
          outputId = splitOutputIds[splitOutputIds.length - 1];
          outputIdsToTrack = splitOutputIds;
        } else {
          if (overwriteChoice === 'replace' && existingIds.length > 0) {
            outputId = existingIds[0];
            outputIdsToTrack = [outputId];
            
            // Re-calculate non-colliding layout coordinates relative to operator's current location
            let safeX = op.x + 280;
            let safeY = op.y;
            let collision = true;
            let iterations = 0;
            
            while (collision && iterations < 100) {
              collision = false;
              iterations++;
              for (const node of [...workspaceQueue.filter(q => q.id !== outputId), ...operations]) {
                const dx = Math.abs((node.x || 100) - safeX);
                const dy = Math.abs((node.y || 100) - safeY);
                if (dx < 250 && dy < 150) {
                  collision = true;
                  break;
                }
              }
              if (collision) {
                safeY += 160;
              }
            }

            setWorkspaceQueue(prev => prev.map(q => q.id === outputId ? {
              ...q,
              name: outputName,
              resultName: outputName,
              resultBlob: resultBlob,
              size: resultBlob.size,
              status: 'Completed',
              progress: 100,
              x: safeX,
              y: safeY,
              pageRange: params.pageRange || null
            } : q));
          } else {
            outputId = createCompletedOutputNode(outputName, op.x, op.y, resultBlob, [], op.ancestry, params.pageRange || null);
            outputIdsToTrack = [outputId];
          }
          generatedOutputs.push({ blob: resultBlob, name: outputName });
        }
        
        // Calculate execution telemetry (duration, throughput MB/s, delta percentage)
        const finalInputSize = (finalItems && finalItems.length > 0)
          ? finalItems.reduce((acc, item) => acc + (item.file?.size || item.size || 0), 0)
          : calculateInputSize(op, currentQueue, opsList);
        const finalOutputSize = resultBlob?.size || generatedOutputs.reduce((acc, o) => acc + (o.blob?.size || 0), 0) || 0;
        const telemetry = computeNodeTelemetry({ startTime, inputSize: finalInputSize, outputSize: finalOutputSize });

        // Mark operation as completed and link output ID
        setOperations(prev => prev.map(o => o.id === opId ? { 
          ...o, 
          outputId, 
          outputIds: outputIdsToTrack, 
          status: 'completed', 
          progress: 100,
          prevInputIds: [...o.inputIds],
          telemetry
        } : o));

        const auditMessage = isSplitUnpack
          ? `Completed '${TOOL_REGISTRY[actionId]?.name}' on input '${mainFile?.name}' generating ${splitOutputIds.length} independent files`
          : `Completed '${TOOL_REGISTRY[actionId]?.name}' on input '${mainFile?.name}' generating '${outputName}'`;

        setAuditLogs(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            opId: opId,
            toolId: actionId,
            status: 'success',
            message: auditMessage
          }
        ]);
        
        const successMessage = isSplitUnpack
          ? `Successfully split into ${splitOutputIds.length} files!`
          : `Successfully processed ${outputName}!`;
        speakAnnouncement(isSplitUnpack ? `Processing complete. Generated ${splitOutputIds.length} documents.` : `Processing complete. Output document ${outputName} generated.`);
        showToast(successMessage);

        const nextOps = opsList.map(o => o.id === opId ? { 
          ...o, 
          outputId, 
          outputIds: outputIdsToTrack, 
          status: 'completed', 
          progress: 100,
          prevInputIds: [...o.inputIds],
          telemetry
        } : o);

        // CRITICAL: Release the execution lock BEFORE triggering downstream operators.
        // If we release in `finally` (after return), downstream ops that need the lock
        // (e.g. OCR after Merge) will deadlock — they schedule in 150ms but the lock
        // isn't free until this entire async function resolves.
        if (isTopLevel) {
          releaseLock();
          releaseLock = () => {}; // prevent double-release in finally
        }

        triggerDownstreamOperators(opId, outputIdsToTrack, nextOps);

        lastResultBlob = resultBlob;
        lastOutputName = outputName;
      }

      return { blob: lastResultBlob, name: lastOutputName, outputs: generatedOutputs };

    } catch (err) {
      console.error(`[executeOperator] Error caught for ${opId} (${actionId || 'unknown'}):`, err);
      const isCancelled = err.message === 'Operation cancelled.' || (abortController.signal.aborted && !isTimeoutAborted);
      const isTimeout = isTimeoutAborted || (err.message && err.message.includes('timed out'));
      const isCircular = err.message && err.message.includes('Circular dependency');
      const isUnsupported = err.message && err.message.includes('not yet wired');

      setOperations(prev => prev.map(o => o.id === opId ? { ...o, status: 'failed' } : o));
      setAuditLogs(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          opId: opId,
          toolId: actionId || 'unknown',
          status: 'failed',
          message: `Failed '${TOOL_REGISTRY[actionId]?.name || 'operator'}': ${err.message || 'Unknown error'}`
        }
      ]);

      if (isCancelled) {
        // Already handled by cancelOperator
      } else if (isTimeout) {
        speakAnnouncement('Operation timed out.');
        showToast(`${actionId.replace('-', ' ')} timed out after ${EXECUTION_TIMEOUT_MS / 1000}s. Try a smaller file or use the dedicated tool page.`);
      } else if (isCircular) {
        // Already toasted in the cycle detection block
      } else if (isUnsupported) {
        speakAnnouncement('Tool not available in canvas.');
        showToast(`"${actionId.replace('-', ' ')}" isn't available in the canvas yet. Use the dedicated tool page from the sidebar.`);
      } else {
        speakAnnouncement('Operation failed.');
        showToast(`Error processing ${mainFile.name}: ${err.message || 'Unknown error'}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      clearInterval(timerInterval);
      setOpTimers(prev => {
        const next = { ...prev };
        delete next[opId];
        return next;
      });
      delete activeAbortControllers.current[opId];
      setBatchChoiceModal(null);
      releaseLock();
    }
  };

  // Canvas Right-Click Context Menu Handlers
  const handleContextMenu = (e) => {
    if (e.target.closest('input, textarea, button')) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Account for zoom and pan coordinates
    const gridX = (x - panOffset.x) / zoom;
    const gridY = (y - panOffset.y) / zoom;

    setContextMenu({
      visible: true,
      x,
      y,
      gridX,
      gridY,
      activeSubmenu: null
    });
  };

  const handleCanvasDoubleClick = (e) => {
    if (e.target !== canvasRef.current && !e.target.classList.contains('stitch-dot-grid')) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = (x - panOffset.x) / zoom;
    const gridY = (y - panOffset.y) / zoom;

    lastUploadCoords.current = { x: gridX, y: gridY };
    fileInputRef.current.click();
  };

  const spawnToolAtCoords = (actionId, x, y) => {
    pushHistoryState();
    
    let defaultParams = {};
    if (actionId === 'compress-pdf') {
      defaultParams = { quality: 0.65, mode: 'lossless' };
    } else if (actionId === 'split-pdf') {
      defaultParams = { mode: 'all', range: '' };
    } else if (actionId === 'rotate-pdf') {
      defaultParams = { angle: 90 };
    } else if (actionId === 'add-watermark') {
      defaultParams = { text: 'CONFIDENTIAL', opacity: 0.5, angle: 45 };
    } else if (actionId === 'add-page-numbers') {
      defaultParams = { format: 'Page {n} of {total}', position: 'bottom-right' };
    } else if (actionId === 'protect-pdf') {
      defaultParams = { password: '', permissions: { print: true, copy: true, modify: false } };
    } else if (actionId === 'image-compressor') {
      defaultParams = { quality: 0.7 };
    } else if (actionId === 'image-converter') {
      defaultParams = { format: 'png' };
    } else if (actionId === 'image-resizer') {
      defaultParams = { percentage: 75, mode: 'percentage', width: 800, height: 600 };
    }

    const opId = `op-${Date.now()}`;
    const newOp = {
      id: opId,
      toolId: actionId,
      inputIds: [],
      outputId: null,
      status: 'idle',
      progress: 0,
      x,
      y,
      params: defaultParams
    };

    setOperations(prev => [...prev, newOp]);
    showToast(`Added ${actionId.replace('-', ' ')} tool to canvas.`);
    speakAnnouncement(`Added ${actionId.replace('-', ' ')} tool.`);
  };

  const arrangeCanvasNodes = () => {
    pushHistoryState();
    const { queue: nextQueue, operations: nextOps } = optimizeCanvasLayout(operations, workspaceQueue);
    setWorkspaceQueue(nextQueue);
    setOperations(nextOps);
    
    showToast('Canvas layout arranged successfully');
    speakAnnouncement('Canvas layout arranged.');
  };

  // Auto-dismiss context menu when clicking anywhere else
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const detectPdfPageCount = async (fileOrBlob) => {
    try {
      const arrayBuffer = await new Response(fileOrBlob).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const text = new TextDecoder('ascii').decode(bytes.slice(Math.max(0, bytes.length - 20000)));
      let countMatch = [...text.matchAll(/\/Count\s+(\d+)/g)];
      if (countMatch.length > 0) {
        return parseInt(countMatch[countMatch.length - 1][1]);
      }
      
      const textStart = new TextDecoder('ascii').decode(bytes.slice(0, 20000));
      countMatch = [...textStart.matchAll(/\/Count\s+(\d+)/g)];
      if (countMatch.length > 0) {
        return parseInt(countMatch[0][1]);
      }
    } catch (e) {
      console.error("detectPdfPageCount error:", e);
    }
    return 10;
  };

  const runClientHeuristicPlanner = async (cmd, graphState, lastActiveNodesList = [], selectedNodeIds = []) => {
    return planCanvasWorkflow(cmd, graphState, lastActiveNodesList, selectedNodeIds);
  };

  const confirmWorkflowExecution = async (opIds, fallbackOps = []) => {
    let totalOps = 0;
    const targetFiles = [];
    const destructiveOps = [];

    opIds.forEach(opId => {
      const op = operationsRef.current.find(o => o.id === opId) || fallbackOps.find(o => o.id === opId);
      if (!op) return;
      const tool = TOOL_REGISTRY[op.toolId];
      if (!tool) return;

      let multiplier = 1;
      op.inputIds.forEach(inputId => {
        const node = [...workspaceQueueRef.current, ...operationsRef.current].find(n => n.id === inputId) || fallbackOps.find(n => n.id === inputId);
        if (node) {
          const name = node.name || (node.toolId ? `${node.toolId}_output` : 'unknown');
          if (!targetFiles.includes(name)) {
            targetFiles.push(name);
          }
          if (op.toolId === 'split-pdf' && op.params?.mode === 'all') {
            multiplier = node.pageCount || 10;
          }
        }
      });

      const isDownstreamOfSplit = op.inputIds.some(inputId => {
        const parentOp = operationsRef.current.find(o => o.outputId === inputId || (o.outputIds && o.outputIds.includes(inputId))) || fallbackOps.find(o => o.outputId === inputId || (o.outputIds && o.outputIds.includes(inputId)));
        return parentOp && parentOp.toolId === 'split-pdf';
      });

      if (isDownstreamOfSplit) {
        const splitOp = operationsRef.current.find(o => {
          const outIds = o.outputIds || (o.outputId ? [o.outputId] : []);
          return outIds.some(oid => op.inputIds.includes(oid));
        }) || fallbackOps.find(o => {
          const outIds = o.outputIds || (o.outputId ? [o.outputId] : []);
          return outIds.some(oid => op.inputIds.includes(oid));
        });
        if (splitOp) {
          if (splitOp.params?.mode === 'all') {
            const firstInput = [...workspaceQueueRef.current, ...operationsRef.current].find(n => n.id === splitOp.inputIds[0]) || fallbackOps.find(n => n.id === splitOp.inputIds[0]);
            multiplier = firstInput?.pageCount || 10;
          } else if (splitOp.params?.mode === 'parts') {
            multiplier = splitOp.params?.parts || 2;
          } else if (splitOp.params?.mode === 'range') {
            multiplier = 5;
          }
        }
      }

      totalOps += multiplier;

      if (tool.destructive) {
        destructiveOps.push(tool.name);
      }
    });

    if (totalOps > 20) {
      const proceed = await new Promise(resolve => {
        setThresholdPrompt({
          opCount: totalOps,
          resolve
        });
      });
      setThresholdPrompt(null);
      if (!proceed) return false;
    }

    if (destructiveOps.length > 0) {
      const proceed = await new Promise(resolve => {
        setDestructivePrompt({
          tools: destructiveOps,
          files: targetFiles,
          resolve
        });
      });
      setDestructivePrompt(null);
      if (!proceed) return false;
    }

    return true;
  };

  const handlePlayClick = async (opId) => {
    const allowed = await confirmWorkflowExecution([opId]);
    if (allowed) {
      executeOperator(opId, null).catch(err => {
        console.error('Operator execution failed:', err);
      });
    }
  };

  // Handle Command Submission (Stitch Natural Language Bar)
  const handleSendCommand = async (e, customCmd = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const rawCmd = typeof e === 'string' ? e : (customCmd || commandInput);
    if (!rawCmd || !rawCmd.trim() || isThinking) return;

    // Stitch Canvas Preview Quota Enforcement (10 actions/day for Free Accounts, Unlimited for Pro)
    if (!isAuthenticated) {
      openCanvasLimitModal({ isGuest: true, reason: 'account_required' });
      return;
    }
    if (!isPro) {
      const quota = getCanvasQuota(userEmail, false);
      if (quota.remaining <= 0) {
        openCanvasLimitModal({ isGuest: false, reason: 'quota_exhausted', used: quota.used, limit: quota.limit });
        return;
      }
      consumeCanvasQuota(userEmail, false);
    }

    const normalizedCmd = normalizeUserPrompt(rawCmd);
    const cmd = (normalizedCmd || rawCmd).trim();
    setCommandInput('');
    if (commandTextareaRef.current) {
      commandTextareaRef.current.style.height = 'auto';
    }
    setIsThinking(true);
    setShowCommandsMenu(false);

    try {
      // AI "Thinking..." typewriter states matching Stitch UI
      setThinkingMessage('Analyzing node network...');
      await new Promise(r => setTimeout(r, 450));

      // URL detection check for direct QR Code generation
      const isUrl = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-\.\/?%&=]*)?$/i.test(cmd) && !cmd.includes(' ');
      if (isUrl) {
        setIsThinking(false);
        pushHistoryState();

        const canvasRect = canvasRef.current ? canvasRef.current.getBoundingClientRect() : { width: 1000, height: 600 };
        const midX = canvasRect.width / 2;
        const midY = canvasRect.height / 2;
        const gridX = (midX - panOffset.x) / zoom;
        const gridY = (midY - panOffset.y) / zoom;

        const opId = `op-${Date.now()}`;
        const newOp = {
          id: opId,
          toolId: 'qr-generator',
          inputIds: [],
          outputId: null,
          status: 'idle',
          progress: 0,
          x: gridX - 105, // offset half card width (210px / 2 = 105)
          y: gridY - 80,  // offset half card height
          params: { text: cmd }
        };

        const updatedOps = [...operations, newOp];
        setOperations(updatedOps);
        showToast('Generating QR code...', 'success');
        executeOperator(opId, null, updatedOps).catch(err => {
          console.error('[handleSendCommand] Auto QR code generation failed:', err);
        });
        return;
      }

      // Command parser
      const lowerCmd = cmd.toLowerCase();
      if (lowerCmd === '/run' || lowerCmd === 'run' || lowerCmd === 'run all' || lowerCmd === 'run all tools' || lowerCmd === 'run again' || lowerCmd === 'execute' || lowerCmd.includes('run all') || lowerCmd.includes('run the tools')) {
        setIsThinking(false);
        const terminalOps = operations.filter(op => {
          const oIds = op.outputIds || (op.outputId ? [op.outputId] : []);
          return !operations.some(other => {
            return other.inputIds.includes(op.id) || oIds.some(oid => other.inputIds.includes(oid));
          });
        });
        if (terminalOps.length === 0) {
          showToast('No tools found on the canvas to execute', 'warning');
          return;
        }
        showToast(`Running ${terminalOps.length} terminal operator pipeline(s)...`, 'info');
        terminalOps.forEach(op => {
          executeOperator(op.id, null).catch(err => {
            console.error('Canvas run-all execution error:', err);
          });
        });
        return;
      }

      if (lowerCmd === '/clear' || lowerCmd === 'clear' || lowerCmd === 'clear canvas') {
        setIsThinking(false);
        setWorkspaceQueue([]);
        setOperations([]);
        setSelectedNodeIds([]);
        showToast('Workspace cleared');
        return;
      }

      // A0. Intercept Selective Document Retention & Canvas Pruning Commands
      // e.g. "except for the 4 main documents delete all of them"
      // e.g. "delete all of them except for the 4 main documents"
      // e.g. "delete all except the 4 main documents"
      // e.g. "keep only the 4 main documents and delete the rest"
      // e.g. "clear canvas except original files"
      const isSelectivePrune = 
        (/\b(except|excluding|but not)\b/i.test(lowerCmd) && /\b(delete|remove|clear|wipe)\b/i.test(lowerCmd)) ||
        (/\b(keep|retain)\s+only\b/i.test(lowerCmd));

      if (isSelectivePrune) {
        setIsThinking(false);
        const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        const countMatch = lowerCmd.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:main|original|source|initial)?\s*(?:documents?|files?|cards?|nodes?)/i);
        let keepCount = null;
        if (countMatch) {
          const rawVal = countMatch[1].toLowerCase();
          keepCount = isNaN(rawVal) ? wordToNum[rawVal] : parseInt(rawVal, 10);
        }

        const isMainDoc = (f) => !f.isOutput && !f.id?.startsWith('output-') && !f.id?.startsWith('output:');
        let mainFiles = workspaceQueue.filter(isMainDoc);
        if (mainFiles.length === 0) {
          mainFiles = workspaceQueue.slice(0, keepCount || 4);
        } else if (keepCount && keepCount > 0) {
          mainFiles = mainFiles.slice(0, keepCount);
        }

        pushHistoryState();
        setWorkspaceQueue(mainFiles);
        setOperations([]);
        setSelectedNodeIds([]);
        showToast(`Retained ${mainFiles.length} main document(s); cleared all other nodes.`, 'success');
        return;
      }

      // A1. Intercept Global Operator/Tool Pruning Commands
      // e.g. "delete all operators", "remove all tools", "clear all operations"
      if (/^(?:delete|remove|clear)\s+(?:all\s+)?(?:operators?|tools?|operations?|steps?)$/i.test(lowerCmd)) {
        setIsThinking(false);
        pushHistoryState();
        setOperations([]);
        setSelectedNodeIds([]);
        showToast('Removed all operator cards from canvas.', 'info');
        return;
      }

      // A2. Intercept Global Output Pruning Commands
      // e.g. "delete all outputs", "remove all generated files", "delete intermediate outputs"
      if (/^(?:delete|remove|clear)\s+(?:all\s+)?(?:(?:generated|intermediate)\s+(?:outputs?|files?|nodes?)|outputs?|output\s+(?:files?|nodes?))$/i.test(lowerCmd)) {
        setIsThinking(false);
        pushHistoryState();
        const isMainDoc = (f) => !f.isOutput && !f.id?.startsWith('output-') && !f.id?.startsWith('output:');
        setWorkspaceQueue(prev => prev.filter(isMainDoc));
        setSelectedNodeIds([]);
        showToast('Removed all generated output files from canvas.', 'info');
        return;
      }

      // A. Intercept Deletion / Step Skipping Commands (e.g. "delete step 2", "remove merge")
      const deleteMatch = lowerCmd.match(/^(?:delete|remove|skip|cancel)\s+(?:the\s+)?(?:operator\s+|step\s+|tool\s+)?(.+)$/i);
      if (deleteMatch) {
        const target = deleteMatch[1].trim();
        setIsThinking(false);
        
        let removedOp = null;
        let newOps = [...operations];
        
        const stepNum = parseInt(target);
        if (!isNaN(stepNum) && stepNum > 0 && stepNum <= operations.length) {
          removedOp = operations[stepNum - 1];
          newOps.splice(stepNum - 1, 1);
        } else {
          const matchedTool = Object.entries(TOOL_REGISTRY).find(([toolId, meta]) => {
            return target.includes(toolId) || meta.synonyms.some(syn => target.includes(syn));
          });
          if (matchedTool) {
            const toolId = matchedTool[0];
            const idx = operations.findIndex(op => op.toolId === toolId);
            if (idx !== -1) {
              removedOp = operations[idx];
              newOps.splice(idx, 1);
            }
          }
        }
        
        if (removedOp) {
          setOperations(newOps);
          showToast(`Removed step: ${TOOL_REGISTRY[removedOp.toolId]?.name || removedOp.toolId}`, 'info');
        } else {
          showToast(`Could not find step or operator matching "${target}"`, 'warning');
        }
        return;
      }

      // B. Intercept Parameter Adjustment Commands (e.g. "set compression quality to 50%")
      if (lowerCmd.startsWith('change') || lowerCmd.startsWith('set') || lowerCmd.startsWith('update') || lowerCmd.startsWith('adjust')) {
        const matchedOpIdx = operations.findIndex(op => {
          const meta = TOOL_REGISTRY[op.toolId];
          return lowerCmd.includes(op.toolId) || (meta && meta.synonyms.some(syn => lowerCmd.includes(syn)));
        });
        
        if (matchedOpIdx !== -1) {
          const op = operations[matchedOpIdx];
          const newParams = extractCommandParameters(op.toolId, cmd);
          if (Object.keys(newParams).length > 0) {
            setIsThinking(false);
            setOperations(prev => prev.map((o, idx) => {
              if (idx === matchedOpIdx) {
                return { ...o, params: { ...o.params, ...newParams } };
              }
              return o;
            }));
            showToast(`Updated parameters for ${TOOL_REGISTRY[op.toolId]?.name || op.toolId}`, 'success');
            return;
          }
        }
      }

      const isUndoCmd = lowerCmd === '/undo' || lowerCmd === 'undo' || lowerCmd === 'undo command' || lowerCmd === 'undo last' || lowerCmd === 'undo last command' || lowerCmd === 'ctrl z' || lowerCmd === 'ctrl+z' || lowerCmd === 'ctrl + z';
      if (isUndoCmd) {
        setIsThinking(false);
        handleUndo();
        return;
      }

      const isRedoCmd = lowerCmd === '/redo' || lowerCmd === 'redo' || lowerCmd === 'redo command' || lowerCmd === 'redo last' || lowerCmd === 'redo last command' || lowerCmd === 'ctrl y' || lowerCmd === 'ctrl+y' || lowerCmd === 'ctrl + y';
      if (isRedoCmd) {
        setIsThinking(false);
        handleRedo();
        return;
      }

      setThinkingMessage('Mapping formats & planning workflow...');
      
      const graphState = [
        ...workspaceQueue.map(f => ({
          id: f.id,
          name: f.name,
          type: 'file',
          status: f.status?.toLowerCase() || 'pending',
          ancestry: f.ancestry || [f.id],
          pageCount: f.pageCount || 1
        })),
        ...operations.map(op => ({
          id: op.id,
          tool: op.toolId,
          status: op.status,
          inputs: op.inputIds,
          outputs: op.outputIds || (op.outputId ? [op.outputId] : []),
          ancestry: op.ancestry || [op.id]
        }))
      ];

      // Helper function to query local LLMs or backend fallback
      const fetchLocalLLMPlan = async (queryText, gState, lastActive) => {
        const systemPrompt = `You are a workflow planner for a document canvas. You are given a user request, a minimized representation of the canvas graph state, and recently active/focused node IDs.
Your job is to parse the user's request (which can be in English or Banglish), map it to tools, extract parameters, and identify target node IDs.
Available tool IDs: ${Object.keys(TOOL_REGISTRY).join(', ')}.
Available Graph State nodes: ${JSON.stringify(gState)}.
Last active node IDs: ${JSON.stringify(lastActive)}.

Note: 'unzip-file' is a special tool that extracts files from a ZIP archive. You must insert an 'unzip-file' step whenever a tool that outputs a ZIP (like 'split-pdf') needs to connect to a downstream tool expecting individual files.
For intermediate nodes generated by preceding steps in the same plan, use reference IDs starting with 'output:step_index' (e.g. 'output:0' for the output of the first operation).
Resolve pronouns like 'it', 'them', 'those', 'the merged file' by looking at the active nodes and matching the requested action's input type.
If the request is ambiguous or confidence is low, set 'confidence_score' < 0.85 and explain in 'clarification_needed'.

You must return ONLY a JSON object of this exact format, with no markdown fences, conversational preambles, or explanations:
{
  "confidence_score": 0.95,
  "clarification_needed": null,
  "operations": [
    {
      "tool_id": "merge-pdf",
      "target_node_ids": ["ws-1", "ws-2"],
      "parameters": {}
    },
    {
      "tool_id": "compress-pdf",
      "target_node_ids": ["output:0"],
      "parameters": { "quality": 0.6 }
    }
  ]
}`;

        const payload = {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: queryText }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        };

        const cleanJsonText = (str) => {
          let cleaned = str.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '').trim();
          }
          return cleaned;
        };

        // Bug #10 fix: helper to create a fetch with an AbortController timeout
        const fetchWithTimeout = async (url, options, ms) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), ms);
          try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            return res;
          } catch (e) {
            clearTimeout(timer);
            throw e;
          }
        };

        // Try FastAPI Backend agent-plan (2.5s timeout — cloud LLM fallback or fast heuristic planner)
        try {
          const activeFiles = Object.values(gState?.nodes || {})
            .filter(n => n?.data?.file?.name)
            .map(n => n.data.file.name);

          const res = await fetchWithTimeout(`${BACKEND_URL}/api/canvas/agent-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryText,
              files: activeFiles,
              graph_state: gState,
              last_active_nodes: lastActive
            })
          }, 2500);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.steps && data.steps.length > 0) {
              // Convert steps to operations schema
              return {
                confidence_score: 0.95,
                clarification_needed: null,
                operations: data.steps.map(s => ({
                  tool_id: s.actionId,
                  target_node_ids: s.inputs,
                  parameters: s.parameters || {}
                }))
              };
            }
          }
        } catch (e) {}

        return null;
      };

      let plan = null;
      try {
        plan = await fetchLocalLLMPlan(cmd, graphState, lastActiveNodes);
      } catch (e) {
        console.warn('Error fetching LLM plan, falling back to local planner:', e);
      }

      if (!plan || !plan.operations) {
        plan = await runClientHeuristicPlanner(cmd, graphState, lastActiveNodes, selectedNodeIds);
      }

      // Check for low-confidence or explicit clarification requests
      if (plan.clarification_needed || (plan.confidence_score !== undefined && plan.confidence_score < 0.85)) {
        setIsThinking(false);
        const explanation = plan.clarification_needed || "The request is ambiguous. Can you clarify which files or tools to target?";
        const userClarification = await new Promise(resolve => {
          setClarificationPrompt({
            message: explanation,
            options: plan.options || [],
            resolve
          });
        });
        setClarificationPrompt(null);
        if (!userClarification) return; // Cancelled
        
        let resolvedPrompt = '';
        if (typeof userClarification === 'object' && userClarification !== null) {
          resolvedPrompt = userClarification.prompt || userClarification.label || '';
        } else if (typeof userClarification === 'string') {
          resolvedPrompt = userClarification.trim();
        }

        if (resolvedPrompt) {
          showToast('Executing clarified request...', 'info');
          // Recursively re-invoke handleSendCommand instead of dead-ending
          handleSendCommand(resolvedPrompt);
        }
        return;
      }

      // Check for Processing dependencies to prevent race conditions
      const isNodeProcessing = (id) => {
        const node = [...workspaceQueue, ...operations].find(n => n.id === id);
        return node && (node.status === 'Processing' || node.status === 'processing');
      };
      
      const hasProcessingInput = plan.operations.some(op => 
        op.target_node_ids.some(id => isNodeProcessing(id))
      );
      
      if (hasProcessingInput) {
        setIsThinking(false);
        showToast('Pipeline blocked: dependent nodes are currently processing. Please wait.', 'warning');
        return;
      }

      // Local Rule Engine Validation Checks
      // 1. DAG Cycle Detection Check
      const mockOps = [
        ...operations.map(op => ({ id: op.id, inputIds: [...op.inputIds] })),
        ...plan.operations.map((planOp, idx) => {
          const mockOpId = `mock-op-${idx}`;
          const resolvedInputs = planOp.target_node_ids.map(id => {
            if (id.startsWith('output:')) {
              const upstreamIdx = parseInt(id.split(':')[1]);
              return `mock-op-${upstreamIdx}`;
            }
            return id;
          });
          return { id: mockOpId, inputIds: resolvedInputs };
        })
      ];

      let hasCycle = false;
      mockOps.forEach(op => {
        const visited = new Set();
        op.inputIds.forEach(inputId => {
          if (inputId.startsWith('mock-op-') || inputId.startsWith('op-')) {
            if (hasDependencyCycle(inputId, op.id, mockOps, visited)) {
              hasCycle = true;
            }
          }
        });
      });

      if (hasCycle) {
        setIsThinking(false);
        showToast('Rule Engine Block: Proposed workflow creates a dependency cycle.', 'error');
        return;
      }

      // 2. Cardinality & Graph Type Safety Validation Checks
      for (const planOp of plan.operations) {
        const reg = TOOL_REGISTRY[planOp.tool_id];
        if (!reg) continue;
        
        if (reg.minInputs && planOp.target_node_ids.length < reg.minInputs) {
          setIsThinking(false);
          showToast(`Rule Engine Block: Tool '${reg.name}' requires at least ${reg.minInputs} inputs.`, 'error');
          return;
        }
        if (reg.maxInputs && planOp.target_node_ids.length > reg.maxInputs) {
          setIsThinking(false);
          showToast(`Rule Engine Block: Tool '${reg.name}' accepts at most ${reg.maxInputs} inputs.`, 'error');
          return;
        }
        
        // Format checking
        for (const inputId of planOp.target_node_ids) {
          let ext = '.pdf';
          if (inputId.startsWith('output:')) {
            const upstreamIdx = parseInt(inputId.split(':')[1]);
            const upstream = plan.operations[upstreamIdx];
            if (upstream) ext = TOOL_REGISTRY[upstream.tool_id]?.outExt || '.pdf';
          } else {
            const node = workspaceQueue.find(n => n.id === inputId);
            if (node) ext = '.' + node.name.split('.').pop().toLowerCase();
          }
          
          if (reg.accept.length > 0 && !reg.accept.includes(ext)) {
            const isZipWildcard = ext === '.zip' && planOp.tool_id !== 'unzip-file';
            
            // Check if we can auto-convert this format to PDF
            const canAutoConvert = (
              ext === '.docx' || ext === '.doc' || 
              ext === '.xlsx' || ext === '.xls' || ext === '.csv' || 
              ext === '.pptx' || ext === '.ppt' || 
              ext === '.html' || 
              ext === '.zip' || 
              ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext)
            ) && reg.accept.includes('.pdf');

            if (!isZipWildcard && !canAutoConvert) {
              setIsThinking(false);
              showToast(`Rule Engine Block: Format mismatch. '${ext}' is incompatible with PDF tool '${reg.name}'.`, 'error');
              return;
            }
          }
        }
      }

      // Convert operations to steps structure for UI rendering
      let steps = plan.operations.map((op, idx) => {
        return {
          step_id: idx,
          actionId: op.tool_id,
          inputs: op.target_node_ids.map(id => {
            if (id.startsWith('output:')) return id;
            const node = workspaceQueue.find(n => n.id === id);
            return node ? (node.file?.name || node.name) : id;
          }),
          parameters: op.parameters || {}
        };
      });

      if (steps.length === 0) {
        setIsThinking(false);
        showToast('Could not compile pipeline. Try matching command words.', 'warning');
        return;
      }

      // Step 3: Map steps to operations & position nodes
      setThinkingMessage('Assembling engine pipeline & arranging layout...');
      await new Promise(r => setTimeout(r, 450));

      const spawnedOps = [];
      const stepOpMap = {};
      const levels = {};
      const reusedOps = [];
      const reusedOpIds = new Set();
      const existingOpUpdates = {};

      // Calculate level/depth for each step
      steps.forEach(step => {
        let maxInputLevel = 0;
        step.inputs.forEach(input => {
          if (input.startsWith('output:')) {
            const upstreamIdx = parseInt(input.split(':')[1]);
            maxInputLevel = Math.max(maxInputLevel, levels[upstreamIdx] || 0);
          }
        });
        levels[step.step_id] = maxInputLevel + 1;
      });

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const actionId = step.actionId;
        const validation = TOOL_VALIDATION[actionId];
        if (!validation) continue;

        // Resolve input IDs
        const resolvedInputIds = [];
        const resolvedInputNodes = [];

        step.inputs.forEach(input => {
          if (input.startsWith('output:')) {
            const upstreamIdx = parseInt(input.split(':')[1]);
            const upstreamOpId = stepOpMap[upstreamIdx];
            if (upstreamOpId) {
              resolvedInputIds.push(upstreamOpId);
              const upstreamOp = [...operations, ...spawnedOps].find(o => o.id === upstreamOpId);
              if (upstreamOp) {
                resolvedInputNodes.push({ x: upstreamOp.x + 260, y: upstreamOp.y });
              }
            }
          } else {
            // File input
            const fileNode = workspaceQueue.find(f => (f.file?.name || f.name) === input);
            if (fileNode) {
              resolvedInputIds.push(fileNode.id);
              resolvedInputNodes.push({ x: fileNode.x || 100, y: fileNode.y || 100 });
            }
          }
        });

        // Check if there is an existing operator of the same toolId that is idle or failed
        const existingOp = operations.find(o => o.toolId === actionId && (o.status === 'idle' || o.status === 'failed') && !reusedOpIds.has(o.id));
        if (existingOp) {
          reusedOpIds.add(existingOp.id);
          reusedOps.push(existingOp);
          stepOpMap[step.step_id] = existingOp.id;
          existingOpUpdates[existingOp.id] = {
            inputIds: resolvedInputIds,
            params: { ...existingOp.params, ...step.parameters }
          };
          continue; // Skip spawning a new node!
        }

        // Default coordinates
        let inputMaxX = resolvedInputNodes.length > 0 ? Math.max(...resolvedInputNodes.map(n => n.x)) : 100;
        let inputAvgY = resolvedInputNodes.length > 0 ? resolvedInputNodes.reduce((sum, n) => sum + n.y, 0) / resolvedInputNodes.length : 200;

        let opX = inputMaxX + 260;
        let opY = inputAvgY;

        // Prevent card overlap collisions
        const coords = getNonCollidingCoords(inputMaxX + 260, inputAvgY, spawnedOps);
        opX = coords.x;
        opY = coords.y;

        // Default Params fallback
        let defaultParams = {};
        if (actionId === 'compress-pdf') {
          defaultParams = { quality: 0.65, mode: 'lossless' };
        } else if (actionId === 'split-pdf') {
          defaultParams = { mode: 'parts', parts: 2 };
        } else if (actionId === 'rotate-pdf') {
          defaultParams = { angle: 90 };
        } else if (actionId === 'add-watermark') {
          defaultParams = { text: 'CONFIDENTIAL', opacity: 0.5, angle: 45 };
        } else if (actionId === 'add-page-numbers') {
          defaultParams = { format: 'Page {n} of {total}', position: 'bottom-right' };
        } else if (actionId === 'protect-pdf') {
          defaultParams = { password: '', permissions: { print: true, copy: true, modify: false } };
        } else if (actionId === 'image-compressor') {
          defaultParams = { quality: 0.7 };
        } else if (actionId === 'image-converter') {
          defaultParams = { format: 'png' };
        } else if (actionId === 'image-resizer') {
          defaultParams = { percentage: 75, mode: 'percentage', width: 800, height: 600 };
        }

        const opId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        stepOpMap[step.step_id] = opId;

        const newOp = {
          id: opId,
          toolId: actionId,
          inputIds: resolvedInputIds,
          outputId: null,
          status: 'idle',
          progress: 0,
          x: opX,
          y: opY,
          params: { ...defaultParams, ...step.parameters }
        };

        spawnedOps.push(newOp);
      }

      if (spawnedOps.length === 0 && reusedOps.length === 0) {
        setIsThinking(false);
        showToast('Intent unrecognized. Try verbs like: merge, compress, split, crop, protect, or unlock.', 'info');
        return;
      }

      // Step 4: Show reasoning path to user
      const reasoningPath = steps.map(s => s.actionId.replace('-', ' ')).join(' -> ');
      setThinkingMessage(`AI Planner compiled: ${reasoningPath}`);
      await new Promise(r => setTimeout(r, 800));

      setIsThinking(false);

      pushHistoryState();
      
      // Step 5: Run pipeline sequentially in topological order (root → leaf)
      // Build a full ordered list of all ops in this pipeline (spawnedOps + reused)
      const allOps = [
        ...operations.map(op => {
          if (existingOpUpdates[op.id]) {
            return { 
              ...op, 
              inputIds: existingOpUpdates[op.id].inputIds,
              params: existingOpUpdates[op.id].params
            };
          }
          return op;
        }),
        ...spawnedOps
      ];

      // --- Auto-Heal pipeline plan format mismatches ---
      let nextOps = [...allOps];
      let nextQueue = [...workspaceQueue];
      
      const pipelineIssues = validateCanvasConnections(nextOps, nextQueue);
      const mismatches = pipelineIssues.filter(issue => issue.type === 'format-mismatch');
      
      const injectedIds = [];
      if (mismatches.length > 0) {
        console.log(`[handleSendCommand] Found ${mismatches.length} pipeline format mismatches. Auto-healing...`);
        for (const issue of mismatches) {
          const result = executeAutoHeal(nextOps, nextQueue, issue);
          nextOps = result.operations;
          nextQueue = result.queue;
          const injectedOp = nextOps[nextOps.length - 1];
          if (injectedOp) {
            injectedIds.push(injectedOp.id);
          }
        }
      }

      setOperations(nextOps);
      if (mismatches.length > 0) {
        setWorkspaceQueue(nextQueue);
      }
      
      // Auto-fit viewport to center all nodes
      if (autoFitViewport) {
        handleFitToView(nextQueue, nextOps);
      }

      const totalStepsCompiled = spawnedOps.length + reusedOps.length + injectedIds.length;
      showToast(`AI Pipeline Router: Compiled and queued ${totalStepsCompiled}-step workflow.`);
      speakAnnouncement(`Compiled ${totalStepsCompiled}-step workflow on canvas.`);

      // Build dependency-ordered list using the updated configurations from nextOps
      const pipelineOpIds = new Set([
        ...spawnedOps.map(o => o.id), 
        ...reusedOps.map(o => o.id),
        ...injectedIds
      ]);
      const pipelineOps = nextOps.filter(o => pipelineOpIds.has(o.id));
      const ordered = [];
      const visited = new Set();

      const topoSort = (op) => {
        if (visited.has(op.id)) return;
        visited.add(op.id);
        // First, sort any upstream ops in pipelineOps
        op.inputIds.forEach(inputId => {
          const upstream = pipelineOps.find(o => o.id === inputId);
          if (upstream) topoSort(upstream);
        });
        ordered.push(op);
      };
      pipelineOps.forEach(op => topoSort(op));

      // Run them one-by-one, passing blob output from one step directly to the next
      setTimeout(async () => {
        if (mismatches.length > 0) {
          // Wait for layout/state updates to propagate so the user sees the visual change on the canvas
          await new Promise(r => setTimeout(r, 450));
        }

        // Run confirmation modal check (Destructive tool checks & total op limits)
        const allowed = await confirmWorkflowExecution(ordered.map(o => o.id), ordered);
        if (!allowed) {
          // Revert operation additions and auto-healed injections
          setOperations(prev => prev.filter(op => !spawnedOps.some(so => so.id === op.id) && !injectedIds.includes(op.id)));
          showToast('Workflow execution cancelled by user.', 'info');
          return;
        }

        // Map of opId → { blob, name } for outputs produced in this pipeline run
        const pipelineOutputs = {};
        const allocatedCardPositions = [];

        for (const op of ordered) {
          let timerInterval = null;
          try {
            const aId = op.toolId;
            // Resolve input files for this op
            const inputFiles = [];
            let isBranchSkipped = false;

            for (const inputId of op.inputIds) {
              // Check if this came from a previous pipeline op
              if (pipelineOutputs[inputId]) {
                const out = pipelineOutputs[inputId];

                // Check condition routing branch filtering
                if (out.isConditionRouter) {
                  const branchType = op.inputPortMap?.[inputId];
                  const conditionPassed = out.pass;
                  if (branchType === 'output-true' && !conditionPassed) {
                    console.log(`[Pipeline] Condition router evaluated FALSE, skipping True branch consumer ${op.toolId}`);
                    isBranchSkipped = true;
                    break;
                  }
                  if (branchType === 'output-false' && conditionPassed) {
                    console.log(`[Pipeline] Condition router evaluated TRUE, skipping False branch consumer ${op.toolId}`);
                    isBranchSkipped = true;
                    break;
                  }
                }

                if (out.outputs && out.outputs.length > 0) {
                  for (const sub of out.outputs) {
                    inputFiles.push(new File([sub.blob], sub.name, { type: sub.blob.type }));
                  }
                } else {
                  inputFiles.push(new File([out.blob], out.name, { type: out.blob.type }));
                }
              } else {
                // Fall back to workspace queue (raw uploaded file)
                const node = workspaceQueueRef.current.find(q => q.id === inputId);
                if (node) {
                  if (node.file) {
                    inputFiles.push(node.file);
                  } else if (node.resultBlob) {
                    inputFiles.push(new File([node.resultBlob], node.resultName || node.name || 'input.pdf', { type: node.resultBlob.type }));
                  }
                }
              }
            }

            if (isBranchSkipped || inputFiles.length === 0) {
              console.log(`[Pipeline] Skipping node ${op.toolId} (isBranchSkipped=${isBranchSkipped}, inputs=${inputFiles.length})`);
              setOperations(prev => prev.map(o => o.id === op.id ? { ...o, status: 'idle', progress: 0 } : o));
              continue;
            }

            if (needsStudioParams(op.toolId)) {
              console.log(`[Pipeline] Halting pipeline execution at studio-eligible tool ${op.toolId}. Opening Focus Studio.`);
              showToast(`Opening Focus Studio for ${TOOL_REGISTRY[op.toolId]?.name || 'review'}...`, 'info');
              
              setOperations(prev => prev.map(o => o.id === op.id ? { ...o, status: 'idle', progress: 0 } : o));
              
              setTimeout(() => {
                executeOperator(op.id, null, nextOps, false).catch(() => {});
              }, 100);
              return;
            }

            console.log(`[Pipeline] Running ${op.toolId} with ${inputFiles.length} input(s)`);

            // Start active execution timer
            const pipelineStartTime = Date.now();
            setOpTimers(prev => ({ ...prev, [op.id]: 0 }));
            timerInterval = setInterval(() => {
              setOpTimers(prev => {
                if (prev[op.id] === undefined) return prev;
                return { ...prev, [op.id]: prev[op.id] + 1 };
              });
            }, 1000);

            // Run engine directly (bypass recursive executeOperator to avoid lock issues)
            const progressCb = (pct, statusText) => {
              setOperations(prev => prev.map(o => o.id === op.id ? { ...o, status: 'processing', progress: pct, statusText: formatStatusText(statusText) } : o));
            };

            setOperations(prev => prev.map(o => o.id === op.id ? { ...o, status: 'processing', progress: 0 } : o));

            let resultBlob;
            let outputName = '';
            let outputsList = [];
            let outputIdsList = [];

            const allItemsForEngine = inputFiles.map((f, i) => ({ id: `pi-${i}`, file: f, name: f.name, size: f.size }));
            
            let isUnzipBypass = false;
            let bypassSourceId = null;
            if (op.toolId === 'unzip-file') {
              const upstreamId = op.inputIds[0];
              if (pipelineOutputs[upstreamId] && pipelineOutputs[upstreamId].unpacked) {
                isUnzipBypass = true;
                bypassSourceId = upstreamId;
              }
            }

            let engineResult;
            if (isUnzipBypass) {
              const upOut = pipelineOutputs[bypassSourceId];
              engineResult = {
                blob: upOut.blob,
                name: upOut.name,
                outputs: upOut.outputs,
                outputIds: upOut.outputIds
              };
              console.log(`[Pipeline] Bypassing unzip-file step since upstream outputs are already unpacked.`);
            } else {
              // Use the component-level runToolEngine (standalone, not a closure)
              engineResult = await runToolEngine(op.toolId, op.params || {}, inputFiles[0], allItemsForEngine, progressCb);
            }

            let isSplitUnpack = false;
            let splitOutputIds = [];
            let splitOutputsList = [];

            if (engineResult && engineResult.outputs) {
              resultBlob = engineResult.blob;
              outputName = engineResult.name;
              outputsList = engineResult.outputs;
              outputIdsList = engineResult.outputIds;
            } else {
              resultBlob = engineResult;
              // Compute output name
              const baseName = inputFiles[0].name.replace(/\.[^.]+$/, '');
              const ext = inputFiles[0].name.split('.').pop();
              outputName = `${baseName}_output.pdf`;
              if (aId === 'merge-pdf') outputName = 'merged_document.pdf';
              else if (aId === 'compress-pdf') outputName = `${baseName}_compressed.pdf`;
              else if (aId === 'split-pdf') outputName = `${baseName}_split.zip`;
              else if (aId === 'pdf-to-image') outputName = `${baseName}_images.zip`;
              else if (['docx-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'image-to-pdf', 'html-to-pdf'].includes(aId)) outputName = `${baseName}.pdf`;
              else if (aId === 'image-compressor') outputName = `${baseName}_compressed.${ext}`;
              else if (aId === 'image-converter') outputName = `${baseName}_converted.${(op.params || {}).format || 'png'}`;
              else if (aId === 'image-resizer') outputName = `${baseName}_resized.${ext}`;
              else if (aId === 'ocr-pdf') outputName = `${baseName}_ocr.pdf`;
              else if (aId === 'pdf-to-word') outputName = `${baseName}.docx`;
              else if (aId === 'pdf-to-excel') outputName = `${baseName}.xlsx`;
              else if (aId === 'pdf-to-powerpoint') outputName = `${baseName}.pptx`;

              outputsList = [{ blob: resultBlob, name: outputName }];
            }

            const hasDownstreamConsumers = ordered.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(op.id))
              || operations.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(op.id));

            if (op.toolId === 'split-pdf' || op.toolId === 'pdf-to-image' || op.toolId === 'unzip-file') {
              try {
                if (engineResult && engineResult.outputs && engineResult.outputs.length > 0 && (!engineResult.outputIds || engineResult.outputIds.length === 0)) {
                  const rawOutputs = engineResult.outputs;
                  const totalFiles = rawOutputs.length;
                  const shouldUnpack = shouldUnpackCanvasCards(hasDownstreamConsumers, totalFiles, MAX_INDIVIDUAL_CANVAS_CARDS);

                  if (shouldUnpack) {
                    isSplitUnpack = true;
                    for (let idx = 0; idx < totalFiles; idx++) {
                      const item = rawOutputs[idx];
                      const mime = resolveMimeType(item.name, item.blob?.type);
                      const file = new File([item.blob], item.name, { type: mime });
                      const outId = createCompletedOutputNode(file.name, op.x, op.y, file, allocatedCardPositions, op.ancestry);
                      splitOutputIds.push(outId);
                      splitOutputsList.push({ blob: item.blob, name: file.name });
                    }
                    outputIdsList = splitOutputIds;
                    outputsList = splitOutputsList;
                  } else {
                    // Intermediate operator optimization or Large batch cap (> 5 files)
                    // Keep all individual outputs in memory so downstream operators can consume them directly
                    outputsList = rawOutputs;
                    // If resultBlob is not already a zip, generate a zip archive
                    if (!resultBlob || resultBlob.type !== 'application/zip') {
                      const zip = new JSZip();
                      rawOutputs.forEach(item => zip.file(item.name, item.blob));
                      resultBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
                      if (!outputName.endsWith('.zip')) {
                        const baseName = inputFiles[0]?.name ? inputFiles[0].name.replace(/\.[^.]+$/, '') : 'bundle';
                        outputName = `${baseName}_outputs.zip`;
                      }
                    }
                    // Spawn at most 1 consolidated collection / zip bundle card
                    const bundleNodeId = createCompletedOutputNode(outputName, op.x, op.y, resultBlob, allocatedCardPositions, op.ancestry);
                    outputIdsList = [bundleNodeId];
                    isSplitUnpack = false;
                  }
                } else if (resultBlob && (resultBlob.type === 'application/zip' || (outputName && outputName.endsWith('.zip')))) {
                  const zip = new JSZip();
                  const zipContent = await zip.loadAsync(resultBlob);
                  const fileKeys = Object.keys(zipContent.files).filter(name => !zipContent.files[name].dir);
                  const totalFiles = fileKeys.length;

                  if (totalFiles > 0) {
                    const extractedOutputs = [];
                    for (let idx = 0; idx < totalFiles; idx++) {
                      const filename = fileKeys[idx];
                      const fileEntry = zipContent.files[filename];
                      const blob = await fileEntry.async('blob');
                      extractedOutputs.push({ blob, name: filename });
                    }
                    outputsList = extractedOutputs;

                    const shouldUnpack = shouldUnpackCanvasCards(hasDownstreamConsumers, totalFiles, MAX_INDIVIDUAL_CANVAS_CARDS);

                    if (shouldUnpack) {
                      isSplitUnpack = true;
                      for (let idx = 0; idx < totalFiles; idx++) {
                        const item = extractedOutputs[idx];
                        const mime = resolveMimeType(item.name, item.blob?.type);
                        const file = new File([item.blob], item.name, { type: mime });
                        const outId = createCompletedOutputNode(file.name, op.x, op.y, file, allocatedCardPositions, op.ancestry);
                        splitOutputIds.push(outId);
                        splitOutputsList.push(item);
                      }
                      outputIdsList = splitOutputIds;
                      outputsList = splitOutputsList;
                    } else {
                      // Intermediate operator optimization or Large batch cap (> 5 files)
                      // Spawn at most 1 consolidated collection / zip bundle card
                      const bundleNodeId = createCompletedOutputNode(outputName, op.x, op.y, resultBlob, allocatedCardPositions, op.ancestry);
                      outputIdsList = [bundleNodeId];
                      isSplitUnpack = false;
                    }
                  }
                }
              } catch (zipErr) {
                console.warn('[Pipeline] Failed to parse/unpack ZIP / multi-file output:', zipErr);
              }
            }

            // Store result for downstream ops in this same pipeline run
            pipelineOutputs[op.id] = { blob: resultBlob, name: outputName, outputs: outputsList, unpacked: isSplitUnpack || (outputsList && outputsList.length > 1), outputIds: outputIdsList };

            // Create output node and mark op completed
            let outputNodeId;
            let outputIdsToTrack = [];
            if (outputIdsList && outputIdsList.length > 0) {
              outputNodeId = outputIdsList[outputIdsList.length - 1];
              outputIdsToTrack = outputIdsList;
            } else {
              outputNodeId = createCompletedOutputNode(outputName, op.x, op.y, resultBlob, allocatedCardPositions, op.ancestry);
              outputIdsToTrack = [outputNodeId];
            }

            // Also map pipelineOutputs by outputNodeId so downstream ops connected to output node find it instantly
            if (outputNodeId) {
              pipelineOutputs[outputNodeId] = pipelineOutputs[op.id];
            }

            const pInputSize = inputFiles.reduce((acc, f) => acc + (f.size || 0), 0);
            const pOutputSize = resultBlob?.size || (outputsList && outputsList.length > 0 ? outputsList.reduce((acc, o) => acc + (o.blob?.size || 0), 0) : 0);
            const pTelemetry = computeNodeTelemetry({ startTime: pipelineStartTime, inputSize: pInputSize, outputSize: pOutputSize });

            setOperations(prev => prev.map(o => o.id === op.id ? {
              ...o,
              status: 'completed',
              progress: 100,
              outputId: outputNodeId,
              outputIds: outputIdsToTrack,
              prevInputIds: [...o.inputIds],
              telemetry: pTelemetry
            } : o));
            
            const auditMessage = isSplitUnpack
              ? `Completed '${TOOL_REGISTRY[op.toolId]?.name}' generating ${splitOutputIds.length} independent files via pipeline command.`
              : `Completed '${TOOL_REGISTRY[op.toolId]?.name}' generating '${outputName}' via pipeline command.`;

            setAuditLogs(prev => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                timestamp: new Date().toLocaleTimeString(),
                opId: op.id,
                toolId: op.toolId,
                status: 'success',
                message: auditMessage
              }
            ]);

            if (isUnzipBypass) {
              showToast(`Unzip skipped (already extracted)`);
            } else if (isSplitUnpack) {
              showToast(`split pdf -> split into ${splitOutputIds.length} files`);
            } else if (outputsList && outputsList.length > 1) {
              showToast(`Generated ${outputsList.length} files bundled in ${outputName}`);
            } else {
              showToast(`${aId.replace(/-/g, ' ')} -> ${outputName}`);
            }
            console.log(`[Pipeline] Completed ${op.toolId}: ${outputName}`);

          } catch (err) {
            console.error(`[Pipeline] Failed for ${op.toolId}:`, err);
            setOperations(prev => prev.map(o => o.id === op.id ? { ...o, status: 'failed', progress: 0 } : o));
            setAuditLogs(prev => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                timestamp: new Date().toLocaleTimeString(),
                opId: op.id,
                toolId: op.toolId,
                status: 'failed',
                message: `Failed '${TOOL_REGISTRY[op.toolId]?.name || 'operator'}' in pipeline: ${err.message || 'Unknown error'}`
              }
            ]);
            showToast(`${op.toolId.replace(/-/g, ' ')} failed: ${err.message || 'Unknown error'}`, 'error');
            break; // Stop pipeline on failure
          } finally {
            if (timerInterval) {
              clearInterval(timerInterval);
              setOpTimers(prev => {
                const next = { ...prev };
                delete next[op.id];
                return next;
              });
            }
          }
        }

        console.log('[Pipeline] Sequential execution complete.');
      }, 400);
    } catch (error) {
      console.error('Error in handleSendCommand:', error);
      setIsThinking(false);
      showToast(`Error processing command: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  // Helper to draw SVG cables
  const drawCable = (fromId, toId, opStatus, opProgress, branchType) => {
    const from = (branchType && portCoords[fromId]?.[branchType]) || portCoords[fromId]?.output;
    const to = portCoords[toId]?.input;
    if (!from || !to) return null;

    // Calculate bezier control points
    const dx = Math.abs(to.x - from.x) * 0.45;
    const controlX1 = from.x + dx;
    const controlY1 = from.y;
    const controlX2 = to.x - dx;
    const controlY2 = to.y;

    const path = `M ${from.x} ${from.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${to.x} ${to.y}`;

    let strokeColor = 'var(--border-strong)';
    let isAnimated = false;

    if (branchType === 'output-true') {
      strokeColor = '#10b981'; // Emerald Green
    } else if (branchType === 'output-false') {
      strokeColor = '#f59e0b'; // Amber
    }

    if (opStatus === 'processing') {
      strokeColor = branchType === 'output-false' ? '#fbbf24' : 'var(--color-primary)';
      isAnimated = true;
    } else if (opStatus === 'completed') {
      strokeColor = branchType === 'output-true' ? '#10b981' : branchType === 'output-false' ? '#f59e0b' : 'var(--color-primary-light)';
    } else if (opStatus === 'failed') {
      strokeColor = 'var(--color-danger)';
    }

    const midX = 0.125 * from.x + 0.375 * controlX1 + 0.375 * controlX2 + 0.125 * to.x;
    const midY = 0.125 * from.y + 0.375 * controlY1 + 0.375 * controlY2 + 0.125 * to.y;

    return (
      <g key={`cable-${fromId}-${toId}`} className="group/cable cursor-pointer">
        {/* Glow background trail (glowing pipeline effect) */}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={isAnimated ? "6" : "4"}
          filter={isAnimated ? "url(#cable-glow)" : "none"}
          opacity={isAnimated ? "0.45" : "0.15"}
          className="transition-all duration-300"
          onDoubleClick={(e) => { e.stopPropagation(); handleDisconnectCable(fromId, toId); }}
        />
        {/* Main cable line */}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          className={isAnimated ? 'stitch-cable-active' : ''}
          opacity={isAnimated ? "1" : "0.75"}
          onDoubleClick={(e) => { e.stopPropagation(); handleDisconnectCable(fromId, toId); }}
        />
        {/* Hover area (thicker transparent path for easy hovering) */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="12"
          className="pointer-events-auto"
          onDoubleClick={(e) => { e.stopPropagation(); handleDisconnectCable(fromId, toId); }}
        />
        {/* Disconnect Button (Scissors/Trash icon) */}
        <g 
          transform={`translate(${midX}, ${midY})`}
          className="opacity-0 group-hover/cable:opacity-100 transition-opacity duration-200 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            handleDisconnectCable(fromId, toId);
          }}
        >
          <circle 
            r="8" 
            fill="var(--color-danger)" 
            className="shadow-md hover:scale-125 transition-transform text-white cursor-pointer" 
          />
          <text 
            textAnchor="middle" 
            dominantBaseline="central" 
            fill="white" 
            fontSize="9px" 
            fontWeight="bold"
            className="select-none pointer-events-none cursor-pointer"
          >
            ×
          </text>
        </g>
      </g>
    );
  };

  // Drop Event onto Canvas spawns a node at drop location
  const handleCanvasDrop = (e) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    // Filter file types
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return ['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.pptx', '.ppt', '.xlsx', '.xls', '.csv', '.html', '.htm'].includes(ext);
    });

    if (validFiles.length === 0) {
      showToast('Unsupported file type. Dropped files must be PDF, Word, TXT, PowerPoint, Excel, HTML or Images.');
      return;
    }

    // Add mapped nodes using canvas offset positions in vertical columns of 4
    const items = validFiles.map((file, idx) => {
      const row = idx % 4;
      const col = Math.floor(idx / 4);
      
      let finalX = x + col * 280;
      let finalY = y + row * 180;

      // Prevent overlaps with any existing nodes by shifting columns to the right
      let shiftCount = 0;
      while (shiftCount < 100) {
        const collides = workspaceQueue.some(item => {
          const dx = Math.abs(item.x - finalX);
          const dy = Math.abs(item.y - finalY);
          return dx < 240 && dy < 140;
        }) || operations.some(op => {
          const dx = Math.abs(op.x - finalX);
          const dy = Math.abs(op.y - finalY);
          return dx < 240 && dy < 140;
        });
        
        if (collides) {
          finalX += 280;
          shiftCount++;
        } else {
          break;
        }
      }

      const fileId = `ws-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'PendingAction',
        progress: 0,
        resultBlob: null,
        resultName: null,
        timestamp: Date.now(),
        x: finalX,
        y: finalY,
        ancestry: [fileId]
      };
    });

    pushHistoryState();
    setWorkspaceQueue(prev => [...prev, ...items]);
    // Bug #8 fix: register freshly dropped files as active so pronoun resolution works immediately
    addActiveNodes(items.map(i => i.id));
    speakAnnouncement(`Added ${items.length} files to canvas.`);
    showToast(`Added ${items.length} file(s) to canvas`);
  };

  const handleLocalSelectClick = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    let startX = 0;
    let startY = 0;
 
    if (lastUploadCoords.current) {
      startX = lastUploadCoords.current.x;
      startY = lastUploadCoords.current.y;
      lastUploadCoords.current = null;
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const screenWidth = rect.width || window.innerWidth;
      const screenHeight = rect.height || window.innerHeight;

      // 1. Calculate column heights to center them vertically
      const numRows = Math.min(files.length, 4);
      const columnHeightCanvas = (numRows - 1) * 180 + 130;
      const columnHeightScreen = columnHeightCanvas * zoom;

      // 2. We want to center the column between header (Y=80) and footer (Y=screenHeight-90)
      const headerClearance = 100; // minimum Y coordinate on screen
      const footerClearance = screenHeight - 110;
      const availableHeight = footerClearance - headerClearance;

      let screenStartY = headerClearance + (availableHeight - columnHeightScreen) / 2;
      // Clamp to ensure it doesn't overlap the header
      if (screenStartY < headerClearance) {
        screenStartY = headerClearance;
      }

      // 3. Screen horizontal coordinate (60px from the left edge of the visible window)
      const screenStartX = 60;

      // 4. Convert screen coordinates to canvas space coordinates
      startX = (screenStartX - panOffset.x) / zoom;
      startY = (screenStartY - panOffset.y) / zoom;
    }

    const items = files.map((file, idx) => {
      // First column of 4, then next column of 4
      const row = idx % 4;
      const col = Math.floor(idx / 4);
      
      let finalX = startX + col * 280;
      let finalY = startY + row * 180;

      // Prevent overlaps with any existing nodes by shifting columns to the right
      let shiftCount = 0;
      while (shiftCount < 100) {
        const collides = workspaceQueue.some(item => {
          const dx = Math.abs(item.x - finalX);
          const dy = Math.abs(item.y - finalY);
          return dx < 240 && dy < 140;
        }) || operations.some(op => {
          const dx = Math.abs(op.x - finalX);
          const dy = Math.abs(op.y - finalY);
          return dx < 240 && dy < 140;
        });
        
        if (collides) {
          finalX += 280;
          shiftCount++;
        } else {
          break;
        }
      }

      const fileId = `ws-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'PendingAction',
        progress: 0,
        resultBlob: null,
        resultName: null,
        timestamp: Date.now(),
        x: finalX,
        y: finalY,
        ancestry: [fileId]
      };
    });

    pushHistoryState();
    setWorkspaceQueue(prev => [...prev, ...items]);
    // Bug #8 fix: register file-picker uploaded files as active so pronoun resolution works immediately
    addActiveNodes(items.map(i => i.id));
    speakAnnouncement(`Added ${items.length} files to canvas.`);
    showToast(`Added ${items.length} file(s) to canvas`);
    e.target.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCanvasDropWrapped = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleCanvasDrop(e);
  };
  return (
    <div 
      className="relative flex-1 min-h-[500px] rounded-3xl overflow-hidden flex flex-col select-none z-10 shadow-2xl"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleCanvasDropWrapped}
      style={{
        '--color-primary': '#f97316',
        '--color-primary-rgb': '249, 115, 22',
        '--color-primary-light': '#ff9843',
        '--color-primary-dark': '#7c2d12',
        '--color-accent': '#ea580c',
        '--color-accent-light': '#ffedd5',
        '--bg-primary': theme === 'dark' ? '#0b0f19' : '#ffffff',
        '--bg-secondary': theme === 'dark' ? '#111827' : '#faf5eb',
        '--bg-tertiary': theme === 'dark' ? '#070a13' : '#f5f0e6',
        '--bg-card': theme === 'dark' ? '#1a2438' : '#ffffff',
        '--bg-card-hover': theme === 'dark' ? '#24324c' : '#fcfcfc',
        '--bg-glass': theme === 'dark' ? 'rgba(26, 36, 56, 0.94)' : 'rgba(255, 255, 255, 0.92)',
        '--bg-glass-strong': theme === 'dark' ? 'rgba(26, 36, 56, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        '--text-primary': theme === 'dark' ? '#f8fafc' : '#0f172a',
        '--text-secondary': theme === 'dark' ? '#94a3b8' : '#475569',
        '--text-tertiary': theme === 'dark' ? '#64748b' : '#64748b',
        '--border-subtle': theme === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(249, 115, 22, 0.14)',
        '--border-medium': theme === 'dark' ? 'rgba(255, 255, 255, 0.24)' : 'rgba(249, 115, 22, 0.28)',
        '--border-strong': theme === 'dark' ? 'rgba(255, 255, 255, 0.38)' : 'rgba(249, 115, 22, 0.5)',
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, #0b0f19 0%, #070a13 100%)' 
          : 'linear-gradient(135deg, #ffffff 0%, #faf5eb 100%)',
        border: theme === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.10)'
          : '1px solid rgba(249, 115, 22, 0.25)',
      }}
    >
      {/* Drag and Drop Glassmorphic Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-md border-[3px] border-dashed border-primary rounded-3xl z-[999] flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.15s_ease-out] pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-primary/25 border border-primary/30 flex items-center justify-center text-primary shadow-lg animate-bounce">
            <span className="material-symbols-outlined text-[36px]">upload_file</span>
          </div>
          <div className="text-center select-none">
            <h3 className="text-lg font-bold text-primary font-label-mono">Drop to Upload Files</h3>
            <p className="text-xs text-outline font-semibold mt-1">Release to add documents directly to your canvas grid</p>
          </div>
        </div>
      )}
      {/* Screen Reader Announcer container (visually hidden) */}
      <div 
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }} 
        aria-live="assertive" 
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Dynamic Grid Background with Panning/Zooming Transform container */}
      <div 
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleCanvasKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        role="application"
        aria-label="Document Workflow Canvas. Use Arrow Keys to navigate cards, Space or Enter to select, C to connect, Delete to remove focused node."
        className={`w-full flex-grow relative overflow-hidden stitch-dot-grid z-10 cursor-${isPanning ? 'grabbing' : 'grab'} focus:ring-2 focus:ring-primary/20 outline-none`}
        style={{
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        {/* Dynamic Glow Spotlight Dot Grid Layer */}
        <div 
          className="absolute inset-0 pointer-events-none stitch-dot-grid-glow z-0"
          style={{
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
          }}
        />

        {/* INNER SCALED CONTAINER FOR NODES & SVGs */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        >
          {/* SVGs CONNECTIONS LAYER */}
          <svg width="5000" height="5000" className="absolute top-0 left-0 pointer-events-none z-0" style={{ width: '5000px', height: '5000px', overflow: 'visible' }}>
            <defs>
              <filter id="cable-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {operations.map(op => {
              const cables = [];
              const seenSources = new Set();
              // Draw inputs
              op.inputIds.forEach(inputId => {
                let cableSourceId = inputId;
                const branchType = op.inputPortMap?.[inputId];
                if (inputId.startsWith('op-')) {
                  const upstreamOp = operations.find(o => o.id === inputId);
                  if (upstreamOp && upstreamOp.outputId) {
                    cableSourceId = upstreamOp.outputId;
                  }
                }
                
                const connectionKey = `${cableSourceId}-${op.id}-${branchType || 'def'}`;
                if (!seenSources.has(connectionKey)) {
                  seenSources.add(connectionKey);
                  cables.push(drawCable(cableSourceId, op.id, op.status, op.progress, branchType));
                }
              });
              // Draw output
              if (op.outputIds && op.outputIds.length > 0) {
                op.outputIds.forEach(outId => {
                  cables.push(drawCable(op.id, outId, op.status, op.progress));
                });
              } else if (op.outputId) {
                cables.push(drawCable(op.id, op.outputId, op.status, op.progress));
              }
              return cables;
            })}

            {/* Temporary dragging cable */}
            {draggingCable && (() => {
              const portKey = draggingCable.type || 'output';
              const fromCoords = portCoords[draggingCable.fromId]?.[portKey] || portCoords[draggingCable.fromId]?.output;
              if (!fromCoords) return null;
              const dx = Math.abs(draggingCable.currentX - fromCoords.x) * 0.45;
              const cx1 = fromCoords.x + dx;
              const cy1 = fromCoords.y;
              const cx2 = draggingCable.currentX - dx;
              const cy2 = draggingCable.currentY;
              const path = `M ${fromCoords.x} ${fromCoords.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${draggingCable.currentX} ${draggingCable.currentY}`;
              const cableColor = draggingCable.type === 'output-true' ? '#10b981' : draggingCable.type === 'output-false' ? '#f59e0b' : 'var(--color-primary)';
              return (
                <g>
                  <path
                     d={path}
                     fill="none"
                     stroke={cableColor}
                     strokeWidth="2.5"
                     strokeDasharray="5 5"
                     opacity="0.85"
                   />
                   <circle
                     cx={draggingCable.currentX}
                     cy={draggingCable.currentY}
                     r="4"
                     fill={cableColor}
                     opacity="0.9"
                   />
                </g>
              );
            })()}
          </svg>

          {/* DOCUMENT NODES */}
          {(() => {
            // [Phase A] Compute ordinal position badge numbers for DIT.
            // Source nodes are sorted left-to-right by X and numbered 1..N.
            // Output nodes (ws-out-*) are numbered after source nodes.
            const sourceNodes = [...workspaceQueue]
              .filter(q => !q.id.startsWith('ws-out-'))
              .sort((a, b) => (a.x || 0) - (b.x || 0));
            const outputNodes = [...workspaceQueue]
              .filter(q => q.id.startsWith('ws-out-'))
              .sort((a, b) => (a.x || 0) - (b.x || 0));
            const ordinalMap = {};
            sourceNodes.forEach((n, i) => { ordinalMap[n.id] = i + 1; });
            outputNodes.forEach((n, i) => { ordinalMap[n.id] = sourceNodes.length + i + 1; });
            return workspaceQueue.map(item => {
            const isSelected = selectedNodeIds.includes(item.id);
            const badge = getFileBadge(item.name);
            const isOutput = item.id.startsWith('ws-out-');
            const ordinalNum = ordinalMap[item.id];
            
            return (
              <div
                key={item.id}
                id={`node-${item.id}`}
                tabIndex={0}
                role="button"
                aria-label={`Document: ${item.name}, Size: ${formatSize(item.size)}, Status: ${item.status}, Position: grid position ${Math.round(item.x || 100)} by ${Math.round(item.y || 100)}`}
                onFocus={() => setFocusedNodeId(item.id)}
                onClick={(e) => {
                  handleNodeClick(e, item.id);
                  setFocusedNodeId(item.id);
                }}
                onPointerDown={(e) => handleNodeDragStart(e, item.id, item)}
                className={`absolute w-[220px] rounded-2xl select-none pointer-events-auto stitch-node flex flex-col cursor-grab z-20 focus:outline focus:outline-[3px] focus:outline-primary focus:outline-offset-2 ${
                  isSelected ? 'stitch-node-selected' : ''
                } ${focusedNodeId === item.id ? 'ring-2 ring-primary border-primary outline-none' : ''}`}
                style={{
                  left: `${item.x || 100}px`,
                  top: `${item.y || 100}px`,
                }}
              >
                {/* [Phase A] Ordinal Position Badge — top-left corner */}
                <div
                  className="absolute -top-2.5 -left-2.5 z-40 flex items-center justify-center pointer-events-none"
                  title={`Refer to this as '${ordinalNum}${ordinalNum === 1 ? 'st' : ordinalNum === 2 ? 'nd' : ordinalNum === 3 ? 'rd' : 'th'} document' in commands`}
                >
                  <span 
                    className="rounded-full flex items-center justify-center font-black text-[10px] select-none border transition-all duration-200"
                    style={{
                      width: '22px',
                      height: '22px',
                      backgroundColor: isOutput ? 'rgba(var(--color-primary-rgb), 0.08)' : 'rgba(var(--color-primary-rgb), 0.15)',
                      borderColor: isOutput ? 'rgba(var(--color-primary-rgb), 0.5)' : 'var(--color-primary)',
                      color: 'var(--color-primary)',
                      boxShadow: isOutput ? '0 1px 4px rgba(var(--color-primary-rgb), 0.12)' : '0 2px 8px rgba(var(--color-primary-rgb), 0.22)',
                      borderWidth: '1.5px',
                    }}
                  >
                    {ordinalNum}
                  </span>
                </div>

                {/* Input port dot (Left Edge Center) */}
                {isOutput && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[6px] w-3 h-3 rounded-full bg-primary border border-surface shadow-sm z-30" title="Input Port" />
                )}
                
                {/* Output port dot (Right Edge Center) */}
                <div 
                  onPointerDown={(e) => handleStartCableDrag(e, item.id, 'output')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[6px] w-3 h-3 hover:w-4 hover:h-4 transition-all rounded-full bg-primary border border-surface shadow-sm z-30 cursor-crosshair pointer-events-auto" 
                  title="Drag to Connect Output" 
                />

                {/* Card Body - Unified Layout */}
                <div className="flex items-center gap-3 p-3 min-w-0">
                  {/* File Badge */}
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm select-none ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </div>

                  {/* Text Details Stack */}
                  <div className="flex flex-col min-w-0 flex-grow">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-normal" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{formatSize(item.size)}</span>
                      {item.pageRange && (
                        <span className="text-[7.5px] font-extrabold bg-primary/10 border border-primary/20 text-primary px-1 py-0.5 rounded leading-none">
                          Target: {item.pageRange}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(item.file);
                    }}
                    className="w-5 h-5 rounded-md hover:bg-primary/15 hover:text-primary text-slate-400 dark:text-slate-400 hover:dark:text-primary flex items-center justify-center transition-colors cursor-pointer opacity-60 hover:opacity-100 flex-shrink-0 mr-1.5"
                    title="Preview file"
                  >
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pushHistoryState();
                      setWorkspaceQueue(prev => prev.filter(q => q.id !== item.id));
                      setOperations(prev => prev.map(op => {
                        const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
                        const remainingIds = outIds.filter(id => id !== item.id);
                        if (remainingIds.length === 0 && outIds.length > 0) {
                          return {
                            ...op,
                            outputId: null,
                            outputIds: [],
                            status: 'idle',
                            progress: 0
                          };
                        }
                        return {
                          ...op,
                          outputId: remainingIds[remainingIds.length - 1] || null,
                          outputIds: remainingIds
                        };
                      }));
                    }}
                    className="w-5 h-5 rounded-md hover:bg-error-container/15 hover:text-error text-slate-400 dark:text-slate-400 hover:dark:text-error flex items-center justify-center transition-colors cursor-pointer opacity-60 hover:opacity-100 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                  </button>
                </div>

                {/* Dynamic Action Section (Appears underneath ONLY when Processing or Completed) */}
                {(item.status === 'Completed' || item.status === 'Processing') && (
                  <div className="px-3 pb-3 border-t border-outline-variant/30 pt-2 flex flex-col gap-1.5">
                    {item.status === 'Completed' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.resultBlob && item.resultName) {
                            saveAs(item.resultBlob, item.resultName);
                          }
                        }}
                        className="w-full py-1 rounded-lg border border-outline-variant hover:border-primary hover:text-primary text-[10px] font-bold transition-all bg-surface-container/40 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[12px]">download</span>
                        Download
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="w-full h-1 bg-surface border border-outline-variant/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${item.progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold text-primary">
                          <span>Processing...</span>
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
          })()}

          {/* OPERATOR NODES */}
          {operations.map(op => {
            const isSelected = selectedNodeIds.includes(op.id);
            const isCompleted = op.status === 'completed';
            const isFailed = op.status === 'failed';
            const isIdle = op.status === 'idle';
            const params = op.params || {};
            const validation = TOOL_VALIDATION[op.toolId];
            const hasRequiredInputs = !validation || op.inputIds.length >= validation.minInputs;

            const isCollapsed = op.toolId !== 'qr-generator' && !!collapsedOps[op.id];
            const cardWidthClass = isCollapsed ? 'w-[150px]' : (isIdle ? 'w-[210px]' : 'w-[160px]');

            // Connection dragging type safety styles
            let portClass = "bg-outline hover:bg-primary border-surface cursor-pointer";
            let cardOpacityClass = "";
            
            if (draggingCable) {
              if (draggingCable.fromId === op.id) {
                portClass = "bg-outline-variant opacity-25 pointer-events-none scale-75";
                cardOpacityClass = "opacity-40";
              } else {
                const isCompatible = validateConnection(draggingCable.fromId, op.id, true);
                if (isCompatible) {
                  portClass = "bg-emerald-500 border-emerald-300 scale-125 shadow-[0_0_10px_rgba(16,185,129,0.8)] cursor-pointer animate-pulse";
                  cardOpacityClass = "ring-2 ring-emerald-500/20";
                } else {
                  portClass = "bg-outline-variant opacity-25 pointer-events-none scale-75";
                  cardOpacityClass = "opacity-45 grayscale-[25%]";
                }
              }
            }
            
            return (
              <div
                key={op.id}
                id={`op-node-${op.id}`}
                tabIndex={0}
                role="button"
                aria-label={`Operator: ${op.toolId.replace('-', ' ')}, Status: ${op.status}, Linked Inputs Count: ${op.inputIds.length}, Position: grid position ${Math.round(op.x || 100)} by ${Math.round(op.y || 100)}`}
                onFocus={() => setFocusedNodeId(op.id)}
                onClick={(e) => {
                  handleNodeClick(e, op.id);
                  setFocusedNodeId(op.id);
                }}
                onPointerDown={(e) => handleNodeDragStart(e, op.id, op)}
                className={`absolute rounded-xl select-none pointer-events-auto stitch-node flex flex-col p-3 items-center justify-center text-center cursor-grab z-20 focus:outline focus:outline-[3px] focus:outline-primary focus:outline-offset-2 ${cardWidthClass} ${
                  isSelected ? 'stitch-node-selected' : ''
                } ${
                  op.toolId.includes('compress') ? 'border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)] animate-pulse-slow' :
                  op.toolId.includes('split') || op.toolId.includes('merge') ? 'border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]' :
                  op.toolId.includes('ocr') ? 'border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]' : ''
                } ${
                  isCompleted ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.12)]' : ''
                } ${
                  isFailed ? 'border-danger bg-danger/5' : ''
                } ${focusedNodeId === op.id ? 'ring-2 ring-primary border-primary outline-none' : ''} ${cardOpacityClass}`}
                style={{
                  left: `${op.x || 100}px`,
                  top: `${op.y || 100}px`,
                }}
              >
                {/* Floating Timer Badge (Shows upwards) */}
                {op.status === 'processing' && opTimers[op.id] !== undefined && (
                  <div 
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold shadow-md select-none transition-all duration-300 pointer-events-none ${
                      isSelected 
                        ? 'bg-emerald-600 text-white scale-110 shadow-[0_4px_12px_rgba(16,185,129,0.4)] animate-[bounce_1s_infinite]' 
                        : 'bg-primary text-white animate-pulse'
                    }`}
                    style={{ transformOrigin: 'bottom center' }}
                  >
                    <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                    <span>{formatTimer(opTimers[op.id])}</span>
                    {isSelected && <span className="text-[8px] opacity-90 pl-0.5">ELAPSED</span>}
                  </div>
                )}
                {/* Input port anchor */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectSelectedToOperator(op.id);
                  }}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[6px] w-3 h-3 hover:w-4 hover:h-4 transition-all rounded-full border shadow-sm z-30 pointer-events-auto ${portClass}`} 
                  title="Click to Connect Selected Files" 
                />
                
                {/* Output port anchor */}
                {op.toolId === 'condition-router' ? (
                  <>
                    {/* True Port (Green) */}
                    <div 
                      onPointerDown={(e) => handleStartCableDrag(e, op.id, 'output-true')}
                      className="absolute right-0 top-[32%] -translate-y-1/2 translate-x-[7px] w-4 h-4 rounded-full bg-emerald-500 border border-surface shadow-sm z-30 cursor-crosshair pointer-events-auto flex items-center justify-center text-[8px] text-white font-bold hover:scale-110 transition-transform shadow-emerald-500/30" 
                      title="True Branch (Condition Met) - Drag to connect" 
                    >
                      <span className="material-symbols-outlined text-[10px]">check</span>
                    </div>
                    {/* False Port (Amber) */}
                    <div 
                      onPointerDown={(e) => handleStartCableDrag(e, op.id, 'output-false')}
                      className="absolute right-0 top-[68%] -translate-y-1/2 translate-x-[7px] w-4 h-4 rounded-full bg-amber-500 border border-surface shadow-sm z-30 cursor-crosshair pointer-events-auto flex items-center justify-center text-[8px] text-white font-bold hover:scale-110 transition-transform shadow-amber-500/30" 
                      title="False Branch (Condition Failed) - Drag to connect" 
                    >
                      <span className="material-symbols-outlined text-[10px]">close</span>
                    </div>
                  </>
                ) : (
                  <div 
                    onPointerDown={(e) => handleStartCableDrag(e, op.id, 'output')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[6px] w-3 h-3 hover:w-4 hover:h-4 transition-all rounded-full bg-primary border border-surface shadow-sm z-30 cursor-crosshair pointer-events-auto" 
                    title="Drag to Connect Output" 
                  />
                )}

                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    {op.toolId === 'merge-pdf' ? 'join_inner' : 
                     op.toolId === 'compress-pdf' ? 'compress' : 
                     op.toolId === 'split-pdf' ? 'content_cut' : 
                     op.toolId === 'rotate-pdf' ? 'rotate_right' :
                     op.toolId === 'add-watermark' ? 'water_drop' :
                     op.toolId === 'bates-numbering' ? 'pin' :
                     op.toolId === 'condition-router' ? 'alt_route' :
                     op.toolId === 'protect-pdf' ? 'lock' :
                     op.toolId === 'image-compressor' ? 'photo_size_select_large' :
                     op.toolId === 'image-converter' ? 'change_circle' :
                     op.toolId === 'image-resizer' ? 'aspect_ratio' : 'settings'}
                  </span>
                </div>

                <h4 className="text-[11px] font-bold text-on-background capitalize">
                  {op.toolId.replace('-', ' ')}
                </h4>

                {op.inputIds.length > 1 && op.toolId !== 'merge-pdf' && (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 mt-0.5 select-none">
                    Batch ({op.inputIds.length} files)
                  </span>
                )}

                {op.inputIds.length > 0 && !isCollapsed && (
                  <div className="w-full mt-1.5 flex flex-col gap-0.5 text-left text-[8.5px] text-outline pointer-events-auto">
                    <div className="flex items-center justify-between font-semibold text-on-surface-variant/80 mb-0.5">
                      <span>Linked Inputs:</span>
                      {isIdle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pushHistoryState();
                            setOperations(prev => prev.map(o => o.id === op.id ? { ...o, inputIds: [] } : o));
                            showToast('Cleared all inputs');
                          }}
                          className="text-[8px] text-error hover:underline cursor-pointer border-none bg-transparent p-0"
                          title="Clear all linked input cables"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    {(() => {
                      return op.inputIds.map(inputId => {
                        let name = '';
                        if (inputId.startsWith('op-')) {
                          const upstreamOp = operations.find(o => o.id === inputId);
                          if (upstreamOp) {
                            if (upstreamOp.outputId) {
                              const fileNode = workspaceQueue.find(q => q.id === upstreamOp.outputId);
                              name = fileNode ? fileNode.name : `${upstreamOp.toolId.replace('-', ' ')} output`;
                            } else {
                              name = `${upstreamOp.toolId.replace('-', ' ')} output`;
                            }
                          } else {
                            name = 'Upstream output';
                          }
                        } else {
                          const inputItem = workspaceQueue.find(q => q.id === inputId);
                          if (!inputItem) return null;
                          name = inputItem.name;
                        }

                        const itemIdx = op.inputIds.indexOf(inputId);
                        return (
                          <div key={inputId} className="flex items-center justify-between bg-surface-container/50 px-1 py-0.5 rounded border border-outline-variant/30 text-[8px]">
                          <span className="truncate max-w-[100px]" title={name}>{name}</span>
                          {isIdle && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (itemIdx > 0) {
                                    pushHistoryState();
                                    const newInputs = [...op.inputIds];
                                    [newInputs[itemIdx - 1], newInputs[itemIdx]] = [newInputs[itemIdx], newInputs[itemIdx - 1]];
                                    setOperations(prev => prev.map(o => o.id === op.id ? { ...o, inputIds: newInputs } : o));
                                  }
                                }}
                                disabled={itemIdx === 0}
                                className="text-outline hover:text-primary cursor-pointer flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none p-0.5"
                                title="Move Up"
                              >
                                <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (itemIdx < op.inputIds.length - 1) {
                                    pushHistoryState();
                                    const newInputs = [...op.inputIds];
                                    [newInputs[itemIdx + 1], newInputs[itemIdx]] = [newInputs[itemIdx], newInputs[itemIdx + 1]];
                                    setOperations(prev => prev.map(o => o.id === op.id ? { ...o, inputIds: newInputs } : o));
                                  }
                                }}
                                disabled={itemIdx === op.inputIds.length - 1}
                                className="text-outline hover:text-primary cursor-pointer flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none p-0.5"
                                title="Move Down"
                              >
                                <span className="material-symbols-outlined text-[10px]">arrow_downward</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pushHistoryState();
                                  setOperations(prev => prev.map(o => o.id === op.id ? { ...o, inputIds: o.inputIds.filter(id => id !== inputId) } : o));
                                }}
                                className="text-outline hover:text-error cursor-pointer flex items-center justify-center p-0.5"
                                title="Remove connection"
                              >
                                <span className="material-symbols-outlined text-[10px]">close</span>
                              </button>
                            </div>
                          )}
                          {isIdle && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                pushHistoryState();
                                setOperations(prev => prev.map(o => o.id === op.id ? { ...o, inputIds: op.inputIds.filter(id => id !== inputId) } : o));
                                showToast(`Removed input: ${name}`);
                              }}
                              className="text-outline hover:text-error cursor-pointer flex items-center justify-center p-0.5 border-none bg-transparent ml-1"
                              title="Remove connection"
                            >
                              <span className="material-symbols-outlined text-[10px]">close</span>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                  </div>
                )}

                {/* Inline Parameters Form if Operator is Idle and NOT collapsed */}
                {isIdle && !isCollapsed && (
                  <div className="w-full mt-2.5 pt-2.5 border-t border-outline-variant/60 flex flex-col gap-2 pointer-events-auto text-left">
                    {(() => {
                      const showPageRangeInput = [
                        'compress-pdf', 'rotate-pdf', 'ocr-pdf', 'add-watermark', 'add-page-numbers',
                        'sign-pdf', 'edit-pdf', 'redact-pdf', 'repair-pdf',
                        'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'pdf-to-pdfa'
                      ].includes(op.toolId);
                      if (!showPageRangeInput) return null;

                      let connectedPageCount = null;
                      if (op.inputIds && op.inputIds[0]) {
                        const inputId = op.inputIds[0];
                        const qNode = workspaceQueue.find(q => q.id === inputId);
                        if (qNode) {
                          connectedPageCount = qNode.pageCount;
                        } else {
                          const opNode = operations.find(o => o.id === inputId);
                          if (opNode && opNode.outputId) {
                            const qOut = workspaceQueue.find(q => q.id === opNode.outputId);
                            if (qOut) {
                              connectedPageCount = qOut.pageCount;
                            }
                          }
                        }
                      }

                      let isRangeInvalid = false;
                      let rangeWarningText = '';
                      if (params.pageRange && connectedPageCount) {
                        const cleanRange = params.pageRange.trim().toLowerCase();
                        if (cleanRange && cleanRange !== 'even' && cleanRange !== 'odd' && cleanRange !== 'all') {
                          const numbers = cleanRange.match(/\d+/g);
                          if (numbers) {
                            const maxPage = Math.max(...numbers.map(Number));
                            if (maxPage > connectedPageCount) {
                              isRangeInvalid = true;
                              rangeWarningText = `Exceeds page count (${connectedPageCount})`;
                            }
                          }
                        }
                      }

                      return (
                        <div className="flex flex-col gap-1 w-full pb-2 border-b border-outline-variant/40">
                          <label className="text-[8.5px] font-bold text-on-surface-variant flex justify-between">
                            <span>Target Page Range:</span>
                            {isRangeInvalid ? (
                              <span className="text-error font-semibold">{rangeWarningText}</span>
                            ) : (
                              <span className="text-outline font-label-mono opacity-80">Optional</span>
                            )}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 1-2, 5 (or 'even', 'odd')"
                            value={params.pageRange || ''}
                            onChange={(e) => updateOperatorParams(op.id, { pageRange: e.target.value })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`w-full text-[9px] px-2 py-1 rounded bg-surface border text-on-background focus:outline-none focus:border-primary font-label-mono ${
                              isRangeInvalid ? 'border-error/80 focus:border-error' : 'border-outline-variant'
                            }`}
                          />
                        </div>
                      );
                    })()}
                    
                    {/* 1. COMPRESS PDF */}
                    {op.toolId === 'compress-pdf' && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex gap-1 bg-surface-container p-0.5 rounded-lg border border-outline-variant">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateOperatorParams(op.id, { mode: 'lossless' }); }}
                            className={`flex-1 py-0.5 text-[8.5px] font-bold rounded-md text-center cursor-pointer transition-colors ${
                              (params.mode || 'lossy') === 'lossless'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-on-surface-variant hover:text-primary'
                            }`}
                          >Lossless</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateOperatorParams(op.id, { mode: 'lossy' }); }}
                            className={`flex-1 py-0.5 text-[8.5px] font-bold rounded-md text-center cursor-pointer transition-colors ${
                              (params.mode || 'lossy') === 'lossy'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-on-surface-variant hover:text-primary'
                            }`}
                          >Lossy</button>
                        </div>

                        {(params.mode || 'lossy') === 'lossy' ? (
                          <div className="flex flex-col gap-1 w-full">
                            <label className="text-[9.5px] font-bold text-on-surface-variant flex justify-between">
                              <span>Quality:</span>
                              <span className="text-primary font-label-mono">{Math.round((params.quality || 0.65) * 100)}%</span>
                            </label>
                            <input
                              type="range"
                              min="0.2"
                              max="0.95"
                              step="0.05"
                              value={params.quality || 0.65}
                              onChange={(e) => updateOperatorParams(op.id, { quality: parseFloat(e.target.value) })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                            />
                            <p className="text-[8px] text-orange-600 font-medium leading-tight">
                              Converts pages to images. Text search will be disabled.
                            </p>
                          </div>
                        ) : (
                          <p className="text-[8px] text-green-600 font-medium leading-tight mt-0.5">
                            Preserves selectable text and vector graphics.
                          </p>
                        )}
                      </div>
                    )}

                    {/* 2. SPLIT PDF */}
                    {op.toolId === 'split-pdf' && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <select
                          value={params.mode || 'parts'}
                          onChange={(e) => {
                            const newMode = e.target.value;
                            const nextParams = { mode: newMode };
                            if (newMode === 'parts') nextParams.parts = 2;
                            else if (newMode === 'fixed-ranges') nextParams.pages_per_split = 2;
                            else if (newMode === 'size-limit') nextParams.max_size_mb = 5;
                            updateOperatorParams(op.id, nextParams);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9px] px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-background focus:outline-none focus:border-primary font-semibold"
                        >
                          <option value="parts">Split in Half</option>
                          <option value="all">Split Every Page</option>
                          <option value="range">Page Range</option>
                          <option value="fixed-ranges">Fixed Interval</option>
                          <option value="size-limit">Size Limit</option>
                          <option value="by-bookmarks">By Bookmarks</option>
                          <option value="by-blank-page">At Blank Pages</option>
                        </select>

                        {(params.mode === 'range') && (
                          <input
                            type="text"
                            placeholder="e.g. 1-3, 5"
                            value={params.range || ''}
                            onChange={(e) => updateOperatorParams(op.id, { range: e.target.value })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full text-[9px] px-2 py-0.5 rounded bg-surface border border-outline-variant text-on-background focus:outline-none focus:border-primary font-label-mono"
                          />
                        )}

                        {(params.mode === 'parts') && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-on-surface-variant font-medium">Parts:</span>
                            <input
                              type="number"
                              min="2"
                              value={params.parts || 2}
                              onChange={(e) => updateOperatorParams(op.id, { parts: Math.max(2, parseInt(e.target.value) || 2) })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-12 text-[9px] px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-background text-center focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        {(params.mode === 'fixed-ranges') && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-on-surface-variant font-medium">Interval:</span>
                            <input
                              type="number"
                              min="1"
                              value={params.pages_per_split || 2}
                              onChange={(e) => updateOperatorParams(op.id, { pages_per_split: Math.max(1, parseInt(e.target.value) || 1) })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-12 text-[9px] px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-background text-center focus:outline-none focus:border-primary"
                            />
                            <span className="text-[8px] text-on-surface-variant">pages</span>
                          </div>
                        )}

                        {(params.mode === 'size-limit') && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-on-surface-variant font-medium">Max Size:</span>
                            <input
                              type="number"
                              min="1"
                              value={params.max_size_mb || 5}
                              onChange={(e) => updateOperatorParams(op.id, { max_size_mb: Math.max(1, parseInt(e.target.value) || 1) })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-12 text-[9px] px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-background text-center focus:outline-none focus:border-primary"
                            />
                            <span className="text-[8px] text-on-surface-variant">MB</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. ROTATE PDF */}
                    {op.toolId === 'rotate-pdf' && (
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-[9.5px] font-bold text-on-surface-variant">Angle:</label>
                        <select
                          value={params.angle || 90}
                          onChange={(e) => updateOperatorParams(op.id, { angle: parseInt(e.target.value) })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9.5px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value={90}>90° CW</option>
                          <option value={180}>180°</option>
                          <option value={270}>270° CCW</option>
                        </select>
                      </div>
                    )}

                    {/* 4. WATERMARK PDF */}
                    {op.toolId === 'add-watermark' && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <input
                          type="text"
                          placeholder="Text: e.g. DRAFT"
                          value={params.text || 'CONFIDENTIAL'}
                          onChange={(e) => updateOperatorParams(op.id, { text: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9.5px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none focus:border-primary"
                        />
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8.5px] font-bold text-on-surface-variant flex justify-between">
                            <span>Opacity:</span>
                            <span className="text-primary font-label-mono">{Math.round((params.opacity || 0.5) * 100)}%</span>
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={params.opacity || 0.5}
                            onChange={(e) => updateOperatorParams(op.id, { opacity: parseFloat(e.target.value) })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* 5. PROTECT PDF */}
                    {op.toolId === 'protect-pdf' && (
                      <div className="flex flex-col gap-1 w-full">
                        <input
                          type="password"
                          placeholder="Password"
                          value={params.password || ''}
                          onChange={(e) => updateOperatorParams(op.id, { password: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9.5px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                      </div>
                    )}

                    {/* 6. IMAGE COMPRESSOR */}
                    {op.toolId === 'image-compressor' && (
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-[9.5px] font-bold text-on-surface-variant flex justify-between">
                          <span>Quality:</span>
                          <span className="text-primary font-label-mono">{Math.round((params.quality || 0.7) * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={params.quality || 0.7}
                          onChange={(e) => updateOperatorParams(op.id, { quality: parseFloat(e.target.value) })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 7. IMAGE CONVERTER */}
                    {op.toolId === 'image-converter' && (
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-[9.5px] font-bold text-on-surface-variant">Format:</label>
                        <select
                          value={params.format || 'png'}
                          onChange={(e) => updateOperatorParams(op.id, { format: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9.5px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none cursor-pointer"
                        >
                          <option value="png">PNG</option>
                          <option value="jpg">JPG</option>
                          <option value="webp">WEBP</option>
                        </select>
                      </div>
                    )}

                    {/* 8. IMAGE RESIZER */}
                    {op.toolId === 'image-resizer' && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[9.5px] font-bold text-on-surface-variant flex justify-between">
                          <span>Width Scale:</span>
                          <span className="text-primary font-label-mono">{params.percentage || 75}%</span>
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={params.percentage || 75}
                          onChange={(e) => updateOperatorParams(op.id, { percentage: parseInt(e.target.value) })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 9. ADD PAGE NUMBERS */}
                    {op.toolId === 'add-page-numbers' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <input
                          type="text"
                          placeholder="Format: e.g. Page {n} of {total}"
                          value={params.format || ''}
                          onChange={(e) => updateOperatorParams(op.id, { format: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                        <select
                          value={params.position || 'bottom-right'}
                          onChange={(e) => updateOperatorParams(op.id, { position: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background cursor-pointer"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-center">Bottom Center</option>
                          <option value="top-center">Top Center</option>
                        </select>
                      </div>
                    )}

                    {/* BATES NUMBERING */}
                    {op.toolId === 'bates-numbering' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-on-surface-variant font-semibold">Prefix:</span>
                          <input
                            type="text"
                            value={params.prefix || 'CONF-'}
                            onChange={(e) => updateOperatorParams(op.id, { prefix: e.target.value })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-16 px-1.5 py-0.5 rounded border border-outline-variant bg-surface text-on-surface font-mono text-[9px]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-on-surface-variant font-semibold">Start #:</span>
                          <input
                            type="number"
                            min="1"
                            value={params.startNumber || 1}
                            onChange={(e) => updateOperatorParams(op.id, { startNumber: Number(e.target.value) })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-14 px-1.5 py-0.5 rounded border border-outline-variant bg-surface text-on-surface font-mono text-[9px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* CONDITION ROUTER */}
                    {op.toolId === 'condition-router' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-on-surface-variant font-semibold">Rule:</span>
                          <select
                            value={params.ruleType || 'pageCount'}
                            onChange={(e) => updateOperatorParams(op.id, { ruleType: e.target.value })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface text-on-surface text-[9px]"
                          >
                            <option value="pageCount">Page Count</option>
                            <option value="fileSizeMB">Size (MB)</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-on-surface-variant font-semibold">If:</span>
                          <div className="flex items-center gap-1">
                            <select
                              value={params.operator || '>'}
                              onChange={(e) => updateOperatorParams(op.id, { operator: e.target.value })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="px-1 py-0.5 rounded border border-outline-variant bg-surface text-on-surface text-[9px]"
                            >
                              <option value=">">&gt;</option>
                              <option value="<">&lt;</option>
                              <option value="==">==</option>
                            </select>
                            <input
                              type="number"
                              value={params.thresholdValue || 5}
                              onChange={(e) => updateOperatorParams(op.id, { thresholdValue: Number(e.target.value) })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-10 px-1 py-0.5 rounded border border-outline-variant bg-surface text-on-surface font-mono text-[9px]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 10. REMOVE PAGES */}
                    {op.toolId === 'remove-pages' && (
                      <div className="flex flex-col gap-1 w-full">
                        <input
                          type="text"
                          placeholder="Pages: e.g. 1-3, 5"
                          value={params.pages || ''}
                          onChange={(e) => updateOperatorParams(op.id, { pages: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none font-label-mono"
                        />
                      </div>
                    )}

                    {/* 11. EXTRACT PAGES */}
                    {op.toolId === 'extract-pages' && (
                      <div className="flex flex-col gap-1 w-full">
                        <input
                          type="text"
                          placeholder="Pages: e.g. 1, 3, 5-8"
                          value={params.pages || ''}
                          onChange={(e) => updateOperatorParams(op.id, { pages: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full text-[9px] px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none font-label-mono"
                        />
                      </div>
                    )}

                    {/* 12. TEXT TO PDF */}
                    {op.toolId === 'text-to-pdf' && (
                      <div className="flex flex-col gap-1.5 w-full text-[9px]">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8.5px] font-bold text-on-surface-variant flex justify-between">
                            <span>Font Size:</span>
                            <span className="text-primary font-label-mono">{params.fontSize || 12}pt</span>
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="24"
                            step="1"
                            value={params.fontSize || 12}
                            onChange={(e) => updateOperatorParams(op.id, { fontSize: parseInt(e.target.value) })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8.5px] font-bold text-on-surface-variant flex justify-between">
                            <span>Spacing:</span>
                            <span className="text-primary font-label-mono">{params.lineSpacing || 1.5}x</span>
                          </label>
                          <input
                            type="range"
                            min="1.0"
                            max="2.5"
                            step="0.1"
                            value={params.lineSpacing || 1.5}
                            onChange={(e) => updateOperatorParams(op.id, { lineSpacing: parseFloat(e.target.value) })}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full accent-orange-600 h-1 rounded-lg bg-surface-container border border-outline-variant cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* 13. PDF TO IMAGE */}
                    {op.toolId === 'pdf-to-image' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <select
                          value={params.format || 'png'}
                          onChange={(e) => updateOperatorParams(op.id, { format: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1.5 rounded bg-surface border border-outline-variant text-on-background cursor-pointer"
                        >
                          <option value="png">PNG Format</option>
                          <option value="jpeg">JPG Format</option>
                        </select>
                      </div>
                    )}

                    {/* 14. QR CODE GENERATOR */}
                    {op.toolId === 'qr-generator' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <input
                          type="text"
                          placeholder="Payload URL / text"
                          value={params.text || ''}
                          onChange={(e) => updateOperatorParams(op.id, { text: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                      </div>
                    )}

                    {/* 16. UNLOCK PDF */}
                    {op.toolId === 'unlock-pdf' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <input
                          type="password"
                          placeholder="Unlock Password"
                          value={params.password || ''}
                          onChange={(e) => updateOperatorParams(op.id, { password: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                      </div>
                    )}

                    {/* 17. REDACT PDF */}
                    {op.toolId === 'redact-pdf' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <input
                          type="text"
                          placeholder="Words to redact (comma separated)"
                          value={params.textPatterns ? params.textPatterns.join(', ') : ''}
                          onChange={(e) => updateOperatorParams(op.id, { textPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                      </div>
                    )}

                    {/* 18. URL TO PDF */}
                    {op.toolId === 'url-to-pdf' && (
                      <div className="flex flex-col gap-1 w-full text-[9px]">
                        <input
                          type="text"
                          placeholder="Website URL: https://example.com"
                          value={params.url || ''}
                          onChange={(e) => updateOperatorParams(op.id, { url: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant text-on-background focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Run Action Trigger Button */}
                    <button
                      disabled={!hasRequiredInputs}
                      onClick={(e) => {
                        e.stopPropagation();
                        executeOperator(op.id, null).catch(() => {});
                      }}
                      className={`mt-1 w-full py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow pointer-events-auto ${
                        hasRequiredInputs 
                          ? 'bg-primary hover:bg-primary/90 text-white' 
                          : 'bg-outline-variant/30 text-outline cursor-not-allowed border border-outline-variant/20 shadow-none'
                      }`}
                      title={hasRequiredInputs ? "Run this operation" : `Requires at least ${validation.minInputs} inputs`}
                    >
                      <span className="material-symbols-outlined text-[12px] fill">
                        {hasRequiredInputs ? 'play_arrow' : 'warning'}
                      </span>
                      {hasRequiredInputs ? 'Run Action' : `Connect ${validation.minInputs} Files`}
                    </button>
                  </div>
                )}

                {/* Status indicator for non-idle modes */}
                {!isIdle && (
                  <div className="mt-1 flex flex-col gap-1">
                    {op.status === 'processing' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 border-[2px] border-primary/20 border-t-primary rounded-full animate-spin flex-shrink-0" />
                          <span className="text-[9px] font-bold text-primary font-label-mono">{formatStatusText(op.statusText)} ({op.progress}%)</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelOperator(op.id); }}
                          className="w-full py-1 bg-error/10 hover:bg-error/20 text-error text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-0.5 cursor-pointer pointer-events-auto"
                        >
                          <span className="material-symbols-outlined text-[11px]">stop_circle</span>
                          Cancel
                        </button>
                      </>
                    ) : isFailed ? (
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-danger">Failed</span>
                        {op.error && (
                          <div className="text-[7.5px] text-error bg-error/10 p-1.5 rounded border border-error/20 max-w-[170px] break-words text-left leading-normal my-1">
                            {op.error}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); retryOperator(op.id); }}
                          className="w-full py-1 bg-warning/10 hover:bg-warning/20 text-warning text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-0.5 cursor-pointer pointer-events-auto"
                        >
                          <span className="material-symbols-outlined text-[11px]">replay</span>
                          Retry
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 w-full">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                          {op.status}
                        </span>
                        {op.telemetry && (
                          <div 
                            data-testid="telemetry-pill"
                            className="telemetry-pill mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm text-[7.5px] font-bold text-primary flex items-center justify-center gap-1 shadow-sm select-none max-w-full truncate"
                            title={`Execution: ${op.telemetry.durationSec}s${op.telemetry.throughputMbSec ? ` · Speed: ${op.telemetry.throughputMbSec} MB/s` : ''}${op.telemetry.sizeDeltaPct !== null && op.telemetry.sizeDeltaPct !== undefined ? ` · Size delta: ${op.telemetry.sizeDeltaPct}%` : ''}`}
                          >
                            <span>{formatTelemetryPill(op.telemetry)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapse / Expand Toggle Button (for all except qr-generator) */}
                {op.toolId !== 'qr-generator' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOperatorCollapse(op.id);
                    }}
                    className="absolute -top-1.5 right-[18px] w-5 h-5 rounded-full bg-surface-container border border-outline-variant hover:bg-primary/10 hover:text-primary text-outline flex items-center justify-center shadow-md cursor-pointer pointer-events-auto"
                    title={isCollapsed ? "Expand settings" : "Collapse settings"}
                  >
                    <span className="material-symbols-outlined text-[11px] font-bold">
                      {isCollapsed ? 'unfold_more' : 'unfold_less'}
                    </span>
                  </button>
                )}

                {/* Close Operation Node */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pushHistoryState();
                    setOperations(prev => prev.filter(o => o.id !== op.id));
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-container border border-outline-variant hover:bg-error-container/10 hover:text-error text-outline flex items-center justify-center shadow-md cursor-pointer pointer-events-auto"
                >
                  <span className="material-symbols-outlined text-[11px]">close</span>
                </button>
              </div>
            );
          })}

          {/* Visual Marquee Selection Box */}
          {selectionBox && (
            <div
              className="absolute border border-primary bg-primary/10 rounded pointer-events-none z-50"
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                width: `${Math.abs(selectionBox.startX - selectionBox.currentX)}px`,
                height: `${Math.abs(selectionBox.startY - selectionBox.currentY)}px`,
              }}
            />
          )}
        </div>

        {workspaceQueue.length === 0 && operations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-30 animate-[fadeIn_0.2s_ease-out]">
            <div className="w-[340px] rounded-2xl border border-dashed border-outline-variant/50 glass-widget p-6 text-center flex flex-col items-center justify-center gap-3.5 pointer-events-auto select-none">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">upload_file</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-background">Your Workspace Canvas is empty</h4>
                <p className="text-[10px] text-on-surface-variant/80 mt-1 leading-normal font-medium">
                  Drop documents anywhere on the grid or click below to start editing.
                </p>
              </div>
              <button
                onClick={handleLocalSelectClick}
                className="btn-theme-primary px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer mt-1"
              >
                Upload Documents
              </button>
            </div>
          </div>
        )}

        {/* FLOATING ACTION OVERLAYS */}
        
        {/* Floating Zoom / Reset panel (Bottom Right) */}
        <div className="absolute bottom-4 right-20 z-40 glass-widget p-1.5 rounded-xl flex items-center gap-1 shadow-lg">
          <button onClick={handleZoomOut} className="w-7 h-7 rounded-lg hover:bg-surface text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors" title="Zoom Out">
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>
          <span className="text-[10.5px] font-label-mono font-bold w-12 text-center text-on-surface-variant">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="w-7 h-7 rounded-lg hover:bg-surface text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors" title="Zoom In">
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>
          <div className="w-[1px] h-4 bg-outline-variant/60 mx-1" />
          <button onClick={handleZoomReset} className="w-7 h-7 rounded-lg hover:bg-surface text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors" title="Reset Viewport">
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          </button>
          <button onClick={() => handleFitToView()} className="w-7 h-7 rounded-lg hover:bg-surface text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors" title="Fit to Screen">
            <span className="material-symbols-outlined text-[16px]">fit_screen</span>
          </button>
        </div>

        {/* Floating Quick Action Widget (Left Center) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 glass-widget p-1.5 rounded-xl flex flex-col gap-1.5 shadow-lg">
          <button
            onClick={handleLocalSelectClick}
            className="w-8 h-8 rounded-lg hover:bg-primary/10 text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
            title="Upload Files to Canvas"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} multiple={true} className="hidden" accept=".pdf,.docx,.doc,.txt,.md,image/*,.pptx,.ppt,.xlsx,.xls,.csv,.html,.htm" />
        </div>



        {/* BOTTOM STITCH CHAT COMMAND INPUT BAR (Gemini & ChatGPT Prompt Box Style) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-[calc(100vw-32px)] sm:max-w-xl md:max-w-2xl lg:max-w-[720px] px-2 sm:px-0">
          <form
            onSubmit={handleSendCommand}
            className="relative w-full rounded-2xl sm:rounded-[26px] glass-widget border border-outline-variant/70 shadow-2xl p-2 sm:p-2.5 flex items-end gap-2 focus-within:border-primary/80 focus-within:shadow-[0_0_24px_rgba(var(--color-primary-rgb),0.15)] transition-all duration-200"
          >
            {/* Slash Commands Dropdown */}
            {showCommandsMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full glass-widget p-1.5 rounded-xl z-50 text-left flex flex-col shadow-2xl border border-outline-variant/60 animate-[scaleUp_0.12s_ease-out]">
                <span className="font-label-mono text-[9px] text-outline uppercase px-3.5 py-1.5 block select-none font-bold">Commands</span>
                {[
                  { cmd: '/merge', desc: 'Merge selected PDFs or Images' },
                  { cmd: '/compress', desc: 'Reduce selected PDF/Image file size' },
                  { cmd: '/split', desc: 'Split selected PDF into page ranges' },
                  { cmd: '/ocr', desc: 'Run character recognition on PDF' },
                  { cmd: '/clear', desc: 'Wipe all cards from canvas' },
                ].map(c => (
                  <button
                    key={c.cmd}
                    type="button"
                    onClick={() => {
                      setCommandInput(c.cmd);
                      setShowCommandsMenu(false);
                      if (commandTextareaRef.current) commandTextareaRef.current.focus();
                    }}
                    className="px-3.5 py-2 text-xs font-semibold hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg transition-colors flex items-center justify-between text-left cursor-pointer"
                  >
                    <span>{c.cmd}</span>
                    <span className="text-[10px] text-outline italic font-normal">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCommandsMenu(!showCommandsMenu)}
              className="w-9 h-9 shrink-0 rounded-xl bg-surface border border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-all mb-0.5"
              title="Quick Commands (/)"
            >
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </button>

            <textarea
              ref={commandTextareaRef}
              rows={1}
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                if (e.target.value === '/') {
                  setShowCommandsMenu(true);
                } else if (!e.target.value.startsWith('/')) {
                  setShowCommandsMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (commandInput.trim() && !isThinking) {
                    handleSendCommand(e);
                  }
                } else if (e.key === 'Escape' && showCommandsMenu) {
                  setShowCommandsMenu(false);
                }
              }}
              placeholder="What would you like to edit? Try '/merge', or describe your workflow..."
              disabled={isThinking}
              className="flex-grow bg-transparent border-none outline-none text-xs sm:text-sm text-on-background placeholder:text-outline font-semibold resize-none overflow-y-auto no-scrollbar py-2 px-2 leading-relaxed min-h-[36px] max-h-[160px] disabled:opacity-50 whitespace-pre-wrap break-words"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            />

            <button
              type="submit"
              disabled={isThinking || !commandInput.trim()}
              className="w-9 h-9 shrink-0 rounded-xl bg-primary text-white hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md disabled:opacity-30 disabled:scale-100 disabled:shadow-none mb-0.5"
              title="Send Prompt (Enter)"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </form>
        </div>

        {/* AI THINKING OVERLAY (Google Stitch style) */}
        {isThinking && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="px-5 py-4 rounded-2xl bg-surface-container border border-outline-variant shadow-xl flex items-center gap-3 animate-[scaleUp_0.15s_ease-out]">
              {/* Pulsing loading effect */}
              <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
                <span className="absolute w-full h-full rounded-full bg-primary/20 animate-ping" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              </div>
              <span className="text-xs font-bold text-on-surface-variant font-label-mono animate-pulse">
                {thinkingMessage}
              </span>
            </div>
          </div>
        )}
        {/* FLOATING CANVAS HEADER (Top Left) */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2 pointer-events-auto" ref={menuRef}>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all glass-widget cursor-pointer ${
                menuOpen ? 'text-primary border-primary ring-2 ring-primary/20' : 'text-outline hover:text-primary'
              }`}
              title="Menu"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform duration-300" style={{ transform: menuOpen ? 'rotate(90deg)' : 'none' }}>
                {menuOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* STITCH-INSPIRED MENU DROPDOWN */}
            {menuOpen && (
              <div className="absolute top-full left-0 mt-2 glass-widget rounded-2xl py-2 z-50 min-w-[240px] text-left select-none animate-dropdown">
                {/* Back to Workspace */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/workspace');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">arrow_back</span>
                  <span>Go to Workspace</span>
                </button>

                <div className="h-[1px] bg-outline-variant/60 my-1.5" />

                {/* Import Workflow */}
                <label className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[16px] text-outline">folder_open</span>
                  <span>Import Workflow</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      setMenuOpen(false);
                      handleImportWorkflow(e);
                    }} 
                    className="hidden" 
                  />
                </label>

                {/* Export Workflow */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleExportWorkflow();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">download</span>
                  <span>Export Workflow</span>
                </button>



                {/* CV Builder */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/resume-builder');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">description</span>
                  <span>CV Builder Templates</span>
                </button>

                {/* Workspace Preferences */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsRightDockExpanded(true);
                    showToast('Canvas preferences sidebar opened');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">settings</span>
                  <span>Workspace Preferences</span>
                </button>

                <div className="h-[1px] bg-outline-variant/60 my-1.5" />

                {/* Clear Canvas */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setWorkspaceQueue([]);
                    setClearCanvasSignal(prev => prev + 1);
                    showToast('Canvas cleared completely');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-error hover:bg-error/5 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-error">delete_sweep</span>
                  <span>Clear Canvas</span>
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">logout</span>
                  <span>Sign Out</span>
                </button>

                {/* Footer details (Pro plan and Storage details) */}
                <div className="mt-2 pt-2.5 px-4 pb-3 border-t border-outline-variant/60 flex flex-col gap-2 bg-surface-container-low/50 rounded-b-2xl">
                  {/* Pro tier tag */}
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[15px] fill">workspace_premium</span>
                    <span className="text-[9.5px] font-bold text-on-surface uppercase tracking-wider">{isPro ? 'PRO PLAN' : 'FREE TIER'}</span>
                  </div>
                  {/* Compact storage percentage */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[9px] text-outline font-semibold">
                      <span>Local Storage</span>
                      <span>1.2 GB / 50 GB</span>
                    </div>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden border border-outline-variant/50">
                      <div className="h-full bg-primary transition-all duration-300 w-[2.4%]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface/85 backdrop-blur-md border border-outline-variant/60 shadow-lg px-3.5 py-1.5 h-10 rounded-xl flex items-center gap-2.5 select-none">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[13px] text-on-background tracking-tight">DocScalar Studio</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 leading-none">
                Beta
              </span>
            </div>
            
            <div className="h-4 w-[1px] bg-outline-variant/60" />

            <button
              onClick={handleLocalSelectClick}
              className="text-[11.5px] text-primary hover:bg-primary/10 border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1.5 cursor-pointer"
              title="Upload files to canvas"
            >
              <span className="material-symbols-outlined text-[14px]">upload</span>
              Upload File(s)
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFitToView()}
                className="text-[10px] font-bold bg-surface-container hover:bg-primary/10 hover:text-primary border border-outline-variant hover:border-primary/40 text-on-surface-variant px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1"
                title="Click to center and fit all files in view"
              >
                <span className="material-symbols-outlined text-[12px]">fit_screen</span>
                {workspaceQueue.length} {workspaceQueue.length === 1 ? 'file' : 'files'}
              </button>
            </div>

            <div className="h-4 w-[1px] bg-outline-variant/60" />

            {/* Workflow Recipes Dropdown */}
            <div className="relative" ref={recipesMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRecipesMenuOpen(!recipesMenuOpen);
                }}
                className="text-[11px] text-amber-500 hover:bg-amber-500/10 border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Load pre-configured multi-step workflow blueprints"
              >
                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                Recipes
                <span className="material-symbols-outlined text-[12px]">{recipesMenuOpen ? 'expand_less' : 'expand_more'}</span>
              </button>

              {recipesMenuOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-80 bg-surface-container-high border border-outline-variant/80 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-outline border-b border-outline-variant/50 flex justify-between items-center">
                    <span>Workflow Blueprints</span>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">1-CLICK</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-1.5 max-h-64 overflow-y-auto pr-0.5">
                    {WORKFLOW_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyWorkflowPreset(preset)}
                        className="w-full text-left p-2 rounded-lg hover:bg-primary/10 transition-all flex flex-col gap-0.5 group cursor-pointer"
                      >
                        <div className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors flex items-center justify-between">
                          <span>{preset.name}</span>
                          <span className="text-[9px] font-semibold text-outline-variant bg-surface-container px-1 py-0.5 rounded uppercase">{preset.category}</span>
                        </div>
                        <span className="text-[10px] text-on-surface-variant line-clamp-2 leading-tight">
                          {preset.description}
                        </span>
                      </button>
                    ))}

                    {/* Custom User Blueprints */}
                    {customFlows && customFlows.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-outline border-t border-outline-variant/50 mt-1">
                          My Saved Blueprints
                        </div>
                        {customFlows.map((flow, fIdx) => (
                          <button
                            key={`custom-${fIdx}`}
                            onClick={() => applyCustomFlow(flow)}
                            className="w-full text-left p-2 rounded-lg hover:bg-emerald-500/10 transition-all flex flex-col gap-0.5 group cursor-pointer border border-emerald-500/20 bg-emerald-500/5"
                          >
                            <div className="text-xs font-bold text-on-surface group-hover:text-emerald-500 transition-colors flex items-center justify-between">
                              <span>{flow.name}</span>
                              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded">{flow.operations?.length || 0} nodes</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Save current canvas as custom blueprint */}
                  <div className="mt-2 pt-2 border-t border-outline-variant/60">
                    <button
                      onClick={handleSaveCustomFlow}
                      disabled={operations.length === 0}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                      Save Current Canvas as Blueprint
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Share Flow Link Button */}
            <button
              onClick={handleShareFlow}
              className="text-[10.5px] text-on-surface-variant hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Copy shareable link to this workflow DAG"
            >
              <span className="material-symbols-outlined text-[13px]">share</span>
              Share Flow
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/60" />

            <button
              onClick={handleExportWorkflow}
              className="text-[10.5px] text-on-surface-variant hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Download canvas workflow template (JSON)"
            >
              <span className="material-symbols-outlined text-[13px]">download</span>
              Export Workflow
            </button>

            <label
              className="text-[10.5px] text-on-surface-variant hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Load saved workflow template (JSON)"
            >
              <span className="material-symbols-outlined text-[13px]">folder_open</span>
              Import Workflow
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportWorkflow} 
                className="hidden" 
              />
            </label>

            {/* Undo / Redo Actions */}
            <div className="h-4 w-[1px] bg-outline-variant/60" />
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                className="text-[10.5px] text-on-surface-variant hover:text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Undo last action (Ctrl+Z)"
              >
                <span className="material-symbols-outlined text-[14px]">undo</span>
                Undo
              </button>
              <button
                onClick={handleRedo}
                className="text-[10.5px] text-on-surface-variant hover:text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Redo last reverted action (Ctrl+Y)"
              >
                <span className="material-symbols-outlined text-[14px]">redo</span>
                Redo
              </button>
            </div>

            {workspaceQueue.length > 0 && (
              <>
                <div className="h-4 w-[1px] bg-outline-variant/60" />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setWorkspaceQueue([]); showToast('Files cleared, tools kept'); }}
                    className="text-[10.5px] text-on-surface-variant hover:text-error hover:bg-error/5 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer"
                    title="Wipe files only, keep tool cards"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                    Clear Files
                  </button>
                  {(workspaceQueue.length > 0 || operations.length > 0) && (
                    <button
                      onClick={() => { setWorkspaceQueue([]); setClearCanvasSignal(prev => prev + 1); showToast('Canvas cleared completely'); }}
                      className="text-[10.5px] text-on-surface-variant hover:text-error hover:bg-error/5 px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer"
                      title="Wipe files and tool cards from canvas"
                    >
                      <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                      Clear Canvas
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FLOATING VIEW MODE & SETTINGS SWITCHER (Top Right) */}
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">


          <div className="flex items-center gap-1.5 bg-surface/85 backdrop-blur-md border border-outline-variant/60 rounded-xl p-1 shadow-lg h-9">
            <button 
              onClick={() => navigate('/workspace')} 
              className="w-7 h-7 rounded-lg hover:bg-primary/5 text-outline hover:text-primary flex items-center justify-center transition-all cursor-pointer" 
              title="Exit Canvas"
            >
              <span className="material-symbols-outlined text-[17px]">close</span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/60" />

            <button onClick={handleThemeToggle} className="w-7 h-7 rounded-lg hover:bg-primary/5 text-outline hover:text-primary flex items-center justify-center transition-all cursor-pointer" title="Toggle theme">
              <span className="material-symbols-outlined text-[17px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            <button 
              onClick={() => {
                const nextVal = !autoFitViewport;
                setAutoFitViewport(nextVal);
                if (nextVal) {
                  handleFitToView();
                }
                showToast(nextVal ? 'Auto-fit viewport enabled' : 'Auto-fit viewport disabled (zoom stays still)', 'info');
              }} 
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                autoFitViewport 
                  ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                  : 'hover:bg-primary/5 text-outline hover:text-primary'
              }`}
              title={autoFitViewport ? "Auto-fit viewport is ON (Click to turn OFF)" : "Auto-fit viewport is OFF (Click to turn ON)"}
            >
              <span className="material-symbols-outlined text-[17px]">
                {autoFitViewport ? 'center_focus_strong' : 'center_focus_weak'}
              </span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/60" />

            <div className="relative">
              <button onClick={() => setCanvasProfileOpen(!canvasProfileOpen)} className="flex items-center gap-0.5 p-0.5 hover:bg-surface-container rounded-full transition-all cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-[10px] text-white shadow-sm ring-2 ring-primary/20 select-none">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'D'}
                </div>
                <span className="material-symbols-outlined text-[14px] text-outline">keyboard_arrow_down</span>
              </button>
              {canvasProfileOpen && (
                <div className="absolute top-full right-0 mt-2.5 bg-surface border border-outline-variant rounded-xl shadow-xl py-1.5 z-50 min-w-[180px] text-left">
                  <div className="px-3.5 py-1.5 text-[10px] text-on-surface-variant font-medium border-b border-outline-variant/60 truncate max-w-[200px]">{userEmail}</div>
                  <button onClick={handleLogout} className="w-full text-left px-3.5 py-2 text-xs text-error hover:bg-error-container/10 font-bold border-t border-outline-variant/60 flex items-center gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined text-[15px]">logout</span>Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FLOATING QUICK-ACCESS DOCK (Hover Expandable, Right Side) */}
        <div 
          onMouseEnter={() => setIsRightDockExpanded(true)}
          onMouseLeave={() => setIsRightDockExpanded(false)}
          className={`absolute right-4 top-24 bottom-24 z-40 bg-surface/85 backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-3xl p-3 flex flex-col gap-2 transition-all duration-300 pointer-events-auto ${
            isRightDockExpanded ? 'w-[190px]' : 'w-[56px]'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2 flex-shrink-0 text-center">
            <span className="material-symbols-outlined text-[18px] text-primary select-none">construction</span>
            {isRightDockExpanded && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Quick Tools</span>
            )}
          </div>
          
          <div className="h-[1px] bg-outline-variant/50 flex-shrink-0 mb-1" />

          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5">
            {[
              { id: 'merge-pdf', label: 'Merge PDF', icon: 'join_inner' },
              { id: 'split-pdf', label: 'Split PDF', icon: 'content_cut' },
              { id: 'compress-pdf', label: 'Compress PDF', icon: 'compress' },
              { id: 'docx-to-pdf', label: 'Word to PDF', icon: 'upload_file' },
              { id: 'pdf-to-word', label: 'PDF to Word', icon: 'description' },
              { id: 'image-to-pdf', label: 'JPG to PDF', icon: 'image' },
              { id: 'pdf-to-image', label: 'PDF to JPG', icon: 'photo_library' },
              { id: 'edit-pdf', label: 'Edit PDF', icon: 'edit' },
              { id: 'ocr-pdf', label: 'OCR PDF', icon: 'document_scanner' },
              { id: 'sign-pdf', label: 'Sign PDF', icon: 'draw' },
              { id: 'image-converter', label: 'Convert Image', icon: 'transform' },
              { id: 'image-compressor', label: 'Compress Image', icon: 'photo_size_select_large' },
              { id: 'qr-generator', label: 'QR Generator', icon: 'qr_code_2' }
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleTriggerAction(tool.id, selectedNodeIds)}
                className={`flex items-center gap-3 p-2 h-9 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer select-none min-w-0 ${
                  isRightDockExpanded ? 'justify-start px-3 w-full' : 'justify-center w-8'
                }`}
                title={!isRightDockExpanded ? tool.label : undefined}
              >
                <span className="material-symbols-outlined text-[17px] fill text-primary flex-shrink-0">{tool.icon}</span>
                {isRightDockExpanded && (
                  <span className="text-[11px] font-bold text-on-surface-variant truncate leading-none">{tool.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* FLOATING ACTIVITY LOGS (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-40 flex flex-col items-start gap-2 pointer-events-auto">
          {isActivityLogOpen && (
            <div className="w-[360px] max-h-[380px] bg-surface/85 backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-[fadeIn_0.2s_ease-out] overflow-hidden">
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2">
                <span className="text-xs font-bold text-on-background flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">analytics</span>
                  Canvas Activity Logs
                </span>
                <button 
                  onClick={() => setIsActivityLogOpen(false)} 
                  className="text-outline hover:text-on-background"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Tab Selector buttons */}
              <div className="flex border-b border-outline-variant/30 pb-0.5">
                <button
                  onClick={() => setActiveLogTab('queue')}
                  className={`flex-1 pb-1.5 text-[10px] font-bold text-center border-b-2 transition-all ${
                    activeLogTab === 'queue'
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-outline hover:text-on-background'
                  }`}
                >
                  Documents Queue ({workspaceQueue.length})
                </button>
                <button
                  onClick={() => setActiveLogTab('audit')}
                  className={`flex-1 pb-1.5 text-[10px] font-bold text-center border-b-2 transition-all ${
                    activeLogTab === 'audit'
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-outline hover:text-on-background'
                  }`}
                >
                  Workflow Audit ({auditLogs.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 min-h-0 pr-0.5">
                {activeLogTab === 'queue' ? (
                  workspaceQueue.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-on-surface-variant/80 font-medium">
                      No active documents on canvas.
                    </div>
                  ) : (
                    workspaceQueue.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-2 bg-surface-container-low/40 border border-outline-variant/40 rounded-xl">
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[11.5px] font-bold text-on-background truncate leading-tight">{item.name}</p>
                          <p className="text-[9.5px] text-on-surface-variant/80 mt-0.5 font-semibold">
                            {item.status === 'PendingAction' && 'Ready'}
                            {item.status === 'Processing' && `Processing (${item.progress}%)`}
                            {item.status === 'Completed' && 'Completed'}
                            {item.status === 'Failed' && 'Failed'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {item.status === 'Processing' ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                          ) : item.status === 'Completed' ? (
                            <span className="material-symbols-outlined text-[15px] text-success fill">check_circle</span>
                          ) : item.status === 'Failed' ? (
                            <span className="material-symbols-outlined text-[15px] text-error fill">error</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                          )}
                          <button
                            onClick={() => setWorkspaceQueue(prev => prev.filter(q => q.id !== item.id))}
                            className="text-outline hover:text-error flex items-center justify-center p-0.5"
                            title="Remove node"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-on-surface-variant/80 font-medium">
                      No actions logged yet.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[...auditLogs].reverse().map((log) => (
                        <div key={log.id} className="p-2.5 rounded-xl bg-surface-container-low/40 border border-outline-variant/40 text-left">
                          <div className="flex items-center justify-between text-[8.5px] font-bold text-outline">
                            <span>{log.timestamp}</span>
                            <span className={`px-1.5 py-0.5 rounded-full uppercase tracking-wider text-[7.5px] font-extrabold ${
                              log.status === 'success' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-background mt-1 font-bold leading-normal">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}
            className="h-10 px-4 rounded-xl border border-outline-variant/60 bg-surface/85 backdrop-blur-md shadow-lg hover:bg-primary/5 hover:border-primary text-on-surface-variant hover:text-primary flex items-center gap-2 font-bold text-[11px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-primary select-none">
              {isActivityLogOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
            </span>
            Activity Logs
            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 rounded-md">
              {workspaceQueue.length}
            </span>
          </button>
        </div>
      </div>

      {/* CUSTOM RIGHT-CLICK CONTEXT MENU (Premium Glassmorphism) */}
      {contextMenu.visible && (
        <div 
          className="absolute backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-2xl p-1.5 w-64 text-left flex flex-col gap-0.5 select-none animate-[fadeIn_0.1s_ease-out] pointer-events-auto"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px`,
            transform: 'translate3d(0, 0, 0)',
            zIndex: 99999,
            backgroundColor: 'var(--bg-glass-strong)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Section 0: Upload */}
          <button
            onClick={() => {
              lastUploadCoords.current = { x: contextMenu.gridX, y: contextMenu.gridY };
              fileInputRef.current.click();
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer border-none bg-primary/5 mb-1"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">upload</span>
              Upload File(s) Here
            </span>
            <span className="text-[9.5px] text-primary/75 font-bold tracking-tight">Double-click</span>
          </button>

          <div className="h-[1px] bg-outline-variant/50 my-1 mx-2" />

          {/* Section 1: Undo & Redo */}
          <button
            onClick={() => { handleUndo(); setContextMenu(prev => ({ ...prev, visible: false })); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:bg-primary/5 hover:text-primary rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">undo</span>
              Undo
            </span>
            <span className="text-[10px] text-outline font-medium">Ctrl+Z</span>
          </button>

          <button
            onClick={() => { handleRedo(); setContextMenu(prev => ({ ...prev, visible: false })); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:bg-primary/5 hover:text-primary rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">redo</span>
              Redo
            </span>
            <span className="text-[10px] text-outline font-medium">Ctrl+Shift+Z</span>
          </button>

          <div className="h-[1px] bg-outline-variant/50 my-1 mx-2" />

          {/* Section 2: Format & Operations */}
          <button
            onClick={() => { arrangeCanvasNodes(); setContextMenu(prev => ({ ...prev, visible: false })); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:bg-primary/5 hover:text-primary rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">grid_view</span>
              Arrange Canvas
            </span>
            <span className="text-[10px] text-outline font-medium">Format Layout</span>
          </button>

          <button
            onClick={() => { setWorkspaceQueue([]); setOperations([]); setSelectedNodeIds([]); showToast('Canvas cleared completely'); setContextMenu(prev => ({ ...prev, visible: false })); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:bg-error/5 hover:text-error rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-error">delete_sweep</span>
              Clear Canvas
            </span>
            <span className="text-[10px] text-outline font-medium">Wipe All</span>
          </button>

          <button
            onClick={() => { navigate('/workspace'); setContextMenu(prev => ({ ...prev, visible: false })); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface hover:bg-primary/5 hover:text-primary rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-outline">arrow_back</span>
              Exit Canvas
            </span>
            <span className="text-[10px] text-outline font-medium">To Workspace</span>
          </button>

          <div className="h-[1px] bg-outline-variant/50 my-1 mx-2" />

          {/* Section 3: Add Tool Sub-menu (Hover to Slide-out) */}
          <div 
            className="relative group w-full"
            onMouseEnter={() => setContextMenu(prev => ({ ...prev, activeSubmenu: 'add' }))}
            onMouseLeave={() => setContextMenu(prev => ({ ...prev, activeSubmenu: null }))}
          >
            <div className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-on-surface group-hover:bg-primary/5 group-hover:text-primary rounded-xl transition-all cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">add_box</span>
                Add Tool Card
              </span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </div>

            {contextMenu.activeSubmenu === 'add' && (
              <div 
                className="absolute top-0 left-full ml-1 backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-2xl p-1.5 w-60 flex flex-col gap-0.5 animate-[fadeIn_0.1s_ease-out] pointer-events-auto"
                style={{
                  transform: 'translate3d(0, 0, 0)',
                  zIndex: 100000,
                  backgroundColor: 'var(--bg-glass-strong)'
                }}
              >
                {/* Hover Bridge to close gap to main context menu */}
                <div className="absolute top-0 -left-2.5 w-2.5 h-full bg-transparent pointer-events-auto" />
                {[
                  {
                    category: 'PDF Tools',
                    icon: 'picture_as_pdf',
                    items: [
                      { id: 'merge-pdf', label: 'Merge PDF' },
                      { id: 'split-pdf', label: 'Split PDF' },
                      { id: 'compress-pdf', label: 'Compress PDF' },
                      { id: 'ocr-pdf', label: 'OCR PDF' },
                      { id: 'rotate-pdf', label: 'Rotate PDF' },
                      { id: 'edit-pdf', label: 'Edit PDF' },
                      { id: 'sign-pdf', label: 'Sign PDF' },
                      { id: 'add-page-numbers', label: 'Add Page Numbers' },
                      { id: 'add-watermark', label: 'Add Watermark' },
                      { id: 'crop-pdf', label: 'Crop PDF' },
                      { id: 'extract-pages', label: 'Extract Pages' },
                      { id: 'organize-pdf', label: 'Organize PDF' },
                      { id: 'pdf-forms', label: 'Fill PDF Forms' },
                      { id: 'remove-pages', label: 'Remove Pages' },
                      { id: 'repair-pdf', label: 'Repair PDF' },
                      { id: 'protect-pdf', label: 'Protect PDF' },
                      { id: 'unlock-pdf', label: 'Unlock PDF' },
                      { id: 'redact-pdf', label: 'Redact PDF' },
                      { id: 'pdf-to-pdfa', label: 'PDF to PDF/A' }
                    ]
                  },
                  {
                    category: 'Office & Conversions',
                    icon: 'description',
                    items: [
                      { id: 'docx-to-pdf', label: 'Word to PDF' },
                      { id: 'excel-to-pdf', label: 'Excel to PDF' },
                      { id: 'powerpoint-to-pdf', label: 'PowerPoint to PDF' },
                      { id: 'pdf-to-word', label: 'PDF to Word' },
                      { id: 'pdf-to-excel', label: 'PDF to Excel' },
                      { id: 'pdf-to-powerpoint', label: 'PDF to PowerPoint' },
                      { id: 'text-to-pdf', label: 'Text to PDF' },
                      { id: 'url-to-pdf', label: 'URL to PDF' }
                    ]
                  },
                  {
                    category: 'Image Tools',
                    icon: 'image',
                    items: [
                      { id: 'image-converter', label: 'Convert Image' },
                      { id: 'image-compressor', label: 'Compress Image' },
                      { id: 'image-resizer', label: 'Resize Image' },
                      { id: 'image-to-pdf', label: 'JPG to PDF' }
                    ]
                  },
                  {
                    category: 'Utilities',
                    icon: 'construction',
                    items: [
                      { id: 'unzip-file', label: 'Unzip/Expand File' },
                      { id: 'qr-generator', label: 'QR Generator' }
                    ]
                  }
                ].map((catGroup) => (
                  <div key={catGroup.category} className="relative group/sub w-full">
                    <div className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-on-surface-variant/80 hover:bg-primary/5 hover:text-primary rounded-lg cursor-pointer transition-all">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">{catGroup.icon}</span>
                        {catGroup.category}
                      </span>
                      <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    </div>
                    
                    {/* Nested Flyout Level 2 */}
                    <div 
                      className="absolute top-0 left-full ml-1 hidden group-hover/sub:flex flex-col gap-0.5 backdrop-blur-xl border border-outline-variant/60 shadow-2xl rounded-2xl p-1.5 w-56 animate-[fadeIn_0.1s_ease-out] pointer-events-auto"
                      style={{
                        transform: 'translate3d(0, 0, 0)',
                        zIndex: 100001,
                        backgroundColor: 'var(--bg-glass-strong)'
                      }}
                    >
                      {/* Hover Bridge to close gap to category menu */}
                      <div className="absolute top-0 -left-2.5 w-2.5 h-full bg-transparent pointer-events-auto" />
                      {catGroup.items.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            spawnToolAtCoords(tool.id, contextMenu.gridX, contextMenu.gridY);
                            setContextMenu(prev => ({ ...prev, visible: false }));
                          }}
                          className="w-full text-left px-3 py-1.5 text-[11.5px] font-semibold text-on-surface hover:bg-primary/5 hover:text-primary rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING MULTI-SELECT ACTION BAR */}
      {selectedNodeIds.length > 0 && (
        <div 
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 glass-widget rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-[scaleUp_0.18s_ease-out] pointer-events-auto"
        >
          <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 font-label-mono">
            <span className="material-symbols-outlined text-[16px] text-primary select-none">check_box</span>
            {selectedNodeIds.length} item{selectedNodeIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="w-[1px] h-4 bg-outline-variant/60" />
          {selectedCompletedFiles.length > 0 && (
            <>
              <button
                onClick={() => {
                  selectedCompletedFiles.forEach(file => {
                    saveAs(file.resultBlob, file.resultName);
                  });
                  showToast(`Downloading ${selectedCompletedFiles.length} file(s)`);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-primary text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Download ({selectedCompletedFiles.length})
              </button>
              {selectedCompletedFiles.length > 1 && (
                <button
                  onClick={async () => {
                    const zip = new JSZip();
                    selectedCompletedFiles.forEach(file => {
                      zip.file(file.resultName, file.resultBlob);
                    });
                    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
                    saveAs(zipBlob, 'selected_downloads.zip');
                    showToast('Downloaded selected files as ZIP');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold border border-outline-variant bg-surface hover:bg-surface-container rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer text-on-surface"
                >
                  <span className="material-symbols-outlined text-[14px]">folder_zip</span>
                  Download as ZIP
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              const targetsToDelete = selectedNodeIds;
              setWorkspaceQueue(prev => prev.filter(q => !targetsToDelete.includes(q.id)));
              setOperations(prev => prev.filter(o => !targetsToDelete.includes(o.id)));
              setSelectedNodeIds([]);
              showToast('Removed selected items');
            }}
            className="px-2.5 py-1 text-[11px] font-bold border border-error/30 hover:border-error hover:bg-error/5 text-error rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            Delete
          </button>
          <button
            onClick={() => setSelectedNodeIds([])}
            className="text-outline hover:text-on-background ml-1 flex items-center justify-center cursor-pointer border-none bg-transparent"
            title="Clear Selection"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* BATCH FORMAT CHOICE MODAL */}
      {batchChoiceModal && (
        <div className="absolute inset-0 bg-background/55 backdrop-blur-[4px] z-[99999] flex items-center justify-center animate-[fadeIn_0.15s_ease-out] pointer-events-auto">
          <div className="w-[520px] bg-surface-container border border-outline-variant shadow-2xl rounded-3xl p-6 flex flex-col gap-5 animate-[scaleUp_0.18s_ease-out]">
            <div className="flex items-center gap-3 border-b border-outline-variant pb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px] select-none">dynamic_feed</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-bold text-on-background leading-tight">Batch Output Format Options</h3>
                <p className="text-[11px] text-outline font-medium mt-0.5">Choose how to format the conversion of your {batchChoiceModal.fileCount} documents.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Option 1: File by File */}
              <button
                onClick={() => {
                  setBatchChoiceModal(null);
                  batchChoiceModal.resolve('files');
                }}
                className="group flex flex-col items-start text-left p-4 rounded-2xl border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-primary/5 cursor-pointer transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <span className="text-xs font-bold text-on-background group-hover:text-primary transition-colors">Individual Files</span>
                <span className="text-[10px] text-outline mt-1 font-medium leading-relaxed">
                  Receive each converted file as a separate box arranged in a neat grid on the canvas.
                </span>
                <div className="w-full mt-4 py-1.5 rounded-lg bg-surface border border-outline-variant/60 group-hover:border-primary/50 text-[10px] font-bold text-center text-on-surface group-hover:text-primary transition-all">
                  Generate Files ({batchChoiceModal.fileCount})
                </div>
              </button>

              {/* Option 2: Single ZIP */}
              <button
                onClick={() => {
                  setBatchChoiceModal(null);
                  batchChoiceModal.resolve('zip');
                }}
                className="group flex flex-col items-start text-left p-4 rounded-2xl border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-primary/5 cursor-pointer transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-[20px]">folder_zip</span>
                </div>
                <span className="text-xs font-bold text-on-background group-hover:text-primary transition-colors">Single ZIP Archive</span>
                <span className="text-[10px] text-outline mt-1 font-medium leading-relaxed">
                  Bundle all converted files together into a clean, downloadable ZIP archive folder.
                </span>
                <div className="w-full mt-4 py-1.5 rounded-lg bg-surface border border-outline-variant/60 group-hover:border-primary/50 text-[10px] font-bold text-center text-on-surface group-hover:text-primary transition-all">
                  Package as ZIP
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-3">
              <button
                onClick={() => {
                  setBatchChoiceModal(null);
                  batchChoiceModal.resolve('cancel');
                }}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-on-background transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERWRITE / KEEP BOTH CHOICE MODAL */}
      {overwriteQueue.length > 0 && (() => {
        const overwritePrompt = overwriteQueue[0];
        const resolveAndShift = (choice) => {
          const resolve = overwritePrompt.resolve;
          setOverwriteQueue(prev => prev.slice(1));
          resolve(choice);
        };
        return (
        <div className="absolute inset-0 bg-background/55 backdrop-blur-[4px] z-[99999] flex items-center justify-center animate-[fadeIn_0.15s_ease-out] pointer-events-auto">
          <div className="w-[460px] bg-surface-container border border-outline-variant shadow-2xl rounded-3xl p-6 flex flex-col gap-5 animate-[scaleUp_0.18s_ease-out]">
            <div className="flex items-center gap-3 border-b border-outline-variant pb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px] select-none">file_copy</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-bold text-on-background leading-tight">Linked Output Exists</h3>
                <p className="text-[11px] text-outline font-medium mt-0.5">Choose how to handle the new generated output files.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: Replace */}
              <button
                onClick={() => resolveAndShift('replace')}
                className="w-full text-left p-3.5 rounded-2xl border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-primary/5 cursor-pointer transition-all flex items-center gap-3.5 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">published_with_changes</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-on-background">Replace Existing Output</span>
                  <span className="block text-[10px] text-outline mt-0.5 font-medium leading-relaxed">
                    Overwrites the existing output card with the new result. Keeps your workspace clean.
                  </span>
                </div>
              </button>

              {/* Option 2: Keep Both */}
              <button
                onClick={() => resolveAndShift('keep')}
                className="w-full text-left p-3.5 rounded-2xl border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-primary/5 cursor-pointer transition-all flex items-center gap-3.5 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">add_to_photos</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-on-background">Keep Both (Spawn New Card)</span>
                  <span className="block text-[10px] text-outline mt-0.5 font-medium leading-relaxed">
                    Spawns a new file card next to the operator, keeping your previous run untouched.
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-3">
              <button
                onClick={() => resolveAndShift('cancel')}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-on-background transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel Execution
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* DESTRUCTIVE ACTION CONFIRMATION MODAL */}
      {destructivePrompt && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[6px] z-[99999] flex items-center justify-center animate-[fadeIn_0.15s_ease-out] pointer-events-auto">
          <div className="w-[440px] bg-surface-container border border-error/30 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 animate-[scaleUp_0.18s_ease-out]">
            <div className="flex items-center gap-3.5 border-b border-outline-variant pb-3.5">
              <div className="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center text-error animate-pulse">
                <span className="material-symbols-outlined text-[24px] select-none">warning</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-black text-on-background leading-tight">Confirm Destructive Action</h3>
                <p className="text-[11px] text-outline font-semibold mt-0.5">Please review the modified files carefully.</p>
              </div>
            </div>

            <div className="text-left flex flex-col gap-3">
              <p className="text-[11.5px] font-bold text-on-surface-variant leading-relaxed">
                You are about to run destructive tools:
                <span className="block mt-1 font-extrabold text-error">
                  {destructivePrompt.tools.join(', ')}
                </span>
              </p>
              <div className="p-3 rounded-2xl bg-surface-container-low/60 border border-outline-variant/50 max-h-[100px] overflow-y-auto">
                <span className="block text-[10px] text-outline font-extrabold uppercase mb-1">Target Documents:</span>
                {destructivePrompt.files.map((name, i) => (
                  <div key={i} className="text-[11px] font-bold text-on-background truncate py-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    {name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-3">
              <button
                onClick={() => destructivePrompt.resolve(false)}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-on-background transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel
              </button>
              <button
                onClick={() => destructivePrompt.resolve(true)}
                className="px-4 py-2 text-xs font-bold bg-error text-on-error rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer border-none"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOTAL OPERATION COUNT THRESHOLD WARNING MODAL */}
      {thresholdPrompt && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[6px] z-[99999] flex items-center justify-center animate-[fadeIn_0.15s_ease-out] pointer-events-auto">
          <div className="w-[440px] bg-surface-container border border-warning/30 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 animate-[scaleUp_0.18s_ease-out]">
            <div className="flex items-center gap-3.5 border-b border-outline-variant pb-3.5">
              <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <span className="material-symbols-outlined text-[24px] select-none">speed</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-black text-on-background leading-tight">High Operation Limit Warning</h3>
                <p className="text-[11px] text-outline font-semibold mt-0.5">Large batch sizes can slow down performance.</p>
              </div>
            </div>

            <div className="text-left">
              <p className="text-[11.5px] font-bold text-on-surface-variant leading-relaxed">
                This workflow compiles a total of <span className="text-warning font-black">{thresholdPrompt.opCount} operations</span> (e.g. splitting files to pages). Running this locally might freeze your browser.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-3">
              <button
                onClick={() => thresholdPrompt.resolve(false)}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-on-background transition-colors cursor-pointer bg-transparent border-none"
              >
                Abort Workflow
              </button>
              <button
                onClick={() => thresholdPrompt.resolve(true)}
                className="px-4 py-2 text-xs font-bold bg-warning text-black rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer border-none"
              >
                Run Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLARIFICATION REQUEST MODAL */}
      {clarificationPrompt && (
        <div 
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              clarificationPrompt.resolve(null);
            }
          }}
          className="absolute inset-0 bg-background/60 backdrop-blur-[6px] z-[99999] flex items-center justify-center animate-[fadeIn_0.15s_ease-out] pointer-events-auto"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const val = e.target.clarificationInput.value.trim();
              clarificationPrompt.resolve(val || null);
            }}
            className="w-[480px] bg-surface-container border border-primary/30 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 animate-[scaleUp_0.18s_ease-out]"
          >
            <div className="flex items-center gap-3.5 border-b border-outline-variant pb-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px] select-none">help_outline</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-sm font-black text-on-background leading-tight">AI Planner Clarification</h3>
                <p className="text-[11px] text-outline font-semibold mt-0.5">Please clarify your instructions to complete the plan.</p>
              </div>
            </div>

            <div className="text-left flex flex-col gap-3">
              <p className="text-[11.5px] font-bold text-on-surface-variant leading-relaxed">
                {clarificationPrompt.message}
              </p>

              {/* Interactive preset options button chips */}
              {Array.isArray(clarificationPrompt.options) && clarificationPrompt.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {clarificationPrompt.options.map((opt, optIdx) => (
                    <button
                      key={opt.actionId || optIdx}
                      type="button"
                      onClick={() => clarificationPrompt.resolve(opt.prompt || opt)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 hover:bg-primary hover:text-on-primary active:scale-95 transition-all cursor-pointer text-left flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      {opt.label || opt.prompt || (typeof opt === 'string' ? opt : 'Option')}
                    </button>
                  ))}
                </div>
              )}

              <input 
                name="clarificationInput"
                type="text" 
                placeholder="Clarify which document, pages or tool parameters to use..."
                autoFocus
                className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low text-[11px] font-bold text-on-background outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-3">
              <button
                type="button"
                onClick={() => clarificationPrompt.resolve(null)}
                className="px-4 py-2 text-xs font-bold text-outline hover:text-on-background transition-colors cursor-pointer bg-transparent border-none"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer border-none"
              >
                Submit Response
              </button>
            </div>
          </form>
        </div>
      )}
      {/* DIAGNOSTICS & AUTO-HEAL FLOATING PANEL */}
      {canvasIssues.length > 0 && (
        <div 
          className="absolute bottom-20 left-6 z-40 bg-surface/90 backdrop-blur-xl border border-warning/35 shadow-2xl rounded-2xl p-4 flex flex-col gap-2 max-w-sm animate-[slideUp_0.22s_ease-out] pointer-events-auto"
          style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--color-warning, #e0a905)' }}
        >
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-warning select-none">warning</span>
            <div className="text-left flex-1 min-w-0">
              <h4 className="text-xs font-bold text-on-background">
                {canvasIssues[0].type === 'format-mismatch' ? 'Format Mismatch Detected' :
                 canvasIssues[0].type === 'cycle-error' ? 'Dependency Cycle Detected' :
                 'Input Connection Required'}
              </h4>
              <p className="text-[10px] text-outline font-medium mt-0.5 leading-relaxed">
                {canvasIssues[0].message}
              </p>
            </div>
          </div>
          {canvasIssues[0].suggestedToolId && (
            <div className="flex items-center justify-end gap-2 mt-1 border-t border-outline-variant/40 pt-2">
              <button
                onClick={() => {
                  const { operations: nextOps, queue: nextQueue } = executeAutoHeal(operations, workspaceQueue, canvasIssues[0]);
                  pushHistoryState();
                  setOperations(nextOps);
                  setWorkspaceQueue(nextQueue);
                  showToast(`Auto-injected ${canvasIssues[0].suggestedToolName} converter card!`);
                }}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-warning text-black rounded-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[13px]">magic_button</span>
                Auto-Heal Connection
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {activeStudio && (
          <FocusStudioPortal
            studio={activeStudio}
            onCommit={handleStudioCommit}
            onCancel={() => setActiveStudio(null)}
          />
        )}
      </AnimatePresence>

      {previewFile && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4">
          <div className="absolute inset-0" onClick={() => setPreviewFile(null)} />
          <div className="relative w-[92vw] h-[90vh] bg-[#090b0f] rounded-3xl border border-white/10 overflow-hidden flex flex-col z-10 shadow-2xl">
            <div className="absolute top-3.5 right-4 z-50">
              <button 
                onClick={() => setPreviewFile(null)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-background transition cursor-pointer"
                title="Close Preview"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <DocumentViewer file={previewFile} />
            </div>
          </div>
        </div>,
        document.body
      )}

      <GuestLimitModal />
    </div>
  );
}
