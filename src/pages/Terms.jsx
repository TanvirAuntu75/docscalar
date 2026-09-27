import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function Terms() {
  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center px-margin-mobile py-xl relative">
      <SEOHead title="Terms of Service — DocScalar" description="Read our terms of service to understand your rights and responsibilities." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-3xl mb-4 z-10 text-left">
        <Link to="/" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary text-sm font-medium transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Home
        </Link>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 md:p-12 max-w-3xl w-full shadow-md z-10 text-left">
        <h1 className="font-h1 text-[32px] md:text-[40px] text-on-background mb-2 font-semibold">Terms of Service</h1>
        <p className="font-body-md text-on-surface-variant mb-6 text-sm">Last updated: September 26, 2026</p>

        <div className="prose dark:prose-invert max-w-none flex flex-col gap-6 text-on-surface-variant font-body-md leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using DocScalar ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">2. Usage Rules & File Ceilings</h2>
            <p>
              To ensure system stability and fair resource allocation for all users, we enforce the following restrictions:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Processing File Size Limit:</strong> Files uploaded for processing are subject to plan limits (up to 1GB for Pro users, 15MB for Free registered accounts, and 10MB for Guest users). Any uploads exceeding tier limits will be rejected.</li>
              <li><strong>Fair Use:</strong> You may not use automated scripts, bots, or scrapers to perform batch conversions that degrade the Service's performance for other users.</li>
              <li><strong>Data Security:</strong> All processing occurs over secure encrypted channels, and temporary files are automatically purged upon task completion.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">3. Subscription & Billing</h2>
            <p>
              We offer a paid subscription plan ("Pro Tier") billed monthly at $9.00 USD (or local equivalent).
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Recurring Billing:</strong> Your subscription will automatically renew at the end of each billing cycle unless cancelled.</li>
              <li><strong>Cancellation:</strong> You can cancel your subscription at any time via your Account Settings. Upon cancellation, you will retain Pro access until the end of your current paid billing period.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">4. Cancellation & Refund Policy</h2>
            <p>
              We offer a universal refund policy:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Refund Window:</strong> 14-day refund window from the initial purchase date. Contact support@docscalar.app to request a refund. Refunds are processed via the original payment method in 5-10 business days.</li>
              <li><strong>Self-Service Cancellation:</strong> You can cancel your subscription at any time via your account settings or the Stripe billing portal.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">5. Disclaimer of Warranties</h2>
            <p>
              Except as provided under applicable local laws, the Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that document layouts will be reconstructed with 100% accuracy, or that Server Side jobs will never experience delays.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">6. Intellectual Property & Document Ownership</h2>
            <p>
              We claim no ownership over the files, text, images, or documents you convert using our platform. You retain full copyright and ownership of all content processed through DocScalar.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">7. Limitation of Liability</h2>
            <p className="uppercase">
              IN NO EVENT SHALL DOCSCALAR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS PAID BY YOU IN THE PRECEDING 12 MONTHS, OR (B) $100 USD.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">8. User Indemnification</h2>
            <p>
              Users agree to indemnify and hold DocScalar harmless against claims arising from illegal, copyrighted, or malicious document uploads.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">9. Binding Arbitration & Class Action Waiver</h2>
            <p>
              Any disputes arising out of or related to these Terms will be resolved through mutual binding arbitration under AAA rules, on an individual basis only. You waive the right to participate in any class action. Users may opt out of this arbitration agreement within 30 days of account creation by emailing legal@docscalar.app.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">10. DMCA Safe Harbor & Takedown</h2>
            <p>
              DocScalar respects intellectual property rights. If you believe your copyrighted work has been infringed, please send a DMCA takedown notice to our designated agent at legal@docscalar.app. We also provide a counter-notification process for disputed takedowns.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">11. Electronic Signature Disclaimer</h2>
            <p>
              Simple e-signatures created via our service may not be legally valid for certain documents (such as wills, trusts, court orders, eviction notices, or notarized documents) under ESIGN, UETA, or eIDAS. Users must independently verify local legal admissibility for their specific use cases.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">12. Document Processing Disclaimers</h2>
            <p>
              For Unlock PDF: By using this tool, the user warrants lawful ownership or authorization to unlock the document. For Redact PDF: The user must independently verify irreversible sanitization of sensitive information. DocScalar is not liable for incomplete redaction.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">13. Age Requirement</h2>
            <p>
              You must be at least 13 years old to use the Service (for COPPA compliance in the US), or at least 16 years old if you are a resident of the European Union (for GDPR compliance).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
