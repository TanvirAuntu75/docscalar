import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import {
  ArrowLeft,
  LayoutGrid,
  FileText,
  Layers,
  Wrench,
  ArrowRight,
} from 'lucide-react';

/**
 * MaintenancePage
 * Professional "In Production · Coming Soon" studio notice.
 * Clean, restrained, high-typography layout with zero AI slop, zero nested cards,
 * and clear, honest communication.
 *
 * Props:
 *   title        – e.g. "CV Builder", "Stitch Canvas"
 *   subtitle     – e.g. "Resume Studio", "Design Studio"
 *   description  – optional custom description
 */
export default function MaintenancePage({
  title = 'Studio Workspace',
  subtitle = '',
  description,
}) {
  const navigate = useNavigate();

  const isResume = /cv|resume/i.test(title);
  const isCanvas = /canvas|stitch/i.test(title);

  // Esc key listener for fast keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Calm, human value copy
  const bodyText = useMemo(() => {
    if (description) return description;
    if (isResume) {
      return 'We are actively developing the new CV Builder studio. It is currently in production and will be available soon with updated templates, real-time styling, and export features.';
    }
    if (isCanvas) {
      return 'We are actively developing the Stitch Canvas workspace. It is currently in production and will be available soon with multi-page visual layout tools and vector markups.';
    }
    return `We are actively developing ${title}. It is currently in production and will be available soon with upgraded tools and performance.`;
  }, [description, isResume, isCanvas, title]);

  // Clean alternative tool links
  const alternativeTools = useMemo(() => {
    if (isResume) {
      return [
        { name: 'PDF to Word', path: '/pdf-to-word' },
        { name: 'Edit PDF', path: '/edit-pdf' },
        { name: 'Text to PDF', path: '/text-to-pdf' },
        { name: 'Merge PDF', path: '/merge-pdf' },
      ];
    }
    if (isCanvas) {
      return [
        { name: 'Edit PDF', path: '/edit-pdf' },
        { name: 'Organize PDF', path: '/organize-pdf' },
        { name: 'Crop PDF', path: '/crop-pdf' },
        { name: 'Image to PDF', path: '/image-to-pdf' },
      ];
    }
    return [
      { name: 'Merge PDF', path: '/merge-pdf' },
      { name: 'Edit PDF', path: '/edit-pdf' },
      { name: 'Compress PDF', path: '/compress-pdf' },
      { name: 'PDF to Word', path: '/pdf-to-word' },
    ];
  }, [isResume, isCanvas]);

  return (
    <>
      <SEOHead
        title={`${title} is Coming Soon | DocScalar`}
        description={`${title} is currently in production and coming soon. Explore all active DocScalar tools.`}
      />

      <div className="w-full min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0e17] text-slate-800 dark:text-slate-200 px-4 sm:px-6 py-12 sm:py-20 select-none">
        
        {/* Main Centered Workstation Card */}
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-8 sm:p-14 shadow-sm text-center">
          
          {/* Minimal Studio Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-6 shadow-2xs">
            {isResume ? (
              <FileText className="w-7 h-7 stroke-[1.75]" />
            ) : isCanvas ? (
              <Layers className="w-7 h-7 stroke-[1.75]" />
            ) : (
              <Wrench className="w-7 h-7 stroke-[1.75]" />
            )}
          </div>

          {/* Understated Production Tag (Clean solid styling matching landing page) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 mb-4 select-none">
            <span>In Production · Coming Soon</span>
          </div>

          {/* Clear, Prominent Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            {title} is Coming Soon
          </h1>

          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider -mt-2 mb-4">
              {subtitle}
            </p>
          )}

          {/* Clear, Honest Body Text */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 max-w-xl mx-auto leading-relaxed mb-8">
            {bodyText}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
            <Link
              to="/"
              className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.98]"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Browse All Tools</span>
            </Link>

            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate('/');
              }}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Quiet, Tasteful Alternatives Row */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-4">
              In the meantime, explore our active tools:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {alternativeTools.map((tool, idx) => (
                <Link
                  key={idx}
                  to={tool.path}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs"
                >
                  <span>{tool.name}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* Quiet Footer Note */}
        <p className="mt-8 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
          All 40+ DocScalar tools remain live and operational.
        </p>

      </div>
    </>
  );
}
