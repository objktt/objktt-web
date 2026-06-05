import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../contexts/AuthContext';
import { useSeo } from '../lib/seo';

const won = (a: string, c: string) => {
  const n = Number(a);
  return c === 'KRW' || !c ? `₩${Math.round(n).toLocaleString('ko-KR')}` : `${n.toLocaleString()} ${c}`;
};

const Account: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const { customer, loading, isLoggedIn, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  useSeo({ title: '계정 | OBJKTT' });

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
        navigate(redirect && redirect.startsWith('/') ? redirect : '/account');
      } else {
        setErr(res.errors[0]?.message || (mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: pad, opacity: 0.5 }}>로딩 중…</div>;

  // Logged in → profile + orders
  if (isLoggedIn && customer) {
    return (
      <div style={{ padding: pad, maxWidth: '46rem' }}>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>
          마이페이지
        </h1>
        <p style={{ opacity: 0.65, margin: '0 0 2.5rem' }}>
          {[customer.firstName, customer.email].filter(Boolean).join(' · ')}
        </p>

        <section style={{ borderTop: '1px solid var(--color-line)', padding: '1.5rem 0' }}>
          <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, margin: '0 0 1rem' }}>프로필</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(5rem,auto) 1fr', gap: '0.5rem 1.5rem', fontSize: '0.95rem', margin: 0 }}>
            {customer.firstName && (<><dt style={{ opacity: 0.5 }}>이름</dt><dd style={{ margin: 0 }}>{customer.firstName}</dd></>)}
            <dt style={{ opacity: 0.5 }}>이메일</dt><dd style={{ margin: 0 }}>{customer.email}</dd>
            {customer.phone && (<><dt style={{ opacity: 0.5 }}>연락처</dt><dd style={{ margin: 0 }}>{customer.phone}</dd></>)}
          </dl>
        </section>

        <section style={{ borderTop: '1px solid var(--color-line)', padding: '1.5rem 0' }}>
          <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, margin: '0 0 1rem' }}>주문 내역</h2>
          {customer.orders.length === 0 ? (
            <p style={{ opacity: 0.55, fontSize: '0.95rem', margin: 0 }}>아직 주문 내역이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {customer.orders.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0', borderBottom: '1px solid var(--color-line)', fontSize: '0.9rem' }}>
                  <span>#{o.orderNumber} <span style={{ opacity: 0.5 }}>· {o.processedAt.slice(0, 10)}</span></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{won(o.total.amount, o.total.currencyCode)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={async () => { await logout(); }}
          style={{ marginTop: '1.5rem', padding: '0.7rem 1.25rem', fontSize: '0.85rem', background: 'none', border: '1px solid var(--color-line)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  // Logged out → login / register
  return (
    <div style={{ padding: pad, maxWidth: '26rem' }}>
      <h1 style={{ fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 1.5rem' }}>
        {mode === 'login' ? '로그인' : '회원가입'}
      </h1>

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
