import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Dynamic sitemap. Static pages + every published product (and notice article)
 * pulled live from Shopify, so products added via the hub appear without a
 * redeploy. Edge-cached. Served at /sitemap.xml via a vercel.json rewrite.
 */

const SITE = 'https://objktt.kr';
const DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const VERSION = process.env.VITE_SHOPIFY_API_VERSION || '2024-10';
const NOTICES_BLOG = process.env.VITE_SHOPIFY_NOTICES_BLOG_HANDLE || 'notices';

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/events', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/music', changefreq: 'monthly', priority: '0.7' },
  { path: '/menu', changefreq: 'monthly', priority: '0.7' },
  { path: '/notices', changefreq: 'weekly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

const QUERY = /* GraphQL */ `
  query Sitemap($bh: String!) {
    products(first: 250) {
      edges { node { handle updatedAt } }
    }
    blog(handle: $bh) {
      articles(first: 100, sortKey: PUBLISHED_AT, reverse: true) {
        edges { node { handle publishedAt } }
      }
    }
  }
`;

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function urlEntry(path: string, opts: { lastmod?: string; changefreq?: string; priority?: string } = {}) {
  const parts = [`    <loc>${xmlEscape(SITE + path)}</loc>`];
  if (opts.lastmod) parts.push(`    <lastmod>${opts.lastmod.slice(0, 10)}</lastmod>`);
  if (opts.changefreq) parts.push(`    <changefreq>${opts.changefreq}</changefreq>`);
  if (opts.priority) parts.push(`    <priority>${opts.priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const urls: string[] = STATIC_PAGES.map((p) =>
    urlEntry(p.path, { changefreq: p.changefreq, priority: p.priority }),
  );

  if (DOMAIN && TOKEN) {
    try {
      const r = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': TOKEN,
        },
        body: JSON.stringify({ query: QUERY, variables: { bh: NOTICES_BLOG } }),
      });
      const j = await r.json();
      const products = j?.data?.products?.edges ?? [];
      for (const e of products) {
        if (e?.node?.handle) {
          urls.push(
            urlEntry(`/shop/${e.node.handle}`, {
              lastmod: e.node.updatedAt,
              changefreq: 'weekly',
              priority: '0.8',
            }),
          );
        }
      }
      const articles = j?.data?.blog?.articles?.edges ?? [];
      for (const e of articles) {
        if (e?.node?.handle) {
          urls.push(
            urlEntry(`/notices/${e.node.handle}`, {
              lastmod: e.node.publishedAt,
              changefreq: 'monthly',
              priority: '0.5',
            }),
          );
        }
      }
    } catch {
      // Fall back to static pages only.
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('\n') +
    `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
