import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processPaidPayment, isConfigured } from '../_lib/order.js';
import { processTossPayment, isTossCheckoutConfigured, type TossCheckoutPayload } from '../_lib/tossOrder.js';

/**
 * Browser-return confirmation for BOTH payment providers (merged into one
 * function — Vercel Hobby caps the project at 12 serverless functions):
 *
 *  - PortOne: { paymentId } — payment already captured; server verifies via
 *    PortOne API and creates the order (authoritative logic in _lib/order.ts,
 *    shared with the PortOne webhook; idempotent by `portone-<paymentId>` tag).
 *  - Toss:    { paymentKey, orderId, payload } — server recomputes the
 *    authoritative amount and CONFIRMS (captures) the payment itself, then
 *    creates the order (_lib/tossOrder.ts; idempotent by `toss-<orderId>` tag).
 *
 * In both cases we DO NOT trust the client for amounts or line items.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as {
    paymentId?: string;
    paymentKey?: string;
    orderId?: string;
    payload?: TossCheckoutPayload;
  };

  const notConfigured = () =>
    res.status(503).json({
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
      reason: 'not_configured',
    });

  // Toss branch: paymentKey + orderId (successUrl redirect params).
  if (typeof body.paymentKey === 'string' && body.paymentKey && typeof body.orderId === 'string' && body.orderId) {
    if (!isTossCheckoutConfigured()) return notConfigured();
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const result = await processTossPayment(body.paymentKey, body.orderId, payload);
    if (result.ok) {
      return res.status(200).json({ ok: true, orderId: result.orderId, orderName: result.orderName });
    }
    const error = 'error' in result ? result.error : '주문 처리 중 문제가 발생했습니다.';
    const reason = 'reason' in result ? result.reason : 'error';
    return res.status(result.status).json({ ok: false, error, reason });
  }

  // PortOne branch: paymentId.
  if (!isConfigured()) return notConfigured();

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
