import React, { useEffect, useState, useCallback } from 'react';

const PALE: [number, number, number] = [184, 201, 217];   // #B8C9D9
const ACTIVE: [number, number, number] = [14, 46, 255];   // #0E2EFF

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
}

const IntroOverlay: React.FC = () => {
  const [progress, setProgress] = useState(0); // 0 at top, 1 fully scrolled past

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / vh));
      setProgress(p);
      raf = 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const enter = useCallback(() => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  }, []);

  // Dot grows from 14px to fully covering viewport — exponential feel
  const baseSize = 14;
  const maxSize = typeof window !== 'undefined'
    ? Math.max(window.innerWidth, window.innerHeight) * 2.4
    : 2400;
  const dotSize = baseSize + (maxSize - baseSize) * (progress * progress);

  const dotColor = mixRgb(PALE, ACTIVE, progress);
  const textOpacity = Math.max(0, 1 - progress * 2);
  const bgOpacity = Math.max(0, 1 - progress);
  const fullyHidden = progress >= 0.999;

  return (
    <div
      onClick={enter}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2rem',
        cursor: 'pointer',
        pointerEvents: fullyHidden ? 'none' : 'auto',
        fontFamily: "'Google Sans', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Background layer (fades out independently) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#FAF8F2',
          opacity: bgOpacity,
          transition: 'background-color 0.2s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Center dot (scaled by scroll) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          marginLeft: `${-dotSize / 2}px`,
          marginTop: `${-dotSize / 2}px`,
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: progress < 0.2
            ? `0 0 ${18 + progress * 60}px rgba(184,201,217,${0.45 * (1 - progress * 2)})`
            : 'none',
          opacity: 1 - Math.max(0, (progress - 0.7) / 0.3), // dot itself fades after 70%
          pointerEvents: 'none',
          willChange: 'width, height, background-color',
        }}
      />

      {/* Top header */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#B8C9D9',
        opacity: textOpacity,
      }}>
        <span>[ SYSTEM.LOG // PBD-3.0 ]</span>
        <span>[ OBJ-KTT ]</span>
      </div>

      {/* Center label (under the dot) */}
      <div style={{
        position: 'absolute',
        top: 'calc(50% + 32px)',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#B8C9D9',
        opacity: textOpacity * 0.85,
        pointerEvents: 'none',
      }}>
        ( Pale Blue Dot )
      </div>

      {/* Bottom */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#B8C9D9',
        opacity: textOpacity,
      }}>
        <span>[ COORDINATE: {Math.round(6_000_000_000 * (1 - progress)).toLocaleString('en-US')} KM ]</span>
        <span style={{ opacity: 0.6 }}>scroll / tap to enter →</span>
      </div>
    </div>
  );
};

export default IntroOverlay;
