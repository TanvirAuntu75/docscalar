import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// Generate random particles
function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = 5000;
  
  // Use useMemo in a real app, but this is fine for the setup
  const positions = new Float32Array(count * 3);
  for(let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#B35A00"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export function Footer() {
  return (
    <footer className="relative h-screen bg-[#0A0A0A] overflow-hidden flex flex-col items-center justify-center text-center px-6">
      <div className="absolute inset-0 z-0 opacity-50">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ParticleField />
        </Canvas>
      </div>
      
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        <h2 className="text-6xl md:text-8xl font-display font-medium text-white mb-8 tracking-tight">
          Ready to work privately?
        </h2>
        <button className="bg-brand-primary text-white px-10 py-5 rounded-full font-medium text-xl hover:bg-white hover:text-[#0A0A0A] transition-all duration-300 transform hover:scale-105 shadow-[0_0_60px_rgba(179,90,0,0.4)]">
          Start Free Now
        </button>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center z-10 flex flex-col items-center gap-4">
        <div className="font-display font-bold text-2xl tracking-tighter text-white/80">DocForge</div>
        <p className="text-white/40 text-sm font-sans">© 2026 DocForge Inc. Built for the modern web.</p>
      </div>
    </footer>
  );
}
