import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getToolById, formatFileSize } from '../utils/constants';
import { useNavigate, useLocation } from 'react-router-dom';
import TrustBar from './TrustBar';
import RelatedTools from './RelatedTools';
import ToolIcon from './ToolIcon';
import SEOHead from './SEOHead';
import ToolContentGuide from './ToolContentGuide';
import GuestLimitModal from './GuestLimitModal';
import { getGuestQuota } from '../utils/guestQuota';
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
  setFiles,
  setResult,
  onReset,
  onResetResult,
  disableStageRouting = false,
  children 
}) {
  const { isAuthenticated, userTier } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const tool = getToolById(toolId);
  const minTier = propMinTier || tool?.minTier || 'guest';
  const seoData = getSeoDataForTool(toolId, title, description);

  // Derived base path (e.g. /merge-pdf)
  const basePath = tool?.path || location.pathname.replace(/\/(upload|studio|download)\/?$/, '').replace(/\/$/, '') || `/${toolId}`;
  const canonicalUrl = `https://docscalar.app${basePath.replace(/\/$/, '')}`;
  
  // Real, accurate Schema.org SoftwareApplication markup
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": seoData.title,
    "url": canonicalUrl,
    "description": seoData.description,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web, Windows, macOS, Linux",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const faqSchema = seoData.faqs?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": seoData.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a }
    }))
  } : null;

  const howToSchema = seoData.howTo?.length ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to ${title || toolId}`,
    "step": seoData.howTo.map(s => ({
      "@type": "HowToStep",
      "name": s.title,
      "text": s.desc
    }))
  } : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "DocScalar", "item": "https://docscalar.app" },
      { "@type": "ListItem", "position": 2, "name": title || toolId, "item": canonicalUrl }
    ]
  };

  const combinedSchemas = [schemaMarkup, faqSchema, howToSchema, breadcrumbSchema].filter(Boolean);
  
  const isAuthorized = 
    minTier === 'guest' || 
    (minTier === 'free' && isAuthenticated) || 
    (minTier === 'pro' && isAuthenticated && userTier === 'pro');

  const [guestQuota, setGuestQuota] = useState(getGuestQuota);

  useEffect(() => {
    const handleQuotaChanged = () => setGuestQuota(getGuestQuota());
    window.addEventListener('docscalar:guest-quota-changed', handleQuotaChanged);
    return () => window.removeEventListener('docscalar:guest-quota-changed', handleQuotaChanged);
  }, []);

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
    'qr-generator',
    'canvas',
    'workspace',
    'resume-builder',
    'document-viewer'
  ];

  // Active Studio Mode: When files are loaded, dedicated studio tool, or explicitly flagged as isStudio
  const isDedicatedStudio = DEDICATED_STUDIO_TOOLS.includes(toolId);
  const isStudioMode = ((isDedicatedStudio && toolId !== 'resume-builder' && toolId !== 'qr-generator') || isStudio || (files && files.length > 0)) && !hasResult;
  const shouldManageStageRouting = !disableStageRouting && !isDedicatedStudio;

  // Current stage: 'upload' | 'studio' | 'download'
  const currentStage = hasResult
    ? 'download'
    : (isStudioMode ? 'studio' : 'upload');

  // 1. Synchronize State to URL in Browser Address Bar
  useEffect(() => {
    if (!shouldManageStageRouting) return;

    const pathname = location.pathname.replace(/\/$/, '');
    const cleanBase = basePath.replace(/\/$/, '');

    if (currentStage === 'download') {
      const target = `${cleanBase}/download`;
      if (pathname !== target) {
        navigate(target);
      }
    } else if (currentStage === 'studio') {
      const target = `${cleanBase}/studio`;
      if (pathname !== target) {
        navigate(target);
      }
    } else if (currentStage === 'upload') {
      if (pathname.endsWith('/download')) {
        navigate(cleanBase, { replace: true });
      }
    }
  }, [currentStage, shouldManageStageRouting, basePath, location.pathname, navigate]);

  // 2. Synchronize Browser Navigation (Popstate / Back / Forward) to State
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (!shouldManageStageRouting) {
      prevPathnameRef.current = location.pathname;
      return;
    }

    const pathname = location.pathname.replace(/\/$/, '');
    const prevPath = prevPathnameRef.current ? prevPathnameRef.current.replace(/\/$/, '') : '';
    const cleanBase = basePath.replace(/\/$/, '');

    // User pressed Back on /download, landing on /studio
    if (prevPath === `${cleanBase}/download` && pathname === `${cleanBase}/studio` && hasResult) {
      if (onResetResult) {
        onResetResult();
      } else if (setResult) {
        setResult(null);
      }
      window.dispatchEvent(new CustomEvent('docscalar:reset-result', { detail: { toolId } }));
    }

    // User pressed Back on /studio, landing on /upload (base)
    if (prevPath === `${cleanBase}/studio` && (pathname === cleanBase || pathname === `${cleanBase}/upload`) && (files && files.length > 0)) {
      if (onReset) {
        onReset();
      } else if (setFiles) {
        setFiles([]);
      }
      window.dispatchEvent(new CustomEvent('docscalar:reset-files', { detail: { toolId } }));
    }

    prevPathnameRef.current = location.pathname;
  }, [location.pathname, shouldManageStageRouting, basePath, hasResult, files, onResetResult, setResult, onReset, setFiles, toolId]);

  // 3. Direct Visit Grace Period: allow asynchronous IndexedDB draft restoration before redirecting empty visits
  useEffect(() => {
    if (!shouldManageStageRouting) return;

    const pathname = location.pathname.replace(/\/$/, '');
    const cleanBase = basePath.replace(/\/$/, '');

    // Direct cold visit to /studio with no files loaded
    if (pathname === `${cleanBase}/studio` && (!files || files.length === 0) && !isStudio) {
      const timer = setTimeout(() => {
        if ((!files || files.length === 0) && !isStudio && window.location.pathname.replace(/\/$/, '') === `${cleanBase}/studio`) {
          navigate(cleanBase, { replace: true });
        }
      }, 600);
      return () => clearTimeout(timer);
    }

    // Direct cold visit to /download without a result
    if (pathname === `${cleanBase}/download` && !hasResult) {
      const timer = setTimeout(() => {
        if (!hasResult && window.location.pathname.replace(/\/$/, '') === `${cleanBase}/download`) {
          if (files && files.length > 0) {
            navigate(`${cleanBase}/studio`, { replace: true });
          } else {
            navigate(cleanBase, { replace: true });
          }
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [shouldManageStageRouting, basePath, location.pathname, files, isStudio, hasResult, navigate]);

  // Ingest files forwarded via location.state from guest modal / external routes
  useEffect(() => {
    if (setFiles && (!files || files.length === 0)) {
      if (location.state?.initialFiles && Array.isArray(location.state.initialFiles) && location.state.initialFiles.length > 0) {
        setFiles(location.state.initialFiles);
      } else if (location.state?.initialFile) {
        setFiles([location.state.initialFile]);
      }
    }
  }, [location.state, setFiles, files]);

  useEffect(() => {
    if (isStudioMode) {
      document.body.classList.add('studio-mode-active');
      if (document.documentElement) {
        document.documentElement.classList.add('studio-mode-active');
      }
      window.scrollTo(0, 0);
      if (typeof document !== 'undefined') {
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }

      // Hard prevent any background window scrolling during studio mode
      const preventWindowScroll = () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      };
      window.addEventListener('scroll', preventWindowScroll, { passive: true });

      return () => {
        document.body.classList.remove('studio-mode-active');
        if (document.documentElement) {
          document.documentElement.classList.remove('studio-mode-active');
        }
        window.removeEventListener('scroll', preventWindowScroll);
      };
    } else {
      document.body.classList.remove('studio-mode-active');
      if (document.documentElement) {
        document.documentElement.classList.remove('studio-mode-active');
      }
    }
  }, [isStudioMode]);

  if (isStudioMode) {
    return (
      <div className="studio-viewport w-full h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] overflow-hidden flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <GuestLimitModal />
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          canonical={canonicalUrl}
          schema={combinedSchemas}
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
              {minTier === 'pro' ? 'DocScalar Pro Feature' : 'Account Required'}
            </h2>
            <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
              {minTier === 'pro' 
                ? `The ${title} tool requires a DocScalar Pro subscription. Upgrade to access this feature along with unlimited parallel batch queues and 1 GB file limits.`
                : `The ${title} tool requires a free DocScalar account. Sign up in seconds to access advanced document utilities and high-speed conversion engines.`
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
    <div className={`tool-page w-full animate-in fade-in duration-500 ${toolId === 'resume-builder' ? '!max-w-full !p-0' : toolId === 'qr-generator' ? '!max-w-[1380px] !px-4 sm:!px-6 lg:!px-8' : ''}`}>
      <GuestLimitModal />
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={canonicalUrl}
        schema={combinedSchemas}
      />
      
      {!hideHeader && !hasResult && (
        <div className="tool-page-header group">
          <div className="tool-page-icon select-none flex items-center justify-center">
            <ToolIcon id={toolId} size={48} />
          </div>
          <h1 className="text-on-background">{title}</h1>
          <p className="tool-page-subtitle">{description}</p>
          {!isAuthenticated && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                guestQuota.remaining > 0
                  ? 'bg-primary/5 text-primary border-primary/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                <span className="material-symbols-outlined text-[15px]">
                  {guestQuota.remaining > 0 ? 'schedule' : 'lock_clock'}
                </span>
                <span>
                  {guestQuota.remaining > 0
                    ? `Guest Mode · ${guestQuota.remaining} of 3 free operations remaining today`
                    : 'Daily Guest Quota Reached · 0 of 3 operations remaining'}
                </span>
              </div>
            </div>
          )}
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
                  {f.name} ({formatFileSize(f.size)})
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
            {minTier === 'pro' ? 'DocScalar Pro Feature' : 'Account Required'}
          </h2>
          <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            {minTier === 'pro' 
              ? `The ${title} tool requires a DocScalar Pro subscription. Upgrade to access this feature along with unlimited parallel batch queues and 1 GB file limits.`
              : `The ${title} tool requires a free DocScalar account. Sign up in seconds to access advanced document utilities and high-speed conversion engines.`
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
      {!hideHeader && !isStudioMode && !hasResult && files.length === 0 && !['resume-builder', 'document-viewer', 'qr-generator'].includes(toolId) && (
        <ToolContentGuide seoData={seoData} />
      )}
      {!hideRelatedTools && !isStudioMode && !hasResult && files.length === 0 && !['resume-builder', 'document-viewer', 'qr-generator'].includes(toolId) && (
        <RelatedTools currentToolId={toolId} />
      )}
    </div>
  );
}
