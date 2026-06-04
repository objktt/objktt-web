import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

/**
 * Email capture → Shopify customer (email-marketing subscribed). Used for the
 * drop newsletter and per-product restock alerts.
 *
 * Two modes:
 *  - Admin (preferred): if SHOPIFY_ADMIN_TOKEN (write_customers + read_customers)
 *    is set, upsert the customer with SUBSCRIBED consent AND tags
 *    (newsletter / restock / restock-<handle>) so interest is segmentable.
 *  - Storefront (fallback): uses the existing Storefront token's
 *    `unauthenticated_write_customers` scope via customerCreate(acceptsMarketing).
 *    Works without an Admin token, but cannot set tags — restock submissions
 *    subscribe the email without per-product segmentation. Add an Admin token to
 *    unlock tagging.
 */

const DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const VERSION = process.env.VITE_SHOPIFY_API_VERSION || '2024-10';
const ADMIN = process.env.SHOPIFY_ADMIN_TOKEN;
const STOREFRONT = process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const CONSENT = { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN' };

async function gql(token: string, header: 'admin' | 'storefront', query: string, variables: Record<string, unknown>) {
  const path = header === 'admin' ? `/admin/api/${VERSION}/graphql.json` : `/api/${VERSION}/graphql.json`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers[header === 'admin' ? 'X-Shopify-Access-Token' : 'X-Shopify-Storefront-Access-Token'] = token;
  const r = await fetch(`https://${DOMAIN}${path}`, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  return r.json() as Promise<any>;
}

async function viaAdmin(email: string, tags: string[]): Promise<boolean> {
  const created = await gql(ADMIN as string, 'admin',
    `mutation Create($input: CustomerInput!){ customerCreate(input:$input){ customer{id} userErrors{message} } }`,
    { input: { email, emailMarketingConsent: CONSENT, tags } });
  if (created?.data?.customerCreate?.customer?.id) return true;
  const errs: Array<{ message?: string }> = created?.data?.customerCreate?.userErrors ?? [];
  if (!errs.some((e) => /taken|already|exist/i.test(e.message ?? ''))) {
    console.error('[subscribe] admin create', JSON.stringify(errs), JSON.stringify(created?.errors));
    return false;
  }
  const found = await gql(ADMIN as string, 'admin',
    `query Find($q:String!){ customers(first:1,query:$q){ edges{ node{ id } } } }`, { q: `email:${email}` });
  const id: string | undefined = found?.data?.customers?.edges?.[0]?.node?.id;
  if (!id) return true;
  await gql(ADMIN as string, 'admin', `mutation Tag($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{message} } }`, { id, tags });
  await gql(ADMIN as string, 'admin',
    `mutation Consent($input: CustomerEmailMarketingConsentUpdateInput!){ customerEmailMarketingConsentUpdate(input:$input){ userErrors{message} } }`,
    { input: { customerId: id, emailMarketingConsent: CONSENT } });
  return true;
}

async function viaStorefront(email: string): Promise<boolean> {
  const password = crypto.randomBytes(24).toString('base64') + 'Aa1!';
  const out = await gql(STOREFRONT as string, 'storefront',
    `mutation Create($input: CustomerCreateInput!){ customerCreate(input:$input){ customer{id} customerUserErrors{code message} } }`,
    { input: { email, password, acceptsMarketing: true } });
  if (out?.data?.customerCreate?.customer?.id) return true;
  const errs: Array<{ code?: string; message?: string }> = out?.data?.customerCreate?.customerUserErrors ?? [];
  // Already a customer → treat as subscribed/ok.
  if (errs.some((e) => e.code === 'TAKEN' || /taken|already|exist/i.test(e.message ?? ''))) return true;
  console.error('[subscribe] storefront create', JSON.stringify(errs), JSON.stringify(out?.errors));
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, string>;
  const email = (body.email ?? '').trim().toLowerCase();
  if ((body.honeypot ?? '').trim()) return res.status(200).json({ ok: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!DOMAIN) return res.status(500).json({ error: 'Server not configured' });

  const source = (body.source ?? 'newsletter').trim();
  const handle = (body.productHandle ?? '').trim().slice(0, 80);
  const tags = ['web-signup', source === 'restock' ? 'restock' : 'newsletter'];
  if (source === 'restock' && handle) tags.push(`restock-${handle}`.slice(0, 120));

  try {
    const ok = ADMIN ? await viaAdmin(email, tags) : STOREFRONT ? await viaStorefront(email) : false;
    if (!ok) return res.status(502).json({ error: 'Subscribe failed' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[subscribe] error', e);
    return res.status(502).json({ error: 'Subscribe failed' });
  }
}
