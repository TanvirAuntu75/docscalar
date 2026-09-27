import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function Security() {
  const securitySchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Security & Privacy Architecture — DocScalar',
    'description': "Explore DocScalar's enterprise security architecture: TLS 1.3 encryption, RAM-only processing, 30-minute auto-purge, zero AI training, and GDPR/CCPA compliance.",
    'url': 'https://docscalar.app/security',
    'publisher': {
      '@type': 'Organization',
      'name': 'DocScalar Inc.',
      'url': 'https://docscalar.app'
    }
  };

  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center px-margin-mobile py-xl relative">
      <SEOHead 
        title="Security & Privacy Architecture — DocScalar" 
        description="Explore DocScalar's enterprise security architecture: TLS 1.3 encryption, RAM-only processing, 30-minute auto-purge, zero AI training, and GDPR/CCPA compliance." 
        schema={securitySchema}
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
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Enterprise Security Whitepaper</span>
          </div>
          <span className="text-xs text-on-surface-variant">Last audited: September 2026</span>
        </div>

        <h1 className="font-h1 text-[32px] md:text-[42px] text-on-background mb-4 font-semibold tracking-tight">
          Security & Privacy Architecture
        </h1>
        <p className="font-body-md text-on-surface-variant mb-8 text-sm md:text-base leading-relaxed">
          DocScalar is engineered from the ground up on a zero-trust, privacy-first foundation. We believe your sensitive documents, financial statements, medical records, and legal contracts belong exclusively to you.
        </p>

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[22px]">lock</span>
              <h3 className="font-semibold text-sm text-on-background">TLS 1.3 & AES-256</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              All data in transit is encrypted with modern TLS 1.3 ciphers featuring Perfect Forward Secrecy (PFS). At-rest volumes utilize hardware-accelerated AES-256 encryption.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[22px]">memory</span>
              <h3 className="font-semibold text-sm text-on-background">Transient RAM Execution</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Documents are processed in transient, memory-only sandboxes with zero disk persistence, isolated RAM execution, and immediate post-download purge.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[22px]">auto_delete</span>
              <h3 className="font-semibold text-sm text-on-background">30-Minute Hard Purge</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Server-processed outputs are held in short-lived, encrypted temporary storage solely to facilitate your download. All artifacts are irreversibly purged within 30 minutes.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[22px]">block</span>
              <h3 className="font-semibold text-sm text-on-background">Zero AI Model Training</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              We maintain a strict invariant: your documents, images, scanned texts, and metadata are never fed into foundation models, training sets, or indexing engines.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="flex flex-col gap-8 text-on-surface-variant font-body-md text-sm leading-relaxed">
          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              1. Transport Layer Security & Cryptography
            </h2>
            <p>
              Every interaction with DocScalar (web interfaces, API calls, and WebAssembly bundles) enforces TLS 1.3 transport security. Insecure protocols (TLS 1.0, 1.1, and SSLv3) and weak cipher suites are permanently disabled on our gateways.
            </p>
            <p>
              HTTP Strict Transport Security (HSTS) is enabled with preload directives, guaranteeing browsers refuse unencrypted HTTP connections.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              2. Sandboxed Isolated Processing
            </h2>
            <p>
              Unlike legacy web converters that write unencrypted user files to shared disks, DocScalar executes document conversions in isolated, transient memory sandboxes with zero permanent disk persistence.
            </p>
            <p>
              When heavy tasks (such as deep OCR, complex Word layout reconstruction, or PDF repair) require server-side computing:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li>Jobs run in isolated, stateless container sandboxes with strictly scoped CPU/memory quotas.</li>
              <li>Sandboxes have no outbound internet access during document execution, preventing SSRF or exfiltration vectors.</li>
              <li>Containers are recycled and shredded immediately after execution completes.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              3. Automated Purge & Retention Lifecycles
            </h2>
            <p>
              We implement deterministic, automated purge cron jobs across all worker instances:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Immediate Post-Process Shred:</strong> Raw uploaded inputs are unlinked from file descriptors as soon as the rendering stream completes.</li>
              <li><strong>30-Minute Download TTL:</strong> Generated artifacts are stored with a strict 30-minute Time-To-Live (TTL). Once the TTL expires, files are unrecoverably deleted using cryptographically secure zeroing.</li>
              <li><strong>Zero Cold Backups:</strong> User document files are excluded from all database backups and snapshots.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              4. Global Regulatory Compliance (GDPR & CCPA)
            </h2>
            <p>
              DocScalar Inc. adheres to the European Union General Data Protection Regulation (GDPR, EU 2016/679) and California Consumer Privacy Act (CCPA/CPRA):
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Data Minimization:</strong> We collect only the minimum telemetry required to authenticate accounts and authenticate Pro subscriptions.</li>
              <li><strong>Right to Erasure (Article 17):</strong> Users can execute immediate, 1-click account and data erasure directly from their profile menu.</li>
              <li><strong>Data Processing Agreements:</strong> Enterprise teams can execute standardized DPAs including Standard Contractual Clauses (SCCs).</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">
              5. Security Inquiries & Responsible Disclosure
            </h2>
            <p>
              We welcome collaboration with independent security researchers and white-hat auditors. If you believe you have discovered a potential security vulnerability, please report it immediately to our dedicated response team:
            </p>
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-on-background">Security Operations Team</p>
                <p className="text-xs text-on-surface-variant font-label-mono">security@docscalar.app</p>
              </div>
              <a 
                href="mailto:security@docscalar.app" 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">mail</span>
                Report Security Finding
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
