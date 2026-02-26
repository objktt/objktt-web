import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ModelObject from './ModelObject';

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

const BRAND_COLOR = '#1119E9';

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

const ScrollPath: React.FC = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
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
    calculate();
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
      const dotRect = dot.getBoundingClientRect();
      const dotCx = dotRect.left + dotRect.width / 2;
      const dotCy = dotRect.top + dotRect.height / 2;

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
      }
    };

    // ─── Liquid Glass (SVG feDisplacementMap refraction) ───
    const DOT_SIZE = 130;
    const DOT_HALF = DOT_SIZE / 2;
    let prevDotX = points[0].x;
    let prevDotY = points[0].y;

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

      // ─ Organic idle wobble (always active, amplified) ─
      const idleAmp = 7;
      const speedAmp = Math.min(speed * 0.5, 6); // wobble harder when moving
      const amp = idleAmp + speedAmp;
      const br1 = 51 + Math.sin(time * 1.0) * amp + Math.sin(time * 2.3) * 4 + springDx * 0.4;
      const br2 = 49 + Math.cos(time * 1.3) * amp + Math.cos(time * 2.7) * 3 - springDx * 0.3;
      const br3 = 48 + Math.sin(time * 0.7) * amp + Math.sin(time * 1.9) * 5 + springDy * 0.4;
      const br4 = 52 + Math.cos(time * 1.1) * amp + Math.cos(time * 2.1) * 4 - springDy * 0.3;
      const br5 = 62 + Math.sin(time * 0.9) * amp + Math.sin(time * 2.5) * 3 + springDx * 0.3;
      const br6 = 44 + Math.cos(time * 1.2) * amp + Math.cos(time * 1.7) * 5 - springDy * 0.4;
      const br7 = 56 + Math.sin(time * 1.4) * amp + Math.sin(time * 2.0) * 4 + springDy * 0.3;
      const br8 = 38 + Math.cos(time * 0.8) * amp + Math.cos(time * 2.4) * 3 - springDx * 0.4;
      dot.style.borderRadius = `${br1}% ${br2}% ${br3}% ${br4}% / ${br5}% ${br6}% ${br7}% ${br8}%`;

      // ─ Breathing + velocity stretch ─
      const breathe = 1 + Math.sin(time * 0.8) * 0.06;
      const stretchX = breathe + Math.min(speed * 0.025, 0.5);
      const stretchY = breathe / stretchX;

      gsap.set(dot, {
        scaleX: stretchX + Math.abs(springDx) * 0.005,
        scaleY: stretchY + Math.abs(springDy) * 0.005,
      });

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
          borderRadius: '51% 49% 48% 52% / 62% 44% 56% 38%',
          overflow: 'hidden',
          background: `
            radial-gradient(circle at 28% 22%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 20%, transparent 42%),
            radial-gradient(circle at 75% 78%, rgba(255,255,255,0.05) 0%, transparent 30%)
          `,
          backdropFilter: 'url(#liquid-glass-filter) blur(0.3px) brightness(1.08) contrast(1.05)',
          WebkitBackdropFilter: 'url(#liquid-glass-filter) blur(0.3px) brightness(1.08) contrast(1.05)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15), inset 0 -6px 14px rgba(0,0,0,0.12), inset 0 6px 14px rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          zIndex: 999,
          willChange: 'transform, border-radius',
        }}
      />

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
