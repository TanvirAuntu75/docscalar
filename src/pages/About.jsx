import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function About() {
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'name': 'About Us — The Modern Document Operating System | DocScalar',
    'description': 'Learn about DocScalar Inc., our mission to deliver private, lightning-fast, client-first document tools, and our transparent engineering standards.',
    'url': 'https://docscalar.app/about',
    'publisher': {
      '@type': 'Organization',
      'name': 'DocScalar Inc.',
      'url': 'https://docscalar.app'
    }
  };

  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center px-margin-mobile py-xl relative">
      <SEOHead 
        title="About Us — The Modern Document Operating System | DocScalar" 
        description="Learn about DocScalar Inc., our mission to deliver private, lightning-fast, client-first document tools, and our transparent engineering standards." 
        schema={aboutSchema}
      />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none" />

      <div className="w-full max-w-4xl mb-4 z-10 text-left">
        <Link to="/" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary text-sm font-medium transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Home
        </Link>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 md:p-12 max-w-4xl w-full shadow-md z-10 text-left">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            <span>Our Mission & Company</span>
          </div>
          <span className="text-xs text-on-surface-variant">DocScalar Inc.</span>
        </div>

        <h1 className="font-h1 text-[32px] md:text-[42px] text-on-background mb-4 font-semibold tracking-tight">
          The Private, High-Performance Document Engine
        </h1>
        <p className="font-body-md text-on-surface-variant mb-8 text-sm md:text-base leading-relaxed">
          DocScalar was created to eliminate the frustrations of legacy online document tools: predatory paywalls, intrusive tracking scripts, bloated ad banners, and opaque file storage policies. We build modern, client-first document infrastructure that is fast, accessible, and uncompromising on privacy.
        </p>

        {/* Highlight Stats / Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-center">
            <div className="text-3xl font-extrabold text-primary mb-1">41+</div>
            <div className="text-xs font-semibold text-on-background">Specialized Tools</div>
            <p className="text-[11px] text-on-surface-variant mt-1">From conversion and OCR to interactive forms & CV studio.</p>
          </div>
          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-center">
            <div className="text-3xl font-extrabold text-primary mb-1">100%</div>
            <div className="text-xs font-semibold text-on-background">Zero AI Training</div>
            <p className="text-[11px] text-on-surface-variant mt-1">Your data is never ingested to train machine learning models.</p>
          </div>
          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-center">
            <div className="text-3xl font-extrabold text-primary mb-1">&lt;30m</div>
            <div className="text-xs font-semibold text-on-background">Automated Hard Purge</div>
            <p className="text-[11px] text-on-surface-variant mt-1">Transient memory buffers are securely and completely wiped.</p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="flex flex-col gap-8 text-on-surface-variant font-body-md text-sm leading-relaxed">
          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              Our Core Engineering Philosophy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/40">
                <h3 className="font-semibold text-sm text-on-background mb-1">1. Edge & Client-First Execution</h3>
                <p className="text-xs text-on-surface-variant">
                  We believe the best place to process your private files is right on your machine. We leverage cutting-edge WebAssembly, Web Workers, and WebGL to execute conversions and manipulations locally whenever technically feasible.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/40">
                <h3 className="font-semibold text-sm text-on-background mb-1">2. ISO Standards & Typographic Precision</h3>
                <p className="text-xs text-on-surface-variant">
                  Document fidelity is non-negotiable. Our engines strictly enforce ISO 32000 (PDF), ISO 19005 (PDF/A), and OpenXML specifications to eliminate shifted text, broken tables, and missing font metrics.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/40">
                <h3 className="font-semibold text-sm text-on-background mb-1">3. Transparent, Honest Economics</h3>
                <p className="text-xs text-on-surface-variant">
                  No deceptive trial signups that silently charge credit cards, no fake download buttons, and no restrictive paywalls on essential everyday utilities.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/40">
                <h3 className="font-semibold text-sm text-on-background mb-1">4. Uncompromising Data Sovereignty</h3>
                <p className="text-xs text-on-surface-variant">
                  DocScalar was founded on the conviction that user confidentiality should never be traded for convenience. We never sell metadata, analyze file text, or monetize user documents.
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              Company Identity & Governance
            </h2>
            <p>
              DocScalar Inc. operates as a dedicated software company providing cloud productivity services and enterprise document infrastructure. Our distributed engineering team is committed to building open, resilient web software.
            </p>
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-on-background text-sm">Have questions or enterprise inquiries?</p>
                <p className="text-xs text-on-surface-variant">Get in touch with our product and engineering leadership.</p>
              </div>
              <Link 
                to="/contact" 
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <span>Contact DocScalar</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
