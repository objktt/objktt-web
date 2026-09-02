import {
  adminGraphql,
  decrementSoldInventory,
  normalizePhone,
  buildShippingAddress,
  addressSummary,
  ensureShippingAddress,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
  CURRENCY,
  ALLOW_TEST_PAYMENTS,
  isShopifyConfigured,
  type LineItem,
  type VariantInfo,
  type OrderResult,
  type ShippingForm,
} from './order.js';
import { confirmTossPayment, cancelTossPayment, isTossConfigured, isTossTestKey } from './toss.js';
import { findOrCreateCustomer, saveOrderAddress } from './customer.js';
import { verifyRedemption, spendForOrder } from './points.js';

/**
 * 토스페이먼츠 직연동 "결제 승인 → Shopify 주문 생성" 루틴.
 * PortOne 경로(order.ts processPaidPayment)와 같은 보안 모델이지만 순서가 다르다:
 *
 *  PortOne: 이미 결제됨 → 검증 → 불일치·품절이면 환불
 *  Toss:    검증·재계산 먼저 → confirm(승인)으로 돈이 잡힘 → 주문 생성
 *           → confirm 전 실패는 환불 자체가 불필요(미승인 건 자동 만료),
 *             confirm 후 실패만 cancel(환불)한다.
 *
 * 클라이언트가 보내는 payload(lineItems/shipping/r)는 세션스토리지 경유라
 * 신뢰하지 않는다 — 금액은 라이브 Shopify 가격 + 배송 규칙 + 검증된 적립금
 * 토큰으로 재계산하고, 그 금액으로 confirm 하므로 결제창에서 승인된 금액과
 * 다르면 토스가 거절한다 (금액 위조 원천 차단).
 *
 * 멱등성: 주문 태그 `toss-<orderId>` + confirm의 ALREADY_PROCESSED_PAYMENT
 * 재검증 조합으로, 어느 단계에서 재시도돼도 주문은 정확히 1번 생성된다.
 */

export interface TossCheckoutPayload {
  lineItems?: unknown;
  shipping?: Record<string, string>;
  delivery?: string; // 'shipping'(기본) | 'pickup' — 매장 픽업이면 배송비 0
  r?: string; // 적립금 redeem 토큰 (points.ts prepare 단계 발급)
}

export function isTossCheckoutConfigured(): boolean {
  return isTossConfigured() && isShopifyConfigured();
}

