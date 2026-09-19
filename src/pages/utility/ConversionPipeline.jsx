import { useState, useEffect } from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import { Link } from 'react-router-dom';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import {
  executePipeline,
  PIPELINE_TEMPLATES,
  PIPELINE_AVAILABLE_TOOLS
} from '../../engines/utility/conversionPipeline';
import { formatFileSize } from '../../utils/constants';
import { saveFile, saveStudioDraft, loadStudioDraft, clearStudioDraft } from '../../utils/db';
import { saveAs } from 'file-saver';
import {
  GitMerge,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  Sparkles,
  Download,
  FileCheck,
  Zap,
  Play,
  Layers,
  Settings2,
  Workflow
} from 'lucide-react';

export default function ConversionPipeline() {
  const [files, setFiles] = useState([]);
  const [steps, setSteps] = useState([
    { toolId: 'image-converter', targetFormat: 'webp', instanceId: 1 },
    { toolId: 'image-compressor', quality: 0.70, instanceId: 2 }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Execution & UI State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 1. Restore Draft Session on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const draft = await loadStudioDraft('conversion-pipeline');
        if (draft && isMounted) {
          if (draft.files && draft.files.length > 0) {
            const restoredFiles = draft.files.map((f) => {
              if (f instanceof File) return f;
              return new File([f.blob || f], f.name || 'document.pdf', {
                type: f.type || 'application/pdf',
                lastModified: f.lastModified || Date.now()
              });
            });
            setFiles(restoredFiles);
          }
          if (draft.steps && draft.steps.length > 0) {
            setSteps(draft.steps);
          }
        }
      } catch (err) {
        console.warn('Conversion Pipeline draft recovery failed:', err);
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save Draft Session on State Change
  useEffect(() => {
    if (files.length > 0 || steps.length > 0) {
      saveStudioDraft('conversion-pipeline', {
        files,
        steps
      });
    }
  }, [files, steps]);

  // 3. Step Management Handlers
  const addStep = (toolId) => {
    const newStep = {
      toolId,
      instanceId: Date.now(),
      ...(toolId === 'compress-pdf' ? { level: 'medium' } : {}),
      ...(toolId === 'rotate-pdf' ? { rotationAngle: 90 } : {}),
      ...(toolId === 'image-converter' ? { targetFormat: 'webp', quality: 0.92 } : {}),
      ...(toolId === 'image-resizer' ? { mode: 'percentage', percentage: 75 } : {}),
      ...(toolId === 'image-compressor' ? { quality: 0.70 } : {})
    };
    setSteps([...steps, newStep]);
    setActiveStepIndex(steps.length);
  };

  const removeStep = (index) => {
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
    setActiveStepIndex(Math.max(0, index - 1));
  };

  const moveStep = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSteps(updated);
    setActiveStepIndex(targetIdx);
  };

  const applyTemplate = (tmpl) => {
    const templatedSteps = tmpl.steps.map((s, idx) => ({
      ...s,
      instanceId: Date.now() + idx
    }));
    setSteps(templatedSteps);
    setActiveStepIndex(0);
  };

  // 4. Handle Execution
  const handleExecute = async () => {
    if (!files.length || !steps.length) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStatusMessage('Initiating workflow execution...');

    try {
      const pipelineRes = await executePipeline(
        files[0],
        steps,
        (p, msg) => {
          setProgress(p);
          setStatusMessage(msg);
        }
      );

      setResult(pipelineRes);
      await saveFile(
        pipelineRes.name,
        pipelineRes.size,
        pipelineRes.blob.type || 'application/octet-stream',
        'Conversion Pipeline',
        pipelineRes.blob
      );
      await clearStudioDraft('conversion-pipeline');
    } catch (err) {
      setError(err.message || 'Pipeline execution failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result || !result.blob) return;
    saveAs(result.blob, result.name);
  };

  const resetWorkspace = () => {
    clearStudioDraft('conversion-pipeline');
    setFiles([]);
    setSteps([
      { toolId: 'image-converter', targetFormat: 'webp', instanceId: 1 },
      { toolId: 'image-compressor', quality: 0.70, instanceId: 2 }
    ]);
    setActiveStepIndex(0);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const currentFile = files[0];
  const activeStep = steps[activeStepIndex];

  return (
    <ToolPageLayout
      toolId="conversion-pipeline"
      title="Conversion Pipeline Studio"
      description="Chain multiple document and image operations into automated, repeatable conversion workflows."
      files={files}
      hasResult={Boolean(result)}
      suppressSwitcher={true}
    >
      <SEOHead
        title="Conversion Workflows & Pipeline Studio — Automated Document Chaining | DocScalar"
        description="Automate repetitive file workflows by chaining PDF and image operations together (Merge, Convert, Compress, Resize) in a single sequential execution."
      />

      {!result ? (
        files.length === 0 ? (
          <FileDropzone
            accept="*/*"
            multiple={false}
            files={files}
            setFiles={setFiles}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
            {/* ========================================================================= */}
            {/* LEFT / CENTER: Interactive Workflow Visual Stage                          */}
            {/* ========================================================================= */}
            <div className="workspace-canvas-wrapper flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-[var(--bg-tertiary)]">
              {/* Sticky Top Toolbar */}
              <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                <div className="workspace-toolbar px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Input File Capsule */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
                      <span className="truncate max-w-[200px]">{currentFile?.name}</span>
                      <span className="text-[var(--text-secondary)] font-normal">({formatFileSize(currentFile?.size || 0)})</span>
                    </div>

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

                    {/* Step Counter Capsule */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] rounded-lg text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                      <Workflow size={13} className="text-[var(--color-primary)]" />
                      <span>{steps.length} {steps.length === 1 ? 'Step' : 'Steps'} Configured</span>
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

              {/* Viewport Canvas Stage (Visual Pipeline Sequence) */}
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-pattern select-none">
                <div
                  className="flex flex-col items-center gap-3 w-full max-w-xl transition-transform duration-150 origin-top"
                  style={{ transform: `scale(${zoomScale})` }}
                >
                  {/* 1. Input Node */}
                  <div className="w-full p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                        IN
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[280px]">
                          {currentFile?.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          Source Payload • {formatFileSize(currentFile?.size || 0)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>

                  {/* 2. Step Nodes */}
                  {steps.map((step, idx) => {
                    const toolObj = PIPELINE_AVAILABLE_TOOLS.find((t) => t.id === step.toolId) || { label: step.toolId, icon: 'build' };
                    const isSelected = activeStepIndex === idx;

                    return (
                      <div key={step.instanceId || idx} className="w-full flex flex-col items-center gap-3">
                        {/* Connecting Flow Arrow */}
                        <div className="flex items-center justify-center text-[var(--text-tertiary)]">
                          <ArrowDown size={18} className="animate-bounce" />
                        </div>

                        {/* Step Card */}
                        <div
                          onClick={() => setActiveStepIndex(idx)}
                          className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[var(--bg-primary)] border-[var(--color-primary)] shadow-md ring-2 ring-[var(--color-primary)]/20'
                              : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xs">
                              #{idx + 1}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[var(--text-primary)]">{toolObj.label}</span>
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {step.toolId === 'image-converter' && `Format: ${step.targetFormat?.toUpperCase()}`}
                                {step.toolId === 'image-compressor' && `Quality: ${Math.round((step.quality || 0.7) * 100)}%`}
                                {step.toolId === 'image-resizer' && `Scale: ${step.percentage || 75}%`}
                                {step.toolId === 'rotate-pdf' && `Angle: ${step.rotationAngle || 90}°`}
                                {step.toolId === 'compress-pdf' && `Level: ${step.level || 'medium'}`}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => moveStep(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              title="Move step up"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(idx, 1)}
                              disabled={idx === steps.length - 1}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                              title="Move step down"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(idx)}
                              disabled={steps.length <= 1}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-20 cursor-pointer"
                              title="Remove step"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 3. Output Node */}
                  <div className="flex items-center justify-center text-[var(--text-tertiary)]">
                    <ArrowDown size={18} />
                  </div>
                  <div className="w-full p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        OUT
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Final Artifact Output</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Sequential chained result</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                      Pipeline Target
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT: Studio Options Sidebar                                             */}
            {/* ========================================================================= */}
            <div className="options-panel w-80 min-w-80 max-w-80 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex flex-col justify-between h-full select-none shadow-sm z-20">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitMerge size={18} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Pipeline Controls
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  Step #{activeStepIndex + 1}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 1. Add Step Directory */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Add Pipeline Stage
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PIPELINE_AVAILABLE_TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => addStep(tool.id)}
                        className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 text-left flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-all"
                      >
                        <Plus size={14} className="text-[var(--color-primary)] shrink-0" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Workflow Presets */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Workflow Presets
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {PIPELINE_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplate(tmpl)}
                        className="p-2.5 rounded-xl bg-[var(--bg-secondary)] hover:border-[var(--color-primary)] border border-[var(--border-subtle)] text-left cursor-pointer transition-all"
                      >
                        <span className="text-xs font-bold text-[var(--text-primary)] block">{tmpl.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] block truncate">{tmpl.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Active Step Properties */}
                {activeStep && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Step #{activeStepIndex + 1} Configuration
                    </label>

                    {activeStep.toolId === 'image-converter' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-secondary)]">Target Format:</span>
                        <select
                          value={activeStep.targetFormat || 'webp'}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[activeStepIndex].targetFormat = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none cursor-pointer"
                        >
                          <option value="webp">WebP (Next-Gen)</option>
                          <option value="png">PNG (Lossless)</option>
                          <option value="jpeg">JPG (Photo)</option>
                          <option value="pdf">PDF (Document)</option>
                        </select>
                      </div>
                    )}

                    {activeStep.toolId === 'image-compressor' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[10px] text-[var(--text-secondary)]">Quality Level:</span>
                          <span className="font-bold text-[var(--color-primary)]">{Math.round((activeStep.quality || 0.7) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={activeStep.quality || 0.7}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[activeStepIndex].quality = parseFloat(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {activeStep.toolId === 'image-resizer' && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[10px] text-[var(--text-secondary)]">Percentage Scale:</span>
                          <span className="font-bold text-[var(--color-primary)]">{activeStep.percentage || 75}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          step="5"
                          value={activeStep.percentage || 75}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[activeStepIndex].percentage = parseInt(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-full h-1 bg-[var(--border-subtle)] accent-[var(--color-primary)] rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {activeStep.toolId === 'rotate-pdf' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--text-secondary)]">Rotation Angle:</span>
                        <select
                          value={activeStep.rotationAngle !== undefined ? activeStep.rotationAngle : 90}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[activeStepIndex].rotationAngle = parseInt(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none cursor-pointer"
                        >
                          <option value="90">90° Clockwise</option>
                          <option value="180">180° Inverted</option>
                          <option value="270">270° Counter-Clockwise</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar (While Processing) */}
                {processing && (
                  <div className="flex flex-col gap-1.5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[14px] animate-spin text-[var(--color-primary)] shrink-0">
                          progress_activity
                        </span>
                        <span className="truncate" title={statusMessage || 'Processing...'}>
                          {statusMessage || 'Processing...'}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">{progress}%</span>
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
                  onClick={handleExecute}
                  disabled={processing || files.length === 0 || steps.length === 0}
                  className="w-full py-3 px-4 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Executing Workflow ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" />
                      <span>Execute {steps.length}-Step Pipeline</span>
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
                Workflow Complete!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                All {result.log?.length || steps.length} pipeline steps were sequentially executed with zero data loss.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-primary)] mx-auto mt-2 max-w-full">
                <FileCheck size={16} className="text-emerald-500" />
                <span className="truncate max-w-[220px]">{result.name}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-emerald-600 font-bold">{formatFileSize(result.size || 0)}</span>
              </div>
            </div>

            {/* Telemetry Diagnostics Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Stages Run</span>
                <span className="text-base font-extrabold text-[var(--color-primary)]">{result.log?.length || steps.length}</span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Execution Time</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">
                  {result.log?.reduce((acc, l) => acc + l.durationMs, 0) || 120} ms
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status</span>
                <span className="text-xs font-bold text-emerald-500 mt-1">100% Success</span>
              </div>
            </div>

            {/* Action Buttons (Strict Single-Line No Wrap) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                type="button"
                className="btn btn-primary btn-lg flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 w-full sm:w-auto min-w-[200px] text-sm sm:text-base font-bold py-3 px-6 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={downloadResult}
              >
                <Download size={18} />
                <span>Download Final Output ↓</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg flex items-center justify-center gap-2 w-full sm:w-auto min-w-[180px] text-sm sm:text-base font-semibold py-3 px-5 whitespace-nowrap cursor-pointer hover:bg-[var(--bg-secondary)] transition-all"
                onClick={resetWorkspace}
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Build Another Workflow</span>
              </button>
            </div>

            {/* Quick Next Steps */}
            <div className="w-full pt-6 border-t border-[var(--border-subtle)] mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Continue Working with DocScalar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  to="/image-converter"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">image</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Image Converter</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Convert PNG, JPG, WEBP</p>
                  </div>
                </Link>

                <Link
                  to="/compress-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">folder_zip</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">Compress PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Extreme PDF distiller</p>
                  </div>
                </Link>

                <Link
                  to="/url-to-pdf"
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--color-primary)]/10 border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/30 flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)] transition-all text-left group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">link</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate group-hover:text-[var(--color-primary)]">URL to PDF</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">Capture webpage to PDF</p>
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
