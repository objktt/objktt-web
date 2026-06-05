import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Authoritative order confirmation after a PortOne payment.
 *
 * Full flow (implemented once the secrets below are configured):
 *  1. PortOne getPayment(paymentId) → require status PAID (+ LIVE channel
 *     unless ALLOW_TEST_PAYMENTS).
 *  2. Recompute the authoritative total from Shopify variant prices + shipping
 *     (src/lib/shipping.ts rule) and verify payment.amount.total matches;
 *     refund + reject on mismatch.
 *  3. Idempotency: skip if an order tagged `portone-<paymentId>` already exists.
 *  4. Re-check stock (1-of-1!) → refund + {reason:'sold_out'} if gone.
 *  5. Shopify Admin orderCreate (financialStatus PAID, decrement inventory),
 *     tag `portone-<paymentId>`.
 *
 * Required env (server only): V2_API_SECRET (PortOne), SHOPIFY_ADMIN_TOKEN
 * (write_orders + read_products + inventory). Inert (503) until configured.
 */

const V2_API_SECRET = process.env.V2_API_SECRET;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!V2_API_SECRET || !SHOPIFY_ADMIN_TOKEN) {
    // Not yet wired: PortOne API secret and/or Shopify Admin token missing.
    return res.status(503).json({
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
      reason: 'not_configured',
    });
  }

  // TODO(next): implement the full verify → recompute → idempotency → stock →
  // orderCreate flow once secrets are present and testable.
  return res.status(503).json({ error: 'Checkout backend pending configuration', reason: 'not_configured' });
}
