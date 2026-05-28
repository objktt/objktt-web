import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const formatPrice = (amount: string, currency: string) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  if (currency === 'KRW') return `₩${n.toLocaleString('ko-KR')}`;
  return `${currency} ${n.toLocaleString()}`;
};

const CartDrawer: React.FC = () => {
  const { cart, isOpen, close, updateQty, removeLine, checkout, loading } = useCart();
  const { isMobile } = useBreakpoint();

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const lines = cart?.lines ?? [];
  const isEmpty = lines.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: isMobile ? 'stretch' : 'flex-end',
        alignItems: isMobile ? 'flex-end' : 'stretch',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'objktt-fade-in 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          width: isMobile ? '100%' : 'min(440px, 92vw)',
          height: isMobile ? '88vh' : '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderTop: isMobile ? '1px solid var(--color-line)' : 'none',
          borderLeft: !isMobile ? '1px solid var(--color-line)' : 'none',
          boxShadow: isMobile
            ? '0 -8px 24px rgba(0,0,0,0.12)'
            : '-8px 0 24px rgba(0,0,0,0.12)',
          animation: isMobile
            ? 'objktt-slide-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
            : 'objktt-slide-left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0.01em' }}>
            Cart {cart && cart.totalQuantity > 0 ? `(${cart.totalQuantity})` : ''}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              width: 32, height: 32, padding: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isEmpty ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              opacity: 0.55,
              fontSize: '0.95rem',
            }}>
              <div>Your cart is empty.</div>
              <Link
                to="/shop"
                onClick={close}
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '0.6rem 1rem',
                  border: '1px solid var(--color-line)',
                  color: 'inherit',
                }}
              >
                Browse Shop →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {lines.map((line) => (
                <CartLineRow
                  key={line.id}
                  line={line}
                  onIncrement={() => updateQty(line.id, line.quantity + 1)}
                  onDecrement={() => {
                    if (line.quantity <= 1) removeLine(line.id);
                    else updateQty(line.id, line.quantity - 1);
                  }}
                  onRemove={() => removeLine(line.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && cart && (
          <div
            style={{
              padding: '1rem 1.5rem 1.25rem',
              borderTop: '1px solid var(--color-line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                opacity: 0.5,
              }}>Subtotal</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                {formatPrice(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}
              </span>
            </div>
            <button
              type="button"
              onClick={checkout}
              disabled={loading}
              style={{
                padding: '0.95rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                border: '1px solid var(--color-text)',
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Loading…' : 'Checkout →'}
            </button>
            <div style={{ fontSize: '0.7rem', opacity: 0.45, textAlign: 'center' }}>
              Secure checkout powered by Shopify.
            </div>
          </div>
        )}

        <style>{`
          @keyframes objktt-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes objktt-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes objktt-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>
      </div>
    </div>
  );
};

const CartLineRow: React.FC<{
  line: import('../lib/cart').CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}> = ({ line, onIncrement, onDecrement, onRemove }) => {
  const img = line.merchandise.image || line.merchandise.product.featuredImage;
  const productTitle = line.merchandise.product.title;
  const variantTitle = line.merchandise.title;
  const showVariant = variantTitle && variantTitle.toLowerCase() !== 'default title';

  return (
    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
      <div
        style={{
          width: 72,
          height: 72,
          flexShrink: 0,
          backgroundColor: 'var(--color-line)',
          overflow: 'hidden',
        }}
      >
        {img ? (
          <img
            src={img.url}
            alt={img.altText ?? productTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.3 }}>{productTitle}</div>
        {showVariant && (
          <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>{variantTitle}</div>
        )}
        <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>
          {formatPrice(line.cost.totalAmount.amount, line.cost.totalAmount.currencyCode)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
          <QtyButton aria-label="Decrease" onClick={onDecrement}>−</QtyButton>
          <span style={{ minWidth: 22, textAlign: 'center', fontSize: '0.85rem' }}>{line.quantity}</span>
          <QtyButton aria-label="Increase" onClick={onIncrement}>+</QtyButton>
          <button
            type="button"
            onClick={onRemove}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.5,
              color: 'var(--color-text)',
              padding: '0.25rem 0.4rem',
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const QtyButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => (
  <button
    type="button"
    {...rest}
    style={{
      width: 24, height: 24,
      border: '1px solid var(--color-line)',
      background: 'transparent',
      color: 'var(--color-text)',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '0.85rem',
      lineHeight: 1,
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </button>
);

const CloseIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="3" x2="13" y2="13" />
    <line x1="13" y1="3" x2="3" y2="13" />
  </svg>
);

export default CartDrawer;
