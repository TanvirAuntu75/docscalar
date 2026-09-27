import { useState, useEffect } from 'react';
import SEOHead from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch, BACKEND_URL } from '../utils/api';

const PRICING_FAQS = [
  {
    q: 'Can I cancel my DocScalar Pro subscription at any time?',
    a: 'Yes, absolutely. You can cancel your subscription at any time with a single click via the Manage Subscription portal in your profile dropdown. There are no cancellation fees, contracts, or hidden hurdles. Your Pro benefits remain active until the end of your prepaid billing period.'
  },
  {
    q: 'How does the 1 GB file size limit work?',
    a: 'While guest and free tier users are limited to 50 MB per file, Pro subscribers unlock up to 1,024 MB (1 GB) per document. Large files are processed using high-memory transient cloud sandboxes with dedicated CPU and memory allocation to ensure ultra-fast throughput without memory errors.'
  },
  {
    q: 'What is your document retention and auto-purge policy?',
    a: 'DocScalar operates under an absolute zero-persistence guarantee. All uploaded documents are held transiently in volatile RAM and automatically purged within 30 minutes of processing completion. We do not maintain cold backups of user files, nor do we ever read, index, or retain your data.'
  },
  {
    q: 'What is your refund policy?',
    a: 'We offer an unconditional 14-day 100% money-back guarantee on all DocScalar Pro subscriptions. If you are not completely satisfied for any reason, email support@docscalar.app within 14 days of purchase and we will issue a full refund immediately.'
  },
  {
    q: 'Are my files used to train AI or machine learning models?',
    a: 'Never. We maintain a strict policy: no customer documents, text snippets, OCR recognition outputs, or metadata are ever used to train or fine-tune artificial intelligence models. Your proprietary data remains completely private.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards (Visa, MasterCard, American Express, Discover), Apple Pay, Google Pay, and localized bank transfer rails through our secure payment gateway partner, Stripe. All billing transactions are encrypted with TLS 1.3.'
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { login, setTier, isAuthenticated, isPro, userEmail } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleFaq = (idx) => {
    setOpenFaq(prev => prev === idx ? null : idx);
  };

  useEffect(() => {
    if (isAuthenticated) {
      setEmail(userEmail || '');
    }
  }, [isAuthenticated, userEmail]);

  const isAlreadyPro = isPro;

  const handleGetStartedPro = async () => {
    if (isAlreadyPro) {
      navigate('/workspace');
      return;
    }
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }

    setPaying(true);
    setError('');

    try {
      const res = await apiFetch(`${BACKEND_URL}/api/billing/create-checkout`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      }

      // If Stripe is not configured or in beta mode, open the Early Access activation modal
      setModalOpen(true);
    } catch (err) {
      // Backend unavailable or offline fallback
      setModalOpen(true);
    } finally {
      setPaying(false);
    }
  };

  const handleActivateBetaPro = async () => {
    setPaying(true);
    setError('');

    try {
      const randomHash = Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('').toUpperCase();
      const licenseKey = `DS-PRO-BETA-${randomHash}`;

      if (isAuthenticated) {
        try {
          await apiFetch('/api/auth/upgrade-pro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey })
          });
        } catch (apiErr) {
          console.warn('Backend upgrade-pro failed, continuing with client state upgrade:', apiErr);
        }
        setTier({ tier: 'pro', proLicenseKey: licenseKey });
      } else {
        login({ email: email.trim() || 'beta-user@docscalar.internal', tier: 'pro', proLicenseKey: licenseKey });
      }

      setPaying(false);
      setSuccess(true);

      setTimeout(() => {
        setModalOpen(false);
        navigate('/workspace');
      }, 1600);
    } catch (err) {
      setPaying(false);
      setError(err.message || 'Failed to activate Pro beta license.');
    }
  };

  const pricingSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': PRICING_FAQS.map(faq => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.a
      }
    }))
  };

  return (
    <div className="bg-background min-h-screen py-24 px-margin-mobile md:px-margin-desktop relative">
      <SEOHead 
        title="Pricing Plans (DocScalar)" 
        description="Choose between our free tier and pro batch features. Fast, secure, and private document utilities." 
        schema={pricingSchema}
      />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="max-w-container-max mx-auto relative z-10">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="font-display-hero text-display-hero-mobile sm:text-display-hero text-on-background mb-4 leading-none">
            Tactile value,<br />transparent pricing.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
            Choose the fit for your workflow. Free standard processing, or premium batch capabilities.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-xl max-w-6xl mx-auto items-stretch">
          
          {/* Guest Mode Card */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[500px] text-left">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-h3 text-h3 font-semibold text-on-background mb-1">Guest Mode</h3>
                  <p className="font-body-sm text-sm text-on-surface-variant">For immediate, one-off document conversions.</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 border-b border-outline-variant pb-6 mb-6">
                <span className="font-display-hero text-[56px] text-on-background">$0</span>
                <span className="font-label-mono text-label-mono text-outline uppercase">No Account</span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8">
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  High speed secure processing
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  All 41 document & image tools
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  10 MB file size limit
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  3 free operations per calendar day
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full font-button text-button bg-surface-container text-on-background py-3.5 rounded-lg hover:bg-surface-container-high active:bg-surface-dim transition-colors border border-outline-variant text-center"
            >
              Use Guest Mode
            </button>
          </div>

          {/* Standard Free Tier Card */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[500px] text-left">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-h3 text-h3 font-semibold text-on-background mb-1">Standard Utility</h3>
                  <p className="font-body-sm text-sm text-on-surface-variant">For regular document workflows.</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 border-b border-outline-variant pb-6 mb-6">
                <span className="font-display-hero text-[56px] text-on-background">$0</span>
                <span className="font-label-mono text-label-mono text-outline uppercase">Free Account</span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8">
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  High speed secure processing
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  All 41 conversion & editing tools
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  15 MB file size limit
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background font-semibold text-primary">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  Unlimited daily document operations
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  10 Daily Stitch Canvas Preview actions
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  5-file batch queue & drafts history
                </li>
              </ul>
            </div>

            {isAuthenticated ? (
              <button
                disabled
                className="w-full font-button text-button bg-surface-container-high text-on-surface-variant py-3.5 rounded-lg border border-outline-variant cursor-default text-center opacity-70"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="w-full font-button text-button bg-surface-container text-on-background py-3.5 rounded-lg hover:bg-surface-container-high active:bg-surface-dim transition-colors border border-outline-variant text-center"
              >
                Create Free Account
              </button>
            )}
          </div>

          {/* Pro Tier Card */}
          <div className="bg-surface-container border-2 border-primary rounded-2xl p-8 flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-300 min-h-[500px] text-left relative overflow-hidden">
            {/* Featured Rib */}
            <div className="absolute top-0 right-0 bg-primary text-white font-label-mono text-[11px] font-bold px-4 py-1.5 uppercase tracking-wider rounded-bl-lg">
              Featured
            </div>

            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-h3 text-h3 font-semibold text-on-background mb-1">DocScalar Pro</h3>
                  <p className="font-body-sm text-sm text-on-surface-variant">For power users and high-volume batch processing.</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 border-b border-outline-variant pb-6 mb-6">
                <span className="font-display-hero text-[56px] text-on-background">$9</span>
                <span className="font-label-mono text-label-mono text-outline uppercase">/ Month</span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8">
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background font-semibold text-primary">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  Everything in Free Account
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  1 GB file size limit & All 41 tools
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  Unlimited Stitch Canvas pipelines
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  50-file parallel batch queue
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  Unlimited Smart Cropping & GPU OCR
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  ATS Resume & CV Studio
                </li>
              </ul>
            </div>

            <button
              onClick={handleGetStartedPro}
              disabled={paying}
              className="w-full font-button text-button btn-theme-primary py-3.5 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAlreadyPro ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Already Pro (Workspace)
                </>
              ) : paying ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                  Connecting to Checkout...
                </>
              ) : (
                'Get Started Pro'
              )}
            </button>
          </div>

        </div>

        {/* Security strip below cards */}
        <div className="mt-12 text-center">
          <p className="font-body-md text-sm text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            All payment details are handled securely. Enterprise-grade encryption on every tier.
          </p>
        </div>

        {/* Comparison Section (AI Benchmarks Style) */}
        <div className="mt-28">
          <div className="text-center mb-10">
            <h2 className="font-h2 text-h2 text-on-background mb-3">Feature Comparison</h2>
            <p className="font-body-md text-on-surface-variant max-w-lg mx-auto">
              Compare capabilities and technical specifications across all three operating modes.
            </p>
          </div>

          <div className="overflow-x-auto border border-outline-variant rounded-2xl bg-surface-container shadow-sm max-w-5xl mx-auto">
            <table className="w-full border-collapse text-left text-sm min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant">
                  <th className="py-5 px-6 font-semibold text-on-background w-[34%]">Features & Specs</th>
                  <th className="py-5 px-6 font-semibold text-on-background text-center w-[22%]">Guest Mode</th>
                  <th className="py-5 px-6 font-semibold text-on-background text-center w-[22%]">Standard Utility</th>
                  <th className="py-5 px-6 font-semibold text-on-background text-center w-[22%]">DocScalar Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {/* Section 1: Capabilities & Limits */}
                <tr className="bg-surface-container-highest/30">
                  <td colSpan="4" className="font-label-mono text-xs uppercase tracking-wider text-on-surface-variant font-bold py-3.5 px-6">
                    Capabilities & Limits
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Max file size limit</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">10 MB</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">15 MB</td>
                  <td className="py-4 px-6 text-center text-on-background font-semibold">1 GB</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Daily document operations</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">3 ops/day</td>
                  <td className="py-4 px-6 text-center text-primary font-bold">Unlimited</td>
                  <td className="py-4 px-6 text-center text-primary font-bold">Unlimited</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Batch queue limit</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">5 files</td>
                  <td className="py-4 px-6 text-center text-on-background font-semibold">50 files</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Encrypted processing</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>

                {/* Section 2: AI & Conversion Engines */}
                <tr className="bg-surface-container-highest/30">
                  <td colSpan="4" className="font-label-mono text-xs uppercase tracking-wider text-on-surface-variant font-bold py-3.5 px-6">
                    AI & Conversion Engines
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Document & Image Tools</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">All (41)</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">All (41)</td>
                  <td className="py-4 px-6 text-center text-on-background font-bold">All (41)</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Stitch Canvas DAG Pipelines</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/50">Account Required</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">10 actions/day preview</td>
                  <td className="py-4 px-6 text-center text-primary font-bold">Unlimited</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">OCR text recognition</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Included (10MB)</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">Unlimited (15MB)</td>
                  <td className="py-4 px-6 text-center text-primary font-bold">GPU Accelerated (1GB)</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Smart Cropper (Margin Trimming)</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">3 uses/day</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>

                {/* Section 3: Workspace & Sync */}
                <tr className="bg-surface-container-highest/30">
                  <td colSpan="4" className="font-label-mono text-xs uppercase tracking-wider text-on-surface-variant font-bold py-3.5 px-6">
                    Workspace & Sync
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Browser history cache</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Custom layouts</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Basic</td>
                  <td className="py-4 px-6 text-center text-on-background font-medium">Full</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Document templates & CV Builder</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Basic (3)</td>
                  <td className="py-4 px-6 text-center text-on-background font-medium">Full (incl. CV Builder)</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Settings backup</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>

                {/* Section 4: Support */}
                <tr className="bg-surface-container-highest/30">
                  <td colSpan="4" className="font-label-mono text-xs uppercase tracking-wider text-on-surface-variant font-bold py-3.5 px-6">
                    Support
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Support channels</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Community</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Email</td>
                  <td className="py-4 px-6 text-center text-on-background font-medium">24/7 Priority</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Custom tool requests</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing FAQ Accordion Section */}
        <div className="mt-20 border-t border-outline-variant/30 pt-16">
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Billing & Trust FAQ
            </span>
            <h2 className="text-2xl md:text-3xl font-h2 font-bold text-on-background mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-2 max-w-lg mx-auto">
              Everything you need to know about DocScalar Pro plans, cancellation, 1GB file limits, and document security.
            </p>
          </div>

          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-outline-variant/40 rounded-2xl overflow-hidden bg-surface-container/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left text-xs md:text-sm font-semibold text-on-background hover:text-primary transition-colors cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span 
                      className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    >
                      expand_more
                    </span>
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
        </div>

      </div>

      {/* DocScalar Pro Early Access / Beta Activation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-on-background/25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-[fadeIn_0.2s_ease-out] text-left">
            
            {/* Close */}
            <button 
              onClick={() => { if (!paying) setModalOpen(false); }}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-background flex items-center justify-center p-1 select-none"
              disabled={paying}
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
              <div>
                <h3 className="font-h3 text-[18px] font-semibold text-on-background leading-tight">DocScalar Pro Access</h3>
                <span className="font-body-sm text-xs text-primary font-medium">Public Beta Preview</span>
              </div>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <span className="material-symbols-outlined text-[64px] text-primary fill animate-pulse">verified</span>
                <h3 className="font-h2 text-[22px] font-bold text-on-background">Pro Access Activated!</h3>
                <p className="font-body-md text-sm text-on-surface-variant">
                  Welcome to DocScalar Pro. Redirecting to your workspace...
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                
                {/* Early Access Banner */}
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-body-md font-semibold text-on-background">Pro Workspace Plan</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Early Beta</span>
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Stripe billing is currently in pre-launch preview mode. You can activate full Pro workspace privileges instantly without entering payment details.
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 py-1">
                  <div className="flex items-center gap-2.5 text-xs text-on-background">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span>1 GB maximum file size limit unlocked</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-on-background">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span>Multi-file batch conversions & OCR acceleration</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-on-background">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span>All 41 document studios & StitchCanvas DAG pipelines</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-error font-body-sm text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleActivateBetaPro}
                  disabled={paying}
                  className="w-full font-button text-button btn-theme-primary py-3.5 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                      Activating Pro Workspace...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      Activate Free Pro Access
                    </>
                  )}
                </button>

                {/* Footer Safe Note */}
                <span className="text-[11px] text-on-surface-variant/60 text-center leading-relaxed select-none flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>TLS 1.3 Encrypted. No credit card required during early access preview.</span>
                </span>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
