/**
 * 토스페이먼츠 코어 API 클라이언트 (직연동, API 개별 연동 키 / MID objktti75v).
 * TOSS_SECRET_KEY 는 server-only Vercel env. test_sk_* 키면 테스트 결제로
 * 취급한다 (주문 test:true + ALLOW_TEST_PAYMENTS 게이트).
 *
 * 결제창 흐름: 클라이언트 requestPayment → successUrl 리다이렉트로
 * paymentKey/orderId 수신 → 서버가 재계산한 금액으로 confirm 호출해야 실제
 * 승인이 떨어진다. confirm 전에는 돈이 잡히지 않으므로(미승인 건 자동 만료)
 * 검증 실패 시 그냥 confirm을 안 하면 된다 — 환불이 필요한 건 confirm 이후
 * 단계(주문 생성 실패 등)뿐이다.
 */

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const API_BASE = 'https://api.tosspayments.com/v1/payments';

export function isTossConfigured(): boolean {
  return Boolean(TOSS_SECRET_KEY);
}

/** 테스트 키 여부 — 주문의 test 플래그 및 ALLOW_TEST_PAYMENTS 게이트에 사용. */
export function isTossTestKey(): boolean {
  return (TOSS_SECRET_KEY || '').startsWith('test_');
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`;
}

export type TossResult =
  | { ok: true; payment: any }
  | { ok: false; code: string; message: string };

async function tossFetch(path: string, body?: Record<string, unknown>): Promise<{ status: number; json: any }> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json: any = await r.json().catch(() => ({}));
  return { status: r.status, json };
}

/**
 * 결제 승인. amount 는 서버가 재계산한 금액 — 결제창에서 승인된 금액과 다르면
 * 토스가 거절하므로 금액 위조가 원천 차단된다.
 * 이미 승인된 건(ALREADY_PROCESSED_PAYMENT)은 조회로 재검증해 성공 처리한다
 * (confirm 성공 후 주문 생성 전에 끊긴 케이스의 재시도 지원).
 */
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<TossResult> {
  let res;
  try {
    res = await tossFetch('/confirm', { paymentKey, orderId, amount });
  } catch (e) {
    console.error(`[toss] confirm request failed for ${orderId}:`, e);
    return { ok: false, code: 'NETWORK', message: '결제 승인 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  if (res.json?.status === 'DONE') return { ok: true, payment: res.json };

  if (res.json?.code === 'ALREADY_PROCESSED_PAYMENT') {
    const lookup = await getTossPaymentByOrderId(orderId);
    if (lookup.ok && lookup.payment.status === 'DONE' && Math.round(lookup.payment.totalAmount) === amount) {
      return lookup;
    }
  }

  const code = String(res.json?.code || 'CONFIRM_FAILED');
  const message = String(res.json?.message || '결제 승인에 실패했습니다.');
  console.error(`[toss] confirm failed for ${orderId}: ${code} ${message}`);
  return { ok: false, code, message };
}

export async function getTossPaymentByOrderId(orderId: string): Promise<TossResult> {
  try {
    const res = await tossFetch(`/orders/${encodeURIComponent(orderId)}`);
    if (res.status === 200 && res.json?.paymentKey) return { ok: true, payment: res.json };
    return { ok: false, code: String(res.json?.code || 'NOT_FOUND'), message: String(res.json?.message || '결제를 찾을 수 없습니다.') };
  } catch (e) {
    console.error(`[toss] lookup failed for ${orderId}:`, e);
    return { ok: false, code: 'NETWORK', message: '결제 조회에 실패했습니다.' };
  }
}

/** 승인 완료 건 전액 취소(환불). confirm 이후 단계가 실패했을 때만 사용. */
export async function cancelTossPayment(paymentKey: string, cancelReason: string): Promise<boolean> {
  try {
    const res = await tossFetch(`/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason });
    const okStatuses = ['CANCELED', 'PARTIAL_CANCELED'];
    if (okStatuses.includes(res.json?.status)) return true;
    console.error(`[toss] cancel failed for ${paymentKey}:`, JSON.stringify(res.json));
    return false;
  } catch (e) {
    console.error(`[toss] cancel threw for ${paymentKey}:`, e);
    return false;
  }
}
