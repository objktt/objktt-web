import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Grid from './GridSystem';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import CartDrawer from './CartDrawer';
import EmailSignup from './EmailSignup';
import { BUSINESS } from '../data/business';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  // Top announcement banner — dismissible, persisted. Bump the version suffix to
  // re-show a new announcement to everyone.
  const BANNER_KEY = 'objktt-banner-shop-open';
  const [bannerOpen, setBannerOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(BANNER_KEY) !== 'dismissed';
  });
  const dismissBanner = () => {
    setBannerOpen(false);
    try { localStorage.setItem(BANNER_KEY, 'dismissed'); } catch { /* ignore */ }
  };
  const BANNER_H = 38;
  const { language, toggleLanguage, t } = useLanguage();
  const { isMobile } = useBreakpoint();
  const { cart, open: openCart } = useCart();
  const { isLoggedIn } = useAuth();
  const cartCount = cart?.totalQuantity ?? 0;

  // Header has its own full-width background; cells stay transparent over it.
  const headerCellBg = 'transparent';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu on resize to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top announcement banner */}
      {bannerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: BANNER_H,
            zIndex: 101,
            backgroundColor: '#000',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NavLink
            to="/shop"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: isMobile ? '0.78rem' : '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
              padding: '0 2.5rem',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {language === 'ko'
              ? '🎉 오브옉트 레코드샵이 오픈했습니다. 온라인 및 오프라인에서 동시 구입 가능합니다. →'
              : '🎉 Objktt Record Shop is now open — shop online & in store. →'}
          </NavLink>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label={language === 'ko' ? '배너 닫기' : 'Dismiss'}
            style={{
              position: 'absolute',
              right: isMobile ? '0.75rem' : '1.25rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              opacity: 0.85,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>
      )}

      <header style={{
        position: 'fixed',
        top: bannerOpen ? BANNER_H : 0,
        left: 0,
        width: '100%',
        zIndex: 100,
        backgroundColor: 'var(--color-bg)',
        transition: 'background-color 0.3s ease',
      }}>
        <Grid showLines={false} style={{
          gap: 0,
          position: 'relative',
          margin: isMobile ? '0 1.5rem' : '0 4rem',
          width: isMobile ? 'calc(100% - 3rem)' : 'calc(100% - 8rem)',
          borderBottom: '1px solid var(--color-line)',
        }}>

          {/* Logo Section */}
          <div style={{
             gridColumn: isMobile ? '1 / -1' : '1 / 4',
             padding: '1rem',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             height: 'var(--header-height)',
             backgroundColor: headerCellBg, transition: 'background-color 0.3s ease',
          }}>
            <NavLink to="/" aria-label="Objktt home">
              <img
                src="/objktt-logo.png"
                alt="Objktt"
                className="header-logo"
                style={{ height: '26px', width: 'auto', display: 'block' }}
              />
            </NavLink>

            {/* Mobile: hamburger + toggles */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {(cartCount > 0 || isLoggedIn) && <CartButton count={cartCount} onClick={openCart} />}
                <button
                  onClick={toggleLanguage}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    opacity: 0.8,
                    fontFamily: 'inherit'
                  }}
                >
                  {language === 'en' ? 'KR' : 'EN'}
                </button>
                <AnimatedThemeToggler sound={true} />
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '5px',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'var(--color-text)',
                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                    transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
                  }} />
                  <span style={{
                    display: 'block',
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'var(--color-text)',
                    transition: 'opacity 0.3s ease',
                    opacity: menuOpen ? 0 : 1,
                  }} />
                  <span style={{
                    display: 'block',
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'var(--color-text)',
                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                    transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
                  }} />
                </button>
              </div>
            )}

          </div>

          {/* Desktop: centered menu (grid cell 4/10 → masks the grid background, centered) */}
          {!isMobile && (
            <nav style={{
              gridColumn: '4 / 10',
              height: 'var(--header-height)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.75rem',
              backgroundColor: headerCellBg, transition: 'background-color 0.3s ease',
            }}>
              <NavLink to="/about" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.about}</NavLink>
              <NavLink to="/menu" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.menu}</NavLink>
              <NavLink to="/music" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.music}</NavLink>
              {/* Events 카테고리 임시 숨김 */}
              {/* <NavLink to="/events" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.events}</NavLink> */}
              <NavLink to="/shop" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.shop}</NavLink>
            </nav>
          )}

          {/* Desktop: right utilities — account · cart · language · theme (same depth) */}
          {!isMobile && (
            <div style={{
              gridColumn: '10 / 13',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '0 2rem',
              height: 'var(--header-height)',
              backgroundColor: headerCellBg, transition: 'background-color 0.3s ease',
            }}>
              <NavLink
                to="/account"
                className={({ isActive }) => isActive ? "active-link" : ""}
                style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.85 }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
              >
                {isLoggedIn ? t.nav.myPage : t.nav.login}
              </NavLink>

              {(cartCount > 0 || isLoggedIn) && <CartButton count={cartCount} onClick={openCart} />}

              <button
                onClick={toggleLanguage}
                aria-label="Toggle language"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  opacity: 0.85,
                  fontFamily: 'inherit',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
              >
                {language === 'en' ? 'KR' : 'EN'}
              </button>

              <AnimatedThemeToggler sound={true} />
            </div>
          )}
        </Grid>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && menuOpen && (
        <div className="mobile-menu-overlay" style={{ top: `calc(var(--header-height) + ${bannerOpen ? BANNER_H : 0}px)` }}>
          <NavLink to="/about" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.about}</NavLink>
          <NavLink to="/menu" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.menu}</NavLink>
          <NavLink to="/music" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.music}</NavLink>
          {/* Events 카테고리 임시 숨김 */}
          {/* <NavLink to="/events" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.events}</NavLink> */}
          <NavLink to="/shop" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.shop}</NavLink>
          <NavLink to="/account" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{isLoggedIn ? t.nav.myPage : t.nav.login}</NavLink>
        </div>
      )}

      <main style={{ paddingTop: `calc(var(--header-height) + ${bannerOpen ? BANNER_H : 0}px)`, flexGrow: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer>
        <Grid showLines={false} style={{ margin: isMobile ? '0 1.5rem' : '0 4rem', width: isMobile ? 'calc(100% - 3rem)' : 'calc(100% - 8rem)' }}>
          {/* Column 1: Brand */}
          <div style={{
            gridColumn: isMobile ? '1 / -1' : '1 / 5',
            padding: isMobile ? '2.5rem 1rem 0.5rem' : '2.75rem 1rem 2.75rem',
            borderTop: '1px solid var(--color-line)'
          }}>
            <svg
              viewBox="0 0 430 430"
              style={{
                height: '48px',
                width: 'auto',
                display: 'block',
                fill: 'var(--color-text)',
                opacity: 0.8,
                transition: 'fill 0.3s ease',
                marginBottom: '1rem'
              }}
            >
              <path d="M397.28,365.98l-1.08,1.61c-10.74,16.05-36.45,25.64-68.79,25.64-25.48,0-49.29-7.51-60.66-19.14-3.63-3.7-5.43-7.32-5.36-10.75.19-8.3,5.24-13.89,7.86-16.24,17.29,9.26,37.24,14.15,57.78,14.15,12.46,0,74.61-1.64,74.61-34s-62.15-34-74.61-34c-20.65,0-40.59,4.88-57.77,14.14-2.62-2.39-7.68-8.05-7.86-16.23-.07-3.44,1.73-7.06,5.36-10.75,11.37-11.63,35.18-19.15,60.66-19.15,32.37,0,58.08,9.58,68.79,25.64l1.07,1.61,27.32-18.24-1.08-1.61c-8.11-12.09-33.7-40.23-96.1-40.23-34.9,0-66.34,10.84-84.11,29-9.93,10.1-15.03,22-14.75,34.42.33,16.76,8.54,28.93,14.18,35.35-5.62,6.4-13.8,18.55-14.18,35.35-.24,12.39,4.86,24.29,14.75,34.42,17.81,18.17,49.25,29.01,84.11,29.01,62.29,0,87.95-28.08,96.09-40.15l1.09-1.61-27.32-18.24ZM302.75,327.24c7.74-2.05,15.9-3.09,24.29-3.09,13.03,0,23.67,1.35,31.45,3.09-7.77,1.74-18.45,3.09-31.45,3.09-8.39,0-16.55-1.04-24.29-3.09Z"/>
              <path d="M104.26,3.94c-54.51,0-98.86,44.35-98.86,98.86,0,54.51,44.35,98.86,98.86,98.86,54.51,0,98.86-44.35,98.86-98.86S158.77,3.94,104.26,3.94ZM170.28,102.8c0,36.41-29.62,66.02-66.02,66.02-36.4,0-66.02-29.62-66.02-66.02,0-36.41,29.62-66.02,66.02-66.02,36.41,0,66.02,29.62,66.02,66.02Z"/>
              <path d="M104.26,228.34c-54.51,0-98.86,44.35-98.86,98.86,0,54.51,44.35,98.86,98.86,98.86,54.51,0,98.86-44.35,98.86-98.86s-44.35-98.86-98.86-98.86ZM170.28,327.2c0,36.4-29.62,66.02-66.02,66.02-36.4,0-66.02-29.62-66.02-66.02,0-36.41,29.62-66.02,66.02-66.02,36.41,0,66.02,29.62,66.02,66.02Z"/>
              <path d="M388.15,11.79v58.15c-38.1-19.35-85.01-19.35-123.11-.02V11.79s-32.84,0-32.84,0v182.1s32.84,0,32.84,0v-6.89c18.58,9.45,39.62,14.51,61.54,14.51,21.94,0,42.99-5.06,61.58-14.51v6.89h32.84s0-182.1,0-182.1h-32.84ZM265.04,108.64c35.33-27.45,87.78-27.45,123.11,0v39.61c-35.33,27.45-87.79,27.44-123.11,0v-39.6Z"/>
            </svg>
            <div style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: 1.6, maxWidth: '15rem', whiteSpace: 'pre-line' }}>
              {t.footer.tagline}
            </div>
          </div>

          {/* Column 2: Contact */}
          <div style={{
            gridColumn: isMobile ? '1 / -1' : '5 / 9',
            padding: isMobile ? '2.5rem 1rem 0.5rem' : '2.75rem 1rem 2.75rem',
            borderTop: !isMobile ? '1px solid var(--color-line)' : 'none',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.9rem' }}>
              {t.footer.contactLabel}
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 2 }}>
              <a href={`tel:${BUSINESS.phone.replace(/-/g, '')}`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                {BUSINESS.phone}
                <span style={{ opacity: 0.55, marginLeft: '0.4rem', fontSize: '0.8125rem' }}>
                  ({language === 'ko' ? '상담 12:00–18:00' : 'Calls 12:00–18:00'})
                </span>
              </a>
              <a href={`mailto:${BUSINESS.email}`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                {BUSINESS.email}
              </a>
              <a href={BUSINESS.kakaoChatUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                {t.footer.kakao}
              </a>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, margin: '1.75rem 0 0.9rem' }}>
              {t.footer.followLabel}
            </div>
            <div style={{ display: 'flex', gap: '1.1rem', fontSize: '0.875rem' }}>
              <a href="https://www.instagram.com/objktt.recordbar" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>Instagram</a>
              <a href="https://soundcloud.com/objktt_recordbar" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>SoundCloud</a>
            </div>
          </div>

          {/* Column 3: Newsletter */}
          <div style={{
             gridColumn: isMobile ? '1 / -1' : '9 / 13',
             padding: isMobile ? '2.5rem 1rem 1rem' : '2.75rem 1rem 2.75rem',
             borderTop: !isMobile ? '1px solid var(--color-line)' : 'none',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.9rem' }}>
              {t.footer.newsletterLabel}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.6, lineHeight: 1.5, marginBottom: '1rem' }}>
              {t.footer.newsletterDesc}
            </div>
            <EmailSignup
              source="newsletter"
              placeholder={t.footer.newsletterPlaceholder}
              buttonLabel={t.footer.newsletterBtn}
              successLabel={t.footer.newsletterSuccess}
            />
          </div>

          {/* Bottom bar: legal links · business info · copyright */}
          <div style={{
            gridColumn: '1 / -1',
            borderTop: '1px solid var(--color-line)',
            padding: isMobile ? '1.5rem 1rem 2.5rem' : '1.5rem 1rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              <NavLink to="/notices" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.notices}</NavLink>
              <NavLink to="/faq" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.faq}</NavLink>
              <NavLink to="/terms" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.terms}</NavLink>
              <NavLink to="/refund" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.refund}</NavLink>
              <NavLink to="/points" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.points}</NavLink>
              <NavLink to="/privacy" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>{t.footer.links.privacy}</NavLink>
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.8 }}>
              {language === 'ko' ? BUSINESS.companyName : BUSINESS.companyNameEn} ({language === 'ko' ? BUSINESS.brandName : BUSINESS.brandNameEn}) · {t.footer.bizRep} {language === 'ko' ? BUSINESS.representative : BUSINESS.representativeEn} · {t.footer.bizReg} {BUSINESS.registrationNumber} · {t.footer.bizMailOrder} {BUSINESS.mailOrderNumber}
              <br />
              {language === 'ko' ? BUSINESS.address : BUSINESS.addressEn} · {t.footer.hoursLabel} {t.footer.hoursValue} · {language === 'ko' ? '전화' : 'Tel'} {BUSINESS.phone} {language === 'ko' ? '(상담 12:00–18:00)' : '(calls 12:00–18:00)'}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.45 }}>{t.footer.copyright}</div>
          </div>
        </Grid>
      </footer>

      <CartDrawer />
    </div>
  );
};

const CartButton: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Open cart${count > 0 ? ` (${count} item${count === 1 ? '' : 's'})` : ''}`}
    style={{
      position: 'relative',
      width: 36,
      height: 36,
      padding: 0,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text)',
      opacity: 0.85,
      transition: 'opacity 0.2s ease',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 7h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
    {count > 0 && (
      <span
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          minWidth: 16,
          height: 16,
          padding: '0 4px',
          borderRadius: 8,
          background: 'var(--color-accent)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {count > 99 ? '99+' : count}
      </span>
    )}
  </button>
);

export default Layout;
