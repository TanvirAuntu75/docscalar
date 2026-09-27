import React from "react";
import { Cpu, ShieldCheck, Fingerprint } from "lucide-react";
import { CascadeTextHover } from "./ui/cascade-text";

const cards = [
  {
    id: 1,
    title: "Smart Command Menu",
    description: "Trigger tools, run operations, and navigate the workspace instantly. Use simple keyboard commands to execute actions in seconds without clicking.",
    icon: Cpu,
    color: "from-blue-100/50 to-indigo-100/50 dark:from-blue-900/30 dark:to-indigo-900/30"
  },
  {
    id: 2,
    title: "Confidential Processing",
    description: "Enterprise security by default. Document operations run with secure transit encryption, isolated memory pipelines, and automatic file purging.",
    icon: ShieldCheck,
    color: "from-sky-100/50 to-blue-100/50 dark:from-sky-900/30 dark:to-blue-900/30"
  },
  {
    id: 3,
    title: "Secure e-Signatures",
    description: "Sign agreements and PDFs with confidence. Place visual signature stamps, draw freehand, or secure documents with official digital certificates.",
    icon: Fingerprint,
    color: "from-emerald-100/50 to-teal-100/50 dark:from-emerald-900/30 dark:to-teal-900/30"
  }
];


export function StickyStack() {
  return (
    <section id="features" className="py-24 bg-transparent px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-on-background mb-6 font-headings">
            <CascadeTextHover text="Advanced Capabilities" />
          </h2>
          <p className="text-on-surface-variant font-body-lg">Scroll to explore the stack.</p>
        </div>

        <div className="relative pb-[20vh]">
          {cards.map((card, index) => {
            return (
              <div 
                key={card.id} 
                className="sticky top-28 mb-8"
                style={{ zIndex: index }}
              >
                <div className={`w-full h-80 rounded-3xl bg-surface/80 backdrop-blur-xl border border-outline-variant/30 p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative overflow-hidden group`}>
                   <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                   
                   <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-outline-variant/30 shadow-sm">
                         <card.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                         <h3 className="text-3xl font-bold text-on-background mb-4 font-headings">{card.title}</h3>
                         <p className="text-lg text-on-surface-variant max-w-xl font-body-lg">{card.description}</p>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
