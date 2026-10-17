import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, parseCookies, SESSION_COOKIE } from '../_lib/session.js';
import { createAddress, updateAddress, deleteAddress, setDefault, getCustomerById } from '../_lib/customer.js';
import { getBalance, creditSignupBonusOnce, signRedemption, MIN_USE_KRW, readLedger, computeBalance, creditPoints, REVIEW_BONUS } from '../_lib/points.js';

const DOMAIN = process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';
const SF_TOKEN = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

interface ReviewEntry {
  id: string;
  customerId: string;
  displayName: string;
  rating: number;
  text: string;
  ts: string;
}

async function adminGraphql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': ADMIN_TOKEN as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data as T;
}

async function getProductReviews(productId: string): Promise<ReviewEntry[]> {
  const d = await adminGraphql<{ product: { metafield: { value: string } | null } | null }>(
    `query GetReviews($id: ID!) { product(id: $id) { metafield(namespace: "kolektt", key: "reviews") { value } } }`,
    { id: productId }
  );
  const raw = d.product?.metafield?.value;
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}

async function setProductReviews(productId: string, reviews: ReviewEntry[]): Promise<void> {
  const d = await adminGraphql<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation SetReviews($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { field message } } }`,
    { metafields: [{ ownerId: productId, namespace: 'kolektt', key: 'reviews', type: 'json', value: JSON.stringify(reviews) }] }
  );
  if (d.metafieldsSet.userErrors?.length) throw new Error(`metafieldsSet(reviews): ${JSON.stringify(d.metafieldsSet.userErrors)}`);
}

async function getCustomerDisplayName(customerId: string): Promise<string> {
  try {
    const d = await adminGraphql<{ customer: { firstName: string | null; lastName: string | null } | null }>(
      `query CName($id: ID!) { customer(id: $id) { firstName lastName } }`,
      { id: customerId }
    );
    const first = d.customer?.firstName || '';
    const last = d.customer?.lastName || '';
    if (first && last) return `${first} ${last[0]}.`;
    return first || last || '고객';
  } catch { return '고객'; }
}

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

  // Resolve auth upfront — optional for reviews-get, required for everything else.
  let customerId: string | null = null;
  const session = verifyToken(parseCookies(req)[SESSION_COOKIE]);
  if (session) customerId = session.sub;
  else {
    const sfToken = (req.headers['x-storefront-token'] as string) || '';
    if (sfToken) customerId = await customerIdFromStorefrontToken(sfToken);
  }

  const body = (req.body || {}) as {
    action?: 'create' | 'update' | 'delete' | 'setDefault' | 'points' | 'redeem-prepare' | 'reviews-get' | 'review-submit';
    addressId?: string;
    setAsDefault?: boolean;
    address?: Record<string, string>;
    points?: number;
    subtotal?: number;
    productId?: string;
    rating?: number;
    text?: string;
  };
  const action = body.action || 'create';

  // Public: fetch product reviews (auth optional — hasReviewed only when logged in)
  if (action === 'reviews-get') {
    const productId = body.productId;
    if (!productId) return res.status(400).json({ error: '상품 정보가 없습니다.', reason: 'invalid' });
    try {
      const reviews = await getProductReviews(productId);
      const hasReviewed = customerId ? reviews.some((r) => r.customerId === customerId) : false;
      const display = reviews.map(({ customerId: _cid, ...r }) => r);
      return res.status(200).json({ ok: true, reviews: display, hasReviewed });
    } catch (e) {
      console.error('[reviews-get]', e);
      return res.status(200).json({ ok: true, reviews: [], hasReviewed: false });
    }
  }

  // All remaining actions require auth.
  if (!customerId) return res.status(401).json({ error: '로그인이 필요합니다.', reason: 'unauthenticated' });

  // Submit a product review (1 per customer per product) + idempotent 300P credit.
  if (action === 'review-submit') {
    const { productId, rating, text } = body;
    if (!productId) return res.status(400).json({ error: '상품 정보가 없습니다.', reason: 'invalid' });
    const ratingNum = Math.round(Number(rating));
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: '별점을 선택해 주세요.', reason: 'invalid' });
    try {
      const reviews = await getProductReviews(productId);
      if (reviews.some((r) => r.customerId === customerId)) {
        return res.status(200).json({ ok: false, reason: 'already_reviewed', error: '이미 리뷰를 작성하셨습니다.' });
      }
      const displayName = await getCustomerDisplayName(customerId);
      const newReview: ReviewEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        customerId: customerId as string,
        displayName,
        rating: ratingNum,
        text: String(text || '').trim().slice(0, 1000),
        ts: new Date().toISOString(),
      };
      reviews.push(newReview);
      await setProductReviews(productId, reviews);
      // Idempotent 300P: skip if already credited for this productId in the ledger.
      const ledger = await readLedger(customerId as string);
      const alreadyCredited = ledger.some((e) => e.type === 'review' && e.orderId === productId);
      let newBalance: number | null = null;
      if (!alreadyCredited) {
        newBalance = await creditPoints(customerId as string, REVIEW_BONUS, { type: 'review', reason: '리뷰 작성 적립', orderId: productId });
      }
      return res.status(200).json({ ok: true, credited: !alreadyCredited, newBalance });
    } catch (e) {
      console.error('[review-submit]', e);
      return res.status(500).json({ error: '리뷰 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.', reason: 'save_failed' });
    }
  }

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
