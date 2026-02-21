import React, { useRef, useMemo, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { Effect, BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// ─── Distortion Post-Processing ───
const distortionFragment = `
uniform vec2 uMouse;
uniform float uStrength;
uniform float uRadius;

void mainUv(inout vec2 uv) {
  vec2 dir = uv - uMouse;
  float dist = length(dir);
  if (dist < uRadius) {
    float t = smoothstep(uRadius, 0.0, dist);
    uv -= dir * t * uStrength;
  }
}
`;

class CursorDistortion extends Effect {
  constructor() {
    const uniforms = new Map<string, THREE.Uniform<any>>([
      ['uMouse', new THREE.Uniform(new THREE.Vector2(-1, -1))],
      ['uStrength', new THREE.Uniform(0.18)],
      ['uRadius', new THREE.Uniform(0.2)],
    ]);
    super('CursorDistortion', distortionFragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms,
    });
  }
}

const DistortionPass = forwardRef<CursorDistortion, { effect: CursorDistortion }>(
  ({ effect }, ref) => <primitive ref={ref} object={effect} dispose={null} />
);

// ─── Pre-allocated objects ───
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _intersection = new THREE.Vector3();
const _invMat = new THREE.Matrix4();
const _cursorLocal = new THREE.Vector3();

const MAG_RADIUS = 2.0;
const MAG_STRENGTH = 0.12;

// ─── Main Component ───
interface CursorEffectProps {
  mouseRef: React.RefObject<{ x: number; y: number; active: boolean }>;
}

const CursorEffect: React.FC<CursorEffectProps> = ({ mouseRef }) => {
  const { scene, camera } = useThree();
  const distortion = useMemo(() => new CursorDistortion(), []);
  const origPositions = useRef(new Map<THREE.BufferGeometry, Float32Array>());
  const needsRestore = useRef(false);

  useFrame(() => {
    const mouse = mouseRef.current;
    if (!mouse) return;
    const { x, y, active } = mouse;

    // ─── Distortion ───
    if (active) {
      distortion.uniforms.get('uMouse')!.value.set(x, 1.0 - y);
    } else {
      distortion.uniforms.get('uMouse')!.value.set(-1, -1);
    }

    // ─── Magnetic Pull ───
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });

    if (!active) {
      if (needsRestore.current) {
        for (const mesh of meshes) {
          const orig = origPositions.current.get(mesh.geometry);
          if (orig) {
            (mesh.geometry.attributes.position.array as Float32Array).set(orig);
            mesh.geometry.attributes.position.needsUpdate = true;
          }
        }
        needsRestore.current = false;
      }
      return;
    }

    // Project cursor to 3D world
    _ndc.set(x * 2 - 1, -(y * 2 - 1));
    _raycaster.setFromCamera(_ndc, camera);
    if (!_raycaster.ray.intersectPlane(_plane, _intersection)) return;

    needsRestore.current = true;

    for (const mesh of meshes) {
      const geo = mesh.geometry;
      const pos = geo.attributes.position;

      if (!origPositions.current.has(geo)) {
        origPositions.current.set(geo, new Float32Array(pos.array));
      }
      const orig = origPositions.current.get(geo)!;
      const arr = pos.array as Float32Array;

      _invMat.copy(mesh.matrixWorld).invert();
      _cursorLocal.copy(_intersection).applyMatrix4(_invMat);

      const scale = mesh.matrixWorld.getMaxScaleOnAxis();
      const localRadius = MAG_RADIUS / scale;
      const localStrength = MAG_STRENGTH / scale;

      const cx = _cursorLocal.x;
      const cy = _cursorLocal.y;
      const cz = _cursorLocal.z;

      for (let i = 0; i < pos.count; i++) {
        const idx = i * 3;
        const ox = orig[idx];
        const oy = orig[idx + 1];
        const oz = orig[idx + 2];

        const dx = cx - ox;
        const dy = cy - oy;
        const dz = cz - oz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < localRadius && dist > 0.001) {
          const f = Math.pow(1 - dist / localRadius, 3) * localStrength;
          arr[idx] = ox + dx * f;
          arr[idx + 1] = oy + dy * f;
          arr[idx + 2] = oz + dz * f;
        } else {
          arr[idx] = ox;
          arr[idx + 1] = oy;
          arr[idx + 2] = oz;
        }
      }

      pos.needsUpdate = true;
    }
  });

  return (
    <EffectComposer>
      <DistortionPass effect={distortion} />
    </EffectComposer>
  );
};

export default CursorEffect;
