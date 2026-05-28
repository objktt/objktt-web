import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ModelObject from './ModelObject';

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

const BRAND_COLOR = '#0E2EFF';

const POINT_MODELS: Record<number, string> = {
  0: '/models/monstera.glb',
  1: '/models/reel-to-reel.glb',
  2: '/models/wine-bottle-and-glass.glb',
  3: '/models/cocktail-martini.glb',
  4: '/models/cocktail.glb',
  5: '/models/pizza.glb',
  6: '/models/vinyl-record.glb',
  7: '/models/turntable.glb',
};

const NO_ROTATION = new Set([7]);

// Returns base object size scaled to viewport width
function getBaseSize(wW: number): number {
  if (wW <= 480) return 200;
  if (wW <= 768) return 280;
  if (wW <= 1024) return 360;
  return 480;
}

function getPointSize(index: number, baseSize: number): number {
  if (index === 0) return baseSize * 1.716;
  if (index === 1) return baseSize * 1.5;
  if (index === 2) return baseSize * 0.65;
  if (index === 3) return baseSize * 0.65;
  if (index === 4) return baseSize * 0.65;
  if (index === 5) return baseSize * 0.75;
  if (index === 6) return baseSize * 0.9;
  if (index === 7) return baseSize * 1.2;
  return baseSize;
}

// Y adjustments as proportion of viewport height
function getYAdjust(index: number, vh: number): number {
  switch (index) {
    case 0: return 200;
    case 1: return vh * 0.5;
    case 2: return vh * 1.35 - 200;
    case 3: return vh * 0.12;
    case 4: return vh * -0.43;
    default: return 0;
  }
}

// X position ratios per point
function getXRatio(index: number, wW: number): number {
  const base = index % 2 === 0 ? 0.8 : 0.2;
  if (index === 5) return Math.min(base + 800 / wW, 0.95);
  return base;
}

function calcPoints(sections: NodeListOf<Element>, wW: number, vh: number, scrollTop: number) {
  const pts: { x: number; y: number }[] = [];
  sections.forEach((sec, i) => {
    const rect = sec.getBoundingClientRect();
    const pageY = rect.top + scrollTop + rect.height * 0.5;
    const x = wW * getXRatio(i, wW);
    const y = pageY + getYAdjust(i, vh);
    pts.push({ x, y });
  });

  if (pts.length >= 6) {
    const p5 = pts[4];
    const p6 = pts[5];
    pts.splice(5, 0, { x: wW * 0.2, y: (p5.y + p6.y) / 2 });
  }

  // Turntable (index 7): next to record (index 6) with X offset
  if (pts.length >= 7) {
    const record = pts[6];
    pts.push({ x: record.x, y: record.y + 200 });
  }

  return pts;
}

