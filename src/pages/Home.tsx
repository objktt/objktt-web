import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroScene from '../components/HeroScene';
// import HeroParallaxImages from '../components/HeroParallaxImages'; // hidden per request
import { TextRevealByWord } from '../components/ui/TextReveal';
import { getProductsByCategory } from '../lib/getProducts';
import type { VinylRecord } from '../types/shopify';

import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Home: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [shopProducts, setShopProducts] = useState<VinylRecord[]>([]);

  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    let cancelled = false;
    getProductsByCategory('records')
      .then((data) => { if (!cancelled) setShopProducts(data.slice(0, 12)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const formatKRW = (amount: string) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    return `₩${n.toLocaleString('ko-KR')}`;
  };

  const stickyBar: React.CSSProperties = {
    position: 'sticky',
    top: 'var(--header-height)',
    zIndex: 50,
    backgroundColor: 'var(--color-bg)',
  };

  const stickyInner: React.CSSProperties = {
    width: 'calc(100% - 4rem)',
    margin: '0 2rem',
    padding: isMobile ? '0.625rem 0' : '0.625rem 2rem',
    borderBottom: '1px solid var(--color-line)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
  };

  return (
    <div style={{ padding: 0, position: 'relative' }}>
      {/* ─── Hero Section: Welcome copy (top-left, scroll-revealed) + Blue dot (bottom-right) ─── */}
      <TextRevealByWord
        text="Welcome to Objktt, a cozy sanctuary for global grooves and curated records. Tucked away like a small ‘Blue Dot,’ we bring together the healing power of music and beautifully designed objects."
        height="200vh"
        style={{ backgroundColor: 'var(--color-bg)' }}
        innerStyle={{
          top: 0,
          height: '100vh',
          width: '100%',
          backgroundColor: 'var(--color-bg)',
        }}
        textStyle={{
          position: 'absolute',
          top: isMobile ? 'calc(var(--header-height) + 2.5rem)' : 'calc(var(--header-height) + 3.5rem)',
          left: isMobile ? '1.5rem' : '4rem',
          width: isMobile ? 'calc(100% - 3rem)' : '60%',
          maxWidth: 'none',
          zIndex: 2,
          fontSize: isMobile ? '1.625rem' : '2rem',
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
          textAlign: 'left',
        }}
      >
        {/* Parallax background images — hidden per request (re-enable to restore) */}
        {/* <HeroParallaxImages isMobile={isMobile} /> */}

        {/* Bottom-right scene (half size) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: isMobile ? '100%' : '50%',
          height: isMobile ? '55%' : '60%',
          zIndex: 1,
        }}>
          <HeroScene />
        </div>

        {/* Carl Sagan attribution — aligned with the blue dot's bottom edge */}
        <div style={{
          position: 'absolute',
          bottom: isMobile ? '14%' : '12%',
          right: isMobile ? '1.25rem' : '2rem',
          zIndex: 2,
          pointerEvents: 'none',
          fontSize: isMobile ? '10px' : '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text)',
          opacity: 0.55,
        }}>
          — Carl Sagan
        </div>
      </TextRevealByWord>

      {/* ─── Shop Section ─── */}
      {shopProducts.length > 0 && (
        <section style={{ position: 'relative' }}>
          <div style={stickyBar}>
            <div style={{
              ...stickyInner,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ opacity: 0.5 }}>{t.home.stickyShop}</span>
              <Link to="/shop" style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                opacity: 0.5,
                letterSpacing: '0.05em',
                transition: 'opacity 0.2s ease',
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                {t.home.viewAll}
              </Link>
            </div>
          </div>

          <div style={{
            padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          }}>
            <h2 style={{
              fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: isMobile ? '-0.03em' : '-0.04em',
              margin: 0,
              whiteSpace: 'pre-line',
            }}>
              {t.home.shopTitle}
            </h2>
          </div>

          <div style={{
            padding: isMobile ? '0 1.5rem' : '0 4rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '1.25rem' : '2rem',
          }}>
            {shopProducts.map((p) => {
              const variant = p.variants[0];
              const soldOut = variant ? !variant.availableForSale : false;
              return (
                <Link
                  key={p.id}
                  to={`/shop/${p.handle}`}
                  onMouseEnter={() => setActiveItem(p.id)}
                  onMouseLeave={() => setActiveItem(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    textDecoration: 'none',
                    color: 'inherit',
                    opacity: soldOut ? 0.45 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    backgroundColor: 'var(--color-line)',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '0.75rem',
                  }}>
                    {p.featuredImage ? (
                      <img
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText ?? p.title}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transform: activeItem === p.id ? 'scale(1.03)' : 'scale(1)',
                          transition: 'transform 0.4s ease',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        opacity: 0.4,
                      }}>No image</div>
                    )}
                    {soldOut && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-line)',
                      }}>Sold</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {p.artist && (
                      <div style={{ fontSize: '0.75rem', letterSpacing: '0.05em', opacity: 0.55 }}>
                        {p.artist}
                      </div>
                    )}
                    <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.3 }}>
                      {p.title}
                    </div>
                    {variant && (
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.35rem' }}>
                        {formatKRW(variant.price.amount)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ height: isMobile ? '3rem' : '4rem' }} />
        </section>
      )}

      {/* ─── Map Section ─── */}
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyLocation}</span></div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1.5rem' : '2rem',
          alignItems: 'flex-end',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
            width: isMobile ? '100%' : '50%',
            flexShrink: 0,
          }}>
            We Are<br />Here
          </h2>
          <p style={{
            fontSize: '0.9375rem',
            lineHeight: 1.3,
            opacity: 0.5,
            margin: 0,
          }}>
            {t.home.locationDesc.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < t.home.locationDesc.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        </div>

        <div style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
        }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.915729994784!2d126.9856344!3d37.5617842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca3e87dec1ac5%3A0xe8e28d09b3cb5c03!2z7Jik67iM6KCc7Yq4IOugiOy9lOuTnOuwlCAvIE9iamt0dCBSZWNvcmQgQmFy!5e0!3m2!1sen!2skr!4v1709650000000!5m2!1sen!2skr"
            width="100%"
            height={isMobile ? '400' : '560'}
            style={{ border: 0, display: 'block' }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Directions */}
        <div style={{
          padding: isMobile ? '2rem 1.5rem 3rem' : '3rem 4rem 4rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '2rem' : '4rem',
        }}>
          {/* Public Transit */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Public Transit
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              {t.home.transitDesc.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < t.home.transitDesc.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>

          {/* Parking */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Parking
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              {t.home.parkingDesc.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < t.home.parkingDesc.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>

      </section>

      {/* ─── Contact Section ─── */}
      <section style={{ position: 'relative' }}>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>{t.home.stickyContact}</span></div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            Get In<br />Touch
          </h2>
        </div>

        {/* Contact Form */}
        <div style={{
          padding: isMobile ? '2rem 1.5rem 6rem' : '3rem 4rem 8rem',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '2rem' : '4rem',
        }}>
          <div style={{ flex: 1, pointerEvents: 'auto' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              {t.home.contactLabel}
            </div>
            <form ref={formRef} onSubmit={async (e) => {
              e.preventDefault();
              setFormStatus('sending');
              try {
                const r = await fetch('/api/contact', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(formData),
                });
                if (!r.ok) throw new Error('send failed');
                setFormStatus('success');
                setFormData({ name: '', email: '', message: '' });
              } catch {
                setFormStatus('error');
              }
            }}>
              <input
                type="text"
                name="name"
                placeholder={t.contact.name}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  marginBottom: '1rem',
                }}
              />
              <input
                type="email"
                name="email"
                placeholder={t.contact.email}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  marginBottom: '1rem',
                }}
              />
              <textarea
                name="message"
                placeholder={t.contact.message}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-line)',
                  padding: '0.75rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: 0,
                  minHeight: '100px',
                  resize: 'vertical',
                  marginBottom: '1.5rem',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={formStatus === 'sending' || formStatus === 'success'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    cursor: formStatus === 'sending' ? 'wait' : 'pointer',
                    color: 'var(--color-text)',
                    opacity: formStatus === 'sending' ? 0.5 : 1,
                  }}
                >
                  {formStatus === 'sending' ? t.contact.sending : t.contact.send} →
                </button>
                {formStatus === 'success' && <span style={{ fontSize: '0.875rem', opacity: 0.6 }}>{t.contact.success}</span>}
                {formStatus === 'error' && <span style={{ fontSize: '0.875rem', color: 'red' }}>{t.contact.error}</span>}
              </div>
            </form>
          </div>

          <div style={{ flex: 1, pointerEvents: 'auto' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '0.75rem',
            }}>
              Email
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, opacity: 0.8 }}>
              hello@objktt.kr
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
