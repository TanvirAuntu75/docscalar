import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Replaced the old grey "Ad Placeholder" box with a real upgrade banner.
 * Shown to free/guest users as a CTA to upgrade.
 * Hidden for Pro users (they paid, no ads/banners needed).
 * 
 * The `format` prop is preserved for backwards compatibility with tool pages
 * that pass format="leaderboard" — it just controls the layout slightly.
 */
export default function AdPlaceholder({ format = 'rectangle' }) {
  const { isAuthenticated, isPro } = useAuth();

  // Pro users never see this, and never render inside full-screen studio workspaces
  if (isPro || (typeof document !== 'undefined' && document.body?.classList?.contains('studio-mode-active'))) {
    return null;
  }

  return (
    <div className={`upgrade-banner mt-10 md:mt-12 relative overflow-hidden bg-gradient-to-r from-[#1C1917] via-[#292524] to-[#1C1917] text-white rounded-xl shadow-md border border-[#44403C] ${
      format === 'leaderboard' ? 'p-5 md:p-6' : 'p-6 md:p-8'
    }`}>
      {/* Subtle accent glow */}
      <div className="absolute top-0 left-1/4 w-48 h-24 bg-primary/15 blur-3xl rounded-full pointer-events-none" />

      <div className={`relative z-10 flex items-center justify-between gap-4 ${
        format === 'leaderboard' ? 'flex-row' : 'flex-col md:flex-row'
      }`}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] fill flex-shrink-0">workspace_premium</span>
          <div>
            <p className="font-semibold text-sm text-white/95">
              {isAuthenticated 
                ? 'Upgrade to DocScalar Pro' 
                : 'Create a free account'}
            </p>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
              {isAuthenticated 
                ? 'Access batch processing, history logs and zero interruptions.' 
                : 'Track your conversions and access Pro features.'}
            </p>
          </div>
        </div>

        <Link 
          to={isAuthenticated ? '/pricing' : '/signup'} 
          className="flex-shrink-0 btn-theme-primary font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
        >
          {isAuthenticated ? 'View Plans' : 'Get Started'}
          <span className="text-[12px]">→</span>
        </Link>
      </div>
    </div>
  );
}
