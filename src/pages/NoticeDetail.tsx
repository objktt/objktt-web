import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { getNoticeByHandle } from '../lib/getNotices';
import type { Notice } from '../types/shopify';

const formatDate = (iso: string, locale: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const NoticeDetail: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const { isMobile } = useBreakpoint();
  const { language, t } = useLanguage();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    getNoticeByHandle(handle)
      .then((n) => {
        if (!cancelled) setNotice(n);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return (
    <div
      style={{
        padding: isMobile ? '4rem 1.5rem 6rem' : '6rem 4rem 8rem',
        maxWidth: 880,
      }}
    >
      <Link
        to="/notices"
        style={{
          fontSize: '0.8125rem',
          opacity: 0.55,
          textDecoration: 'none',
          color: 'inherit',
          letterSpacing: '0.05em',
        }}
      >
        ← {t.notices.title}
      </Link>

      {loading && (
        <div style={{ marginTop: '2rem', opacity: 0.5, fontSize: '0.9375rem' }}>
          {t.notices.loading}
        </div>
      )}

      {!loading && !notice && (
        <div style={{ marginTop: '2rem', opacity: 0.5, fontSize: '0.9375rem' }}>
          {t.notices.notFound}
        </div>
      )}

      {notice && (
        <article style={{ marginTop: '2rem' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              opacity: 0.5,
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}
          >
            {formatDate(notice.publishedAt, language)}
          </div>
          <h1
            style={{
              fontSize: isMobile ? '8vw' : 'clamp(2rem, 4vw, 3.25rem)',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 2rem 0',
            }}
          >
            {notice.title}
          </h1>
          {notice.image && (
            <img
              src={notice.image.url}
              alt={notice.image.altText ?? notice.title}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                marginBottom: '2rem',
              }}
            />
          )}
          <div
            className="notice-body"
            style={{
              fontSize: '1rem',
              lineHeight: 1.7,
              opacity: 0.85,
            }}
            dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
          />
        </article>
      )}
    </div>
  );
};

export default NoticeDetail;
