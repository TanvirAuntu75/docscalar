import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { extractStudioCommand } from '../../utils/canvasBrain';

import StudioNLPBar from './StudioNLPBar';
import OrganizeStudio from './studios/OrganizeStudio';
import RedactStudio from './studios/RedactStudio';
import SignStudio from './studios/SignStudio';
import CompareStudio from './studios/CompareStudio';
import EditStudio from './studios/EditStudio';
import CropStudio from './studios/CropStudio';
import FormFillStudio from './studios/FormFillStudio';

export default function FocusStudioPortal({ studio, onCommit, onCancel }) {
  const { toolId, inputFiles, extractedParams } = studio;
  const [editorParams, setEditorParams] = useState(extractedParams);
  const [nlpOp, setNlpOp] = useState(null);

  useEffect(() => {
    if (extractedParams?.initialNlpPrompt) {
      const timer = setTimeout(() => {
        const delta = extractStudioCommand(toolId, extractedParams.initialNlpPrompt);
        handleCommand(delta);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [toolId, extractedParams]);

  // Map toolId to header metadata
  const studioMeta = {
    'organize-pdf': { title: 'Organize Pages Studio', desc: 'Drag to reorder, rotate or exclude document pages visually.' },
    'redact-pdf': { title: 'Redact PDF Studio', desc: 'Securely blackout sensitive details, names, or matching patterns.' },
    'sign-pdf': { title: 'Signature Studio', desc: 'Draw, type, or upload a custom signature to place on the page.' },
    'compare-pdf': { title: 'Compare Documents Studio', desc: 'Diff matching side-by-side view to locate visual differences.' },
    'edit-pdf': { title: 'Document Editor Studio', desc: 'Annotate, sketch freehand, highlight text, and add stamps.' },
    'crop-pdf': { title: 'Page Cropping Studio', desc: 'Adjust crop boundaries and target page sizes.' },
    'pdf-forms': { title: 'Form Filler Studio', desc: 'Fill out interactive form inputs and toggle flattening options.' }
  }[toolId] || { title: 'Focus Studio', desc: 'Review document and apply settings.' };

  const handleCommand = (delta) => {
    setNlpOp(delta);
    // Auto clear NLP trigger on next frame
    setTimeout(() => setNlpOp(null), 100);
  };

  // Merge-aware onChange: studios pass partial objects, portal merges them
  const handleParamChange = (patch) => {
    setEditorParams(prev => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch)
    }));
  };

  const handleApply = () => {
    onCommit(editorParams);
  };

  const renderStudioBody = () => {
    switch (toolId) {
      case 'organize-pdf':
        return <OrganizeStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'redact-pdf':
        return <RedactStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'sign-pdf':
        return <SignStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'compare-pdf':
        return <CompareStudio files={inputFiles} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'edit-pdf':
        return <EditStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'crop-pdf':
        return <CropStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      case 'pdf-forms':
        return <FormFillStudio file={inputFiles[0]} params={editorParams} onChange={handleParamChange} nlpOp={nlpOp} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <span>Studio mode for tool "{toolId}" is not implemented.</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-orange-950/20 backdrop-blur-xl p-4 md:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          '--color-primary': '#f97316',
          '--color-primary-rgb': '249, 115, 22',
          '--color-primary-light': '#ff9843',
          '--color-primary-dark': '#7c2d12',
          '--color-accent': '#ea580c',
          '--color-accent-light': '#ffedd5',
        }}
        className="w-full h-full max-w-[96vw] bg-white border border-orange-200/50 rounded-3xl shadow-[0_32px_64px_rgba(249,115,22,0.12)] flex flex-col overflow-hidden relative"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-orange-400/5 rounded-full blur-3xl pointer-events-none" />

        {/* Master Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-orange-100 px-6 py-4 gap-4 z-10">
          <div className="flex flex-col text-left">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" /> {studioMeta.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{studioMeta.desc}</p>
          </div>

          {/* In-Studio NLP input capsule */}
          <div className="flex-1 max-w-lg mx-auto w-full">
            <StudioNLPBar toolId={toolId} onCommand={handleCommand} />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancel}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-200/60 cursor-pointer transition-colors"
              title="Cancel Changes"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-orange-500/25 transition-all hover:scale-102 active:scale-98"
            >
              Apply Settings
            </button>
          </div>
        </div>

        {/* Master Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 z-10 min-h-[300px] bg-slate-50/50">
          {renderStudioBody()}
        </div>
      </motion.div>
    </div>
  );
}
