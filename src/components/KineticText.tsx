import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface KineticTextProps {
  text?: string;
  radius?: number;
  height?: number;
  segments?: number;
  color?: string;
}

const KineticText: React.FC<KineticTextProps> = ({
  text = 'WE HAVE TIME AIR AND OBJECTS',
  radius = 4,
  height = 6,
  segments = 64,
  color = '#000000',
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Clear background (transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set font
      ctx.font = 'bold 80px "Google Sans", sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // We want to repeat the text a few times horizontally and vertically
      // so it fills the canvas nicely.
      const repeatedText = `${text} • ${text} • `;
      const rows = 10;
      const rowHeight = canvas.height / rows;
      
      for (let i = 0; i < rows; i++) {
        // Offset alternate rows for a staggered effect
        const xOffset = i % 2 === 0 ? 0 : 200;
        ctx.fillText(repeatedText.repeat(3), canvas.width / 2 + xOffset, i * rowHeight + rowHeight / 2);
      }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // Repeat enough times around the cylinder and up/down
    tex.repeat.set(2, 1);
    
    // Ensure we see crisp text if scaled
    tex.anisotropy = 16;
    
    return tex;
  }, [text, color]);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      // Rotate the cylinder itself slowly
      meshRef.current.rotation.y -= delta * 0.1;
      // meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Scroll the text texture across the surface
      texture.offset.x -= delta * 0.05;
      texture.offset.y += delta * 0.02;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* CylinderGeometry: radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded */}
      <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        side={THREE.DoubleSide}
        alphaTest={0.01}
        depthWrite={false}
      />
    </mesh>
  );
};

export default KineticText;
