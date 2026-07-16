import { PortOneClient } from '@portone/server-sdk';
import { findOrCreateCustomer, saveOrderAddress } from './customer.js';
import { verifyRedemption, spendForOrder } from './points.js';

/**
 * Shared, authoritative "a PortOne payment succeeded → write the order to
 * Shopify" routine. Used by BOTH the browser-return path
 * (/api/checkout/complete) and the PortOne webhook (/api/portone/webhook), so
 * the order is created exactly once regardless of which arrives first.
 *
 * Security model (B안 — Shopify is the order/inventory ledger, PortOne the PG):
 *  - Never trust the browser for amounts or line items. The line items live in
 *    the PortOne payment's `customData` (set at requestPayment) and the charged
 *    amount is whatever PortOne actually recorded.
 *  - We recompute the authoritative total from live Shopify variant prices +
 *    our shipping rule and require it to equal the charged amount; on mismatch
 *    we refund and reject.
 *  - Idempotency via an order tag `portone-<paymentId>`.
 *  - Final 1-of-1 stock re-check; refund + sold_out if the record is gone.
 *
 * Required env (server only): V2_API_SECRET, SHOPIFY_ADMIN_TOKEN,
 * SHOPIFY_ADMIN_DOMAIN. Optional: SHOPIFY_ADMIN_API_VERSION, ALLOW_TEST_PAYMENTS.
 */

// Keep in sync with src/lib/shipping.ts (frontend shows the same numbers).
export const FREE_SHIPPING_THRESHOLD = 50000;
export const FLAT_SHIPPING = 3000;
export const CURRENCY = 'KRW';

const V2_API_SECRET = process.env.V2_API_SECRET;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const ADMIN_DOMAIN =
  process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';
export const ALLOW_TEST_PAYMENTS = /^(1|true|yes)$/i.test(process.env.ALLOW_TEST_PAYMENTS || '');
// Default fulfillment/stock location (gid). Overridable via env; falls back to
// the store's single "Shop location". Used to zero out stock after a sale since
// order creation runs with inventoryBehaviour BYPASS.
const INVENTORY_LOCATION_ID =
  process.env.SHOPIFY_LOCATION_ID || 'gid://shopify/Location/92372893931';

export type OrderResult =
  | { ok: true; status: number; orderName: string; orderId: string; idempotent?: boolean }
  | { ok: false; status: number; reason: string; error: string };

export function isShopifyConfigured(): boolean {
  return Boolean(SHOPIFY_ADMIN_TOKEN);
}

export function isConfigured(): boolean {
  return Boolean(V2_API_SECRET && SHOPIFY_ADMIN_TOKEN);
}

export type LineItem = { variantId: string; qty: number };

export interface VariantInfo {
  id: string;
  price: number;
  availableForSale: boolean;
  inventoryQuantity: number | null;
  inventoryPolicy: string;
  title: string;
  productStatus: string;
  inventoryItemId: string | null;
  inventoryTracked: boolean;
}

export async function adminGraphql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${ADMIN_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) {
    throw new Error(`Shopify Admin API error: ${JSON.stringify(j.errors || j)}`);
  }
  return j.data as T;
}

/**
 * After a BYPASS order, set each purchased tracked variant's available quantity
 * to 0 at the default location (records are 1-of-1 → mark sold out). Uses
 * inventorySetQuantities with the read value as compareQuantity. Best-effort.
 */
export async function decrementSoldInventory(
  lineItems: LineItem[],
  byId: Map<string, VariantInfo>
): Promise<void> {
  const quantities = lineItems
    .map((l) => byId.get(l.variantId))
    .filter((v): v is VariantInfo => Boolean(v?.inventoryTracked && v?.inventoryItemId))
    .map((v) => ({
      inventoryItemId: v.inventoryItemId as string,
      locationId: INVENTORY_LOCATION_ID,
      quantity: 0,
    }));
  if (quantities.length === 0) return;

  await adminGraphql(
    `mutation SetZero($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }`,
    {
      input: {
        name: 'available',
        reason: 'sold',
        ignoreCompareQuantity: true,
        quantities,
      },
    }
  );
}

