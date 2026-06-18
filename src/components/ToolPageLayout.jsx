import { useAuth } from '../context/AuthContext';
import { getToolById } from '../utils/constants';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import TrustBar from './TrustBar';
import RelatedTools from './RelatedTools';
import ToolIcon from './ToolIcon';

export default function ToolPageLayout({ 
  toolId, 
  title, 
  description,
  headerContent,
  children 
}) {
  const { isAuthenticated, userTier } = useAuth();
  const navigate = useNavigate();
  
  const tool = getToolById(toolId);
  const minTier = tool?.minTier || 'guest';
  
  // A user is authorized if the tool is guest-level,
  // or if they have a free account and the tool is free-level,
  // or if they are pro (since pro overrides all).
  const isAuthorized = 
    minTier === 'guest' || 
    (minTier === 'free' && isAuthenticated) || 
    (minTier === 'pro' && isAuthenticated && userTier === 'pro');

  return (
    <div className="tool-page w-full animate-in fade-in duration-500">
      <Breadcrumb toolId={toolId} />
      
      <div className="tool-page-header group">
        <div className="tool-page-icon select-none flex items-center justify-center">
          <ToolIcon id={toolId} size={48} />
        </div>
        <h1 className="text-on-background">{title}</h1>
        <p className="tool-page-subtitle">{description}</p>
        <TrustBar />
        {headerContent}
      </div>

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
                  onClick={() => navigate('/')}
                  className="font-button text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-background px-5 py-2.5 rounded-lg transition-colors font-semibold"
                >
                  Back to Dashboard
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

      <RelatedTools currentToolId={toolId} />
    </div>
  );
}
