import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Server-rendered <head> for product pages so crawlers / Naver / social OG
 * (which don't run JS) see per-product title, description, OG and Product
 * JSON-LD. Humans get the same SPA shell — only the <head> is customized —
 * so the React app boots and behaves normally. Edge-cached for speed; data is
 * fetched live from Shopify so newly-added products are covered without a
 * redeploy. Mirrors the client-side logic in src/lib/seo.ts + getProducts.ts.
 */

const DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const VERSION = process.env.VITE_SHOPIFY_API_VERSION || '2024-10';

const PRODUCT_QUERY = /* GraphQL */ `
  query Og($handle: String!) {
    product(handle: $handle) {
      handle
      title
      description
      productType
      featuredImage { url }
      images(first: 10) { edges { node { url } } }
      variants(first: 1) { edges { node { availableForSale price { amount currencyCode } } } }
      artist: metafield(namespace: "record", key: "artist") { value }
      album: metafield(namespace: "record", key: "album") { value }
      label: metafield(namespace: "record", key: "label") { value }
      releaseYear: metafield(namespace: "record", key: "release_year") { value }
      genre: metafield(namespace: "record", key: "genre") { value }
      kArtist: metafield(namespace: "kolektt", key: "artist") { value }
      kLabel: metafield(namespace: "kolektt", key: "label") { value }
      kReleaseYear: metafield(namespace: "kolektt", key: "release_year") { value }
      kGenre: metafield(namespace: "kolektt", key: "genre") { value }
      kSalesChannel: metafield(namespace: "kolektt", key: "sales_channel") { value }
    }
  }
`;

const mv = (m: { value: string } | null | undefined) => (m && m.value ? m.value : null);
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const albumFromTitle = (t: string) => {
  const i = t.indexOf(' - ');
  return i === -1 ? t : t.slice(i + 3).trim();
};
const artistFromTitle = (t: string) => {
  const i = t.indexOf(' - ');
  return i === -1 ? '' : t.slice(0, i).trim();
};
const cleanDesc = (d: string | null) => {
  if (!d) return '';
  const i = d.search(/\s*Information\s+Label\b/i);
  return (i === -1 ? d : d.slice(0, i)).trim();
};

function upsertMetaProp(html: string, property: string, value: string): string {
  const re = new RegExp(`(<meta\\s+property="${property}"\\s+content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
  return html.replace('</head>', `<meta property="${property}" content="${esc(value)}" />\n</head>`);
}
function upsertMetaName(html: string, name: string, value: string): string {
  const re = new RegExp(`(<meta\\s+name="${name}"\\s+content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
  return html.replace('</head>', `<meta name="${name}" content="${esc(value)}" />\n</head>`);
}

// ── Live Google reviews (piggybacked here to stay under the 12-function limit).
// GET /api/og?reviews=1 → { rating, count, reviews[] } from Google Places API
// (New). Edge-cached 6h. Falls back to 502 so the client keeps its bundled data.
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.GOOGLE_PLACE_ID || 'ChIJxRrsfeijfDURA1zLswmN4ug';

async function handleReviews(res: VercelResponse) {
  if (!PLACES_KEY) return res.status(503).json({ error: 'not_configured' });
  try {
    const r = await fetch(
      `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=en`,
      {
        headers: {
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
        },
      }
    );
    const data: any = await r.json();
    if (!r.ok) {
      console.error('[reviews] places error:', JSON.stringify(data?.error || data));
      return res.status(502).json({ error: 'places_failed' });
    }
    const reviews = (data.reviews || []).map((rv: any) => ({
      author: rv.authorAttribution?.displayName ?? 'Google user',
      photo: rv.authorAttribution?.photoUri ?? null,
      rating: rv.rating ?? 5,
      text: rv.originalText?.text ?? rv.text?.text ?? '',
      time: rv.relativePublishTimeDescription ?? '',
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      rating: data.rating ?? null,
      count: data.userRatingCount ?? null,
      reviews,
    });
  } catch (e) {
    console.error('[reviews] fetch failed:', e);
    return res.status(502).json({ error: 'fetch_failed' });
  }
}

// ── Edge-cached shop product list (piggybacked here to stay under 12 functions).
// GET /api/og?shop=records → { nodes: [...] } of light product fields, paged
// server-side from Shopify and edge-cached so visitors hit Vercel's CDN instead
// of Shopify directly. The client maps nodes → VinylRecord (toVinylRecord).
const SHOP_LIST_QUERY = /* GraphQL */ `
  query ShopList($handle: String!, $after: String) {
    collection(handle: $handle) {
      products(first: 250, after: $after) {
        edges { node {
          id handle title vendor productType tags createdAt
          featuredImage { id url altText width height }
          variants(first: 1) { edges { node {
            id title availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
          } } }
          artist: metafield(namespace: "record", key: "artist") { value }
          album: metafield(namespace: "record", key: "album") { value }
          label: metafield(namespace: "record", key: "label") { value }
          releaseYear: metafield(namespace: "record", key: "release_year") { value }
          genre: metafield(namespace: "record", key: "genre") { value }
          kArtist: metafield(namespace: "kolektt", key: "artist") { value }
          kLabel: metafield(namespace: "kolektt", key: "label") { value }
          kReleaseYear: metafield(namespace: "kolektt", key: "release_year") { value }
          kGenre: metafield(namespace: "kolektt", key: "genre") { value }
          kCondition: metafield(namespace: "kolektt", key: "media_condition") { value }
          kSleeve: metafield(namespace: "kolektt", key: "sleeve_condition") { value }
          kCountry: metafield(namespace: "kolektt", key: "country") { value }
          kSalesChannel: metafield(namespace: "kolektt", key: "sales_channel") { value }
          kFeatured: metafield(namespace: "kolektt", key: "featured") { value }
        } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

async function handleShopList(category: string, res: VercelResponse) {
  if (!DOMAIN || !TOKEN) return res.status(503).json({ error: 'not_configured' });
  const handle = category === 'goods' ? 'goods' : 'records';
  try {
    const nodes: any[] = [];
    let after: string | null = null;
    do {
      const r = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN },
        body: JSON.stringify({ query: SHOP_LIST_QUERY, variables: { handle, after } }),
      });
      const j: any = await r.json();
      const products = j?.data?.collection?.products;
      if (!products) break;
      for (const e of products.edges) nodes.push(e.node);
      after = products.pageInfo?.hasNextPage ? products.pageInfo.endCursor : null;
    } while (after);

    // Edge-cache 1 min, serve stale up to 3 min while revalidating. Kept short
    // so (a) hub image swaps heal quickly and (b) 1-of-1 판매 직후 sold-out
    // 배지가 그리드/피처에 수 분 내 반영된다 (재고 자체는 결제 시 서버가
    // 라이브로 재확인하므로 오버셀 위험은 없음 — 표시 신선도 문제만).
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=180');
    return res.status(200).json({ nodes });
  } catch (e) {
    console.error('[shop] list fetch failed:', e);
    return res.status(502).json({ error: 'fetch_failed' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.reviews) return handleReviews(res);
  if (req.query.shop) return handleShopList(String(req.query.shop), res);

  const handle = String((req.query.handle as string) || '').trim();
  const host = req.headers.host || 'objktt.kr';

  // Fetch the built SPA shell to serve (with a corrected head) to everyone.
  let shell = '';
  try {
    shell = await fetch(`https://${host}/index.html`).then((r) => r.text());
  } catch {
    res.setHeader('Location', '/index.html');
    return res.status(302).end();
  }

  const sendShell = () => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).send(shell);
  };

  if (!handle || !DOMAIN || !TOKEN) return sendShell();

  let p: any = null;
  try {
    const r = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: PRODUCT_QUERY, variables: { handle } }),
    });
    const j = await r.json();
    p = j?.data?.product ?? null;
  } catch {
    return sendShell();
  }
  if (!p) return sendShell();

  const album = mv(p.album) || albumFromTitle(p.title);
  const artist = mv(p.artist) || mv(p.kArtist) || artistFromTitle(p.title) || '';
  const fmt = p.productType || 'LP';
  const year = mv(p.releaseYear) || mv(p.kReleaseYear) || '';
  const head = [artist, album].filter(Boolean).join(' – ');
  const title = `${head} (${fmt}${year ? `, ${year}` : ''}) | OBJKTT`;
  const label = mv(p.label) || mv(p.kLabel) || '';
  const genre = mv(p.genre) || mv(p.kGenre) || '';
  const description = (
    cleanDesc(p.description) || [artist, album, label, genre, year].filter(Boolean).join(' · ')
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const image: string =
    p.featuredImage?.url || p.images?.edges?.[0]?.node?.url || '';
  const url = `https://objktt.kr/shop/${p.handle}`;
  const variant = p.variants?.edges?.[0]?.node;
  const offline = mv(p.kSalesChannel) === 'offline';
  const available = variant ? variant.availableForSale : false;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: album,
    itemCondition: 'https://schema.org/UsedCondition',
  };
  if (artist) jsonLd.brand = { '@type': 'Brand', name: artist };
  const imgs = (p.images?.edges ?? []).map((e: any) => e.node.url).slice(0, 10);
  if (imgs.length) jsonLd.image = imgs;
  if (description) jsonLd.description = description;
  if (genre) jsonLd.category = genre;
  if (variant) {
    jsonLd.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: variant.price.currencyCode || 'KRW',
      price: String(Math.round(Number(variant.price.amount)) || 0),
      availability: offline
        ? 'https://schema.org/InStoreOnly'
        : available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: { '@type': 'Organization', name: 'OBJKTT' },
    };
  }

  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = upsertMetaName(html, 'title', title);
  html = upsertMetaName(html, 'description', description);
  html = upsertMetaProp(html, 'og:type', 'product');
  html = upsertMetaProp(html, 'og:title', title);
  html = upsertMetaProp(html, 'og:description', description);
  html = upsertMetaProp(html, 'og:url', url);
  if (image) html = upsertMetaProp(html, 'og:image', image);
  html = upsertMetaProp(html, 'twitter:title', title);
  html = upsertMetaProp(html, 'twitter:description', description);
  html = upsertMetaProp(html, 'twitter:url', url);
  if (image) html = upsertMetaProp(html, 'twitter:image', image);
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${esc(url)}$2`,
  );
  const ld = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${ld}</script>\n</head>`,
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