/** Korean numbers → E.164 so Shopify won't reject the order. 01012345678 → +821012345678. */
export function normalizePhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const d = raw.replace(/\D/g, '');
  if (!d) return undefined;
  if (d.startsWith('82')) return `+${d}`;
  if (d.startsWith('0')) return `+82${d.slice(1)}`;
  return `+82${d}`;
}

function parseCustomData(raw: unknown): any {
  if (!raw) return {};
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  // New format: { d: "<base64(JSON)>" } — encoded client-side so KG이니시스
  // merchantData stays ASCII (no Korean). Decode it back to the real payload.
  if (obj && typeof obj === 'object' && typeof obj.d === 'string') {
    try {
      return JSON.parse(Buffer.from(obj.d, 'base64').toString('utf8'));
    } catch {
      return {};
    }
  }
  return obj && typeof obj === 'object' ? obj : {};
}

export async function processPaidPayment(paymentId: string): Promise<OrderResult> {
  if (!paymentId) return { ok: false, status: 400, reason: 'missing_payment_id', error: '결제 정보가 없습니다.' };
  if (!isConfigured()) {
    return {
      ok: false,
      status: 503,
      reason: 'not_configured',
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
    };
  }

  const portone = PortOneClient({ secret: V2_API_SECRET as string });

  const refund = async (reason: string) => {
    try {
      await portone.payment.cancelPayment({ paymentId, reason });
    } catch (e) {
      console.error(`[checkout] refund failed for ${paymentId}:`, e);
    }
  };

  // 1) Authoritative payment lookup.
  let payment: any;
  try {
    payment = await portone.payment.getPayment({ paymentId });
  } catch (e) {
    console.error(`[checkout] getPayment failed for ${paymentId}:`, e);
    return { ok: false, status: 502, reason: 'lookup_failed', error: '결제 조회에 실패했습니다. 고객센터로 문의해 주세요.' };
  }

  if (payment?.status !== 'PAID') {
    return { ok: false, status: 402, reason: 'not_paid', error: '결제가 완료되지 않았습니다.' };
  }

  const isTest = payment?.channel?.type !== 'LIVE';
  if (isTest && !ALLOW_TEST_PAYMENTS) {
    return { ok: false, status: 403, reason: 'test_blocked', error: '테스트 결제는 처리할 수 없습니다.' };
  }

  // 2) Idempotency — if we already created this order, return it (no refund, no dup).
  const tag = `portone-${paymentId}`;
  try {
    const existing = await adminGraphql<{ orders: { edges: { node: { id: string; name: string } }[] } }>(
      `query ExistingOrder($q: String!) { orders(first: 1, query: $q) { edges { node { id name } } } }`,
      { q: `tag:${tag}` }
    );
    const found = existing.orders.edges[0]?.node;
    if (found) {
      return { ok: true, status: 200, orderName: found.name, orderId: found.id, idempotent: true };
    }
  } catch (e) {
    console.error(`[checkout] idempotency check failed for ${paymentId}:`, e);
    // Fall through — better to attempt creation than to drop a paid order.
  }

  // 3) Resolve authoritative line items from the payment's customData.
  const cd = parseCustomData(payment.customData);
  const lineItems: LineItem[] = Array.isArray(cd.lineItems)
    ? cd.lineItems
        .map((l: any) => ({ variantId: String(l.variantId || ''), qty: Math.max(1, Number(l.qty) || 0) }))
        .filter((l: LineItem) => l.variantId && l.qty > 0)
    : [];
  const shipping = cd.shipping || {};

  if (lineItems.length === 0) {
    await refund('주문 항목을 확인할 수 없어 자동 환불합니다.');
    return { ok: false, status: 422, reason: 'no_items', error: '주문 항목을 확인할 수 없어 결제를 환불했습니다.' };
  }

  // 4) Live variant prices + stock.
  let variants: VariantInfo[];
  try {
    const data = await adminGraphql<{ nodes: any[] }>(
      `query Variants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price
            availableForSale
            inventoryQuantity
            inventoryPolicy
            title
            inventoryItem { id tracked }
            product { title status }
          }
        }
      }`,
      { ids: lineItems.map((l) => l.variantId) }
    );
    variants = (data.nodes || [])
      .filter(Boolean)
      .map((n: any) => ({
        id: n.id,
        price: Math.round(parseFloat(n.price)),
        availableForSale: Boolean(n.availableForSale),
        inventoryQuantity: typeof n.inventoryQuantity === 'number' ? n.inventoryQuantity : null,
        inventoryPolicy: String(n.inventoryPolicy || 'DENY'),
        title: n.title,
        productStatus: n.product?.status || 'ACTIVE',
        inventoryItemId: n.inventoryItem?.id || null,
        inventoryTracked: Boolean(n.inventoryItem?.tracked),
      }));
  } catch (e) {
    console.error(`[checkout] variant lookup failed for ${paymentId}:`, e);
    await refund('상품 조회 실패로 자동 환불합니다.');
    return { ok: false, status: 502, reason: 'lookup_failed', error: '상품 조회에 실패하여 결제를 환불했습니다.' };
  }

  const byId = new Map(variants.map((v) => [v.id, v]));

  // Every requested variant must resolve.
  for (const item of lineItems) {
    if (!byId.has(item.variantId)) {
      await refund('판매 종료된 상품이 포함되어 자동 환불합니다.');
      return { ok: false, status: 409, reason: 'sold_out', error: '해당 상품을 더 이상 판매하지 않아 결제를 환불했습니다.' };
    }
  }

  // 5) Recompute the authoritative total and compare to what was charged.
  let subtotal = 0;
  for (const item of lineItems) subtotal += (byId.get(item.variantId) as VariantInfo).price * item.qty;
  const shipFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;

  // 적립금 사용: 서명 토큰(prepare 단계에서 인증·잔액 검증 완료)을 검증한다.
  // 위조 방지를 위해 사용 포인트는 토큰의 값만 신뢰하고, 상품 소계로 상한을 건다
  // (적립금은 상품 금액에만 적용 — 배송비 제외).
  const redeem = verifyRedemption(typeof cd.r === 'string' ? cd.r : undefined);
  const pointsUsed = redeem ? Math.max(0, Math.min(redeem.p, subtotal)) : 0;
  const redeemCustomerId = redeem?.cid || null;

  const expectedTotal = subtotal - pointsUsed + shipFee;
  const paidTotal = Math.round(Number(payment.amount?.total ?? payment.amount?.paid ?? 0));

  if (paidTotal !== expectedTotal) {
    console.error(`[checkout] amount mismatch ${paymentId}: paid=${paidTotal} expected=${expectedTotal}`);
    await refund('결제 금액 불일치로 자동 환불합니다.');
    return { ok: false, status: 409, reason: 'amount_mismatch', error: '결제 금액이 일치하지 않아 환불했습니다.' };
  }

  // 6) Final stock re-check (records are typically 1-of-1).
  for (const item of lineItems) {
    const v = byId.get(item.variantId) as VariantInfo;
    const oversellable = v.inventoryPolicy.toUpperCase() === 'CONTINUE';
    const inStock = v.availableForSale && v.productStatus === 'ACTIVE';
    const enough = v.inventoryQuantity == null || v.inventoryQuantity >= item.qty || oversellable;
    if (!inStock || !enough) {
      await refund('재고 소진으로 자동 환불합니다.');
      return { ok: false, status: 409, reason: 'sold_out', error: '결제 중 해당 음반이 판매되어 환불했습니다.' };
    }
  }

  // 7) Create the order (decrement inventory, email the buyer).
  const phone = normalizePhone(shipping.phone || cd.phone);
  const name: string = (shipping.name || '').trim();
  const order: Record<string, unknown> = {
    email: shipping.email || cd.email || undefined,
    phone,
    currency: CURRENCY,
    financialStatus: 'PAID',
    test: isTest,
    note: `PortOne 결제 (paymentId: ${paymentId})`,
    tags: ['web-checkout', tag],
    customAttributes: [
      { key: 'PortOne paymentId', value: paymentId },
      { key: 'PG', value: 'PortOne / KG이니시스' },
      ...(pointsUsed > 0 ? [{ key: '적립금 사용', value: `${pointsUsed.toLocaleString('ko-KR')}원` }] : []),
    ],
    // 적립금 사용분을 상품 고정 할인으로 반영 → 주문 합계가 실결제액과 일치한다.
    ...(pointsUsed > 0
      ? {
          discountCode: {
            itemFixedDiscountCode: {
              code: '적립금 사용',
              amountSet: { shopMoney: { amount: String(pointsUsed), currencyCode: CURRENCY } },
            },
          },
        }
      : {}),
    lineItems: lineItems.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
    shippingAddress: {
      firstName: name || '고객',
      address1: (shipping.address1 || '').trim() || '-',
      address2: (shipping.address2 || '').trim() || undefined,
      zip: (shipping.zip || '').trim() || undefined,
      city: '서울',
      countryCode: 'KR',
      phone,
    },
    shippingLines: [
      {
        title: shipFee === 0 ? '무료배송' : '기본배송',
        priceSet: { shopMoney: { amount: String(shipFee), currencyCode: CURRENCY } },
      },
    ],
    transactions: [
      {
        kind: 'SALE',
        status: 'SUCCESS',
        gateway: 'PortOne (KG이니시스)',
        amountSet: { shopMoney: { amount: String(expectedTotal), currencyCode: CURRENCY } },
      },
    ],
  };

  try {
    const data = await adminGraphql<{
      orderCreate: { order: { id: string; name: string } | null; userErrors: { field: string[]; message: string }[] };
    }>(
      `mutation CreateOrder($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
        orderCreate(order: $order, options: $options) {
          order { id name }
          userErrors { field message }
        }
      }`,
      // inventoryBehaviour: BYPASS — do NOT let Shopify reserve/decrement
      // inventory during order creation. The store's single default location has
      // "fulfill online orders" turned off, so DECREMENT_OBEYING_POLICY fails
      // with "Unable to reserve inventory" → every paid order was refunded.
      // BYPASS creates the order regardless; we then zero out stock ourselves
      // below so 1-of-1 records still go sold out.
      { order, options: { inventoryBehaviour: 'BYPASS', sendReceipt: true } }
    );
    const errs = data.orderCreate.userErrors;
    const created = data.orderCreate.order;
    if (errs?.length || !created) {
      console.error(`[checkout] orderCreate userErrors for ${paymentId}:`, JSON.stringify(errs));
      await refund('주문 생성 실패로 자동 환불합니다.');
      // TEMP DIAGNOSTIC: surface the real error so we can see the live cause.
      return { ok: false, status: 500, reason: 'order_failed', error: `[diag userErrors] ${JSON.stringify(errs)}` };
    }

    // Since BYPASS skips auto-decrement, manually set each purchased variant's
    // available stock to 0 at the default location (records are 1-of-1, so this
    // marks them sold out). Best-effort — never fail the order on this.
    try {
      await decrementSoldInventory(lineItems, byId);
    } catch (e) {
      console.error(`[checkout] inventory zero-out failed for ${paymentId}:`, e);
    }

    // Best-effort: save the buyer's shipping address as their default address so
    // future checkouts and 마이페이지 prefill it. Never fail the order on this.
    const buyerEmail = (shipping.email || cd.email || order.email) as string | undefined;
    if (buyerEmail) {
      try {
        const cid = await findOrCreateCustomer(String(buyerEmail).toLowerCase(), name || undefined);
        await saveOrderAddress(cid, {
          firstName: name || '고객',
          phone: shipping.phone || cd.phone,
          zip: shipping.zip,
          address1: shipping.address1,
          address2: shipping.address2,
        });
      } catch (e) {
        console.error(`[checkout] save default address failed for ${paymentId}:`, e);
      }
    }

    // 적립금 사용분 차감(주문 단위 멱등). 사용 포인트는 서명 토큰의 고객에게서 뺀다.
    if (pointsUsed > 0 && redeemCustomerId) {
      try {
        await spendForOrder(redeemCustomerId, pointsUsed, created.id);
      } catch (e) {
        console.error(`[checkout] points debit failed for ${paymentId} (${redeemCustomerId}, ${pointsUsed}):`, e);
      }
    }

    return { ok: true, status: 200, orderName: created.name, orderId: created.id };
  } catch (e) {
    console.error(`[checkout] orderCreate threw for ${paymentId}:`, e);
    await refund('주문 생성 중 오류로 자동 환불합니다.');
    // TEMP DIAGNOSTIC: surface the real thrown error.
    return { ok: false, status: 500, reason: 'order_failed', error: `[diag threw] ${e instanceof Error ? e.message : String(e)}` };
  }
}
