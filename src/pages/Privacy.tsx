import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';

const Privacy: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { t } = useLanguage();

  return (
    <div style={{ padding: 0 }}>
      <div
        style={{
          padding: isMobile ? '4rem 1.5rem 2rem' : '6rem 4rem 3rem',
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}
        >
          {t.privacy.title}
        </h1>
        <div
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            opacity: 0.5,
            marginTop: '1.5rem',
          }}
        >
          {t.privacy.updated}
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? '0 1.5rem 6rem' : '0 4rem 8rem',
          maxWidth: '52rem',
        }}
      >
        <p
          style={{
            fontSize: isMobile ? '1rem' : '1.0625rem',
            lineHeight: 1.7,
            opacity: 0.8,
            margin: '0 0 3rem 0',
          }}
        >
          {t.privacy.intro}
        </p>

        {t.privacy.sections.map((section) => (
          <section
            key={section.heading}
            style={{
              borderTop: '1px solid var(--color-line)',
              padding: '2rem 0',
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? '1.0625rem' : '1.125rem',
                fontWeight: 500,
                lineHeight: 1.4,
                margin: '0 0 1rem 0',
              }}
            >
              {section.heading}
            </h2>
            <p
              style={{
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                opacity: 0.8,
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Privacy;
