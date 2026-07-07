import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, parseCookies, SESSION_COOKIE } from '../_lib/session.js';
import { createAddress, updateAddress, deleteAddress, setDefault, getCustomerById } from '../_lib/customer.js';
import { getBalance, creditSignupBonusOnce, signRedemption, MIN_USE_KRW, readLedger, computeBalance } from '../_lib/points.js';

/**
 * Save the logged-in customer's default shipping address. Identifies the
 * customer two ways and writes via the Admin API either way:
 *  - social login → our session cookie carries the Shopify customer GID
 *  - email/password → client sends its Storefront customer access token, which
 *    we exchange for the customer GID (proves ownership)
 */

const DOMAIN = process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';
const SF_TOKEN = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

async function customerIdFromStorefrontToken(token: string): Promise<string | null> {
  if (!SF_TOKEN) return null;
  try {
    const r = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Storefront-Access-Token': SF_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query CustomerId($t: String!) { customer(customerAccessToken: $t) { id } }`,
        variables: { t: token },
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    return j?.data?.customer?.id || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let customerId: string | null = null;
  const session = verifyToken(parseCookies(req)[SESSION_COOKIE]);
  if (session) customerId = session.sub;
  else {
    const sfToken = (req.headers['x-storefront-token'] as string) || '';
    if (sfToken) customerId = await customerIdFromStorefrontToken(sfToken);
  }
  if (!customerId) return res.status(401).json({ error: '로그인이 필요합니다.', reason: 'unauthenticated' });

  const body = (req.body || {}) as {
    action?: 'create' | 'update' | 'delete' | 'setDefault' | 'points' | 'redeem-prepare';
    addressId?: string;
    setAsDefault?: boolean;
    address?: Record<string, string>;
    points?: number;
    subtotal?: number;
  };
  const action = body.action || 'create';

  // 적립금 잔액 조회 (이메일/비번 사용자용 — 커스텀 메타필드는 Storefront로 못 읽음).
  // 최초 조회 시 가입 보너스를 멱등 적립한다.
  if (action === 'points') {
    try {
      await creditSignupBonusOnce(customerId);
      const balance = await getBalance(customerId);
      return res.status(200).json({ ok: true, balance });
    } catch (e) {
      console.error('[account points]', e);
      return res.status(200).json({ ok: true, balance: 0 });
    }
  }

  // 체크아웃 적립금 사용 준비: 잔액·정책을 검증하고 서명 토큰을 발급한다.
  // 실제 차감은 결제 확정(processPaidPayment)에서 토큰을 검증한 뒤 이뤄진다.
  if (action === 'redeem-prepare') {
    try {
      const ledger = await readLedger(customerId);
      const balance = computeBalance(ledger);
      const subtotal = Math.max(0, Math.floor(Number(body.subtotal) || 0));
      // 사용 가능 한도 = min(잔액, 상품 소계). 적립금은 상품 금액에만 적용(배송비 제외).
      const cap = subtotal > 0 ? Math.min(balance, subtotal) : balance;
      const requested = Math.floor(Number(body.points) || 0);
      if (requested <= 0) return res.status(200).json({ ok: true, points: 0, token: null, balance });
      // 적립금은 한 번 이상 구매(출고 완료)한 고객만 사용 가능. earn 원장 엔트리로 판별.
      const hasPurchased = ledger.some((e) => e.type === 'earn');
      if (!hasPurchased)
        return res.status(200).json({ ok: false, reason: 'no_purchase', error: '적립금은 한 번 이상 구매하신 후부터 사용할 수 있습니다.', balance });
      if (requested < MIN_USE_KRW)
        return res.status(200).json({ ok: false, reason: 'min_use', error: `적립금은 ${MIN_USE_KRW.toLocaleString('ko-KR')}원 이상부터 사용할 수 있습니다.`, balance });
      if (requested > cap)
        return res.status(200).json({ ok: false, reason: 'over_balance', error: '사용 가능한 적립금을 초과했습니다.', balance, max: cap });
      const token = signRedemption(customerId, requested);
      return res.status(200).json({ ok: true, points: requested, token, balance });
    } catch (e) {
      console.error('[account redeem-prepare]', e);
      return res.status(200).json({ ok: false, reason: 'error', error: '적립금 사용 준비 중 오류가 발생했습니다.' });
    }
  }
  const a = body.address || {};
  const addr = {
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phone,
    zip: a.zip,
    address1: a.address1,
    address2: a.address2,
  };

  try {
    if (action === 'create') {
      if (!a.address1 || !String(a.address1).trim()) return res.status(400).json({ error: '주소를 입력해 주세요.', reason: 'invalid' });
      await createAddress(customerId, addr, !!body.setAsDefault);
    } else if (action === 'update') {
      if (!body.addressId) return res.status(400).json({ error: '주소 정보가 없습니다.', reason: 'invalid' });
      if (!a.address1 || !String(a.address1).trim()) return res.status(400).json({ error: '주소를 입력해 주세요.', reason: 'invalid' });
      await updateAddress(customerId, body.addressId, addr, !!body.setAsDefault);
    } else if (action === 'delete') {
      if (!body.addressId) return res.status(400).json({ error: '주소 정보가 없습니다.', reason: 'invalid' });
      await deleteAddress(customerId, body.addressId);
    } else if (action === 'setDefault') {
      if (!body.addressId) return res.status(400).json({ error: '주소 정보가 없습니다.', reason: 'invalid' });
      await setDefault(customerId, body.addressId);
    } else {
      return res.status(400).json({ error: '잘못된 요청입니다.', reason: 'bad_action' });
    }
    const customer = await getCustomerById(customerId);
    return res.status(200).json({ ok: true, customer });
  } catch (e) {
    console.error('[account address]', action, e);
    return res.status(500).json({ error: '주소 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.', reason: 'save_failed' });
  }
}
