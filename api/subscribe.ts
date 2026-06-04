import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Email capture → Shopify customers (marketing-subscribed). Used for the drop
 * newsletter and per-product restock alerts. Subscribers land in Shopify with
 * email marketing consent so the shop can email them (Shopify Email); restock
 * interest is recorded as a tag (restock-<handle>) for segmentation.
 *
 * Requires env SHOPIFY_ADMIN_TOKEN (custom app, scopes write_customers +
 * read_customers) plus the existing VITE_SHOPIFY_STORE_DOMAIN / API version.
 */

const DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const ADMIN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.VITE_SHOPIFY_API_VERSION || '2024-10';

async function admin(query: string, variables: Record<string, unknown>) {
  const r = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': ADMIN as string },
    body: JSON.stringify({ query, variables }),
  });
  return r.json() as Promise<any>;
}

const CONSENT = { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, string>;
  const email = (body.email ?? '').trim().toLowerCase();
  const honeypot = (body.honeypot ?? '').trim();
  if (honeypot) return res.status(200).json({ ok: true }); // bot
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!DOMAIN || !ADMIN) return res.status(500).json({ error: 'Server not configured' });

  const source = (body.source ?? 'newsletter').trim();
  const handle = (body.productHandle ?? '').trim().slice(0, 80);
  const tags = ['web-signup', source === 'restock' ? 'restock' : 'newsletter'];
  if (source === 'restock' && handle) tags.push(`restock-${handle}`.slice(0, 120));

  try {
    const created = await admin(
      `mutation Create($input: CustomerInput!) { customerCreate(input: $input) { customer { id } userErrors { field message } } }`,
      { input: { email, emailMarketingConsent: CONSENT, tags } },
    );
    if (created?.data?.customerCreate?.customer?.id) {
      return res.status(200).json({ ok: true });
    }
    const errs: Array<{ message?: string }> = created?.data?.customerCreate?.userErrors ?? [];
    const taken = errs.some((e) => /taken|already|exist/i.test(e.message ?? ''));
    if (!taken) {
      console.error('[subscribe] create failed', JSON.stringify(errs), JSON.stringify(created?.errors));
      return res.status(502).json({ error: 'Subscribe failed' });
    }

    // Existing customer → ensure consent + tags.
    const found = await admin(
      `query Find($q: String!) { customers(first: 1, query: $q) { edges { node { id } } } }`,
      { q: `email:${email}` },
    );
    const id: string | undefined = found?.data?.customers?.edges?.[0]?.node?.id;
    if (!id) return res.status(200).json({ ok: true });

    await admin(
      `mutation Tag($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`,
      { id, tags },
    );
    await admin(
      `mutation Consent($input: CustomerEmailMarketingConsentUpdateInput!) { customerEmailMarketingConsentUpdate(input: $input) { userErrors { field message } } }`,
      { input: { customerId: id, emailMarketingConsent: CONSENT } },
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[subscribe] error', e);
    return res.status(502).json({ error: 'Subscribe failed' });
  }
}
