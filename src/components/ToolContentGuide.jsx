import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Interactive FAQ Accordion rendered at the bottom of tool pages
 * Targets Google's "People Also Ask" search queries without duplicate guides.
 */
export default function ToolContentGuide({ seoData }) {
  const [openFaq, setOpenFaq] = useState(null);

  if (!seoData?.faqs || seoData.faqs.length === 0) return null;

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <section className="w-full max-w-[900px] mx-auto mt-16 px-4 py-8 border-t border-outline-variant/30">
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          Frequently Asked Questions
        </span>
        <h2 className="text-xl md:text-2xl font-bold text-on-background mt-3 tracking-tight">
          Got Questions? We have answers.
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {seoData.faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div 
              key={idx}
              className="border border-outline-variant/40 rounded-2xl overflow-hidden bg-surface-container/30 transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left text-xs md:text-sm font-semibold text-on-background hover:text-primary transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 md:px-5 pb-5 pt-1 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/20 animate-in fade-in duration-200">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
