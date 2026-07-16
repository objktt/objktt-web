import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getRecordByHandle, getProductsByCategory } from '../lib/getProducts';
import { useCart } from '../contexts/CartContext';
import { useSeo, type SeoOptions } from '../lib/seo';
import { FREE_SHIPPING_THRESHOLD, won } from '../lib/shipping';
import EmailSignup from '../components/EmailSignup';
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

// Shopify CDN image resizing — request a thumbnail instead of the full-res file.
const thumb = (url: string | undefined, w: number): string | undefined => {
  if (!url) return url;
  if (!/cdn\.shopify\.com|myshopify\.com/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}width=${w * 2}`;
};

// Genre metafields can be compound ("Disco, Funk, Reggae") — split into atoms.
const splitGenres = (g: string | null | undefined): string[] =>
  (g ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const decadeOf = (yearStr: string | null | undefined): number | null => {
  const year = parseInt(yearStr ?? '', 10);
  return Number.isFinite(year) ? Math.floor(year / 10) * 10 : null;
};

// Pick records related to the current one: same artist ≫ shared genre > same
// label > same decade. Sold-out records are skipped (nothing to buy), ties go
// to newest arrivals. Returns [] when nothing genuinely relates — the section
// simply doesn't render rather than showing random filler.
const pickRelated = (current: VinylRecord, all: VinylRecord[], max: number): VinylRecord[] => {
  const curGenres = new Set(splitGenres(current.genre));
  const curArtist = current.artist?.toLowerCase() ?? null;
  const curLabel = current.label?.toLowerCase() ?? null;
  const curDecade = decadeOf(current.releaseYear);
  return all
    .filter((r) => {
      if (r.handle === current.handle) return false;
      const v = r.variants[0];
      return !v || v.availableForSale;
    })
    .map((r) => {
      let score = 0;
      if (curArtist && r.artist?.toLowerCase() === curArtist) score += 5;
      const shared = splitGenres(r.genre).filter((g) => curGenres.has(g)).length;
      score += Math.min(shared, 2) * 3;
      if (curLabel && r.label?.toLowerCase() === curLabel) score += 2;
      if (curDecade !== null && decadeOf(r.releaseYear) === curDecade) score += 1;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (Date.parse(b.r.createdAt ?? '') || 0) - (Date.parse(a.r.createdAt ?? '') || 0)
    )
    .slice(0, max)
    .map((x) => x.r);
};

// Extract the 11-char video id from a watch/short/embed YouTube link.
const youtubeId = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.searchParams.get('v')) id = u.searchParams.get('v') ?? '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.slice('/embed/'.length);
    id = id.split(/[/?&]/)[0];
    return id || null;
  } catch {
    return null;
  }
};

// Lazy-load the YouTube IFrame Player API once (shared across players).
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// A single YouTube preview player. Autoplays the given video and calls onEnded
// when it finishes, so the tracklist can advance to the next track.
const TrackPlayer: React.FC<{ videoId: string; title: string; onEnded: () => void }> = ({ videoId, title, onEnded }) => {
  const holder = useRef<HTMLDivElement>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    let player: { destroy: () => void } | null = null;
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !holder.current) return;
      const YT = (window as unknown as { YT: any }).YT;
      player = new YT.Player(holder.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            // 0 = ENDED
            if (e.data === 0) endedRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { player?.destroy(); } catch { /* ignore */ }
    };
  }, [videoId]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        margin: '0 0 0.75rem',
        backgroundColor: 'var(--color-line)',
      }}
    >
      <div ref={holder} title={`Preview ${title}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
};

