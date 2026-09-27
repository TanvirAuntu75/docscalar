import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useInView,
  animate,
} from 'framer-motion';
import { FileType, Image as ImageIcon, Shield, SearchCode, Database, Cpu, Grid, FileText, Lock, CreditCard, Workflow } from "lucide-react";
import { TOOLS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { generateMarianaHtml } from '../engines/utility/templates/mariana';
import { generateOliviaHtml } from '../engines/utility/templates/olivia';
import { generateJonathanHtml } from '../engines/utility/templates/jonathan';
import { generateEmmaHtml } from '../engines/utility/templates/emma';
import { generateCharlesHtml } from '../engines/utility/templates/charles';
import { generateKathleenHtml } from '../engines/utility/templates/kathleen';
import { generateRichardHtml } from '../engines/utility/templates/richard';
import { generateSanchezDarkHtml } from '../engines/utility/templates/sanchez_dark';
import { generateWilsonLightHtml } from '../engines/utility/templates/wilson_light';
import { generateSanchezMonoHtml } from '../engines/utility/templates/sanchez_mono';
import { generateSanchezWaveHtml } from '../engines/utility/templates/sanchez_wave';
import { generateOngBurgundyHtml } from '../engines/utility/templates/ong_burgundy';
import { generateSchumacherCharcoalHtml } from '../engines/utility/templates/schumacher_charcoal';
import { generateZivOliveHtml } from '../engines/utility/templates/ziv_olive';
import { generateAdoraDiagonalHtml } from '../engines/utility/templates/adora_diagonal';
import { generateWilsonMinimalHtml } from '../engines/utility/templates/wilson_minimal';
import { generateAlvaradoSlateHtml } from '../engines/utility/templates/alvarado_slate';
import { StickyStack } from './StickyStack';

const MOCK_RESUME_DATA = {
  name: 'Mariana Anderson',
  title: 'Creative Marketing Specialist',
  photoUrl: '',
  photoCrop: { scale: 1, x: 0, y: 0 },
  email: 'hello@reallygreatsite.com',
  phone: '123-456-7890',
  location: 'New York, USA',
  website: 'reallygreatsite.com',
  linkedin: 'linkedin.com/in/mariana',
  summary: 'Brand Marketing Manager with over 6 years of experience directing digital advertising campaigns. Skilled in visual design, market research, SEO strategy, and clear copywriting.',
  experience: [
    {
      id: 'exp1',
      company: 'Borcelle Creative Agency',
      role: 'Branding Manager',
      start: '2022',
      end: 'Present',
      highlights: [
        'Led global digital brand revamps generating up to 140% increase in social traffic.',
        'Supervised 6 creative staff including designers, copywriters, and visual content producers.',
      ]
    },
    {
      id: 'exp2',
      company: 'Pixel Point Studios',
      role: 'Assistant Marketing Manager',
      start: '2019',
      end: '2022',
      highlights: [
        'Optimized search advertising expenditures, cutting operational client acquisition costs by 18%.',
      ]
    }
  ],
  education: [
    {
      id: 'edu1',
      school: 'University of Arts & Design',
      degree: 'Master of Brand Communication & Marketing',
      start: '2017',
      end: '2019',
    }
  ],
  skills: ['Brand Strategy', 'Product Placement', 'SEO & Analytics', 'UI/UX Wireframes', 'Creative Directing'],
  certifications: ['Certified Professional Brand Marketer (2024)'],
  projects: [
    {
      id: 'proj1',
      name: 'Campaign "Bloom"',
      description: 'Revitalized legacy customer engagement leading to 35k organic registrations.',
      url: 'borcelle.com/bloom'
    }
  ],
  references: [],
  customSections: []
};

const TEMPLATE_FUNCTIONS = {
  'Mariana': generateMarianaHtml,
  'Olivia': generateOliviaHtml,
  'Jonathan': generateJonathanHtml,
  'Emma': generateEmmaHtml,
  'Charles': generateCharlesHtml,
  'Kathleen': generateKathleenHtml,
  'Richard': generateRichardHtml,
  'Sanchez Dark': generateSanchezDarkHtml,
  'Wilson Light': generateWilsonLightHtml,
  'Sanchez Mono': generateSanchezMonoHtml,
  'Sanchez Wave': generateSanchezWaveHtml,
  'Ong Burgundy': generateOngBurgundyHtml,
  'Schumacher Charcoal': generateSchumacherCharcoalHtml,
  'Ziv Olive': generateZivOliveHtml,
  'Adora Diagonal': generateAdoraDiagonalHtml,
  'Wilson Minimal': generateWilsonMinimalHtml,
  'Alvarado Slate': generateAlvaradoSlateHtml,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Render tool icon — emoji string or Material Symbol name
const ToolChipIcon = ({ icon }) => {
  if (!icon) return null;
  if (/^[a-z][a-z0-9_]+$/.test(icon)) {
    return <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>;
  }
  return <span style={{ fontSize: 13 }}>{icon}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
// MICRO-COMPONENTS (All Framer Motion — no extra packages)
// ═══════════════════════════════════════════════════════════════════════════

// 1. FlipWords — animated word cycling with blur/scale fade (no clip, baseline-safe)
function FlipWords({ words, interval = 2800, className = '' }) {
  const [idx, setIdx] = useState(0);
  const [width, setWidth] = useState(null);
  const measureRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  useLayoutEffect(() => {
    if (measureRef.current) {
      const rect = measureRef.current.getBoundingClientRect();
      setWidth(Math.ceil(rect.width));
    }
  }, [idx]);

  return (
    <span
      className={`relative inline-block ${className}`}
      style={{
        verticalAlign: 'baseline',
        width: width ? `${width}px` : 'auto',
        transition: 'width 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
        overflow: 'visible',
      }}
    >
      {/* Invisible placeholder of the active word in the normal flow to establish baseline & measure width */}
      <span
        ref={measureRef}
        className="invisible select-none pointer-events-none inline-block whitespace-nowrap"
      >
        {words[idx]}
      </span>

      {/* Absolutely positioned container for the animated words */}
      <span className="absolute inset-0 flex items-center justify-start">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={words[idx]}
            initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.88, y: 4 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.88, y: -4 }}
            transition={{ duration: 0.42, ease: [0.25, 1, 0.5, 1] }}
            className="inline-block whitespace-nowrap"
            style={{
              color: 'var(--color-primary)',
              position: 'absolute',
              left: 0,
              top: 0,
            }}
          >
            {words[idx]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

// 2. TypewriterEffect — letter-by-letter reveal with blinking cursor
function TypewriterEffect({ text, speed = 20, className = '', delay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(delay === 0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const d = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(d);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(t); }
    }, speed);
    return () => clearInterval(t);
  }, [started, text, speed]);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block ml-px"
          style={{ width: 2, height: '0.9em', background: 'currentColor', verticalAlign: 'middle', display: 'inline-block' }}
        />
      )}
    </span>
  );
}

// 3. MovingBorder — conic gradient perimeter sweep button wrapper
function MovingBorder({ children, className = '', duration = 2200, onClick, style = {} }) {
  return (
    <div
      className={`relative p-[2px] rounded-2xl overflow-hidden cursor-pointer select-none ${className}`}
      onClick={onClick}
      style={style}
    >
      {/* Rotating conic gradient element */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            background: `conic-gradient(from 0deg, transparent 0deg, var(--color-primary) 90deg, var(--color-accent) 180deg, transparent 270deg)`,
            animation: `spin-border-div ${duration}ms linear infinite`,
          }}
        />
      </div>
      {/* Inner content surface */}
      <div
        className="relative z-10 rounded-[14px] flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
      >
        {children}
      </div>
    </div>
  );
}

// 4. GlareCard — mouse-tracked glare shimmer overlay
function GlareCard({ children, className = '' }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMove = useCallback((e) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden group ${className}`}
    >
      {/* Glare overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-300 rounded-inherit"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.07) 0%, transparent 55%)`,
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}

// 5. WaveText — staggered per-letter float wave (only when in view)
function WaveText({ text, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-40px' });
  const chars = text.split('');
  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden
          animate={isInView ? { y: [0, -10, 0] } : { y: 0 }}
          transition={{
            duration: 1.6,
            delay: i * 0.045,
            repeat: isInView ? Infinity : 0,
            repeatDelay: 4,
            ease: 'easeInOut',
          }}
          className="inline-block"
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  );
}

// 6. InfiniteMarquee — CSS-animation dual-direction infinite scroll
function InfiniteMarquee({ items, direction = 'left', speed = 30, className = '' }) {
  const navigate = useNavigate();
  const quadrupled = [...items, ...items, ...items, ...items];
  const cls = direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';
  return (
    <div
      className={`relative flex w-full items-center overflow-hidden py-3.5 group ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
    >
      <div
        className={`flex w-fit items-center py-1.5 ${cls} hover:[animation-play-state:paused]`}
        style={{ '--marquee-speed': `${speed}s` }}
      >
        {quadrupled.map((tool, i) => (
          <div
            key={`${tool.id}-${i}`}
            onClick={() => navigate(tool.path || `/${tool.id}`)}
            className="flex-shrink-0 mx-3 sm:mx-4 px-5 py-2.5 border rounded-2xl font-sans text-[12.5px] sm:text-[13.5px] font-semibold tracking-tight whitespace-nowrap shadow-sm cursor-pointer transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
            style={{
              background: 'var(--bg-glass)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(12px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.05)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(var(--color-primary-rgb), 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-glass)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  tool.category === 'organize-pdf' || tool.category === 'optimize-pdf' || tool.category === 'edit-pdf'
                    ? 'var(--color-primary)'
                    : tool.category === 'image'
                    ? 'var(--color-accent)'
                    : tool.category === 'pdf-security'
                    ? '#a855f7'
                    : '#3b82f6',
              }}
            />
            {tool.title}
          </div>
        ))}
      </div>
    </div>
  );
}

// 7. ShimmerCard — animated gradient border on hover
function ShimmerCard({ children, className = '', alwaysOn = false }) {
  return (
    <div className={`relative p-[1px] rounded-2xl overflow-hidden group h-full ${className}`}>
      {/* Base static subtle border */}
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'var(--border-subtle)', opacity: 0.5 }} aria-hidden />
      {/* Shimmer gradient border — shows on hover */}
      <div
        className="absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: alwaysOn ? 1 : 0,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent), var(--color-primary))',
          backgroundSize: '200% 200%',
          animation: 'shimmer-gradient 3s linear infinite',
        }}
        aria-hidden
      />
      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${alwaysOn ? '' : 'opacity-0 group-hover:opacity-100'}`}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent), var(--color-primary))',
          backgroundSize: '200% 200%',
          animation: 'shimmer-gradient 3s linear infinite',
        }}
        aria-hidden
      />
      {/* Inner card surface */}
      <div className="relative z-10 h-full rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  );
}

