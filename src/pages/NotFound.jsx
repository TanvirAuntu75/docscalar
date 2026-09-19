import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function NotFound() {
  return (
    <div className="bg-background min-h-[75vh] flex flex-col justify-center items-center px-margin-mobile py-xl relative">
      <SEOHead title="Page Not Found — DocScalar" description="The page you are looking for doesn't exist on DocScalar." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="text-center max-w-md w-full z-10">
        <h1 className="font-display-hero text-display-hero-mobile sm:text-display-hero text-primary mb-4 leading-none">
          404
        </h1>
        <h3 className="font-h3 text-h3 text-on-background mb-4">This document was not found.</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
          The page you are looking for does not exist (but these private local tools might be what you need!)
        </p>

        <div className="flex flex-col gap-3.5 mb-8">
          <Link 
            to="/compress-pdf" 
            className="w-full font-button text-button bg-surface text-on-background border border-outline-variant hover:border-primary p-4 rounded-lg text-center shadow-sm hover:shadow-[0_8px_24px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all flex items-center justify-between group"
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl select-none">folder_zip</span>
              <span className="font-semibold">Compress PDF</span>
            </span>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[18px]">
              arrow_forward
            </span>
          </Link>
          <Link 
            to="/image-converter" 
            className="w-full font-button text-button bg-surface text-on-background border border-outline-variant hover:border-primary p-4 rounded-lg text-center shadow-sm hover:shadow-[0_8px_24px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all flex items-center justify-between group"
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl select-none">sync</span>
              <span className="font-semibold">Convert Images</span>
            </span>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[18px]">
              arrow_forward
            </span>
          </Link>
          <Link 
            to="/merge-pdf" 
            className="w-full font-button text-button bg-surface text-on-background border border-outline-variant hover:border-primary p-4 rounded-lg text-center shadow-sm hover:shadow-[0_8px_24px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all flex items-center justify-between group"
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl select-none">call_merge</span>
              <span className="font-semibold">Merge PDFs</span>
            </span>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>

        <Link
          to="/"
          className="font-button text-button bg-primary-container text-on-primary-container px-8 py-3.5 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          Back to Home Page
        </Link>
      </div>
    </div>
  );
}
