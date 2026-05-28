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
}

function toVinylRecord(node: RawProductNode): VinylRecord {
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
    artist: node.artist?.value ?? null,
    album: node.album?.value ?? null,
    label: node.label?.value ?? null,
    releaseYear: node.releaseYear?.value ?? null,
    genre: node.genre?.value ?? null,
    condition: node.condition?.value ?? null,
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
