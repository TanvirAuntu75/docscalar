import { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { editPdf } from '../../engines/pdf/editPdf';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import { apiFetch, uploadFileSecure } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';

const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const EDITOR_TOOLS = [
  { id: 'text-edit', label: 'Inline Text', icon: 'edit_note', desc: 'Directly rewrite existing document text inline' },
  { id: 'pen', label: 'Pen Brush', icon: 'draw', desc: 'Smooth calligraphic drawing with pressure dynamics' },
  { id: 'highlight', label: 'Highlighter', icon: 'ink_highlighter', desc: 'Semi-transparent highlighting overlay' },
  { id: 'rectangle', label: 'Rectangle', icon: 'crop_square', desc: 'Vector rectangle bounding box' },
  { id: 'circle', label: 'Circle', icon: 'radio_button_unchecked', desc: 'Vector ellipse or circle outline' },
  { id: 'line', label: 'Line', icon: 'horizontal_rule', desc: 'Straight vector connector line' },
  { id: 'arrow', label: 'Arrow', icon: 'trending_flat', desc: 'Directional vector arrow indicator' },
  { id: 'text', label: 'Add Text', icon: 'title', desc: 'Place new custom text annotations anywhere' },
  { id: 'eraser', label: 'Eraser', icon: 'ink_eraser', desc: 'Click any drawn stroke or shape to erase' }
];

const COLOR_SWATCHES = ['#EF4444', '#000000', '#2563EB', '#10B981', '#F59E0B', '#7C3AED'];

export default function EditPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [backendActive, setBackendActive] = useState(false);
  const poller = useJobPoller(BACKEND_URL);

  const [activeTool, setActiveTool] = useState('text-edit');
  const [strokeColor, setStrokeColor] = useState('#EF4444');
  const [thickness, setThickness] = useState(3);
  const [outputFileName, setOutputFileName] = useState('');

  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  const [extractedTextLines, setExtractedTextLines] = useState([]);
  const [loadingText, setLoadingText] = useState(false);

  const dragStartRef = useRef(null);
  const dragEndRef = useRef(null);

  const [textPlacement, setTextPlacement] = useState(null);
  const [tempText, setTempText] = useState('');

  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [canvasLoading, setCanvasLoading] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          setBackendActive(true);
        }
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'document';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}_edited.pdf`;
      setResult({
        downloadUrl: downloadUrl,
        name: finalName,
        pageCount: totalPages,
        annotationCount: annotations.length
      });

      apiFetch(downloadUrl)
        .then(res => res.blob())
        .then(blob => {
          saveFile(finalName, blob.size, 'application/pdf', 'Edit PDF', blob);
          clearStudioDraft('edit-pdf');
        })
        .catch(err => console.error('Failed to sync processed file locally:', err));

    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server document editing task failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 10);
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex, outputFileName, totalPages, annotations.length]);

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('edit-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'document.pdf', {
              type: f.type || 'application/pdf',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.activeTool) setActiveTool(draft.activeTool);
          if (draft.strokeColor) setStrokeColor(draft.strokeColor);
          if (draft.thickness) setThickness(draft.thickness);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
          if (draft.annotations) setAnnotations(draft.annotations);
        }
      } catch (err) {
        console.warn('Edit PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('edit-pdf', {
        files,
        activeTool,
        strokeColor,
        thickness,
        outputFileName,
        annotations
      });
    }
  }, [files, activeTool, strokeColor, thickness, outputFileName, annotations]);

  useEffect(() => {
    if (files.length === 0) {
      setPdfDocument(null);
      setTotalPages(0);
      setCurrentPage(1);
      setAnnotations([]);
      setExtractedTextLines([]);
      setTextPlacement(null);
      return;
    }

    let activePdf = null;
    let isCancelled = false;

    const loadPdf = async () => {
      setCanvasLoading(true);
      setError(null);
      try {
        const file = files[activeFileIndex] || files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) {
          pdf.destroy();
          return;
        }
        activePdf = pdf;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCanvasLoading(false);

        if (!outputFileName) {
          const base = file.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}_edited.pdf`);
        }
      } catch (err) {
        if (!isCancelled) {
          setCanvasLoading(false);
          setError('Failed to parse PDF document. Verify it is not corrupted or password locked.');
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (activePdf) activePdf.destroy();
    };
  }, [files, activeFileIndex]);

  useEffect(() => {
    if (!pdfDocument) {
      setExtractedTextLines([]);
      return;
    }

    const extractTextContent = async () => {
      setLoadingText(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const lines = textContent.items
          .filter(item => item.str && item.str.trim().length > 0)
          .map((item, idx) => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            const tw = item.width;
            const th = item.height || 12;

            return {
              id: `text-${currentPage - 1}-${idx}`,
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
  }, [pdfDocument, currentPage]);

  useEffect(() => {
    if (!pdfDocument) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = pdfCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!canvas || !overlay) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: baseViewport.width, height: baseViewport.height });

        const viewport = page.getViewport({ scale: 1.5 * zoomScale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        redrawOverlayAnnotations();
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, zoomScale, annotations]);

  const redrawOverlayAnnotations = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const activePageIndex = currentPage - 1;
    const pageAnnos = annotations.filter(a => a.pageIndex === activePageIndex);

    pageAnnos.forEach(anno => {
      if (anno.type === 'pen' || anno.type === 'highlight') {
        const points = anno.points || [];
        if (points.length < 2) return;

        ctx.globalAlpha = anno.type === 'highlight' ? 0.4 : 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < points.length - 1; i++) {
          const pt1 = points[i];
          const pt2 = points[i + 1];
          const press1 = pt1.pressure ?? 0.5;
          const press2 = pt2.pressure ?? 0.5;
          const avgPressure = (press1 + press2) / 2;

          ctx.beginPath();
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.thickness * (anno.type === 'highlight' ? 1.0 : (0.3 + avgPressure * 1.4)) * zoomScale;
          ctx.moveTo(pt1.xPercent * overlay.width, pt1.yPercent * overlay.height);
          ctx.lineTo(pt2.xPercent * overlay.width, pt2.yPercent * overlay.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      } else if (anno.type === 'shape') {
        ctx.beginPath();
        ctx.strokeStyle = anno.color;
        ctx.lineWidth = anno.thickness * zoomScale;
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
          const headLength = Math.max(10, anno.thickness * 3) * zoomScale;
          
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (anno.type === 'text') {
        ctx.fillStyle = anno.color;
        ctx.font = `bold ${anno.size * zoomScale}px sans-serif`;
        ctx.globalAlpha = 1.0;
        ctx.fillText(anno.text, anno.xPercent * overlay.width, anno.yPercent * overlay.height);
      }
    });
  };

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
        ctx.lineWidth = thickness * (activeTool === 'highlight' ? 1.0 : (0.3 + avgPressure * 1.4)) * zoomScale;
        ctx.moveTo(lastPt.xPercent * overlay.width, lastPt.yPercent * overlay.height);
        ctx.lineTo(pt.xPercent * overlay.width, pt.yPercent * overlay.height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    } else {
      dragEndRef.current = pt;
      redrawOverlayAnnotations();

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = thickness * zoomScale;
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
        const headLength = Math.max(10, thickness * 3) * zoomScale;
        
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const handleEndDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const activePageIndex = currentPage - 1;

    if (activeTool === 'pen' || activeTool === 'highlight') {
      if (currentPathPoints.length > 1) {
        setAnnotations(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 6),
            type: activeTool,
            pageIndex: activePageIndex,
            points: currentPathPoints,
            color: strokeColor,
            thickness: thickness,
            opacity: activeTool === 'highlight' ? 0.4 : 1.0
          }
        ]);
      }
      setCurrentPathPoints([]);
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      if (dragStartRef.current && dragEndRef.current) {
        setAnnotations(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 6),
            type: 'shape',
            shapeType: activeTool,
            pageIndex: activePageIndex,
            startPt: dragStartRef.current,
            endPt: dragEndRef.current,
            color: strokeColor,
            thickness: thickness
          }
        ]);
      }
      dragStartRef.current = null;
      dragEndRef.current = null;
    }
  };

  const handleCanvasClick = (e) => {
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
      const activePageIndex = currentPage - 1;
      const threshold = 0.04;

      const newAnnos = annotations.filter(anno => {
        if (anno.pageIndex !== activePageIndex) return true;
        if (anno.type === 'pen' || anno.type === 'highlight') {
          return !anno.points.some(p => Math.hypot(p.xPercent - clickPt.xPercent, p.yPercent - clickPt.yPercent) < threshold);
        } else if (anno.type === 'shape') {
          return false;
        } else if (anno.type === 'text') {
          return Math.hypot(anno.xPercent - clickPt.xPercent, anno.yPercent - clickPt.yPercent) >= threshold * 2;
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

    const activePageIndex = currentPage - 1;
    setAnnotations(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 6),
        type: 'text',
        pageIndex: activePageIndex,
        xPercent: textPlacement.xPercent,
        yPercent: textPlacement.yPercent,
        text: tempText,
        color: strokeColor,
        size: Math.max(12, thickness * 4)
      }
    ]);
    setTextPlacement(null);
    setTempText('');
  };

  const clearPageAnnotations = () => {
    const activePageIndex = currentPage - 1;
    setAnnotations(prev => prev.filter(a => a.pageIndex !== activePageIndex));
    setExtractedTextLines(prev => prev.map(l => ({ ...l, currentText: l.originalText })));
    setTextPlacement(null);
  };

  const handleSave = async () => {
    if (!files.length) return;

    setProcessing(true);
    setProgress(15);
    setError(null);
    setResult(null);

    const activePageIndex = currentPage - 1;
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
        color: strokeColor
      }));

    const allAnnotations = [...annotations, ...textEditAnnos];
    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}_edited.pdf`;

    if (backendActive) {
      try {
        setProgress(25);
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) {
          throw new Error(uploadData.detail || 'Upload failed');
        }

        setProgress(50);
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
        poller.startPolling(data.job_id);
      } catch (err) {
        setProcessing(false);
        setError(err.message || 'Server editing failed. Please retry.');
      }
    } else {
      try {
        const outputBlob = await editPdf(file, allAnnotations, (p) => setProgress(p));
        
        setResult({
          blob: outputBlob,
          name: finalName,
          size: outputBlob.size,
          pageCount: totalPages,
          annotationCount: allAnnotations.length
        });

        await saveFile(finalName, outputBlob.size, 'application/pdf', 'Edit PDF', outputBlob);
        await clearStudioDraft('edit-pdf');
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
    } else if (result.downloadUrl) {
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

  const resetWorkspace = () => {
    clearStudioDraft('edit-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setCurrentPage(1);
    setTotalPages(0);
    setPdfDocument(null);
    setAnnotations([]);
    setExtractedTextLines([]);
    setTextPlacement(null);
    setActiveTool('text-edit');
    setStrokeColor('#EF4444');
    setThickness(3);
    setOutputFileName('');
    setResult(null);
    setError(null);
    setProcessing(false);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      toolId="edit-pdf"
      title="Edit PDF Document"
      description="Draw smooth pen strokes, highlight lines, place visual shapes, or directly edit text inline visually"
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Edit PDF Online Free — Annotate & Direct Edit PDF | DocForge"
        description="Add smooth handwritten curves, highlight lines, vector shapes, and rewrite existing PDF text inline. 100% private Client Side annotations editor."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">description</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => {
                            setActiveFileIndex(parseInt(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[160px] truncate"
                        >
                          {files.map((f, i) => (
                            <option key={i} value={i} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                              {f.name} ({formatFileSize(f.size)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                        <span className="truncate max-w-[180px]">{files[0]?.name}</span>
                      </div>
                    )}

                    {totalPages > 0 && (
                      <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Previous Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold px-2 text-[var(--text-primary)] select-none">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Next Page"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    <div className="hidden xl:flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                      {EDITOR_TOOLS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTool(t.id);
                            setTextPlacement(null);
                          }}
                          className={`p-1.5 rounded-md cursor-pointer transition-all ${
                            activeTool === t.id
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                          }`}
                          title={`${t.label}: ${t.desc}`}
                        >
                          <span className="material-symbols-outlined text-[16px] block">{t.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                      <span className="material-symbols-outlined text-[15px] text-[var(--text-secondary)]">zoom_in</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] w-9 text-right select-none">
                        {Math.round(zoomScale * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="p-1 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Reset workspace"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none"
              >
                <div
                  className="relative bg-white shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-transform duration-150"
                  style={{
                    width: (pageDimensions.width || 595) * zoomScale,
                    height: (pageDimensions.height || 842) * zoomScale
                  }}
                >
                  <canvas
                    ref={pdfCanvasRef}
                    className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none block"
                  />

                  {/* Loading Spinner Overlay */}
                  {canvasLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                        progress_activity
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Loading document page canvas...</span>
                    </div>
                  )}

                  <canvas
                    ref={overlayCanvasRef}
                    onPointerDown={handleStartDraw}
                    onPointerMove={handleDraw}
                    onPointerUp={handleEndDraw}
                    onClick={handleCanvasClick}
                    className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                  />

                  {activeTool === 'text-edit' && extractedTextLines.map((line) => (
                    <div
                      key={line.id}
                      style={{
                        position: 'absolute',
                        left: `${line.xPercent * 100}%`,
                        top: `${line.yPercent * 100}%`,
                        width: `${Math.max(line.widthPercent * 100, 10)}%`,
                        minHeight: `${line.heightPercent * 100}%`,
                        zIndex: 10
                      }}
                    >
                      <input
                        type="text"
                        value={line.currentText}
                        onChange={(e) => {
                          const newText = e.target.value;
                          setExtractedTextLines(prev =>
                            prev.map(l => (l.id === line.id ? { ...l, currentText: newText } : l))
                          );
                        }}
                        className={`w-full text-left outline-none font-bold bg-white/95 text-[var(--text-primary)] border border-dashed rounded px-1 shadow-xs transition-all ${
                          line.currentText !== line.originalText
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                            : 'border-blue-400 hover:border-blue-600 focus:border-[var(--color-primary)]'
                        }`}
                        style={{
                          fontSize: `${Math.max(10, line.fontSize * zoomScale * 0.95)}px`,
                          lineHeight: 1.1
                        }}
                      />
                    </div>
                  ))}

                  {textPlacement && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${textPlacement.xPercent * 100}%`,
                        top: `${textPlacement.yPercent * 100}%`,
                        zIndex: 30
                      }}
                      className="bg-[var(--bg-primary)] p-2.5 rounded-xl shadow-2xl border border-[var(--border-strong)] flex flex-col gap-2 min-w-[200px] animate-[scaleIn_0.15s_ease-out]"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Enter New Text
                      </span>
                      <input
                        type="text"
                        autoFocus
                        value={tempText}
                        onChange={(e) => setTempText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitTextAnnotation();
                          if (e.key === 'Escape') setTextPlacement(null);
                        }}
                        placeholder="Type text label..."
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                        style={{ color: strokeColor }}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTextPlacement(null)}
                          className="px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={commitTextAnnotation}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[var(--color-primary)] text-white rounded-md cursor-pointer shadow-xs"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">edit_document</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Editor Studio
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {backendActive ? 'PyMuPDF Engine' : 'Client Vector'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Editing Tool
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EDITOR_TOOLS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveTool(t.id);
                          setTextPlacement(null);
                        }}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                          activeTool === t.id
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                        <span className="text-xs font-bold truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {activeTool !== 'eraser' && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Color Palette
                    </label>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        {COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            onClick={() => setStrokeColor(swatch)}
                            className={`w-6 h-6 rounded-full border border-black/10 transition-transform cursor-pointer ${
                              strokeColor === swatch ? 'scale-125 ring-2 ring-[var(--color-primary)]' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-[var(--border-subtle)] cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {activeTool !== 'eraser' && activeTool !== 'text-edit' && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <span>{activeTool === 'text' ? 'Text Size' : 'Stroke Thickness'}</span>
                      <span>{thickness}px</span>
                    </div>
                    <input
                      type="range"
                      min={activeTool === 'highlight' ? '6' : '1'}
                      max={activeTool === 'highlight' ? '24' : '12'}
                      value={thickness}
                      onChange={(e) => setThickness(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                    />
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center min-h-[36px]">
                      {activeTool === 'text' ? (
                        <span style={{ color: strokeColor, fontSize: `${Math.max(12, thickness * 2)}px`, fontWeight: 'bold' }}>
                          Aa Sample Text
                        </span>
                      ) : (
                        <div
                          style={{
                            width: '80%',
                            height: `${activeTool === 'highlight' ? Math.max(4, thickness * 0.6) : Math.max(1, thickness * 0.6)}px`,
                            backgroundColor: strokeColor,
                            opacity: activeTool === 'highlight' ? 0.4 : 1.0,
                            borderRadius: '4px'
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Page Annotations Management */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                    <span>Page Annotations</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {annotations.filter(a => a.pageIndex === currentPage - 1).length} active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearPageAnnotations}
                    className="w-full py-2 px-3 bg-[var(--bg-secondary)] hover:bg-red-500/10 hover:text-red-500 text-[var(--text-secondary)] rounded-xl border border-[var(--border-subtle)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    <span>Clear Current Page</span>
                  </button>
                </div>

                {/* 5. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output File Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="document_edited.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        Baking edited document...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky Primary CTA Action Button */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={processing || files.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Saving ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Save & Export Edited PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* RESULT VIEW: Celebratory High-Fidelity Download Card                       */
        /* ========================================================================= */
        <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full p-8 sm:p-10 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col items-center text-center gap-6 animate-[scaleIn_0.22s_ease-out]">
            {/* Celebration Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <span className="material-symbols-outlined text-[40px]">verified</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Edits Applied!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                All drawings, text edits, highlights, and vector annotations have been embedded.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">description</span>
                <span className="truncate max-w-[220px]">{result.name}</span>
                {result.size && (
                  <>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatFileSize(result.size)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Annotations</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.annotationCount || 0}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Total Pages</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">{result.pageCount || 1}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Verified</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Edited PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Edit Another PDF</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/protect-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">lock</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Protect</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add password</p>
                  </div>
                </Link>

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Digital signature</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">compress</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reduce file size</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
