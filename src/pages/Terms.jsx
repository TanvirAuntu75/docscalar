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
        <p className="font-body-md text-on-surface-variant mb-6 text-sm">Last updated: June 14, 2026</p>

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
              <li><strong>Server Side File Size Limit:</strong> Files uploaded for Server Side processing (such as OCR, PDF to Word, or Repair) are subject to a strict hard limit of **500MB** per file. Any uploads exceeding this size will be automatically rejected.</li>
              <li><strong>Fair Use:</strong> You may not use automated scripts, bots, or scrapers to perform batch conversions that degrade the Service's performance for other users.</li>
              <li><strong>No Client Side Limits:</strong> Conversions occurring 100% locally in your browser (e.g. Merge, Split, Page Rotation) have no file size ceiling, subject only to your device's memory limits.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">3. Subscription & Billing</h2>
            <p>
              We offer a paid subscription plan ("Pro Tier") billed monthly at $9.00 NZD (or local equivalent).
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Recurring Billing:</strong> Your subscription will automatically renew at the end of each billing cycle unless cancelled.</li>
              <li><strong>Cancellation:</strong> You can cancel your subscription at any time via your Account Settings. Upon cancellation, you will retain Pro access until the end of your current paid billing period.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">4. New Zealand Consumer Guarantees Act (CGA) & Refunds</h2>
            <p>
              For users subscribing from New Zealand, our services come with guarantees that cannot be excluded under the **Consumer Guarantees Act 1993**:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Service Guarantee:</strong> We guarantee that our services will be provided with reasonable care and skill.</li>
              <li><strong>Refund Policy:</strong> If our service fails to meet CGA guarantees and the failure is of a substantial character, you are entitled to cancel your subscription and receive a refund. For minor failures, we will remedy the issue within a reasonable time, or refund you if we cannot.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">5. Disclaimer of Warranties</h2>
            <p>
              Except as provided under applicable local laws (including the NZ Consumer Guarantees Act), the Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that document layouts will be reconstructed with 100% accuracy, or that Server Side jobs will never experience delays.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">6. Intellectual Property & Document Ownership</h2>
            <p>
              We claim no ownership over the files, text, images, or documents you convert using our platform. You retain full copyright and ownership of all content processed through DocScalar.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
