import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { CloudOff, Cpu, Trash2 } from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PRIMARY   = "#B35A00";
const PAGE_BG   = "#F8F5F1";
const TEXT_COL  = "#111111";
const MUTED     = "#6B6B6B";
const RULE      = "#E2DDD7";

// Doc dimensions (px)
const DOC_W = 180;
const DOC_H = 234;

// Output card specs — warm palette only
const CARDS = [
  { id:"pdf",   label:"PDF",    accent:"#B35A00", bg:"#FFF3EA", tag:"Export"   },
  { id:"ocr",   label:"OCR",    accent:"#8B4000", bg:"#F5EEE6", tag:"Extract"  },
  { id:"zip",   label:"ZIP",    accent:"#5C4033", bg:"#EDE8E3", tag:"Compress" },
  { id:"merge", label:"MERGE",  accent:"#9C3D00", bg:"#F9EDE3", tag:"Combine"  },
  { id:"docx",  label:"DOCX",   accent:"#704214", bg:"#F0E9E1", tag:"Convert"  },
  { id:"sign",  label:"SIGN",   accent:"#C46000", bg:"#FEF0E5", tag:"Secure"   },
];

// Final resting positions in the fan (relative to panel centre)
const FAN_DEST = [
  { x:-280, y:100, r:-26 },
  { x:-168, y: 48, r:-15 },
  { x: -56, y: 18, r: -5 },
  { x:  56, y: 18, r:  5 },
  { x: 168, y: 48, r: 15 },
  { x: 280, y:100, r: 26 },
];

// ─── PAPER DOCUMENT SVG ──────────────────────────────────────────────────────
function DocSVG({ scannedFraction = 0 }: { scannedFraction?: number }) {
  const scannedH = DOC_H * scannedFraction;
  return (
    <svg width={DOC_W} height={DOC_H} viewBox={`0 0 ${DOC_W} ${DOC_H}`} fill="none">
      {/* Drop shadow */}
      <rect x="5" y="7" width={DOC_W - 6} height={DOC_H - 7} rx="8" fill="rgba(0,0,0,0.08)" />
      {/* Paper */}
      <rect width={DOC_W - 5} height={DOC_H - 6} rx="8" fill="white" />

      {/* Scanned region tint (orange wash below the line) */}
      {scannedFraction > 0 && (
        <rect
          x="0" y="0"
          width={DOC_W - 5}
          height={Math.min(scannedH, DOC_H - 6)}
          rx={scannedFraction >= 1 ? "8" : "0"}
          fill={`rgba(179,90,0,0.055)`}
          style={{ clipPath: scannedFraction >= 1 ? "none" : undefined }}
        />
      )}

      {/* Top header band */}
      <rect width={DOC_W - 5} height="34" rx="8" fill={PRIMARY} opacity="0.08" />

      {/* DocForge icon */}
      <rect x="14" y="11" width="12" height="12" rx="3" fill={PRIMARY} opacity="0.85" />
      {/* Header text lines */}
      <rect x="32" y="13" width="58" height="4" rx="2" fill={PRIMARY} opacity="0.3" />
      <rect x="32" y="20" width="38" height="3" rx="1.5" fill={PRIMARY} opacity="0.18" />

      {/* Divider */}
      <rect x="14" y="42" width={DOC_W - 34} height="1" fill={RULE} />

      {/* Text rows */}
      {[54,66,78,92,104,116,130,142,154,168,180,194,206].map((y,i) => (
        y < DOC_H - 14 ? (
          <rect key={i} x="14" y={y}
            width={i % 4 === 2 ? DOC_W - 70 : i % 3 === 1 ? DOC_W - 46 : DOC_W - 32}
            height="4.5" rx="2.25"
            fill={y < scannedH ? PRIMARY : RULE}
            opacity={y < scannedH ? 0.22 : 0.55 - i * 0.03}
          />
        ) : null
      ))}
    </svg>
  );
}

