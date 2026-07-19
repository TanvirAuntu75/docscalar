import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileDropzone from '../../components/FileDropzone';
import SEOHead from '../../components/SEOHead';
import { TOOLS } from '../../utils/constants';

const availableTools = TOOLS.filter(t => t.implemented && t.category !== 'utility');

export default function ConversionPipeline() {
  const [files, setFiles] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesSelected = (selectedFiles) => {
    setFiles(Array.from(selectedFiles));
  };

  const addToolToPipeline = (tool) => {
    setPipeline([...pipeline, { ...tool, instanceId: Date.now() }]);
    setShowToolSelector(false);
  };

  const removeTool = (instanceId) => {
    setPipeline(pipeline.filter(t => t.instanceId !== instanceId));
  };

  const handleExecute = () => {
    if (files.length === 0 || pipeline.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    // Simulate processing
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
        }, 500);
      }
    }, 200);
  };

  return (
    <div className="tool-page max-w-[1200px] mx-auto py-12 px-4">
      <SEOHead 
        title="Automated PDF Conversion Workflows & Chaining — DocForge"
        description="Chain multiple document operations (Merge, Compress, Rotate) and convert files in sequence automatically using DocForge Workflows."
      />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-white mb-4"
          >
            Conversion Workflows
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/60"
          >
            Create automated workflows by chaining multiple document and image operations together.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Step 1: Upload */}
          <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm relative z-10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">1</span>
              Input Files
            </h2>
            {files.length === 0 ? (
              <FileDropzone setFiles={handleFilesSelected} multiple={true} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">description</span>
                    <div>
                      <p className="font-medium text-white">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                      <p className="text-sm text-white/60">
                        {files.map(f => f.name).join(', ').substring(0, 50)}
                        {files.map(f => f.name).join(', ').length > 50 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles([])}
                    className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Steps */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-outline-variant/50 -z-10" />

            <div className="space-y-6">
              <AnimatePresence>
                {pipeline.map((tool, index) => (
                  <motion.div
                    key={tool.instanceId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container border border-outline-variant text-white/80 text-sm font-bold shrink-0">
                        {index + 2}
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: tool.iconBg, color: tool.iconColor }}
                        >
                          <span className="material-symbols-outlined text-2xl">{tool.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{tool.title}</h3>
                          <p className="text-sm text-white/60">{tool.description}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTool(tool.instanceId)}
                      className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-error transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Tool Button */}
              <motion.div layout className="pl-[22px]">
                <div className="relative">
                  <button
                    onClick={() => setShowToolSelector(!showToolSelector)}
                    className="flex items-center gap-2 px-4 py-3 bg-surface border border-dashed border-outline-variant hover:border-primary/50 hover:bg-primary/5 rounded-xl text-white/80 transition-all font-medium group"
                  >
                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add_circle</span>
                    Add Pipeline Step
                  </button>

                  {/* Tool Selector Dropdown */}
                  <AnimatePresence>
                    {showToolSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-outline-variant rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1"
                      >
                        {availableTools.map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => addToolToPipeline(tool)}
                            className="flex items-center gap-3 p-3 hover:bg-surface-container rounded-xl transition-colors text-left w-full"
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: tool.iconBg, color: tool.iconColor }}
                            >
                              <span className="material-symbols-outlined">{tool.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{tool.title}</p>
                              <p className="text-xs text-white/60 truncate">{tool.category.replace(/-/g, ' ')}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Final Step: Output */}
          <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20 text-success text-sm font-bold shrink-0">
                     <span className="material-symbols-outlined text-sm">check</span>
                   </div>
                   <div>
                     <h3 className="font-semibold text-white">Output Format</h3>
                     <p className="text-sm text-white/60">Processed files will be downloaded as a ZIP archive.</p>
                   </div>
                </div>

                <button
                  onClick={handleExecute}
                  disabled={files.length === 0 || pipeline.length === 0 || isProcessing}
                  className={`
                    flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all
                    ${files.length > 0 && pipeline.length > 0 && !isProcessing
                      ? 'bg-primary text-black hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]'
                      : 'bg-surface-container text-white/40 cursor-not-allowed border border-outline-variant'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Processing... {progress}%
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">play_arrow</span>
                      Run Pipeline
                    </>
                  )}
                </button>
             </div>

             {isProcessing && (
               <div className="mt-6 h-2 w-full bg-surface-container rounded-full overflow-hidden">
                 <motion.div
                   className="h-full bg-primary"
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 0.2 }}
                 />
               </div>
             )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
