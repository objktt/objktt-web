import React, { useState } from 'react';

interface Props {
  source: 'newsletter' | 'restock';
  productHandle?: string;
  productTitle?: string;
  placeholder?: string;
  buttonLabel?: string;
  successLabel?: string;
}

type Status = 'idle' | 'loading' | 'ok' | 'error';

const EmailSignup: React.FC<Props> = ({
  source,
  productHandle,
  productTitle,
  placeholder = '이메일 주소',
  buttonLabel = '구독',
  successLabel = '구독 완료 ✓',
}) => {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading' || status === 'ok') return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, productHandle, productTitle, honeypot }),
      });
      setStatus(r.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'ok') {
    return (
      <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{successLabel}</div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.6rem 0.75rem',
            fontSize: '0.85rem',
            background: 'transparent',
            border: '1px solid var(--color-line)',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {/* Honeypot — hidden from humans */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.6rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            border: '1px solid var(--color-text)',
            cursor: status === 'loading' ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: status === 'loading' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? '…' : buttonLabel}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ fontSize: '0.75rem', color: '#c33' }}>
          다시 시도해 주세요.
        </div>
      )}
    </form>
  );
};

export default EmailSignup;
