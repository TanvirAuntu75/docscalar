import { useState, useEffect } from 'react';
import SEOHead from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Pricing() {
  const navigate = useNavigate();
  const { login, setTier, isAuthenticated, isPro, userEmail } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setEmail(userEmail || '');
    }
  }, [isAuthenticated, userEmail]);

  const isAlreadyPro = isPro;

  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/\s?/g, '').replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += val[i];
    }
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e) => {
    const val = e.target.value.replace(/\//g, '').replace(/[^0-9]/g, '');
    let formatted = val;
    if (val.length >= 2) {
      formatted = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiry(formatted.substring(0, 5));
  };

  const handleCvcChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCvc(val.substring(0, 4));
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!cardName.trim()) {
      setError('Please enter cardholder name.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setError('Card number must be 16 digits.');
      return;
    }
    if (expiry.length < 5) {
      setError('Expiry must be MM/YY.');
      return;
    }
    if (cvc.length < 3) {
      setError('CVC must be at least 3 digits.');
      return;
    }

    setPaying(true);

    // Simulate gateway delay
    setTimeout(() => {
      setPaying(false);
      setSuccess(true);
      
      const randomHash = Array.from({length: 24}, () => 
        Math.floor(Math.random()*16).toString(16)
      ).join('').toUpperCase();
      const licenseKey = `DF-PRO-SIG-${randomHash}`;

      if (isAuthenticated) {
        setTier({ tier: 'pro', proLicenseKey: licenseKey });
      } else {
        login({ email: email.trim(), tier: 'pro', proLicenseKey: licenseKey });
      }

      // Auto redirect to home dashboard after success animation
      setTimeout(() => {
        setModalOpen(false);
        navigate('/');
      }, 1800);
    }, 1800);
  };

  return (
    <div className="bg-background min-h-screen py-24 px-margin-mobile md:px-margin-desktop relative">
      <SEOHead title="Pricing Plans (DocForge)" description="Choose between our free local toolset and pro batch features. Secure, private document utilities." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="max-w-container-max mx-auto relative z-10">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="font-display-hero text-display-hero-mobile sm:text-display-hero text-on-background mb-4 leading-none">
            Tactile value,<br />transparent pricing.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
            Choose the fit for your workflow. Free local processing, or premium batch capabilities.
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
                  Local in-browser conversion
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  10 basic Local Compute tools
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-surface-variant opacity-85">
                  <span className="material-symbols-outlined text-outline/40 text-[20px] select-none">remove</span>
                  10 MB file size limit
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-surface-variant opacity-80">
                  <span className="material-symbols-outlined text-outline/40 text-[20px] select-none">remove</span>
                  No batch queue
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
                  <p className="font-body-sm text-sm text-on-surface-variant">For regular Client Side document workflows.</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 border-b border-outline-variant pb-6 mb-6">
                <span className="font-display-hero text-[56px] text-on-background">$0</span>
                <span className="font-label-mono text-label-mono text-outline uppercase">Free Account</span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8">
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  Local in-browser conversion
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  31 standard tools & basic templates
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  100 MB file size limit
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  5-file batch queue
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
                  <h3 className="font-h3 text-h3 font-semibold text-on-background mb-1">DocForge Pro</h3>
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
                  Everything in Standard
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  50-file batch queue
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  AI Summarizer & Text Tools
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  AI Translation & CV Builder
                </li>
                <li className="flex items-center gap-3 font-body-md text-sm text-on-background">
                  <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  1 GB file size limit & All 38 tools
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (isAlreadyPro) {
                  navigate('/');
                } else {
                  setModalOpen(true);
                }
              }}
              className="w-full font-button text-button btn-theme-primary py-3.5 rounded-lg shadow-sm flex items-center justify-center gap-2"
            >
              {isAlreadyPro ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Already Pro (Workspace)
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
            All payment details are handled securely. Local processing remains fully active Client Side.
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
                  <th className="py-5 px-6 font-semibold text-on-background text-center w-[22%]">DocForge Pro</th>
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
                  <td className="py-4 px-6 text-center text-on-surface-variant">10 MB</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant font-medium">100 MB</td>
                  <td className="py-4 px-6 text-center text-on-background font-semibold">1 GB</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Batch queue limit</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">5 files</td>
                  <td className="py-4 px-6 text-center text-on-background font-semibold">50 files</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">Local execution</td>
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
                  <td className="py-4 px-6 font-medium text-on-background">Conversion tools</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Basic (10)</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant">Standard (31)</td>
                  <td className="py-4 px-6 text-center text-on-background font-medium">All (38)</td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">OCR text extraction</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center">
                    <span className="material-symbols-outlined text-primary text-[20px] select-none">check</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-on-background">AI summarizer & translation</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
                  <td className="py-4 px-6 text-center text-on-surface-variant/40">—</td>
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
                  <td className="py-4 px-6 font-medium text-on-background">Local browser history cache</td>
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

      </div>

      {/* Stripe Mock Secure Checkout Modal */}
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
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[24px]">lock</span>
              <span className="font-h3 text-[18px] font-semibold text-on-background">DocForge Secure Checkout</span>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <span className="material-symbols-outlined text-[64px] text-primary fill animate-pulse">verified</span>
                <h3 className="font-h2 text-[22px] font-bold text-on-background">Payment Confirmed!</h3>
                <p className="font-body-md text-sm text-on-surface-variant">
                  Welcome to DocForge Pro. Upgrading your account...
                </p>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
                
                {/* Total */}
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex justify-between items-center mb-2">
                  <span className="font-body-md font-semibold text-on-surface-variant">DocForge Pro Subscription</span>
                  <span className="font-h3 text-primary font-bold text-[20px]">$9.00/mo</span>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="font-body-sm text-[13px] font-semibold text-on-surface-variant">Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tanvir@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isAuthenticated}
                    className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant/40 outline-none focus:border-primary transition-colors disabled:bg-surface-container-highest disabled:text-on-surface-variant/80"
                  />
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-body-sm text-[13px] font-semibold text-on-surface-variant">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Tanvir Alam"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant/40 outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Card Number */}
                <div className="flex flex-col gap-1">
                  <label className="font-body-sm text-[13px] font-semibold text-on-surface-variant">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="p-3 pl-10 bg-surface-container-low border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant/40 outline-none focus:border-primary w-full transition-colors font-label-mono"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3 text-[20px] text-on-surface-variant/50 select-none">credit_card</span>
                  </div>
                </div>

                {/* Expiry & CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-body-sm text-[13px] font-semibold text-on-surface-variant">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant/40 outline-none focus:border-primary transition-colors font-label-mono text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-body-sm text-[13px] font-semibold text-on-surface-variant">CVC</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={cvc}
                      onChange={handleCvcChange}
                      className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant/40 outline-none focus:border-primary transition-colors font-label-mono text-center"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-error font-body-sm text-xs mt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={paying}
                  className="w-full font-button text-button btn-theme-primary py-4 rounded-lg shadow-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                      Processing Mock Payment...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                      Pay $9.00 / month
                    </>
                  )}
                </button>

                {/* Footer Safe Note */}
                <span className="text-[11px] text-on-surface-variant/60 text-center leading-relaxed mt-2 select-none">
                  🔒 Encrypted connection. DocForge is local and Client Side first. This mock transaction completes entirely inside your browser.
                </span>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
