import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useSeo } from '../lib/seo';

export interface LegalSection {
  heading: string;
  body: string;
}

interface Props {
  title: string;
  updated?: string;
  intro?: string;
  sections: LegalSection[];
  /** Optional [label, value] rows rendered as a definition table (e.g. 사업자 정보). */
  infoRows?: Array<[string, string]>;
  seoTitle?: string;
  seoDescription?: string;
}

const LegalPage: React.FC<Props> = ({ title, updated, intro, sections, infoRows, seoTitle, seoDescription }) => {
  const { isMobile } = useBreakpoint();
  useSeo({ title: seoTitle ?? `${title} | OBJKTT`, description: seoDescription });

  return (
    <div style={{ padding: 0 }}>
      <div style={{ padding: isMobile ? '4rem 1.5rem 2rem' : '6rem 4rem 3rem' }}>
        <h1
          style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {updated && (
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', opacity: 0.5, marginTop: '1.5rem' }}>
            {updated}
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? '0 1.5rem 6rem' : '0 4rem 8rem', maxWidth: '52rem' }}>
        {intro && (
          <p style={{ fontSize: isMobile ? '1rem' : '1.0625rem', lineHeight: 1.7, opacity: 0.8, margin: '0 0 3rem 0', whiteSpace: 'pre-line' }}>
            {intro}
          </p>
        )}

        {infoRows && infoRows.length > 0 && (
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(7rem, auto) 1fr',
              gap: '0.6rem 1.5rem',
              fontSize: '0.9375rem',
              margin: '0 0 1rem 0',
              padding: '1.5rem 0',
              borderTop: '1px solid var(--color-line)',
            }}
          >
            {infoRows.map(([label, value]) => {
              const isUrl = /^https?:\/\//.test(value);
              const isKakao = isUrl && value.includes('pf.kakao.com');
              return (
                <React.Fragment key={label}>
                  <dt style={{ opacity: 0.5 }}>{label}</dt>
                  <dd style={{ margin: 0, opacity: 0.9 }}>
                    {isUrl ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '999px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          ...(isKakao
                            ? { backgroundColor: '#FEE500', color: '#191600' }
                            : { border: '1px solid var(--color-line)', color: 'var(--color-text)' }),
                        }}
                      >
                        {isKakao ? '💬 카카오톡으로 문의하기' : '바로가기 →'}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        )}

        {sections.map((section) => (
          <section key={section.heading} style={{ borderTop: '1px solid var(--color-line)', padding: '2rem 0' }}>
            <h2 style={{ fontSize: isMobile ? '1.0625rem' : '1.125rem', fontWeight: 500, lineHeight: 1.4, margin: '0 0 1rem 0' }}>
              {section.heading}
            </h2>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8, margin: 0, whiteSpace: 'pre-line' }}>
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default LegalPage;
