import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import monsteraSvg from '../assets/svg/monstera.svg';
import reelSvg from '../assets/svg/reel.svg';
import wineSvg from '../assets/svg/wine.svg';
import cocktail01Svg from '../assets/svg/cocktail_01.svg';
import cocktail02Svg from '../assets/svg/cocktail_02.svg';
import cocktail03Svg from '../assets/svg/cocktail_03.svg';
import recordSvg from '../assets/svg/record.svg';

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

const BRAND_COLOR = '#1119E9';
// RGB(17, 25, 233) normalized: r=0.067, g=0.098, b=0.914
const COLOR_MATRIX = '0 0 0 0 0.067 0 0 0 0 0.098 0 0 0 0 0.914 0 0 0 1 0';

const POINT_SVGS: Record<number, string> = {
  0: monsteraSvg,
  1: reelSvg,
  2: wineSvg,
  3: cocktail01Svg,
  4: cocktail02Svg,
  5: cocktail03Svg,
  6: recordSvg,
};

// Returns base object size scaled to viewport width
function getBaseSize(wW: number): number {
  if (wW <= 480) return 200;
  if (wW <= 768) return 280;
  if (wW <= 1024) return 360;
  return 480;
}

function getPointSize(index: number, baseSize: number): number {
  if (index === 0) return baseSize * 1.1;
  if (index >= 2 && index <= 5) return baseSize / 2;
  return baseSize;
}

// Y adjustments as proportion of viewport height
function getYAdjust(index: number, vh: number): number {
  switch (index) {
    case 0: return 200;
    case 1: return vh * 0.5;
    case 2: return vh * 1.35;
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

interface SvgObjectProps {
  src: string;
  x: number;
  y: number;
  size: number;
  zIndex?: number;
  index: number;
  objRef: (el: HTMLDivElement | null) => void;
}

const SvgObject: React.FC<SvgObjectProps> = ({ src, x, y, size, zIndex = 12, objRef }) => {
  const innerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width - 0.5;
    const ry = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${rx * 30}deg) rotateX(${-ry * 30}deg) scale(1.05)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = innerRef.current;
    if (el) el.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
  }, []);

  return (
    <div
      ref={objRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        zIndex,
        pointerEvents: 'auto',
        opacity: 0,
      }}
    >
      <div
        ref={innerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '100%',
          perspective: '800px',
          transition: 'transform 0.15s ease-out',
          position: 'relative',
          animation: 'svgFloat 4s ease-in-out infinite',
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: `url(#svg-recolor)`,
          }}
        />
      </div>
    </div>
  );
};

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
      if (el) gsap.set(el, { opacity: 0, scale: 1, xPercent: -50, yPercent: -50, rotation: 0 });
    }

    const checkDotPosition = () => {
      const dotRect = dot.getBoundingClientRect();
      const dotCx = dotRect.left + dotRect.width / 2;
      const dotCy = dotRect.top + dotRect.height / 2;

      for (let i = 0; i < points.length; i++) {
        const el = objRefs.current[i];
        if (!el) continue;

        const sz = getPointSize(i, baseSize);
        const svgLeft = points[i].x - sz / 2;
        const svgTop = points[i].y - sz / 2 - window.scrollY;
        const svgRight = svgLeft + sz;
        const svgBottom = svgTop + sz;

        const inside = dotCx >= svgLeft && dotCx <= svgRight && dotCy >= svgTop && dotCy <= svgBottom;

        const rot = i % 2 === 0 ? 15 : -15;

        if (inside && !visibleState[i]) {
          visibleState[i] = true;
          gsap.killTweensOf(el);
          gsap.set(el, { opacity: 1 });

          if (i === 0) {
            // Dither reveal: animate filter threshold from hidden to fully visible
            const img = el.querySelector('img') as HTMLElement | null;
            const funcR = document.getElementById('dither-r');
            const funcG = document.getElementById('dither-g');
            const funcB = document.getElementById('dither-b');
            if (img && funcR && funcG && funcB) {
              img.style.filter = 'url(#dither-fx)';
              gsap.set([funcR, funcG, funcB], { attr: { intercept: -19 } });
              gsap.to([funcR, funcG, funcB], {
                attr: { intercept: 1 },
                duration: 1.2,
                ease: 'power2.out',
                onComplete: () => { img.style.filter = 'url(#svg-recolor)'; },
              });
            }
            gsap.to(el, { xPercent: -50, yPercent: -50, rotation: rot, duration: 1.2, ease: 'power2.out' });
          } else {
            gsap.to(el, { xPercent: -50, yPercent: -50, rotation: rot, duration: 0.5, ease: 'power2.out' });
          }
        } else if (!inside && visibleState[i]) {
          visibleState[i] = false;
          gsap.killTweensOf(el);

          if (i === 0) {
            // Dither dissolve: reverse the threshold
            const img = el.querySelector('img') as HTMLElement | null;
            const funcR = document.getElementById('dither-r');
            const funcG = document.getElementById('dither-g');
            const funcB = document.getElementById('dither-b');
            if (img && funcR && funcG && funcB) {
              img.style.filter = 'url(#dither-fx)';
              gsap.set([funcR, funcG, funcB], { attr: { intercept: 1 } });
              gsap.to([funcR, funcG, funcB], {
                attr: { intercept: -19 },
                duration: 0.6,
                ease: 'power2.in',
                onComplete: () => { gsap.set(el, { opacity: 0 }); img.style.filter = 'url(#svg-recolor)'; },
              });
            }
            gsap.to(el, { xPercent: -50, yPercent: -50, rotation: 0, duration: 0.6, ease: 'power2.in' });
          } else {
            gsap.to(el, { xPercent: -50, yPercent: -50, rotation: 0, duration: 0.3, ease: 'power2.in', onComplete: () => gsap.set(el, { opacity: 0 }) });
          }
        }
      }
    };

    gsap.ticker.add(checkDotPosition);

    return () => {
      gsap.ticker.remove(checkDotPosition);
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
          <filter id="svg-recolor" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={COLOR_MATRIX} />
          </filter>
          <filter id="dither-fx" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={COLOR_MATRIX} result="colored" />
            <feTurbulence type="fractalNoise" baseFrequency="4" numOctaves="4" seed="42" result="noise" />
            <feComponentTransfer in="noise" result="mask">
              <feFuncR id="dither-r" type="linear" slope="20" intercept="-19" />
              <feFuncG id="dither-g" type="linear" slope="20" intercept="-19" />
              <feFuncB id="dither-b" type="linear" slope="20" intercept="-19" />
              <feFuncA type="linear" slope="0" intercept="1" />
            </feComponentTransfer>
            <feColorMatrix in="mask" type="luminanceToAlpha" result="alphaMask" />
            <feComposite in="colored" in2="alphaMask" operator="in" />
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
          zIndex: 11,
        }}
      />

      {points.map((pt, i) => {
        const src = POINT_SVGS[i];
        if (!src) return null;
        return (
          <SvgObject
            key={i}
            src={src}
            x={pt.x}
            y={pt.y}
            size={getPointSize(i, baseSize)}
            zIndex={12}
            index={i}
            objRef={(el) => setObjRef(el, i)}
          />
        );
      })}
    </div>
  );
};

export default ScrollPath;
