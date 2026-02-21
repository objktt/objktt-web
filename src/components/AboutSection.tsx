import React, { useState } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

import img1 from '../assets/img/objktt/DSC00876.JPEG';
import img2 from '../assets/img/objktt/DSC00885.JPEG';
import img3 from '../assets/img/objktt/DSC00908.JPEG';
import img4 from '../assets/img/objktt/DSC00915.JPEG';
import img5 from '../assets/img/objktt/DSC00926.JPEG';

const images = [img1, img2, img3, img4, img5];

const editorialText: React.CSSProperties = {
  fontSize: 'clamp(2.5rem, 4vw, 3rem)',
  lineHeight: 1.2,
  fontWeight: 400,
  letterSpacing: '-0.01em',
  color: 'var(--color-text)',
};

const arrowBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--color-line)',
  color: 'var(--color-text)',
  width: '2.5rem',
  height: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1rem',
  transition: 'opacity 0.2s ease',
};

const AboutSection: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const inset = isMobile ? '1.5rem' : '4rem';
  const [currentImg, setCurrentImg] = useState(0);

  const prev = () => setCurrentImg((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrentImg((i) => (i + 1) % images.length);

  return (
    <section id="about" style={{ position: 'relative', paddingBottom: '8rem' }}>
      <div style={{
        padding: `${isMobile ? '3rem' : '5rem'} ${inset} 0`,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
        gridTemplateRows: isMobile ? 'auto' : 'auto auto auto auto',
        columnGap: '2rem',
        rowGap: isMobile ? '4rem' : '6rem',
        alignItems: 'start',
        position: 'relative',
      }}>

        {/* Image — spans cols 7-12 and all 4 rows, sits behind text */}
        {!isMobile && (
          <div style={{
            gridColumn: '7 / 13',
            gridRow: '1 / 5',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              aspectRatio: '3 / 4',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <img
                src={images[currentImg]}
                alt={`Objktt ${currentImg + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'opacity 0.4s ease',
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.75rem',
              alignItems: 'center',
            }}>
              <button onClick={prev} style={arrowBtn} aria-label="Previous image">←</button>
              <button onClick={next} style={arrowBtn} aria-label="Next image">→</button>
              <span style={{
                fontSize: '0.75rem',
                opacity: 0.4,
                marginLeft: '0.5rem',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {currentImg + 1} / {images.length}
              </span>
            </div>
          </div>
        )}

        {/* Row 1: Title */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / 5', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: isMobile ? '12vw' : 'clamp(3.5rem, 7vw, 7.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            About<br />Objktt
          </h2>
        </div>

        {/* Mobile image slider */}
        {isMobile && (
          <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <div style={{
              width: '100%',
              aspectRatio: '3 / 4',
              overflow: 'hidden',
            }}>
              <img
                src={images[currentImg]}
                alt={`Objktt ${currentImg + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.75rem',
              alignItems: 'center',
            }}>
              <button onClick={prev} style={arrowBtn} aria-label="Previous image">←</button>
              <button onClick={next} style={arrowBtn} aria-label="Next image">→</button>
              <span style={{
                fontSize: '0.75rem',
                opacity: 0.4,
                marginLeft: '0.5rem',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {currentImg + 1} / {images.length}
              </span>
            </div>
          </div>
        )}

        {/* Row 2: Intro */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / 7', position: 'relative', zIndex: 1 }}>
          <p style={editorialText}>
            Objktt is an independent listening bar and cultural space located in Myeongdong, Seoul.
            Situated on the 4th floor without an elevator, the space invites visitors to slow down and listen.
          </p>
        </div>

        {/* Row 3: Vinyl/sound */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : '7 / 13', position: 'relative', zIndex: 1 }}>
          <p style={editorialText}>
            We focus on vinyl, sound, and human connection.
            Live performances, installations, and listening sessions shape the rhythm of the space.
          </p>
        </div>

        {/* Row 4: Poetic */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : '7 / 13', position: 'relative', zIndex: 1 }}>
          <p style={editorialText}>
            Music needs time.<br />
            People need air.<br />
            Objects carry memory.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