const ShopProduct: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const { isMobile } = useBreakpoint();
  const [record, setRecord] = useState<VinylRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, buyNow, loading: cartLoading, error: cartError } = useCart();
  const [pendingAction, setPendingAction] = useState<'add' | 'buy' | null>(null);
  const [openTrack, setOpenTrack] = useState<number | null>(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [related, setRelated] = useState<VinylRecord[]>([]);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    setOpenTrack(null);
    setImgIndex(0);
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

  // Related records — the catalog list is session-cached (getProductsByCategory),
  // so this is usually instant; on a cold direct visit it's one extra request.
  useEffect(() => {
    if (!record) {
      setRelated([]);
      return;
    }
    let cancelled = false;
    getProductsByCategory('records')
      .then((all) => {
        if (!cancelled) setRelated(pickRelated(record, all, 12));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  const seo = useMemo<SeoOptions>(() => {
    if (!record) return {};
    const album = record.album || record.title;
    const fmt = record.productType || 'LP';
    const year = record.releaseYear ? `, ${record.releaseYear}` : '';
    const head = [record.artist, album].filter(Boolean).join(' – ');
    const title = `${head} (${fmt}${year}) | OBJKTT`;
    const description = (
      cleanDescription(record.description) ||
      [record.artist, album, record.label, record.genre, record.releaseYear]
        .filter(Boolean)
        .join(' · ')
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const image = record.featuredImage?.url ?? record.images[0]?.url ?? null;
    const url = `https://objktt.kr/shop/${record.handle}`;
    const variant = record.variants[0];
    const offline = record.salesChannel === 'offline';
    const available = variant ? variant.availableForSale : false;

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: album,
      itemCondition: 'https://schema.org/UsedCondition',
    };
    if (record.artist) jsonLd.brand = { '@type': 'Brand', name: record.artist };
    if (record.images.length) jsonLd.image = record.images.slice(0, 10).map((i) => i.url);
    if (description) jsonLd.description = description;
    if (record.genre) jsonLd.category = record.genre;
    if (variant) {
      jsonLd.offers = {
        '@type': 'Offer',
        url,
        priceCurrency: variant.price.currencyCode || 'KRW',
        price: String(Math.round(Number(variant.price.amount)) || 0),
        availability: offline
          ? 'https://schema.org/InStoreOnly'
          : available
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/UsedCondition',
        seller: { '@type': 'Organization', name: 'OBJKTT' },
      };
    }

    return { title, description, image, url, type: 'product', jsonLd };
  }, [record]);
  useSeo(seo);

  const pad = isMobile ? '5rem 1.5rem 4rem' : '7rem 4rem 5rem';

  if (loading) {
    return (
      <div style={{ padding: pad, opacity: 0.6 }}>
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
  const isOffline = record.salesChannel === 'offline';
  // Gallery: all product images (featured is normally images[0]); de-dupe by url.
  const gallery = (
    record.images.length
      ? record.images
      : record.featuredImage
      ? [record.featuredImage]
      : []
  ).filter((img, i, arr) => arr.findIndex((x) => x.url === img.url) === i);
  const safeIndex = Math.min(imgIndex, Math.max(gallery.length - 1, 0));
  const current = gallery[safeIndex] ?? null;
  const go = (dir: number) =>
    setImgIndex((i) => {
      const n = gallery.length;
      if (n === 0) return 0;
      return (((i + dir) % n) + n) % n;
    });

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
        {/* Image column — carousel */}
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
            {isOffline && (
              <span
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  zIndex: 2,
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  backgroundColor: 'var(--color-text)',
                  color: 'var(--color-bg)',
                }}
              >
                오프라인 전용
              </span>
            )}
            {current ? (
              <img
                key={current.url}
                src={current.url}
                alt={current.altText ?? record.title}
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

            {gallery.length > 1 && (
              <>
                <CarouselArrow dir="prev" onClick={() => go(-1)} />
                <CarouselArrow dir="next" onClick={() => go(1)} />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {gallery.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      aria-label={`Image ${i + 1}`}
                      onClick={() => setImgIndex(i)}
                      style={{
                        width: i === safeIndex ? '1.5rem' : '0.5rem',
                        height: '0.5rem',
                        padding: 0,
                        border: 'none',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        backgroundColor: i === safeIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                        transition: 'width 0.2s ease, background-color 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(gallery.length, 6)}, 1fr)`,
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              {gallery.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setImgIndex(i)}
                  style={{
                    aspectRatio: '1 / 1',
                    backgroundColor: 'var(--color-line)',
                    overflow: 'hidden',
                    padding: 0,
                    border:
                      i === safeIndex
                        ? '1px solid var(--color-text)'
                        : '1px solid transparent',
                    cursor: 'pointer',
                    opacity: i === safeIndex ? 1 : 0.55,
                    transition: 'opacity 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}

          {record.imageSource !== 'real' && (
            <p
              style={{
                fontSize: '0.7rem',
                opacity: 0.6,
                lineHeight: 1.5,
                marginTop: '0.75rem',
              }}
            >
              * 이미지는 Discogs 제공 참고 이미지로, 실제 음반의 상태와 다를 수 있습니다.
            </p>
          )}
        </div>

        {/* Info column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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
              {record.album || record.title}
            </h1>
            {[record.genre, record.releaseYear].filter(Boolean).length > 0 && (
              <div
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                  opacity: 0.6,
                  marginTop: '0.7rem',
                }}
              >
                {[record.genre, record.releaseYear].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

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

          {/* Staff Pick — curator blurb shown right below the description (곡설명) */}
          {record.staffComments && record.staffComments.trim() && (
            <div
              style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-line)',
              }}
            >
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem' }}>
                Staff Pick
              </div>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.6, opacity: 0.85, whiteSpace: 'pre-line' }}>
                {record.staffComments}
              </div>
            </div>
          )}

          {/* Special notes (특이사항) — shown right below the album description */}
          {record.notes && record.notes.trim() && (
            <div
              style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-line)',
              }}
            >
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem' }}>
                특이사항
              </div>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.6, opacity: 0.85, whiteSpace: 'pre-line' }}>
                {record.notes}
              </div>
            </div>
          )}

          {/* Condition — emphasized */}
          {(record.mediaCondition || record.sleeveCondition || record.condition) && (
            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-line)' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.6,
                  marginBottom: '0.85rem',
                }}
              >
                Condition
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    record.mediaCondition && record.sleeveCondition && !isMobile
                      ? '1fr 1fr'
                      : '1fr',
                  gap: '1.25rem 3rem',
                }}
              >
                {record.mediaCondition || record.sleeveCondition ? (
                  <>
                    {record.mediaCondition && (
                      <ConditionCard label="Media" value={record.mediaCondition} />
                    )}
                    {record.sleeveCondition && (
                      <ConditionCard label="Sleeve" value={record.sleeveCondition} />
                    )}
                  </>
                ) : (
                  <ConditionCard label="Condition" value={record.condition} />
                )}
              </div>
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
            {isOffline ? (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  오프라인으로만 구매 가능
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '0.4rem', lineHeight: 1.5 }}>
                  이 음반은 온라인 판매하지 않습니다. 매장에 방문해 만나보세요.
                </div>
              </div>
            ) : (
            <>
            {variant && (
              <div
                style={{
                  fontSize: isMobile ? '2rem' : '2.5rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {formatKRW(variant.price.amount)}
              </div>
            )}

            {variant && (
              <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                {Number(variant.price.amount) >= FREE_SHIPPING_THRESHOLD
                  ? '무료배송'
                  : `${won(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료배송`}
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
            {soldOut && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>
                  품절된 음반입니다. 재입고되면 알려드릴까요?
                </div>
                <EmailSignup
                  source="restock"
                  productHandle={record.handle}
                  productTitle={record.title}
                  placeholder="이메일 주소"
                  buttonLabel="알림 신청"
                  successLabel="신청 완료 ✓ 재입고 시 알려드릴게요."
                />
              </div>
            )}
            </>
            )}
          </div>

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
                  opacity: 0.6,
                  marginBottom: '0.85rem',
                }}
              >
                Tracklist
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
                {record.tracklist.map((t, i, arr) => {
                  const vid = youtubeId(t.url);
                  const isOpen = openTrack === i;
                  const isLast = i === arr.length - 1;
                  // When this track's preview ends, jump to the next track that
                  // has a playable preview (auto-advance); close if none remain.
                  const playNext = () => {
                    let next: number | null = null;
                    for (let j = i + 1; j < arr.length; j++) {
                      if (youtubeId(arr[j].url)) { next = j; break; }
                    }
                    setOpenTrack(next);
                  };
                  return (
                    <li
                      key={i}
                      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-line)' }}
                    >
                      <div
                        role={vid ? 'button' : undefined}
                        tabIndex={vid ? 0 : undefined}
                        aria-expanded={vid ? isOpen : undefined}
                        aria-label={vid ? `Preview ${t.title}` : undefined}
                        onClick={() => vid && setOpenTrack(isOpen ? null : i)}
                        onKeyDown={(e) => {
                          if (vid && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setOpenTrack(isOpen ? null : i);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          fontSize: '0.9rem',
                          padding: '0.55rem 0',
                          cursor: vid ? 'pointer' : 'default',
                        }}
                      >
                        <span style={{ opacity: 0.5, minWidth: '1.4rem', fontVariantNumeric: 'tabular-nums' }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1 }}>{t.title}</span>
                        {vid && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.7rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              opacity: isOpen ? 1 : 0.6,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span aria-hidden style={{ fontSize: '0.6rem' }}>{isOpen ? '▾' : '▶'}</span>
                            Preview
                          </span>
                        )}
                      </div>
                      {isOpen && vid && (
                        <TrackPlayer videoId={vid} title={t.title} onEnded={playNext} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Spec rows (meta info) */}
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
            <SpecRow label="Label" value={record.label} />
            <SpecRow label="Catalog No." value={record.catalogNumber} />
            <SpecRow label="Year" value={record.releaseYear} />
            <SpecRow label="Country" value={record.country} />
            <SpecRow label="Format" value={record.productType} />
            <SpecRow label="Speed" value={record.speed} />
            <SpecRow label="Edition" value={record.edition} />
            {Number(record.discCount) > 1 && (
              <SpecRow label="Discs" value={record.discCount} />
            )}
          </dl>
        </div>
      </div>

      {/* Related records — horizontal carousel */}
      {related.length > 0 && <RelatedCarousel items={related} isMobile={isMobile} />}
    </div>
  );
};

// Horizontally browsable "You may also like" row with compact cards.
const RelatedCarousel: React.FC<{ items: VinylRecord[]; isMobile: boolean }> = ({
  items,
  isMobile,
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items.length]);

  // One card + gap per arrow press, measured from the live DOM.
  const move = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const first = el.children[0] as HTMLElement;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    el.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: 'smooth' });
  };

  return (
    <div
      style={{
        marginTop: isMobile ? '4rem' : '6rem',
        paddingTop: '2rem',
        borderTop: '1px solid var(--color-line)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          You may also like
        </div>
        {!isMobile && !(atStart && atEnd) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ScrollArrow dir="left" onClick={() => move(-1)} disabled={atStart} />
            <ScrollArrow dir="right" onClick={() => move(1)} disabled={atEnd} />
          </div>
        )}
      </div>
      <div
        ref={scroller}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: isMobile ? '0.9rem' : '1.25rem',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}
      >
        {items.map((r) => (
          <RelatedCard key={r.id} record={r} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
};

const ScrollArrow: React.FC<{ dir: 'left' | 'right'; onClick: () => void; disabled: boolean }> = ({
  dir,
  onClick,
  disabled,
}) => (
  <button
    type="button"
    aria-label={dir === 'left' ? 'Previous' : 'Next'}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--color-line)',
      borderRadius: '999px',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.35 : 1,
      transition: 'opacity 0.2s ease',
      fontFamily: 'inherit',
      padding: 0,
    }}
  >
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: dir === 'left' ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>
);

