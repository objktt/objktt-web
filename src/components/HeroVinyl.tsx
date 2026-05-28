import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const ACTIVE_BLUE = '#0E2EFF';
const BLUE_MATERIAL = new THREE.MeshBasicMaterial({ color: ACTIVE_BLUE });

const Record: React.FC = () => {
  const { scene } = useGLTF('/models/vinyl-record.glb');
  const ref = useRef<THREE.Group>(null);
  const spinnerRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.material = BLUE_MATERIAL;
    });
  }, [scene]);

  useFrame((state, delta) => {
    // Continuous slow spin around disc normal — kept on inner group
    if (spinnerRef.current) spinnerRef.current.rotation.z -= delta * 0.55;

    // Outer group: rotation only (no position drift), position stays at origin
    if (!ref.current) return;
    const baseTiltX = Math.PI * 0.28;
    const targetX = baseTiltX + -state.pointer.y * 0.55;
    const targetY = state.pointer.x * 0.7;
    const lerp = 0.08;
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * lerp;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * lerp;
  });

  return (
    <group ref={ref} scale={8.4}>
      <group ref={spinnerRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
};

const HeroVinyl: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 5, 4]} intensity={1.2} color="#ffffff" />
      <Suspense fallback={null}>
        <Record />
      </Suspense>
    </Canvas>
  );
};

useGLTF.preload('/models/vinyl-record.glb');

export default HeroVinyl;
