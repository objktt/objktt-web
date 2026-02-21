import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

// --- Individual SVG Icons extracted from micro_01.svg ---

export const OASymbol: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 48, style }) => (
  <svg viewBox="980 278 42 42" width={size} height={size} style={style} fill="currentColor">
    {/* Outer circle */}
    <path d="M990.77,280.49c-4.84,0-8.78,3.94-8.78,8.78,0,4.84,3.94,8.78,8.78,8.78s8.78-3.94,8.78-8.78-3.94-8.78-8.78-8.78ZM996.64,289.27c0,3.23-2.63,5.86-5.86,5.86s-5.86-2.63-5.86-5.86c0-3.23,2.63-5.86,5.86-5.86,3.23,0,5.86,2.63,5.86,5.86Z"/>
    {/* Inner circle */}
    <path d="M990.77,300.41c-4.84,0-8.78,3.94-8.78,8.78,0,4.84,3.94,8.78,8.78,8.78,4.84,0,8.78-3.94,8.78-8.78s-3.94-8.78-8.78-8.78ZM996.64,309.19c0,3.23-2.63,5.86-5.86,5.86s-5.86-2.63-5.86-5.86c0-3.23,2.63-5.86,5.86-5.86s5.86,2.63,5.86,5.86Z"/>
    {/* Arch */}
    <path d="M1015.98,281.18v5.16c-3.38-1.72-7.55-1.72-10.93,0v-5.16h-2.92v16.17h2.92v-.61c1.65.84,3.52,1.29,5.46,1.29s3.82-.45,5.47-1.29v.61h2.92v-16.17h-2.92ZM1005.05,289.79c3.14-2.44,7.8-2.44,10.93,0v3.52c-3.14,2.44-7.8,2.44-10.93,0v-3.52Z"/>
    {/* S-shape */}
    <path d="M1016.8,312.64l-.1.14c-.95,1.43-3.24,2.28-6.11,2.28-2.26,0-4.38-.67-5.39-1.7-.32-.33-.48-.65-.48-.95.02-.74.47-1.23.7-1.44,1.54.82,3.31,1.26,5.13,1.26,1.11,0,6.63-.15,6.63-3.02s-5.52-3.02-6.63-3.02c-1.83,0-3.6.43-5.13,1.26-.23-.21-.68-.71-.7-1.44,0-.31.15-.63.48-.96,1.01-1.03,3.12-1.7,5.39-1.7,2.87,0,5.16.85,6.11,2.28l.1.14,2.43-1.62-.1-.14c-.72-1.07-2.99-3.57-8.53-3.57-3.1,0-5.89.96-7.47,2.58-.88.9-1.34,1.95-1.31,3.06.03,1.49.76,2.57,1.26,3.14-.5.57-1.23,1.65-1.26,3.14-.02,1.1.43,2.16,1.31,3.06,1.58,1.61,4.37,2.58,7.47,2.58,5.53,0,7.81-2.49,8.53-3.57l.1-.14-2.43-1.62ZM1008.4,309.2c.69-.18,1.41-.27,2.16-.27,1.16,0,2.1.12,2.79.27-.69.15-1.64.27-2.79.27-.75,0-1.47-.09-2.16-.27Z"/>
  </svg>
);