const RelatedCard: React.FC<{ record: VinylRecord; isMobile: boolean }> = ({
  record,
  isMobile,
}) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const variant = record.variants[0];
  const isOffline = record.salesChannel === 'offline';
  return (
    <Link
      to={`/shop/${record.handle}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: isMobile ? '36vw' : '160px',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          backgroundColor: 'var(--color-line)',
          overflow: 'hidden',
          marginBottom: '0.6rem',
        }}
      >
        {record.featuredImage && !imgError ? (
          <img
            src={thumb(record.featuredImage.url, 180)}
            alt={record.featuredImage.altText ?? record.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.4s ease',
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
              fontSize: '0.75rem',
              opacity: 0.4,
            }}
          >
            No image
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {record.artist && (
          <div
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
              opacity: 0.55,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {record.artist}
          </div>
        )}
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {record.album || record.title}
        </div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: isOffline ? 0.6 : 1 }}>
          {isOffline ? '오프라인 전용' : variant ? formatKRW(variant.price.amount) : null}
        </div>
      </div>
    </Link>
  );
};

const BackLink: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    // If we arrived here from within the app (not a direct/external load), go
    // back so the browser restores the shop's scroll position and active
    // filters. `location.key === 'default'` means this was the first entry.
    if (location.key !== 'default') navigate(-1);
    else navigate('/shop');
  };
  return (
    <a
      href="/shop"
      onClick={goBack}
      style={{
        fontSize: '0.875rem',
        opacity: 0.6,
        textDecoration: 'none',
        color: 'inherit',
        letterSpacing: '0.02em',
        cursor: 'pointer',
      }}
    >
      ← Back to Shop
    </a>
  );
};

const CarouselArrow: React.FC<{ dir: 'prev' | 'next'; onClick: () => void }> = ({
  dir,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={dir === 'prev' ? 'Previous image' : 'Next image'}
    style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      ...(dir === 'prev' ? { left: '0.75rem' } : { right: '0.75rem' }),
      width: '2.25rem',
      height: '2.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'rgba(255,255,255,0.85)',
      color: '#111',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <path d="M10 3 L5 8 L10 13" /> : <path d="M6 3 L11 8 L6 13" />}
    </svg>
  </button>
);

const ConditionCard: React.FC<{ label: string; value: string | null | undefined }> = ({
  label,
  value,
}) => {
  if (!value) return null;
  // "Very Good Plus (VG+)" → grade "VG+" + descriptor "Very Good Plus"
  const m = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const descriptor = m ? m[1].trim() : value;
  const grade = m ? m[2].trim() : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {grade && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.6rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '0.01em',
              color: '#fff',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            {grade}
          </span>
        )}
        <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
          {grade ? descriptor : value}
        </span>
      </span>
    </div>
  );
};

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
          opacity: 0.6,
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
