import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import CursorEffect from './CursorEffect';

const BLUE = new THREE.MeshBasicMaterial({ color: '#1119E9' });

const Monstera: React.FC<{ dragRotation: number }> = ({ dragRotation }) => {
  const { scene } = useGLTF('/models/monstera.glb');
  const ref = useRef<THREE.Group>(null);

  React.useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = BLUE;
    });
  }, [scene]);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        dragRotation,
        0.1
      );
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={ref} scale={1.65} position={[0, -1, -3]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
};

const AboutModel: React.FC = () => {
  const [dragRotation, setDragRotation] = useState(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
      mouseRef.current.active = true;
    }
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastX.current;
    setDragRotation((prev) => prev + deltaX * 0.01);
    lastX.current = e.clientX;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerLeave = () => {
    isDragging.current = false;
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Monstera dragRotation={dragRotation} />
          <CursorEffect mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/monstera.glb');

export default AboutModel;
