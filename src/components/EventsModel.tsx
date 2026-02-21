import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import CursorEffect from './CursorEffect';

const BLUE = new THREE.MeshBasicMaterial({ color: '#1119E9' });

const WineBottle: React.FC<{ tiltX: number; tiltZ: number }> = ({ tiltX, tiltZ }) => {
  const { scene } = useGLTF('/models/wine-bottle.glb');
  const pivotRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = BLUE;
    });
  }, [scene]);

  useFrame(() => {
    if (pivotRef.current) {
      pivotRef.current.rotation.z = THREE.MathUtils.lerp(
        pivotRef.current.rotation.z,
        tiltX,
        0.08
      );
      pivotRef.current.rotation.x = THREE.MathUtils.lerp(
        pivotRef.current.rotation.x,
        tiltZ,
        0.08
      );
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group position={[0, -0.3, 0]}>
        <group ref={pivotRef}>
          <group scale={1.2}>
            <primitive object={scene} />
          </group>
        </group>
      </group>
    </Float>
  );
};

const EventsModel: React.FC = () => {
  const [tiltX, setTiltX] = useState(0);
  const [tiltZ, setTiltZ] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const maxTilt = 0.785;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseRef.current.x = nx;
    mouseRef.current.y = ny;
    mouseRef.current.active = true;
    setTiltX(-(nx - 0.5) * maxTilt);
    setTiltZ((ny - 0.5) * maxTilt);
  };

  const handlePointerLeave = () => {
    setTiltX(0);
    setTiltZ(0);
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '40%',
        height: '100%',
        zIndex: 0,
      }}
      onPointerMove={handlePointerMove}
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
          <WineBottle tiltX={tiltX} tiltZ={tiltZ} />
          <CursorEffect mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/wine-bottle.glb');

export default EventsModel;
