/**
 * Helpers that fetch from Shopify and reshape to our flat VinylRecord type.
 * Falls back to mock data if Shopify isn't configured yet.
 */

import { shopifyFetch, isShopifyConfigured } from './shopify';
import {
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTION_PRODUCTS_LIST_QUERY,
} from './queries';
import type { VinylRecord, ShopifyImage, ShopifyVariant } from '../types/shopify';
import { mockRecords } from '../data/mockRecords';

interface RawProductNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  createdAt: string;
  featuredImage: ShopifyImage | null;
  images?: { edges: { node: ShopifyImage }[] };
  variants?: { edges: { node: ShopifyVariant }[] };
  artist: { value: string } | null;
  album: { value: string } | null;
  label: { value: string } | null;
  releaseYear: { value: string } | null;
  genre: { value: string } | null;
  condition: { value: string } | null;
  // Fallback fields written by the kolektt hub (vendor/productType/title are
  // core fields; kolektt.* are exposed to the Storefront with PUBLIC_READ).
  kArtist: { value: string } | null;
  kLabel: { value: string } | null;
  kReleaseYear: { value: string } | null;
  kGenre: { value: string } | null;
  kCondition: { value: string } | null;
  kSleeve: { value: string } | null;
  kCatalog: { value: string } | null;
  kCountry: { value: string } | null;
  kSpeed: { value: string } | null;
  kEdition: { value: string } | null;
  kDiscCount: { value: string } | null;
  kTracklist: { value: string } | null;
  kSalesChannel: { value: string } | null;
  kImageSource: { value: string } | null;
  kNotes: { value: string } | null;
  kStaffComments: { value: string } | null;
  kFeatured: { value: string } | null;
}

const clean = (s: string | null | undefined): string | null => {
  const t = s?.trim();
  return t ? t : null;
};

// "Various Artists (3)" → "Various Artists" (strip Discogs disambiguation suffix)
const stripDiscogsSuffix = (s: string): string => s.replace(/\s*\(\d+\)\s*$/, '').trim();

// "Artist - Album" titles: everything after the first " - " is the album.
const albumFromTitle = (title: string): string => {
  const i = title.indexOf(' - ');
  return i === -1 ? title : title.slice(i + 3).trim();
};
const artistFromTitle = (title: string): string | null => {
  const i = title.indexOf(' - ');
  return i === -1 ? null : title.slice(0, i).trim();
};

// "Very Good Plus (VG+)" → "VG+"; "Near Mint (NM or M-)" → "NM"; "Mint (M)" → "M".
const conditionCode = (raw: string | null): string | null => {
  if (!raw) return null;
  const m = raw.match(/\(([^)]+)\)/);
  const inner = m ? m[1] : raw;
  return inner.split(/\s+or\s+/i)[0].trim() || null;
};

// "1974-09-01" or "1974" → "1974"
const yearOnly = (raw: string | null): string | null => {
  if (!raw) return null;
  const m = raw.match(/\d{4}/);
  return m ? m[0] : null;
};

// kolektt.tracklist lines look like "1. Title — https://youtu.be/…" (URL optional).
const parseTracklist = (raw: string | null): { title: string; url: string | null }[] => {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const noNum = line.replace(/^\d+[.)]\s*/, '');
      const sep = noNum.lastIndexOf(' — ');
      if (sep !== -1) {
        const title = noNum.slice(0, sep).trim();
        const url = noNum.slice(sep + 3).trim();
        return { title, url: /^https?:\/\//.test(url) ? url : null };
      }
      return { title: noNum, url: null };
    })
    .filter((t) => t.title);
};

