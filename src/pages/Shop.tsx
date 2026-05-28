import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getProductsByCategory } from '../lib/getProducts';
import type { ShopCategory } from '../lib/getProducts';
import { isShopifyConfigured } from '../lib/shopify';
import type { VinylRecord } from '../types/shopify';

const formatKRW = (amount: string) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `₩${n.toLocaleString('ko-KR')}`;
};

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
  const { isMobile } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();

  const category: ShopCategory =
    (searchParams.get('cat') as ShopCategory) === 'goods' ? 'goods' : 'records';
  const activeGenre = searchParams.get('genre');
  const activeDecade = searchParams.get('decade');
  const activeLabel = searchParams.get('label');
  const sortKey: SortKey =
    (SORT_OPTIONS.find(o => o.key === searchParams.get('sort'))?.key) ?? 'featured';

  const [products, setProducts] = useState<VinylRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

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
    const params = new URLSearchParams();
    if (next !== 'records') params.set('cat', next);
    setSearchParams(params, { replace: true });
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (category !== 'records') next.set('cat', category);
    setSearchParams(next, { replace: true });
  };

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.genre) set.add(p.genre);
    return Array.from(set).sort();
  }, [products]);

  const decades = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const d = decadeOf(p.releaseYear);
      if (d) set.add(d);
    }
    return Array.from(set).sort();
  }, [products]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.label) set.add(p.label);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const matched = products.filter((p) => {
      if (activeGenre && p.genre !== activeGenre) return false;
      if (activeDecade && decadeOf(p.releaseYear) !== activeDecade) return false;
      if (activeLabel && p.label !== activeLabel) return false;
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
  }, [products, activeGenre, activeDecade, activeLabel, sortKey]);

  const activeFilterCount = [activeGenre, activeDecade, activeLabel].filter(Boolean).length;
  const showFilterUI = category === 'records' && (genres.length > 0 || decades.length > 0 || labels.length > 0);

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

      {/* Toolbar: Filter + Sort + count */}
      {showFilterUI && (
        <div
          style={{
            padding: isMobile ? '0 1.5rem' : '0 4rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                background:
                  activeFilterCount > 0 ? 'var(--color-text)' : 'var(--color-bg)',
                color: activeFilterCount > 0 ? 'var(--color-bg)' : 'var(--color-text)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              <FilterIcon active={activeFilterCount > 0} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span style={{ opacity: 0.85 }}>({activeFilterCount})</span>
              )}
            </button>

            <SortSelect
              value={sortKey}
              onChange={(v) => updateParam('sort', v === 'featured' ? null : v)}
            />
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.5,
            }}
          >
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div
          style={{
            padding: isMobile ? '0 1.5rem 1.5rem' : '0 4rem 1.5rem',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {activeGenre && (
            <ActiveChip label={activeGenre} onRemove={() => updateParam('genre', null)} />
          )}
          {activeDecade && (
            <ActiveChip label={activeDecade} onRemove={() => updateParam('decade', null)} />
          )}
          {activeLabel && (
            <ActiveChip label={activeLabel} onRemove={() => updateParam('label', null)} />
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              opacity: 0.55,
              background: 'none',
              border: 'none',
              padding: '0.4rem 0.6rem',
              cursor: 'pointer',
              color: 'var(--color-text)',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dev mock badge */}
      {!isShopifyConfigured && (
        <div
          style={{
            padding: isMobile ? '0 1.5rem 1.5rem' : '0 4rem 1.5rem',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.45,
          }}
        >
          Showing mock data — set token in <code>.env.local</code> to load real products.
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ padding: isMobile ? '0 1.5rem' : '0 4rem', opacity: 0.5 }}>
          Loading…
        </div>
      )}
      {error && !loading && (
        <div style={{ padding: isMobile ? '0 1.5rem' : '0 4rem', opacity: 0.7 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div
          style={{
            padding: isMobile ? '0 1.5rem' : '0 4rem',
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(220px, 1fr))',
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
        <div
          style={{
            padding: isMobile ? '0 1.5rem' : '0 4rem',
            opacity: 0.5,
            fontSize: '0.95rem',
          }}
        >
          {category === 'goods'
            ? 'Goods coming soon.'
            : activeFilterCount > 0
              ? 'No records match these filters.'
              : 'No records available yet.'}
        </div>
      )}

      {/* Filter Dialog */}
      {filterOpen && (
        <FilterDialog
          isMobile={isMobile}
          onClose={() => setFilterOpen(false)}
          genres={genres}
          decades={decades}
          labels={labels}
          activeGenre={activeGenre}
          activeDecade={activeDecade}
          activeLabel={activeLabel}
          onSetGenre={(val) => updateParam('genre', val)}
          onSetDecade={(val) => updateParam('decade', val)}
          onSetLabel={(val) => updateParam('label', val)}
          onClearAll={clearAllFilters}
          resultCount={filtered.length}
        />
      )}
    </div>
  );
};

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
  labels: string[];
  activeGenre: string | null;
  activeDecade: string | null;
  activeLabel: string | null;
  onSetGenre: (val: string | null) => void;
  onSetDecade: (val: string | null) => void;
  onSetLabel: (val: string | null) => void;
  onClearAll: () => void;
  resultCount: number;
}

const FilterDialog: React.FC<FilterDialogProps> = ({
  isMobile,
  onClose,
  genres,
  decades,
  labels,
  activeGenre,
  activeDecade,
  activeLabel,
  onSetGenre,
  onSetDecade,
  onSetLabel,
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

  const hasActive = activeGenre !== null || activeDecade !== null || activeLabel !== null;

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

          {decades.length > 0 && (
            <FilterSection
              label="Decade"
              items={decades}
              active={activeDecade}
              onChange={onSetDecade}
            />
          )}

          {labels.length > 0 && (
            <FilterSection
              label="Label"
              items={labels}
              active={activeLabel}
              onChange={onSetLabel}
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

const RecordCard: React.FC<RecordCardProps> = ({ record, hovered, onHover }) => {
  const variant = record.variants[0];
  const soldOut = variant ? !variant.availableForSale : false;

  return (
    <Link
      to={`/shop/${record.handle}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
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
        {record.featuredImage ? (
          <img
            src={record.featuredImage.url}
            alt={record.featuredImage.altText ?? record.title}
            loading="lazy"
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

        {soldOut && (
          <div
            style={{
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
            }}
          >
            Sold
          </div>
        )}

        {record.condition && (
          <div
            style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              padding: '0.2rem 0.5rem',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-line)',
              opacity: 0.85,
            }}
          >
            {record.condition}
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {record.artist && (
          <div
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              opacity: 0.55,
            }}
          >
            {record.artist}
          </div>
        )}
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {record.title}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: '0.35rem',
          }}
        >
          {variant && (
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {formatKRW(variant.price.amount)}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
            {[record.label, record.releaseYear].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Shop;
