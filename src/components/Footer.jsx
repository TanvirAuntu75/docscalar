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
      <footer className="w-full py-8 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 lg:px-24 text-center sm:text-left transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="font-display font-bold text-lg tracking-tighter text-on-background/80">DocScalar</div>
          <p className="text-on-surface-variant/60 text-xs font-sans">© 2026 DocScalar Inc. Built for the modern web.</p>
        </div>
        <div className="flex gap-6 mt-4 sm:mt-0 text-xs text-[var(--text-secondary)]">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
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
          Ready to work privately?
        </h2>
        <button 
          onClick={() => navigate(isAuthenticated ? "/workspace" : "/signup")}
          className="bg-on-background text-background px-10 py-5 rounded-full font-bold text-xl hover:bg-primary hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_4px_24px_rgba(179,90,0,0.15)] cursor-pointer"
        >
          {isAuthenticated ? "Go to Workspace" : "Start Free Now"}
        </button>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center z-10 flex flex-col items-center gap-4">
        <div className="font-display font-bold text-2xl tracking-tighter text-on-background/80">DocScalar</div>
        <p className="text-on-surface-variant/60 text-sm font-sans">© 2026 DocScalar Inc. Built for the modern web.</p>
      </div>
    </footer>
  );
}
