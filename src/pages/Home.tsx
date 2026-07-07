import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import hero1 from '../assets/img/objktt/DSC00876.JPEG';
import hero2 from '../assets/img/objktt/DSC00885.JPEG';
import hero3 from '../assets/img/objktt/DSC00908.JPEG';
import hero4 from '../assets/img/objktt/DSC00915.JPEG';
import hero5 from '../assets/img/objktt/DSC00926.JPEG';
import { getProductsByCategory } from '../lib/getProducts';
import { REVIEWS, GOOGLE_RATING, GOOGLE_REVIEW_COUNT, GOOGLE_PLACE_URL } from '../data/reviews';
import { BUSINESS } from '../data/business';
import { usePageSeo } from '../data/pageSeo';

// Atmosphere photos (bundled, served from Vercel). Source: Google Drive folder — see src/data/spaceImages.ts.
const SPACE_IMAGES = Object.entries(
  import.meta.glob('../assets/img/space/*.jpg', { eager: true, import: 'default' })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url as string);

const HERO_IMAGES = [hero1, hero2, hero3, hero4, hero5]; // 히어로 슬라이드쇼
const HERO_WORDS = ['Every', 'Object', 'is', 'a', 'Universe', 'in', 'Itself.'];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const rng = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
import type { VinylRecord } from '../types/shopify';

