import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, FileArchive, FilePenLine, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

const NEXT_ACTION_MAP = {
  'compress-pdf': [
    { title: 'Protect with Password', icon: Lock, path: '/protect-pdf', desc: 'Secure with AES encryption' },
    { title: 'Convert to Word', icon: FileText, path: '/pdf-to-word', desc: 'Make text fully editable' },
    { title: 'Sign Document', icon: FilePenLine, path: '/sign-pdf', desc: 'Add digital signature' }
  ],
  'merge-pdf': [
    { title: 'Compress Merged PDF', icon: FileArchive, path: '/compress-pdf', desc: 'Reduce combined file size' },
    { title: 'Protect PDF', icon: Lock, path: '/protect-pdf', desc: 'Lock with password' },
    { title: 'Sign Document', icon: FilePenLine, path: '/sign-pdf', desc: 'Add your signature' }
  ],
  'pdf-to-word': [
    { title: 'Translate Document', icon: FileText, path: '/translate-pdf', desc: 'Translate to 30+ languages' },
    { title: 'Compress PDF', icon: FileArchive, path: '/compress-pdf', desc: 'Optimize storage size' }
  ],
  'docx-to-pdf': [
    { title: 'Compress PDF', icon: FileArchive, path: '/compress-pdf', desc: 'Shrink file for email' },
    { title: 'Sign Document', icon: FilePenLine, path: '/sign-pdf', desc: 'Add digital signature' },
    { title: 'Protect with Password', icon: Lock, path: '/protect-pdf', desc: 'Lock confidential contents' }
  ],
  'sign-pdf': [
    { title: 'Protect PDF', icon: Lock, path: '/protect-pdf', desc: 'Prevent unauthorized edits' },
    { title: 'Compress PDF', icon: FileArchive, path: '/compress-pdf', desc: 'Reduce signed file size' }
  ]
};

export default function PostProcessingNextActions({ currentToolId, onSelectNextTool }) {
  const navigate = useNavigate();
  const suggestions = NEXT_ACTION_MAP[currentToolId] || [
    { title: 'Compress PDF', icon: FileArchive, path: '/compress-pdf', desc: 'Optimize document size' },
    { title: 'Protect PDF', icon: Lock, path: '/protect-pdf', desc: 'Secure with password' },
    { title: 'Sign PDF', icon: FilePenLine, path: '/sign-pdf', desc: 'Add electronic signature' }
  ];

  return (
    <div className="w-full max-w-xl mx-auto mt-8 p-6 bg-surface-container/60 border border-outline-variant/50 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-xs font-bold text-on-background uppercase tracking-wide">
            Recommended Next Actions
          </span>
        </div>
        <span className="text-[10px] font-semibold text-on-surface-variant/70 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Zero Cloud Upload
        </span>
      </div>

      {/* Suggested Next Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {suggestions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                if (onSelectNextTool) {
                  onSelectNextTool(action.path);
                } else {
                  navigate(action.path);
                }
              }}
              className="flex flex-col text-left p-3.5 rounded-2xl bg-surface border border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-on-background group-hover:text-primary transition-colors flex items-center justify-between">
                {action.title}
                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-1">
                {action.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
