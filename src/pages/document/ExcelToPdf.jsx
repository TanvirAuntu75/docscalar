import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { excelToPdf } from '../../engines/document/excelToPdf';
import { apiFetch, uploadFileSecure, BACKEND_URL } from '../../utils/api';
import { useJobPoller } from '../../hooks/useJobPoller';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  Table,
  Sparkles,
  Download,
  Cpu,
  Server,
  FileCheck,
  Layout,
  Grid
} from 'lucide-react';

export default function ExcelToPdf() {
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Document & Preview State
  const [workbookData, setWorkbookData] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [activeSheetRows, setActiveSheetRows] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Conversion Configuration State
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'server'
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [gridlines, setGridlines] = useState(true);
  const [outputFileName, setOutputFileName] = useState('');

  // Processing & Poller
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [backendActive, setBackendActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const poller = useJobPoller(BACKEND_URL);

  // 1. Check Server Availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/meta/conversions`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) setBackendActive(true);
      } catch (e) {
        setBackendActive(false);
      }
    };
    checkServer();
  }, []);

  // 2. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('excel-to-pdf');
        if (draft && draft.files && draft.files.length > 0 && isMounted) {
          const restoredFiles = draft.files.map((f) => {
            if (f instanceof File) return f;
            return new File([f.blob || f], f.name || 'spreadsheet.xlsx', {
              type: f.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              lastModified: f.lastModified || Date.now()
            });
          });
          setFiles(restoredFiles);
          if (draft.engineMode) setEngineMode(draft.engineMode);
          if (draft.pageSize) setPageSize(draft.pageSize);
          if (draft.orientation) setOrientation(draft.orientation);
          if (draft.gridlines !== undefined) setGridlines(draft.gridlines);
          if (draft.outputFileName) setOutputFileName(draft.outputFileName);
        }
      } catch (err) {
        console.warn('Excel to PDF draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0) {
      saveStudioDraft('excel-to-pdf', {
        files,
        engineMode,
        pageSize,
        orientation,
        gridlines,
        outputFileName
      });
    }
  }, [files, engineMode, pageSize, orientation, gridlines, outputFileName]);

  // 4. Parse Excel Workbook for Live Grid Preview
  useEffect(() => {
    if (files.length === 0) {
      setWorkbookData(null);
      setSheetNames([]);
      setActiveSheetRows([]);
      return;
    }

    const currentFile = files[activeFileIndex] || files[0];
    let isMounted = true;

    const parseWorkbook = async () => {
      setDocLoading(true);
      setError(null);
      try {
        const arrayBuffer = await currentFile.arrayBuffer();
        if (!isMounted) return;

        const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        if (!isMounted) return;

        setWorkbookData(wb);
        const names = wb.SheetNames || [];
        setSheetNames(names);
        setActiveSheetIndex(0);

        if (names.length > 0) {
          const firstSheet = wb.Sheets[names[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          setActiveSheetRows(rows.slice(0, 100)); // preview first 100 rows
        }

        if (!outputFileName) {
          const base = currentFile.name.replace(/\.[^.]+$/, '');
          setOutputFileName(`${base}.pdf`);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
        }
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };

    parseWorkbook();

    return () => {
      isMounted = false;
    };
  }, [files, activeFileIndex]);

  // 5. Update Sheet Preview when Active Sheet Changes
  useEffect(() => {
    if (!workbookData || sheetNames.length === 0) return;
    const sheetName = sheetNames[activeSheetIndex] || sheetNames[0];
    const sheet = workbookData.Sheets[sheetName];
    if (sheet) {
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      setActiveSheetRows(rows.slice(0, 100));
    }
  }, [activeSheetIndex, workbookData, sheetNames]);

  // 6. Monitor Backend Poller (Server Mode)
  useEffect(() => {
    if (poller.status === 'finished' && poller.result) {
      setProcessing(false);
      const originalName = files[activeFileIndex]?.name.replace(/\.[^.]+$/, '') || 'spreadsheet';
      const downloadUrl = poller.result.downloadUrl;
      const finalName = outputFileName || `${originalName}.pdf`;

      apiFetch(downloadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          setResult({
            downloadUrl,
            blob,
            name: finalName,
            size: blob.size,
            engineMode: 'server'
          });
          saveFile(finalName, blob.size, 'application/pdf', 'EXCEL to PDF', blob);
          clearStudioDraft('excel-to-pdf');
        })
        .catch(() => {
          setResult({
            downloadUrl,
            name: finalName,
            size: files[activeFileIndex]?.size || 0,
            engineMode: 'server'
          });
        });
    } else if (poller.status === 'failed') {
      setProcessing(false);
      setError(poller.error || 'Server conversion failed.');
    } else if (poller.status === 'started' || poller.status === 'queued') {
      setProgress(poller.progress || 20);
      setStatusMessage('Converting spreadsheet layout via LibreOffice engine...');
    }
  }, [poller.status, poller.result, poller.error, poller.progress, files, activeFileIndex]);

  // 7. Execute Excel to PDF Conversion
  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setStatusMessage('Initializing spreadsheet parser...');

    const file = files[activeFileIndex] || files[0];
    const finalName = outputFileName.trim().endsWith('.pdf') ? outputFileName.trim() : `${outputFileName.trim() || file.name.replace(/\.[^.]+$/, '')}.pdf`;

    try {
      if (engineMode === 'server') {
        if (!backendActive) throw new Error('Conversion server is unreachable. Please switch to Fast Browser Mode.');
        setStatusMessage('Uploading spreadsheet for LibreOffice PDF conversion...');
        const uploadData = await uploadFileSecure(BACKEND_URL, file, setProgress);
        if (!uploadData.success) throw new Error(uploadData.detail || 'Upload failed');

        setProgress(40);
        setStatusMessage('Queueing spreadsheet conversion task...');

        const convertFormData = new FormData();
        convertFormData.append('file_id', uploadData.file_id);
        convertFormData.append('filename', uploadData.filename);
        convertFormData.append('target_format', 'pdf');

        const convertRes = await apiFetch(`${BACKEND_URL}/api/convert`, {
          method: 'POST',
          body: convertFormData
        });

        if (!convertRes.ok) throw new Error('Failed to queue conversion task.');
        const convertData = await convertRes.json();
        poller.startPolling(convertData.job_id);
      } else {
        setStatusMessage('Compiling spreadsheet grid into vector PDF...');
        const pdfBlob = await excelToPdf(
          file,
          { pageSize, orientation, gridlines },
          (p) => {
            setProgress(p);
            setStatusMessage(`Rendering spreadsheet pages... ${p}%`);
          }
        );

        setProcessing(false);
        setResult({
          blob: pdfBlob,
          name: finalName,
          size: pdfBlob.size,
          engineMode: 'client'
        });

        await saveFile(finalName, pdfBlob.size, 'application/pdf', 'EXCEL to PDF', pdfBlob);
        await clearStudioDraft('excel-to-pdf');
      }
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'An error occurred during Excel to PDF conversion.');
    }
  };

  const downloadFile = () => {
    if (!result) return;
    if (result.blob) {
      saveAs(result.blob, result.name);
    } else if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  const resetWorkspace = () => {
    clearStudioDraft('excel-to-pdf');
    setFiles([]);
    setActiveFileIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setOutputFileName('');
    setWorkbookData(null);
    setSheetNames([]);
    setActiveSheetRows([]);
    poller.resetPoller();
  };

  const getColumnLetter = (colIdx) => {
    let letter = '';
    let temp = colIdx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const maxCols = Math.max(...(activeSheetRows.map((r) => (Array.isArray(r) ? r.length : 0))), 6);

  return (
    <ToolPageLayout
      toolId="excel-to-pdf"
      title="Excel to PDF Studio"
      description="Convert Excel workbooks (.xlsx, .xls, .csv) into clean, beautifully paginated PDF documents with auto-fitted tables."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Excel to PDF Online Free — Convert XLSX to PDF | DocForge"
        description="Convert Excel spreadsheets (.xlsx, .xls, .csv) into PDF with customized orientation, gridlines, and page margins. 100% private in-browser conversion."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            multiple={true}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Spreadsheet Grid Viewport                       */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Canvas Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active File Switcher */}
                    {files.length > 1 ? (
                      <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">table_view</span>
                        <select
                          value={activeFileIndex}
                          onChange={(e) => setActiveFileIndex(parseInt(e.target.value))}
                          className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer max-w-[180px] truncate"
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
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">table_view</span>
                        <span className="truncate max-w-[200px]">{files[0]?.name}</span>
                        <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(files[0]?.size || 0)})</span>
                      </div>
                    )}

                    {/* Sheet Tabs */}
                    {sheetNames.length > 1 && (
                      <div className="flex items-center bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)] max-w-xs overflow-x-auto">
                        {sheetNames.map((name, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSheetIndex(idx)}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                              activeSheetIndex === idx
                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-secondary)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <Table size={13} className="text-[var(--color-primary)]" />
                      <span>{activeSheetRows.length} Rows</span>
                      <span className="text-[var(--text-tertiary)]">•</span>
                      <span>{maxCols} Cols</span>
                    </div>
                  </div>

                  {/* Right Canvas Controls */}
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

              {/* Viewport Canvas Stage (Spreadsheet Grid) */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center relative bg-pattern select-none">
                {docLoading ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] my-auto">
                    <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--color-primary)]">
                      progress_activity
                    </span>
                    <span className="text-xs font-semibold">Parsing spreadsheet grid...</span>
                  </div>
                ) : (
                  <div
                    className="relative bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-300 dark:border-slate-800 overflow-auto max-w-full transition-transform duration-150 origin-top"
                    style={{
                      transform: `scale(${zoomScale})`,
                      maxHeight: '80vh'
                    }}
                  >
                    <table className="border-collapse text-xs font-mono w-full text-slate-800 dark:text-slate-200">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-300 dark:border-slate-700">
                          <th className="p-2 border-r border-slate-300 dark:border-slate-700 w-10 text-center font-bold bg-slate-200 dark:bg-slate-800">
                            #
                          </th>
                          {Array.from({ length: maxCols }, (_, c) => (
                            <th key={c} className="p-2 border-r border-slate-300 dark:border-slate-700 font-bold text-center min-w-[80px]">
                              {getColumnLetter(c)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSheetRows.map((row, rIdx) => {
                          const isHeader = rIdx === 0;
                          return (
                            <tr
                              key={rIdx}
                              className={`border-b border-slate-200 dark:border-slate-800 ${
                                isHeader
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200'
                                  : rIdx % 2 === 1
                                  ? 'bg-slate-50/50 dark:bg-slate-900/50'
                                  : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <td className="p-2 border-r border-slate-300 dark:border-slate-700 text-center text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/80">
                                {rIdx + 1}
                              </td>
                              {Array.from({ length: maxCols }, (_, cIdx) => {
                                const val = Array.isArray(row) ? row[cIdx] : '';
                                return (
                                  <td
                                    key={cIdx}
                                    className="p-2 border-r border-slate-200 dark:border-slate-800 truncate max-w-[160px]"
                                    title={val !== undefined ? String(val) : ''}
                                  >
                                    {val !== undefined ? String(val) : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">picture_as_pdf</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    PDF Options
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  XLSX
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Conversion Engine */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Conversion Engine
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setEngineMode('client')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'client'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Cpu size={14} />
                      <span>Fast Browser (Private)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEngineMode('server')}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        engineMode === 'server'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Server size={14} />
                      <span>LibreOffice Server</span>
                    </button>
                  </div>
                </div>

                {/* 2. Orientation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {[
                      { id: 'auto', label: 'Auto' },
                      { id: 'portrait', label: 'Portrait' },
                      { id: 'landscape', label: 'Landscape' }
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOrientation(o.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          orientation === o.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Page Size */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Page Size
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {[
                      { id: 'a4', label: 'A4' },
                      { id: 'letter', label: 'US Letter' }
                    ].map((ps) => (
                      <button
                        key={ps.id}
                        type="button"
                        onClick={() => setPageSize(ps.id)}
                        className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer text-center ${
                          pageSize === ps.id
                            ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ps.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Table Gridlines Toggle */}
                <div className="bg-[var(--bg-secondary)] p-3 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Grid size={14} className="text-[var(--color-primary)]" />
                    <span>Draw Cell Gridlines</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={gridlines}
                    onChange={(e) => setGridlines(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>

                {/* 5. Output File Name */}
                <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output PDF Name
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="spreadsheet.pdf"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)]">
                          progress_activity
                        </span>
                        {statusMessage || 'Compiling PDF document...'}
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
                  onClick={handleConvert}
                  disabled={processing || files.length === 0 || (engineMode === 'server' && !backendActive)}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Converting to PDF ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Convert to PDF</span>
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
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>

            {/* Title & Document Pill */}
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                PDF Document Created!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your Excel spreadsheet has been converted into a high-fidelity PDF table.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
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
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Page Size</span>
                <span className="text-base font-extrabold text-[var(--text-primary)] uppercase">{pageSize}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Gridlines</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">{gridlines ? 'Enabled' : 'Clean'}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Engine</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                  {result.engineMode === 'server' ? 'LibreOffice' : 'Vector Grid'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-success btn-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadFile}
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Convert Another Spreadsheet</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with This PDF
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

                <Link
                  to="/sign-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">draw</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Sign PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Add signature</p>
                  </div>
                </Link>

                <Link
                  to="/organize-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">view_module</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Organize</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Reorder pages</p>
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
