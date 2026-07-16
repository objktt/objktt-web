import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processTossPayment, isTossCheckoutConfigured, type TossCheckoutPayload } from '../_lib/tossOrder.js';

/**
 * 토스 결제창 successUrl 리턴 후 브라우저가 호출하는 승인 엔드포인트.
 * { paymentKey, orderId, payload } 를 받아 서버가 금액을 재계산해 confirm 하고
 * Shopify 주문을 생성한다. payload(장바구니/배송지/적립금 토큰)는 클라이언트
 * 세션스토리지 경유라 신뢰하지 않는다 — 자세한 보안 모델은 _lib/tossOrder.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isTossCheckoutConfigured()) {
    return res.status(503).json({
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
      reason: 'not_configured',
    });
  }

  const body = (req.body || {}) as { paymentKey?: string; orderId?: string; payload?: TossCheckoutPayload };
  const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey : '';
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

  if (!paymentKey || !orderId) {
    return res.status(400).json({ error: '결제 정보가 없습니다.', reason: 'missing_payment' });
  }

  const result = await processTossPayment(paymentKey, orderId, payload);
  if (result.ok) {
    return res.status(200).json({ ok: true, orderId: result.orderId, orderName: result.orderName });
  }
  const error = 'error' in result ? result.error : '주문 처리 중 문제가 발생했습니다.';
  const reason = 'reason' in result ? result.reason : 'error';
  return res.status(result.status).json({ ok: false, error, reason });
}
