import React, { useEffect, useMemo, useState } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { getFAQs } from '../lib/getFAQs';
import type { FAQ as FAQEntry } from '../types/shopify';

const FAQ: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFAQs()
      .then((data) => {
        if (!cancelled) {
          setFaqs(data);
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

  const grouped = useMemo(() => {
    const map = new Map<string, FAQEntry[]>();
    for (const f of faqs) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, [faqs]);

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
          {t.faq.title}
        </h1>
      </div>

      <div style={{ padding: isMobile ? '0 1.5rem 6rem' : '0 4rem 8rem' }}>
        {loading && (
          <div style={{ opacity: 0.5, fontSize: '0.9375rem' }}>
            {t.faq.loading}
          </div>
        )}
        {error && (
          <div style={{ color: 'red', fontSize: '0.9375rem' }}>{t.faq.error}</div>
        )}
        {!loading && !error && faqs.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: '0.9375rem' }}>
            {t.faq.empty}
          </div>
        )}

        {grouped.map(([category, entries]) => (
          <section key={category} style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.5,
                margin: '0 0 1rem 0',
              }}
            >
              {category}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {entries.map((f) => {
                const isOpen = openId === f.id;
                return (
                  <li
                    key={f.id}
                    style={{ borderTop: '1px solid var(--color-line)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : f.id)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '1.25rem 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? '1rem' : '1.0625rem',
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {f.question}
                      </span>
                      <span
                        style={{
                          fontSize: '1.25rem',
                          opacity: 0.55,
                          transition: 'transform 0.2s ease',
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                          flexShrink: 0,
                        }}
                      >
                        +
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: '0 0 1.5rem 0',
                          fontSize: '0.9375rem',
                          lineHeight: 1.7,
                          opacity: 0.8,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {f.answer}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
