import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../contexts/AuthContext';
import { useSeo } from '../lib/seo';
import { addAddress, editAddress, removeAddress, makeDefaultAddress, type Customer, type CustomerOrder, type CustomerAddressEntry } from '../lib/account';
import { BUSINESS } from '../data/business';

const won = (a: string, c: string) => {
  const n = Number(a);
  return c === 'KRW' || !c ? `₩${Math.round(n).toLocaleString('ko-KR')}` : `${n.toLocaleString()} ${c}`;
};

/** Display Korean phone nicely: +821012345678 → 010-1234-5678. */
const fmtPhone = (p?: string | null) => {
  if (!p) return '';
  let d = p.replace(/\D/g, '');
  if (d.startsWith('82')) d = '0' + d.slice(2);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
};

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

const ADDR_INPUT: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.95rem', background: 'transparent',
  border: '1px solid var(--color-line)', color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none',
};
const ADDR_LABEL: React.CSSProperties = { fontSize: '0.75rem', opacity: 0.55, marginBottom: '0.35rem', display: 'block' };

const EMPTY_FORM = { name: '', phone: '', zip: '', address1: '', address2: '', setAsDefault: false };

const AddressSection: React.FC<{ customer: Customer; onSaved: () => Promise<void> | void }> = ({ customer, onSaved }) => {
  const addrs = customer.addresses || [];
  // null = list view, 'new' = adding, otherwise the id of the address being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const startAdd = () => {
    setForm({ ...EMPTY_FORM, name: customer.firstName || '', phone: fmtPhone(customer.phone) || '', setAsDefault: addrs.length === 0 });
    setMsg('');
    setEditing('new');
  };
  const startEdit = (a: CustomerAddressEntry) => {
    setForm({ name: a.firstName || '', phone: fmtPhone(a.phone) || '', zip: a.zip || '', address1: a.address1 || '', address2: a.address2 || '', setAsDefault: a.isDefault });
    setMsg('');
    setEditing(a.id);
  };

  const search = async () => {
    try {
      await loadDaumPostcode();
      new (window as any).daum.Postcode({
        oncomplete: (d: { zonecode: string; roadAddress: string; jibunAddress: string }) =>
          setForm((f) => ({ ...f, zip: d.zonecode, address1: d.roadAddress || d.jibunAddress })),
      }).open();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '주소 검색을 불러오지 못했습니다.');
    }
  };

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const res = await fn();
    setBusy(false);
    if (res.ok) { await onSaved(); after?.(); }
    else setMsg(res.error || '처리에 실패했습니다.');
  };

  const save = () => {
    if (!form.address1.trim()) { setMsg('주소를 입력해 주세요.'); return; }
    const payload = { firstName: form.name.trim(), phone: form.phone.trim(), zip: form.zip.trim(), address1: form.address1.trim(), address2: form.address2.trim() };
    void run(
      () => (editing === 'new' ? addAddress(payload, form.setAsDefault) : editAddress(editing as string, payload, form.setAsDefault)),
      () => setEditing(null),
    );
  };

  const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.65, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', textDecoration: 'underline' };

  return (
    <section style={{ borderTop: '1px solid var(--color-line)', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>배송 주소록</h2>
        {editing === null && (
          <button type="button" onClick={startAdd} style={{ ...linkBtn, opacity: 0.8, fontSize: '0.85rem' }}>+ 주소 추가</button>
        )}
      </div>

      {editing !== null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '30rem' }}>
          <div><span style={ADDR_LABEL}>받는 분</span><input style={ADDR_INPUT} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" /></div>
          <div><span style={ADDR_LABEL}>연락처</span><input style={ADDR_INPUT} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" inputMode="tel" /></div>
          <div>
            <span style={ADDR_LABEL}>주소</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input style={{ ...ADDR_INPUT, maxWidth: '8rem' }} value={form.zip} readOnly placeholder="우편번호" />
              <button type="button" onClick={search} style={{ padding: '0 1rem', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', background: 'var(--color-text)', color: 'var(--color-bg)', border: '1px solid var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>주소 검색</button>
            </div>
            <input style={{ ...ADDR_INPUT, marginTop: '0.5rem' }} value={form.address1} readOnly placeholder="도로명 주소 (주소 검색)" />
            <input style={{ ...ADDR_INPUT, marginTop: '0.5rem' }} value={form.address2} onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))} placeholder="상세주소 (동·호수 등)" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', opacity: 0.85, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.setAsDefault} onChange={(e) => setForm((f) => ({ ...f, setAsDefault: e.target.checked }))} />
            기본 배송지로 설정
          </label>
          {msg && <div style={{ fontSize: '0.85rem', color: '#c33' }}>{msg}</div>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={save} disabled={busy} style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, background: 'var(--color-text)', color: 'var(--color-bg)', border: '1px solid var(--color-text)', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{busy ? '저장 중…' : '저장'}</button>
            <button type="button" onClick={() => { setEditing(null); setMsg(''); }} style={{ padding: '0.7rem 1.25rem', fontSize: '0.9rem', background: 'none', border: '1px solid var(--color-line)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
          </div>
        </div>
      ) : addrs.length === 0 ? (
        <p style={{ opacity: 0.55, fontSize: '0.95rem', margin: 0 }}>저장된 배송지가 없습니다. 주소를 추가하거나, 주문 시 입력한 주소가 자동 저장됩니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...addrs].sort((x, y) => Number(y.isDefault) - Number(x.isDefault)).map((a) => (
            <div key={a.id} style={{ border: `1px solid ${a.isDefault ? 'var(--color-text)' : 'var(--color-line)'}`, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>{a.firstName || '받는 분'}</strong>
                {a.isDefault && <span style={{ fontSize: '0.7rem', padding: '0.12rem 0.45rem', background: 'var(--color-text)', color: 'var(--color-bg)' }}>기본 배송지</span>}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.55 }}>
                {fmtPhone(a.phone) && <div>{fmtPhone(a.phone)}</div>}
                <div>{a.zip ? `(${a.zip}) ` : ''}{a.address1} {a.address2 || ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem' }}>
                {!a.isDefault && <button type="button" disabled={busy} onClick={() => void run(() => makeDefaultAddress(a.id))} style={linkBtn}>기본 배송지로 설정</button>}
                <button type="button" disabled={busy} onClick={() => startEdit(a)} style={linkBtn}>수정</button>
                <button type="button" disabled={busy} onClick={() => void run(() => removeAddress(a.id))} style={{ ...linkBtn, color: '#c33', opacity: 0.8 }}>삭제</button>
              </div>
            </div>
          ))}
          {msg && <div style={{ fontSize: '0.85rem', color: '#c33' }}>{msg}</div>}
        </div>
      )}
    </section>
  );
};