export async function processTossPayment(
  paymentKey: string,
  orderId: string,
  payload: TossCheckoutPayload
): Promise<OrderResult> {
  if (!paymentKey || !orderId) {
    return { ok: false, status: 400, reason: 'missing_payment', error: '결제 정보가 없습니다.' };
  }
  if (!isTossCheckoutConfigured()) {
    return {
      ok: false,
      status: 503,
      reason: 'not_configured',
      error: '결제 서버가 아직 설정되지 않았습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
    };
  }

  const isTest = isTossTestKey();
  if (isTest && !ALLOW_TEST_PAYMENTS) {
    return { ok: false, status: 403, reason: 'test_blocked', error: '테스트 결제는 처리할 수 없습니다.' };
  }

  // 1) 멱등성 — 이미 이 결제로 주문이 만들어졌으면 그대로 반환.
  // Shopify 태그는 40자 제한 — orderId(`toss-<uuid>`, 41자)를 그대로 붙이면
  // 46자가 되어 orderCreate가 "Order tags is invalid"로 거부된다 (2026-07-18
  // 실결제 장애의 원인). uuid 하이픈을 제거한 37자 결정적 태그를 쓴다.
  const tag = `toss-${orderId.replace(/^toss-/, '').replace(/-/g, '')}`.slice(0, 40);
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
    console.error(`[toss-checkout] idempotency check failed for ${orderId}:`, e);
    // Fall through — ALREADY_PROCESSED_PAYMENT 재검증이 이중 과금은 막아준다.
  }

  // 2) 클라이언트 payload에서 주문 항목 파싱 (금액은 신뢰하지 않음).
  const lineItems: LineItem[] = Array.isArray(payload.lineItems)
    ? (payload.lineItems as any[])
        .map((l: any) => ({ variantId: String(l.variantId || ''), qty: Math.max(1, Number(l.qty) || 0) }))
        .filter((l: LineItem) => l.variantId && l.qty > 0)
    : [];
  const shipping = payload.shipping || {};

  if (lineItems.length === 0) {
    // confirm 전 — 돈이 잡히지 않았으므로 환불 불필요.
    return { ok: false, status: 422, reason: 'no_items', error: '주문 항목을 확인할 수 없습니다. 다시 시도해 주세요.' };
  }

  // 3) 라이브 가격·재고 조회.
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
    console.error(`[toss-checkout] variant lookup failed for ${orderId}:`, e);
    return { ok: false, status: 502, reason: 'lookup_failed', error: '상품 조회에 실패했습니다. 다시 시도해 주세요.' };
  }

  const byId = new Map(variants.map((v) => [v.id, v]));

  for (const item of lineItems) {
    if (!byId.has(item.variantId)) {
      return { ok: false, status: 409, reason: 'sold_out', error: '해당 상품을 더 이상 판매하지 않습니다.' };
    }
  }

  // 4) 재고 확인 — confirm(과금) 전에 걸러서 환불 자체가 없게 한다.
  for (const item of lineItems) {
    const v = byId.get(item.variantId) as VariantInfo;
    const oversellable = v.inventoryPolicy.toUpperCase() === 'CONTINUE';
    const inStock = v.availableForSale && v.productStatus === 'ACTIVE';
    const enough = v.inventoryQuantity == null || v.inventoryQuantity >= item.qty || oversellable;
    if (!inStock || !enough) {
      return { ok: false, status: 409, reason: 'sold_out', error: '죄송합니다. 해당 음반이 방금 판매되었습니다.' };
    }
  }

  // 5) 권위 금액 재계산 (라이브 가격 + 배송 규칙 + 검증된 적립금 토큰).
  let subtotal = 0;
  for (const item of lineItems) subtotal += (byId.get(item.variantId) as VariantInfo).price * item.qty;
  const pickup = payload.delivery === 'pickup';
  const shipFee = pickup ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;

  const redeem = verifyRedemption(typeof payload.r === 'string' ? payload.r : undefined);
  const pointsUsed = redeem ? Math.max(0, Math.min(redeem.p, subtotal)) : 0;
  const redeemCustomerId = redeem?.cid || null;

  const expectedTotal = subtotal - pointsUsed + shipFee;

  // 6) 승인 — 재계산 금액으로 confirm. 결제창 승인 금액과 다르면 토스가 거절.
  const confirmed = await confirmTossPayment(paymentKey, orderId, expectedTotal);
  if (!confirmed.ok) {
    const code = 'code' in confirmed ? confirmed.code : 'CONFIRM_FAILED';
    const msg = 'message' in confirmed ? confirmed.message : '결제 승인에 실패했습니다.';
    const mismatch = code === 'INVALID_AMOUNT' || /금액/.test(msg);
    return {
      ok: false,
      status: mismatch ? 409 : 402,
      reason: mismatch ? 'amount_mismatch' : 'confirm_failed',
      error: mismatch ? '결제 금액이 일치하지 않습니다. 장바구니를 확인하고 다시 시도해 주세요.' : msg,
    };
  }

  const refund = async (reason: string) => {
    const ok = await cancelTossPayment(paymentKey, reason);
    if (!ok) console.error(`[toss-checkout] REFUND FAILED — manual cancel needed: ${paymentKey} (${orderId})`);
  };

  // 7) 주문 생성 (BYPASS + 수동 재고 0 처리 — order.ts와 동일한 이유).
  const phone = normalizePhone(shipping.phone);
  const name: string = (shipping.name || '').trim();
  const shipForm: ShippingForm = { ...shipping, name };
  const shipAddress = pickup ? undefined : buildShippingAddress(shipForm);
  const order: Record<string, unknown> = {
    email: shipping.email || undefined,
    phone,
    currency: CURRENCY,
    financialStatus: 'PAID',
    test: isTest,
    note: `토스페이먼츠 결제 (orderId: ${orderId}, paymentKey: ${paymentKey})`,
    tags: ['web-checkout', tag],
    customAttributes: [
      { key: 'Toss orderId', value: orderId },
      { key: 'Toss paymentKey', value: paymentKey },
      { key: 'PG', value: '토스페이먼츠 (직연동)' },
      { key: '수령 방법', value: pickup ? '매장 픽업' : '택배 배송' },
      // Shopify가 배송지를 거부해도 원문은 주문에 남는다 (2026-09-02 유실 사고 방지).
      ...(pickup ? [] : [{ key: '배송지 원문', value: addressSummary(shipForm) }]),
      ...(pointsUsed > 0 ? [{ key: '적립금 사용', value: `${pointsUsed.toLocaleString('ko-KR')}원` }] : []),
    ],
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
    // 픽업 주문엔 배송지가 없다 — 매장 주소를 넣으면 운영 혼선이 생기므로 생략.
    ...(shipAddress ? { shippingAddress: shipAddress } : {}),
    shippingLines: [
      {
        title: pickup ? '매장 픽업' : shipFee === 0 ? '무료배송' : '기본배송',
        priceSet: { shopMoney: { amount: String(shipFee), currencyCode: CURRENCY } },
      },
    ],
    transactions: [
      {
        kind: 'SALE',
        status: 'SUCCESS',
        gateway: '토스페이먼츠',
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
      { order, options: { inventoryBehaviour: 'BYPASS', sendReceipt: true } }
    );
    const errs = data.orderCreate.userErrors;
    const created = data.orderCreate.order;
    if (errs?.length || !created) {
      console.error(`[toss-checkout] orderCreate userErrors for ${orderId}:`, JSON.stringify(errs));
      await refund('주문 생성 실패로 자동 환불합니다.');
      return { ok: false, status: 500, reason: 'order_failed', error: '주문 생성에 실패하여 결제를 환불했습니다. 고객센터로 문의해 주세요.' };
    }

    // 배송지가 실제로 저장됐는지 확인 — orderCreate는 주소가 유효하지 않으면
    // userErrors 없이 통째로 버린다. Best-effort, 주문은 절대 실패시키지 않는다.
    if (shipAddress) await ensureShippingAddress(created.id, shipAddress, orderId);

    try {
      await decrementSoldInventory(lineItems, byId);
    } catch (e) {
      console.error(`[toss-checkout] inventory zero-out failed for ${orderId}:`, e);
    }

    const buyerEmail = shipping.email;
    if (buyerEmail) {
      try {
        const cid = await findOrCreateCustomer(String(buyerEmail).toLowerCase(), name || undefined);
        await saveOrderAddress(cid, {
          firstName: name || '고객',
          phone: shipping.phone,
          zip: shipping.zip,
          address1: shipping.address1,
          address2: shipping.address2,
        });
      } catch (e) {
        console.error(`[toss-checkout] save default address failed for ${orderId}:`, e);
      }
    }

    if (pointsUsed > 0 && redeemCustomerId) {
      try {
        await spendForOrder(redeemCustomerId, pointsUsed, created.id);
      } catch (e) {
        console.error(`[toss-checkout] points debit failed for ${orderId} (${redeemCustomerId}, ${pointsUsed}):`, e);
      }
    }

    return { ok: true, status: 200, orderName: created.name, orderId: created.id };
  } catch (e) {
    console.error(`[toss-checkout] orderCreate threw for ${orderId}:`, e);
    await refund('주문 생성 중 오류로 자동 환불합니다.');
    return { ok: false, status: 500, reason: 'order_failed', error: '주문 처리 중 오류가 발생하여 결제를 환불했습니다. 고객센터로 문의해 주세요.' };
  }
}
