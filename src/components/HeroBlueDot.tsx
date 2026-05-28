import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ACTIVE_BLUE = '#0E2EFF';

const Dot: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle parallax + bobbing
    const targetX = state.pointer.y * 0.25;
    const targetY = state.pointer.x * 0.35;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.08;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.08;
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.06;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1.4, 96, 96]} />
        <meshStandardMaterial
          color={ACTIVE_BLUE}
          emissive={ACTIVE_BLUE}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.32}
        />
      </mesh>
    </group>
  );
};

const HeroBlueDot: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 3, 4]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-3, -2, 3]} intensity={0.6} color={ACTIVE_BLUE} />
      <Suspense fallback={null}>
        <Dot />
      </Suspense>
    </Canvas>
  );
};

export default HeroBlueDot;
