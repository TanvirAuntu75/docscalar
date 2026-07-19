import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import useFileProcessor from '../../hooks/useFileProcessor';
import { editPdf } from '../../engines/pdf/editPdf';
import { saveFile } from '../../utils/db';
import { saveAs } from 'file-saver';
import { apiFetch, uploadFileSecure } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function EditPdf() {
  const {
    files,
    setFiles,
    processing,
    setProcessing,
    progress,
    setProgress,
    result,
    setResult,
    error,
    setError,
    reset
  } = useFileProcessor();

  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Backend state for high-fidelity PyMuPDF editor
  const [backendActive, setBackendActive] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  // Poller hook for asynchronous backend task monitoring
  const poller = useJobPoller(BACKEND_URL);

  // Available tools: 'pen', 'highlight', 'rectangle', 'circle', 'line', 'text', 'text-edit', 'eraser'
  const [activeTool, setActiveTool] = useState('pen'); 
  const [strokeColor, setStrokeColor] = useState('#EF4444'); // Red default
  const [thickness, setThickness] = useState(3); // Line thickness or Font size
  
  // Annotation states
  const [annotations, setAnnotations] = useState([]); // List of { id, type, pageIndex, points, xPercent, yPercent, text, color, thickness, size, shapeType, startPt, endPt }
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  // Extracted text layer states (Direct Text Editor)
  const [extractedTextLines, setExtractedTextLines] = useState([]); // List of { id, originalText, currentText, xPercent, yPercent, widthPercent, heightPercent, fontSize }
  const [loadingText, setLoadingText] = useState(false);

  // Refs for tracking shape drags without triggering React re-renders
  const dragStartRef = useRef(null);
  const dragEndRef = useRef(null);

  // Text placement state
  const [textPlacement, setTextPlacement] = useState(null); // { xPercent, yPercent }
  const [tempText, setTempText] = useState('');

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Check backend server availability on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
        }
      } catch (e) {
        setBackendActive(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    checkServer();
  }, []);

  // Monitor backend job status polling
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[0]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = `${originalName}_edited.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName
      });

      // Save to IndexedDB
      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'Edit PDF', blob);
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server document editing task failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files]);

  // Load PDF document
  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setActivePageIndex(0);
      setAnnotations([]);
      setExtractedTextLines([]);
      setTextPlacement(null);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setProcessing(true);
      setError(null);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setProcessing(false);
      } catch (err) {
        if (!isCancelled) {
          setProcessing(false);
          setError('Failed to parse PDF document. Verify it is not corrupted.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, setProcessing, setError]);

  // Extract page text content coordinates via PDF.js for Direct Text Editing
  useEffect(() => {
    if (!pdfDocument) {
      setExtractedTextLines([]);
      return;
    }

    const extractTextContent = async () => {
      setLoadingText(true);
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const lines = textContent.items
          .filter(item => item.str.trim().length > 0)
          .map((item, idx) => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            const tw = item.width;
            const th = item.height || 12;

            return {
              id: `text-${activePageIndex}-${idx}`,
              originalText: item.str,
              currentText: item.str,
              xPercent: tx / viewport.width,
              yPercent: (viewport.height - ty - th) / viewport.height,
              widthPercent: tw / viewport.width,
              heightPercent: th / viewport.height,
              fontSize: Math.abs(item.transform[3])
            };
          });

        setExtractedTextLines(lines);
      } catch (err) {
        console.error('Failed to extract PDF page text:', err);
      } finally {
        setLoadingText(false);
      }
    };

    extractTextContent();
  }, [pdfDocument, activePageIndex]);

  // Render active page
  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(activePageIndex + 1);
        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const viewport = page.getViewport({ scale: 1.0 });
        
        // Size both canvases identically
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Redraw annotations on top
        redrawOverlayAnnotations();

      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, activePageIndex, annotations]);

  // Redraw annotations on top of the overlay canvas
  const redrawOverlayAnnotations = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Redraw committed annotations
    const pageAnnos = annotations.filter(a => a.pageIndex === activePageIndex);
    pageAnnos.forEach(anno => {
      if (anno.type === 'pen' || anno.type === 'highlight') {
        const points = anno.points || [];
        if (points.length < 2) return;

        ctx.globalAlpha = anno.type === 'highlight' ? 0.4 : 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw Calligraphic stroke using pressure scales per segment
        for (let i = 0; i < points.length - 1; i++) {
          const pt1 = points[i];
          const pt2 = points[i + 1];
          const press1 = pt1.pressure ?? 0.5;
          const press2 = pt2.pressure ?? 0.5;
          const avgPressure = (press1 + press2) / 2;

          ctx.beginPath();
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.thickness * (anno.type === 'highlight' ? 1.0 : (0.3 + avgPressure * 1.4));
          ctx.moveTo(pt1.xPercent * overlay.width, pt1.yPercent * overlay.height);
          ctx.lineTo(pt2.xPercent * overlay.width, pt2.yPercent * overlay.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0; // Reset
      } else if (anno.type === 'shape') {
        ctx.beginPath();
        ctx.strokeStyle = anno.color;
        ctx.lineWidth = anno.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1.0;

        const startX = anno.startPt.xPercent * overlay.width;
        const startY = anno.startPt.yPercent * overlay.height;
        const endX = anno.endPt.xPercent * overlay.width;
        const endY = anno.endPt.yPercent * overlay.height;

        if (anno.shapeType === 'rectangle') {
          ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (anno.shapeType === 'circle') {
          const rx = Math.abs(endX - startX) / 2;
          const ry = Math.abs(endY - startY) / 2;
          const cx = Math.min(startX, endX) + rx;
          const cy = Math.min(startY, endY) + ry;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (anno.shapeType === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else if (anno.shapeType === 'arrow') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLength = Math.max(10, anno.thickness * 3);
          
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (anno.type === 'text') {
        ctx.fillStyle = anno.color;
        ctx.font = `bold ${anno.size}px sans-serif`;
        ctx.globalAlpha = 1.0;
        ctx.fillText(anno.text, anno.xPercent * overlay.width, anno.yPercent * overlay.height);
      }
    });
  };

  // Helper to calculate point-to-segment distance for line selections
  const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  };

  // Drawing Handlers
  const handleStartDraw = (e) => {
    if (activeTool === 'text' || activeTool === 'text-edit' || activeTool === 'eraser') return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pressure = e.pointerType === 'pen' ? (e.pressure ?? 0.5) : 0.5;
    const pt = {
      xPercent: x / rect.width,
      yPercent: y / rect.height,
      pressure
    };

    setIsDrawing(true);
    if (activeTool === 'pen' || activeTool === 'highlight') {
      setCurrentPathPoints([pt]);
    } else {
      dragStartRef.current = pt;
      dragEndRef.current = pt;
    }
  };

  const handleDraw = (e) => {
    if (!isDrawing) return;
    if (activeTool === 'text' || activeTool === 'text-edit' || activeTool === 'eraser') return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pressure = e.pointerType === 'pen' ? (e.pressure ?? 0.5) : 0.5;
    const pt = {
      xPercent: x / rect.width,
      yPercent: y / rect.height,
      pressure
    };

    const ctx = overlay.getContext('2d');

    if (activeTool === 'pen' || activeTool === 'highlight') {
      setCurrentPathPoints(prev => [...prev, pt]);

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = activeTool === 'highlight' ? 0.4 : 1.0;

      const lastPt = currentPathPoints[currentPathPoints.length - 1];
      if (lastPt) {
        const avgPressure = ((lastPt.pressure ?? 0.5) + pt.pressure) / 2;
        ctx.lineWidth = thickness * (activeTool === 'highlight' ? 1.0 : (0.3 + avgPressure * 1.4));
        ctx.moveTo(lastPt.xPercent * overlay.width, lastPt.yPercent * overlay.height);
        ctx.lineTo(pt.xPercent * overlay.width, pt.yPercent * overlay.height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    } else {
      // Shapes
      dragEndRef.current = pt;
      
      // Clear overlay and draw committed shapes
      redrawOverlayAnnotations();

      // Draw the shape preview
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;

      const startX = dragStartRef.current.xPercent * overlay.width;
      const startY = dragStartRef.current.yPercent * overlay.height;
      const endX = dragEndRef.current.xPercent * overlay.width;
      const endY = dragEndRef.current.yPercent * overlay.height;

      if (activeTool === 'rectangle') {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (activeTool === 'circle') {
        const rx = Math.abs(endX - startX) / 2;
        const ry = Math.abs(endY - startY) / 2;
        const cx = Math.min(startX, endX) + rx;
        const cy = Math.min(startY, endY) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = Math.max(10, thickness * 3);
        
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }

    if (e.cancelable) e.preventDefault();
  };

  const handleStopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pen' || activeTool === 'highlight') {
      if (currentPathPoints.length > 1) {
        setAnnotations(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 5),
            type: activeTool,
            pageIndex: activePageIndex,
            points: currentPathPoints,
            color: strokeColor,
            thickness
          }
        ]);
      }
    } else {
      // Shapes
      const start = dragStartRef.current;
      const end = dragEndRef.current;
      if (start && end && (Math.abs(start.xPercent - end.xPercent) > 0.005 || Math.abs(start.yPercent - end.yPercent) > 0.005)) {
        setAnnotations(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 5),
            type: 'shape',
            shapeType: activeTool, // 'rectangle', 'circle', 'line', 'arrow'
            pageIndex: activePageIndex,
            startPt: start,
            endPt: end,
            color: strokeColor,
            thickness
          }
        ]);
      }
      dragStartRef.current = null;
      dragEndRef.current = null;
    }
    setCurrentPathPoints([]);
  };

  // Click on canvas handler (Text Placement & Eraser checks)
  const handleCanvasClick = (e) => {
    if (activeTool === 'text-edit') return; // Handled directly by input overlay
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickPt = {
      xPercent: x / rect.width,
      yPercent: y / rect.height
    };

    if (activeTool === 'text') {
      setTextPlacement(clickPt);
      setTempText('');
    } else if (activeTool === 'eraser') {
      const threshold = 0.03; // click proximity tolerance
      
      const newAnnos = annotations.filter(anno => {
        if (anno.pageIndex !== activePageIndex) return true;

        if (anno.type === 'pen' || anno.type === 'highlight') {
          const points = anno.points || [];
          for (let i = 0; i < points.length; i++) {
            const dx = points[i].xPercent - clickPt.xPercent;
            const dy = points[i].yPercent - clickPt.yPercent;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threshold) return false;
          }
        } else if (anno.type === 'shape') {
          if (anno.shapeType === 'line' || anno.shapeType === 'arrow') {
            const d = pointToSegmentDistance(
              clickPt.xPercent, clickPt.yPercent,
              anno.startPt.xPercent, anno.startPt.yPercent,
              anno.endPt.xPercent, anno.endPt.yPercent
            );
            if (d < threshold) return false;
          } else if (anno.shapeType === 'rectangle') {
            const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
            const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
            const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
            const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);

            const nearLeft = Math.abs(clickPt.xPercent - minX) < threshold && clickPt.yPercent >= minY - threshold && clickPt.yPercent <= maxY + threshold;
            const nearRight = Math.abs(clickPt.xPercent - maxX) < threshold && clickPt.yPercent >= minY - threshold && clickPt.yPercent <= maxY + threshold;
            const nearTop = Math.abs(clickPt.yPercent - minY) < threshold && clickPt.xPercent >= minX - threshold && clickPt.xPercent <= maxX + threshold;
            const nearBottom = Math.abs(clickPt.yPercent - maxY) < threshold && clickPt.xPercent >= minX - threshold && clickPt.xPercent <= maxX + threshold;

            if (nearLeft || nearRight || nearTop || nearBottom) return false;
          } else if (anno.shapeType === 'circle') {
            const minX = Math.min(anno.startPt.xPercent, anno.endPt.xPercent);
            const maxX = Math.max(anno.startPt.xPercent, anno.endPt.xPercent);
            const minY = Math.min(anno.startPt.yPercent, anno.endPt.yPercent);
            const maxY = Math.max(anno.startPt.yPercent, anno.endPt.yPercent);
            
            const rx = (maxX - minX) / 2;
            const ry = (maxY - minY) / 2;
            const cx = minX + rx;
            const cy = minY + ry;

            const dx = clickPt.xPercent - cx;
            const dy = clickPt.yPercent - cy;
            const normalizedDist = (dx * dx) / (rx * rx || 0.0001) + (dy * dy) / (ry * ry || 0.0001);
            if (normalizedDist > 0.5 && normalizedDist < 1.5) return false;
          }
        } else if (anno.type === 'text') {
          const dx = anno.xPercent - clickPt.xPercent;
          const dy = anno.yPercent - clickPt.yPercent;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < threshold * 2.5) return false;
        }
        return true;
      });

      setAnnotations(newAnnos);
    }
  };

  const commitTextAnnotation = () => {
    if (!tempText.trim() || !textPlacement) {
      setTextPlacement(null);
      return;
    }

    setAnnotations(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 5),
        type: 'text',
        pageIndex: activePageIndex,
        xPercent: textPlacement.xPercent,
        yPercent: textPlacement.yPercent,
        text: tempText,
        color: strokeColor,
        size: thickness * 4 // Map scale: thin values scale up for font size
      }
    ]);
    setTextPlacement(null);
    setTempText('');
  };

  const clearPageAnnotations = () => {
    setAnnotations(prev => prev.filter(a => a.pageIndex !== activePageIndex));
    // Reset edited text lines
    setExtractedTextLines(prev => prev.map(l => ({ ...l, currentText: l.originalText })));
    setTextPlacement(null);
  };

  // Compile annotated PDF (Backend PyMuPDF if active, Client fallback to pdf-lib)
  const handleSave = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Map modified extracted text lines to annotations list
    const textEditAnnos = extractedTextLines
      .filter(line => line.currentText !== line.originalText)
      .map(line => ({
        id: line.id,
        type: 'text-edit',
        pageIndex: activePageIndex,
        originalText: line.originalText,
        newText: line.currentText,
        xPercent: line.xPercent,
        yPercent: line.yPercent,
        widthPercent: line.widthPercent,
        heightPercent: line.heightPercent,
        fontSize: line.fontSize,
        color: strokeColor // Paint edited text in selected color!
      }));

    const allAnnotations = [...annotations, ...textEditAnnos];

    if (backendActive) {
      // ─── HIGH-FIDELITY PYMUPDF SERVER PIPELINE ───
      try {
        setProgress(15);
        // Step 1: Upload source document
        const uploadData = await uploadFileSecure(BACKEND_URL, files[0], setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        setProgress(40);

        // Step 2: Queue edit PDF conversion job
        const formData = new FormData();
        formData.append('file_id', uploadData.file_id);
        formData.append('filename', uploadData.filename);
        formData.append('annotations_json', JSON.stringify(allAnnotations));

        const res = await apiFetch(`${BACKEND_URL}/api/edit-pdf`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Failed to queue edit task on server.');
        }

        const data = await res.json();
        // Step 3: Trigger the poller
        poller.startPolling(data.job_id);

      } catch (err) {
        setProcessing(false);
        setError(err.message || 'Server editing failed. Please retry.');
      }
    } else {
      // ─── Client Side CLIENT FALLBACK (pdf-lib) ───
      try {
        const outputBlob = await editPdf(files[0], allAnnotations, setProgress);
        const finalName = files[0].name.replace(/\.[^.]+$/, '') + '_edited.pdf';
        
        // Wrap local blob to match output state
        const localUrl = URL.createObjectURL(outputBlob);
        setResult({
          blob: outputBlob,
          downloadUrl: localUrl,
          name: finalName
        });

        // Save to IndexedDB workspace cache
        try {
          await saveFile(finalName, outputBlob.size, 'application/pdf', 'Edit PDF', outputBlob);
        } catch (dbErr) {
          console.error('Failed to save edited PDF locally:', dbErr);
        }

      } catch (err) {
        setError(err.message || 'Annotation injection failed.');
      } finally {
        setProcessing(false);
      }
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    } else {
      try {
        const res = await fetch(result.downloadUrl);
        const blob = await res.blob();
        saveAs(blob, result.name);
      } catch (e) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.name;
        link.click();
      }
    }
  };

  const handleReset = () => {
    reset();
    setPdfDocument(null);
    setTotalPages(0);
    setActivePageIndex(0);
    setAnnotations([]);
    setExtractedTextLines([]);
    setTextPlacement(null);
    setActiveTool('pen');
  };

  return (
    <ToolPageLayout
      toolId="edit-pdf"
      title="Edit PDF Document"
      description="Draw smooth pen strokes, highlight lines, place visual shapes, or directly edit text inline visually"
      files={files}
      onFileSwitch={(idx) => {
        setFiles(prev => {
          if (idx < 0 || idx >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return next;
        });
      }}>
      <SEOHead 
        title="Edit PDF Online Free — Annotate & Direct Edit PDF | DocForge" 
        description="Add smooth handwritten curves, highlight lines, vector shapes, and rewrite existing PDF text inline. 100% private Client Side annotations editor."
      />

      {!result ? (
        <>
          <FileDropzone accept=".pdf" multiple={false} files={files} setFiles={setFiles} />

          {files.length > 0 && !processing && (
            <div className="options-panel animate-[fadeIn_0.22s_ease-out]" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              marginTop: '1.5rem'
            }}>
              
              {/* Responsive Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'window.innerWidth > 992 ? "1fr 1.2fr" : "1fr"',
                gap: '2rem'
              }} className="lg:grid-cols-2">

                {/* Column 1: Annotation Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title">Editing Toolbar</div>

                  {/* Active Tool Selector Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Choose Action Mode</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                      <button
                        onClick={() => { setActiveTool('text-edit'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'text-edit' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        ✏️ Inline Text Editor
                      </button>
                      <button
                        onClick={() => { setActiveTool('pen'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'pen' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        🖋️ Pen Brush
                      </button>
                      <button
                        onClick={() => { setActiveTool('highlight'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'highlight' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        💡 Highlighter
                      </button>
                      <button
                        onClick={() => { setActiveTool('rectangle'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'rectangle' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        🟥 Rectangle
                      </button>
                      <button
                        onClick={() => { setActiveTool('circle'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'circle' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        ⭕ Circle
                      </button>
                      <button
                        onClick={() => { setActiveTool('line'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'line' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        ➖ Straight Line
                      </button>
                      <button
                        onClick={() => { setActiveTool('arrow'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'arrow' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        ↗️ Vector Arrow
                      </button>
                      <button
                        onClick={() => setActiveTool('text')}
                        className={`btn ${activeTool === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.75rem', gridColumn: 'span 2' }}
                      >
                        🔤 Add New Text
                      </button>
                    </div>
                    <div style={{ marginTop: '0.2rem' }}>
                      <button
                        onClick={() => { setActiveTool('eraser'); setTextPlacement(null); }}
                        className={`btn ${activeTool === 'eraser' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ width: '100%', padding: '0.55rem', fontSize: '0.75rem' }}
                      >
                        🧽 Click-to-Erase Drawing
                      </button>
                    </div>
                  </div>

                  {/* Color Palette Selector */}
                  {activeTool !== 'eraser' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Color Preset</label>
                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        {['#EF4444', '#000000', '#2563EB', '#10B981', '#F59E0B', '#EAB308'].map(colorCode => (
                          <button
                            key={colorCode}
                            onClick={() => setStrokeColor(colorCode)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: colorCode,
                              border: strokeColor === colorCode ? '2px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              transition: 'scale 0.1s'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thickness / Font Size Slider */}
                  {activeTool !== 'eraser' && activeTool !== 'text-edit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {activeTool === 'text' ? 'Text Size scale' : 'Stroke Thickness'}
                        </span>
                        <span>{thickness}px</span>
                      </div>
                      <input
                        type="range"
                        min={activeTool === 'highlight' ? '6' : '1'}
                        max={activeTool === 'highlight' ? '24' : '12'}
                        value={thickness}
                        onChange={(e) => setThickness(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                      />
                    </div>
                  )}

                  {/* Visual Preview Indicator */}
                  {activeTool !== 'eraser' && activeTool !== 'text-edit' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'flex-start', fontWeight: '600' }}>Brush & Shape Preview</div>
                      {activeTool === 'text' ? (
                        <span style={{ color: strokeColor, fontSize: `${Math.max(12, thickness * 2)}px`, fontWeight: 'bold' }}>Text Label</span>
                      ) : (
                        <div style={{
                          width: '80%',
                          height: `${activeTool === 'highlight' ? Math.max(4, thickness * 0.5) : Math.max(1, thickness * 0.5)}px`,
                          background: strokeColor,
                          opacity: activeTool === 'highlight' ? 0.45 : 1.0,
                          borderRadius: '4px',
                          margin: '0.35rem 0'
                        }} />
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={clearPageAnnotations} style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}>
                      🧹 Clear Current Page
                    </button>
                  </div>

                  {/* Mode details */}
                  <div style={{
                    background: backendActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: backendActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem',
                    color: backendActive ? '#047857' : '#b45309'
                  }}>
                    {backendActive ? (
                      <span>🟢 <strong>PyMuPDF Engine Active:</strong> Inline edits will preserve original fonts & text layout sizing dynamically on server compilation.</span>
                    ) : (
                      <span>⚠️ <strong>Local Fallback Active:</strong> Server not detected. Edits will compile Client Side with base fallback fonts. Start backend to enable font-preservation.</span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', lineHeight: '1.4' }}>
                    📝 <strong>Workspace Guide:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: '0', listStyleType: 'disc' }}>
                      {activeTool === 'text-edit' ? (
                        <li>Click directly inside any dashed text box on the PDF page and rewrite/edit the text inline.</li>
                      ) : activeTool === 'pen' || activeTool === 'highlight' ? (
                        <li>Click/drag mouse directly on the page canvas to draw smooth paths.</li>
                      ) : activeTool === 'text' ? (
                        <li>Click on the canvas location to type and place new text labels. Press enter to save.</li>
                      ) : activeTool === 'eraser' ? (
                        <li>Click directly on any stroke, shape, or placed text to erase it.</li>
                      ) : (
                        <li>Click and drag on the canvas to draw vector shapes.</li>
                      )}
                      <li>Direct inline edits are compiled using standard PDF vector replacements.</li>
                    </ul>
                  </div>
                </div>

                {/* Column 2: Canvas Workspace */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="options-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Sandbox Workspace</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Page {activePageIndex + 1} / {totalPages}
                    </span>
                  </div>

                  {/* Synchronized pagination list */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.35rem',
                      overflowX: 'auto',
                      paddingBottom: '0.5rem',
                      whiteSpace: 'nowrap'
                    }} className="no-scrollbar">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setActivePageIndex(idx); setTextPlacement(null); }}
                          className={`btn ${activePageIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            minWidth: '40px',
                            border: activePageIndex === idx ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)'
                          }}
                        >
                          Page {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive editor sandbox */}
                  {loadingText ? (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '360px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', gap: '0.5rem' }}>
                      <div className="loading-spinner" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extracting page text coordinates...</span>
                    </div>
                  ) : (
                    <div 
                      ref={containerRef}
                      style={{
                        position: 'relative',
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '1.5rem',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                        
                        {/* PDF render layer */}
                        <canvas
                          ref={pdfCanvasRef}
                          style={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: '440px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            borderRadius: '4px',
                            pointerEvents: 'none'
                          }}
                        />

                        {/* Transparent draw/overlay interaction layer */}
                        <canvas
                          ref={overlayCanvasRef}
                          onPointerDown={handleStartDraw}
                          onPointerMove={handleDraw}
                          onPointerUp={handleStopDraw}
                          onPointerLeave={handleStopDraw}
                          onClick={handleCanvasClick}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: activeTool === 'eraser' ? 'pointer' : activeTool === 'text' ? 'text' : activeTool === 'text-edit' ? 'default' : 'crosshair',
                            zIndex: 15,
                            pointerEvents: activeTool === 'text-edit' ? 'none' : 'auto'
                          }}
                        />

                        {/* Direct Inline Text Editor Input fields Overlay */}
                        {activeTool === 'text-edit' && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 20,
                            pointerEvents: 'none'
                          }}>
                            {extractedTextLines.map(line => {
                              const isModified = line.currentText !== line.originalText;
                              return (
                                <input
                                  key={line.id}
                                  type="text"
                                  value={line.currentText}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setExtractedTextLines(prev => prev.map(l => l.id === line.id ? { ...l, currentText: val } : l));
                                  }}
                                  style={{
                                    position: 'absolute',
                                    left: `${line.xPercent * 100}%`,
                                    top: `${line.yPercent * 100}%`,
                                    width: `${line.widthPercent * 100}%`,
                                    height: `${line.heightPercent * 100}%`,
                                    background: isModified ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                                    border: isModified ? '1.5px solid var(--color-primary)' : '1px dashed rgba(59, 130, 246, 0.3)',
                                    color: isModified ? strokeColor : '#000000',
                                    fontWeight: '600',
                                    fontSize: '7.5px',
                                    fontFamily: 'sans-serif',
                                    outline: 'none',
                                    padding: 0,
                                    margin: 0,
                                    boxSizing: 'border-box',
                                    pointerEvents: 'auto',
                                    cursor: 'text'
                                  }}
                                  title={`Original: "${line.originalText}"`}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Inline text callout editor */}
                        {textPlacement && (
                          <div style={{
                            position: 'absolute',
                            left: `${textPlacement.xPercent * 100}%`,
                            top: `${textPlacement.yPercent * 100}%`,
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            display: 'flex',
                            gap: '0.25rem',
                            background: '#FFF',
                            border: '1.5px solid var(--color-primary)',
                            borderRadius: '4px',
                            padding: '2px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                          }}>
                            <input
                              type="text"
                              value={tempText}
                              onChange={(e) => setTempText(e.target.value)}
                              placeholder="Type here..."
                              autoFocus
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitTextAnnotation();
                                  else if (e.key === 'Escape') setTextPlacement(null);
                              }}
                              style={{
                                border: 'none',
                                fontSize: '11px',
                                padding: '2px 4px',
                                outline: 'none',
                                color: '#000',
                                width: '110px'
                              }}
                            />
                            <button
                              onClick={commitTextAnnotation}
                              style={{ fontSize: '10px', padding: '1px 5px', color: '#white', background: 'var(--color-primary)', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              ✓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {processing && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="progress-status">Injecting vector modifications into PDF streams... {progress}%</p>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}

          <div className="action-bar">
            <button 
              className="btn btn-primary btn-lg flex items-center justify-center gap-2" 
              onClick={handleSave} 
              disabled={!files.length || processing}
            >
              {processing && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{processing ? 'Injecting...' : 'Save & Compile PDF'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="result-area animate-[fadeIn_0.22s_ease-out]">
          <div className="result-icon select-none">
            <span className="material-symbols-outlined text-[48px] text-green-500 fill select-none">check_circle</span>
          </div>
          <div className="result-title">Annotations Injected!</div>
          <div className="result-info">
            Your document has been compiled and saved as <strong>{result.name}</strong>.
          </div>

          <div className="action-bar">
            <button className="btn btn-success btn-lg flex items-center justify-center gap-2" onClick={downloadFile}>
              <span className="material-symbols-outlined text-[20px] select-none">download</span>
              <span>Download PDF</span>
            </button>
            <button className="btn btn-secondary flex items-center justify-center gap-1.5" onClick={handleReset}>
              <span className="material-symbols-outlined text-[16px] select-none">restart_alt</span>
              <span>Reset Workspace</span>
            </button>
          </div>
        </div>
      )}

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
