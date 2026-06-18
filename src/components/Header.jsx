import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, TOOLS, getToolsByCategory } from '../utils/constants';
import ToolIcon from './ToolIcon';

const renderToolIcon = (tool, size = '16px') => {
  if (!tool.icon) return null;
  const isMaterialIcon = /^[a-z0-9_-]+$/i.test(tool.icon);
  if (!isMaterialIcon) {
    return <span style={{ fontSize: size }} className="select-none">{tool.icon}</span>;
  }
  return (
    <span className="material-symbols-outlined fill select-none" style={{ fontSize: size, color: tool.iconColor || 'inherit' }}>
      {tool.icon}
    </span>
  );
};

const pdfCategories = [
  {
    id: 'organize',
    title: 'Organize PDF',
    subtitle: 'Merge, split, remove, extract, and scan pages',
    icon: 'view_week',
    iconColor: 'hsl(0, 84%, 60%)',
    tools: getToolsByCategory('organize-pdf')
  },
  {
    id: 'optimize',
    title: 'Optimize PDF',
    subtitle: 'Compress, repair, and run server-side OCR',
    icon: 'compress',
    iconColor: 'hsl(220, 90%, 60%)',
    tools: getToolsByCategory('optimize-pdf')
  },
  {
    id: 'convert',
    title: 'Convert PDF',
    subtitle: 'Convert between PDF, Word, Excel, JPG, and HTML',
    icon: 'sync_alt',
    iconColor: 'hsl(142, 72%, 40%)',
    tools: [
      ...getToolsByCategory('convert-to-pdf'),
      ...getToolsByCategory('convert-from-pdf')
    ]
  },
  {
    id: 'security-ai',
    title: 'Security & Intelligence',
    subtitle: 'Protect, sign, redact, compare, and AI summarize',
    icon: 'shield',
    iconColor: 'hsl(270, 80%, 65%)',
    tools: [
      ...getToolsByCategory('pdf-security'),
      ...getToolsByCategory('pdf-intelligence')
    ]
  }
];