// Order by Korean popularity: Kakao → Naver → Google.
const SOCIALS = [
  { id: 'kakao', label: '카카오로 계속하기', bg: '#FEE500', color: '#191600', border: '#FEE500' },
  { id: 'naver', label: '네이버로 계속하기', bg: '#03C75A', color: '#ffffff', border: '#03C75A' },
  { id: 'google', label: 'Google로 계속하기', bg: '#ffffff', color: '#1f1f1f', border: '#dadce0' },
] as const;

const SocialButtons: React.FC<{ redirect: string }> = ({ redirect }) => {
  const r = encodeURIComponent(redirect);
  const [enabled, setEnabled] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/providers')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => { if (alive) setEnabled(data || {}); })
      .catch(() => { if (alive) setEnabled({}); });
    return () => { alive = false; };
  }, []);

  if (!enabled) return null; // still loading
  const visible = SOCIALS.filter((s) => enabled[s.id]);
  if (visible.length === 0) return null; // no providers configured yet

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {visible.map((s) => (
          <a
            key={s.id}
            href={`/api/auth/${s.id}/start?redirect=${r}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.8rem 1rem', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
              background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: 'inherit',
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0 0', opacity: 0.5, fontSize: '0.8rem' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
        또는 이메일로
        <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
      </div>
    </div>
  );
};

const Account: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { customer, loading, isLoggedIn, login, register, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  useSeo({ title: '계정 | OBJKTT' });

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // 마이페이지 진입 시 항상 최신 고객 데이터(주문 내역·적립금)를 다시 불러온다.
  // AuthContext는 앱 부팅 시 1회만 조회하므로, 결제 직후 SPA 내 이동으로 오면
  // 결제 전 스냅샷이 보이는 문제가 있었다.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pad = isMobile ? '5rem 1.5rem 4rem' : '7rem 4rem 5rem';
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.85rem', fontSize: '0.95rem', background: 'transparent',
    border: '1px solid var(--color-line)', color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none',
  };
  const label: React.CSSProperties = { fontSize: '0.75rem', opacity: 0.55, marginBottom: '0.35rem', display: 'block' };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr('올바른 이메일을 입력해 주세요.'); return; }
    if (form.password.length < 5) { setErr('비밀번호는 5자 이상이어야 합니다.'); return; }
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await login(form.email.trim(), form.password)
          : await register({ email: form.email.trim(), password: form.password, firstName: form.firstName.trim() || undefined, phone: form.phone.trim() || undefined });
      if (res.ok) {
        navigate(redirect && redirect.startsWith('/') ? redirect : '/');
      } else {
        setErr(res.errors[0]?.message || (mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: pad, opacity: 0.5 }}>로딩 중…</div>;

  // Logged in → dashboard
  if (isLoggedIn && customer) {
    const orders = customer.orders;
    const totalSpent = orders.reduce((s, o) => s + Number(o.total.amount || 0), 0);
    const fin = (o: CustomerOrder) => String(o.financialStatus || '').toUpperCase();
    const ful = (o: CustomerOrder) => String(o.fulfillmentStatus || '').toUpperCase();
    const isPaid = (o: CustomerOrder) => fin(o).includes('PAID');
    const isRefunded = (o: CustomerOrder) => /REFUND|VOID/.test(fin(o));
    const pipeline = [
      { label: '입금전', n: orders.filter((o) => !isPaid(o) && !isRefunded(o)).length },
      { label: '배송준비중', n: orders.filter((o) => isPaid(o) && (ful(o) === '' || ful(o) === 'UNFULFILLED')).length },
      { label: '배송중', n: orders.filter((o) => ['IN_PROGRESS', 'PARTIALLY_FULFILLED', 'OUT_FOR_DELIVERY', 'ON_HOLD', 'SCHEDULED'].includes(ful(o))).length },
      { label: '배송완료', n: orders.filter((o) => ful(o) === 'FULFILLED').length },
    ];
    const cancelledCount = orders.filter((o) => isRefunded(o)).length;

    const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const navGroups: { title: string; items: { label: string; id?: string; onClick?: () => void }[] }[] = [
      { title: '나의 쇼핑 정보', items: [{ label: '주문 내역', id: 'orders' }, { label: '배송 주소록', id: 'address' }] },
      { title: '나의 정보', items: [{ label: '계정 정보', id: 'account' }, { label: '로그아웃', onClick: () => { void logout(); } }] },
    ];

    const card: React.CSSProperties = { border: '1px solid var(--color-line)', padding: '1.25rem 1rem', textAlign: 'center' };
    const sectionH2: React.CSSProperties = { fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, margin: '0 0 1.25rem' };

    return (
      <div style={{ padding: pad }}>
        <h1 style={{ fontSize: isMobile ? '1.9rem' : '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 0.4rem' }}>마이페이지</h1>
        <p style={{ opacity: 0.7, margin: '0 0 2rem', fontSize: '0.95rem' }}>
          안녕하세요, <strong>{customer.firstName || customer.email}</strong> 님! 회원등급은 <strong>일반회원</strong> 입니다.
        </p>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={card}><div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{orders.length}회</div><div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: '0.35rem' }}>총 주문</div></div>
          <div style={card}><div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{won(String(totalSpent), 'KRW')}</div><div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: '0.35rem' }}>총 결제금액</div></div>
          <div style={card}><div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{won(String(customer.points ?? 0), 'KRW')}</div><div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: '0.35rem' }}>적립금</div></div>
          <div style={card}><div style={{ fontSize: '1.4rem', fontWeight: 600 }}>일반회원</div><div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: '0.35rem' }}>회원등급</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '11rem 1fr', gap: isMobile ? '2rem' : '3rem', alignItems: 'start' }}>
          {/* Sidebar */}
          {!isMobile && (
            <nav style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {navGroups.map((g) => (
                <div key={g.title}>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.75rem' }}>{g.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {g.items.map((it) => (
                      <button key={it.label} type="button" onClick={() => (it.onClick ? it.onClick() : it.id && go(it.id))}
                        style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'var(--color-text)', opacity: 0.8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        {it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          )}

          {/* Main */}
          <div style={{ minWidth: 0 }}>
            <section id="orders" style={{ borderTop: '1px solid var(--color-line)', padding: '1.5rem 0' }}>
              <h2 style={sectionH2}>주문 처리 현황 <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(전체 기준)</span></h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', marginBottom: '1rem' }}>
                {pipeline.map((p, i) => (
                  <React.Fragment key={p.label}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{p.n}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>{p.label}</div>
                    </div>
                    {i < pipeline.length - 1 && <span style={{ opacity: 0.3 }}>›</span>}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ border: '1px solid var(--color-line)', padding: '0.85rem 1rem', fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.6 }}>
                {cancelledCount > 0 && <div style={{ marginBottom: '0.35rem' }}>취소·환불 완료 <strong>{cancelledCount}</strong>건</div>}
                주문 취소·교환·반품은{' '}
                <a href={BUSINESS.kakaoChatUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>카카오톡 채널</a> 또는{' '}
                <a href={`mailto:${BUSINESS.email}`} style={{ color: 'inherit' }}>{BUSINESS.email}</a>로 문의해 주세요.{' '}
                <Link to="/refund" style={{ color: 'inherit', textDecoration: 'underline' }}>환불·교환 정책</Link>
              </div>

              <h3 style={{ ...sectionH2, marginTop: '2rem' }}>주문 내역</h3>
              {orders.length === 0 ? (
                <p style={{ opacity: 0.55, fontSize: '0.95rem', margin: 0 }}>아직 주문 내역이 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {orders.map((o) => {
                    const items = o.items ?? [];
                    const first = items[0];
                    const itemLabel = first
                      ? `${first.title}${first.quantity > 1 ? ` × ${first.quantity}` : ''}${items.length > 1 ? ` 외 ${items.length - 1}건` : ''}`
                      : '';
                    return (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0', borderBottom: '1px solid var(--color-line)', fontSize: '0.9rem' }}>
                        <span style={{ minWidth: 0 }}>
                          #{o.orderNumber} <span style={{ opacity: 0.5 }}>· {o.processedAt.slice(0, 10)}</span>
                          {itemLabel && (
                            <span style={{ display: 'block', marginTop: '0.2rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {itemLabel}
                            </span>
                          )}
                        </span>
                        <span style={{ whiteSpace: 'nowrap' }}>{won(o.total.amount, o.total.currencyCode)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div id="address"><AddressSection customer={customer} onSaved={refresh} /></div>

            <section id="account" style={{ borderTop: '1px solid var(--color-line)', padding: '1.5rem 0' }}>
              <h2 style={sectionH2}>계정 정보</h2>
              <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(5rem,auto) 1fr', gap: '0.5rem 1.5rem', fontSize: '0.95rem', margin: 0 }}>
                {customer.firstName && (<><dt style={{ opacity: 0.5 }}>이름</dt><dd style={{ margin: 0 }}>{customer.firstName}</dd></>)}
                <dt style={{ opacity: 0.5 }}>이메일</dt><dd style={{ margin: 0 }}>{customer.email}</dd>
                {customer.phone && (<><dt style={{ opacity: 0.5 }}>연락처</dt><dd style={{ margin: 0 }}>{fmtPhone(customer.phone)}</dd></>)}
              </dl>
              <button type="button" onClick={async () => { await logout(); }}
                style={{ marginTop: '1.5rem', padding: '0.7rem 1.25rem', fontSize: '0.85rem', background: 'none', border: '1px solid var(--color-line)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                로그아웃
              </button>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // Logged out → login / register
  return (
    <div style={{ padding: pad, maxWidth: '26rem' }}>
      <h1 style={{ fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 1.5rem' }}>
        {mode === 'login' ? '로그인' : '회원가입'}
      </h1>

      {params.get('error') && (
        <div style={{ fontSize: '0.85rem', color: '#c33', margin: '0 0 1.25rem', lineHeight: 1.5 }}>{params.get('error')}</div>
      )}

      <SocialButtons redirect={redirect && redirect.startsWith('/') ? redirect : '/'} />

      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErr(''); }}
            style={{
              background: 'none', border: 'none', padding: '0 0 0.35rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem',
              color: 'var(--color-text)', opacity: mode === m ? 1 : 0.45,
              borderBottom: mode === m ? '2px solid var(--color-text)' : '2px solid transparent', fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mode === 'register' && (
          <div>
            <span style={label}>이름 (선택)</span>
            <input style={inputStyle} value={form.firstName} onChange={set('firstName')} placeholder="이름" />
          </div>
        )}
        <div>
          <span style={label}>이메일</span>
          <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" autoComplete="email" />
        </div>
        <div>
          <span style={label}>비밀번호</span>
          <input style={inputStyle} type="password" value={form.password} onChange={set('password')} placeholder="비밀번호 (5자 이상)" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>
        {mode === 'register' && (
          <div>
            <span style={label}>연락처 (선택)</span>
            <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" inputMode="tel" />
          </div>
        )}
        {err && <div style={{ fontSize: '0.85rem', color: '#c33' }}>{err}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{ padding: '0.9rem 1.5rem', fontSize: '0.95rem', fontWeight: 600, background: 'var(--color-text)', color: 'var(--color-bg)', border: '1px solid var(--color-text)', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', marginTop: '0.25rem' }}
        >
          {busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      {redirect === '/checkout' && (
        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', opacity: 0.6 }}>
          또는 <Link to="/checkout" style={{ color: 'inherit', textDecoration: 'underline' }}>비회원으로 구매</Link>하기
        </p>
      )}
    </div>
  );
};

export default Account;
