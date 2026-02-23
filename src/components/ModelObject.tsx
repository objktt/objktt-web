import React, { useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const BLUE = new THREE.MeshBasicMaterial({ color: '#1119E9' });

interface ModelProps {
  url: string;
  tilt: React.MutableRefObject<{ rx: number; ry: number }>;
  noRotation?: boolean;
}

const Model: React.FC<ModelProps> = ({ url, tilt, noRotation }) => {
  const { scene: original } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const { cloned, scale, center } = React.useMemo(() => {
    const cloned = original.clone(true);
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = BLUE;
      }
    });
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return { cloned, scale: 2.5 / maxDim, center };
  }, [original]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!noRotation) groupRef.current.rotation.y += delta * 0.3;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      tilt.current.ry * 0.5,
      0.1
    );
  });

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={cloned} position={[-center.x, -center.y, -center.z]} />
    </group>
  );
};

interface ModelObjectProps {
  url: string;
  x: number;
  y: number;
  size: number;
  zIndex?: number;
  noRotation?: boolean;
  objRef: (el: HTMLDivElement | null) => void;
}

const ModelObject: React.FC<ModelObjectProps> = ({ url, x, y, size, zIndex = 12, noRotation, objRef }) => {
  const tilt = useRef({ rx: 0, ry: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    tilt.current.rx = (e.clientX - rect.left) / rect.width - 0.5;
    tilt.current.ry = (e.clientY - rect.top) / rect.height - 0.5;
  }, []);

  const handleMouseLeave = useCallback(() => {
    tilt.current.rx = 0;
    tilt.current.ry = 0;
  }, []);

  return (
    <div
      ref={objRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        zIndex,
        pointerEvents: 'auto',
        opacity: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
        flat
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <Model url={url} tilt={tilt} noRotation={noRotation} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ModelObject;
