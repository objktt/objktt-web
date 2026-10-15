import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { getProductsByCategory } from '../lib/getProducts';
import { useSeo, type SeoOptions } from '../lib/seo';
import { FREE_SHIPPING_THRESHOLD, won } from '../lib/shipping';
import EmailSignup from '../components/EmailSignup';
import { getGoodsEditorial, type L10n } from '../data/goodsEditorial';
import type { VinylRecord, ShopifyImage } from '../types/shopify';

/**
 * Goods product page. The buy panel (top-right: title → description → price →
 * buttons) mirrors the record page's info column; everything else — a photo
 * mosaic that uses every image, then the written details — is its own layout.
 * Rendered by ShopProduct when isGoodsProduct(record).
 */

const MAX_W = '1400px';

const formatKRW = (amount: string) => {
  const n = Number(amount);
  return Number.isFinite(n) ? won(n) : amount;
};

// Shopify CDN resize; leaves data: / non-Shopify URLs untouched.
const sized = (url: string, w: number): string => {
  if (!/cdn\.shopify\.com|myshopify\.com/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}width=${w * 2}`;
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  opacity: 0.6,
};

const ratioOf = (im: ShopifyImage) => (im.width && im.height ? im.width / im.height : 0.75);

/* ─────────────────────────── photo mosaic ─────────────────────────── */

// Group photos into rows: two portraits side by side, landscapes full width,
// a lone portrait gets a caption column beside it.
const buildRows = (imgs: ShopifyImage[]): ShopifyImage[][] => {
  const rows: ShopifyImage[][] = [];
  let buf: ShopifyImage[] = [];
  const flush = () => {
    if (buf.length) rows.push(buf);
    buf = [];
  };
  for (const im of imgs) {
    if (ratioOf(im) >= 1.05) {
      flush();
      rows.push([im]);
    } else {
      buf.push(im);
      if (buf.length === 2) flush();
    }
  }
  flush();
  return rows;
};

const Tile: React.FC<{ im: ShopifyImage; n: number; w: number; alt: string; offset?: boolean }> = ({
  im,
  n,
  w,
  alt,
  offset,
}) => (
  <figure id={`photo-${n}`} style={{ margin: 0, marginTop: offset ? '4rem' : 0, scrollMarginTop: '12.5rem' }}>
    <img
      src={sized(im.url, w)}
      alt={im.altText || alt}
      loading={n < 4 ? 'eager' : 'lazy'}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        aspectRatio: im.width && im.height ? `${im.width} / ${im.height}` : '3 / 4',
        objectFit: 'cover',
        backgroundColor: 'var(--color-line)',
      }}
    />
    <figcaption
      style={{
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
        opacity: 0.5,
        marginTop: '0.45rem',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {String(n + 1).padStart(2, '0')}
    </figcaption>
  </figure>
);

const Mosaic: React.FC<{
  images: ShopifyImage[];
  start: number;
  isMobile: boolean;
  alt: string;
  caption: string;
  /** Show the first photo alone, full width (one-column grid), before the 2-up rows. */
  firstFull?: boolean;
}> = ({ images, start, isMobile, alt, caption, firstFull }) => {
  const rows: ShopifyImage[][] = firstFull && images.length ? [[images[0]], ...buildRows(images.slice(1))] : buildRows(images);
  const gap = isMobile ? '0.5rem' : '0.75rem';
  let n = start;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.5rem' }}>
      {rows.map((row, ri) => {
        if (row.length === 2) {
          const a = n++;
          const b = n++;
          return (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap, alignItems: 'start' }}>
              <Tile im={row[0]} n={a} w={isMobile ? 220 : 420} alt={alt} offset={!isMobile && ri % 2 === 1} />
              <Tile im={row[1]} n={b} w={isMobile ? 220 : 420} alt={alt} offset={!isMobile && ri % 2 === 0} />
            </div>
          );
        }
        const im = row[0];
        const i = n++;
        if (ratioOf(im) >= 1.05 || isMobile || (firstFull && ri === 0)) {
          return <Tile key={ri} im={im} n={i} w={isMobile ? 440 : 840} alt={alt} />;
        }
        // Lone portrait: image on one side, a quiet caption on the other.
        const left = ri % 2 === 0;
        const cap = (
          <div style={{ ...labelStyle, fontSize: '0.7rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{caption}</div>
        );
        return (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap, alignItems: 'end' }}>
            {left ? null : cap}
            <Tile im={im} n={i} w={420} alt={alt} />
            {left ? cap : null}
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────── thumbnails ─────────────────────────── */

// Strip of small photos: click scrolls to that photo, the one in view is highlighted.
const Thumbs: React.FC<{ images: ShopifyImage[]; active: number; alt: string }> = ({ images, active, alt }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const el = box?.children[active] as HTMLElement | undefined;
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [active]);
  return (
    <div ref={ref} className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', position: 'relative' }}>
      {images.map((im, i) => (
        <button
          key={im.url}
          type="button"
          aria-label={`Photo ${i + 1}`}
          aria-current={i === active}
          onClick={() => document.getElementById(`photo-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          style={{
            flex: '0 0 auto',
            width: 56,
            height: 70,
            padding: 0,
            overflow: 'hidden',
            background: 'var(--color-line)',
            border: i === active ? '1px solid var(--color-text)' : '1px solid transparent',
            opacity: i === active ? 1 : 0.55,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease, border-color 0.2s ease',
          }}
        >
          <img src={sized(im.url, 56)} alt={im.altText || alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </button>
      ))}
    </div>
  );
};

