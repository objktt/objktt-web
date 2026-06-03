/**
 * Shopify Storefront API types — minimal subset we use.
 */

export interface ShopifyMoney {
  amount: string; // decimal string, e.g. "30000.00"
  currencyCode: string; // e.g. "KRW"
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyMoney;
  compareAtPrice?: ShopifyMoney | null;
}

export interface ShopifyMetafield {
  key: string;
  value: string;
  type: string;
}

/** A single tracklist entry; `url` is a preview/listen link (e.g. YouTube) when present. */
export interface Track {
  title: string;
  url: string | null;
}

/**
 * Record-specific product shape.
 * Custom metafields under namespace `record` (curated) or `kolektt` (hub) map here.
 */
export interface VinylRecord {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  createdAt?: string; // ISO; used to flag new arrivals
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  // Custom metafields
  artist: string | null;
  album: string | null;
  label: string | null;
  releaseYear: string | null;
  genre: string | null;
  condition: string | null; // primary (media) condition code, for cards
  // Extended detail (mostly from the kolektt hub; optional — absent on mock data)
  mediaCondition?: string | null;
  sleeveCondition?: string | null;
  catalogNumber?: string | null;
  country?: string | null;
  speed?: string | null;
  edition?: string | null;
  discCount?: string | null;
  tracklist?: Track[];
}

export interface ShopifyConnection<T> {
  edges: { node: T }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

/**
 * Notice — backed by a Shopify Blog Article under blog handle "notices".
 */
export interface Notice {
  id: string;
  handle: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  publishedAt: string; // ISO date
  image: ShopifyImage | null;
}

/**
 * FAQ entry — backed by a Shopify Metaobject of type "faq".
 * Fields expected in admin:
 *   - question (single_line_text)
 *   - answer (multi_line_text or rich_text)
 *   - category (single_line_text)
 *   - sort_order (integer, optional)
 */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}
