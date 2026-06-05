import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSeo } from '../lib/seo';
import { FREE_SHIPPING_THRESHOLD, won } from '../lib/shipping';
import { PORTONE_STORE_ID, PORTONE_CHANNEL_KEY } from '../lib/payment';

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

const Checkout: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { cart, reset } = useCart();
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

  const subtotal = cart ? Number(cart.cost.subtotalAmount.amount) : 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;
  const total = subtotal + shipping;

  const orderName = useMemo(() => {
    if (!cart || cart.lines.length === 0) return '';
    const first = cart.lines[0].merchandise.product.title;
    return cart.lines.length > 1 ? `${first} 외 ${cart.lines.length - 1}건` : first;
  }, [cart]);

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 9 &&
    form.address1.trim().length > 0;

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
    if (!valid || status === 'paying' || status === 'processing') return;
    setStatus('paying');
    setMessage('');
    const paymentId = `pay-${crypto.randomUUID()}`;

    try {
      const res = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount: total,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: { fullName: form.name.trim(), email: form.email.trim(), phoneNumber: form.phone.trim() },
        redirectUrl: `${window.location.origin}/checkout`,
        customData: {
          cartId: cart.id,
          lineItems: cart.lines.map((l) => ({ variantId: l.merchandise.id, qty: l.quantity })),
          shipping: { ...form },
        },
      });

      if (!res || res.code != null) {
        setStatus('error');
        setMessage(res?.message || '결제가 취소되었거나 실패했습니다.');
        return;
      }

      // Payment authorized → confirm on the server (authoritative).
      setStatus('processing');
      const r = await fetch('/api/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          customer: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          shipping: { zip: form.zip.trim(), address1: form.address1.trim(), address2: form.address2.trim() },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        setOrderId(data.orderName || data.orderId || '');
        reset();
        setStatus('done');
      } else if (data.reason === 'sold_out') {
        setStatus('soldout');
        setMessage('죄송합니다 — 결제 중 해당 음반이 판매되었습니다. 결제는 자동 환불됩니다.');
      } else {
        setStatus('error');
        setMessage(data.error || '주문 처리 중 문제가 발생했습니다. 결제 내역은 고객센터로 문의해 주세요.');
      }
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
        </div>

        {/* Summary */}
        <div style={{ border: '1px solid var(--color-line)', padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5 }}>주문 요약</div>
          {cart.lines.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.9rem' }}>
              <span style={{ opacity: 0.85 }}>
                {l.merchandise.product.title}
                {l.quantity > 1 ? ` × ${l.quantity}` : ''}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>{won(Number(l.cost.totalAmount.amount))}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>상품 합계</span><span>{won(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>배송비</span>
              <span>{shipping === 0 ? '무료' : won(shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 600, marginTop: '0.35rem' }}>
              <span>결제 금액</span><span>{won(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={pay}
            disabled={!valid || status === 'paying' || status === 'processing'}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              border: '1px solid var(--color-text)',
              cursor: !valid ? 'not-allowed' : status === 'paying' || status === 'processing' ? 'wait' : 'pointer',
              opacity: !valid ? 0.45 : 1,
              fontFamily: 'inherit',
            }}
          >
            {status === 'paying' ? '결제 진행 중…' : status === 'processing' ? '주문 처리 중…' : `${won(total)} 결제하기`}
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
