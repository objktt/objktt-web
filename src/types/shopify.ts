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
}

export interface ShopifyMetafield {
  key: string;
  value: string;
  type: string;
}

/**
 * Record-specific product shape.
 * Custom metafields under namespace `record` map to typed fields here.
 */
export interface VinylRecord {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  // Custom metafields
  artist: string | null;
  album: string | null;
  label: string | null;
  releaseYear: string | null;
  genre: string | null;
  condition: string | null;
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
