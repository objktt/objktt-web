
import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PresentationControls, ContactShadows, useGLTF, Environment, DragControls } from '@react-three/drei';
import * as THREE from 'three';

// --- Models ---

const Record = (props: any) => {
  const mesh = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  const recordShape = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.04, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return shape;
  }, []);

  const labelShape = React.useMemo(() => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 0.3, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.04, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      return shape;
  }, []);

  useFrame((_state) => {
    if (mesh.current) {
        mesh.current.rotation.y += 0.01;
        const scale = hovered ? 1.1 : 1;
        mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group ref={mesh} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      {/* Main Record Body */}
      <mesh position={[0, 0, -0.025]}>
        <extrudeGeometry args={[recordShape, { depth: 0.05, bevelEnabled: false, curveSegments: 64 }]} />
        <meshBasicMaterial color="#1119E9" />
      </mesh>
      {/* Label */}
      <mesh position={[0, 0, -0.02]}> 
        <extrudeGeometry args={[labelShape, { depth: 0.06, bevelEnabled: false, curveSegments: 64 }]} />
        <meshBasicMaterial color="#1119E9" />
      </mesh>
      {/* Hit Box for easier dragging */}
      <mesh rotation={[Math.PI / 2, 0, 0]} visible={true}>
         <cylinderGeometry args={[1, 1, 0.2, 32]} />
         <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

const RecorderModel = (props: any) => {
  const { scene } = useGLTF('/models/recorder.glb');
  const mesh = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // Apply Silhouette/Flat Style
  React.useLayoutEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        // Use a dark grey/black for the recorder silhouette
        m.material = new THREE.MeshBasicMaterial({ color: '#1119E9' });
      }
    });
  }, [scene]);

  useFrame(() => {
    if (mesh.current) {
        // mesh.current.rotation.y += 0.005; // Gentle rotation? Or static? Let's keep it static but scalable
        const scale = hovered ? 1.7 : 1.5; // Adjusted scale
        mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group ref={mesh} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <primitive object={scene} />
    </group>
  );
};


const WineBottleModel = (props: any) => {
    const { scene } = useGLTF('/models/wine_bottle.glb');
    const mesh = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);

    // Apply Burgundy Silhouette (Flat)
    React.useLayoutEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.material = new THREE.MeshBasicMaterial({ color: '#1119E9' });
            }
        });
    }, [scene]);

    useFrame(() => {
        if(mesh.current) {
             const scale = hovered ? 2.2 : 2;
             mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        }
    })

    return (
        <group ref={mesh} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <primitive object={scene} />
        </group>
    )
}

const CocktailModel = (props: any) => {
    const { scene } = useGLTF('/models/cocktail_martini.glb');
    const mesh = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);

    // Apply Stylized Silhouette (Flat) - Keeping original colors if possible or setting a theme
    // Since Cocktail has multiple parts (Glass, Liquid, Olive), replacing specific materials is better.
    // However, for a pure silhouette look, maybe just one color? 
    // Or map existing colors to Basic?
    React.useLayoutEffect(() => {
        scene.traverse((child) => {
             if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                // Preserve original color but make it flat
                m.material = new THREE.MeshBasicMaterial({ color: '#1119E9' });
            }
        });
    }, [scene]);

    useFrame(() => {
        if(mesh.current) {
             const scale = hovered ? 6.6 : 6; // Increased scale by 3x (from 2)
             mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        }
    })

    return (
        <group ref={mesh} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <primitive object={scene} />
        </group>
    )
}

const MonsteraB02Model = (props: any) => {
    const { scene } = useGLTF('/models/monstera_b02.glb');
    const mesh = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);
    
    // Apply Flat Green Color (No Shading)
    React.useLayoutEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                // Replace with MeshBasicMaterial for flat, unlit appearance
                m.material = new THREE.MeshBasicMaterial({ color: '#1119E9' });
            }
        });
    }, [scene]);

    useFrame(() => {
        if(mesh.current) {
             const scale = hovered ? 2.2 : 2; 
             mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        }
    })

    return (
        <group ref={mesh} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <primitive object={scene} />
        </group>
    )
}

const HeroScene: React.FC = () => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      camera={{ position: [0, 0, 5], fov: 45 }} 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto', zIndex: -1, userSelect: 'none', WebkitUserSelect: 'none' }} 
    >
 
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <Environment preset="city" /> 
        
        <Suspense fallback={null}>
            <PresentationControls
            global={false} 
            cursor={true} 
            snap={true} 
            speed={1.5} 
            zoom={0.8} 
            rotation={[0, 0, 0]} 
            polar={[-0.4, 0.2]} 
            azimuth={[-0.4, 0.4]} 
            >
                <group position={[0, -0.5, 0]}>
                    <Float speed={2} rotationIntensity={1} floatIntensity={1} floatingRange={[-0.1, 0.1]}>
                        <DragControls>
                            <Record position={[-0.5, 1.8, -1.5]} rotation={[0.5, 0.5, 0]} scale={0.7} />
                        </DragControls>
                    </Float>

                    <Float speed={2} rotationIntensity={1} floatIntensity={1} floatingRange={[-0.1, 0.1]}>
                        <DragControls>
                            <RecorderModel position={[-2.2, 1.2, 0]} rotation={[0.4, 0.5, 0]} scale={1.5} />
                        </DragControls>
                    </Float>

                    {/* Replaced Abstract WineBottle with Real WineBottle GLB */}
                    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8} floatingRange={[-0.2, 0.2]}>
                        <DragControls>
                            <WineBottleModel position={[2, 0.5, -0.5]} rotation={[0, 0, 0.2]} scale={2} />
                        </DragControls>
                    </Float>

                   {/* Replaced Abstract Cocktail & Monstera with Real Cocktail GLB */}
                    <Float speed={2.5} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                        <DragControls>
                            <CocktailModel position={[1, 0, 1.5]} rotation={[0, 0.2, 0]} scale={6} />
                        </DragControls>
                    </Float>

                    {/* New Monstera B02 */}
                    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
                        <DragControls>
                            <MonsteraB02Model position={[-1.8, -1.2, 0.5]} rotation={[0, 0.5, 0]} scale={2} />
                        </DragControls>
                    </Float>
                </group>
            </PresentationControls>
        </Suspense>

        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
    </Canvas>
  );
};

export default HeroScene;
