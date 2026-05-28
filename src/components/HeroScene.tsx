import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import CylindricalText from './CylindricalText';
import { useTheme } from '../hooks/useTheme';

/** Scene's natural horizontal extent (cylinder diameter + breathing room). */
const SCENE_WIDTH = 8;

const ACTIVE_BLUE = '#0E2EFF';
const TEXT_LIGHT = '#F2F2F2';

/** Flat blue material reused across all GLB clones. */
const BLUE_MAT = new THREE.MeshBasicMaterial({ color: ACTIVE_BLUE });

/** GLB models cycled alongside the plain blue dot. */
const MODEL_URLS = [
  '/models/vinyl-record.glb',
  '/models/turntable.glb',
  '/models/cocktail.glb',
  '/models/pizza.glb',
  '/models/wine-bottle-and-glass.glb',
];

// Preload so swaps don't pop in.
MODEL_URLS.forEach((url) => useGLTF.preload(url));

/** Visual size (max dimension) for swapped-in 3D models — matches sphere diameter. */
const MODEL_TARGET_SIZE = 4.2;

const BlueDotSphere: React.FC = () => (
  <mesh>
    <sphereGeometry args={[2.1, 64, 64]} />
    <meshStandardMaterial
      color={ACTIVE_BLUE}
      emissive={ACTIVE_BLUE}
      emissiveIntensity={0.45}
      metalness={0.25}
      roughness={0.35}
    />
  </mesh>
);

const BlueModel: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);

  const { cloned, scale, center } = React.useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = BLUE_MAT;
      }
    });
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return { cloned, scale: MODEL_TARGET_SIZE / maxDim, center };
  }, [scene]);

  return (
    <group scale={scale}>
      <primitive object={cloned} position={[-center.x, -center.y, -center.z]} />
    </group>
  );
};

const BlueDot: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const childRefs = useRef<(THREE.Group | null)[]>([]);
  const activeIdxRef = useRef(0);
  const accumRef = useRef(0);
  const itemCount = MODEL_URLS.length + 1; // sphere + models

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.08;
    groupRef.current.rotation.y = t * 0.15;

    // Pointer distance from screen center (NDC: 0 = on dot, ~1.4 = far corner).
    const dx = state.pointer.x;
    const dy = state.pointer.y;
    const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));

    // close (dist→0) = slow (4.0 s/frame), far (dist→1) = fast (0.5 s/frame ≈ 2 fps)
    const fastRate = 0.5;
    const slowRate = 4.0;
    const rate = fastRate + (slowRate - fastRate) * (1 - dist);

    accumRef.current += delta;
    if (accumRef.current >= rate) {
      accumRef.current = 0;
      activeIdxRef.current = (activeIdxRef.current + 1) % itemCount;
      childRefs.current.forEach((c, i) => {
        if (c) c.visible = i === activeIdxRef.current;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* index 0 — plain blue dot */}
      <group ref={(el) => { childRefs.current[0] = el; }}>
        <BlueDotSphere />
      </group>
      {/* index 1..N — 3D models */}
      {MODEL_URLS.map((url, i) => (
        <group
          key={url}
          ref={(el) => { childRefs.current[i + 1] = el; }}
          visible={false}
        >
          <BlueModel url={url} />
        </group>
      ))}
    </group>
  );
};

/** Smoothly tilts everything inside it toward the pointer position. */
const ParallaxRig: React.FC<{ children: React.ReactNode; strength?: number }> = ({
  children,
  strength = 1,
}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const targetX = state.pointer.y * 0.18 * strength;
    const targetY = state.pointer.x * 0.35 * strength;
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.06;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.06;
  });
  return <group ref={ref}>{children}</group>;
};

/** Scales the scene down on narrow viewports so the cylinder always fits horizontally. */
const ResponsiveScale: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { viewport } = useThree();
  const scale = Math.min(1, viewport.width / SCENE_WIDTH);
  return <group scale={scale}>{children}</group>;
};

const Scene: React.FC<{ textColor: string }> = ({ textColor }) => {
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[5, 5, 6]} intensity={1.3} color="#ffffff" />
      <pointLight position={[-4, -3, 4]} intensity={0.55} color={ACTIVE_BLUE} />
      <Suspense fallback={null}>
        <ResponsiveScale>
          <ParallaxRig>
            <CylindricalText
              text="FOR SMALL CREATURES SUCH AS WE THE VASTNESS IS BEARABLE ONLY THROUGH LOVE / "
              radius={3.6}
              color={textColor}
              fontSize={0.44}
              speed={0.05}
              letterSpacing={0.02}
              fillCircumference
            />
            <BlueDot />
          </ParallaxRig>
        </ResponsiveScale>
      </Suspense>
    </>
  );
};

const HeroScene: React.FC = () => {
  const theme = useTheme();
  const textColor = theme === 'dark' ? TEXT_LIGHT : ACTIVE_BLUE;

  return (
    <Canvas
      camera={{ position: [0, 0, 8.2], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <Scene textColor={textColor} />
    </Canvas>
  );
};

export default HeroScene;
