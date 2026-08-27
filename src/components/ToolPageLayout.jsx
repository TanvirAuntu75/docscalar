import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getToolById, formatFileSize } from '../utils/constants';
import { useNavigate } from 'react-router-dom';
import TrustBar from './TrustBar';
import RelatedTools from './RelatedTools';
import ToolIcon from './ToolIcon';
import SEOHead from './SEOHead';
import ToolContentGuide from './ToolContentGuide';
import { getSeoDataForTool } from '../utils/seoData';
import { getActiveSetFiles } from '../hooks/useFileProcessor';

export default function ToolPageLayout({ 
  toolId, 
  title, 
  description,
  headerContent,
  files = [],
  onFileSwitch,
  suppressSwitcher = false,
  hideHeader = false,
  hideRelatedTools = false,
  hasResult = false,
  isStudio = false,
  minTier: propMinTier,
  children 
}) {
  const { isAuthenticated, userTier } = useAuth();
  const navigate = useNavigate();
  
  const tool = getToolById(toolId);
  const minTier = propMinTier || tool?.minTier || 'guest';
  const seoData = getSeoDataForTool(toolId, title, description);
  
  // Real, accurate Schema.org SoftwareApplication markup (without fabricated reviews)
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": seoData.title,
    "url": `https://docforge.app${tool?.path || ''}`,
    "description": seoData.description,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web, Windows, macOS, Linux",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };
  
  // A user is authorized if the tool is guest-level,
  // or if they have a free account and the tool is free-level,
  // or if they are pro (since pro overrides all).
  const isAuthorized = 
    minTier === 'guest' || 
    (minTier === 'free' && isAuthenticated) || 
    (minTier === 'pro' && isAuthenticated && userTier === 'pro');

  const activeSetFiles = getActiveSetFiles();
  const handleFileSwitch = suppressSwitcher 
    ? null 
    : (onFileSwitch || (activeSetFiles ? (idx) => {
        activeSetFiles(prev => {
          if (idx < 0 || idx >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return next;
        });
      } : null));

  const isServer = tool?.executionType === 'server' || toolId === 'pdf-to-word' || toolId === 'pdf-to-excel' || toolId === 'url-to-pdf';
  
  const DEDICATED_STUDIO_TOOLS = [
    'document-viewer',
    'conversion-pipeline',
    'qr-generator',
    'canvas',
    'workspace'
  ];

  // Active Studio Mode: When files are loaded, dedicated studio tool, or explicitly flagged as isStudio
  const isDedicatedStudio = DEDICATED_STUDIO_TOOLS.includes(toolId);
  const isStudioMode = (isDedicatedStudio || isStudio || (files && files.length > 0)) && !hasResult;

  useEffect(() => {
    if (isStudioMode) {
      document.body.classList.add('studio-mode-active');
    } else {
      document.body.classList.remove('studio-mode-active');
    }
    return () => {
      document.body.classList.remove('studio-mode-active');
    };
  }, [isStudioMode]);

  if (isStudioMode) {
    return (
      <div className="studio-viewport w-full h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] overflow-hidden flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          schema={schemaMarkup}
        />
        {isAuthorized ? (
          <div className="flex-1 flex min-h-0 h-full w-full overflow-hidden relative">
            {children}
          </div>
        ) : (
          <div className="max-w-[640px] mx-auto my-auto p-8 bg-surface-container border border-outline-variant rounded-2xl shadow-sm text-center animate-in fade-in slide-in-from-bottom duration-300">
            <span className="material-symbols-outlined text-[48px] text-primary mb-4 select-none">
              {minTier === 'pro' ? 'workspace_premium' : 'account_circle'}
            </span>
            <h2 className="font-h2 text-lg font-bold text-on-background mb-3">
              {minTier === 'pro' ? 'DocForge Pro Feature' : 'Account Required'}
            </h2>
            <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
              {minTier === 'pro' 
                ? `The ${title} tool requires a DocForge Pro subscription. Upgrade to unlock this feature along with unlimited parallel batch queues and 1 GB file limits.`
                : `The ${title} tool requires a free DocForge account. Sign up in seconds to access advanced document utilities and local conversion engines.`
              }
            </p>
            <div className="flex justify-center gap-3">
              {minTier === 'pro' ? (
                <>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="font-button text-xs bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm font-bold"
                  >
                    View Pro Plans
                  </button>
                  <button
                    onClick={() => navigate('/workspace')}
                    className="font-button text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-background px-5 py-2.5 rounded-lg transition-colors font-semibold"
                  >
                    Back to Workspace
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/signup')}
                    className="font-button text-xs bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm font-bold"
                  >
                    Create Free Account
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="font-button text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-background px-5 py-2.5 rounded-lg transition-colors font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`tool-page w-full animate-in fade-in duration-500 ${toolId === 'resume-builder' ? '!max-w-full !p-0' : ''}`}>
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        schema={schemaMarkup}
      />
      
      {!hideHeader && !hasResult && (
        <div className="tool-page-header group">
          <div className="tool-page-icon select-none flex items-center justify-center">
            <ToolIcon id={toolId} size={48} />
          </div>
          <h1 className="text-on-background">{title}</h1>
          <p className="tool-page-subtitle">{description}</p>
          <TrustBar isServer={isServer} />
          {headerContent}
        </div>
      )}

      {isAuthorized && files.length > 1 && handleFileSwitch && !hasResult && (
        <div className="max-w-[1200px] mx-auto mb-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-surface-container border border-outline-variant rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">filter_none</span>
              <span className="text-xs font-bold text-on-background">
                Working on {files.length} loaded documents. Switch active file to process:
              </span>
            </div>
            <select
              value={0}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (handleFileSwitch) handleFileSwitch(idx);
              }}
              className="w-full sm:w-auto text-xs font-semibold p-2.5 px-3 rounded-xl border border-outline-variant bg-surface text-on-background focus:border-primary focus:outline-none cursor-pointer"
            >
              {files.map((f, idx) => (
                <option key={idx} value={idx}>
                  {idx === 0 ? '👉 ' : ''}{f.name} ({formatFileSize(f.size)})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isAuthorized ? (
        children
      ) : (
        <div className="max-w-[640px] mx-auto my-12 p-8 bg-surface-container border border-outline-variant rounded-2xl shadow-sm text-center animate-in fade-in slide-in-from-bottom duration-300">
          <span className="material-symbols-outlined text-[48px] text-primary mb-4 select-none">
            {minTier === 'pro' ? 'workspace_premium' : 'account_circle'}
          </span>
          <h2 className="font-h2 text-lg font-bold text-on-background mb-3">
            {minTier === 'pro' ? 'DocForge Pro Feature' : 'Account Required'}
          </h2>
          <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            {minTier === 'pro' 
              ? `The ${title} tool requires a DocForge Pro subscription. Upgrade to unlock this feature along with unlimited parallel batch queues and 1 GB file limits.`
              : `The ${title} tool requires a free DocForge account. Sign up in seconds to access advanced document utilities and local conversion engines.`
            }
          </p>
          <div className="flex justify-center gap-3">
            {minTier === 'pro' ? (
              <>
                <button
                  onClick={() => navigate('/pricing')}
                  className="font-button text-xs bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm font-bold"
                >
                  View Pro Plans
                </button>
                <button
                  onClick={() => navigate('/workspace')}
                  className="font-button text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-background px-5 py-2.5 rounded-lg transition-colors font-semibold"
                >
                  Back to Workspace
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/signup')}
                  className="font-button text-xs bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm font-bold"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="font-button text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-background px-5 py-2.5 rounded-lg transition-colors font-semibold"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Interactive FAQs & Related Tools strictly in Landing Mode (when NO files loaded, NOT in studio, NOT hideHeader, NOT hideRelatedTools) */}
      {!hideHeader && !isStudioMode && !hasResult && files.length === 0 && !['resume-builder', 'document-viewer', 'conversion-pipeline', 'qr-generator'].includes(toolId) && (
        <ToolContentGuide seoData={seoData} />
      )}
      {!hideRelatedTools && !isStudioMode && !hasResult && files.length === 0 && !['resume-builder', 'document-viewer', 'conversion-pipeline', 'qr-generator'].includes(toolId) && (
        <RelatedTools currentToolId={toolId} />
      )}
    </div>
  );
}
