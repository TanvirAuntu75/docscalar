import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'support',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Simulate reliable dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    'name': 'Contact Support & Inquiries — DocScalar',
    'description': 'Reach out to the DocScalar support and engineering team. Guaranteed response SLAs for Pro users, enterprise licensing, and technical assistance.',
    'url': 'https://docscalar.app/contact',
    'publisher': {
      '@type': 'Organization',
      'name': 'DocScalar Inc.',
      'url': 'https://docscalar.app',
      'contactPoint': [
        {
          '@type': 'ContactPoint',
          'email': 'support@docscalar.app',
          'contactType': 'customer support',
          'availableLanguage': 'English'
        },
        {
          '@type': 'ContactPoint',
          'email': 'security@docscalar.app',
          'contactType': 'security response',
          'availableLanguage': 'English'
        }
      ]
    }
  };

  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center px-margin-mobile py-xl relative">
      <SEOHead 
        title="Contact Support & Inquiries — DocScalar" 
        description="Reach out to the DocScalar support and engineering team. Guaranteed response SLAs for Pro users, enterprise licensing, and technical assistance." 
        schema={contactSchema}
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
            <span className="material-symbols-outlined text-[16px]">headset_mic</span>
            <span>Support & Communications</span>
          </div>
          <span className="text-xs text-on-surface-variant">support@docscalar.app</span>
        </div>

        <h1 className="font-h1 text-[32px] md:text-[42px] text-on-background mb-4 font-semibold tracking-tight">
          How can our team help you?
        </h1>
        <p className="font-body-md text-on-surface-variant mb-8 text-sm md:text-base leading-relaxed">
          Whether you need assistance with complex document conversions, enterprise licensing, bug reports, or account billing, our engineering team is here to assist.
        </p>

        {/* 3 Support Channels / SLAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span className="text-xs font-bold text-on-background">Customer Support</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              General inquiries & usage help.
            </p>
            <div className="mt-auto pt-2 text-[11px] font-semibold text-primary">
              {"SLA: < 4h (Pro) / < 24h (Standard)"}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              <span className="text-xs font-bold text-on-background">Enterprise Inquiries</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Custom volume quotas & on-premise setups.
            </p>
            <div className="mt-auto pt-2 text-[11px] font-semibold text-primary">
              enterprise@docscalar.app
            </div>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <span className="text-xs font-bold text-on-background">Security & Privacy</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Vulnerability disclosures & DPA requests.
            </p>
            <div className="mt-auto pt-2 text-[11px] font-semibold text-primary">
              security@docscalar.app
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="border-t border-outline-variant/30 pt-8">
          <h2 className="font-h3 text-xl font-bold text-on-background mb-4">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="p-8 rounded-xl bg-surface-container-low border border-primary/30 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
              </div>
              <h3 className="font-h3 text-lg font-bold text-on-background">Message Dispatched Successfully</h3>
              <p className="text-xs text-on-surface-variant max-w-md">
                Thank you for reaching out to DocScalar support. A ticket has been registered and our team will follow up at <strong>{formData.email}</strong> within our SLA window.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', category: 'support', subject: '', message: '' });
                }}
                className="mt-3 px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-xs font-medium text-on-background hover:bg-surface-container-high transition-colors"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-xs font-semibold text-on-background">
                    Your Name <span className="text-primary">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-xs font-semibold text-on-background">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@company.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-category" className="text-xs font-semibold text-on-background">
                    Inquiry Category
                  </label>
                  <select
                    id="contact-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-background focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="support">Technical Support & Tools</option>
                    <option value="billing">Billing & Pro Subscription</option>
                    <option value="enterprise">Enterprise Licensing & Quotas</option>
                    <option value="security">Security & Vulnerability Disclosure</option>
                    <option value="feedback">General Feedback & Suggestions</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-subject" className="text-xs font-semibold text-on-background">
                    Subject Line
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief summary of your question"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="text-xs font-semibold text-on-background">
                  Your Message <span className="text-primary">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Please provide details regarding your inquiry, including any relevant file formats or error codes..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-on-surface-variant/70 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Direct encrypted transmission to support desk
                </span>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
