import React, { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html } from "@react-three/drei";
import * as THREE from 'three';

interface NodeData {
  id: string;
  label: string;
  pos: [number, number, number];
  color: string;
  description: string;
}

const nodes: NodeData[] = [
  { id: 'merge', label: 'Merge PDF', pos: [-4.2, 1.8, -0.5], color: '#FAF8F4', description: 'Combine multiple PDF files locally into a single cohesive document.' },
  { id: 'split', label: 'Split PDF', pos: [4.2, 1.5, 0.5], color: '#FAF8F4', description: 'Extract pages or split documents into separate files instantly.' },
  { id: 'ocr', label: 'OCR Engine', pos: [-3.2, -2.2, 1.5], color: '#B35A00', description: 'Extract text from scanned documents using local image recognition.' },
  { id: 'compress', label: 'Compress PDF', pos: [3.2, -2.4, -1.5], color: '#FAF8F4', description: 'Reduce document size in browser without losing visual quality.' },
  { id: 'protect', label: 'Protect PDF', pos: [0, 3.8, -0.2], color: '#FAF8F4', description: 'Encrypt and password-protect your private documents locally.' },
];

// ---------------------------------------------------------
// CENTRAL CORE COMPONENT (Handles local R3F frame loop)
// ---------------------------------------------------------

interface LocalCoreProps {
  hoveredNodeId: string | null;
  corePulseRef: React.MutableRefObject<() => void>;
}

function LocalCore({ hoveredNodeId, corePulseRef }: LocalCoreProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const coreScale = useRef<number>(1.4);
  const coreTargetScale = useRef<number>(1.4);

  // Expose the core's spring-back animation trigger function to the parent
  useEffect(() => {
    corePulseRef.current = () => {
      coreTargetScale.current = 1.95; // Expand core on pulse arrival
      setTimeout(() => {
        coreTargetScale.current = 1.4; // Fall back to base scale
      }, 180);
    };
  }, [corePulseRef]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.03);
    
    // Smoothly spring interpolate core scale
    coreScale.current = THREE.MathUtils.lerp(coreScale.current, coreTargetScale.current, 0.15);
    
    if (coreRef.current) {
      coreRef.current.scale.setScalar(coreScale.current);
      // Gentle core rotation
      coreRef.current.rotation.y += dt * 0.45;
      coreRef.current.rotation.x += dt * 0.25;
    }
  });

  return (
    <mesh ref={coreRef} scale={1.4}>
      <icosahedronGeometry args={[0.7, 1]} />
      <meshStandardMaterial 
        color={hoveredNodeId ? "#B35A00" : "#1e1e1e"} 
        metalness={0.9} 
        roughness={0.15} 
        emissive={hoveredNodeId ? "#B35A00" : "#000000"}
        emissiveIntensity={hoveredNodeId ? 0.75 : 0}
      />
    </mesh>
  );
}

// ---------------------------------------------------------
// SATELLITE NODE COMPONENT
// ---------------------------------------------------------

interface NodeProps {
  node: NodeData;
  onHoverChange: (hovered: boolean, id: string) => void;
  hoveredNodeId: string | null;
  corePulseRef: React.MutableRefObject<() => void>;
}

