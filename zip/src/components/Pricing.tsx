import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    desc: "For basic document tasks.",
    features: ["Merge up to 5 PDFs", "Basic Compression", "Local Processing", "Community Support"],
    popular: false,
    color: "bg-white/40"
  },
  {
    name: "Pro",
    price: "$12/mo",
    desc: "For heavy workflows and professionals.",
    features: ["Unlimited Merging", "Advanced OCR", "CV Builder Pro", "Priority Support", "Batch Processing"],
    popular: true,
    color: "bg-white/80"
  }
];

function PricingCard({ tier, index }: { tier: typeof tiers[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Controlled 8-degree maximum tilt to prevent clipping
    x.set((mouseX / width - 0.5) * 8); 
    y.set((mouseY / height - 0.5) * -8);
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
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      viewport={{ once: true, margin: "-80px" }}
      style={{
        rotateX: mouseYSpring,
        rotateY: mouseXSpring,
        transformStyle: "preserve-3d",
      }}
      className={`relative w-full max-w-sm mx-auto rounded-[2.5rem] p-8 perspective-1000 cursor-crosshair transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] ${tier.popular ? 'border-2 border-brand-primary/20 shadow-[0_0_40px_rgba(179,90,0,0.1)]' : 'border border-black/5 shadow-2xl'}`}
    >
      {/* Background layer */}
      <div className={`absolute inset-0 rounded-[2.5rem] ${tier.color} backdrop-blur-3xl -z-10`} style={{ transform: "translateZ(-15px)" }} />
      
      {/* Subtle glow for pro */}
      {tier.popular && (
        <div className="absolute inset-0 bg-brand-primary/5 blur-3xl rounded-[2.5rem] -z-20" />
      )}

      {/* Content */}
      <div style={{ transform: "translateZ(30px)" }}>
        {tier.popular && (
          <span className="inline-block px-3 py-1 bg-brand-primary text-white text-xs font-bold tracking-wider uppercase rounded-full mb-6 shadow-lg">
            Most Popular
          </span>
        )}
        
        <h3 className="text-3xl font-display font-medium text-brand-text mb-2">{tier.name}</h3>
        <p className="text-brand-secondary text-sm h-10">{tier.desc}</p>
        
        <div className="my-8 flex items-baseline gap-1">
          <span className="text-5xl font-display font-medium">{tier.price}</span>
        </div>
        
        <button className={`w-full py-4 rounded-full font-medium transition-all transform hover:scale-105 active:scale-95 mb-8 cursor-pointer ${tier.popular ? 'bg-brand-text text-white hover:bg-brand-primary hover:shadow-[0_0_20px_rgba(179,90,0,0.3)]' : 'bg-white border border-black/10 text-brand-text hover:bg-black/5'}`}>
          Get Started
        </button>
        
        <ul className="space-y-4">
          {tier.features.map(f => (
            <li key={f} className="flex items-center gap-3 text-sm font-medium text-brand-secondary">
              <Check className={`w-4 h-4 ${tier.popular ? 'text-brand-primary' : 'text-black/30'}`} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section className="py-24 px-6 relative bg-brand-bg overflow-hidden" id="pricing">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 relative z-10">
          <h2 className="text-5xl md:text-7xl font-medium mb-6">Simple, transparent pricing.</h2>
          <p className="text-xl text-brand-secondary max-w-2xl mx-auto">Pay for power when you need it. Free forever for basic use.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto perspective-1000">
          {tiers.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;