/* ───────────────────────────── page ───────────────────────────── */

const GoodsProduct: React.FC<{ record: VinylRecord }> = ({ record }) => {
  const { isMobile } = useBreakpoint();
  const { language } = useLanguage();
  const { addItem, buyNow, loading: cartLoading, error: cartError } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const ed = getGoodsEditorial(record.handle);
  const L = (v?: L10n) => (v ? v[language] : '');
  const ko = language === 'ko';

  const variants = record.variants;
  const [vi, setVi] = useState(() => Math.max(variants.findIndex((v) => v.availableForSale), 0));
  const variant = variants[vi];
  const hasOptions = variants.length > 1 || (!!variants[0] && variants[0].title !== 'Default Title');
  const soldOut = variant ? !variant.availableForSale : false;
  const [pending, setPending] = useState<'add' | 'buy' | null>(null);

  const gallery: ShopifyImage[] = (
    record.images.length ? record.images : record.featuredImage ? [record.featuredImage] : []
  ).filter((im, i, arr) => arr.findIndex((x) => x.url === im.url) === i);

  // Which photo is in view (drives the thumbnail highlight).
  const [activePhoto, setActivePhoto] = useState(0);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[id^="photo-"]'));
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActivePhoto(Number(e.target.id.replace('photo-', '')));
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [gallery.length, isMobile]);

  const deck = L(ed?.deck);
  const aboutParas = (L(ed?.about) || record.description)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pad = isMobile ? '5rem 1.5rem 6rem' : '7rem 4rem 7rem';

  // Mobile sticky buy bar: shown once the buy block has scrolled out above the viewport.
  const buyRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pastBuy, setPastBuy] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const buy = buyRef.current;
    const end = endRef.current;
    if (!buy || !end || typeof IntersectionObserver === 'undefined') return;
    const ioBuy = new IntersectionObserver(
      ([e]) => setPastBuy(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    const ioEnd = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0 });
    ioBuy.observe(buy);
    ioEnd.observe(end);
    return () => {
      ioBuy.disconnect();
      ioEnd.disconnect();
    };
  }, []);
  const showBar = isMobile && pastBuy && !atEnd;

  // "More from this campaign" — other goods.
  const [more, setMore] = useState<VinylRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    getProductsByCategory('goods')
      .then((all) => {
        if (!cancelled) setMore(all.filter((p) => p.handle !== record.handle).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setMore([]);
      });
    return () => {
      cancelled = true;
    };
  }, [record.handle]);

  const seo = useMemo<SeoOptions>(() => {
    const title = `${record.title} | OBJKTT Goods`;
    const description = (deck || aboutParas[0] || record.title).replace(/\s+/g, ' ').slice(0, 160);
    const image = gallery[0]?.url && !gallery[0].url.startsWith('data:') ? gallery[0].url : null;
    const url = `https://objktt.kr/shop/${record.handle}`;
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: record.title,
      description,
      brand: { '@type': 'Brand', name: record.vendor || 'OBJKTT' },
    };
    if (image) jsonLd.image = gallery.slice(0, 10).map((g) => g.url);
    if (variant) {
      jsonLd.offers = {
        '@type': 'Offer',
        url,
        priceCurrency: variant.price.currencyCode || 'KRW',
        price: String(Math.round(Number(variant.price.amount)) || 0),
        availability: variants.some((v) => v.availableForSale)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'OBJKTT' },
      };
    }
    return { title, description, image, url, type: 'product', jsonLd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, language]);
  useSeo(seo);

  const onAdd = async () => {
    if (!variant) return;
    setPending('add');
    try {
      await addItem(variant.id, 1);
    } catch {
      /* error surfaced via cartError */
    } finally {
      setPending(null);
    }
  };
  const onBuy = async () => {
    if (!variant) return;
    setPending('buy');
    try {
      await buyNow(variant.id, 1);
    } catch {
      setPending(null);
    }
  };

  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.key !== 'default') navigate(-1);
    else navigate('/shop?cat=goods');
  };

  const shipNote =
    variant && Number(variant.price.amount) >= FREE_SHIPPING_THRESHOLD
      ? '무료배송'
      : `${won(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료배송`;

  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.95rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    border: '1px solid var(--color-text)',
    backgroundColor: primary && !soldOut ? 'var(--color-text)' : 'transparent',
    color: primary && !soldOut ? 'var(--color-bg)' : 'var(--color-text)',
    cursor: soldOut ? 'not-allowed' : 'pointer',
    opacity: soldOut ? 0.5 : 1,
    fontFamily: 'inherit',
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
  });

  /* Buy panel — same blocks, order and styling as the record page's info column. */
  const panel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <div style={{ fontSize: '0.875rem', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '0.5rem' }}>
          Objktt Grown
        </div>
        <h1
          style={{
            fontSize: isMobile ? '1.85rem' : 'clamp(2rem, 3.2vw, 2.75rem)',
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
            wordBreak: 'keep-all',
          }}
        >
          {record.title}
        </h1>
        {(ed?.nameEn || ed?.no) && (
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.05em', opacity: 0.6, marginTop: '0.7rem' }}>
            {[ed?.nameEn, ed?.no && `No. ${ed.no}`].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {deck && (
        <div
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.6,
            opacity: 0.8,
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          {deck}
        </div>
      )}

      {hasOptions && (
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-line)' }}>
          <div style={{ ...labelStyle, marginBottom: '0.85rem' }}>{ed?.optionLabel ?? 'Option'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {variants.map((v, i) => {
              const on = i === vi;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.availableForSale}
                  onClick={() => setVi(i)}
                  style={{
                    minWidth: '3.5rem',
                    padding: '0.65rem 1.1rem',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    border: '1px solid var(--color-text)',
                    backgroundColor: on ? 'var(--color-text)' : 'transparent',
                    color: on ? 'var(--color-bg)' : 'var(--color-text)',
                    opacity: v.availableForSale ? 1 : 0.35,
                    textDecoration: v.availableForSale ? 'none' : 'line-through',
                    cursor: v.availableForSale ? 'pointer' : 'not-allowed',
                  }}
                >
                  {v.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={buyRef}
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
              fontSize: isMobile ? '2rem' : '2.5rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {formatKRW(variant.price.amount)}
          </div>
        )}
        {variant && <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{shipNote}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isMobile ? 'column' : 'row' }}>
          <button type="button" disabled={soldOut || !variant || cartLoading} onClick={onAdd} style={btn(false)}>
            {soldOut ? 'Sold out' : pending === 'add' && cartLoading ? 'Adding…' : 'Add to cart'}
          </button>
          <button type="button" disabled={soldOut || !variant || cartLoading} onClick={onBuy} style={btn(true)}>
            {pending === 'buy' && cartLoading ? 'Redirecting…' : 'Buy now →'}
          </button>
        </div>
        {cartError && <div style={{ fontSize: '0.8rem', color: '#c33', marginTop: '0.5rem' }}>{cartError}</div>}
        {soldOut && !variants.some((v) => v.availableForSale) && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>
              품절된 상품입니다. 재입고되면 알려드릴까요?
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
      </div>
    </div>
  );

  const mosaicAlt = record.title;
  const mosaicCaption = [ed?.nameEn ?? record.title, ed?.campaign].filter(Boolean).join('\n');

  return (
    <div style={{ padding: pad }}>
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <a
          href="/shop?cat=goods"
          onClick={goBack}
          style={{ fontSize: '0.875rem', opacity: 0.6, textDecoration: 'none', color: 'inherit', letterSpacing: '0.02em', cursor: 'pointer' }}
        >
          ← Back to Shop
        </a>

        {isMobile ? (
          <div style={{ marginTop: '1.5rem' }}>
            <Mosaic images={gallery.slice(0, 1)} start={0} isMobile alt={mosaicAlt} caption={mosaicCaption} />
            {gallery.length > 1 && (
              <div style={{ marginTop: 'var(--sp-3, 15px)' }}>
                <Thumbs images={gallery} active={activePhoto} alt={mosaicAlt} />
              </div>
            )}
            <div style={{ marginTop: '1.5rem' }}>{panel}</div>
            <div style={{ marginTop: '2.5rem' }}>
              <Mosaic images={gallery.slice(1)} start={1} isMobile alt={mosaicAlt} caption={mosaicCaption} />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1fr)',
              gap: '4rem',
              marginTop: '2.5rem',
              alignItems: 'start',
            }}
          >
            <div style={{ minWidth: 0 }}>
              {gallery.length > 1 && (
                <div style={{ position: 'sticky', top: '7.5rem', zIndex: 5, background: 'var(--color-bg)', paddingBottom: 10, marginBottom: 10 }}>
                  <Thumbs images={gallery} active={activePhoto} alt={mosaicAlt} />
                </div>
              )}
              <Mosaic images={gallery} start={0} isMobile={false} alt={mosaicAlt} caption={mosaicCaption} firstFull />
            </div>
            <div
              className="hide-scrollbar"
              style={{
                position: 'sticky',
                top: '7.5rem',
                maxHeight: 'calc(100vh - 8.5rem)',
                overflowY: 'auto',
              }}
            >
              {panel}
            </div>
          </div>
        )}

        {/* Written details */}
        <section style={{ marginTop: isMobile ? '4rem' : '8rem' }}>
          {aboutParas.length > 0 && (
            <DetailRow title="About" isMobile={isMobile}>
              <div style={{ maxWidth: '44rem', fontSize: '1rem', lineHeight: 1.8, opacity: 0.85, wordBreak: 'keep-all' }}>
                {aboutParas.map((p, i) => (
                  <p key={i} style={{ margin: i ? '1em 0 0' : 0 }}>
                    {p}
                  </p>
                ))}
              </div>
            </DetailRow>
          )}

          {ed?.details && ed.details.length > 0 && (
            <DetailRow title="Details" isMobile={isMobile}>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(6rem, auto) 1fr',
                  gap: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  margin: 0,
                  maxWidth: '36rem',
                }}
              >
                {ed.details.map((d) => (
                  <React.Fragment key={d.label}>
                    <dt style={{ ...labelStyle, paddingTop: '0.1rem' }}>{d.label}</dt>
                    <dd style={{ margin: 0 }}>{L(d.value)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </DetailRow>
          )}

          {ed?.sizeChart && (
            <DetailRow title="Size guide" isMobile={isMobile}>
              <table style={{ borderCollapse: 'collapse', fontSize: '0.9rem', width: '100%', maxWidth: '28rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0', fontWeight: 400 }} />
                    {ed.sizeChart.cols.map((c) => (
                      <th key={c} style={{ ...labelStyle, textAlign: 'right', padding: '0.5rem 0', fontWeight: 500 }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ed.sizeChart.rows.map((r) => (
                    <tr key={r.label.en} style={{ borderTop: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '0.7rem 0', opacity: 0.8 }}>{L(r.label)}</td>
                      {r.values.map((v, i) => (
                        <td key={i} style={{ padding: '0.7rem 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {ed.sizeChart.note && (
                <p style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '0.75rem' }}>* {L(ed.sizeChart.note)}</p>
              )}
            </DetailRow>
          )}

          {ed?.care && (
            <DetailRow title="Care" isMobile={isMobile}>
              <p style={{ maxWidth: '44rem', fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.85, margin: 0, wordBreak: 'keep-all' }}>
                {L(ed.care)}
              </p>
            </DetailRow>
          )}

          <DetailRow title="Shipping" isMobile={isMobile} last>
            <p style={{ maxWidth: '44rem', fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.85, margin: 0, wordBreak: 'keep-all' }}>
              {ko ? (
                <>
                  {`${won(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료배송입니다. 교환·반품 안내는 `}
                  <Link to="/refund" style={{ color: 'inherit' }}>
                    배송·환불 정책
                  </Link>
                  {'을 확인해 주세요.'}
                </>
              ) : (
                <>
                  {`Free shipping over ${won(FREE_SHIPPING_THRESHOLD)}. See our `}
                  <Link to="/refund" style={{ color: 'inherit' }}>
                    shipping &amp; refund policy
                  </Link>
                  {' for exchanges and returns.'}
                </>
              )}
            </p>
          </DetailRow>
        </section>

        {/* More from this campaign */}
        {more.length > 0 && (
          <div style={{ marginTop: isMobile ? '4rem' : '6rem', paddingTop: '2rem', borderTop: '1px solid var(--color-line)' }}>
            <div style={{ ...labelStyle, marginBottom: '1.25rem' }}>More from Objktt Grown</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                gap: isMobile ? '0.9rem' : '1.25rem',
              }}
            >
              {more.map((p) => {
                const pv = p.variants[0];
                return (
                  <Link key={p.handle} to={`/shop/${p.handle}`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                    <div style={{ aspectRatio: '4 / 5', backgroundColor: 'var(--color-line)', overflow: 'hidden', marginBottom: '0.6rem' }}>
                      {p.featuredImage && (
                        <img
                          src={sized(p.featuredImage.url, 360)}
                          alt={p.featuredImage.altText ?? p.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>{p.title}</div>
                    {pv && <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{formatKRW(pv.price.amount)}</div>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div ref={endRef} aria-hidden style={{ height: 1 }} />
      </div>

      {/* Mobile sticky buy bar */}
      {isMobile && (
        <div
          aria-hidden={!showBar}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom))',
            backgroundColor: 'var(--color-bg)',
            borderTop: '1px solid var(--color-text)',
            transform: showBar ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 0.3s ease',
            visibility: showBar ? 'visible' : 'hidden',
          }}
        >
          {hasOptions && (
            <select
              value={vi}
              onChange={(e) => setVi(Number(e.target.value))}
              aria-label={ed?.optionLabel ?? 'Option'}
              style={{ padding: '0.65rem 0.5rem', fontFamily: 'inherit', fontSize: '0.85rem', border: '1px solid var(--color-text)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              {variants.map((v, i) => (
                <option key={v.id} value={i} disabled={!v.availableForSale}>
                  {v.title}
                </option>
              ))}
            </select>
          )}
          {variant && <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatKRW(variant.price.amount)}</span>}
          <button
            type="button"
            tabIndex={showBar ? 0 : -1}
            disabled={soldOut || !variant || cartLoading}
            onClick={onAdd}
            style={{ ...btn(true), padding: '0.7rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            {soldOut ? 'Sold out' : pending === 'add' && cartLoading ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      )}
    </div>
  );
};

// One labelled row of the written details: label column + content, ruled above.
const DetailRow: React.FC<{ title: string; isMobile: boolean; last?: boolean; children: React.ReactNode }> = ({
  title,
  isMobile,
  last,
  children,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 2.2fr',
      gap: isMobile ? '0.75rem' : '3rem',
      padding: '1.75rem 0',
      borderTop: '1px solid var(--color-line)',
      borderBottom: last ? '1px solid var(--color-line)' : undefined,
    }}
  >
    <div style={labelStyle}>{title}</div>
    <div>{children}</div>
  </div>
);

export default GoodsProduct;
