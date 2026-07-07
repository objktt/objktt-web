import crypto from 'node:crypto';
import { creditPoints, debitPoints, EARN_RATE } from './points.js';

/**
 * Shopify Admin 웹훅 처리 — 적립금 적립/회수. 서버리스 함수 수(Hobby 12개) 제한
 * 때문에 별도 엔드포인트 대신 /api/portone/webhook이 헤더로 분기해 이 핸들러를
 * 호출한다. Shopify 웹훅은 그 URL로 등록한다.
 *
 *  - orders/fulfilled : 배송(출고) 시 상품 소계의 3%를 구매 고객에게 적립.
 *  - refunds/create   : 환불 시 적립분을 비례 회수.
 *
 * 신뢰 모델: 웹훅 페이로드는 주문 id만 신뢰하고, 금액·고객·상태는 모두 Admin
 * API로 다시 조회한 권위 데이터를 쓴다. 따라서 위조 요청은 "실제로 출고된 주문을
 * 정상 적립"시키는 것 외에 아무 이득이 없다(멱등성으로 중복도 방지). 그 덕에 별도
 * 서명 비밀키 없이도 안전하다. SHOPIFY_WEBHOOK_SECRET가 설정돼 있으면 HMAC도
 * 추가로 검증한다(심층 방어).
 * 멱등성: 주문 메타필드 kolektt.points_state(json)에 {earned, clawedBack} 기록.
 */

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const ADMIN_DOMAIN =
  process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

/** Is this request a Shopify webhook (vs PortOne)? */
export function isShopifyWebhook(headers: Record<string, any>): boolean {
  return Boolean(headers['x-shopify-hmac-sha256'] || headers['x-shopify-topic']);
}

function verifyHmac(raw: Buffer, header: string | undefined): boolean {
  if (!SHOPIFY_WEBHOOK_SECRET || !header) return false;
  const digest = crypto.createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(raw).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(header));
  } catch {
    return false;
  }
}

