import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FileText, Edit3, Download, CheckCircle2 } from "lucide-react";

export function CVBuilder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], ["-30deg", "30deg"]);
  const rotateX = useTransform(scrollYProgress, [0, 1], ["10deg", "-10deg"]);
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section ref={containerRef} className="py-40 px-6 bg-brand-bg relative overflow-hidden perspective-1000">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        
        {/* Text Content */}
        <div className="order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-brand-text text-sm font-medium mb-8">
            <Edit3 className="w-4 h-4" />
            <span>Pro Resume Builder</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-medium mb-6 leading-tight">
            Craft the perfect CV. <br/>
            <span className="text-brand-secondary">Visually.</span>
          </h2>
          <p className="text-xl text-brand-secondary mb-10 max-w-md">
            Our powerful builder lets you manipulate layouts seamlessly, optimize for ATS, and export pixel-perfect PDFs instantly.
          </p>
          
          <ul className="space-y-4">
            {['Professional ATS templates', 'Live WYSIWYG editing', 'One-click PDF export', 'Local auto-save'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-lg font-medium text-brand-text">
                <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Floating 3D Resume */}
        <div className="order-1 lg:order-2 h-[600px] flex items-center justify-center relative">
          
          {/* Lighting/glow effects */}
          <div className="absolute inset-0 bg-brand-primary/5 blur-[100px] rounded-full" />
          
          <motion.div 
            style={{ rotateY, rotateX, y, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-md aspect-[1/1.4] bg-white rounded-md shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-black/5"
          >
            {/* Edge thickness faux 3D */}
            <div className="absolute top-0 bottom-0 -left-2 w-2 bg-gray-200" style={{ transformOrigin: 'right', transform: 'rotateY(-90deg)' }} />
            
            {/* Resume Content Mockup */}
            <div className="p-8 h-full flex flex-col pointer-events-none" style={{ transform: "translateZ(1px)" }}>
              <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-6">
                <div>
                  <div className="w-32 h-8 bg-gray-900 rounded mb-2" />
                  <div className="w-48 h-3 bg-gray-300 rounded" />
                </div>
                <div className="space-y-2 text-right flex flex-col items-end">
                  <div className="w-24 h-2 bg-gray-200 rounded" />
                  <div className="w-32 h-2 bg-gray-200 rounded" />
                </div>
              </div>
              
              <div className="flex gap-6 flex-1">
                <div className="w-1/3 space-y-6">
                  <div>
                    <div className="w-16 h-3 bg-brand-primary rounded mb-4" />
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-gray-200 rounded" />
                      <div className="w-5/6 h-2 bg-gray-200 rounded" />
                      <div className="w-full h-2 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div>
                    <div className="w-16 h-3 bg-brand-primary rounded mb-4" />
                    <div className="space-y-3">
                      <div className="w-full h-4 bg-gray-100 rounded" />
                      <div className="w-full h-4 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
                <div className="w-2/3 space-y-8">
                  {[1, 2].map((i) => (
                    <div key={i}>
                      <div className="w-24 h-3 bg-gray-900 rounded mb-2" />
                      <div className="w-32 h-2 bg-gray-400 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <div className="w-4/5 h-2 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* UI Overlay */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 right-4 glass-panel px-4 py-2 rounded-full flex items-center gap-2 shadow-xl"
              style={{ transform: "translateZ(30px)" }}
            >
              <Download className="w-4 h-4 text-brand-text" />
              <span className="text-xs font-semibold">Export PDF</span>
            </motion.div>
          </motion.div>
        </div>
        
      </div>
    </section>
  );
}
