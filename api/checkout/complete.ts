import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processPaidPayment, isConfigured } from '../_lib/order.js';

/**
 * Browser-return confirmation after a PortOne payment. The authoritative logic
 * lives in ../_lib/order.ts and is shared with the PortOne webhook, so whichever
 * arrives first creates the order and the other is a no-op (idempotent by the
 * `portone-<paymentId>` order tag).
 *
 * The client sends only { paymentId, customer, shipping }; we DO NOT trust it
 * for amounts or line items — those come from the verified PortOne payment.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
      reason: 'not_configured',
    });
  }

  const body = (req.body || {}) as { paymentId?: string };
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
  if (!paymentId) {
    return res.status(400).json({ error: '결제 정보가 없습니다.', reason: 'missing_payment_id' });
  }

  const result = await processPaidPayment(paymentId);
  if (result.ok) {
    return res.status(200).json({ ok: true, orderId: result.orderId, orderName: result.orderName });
  }
  const error = 'error' in result ? result.error : '주문 처리 중 문제가 발생했습니다.';
  const reason = 'reason' in result ? result.reason : 'error';
  return res.status(result.status).json({ ok: false, error, reason });
}
