import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * PortOne V2 webhook receiver — the authoritative confirmation path (survives
 * the browser leaving after payment). Registered in the PortOne console at
 * https://objktt.kr/api/portone/webhook.
 *
 * Full handling (once V2_WEBHOOK_SECRET + the order-creation logic are wired):
 *   1. Webhook.verify(V2_WEBHOOK_SECRET, rawBody, headers) — reject bad sigs.
 *   2. On a Paid event, run the same verify → recompute → idempotent
 *      Shopify orderCreate flow as /api/checkout/complete.
 * Returns 200 quickly so PortOne marks delivery successful.
 */

const V2_WEBHOOK_SECRET = process.env.V2_WEBHOOK_SECRET;

// Vercel parses JSON bodies by default; we need the raw text for signature
// verification, so disable the body parser for this function.
export const config = { api: { bodyParser: false } };

async function readRaw(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read the raw body (used for signature verification once configured).
  await readRaw(req).catch(() => '');

  if (!V2_WEBHOOK_SECRET) {
    // Not yet configured — acknowledge so PortOne registration/health passes.
    return res.status(200).json({ ok: true, note: 'webhook received (pending configuration)' });
  }

  // TODO(next): Webhook.verify + order-creation (mirrors /api/checkout/complete).
  return res.status(200).json({ ok: true });
}