export const ThreeOvals: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 48, style }) => (
  <svg viewBox="747 279 32 40" width={size} height={size * 1.25} style={style} fill="currentColor">
    <path d="M766.45,317.13c-5.04,0-8.99-7.86-8.99-17.89s3.95-17.89,8.99-17.89,8.99,7.86,8.99,17.89-3.95,17.89-8.99,17.89ZM766.45,283.97c-3.01,0-6.35,6.27-6.35,15.26s3.35,15.26,6.35,15.26,6.35-6.27,6.35-15.26-3.35-15.26-6.35-15.26Z"/>
    <path d="M758.78,317.13c-5.04,0-8.99-7.86-8.99-17.89s3.95-17.89,8.99-17.89,8.99,7.86,8.99,17.89-3.95,17.89-8.99,17.89ZM758.78,283.97c-3.01,0-6.35,6.27-6.35,15.26s3.35,15.26,6.35,15.26,6.35-6.27,6.35-15.26-3.35-15.26-6.35-15.26Z"/>
    <path d="M774.12,317.13c-5.04,0-8.99-7.86-8.99-17.89s3.95-17.89,8.99-17.89,8.99,7.86,8.99,17.89-3.95,17.89-8.99,17.89ZM774.12,283.97c-3.01,0-6.35,6.27-6.35,15.26s3.35,15.26,6.35,15.26,6.35-6.27,6.35-15.26-3.35-15.26-6.35-15.26Z"/>
  </svg>
);

export const Staircase: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 48, style }) => (
  <svg viewBox="796 280 40 40" width={size} height={size} style={style} fill="currentColor">
    <path d="M799.5,317.13c-.73,0-1.32-.59-1.32-1.32v-8.3c0-.73.59-1.32,1.32-1.32h6.98v-6.98c0-.73.59-1.32,1.32-1.32h6.98v-6.96c0-.73.59-1.32,1.32-1.32h6.98v-6.96c0-.73.59-1.32,1.32-1.32h8.3c.73,0,1.32.59,1.32,1.32s-.59,1.32-1.32,1.32h-6.98v6.96c0,.73-.59,1.32-1.32,1.32h-6.98v6.96c0,.73-.59,1.32-1.32,1.32h-6.98v6.98c0,.73-.59,1.32-1.32,1.32h-6.98v6.98c0,.73-.59,1.32-1.32,1.32Z"/>
  </svg>
);

export const WaveCircle: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 48, style }) => (
  <svg viewBox="840 279 40 40" width={size} height={size} style={style} fill="currentColor">
    <path d="M860.5,317.13c-9.87,0-17.89-8.03-17.89-17.89s8.03-17.89,17.89-17.89,17.89,8.03,17.89,17.89-8.03,17.89-17.89,17.89ZM860.5,283.97c-8.41,0-15.26,6.85-15.26,15.26s6.85,15.26,15.26,15.26,15.26-6.85,15.26-15.26-6.85-15.26-15.26-15.26Z"/>
    <path d="M873.59,302.5c-1.97,0-2.75-1.91-3.39-3.45-.24-.59-.69-1.68-.98-1.83-.23.14-.68,1.24-.93,1.83-.63,1.54-1.42,3.45-3.39,3.45s-2.76-1.91-3.39-3.45c-.24-.59-.69-1.68-.98-1.83-.23.14-.68,1.24-.93,1.83-.63,1.54-1.42,3.45-3.39,3.45s-2.76-1.91-3.4-3.45c-.24-.59-.69-1.68-.98-1.83-.24.14-.69,1.24-.93,1.83-.63,1.54-1.42,3.45-3.39,3.45-.73,0-1.32-.59-1.32-1.32s.59-1.32,1.32-1.32c.26-.14.72-1.23.96-1.82.63-1.54,1.42-3.45,3.39-3.45s2.76,1.91,3.39,3.45c.24.59.7,1.68.99,1.83.23-.14.69-1.24.93-1.83.63-1.54,1.42-3.45,3.39-3.45s2.76,1.91,3.39,3.45c.24.59.69,1.68.98,1.83.23-.14.68-1.24.93-1.83.63-1.54,1.42-3.45,3.39-3.45s2.75,1.91,3.39,3.45c.24.59.69,1.68.98,1.83.73,0,1.3.59,1.3,1.31s-.6,1.31-1.33,1.31Z"/>
  </svg>
);