function Node({ node, onHoverChange, hoveredNodeId, corePulseRef }: NodeProps) {
  const [hovered, setHover] = useState(false);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseProgress = useRef<number>(0);
  
  const isCurrentlyHovered = hoveredNodeId === node.id;

  // Define the curved connection line points using memoization
  const { points, curve } = useMemo(() => {
    const start = new THREE.Vector3(...node.pos);
    const end = new THREE.Vector3(0, 0, 0);
    // Control point matches average position with a slight arch upward/outward
    const control = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    control.y += 1.2; // Add arch curve height
    control.z += start.z > 0 ? 0.8 : -0.8;

    const bezierCurve = new THREE.QuadraticBezierCurve3(start, control, end);
    const curvePoints = bezierCurve.getPoints(30);
    return { points: curvePoints, curve: bezierCurve };
  }, [node.pos]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.03);

    // If hovered, increment the data pulse along the bezier curve
    if (isCurrentlyHovered) {
      pulseProgress.current += dt * 1.4; // Speed of the pulse
      
      if (pulseProgress.current >= 1) {
        pulseProgress.current = 0;
        // Trigger spring pulse animation on the core!
        corePulseRef.current();
      }

      if (pulseRef.current) {
        // Place the pulse along the curve going from the node (0) to core (1)
        const pos = curve.getPointAt(pulseProgress.current);
        pulseRef.current.position.copy(pos);
        pulseRef.current.scale.setScalar(1);
      }
    } else {
      pulseProgress.current = 0;
      if (pulseRef.current) {
        pulseRef.current.scale.setScalar(0.001); // Hide pulse
      }
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHover(true);
    onHoverChange(true, node.id);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHover(false);
    onHoverChange(false, node.id);
  };

  return (
    <group>
      {/* 3D Curve connection path */}
      <mesh>
        <tubeGeometry args={[curve, 30, 0.025, 8, false]} />
        <meshStandardMaterial 
          color={isCurrentlyHovered ? '#B35A00' : '#888888'} 
          emissive={isCurrentlyHovered ? '#B35A00' : '#000000'}
          emissiveIntensity={isCurrentlyHovered ? 1.0 : 0}
          transparent
          opacity={isCurrentlyHovered ? 0.9 : 0.25}
        />
      </mesh>

      {/* Moving Data Pulse particle */}
      <mesh ref={pulseRef} scale={0.001}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#B35A00" toneMapped={false} />
      </mesh>

      {/* Satellite Sphere */}
      <Float speed={2} floatIntensity={1.2} rotationIntensity={0.5}>
        <group position={node.pos}>
          <mesh 
            onPointerOver={handlePointerOver} 
            onPointerOut={handlePointerOut}
            scale={hovered ? 1.25 : 1}
            castShadow
          >
            <sphereGeometry args={[0.38, 32, 32]} />
            <meshStandardMaterial 
              color={hovered ? '#B35A00' : '#ffffff'} 
              emissive={hovered ? '#B35A00' : '#111111'}
              emissiveIntensity={hovered ? 1.5 : 0.2}
              roughness={0.15}
              metalness={0.8}
            />
          </mesh>

          {/* HTML label (Clean and positioned directly above sphere) */}
          <Html 
            position={[0, 0.65, 0]} 
            center 
            distanceFactor={7.5}
            className="pointer-events-none transition-all duration-300"
            style={{ 
              opacity: hovered ? 1 : 0.65,
              transform: `scale(${hovered ? 1.1 : 1})`
            }}
          >
            <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors duration-300 ${
              hovered 
                ? 'bg-brand-primary border-brand-primary text-white shadow-lg' 
                : 'bg-white/90 border-black/10 text-brand-text'
            }`}>
              {node.label}
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
}

// ---------------------------------------------------------
// MAIN ECOSYSTEM CONTAINER COMPONENT
// ---------------------------------------------------------

export function Ecosystem() {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const corePulseRef = useRef<() => void>(() => {});

  const handleHoverChange = (isHovered: boolean, id: string) => {
    setHoveredNodeId(isHovered ? id : null);
  };

  const activeNode = nodes.find(n => n.id === hoveredNodeId);

  return (
    <section className="min-h-screen relative bg-brand-bg flex flex-col justify-between py-24 overflow-hidden border-t border-black/5" id="ecosystem">
      
      {/* Title Header */}
      <div className="container max-w-7xl mx-auto px-6 text-center z-10 pointer-events-none">
        <h2 className="text-4xl md:text-6xl font-medium mb-4">A complete ecosystem.</h2>
        <p className="text-lg md:text-xl text-brand-secondary max-w-xl mx-auto">
          Every tool you need runs as a secure thread connected back to your device core.
        </p>
      </div>

      {/* 3D Orbit Node Map Canvas */}
      <div className="w-full h-[60vh] md:h-[65vh] relative z-0">
        <Canvas 
          camera={{ position: [0, 0, 10.5], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.7} color="#FAF8F4" />
          
          <spotLight position={[5, 8, 3]} intensity={1.5} color="#ffffff" castShadow />
          <spotLight position={[-5, 5, 2]} intensity={1.2} color="#B35A00" />
          <directionalLight position={[0, -5, 2]} intensity={0.5} />
          
          <Environment preset="city" />
          
          {/* Core group */}
          <Float speed={1.5} floatIntensity={0.6}>
            <group>
              {/* Central Core Engine */}
              <LocalCore hoveredNodeId={hoveredNodeId} corePulseRef={corePulseRef} />
              
              <Html center className="pointer-events-none">
                <div className="text-white font-display font-semibold tracking-widest text-[9px] drop-shadow-md select-none">
                  CORE
                </div>
              </Html>

              {/* Satellites Nodes & Curves */}
              {nodes.map(node => (
                <Node 
                  key={node.id} 
                  node={node} 
                  onHoverChange={handleHoverChange} 
                  hoveredNodeId={hoveredNodeId}
                  corePulseRef={corePulseRef}
                />
              ))}
            </group>
          </Float>
        </Canvas>
      </div>

      {/* Cohesive Reactive Interactive Description Panel */}
      <div className="container max-w-xl mx-auto px-6 text-center z-10 h-24 flex items-center justify-center">
        <div className={`transition-all duration-300 transform ${activeNode ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
          {activeNode ? (
            <div className="glass-panel px-6 py-4 rounded-2xl border border-black/5 shadow-md">
              <h4 className="font-display font-semibold text-brand-primary text-base mb-1">{activeNode.label}</h4>
              <p className="text-sm text-brand-secondary">{activeNode.description}</p>
            </div>
          ) : (
            <p className="text-sm italic text-brand-secondary">
              Hover over a node sphere to trace its local security connection path.
            </p>
          )}
        </div>
      </div>

    </section>
  );
}

export default Ecosystem;