import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Home: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Live Google rating/count/reviews (falls back to the bundled data on failure).
  type LiveReview = { author: string; photo: string | null; rating: number; text: string; time: string };
  const [liveStats, setLiveStats] = useState<{ rating: number; count: number } | null>(null);
  const [liveReviews, setLiveReviews] = useState<LiveReview[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/og?reviews=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (typeof d.count === 'number') setLiveStats({ rating: d.rating ?? GOOGLE_RATING, count: d.count });
        if (Array.isArray(d.reviews) && d.reviews.length > 0) setLiveReviews(d.reviews);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const ratingDisplay = liveStats?.rating ?? GOOGLE_RATING;
  const countDisplay = liveStats?.count ?? GOOGLE_REVIEW_COUNT;

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [shopProducts, setShopProducts] = useState<VinylRecord[]>([]);

  const { t, language } = useLanguage();
  usePageSeo('home');
  const { isMobile } = useBreakpoint();

  // Normalize bundled + live reviews into one card shape (after `language` exists).
  const reviewCards: LiveReview[] = liveReviews
    ? liveReviews.filter((r) => r.text).slice(0, 4)
    : REVIEWS.map((r) => ({ author: r.author, photo: null, rating: r.rating, text: r.text, time: language === 'ko' ? r.time.ko : r.time.en }));

  // Hero: image + headline pinned; scrolling removes the words one by one from the
  // end (positions stay fixed). Progress through the pinned region is computed here.
  const heroRef = useRef<HTMLDivElement>(null);
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      setProg(total > 0 ? clamp01(-el.getBoundingClientRect().top / total) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  const hideCount = Math.round(rng(prog, 0, 0.4) * HERO_WORDS.length);
  const captionOpacity = 1 - rng(prog, 0.42, 0.5);
  // After the words + caption are gone, the image converges into a circle (~blob size) and fills blue → a blue dot.
  const clipR = lerp(150, 10, rng(prog, 0.5, 0.78));
  const blueOpacity = rng(prog, 0.55, 0.74);

  const ringText = 'Objktt Blue Dot Universe';
  const blobPath = (rT: number, rR: number, rB: number, rL: number) => {
    const C = 100, K = 0.5523;
    return [
      `M ${C} ${C - rT}`,
      `C ${C + K * rR} ${C - rT} ${C + rR} ${C - K * rT} ${C + rR} ${C}`,
      `C ${C + rR} ${C + K * rB} ${C + K * rR} ${C + rB} ${C} ${C + rB}`,
      `C ${C - K * rL} ${C + rB} ${C - rL} ${C + K * rB} ${C - rL} ${C}`,
      `C ${C - rL} ${C - K * rT} ${C - K * rL} ${C - rT} ${C} ${C - rT}`,
      'Z',
    ].join(' ');
  };
  // Blob (inner) and text-ring (outer) share the SAME per-side radii so the gap
  // between text and blob stays uniform; outer = inner + constant offset.
  const RING_GAP = 13;
  const blobSets = [
    [62, 60, 62, 60],
    [66, 56, 59, 64],
    [58, 65, 66, 56],
    [64, 62, 56, 63],
  ];
  const blobInner = blobSets.map((s) => blobPath(s[0], s[1], s[2], s[3]));
  const blobOuter = blobSets.map((s) => blobPath(s[0] + RING_GAP, s[1] + RING_GAP, s[2] + RING_GAP, s[3] + RING_GAP));
  const blobInnerValues = [...blobInner, blobInner[0]].join(';');
  const blobOuterValues = [...blobOuter, blobOuter[0]].join(';');

  // Atmosphere carousel — keep it parked at the start (first image aligned to the title).
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carIndicator, setCarIndicator] = useState({ w: 25, left: 0 });
  const updateCarIndicator = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const w = scrollWidth > 0 ? Math.max(10, (clientWidth / scrollWidth) * 100) : 100;
    const left = scrollWidth > clientWidth ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - w) : 0;
    setCarIndicator({ w, left });
  };
  const scrollCarousel = (dir: number) => {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  useEffect(() => {
    const el = carouselRef.current;
    if (el) el.scrollLeft = 0;
    updateCarIndicator();
  }, []);

  // Hero image slideshow (auto crossfade).
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_IMAGES.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProductsByCategory('records')
      .then((data) => { if (!cancelled) setShopProducts(data.slice(0, 12)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const formatKRW = (amount: string) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    return `₩${n.toLocaleString('ko-KR')}`;
  };

  const stickyBar: React.CSSProperties = {
    position: 'sticky',
    top: 'var(--header-height)',
    zIndex: 50,
    backgroundColor: 'var(--color-bg)',
  };

  const stickyInner: React.CSSProperties = {
    width: isMobile ? 'calc(100% - 3rem)' : 'calc(100% - 8rem)',
    margin: isMobile ? '0 1.5rem' : '0 4rem',
    padding: '0.625rem 0',
    borderBottom: '1px solid var(--color-line)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
  };

  return (
    <div style={{ padding: 0, position: 'relative' }}>
      {/* ─── Hero: pinned image (divider width) + headline; scroll removes words ─── */}
      <div ref={heroRef} style={{ position: 'relative', width: '100%', height: '200vh' }}>
        <div style={{
          position: 'sticky',
          top: 'var(--header-height)',
          height: 'calc(100vh - var(--header-height))',
          boxSizing: 'border-box',
          padding: isMobile ? '0 1.5rem 1.5rem' : '0 4rem 2rem',
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
            {/* Image + blue fill, clipped into a circle that shrinks to a centered blue dot */}
            <div style={{
              position: 'absolute',
              inset: 0,
              clipPath: `circle(${clipR}% at 50% 50%)`,
            }}>
              {HERO_IMAGES.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="Objktt"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: i === heroSlide ? 1 : 0,
                    transition: 'opacity 1.2s ease',
                  }}
                />
              ))}
              {/* Scrim (top → down) for headline legibility */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0) 60%)',
                pointerEvents: 'none',
              }} />
              {/* Blue fill — the converging circle becomes the brand blue dot */}
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--color-accent)', opacity: blueOpacity }} />
            </div>
            {/* Blue dot + text ring as one rotating SVG so the gap between the
                text and the blob stays uniform; both morph in sync (8s). */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '84vw' : '42vh',
              height: isMobile ? '84vw' : '42vh',
              opacity: prog >= 0.78 ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
            }}>
              <div style={{ width: '100%', height: '100%', animation: 'recordSpin2D 30s linear infinite' }}>
                <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
                  <defs>
                    <path id="blueDotRing" fill="none" d={blobOuter[0]}>
                      <animate attributeName="d" dur="8s" repeatCount="indefinite" calcMode="spline"
                        keyTimes="0;0.25;0.5;0.75;1"
                        keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
                        values={blobOuterValues} />
                    </path>
                  </defs>
                  <path fill="var(--color-accent)" d={blobInner[0]}>
                    <animate attributeName="d" dur="8s" repeatCount="indefinite" calcMode="spline"
                      keyTimes="0;0.25;0.5;0.75;1"
                      keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
                      values={blobInnerValues} />
                  </path>
                  <text fill="var(--color-accent)" fontSize="6" fontWeight="500" letterSpacing="1"
                    fillOpacity="0.95" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                    <textPath href="#blueDotRing" startOffset="0">{ringText}</textPath>
                  </text>
                </svg>
              </div>
            </div>
            <h1 style={{
              position: 'absolute',
              top: '3.5rem',
              left: 0,
              margin: 0,
              padding: isMobile ? '0 1rem' : '0 1.75rem',
              width: '100%',
              color: '#fff',
              fontWeight: 600,
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              fontSize: isMobile ? '5.5rem' : '13rem',
              pointerEvents: 'none',
            }}>
              {HERO_WORDS.map((w, i) => {
                const hidden = i >= HERO_WORDS.length - hideCount;
                return (
                  <React.Fragment key={i}>
                    {i > 0 ? ' ' : ''}
                    <span style={{ display: 'inline-block', visibility: hidden ? 'hidden' : 'visible' }}>{w}</span>
                  </React.Fragment>
                );
              })}
            </h1>
            {/* Carl Sagan caption — very small, bottom of the image */}
            <p style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              margin: 0,
              padding: isMobile ? '0 1rem 1rem' : '0 1.75rem 1.25rem',
              width: isMobile ? '100%' : '60%',
              color: '#fff',
              fontSize: isMobile ? '0.6rem' : '0.7rem',
              lineHeight: 1.45,
              letterSpacing: '0.02em',
              opacity: 0.9 * captionOpacity,
              textShadow: '0 1px 8px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
            }}>
              Objktt embraces Carl Sagan’s words: “For small creatures such as we the vastness is bearable only through love.”
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? '3rem 1.5rem 3rem' : '5rem 4rem 4rem' }}>
        <p style={{
          margin: 0,
          width: isMobile ? '100%' : '60%',
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
          color: 'var(--color-text)',
          whiteSpace: 'pre-line',
        }}>
          {t.home.welcome}
        </p>
      </div>

      {/* ─── Shop Section ─── */}
      {shopProducts.length > 0 && (
        <section style={{ position: 'relative' }}>
          <div style={stickyBar}>
            <div style={{
              ...stickyInner,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ opacity: 0.5 }}>{t.home.stickyShop}</span>
              <Link to="/shop" style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                opacity: 0.5,
                letterSpacing: '0.05em',
                transition: 'opacity 0.2s ease',
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                {t.home.viewAll}
              </Link>
            </div>
          </div>

          <div style={{
            padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          }}>
            <h2 style={{
              fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: isMobile ? '-0.03em' : '-0.04em',
              margin: 0,
              whiteSpace: 'pre-line',
            }}>
              {t.home.shopTitle}
            </h2>
          </div>

          <div style={{
            padding: isMobile ? '0 1.5rem' : '0 4rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            columnGap: isMobile ? '1.25rem' : '2.5rem',
            rowGap: isMobile ? '2.5rem' : '3.75rem',
          }}>
            {shopProducts.map((p) => {
              const variant = p.variants[0];
              const soldOut = variant ? !variant.availableForSale : false;
              const isOffline = p.salesChannel === 'offline';
              return (
                <Link
                  key={p.id}
                  to={`/shop/${p.handle}`}
                  onMouseEnter={() => setActiveItem(p.id)}
                  onMouseLeave={() => setActiveItem(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    textDecoration: 'none',
                    color: 'inherit',
                    opacity: soldOut ? 0.45 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    backgroundColor: 'var(--color-bg)',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '1rem',
                    boxShadow: activeItem === p.id ? 'var(--cover-shadow-hover)' : 'var(--cover-shadow)',
                    transition: 'box-shadow 0.35s ease',
                  }}>
                    {p.featuredImage ? (
                      <img
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText ?? p.title}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transform: activeItem === p.id ? 'scale(1.03)' : 'scale(1)',
                          transition: 'transform 0.4s ease',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        opacity: 0.4,
                      }}>No image</div>
                    )}
                    {isOffline ? (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        backgroundColor: 'var(--color-text)',
                        color: 'var(--color-bg)',
                      }}>오프라인 전용</div>
                    ) : soldOut && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-line)',
                      }}>Sold</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {p.artist && (
                      <div style={{ fontSize: '0.75rem', letterSpacing: '0.05em', opacity: 0.55 }}>
                        {p.artist}
                      </div>
                    )}
                    <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.3 }}>
                      {p.album || p.title}
                    </div>
                    {isOffline ? (
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.6, marginTop: '0.35rem' }}>
                        오프라인 전용
                      </div>
                    ) : (
                      variant && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.35rem' }}>
                          {formatKRW(variant.price.amount)}
                        </div>
                      )
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ height: isMobile ? '3rem' : '4rem' }} />
        </section>
      )}

      {/* ─── Atmosphere Carousel ─── */}
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyAtmosphere}</span></div>
        </div>

        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
            whiteSpace: 'pre-line',
          }}>
            {t.home.atmosphereTitle}
          </h2>
          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, paddingBottom: '0.6rem' }}>
              {[-1, 1].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => scrollCarousel(dir)}
                  aria-label={dir < 0 ? 'Previous' : 'Next'}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: '1px solid var(--color-line)', background: 'transparent',
                    color: 'var(--color-text)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-text)'; e.currentTarget.style.color = 'var(--color-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir < 0 ? 'rotate(180deg)' : 'none' }}>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          ref={carouselRef}
          className="hide-scrollbar"
          onScroll={updateCarIndicator}
          style={{
            display: 'flex',
            gap: isMobile ? '1rem' : '1.5rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '0 1.5rem 1.25rem' : '0 4rem 1.5rem',
          }}
        >
          {SPACE_IMAGES.map((src, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 auto',
                width: isMobile ? '82vw' : '34vw',
                aspectRatio: '4 / 3',
                overflow: 'hidden',
                backgroundColor: 'var(--color-bg)',
                boxShadow: 'var(--cover-shadow)',
              }}
            >
              <img
                src={src}
                alt="Objktt space"
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ padding: isMobile ? '0 1.5rem 3rem' : '0 4rem 4rem' }}>
          <div style={{ position: 'relative', height: 2, background: 'var(--color-line)' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: `${carIndicator.w}%`,
              left: `${carIndicator.left}%`,
              background: 'var(--color-text)',
              transition: 'left 0.08s linear, width 0.08s linear',
            }} />
          </div>
        </div>
      </section>

      {/* ─── Map Section ─── */}
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyLocation}</span></div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1.5rem' : '2rem',
          alignItems: 'flex-end',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
            width: isMobile ? '100%' : '50%',
            flexShrink: 0,
          }}>
            {t.home.locationTitle.split('\n').map((line, i) => (
              <span key={i}>{line}{i < t.home.locationTitle.split('\n').length - 1 && <br />}</span>
            ))}
          </h2>
          <p style={{
            fontSize: '0.9375rem',
            lineHeight: 1.3,
            opacity: 0.5,
            margin: 0,
          }}>
            {t.home.locationDesc.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < t.home.locationDesc.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        </div>

        <div style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
        }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.915729994784!2d126.9856344!3d37.5617842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca3e87dec1ac5%3A0xe8e28d09b3cb5c03!2z7Jik67iM6KCc7Yq4IOugiOy9lOuTnOuwlCAvIE9iamt0dCBSZWNvcmQgQmFy!5e0!3m2!1sen!2skr!4v1709650000000!5m2!1sen!2skr"
            width="100%"
            height={isMobile ? '400' : '560'}
            style={{ border: 0, display: 'block' }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Directions */}
        <div style={{
          padding: isMobile ? '2rem 1.5rem 3rem' : '3rem 4rem 4rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '2rem' : '4rem',
        }}>
          {/* Public Transit */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Public Transit
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              {t.home.transitDesc.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < t.home.transitDesc.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>

          {/* Parking */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Parking
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              {t.home.parkingDesc.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < t.home.parkingDesc.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>

      </section>

      {/* ─── Reviews Section ─── */}
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyReviews}</span></div>
        </div>

        {/* Title + Google rating */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1.5rem' : '2rem',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            {t.home.reviewsTitle.split('\n').map((line, i) => (
              <span key={i}>{line}{i < t.home.reviewsTitle.split('\n').length - 1 && <br />}</span>
            ))}
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            alignItems: isMobile ? 'flex-start' : 'flex-end',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1 }}>{ratingDisplay.toFixed(1)}</span>
              <span style={{ color: 'var(--color-accent)', fontSize: '1.05rem', letterSpacing: '0.1em' }}>★★★★★</span>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{t.home.reviewsCount} · {countDisplay}</div>
            <a
              href={GOOGLE_PLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', opacity: 0.8, textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '0.2rem' }}
            >
              {t.home.reviewsViewAll}
            </a>
          </div>
        </div>

        {/* Review cards */}
        <div style={{
          padding: isMobile ? '0 1.5rem 3rem' : '0 4rem 4rem',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? '1rem' : '1.5rem',
        }}>
          {reviewCards.map((r, i) => (
            <div key={i} style={{
              border: '1px solid var(--color-line)',
              padding: isMobile ? '1.5rem' : '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ color: 'var(--color-accent)', letterSpacing: '0.1em', fontSize: '0.95rem' }}>
                {'★'.repeat(r.rating)}
              </div>
              <p style={{ fontSize: isMobile ? '0.95rem' : '1rem', lineHeight: 1.6, opacity: 0.85, margin: 0, flex: 1 }}>
                {r.text}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.author}</span>
                <span style={{ opacity: 0.45, flexShrink: 0 }}>{r.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Contact Section ─── */}
      <section style={{ position: 'relative' }}>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyContact}</span></div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            {t.home.contactTitle.split('\n').map((line, i) => (
              <span key={i}>{line}{i < t.home.contactTitle.split('\n').length - 1 && <br />}</span>
            ))}
          </h2>
        </div>

        {/* Contact Form */}
        <div style={{
          padding: isMobile ? '2rem 1.5rem 6rem' : '3rem 4rem 8rem',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '2rem' : '4rem',
        }}>
          <div style={{ flex: 1, pointerEvents: 'auto' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              {t.home.contactLabel}
            </div>
            <form ref={formRef} onSubmit={async (e) => {
              e.preventDefault();
              setFormStatus('sending');
              try {
                const r = await fetch('/api/contact', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(formData),
                });
                if (!r.ok) throw new Error('send failed');
                setFormStatus('success');
                setFormData({ name: '', email: '', message: '' });
              } catch {
                setFormStatus('error');
              }
            }}>
              <input
                type="text"
                name="name"
                placeholder={t.contact.name}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  marginBottom: '1rem',
                }}
              />
              <input
                type="email"
                name="email"
                placeholder={t.contact.email}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  marginBottom: '1rem',
                }}
              />
              <textarea
                name="message"
                placeholder={t.contact.message}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  minHeight: '100px',
                  resize: 'vertical',
                  marginBottom: '1.5rem',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={formStatus === 'sending' || formStatus === 'success'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    cursor: formStatus === 'sending' ? 'wait' : 'pointer',
                    color: 'var(--color-text)',
                    opacity: formStatus === 'sending' ? 0.5 : 1,
                  }}
                >
                  {formStatus === 'sending' ? t.contact.sending : t.contact.send} →
                </button>
                {formStatus === 'success' && <span style={{ fontSize: '0.875rem', opacity: 0.6 }}>{t.contact.success}</span>}
                {formStatus === 'error' && <span style={{ fontSize: '0.875rem', color: 'red' }}>{t.contact.error}</span>}
              </div>
            </form>
          </div>

          <div style={{ flex: 1, pointerEvents: 'auto' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Email
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              hello@objktt.kr
            </p>

            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              margin: '1.75rem 0 0.75rem',
            }}>
              {t.home.kakaoLabel}
            </div>
            <a
              href={BUSINESS.kakaoChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8, textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              {t.home.kakaoCta}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
