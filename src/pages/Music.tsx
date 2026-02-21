import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface Genre {
  name: string;
  related: number[];
}

const genres: Genre[] = [
  { name: 'Modern Funk / Boogie', related: [1, 4, 7] },
  { name: 'Post-Disco', related: [0, 2, 3, 13] },
  { name: 'Italian Disco', related: [1, 3, 13] },
  { name: 'Euro Disco', related: [1, 2, 12, 13] },
  { name: 'Jazz-Funk', related: [5, 6, 14] },
  { name: '70s–80s Fusion', related: [4, 6, 9] },
  { name: 'Rare Groove', related: [0, 4, 7] },
  { name: 'Deep / Modern Soul', related: [0, 6, 15] },
  { name: 'AOR', related: [5, 9] },
  { name: 'Japanese City Pop', related: [0, 5, 8] },
  { name: 'Ambient', related: [11, 12, 16] },
  { name: 'Minimal / Environmental', related: [10, 17] },
  { name: 'Balearic', related: [3, 10, 13, 15] },
  { name: 'Cosmic Disco', related: [1, 2, 3, 12] },
  { name: 'Spiritual Jazz', related: [4, 10, 16] },
  { name: 'Deep House', related: [7, 12, 17] },
  { name: 'Dub', related: [10, 14, 17] },
  { name: 'Leftfield Electronic', related: [11, 15, 16] },
];

const Music: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const [hoveredGenre, setHoveredGenre] = useState<number | null>(null);
  const capsuleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawLines = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const theme = document.documentElement.getAttribute('data-theme');
    const lineColor = theme === 'dark' ? 'rgba(255,255,255,' : 'rgba(0,0,0,';

    genres.forEach((genre, i) => {
      genre.related.forEach((j) => {
        if (j <= i) return;
        const elA = capsuleRefs.current[i];
        const elB = capsuleRefs.current[j];
        if (!elA || !elB) return;

        const rA = elA.getBoundingClientRect();
        const rB = elB.getBoundingClientRect();

        const x1 = rA.left + rA.width / 2 - rect.left;
        const y1 = rA.top + rA.height / 2 - rect.top;
        const x2 = rB.left + rB.width / 2 - rect.left;
        const y2 = rB.top + rB.height / 2 - rect.top;

        const isActive = hoveredGenre !== null &&
          (hoveredGenre === i || hoveredGenre === j);
        const isDimmed = hoveredGenre !== null && !isActive;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isActive
          ? `${lineColor}0.3)`
          : isDimmed
            ? `${lineColor}0.03)`
            : `${lineColor}0.06)`;
        ctx.lineWidth = isActive ? 1.5 : 0.5;
        ctx.stroke();
      });
    });
  }, [hoveredGenre]);

  useEffect(() => {
    drawLines();
    window.addEventListener('resize', drawLines);
    return () => window.removeEventListener('resize', drawLines);
  }, [drawLines]);

  const stickyBar: React.CSSProperties = {
    position: 'sticky',
    top: 'var(--header-height)',
    zIndex: 50,
    backgroundColor: 'var(--color-bg)',
  };

  const stickyInner: React.CSSProperties = {
    width: 'calc(100% - 4rem)',
    margin: '0 2rem',
    padding: isMobile ? '0.625rem 0' : '0.625rem 2rem',
    borderTop: '1px solid var(--color-line)',
    borderBottom: '1px solid var(--color-line)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
  };

  const isRelated = (i: number) =>
    hoveredGenre !== null &&
    (hoveredGenre === i || genres[hoveredGenre].related.includes(i));

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}>
            <span style={{ opacity: 0.5 }}>Music</span>
          </div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            Music
          </h2>
        </div>

        {/* Genre Capsules */}
        <div style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
          marginBottom: isMobile ? '3rem' : '4rem',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 500,
              opacity: 0.5,
              lineHeight: 1.3,
            }}>
              This is the music we pursue.<br />
              We do not take song requests.
            </p>
          </div>

          <div
            ref={containerRef}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              position: 'relative',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            {genres.map((genre, i) => (
              <span
                key={genre.name}
                ref={(el) => { capsuleRefs.current[i] = el; }}
                onMouseEnter={() => setHoveredGenre(i)}
                onMouseLeave={() => setHoveredGenre(null)}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  border: '1px solid var(--color-line)',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  cursor: 'default',
                  position: 'relative',
                  zIndex: 1,
                  backgroundColor: 'var(--color-bg)',
                  transition: 'all 0.25s ease',
                  opacity: hoveredGenre === null
                    ? 0.7
                    : isRelated(i)
                      ? 1
                      : 0.15,
                  transform: hoveredGenre === i ? 'scale(1.05)' : 'scale(1)',
                  borderColor: isRelated(i) && hoveredGenre !== null
                    ? 'var(--color-text)'
                    : 'var(--color-line)',
                }}
              >
                {genre.name}
              </span>
            ))}
          </div>

        </div>

        {/* SoundCloud */}
        <div style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: 0.4,
            marginBottom: '1.5rem',
          }}>
            Objktt Radio
          </div>

          <iframe
            width="100%"
            height="600"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/objktt_recordbar&color=%23000000&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false"
            style={{ border: 0 }}
          />
        </div>
      </section>
    </div>
  );
};

export default Music;
