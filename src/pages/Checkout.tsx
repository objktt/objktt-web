import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSeo } from '../lib/seo';
import { FREE_SHIPPING_THRESHOLD, won } from '../lib/shipping';
import { PORTONE_STORE_ID, PORTONE_CHANNEL_KEY, PAYMENT_PROVIDER, TOSS_CLIENT_KEY } from '../lib/payment';
import { getStoredToken } from '../lib/account';
import { REWARDS } from '../data/rewards';

type Status = 'idle' | 'paying' | 'processing' | 'done' | 'soldout' | 'error';

const DAUM_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
let daumLoading: Promise<void> | null = null;
function loadDaumPostcode(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).daum?.Postcode) return Promise.resolve();
  if (daumLoading) return daumLoading;
  daumLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = DAUM_SRC;
    s.onload = () => resolve();
    s.onerror = () => { daumLoading = null; reject(new Error('우편번호 서비스를 불러오지 못했습니다.')); };
    document.head.appendChild(s);
  });
  return daumLoading;
}

/**
 * UTF-8 safe base64. KG이니시스는 merchantData(PortOne customData)에 한글 등
 * 비ASCII를 허용하지 않으므로, 배송지 등 한글이 포함된 customData를 인코딩해 보낸다.
 * (서버 /api/_lib/order.ts 가 디코딩한다.)
 */
