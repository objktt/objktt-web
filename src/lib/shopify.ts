/**
 * Shopify Storefront API client
 *
 * Lightweight fetch-based GraphQL client. No external deps.
 * Requires env vars in .env.local:
 *   - VITE_SHOPIFY_STORE_DOMAIN (e.g. objktt.myshopify.com)
 *   - VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN
 *   - VITE_SHOPIFY_API_VERSION (e.g. 2024-10)
 */

const STORE_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || '2024-10';

export const isShopifyConfigured = Boolean(STORE_DOMAIN && ACCESS_TOKEN);

const STOREFRONT_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`
  : '';

export class ShopifyError extends Error {
  details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ShopifyError';
    this.details = details;
  }
}

export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  if (!isShopifyConfigured) {
    throw new ShopifyError(
      'Shopify is not configured. Set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN in .env.local'
    );
  }

  const res = await fetch(STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': ACCESS_TOKEN,
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new ShopifyError(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string; path?: string[] }[] };

  if (json.errors && json.errors.length > 0) {
    // Log full details to console for debugging
    console.error('[Shopify] GraphQL errors:', json.errors);
    const summary = json.errors
      .map((e) => `${e.path?.join('.') ?? ''}: ${e.message}`)
      .join('; ');
    throw new ShopifyError(`GraphQL errors — ${summary}`, json.errors);
  }

  if (!json.data) {
    throw new ShopifyError('No data returned');
  }

  return json.data;
}