function toVinylRecord(node: RawProductNode): VinylRecord {
  // Prefer the curated `record.*` metafields; fall back to the kolektt hub's
  // native shape so hub-synced products display without manual remapping.
  const artist =
    clean(node.artist?.value) ??
    clean(node.kArtist?.value) ??
    artistFromTitle(node.title) ??
    clean(stripDiscogsSuffix(node.vendor)) ??
    null;
  const album =
    clean(node.album?.value) ?? albumFromTitle(node.title);
  const genre =
    clean(node.genre?.value) ??
    clean(node.kGenre?.value) ??
    null;
  const mediaConditionRaw = clean(node.kCondition?.value);
  const sleeveConditionRaw = clean(node.kSleeve?.value);
  const condition =
    clean(node.condition?.value) ?? conditionCode(mediaConditionRaw);

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags,
    createdAt: node.createdAt,
    featuredImage: node.featuredImage,
    images: node.images?.edges.map((e) => e.node) ?? [],
    variants: node.variants?.edges.map((e) => e.node) ?? [],
    artist,
    album,
    label: clean(node.label?.value) ?? clean(node.kLabel?.value),
    releaseYear:
      clean(node.releaseYear?.value) ?? yearOnly(clean(node.kReleaseYear?.value)),
    genre,
    condition,
    mediaCondition: mediaConditionRaw,
    sleeveCondition: sleeveConditionRaw,
    catalogNumber: clean(node.kCatalog?.value),
    country: clean(node.kCountry?.value),
    speed: clean(node.kSpeed?.value),
    edition: clean(node.kEdition?.value),
    discCount: clean(node.kDiscCount?.value),
    tracklist: parseTracklist(clean(node.kTracklist?.value)),
    salesChannel: clean(node.kSalesChannel?.value),
    imageSource: clean(node.kImageSource?.value),
    notes: clean(node.kNotes?.value),
    staffComments: clean(node.kStaffComments?.value),
    featured: /^(1|true|yes)$/i.test(clean(node.kFeatured?.value) ?? ''),
  };
}

export type ShopCategory = 'records' | 'goods';

/**
 * Get all products from a category collection.
 * Returns empty array (not error) if the collection is empty.
 */
export async function getProductsByCategory(
  category: ShopCategory
): Promise<VinylRecord[]> {
  if (!isShopifyConfigured) {
    // Mock fallback. Pretend all mock records are in 'records'.
    return category === 'records' ? mockRecords : [];
  }

  // Serve from a short-lived session cache so re-visiting /shop (or returning
  // from a product page) is instant instead of re-fetching the whole catalog.
  const cached = readListCache(category);
  if (cached) return cached;

  // Fast path: the edge-cached list endpoint (/api/og?shop=…). The whole catalog
  // comes back in one request from Vercel's CDN instead of paging Shopify in the
  // browser. Falls through to the direct Shopify path on any failure.
  try {
    const r = await fetch(`/api/og?shop=${category}`);
    if (r.ok) {
      const { nodes } = (await r.json()) as { nodes: RawProductNode[] };
      if (Array.isArray(nodes) && nodes.length > 0) {
        const records = nodes.map(toVinylRecord);
        writeListCache(category, records);
        return records;
      }
    }
  } catch {
    /* fall back to direct Shopify paging below */
  }

  const records: VinylRecord[] = [];
  let after: string | null = null;

  // Fallback: page Shopify directly with the lightweight LIST query.
  do {
    const data: {
      collection: {
        products: {
          edges: { node: RawProductNode }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } | null;
    } = await shopifyFetch(COLLECTION_PRODUCTS_LIST_QUERY, {
      handle: category,
      first: 250,
      after,
    });

    if (!data.collection) break;
    const { edges, pageInfo } = data.collection.products;
    records.push(...edges.map((e) => toVinylRecord(e.node)));
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);

  writeListCache(category, records);
  return records;
}

// ── Session cache for the shop list (per category, ~5 min) ──
const LIST_CACHE_TTL = 2 * 60 * 1000;
function readListCache(category: ShopCategory): VinylRecord[] | null {
  try {
    const raw = sessionStorage.getItem(`objktt-shop-${category}`);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > LIST_CACHE_TTL) return null;
    return data as VinylRecord[];
  } catch {
    return null;
  }
}
function writeListCache(category: ShopCategory, data: VinylRecord[]): void {
  try {
    sessionStorage.setItem(`objktt-shop-${category}`, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota / unavailable — skip caching */
  }
}

/**
 * Get all records (kept for backward compatibility; routes to 'records' collection).
 */
export async function getRecords(): Promise<VinylRecord[]> {
  return getProductsByCategory('records');
}

/**
 * Get all products store-wide (no category filter). Used rarely.
 */
export async function getAllProducts(): Promise<VinylRecord[]> {
  if (!isShopifyConfigured) return mockRecords;

  const records: VinylRecord[] = [];
  let after: string | null = null;

  do {
    const data: {
      products: {
        edges: { node: RawProductNode }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await shopifyFetch(PRODUCTS_QUERY, { first: 250, after });

    const { edges, pageInfo } = data.products;
    records.push(...edges.map((e) => toVinylRecord(e.node)));
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);

  return records;
}

export async function getRecordByHandle(handle: string): Promise<VinylRecord | null> {
  if (!isShopifyConfigured) {
    return mockRecords.find((r) => r.handle === handle) ?? null;
  }

  const data = await shopifyFetch<{ product: RawProductNode | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle }
  );

  return data.product ? toVinylRecord(data.product) : null;
}
