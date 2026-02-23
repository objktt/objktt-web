import React from 'react';
import Grid from '../components/GridSystem';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

import img1 from '../assets/img/objktt/DSC00876.JPEG';
import img2 from '../assets/img/objktt/DSC00885.JPEG';
import img3 from '../assets/img/objktt/DSC00908.JPEG';
import img4 from '../assets/img/objktt/DSC00915.JPEG';
import img5 from '../assets/img/objktt/DSC00926.JPEG';

const About: React.FC = () => {
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  return (
    <div style={{ padding: '0 0 8rem 0' }}>
      {/* Section Title */}
      <div style={{
        padding: `${isMobile ? '5rem' : '7rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
      }}>
        <h2 style={{
          fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
          fontWeight: 500,
          lineHeight: 0.95,
          letterSpacing: isMobile ? '-0.03em' : '-0.04em',
          margin: 0,
          whiteSpace: 'pre-line',
        }}>
          {t.about.title}
        </h2>
      </div>

      <Grid>

        {/* Large Hero Image */}
        <div style={{ gridColumn: '6 / 13', marginBottom: '6rem' }}>
             <img src={img1} alt="Objktt Space" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Text Block 1 */}
        <div style={{ gridColumn: '2 / 6', marginBottom: '4rem' }}>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {t.about.block1}
          </p>
        </div>

        {/* Image 2 - Offset */}
        <div style={{ gridColumn: '1 / 5', marginBottom: '2rem', marginTop: '2rem' }}>
            <img src={img2} alt="Objktt Detail" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Text Block 2 - Right aligned relative to image */}
        <div style={{ gridColumn: '6 / 11', marginTop: '4rem', marginBottom: '4rem' }}>
          <p style={{ fontSize: '1.5rem', lineHeight: 1.5, fontWeight: 500, whiteSpace: 'pre-line' }}>
            {t.about.block2}
          </p>
        </div>

        {/* Full width breaker */}
        <div style={{ gridColumn: '3 / 11', marginBottom: '6rem' }}>
            <img src={img3} alt="Objktt Atmosphere" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Text Block 3 */}
        <div style={{ gridColumn: '8 / 12', marginBottom: '2rem', textAlign: 'left' }}>
           <p style={{ fontSize: '1.25rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {t.about.block3}
           </p>
        </div>

       {/* Image 4 & 5 - Side by Side */}
        <div style={{ gridColumn: '2 / 6', marginBottom: '4rem' }}>
            <img src={img4} alt="Objktt Vibe" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
        <div style={{ gridColumn: '7 / 12', marginTop: '4rem', marginBottom: '6rem' }}>
            <img src={img5} alt="Objktt Interior" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Final Text */}
        <div style={{ gridColumn: '4 / 10', textAlign: 'left', marginBottom: '4rem' }}>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.6, marginBottom: '2rem', whiteSpace: 'pre-line' }}>
            {t.about.block4}
          </p>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.6, marginBottom: '2rem', whiteSpace: 'pre-line' }}>
            {t.about.block5}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.4, marginTop: '4rem', whiteSpace: 'pre-line' }}>
            {t.about.block6}
          </p>
          
          <a href="/contact" style={{ 
              display: 'inline-block', 
              marginTop: '4rem', 
              fontSize: '1.5rem', 
              fontWeight: 500, 
              color: 'inherit', 
              textDecoration: 'none', 
              borderBottom: '1px solid var(--color-line)', 
              paddingBottom: '0.2rem' 
          }}>
            {t.about.contactBtn} &rarr;
          </a>
        </div>


      </Grid>
    </div>
  );
};

export default About;
