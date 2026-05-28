import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface CylindricalTextProps {
  text: string;
  /** Cylinder radius the text curves along. */
  radius?: number;
  fontSize?: number;
  color?: string;
  /** Y-axis rotation speed in rad/sec. */
  speed?: number;
  letterSpacing?: number;
  initialRotationY?: number;
  /** When true, fontSize is auto-adjusted so the text wraps exactly once. */
  fillCircumference?: boolean;
  /** Thickness boost for the front-facing text (troika outlineWidth). */
  frontWeight?: number;
  /** Opacity for the back-facing text — lower = subtler ghost. */
  backOpacity?: number;
}

/**
 * Cylindrical text using troika `curveRadius`. Renders the text twice:
 *   1) FrontSide pass — only the front half of the cylinder. Outlined for weight.
 *   2) BackSide pass  — only the back half. Lower opacity so far glyphs read as ghosts.
 *
 * Centering math: curveRadius = -R puts the cylinder axis at z = -R from
 * the text anchor. We translate the text by +radius along Z so the axis
 * lands at world origin (= BlueDot).
 */
const CylindricalText: React.FC<CylindricalTextProps> = ({
  text,
  radius = 3.6,
  fontSize = 0.5,
  color = '#0E1116',
  speed = 0.05,
  letterSpacing = 0.02,
  initialRotationY = 0,
  fillCircumference = false,
  frontWeight = 0.012,
  backOpacity = 0.18,
}) => {
  const ref = useRef<THREE.Group>(null);
  const [renderedFontSize, setRenderedFontSize] = useState(fontSize);
  const adjustedRef = useRef(false);

  useEffect(() => {
    adjustedRef.current = false;
    setRenderedFontSize(fontSize);
  }, [text, fontSize, radius, letterSpacing, fillCircumference]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y -= delta * speed;
  });

  const handleSync = (textObj: unknown) => {
    if (!fillCircumference || adjustedRef.current) return;
    const info = (textObj as {
      textRenderInfo?: { blockBounds: number[]; visibleBounds?: number[] };
    }).textRenderInfo;
    if (!info) return;
    const bounds = info.visibleBounds ?? info.blockBounds;
    if (!bounds) return;
    const width = bounds[2] - bounds[0];
    if (!Number.isFinite(width) || width <= 0) return;
    const target = 2 * Math.PI * radius;
    const factor = target / width;
    if (!Number.isFinite(factor) || factor <= 0) return;
    adjustedRef.current = true;
    setRenderedFontSize((prev) => prev * factor);
  };

  const curvedTextProps = { curveRadius: -radius } as Record<string, unknown>;

  const sharedProps = {
    position: [0, 0, radius] as [number, number, number],
    font: '/fonts/google-sans.ttf',
    fontSize: renderedFontSize,
    color,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    letterSpacing,
    maxWidth: Infinity,
  };

  return (
    <group ref={ref} rotation={[0, initialRotationY, 0]}>
      {/* Back-side: only renders the far half of the cylinder, faded for depth. */}
      <Text
        {...sharedProps}
        fillOpacity={backOpacity}
        material-toneMapped={false}
        material-side={THREE.BackSide}
        material-depthWrite={false}
        {...curvedTextProps}
      >
        {text}
      </Text>

      {/* Front-side: near half only, outlined to look bolder, measures width. */}
      <Text
        {...sharedProps}
        outlineWidth={frontWeight}
        outlineColor={color}
        outlineBlur={0}
        material-toneMapped={false}
        material-side={THREE.FrontSide}
        onSync={handleSync}
        {...curvedTextProps}
      >
        {text}
      </Text>
    </group>
  );
};

export default CylindricalText;