function buildPaths(pts: { x: number; y: number }[]) {
  const segs: string[] = [];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const midY = (prev.y + curr.y) / 2;
    segs.push(`M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`);
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return { d, segs };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

const ScrollPath: React.FC = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const dotBodyRef = useRef<HTMLDivElement>(null);
  const dotHighlightRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement>(null);
  const objRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [segPaths, setSegPaths] = useState<string[]>([]);
  const [baseSize, setBaseSize] = useState(480);
  const [ready, setReady] = useState(false);

  const setObjRef = useCallback((el: HTMLDivElement | null, i: number) => {
    objRefs.current[i] = el;
  }, []);

  // Calculate points and paths
  const calculate = useCallback(() => {
    const wrapper = wrapperRef.current;
    const path = pathRef.current;
    if (!wrapper || !path) return;

    const sections = wrapper.parentElement?.querySelectorAll('section');
    if (!sections || sections.length === 0) return;

    const scrollTop = window.scrollY;
    const wW = window.innerWidth;
    const vh = window.innerHeight;
    const totalH = wrapper.parentElement!.scrollHeight;

    const pts = calcPoints(sections, wW, vh, scrollTop);
    if (pts.length < 2) return;

    const { d, segs } = buildPaths(pts);

    path.setAttribute('d', d);
    svgRef.current!.setAttribute('viewBox', `0 0 ${wW} ${totalH}`);
    svgRef.current!.style.width = `${wW}px`;
    svgRef.current!.style.height = `${totalH}px`;

    setBaseSize(getBaseSize(wW));
    setPoints(pts);
    setSegPaths(segs);
  }, []);

  // Initial calculation
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      calculate();
    });
    return () => cancelAnimationFrame(frame);
  }, [calculate]);

  // Recalculate on resize
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setReady(false);
        calculate();
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [calculate]);

  useEffect(() => {
    if (points.length > 0 && !ready) {
      requestAnimationFrame(() => setReady(true));
    }
  }, [points, ready]);

  useEffect(() => {
    if (!ready) return;
    const dot = dotRef.current;
    const wrapper = wrapperRef.current;
    if (!dot || !wrapper || points.length < 2) return;

    const allTweens: gsap.core.Tween[] = [];
    const allTriggers: ScrollTrigger[] = [];
    const segElements: SVGPathElement[] = [];

    gsap.set(dot, { x: points[0].x - 65, y: points[0].y - 65, scale: 1 });

    const vh = window.innerHeight;

    for (let i = 0; i < segPaths.length; i++) {
      const segPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      segPath.setAttribute('d', segPaths[i]);
      segPath.style.display = 'none';
      svgRef.current!.appendChild(segPath);
      segElements.push(segPath);

      const startScroll = points[i].y - vh / 2;
      const endScroll = points[i + 1].y - vh / 2;

      const dotTw = gsap.to(dot, {
        ease: 'power2.inOut',
        paused: true,
        motionPath: { path: segPath, align: segPath, alignOrigin: [0.5, 0.5], autoRotate: false },
      });
      allTweens.push(dotTw);
      allTriggers.push(ScrollTrigger.create({
        trigger: wrapper.parentElement!,
        start: `${startScroll}px top`,
        end: `${endScroll}px top`,
        scrub: 1,
        onUpdate: (self) => dotTw.progress(self.progress),
      }));
    }

    const visibleState = new Array(points.length).fill(false);

    for (let i = 0; i < points.length; i++) {
      const el = objRefs.current[i];
      if (el) gsap.set(el, { opacity: 0, xPercent: -50, yPercent: -50 });
    }

    const checkDotPosition = () => {
      const dotRect = (dotBodyRef.current ?? dot).getBoundingClientRect();
      const dotCx = dotRect.left + dotRect.width / 2;
      const dotCy = dotRect.top + dotRect.height / 2;
      let strongestInfluence = 0;
      let nextModelScale = 1;

      for (let i = 0; i < points.length; i++) {
        const el = objRefs.current[i];
        if (!el) continue;

        const sz = getPointSize(i, baseSize);
        const objLeft = points[i].x - sz / 2;
        const objTop = points[i].y - sz / 2 - window.scrollY;
        const objRight = objLeft + sz;
        const objBottom = objTop + sz;

        const inside = dotCx >= objLeft && dotCx <= objRight && dotCy >= objTop && dotCy <= objBottom;

        if (inside && !visibleState[i]) {
          visibleState[i] = true;
          gsap.killTweensOf(el);
          gsap.to(el, { opacity: 1, duration: i === 0 ? 1.2 : 0.5, ease: 'power2.out' });
        } else if (!inside && visibleState[i]) {
          visibleState[i] = false;
          gsap.killTweensOf(el);
          gsap.to(el, { opacity: 0, duration: i === 0 ? 0.6 : 0.3, ease: 'power2.in' });
        }

        const objCx = points[i].x;
        const objCy = points[i].y - window.scrollY;
        const approachRangeX = sz * 1.15 + DOT_HALF * 1.6;
        const approachRangeY = sz * 1.15 + DOT_HALF * 1.6;
        const normalizedDx = Math.abs(dotCx - objCx) / approachRangeX;
        const normalizedDy = Math.abs(dotCy - objCy) / approachRangeY;
        const radialDistance = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
        const proximity = 1 - smoothstep(0.08, 1.12, radialDistance);

        if (proximity > strongestInfluence) {
          strongestInfluence = proximity;
          nextModelScale = clamp(sz / DOT_SIZE, 0.82, 3);
        }
      }

      const desiredInfluence = smoothstep(0, 1, strongestInfluence);
      const growthRate = desiredInfluence > modelInfluence
        ? 0.028 + modelInfluence * 0.05
        : 0.11;
      modelInfluence += (desiredInfluence - modelInfluence) * growthRate;
      targetModelScale = 1 + (nextModelScale - 1) * modelInfluence;
    };

    // ─── Liquid Glass (SVG feDisplacementMap refraction) ───
    const DOT_SIZE = 130;
    const DOT_HALF = DOT_SIZE / 2;
    let prevDotX = points[0].x;
    let prevDotY = points[0].y;
    let targetModelScale = 1;
    let currentModelScale = 1;
    let modelScaleVelocity = 0;
    let modelInfluence = 0;
    let heading = 0;

    // Generate displacement map on hidden canvas
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = DOT_SIZE;
    mapCanvas.height = DOT_SIZE;
    const mapCtx = mapCanvas.getContext('2d')!;

    const generateDisplacementMap = () => {
      const w = DOT_SIZE;
      const h = DOT_SIZE;
      const data = new Uint8ClampedArray(w * h * 4);
      const radius = 0.45; // drop radius in UV space
      const strength = 0.35; // how much magnification (0 = none, 1 = max)
      let maxScale = 0;
      const rawValues: number[] = [];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const uvx = x / w;
          const uvy = y / h;
          const dx = uvx - 0.5;
          const dy = uvy - 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let offsetX = 0;
          let offsetY = 0;

          if (dist < radius) {
            // Normalized distance (0 at center, 1 at edge)
            const t = dist / radius;
            // Lens refraction: pull pixels toward center = magnification
            // Stronger pull near center, barrel distortion at edges
            const refract = strength * (1 - t * t);
            // Offset = pull toward center
            offsetX = -dx * refract * w;
            offsetY = -dy * refract * h;
          }

          maxScale = Math.max(maxScale, Math.abs(offsetX), Math.abs(offsetY));
          rawValues.push(offsetX, offsetY);
        }
      }

      if (maxScale === 0) maxScale = 1;

      let idx = 0;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (rawValues[idx++] / maxScale + 0.5) * 255;
        data[i + 1] = (rawValues[idx++] / maxScale + 0.5) * 255;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }

      mapCtx.putImageData(new ImageData(data, w, h), 0, 0);

      if (feImageRef.current && feDispRef.current) {
        feImageRef.current.setAttributeNS('http://www.w3.org/1999/xlink', 'href', mapCanvas.toDataURL());
        feDispRef.current.setAttribute('scale', String(maxScale));
      }
    };

    generateDisplacementMap();

    // Spring physics for jelly-like secondary motion
    let springVx = 0, springVy = 0;
    let springDx = 0, springDy = 0;
    const SPRING_K = 0.12;
    const SPRING_DAMPING = 0.75;

    const updateDrop = () => {
      const cx = (gsap.getProperty(dot, "x") as number) + DOT_HALF;
      const cy = (gsap.getProperty(dot, "y") as number) + DOT_HALF;
      const vx = cx - prevDotX;
      const vy = cy - prevDotY;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const time = Date.now() * 0.002;
      const speedNorm = clamp(speed / 16, 0, 1);
      const targetHeading = speed > 0.05 ? Math.atan2(vy, vx) : heading;
      const angleDelta = Math.atan2(Math.sin(targetHeading - heading), Math.cos(targetHeading - heading));
      heading += angleDelta * (0.18 + speedNorm * 0.16);
      modelScaleVelocity += (targetModelScale - currentModelScale) * 0.055;
      modelScaleVelocity *= 0.82;
      currentModelScale += modelScaleVelocity;
      currentModelScale = clamp(currentModelScale, 0.82, 3.2);

      // ─ Spring: reacts to velocity changes (jelly slosh) ─
      springVx += (-springDx * SPRING_K - vx * 0.3);
      springVy += (-springDy * SPRING_K - vy * 0.3);
      springVx *= SPRING_DAMPING;
      springVy *= SPRING_DAMPING;
      springDx += springVx;
      springDy += springVy;
      // Clamp spring displacement
      springDx = Math.max(-12, Math.min(12, springDx));
      springDy = Math.max(-12, Math.min(12, springDy));

      const dirX = Math.cos(heading);
      const dirY = Math.sin(heading);
      const springAlong = springDx * dirX + springDy * dirY;
      const springCross = -springDx * dirY + springDy * dirX;

      // Keep the drop asymmetry aligned with the travel vector.
      const wobble = Math.sin(time * 0.9) * 1.5 + Math.cos(time * 1.4) * 1.1;
      const topRear = clamp(56 - speedNorm * 8 - springCross * 0.4 + wobble, 30, 74);
      const topFront = clamp(44 + speedNorm * 12 + springCross * 0.5 - wobble, 28, 72);
      const bottomFront = clamp(46 + speedNorm * 10 - springCross * 0.45, 28, 74);
      const bottomRear = clamp(58 - speedNorm * 7 + springCross * 0.35, 32, 76);
      const verticalRear = clamp(60 - speedNorm * 6 + springAlong * 0.18, 36, 78);
      const verticalFront = clamp(46 + speedNorm * 10 - springAlong * 0.18, 30, 72);
      const verticalBottomFront = clamp(54 + speedNorm * 8 + modelInfluence * 4, 34, 76);
      const verticalBottomRear = clamp(64 - speedNorm * 10, 34, 80);
      const borderRadius =
        `${topRear}% ${topFront}% ${bottomFront}% ${bottomRear}% / ` +
        `${verticalRear}% ${verticalFront}% ${verticalBottomFront}% ${verticalBottomRear}%`;
      if (dotBodyRef.current) {
        dotBodyRef.current.style.borderRadius = borderRadius;
      }

      const highlightX = 29;
      const highlightY = 23;
      if (dotHighlightRef.current) {
        dotHighlightRef.current.style.background = `
          radial-gradient(circle at ${highlightX}% ${highlightY}%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 22%, transparent 44%),
          radial-gradient(circle at 74% 79%, rgba(255,255,255,0.05) 0%, transparent 28%)
        `;
      }

      // ─ Scale: model size + forward stretch ─
      const breathe = 1 + Math.sin(time * 0.7) * 0.025;
      const contactInflation = modelInfluence * 0.22;
      const stretchAlong = breathe + speedNorm * 0.28 + contactInflation + Math.abs(springAlong) * 0.006;
      const stretchCross = clamp(
        breathe - speedNorm * 0.12 + modelInfluence * 0.16 + Math.abs(springCross) * 0.003,
        0.74,
        1.65
      );

      const bodyScaleX = currentModelScale * stretchAlong;
      const bodyScaleY = currentModelScale * stretchCross;

      gsap.set(dot, {
        rotation: heading * (180 / Math.PI),
      });
      if (dotBodyRef.current) {
        gsap.set(dotBodyRef.current, {
          width: DOT_SIZE * bodyScaleX,
          height: DOT_SIZE * bodyScaleY,
        });
      }
      if (dotHighlightRef.current) {
        gsap.set(dotHighlightRef.current, {
          rotation: heading * (-180 / Math.PI),
          scaleX: clamp(1 / bodyScaleX, 0.7, 1.2),
          scaleY: clamp(1 / bodyScaleY, 0.7, 1.2),
        });
      }

      prevDotX = cx;
      prevDotY = cy;
    };

    gsap.ticker.add(checkDotPosition);
    gsap.ticker.add(updateDrop);

    return () => {
      gsap.ticker.remove(checkDotPosition);
      gsap.ticker.remove(updateDrop);
      mapCanvas.remove();
      allTweens.forEach((tw) => tw.kill());
      allTriggers.forEach((st) => st.kill());
      segElements.forEach((el) => el.remove());
    };
  }, [ready, points, segPaths, baseSize]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 51,
        overflow: 'visible',
      }}
    >
      {/* SVG displacement filter for liquid glass refraction */}
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter
            id="liquid-glass-filter"
            filterUnits="objectBoundingBox"
            colorInterpolationFilters="sRGB"
            x="-10%" y="-10%" width="120%" height="120%"
          >
            <feImage
              ref={feImageRef}
              width="100%"
              height="100%"
              result="dispMap"
            />
            <feDisplacementMap
              ref={feDispRef}
              in="SourceGraphic"
              in2="dispMap"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
            />
          </filter>
        </defs>
      </svg>

      <svg
        ref={svgRef}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        <path
          ref={pathRef}
          fill="none"
          stroke={BRAND_COLOR}
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={0.15}
        />
      </svg>

      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          width: 130,
          height: 130,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 999,
          willChange: 'transform',
        }}
      >
        <div
          ref={dotBodyRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 130,
            height: 130,
            transform: 'translate(-50%, -50%)',
            borderRadius: '51% 49% 48% 52% / 62% 44% 56% 38%',
            overflow: 'hidden',
            backdropFilter: 'url(#liquid-glass-filter) blur(0.3px) brightness(1.08) contrast(1.05)',
            WebkitBackdropFilter: 'url(#liquid-glass-filter) blur(0.3px) brightness(1.08) contrast(1.05)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15), inset 0 -6px 14px rgba(0,0,0,0.12), inset 0 6px 14px rgba(255,255,255,0.1)',
            willChange: 'width, height, border-radius',
          }}
        >
        <div
          ref={dotHighlightRef}
          style={{
            position: 'absolute',
            left: '-45%',
            top: '-45%',
            width: '190%',
            height: '190%',
            background: `
              radial-gradient(circle at 28% 22%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 20%, transparent 42%),
              radial-gradient(circle at 75% 78%, rgba(255,255,255,0.05) 0%, transparent 30%)
            `,
            willChange: 'transform, background',
            transformOrigin: '50% 50%',
          }}
        />
        </div>
      </div>

      {points.map((pt, i) => {
        const url = POINT_MODELS[i];
        if (!url) return null;
        return (
          <ModelObject
            key={i}
            url={url}
            x={pt.x}
            y={pt.y}
            size={getPointSize(i, baseSize)}
            zIndex={12}
            noRotation={NO_ROTATION.has(i)}
            objRef={(el) => setObjRef(el, i)}
          />
        );
      })}
    </div>
  );
};

export default ScrollPath;