// 8. ParallaxOrbs — mouse-reactive ambient glow blobs
function ParallaxOrbs() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const x1 = useSpring(mouseX, { stiffness: 25, damping: 30 });
  const y1 = useSpring(mouseY, { stiffness: 25, damping: 30 });

  useEffect(() => {
    const onMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Primary orb — tracks mouse */}
      <motion.div
        style={{
          x: useSpring(useMotionValue(0), { stiffness: 20, damping: 20 }),
          y: useSpring(useMotionValue(0), { stiffness: 20, damping: 20 }),
          position: 'absolute',
          top: '-5%',
          left: '10%',
          width: 640,
          height: 640,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Accent orb — drifts independently */}
      <motion.div
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--color-accent-rgb), 0.12) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Subtle tint at bottom */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '25%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 50, 0], y: [0, -25, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  );
}

// 9. ScrollReveal — viewport-triggered slide-up entrance
function ScrollReveal({ children, delay = 0, y = 24, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 10. CascadeTextHover — split text letters with cascading translate transitions on hover
function CascadeTextHover({ text, className = '', style = {} }) {
  const characters = text.split('');
  return (
    <span
      className={`relative inline-flex flex-wrap cursor-pointer group select-none overflow-hidden ${className}`}
      style={{ verticalAlign: 'baseline', ...style }}
    >
      <span className="flex flex-wrap">
        {characters.map((char, i) => (
          <span
            key={i}
            className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-[110%] group-hover:opacity-0"
            style={{ transitionDelay: `${i * 12}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
      <span className="absolute inset-0 flex flex-wrap pointer-events-none">
        {characters.map((char, i) => (
          <span
            key={i}
            className="inline-block translate-y-[110%] opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100"
            style={{ transitionDelay: `${i * 12}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    </span>
  );
}

// 11. TiltCard — BeUI 3D perspective mouse-tilt card wrapper
function TiltCard({ children, className = '', style = {} }) {
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(y, { stiffness: 100, damping: 18 });
  const rotateY = useSpring(x, { stiffness: 100, damping: 18 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    const clientX = e.clientX - r.left;
    const clientY = e.clientY - r.top;
    
    const xc = (clientX / w) - 0.5;
    const yc = (clientY / h) - 0.5;

    x.set(xc * 14);
    y.set(-yc * 14);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
        rotateX,
        rotateY,
        ...style,
      }}
      className={`will-change-transform ${className}`}
    >
      <div style={{ transform: 'translateZ(10px)', transformStyle: 'preserve-3d' }} className="h-full">
        {children}
      </div>
    </motion.div>
  );
}

// 12. FloatingDecorations — randomly distributed floating background indicators
function FloatingDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[12%] left-[8%] text-on-background opacity-5"
      >
        <FileType size={110} />
      </motion.div>
      <motion.div
        animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[35%] right-[10%] text-on-background opacity-5"
      >
        <ImageIcon size={90} />
      </motion.div>
      <motion.div
        animate={{ y: [0, -25, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[20%] left-[15%] text-on-background opacity-5"
      >
        <Shield size={75} />
      </motion.div>
      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-[25%] right-[20%] text-on-background opacity-5"
      >
        <SearchCode size={85} />
      </motion.div>
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-[18%] right-[25%] text-on-background opacity-5"
      >
        <Database size={65} />
      </motion.div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const FLIP_WORDS = ['PDFs', 'Images', 'Documents', 'Spreadsheets', 'Resumes', 'Archives'];

const BENTO_FEATURES = [
  {
    id: 'pdf',
    title: 'Everything for Documents',
    subtitle: 'Convert · Edit · Secure · Organize · Analyze',
    desc: 'Whatever you need to do with a document, DocScalar does it — instantly, securely, without long queues or complex setups.',
    icon: 'auto_awesome',
    span: 'md:col-span-2',
    accent: 'var(--color-primary)',
    accentRgb: '66,247,97',
  },
  {
    id: 'canvas',
    title: 'Visual Workflow Studio',
    subtitle: 'Chain · Connect · Execute',
    desc: 'Build complex document pipelines by connecting operations visually. The recursive engine resolves the entire chain in one click.',
    icon: 'hub',
    span: 'md:col-span-1',
    accent: 'var(--color-accent)',
    accentRgb: '255,127,28',
  },
  {
    id: 'smart-crop',
    title: 'Smart Scanning & Cropper',
    subtitle: 'Detect · Auto-Crop · Enhance',
    desc: 'Intelligently detect scan borders, eliminate dark photocopy margins, and auto-align physical documents with pixel precision.',
    icon: 'crop',
    span: 'md:col-span-1',
    accent: '#06b6d4',
    accentRgb: '6,182,212',
  },
  {
    id: 'resume',
    title: 'Resume and CV Studio',
    subtitle: 'Design · Preview · Export',
    desc: 'Create clean professional resumes with live preview, custom photo support, and one-click ATS friendly PDF export.',
    icon: 'workspace_premium',
    span: 'md:col-span-1',
    accent: 'var(--color-accent)',
    accentRgb: '255,127,28',
  },
  {
    id: 'privacy',
    title: 'Enterprise-Grade Security',
    subtitle: 'Encrypted · Private · Automatic Purge',
    desc: 'Encrypted file transfer in transit. Files are processed securely in isolated memory and automatically purged immediately after download.',
    icon: 'shield',
    span: 'md:col-span-2',
    accent: 'var(--color-primary)',
    accentRgb: '66,247,97',
  },
];

const PRIVACY_CARDS = [
  {
    icon: 'lock',
    title: 'Secure Transit Encryption',
    desc: 'All operations execute over secure encrypted connections. File streams are processed in transient secure memory and never exposed.',
    accent: 'var(--color-primary)',
    accentRgb: '66,247,97',
  },
  {
    icon: 'timer',
    title: 'Automatic File Purging',
    desc: 'Uploaded documents and converted outputs are automatically purged from processing instances immediately upon completion.',
    accent: 'var(--color-accent)',
    accentRgb: '255,127,28',
  },
  {
    icon: 'vpn_lock',
    title: 'Zero Content Retention',
    desc: 'We never store, inspect, or log your document content. What you convert remains 100% private to you.',
    accent: '#a78bfa',
    accentRgb: '167,139,250',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How are my files handled during processing?',
    a: 'DocScalar processes documents securely over encrypted connections. Files are held in transient isolated workers only for the duration of the conversion, after which they are automatically purged. We never store or log your file content.',
  },
  {
    q: 'What is the Studio Canvas workspace?',
    a: 'The Studio Canvas is a visual node-based workspace at the /canvas route. You can drag documents onto the canvas, connect conversion and editing nodes, and execute the entire pipeline with one click.',
  },
  {
    q: 'What are the file size limits per plan?',
    a: 'Guest visitors can process files up to 10MB (3 free operations per day). Free registered accounts get 15MB per file with unlimited daily document operations and saved history. Pro subscribers get 1GB file limits, high-concurrency pipelines, unlimited Smart Cropping, and complete studio access.',
  },
  {
    q: 'How does the Smart Cropper and scan detection work?',
    a: 'Our Smart Cropper automatically analyzes document boundaries, detecting dark borders and skewed margins from scanned files and physical pages to give you crisp, clean page framing.',
  },
  {
    q: 'Do I need an account to use DocScalar?',
    a: 'No. You can start converting and editing files immediately as a guest with full access to standard tools and the Studio Canvas.',
  },
  {
    q: 'Is my content used to train AI models?',
    a: 'No. DocScalar never uses your documents or personal data to train AI models. Processing is private, isolated, and auto-purged.',
  },
];

const RESUME_TEMPLATES = [
  { name: 'Mariana', displayName: 'Executive Corporate Navy', desc: 'Modern deep navy layout for professional corporate profiles.', shade1: '#1e3a5f', shade2: '#0f2144' },
  { name: 'Olivia', displayName: 'Warm Amber Editorial', desc: 'Warm amber editorial layout for writers and creative experts.', shade1: '#92400e', shade2: '#78350f' },
  { name: 'Jonathan', displayName: 'Sleek Developer Slate', desc: 'Sleek dark slate minimalist layout optimized for developers.', shade1: '#27272a', shade2: '#18181b' },
  { name: 'Emma', displayName: 'Creative Rosewood Serif', desc: 'Creative rosewood serif layout for designers and visual artists.', shade1: '#9f1239', shade2: '#881337' },
  { name: 'Charles', displayName: 'Steel Executive', desc: 'Corporate steel template tailored for executive positions.', shade1: '#475569', shade2: '#334155' },
  { name: 'Kathleen', displayName: 'Lavender Academic', desc: 'Soft lavender academic layout designed for CVs and researchers.', shade1: '#581c87', shade2: '#3b0764' },
  { name: 'Richard', displayName: 'Classic Business Indigo', desc: 'Indigo classic layout for general business professions.', shade1: '#312e81', shade2: '#1e1b4b' },
  { name: 'Sanchez Dark', displayName: 'Charcoal Grid Compact', desc: 'Charcoal theme layout with high density content grids.', shade1: '#1c1917', shade2: '#0c0a09' },
  { name: 'Wilson Light', displayName: 'Classical Editorial Light', desc: 'Elegant light layout with crisp, clean classical typography.', shade1: '#d8dee9', shade2: '#e5e9f0' },
  { name: 'Sanchez Mono', displayName: 'Developer Monospace Timeline', desc: 'Clean monospace coding developer layout for technical cvs.', shade1: '#0f172a', shade2: '#020617' },
  { name: 'Sanchez Wave', displayName: 'Pacific Wave Blue', desc: 'Pacific blue template featuring a wave style header.', shade1: '#075985', shade2: '#0c4a6e' },
  { name: 'Ong Burgundy', displayName: 'Plum Burgundy Premium', desc: 'Rich plum luxury header layout for premium presentation.', shade1: '#701a75', shade2: '#4a044e' },
  { name: 'Schumacher Charcoal', displayName: 'Minimalist Charcoal Stone', desc: 'Charcoal minimal builder with clean, structured margins.', shade1: '#292524', shade2: '#1c1917' },
  { name: 'Ziv Olive', displayName: 'Forest Olive Organic', desc: 'Organic forest olive layout for design and branding specialists.', shade1: '#3f6212', shade2: '#365314' },
  { name: 'Adora Diagonal', displayName: 'Teal Creative Diagonal', desc: 'Teal creative layout featuring dynamic diagonal accents.', shade1: '#155e75', shade2: '#164e63' },
  { name: 'Wilson Minimal', displayName: 'Pure Minimalist Light', desc: 'Minimal layout stripped of heavy lines or visual clutter.', shade1: '#e2e8f0', shade2: '#cbd5e1' },
  { name: 'Alvarado Slate', displayName: 'Split Column Slate', desc: 'Geometric slate gray layout with split block columns.', shade1: '#334155', shade2: '#1e293b' },
];

// 13. Resume3DCarousel — Framer Motion Coverflow Carousel
function Resume3DCarousel({ templates, navigate }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Memoize generated HTML for all carousel templates once to avoid re-running generators on every render
  const templateHtmlMap = useMemo(() => {
    const map = {};
    templates.forEach((tpl) => {
      const generateHtml = TEMPLATE_FUNCTIONS[tpl.name];
      if (generateHtml) {
        try {
          const customData = {
            ...MOCK_RESUME_DATA,
            personalInfo: {
              ...MOCK_RESUME_DATA.personalInfo,
              name: tpl.displayName || tpl.name,
            }
          };
          map[tpl.name] = generateHtml(customData);
        } catch (e) {
          console.error(e);
          map[tpl.name] = '';
        }
      }
    });
    return map;
  }, [templates]);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % templates.length);
  }, [templates.length]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + templates.length) % templates.length);
  }, [templates.length]);

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold) {
      next();
    } else if (info.offset.x > swipeThreshold) {
      prev();
    }
  };

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      next();
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, activeIndex, next]);

  return (
    <div className="relative w-full max-w-7xl mx-auto py-10 flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        .cv-iframe-container { transform: scale(0.377); }
        @media (min-width: 768px) { .cv-iframe-container { transform: scale(0.5037); } }
      `}</style>
      
      {/* 3D Track Container with precise hover listeners */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full flex items-center justify-center h-[600px]" 
        style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="relative flex items-center justify-center w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence initial={false}>
            {templates.map((tpl, idx) => {
              const offset = idx - activeIndex;
              let displayOffset = offset;
              if (offset < -templates.length / 2) {
                displayOffset = offset + templates.length;
              } else if (offset > templates.length / 2) {
                displayOffset = offset - templates.length;
              }

              const absOffset = Math.abs(displayOffset);
              if (absOffset > 2) return null; // Render only 5 nearest templates

              const isCenter = displayOffset === 0;
              const cvHtml = templateHtmlMap[tpl.name] || '';

              return (
                <motion.div
                  key={tpl.name}
                  animate={{
                    rotateY: displayOffset * -25,
                    z: -absOffset * 100,
                    x: displayOffset * 120,
                    scale: isCenter ? 1 : 0.8,
                    opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.2,
                    zIndex: 50 - absOffset,
                  }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute w-[300px] md:w-[400px] h-[450px] md:h-[550px] rounded-2xl p-1 bg-white shadow-2xl border border-orange-900/10 overflow-hidden cursor-pointer select-none"
                  onClick={() => {
                    if (displayOffset === 0) {
                      navigate('/resume-builder');
                    } else {
                      setActiveIndex(idx);
                    }
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-white relative flex justify-center">
                    {cvHtml ? (
                      <div className="absolute top-0 left-0 origin-top-left cv-iframe-container" style={{ width: '794px', height: '1123px' }}>
                        <iframe
                          srcDoc={cvHtml}
                          title={tpl.name}
                          loading="lazy"
                          className="w-full h-full border-0 pointer-events-none select-none bg-white"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                        Template Error
                      </div>
                    )}
                    {/* Glass overlay shield to block mouse clicks inside the iframe */}
                    <div className="absolute inset-0 z-30 bg-transparent cursor-pointer" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* active card text description */}
      <div className="text-center mt-6 h-12 max-w-md px-6">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {templates[activeIndex]?.displayName || templates[activeIndex]?.name} Design
        </h3>
        <p className="text-xs mt-1 leading-normal" style={{ color: 'var(--text-secondary)' }}>
          {templates[activeIndex]?.desc}
        </p>
      </div>

      {/* Swatch indicator dot trail in the center, arrow scrollers are gone */}
      <div className="flex items-center gap-1.5 mt-4 z-20 max-w-[200px] overflow-hidden">
        {templates.map((_, i) => (
          <div
            key={i}
            onClick={() => setActiveIndex(i)}
            className="h-1.5 rounded-full cursor-pointer transition-all duration-300 shrink-0"
            style={{
              width: i === activeIndex ? 18 : 6,
              background: i === activeIndex ? 'var(--color-primary)' : 'var(--border-medium)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 8. StudioCanvasSection — Real DocScalar Studio Canvas UI & Cinematic Interactive Simulation
function StudioCanvasSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });

  const handleOpenCanvas = () => {
    if (isAuthenticated) {
      navigate('/canvas');
    } else {
      navigate('/signup', { state: { from: { pathname: '/canvas' } } });
    }
  };

  // Animation Step States:
  // 0: Empty Canvas (Upload Card)
  // 1: Cursor Clicks Upload
  // 2: OS File Picker Opens & Clicks Open
  // 3: Files Spawn on Canvas
  // 4: Camera Zooms In to Bottom Chatbox
  // 5: Typewriter Prompt Typing
  // 6: Cursor Clicks Send
  // 7: Camera Zooms Out (AI Planning)
  // 8: Operators & Flow Cables Spawn & Process
  // 9: Pipeline Completed (Output Node Ready)
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [typedText, setTypedText] = useState('');

  const PROMPT_TARGET = "Merge both documents and compress to under 2MB";

  // Animation Timeline Controller
  useEffect(() => {
    if (!isInView || isPaused) return;

    let timeoutId;

    if (step === 0) {
      setTypedText('');
      timeoutId = setTimeout(() => setStep(1), 800);
    } else if (step === 1) {
      // Cursor glides to Upload button and hovers
      timeoutId = setTimeout(() => setStep(2), 700);
    } else if (step === 2) {
      // Cursor clicks Upload button smoothly
      timeoutId = setTimeout(() => setStep(3), 350);
    } else if (step === 3) {
      // File picker modal opens, cursor glides to Open (2 Files)
      timeoutId = setTimeout(() => setStep(4), 700);
    } else if (step === 4) {
      // Cursor clicks Open (2 Files) smoothly
      timeoutId = setTimeout(() => setStep(5), 350);
    } else if (step === 5) {
      // Files land on canvas with bounce
      timeoutId = setTimeout(() => setStep(6), 850);
    } else if (step === 6) {
      // Camera zooms in, cursor moves to chatbox and clicks to focus
      timeoutId = setTimeout(() => setStep(7), 750);
    } else if (step === 7) {
      // Typewriter effect
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        charIdx++;
        setTypedText(PROMPT_TARGET.slice(0, charIdx));
        if (charIdx >= PROMPT_TARGET.length) {
          clearInterval(typeInterval);
          timeoutId = setTimeout(() => setStep(8), 400);
        }
      }, 35);
      return () => {
        clearInterval(typeInterval);
        clearTimeout(timeoutId);
      };
    } else if (step === 8) {
      // Cursor glides to the Send button
      timeoutId = setTimeout(() => setStep(9), 650);
    } else if (step === 9) {
      // Cursor clicks the Send button smoothly
      timeoutId = setTimeout(() => {
        setTypedText(''); // Clear input upon command submission
        setStep(10);
      }, 350);
    } else if (step === 10) {
      // Camera zooms out + AI planning banner pulses
      timeoutId = setTimeout(() => setStep(11), 1300);
    } else if (step === 11) {
      // Operators and flow cables execute
      timeoutId = setTimeout(() => setStep(12), 1600);
    } else if (step === 12) {
      // Hold result for 4.5 seconds, then loop
      timeoutId = setTimeout(() => {
        setStep(0);
      }, 4500);
    }

    return () => clearTimeout(timeoutId);
  }, [isInView, step, isPaused]);

  // Restart animation handler
  const handleRestart = () => {
    setStep(0);
    setTypedText('');
    setIsPaused(false);
  };

  const canvasViewportRef = useRef(null);
  const uploadBtnRef = useRef(null);
  const realFileInputRef = useRef(null);
  const filePickerBtnRef = useRef(null);
  const chatInputRef = useRef(null);
  const sendBtnRef = useRef(null);
  const downloadBtnRef = useRef(null);

  const handleRealUploadClick = () => {
    if (realFileInputRef.current) {
      realFileInputRef.current.click();
    }
  };

  const handleRealFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (isAuthenticated) {
        navigate('/canvas', { state: { initialFiles: Array.from(files) } });
      } else {
        navigate('/signup', { state: { from: { pathname: '/canvas' }, initialFiles: Array.from(files) } });
      }
    }
  };

  const [cursorPos, setCursorPos] = useState({ x: '58%', y: '28%' });

  // Clean cursor state mapped per step without distracting floating text badges
  const cursorMap = useMemo(() => ({
    0: { clicked: false },
    1: { clicked: false },
    2: { clicked: true },
    3: { clicked: false },
    4: { clicked: true },
    5: { clicked: false },
    6: { clicked: true },
    7: { clicked: false },
    8: { clicked: false },
    9: { clicked: true },
    10: { clicked: false },
    11: { clicked: false },
    12: { clicked: false },
  }), []);

  const activeCursor = cursorMap[step] || cursorMap[0];
  const isZoomedIn = step >= 6 && step <= 9;

  // Dynamically track exact button coordinates across responsive screens and camera zoom
  useEffect(() => {
    const updatePosition = () => {
      if (!canvasViewportRef.current) return;
      const vRect = canvasViewportRef.current.getBoundingClientRect();

      let targetEl = null;
      if (step === 1 || step === 2) targetEl = uploadBtnRef.current;
      else if (step === 3 || step === 4) targetEl = filePickerBtnRef.current;
      else if (step === 6 || step === 7) targetEl = chatInputRef.current;
      else if (step === 8 || step === 9) targetEl = sendBtnRef.current;
      else if (step === 12) targetEl = downloadBtnRef.current;

      if (targetEl) {
        const tRect = targetEl.getBoundingClientRect();
        // Position cursor tip directly on button center
        const xPx = `${Math.round(tRect.left - vRect.left + tRect.width / 2)}px`;
        const yPx = `${Math.round(tRect.top - vRect.top + tRect.height / 2)}px`;
        setCursorPos(prev => {
          if (prev.x === xPx && prev.y === yPx) return prev;
          return { x: xPx, y: yPx };
        });
      } else {
        const fallbacks = {
          0: { x: '58%', y: '28%' },
          5: { x: '42%', y: '45%' },
          10: { x: '72%', y: '50%' },
          11: { x: '56%', y: '42%' },
        };
        const fb = fallbacks[step] || { x: '50%', y: '50%' };
        setCursorPos(prev => {
          if (prev.x === fb.x && prev.y === fb.y) return prev;
          return fb;
        });
      }
    };

    updatePosition();
    const timers = [
      setTimeout(updatePosition, 60),
      setTimeout(updatePosition, 200),
      setTimeout(updatePosition, 450),
      setTimeout(updatePosition, 750),
    ];
    window.addEventListener('resize', updatePosition);
    return () => {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', updatePosition);
    };
  }, [step, isZoomedIn]);

  return (
    <section
      id="canvas"
      ref={sectionRef}
      className="py-20 px-6 sm:px-8 max-w-[1400px] mx-auto"
      style={{ scrollMarginTop: 120 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* ── Left Column: Clean Enterprise Highlights (Zero AI Slop) ── */}
        <ScrollReveal className="flex flex-col gap-6 lg:col-span-4 text-left">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Design Document Pipelines Visually
          </h2>

          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Orchestrate multistep document operations on an intuitive visual canvas. Connect files to specialized processing tools, build automated pipelines, or trigger workflows with natural language instructions.
          </p>

          <ul className="flex flex-col gap-5 my-2">
            {[
              ['tune', 'Automated Format Alignment', 'Seamlessly bridges document formats between PDF, Word, and Excel without requiring manual conversions.'],
              ['verified_user', 'Pipeline Validation & Safeguards', 'Ensures type compatibility between tools and prevents configuration errors before operations begin.'],
              ['account_tree', 'Parallel Workflow Execution', 'Chains multiple operations including merging, OCR, and compression into unified high performance processing pipelines.'],
              ['sync_saved_locally', 'Browser State Persistence', 'Canvas layouts, document queues, and parameter configurations remain safely saved across your sessions.'],
            ].map(([icon, title, desc]) => (
              <li key={title} className="flex items-start gap-3 text-left">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    background: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{title}</span>
                  <span className="text-[11px] leading-relaxed opacity-80" style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                </div>
              </li>
            ))}
          </ul>

          <motion.button
            onClick={handleOpenCanvas}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="self-start flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold cursor-pointer border-none select-none shadow-md transition-all duration-300 text-white mt-2"
            style={{
              background: '#f97316',
            }}
          >
            <span>Open Studio Canvas Workspace</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </motion.button>
        </ScrollReveal>

        {/* ── Right Column: Interactive Canvas Cinematic Simulation ── */}
        <ScrollReveal delay={0.15} className="lg:col-span-8 w-full">
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border transition-colors duration-300 bg-white dark:bg-[#0f141c]"
            style={{
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Real Canvas Window Chrome Header */}
            <div
              className="px-4 py-2.5 border-b flex items-center justify-between gap-3 select-none"
              style={{
                background: 'var(--bg-glass)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] font-bold tracking-tight opacity-90 hidden sm:inline-block" style={{ color: 'var(--text-primary)' }}>
                  DocScalar Studio Canvas
                </span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#f97316] flex items-center justify-center cursor-pointer transition-colors bg-white/50 dark:bg-slate-900/50"
                  title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
                >
                  <span className="material-symbols-outlined text-[15px]">{isPaused ? 'play_arrow' : 'pause'}</span>
                </button>

                <button
                  onClick={handleRestart}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#f97316] flex items-center justify-center cursor-pointer transition-colors bg-white/50 dark:bg-slate-900/50"
                  title="Restart Simulation"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                </button>
              </div>
            </div>

            {/* Canvas Surface with Scaled Dynamic Viewport & Camera Zoom */}
            <div ref={canvasViewportRef} className="relative w-full aspect-[16/9] min-h-[380px] overflow-hidden">
              {/* Dot Grid Layer matching real StitchCanvas (.stitch-dot-grid) */}
              <div
                className="absolute inset-0 pointer-events-none stitch-dot-grid"
                style={{
                  backgroundPosition: '0px 0px',
                }}
              />

              {/* CAMERA VIEWPORT WRAPPER: Zooms into chatbox on step 4-6, zooms out on step 7 */}
              <motion.div
                animate={{
                  scale: isZoomedIn ? 1.45 : 1,
                  y: isZoomedIn ? -32 : 0,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative w-full h-full origin-bottom"
              >
                {/* 1. Empty State Card (Visible on Step 0, 1, 2) matching StitchCanvas.jsx:7108 */}
                <AnimatePresence>
                  {step < 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                      className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-10"
                    >
                      <div className="w-[320px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-[#161c28]/90 backdrop-blur-md p-5 text-center flex flex-col items-center justify-center gap-2.5 shadow-xl pointer-events-auto select-none">
                        <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] flex-shrink-0">
                          <span className="material-symbols-outlined text-[22px]">upload_file</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Your Workspace Canvas is empty</h4>
                          <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-medium">
                            Drop documents anywhere on the grid or click below to start.
                          </p>
                        </div>
                        <motion.button
                          ref={uploadBtnRef}
                          onClick={handleRealUploadClick}
                          animate={{
                            scale: step === 2 ? 0.98 : 1,
                            backgroundColor: step === 2 ? '#ea580c' : '#f97316',
                            boxShadow: step === 2
                              ? '0 1px 4px rgba(249, 115, 22, 0.3)'
                              : '0 2px 8px rgba(249, 115, 22, 0.2)',
                          }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="relative px-4 py-2 rounded-xl font-bold text-[11px] shadow-sm text-white transition-colors cursor-pointer mt-1 select-none"
                        >
                          <span>Upload Documents</span>
                        </motion.button>
                        <input
                          ref={realFileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.docx,.xlsx,.pptx,.txt"
                          className="hidden"
                          onChange={handleRealFileChange}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 2. Authentic Windows 11 Desktop Open Dialog (Visible on Step 3 & 4) */}
                <AnimatePresence>
                  {(step === 3 || step === 4) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.2 } }}
                      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 pointer-events-none"
                    >
                      <div className="w-[620px] max-w-[98%] rounded-lg bg-[#191919] border border-[#2d2d2d] shadow-2xl overflow-hidden flex flex-col pointer-events-auto select-none font-sans text-[#e5e5e5]">
                        {/* Windows 11 Title Bar */}
                        <div className="h-8 px-2.5 bg-[#202020] border-b border-[#2d2d2d] flex items-center justify-between select-none">
                          <div className="flex items-center gap-2">
                            {/* Authentic Chrome Logo SVG */}
                            <svg width="15" height="15" viewBox="0 0 48 48" className="shrink-0" fill="none">
                              <path fill="#4CAF50" d="M44,24c0,11.045-8.955,20-20,20S4,35.045,4,24S12.955,4,24,4S44,12.955,44,24z"/>
                              <path fill="#FBC02D" d="M43.911,22.428L24.524,24l-6.495,11.25L4.542,28.847C7.625,37.801,15.772,44,24,44 c11.045,0,20-8.955,20-20C44,23.47,43.969,22.944,43.911,22.428z"/>
                              <path fill="#E53935" d="M4.542,28.847L18.029,24l6.495-11.25L42.234,14.65C38.65,8.196,31.825,4,24,4 C12.955,4,4,12.955,4,24C4,25.662,4.204,27.276,4.542,28.847z"/>
                              <path fill="#FBC02D" d="M43.911,22.428C43.32,15.545,38.65,9.657,32.32,6.973L24.524,24l5.657,9.799 C36.938,32.793,42.541,28.21,43.911,22.428z"/>
                              <path fill="#E53935" d="M32.32,6.973C29.835,5.064,27.026,4,24,4C14.735,4,6.916,10.334,4.542,18.847L18.029,24 l6.495-11.25L32.32,6.973z"/>
                              <circle cx="24" cy="24" r="10" fill="#FFFFFF"/>
                              <circle cx="24" cy="24" r="7.5" fill="#1976D2"/>
                            </svg>
                            <span className="text-[12px] font-normal text-white">Open</span>
                          </div>
                          <div className="flex items-center h-full text-[#cccccc]">
                            <div className="w-11 h-8 flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-default" title="Minimize">
                              <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
                            </div>
                            <div className="w-11 h-8 flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-default" title="Maximize">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
                            </div>
                            <div className="w-11 h-8 flex items-center justify-center hover:bg-[#c42b1c] hover:text-white transition-colors cursor-default" title="Close">
                              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><path d="M1 1L9 9M9 1L1 9" /></svg>
                            </div>
                          </div>
                        </div>

                        {/* Navigation & Address Bar */}
                        <div className="px-2.5 py-1.5 bg-[#202020] border-b border-[#2d2d2d] flex items-center gap-2 text-[11px]">
                          <div className="flex items-center text-[#cccccc] gap-0.5">
                            <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.08] cursor-default">
                              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                            </div>
                            <div className="w-6 h-6 rounded flex items-center justify-center text-[#555555] cursor-default">
                              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                            </div>
                            <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.08] cursor-default">
                              <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                            </div>
                          </div>
                          {/* Breadcrumb Path Pill */}
                          <div className="flex-1 h-6 px-2 rounded bg-[#2b2b2b] border border-[#383838] flex items-center justify-between text-[#cccccc] text-[10.5px]">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[13px] text-amber-400">folder</span>
                              <span className="text-[#666666]">›</span>
                              <span className="hover:text-white cursor-default">Downloads</span>
                              <span className="text-[#666666]">›</span>
                              <span className="text-white font-medium flex items-center gap-1 hover:bg-white/[0.06] px-1 py-0.5 rounded cursor-default">
                                Documents
                                <span className="text-[7.5px] text-[#888888]">▾</span>
                              </span>
                            </div>
                            <div className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/[0.08] cursor-default">
                              <span className="material-symbols-outlined text-[11px] text-[#888888] hover:text-white">refresh</span>
                            </div>
                          </div>
                          {/* Search Box */}
                          <div className="w-40 h-6 px-2 rounded bg-[#2b2b2b] border border-[#383838] flex items-center justify-between text-[#888888] text-[10px]">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] opacity-70">search</span>
                              <span className="opacity-60 truncate">Search Documents</span>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Command Bar */}
                        <div className="h-6 px-2.5 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center justify-between text-[10px] text-[#cccccc]">
                          <div className="flex items-center gap-2">
                            <div className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] cursor-default flex items-center gap-1">
                              <span>Organize</span>
                              <span className="text-[8px] text-[#888888]">▾</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] cursor-default flex items-center gap-1">
                              <span>New folder</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[#888888]">
                            <span className="material-symbols-outlined text-[12px] hover:text-white cursor-default">view_list</span>
                            <span className="material-symbols-outlined text-[12px] hover:text-white cursor-default">preview</span>
                            <span className="material-symbols-outlined text-[12px] hover:text-white cursor-default">help</span>
                          </div>
                        </div>

                        {/* Windows 11 Two-Pane Explorer Body */}
                        <div className="flex h-[175px] overflow-hidden bg-[#191919]">
                          {/* Left Navigation Tree (Sidebar) */}
                          <div className="w-[145px] shrink-0 bg-[#1e1e1e] border-r border-[#2d2d2d] py-1.5 px-1 flex flex-col gap-0.5 text-[10px] text-[#cccccc] overflow-y-auto">
                            <div className="px-1 text-[9px] font-semibold text-[#888888] flex items-center gap-1">
                              <span>▾</span>
                              <span className="truncate">Tanvir Personal</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-blue-400">desktop_windows</span>
                              <span>Desktop</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-teal-400">download</span>
                              <span>Downloads</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.08] text-white font-medium cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-amber-400">folder</span>
                              <span>Documents</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-blue-400">image</span>
                              <span>Pictures</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-pink-400">music_note</span>
                              <span>Music</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-purple-400">movie</span>
                              <span>Videos</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#2b2b2b] text-[#aaaaaa] cursor-default">
                              <span className="material-symbols-outlined text-[12px] text-amber-400">folder</span>
                              <span>ocr data</span>
                            </div>
                            <div className="px-1 pt-1 text-[9px] font-semibold text-[#888888] flex items-center gap-1">
                              <span>▸</span>
                              <span className="truncate">This PC</span>
                            </div>
                          </div>

                          {/* Right Main File List */}
                          <div className="flex-1 flex flex-col min-w-0 bg-[#191919]">
                            {/* Column Headers */}
                            <div className="grid grid-cols-12 px-2.5 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[8.5px] text-[#888888] font-normal select-none">
                              <div className="col-span-5">Name</div>
                              <div className="col-span-3">Date modified</div>
                              <div className="col-span-2">Type</div>
                              <div className="col-span-2 text-right">Size</div>
                            </div>
                            {/* File Rows with Windows 11 Grouping */}
                            <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-0.5 text-[9.5px]">
                              {/* Group: Yesterday */}
                              <div className="px-1.5 pt-0.5 pb-0 text-[8.5px] text-[#888888] font-semibold flex items-center gap-1">
                                <span>▾</span> <span>Yesterday</span>
                              </div>

                              {/* Row 1: Selected PDF */}
                              <div className="grid grid-cols-12 px-2 py-1 rounded bg-white/[0.09] border border-white/[0.15] text-white font-medium items-center">
                                <div className="col-span-5 flex items-center gap-1.5 truncate">
                                  <span className="w-3.5 h-3.5 rounded bg-red-600 text-white font-bold text-[6.5px] flex items-center justify-center shrink-0">PDF</span>
                                  <span className="truncate">annual_report_2024.pdf</span>
                                </div>
                                <div className="col-span-3 text-[#aaaaaa] text-[8.5px]">9/19/2026 11:09 AM</div>
                                <div className="col-span-2 text-[#aaaaaa] text-[8.5px] truncate">Chrome PDF Docu...</div>
                                <div className="col-span-2 text-right text-[#aaaaaa] text-[8.5px]">4,210 KB</div>
                              </div>

                              {/* Row 2: Selected DOCX */}
                              <div className="grid grid-cols-12 px-2 py-1 rounded bg-white/[0.09] border border-white/[0.15] text-white font-medium items-center">
                                <div className="col-span-5 flex items-center gap-1.5 truncate">
                                  <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white font-bold text-[6.5px] flex items-center justify-center shrink-0">W</span>
                                  <span className="truncate">appendix_tables.docx</span>
                                </div>
                                <div className="col-span-3 text-[#aaaaaa] text-[8.5px]">9/19/2026 11:09 AM</div>
                                <div className="col-span-2 text-[#aaaaaa] text-[8.5px] truncate">Microsoft Word Doc...</div>
                                <div className="col-span-2 text-right text-[#aaaaaa] text-[8.5px]">1,840 KB</div>
                              </div>

                              {/* Row 3: Unselected DOCX */}
                              <div className="grid grid-cols-12 px-2 py-0.5 rounded text-[#cccccc] hover:bg-[#252525] items-center">
                                <div className="col-span-5 flex items-center gap-1.5 truncate">
                                  <span className="w-3.5 h-3.5 rounded bg-blue-600/80 text-white font-bold text-[6.5px] flex items-center justify-center shrink-0">W</span>
                                  <span className="truncate">readme.docx</span>
                                </div>
                                <div className="col-span-3 text-[#888888] text-[8.5px]">9/19/2026 10:42 AM</div>
                                <div className="col-span-2 text-[#888888] text-[8.5px] truncate">Microsoft Word Doc...</div>
                                <div className="col-span-2 text-right text-[#888888] text-[8.5px]">662 KB</div>
                              </div>

                              {/* Group: Earlier this year */}
                              <div className="px-1.5 pt-1 pb-0 text-[8.5px] text-[#888888] font-semibold flex items-center gap-1">
                                <span>▾</span> <span>Earlier this year</span>
                              </div>

                              {/* Row 4: Unselected PDF */}
                              <div className="grid grid-cols-12 px-2 py-0.5 rounded text-[#cccccc] hover:bg-[#252525] items-center">
                                <div className="col-span-5 flex items-center gap-1.5 truncate">
                                  <span className="w-3.5 h-3.5 rounded bg-red-600/80 text-white font-bold text-[6.5px] flex items-center justify-center shrink-0">PDF</span>
                                  <span className="truncate">ocr_test_handwritten.pdf</span>
                                </div>
                                <div className="col-span-3 text-[#888888] text-[8.5px]">6/28/2026 9:51 AM</div>
                                <div className="col-span-2 text-[#888888] text-[8.5px] truncate">Chrome PDF Docu...</div>
                                <div className="col-span-2 text-right text-[#888888] text-[8.5px]">2,851 KB</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Windows 11 Bottom Dialog Controls Bar */}
                        <div className="px-3 py-2 bg-[#202020] border-t border-[#2d2d2d] flex flex-col gap-1.5 text-[10px] relative">
                          {/* File Name Row */}
                          <div className="flex items-center gap-2">
                            <span className="w-16 text-[#cccccc] text-right shrink-0 text-[10px]">File name:</span>
                            <div className="flex-1 h-5 px-2 bg-[#2b2b2b] border border-[#3d3d3d] rounded text-white text-[9.5px] flex items-center justify-between truncate">
                              <span className="truncate">"annual_report_2024.pdf" "appendix_tables.docx"</span>
                              <span className="text-[8px] text-[#888888] shrink-0 ml-1">▾</span>
                            </div>
                            <div className="w-40 h-5 px-2 bg-[#2b2b2b] border border-[#3d3d3d] rounded text-[#cccccc] text-[9.5px] flex items-center justify-between shrink-0">
                              <span className="truncate">Custom Files (*.pdf;*.docx)</span>
                              <span className="text-[8px] text-[#888888]">▾</span>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex items-center justify-end gap-2 pt-0.5">
                            {/* Split Open Button */}
                            <motion.button
                              ref={filePickerBtnRef}
                              animate={{
                                scale: step === 4 ? 0.98 : 1,
                                backgroundColor: step === 4 ? '#ea580c' : '#333333',
                                borderColor: step === 4 ? '#ea580c' : '#4d4d4d',
                              }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="h-6 rounded bg-[#333333] border border-[#4d4d4d] flex items-center overflow-hidden cursor-pointer shadow-2xs hover:bg-[#3d3d3d]"
                            >
                              <span className="px-3.5 h-full flex items-center justify-center text-white font-medium text-[10.5px]">
                                <span>Open</span>
                              </span>
                              <div className="w-[1px] h-3.5 bg-[#4d4d4d]" />
                              <span className="px-1.5 h-full flex items-center justify-center text-[8px] text-[#aaaaaa] hover:bg-white/10">
                                ▾
                              </span>
                            </motion.button>
                            <button
                              type="button"
                              className="h-6 px-3.5 rounded bg-[#2b2b2b] border border-[#3d3d3d] text-[#cccccc] text-[10.5px] hover:bg-[#333333] cursor-default font-medium"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Window Corner Resize Grip */}
                          <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-1 right-1 opacity-30 pointer-events-none">
                            <circle cx="6.5" cy="1.5" r="0.6" fill="#cccccc" />
                            <circle cx="6.5" cy="4" r="0.6" fill="#cccccc" />
                            <circle cx="6.5" cy="6.5" r="0.6" fill="#cccccc" />
                            <circle cx="4" cy="4" r="0.6" fill="#cccccc" />
                            <circle cx="4" cy="6.5" r="0.6" fill="#cccccc" />
                            <circle cx="1.5" cy="6.5" r="0.6" fill="#cccccc" />
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. Vector SVG Cables Layer (Spawns on Step 8 & 9) */}
                <svg
                  className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                  viewBox="0 0 1140 420"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g>
                    {/* Cable 1: Node 1 -> Merge PDF */}
                    {step >= 11 && (
                      <path
                        d="M 250 110 C 305 110, 305 188, 360 188"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={step === 11 ? "stitch-cable-active" : ""}
                      />
                    )}
                    {/* Cable 2: Node 2 -> Merge PDF */}
                    {step >= 11 && (
                      <path
                        d="M 250 270 C 305 270, 305 188, 360 188"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={step === 11 ? "stitch-cable-active" : ""}
                      />
                    )}
                    {/* Cable 3: Merge PDF -> Compress PDF */}
                    {step >= 11 && (
                      <path
                        d="M 520 188 L 590 188"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={step === 11 ? "stitch-cable-active" : ""}
                      />
                    )}
                    {/* Cable 4: Compress PDF -> Output Node */}
                    {step >= 12 && (
                      <path
                        d="M 750 188 L 830 188"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Port Terminal Connection Anchors (Wired directly to cable endpoints) */}
                    {step >= 5 && (
                      <>
                        {/* Node 1 Output Port Terminal */}
                        <circle cx="250" cy="110" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Node 2 Output Port Terminal */}
                        <circle cx="250" cy="270" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                      </>
                    )}
                    {step >= 11 && (
                      <>
                        {/* Merge PDF Input Port */}
                        <circle cx="360" cy="188" r="5" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Merge PDF Output Port */}
                        <circle cx="520" cy="188" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Compress PDF Input Port */}
                        <circle cx="590" cy="188" r="5" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Compress PDF Output Port */}
                        <circle cx="750" cy="188" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                      </>
                    )}
                    {step >= 12 && (
                      <>
                        {/* Output Node Input Port */}
                        <circle cx="830" cy="188" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                      </>
                    )}
                  </g>

                  {/* Document Node 1 (Placed on Step 5+) */}
                  {step >= 5 && (
                    <foreignObject x="30" y="78" width="220" height="64" className="overflow-visible">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        style={{ width: '220px', height: '64px' }}
                        className="relative w-full h-full rounded-2xl select-none stitch-node flex flex-col justify-center cursor-pointer z-20 transition-all duration-200"
                      >
                        {/* Ordinal Badge #1 */}
                        <div className="absolute -top-2.5 -left-2.5 z-40 flex items-center justify-center pointer-events-none">
                          <span
                            className="rounded-full flex items-center justify-center font-black text-[10px] select-none border"
                            style={{
                              width: '22px',
                              height: '22px',
                              backgroundColor: 'rgba(249, 115, 22, 0.15)',
                              borderColor: '#f97316',
                              color: '#f97316',
                              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.22)',
                              borderWidth: '1.5px',
                            }}
                          >
                            1
                          </span>
                        </div>
                        {/* Output Port Dot */}
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />

                        {/* Card Body */}
                        <div className="flex items-center gap-3 px-3 py-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm select-none bg-red-600 text-white">
                            PDF
                          </div>
                          <div className="flex flex-col min-w-0 flex-grow text-left">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-normal">
                              annual_report_2024.pdf
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">4.2 MB</span>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-[#f97316] flex items-center justify-center flex-shrink-0 mr-1 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </div>
                        </div>
                      </motion.div>
                    </foreignObject>
                  )}

                  {/* Document Node 2 (Placed on Step 5+) */}
                  {step >= 5 && (
                    <foreignObject x="30" y="238" width="220" height="64" className="overflow-visible">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        style={{ width: '220px', height: '64px' }}
                        className="relative w-full h-full rounded-2xl select-none stitch-node flex flex-col justify-center cursor-pointer z-20 transition-all duration-200"
                      >
                        {/* Ordinal Badge #2 */}
                        <div className="absolute -top-2.5 -left-2.5 z-40 flex items-center justify-center pointer-events-none">
                          <span
                            className="rounded-full flex items-center justify-center font-black text-[10px] select-none border"
                            style={{
                              width: '22px',
                              height: '22px',
                              backgroundColor: 'rgba(249, 115, 22, 0.15)',
                              borderColor: '#f97316',
                              color: '#f97316',
                              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.22)',
                              borderWidth: '1.5px',
                            }}
                          >
                            2
                          </span>
                        </div>
                        {/* Output Port Dot */}
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />

                        {/* Card Body */}
                        <div className="flex items-center gap-3 px-3 py-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm select-none bg-blue-600 text-white">
                            W
                          </div>
                          <div className="flex flex-col min-w-0 flex-grow text-left">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-normal">
                              appendix_tables.docx
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">1.8 MB</span>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-[#f97316] flex items-center justify-center flex-shrink-0 mr-1 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </div>
                        </div>
                      </motion.div>
                    </foreignObject>
                  )}

                  {/* Operator 1: Merge PDF (Spawns on Step 11+) */}
                  {step >= 11 && (
                    <foreignObject x="360" y="140" width="160" height="96" className="overflow-visible">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`relative w-[160px] rounded-xl select-none stitch-node flex flex-col p-3 items-center justify-center text-center cursor-pointer z-20 transition-all duration-200 ${
                          step === 11
                            ? 'border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.25)]'
                            : 'border-[#f97316] bg-[#f97316]/5 shadow-[0_0_20px_rgba(249,115,22,0.12)]'
                        }`}
                      >
                        {/* Floating Timer Badge */}
                        {step === 11 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold shadow-md bg-[#f97316] text-white animate-pulse">
                            <span className="material-symbols-outlined text-[11px] animate-spin">progress_activity</span>
                            <span>0.2s</span>
                          </div>
                        )}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600 border border-white dark:border-[#111827] shadow-sm z-30" />
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />

                        <div className="w-8 h-8 rounded-full bg-[#f97316]/10 flex items-center justify-center mb-1 text-[#f97316] flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px]">join_inner</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 capitalize">
                          Merge PDF
                        </h4>
                        <span className="text-[8px] font-mono text-[#f97316] font-bold mt-0.5 select-none">
                          {step === 11 ? 'MERGING...' : 'COMPLETED'}
                        </span>
                      </motion.div>
                    </foreignObject>
                  )}

                  {/* Operator 2: Compress PDF (Spawns on Step 11+) */}
                  {step >= 11 && (
                    <foreignObject x="590" y="140" width="160" height="96" className="overflow-visible">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`relative w-[160px] rounded-xl select-none stitch-node flex flex-col p-3 items-center justify-center text-center cursor-pointer z-20 transition-all duration-200 ${
                          step === 11
                            ? 'border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.25)]'
                            : 'border-[#f97316] bg-[#f97316]/5 shadow-[0_0_20px_rgba(249,115,22,0.12)]'
                        }`}
                      >
                        {/* Floating Timer Badge */}
                        {step === 11 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold shadow-md bg-[#f97316] text-white animate-pulse">
                            <span className="material-symbols-outlined text-[11px] animate-spin">progress_activity</span>
                            <span>0.4s</span>
                          </div>
                        )}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600 border border-white dark:border-[#111827] shadow-sm z-30" />
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />

                        <div className="w-8 h-8 rounded-full bg-[#f97316]/10 flex items-center justify-center mb-1 text-[#f97316] flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px]">compress</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 capitalize">
                          Compress PDF
                        </h4>
                        <span className="text-[8px] font-mono text-[#f97316] font-bold mt-0.5 select-none">
                          {step === 11 ? 'OPTIMIZING...' : 'COMPLETED'}
                        </span>
                      </motion.div>
                    </foreignObject>
                  )}

                  {/* Output Node (Appears on Step 12) */}
                  {step >= 12 && (
                    <foreignObject x="830" y="132" width="220" height="112" className="overflow-visible">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className="relative w-[220px] rounded-2xl select-none stitch-node flex flex-col cursor-pointer z-20 transition-all duration-200"
                      >
                        {/* Ordinal Badge #3 */}
                        <div className="absolute -top-2.5 -left-2.5 z-40 flex items-center justify-center pointer-events-none">
                          <span
                            className="rounded-full flex items-center justify-center font-black text-[10px] select-none border"
                            style={{
                              width: '22px',
                              height: '22px',
                              backgroundColor: 'rgba(249, 115, 22, 0.08)',
                              borderColor: 'rgba(249, 115, 22, 0.5)',
                              color: '#f97316',
                              boxShadow: '0 1px 4px rgba(249, 115, 22, 0.12)',
                              borderWidth: '1.5px',
                            }}
                          >
                            3
                          </span>
                        </div>
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f97316] border border-white dark:border-[#111827] shadow-sm z-30" />

                        {/* Card Body */}
                        <div className="flex items-center gap-3 p-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm select-none bg-red-600 text-white">
                            PDF
                          </div>
                          <div className="flex flex-col min-w-0 flex-grow text-left">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-normal">
                              annual_report_merged_compressed.pdf
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">1.4 MB</span>
                              <span className="text-[7.5px] font-extrabold bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] px-1 py-0.5 rounded leading-none">
                                -76%
                              </span>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-[#f97316] flex items-center justify-center flex-shrink-0 mr-1 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                          </div>
                          <div className="w-5 h-5 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center flex-shrink-0 opacity-60">
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </div>
                        </div>

                        {/* Dynamic Action Download Section */}
                        <div className="px-3 pb-3 border-t border-slate-200/60 dark:border-slate-800/60 pt-2 flex flex-col gap-1.5">
                          <motion.button
                            ref={downloadBtnRef}
                            animate={{
                              scale: step === 12 ? 1.02 : 1,
                              borderColor: step === 12 ? '#f97316' : undefined,
                              color: step === 12 ? '#f97316' : undefined,
                              boxShadow: step === 12 ? '0 1px 4px rgba(249, 115, 22, 0.15)' : 'none',
                            }}
                            transition={{ duration: 0.15 }}
                            className="w-full py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[10px] font-bold transition-all bg-slate-100/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer shadow-sm select-none"
                          >
                            <span className="material-symbols-outlined text-[12px]">download</span>
                            <span>Download</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    </foreignObject>
                  )}
                </svg>

                {/* 4. AI Planning Thinking Overlay (Visible during Step 10) */}
                <AnimatePresence>
                  {step === 10 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    >
                      <div className="px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#161c28]/95 border border-[#f97316]/30 shadow-2xl flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[16px] text-[#f97316] animate-spin">progress_activity</span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 font-mono">
                          Planning DAG: Merge PDF → Compress PDF...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 5. Bottom Stitch Chat Command Input Bar matching StitchCanvas.jsx:7164 */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-[560px] px-3">
                  <div
                    className={`relative w-full rounded-2xl glass-widget border shadow-xl p-2 flex items-center gap-2 transition-all duration-300 ${
                      isZoomedIn
                        ? 'border-[#f97316] shadow-[0_0_24px_rgba(249,115,22,0.25)]'
                        : 'border-slate-200/80 dark:border-slate-800/80'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px]">terminal</span>
                    </div>
                    <div
                      ref={chatInputRef}
                      className="flex-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100 flex items-center overflow-hidden min-h-[22px]"
                    >
                      {typedText ? (
                        <span>
                          {typedText}
                          {step === 7 && <span className="inline-block w-1.5 h-3.5 bg-[#f97316] ml-0.5 animate-pulse" />}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10.5px]">
                          Describe workflow, e.g. 'Merge both files and compress'...
                        </span>
                      )}
                    </div>
                    <motion.button
                      ref={sendBtnRef}
                      animate={{
                        scale: step === 9 ? 0.96 : 1,
                        backgroundColor: step === 9 ? '#ea580c' : '#f97316',
                        boxShadow: step === 9
                          ? '0 1px 4px rgba(249, 115, 22, 0.3)'
                          : '0 2px 8px rgba(249, 115, 22, 0.25)',
                      }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="relative w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-sm flex-shrink-0 cursor-pointer select-none"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* 6. Realistic Animated Virtual Cursor */}
              <motion.div
                animate={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  scale: activeCursor.clicked ? 0.95 : 1,
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute pointer-events-none z-50 -translate-x-1 -translate-y-1"
              >
                {/* SVG Pointer Arrow */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
                  <path
                    d="M4.5 2.5L19.5 12L12 14.5L8.5 21.5L4.5 2.5Z"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>

          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}


export default function LandingPage({
  onUploadClick,
  isDragging,
  onDropFile,
  onDragOver,
  onDragEnter,
  onDragLeave,
  isAuthenticated = false,
  isPro = false,
}) {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [activeSec, setActiveSec] = useState('tools');

  // Build marquee rows from TOOLS
  const pdfRow = TOOLS.filter(t => t.category.includes('pdf') || t.category.includes('convert'));
  const otherRow = TOOLS.filter(t => t.category === 'image' || t.category === 'utility');

  const NAV_SECTIONS = [
    { name: 'Engine', id: 'tools', icon: Cpu },
    { name: 'Features', id: 'features', icon: Grid },
    { name: 'Studio Canvas', id: 'canvas', icon: Workflow },
    { name: 'CV Studio', id: 'resume', icon: FileText },
    { name: 'Privacy', id: 'privacy', icon: Lock },
    { name: 'Pricing', id: 'pricing', icon: CreditCard },
  ];

  const scrollTo = (id) => {
    setActiveSec(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Intersection tracking for tubelight nav
  useEffect(() => {
    const opts = { threshold: 0.25 };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSec(e.target.id); });
    }, opts);
    NAV_SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []); // eslint-disable-line

  // Particles for CTA section (stable refs)
  const particles = useRef(
    Array.from({ length: 28 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      isGreen: Math.random() > 0.5,
      dur: 3 + Math.random() * 5,
      del: Math.random() * 4,
    }))
  ).current;

  return (
    <div className="relative w-full overflow-x-clip" style={{ color: 'var(--text-primary)' }}>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 sm:px-8 pt-24 pb-16 overflow-hidden">
        <ParallaxOrbs />
        <FloatingDecorations />

        {/* Dot grid — theme-adaptive with smooth radial fade mask */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 hero-dot-grid" 
          style={{
            maskImage: 'radial-gradient(ellipse 75% 75% at 50% 40%, black 20%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 40%, black 20%, transparent 85%)'
          }}
          aria-hidden 
        />

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-6 text-center">

          {/* H1 with FlipWords — block spans ensure correct line wrapping at all sizes */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.03em] leading-[1.1]"
          >
            <span className="block">Work on your <FlipWords words={FLIP_WORDS} /></span>
            <span className="block" style={{ color: 'var(--text-primary)' }}>faster and more securely</span>
          </motion.h1>

          {/* Typewriter subheading */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="text-base sm:text-lg font-medium max-w-2xl leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <TypewriterEffect
              text="DocScalar delivers 38+ professional document tools, a visual Studio Canvas, and intelligent AI processing — fast, encrypted, and production-ready."
              speed={18}
              delay={700}
            />
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <MovingBorder onClick={() => navigate(isAuthenticated ? '/workspace' : '/signup')} duration={5000}>
              {isAuthenticated ? 'Go to Workspace' : 'Start for Free'}
            </MovingBorder>

            <motion.button
              onClick={() => navigate(isAuthenticated ? '/canvas' : '/signup', { state: { from: { pathname: '/canvas' } } })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold cursor-pointer select-none transition-all duration-300"
              style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.background = 'rgba(var(--color-accent-rgb), 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)';
                e.currentTarget.style.background = 'var(--bg-glass)';
              }}
            >
              <Workflow className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
              Open Studio Canvas
            </motion.button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pt-6 mt-2 w-full max-w-xl"
          >
            {[['38+', 'Doc Tools'], ['∞', 'Possibilities'], ['100%', 'Encrypted'], ['0s', 'Queue Latency']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>{val}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Premium Upload Drop Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[700px] mt-14"
        >
          {/* Outer glow halo — always visible and theme-matching */}
          <div
            className="absolute inset-0 rounded-[28px] pointer-events-none"
            style={{
              boxShadow: isDragging
                ? '0 0 0 2px var(--color-primary), 0 0 60px rgba(var(--color-primary-rgb), 0.25)'
                : '0 0 40px rgba(var(--color-primary-rgb), 0.08)',
              transition: 'box-shadow 0.35s ease',
            }}
            aria-hidden
          />

          {/* Rotating border beam */}
          <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none" aria-hidden>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '200%',
                height: '200%',
                background: isDragging
                  ? `conic-gradient(from 0deg, transparent 0deg, var(--color-primary) 120deg, var(--color-accent) 200deg, transparent 280deg)`
                  : `conic-gradient(from 0deg, transparent 0deg, var(--border-medium) 80deg, transparent 160deg)`,
                animation: 'spin-border-div 3.5s linear infinite',
                transition: 'background 0.3s',
              }}
            />
          </div>

          {/* Inner card surface — 1.5px inset from beam */}
          <div
            onClick={onUploadClick}
            onDrop={onDropFile}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            className="relative rounded-[26px] cursor-pointer select-none m-[1.5px] overflow-hidden transition-colors duration-300 group/drop"
            style={{
              padding: '60px 48px',
              background: isDragging
                ? 'rgba(var(--color-primary-rgb), 0.08)'
                : 'var(--bg-card)',
              backdropFilter: 'blur(28px)',
            }}
          >
            {/* Technical grid pattern background inside the card */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
              style={{
                backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />

            {/* Corner brackets */}
            {[
              { cls: 'top-4 left-4' },
              { cls: 'top-4 right-4' },
              { cls: 'bottom-4 left-4' },
              { cls: 'bottom-4 right-4' },
            ].map(({ cls }, i) => (
              <div
                key={i}
                className={`absolute w-6 h-6 ${cls} transition-all duration-400 group-hover/drop:scale-105`}
                style={{
                  borderStyle: 'solid',
                  borderWidth: 0,
                  ...(i === 0 && { borderTopWidth: 2, borderLeftWidth: 2 }),
                  ...(i === 1 && { borderTopWidth: 2, borderRightWidth: 2 }),
                  ...(i === 2 && { borderBottomWidth: 2, borderLeftWidth: 2 }),
                  ...(i === 3 && { borderBottomWidth: 2, borderRightWidth: 2 }),
                  borderColor: isDragging ? 'var(--color-primary)' : 'var(--border-medium)',
                  borderRadius: 4,
                }}
              />
            ))}

            <div className="flex flex-col items-center gap-6 text-center relative z-10">
              {/* Icon with concentric pulse rings */}
              <div className="relative flex items-center justify-center w-24 h-24">
                {/* Ring 1 */}
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 84, height: 84, border: '1.5px solid rgba(var(--color-primary-rgb), 0.25)' }}
                  animate={isDragging
                    ? { scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }
                    : { scale: [1, 1.5, 1.5], opacity: [0.35, 0, 0] }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                />
                {/* Ring 2 */}
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 84, height: 84, border: '1.5px solid rgba(var(--color-primary-rgb), 0.15)' }}
                  animate={isDragging
                    ? { scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }
                    : { scale: [1, 1.8, 1.8], opacity: [0.2, 0, 0] }
                  }
                  transition={{ duration: 2.2, delay: 0.7, repeat: Infinity, ease: 'easeOut' }}
                />

                {/* Icon box - Multi-layered glass capsule */}
                <motion.div
                  animate={isDragging
                    ? { rotate: [0, -8, 8, 0] }
                    : { y: [0, -4, 0] }
                  }
                  transition={isDragging
                    ? { duration: 0.4, repeat: Infinity }
                    : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                  }
                  className="relative w-20 h-20 rounded-[22px] flex items-center justify-center z-10 transition-all duration-300"
                  style={{
                    background: 'rgba(var(--color-primary-rgb), 0.04)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                    boxShadow: '0 8px 32px rgba(var(--color-primary-rgb), 0.06), inset 0 0 12px rgba(var(--color-primary-rgb), 0.05)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 36, color: 'var(--color-primary)' }}
                  >
                    {isDragging ? 'file_download' : 'cloud_upload'}
                  </span>
                </motion.div>
              </div>

              <div>
                <motion.p
                  animate={isDragging ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
                  className="text-lg font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {isDragging ? 'Release to launch...' : 'Drop any file to start instantly'}
                </motion.p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  PDF · Word · Images · Archives — or{' '}
                  <span
                    className="font-extrabold cursor-pointer relative group/link inline-block"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    browse files
                    <span 
                      className="absolute bottom-0 left-0 w-full h-[1.5px] scale-x-0 group-hover/link:scale-x-100 transition-transform duration-300 origin-bottom-left" 
                      style={{ backgroundColor: 'var(--color-primary)' }} 
                    />
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center mt-2">
                {['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'TXT', 'ZIP'].map(ext => (
                  <span
                    key={ext}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>



      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — INFINITE TOOLS MARQUEE
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="tools"
        className="py-24 relative overflow-hidden"
        style={{ background: 'transparent' }}
      >
        <ScrollReveal className="max-w-7xl mx-auto px-4 mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            38+ Document Tools
          </h2>
          <p className="max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Process and convert your documents securely with our high-performance suite of tools. Fully encrypted and instant.
          </p>
        </ScrollReveal>

        <div className="relative flex flex-col gap-6">
          <InfiniteMarquee items={pdfRow} direction="left" speed={90} />
          <InfiniteMarquee items={otherRow} direction="right" speed={50} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — ADVANCED CAPABILITIES (STICKY STACK)
      ═══════════════════════════════════════════════════════════ */}
      <StickyStack />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — STUDIO CANVAS VISUAL DEMO
      ═══════════════════════════════════════════════════════════ */}
      <StudioCanvasSection />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — PRIVACY ARCHITECTURE (ShimmerCards)
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-20 px-6 sm:px-8 max-w-[1400px] mx-auto"
        style={{ scrollMarginTop: 120 }}
      >
        <ScrollReveal className="text-center mb-14">
          <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>How it works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Built for Security by Design</h2>
          <p className="text-sm mt-3 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Every layer of DocScalar is engineered to process data securely, leaving no trace behind.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRIVACY_CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 0.1}>
              <ShimmerCard className="h-full">
                <div className="h-full p-7 flex flex-col gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `rgba(${card.accentRgb},0.1)`,
                      border: `1px solid rgba(${card.accentRgb},0.2)`,
                    }}
                  >
                    <span className="material-symbols-outlined text-[26px]" style={{ color: card.accent }}>{card.icon}</span>
                  </div>
                  <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
                </div>
              </ShimmerCard>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7 — RESUME BUILDER SHOWCASE
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="resume"
        className="py-20 overflow-hidden"
        style={{ scrollMarginTop: 120 }}
      >
        <ScrollReveal className="text-center mb-10 px-6">
          <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-accent)' }}>Resume Builder</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Templates That Get You Hired
          </h2>
          <p className="text-sm mt-3 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Stunning, recruiter-ready designs with live preview, custom photo cropping, and one-click ATS-friendly PDF export. More templates added regularly.
          </p>
        </ScrollReveal>

        {/* 3D coverflow carousel of recruiter-ready templates */}
        <ScrollReveal delay={0.15}>
          <Resume3DCarousel templates={RESUME_TEMPLATES} navigate={navigate} />
        </ScrollReveal>

        <ScrollReveal className="flex justify-center mt-10 px-6" delay={0.25}>
          <MovingBorder onClick={() => navigate('/resume-builder')} duration={2400}>
            <span className="material-symbols-outlined text-[17px]" style={{ color: 'var(--color-accent)' }}>workspace_premium</span>
            Open Resume Builder
          </MovingBorder>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8 — ANIMATED PRICING CARDS
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-20 px-6 sm:px-8 max-w-[1400px] mx-auto"
        style={{ scrollMarginTop: 120 }}
      >
        <ScrollReveal className="text-center mb-12">
          <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple. Transparent. Fair.</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Every plan includes high performance encrypted processing.</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span
              className="text-xs font-semibold"
              style={{ color: billing === 'monthly' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Monthly
            </span>
            <button
              onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-11 h-6 rounded-full cursor-pointer border-none transition-colors duration-200"
              style={{ background: billing === 'yearly' ? 'var(--color-primary)' : 'var(--border-medium)' }}
              aria-label="Toggle billing period"
            >
              <motion.div
                layout
                className="absolute top-[4px] w-[18px] h-[18px] rounded-full"
                style={{
                  background: '#fff',
                  left: billing === 'yearly' ? 'calc(100% - 22px)' : '4px',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </button>
            <span
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: billing === 'yearly' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Yearly
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-black"
                style={{ background: 'rgba(66,247,97,0.12)', color: 'var(--color-primary)' }}
              >
                SAVE 20%
              </span>
            </span>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              tier: 'Guest',
              price: '$0',
              period: 'No account needed',
              accent: 'var(--border-medium)',
              accentRgb: '60,75,58',
              features: ['10MB file limit', '3 free ops / day', 'All 41 PDF & image tools', 'QR code generator', 'URL to PDF'],
              cta: { label: 'Try as Guest', route: '/', primary: false },
              pro: false,
            },
            {
              tier: 'Free',
              price: '$0',
              period: 'Forever free',
              accent: 'var(--color-accent)',
              accentRgb: '255,127,28',
              features: ['15MB file limit', 'Unlimited daily operations', '10 Daily Canvas actions', 'All 41 tools', 'Workspace history'],
              cta: { label: 'Create Account', route: '/signup', primary: false },
              pro: false,
            },
            {
              tier: 'Pro',
              price: billing === 'monthly' ? '$9' : '$7',
              period: billing === 'monthly' ? '/ month' : '/ month · billed yearly',
              accent: 'var(--color-primary)',
              accentRgb: '66,247,97',
              features: ['1GB file limit', '50 queue slots', 'Chunked 10GB+ uploads', 'AI Document Suite', '17 CV Templates', 'Secure e-Signatures'],
              cta: { label: 'Go Pro', route: '/pricing', primary: true },
              pro: true,
            },
          ].map((plan, i) => (
            <ScrollReveal key={plan.tier} delay={i * 0.1} className="h-full">
              <div className="relative h-full">
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="relative z-10 h-full p-7 rounded-3xl flex flex-col gap-4"
                  style={{
                    background: plan.pro ? 'rgba(66,247,97,0.03)' : 'var(--bg-card)',
                    border: plan.pro ? 'none' : `1px solid rgba(${plan.accentRgb},0.15)`,
                    animation: plan.pro ? 'pro-glow-pulse 2.8s ease-in-out infinite' : 'none',
                  }}
                >
                  {plan.pro && (
                    <span
                      className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                      style={{ background: 'var(--color-primary)', color: '#0a0a0a' }}
                    >
                      POPULAR
                    </span>
                  )}

                  <div>
                    <h3 className="text-sm font-extrabold" style={{ color: plan.pro ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                      {plan.tier}
                    </h3>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={plan.price}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-end gap-1.5 mt-2"
                      >
                        <span className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{plan.price}</span>
                        <span className="text-xs pb-1.5 leading-tight" style={{ color: 'var(--text-tertiary)' }}>{plan.period}</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div style={{ height: 1, background: `rgba(${plan.accentRgb},0.1)` }} />

                  <ul className="flex flex-col gap-2.5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="material-symbols-outlined text-[14px]" style={{ color: plan.accent }}>check_circle</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    {plan.pro ? (
                      <MovingBorder onClick={() => navigate(isPro ? '/workspace' : '/pricing')} duration={4800} className="w-full">
                        <span className="text-xs font-bold w-full text-center">{isPro ? 'Go to Workspace' : plan.cta.label}</span>
                      </MovingBorder>
                    ) : (
                      <motion.button
                        onClick={() => navigate(isAuthenticated ? '/workspace' : plan.cta.route)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer border-none select-none"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {isAuthenticated ? 'Go to Workspace' : plan.cta.label}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9 — FAQ ACCORDION
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="faq"
        className="py-20 px-6 sm:px-8 max-w-[860px] mx-auto"
        style={{ scrollMarginTop: 120 }}
      >
        <ScrollReveal className="text-center mb-12">
          <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Frequently Asked</h2>
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
            Everything you want to know about how DocScalar works.
          </p>
        </ScrollReveal>

        <div className="flex flex-col gap-2.5">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = expandedFaq === i;
            return (
              <ScrollReveal key={i} delay={i * 0.04}>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    border: `1px solid ${isOpen ? 'rgba(66,247,97,0.2)' : 'var(--border-subtle)'}`,
                    background: 'var(--bg-card)',
                    transition: 'border-color 0.25s',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer border-none select-none"
                    style={{ background: 'transparent', color: 'var(--text-primary)' }}
                  >
                    <span className="text-sm font-bold pr-4 leading-snug">{item.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.22 }}
                      className="material-symbols-outlined shrink-0 text-[20px]"
                      style={{ color: isOpen ? 'var(--color-primary)' : 'var(--text-tertiary)' }}
                    >
                      expand_more
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          className="px-5 pb-5 pt-3 text-[13px] leading-relaxed"
                          style={{
                            color: 'var(--text-secondary)',
                            borderTop: '1px solid var(--border-subtle)',
                          }}
                        >
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>



    </div>
  );
}
