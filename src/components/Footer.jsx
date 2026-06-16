import { useNavigate, Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    const currentPath = window.location.pathname;
    
    if (currentPath !== '/') {
      // Navigate to home page first, then scroll after a short delay
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-surface-container-low border-t border-outline-variant w-full py-12 mt-auto z-10 text-left">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-6 max-w-container-max mx-auto">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4 font-h3 text-h3 font-semibold text-primary hover:opacity-80 transition-opacity w-fit">
            <span className="material-symbols-outlined text-primary text-[24px] fill">description</span>
            <span>DocForge</span>
          </Link>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6 leading-relaxed">
            © {currentYear} DocForge. Premium document solutions. All processing happens 100% locally in your browser. Your files never leave your device.
          </p>
        </div>
        <div className="col-span-1">
          <h4 className="font-label-mono text-label-mono text-outline uppercase tracking-wider mb-4">Security</h4>
          <div className="flex flex-col gap-3 font-body-sm text-[14px]">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              100% Local Processing
            </span>
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
              No File Uploads
            </span>
          </div>
        </div>
        <div className="col-span-1">
          <h4 className="font-label-mono text-label-mono text-outline uppercase tracking-wider mb-4">Navigate</h4>
          <div className="flex flex-col gap-3 font-body-sm text-[14px]">
            <a 
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
              href="#all-tools"
              onClick={(e) => handleSectionClick(e, 'all-tools')}
            >
              All Tools
            </a>
            <a 
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
              href="#features"
              onClick={(e) => handleSectionClick(e, 'features')}
            >
              Key Features
            </a>
            <Link 
              className="text-on-surface-variant hover:text-primary transition-colors" 
              to="/pricing"
            >
              Pricing
            </Link>
            <Link 
              className="text-on-surface-variant hover:text-primary transition-colors" 
              to="/login"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>

      {/* Back to Top */}
      <div className="max-w-container-max mx-auto px-6 mt-8 pt-6 border-t border-outline-variant flex justify-between items-center flex-wrap gap-4">
        <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-2 flex-wrap">
          <span>Built with privacy-first principles.</span>
          <span className="opacity-30">•</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="opacity-30">•</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </p>
        <button 
          onClick={scrollToTop}
          className="text-on-surface-variant hover:text-primary text-xs font-medium flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          Back to Top
        </button>
      </div>
    </footer>
  );
}
