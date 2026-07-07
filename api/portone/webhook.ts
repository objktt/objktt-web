import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhook } from '@portone/server-sdk';
import { processPaidPayment } from '../_lib/order.js';
import { isShopifyWebhook, handleShopifyWebhook } from '../_lib/shopifyWebhook.js';

/**
 * Webhook receiver. Hosts TWO sources behind one function (Hobby plan caps
 * serverless functions at 12):
 *  - PortOne V2 (default) — authoritative payment confirmation; registered in
 *    the PortOne console at https://objktt.kr/api/portone/webhook.
 *  - Shopify Admin — adds the 'x-shopify-*' headers; we route to the points
 *    earn/clawback handler. Register Shopify webhooks to this SAME URL.
 *
 * PortOne flow: verify signature (V2_WEBHOOK_SECRET) → paymentId → run the SAME
 * order routine as /api/checkout/complete (status re-checked PAID inside, order
 * tag makes duplicates idempotent). Always answer 200 quickly so the sender
 * stops retrying.
 */

const V2_WEBHOOK_SECRET = process.env.V2_WEBHOOK_SECRET;

// Need the raw body for signature verification, so disable Vercel's parser.
export const config = { api: { bodyParser: false } };

async function readRawBuffer(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBuf = await readRawBuffer(req).catch(() => Buffer.from(''));

  // Shopify webhooks (points earn/clawback) arrive at this same URL.
  if (isShopifyWebhook(req.headers as Record<string, any>)) {
    const r = await handleShopifyWebhook(rawBuf, req.headers as Record<string, any>);
    return res.status(r.status).json(r.body);
  }

  const raw = rawBuf.toString('utf8');

  if (!V2_WEBHOOK_SECRET) {
    return res.status(200).json({ ok: true, note: 'webhook received (pending configuration)' });
  }

  // 1) Verify authenticity.
  let payload: any;
  try {
    payload = await Webhook.verify(V2_WEBHOOK_SECRET, raw, {
      'webhook-id': req.headers['webhook-id'] as string,
      'webhook-timestamp': req.headers['webhook-timestamp'] as string,
      'webhook-signature': req.headers['webhook-signature'] as string,
    });
  } catch (e) {
    console.error('[webhook] signature verification failed:', e);
    return res.status(400).json({ ok: false, error: 'invalid signature' });
  }

  // 2) Extract the paymentId (present on Transaction.* events).
  const paymentId: string | undefined = payload?.data?.paymentId;
  if (!paymentId) {
    return res.status(200).json({ ok: true, note: 'no paymentId in event' });
  }

  // 3) Run the shared, idempotent, status-gated order routine.
  try {
    const result = await processPaidPayment(paymentId);
    if (!result.ok && 'reason' in result && result.reason !== 'not_paid') {
      const errMsg = 'error' in result ? result.error : '';
      console.error(`[webhook] processing ${paymentId} → ${result.reason}: ${errMsg}`);
    }
  } catch (e) {
    console.error(`[webhook] processing ${paymentId} threw:`, e);
  }

  // Always acknowledge so PortOne stops retrying; failures are logged above.
  return res.status(200).json({ ok: true });
}
