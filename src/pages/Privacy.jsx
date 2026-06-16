import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function Privacy() {
  return (
    <div className="bg-background min-h-[80vh] flex flex-col items-center px-margin-mobile py-xl relative">
      <SEOHead title="Privacy Policy — DocForge" description="Read our privacy policy to understand how we protect your document data." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-3xl mb-4 z-10 text-left">
        <Link to="/" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary text-sm font-medium transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Home
        </Link>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 md:p-12 max-w-3xl w-full shadow-md z-10 text-left">
        <h1 className="font-h1 text-[32px] md:text-[40px] text-on-background mb-2 font-semibold">Privacy Policy</h1>
        <p className="font-body-md text-on-surface-variant mb-6 text-sm">Last updated: June 14, 2026</p>

        <div className="prose dark:prose-invert max-w-none flex flex-col gap-6 text-on-surface-variant font-body-md leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">1. Introduction & Local-First Commitment</h2>
            <p>
              Welcome to DocForge ("we", "our", "us"). We are committed to protecting your personal data and privacy. 
              Our primary design principle is **privacy-first**:
            </p>
            <blockquote className="border-l-4 border-primary pl-4 py-1 my-2 bg-surface-container-low/50 rounded-r-lg font-medium text-on-surface">
              Whenever possible, your documents are processed 100% locally in your browser using client-side WebAssembly, Javascript, and canvas engines. This means your files never leave your device.
            </blockquote>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">2. Server-Side Processing & Data Retention</h2>
            <p>
              For tools that require significant server-side resources (such as OCR, PDF to Word layout reconstruction, or PDF repair), your files are transmitted securely via HTTPS to our isolated workers.
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Immediate Deletion:</strong> Files are stored in encrypted temporary folders on the worker server, processed, and immediately deleted upon completion or failure of the task.</li>
              <li><strong>No Long-term Storage:</strong> We do not store, copy, analyze, or train AI models on the contents of your uploaded documents.</li>
              <li><strong>Temporary Cache:</strong> Completed jobs are kept in a transient storage cache for a maximum of 1 hour to allow you to download them. After 1 hour, they are permanently purged.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">3. Compliance with New Zealand Privacy Act 2020</h2>
            <p>
              As a service operating out of New Zealand, we fully adhere to the Information Privacy Principles (IPPs) outlined in the **Privacy Act 2020**:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Access and Correction:</strong> You have the right to request access to and correction of any personal information we hold about you (such as your account email).</li>
              <li><strong>Security Measures:</strong> We use industry-standard security protocols to prevent unauthorized access, modification, or disclosure of your account data.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">4. GDPR and International User Rights</h2>
            <p>
              For our European Union and international users, we ensure complete control over your data:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Right to Erasure (Account Deletion):</strong> You can delete your account and all associated conversion history instantly from your user dashboard at any time.</li>
              <li><strong>Minimal Data Collection:</strong> We only collect your email address and basic billing metadata required to facilitate your subscription.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">5. Cookies & Local Storage Usage</h2>
            <p>
              We do not use tracking or advertising cookies. We use:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1.5">
              <li><strong>Local Storage & IndexedDB:</strong> To store your dark mode preferences, login state, and a local record of your conversion history for your convenience. You can clear this anytime through your browser settings.</li>
              <li><strong>Stripe Cookies:</strong> Our payment processor, Stripe, may use necessary security cookies to facilitate payment transactions and detect fraud.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-h3 text-xl font-bold text-on-background border-b border-outline-variant/30 pb-2">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at: <strong>privacy@docforge.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