const encodeCustomData = (obj: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

const Checkout: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { cart, reset, removeLine, loading: cartLoading } = useCart();
  const { customer, isLoggedIn } = useAuth();
  useSeo({ title: '체크아웃 | OBJKTT' });

  const [form, setForm] = useState({ name: '', phone: '', email: '', zip: '', address1: '', address2: '' });

  // Prefill from the logged-in customer (once).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !customer) return;
    const a = customer.defaultAddress;
    setForm((f) => ({
      name: f.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || (a ? [a.firstName, a.lastName].filter(Boolean).join(' ') : ''),
      phone: f.phone || customer.phone || a?.phone || '',
      email: f.email || customer.email || '',
      zip: f.zip || a?.zip || '',
      address1: f.address1 || a?.address1 || '',
      address2: f.address2 || a?.address2 || '',
    }));
    setPrefilled(true);
  }, [customer, prefilled]);

  const searchAddress = async () => {
    try {
      await loadDaumPostcode();
      new (window as any).daum.Postcode({
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => {
          setForm((f) => ({ ...f, zip: data.zonecode, address1: data.roadAddress || data.jibunAddress }));
        },
      }).open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '주소 검색을 불러오지 못했습니다.');
      setStatus('error');
    }
  };
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // 수령 방법: 택배 배송(기본) 또는 매장 픽업(배송비 무료, 주소 불필요).
  // 서버(tossOrder.ts)가 같은 규칙으로 금액을 재계산해 검증한다.
  const [delivery, setDelivery] = useState<'shipping' | 'pickup'>('shipping');
  const subtotal = cart ? Number(cart.cost.subtotalAmount.amount) : 0;
  const shipping = delivery === 'pickup' ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;

  // 적립금 사용 (회원 전용). 적립금은 상품 금액에만 적용 → 한도 = min(잔액, 상품합계).
  const [ptInput, setPtInput] = useState('');
  const balance = customer?.points ?? 0;
  const maxUsable = Math.max(0, Math.min(balance, subtotal));
  const rawPts = Math.max(0, Math.min(Math.floor(Number(ptInput) || 0), maxUsable));
  const pointsApplied = rawPts >= REWARDS.minUseKrw ? rawPts : 0;
  const pointsTooSmall = rawPts > 0 && rawPts < REWARDS.minUseKrw;
  const total = subtotal - pointsApplied + shipping;

  // Send the verified paymentId to the server to create the order. Shared by
  // both the popup/iframe flow (pay) and the redirect-return flow (effect below).
  // The server re-derives amount/line items/shipping from the PortOne payment's
  // customData, so we only need the paymentId here.
  const confirmPayment = async (paymentId: string) => {
    setStatus('processing');
    try {
      const r = await fetch('/api/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        setOrderId(data.orderName || data.orderId || '');
        reset();
        setStatus('done');
      } else if (data.reason === 'sold_out') {
        setStatus('soldout');
        setMessage('죄송합니다. 결제 중 해당 음반이 판매되었습니다. 결제는 자동 환불됩니다.');
      } else {
        setStatus('error');
        setMessage(data.error || '주문 처리 중 문제가 발생했습니다. 결제 내역은 고객센터로 문의해 주세요.');
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '주문 확정 중 오류가 발생했습니다. 고객센터로 문의해 주세요.');
    }
  };

  // 토스 successUrl 리턴: 세션스토리지에 저장해 둔 주문 payload와 함께 서버
  // 승인(confirm)을 호출한다. confirm 전에는 과금되지 않으므로 payload가
  // 유실됐으면 그냥 실패 처리해도 안전하다 (미승인 건은 자동 만료).
  const confirmToss = async (paymentKey: string, tossOrderId: string) => {
    setStatus('processing');
    const key = `objktt-toss:${tossOrderId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      setStatus('error');
      setMessage('주문 정보를 찾을 수 없습니다. 결제가 승인되지 않았으니 처음부터 다시 시도해 주세요.');
      return;
    }
    try {
      const r = await fetch('/api/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId: tossOrderId, payload: JSON.parse(raw) }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        sessionStorage.removeItem(key);
        setOrderId(data.orderName || data.orderId || '');
        reset();
        setStatus('done');
      } else if (data.reason === 'sold_out') {
        setStatus('soldout');
        setMessage('죄송합니다. 결제 진행 중 해당 음반이 판매되었습니다. 결제는 승인되지 않았습니다.');
      } else {
        setStatus('error');
        setMessage(data.error || '주문 처리 중 문제가 발생했습니다. 결제 내역은 고객센터로 문의해 주세요.');
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '주문 확정 중 오류가 발생했습니다. 고객센터로 문의해 주세요.');
    }
  };

  // Redirect-return flow. PortOne(KG이니시스/모바일)은 /checkout?paymentId=...
  // 로, 토스 결제창은 성공 시 ?paymentKey=...&orderId=...&amount=..., 실패 시
  // ?code=...&message=... 로 돌아온다. requestPayment 프로미스는 리다이렉트로
  // 사라지므로 URL 파라미터를 읽어 서버 확정을 직접 호출한다. (이게 없으면
  // 결제는 됐는데 주문이 생성되지 않는다.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('paymentId'); // PortOne
    const paymentKey = params.get('paymentKey'); // Toss success
    const tossOrderId = params.get('orderId');
    const errCode = params.get('code'); // present on failure/cancel (both PGs)
    if (!paymentId && !paymentKey && !errCode) return;
    // Clean the query string so a refresh doesn't re-trigger.
    window.history.replaceState({}, '', window.location.pathname);
    if (errCode) {
      setStatus('error');
      setMessage(params.get('message') || '결제가 취소되었거나 실패했습니다.');
      return;
    }
    if (paymentKey && tossOrderId) {
      confirmToss(paymentKey, tossOrderId);
      return;
    }
    if (paymentId) confirmPayment(paymentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderName = useMemo(() => {
    if (!cart || cart.lines.length === 0) return '';
    const first = cart.lines[0].merchandise.product.title;
    const raw = cart.lines.length > 1 ? `${first} 외 ${cart.lines.length - 1}건` : first;
    // NICE페이먼츠 rejects these chars in the order name: % & | $ - + = [ ]
    // Strip them, collapse whitespace, and cap at 40 bytes (PG limit).
    const cleaned = raw.replace(/[%&|$+=\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
    let bytes = 0;
    let out = '';
    for (const ch of cleaned) {
      const b = new TextEncoder().encode(ch).length;
      if (bytes + b > 40) break;
      bytes += b;
      out += ch;
    }
    return out || '주문';
  }, [cart]);

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 9 &&
    (delivery === 'pickup' || form.address1.trim().length > 0);

  const pad = isMobile ? '5rem 1.5rem 4rem' : '7rem 4rem 5rem';

  if (status === 'done') {
    return (
      <div style={{ padding: pad, maxWidth: '40rem' }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, margin: 0 }}>주문 완료</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.7, marginTop: '1rem' }}>
          결제가 완료되었습니다. 주문번호 <strong>{orderId}</strong>
          <br />확인 메일을 보내드릴게요. 감사합니다.
        </p>
        <Link to="/shop" style={{ display: 'inline-block', marginTop: '1.5rem', textDecoration: 'underline', color: 'inherit' }}>
          쇼핑 계속하기 →
        </Link>
      </div>
    );
  }

  // While confirming a redirect-return payment, show progress (the cart may have
  // been cleared) instead of the empty-cart message.
  if (status === 'processing') {
    return (
      <div style={{ padding: pad }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, margin: 0 }}>주문 확정 중…</h1>
        <p style={{ opacity: 0.6, marginTop: '1rem' }}>결제를 확인하고 주문을 생성하고 있습니다. 잠시만 기다려 주세요.</p>
      </div>
    );
  }

  if ((status === 'error' || status === 'soldout') && (!cart || cart.lines.length === 0)) {
    return (
      <div style={{ padding: pad, maxWidth: '40rem' }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, margin: 0 }}>주문 처리 안내</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.7, marginTop: '1rem' }}>{message}</p>
        <Link to="/shop" style={{ display: 'inline-block', marginTop: '1.5rem', textDecoration: 'underline', color: 'inherit' }}>
          쇼핑 계속하기 →
        </Link>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div style={{ padding: pad }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 600, margin: 0 }}>체크아웃</h1>
        <p style={{ opacity: 0.6, marginTop: '1rem' }}>장바구니가 비어 있습니다.</p>
        <Link to="/shop" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'underline', color: 'inherit' }}>
          레코드 보러가기 →
        </Link>
      </div>
    );
  }

  const pay = async () => {
    if (!valid || status === 'paying') return;
    setStatus('paying');
    setMessage('');
    const paymentId = `pay-${crypto.randomUUID()}`;

    try {
      // 적립금 사용 시: 서버에서 잔액 검증 + 서명 토큰 발급(차감은 결제 확정 시).
      let redeemToken: string | null = null;
      if (pointsApplied > 0) {
        const pr = await fetch('/api/account/address', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(getStoredToken()?.accessToken ? { 'x-storefront-token': getStoredToken()!.accessToken } : {}),
          },
          body: JSON.stringify({ action: 'redeem-prepare', points: pointsApplied, subtotal }),
        });
        const pd = await pr.json().catch(() => ({}));
        if (!pd.ok || !pd.token) {
          setStatus('error');
          setMessage(pd.error || '적립금 사용 준비에 실패했습니다. 다시 시도해 주세요.');
          return;
        }
        redeemToken = pd.token;
      }

      if (PAYMENT_PROVIDER === 'toss') {
        // 토스 결제창 (API 개별 연동). 주문 payload는 세션스토리지에 두고
        // successUrl 리턴 후 서버 승인(confirm) 때 보낸다 — 서버가 금액을
        // 재계산해 confirm 하므로 payload 변조는 승인 거절로 이어질 뿐이다.
        const tossOrderId = `toss-${crypto.randomUUID()}`;
        sessionStorage.setItem(
          `objktt-toss:${tossOrderId}`,
          JSON.stringify({
            lineItems: cart.lines.map((l) => ({ variantId: l.merchandise.id, qty: l.quantity })),
            shipping: { ...form },
            delivery,
            ...(redeemToken ? { r: redeemToken } : {}),
          })
        );
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        const payment = tossPayments.payment({ customerKey: ANONYMOUS });
        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: total },
          orderId: tossOrderId,
          orderName,
          successUrl: `${window.location.origin}/checkout`,
          failUrl: `${window.location.origin}/checkout`,
          customerEmail: form.email.trim(),
          customerName: form.name.trim(),
          customerMobilePhone: form.phone.replace(/[^\d]/g, ''),
        });
        return; // 결제창이 successUrl/failUrl로 전체 리다이렉트한다.
      }

      const res = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount: total,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: { fullName: form.name.trim(), email: form.email.trim(), phoneNumber: form.phone.replace(/[^\d]/g, '') },
        redirectUrl: `${window.location.origin}/checkout`,
        customData: {
          d: encodeCustomData({
            cartId: cart.id,
            lineItems: cart.lines.map((l) => ({ variantId: l.merchandise.id, qty: l.quantity })),
            shipping: { ...form },
            delivery,
            ...(redeemToken ? { r: redeemToken } : {}),
          }),
        },
      });

      if (!res || res.code != null) {
        setStatus('error');
        setMessage(res?.message || '결제가 취소되었거나 실패했습니다.');
        return;
      }

      // Payment authorized (popup/iframe flow) → confirm on the server.
      await confirmPayment(paymentId);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '결제 처리 중 오류가 발생했습니다.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 0.85rem',
    fontSize: '0.95rem',
    background: 'transparent',
    border: '1px solid var(--color-line)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    outline: 'none',
  };
  const label: React.CSSProperties = { fontSize: '0.75rem', opacity: 0.55, marginBottom: '0.35rem', display: 'block' };

  return (
    <div style={{ padding: pad }}>
      <h1 style={{ fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 2rem' }}>
        체크아웃
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr', gap: isMobile ? '2.5rem' : '4rem', alignItems: 'start' }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: '34rem' }}>
          {/* Member / guest banner */}
          <div style={{ fontSize: '0.85rem', opacity: 0.7, padding: '0.75rem 0.85rem', border: '1px solid var(--color-line)' }}>
            {isLoggedIn ? (
              <>{[customer?.firstName, customer?.email].filter(Boolean).join(' · ')} 님으로 주문합니다.</>
            ) : (
              <>
                <Link to="/account?redirect=/checkout" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>로그인</Link>
                {' '}후 주문하거나, 아래 정보를 입력해 <strong>비회원으로 구매</strong>할 수 있습니다.
              </>
            )}
          </div>

          <div>
            <span style={label}>받는 분</span>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="이름" />
          </div>
          <div>
            <span style={label}>연락처</span>
            <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" inputMode="tel" />
          </div>
          <div>
            <span style={label}>이메일</span>
            <input style={inputStyle} value={form.email} onChange={set('email')} placeholder="email@example.com" inputMode="email" />
          </div>
          <div>
            <span style={label}>수령 방법</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {([
                { key: 'shipping', text: '택배 배송' },
                { key: 'pickup', text: '매장 픽업 (무료)' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDelivery(opt.key)}
                  style={{
                    flex: 1,
                    padding: '0.7rem 0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: delivery === opt.key ? 600 : 400,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background: delivery === opt.key ? 'var(--color-text)' : 'transparent',
                    color: delivery === opt.key ? 'var(--color-bg)' : 'var(--color-text)',
                    border: `1px solid ${delivery === opt.key ? 'var(--color-text)' : 'var(--color-line)'}`,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {delivery === 'pickup' && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', opacity: 0.65, lineHeight: 1.6 }}>
                결제 후 준비되면 메일로 안내드려요. 방문 수령지: 서울 중구 명동8가길 58, 4층 오브옉트 (매일 11:00–23:30)
              </div>
            )}
          </div>
          {delivery === 'shipping' && (
            <div>
              <span style={label}>주소</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input style={{ ...inputStyle, maxWidth: '8rem' }} value={form.zip} readOnly placeholder="우편번호" />
                <button
                  type="button"
                  onClick={searchAddress}
                  style={{ padding: '0 1rem', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', background: 'var(--color-text)', color: 'var(--color-bg)', border: '1px solid var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  주소 검색
                </button>
              </div>
              <input style={{ ...inputStyle, marginTop: '0.5rem' }} value={form.address1} readOnly placeholder="도로명 주소 (주소 검색)" />
              <input style={{ ...inputStyle, marginTop: '0.5rem' }} value={form.address2} onChange={set('address2')} placeholder="상세주소 (동·호수 등)" />
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ border: '1px solid var(--color-line)', padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>주문 요약</div>
          {cart.lines.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', fontSize: '0.9rem' }}>
              <span style={{ opacity: 0.85 }}>
                {l.merchandise.product.title}
                {l.quantity > 1 ? ` × ${l.quantity}` : ''}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', whiteSpace: 'nowrap' }}>
                {won(Number(l.cost.totalAmount.amount))}
                <button
                  type="button"
                  aria-label={`${l.merchandise.product.title} 삭제`}
                  disabled={cartLoading || status === 'paying'}
                  onClick={() => void removeLine(l.id)}
                  style={{
                    padding: 0, background: 'none', border: 'none', fontFamily: 'inherit',
                    fontSize: '0.95rem', lineHeight: 1, color: 'inherit', opacity: 0.45,
                    cursor: cartLoading || status === 'paying' ? 'not-allowed' : 'pointer',
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>상품 합계</span><span>{won(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>{delivery === 'pickup' ? '매장 픽업' : '배송비'}</span>
              <span>{shipping === 0 ? '무료' : won(shipping)}</span>
            </div>

            {/* 적립금 사용 (회원 전용, 보유 잔액 있을 때) */}
            {isLoggedIn && balance > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ opacity: 0.6 }}>적립금 사용</span>
                  <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>보유 {won(balance)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    style={{ ...inputStyle, padding: '0.5rem 0.6rem', fontSize: '0.9rem', textAlign: 'right' }}
                    value={ptInput}
                    onChange={(e) => setPtInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    inputMode="numeric"
                    disabled={maxUsable <= 0}
                  />
                  <button
                    type="button"
                    onClick={() => setPtInput(String(maxUsable))}
                    disabled={maxUsable <= 0}
                    style={{ padding: '0 0.9rem', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-line)', cursor: maxUsable <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    전액
                  </button>
                </div>
                {pointsTooSmall && (
                  <span style={{ fontSize: '0.75rem', color: '#c33' }}>
                    {REWARDS.minUseKrw.toLocaleString('ko-KR')}원 이상부터 사용할 수 있습니다.
                  </span>
                )}
                {pointsApplied > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent, var(--color-text))' }}>
                    <span style={{ opacity: 0.6 }}>적립금 할인</span><span>− {won(pointsApplied)}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 600, marginTop: '0.35rem' }}>
              <span>결제 금액</span><span>{won(total)}</span>
            </div>
            {pointsApplied > 0 && (
              <div style={{ fontSize: '0.72rem', opacity: 0.5 }}>적립금 {won(pointsApplied)} 사용 · 사용분은 적립 대상에서 제외됩니다.</div>
            )}
          </div>

          <button
            type="button"
            onClick={pay}
            disabled={!valid || status === 'paying'}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              border: '1px solid var(--color-text)',
              cursor: !valid ? 'not-allowed' : status === 'paying' ? 'wait' : 'pointer',
              opacity: !valid ? 0.45 : 1,
              fontFamily: 'inherit',
            }}
          >
            {status === 'paying' ? '결제 진행 중…' : `${won(total)} 결제하기`}
          </button>

          {(status === 'error' || status === 'soldout') && message && (
            <div style={{ fontSize: '0.85rem', color: status === 'soldout' ? 'var(--color-text)' : '#c33', lineHeight: 1.5 }}>
              {message}
            </div>
          )}
          <div style={{ fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.5 }}>
            결제 진행 시 <Link to="/terms" style={{ color: 'inherit' }}>이용약관</Link> 및{' '}
            <Link to="/refund" style={{ color: 'inherit' }}>환불·교환 정책</Link>에 동의하는 것으로 간주됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