async function adminGraphql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${ADMIN_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Shopify Admin API error: ${JSON.stringify(j.errors || j)}`);
  return j.data as T;
}

interface PointsState {
  earned: number;
  clawedBack: number;
  customerId?: string;
  at: string;
}

interface AuthoritativeOrder {
  name: string;
  fulfillmentStatus: string;
  subtotal: number; // 원래 상품 소계
  refundedSubtotal: number; // 환불된 상품 소계 누계
  customerId: string | null;
  state: PointsState | null;
}

/** Admin API에서 주문의 권위 데이터를 조회. */
async function fetchOrder(orderGid: string): Promise<AuthoritativeOrder | null> {
  const data = await adminGraphql<{ order: any | null }>(
    `query OrderAuth($id: ID!) {
      order(id: $id) {
        name
        displayFulfillmentStatus
        subtotalPriceSet { shopMoney { amount } }
        customer { id }
        pointsState: metafield(namespace: "kolektt", key: "points_state") { value }
        refunds {
          refundLineItems(first: 100) { edges { node { subtotalSet { shopMoney { amount } } } } }
        }
      }
    }`,
    { id: orderGid }
  );
  const o = data.order;
  if (!o) return null;
  const refundedSubtotal = (o.refunds || []).reduce(
    (s: number, rf: any) =>
      s +
      (rf.refundLineItems?.edges || []).reduce(
        (t: number, e: any) => t + Number(e.node?.subtotalSet?.shopMoney?.amount ?? 0),
        0
      ),
    0
  );
  let state: PointsState | null = null;
  if (o.pointsState?.value) {
    try {
      state = JSON.parse(o.pointsState.value);
    } catch {
      state = null;
    }
  }
  return {
    name: o.name,
    fulfillmentStatus: String(o.displayFulfillmentStatus || ''),
    subtotal: Math.round(Number(o.subtotalPriceSet?.shopMoney?.amount ?? 0)),
    refundedSubtotal: Math.round(refundedSubtotal),
    customerId: o.customer?.id ?? null,
    state,
  };
}

async function writePointsState(orderGid: string, state: PointsState): Promise<void> {
  await adminGraphql(
    `mutation SetOrderPoints($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
    }`,
    {
      metafields: [
        { ownerId: orderGid, namespace: 'kolektt', key: 'points_state', type: 'json', value: JSON.stringify(state) },
      ],
    }
  );
}

const orderGidOf = (payload: any): string =>
  payload?.admin_graphql_api_id || `gid://shopify/Order/${payload?.id}`;

/** 배송(출고) 시 적립 — 권위 데이터 기준. */
async function handleFulfilled(payload: any): Promise<void> {
  const orderGid = orderGidOf(payload);
  const o = await fetchOrder(orderGid);
  if (!o) return;
  if (o.state?.earned) return; // 이미 적립됨 — 멱등.
  // 실제로 출고/배송된 주문만 적립(위조 방지). FULFILLED 또는 부분출고 포함.
  if (!/FULFILLED|PARTIALLY/i.test(o.fulfillmentStatus)) return;

  const amount = Math.floor(o.subtotal * EARN_RATE);
  if (amount <= 0 || !o.customerId) {
    await writePointsState(orderGid, { earned: 0, clawedBack: 0, customerId: o.customerId ?? undefined, at: new Date().toISOString() });
    if (!o.customerId) console.warn(`[shopify-webhook] no customer on order ${o.name}; skip earn`);
    return;
  }
  await creditPoints(o.customerId, amount, {
    type: 'earn',
    reason: `구매 적립 (주문 ${o.name})`,
    orderId: orderGid,
  });
  await writePointsState(orderGid, { earned: amount, clawedBack: 0, customerId: o.customerId, at: new Date().toISOString() });
  console.log(`[shopify-webhook] earned ${amount}P for ${o.customerId} on order ${o.name}`);
}

/** 환불 시 적립분 비례 회수 — 권위 데이터(주문의 환불 누계) 기준. */
async function handleRefund(payload: any): Promise<void> {
  const orderId = payload?.order_id;
  if (!orderId) return;
  const orderGid = `gid://shopify/Order/${orderId}`;
  const o = await fetchOrder(orderGid);
  if (!o || !o.state || !o.state.earned) return;
  const cid = o.state.customerId || o.customerId;
  if (!cid) return;

  // 환불된 소계에 비례한 회수 목표 - 이미 회수한 만큼 차감.
  const clawTarget = Math.floor(o.refundedSubtotal * EARN_RATE);
  const alreadyClawed = o.state.clawedBack || 0;
  const claw = Math.min(clawTarget - alreadyClawed, o.state.earned - alreadyClawed);
  if (claw <= 0) return;

  await debitPoints(cid, claw, { type: 'clawback', reason: `환불 적립 회수 (주문 ${o.name})`, orderId: orderGid });
  await writePointsState(orderGid, { ...o.state, customerId: cid, clawedBack: alreadyClawed + claw, at: new Date().toISOString() });
  console.log(`[shopify-webhook] clawed back ${claw}P from ${cid} on order ${o.name}`);
}

export type ShopifyWebhookResult = { status: number; body: object };

/** Verify (optional) + route a Shopify webhook. Always returns a quick ack. */
export async function handleShopifyWebhook(
  raw: Buffer,
  headers: Record<string, any>
): Promise<ShopifyWebhookResult> {
  if (!SHOPIFY_ADMIN_TOKEN) {
    return { status: 200, body: { ok: true, note: 'shopify webhook received (pending configuration)' } };
  }
  // 비밀키가 설정돼 있으면 HMAC도 검증(심층 방어). 없으면 권위 조회만으로 안전.
  if (SHOPIFY_WEBHOOK_SECRET && !verifyHmac(raw, headers['x-shopify-hmac-sha256'] as string)) {
    console.error('[shopify-webhook] HMAC verification failed');
    return { status: 401, body: { ok: false, error: 'invalid signature' } };
  }
  let payload: any;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return { status: 200, body: { ok: true, note: 'unparseable body' } };
  }
  const topic = String(headers['x-shopify-topic'] || '');
  try {
    if (topic === 'orders/fulfilled') await handleFulfilled(payload);
    else if (topic === 'refunds/create') await handleRefund(payload);
  } catch (e) {
    console.error(`[shopify-webhook] ${topic} handling failed:`, e);
  }
  return { status: 200, body: { ok: true } };
}
