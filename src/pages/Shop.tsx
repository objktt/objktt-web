import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getProductsByCategory } from '../lib/getProducts';
import type { ShopCategory } from '../lib/getProducts';
import { isShopifyConfigured } from '../lib/shopify';
import type { VinylRecord } from '../types/shopify';
import { usePageSeo } from '../data/pageSeo';

const formatKRW = (amount: string) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `₩${n.toLocaleString('ko-KR')}`;
};

// Scroll-restore keys. We save the shop's scroll position + a one-shot flag the
// moment a product card is clicked, then restore it when the shop re-mounts.
const SCROLL_KEY = 'objktt-shop-scroll';
const RESTORE_FLAG = 'objktt-shop-restore';
const markShopReturn = () => {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(RESTORE_FLAG, '1');
  } catch { /* ignore */ }
};

// Shopify CDN image resizing — request a thumbnail instead of the full-res file
// so the grid loads fast. `w` is the CSS width; we fetch 2× for retina.
const thumb = (url: string | undefined, w: number): string | undefined => {
  if (!url) return url;
  if (!/cdn\.shopify\.com|myshopify\.com/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}width=${w * 2}`;
};

// Genre metafields can be compound ("Disco, Funk, Reggae"). Split into atomic
// genres so each can be mapped to a broad group below.
const splitGenres = (g: string | null | undefined): string[] =>
  (g ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Broad genre groups for the filter. The catalog has ~60 atomic genres, which
// is unusable as chips — so we collapse them into a handful of 대분류. Each group
// lists the exact atomic genres it owns; `match` is a keyword fallback so any
// future/unseen genre still lands somewhere sensible. ORDER matters: it sets
// both the chip order and the fallback precedence (first matching wins).
const GENRE_GROUPS: { label: string; genres: string[]; match: RegExp }[] = [
  { label: 'Disco', genres: ['Disco', 'Euro-Disco', 'Hi NRG', 'Hi-NRG'], match: /disco|hi.?nrg/i },
  { label: 'Funk / Soul', genres: ['Soul', 'Funk', 'Rhythm & Blues', 'RnB', 'RnB/Swing', 'Funk / Soul', 'Boogie', 'Bayou Funk', 'Gospel', 'Blues', 'Minneapolis Sound'], match: /funk|soul|rhythm & blues|r&b|rnb|gospel|boogie|minneapolis|blues/i },
  { label: 'Jazz', genres: ['Jazz', 'Fusion', 'Contemporary Jazz', 'Smooth Jazz', 'Free Jazz', 'Post Bop', 'Big Band', 'Swing', 'Soul-Jazz', 'Jazz-Funk', 'Jazz-Rock'], match: /jazz|fusion|\bbop\b|big band|swing/i },
  { label: 'New Wave / Synth-pop', genres: ['Synth-pop', 'New Wave'], match: /synth-?pop|new wave/i },
  { label: 'Electronic', genres: ['House', 'Deep House', 'Acid House', 'Garage House', 'Tribal House', 'Hip-House', 'Techno', 'Electro', 'Downtempo', 'Breakbeat', 'Leftfield', 'Freestyle', 'Ambient', 'New Age', 'Experimental', 'Abstract'], match: /house|techno|electro|ambient|downtempo|breakbeat|trance|idm|leftfield|electronic|new age/i },
  { label: 'Hip Hop', genres: ['Hip Hop', 'Pop Rap', 'Jazzy Hip-Hop', 'Conscious'], match: /hip.?hop|\brap\b/i },
  { label: 'Rock', genres: ['Pop Rock', 'Rock', 'Hard Rock', 'Alternative Rock', 'Blues Rock', 'Garage Rock', 'Psychedelic Rock', 'Soft Rock', 'Classic Rock', 'Art Rock', 'Country Rock', 'Punk', 'Hardcore', 'AOR'], match: /rock|punk|metal|hardcore|grunge/i },
  { label: 'Folk', genres: ['Folk', 'Folk Rock', 'Chanson', 'Acoustic'], match: /folk|chanson|acoustic|country/i },
  { label: 'World / Latin / Brazil', genres: ['Latin', 'Bossanova', 'Bossa Nova', 'MPB', 'Samba', 'Tropicália', 'Tropicalia', 'Forró', 'Forro', 'Bolero', 'Afrobeat', 'Afro-Cuban Jazz', 'Afro-Cuban', 'Raï', 'Rai', 'Highlife', 'Soukous'], match: /latin|bossa|samba|mpb|tropic|forr[oó]|bolero|cumbia|reggae|afro|calypso|brazil|world|cuban|ra[iï]|highlife|soukous|flamenco/i },
  { label: 'Japan / Asia', genres: ['Kayōkyoku', 'Kayokyoku', 'City Pop', 'J-pop', 'J-Pop', 'Enka', 'Shibuya-kei', 'Mandopop', 'Cantopop', 'K-pop', 'K-Pop'], match: /kay[oō]kyoku|j-?pop|city ?pop|enka|shibuya|mandopop|cantopop|k-?pop/i },
  { label: 'Pop', genres: ['Power Pop', 'Dance-pop', 'Vocal', 'Ballad', 'Balled'], match: /pop|vocal|ball(a|e)d/i },
];
// Vinyl format filter is driven by Shopify productType (LP / 12" / 10" / 7").
// Curated display order; unknown future values fall to the end.
const FORMAT_ORDER = ['LP', '12"', '10"', '7"'];

// productType is sometimes polluted by the hub with non-format values (e.g. a
// genre like "Soul"). Only surface values that actually look like a vinyl format
// so junk doesn't leak into the Format chips.
const looksLikeFormat = (t: string): boolean =>
  /\d\s*("|″|inch)/i.test(t) ||
  /^(lp|ep|single|maxi[- ]?single|cassette|tape|cd|box ?set|45|33)$/i.test(t.trim());

const OTHER_GROUP = 'Other';
const GROUP_ORDER = [...GENRE_GROUPS.map((g) => g.label), OTHER_GROUP];

// Exact-match lookup (lowercased) built once for speed.
const EXACT_GROUP = new Map<string, string>();
for (const g of GENRE_GROUPS) for (const name of g.genres) EXACT_GROUP.set(name.toLowerCase(), g.label);

const groupOfGenre = (atomic: string): string => {
  const exact = EXACT_GROUP.get(atomic.toLowerCase());
  if (exact) return exact;
  for (const g of GENRE_GROUPS) if (g.match.test(atomic)) return g.label;
  return OTHER_GROUP;
};

// The distinct broad groups a record belongs to (via its atomic genres).
// If a record has at least one real group, it is NOT also tagged 'Other' — so a
// single unmapped/typo genre (e.g. "Balled") doesn't leak it into the Other chip.
const genreGroupsOf = (g: string | null | undefined): string[] => {
  const set = new Set<string>();
  for (const atomic of splitGenres(g)) set.add(groupOfGenre(atomic));
  if (set.size > 1) set.delete(OTHER_GROUP);
  return Array.from(set);
};

// Asian-country records group under "Japan / Asia" FIRST, regardless of their
// (often Western) genre tag — e.g. a Japanese synth-pop record belongs in
// Japan / Asia rather than New Wave / Synth-pop.
const JAPAN_ASIA = 'Japan / Asia';
const ASIAN_COUNTRY = /japan|korea|china|hong\s*kong|taiwan|thailand|vietnam|singapore|indonesia|malaysia|philippines/i;

const genreGroupsOfRecord = (r: VinylRecord): string[] =>
  r.country && ASIAN_COUNTRY.test(r.country) ? [JAPAN_ASIA] : genreGroupsOf(r.genre);

const decadeOf = (yearStr: string | null | undefined): string | null => {
  if (!yearStr) return null;
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year)) return null;
  return `${Math.floor(year / 10) * 10}s`;
};

const CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'records', label: 'Records' },
  { key: 'goods', label: 'Goods' },
];

type SortKey =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'title-asc'
  | 'year-desc'
  | 'year-asc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
  { key: 'title-asc', label: 'Title: A → Z' },
  { key: 'year-desc', label: 'Year: Newest' },
  { key: 'year-asc', label: 'Year: Oldest' },
];

const priceOf = (p: VinylRecord): number => {
  const v = p.variants[0];
  const n = v ? Number(v.price.amount) : NaN;
  return Number.isFinite(n) ? n : 0;
};

const Shop: React.FC = () => {
  usePageSeo('shop');
  const { isMobile } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();

  const category: ShopCategory =
    (searchParams.get('cat') as ShopCategory) === 'goods' ? 'goods' : 'records';
  const activeGenre = searchParams.get('genre');
  const activeDecade = searchParams.get('decade');
  const activeFormat = searchParams.get('format');
  const sortKey: SortKey =
    (SORT_OPTIONS.find(o => o.key === searchParams.get('sort'))?.key) ?? 'featured';

  const [products, setProducts] = useState<VinylRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // Search lives in local state (not bound directly to the URL) so fast typing
  // never drops characters; the `q` param is synced separately, debounced.
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const q = query.trim();
          if (q) next.set('q', q);
          else next.delete('q');
          return next;
        },
        { replace: true }
      );
    }, 200);
    return () => clearTimeout(id);
  }, [query, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProductsByCategory(category)
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  // Capture the pending scroll-restore (set when a product card was clicked)
  // ONCE at mount, before anything can change it.
  const [pendingRestore] = useState(() => {
    if (sessionStorage.getItem(RESTORE_FLAG) !== '1') return 0;
    const s = sessionStorage.getItem(SCROLL_KEY);
    const y = s ? parseInt(s, 10) : 0;
    return Number.isFinite(y) && y > 0 ? y : 0;
  });

  // Restore the shop scroll position once the grid has loaded. The page height
  // grows as cards/images settle, so retry until we actually reach the target
  // (or the page can't scroll further), then clear the one-shot flag.
  useEffect(() => {
    if (loading || pendingRestore <= 0) return;
    sessionStorage.removeItem(RESTORE_FLAG);
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      window.scrollTo(0, pendingRestore);
      tries += 1;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const reached = Math.abs(window.scrollY - pendingRestore) < 2 || pendingRestore > maxY;
      if (!reached && tries < 20) timer = window.setTimeout(attempt, 50);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [loading, pendingRestore]);

  // Body scroll lock when modal open
  useEffect(() => {
    if (filterOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [filterOpen]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const switchCategory = (next: ShopCategory) => {
    setQuery('');
    const params = new URLSearchParams();
    if (next !== 'records') params.set('cat', next);
    setSearchParams(params, { replace: true });
  };

  const clearAllFilters = () => {
    setQuery('');
    const next = new URLSearchParams();
    if (category !== 'records') next.set('cat', category);
    setSearchParams(next, { replace: true });
  };

  // Cascading facets (Discogs-style): Format narrows Genre, Format+Genre narrows
  // Decade. Each option carries a count of matching records.
  const formatFacets = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const t = p.productType?.trim();
      if (t && looksLikeFormat(t)) m.set(t, (m.get(t) ?? 0) + 1);
    }
    const rank = (f: string) => {
      const i = FORMAT_ORDER.indexOf(f);
      return i === -1 ? FORMAT_ORDER.length : i;
    };
    return Array.from(m, ([value, count]) => ({ value, count })).sort(
      (a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value)
    );
  }, [products]);

  const afterFormat = useMemo(
    () => (activeFormat ? products.filter((p) => p.productType?.trim() === activeFormat) : products),
    [products, activeFormat]
  );

  const genreFacets = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of afterFormat) for (const g of genreGroupsOfRecord(p)) m.set(g, (m.get(g) ?? 0) + 1);
    return GROUP_ORDER.filter((g) => m.has(g)).map((value) => ({ value, count: m.get(value)! }));
  }, [afterFormat]);

  const afterGenre = useMemo(
    () => (activeGenre ? afterFormat.filter((p) => genreGroupsOfRecord(p).includes(activeGenre)) : afterFormat),
    [afterFormat, activeGenre]
  );

  const decadeFacets = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of afterGenre) {
      const d = decadeOf(p.releaseYear);
      if (d) m.set(d, (m.get(d) ?? 0) + 1);
    }
    return Array.from(m, ([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
  }, [afterGenre]);

  // Plain value lists — used by the mobile filter dialog and the showFilterUI gate.
  const formats = formatFacets.map((f) => f.value);
  const genres = genreFacets.map((f) => f.value);
  const decades = decadeFacets.map((f) => f.value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = products.filter((p) => {
      if (activeGenre && !genreGroupsOfRecord(p).includes(activeGenre)) return false;
      if (activeDecade && decadeOf(p.releaseYear) !== activeDecade) return false;
      if (activeFormat && p.productType?.trim() !== activeFormat) return false;
      if (q) {
        const hay = [p.title, p.artist, p.label, p.genre]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...matched];
    switch (sortKey) {
      case 'price-asc':
        sorted.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'price-desc':
        sorted.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'year-desc':
        sorted.sort((a, b) => Number(b.releaseYear ?? 0) - Number(a.releaseYear ?? 0));
        break;
      case 'year-asc':
        sorted.sort((a, b) => Number(a.releaseYear ?? 9999) - Number(b.releaseYear ?? 9999));
        break;
      // 'featured' → keep API order
    }
    return sorted;
  }, [products, activeGenre, activeDecade, activeFormat, query, sortKey]);

  const activeFilterCount = [activeGenre, activeDecade, activeFormat].filter(Boolean).length;
  const showFilterUI = category === 'records' && (genres.length > 0 || decades.length > 0 || formats.length > 0);

  // Featured row, shown on the unfiltered records landing only.
  // Source of truth = hub's `kolektt.featured` flag. If the hub hasn't curated
  // anything yet, fall back to newest arrivals so the row is never empty.
  const featured = useMemo(() => {
    const withImage = products.filter((p) => p.featuredImage);
    const byNewest = (a: VinylRecord, b: VinylRecord) =>
      (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0);
    const curated = withImage.filter((p) => p.featured).sort(byNewest);
    if (curated.length > 0) return curated.slice(0, 15);
    return [...withImage].sort(byNewest).slice(0, 15);
  }, [products]);

  const showFeatured =
    category === 'records' &&
    !activeGenre &&
    !activeDecade &&
    !activeFormat &&
    !query.trim() &&
    featured.length > 0;

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {/* Title */}
      <div
        style={{
          padding: `${isMobile ? '5rem' : '7rem'} ${isMobile ? '1.5rem' : '4rem'} ${
            isMobile ? '1.5rem' : '2rem'
          }`,
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}
        >
          Shop
        </h2>
      </div>

      {/* Category tabs */}
      <div
        style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
          display: 'flex',
          gap: isMobile ? '1.5rem' : '2.5rem',
          borderBottom: '1px solid var(--color-line)',
          marginBottom: isMobile ? '1.5rem' : '2rem',
        }}
      >
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchCategory(key)}
            style={{
              padding: '1rem 0',
              fontSize: isMobile ? '1rem' : '1.1rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
              background: 'none',
              border: 'none',
              borderBottom:
                category === key ? '2px solid var(--color-text)' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              opacity: category === key ? 1 : 0.45,
              fontFamily: 'inherit',
              transition: 'opacity 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Featured carousel (newest arrivals) — only on the unfiltered records landing.
          Bigger, image-forward, no price — distinct from the grid below. */}
      {!loading && !error && showFeatured && (
        <FeaturedCarousel items={featured} isMobile={isMobile} />
      )}

      {/* Content: desktop left sidebar (Discogs-style) + main column */}
      <div
        style={
          isMobile
            ? undefined
            : { display: 'flex', gap: '3rem', padding: '0 4rem', alignItems: 'flex-start' }
        }
      >
        {/* Desktop filter sidebar */}
        {!isMobile && showFilterUI && (
          <aside
            style={{
              width: '210px',
              flexShrink: 0,
              position: 'sticky',
              top: 'calc(var(--header-height) + 1.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}
          >
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={{ fontSize: '0.72rem', opacity: 0.55, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px', padding: 0 }}
                >
                  Clear all
                </button>
              </div>
            )}
            {formatFacets.length > 0 && (
              <FilterList label="Format" items={formatFacets} active={activeFormat} total={products.length} onChange={(v) => updateParam('format', v)} />
            )}
            {genreFacets.length > 0 && (
              <FilterList label="Genre" items={genreFacets} active={activeGenre} total={afterFormat.length} onChange={(v) => updateParam('genre', v)} />
            )}
            {decadeFacets.length > 0 && (
              <FilterList label="Decade" items={decadeFacets} active={activeDecade} total={afterGenre.length} onChange={(v) => updateParam('decade', v)} />
            )}
          </aside>
        )}

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar: Filter button (mobile) + Sort + count */}
          {showFilterUI && (
            <div
              style={{
                padding: isMobile ? '0 1.5rem' : '0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isMobile ? '1.5rem' : '2rem',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    flex: isMobile ? '1 1 100%' : '0 0 auto',
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ position: 'absolute', left: '0.7rem', opacity: 0.45, pointerEvents: 'none' }}
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search records"
                    aria-label="Search records"
                    style={{
                      width: isMobile ? '100%' : '240px',
                      padding: '0.6rem 0.9rem 0.6rem 2.1rem',
                      fontSize: '0.85rem',
                      border: '1px solid var(--color-line)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                      border: '1px solid var(--color-line)',
                      background: activeFilterCount > 0 ? 'var(--color-text)' : 'var(--color-bg)',
                      color: activeFilterCount > 0 ? 'var(--color-bg)' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FilterIcon active={activeFilterCount > 0} />
                    <span>Filter</span>
                    {activeFilterCount > 0 && <span style={{ opacity: 0.85 }}>({activeFilterCount})</span>}
                  </button>
                )}
              </div>

              <SortSelect
                value={sortKey}
                onChange={(v) => updateParam('sort', v === 'featured' ? null : v)}
              />
            </div>
          )}

          {/* Active filter chips — mobile only (desktop shows active state in the sidebar) */}
          {isMobile && activeFilterCount > 0 && (
            <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeGenre && <ActiveChip label={activeGenre} onRemove={() => updateParam('genre', null)} />}
              {activeDecade && <ActiveChip label={activeDecade} onRemove={() => updateParam('decade', null)} />}
              {activeFormat && <ActiveChip label={activeFormat} onRemove={() => updateParam('format', null)} />}
              <button
                type="button"
                onClick={clearAllFilters}
                style={{ fontSize: '0.75rem', letterSpacing: '0.05em', opacity: 0.55, background: 'none', border: 'none', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Dev mock badge */}
          {!isShopifyConfigured && (
            <div style={{ padding: isMobile ? '0 1.5rem 1.5rem' : '0 0 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.45 }}>
              Showing mock data — set token in <code>.env.local</code> to load real products.
            </div>
          )}

          {/* States */}
          {loading && (
            <div style={{ padding: isMobile ? '0 1.5rem' : '0', opacity: 0.5 }}>Loading…</div>
          )}
          {error && !loading && (
            <div style={{ padding: isMobile ? '0 1.5rem' : '0', opacity: 0.7 }}>{error}</div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div
              style={{
                padding: isMobile ? '0 1.5rem' : '0',
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: isMobile ? '1.25rem' : '2rem',
              }}
            >
              {filtered.map((p) => (
                <RecordCard
                  key={p.id}
                  record={p}
                  hovered={hoveredId === p.id}
                  onHover={(in_) => setHoveredId(in_ ? p.id : null)}
                />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: isMobile ? '0 1.5rem' : '0', opacity: 0.5, fontSize: '0.95rem' }}>
              {category === 'goods'
                ? 'Goods coming soon.'
                : activeFilterCount > 0 || query.trim()
                  ? 'No records match these filters.'
                  : 'No records available yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Filter Dialog */}
      {filterOpen && (
        <FilterDialog
          isMobile={isMobile}
          onClose={() => setFilterOpen(false)}
          genres={genres}
          decades={decades}
          formats={formats}
          activeGenre={activeGenre}
          activeDecade={activeDecade}
          activeFormat={activeFormat}
          onSetGenre={(val) => updateParam('genre', val)}
          onSetDecade={(val) => updateParam('decade', val)}
          onSetFormat={(val) => updateParam('format', val)}
          onClearAll={clearAllFilters}
          resultCount={filtered.length}
        />
      )}
    </div>
  );
};

// Image-forward featured carousel with arrow controls. Larger cards, no price —
// deliberately distinct from the dense grid below.
const FeaturedCarousel: React.FC<{ items: VinylRecord[]; isMobile: boolean }> = ({ items, isMobile }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [index, setIndex] = useState(0);

  // Width of one card + the flex gap, read from the live DOM so it stays
  // correct across breakpoints (mobile 72vw vs desktop 340px).
  const step = () => {
    const el = scroller.current;
    if (!el || el.children.length === 0) return 0;
    const first = el.children[0] as HTMLElement;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    return first.offsetWidth + gap;
  };

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
    // Map scroll progress across the full range so every album's dot is
    // reachable — with multiple cards visible the track stops scrolling once
    // the last card is flush right, which would otherwise leave the trailing
    // dots permanently inactive.
    const i = max > 0 ? Math.round((el.scrollLeft / max) * (items.length - 1)) : 0;
    setIndex(i);
  };

  // Track scroll position + recompute on resize / content change.
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

  // Advance exactly one card per arrow press.
  const move = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * step(), behavior: 'smooth' });
  };

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const n = items.length - 1;
    el.scrollTo({ left: n > 0 ? (i / n) * max : 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: isMobile ? '0 0 3rem' : '0 0 4rem' }}>
      {/* Header row: label + arrows */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0 1.5rem' : '0 4rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5 }}>
          Featured
        </div>
        {!isMobile && !(atStart && atEnd) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <CarouselArrow dir="left" onClick={() => move(-1)} disabled={atStart} />
            <CarouselArrow dir="right" onClick={() => move(1)} disabled={atEnd} />
          </div>
        )}
      </div>

      {/* Track */}
      <div
        ref={scroller}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: isMobile ? '1rem' : '1.5rem',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: isMobile ? '0 1.5rem' : '0 4rem',
          scrollPaddingLeft: isMobile ? '1.5rem' : '4rem',
        }}
      >
        {items.map((p) => (
          <FeaturedCard key={p.id} record={p} isMobile={isMobile} />
        ))}
      </div>

      {/* Indicators — one dot per card, active dot elongated. */}
      {items.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
            marginTop: '1.5rem',
            padding: isMobile ? '0 1.5rem' : '0 4rem',
          }}
        >
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to item ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              style={{
                width: i === index ? '22px' : '7px',
                height: '7px',
                borderRadius: '999px',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === index ? 'var(--color-text)' : 'var(--color-line)',
                transition: 'width 0.25s ease, background 0.25s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FeaturedCard: React.FC<{ record: VinylRecord; isMobile: boolean }> = ({ record, isMobile }) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  return (
    <Link
      to={`/shop/${record.handle}`}
      onClick={markShopReturn}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: isMobile ? '72vw' : '340px',
        scrollSnapAlign: 'start',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: hovered ? 'var(--cover-shadow-hover)' : 'var(--cover-shadow)',
          transition: 'box-shadow 0.35s ease',
          marginBottom: '1rem',
        }}
      >
        {record.featuredImage && !imgError ? (
          <img
            src={thumb(record.featuredImage.url, 400)}
            alt={record.featuredImage.altText ?? record.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.5s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4 }}>
            No image
          </div>
        )}
      </div>

      {/* Meta — artist + title only, no price */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {record.artist && (
          <div style={{ fontSize: '0.8rem', letterSpacing: '0.04em', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.artist}
          </div>
        )}
        <div style={{ fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.album || record.title}
        </div>
      </div>
    </Link>
  );
};

const CarouselArrow: React.FC<{ dir: 'left' | 'right'; onClick: () => void; disabled?: boolean }> = ({ dir, onClick, disabled = false }) => (
  <button
    type="button"
    aria-label={dir === 'left' ? 'Previous' : 'Next'}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '36px',
      height: '36px',
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === 'left' ? 'rotate(180deg)' : 'none' }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>
);

const SortSelect: React.FC<{ value: SortKey; onChange: (v: SortKey) => void }> = ({
  value,
  onChange,
}) => (
  <label
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1rem',
      fontSize: '0.85rem',
      fontWeight: 500,
      border: '1px solid var(--color-line)',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      position: 'relative',
    }}
  >
    <span style={{ opacity: 0.55 }}>Sort</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        background: 'transparent',
        border: 'none',
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        cursor: 'pointer',
        paddingRight: '1.1rem',
        outline: 'none',
      }}
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ position: 'absolute', right: '0.85rem', pointerEvents: 'none' }}
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  </label>
);

const ActiveChip: React.FC<{ label: string; onRemove: () => void }> = ({
  label,
  onRemove,
}) => (
  <button
    type="button"
    onClick={onRemove}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.35rem 0.7rem',
      fontSize: '0.75rem',
      fontWeight: 500,
      border: '1px solid var(--color-text)',
      background: 'var(--color-text)',
      color: 'var(--color-bg)',
      borderRadius: '999px',
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}
  >
    <span>{label}</span>
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      style={{ display: 'block' }}
    >
      <line x1="2" y1="2" x2="8" y2="8" />
      <line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  </button>
);

interface FilterDialogProps {
  isMobile: boolean;
  onClose: () => void;
  genres: string[];
  decades: string[];
  formats: string[];
  activeGenre: string | null;
  activeDecade: string | null;
  activeFormat: string | null;
  onSetGenre: (val: string | null) => void;
  onSetDecade: (val: string | null) => void;
  onSetFormat: (val: string | null) => void;
  onClearAll: () => void;
  resultCount: number;
}

const FilterDialog: React.FC<FilterDialogProps> = ({
  isMobile,
  onClose,
  genres,
  decades,
  formats,
  activeGenre,
  activeDecade,
  activeFormat,
  onSetGenre,
  onSetDecade,
  onSetFormat,
  onClearAll,
  resultCount,
}) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasActive = activeGenre !== null || activeDecade !== null || activeFormat !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter products"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: isMobile ? 'stretch' : 'flex-end',
        alignItems: isMobile ? 'flex-end' : 'stretch',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'objktt-fade-in 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: isMobile ? '100%' : 'min(420px, 92vw)',
          height: isMobile ? '88vh' : '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderTop: isMobile ? '1px solid var(--color-line)' : 'none',
          borderLeft: !isMobile ? '1px solid var(--color-line)' : 'none',
          boxShadow: isMobile
            ? '0 -8px 24px rgba(0,0,0,0.12)'
            : '-8px 0 24px rgba(0,0,0,0.12)',
          animation: isMobile
            ? 'objktt-slide-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
            : 'objktt-slide-left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Filter
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {genres.length > 0 && (
            <FilterSection
              label="Genre"
              items={genres}
              active={activeGenre}
              onChange={onSetGenre}
            />
          )}

          {formats.length > 0 && (
            <FilterSection
              label="Format"
              items={formats}
              active={activeFormat}
              onChange={onSetFormat}
            />
          )}

          {decades.length > 0 && (
            <FilterSection
              label="Decade"
              items={decades}
              active={activeDecade}
              onChange={onSetDecade}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-line)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClearAll}
            disabled={!hasActive}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: 'none',
              border: '1px solid var(--color-line)',
              cursor: hasActive ? 'pointer' : 'not-allowed',
              opacity: hasActive ? 1 : 0.4,
              color: 'var(--color-text)',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.85rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              border: '1px solid var(--color-text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            View {resultCount} {resultCount === 1 ? 'item' : 'items'}
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes objktt-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes objktt-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes objktt-slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// Discogs-style vertical facet list with per-option counts (used in the desktop sidebar).
interface Facet {
  value: string;
  count: number;
}

const FilterList: React.FC<{
  label: string;
  items: Facet[];
  active: string | null;
  total: number;
  onChange: (val: string | null) => void;
}> = ({ label, items, active, total, onChange }) => (
  <div>
    <div
      style={{
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.5,
        marginBottom: '0.6rem',
      }}
    >
      {label}
    </div>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
      <FilterRow label="All" count={total} active={active === null} onClick={() => onChange(null)} />
      {items.map((it) => (
        <FilterRow
          key={it.value}
          label={it.value}
          count={it.count}
          active={active === it.value}
          onClick={() => onChange(active === it.value ? null : it.value)}
        />
      ))}
    </ul>
  </div>
);

const FilterRow: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({
  label,
  count,
  active,
  onClick,
}) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '0.5rem',
        padding: '0.32rem 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--color-text)',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        opacity: active ? 1 : 0.6,
        transition: 'opacity 0.15s ease',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.35rem', minWidth: 0 }}>
        <span style={{ width: '0.5rem', flexShrink: 0, opacity: 0.8 }}>{active ? '›' : ''}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </span>
      <span style={{ fontSize: '0.72rem', opacity: 0.4, flexShrink: 0 }}>{count}</span>
    </button>
  </li>
);

interface FilterSectionProps {
  label: string;
  items: string[];
  active: string | null;
  onChange: (val: string | null) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  label,
  items,
  active,
  onChange,
}) => (
  <div>
    <div
      style={{
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.5,
        marginBottom: '0.85rem',
      }}
    >
      {label}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <FilterPill
        label="All"
        active={active === null}
        onClick={() => onChange(null)}
      />
      {items.map((it) => (
        <FilterPill
          key={it}
          label={it}
          active={active === it}
          onClick={() => onChange(active === it ? null : it)}
        />
      ))}
    </div>
  </div>
);

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.5rem 1rem',
      fontSize: '0.85rem',
      fontWeight: 500,
      border: '1px solid var(--color-line)',
      borderRadius: '999px',
      cursor: 'pointer',
      backgroundColor: active ? 'var(--color-text)' : 'var(--color-bg)',
      color: active ? 'var(--color-bg)' : 'var(--color-text)',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);

const FilterIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    style={{ display: 'block', opacity: active ? 1 : 0.7 }}
  >
    <line x1="2" y1="4" x2="14" y2="4" />
    <line x1="2" y1="8" x2="14" y2="8" />
    <line x1="2" y1="12" x2="14" y2="12" />
    <circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="10" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    style={{ display: 'block' }}
  >
    <line x1="3" y1="3" x2="13" y2="13" />
    <line x1="13" y1="3" x2="3" y2="13" />
  </svg>
);

interface RecordCardProps {
  record: VinylRecord;
  hovered: boolean;
  onHover: (entering: boolean) => void;
}

const NEW_ARRIVAL_DAYS = 14;

const RecordCard: React.FC<RecordCardProps> = ({ record, hovered, onHover }) => {
  const variant = record.variants[0];
  const soldOut = variant ? !variant.availableForSale : false;
  const isOffline = record.salesChannel === 'offline';
  const [imgError, setImgError] = useState(false);

  const price = variant ? Number(variant.price.amount) : NaN;
  const compareAt = variant?.compareAtPrice ? Number(variant.compareAtPrice.amount) : NaN;
  const onSale = Number.isFinite(price) && Number.isFinite(compareAt) && compareAt > price;
  const discountPct = onSale ? Math.round((1 - price / compareAt) * 100) : 0;

  const isNew = (() => {
    if (!record.createdAt) return false;
    const created = new Date(record.createdAt).getTime();
    if (!Number.isFinite(created)) return false;
    return Date.now() - created < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
  })();

  return (
    <Link
      to={`/shop/${record.handle}`}
      onClick={markShopReturn}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        cursor: 'pointer',
        opacity: soldOut ? 0.45 : 1,
        transition: 'opacity 0.2s ease',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* Cover */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          backgroundColor: 'var(--color-line)',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '0.75rem',
        }}
      >
        {record.featuredImage && !imgError ? (
          <img
            src={thumb(record.featuredImage.url, 260)}
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

        {/* Status chips (top-left) */}
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.35rem',
          }}
        >
          {isOffline ? (
            <span
              style={{
                padding: '0.25rem 0.55rem',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                backgroundColor: 'var(--color-text)',
                color: 'var(--color-bg)',
              }}
            >
              오프라인 전용
            </span>
          ) : soldOut ? (
            <span
              style={{
                padding: '0.25rem 0.55rem',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-line)',
              }}
            >
              Sold
            </span>
          ) : (
            isNew && (
              <span
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                }}
              >
                New
              </span>
            )
          )}
        </div>

        {/* Discount chip (top-right) */}
        {!isOffline && !soldOut && onSale && (
          <div
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              backgroundColor: 'var(--color-text)',
              color: 'var(--color-bg)',
            }}
          >
            -{discountPct}%
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {(record.artist || record.genre) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '0.5rem',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              opacity: 0.55,
            }}
          >
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.artist}
            </span>
            {record.genre && (
              <span style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
                {record.genre}
              </span>
            )}
          </div>
        )}
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {record.album || record.title}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: '0.35rem',
            gap: '0.5rem',
          }}
        >
          {isOffline ? (
            <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.6, flexShrink: 0, whiteSpace: 'nowrap' }}>
              오프라인 전용
            </div>
          ) : (
            variant && (
              <div style={{ fontSize: '0.9rem', fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {formatKRW(variant.price.amount)}
              </div>
            )
          )}
          <div
            style={{
              fontSize: '0.75rem',
              opacity: 0.5,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'right',
            }}
            title={[record.label, record.releaseYear].filter(Boolean).join(' · ')}
          >
            {[record.label, record.releaseYear].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Shop;
