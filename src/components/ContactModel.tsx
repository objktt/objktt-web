import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import CursorEffect from './CursorEffect';

const BLUE = new THREE.MeshBasicMaterial({ color: '#1119E9' });

const Martini: React.FC<{ posX: number; posY: number }> = ({ posX, posY }) => {
  const { scene } = useGLTF('/models/cocktail-martini.glb');
  const ref = useRef<THREE.Group>(null);

  React.useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = BLUE;
    });
  }, [scene]);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, posX, 0.08);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, posY, 0.08);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={ref} scale={13.5} position={[0, -1, 0]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
};

const DEFAULT_X = 2.5;
const DEFAULT_Y = -1;

const ContactModel: React.FC = () => {
  const [posX, setPosX] = useState(DEFAULT_X);
  const [posY, setPosY] = useState(DEFAULT_Y);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
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
    const deltaY = e.clientY - lastY.current;
    setPosX((prev) => Math.max(-3, Math.min(5, prev + deltaX * 0.02)));
    setPosY((prev) => Math.max(-4, Math.min(3, prev - deltaY * 0.02)));
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    setPosX(DEFAULT_X);
    setPosY(DEFAULT_Y);
  };

  const handlePointerLeave = () => {
    isDragging.current = false;
    setPosX(DEFAULT_X);
    setPosY(DEFAULT_Y);
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        cursor: 'grab',
        overflow: 'hidden',
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
          <Martini posX={posX} posY={posY} />
          <CursorEffect mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/cocktail-martini.glb');

export default ContactModel;
