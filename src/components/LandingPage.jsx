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
import { FileType, Image as ImageIcon, Shield, SearchCode, Database, Cpu, Wand2, Grid, FileText, Lock, CreditCard, Workflow, Link2, Zap } from "lucide-react";
import { TOOLS } from '../utils/constants';
import {
  generateMarianaHtml,
  generateOliviaHtml,
  generateJonathanHtml,
  generateEmmaHtml,
  generateCharlesHtml,
  generateKathleenHtml,
  generateRichardHtml,
  generateSanchezDarkHtml,
  generateWilsonLightHtml,
  generateSanchezMonoHtml,
  generateSanchezWaveHtml,
  generateOngBurgundyHtml,
  generateSchumacherCharcoalHtml,
  generateZivOliveHtml,
  generateAdoraDiagonalHtml,
  generateWilsonMinimalHtml,
  generateAlvaradoSlateHtml
} from '../engines/utility/resumeTemplates';
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
  summary: 'Passionate and results-driven branding manager with over 6 years of experience driving cross-functional digital advertising campaigns. Skilled in UI layouts, market trends, SEO strategy, and high-impact copywriting.',
  experience: [
    {
      id: 'exp1',
      company: 'Borcelle Creative Agency',
      role: 'Branding Manager',
      start: '2022',
      end: 'Present',
      highlights: [
        'Spearheaded global digital brand revamps generating up to 140% increase in social traffic.',
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
        'Optimized ad-words expenditures cutting operational client acquisition costs by 18%.',
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
  const quadrupled = [...items, ...items, ...items, ...items];
  const cls = direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';
  return (
    <div
      className={`relative flex w-full overflow-hidden group ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
    >
      <div
        className={`flex w-fit ${cls} hover:[animation-play-state:paused]`}
        style={{ '--marquee-speed': `${speed}s` }}
      >
        {quadrupled.map((tool, i) => (
          <div
            key={`${tool.id}-${i}`}
            className="flex-shrink-0 mx-3 sm:mx-4 px-5 py-2.5 border rounded-2xl font-sans text-[12.5px] sm:text-[13.5px] font-semibold tracking-tight whitespace-nowrap shadow-sm cursor-pointer transition-all duration-300 flex items-center gap-2"
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
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-glass)';
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
                    : tool.category === 'pdf-security' || tool.category === 'pdf-intelligence'
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
    desc: 'Whatever you need to do with a document, DocForge does it — all locally, instantly, without queues or waiting for a cloud server to wake up.',
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
    id: 'ai',
    title: 'On-Device AI',
    subtitle: 'Translate · Summarize · Understand',
    desc: 'AI tools that live on your machine — not in the cloud. Zero API keys. Zero subscriptions. The model caches once, runs forever.',
    icon: 'psychology',
    span: 'md:col-span-1',
    accent: '#a78bfa',
    accentRgb: '167,139,250',
  },
  {
    id: 'resume',
    title: 'Career-Ready Builder',
    subtitle: 'Design · Preview · Export',
    desc: 'Go from blank page to boardroom ready in minutes. Stunning layouts, live preview, custom photo — completely Local Compute.',
    icon: 'workspace_premium',
    span: 'md:col-span-1',
    accent: 'var(--color-accent)',
    accentRgb: '255,127,28',
  },
  {
    id: 'privacy',
    title: 'Your Files. Your Rules.',
    subtitle: 'Local · Private · Secure',
    desc: 'Nothing leaves your machine. No server ever sees your content. Start working instantly — no account, no tracking, no compromise.',
    icon: 'shield',
    span: 'md:col-span-2',
    accent: 'var(--color-primary)',
    accentRgb: '66,247,97',
  },
];

const PRIVACY_CARDS = [
  {
    icon: 'terminal',
    title: 'Browser-Native Engines',
    desc: 'All conversion operations execute inside sandboxed browser threads using compiled local engines running at near-native speed — zero external service calls.',
    accent: 'var(--color-primary)',
    accentRgb: '66,247,97',
  },
  {
    icon: 'storage',
    title: 'Local Workspace Storage',
    desc: "Your documents and queue state are saved as binary objects in your browser's private local storage. Only your device can access this data.",
    accent: 'var(--color-accent)',
    accentRgb: '255,127,28',
  },
  {
    icon: 'vpn_lock',
    title: 'Zero-Log Architecture',
    desc: 'No analytics are attached to file content. Password operations are processed locally and never retained. Files expire from local cache automatically.',
    accent: '#a78bfa',
    accentRgb: '167,139,250',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Does DocForge upload my files to a server?',
    a: 'No. All standard operations run entirely inside your browser using locally compiled conversion engines. Files never leave your device. For certain heavy-pipeline operations a local server bridge handles processing — never an external cloud.',
  },
  {
    q: 'What is the Studio Canvas workspace?',
    a: 'The Studio Canvas is a Miro style visual node editor at the /canvas route. You drag document nodes onto a dot-grid workspace, draw cable connections to operation nodes, and the built-in recursive solver executes your entire pipeline in sequence — all Client Side.',
  },
  {
    q: 'What are the file size limits per plan?',
    a: 'Guest users can process files up to 10MB. Free account holders get 100MB per file with 5 queue slots. Pro subscribers unlock 1GB per file with 50 slots, chunked uploading for 10GB+ files, and On Device AI translation.',
  },
  {
    q: 'How does On Device AI translation work?',
    a: 'Our AI translator runs a local neural machine translation model downloaded once to your browser cache. It runs on your CPU or GPU with no calls to OpenAI, Anthropic, or any third-party API — completely air-gapped after the first visit.',
  },
  {
    q: 'Can I use DocForge fully Client Side?',
    a: 'Yes — after the initial page load. All Client Side tools work with no internet connection. The AI translation model is cached locally after first use, enabling On Device translation on return visits.',
  },
  {
    q: 'Is my content used to train AI models?',
    a: 'Absolutely not. DocForge processes everything locally and has no telemetry pipeline attached to document content. Your files and their contents are never seen by our systems.',
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
  { name: 'Sanchez Dark', displayName: 'Charcoal Grid Compact', desc: 'Charcoal-themed layout with high density content grids.', shade1: '#1c1917', shade2: '#0c0a09' },
  { name: 'Wilson Light', displayName: 'Classical Editorial Light', desc: 'Elegant light layout with crisp, clean classical typography.', shade1: '#d8dee9', shade2: '#e5e9f0' },
  { name: 'Sanchez Mono', displayName: 'Developer Monospace Timeline', desc: 'Clean monospace coding developer layout for technical cvs.', shade1: '#0f172a', shade2: '#020617' },
  { name: 'Sanchez Wave', displayName: 'Pacific Wave Blue', desc: 'Pacific blue template featuring a wave-pattern header.', shade1: '#075985', shade2: '#0c4a6e' },
  { name: 'Ong Burgundy', displayName: 'Plum Burgundy Premium', desc: 'Rich plum luxury header layout for premium presentation.', shade1: '#701a75', shade2: '#4a044e' },
  { name: 'Schumacher Charcoal', displayName: 'Minimalist Charcoal Stone', desc: 'Charcoal minimal builder with clean, structured margins.', shade1: '#292524', shade2: '#1c1917' },
  { name: 'Ziv Olive', displayName: 'Forest Olive Organic', desc: 'Organic forest olive layout for design and branding specialists.', shade1: '#3f6212', shade2: '#365314' },
  { name: 'Adora Diagonal', displayName: 'Teal Creative Diagonal', desc: 'Teal creative layout featuring dynamic diagonal accents.', shade1: '#155e75', shade2: '#164e63' },
  { name: 'Wilson Minimal', displayName: 'Ultra-Clean Minimalist', desc: 'Ultra-clean layout stripped of heavy lines or visual clutter.', shade1: '#e2e8f0', shade2: '#cbd5e1' },
  { name: 'Alvarado Slate', displayName: 'Split Column Slate', desc: 'Geometric slate-gray layout with split block columns.', shade1: '#334155', shade2: '#1e293b' },
];

// 13. Resume3DCarousel — Framer Motion Coverflow Carousel
function Resume3DCarousel({ templates, navigate }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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

              // Extract HTML with custom displayName mapped onto the document candidate name
              const generateHtml = TEMPLATE_FUNCTIONS[tpl.name];
              let cvHtml = '';
              if (generateHtml) {
                try {
                  const customData = {
                    ...MOCK_RESUME_DATA,
                    personalInfo: {
                      ...MOCK_RESUME_DATA.personalInfo,
                      name: tpl.displayName || tpl.name,
                    }
                  };
                  cvHtml = generateHtml(customData);
                } catch (e) {
                  console.error(e);
                }
              }

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

// 8. StudioCanvasSection — Exact Match to Original User Canvas Visuals
function StudioCanvasSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });

  const [presetIdx, setPresetIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const presets = useMemo(() => [
    {
      id: 'format-auto-healing',
      title: 'Format Auto-Healing',
      input1: { name: 'raw_scan.jpg', size: '1.4 MB', tag: 'JPG', bg: 'bg-orange-500' },
      input2: { name: 'contract.pdf', size: '2.8 MB', tag: 'PDF', bg: 'bg-rose-500' },
      op1: { title: 'Auto-Heal Adapter', icon: 'auto_fix_high', param: 'Image -> PDF Auto-Insert', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
      op2: { title: 'Merge & Optimize', icon: 'join_inner', param: 'Multi-Format Pipeline', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
      outputNode: { name: 'healed_pipeline.pdf', size: '1.2 MB', suffix: 'Auto-Healed', tag: 'OUTPUT', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
    },
    {
      id: 'type-safe-guard',
      title: 'Type-Safe Cable Guard',
      input1: { name: 'annual_report.pdf', size: '4.2 MB', tag: 'PDF', bg: 'bg-rose-500' },
      input2: { name: 'receipt.png', size: '610 KB', tag: 'PNG', bg: 'bg-emerald-500' },
      op1: { title: 'MIME Validator', icon: 'verified_user', param: 'Port Type Validation ✓', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
      op2: { title: 'Cycle Guard', icon: 'block', param: 'Loop & Cycle Prevented', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
      outputNode: { name: 'validated_output.pdf', size: '1.1 MB', suffix: 'Type Safe', tag: 'OUTPUT', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
    },
    {
      id: 'multibranch-dag',
      title: 'Multi-Branch DAG Engine',
      input1: { name: 'master_bundle.pdf', size: '5.1 MB', tag: 'PDF', bg: 'bg-rose-500' },
      input2: { name: 'appendix.pdf', size: '820 KB', tag: 'PDF', bg: 'bg-rose-500' },
      op1: { title: 'Recursive DAG', icon: 'account_tree', param: 'Multi-Branch Parallel', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
      op2: { title: 'Fast Processing', icon: 'bolt', param: 'Instant Local Execution', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
      outputNode: { name: 'cascade_result.pdf', size: '1.8 MB', suffix: 'Zero Latency', tag: 'OUTPUT', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
    }
  ], []);

  const currentPreset = presets[presetIdx];

  const runSimulation = useCallback(() => {
    setIsRunning(true);
    setStage(0);

    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 600);
    const t3 = setTimeout(() => setStage(3), 1800);
    const t4 = setTimeout(() => {
      setStage(4);
      setIsRunning(false);
    }, 2800);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    if (isInView && stage === 0 && !isRunning) {
      runSimulation();
    }
  }, [isInView]);

  const handlePresetSelect = (idx) => {
    setPresetIdx(idx);
    setStage(0);
    setTimeout(() => {
      setIsRunning(true);
      setStage(1);
      setTimeout(() => setStage(2), 500);
      setTimeout(() => setStage(3), 1600);
      setTimeout(() => {
        setStage(4);
        setIsRunning(false);
      }, 2500);
    }, 80);
  };

  return (
    <section
      id="canvas"
      ref={sectionRef}
      className="py-20 px-6 sm:px-8 max-w-[1400px] mx-auto"
      style={{ scrollMarginTop: 120 }}
    >
      <style>{`
        @keyframes flow-march {
          to { stroke-dashoffset: -20; }
        }
        .animated-pipeline-flow {
          stroke-dasharray: 6 4;
          animation: flow-march 1s linear infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* ── Left Column: Canvas Superpowers Features List ── */}
        <ScrollReveal className="flex flex-col gap-6 lg:col-span-4 text-left">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            CANVAS SUPERPOWERS
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Design Pipelines Visually
          </h2>

          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The Studio Canvas lets you drag document nodes, draw Bezier cable connections between operations, and execute the entire chain locally with zero server latency.
          </p>

          <ul className="flex flex-col gap-5 my-2">
            {[
              [Zap, 'Format Auto-Healing', 'Dynamically inserts format converter adapters when wiring incompatible ports.'],
              [Shield, 'Type-Safe Cable Guard', 'Real-time MIME format validation and cycle loop prevention on drag-wires.'],
              [Workflow, 'Multi-Branch DAG Engine', 'Recursive execution engine automatically triggers downstream nodes in parallel.'],
              [Database, 'Auto-Persistent Workbench', 'Graph coordinates, wire connections, and tool settings save locally to IndexedDB.'],
            ].map(([Icon, title, desc]) => (
              <li key={title} className="flex items-start gap-3 text-left">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                  }}
                >
                  <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{title}</span>
                  <span className="text-[11px] leading-relaxed opacity-80" style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                </div>
              </li>
            ))}
          </ul>

          <motion.button
            onClick={() => navigate('/canvas')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="self-start flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold cursor-pointer border-none select-none shadow-md transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
          >
            <span>Open Studio Canvas Workspace</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </motion.button>
        </ScrollReveal>

        {/* ── Right Column: Authentic Clean Canvas Viewport ── */}
        <ScrollReveal delay={0.15} className="lg:col-span-8 w-full">
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border transition-colors duration-300 bg-white dark:bg-[#0f1115]"
            style={{
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Window Chrome Header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between gap-3 select-none"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[10px] font-mono tracking-wider opacity-70 hidden sm:inline-block" style={{ color: 'var(--text-primary)' }}>
                  DocForge Studio Canvas
                </span>
              </div>

              {/* Workflow Presets Selector */}
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/5 dark:border-white/5">
                {presets.map((preset, idx) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(idx)}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer border-none ${
                      presetIdx === idx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {preset.title}
                  </button>
                ))}
              </div>

              {/* Simulation Trigger */}
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white transition-all shadow-sm cursor-pointer border-none bg-indigo-600 hover:bg-indigo-700"
                style={{ opacity: isRunning ? 0.6 : 1 }}
              >
                <span className="material-symbols-outlined text-[14px]">{isRunning ? 'sync' : 'play_arrow'}</span>
              </button>
            </div>

            {/* Canvas Surface with Scaled Vector Graphic Coordinate System (viewBox 0 0 1000 440) */}
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              {/* Subtle Dot Grid Layer matching the authentic image */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(156, 163, 175, 0.4) 1.2px, transparent 1.2px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Vector SVG Space */}
              <svg
                className="absolute inset-0 w-full h-full z-0"
                viewBox="0 0 1000 440"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* SVG Connecting Cables */}
                <g>
                  {presetIdx === 0 && (
                    <>
                      {/* Preset 0: Format Auto-Healing Wiring */}
                      {/* Cable 1: raw_scan.jpg (Top Left) -> Auto-Heal Adapter (Top Center) */}
                      <path
                        d="M 180 140 C 270 140, 270 145, 360 145"
                        fill="none"
                        stroke={stage >= 1 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={stage >= 1 && stage < 2 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Cable 2: Auto-Heal Adapter -> Merge & Optimize */}
                      <path
                        d="M 500 145 C 560 145, 560 205, 620 205"
                        fill="none"
                        stroke={stage >= 2 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2"
                        className={stage >= 2 && stage < 3 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Cable 3: contract.pdf (Bottom Left) -> Merge & Optimize */}
                      <path
                        d="M 180 300 C 400 300, 450 235, 620 235"
                        fill="none"
                        stroke={stage >= 1 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={stage >= 1 && stage < 3 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Cable 4: Merge & Optimize -> Final Output */}
                      <path
                        d="M 760 220 L 830 220"
                        fill="none"
                        stroke={stage >= 3 ? "#10b981" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="1.5"
                        className={stage >= 3 && stage < 4 ? "animated-pipeline-flow" : ""}
                      />
                    </>
                  )}

                  {presetIdx === 1 && (
                    <>
                      {/* Preset 1: Type-Safe Cable Guard Wiring */}
                      {/* Cable 1: Valid PDF -> MIME Validator */}
                      <path
                        d="M 180 140 C 270 140, 270 220, 360 220"
                        fill="none"
                        stroke={stage >= 1 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={stage >= 1 && stage < 2 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Cable 2: REJECTED Incompatible MP4 -> Stopped by Cable Guard */}
                      <path
                        d="M 180 300 C 240 300, 250 270, 280 270"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                      {/* Cable 3: MIME Validator -> Cycle Guard */}
                      <path
                        d="M 500 220 L 620 220"
                        fill="none"
                        stroke={stage >= 2 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="1.5"
                        className={stage >= 2 && stage < 3 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Cable 4: Cycle Guard -> Output */}
                      <path
                        d="M 760 220 L 830 220"
                        fill="none"
                        stroke={stage >= 3 ? "#10b981" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="1.5"
                        className={stage >= 3 && stage < 4 ? "animated-pipeline-flow" : ""}
                      />
                    </>
                  )}

                  {presetIdx === 2 && (
                    <>
                      {/* Preset 2: Multi-Branch DAG Engine Wiring */}
                      {/* Cable 1: Input 1 -> Recursive DAG */}
                      <path
                        d="M 180 140 C 270 140, 270 220, 360 220"
                        fill="none"
                        stroke={stage >= 1 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Cable 2: Input 2 -> Recursive DAG */}
                      <path
                        d="M 180 300 C 270 300, 270 220, 360 220"
                        fill="none"
                        stroke={stage >= 1 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Branch A: Recursive DAG -> Top WASM Worker 1 */}
                      <path
                        d="M 500 220 C 560 220, 560 140, 620 140"
                        fill="none"
                        stroke={stage >= 2 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2"
                        className={stage >= 2 && stage < 3 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Branch B: Recursive DAG -> Bottom WASM Worker 2 */}
                      <path
                        d="M 500 220 C 560 220, 560 300, 620 300"
                        fill="none"
                        stroke={stage >= 2 ? "#6366f1" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="2"
                        className={stage >= 2 && stage < 3 ? "animated-pipeline-flow" : ""}
                      />
                      {/* Top Worker Output */}
                      <path
                        d="M 760 140 L 830 140"
                        fill="none"
                        stroke={stage >= 3 ? "#10b981" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="1.5"
                      />
                      {/* Bottom Worker Output */}
                      <path
                        d="M 760 300 L 830 300"
                        fill="none"
                        stroke={stage >= 3 ? "#10b981" : "rgba(156, 163, 175, 0.3)"}
                        strokeWidth="1.5"
                      />
                    </>
                  )}
                </g>

                {/* Node Cards */}

                {/* Node 1: Input File 1 */}
                <foreignObject x="40" y="105" width="140" height="70" className="overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: stage >= 1 ? 1 : 0.7, scale: 1 }}
                    className="w-full h-full p-2.5 rounded-xl border bg-white dark:bg-[#1a1d24] flex flex-col justify-center shadow-sm select-none"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`px-1.5 py-0.5 rounded flex-shrink-0 flex items-center justify-center font-bold text-[8px] text-white ${currentPreset.input1.bg}`}>
                        {currentPreset.input1.tag}
                      </div>
                      <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {currentPreset.input1.name}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                      {currentPreset.input1.size}
                    </span>
                  </motion.div>
                </foreignObject>

                {/* Node 2: Input File 2 */}
                <foreignObject x="40" y="265" width="140" height="70" className="overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: stage >= 1 ? 1 : 0.7, scale: 1 }}
                    className="w-full h-full p-2.5 rounded-xl border bg-white dark:bg-[#1a1d24] flex flex-col justify-center shadow-sm select-none"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`px-1.5 py-0.5 rounded flex-shrink-0 flex items-center justify-center font-bold text-[8px] text-white ${currentPreset.input2.bg}`}>
                        {currentPreset.input2.tag}
                      </div>
                      <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {presetIdx === 1 ? 'video_clip.mp4' : currentPreset.input2.name}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                      {presetIdx === 1 ? '18.4 MB' : currentPreset.input2.size}
                    </span>
                  </motion.div>
                </foreignObject>

                {/* Type-Safe Cable Guard Rejected Badge for Preset 1 */}
                {presetIdx === 1 && (
                  <foreignObject x="220" y="250" width="125" height="40" className="overflow-visible">
                    <div className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-extrabold text-[8px] flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[10px]">block</span>
                      <span>MIME Blocked</span>
                    </div>
                  </foreignObject>
                )}

                {/* Node 3: Operator 1 */}
                <foreignObject x="360" y={presetIdx === 0 ? 105 : 180} width="140" height="80" className="overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: stage >= 2 ? 1 : 0.6, scale: 1 }}
                    className={`w-full h-full p-2 rounded-xl border bg-white dark:bg-[#1a1d24] flex flex-col justify-between shadow-sm select-none ${stage === 2 ? currentPreset.op1.border : ''}`}
                    style={{ borderColor: stage === 2 ? undefined : 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center ${currentPreset.op1.text}`}>
                        <span className="material-symbols-outlined text-[12px]">{currentPreset.op1.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {currentPreset.op1.title}
                        </span>
                        <span className={`text-[8px] font-mono ${currentPreset.op1.text}`}>
                          {currentPreset.op1.param}
                        </span>
                      </div>
                    </div>
                    <div className="w-full flex items-center justify-between px-1 text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      <span>Status</span>
                      <span className={stage === 2 ? "text-indigo-500 animate-pulse font-bold" : stage > 2 ? "text-emerald-500 font-bold" : ""}>
                        {stage === 2 ? "RUNNING" : stage > 2 ? "DONE ✓" : "-"}
                      </span>
                    </div>
                  </motion.div>
                </foreignObject>

                {/* Node 4: Operator 2 */}
                <foreignObject x="620" y={presetIdx === 2 ? 105 : 180} width="140" height="80" className="overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: stage >= 3 ? 1 : 0.6, scale: 1 }}
                    className={`w-full h-full p-2 rounded-xl border bg-white dark:bg-[#1a1d24] flex flex-col justify-between shadow-sm select-none ${stage === 3 ? currentPreset.op2.border : ''}`}
                    style={{ borderColor: stage === 3 ? undefined : 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center ${currentPreset.op2.text}`}>
                        <span className="material-symbols-outlined text-[12px]">{currentPreset.op2.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {currentPreset.op2.title}
                        </span>
                        <span className={`text-[8px] font-mono ${currentPreset.op2.text}`}>
                          {currentPreset.op2.param}
                        </span>
                      </div>
                    </div>
                    <div className="w-full flex items-center justify-between px-1 text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      <span>Status</span>
                      <span className={stage === 3 ? "text-emerald-500 animate-pulse font-bold" : stage > 3 ? "text-emerald-500 font-bold" : ""}>
                        {stage === 3 ? "RUNNING" : stage > 3 ? "DONE ✓" : "READY"}
                      </span>
                    </div>
                  </motion.div>
                </foreignObject>

                {/* Optional Second Parallel Worker for Multi-Branch DAG (Preset 2) */}
                {presetIdx === 2 && (
                  <foreignObject x="620" y="265" width="140" height="80" className="overflow-visible">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: stage >= 3 ? 1 : 0.6, scale: 1 }}
                      className={`w-full h-full p-2 rounded-xl border bg-white dark:bg-[#1a1d24] flex flex-col justify-between shadow-sm select-none ${stage === 3 ? 'border-emerald-500' : ''}`}
                      style={{ borderColor: stage === 3 ? undefined : 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                          <span className="material-symbols-outlined text-[12px]">description</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            Extract Text
                          </span>
                          <span className="text-[8px] font-mono text-emerald-600">
                            Parallel Branch 2
                          </span>
                        </div>
                      </div>
                      <div className="w-full flex items-center justify-between px-1 text-[7px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        <span>Status</span>
                        <span className={stage === 3 ? "text-emerald-500 animate-pulse font-bold" : stage > 3 ? "text-emerald-500 font-bold" : "READY"}>
                          {stage === 3 ? "RUNNING" : stage > 3 ? "DONE ✓" : "READY"}
                        </span>
                      </div>
                    </motion.div>
                  </foreignObject>
                )}

                {/* Node 5: Output */}
                <foreignObject x="830" y={presetIdx === 2 ? 105 : 180} width="100" height="80" className="overflow-visible">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: stage >= 4 ? 1 : 0.4, scale: 1 }}
                    className={`w-full h-full p-2.5 rounded-xl border flex flex-col justify-center shadow-sm select-none ${currentPreset.outputNode.bg}`}
                  >
                    <div className="flex flex-col text-left gap-0.5">
                      <span className="text-[7px] font-black uppercase tracking-widest opacity-80">{currentPreset.outputNode.tag}</span>
                      <span className="text-[9px] font-bold truncate">
                        {currentPreset.outputNode.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[7px] font-mono opacity-80">
                      <span>{currentPreset.outputNode.size}</span>
                      <span>{currentPreset.outputNode.suffix}</span>
                    </div>
                  </motion.div>
                </foreignObject>

                {/* Second Output for Parallel Branching (Preset 2) */}
                {presetIdx === 2 && (
                  <foreignObject x="830" y="265" width="100" height="80" className="overflow-visible">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: stage >= 4 ? 1 : 0.4, scale: 1 }}
                      className="w-full h-full p-2.5 rounded-xl border flex flex-col justify-center shadow-sm select-none bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    >
                      <div className="flex flex-col text-left gap-0.5">
                        <span className="text-[7px] font-black uppercase tracking-widest opacity-80">TEXT</span>
                        <span className="text-[9px] font-bold truncate">
                          extracted.txt
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[7px] font-mono opacity-80">
                        <span>42 KB</span>
                        <span>Parallel</span>
                      </div>
                    </motion.div>
                  </foreignObject>
                )}
              </svg>
            </div>

            {/* Bottom Status Bar */}
            <div
              className="px-4 py-1.5 border-t flex items-center justify-between text-[9px] font-mono"
              style={{
                background: 'var(--bg-glass)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Client-Side Execution Engine (Web Workers)</span>
              </div>
              <span className="text-emerald-500 font-bold">0 Server Logs</span>
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
    { name: 'Motion', id: 'canvas', icon: Wand2 },
    { name: 'Features', id: 'features', icon: Grid },
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
            <span className="block" style={{ color: 'var(--text-primary)' }}>privately, in your browser</span>
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
              text="DocForge runs 38+ document tools, a visual Studio Canvas, and an On Device AI translator — all inside your browser. Files never leave your machine."
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
              onClick={() => navigate('/canvas')}
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
            {[['38+', 'Local Tools'], ['∞', 'Possibilities'], ['100%', 'Local First'], ['0', 'Server Logs']].map(([val, lbl]) => (
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
            38+ Local Engines
          </h2>
          <p className="max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Process your documents securely on-device with our high-performance suite of tools. No data leaves your machine.
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Built for Privacy by Design</h2>
          <p className="text-sm mt-3 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Every layer of DocForge is engineered to process data locally, leaving no trace behind.
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
            Stunning, recruiter-ready designs with live preview, custom photo cropping, and one-click PDF export — all completely Local Compute. More templates added regularly.
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
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Every plan includes 100% Local First processing.</p>

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
              features: ['10MB file limit', '1 active slot', 'Core PDF & image tools', 'QR code generator', 'URL to PDF'],
              cta: { label: 'Try as Guest', route: '/', primary: false },
              pro: false,
            },
            {
              tier: 'Free',
              price: '$0',
              period: 'Forever free',
              accent: 'var(--color-accent)',
              accentRgb: '255,127,28',
              features: ['100MB file limit', '5 queue slots', 'Workspace history', 'All PDF tools', '3 CV Templates'],
              cta: { label: 'Create Account', route: '/signup', primary: false },
              pro: false,
            },
            {
              tier: 'Pro',
              price: billing === 'monthly' ? '$9' : '$7',
              period: billing === 'monthly' ? '/ month' : '/ month · billed yearly',
              accent: 'var(--color-primary)',
              accentRgb: '66,247,97',
              features: ['1GB file limit', '50 queue slots', 'Chunked 10GB+ uploads', 'On Device AI Translator', '17 CV Templates', 'Secure e-Signatures'],
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
            Everything you want to know about how DocForge works.
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
