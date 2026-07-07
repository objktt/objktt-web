import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { getNotices } from '../lib/getNotices';
import type { Notice } from '../types/shopify';
import { usePageSeo } from '../data/pageSeo';

const formatDate = (iso: string, locale: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const Notices: React.FC = () => {
  usePageSeo('notices');
  const { isMobile } = useBreakpoint();
  const { language, t } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotices()
      .then((data) => {
        if (!cancelled) {
          setNotices(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 0 }}>
      <div
        style={{
          padding: isMobile
            ? '4rem 1.5rem 2rem'
            : '6rem 4rem 3rem',
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
          {t.notices.title}
        </h1>
      </div>

      <div
        style={{
          padding: isMobile ? '0 1.5rem 6rem' : '0 4rem 8rem',
        }}
      >
        {loading && (
          <div style={{ opacity: 0.5, fontSize: '0.9375rem' }}>
            {t.notices.loading}
          </div>
        )}
        {error && (
          <div style={{ color: 'red', fontSize: '0.9375rem' }}>
            {t.notices.error}
          </div>
        )}
        {!loading && !error && notices.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: '0.9375rem' }}>
            {t.notices.empty}
          </div>
        )}

        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {notices.map((n) => (
            <li
              key={n.id}
              style={{ borderTop: '1px solid var(--color-line)' }}
            >
              <Link
                to={`/notices/${n.handle}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
                  gap: isMobile ? '0.5rem' : '2rem',
                  padding: isMobile ? '1.25rem 0' : '1.5rem 0',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <div
                  style={{
                    fontSize: '0.8125rem',
                    opacity: 0.5,
                    letterSpacing: '0.05em',
                  }}
                >
                  {formatDate(n.publishedAt, language)}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? '1.125rem' : '1.25rem',
                      fontWeight: 500,
                      lineHeight: 1.35,
                    }}
                  >
                    {n.title}
                  </div>
                  {n.excerpt && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.9375rem',
                        opacity: 0.6,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.excerpt}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Notices;
