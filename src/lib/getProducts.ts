/**
 * Helpers that fetch from Shopify and reshape to our flat VinylRecord type.
 * Falls back to mock data if Shopify isn't configured yet.
 */

import { shopifyFetch, isShopifyConfigured } from './shopify';
import {
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTION_PRODUCTS_QUERY,
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
  featuredImage: ShopifyImage | null;
  images: { edges: { node: ShopifyImage }[] };
  variants: { edges: { node: ShopifyVariant }[] };
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
  const condition =
    clean(node.condition?.value) ??
    conditionCode(clean(node.kCondition?.value));

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags,
    featuredImage: node.featuredImage,
    images: node.images.edges.map((e) => e.node),
    variants: node.variants.edges.map((e) => e.node),
    artist,
    album,
    label: clean(node.label?.value) ?? clean(node.kLabel?.value),
    releaseYear:
      clean(node.releaseYear?.value) ?? yearOnly(clean(node.kReleaseYear?.value)),
    genre,
    condition,
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

  const data = await shopifyFetch<{
    collection: {
      products: { edges: { node: RawProductNode }[] };
    } | null;
  }>(COLLECTION_PRODUCTS_QUERY, { handle: category, first: 50 });

  if (!data.collection) return [];
  return data.collection.products.edges.map((e) => toVinylRecord(e.node));
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

  const data = await shopifyFetch<{
    products: { edges: { node: RawProductNode }[] };
  }>(PRODUCTS_QUERY, { first: 50 });

  return data.products.edges.map((e) => toVinylRecord(e.node));
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
