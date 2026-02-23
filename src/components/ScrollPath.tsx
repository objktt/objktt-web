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

    gsap.set(dot, { x: points[0].x - 12, y: points[0].y - 12, scale: 1 });

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

    // Liquid splatter particle system
    let prevDotX = 0;
    let prevDotY = 0;
    let frameCount = 0;
    const particles: HTMLDivElement[] = [];

    const spawnDroplet = (x: number, y: number, vx: number, vy: number) => {
      const el = document.createElement('div');
      const size = 4 + Math.random() * 8;
      // Perpendicular + random spread from velocity direction
      const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * Math.PI;
      const speed = 30 + Math.random() * 60;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;

      Object.assign(el.style, {
        position: 'absolute',
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: BRAND_COLOR,
        filter: 'url(#splatter)',
        pointerEvents: 'none',
        zIndex: '10',
      });
      wrapper.appendChild(el);
      particles.push(el);

      gsap.to(el, {
        x: dx,
        y: dy,
        opacity: 0,
        scale: 0,
        duration: 0.4 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => {
          el.remove();
          const idx = particles.indexOf(el);
          if (idx !== -1) particles.splice(idx, 1);
        },
      });
    };

    const spawnSplatter = () => {
      const cx = (gsap.getProperty(dot, "x") as number) + 12;
      const cy = (gsap.getProperty(dot, "y") as number) + 12;
      const vx = cx - prevDotX;
      const vy = cy - prevDotY;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (frameCount > 0 && speed > 5 && frameCount % 3 === 0) {
        const count = Math.min(Math.floor(speed / 8), 2);
        for (let i = 0; i < count; i++) {
          spawnDroplet(cx, cy, vx, vy);
        }
      }

      const targetScale = speed > 3 ? 1.4 : 0.8;
      const currentScale = (gsap.getProperty(dot, "scale") as number) || 1;
      gsap.set(dot, { scale: currentScale + (targetScale - currentScale) * 0.1 });

      prevDotX = cx;
      prevDotY = cy;
      frameCount++;
    };

    gsap.ticker.add(checkDotPosition);
    gsap.ticker.add(spawnSplatter);

    return () => {
      gsap.ticker.remove(checkDotPosition);
      gsap.ticker.remove(spawnSplatter);
      particles.forEach((el) => el.remove());
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
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="splatter" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="2" result="noise">
              <animate attributeName="seed" values="2;5;8;13;21;34;3;17;7;11" dur="2s" repeatCount="indefinite" calcMode="discrete" />
              <animate attributeName="baseFrequency" values="0.9;0.7;1.1;0.8;1.0;0.75;0.95;0.85" dur="3s" repeatCount="indefinite" calcMode="discrete" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.5" result="blurred" />
            <feComposite in="blurred" in2="blurred" operator="over" />
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
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: BRAND_COLOR,
          boxShadow: '0 0 20px rgba(17, 25, 233, 0.5)',
          filter: 'url(#splatter)',
          zIndex: 11,
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
