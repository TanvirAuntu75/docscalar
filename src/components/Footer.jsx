import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Generate random particles
function ParticleField() {
  const ref = useRef(null);
  const count = 3500; // Slightly lower count for performance and visual elegance
  
  const positions = new Float32Array(count * 3);
  for(let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 12;
      ref.current.rotation.y -= delta / 18;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#B35A00" // Beautiful primary brand amber
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4} // Soft opacity for elegance in both light and dark modes
      />
    </Points>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLanding = location.pathname === '/';

  if (!isLanding) {
    return (
      <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          {/* Top 5-Column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
            {/* Column 1: Convert & Create */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-background mb-4">
                Convert & Create
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/pdf-to-word" className="text-on-surface-variant hover:text-primary transition-colors">PDF to Word</Link></li>
                <li><Link to="/docx-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Word to PDF</Link></li>
                <li><Link to="/pdf-to-excel" className="text-on-surface-variant hover:text-primary transition-colors">PDF to Excel</Link></li>
                <li><Link to="/excel-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Excel to PDF</Link></li>
                <li><Link to="/pdf-to-powerpoint" className="text-on-surface-variant hover:text-primary transition-colors">PDF to PowerPoint</Link></li>
                <li><Link to="/powerpoint-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">PowerPoint to PDF</Link></li>
                <li><Link to="/pdf-to-image" className="text-on-surface-variant hover:text-primary transition-colors">PDF to Image</Link></li>
                <li><Link to="/image-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Image to PDF</Link></li>
                <li><Link to="/html-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">HTML to PDF</Link></li>
                <li><Link to="/text-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Text to PDF</Link></li>
                <li><Link to="/url-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">URL to PDF</Link></li>
                <li><Link to="/pdf-to-pdfa" className="text-on-surface-variant hover:text-primary transition-colors">PDF to PDF/A</Link></li>
              </ul>
            </div>

            {/* Column 2: Edit & Annotate */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-background mb-4">
                Edit & Annotate
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/edit-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Edit PDF</Link></li>
                <li><Link to="/sign-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Sign PDF</Link></li>
                <li><Link to="/add-watermark" className="text-on-surface-variant hover:text-primary transition-colors">Add Watermark</Link></li>
                <li><Link to="/add-page-numbers" className="text-on-surface-variant hover:text-primary transition-colors">Page Numbers</Link></li>
                <li><Link to="/redact-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Redact PDF</Link></li>
                <li><Link to="/crop-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Crop PDF</Link></li>
                <li><Link to="/rotate-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Rotate PDF</Link></li>
                <li><Link to="/pdf-forms" className="text-on-surface-variant hover:text-primary transition-colors">PDF Forms</Link></li>
                <li><Link to="/bates-numbering" className="text-on-surface-variant hover:text-primary transition-colors">Bates Numbering</Link></li>
              </ul>
            </div>

            {/* Column 3: Organize & Secure */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-background mb-4">
                Organize & Secure
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/merge-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Merge PDF</Link></li>
                <li><Link to="/split-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Split PDF</Link></li>
                <li><Link to="/compress-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Compress PDF</Link></li>
                <li><Link to="/remove-pages" className="text-on-surface-variant hover:text-primary transition-colors">Remove Pages</Link></li>
                <li><Link to="/extract-pages" className="text-on-surface-variant hover:text-primary transition-colors">Extract Pages</Link></li>
                <li><Link to="/organize-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Organize PDF</Link></li>
                <li><Link to="/protect-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Protect PDF</Link></li>
                <li><Link to="/unlock-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Unlock PDF</Link></li>
                <li><Link to="/repair-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Repair PDF</Link></li>
                <li><Link to="/compare-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Compare PDF</Link></li>
              </ul>
            </div>

            {/* Column 4: Studios & Utilities */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-background mb-4">
                Studios & Utilities
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/resume-builder" className="text-on-surface-variant hover:text-primary transition-colors">Resume Studio</Link></li>
                <li><Link to="/document-viewer" className="text-on-surface-variant hover:text-primary transition-colors">Document Viewer</Link></li>
                <li><Link to="/ocr-pdf" className="text-on-surface-variant hover:text-primary transition-colors">OCR PDF</Link></li>
                <li><Link to="/un-ocr-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Un-OCR PDF</Link></li>
                <li><Link to="/scan-to-pdf" className="text-on-surface-variant hover:text-primary transition-colors">Scan to PDF</Link></li>
                <li><Link to="/image-compressor" className="text-on-surface-variant hover:text-primary transition-colors">Image Compressor</Link></li>
                <li><Link to="/image-resizer" className="text-on-surface-variant hover:text-primary transition-colors">Image Resizer</Link></li>
                <li><Link to="/image-converter" className="text-on-surface-variant hover:text-primary transition-colors">Image Converter</Link></li>
                <li><Link to="/qr-generator" className="text-on-surface-variant hover:text-primary transition-colors">QR Code Generator</Link></li>
                <li><Link to="/unzip-file" className="text-on-surface-variant hover:text-primary transition-colors">Unzip Archive</Link></li>
              </ul>
            </div>

            {/* Column 5: Company & Trust */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-background mb-4">
                Company & Trust
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/about" className="text-on-surface-variant hover:text-primary transition-colors">About DocScalar</Link></li>
                <li><Link to="/security" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Security & Privacy</Link></li>
                <li><Link to="/contact" className="text-on-surface-variant hover:text-primary transition-colors">Contact Support</Link></li>
                <li><Link to="/pricing" className="text-on-surface-variant hover:text-primary transition-colors">Pricing & Plans</Link></li>
                <li><Link to="/privacy" className="text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
              
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                  Encrypted Transfer · Memory Processing · Zero AI Training
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant/70">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-base tracking-tighter text-on-background">DocScalar</span>
              <span className="text-on-surface-variant/40">|</span>
              <span>© 2026 DocScalar Inc. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/security" className="hover:text-primary transition-colors">Security</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative h-screen bg-background overflow-hidden flex flex-col items-center justify-center text-center px-6 transition-colors duration-300">
      {/* Dynamic particle field background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ParticleField />
        </Canvas>
      </div>
      
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        <h2 className="text-6xl md:text-8xl font-display font-medium text-on-background mb-8 tracking-tight">
          Ready for faster document workflows?
        </h2>
        <button 
          onClick={() => navigate(isAuthenticated ? "/workspace" : "/signup")}
          className="bg-on-background text-background px-10 py-5 rounded-full font-bold text-xl hover:bg-primary hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_4px_24px_rgba(179,90,0,0.15)] cursor-pointer"
        >
          {isAuthenticated ? "Go to Workspace" : "Start Free Now"}
        </button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center z-10 flex flex-col items-center gap-3 px-4">
        <div className="font-display font-bold text-2xl tracking-tighter text-on-background/80">DocScalar</div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-on-surface-variant/70 max-w-xl mx-auto">
          <Link to="/about" className="hover:text-primary transition-colors">About</Link>
          <Link to="/security" className="hover:text-primary transition-colors">Security</Link>
          <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
        <p className="text-on-surface-variant/60 text-xs font-sans">© 2026 DocScalar Inc. Built for the modern web.</p>
      </div>
    </footer>
  );
}
