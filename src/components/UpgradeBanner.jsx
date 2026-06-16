import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Upgrade CTA banner — shown to Free authenticated users only.
 * Hidden for guests (they see landing page CTAs instead)
 * and for Pro users (they already upgraded).
 */
export default function UpgradeBanner() {
  const { isAuthenticated, isPro } = useAuth();

  // Only show to logged-in Free users
  if (!isAuthenticated || isPro) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C] text-white rounded-xl p-6 md:p-8 shadow-lg border border-[#FDBA74]/30">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[28px] mt-0.5 fill">rocket_launch</span>
          <div>
            <h3 className="font-semibold text-lg mb-1">Unlock DocForge Pro</h3>
            <p className="text-white/90 text-sm leading-relaxed max-w-md">
              Batch processing, unlimited file history, priority conversion engine, and zero ads.
            </p>
          </div>
        </div>

        <Link
          to="/pricing"
          className="flex-shrink-0 bg-white text-[#EA580C] font-bold px-6 py-3 rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-colors shadow-md flex items-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-[18px] fill">workspace_premium</span>
          Upgrade Now
          <span className="text-[14px]">→</span>
        </Link>
      </div>
    </div>
  );
}