const imageAndUtilityTools = [
  ...TOOLS.filter(t => t.category === 'image' || t.category === 'utility')
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPro, userEmail, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Dropdown & Accordion states
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('organize');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleMouseEnter = (menu) => {
    if (timeoutId) clearTimeout(timeoutId);
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
    setTimeoutId(id);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [profileDropdownOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/' + targetId);
    } else {
      const el = document.getElementById(targetId.substring(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleCtaClick = () => {
    setMobileMenuOpen(false);
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  // Grouped mobile accordions matching new structure
  const mobileGroups = [
    { title: 'Organize PDF', id: 'organize-pdf', tools: getToolsByCategory('organize-pdf') },
    { title: 'Optimize PDF', id: 'optimize-pdf', tools: getToolsByCategory('optimize-pdf') },
    { 
      title: 'Convert PDF', 
      id: 'convert-pdf', 
      tools: [
        ...getToolsByCategory('convert-to-pdf'),
        ...getToolsByCategory('convert-from-pdf')
      ] 
    },
    { 
      title: 'Security & Intelligence', 
      id: 'security-ai', 
      tools: [
        ...getToolsByCategory('pdf-security'),
        ...getToolsByCategory('pdf-intelligence')
      ] 
    },
    { 
      title: 'Image & Utilities', 
      id: 'image-utility', 
      tools: imageAndUtilityTools 
    },
  ];

  return (
    <nav className={isPro 
      ? "bg-background/60 backdrop-blur-xl sticky top-0 left-0 w-full border-b border-outline-variant/30 shadow-sm z-50 transition-all duration-200"
      : "bg-surface-container-low/80 backdrop-blur-xl fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-container-max rounded-full border border-outline-variant/30 shadow-lg z-50 transition-all duration-200"
    }>
      <div className={isPro 
        ? "flex justify-between items-center gap-4 lg:gap-8 px-8 py-4 max-w-container-max mx-auto relative"
        : "flex justify-between items-center gap-4 lg:gap-8 px-6 py-3 relative"
      }>
        {/* Logo & Brand */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div 
            className="flex items-center gap-2 cursor-pointer select-none font-h2 text-h2 font-semibold text-primary tracking-tight"
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
          >
            <span className="material-symbols-outlined text-primary text-[26px] fill">description</span>
            <span className="text-on-background">Doc<span className="text-primary">Forge</span></span>
          </div>
          
          {/* Vertical Divider */}
          {isAuthenticated && (
            <div className="h-5 w-[1px] bg-outline-variant/60 hidden lg:block mx-1"></div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 font-body-md text-body-md">
          {/* Workspace / Home link */}
          <Link 
            className={`font-semibold pb-0.5 transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`} 
            to="/"
          >
            {isAuthenticated ? 'Workspace' : 'Home'}
          </Link>

          {/* PDF Tools Interactive Dropdown Trigger */}
          <div 
            className="relative py-2"
            onMouseEnter={() => handleMouseEnter('pdf-tools')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              onClick={() => {
                setActiveDropdown(null);
                navigate('/?category=pdf');
              }}
              className="flex items-center gap-1 font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
            >
              PDF Tools
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${activeDropdown === 'pdf-tools' ? 'rotate-180 text-primary' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>
            
            {/* Tabbed Mega Menu Dropdown */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[760px] transition-all duration-200 ${
              activeDropdown === 'pdf-tools' 
                ? 'opacity-100 translate-y-0 visible scale-100' 
                : 'opacity-0 translate-y-2 invisible scale-95 pointer-events-none'
            } z-50`}>
              <div 
                className="bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl mt-2 overflow-hidden flex h-[400px]"
                onMouseEnter={() => handleMouseEnter('pdf-tools')}
                onMouseLeave={handleMouseLeave}
              >
                {/* Left Categories Sidebar */}
                <div className="w-[300px] flex flex-col gap-1.5 p-4 border-r border-outline-variant/20 bg-surface-container-low/20">
                  {pdfCategories.map((cat) => (
                    <div
                      key={cat.id}
                      onMouseEnter={() => setActiveTab(cat.id)}
                      className={`flex items-start gap-3.5 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        activeTab === cat.id
                          ? 'bg-primary/10 border border-primary/20 text-primary shadow-[0_4px_16px_rgba(249,115,22,0.06)]'
                          : 'hover:bg-surface-container-high/40 border border-transparent text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] mt-0.5" style={{ color: cat.iconColor }}>
                        {cat.icon}
                      </span>
                      <div className="text-left min-w-0">
                        <h4 className={`text-xs font-bold leading-tight ${activeTab === cat.id ? 'text-primary' : 'text-on-background'}`}>
                          {cat.title}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant/70 leading-normal mt-0.5 truncate">
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Tools Panel */}
                <div className="flex-1 p-5 overflow-y-auto bg-surface-container-low/30 flex flex-col gap-4 text-left">
                  <div className="text-[11px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant/20 pb-1.5 select-none">
                    {pdfCategories.find(c => c.id === activeTab)?.title} Tools
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {pdfCategories.find(c => c.id === activeTab)?.tools.map((tool) => (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/10 transition-all duration-200 group group/item"
                      >
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
                          <ToolIcon id={tool.id} size={28} />
                        </div>
                        <div className="text-left min-w-0">
                          <h5 className="text-xs font-bold text-on-background group-hover/item:text-primary transition-colors leading-tight">
                            {tool.title}
                          </h5>
                          <p className="text-[10px] text-on-surface-variant/75 truncate mt-0.5 leading-normal">
                            {tool.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image & Utilities Dropdown Trigger */}
          <div 
            className="relative py-2"
            onMouseEnter={() => handleMouseEnter('image-utilities')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              onClick={() => {
                setActiveDropdown(null);
                navigate('/?category=image');
              }}
              className="flex items-center gap-1 font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
            >
              Image & Utilities
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${activeDropdown === 'image-utilities' ? 'rotate-180 text-primary' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>

            {/* Image & Utilities Dropdown Menu */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[380px] transition-all duration-200 ${
              activeDropdown === 'image-utilities' 
                ? 'opacity-100 translate-y-0 visible scale-100' 
                : 'opacity-0 translate-y-2 invisible scale-95 pointer-events-none'
            } z-50`}>
              <div 
                className="bg-surface border border-outline-variant/30 rounded-2xl p-4 shadow-2xl mt-2 flex flex-col gap-3"
                onMouseEnter={() => handleMouseEnter('image-utilities')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-[11px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant/20 pb-1.5 select-none">
                  Image & Utility Tools
                </div>
                <div className="flex flex-col gap-1">
                  {imageAndUtilityTools.map((tool) => (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/10 transition-all duration-200 group group/item"
                    >
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 select-none">
                        <ToolIcon id={tool.id} size={28} />
                      </div>
                      <div className="text-left min-w-0">
                        <h5 className="text-xs font-bold text-on-background group-hover/item:text-primary transition-colors leading-tight">
                          {tool.title}
                        </h5>
                        <p className="text-[10px] text-on-surface-variant/75 truncate mt-0.5 leading-normal">
                          {tool.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing / Dashboard link */}
          {isAuthenticated && (
            <Link 
              className={`font-semibold pb-0.5 transition-colors ${location.pathname === '/dashboard' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`} 
              to="/dashboard"
            >
              Dashboard
            </Link>
          )}
          {(!isAuthenticated || !isPro) && (
            <Link 
              className={`font-semibold pb-0.5 transition-colors ${location.pathname === '/pricing' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`} 
              to="/pricing"
            >
              Pricing
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button 
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-container-low transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* CTA Button / User Profile (Desktop) */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-outline-variant hover:bg-surface-container-high hover:text-primary flex items-center justify-center text-on-surface-variant transition-all select-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            <span className="material-symbols-outlined text-[20px] select-none">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Go Pro CTA button for Free logged in users */}
              {!isPro && (
                <button 
                  className="font-button text-xs btn-theme-primary px-4 py-2 rounded-lg shadow-sm flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handleCtaClick}
                >
                  Go Pro <span className="text-[12px]">→</span>
                </button>
              )}

              {/* User Profile Dropdown */}
              <div className="relative profile-dropdown-container">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-surface-container-high transition-all"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 uppercase select-none">
                    {userEmail ? userEmail[0] : 'U'}
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">
                    keyboard_arrow_down
                  </span>
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-56 bg-surface border border-outline-variant rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    {/* User Header Info */}
                    <div className="px-4 py-2 border-b border-outline-variant/60 flex flex-col gap-1">
                      <span className="text-[10px] font-label-mono text-outline uppercase tracking-wider font-bold">Account</span>
                      <span className="text-xs font-semibold text-on-background truncate">{userEmail}</span>
                      <div className="mt-1">
                        {isPro ? (
                          <span className="inline-flex items-center gap-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[10px] fill">workspace_premium</span>
                            PRO PLAN
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-outline-variant/30 border border-outline text-outline text-[9px] font-bold px-2 py-0.5 rounded-full">
                            FREE PLAN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      <Link
                        to="/"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                        Studio Workspace
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">dashboard</span>
                        Dashboard
                      </Link>
                    </div>

                    <div className="border-t border-outline-variant/60 my-1"></div>

                    {/* Sign Out */}
                    <div className="px-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/5 rounded-xl transition-all text-left"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-on-surface-variant hover:text-primary font-label-md text-label-md px-3 py-2 transition-all">
                Log In
              </Link>
              <button 
                className="font-button text-button btn-theme-primary px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-1"
                onClick={handleCtaClick}
              >
                Start Free <span className="text-[14px]">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 px-6 py-4 flex flex-col gap-3 rounded-b-2xl shadow-lg animate-in slide-in-from-top-2 max-h-[calc(100vh-120px)] overflow-y-auto">
          <Link 
            className={`font-semibold py-2 transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-on-surface-variant'}`} 
            to="/"
            onClick={() => setMobileMenuOpen(false)}
          >
            {isAuthenticated ? 'Workspace' : 'Home'}
          </Link>

          {isAuthenticated && (
            <Link 
              className={`font-semibold py-2 transition-colors ${location.pathname === '/dashboard' ? 'text-primary' : 'text-on-surface-variant'}`} 
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
          )}

          {(!isAuthenticated || !isPro) && (
            <Link 
              className={`font-semibold py-2 transition-colors ${location.pathname === '/pricing' ? 'text-primary' : 'text-on-surface-variant'}`} 
              to="/pricing"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
          )}

          {!isAuthenticated && (
            <a 
              className="font-semibold py-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              href="#features"
              onClick={(e) => handleNavClick(e, '#features')}
            >
              Features
            </a>
          )}

          {/* Grouped mobile accordions */}
          <div className="flex flex-col gap-1.5 border-t border-outline-variant/20 pt-2.5 mt-1">
            <div className="text-[11px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1 px-2">Tools by Category</div>
            {mobileGroups.map((group) => {
              const isExpanded = expandedCategory === group.id;
              return (
                <div key={group.id} className="border border-outline-variant/10 rounded-xl overflow-hidden bg-surface-container-low/30">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : group.id)}
                    className="flex justify-between items-center w-full px-4 py-3 text-left font-semibold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="text-sm">{group.title}</span>
                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : 'text-on-surface-variant/50'}`}>
                      expand_more
                    </span>
                  </button>
                  <div className={`transition-all duration-200 ${isExpanded ? 'max-h-[300px] opacity-100 py-2 border-t border-outline-variant/10 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
                    <div className="flex flex-col gap-1 px-2">
                      {group.tools.map(tool => (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setExpandedCategory(null);
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
                        >
                          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 select-none">
                            <ToolIcon id={tool.id} size={24} />
                          </div>
                          <span className="text-sm font-semibold">{tool.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-outline-variant pt-3 mt-1 flex flex-col gap-2">
            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className="font-button text-xs text-on-surface-variant hover:text-primary border border-outline-variant hover:border-primary px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 w-full select-none"
              aria-label="Toggle theme mode"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 py-1 px-1">
                  {isPro ? (
                    <span className="bg-primary/10 border border-primary/30 text-primary font-label-mono text-[11px] font-bold px-3 py-1 rounded-full">PRO</span>
                  ) : (
                    <span className="bg-outline-variant/30 border border-outline text-outline font-label-mono text-[11px] font-bold px-3 py-1 rounded-full">FREE</span>
                  )}
                  <span className="text-sm text-on-surface-variant font-medium">
                    {userEmail ? userEmail.split('@')[0] : 'User'}
                  </span>
                </div>
                {!isPro && (
                  <button 
                    className="font-button text-button bg-primary-container text-white px-5 py-2.5 rounded-lg hover:bg-[#FDBA74] transition-colors shadow-sm flex items-center justify-center gap-1 w-full"
                    onClick={handleCtaClick}
                  >
                    Go Pro <span className="text-[14px]">→</span>
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="font-button text-xs text-on-surface-variant hover:text-error border border-outline-variant hover:border-error px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                >
                  <span className="material-symbols-outlined text-[14px]">logout</span>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-on-surface-variant hover:text-primary font-semibold py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <button 
                  className="font-button text-button bg-primary-container text-white px-5 py-2.5 rounded-lg hover:bg-[#FDBA74] transition-colors shadow-sm flex items-center justify-center gap-1 w-full"
                  onClick={handleCtaClick}
                >
                  Start Free <span className="text-[14px]">→</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
