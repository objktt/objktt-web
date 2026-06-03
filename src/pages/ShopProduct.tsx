import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getRecordByHandle } from '../lib/getProducts';
import { useCart } from '../contexts/CartContext';
import type { VinylRecord } from '../types/shopify';

const formatKRW = (amount: string) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `₩${n.toLocaleString('ko-KR')}`;
};

// The kolektt hub appends a raw "Information Label … Tracklist … ▶ Preview …"
// dump to the description. Structured fields + the Tracklist section now cover
// that, so strip everything from the "Information Label" marker onward and keep
// only the human-written intro.
const cleanDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  const idx = desc.search(/\s*Information\s+Label\b/i);
  return (idx === -1 ? desc : desc.slice(0, idx)).trim();
};

const ShopProduct: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const { isMobile } = useBreakpoint();
  const [record, setRecord] = useState<VinylRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, buyNow, loading: cartLoading, error: cartError } = useCart();
  const [pendingAction, setPendingAction] = useState<'add' | 'buy' | null>(null);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    getRecordByHandle(handle)
      .then((data) => {
        if (!cancelled) {
          setRecord(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load record');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const pad = isMobile ? '5rem 1.5rem 4rem' : '7rem 4rem 5rem';

  if (loading) {
    return (
      <div style={{ padding: pad, opacity: 0.5 }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: pad, opacity: 0.7 }}>
        <BackLink />
        <p style={{ marginTop: '1rem' }}>{error}</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: pad, opacity: 0.7 }}>
        <BackLink />
        <p style={{ marginTop: '1rem' }}>Record not found.</p>
      </div>
    );
  }

  const variant = record.variants[0];
  const soldOut = variant ? !variant.availableForSale : false;
  const featured = record.featuredImage ?? record.images[0] ?? null;

  return (
    <div style={{ padding: pad }}>
      <BackLink />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
          gap: isMobile ? '2rem' : '4rem',
          marginTop: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Image column */}
        <div>
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              backgroundColor: 'var(--color-line)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {featured ? (
              <img
                src={featured.url}
                alt={featured.altText ?? record.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  opacity: 0.4,
                }}
              >
                No image
              </div>
            )}
          </div>

          {/* Thumbnails (if multiple images) */}
          {record.images.length > 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(record.images.length, 5)}, 1fr)`,
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              {record.images.slice(0, 5).map((img) => (
                <div
                  key={img.id}
                  style={{
                    aspectRatio: '1 / 1',
                    backgroundColor: 'var(--color-line)',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Artist + Title */}
          <div>
            {record.artist && (
              <div
                style={{
                  fontSize: '0.875rem',
                  letterSpacing: '0.05em',
                  opacity: 0.6,
                  marginBottom: '0.5rem',
                }}
              >
                {record.artist}
              </div>
            )}
            <h1
              style={{
                fontSize: isMobile ? '1.85rem' : 'clamp(2rem, 3.2vw, 2.75rem)',
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {record.title}
            </h1>
          </div>

          {/* Spec rows */}
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(5rem, auto) 1fr',
              gap: '0.65rem 1.5rem',
              fontSize: '0.875rem',
              margin: 0,
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-line)',
            }}
          >
            <SpecRow label="Album" value={record.album} />
            <SpecRow label="Label" value={record.label} />
            <SpecRow label="Catalog No." value={record.catalogNumber} />
            <SpecRow label="Year" value={record.releaseYear} />
            <SpecRow label="Country" value={record.country} />
            <SpecRow label="Genre" value={record.genre} />
            <SpecRow label="Format" value={record.productType} />
            <SpecRow label="Speed" value={record.speed} />
            <SpecRow label="Edition" value={record.edition} />
            {Number(record.discCount) > 1 && (
              <SpecRow label="Discs" value={record.discCount} />
            )}
            {record.mediaCondition || record.sleeveCondition ? (
              <>
                <SpecRow label="Media" value={record.mediaCondition} />
                <SpecRow label="Sleeve" value={record.sleeveCondition} />
              </>
            ) : (
              <SpecRow label="Condition" value={record.condition} />
            )}
          </dl>

          {/* Tracklist */}
          {record.tracklist && record.tracklist.length > 0 && (
            <div
              style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-line)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                  marginBottom: '0.85rem',
                }}
              >
                Tracklist
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {record.tracklist.map((t, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.65rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span style={{ opacity: 0.4, minWidth: '1.4rem', fontVariantNumeric: 'tabular-nums' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1 }}>{t.title}</span>
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Preview ${t.title}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.7rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          opacity: 0.6,
                          color: 'inherit',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span aria-hidden style={{ fontSize: '0.65rem' }}>▶</span> Preview
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Description */}
          {cleanDescription(record.description) && (
            <div
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                opacity: 0.8,
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-line)',
                whiteSpace: 'pre-line',
              }}
            >
              {cleanDescription(record.description)}
            </div>
          )}

          {/* Price + CTA */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-line)',
            }}
          >
            {variant && (
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}
              >
                {formatKRW(variant.price.amount)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                type="button"
                disabled={soldOut || !variant || cartLoading}
                onClick={async () => {
                  if (!variant) return;
                  setPendingAction('add');
                  try { await addItem(variant.id, 1); }
                  catch { /* error surfaced below */ }
                  finally { setPendingAction(null); }
                }}
                style={{
                  flex: 1,
                  padding: '0.95rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--color-text)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: soldOut ? 'not-allowed' : 'pointer',
                  opacity: soldOut ? 0.5 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.2s ease, background-color 0.2s ease',
                }}
              >
                {soldOut
                  ? 'Sold out'
                  : pendingAction === 'add' && cartLoading
                  ? 'Adding…'
                  : 'Add to cart'}
              </button>
              <button
                type="button"
                disabled={soldOut || !variant || cartLoading}
                onClick={async () => {
                  if (!variant) return;
                  setPendingAction('buy');
                  try { await buyNow(variant.id, 1); }
                  catch { setPendingAction(null); }
                }}
                style={{
                  flex: 1,
                  padding: '0.95rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--color-text)',
                  backgroundColor: soldOut ? 'transparent' : 'var(--color-text)',
                  color: soldOut ? 'var(--color-text)' : 'var(--color-bg)',
                  cursor: soldOut ? 'not-allowed' : 'pointer',
                  opacity: soldOut ? 0.5 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.2s ease',
                }}
              >
                {pendingAction === 'buy' && cartLoading ? 'Redirecting…' : 'Buy now →'}
              </button>
            </div>
            {cartError && (
              <div style={{ fontSize: '0.8rem', color: '#c33', marginTop: '0.5rem' }}>
                {cartError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BackLink: React.FC = () => (
  <Link
    to="/shop"
    style={{
      fontSize: '0.875rem',
      opacity: 0.6,
      textDecoration: 'none',
      color: 'inherit',
      letterSpacing: '0.02em',
    }}
  >
    ← Back to Shop
  </Link>
);

const SpecRow: React.FC<{ label: string; value: string | null | undefined }> = ({
  label,
  value,
}) => {
  if (!value) return null;
  return (
    <>
      <dt
        style={{
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.5,
          paddingTop: '0.1rem',
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
};

export default ShopProduct;
