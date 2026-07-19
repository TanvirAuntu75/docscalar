import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, animate } from "framer-motion";

// ─── BRAND ───────────────────────────────────────────────────────────────────
const PRIMARY = "#B35A00";

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 1: PRIVACY — Document locked inside the browser, cloud upload blocked
// ─────────────────────────────────────────────────────────────────────────────
function PrivacyVisual() {
  const [arrowActive, setArrowActive] = useState(false);
  const [blocked, setBlocked]         = useState(false);

  useEffect(() => {
    const cycle = async () => {
      while (true) {
        await new Promise(r => setTimeout(r, 1200));
        setArrowActive(true);
        await new Promise(r => setTimeout(r, 800));
        setBlocked(true);
        await new Promise(r => setTimeout(r, 1400));
        setArrowActive(false);
        setBlocked(false);
        await new Promise(r => setTimeout(r, 700));
      }
    };
    const t = setTimeout(cycle, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full h-full px-6">
      {/* Browser Tab Container */}
      <div className="relative w-full max-w-[340px]">
        {/* Browser chrome */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {/* Tab bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            </div>
            <div className="flex-1 bg-white/10 rounded-md h-5 mx-2 flex items-center px-3">
              <span className="text-[9px] text-white/50 font-mono">docforge.app — local sandbox</span>
            </div>
          </div>
          {/* Content area */}
          <div className="p-6 flex items-center justify-center min-h-[120px]">
            {/* Document inside browser */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-18 bg-white/90 rounded-lg shadow-lg flex flex-col p-2 gap-1">
                <div className="w-full h-1 bg-gray-300/60 rounded" />
                <div className="w-3/4 h-1 bg-gray-300/60 rounded" />
                <div className="w-full h-1 bg-gray-300/60 rounded" />
                <div className="w-2/3 h-1 bg-gray-300/60 rounded" />
                <div className="w-full h-1 bg-gray-300/60 rounded" />
                <div className="w-1/2 h-1 bg-gray-300/60 rounded" />
              </div>
              <span className="text-[9px] text-white/60 font-medium tracking-wider uppercase">Stays Here</span>
            </div>
          </div>
        </div>

        {/* Arrow trying to escape to cloud, gets blocked */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <motion.div
            animate={{ x: arrowActive ? [0, 18, 18] : 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </motion.div>

          {/* Cloud with X */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ scale: blocked ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-12 h-12 text-white/25" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58q0-1.95 1.17-3.48Q3.35 9.58 5.25 9.15q.42-2.08 2-3.37Q8.83 4.5 11 4.5q2.93 0 4.96 2.04Q18 8.58 18 11.5v.5q1.73 0 2.86 1.11Q22 14.23 22 15.96t-1.14 2.89Q19.73 20 18 20Z" />
            </svg>
            <motion.div
              className="absolute"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: blocked ? 1 : 0, scale: blocked ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 text-white/50 text-xs font-medium tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Zero server contact
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 2: SPEED — Live progress bar fills in 0.4s vs "cloud" bar at 4s
// ─────────────────────────────────────────────────────────────────────────────
function SpeedVisual() {
  const [localPct, setLocalPct]  = useState(0);
  const [cloudPct, setCloudPct]  = useState(0);
  const [localDone, setLocalDone] = useState(false);
  const [cloudDone, setCloudDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      while (true) {
        setLocalPct(0); setCloudPct(0);
        setLocalDone(false); setCloudDone(false);
        await new Promise(r => setTimeout(r, 800));

        // Local: 0→100 in 380ms
        const localStart = performance.now();
        await new Promise<void>(resolve => {
          const tick = (now: number) => {
            const p = Math.min((now - localStart) / 380, 1);
            setLocalPct(Math.round(p * 100));
            if (p < 1) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        setLocalDone(true);

        // Cloud: slowly creeps to 100 in 4.2s
        const cloudStart = performance.now();
        await new Promise<void>(resolve => {
          const tick = (now: number) => {
            const p = Math.min((now - cloudStart) / 4200, 1);
            setCloudPct(Math.round(p * 100));
            if (p < 1) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        setCloudDone(true);

        await new Promise(r => setTimeout(r, 1800));
      }
    };
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full px-8">
      {/* DocForge local row */}
      <div className="w-full max-w-[360px] space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-brand-primary/30 border border-brand-primary/50 flex items-center justify-center">
              <svg className="w-3 h-3 text-brand-primary" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M12 8v8m0 0l-4-4m4 4l4-4" />
              </svg>
            </div>
            <span className="text-white text-sm font-semibold">DocForge Local</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold tabular-nums ${localDone ? 'text-emerald-400' : 'text-white'}`}>
              {localPct}%
            </span>
            {localDone && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>
              </motion.div>
            )}
          </div>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-primary to-amber-400"
            style={{ width: `${localPct}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <span className="text-[10px] text-white/40 font-mono">In-browser WASM engine · ~0.4s</span>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full max-w-[360px]">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/30 uppercase tracking-widest">vs</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Cloud server row */}
      <div className="w-full max-w-[360px] space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/10 border border-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58q0-1.95 1.17-3.48Q3.35 9.58 5.25 9.15q.42-2.08 2-3.37Q8.83 4.5 11 4.5q2.93 0 4.96 2.04Q18 8.58 18 11.5v.5q1.73 0 2.86 1.11Q22 14.23 22 15.96t-1.14 2.89Q19.73 20 18 20Z" />
              </svg>
            </div>
            <span className="text-white/40 text-sm font-semibold">Cloud Server</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-white/40">{cloudPct}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-white/20"
            style={{ width: `${cloudPct}%` }}
          />
        </div>
        <span className="text-[10px] text-white/30 font-mono">Upload → process → download · ~4s+</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 3: POWER — Actual DocForge tools grid, each activates in sequence
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS = [
  { label: "PDF Merge",   icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",           color: "#B35A00" },
  { label: "Compress",    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "#8B4513" },
  { label: "OCR Text",    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",                       color: "#6B3A2A" },
  { label: "Split PDF",   icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",                   color: "#C46A00" },
  { label: "Convert",     icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",                               color: "#7B4F2E" },
  { label: "E-Sign",      icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",                                           color: "#9C4A1A" },
];

function PowerVisual() {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    let i = 0;
    const cycle = () => {
      setActiveIdx(i % TOOLS.length);
      i++;
    };
    cycle();
    const timer = setInterval(cycle, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full px-8">
      <div className="grid grid-cols-3 gap-4 w-full max-w-[340px]">
        {TOOLS.map((tool, i) => {
          const isActive = activeIdx === i;
          return (
            <motion.div
              key={tool.label}
              animate={{
                scale: isActive ? 1.08 : 1,
                y: isActive ? -4 : 0,
              }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors duration-300 cursor-default"
              style={{
                background: isActive ? `${tool.color}22` : "rgba(255,255,255,0.04)",
                borderColor: isActive ? `${tool.color}66` : "rgba(255,255,255,0.1)",
                boxShadow: isActive ? `0 8px 24px ${tool.color}33` : "none",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: isActive ? `${tool.color}30` : "rgba(255,255,255,0.06)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  style={{ color: isActive ? tool.color : "rgba(255,255,255,0.35)" }}
                >
                  <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                </svg>
              </div>
              <span
                className="text-[9.5px] font-semibold text-center leading-tight"
                style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
              >
                {tool.label}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">6 tools · all browser-native</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES SECTION
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    id: "privacy",
    subtitle: "Privacy First",
    title: "Your documents stay on your device.",
    description: "DocForge runs a powerful processing engine directly in your browser. No servers. No data collection. Absolute privacy.",
    Visual: PrivacyVisual,
    accent: "rgba(179,90,0,0.25)",
  },
  {
    id: "speed",
    subtitle: "Blazing Fast",
    title: "Instant processing, zero latency.",
    description: "By eliminating server round-trips, tasks that used to take minutes now happen instantly. Harness the full power of your local machine.",
    Visual: SpeedVisual,
    accent: "rgba(59,130,246,0.2)",
  },
  {
    id: "power",
    subtitle: "Unmatched Power",
    title: "Desktop-grade capabilities.",
    description: "Merge, compress, OCR, and convert with the same power as native desktop applications, accessible from any browser.",
    Visual: PowerVisual,
    accent: "rgba(168,85,247,0.2)",
  },
];

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-66.66%"]);

  return (
    <section ref={containerRef} className="h-[300vh] bg-brand-text relative" id="features">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <motion.div style={{ x }} className="flex w-[300vw] h-full">
          {features.map((feature, i) => (
            <div
              key={feature.id}
              className="w-[100vw] h-full flex items-center justify-center p-8 md:p-24 relative overflow-hidden"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-brand-text z-0" />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-25 z-0"
                style={{ background: feature.accent }}
              />

              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                {/* Copy */}
                <div className="text-white">
                  <span className="text-brand-primary font-semibold tracking-wider uppercase text-xs mb-4 block">
                    {feature.subtitle}
                  </span>
                  <h2 className="text-5xl md:text-6xl font-medium mb-6 leading-tight">
                    {feature.title}
                  </h2>
                  <p className="text-lg text-white/55 max-w-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Visual */}
                <div className="h-[480px] w-full rounded-3xl border border-white/8 bg-white/[0.03] backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
                  <feature.Visual />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