// ─── OUTPUT CARD SVG ─────────────────────────────────────────────────────────
function CardSVG({ label, accent, bg, tag }: { label:string; accent:string; bg:string; tag:string }) {
  const w = 112, h = 144;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <rect x="4" y="5" width={w-4} height={h-4} rx="8" fill="rgba(0,0,0,0.09)" />
      <rect width={w-4} height={h-4} rx="8" fill={bg} />
      <rect width={w-4} height="36" rx="8" fill={accent} opacity="0.13" />
      {/* Label badge */}
      <rect x="10" y="10" width="44" height="17" rx="4" fill={accent} />
      <text x="32" y="22.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">{label}</text>
      {/* Tag */}
      <text x={w-14} y="22" textAnchor="end" fill={accent} fontSize="7" opacity="0.65" fontFamily="system-ui,sans-serif">{tag}</text>
      {/* Lines */}
      <rect x="10" y="50" width="82" height="5" rx="2.5" fill={accent} opacity="0.14" />
      <rect x="10" y="63" width="62" height="4" rx="2"   fill={accent} opacity="0.10" />
      <rect x="10" y="76" width="72" height="4" rx="2"   fill={accent} opacity="0.10" />
      <rect x="10" y="89" width="52" height="4" rx="2"   fill={accent} opacity="0.08" />
      {/* Check circle */}
      <circle cx={w-18} cy={h-18} r="11" fill={accent} opacity="0.13" />
      <path d={`M${w-23} ${h-18}l4 4 7-8`} stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── SCAN LINE (vertical sweep, top→bottom through the document) ──────────────
function ScanLine({ progress }: { progress: number }) {
  // progress: 0 (top of doc) → 1 (bottom of doc)
  const y = progress * (DOC_H - 6);
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: y,
        height: 3,
        background: `linear-gradient(90deg, transparent 0%, ${PRIMARY}cc 15%, ${PRIMARY} 50%, ${PRIMARY}cc 85%, transparent 100%)`,
        boxShadow: `0 0 0 1px ${PRIMARY}55, 0 0 20px 6px ${PRIMARY}44, 0 -4px 16px 2px ${PRIMARY}22`,
      }}
    />
  );
}

