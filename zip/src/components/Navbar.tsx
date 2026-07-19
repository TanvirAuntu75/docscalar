import { Shield } from "lucide-react";
import { cn } from "../lib/utils";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <nav className="max-w-7xl mx-auto glass-panel rounded-2xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">DocForge</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-secondary">
          <a href="#features" className="hover:text-brand-text transition-colors">Features</a>
          <a href="#ecosystem" className="hover:text-brand-text transition-colors">Ecosystem</a>
          <a href="#pricing" className="hover:text-brand-text transition-colors">Pricing</a>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium hover:text-brand-primary transition-colors hidden md:block">
            Sign In
          </button>
          <button className="bg-brand-text text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors">
            Start Free
          </button>
        </div>
      </nav>
    </header>
  );
}