export const Leaf: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 48, style }) => (
  <svg viewBox="895 280 40 40" width={size} height={size} style={style} fill="currentColor">
    <path d="M908.28,309.52c-4.41,0-6.16-2.6-6.27-2.76-.39-.61-.22-1.43.39-1.82.61-.39,1.43-.22,1.82.39.1.14,2.86,3.88,11.56-.72,7.72-4.08,10.43-16.42,11.14-20.58-6.9-.29-21.57-.01-25.71,4.21-5.1,5.2-.74,13.5-.69,13.59.34.64.1,1.44-.54,1.78-.64.34-1.44.11-1.78-.53-.22-.41-5.33-10.09,1.13-16.68,6.21-6.33,28.25-4.98,29.19-4.92.36.02.69.19.93.47.23.28.34.64.3.99-.08.75-2.21,18.44-12.73,24-3.66,1.93-6.53,2.59-8.74,2.59Z"/>
    <path d="M895.62,317.16s-.06,0-.08,0c-.73-.05-1.28-.67-1.23-1.4,1.34-21.35,22.11-25.69,22.32-25.73.71-.14,1.4.32,1.55,1.04.14.71-.32,1.41-1.04,1.55-.77.15-18.99,4.01-20.2,23.31-.04.7-.62,1.24-1.31,1.24Z"/>
  </svg>
);

// --- Text data extracted from the SVG ---

const metaLabel: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 400,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  opacity: 0.4,
  color: 'var(--color-text)',
  lineHeight: 1.8,
};

const dataLabel: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 400,
  letterSpacing: '0.08em',
  color: 'var(--color-text)',
  lineHeight: 1.8,
};

interface MicroIdentityProps {
  style?: React.CSSProperties;
}

const MicroIdentity: React.FC<MicroIdentityProps> = ({ style }) => {
  const { isMobile } = useBreakpoint();
  const inset = isMobile ? '1.5rem' : '8rem';

  return (
    <section style={{ padding: `0 ${inset}`, ...style }}>
      {/* Tagline */}
      <div style={{
        padding: isMobile ? '3rem 0 2rem' : '4rem 0 3rem',
        borderTop: '1px solid var(--color-line)',
      }}>
        <p style={{
          fontSize: isMobile ? '1.25rem' : 'clamp(1.25rem, 2vw, 1.75rem)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          color: 'var(--color-text)',
        }}>
          We have time, air and objects.
        </p>
      </div>

      {/* Icon row + Data grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? '2rem' : '2rem',
        paddingBottom: isMobile ? '3rem' : '4rem',
      }}>
        {/* Column 1: Icons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          color: 'var(--color-text)',
          opacity: 0.3,
        }}>
          <OASymbol size={isMobile ? 32 : 36} />
          <ThreeOvals size={isMobile ? 24 : 28} />
          <Staircase size={isMobile ? 28 : 32} />
          <WaveCircle size={isMobile ? 28 : 32} />
          <Leaf size={isMobile ? 28 : 32} />
        </div>

        {/* Column 2: Location */}
        <div>
          <span style={metaLabel}>Location</span>
          <div style={dataLabel}>
            <div>Myeongdong, Seoul</div>
            <div>58 Myeongdong-gil</div>
            <div>Jung-gu, Seoul</div>
            <div>4F</div>
          </div>
        </div>

        {/* Column 3: Category */}
        <div>
          <span style={metaLabel}>Type</span>
          <div style={dataLabel}>
            <div>Botanical · Wine · Cocktail</div>
            <div>Sound · Vinyl · Connection</div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <span style={metaLabel}>Style</span>
            <div style={dataLabel}>
              <div>Listening bar</div>
              <div>Record bar</div>
            </div>
          </div>
        </div>

        {/* Column 4: Contact */}
        <div>
          <span style={metaLabel}>Since</span>
          <div style={dataLabel}>2024</div>
          <div style={{ marginTop: '0.75rem' }}>
            <span style={metaLabel}>Contact</span>
            <div style={dataLabel}>
              <div>@objktt.recordbar</div>
              <div>objktt.kr</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MicroIdentity;
