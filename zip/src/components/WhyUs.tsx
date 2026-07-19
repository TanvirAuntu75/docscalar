import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

const panels = [
  { title: "Private", desc: "Military-grade local processing. Zero data leaves your machine." },
  { title: "Instant", desc: "No upload queues. No processing delays. Pure native performance." },
  { title: "Desktop Grade", desc: "Professional tools packaged into an elegant web interface." }
];

function GlassPanel({ title, desc, index }: { title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  // Softer, premium 7-degree tilt to prevent perspective clipping and visual distortion
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      viewport={{ once: true, margin: "-80px" }}
      className="relative w-full h-[360px] rounded-3xl cursor-crosshair group perspective-1000"
    >
      {/* The main glass body */}
      <div 
        className="absolute inset-0 rounded-3xl glass-panel bg-white/30 border border-white/60 overflow-hidden flex flex-col justify-end p-8 transition-colors duration-500 group-hover:bg-white/40"
        style={{ transform: "translateZ(20px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5 opacity-50" />
        
        {/* Glow effect that follows mouse */}
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"
          style={{
            background: useMotionTemplate`radial-gradient(circle 250px at ${useTransform(mouseXSpring, v => (v + 0.5) * 100)}% ${useTransform(mouseYSpring, v => (v + 0.5) * 100)}%, rgba(255,255,255,0.8), transparent)`
          }}
        />

        <div className="relative z-10" style={{ transform: "translateZ(40px)" }}>
          <h3 className="text-3xl font-medium mb-3 text-brand-text">{title}</h3>
          <p className="text-brand-secondary leading-relaxed">{desc}</p>
        </div>
      </div>
      
      {/* Faux thickness / depth layers */}
      <div className="absolute inset-0 rounded-3xl bg-black/5 border border-black/10 -z-10" style={{ transform: "translateZ(-8px)" }} />
      <div className="absolute inset-0 rounded-3xl bg-black/10 blur-xl -z-20" style={{ transform: "translateZ(-24px)" }} />
    </motion.div>
  );
}

export default function WhyUs() {
  return (
    <section className="py-24 px-6 bg-[#EBE7E0] relative overflow-hidden perspective-1000">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 relative z-10">
          <h2 className="text-5xl md:text-7xl font-medium mb-6">Why DocForge</h2>
          <p className="text-xl text-brand-secondary max-w-2xl mx-auto">Built on a foundation of local-first engineering, bringing uncompromised power to the browser.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {panels.map((panel, i) => (
            <GlassPanel key={panel.title} title={panel.title} desc={panel.desc} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
export { WhyUs };