// ─── UPLOAD BOX ──────────────────────────────────────────────────────────────
function UploadBox() {
  return (
    <div className="relative w-full max-w-[380px] h-[430px] flex items-center justify-center">
      {/* Back Card (stacked and rotated behind) */}
      <div 
        className="absolute w-[340px] h-[410px] bg-[#FAF9F6] rounded-[22px] border border-[#E6E1DA] shadow-[0_8px_25px_rgba(0,0,0,0.02)]"
        style={{
          transform: "rotate(6deg) translate(14px, 12px)",
          zIndex: 1,
        }}
      />
      
      {/* Front Card (Main Upload Card) */}
      <div 
        className="absolute w-[340px] h-[410px] bg-white rounded-[22px] border border-[#E6E1DA] shadow-[0_20px_45px_rgba(0,0,0,0.06)] flex flex-col p-6 z-10"
        style={{
          transform: "rotate(0deg)",
          zIndex: 2,
        }}
      >
        {/* Bronze Top Edge Gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 rounded-t-[22px]"
          style={{
            background: "linear-gradient(90deg, #A85A10 0%, #D48C45 50%, #A85A10 100%)",
          }}
        />

        {/* Header Block */}
        <div className="flex items-center gap-4 mt-3 mb-5">
          {/* File Upload Icon */}
          <div className="w-10 h-10 rounded-lg bg-[#B35A00]/10 flex items-center justify-center text-[#B35A00] shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v-5m0 0l-3 3m3-3l3 3" />
            </svg>
          </div>
          <div className="text-left">
            <h4 className="font-display font-bold text-[#111111] leading-tight" style={{ fontSize: "14.5px" }}>
              Drag or Drop here
            </h4>
            <p className="text-xs text-[#6B6B6B]" style={{ fontSize: "11px", marginTop: "2px" }}>
              Convert locally in browser
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-[#E6E1DA] mb-5 w-full" />

        {/* Drop Zone Area */}
        <div className="flex-1 border-2 border-dashed border-[#A85A10]/40 rounded-2xl flex flex-col items-center justify-center p-6 bg-[#FAF9F6]/50 hover:bg-[#FAF9F6] transition-colors duration-300 cursor-pointer group">
          {/* Cloud Upload Icon */}
          <div className="text-[#A85A10] mb-4 transition-transform duration-300 group-hover:scale-105">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-4-4m4 4l4-4M4 16.5A5.5 5.5 0 009.5 22h5a5.5 5.5 0 005.5-5.5a5.5 5.5 0 00-4.82-5.43A4 4 0 0012 3a4 4 0 00-3.68 2.45A5.5 5.5 0 004 16.5z" />
            </svg>
          </div>
          
          <span className="font-display font-bold text-[#111111] mb-1" style={{ fontSize: "13px" }}>
            Drop file or click to select
          </span>
          <span className="text-[#6B6B6B] font-medium tracking-wide" style={{ fontSize: "10px" }}>
            PDF, DOCX, TXT, Images
          </span>
        </div>

        {/* Footer Status */}
        <div className="flex items-center gap-2 mt-5 text-[11px] font-semibold text-[#6B6B6B] tracking-wide">
          <span className="w-2.5 h-2.5 rounded-full bg-[#78B399]" />
          <span>Client-side · 100% Private</span>
        </div>
      </div>
    </div>
  );
}

// ─── ANIMATION PANEL ─────────────────────────────────────────────────────────
type Phase = "idle"|"dropping"|"scanning"|"fanning"|"settled_cards"|"cards_to_upload"|"settled_upload"|"resetting";

function AnimationPanel() {
  const [phase, setPhase]             = useState<Phase>("idle");
  const [scanProg, setScanProg]       = useState(0);
  const [scannedFrac, setScannedFrac] = useState(0);
  const [showScan, setShowScan]       = useState(false);
  const [showCards, setShowCards]     = useState(false);
  const [showUpload, setShowUpload]   = useState(false);
  const [docVisible, setDocVisible]   = useState(true);

  const running = useRef(true);
  const rafRef  = useRef(0);

  const docCtrl = useAnimation();
  const uploadCtrl = useAnimation();
  // One hook per card
  const a0=useAnimation(),a1=useAnimation(),a2=useAnimation();
  const a3=useAnimation(),a4=useAnimation(),a5=useAnimation();
  const cardCtrls = [a0,a1,a2,a3,a4,a5];

  const resetAllCards = useCallback(() => {
    cardCtrls.forEach(c => c.set({ x:0, y:0, rotate:0, scale:0, opacity:0 }));
  },[a0,a1,a2,a3,a4,a5]); // eslint-disable-line

  const runCycle = useCallback(async () => {
    if (!running.current) return;

    // ── RESET ─────────────────────────────────────────────────
    setPhase("idle");
    setShowCards(false);
    setShowScan(false);
    setShowUpload(false);
    setScanProg(0);
    setScannedFrac(0);
    setDocVisible(true);
    docCtrl.set({ y: -460, opacity: 0, scale: 1, rotateX: 20 });
    uploadCtrl.set({ y: -460, opacity: 0, scale: 1, rotateX: 20 });
    resetAllCards();
    await new Promise(r => setTimeout(r, 500));

    // ── 1. DOC DROPS IN (spring, 1.4s) ────────────────────────
    setPhase("dropping");
    await docCtrl.start({
      y: 0, opacity: 1, rotateX: 0,
      transition: {
        y:       { type:"spring", stiffness:120, damping:20, mass:1.3 },
        rotateX: { type:"spring", stiffness:90,  damping:18 },
        opacity: { duration:0.12 },
      },
    });
    await new Promise(r => setTimeout(r, 700));

    // ── 2. SCAN LINE SWEEPS TOP → BOTTOM (2.4s) ───────────────
    setPhase("scanning");
    setShowScan(true);
    const SCAN_MS = 2400;
    const t0 = performance.now();
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        if (!running.current) { resolve(); return; }
        const p = Math.min((now - t0) / SCAN_MS, 1);
        setScanProg(p);
        setScannedFrac(p);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
        else resolve();
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    // ── FLASH on completion ────────────────────────────────────
    setShowScan(false);
    await docCtrl.start({ scale:[1,1.03,1], transition:{ duration:0.45, ease:"easeInOut" } });
    await new Promise(r => setTimeout(r, 300));

    // ── 3. DOC FADES & CARDS FAN OUT ──────────────────────────
    setPhase("fanning");
    setShowCards(true);
    await Promise.all([
      docCtrl.start({
        scale:0.8, opacity:0,
        transition:{ duration:0.4, ease:[0.4,0,1,1] },
      }),
      ...cardCtrls.map((ctrl, i) =>
        ctrl.start({
          x: FAN_DEST[i].x,
          y: FAN_DEST[i].y,
          rotate: FAN_DEST[i].r,
          opacity: 1,
          scale: 1,
          transition:{
            delay: 0.05 + i * 0.08,
            type:"spring", stiffness:240, damping:24, mass:0.85,
          },
        })
      ),
    ]);
    setDocVisible(false);

    // ── 4. HOLD CARDS FAN ──────────────────────────────────────
    setPhase("settled_cards");
    await new Promise(r => setTimeout(r, 2600));

    // ── 5. CARDS FOLD BACK & UPLOAD BOX DROPS IN ──────────────
    setPhase("cards_to_upload");
    setShowUpload(true);
    await Promise.all([
      ...cardCtrls.map((ctrl, i) =>
        ctrl.start({
          scale: 0.1, opacity: 0, y: FAN_DEST[i].y + 110,
          transition: { delay: i * 0.03, duration: 0.35, ease: "easeIn" }
        })
      ),
      uploadCtrl.start({
        y: 0, opacity: 1, rotateX: 0,
        transition: {
          y: { type: "spring", stiffness: 135, damping: 17, mass: 1.2 },
          rotateX: { type: "spring", stiffness: 95, damping: 15 },
          opacity: { duration: 0.15 }
        }
      })
    ]);
    setShowCards(false);

    // ── 6. UPLOAD BOX SETTLED ─────────────────────────────────
    setPhase("settled_upload");
    // Halt permanently on the settled Upload Box state as requested
  }, [docCtrl, uploadCtrl, a0,a1,a2,a3,a4,a5, resetAllCards]); // eslint-disable-line

  useEffect(() => {
    running.current = true;
    docCtrl.set({ y:-460, opacity:0, scale:1, rotateX:20 });
    uploadCtrl.set({ y:-460, opacity:0, scale:1, rotateX:20 });
    resetAllCards();
    const t = setTimeout(runCycle, 600);
    return () => {
      running.current = false;
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line

  return (
    // Fixed-height container — animation is self-contained here
    <div className="relative w-full" style={{ height: 540 }}>

      {/* ── Main document, centred in panel ── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective:"900px" }}>
        {docVisible && (
          <motion.div
            animate={docCtrl}
            className="relative"
            style={{
              transformStyle:"preserve-3d",
              filter: showScan
                ? `drop-shadow(0 0 22px ${PRIMARY}66) drop-shadow(0 16px 40px rgba(0,0,0,0.14))`
                : "drop-shadow(0 16px 40px rgba(0,0,0,0.13)) drop-shadow(0 4px 12px rgba(0,0,0,0.07))",
              transition:"filter 0.25s ease",
            }}
          >
            {/* Scan line clipped to doc face */}
            <div
              className="absolute overflow-hidden pointer-events-none"
              style={{ inset:0, width: DOC_W - 5, height: DOC_H - 6, top:0, left:0 }}
            >
              {showScan && <ScanLine progress={scanProg} />}
            </div>

            <DocSVG scannedFraction={showScan ? scannedFrac : scannedFrac >= 1 ? 1 : 0} />
          </motion.div>
        )}
      </div>

      {/* ── Output cards (overflow the panel naturally) ── */}
      {CARDS.map((card, i) => (
        <motion.div
          key={card.id}
          animate={cardCtrls[i]}
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            marginTop: -72,
            marginLeft: -56,
            display: showCards ? "block" : "none",
            filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.13)) drop-shadow(0 3px 6px rgba(0,0,0,0.06))",
            transformOrigin: "50% 100%",
            zIndex: i,
          }}
        >
          <CardSVG {...card} />
        </motion.div>
      ))}

      {/* ── Dropping Upload Box ── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective:"900px" }}>
        {showUpload && (
          <motion.div
            animate={uploadCtrl}
            className="relative w-full flex justify-center"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <UploadBox />
          </motion.div>
        )}
      </div>


    </div>
  );
}

// ─── HERO SECTION ────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: PAGE_BG, minHeight:"100svh" }}
    >
      {/* Warm dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:`radial-gradient(circle, ${RULE} 1px, transparent 1px)`,
          backgroundSize:"40px 40px",
          opacity:0.5,
        }}
      />
      {/* Subtle warm top-right glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:`radial-gradient(ellipse 55% 55% at 82% 10%, rgba(179,90,0,0.05) 0%, transparent 65%)`,
        }}
      />

      <div
        className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        style={{ minHeight:"100svh" }}
      >
        {/* ── LEFT COLUMN: COPY ──────────────────────────────── */}
        <motion.div
          className="flex flex-col justify-center py-24 lg:py-0"
          initial={{ opacity:0, y:24 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:[0.22,1,0.36,1] }}
        >


          {/* Headline */}
          <h1
            className="font-display font-medium tracking-tight leading-[1.04] mb-6"
            style={{ fontSize:"clamp(2.6rem,5.2vw,4.2rem)", color:TEXT_COL }}
          >
            Your files <br />
            <span style={{ color:PRIMARY }}>never leave</span><br />
            this tab.
          </h1>

          {/* Body */}
          <p className="text-lg leading-relaxed mb-9 max-w-[440px]" style={{ color:MUTED }}>
            Professional PDF tools built directly into your browser. Merge,
            compress, convert and sign files without uploading anything.
            Everything runs locally on your device for absolute privacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-10">
            <button
              className="px-8 py-3.5 rounded-full text-base font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: TEXT_COL,
                boxShadow:`0 4px 20px rgba(179,90,0,0.2)`,
              }}
              onMouseEnter={e=>(e.currentTarget.style.background=PRIMARY)}
              onMouseLeave={e=>(e.currentTarget.style.background=TEXT_COL)}
            >
              Start Converting for Free
            </button>
            <button
              className="px-8 py-3.5 rounded-full text-base font-medium transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                background:"rgba(255,255,255,0.6)",
                border:`1px solid rgba(0,0,0,0.09)`,
                color:TEXT_COL,
                backdropFilter:"blur(8px)",
              }}
            >
              Browse All Tools
            </button>
          </div>

          {/* Trust tags */}
          <div
            className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
            style={{ color:MUTED }}
          >
            {[
              { icon:<CloudOff className="w-4 h-4"/>, text:"Zero Uploads"  },
              { icon:<Cpu      className="w-4 h-4"/>, text:"Runs Locally"  },
              { icon:<Trash2   className="w-4 h-4"/>, text:"Auto Cleared"  },
            ].map(({icon,text})=>(
              <div key={text} className="flex items-center gap-1.5">
                <span style={{ color:PRIMARY }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN: ANIMATION (desktop only) ─────────── */}
        <motion.div
          className="hidden lg:flex items-center justify-center"
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ delay:0.25, duration:0.7 }}
        >
          <AnimationPanel />
        </motion.div>

        {/* Mobile placeholder */}
        <div className="block lg:hidden pb-16">
          <div
            className="rounded-2xl p-6 flex flex-col gap-3"
            style={{
              background:"rgba(255,255,255,0.55)",
              border:`1px solid ${RULE}`,
              backdropFilter:"blur(8px)",
            }}
          >
            <DocSVG scannedFraction={0.5} />
            <p className="text-sm" style={{ color:MUTED }}>
              Drop a file. It never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
