import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Grid from './GridSystem';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';


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
  const { language, toggleLanguage, t } = useLanguage();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu on resize to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: theme === 'light' ? '#1119E9' : '#333',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        opacity: 1,
        transition: 'all 0.3s ease',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 0 6px rgba(255,255,255,0.4), inset 0 0 12px rgba(255,255,255,0.15)'
      }}
      aria-label="Toggle Theme"
    >
      <div style={{
        width: '20px',
        height: '20px',
        flexShrink: 0,
        borderRadius: '50%',
        backgroundColor: 'var(--color-bg)',
        transform: theme === 'light' ? 'translateX(0)' : 'translateX(20px)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </div>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 100,
      }}>
        <Grid showLines={true} style={{ gap: 0, position: 'relative' }}>
          {/* Center vertical line */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: '1px',
              backgroundColor: 'var(--color-line)',
              pointerEvents: 'none',
              zIndex: 1,
            }} />
          )}
          {/* Logo Section */}
          <div style={{
             gridColumn: isMobile ? '1 / -1' : '1 / 5',
             padding: '1rem',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             height: 'var(--header-height)',
          }}>
            <NavLink to="/" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              <svg
                viewBox="0 0 1366 537.08"
                style={{
                  height: '28px',
                  width: 'auto',
                  display: 'block',
                  fill: 'var(--color-text)',
                  transition: 'fill 0.3s ease'
                }}
              >
                <path d="M621.71,381.21c0,41.37-33.71,73.55-73.55,73.55v70.49c79.68,0,144.04-64.36,144.04-144.04v-245.17h-70.49v245.17Z"/>
                <path d="M148.22,125.32c-73.55,0-133.31,59.76-133.31,133.31s59.76,133.31,133.31,133.31,133.31-59.76,133.31-133.31-59.76-133.31-133.31-133.31ZM148.22,321.45c-35.24,0-62.82-27.58-62.82-62.82s27.58-62.82,62.82-62.82,62.82,27.58,62.82,62.82-29.11,62.82-62.82,62.82Z"/>
                <path d="M594.13,258.63c0-73.55-59.76-133.31-133.31-133.31-32.18,0-61.29,10.73-84.28,30.65V10.39h-70.49v370.82h70.49v-19.92c22.98,18.39,52.1,30.65,84.28,30.65,73.55,0,133.31-59.76,133.31-133.31ZM397.99,258.63c0-35.24,27.58-62.82,62.82-62.82s62.82,27.58,62.82,62.82-27.58,62.82-62.82,62.82-62.82-27.58-62.82-62.82Z"/>
                <circle cx="656.95" cy="54.83" r="49.03"/>
                <polygon points="1000.19 136.04 899.06 136.04 813.25 221.85 813.25 10.39 742.76 10.39 742.76 381.21 813.25 381.21 813.25 322.99 839.3 296.94 923.57 381.21 1024.71 381.21 889.86 246.37 1000.19 136.04"/>
                <path d="M1124.31,76.28h-70.49v59.76h-41.37v70.49h41.37v98.07c0,61.29,50.57,111.86,111.86,111.86v-70.49c-22.98,0-41.37-18.39-41.37-41.37v-98.07h41.37v-70.49h-41.37v-59.76h0Z"/>
                <path d="M1351.09,206.53v-70.49h-41.37v-59.76h-70.49v59.76h-41.37v70.49h41.37v98.07c0,61.29,50.57,111.86,111.86,111.86v-70.49c-22.98,0-41.37-18.39-41.37-41.37v-98.07h41.37Z"/>
              </svg>
            </NavLink>

            {/* Mobile: hamburger + toggles */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                <ThemeToggle />
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

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav style={{
               gridColumn: '5 / 13',
               display: 'flex',
               justifyContent: 'flex-end',
               alignItems: 'center',
               padding: '0 2rem',
               height: 'var(--header-height)'
            }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <NavLink to="/menu" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.menu}</NavLink>
                <NavLink to="/music" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.music}</NavLink>
                <NavLink to="/events" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.events}</NavLink>
                <NavLink to="/shop" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.shop}</NavLink>

                <button
                  onClick={toggleLanguage}
                  style={{
                    marginLeft: '2rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    opacity: 0.8,
                    fontFamily: 'inherit'
                  }}
                >
                  {language === 'en' ? 'KR' : 'EN'}
                </button>

                <ThemeToggle />
              </div>
            </nav>
          )}
        </Grid>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && menuOpen && (
        <div className="mobile-menu-overlay" style={{ top: 'var(--header-height)' }}>
          <NavLink to="/menu" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.menu}</NavLink>
          <NavLink to="/music" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.music}</NavLink>
          <NavLink to="/events" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.events}</NavLink>
          <NavLink to="/shop" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.shop}</NavLink>
        </div>
      )}

      <main style={{ paddingTop: 'var(--header-height)', flexGrow: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer>
        <Grid showLines={false}>
          {/* Column 1: Logo */}
          <div style={{
            gridColumn: isMobile ? '1 / -1' : '1 / 5',
            padding: isMobile ? '2rem 1rem 0' : '1.5rem 1rem 4rem',
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
                marginBottom: '1rem' // Added margin to space copyright
              }}
            >
              <path d="M397.28,365.98l-1.08,1.61c-10.74,16.05-36.45,25.64-68.79,25.64-25.48,0-49.29-7.51-60.66-19.14-3.63-3.7-5.43-7.32-5.36-10.75.19-8.3,5.24-13.89,7.86-16.24,17.29,9.26,37.24,14.15,57.78,14.15,12.46,0,74.61-1.64,74.61-34s-62.15-34-74.61-34c-20.65,0-40.59,4.88-57.77,14.14-2.62-2.39-7.68-8.05-7.86-16.23-.07-3.44,1.73-7.06,5.36-10.75,11.37-11.63,35.18-19.15,60.66-19.15,32.37,0,58.08,9.58,68.79,25.64l1.07,1.61,27.32-18.24-1.08-1.61c-8.11-12.09-33.7-40.23-96.1-40.23-34.9,0-66.34,10.84-84.11,29-9.93,10.1-15.03,22-14.75,34.42.33,16.76,8.54,28.93,14.18,35.35-5.62,6.4-13.8,18.55-14.18,35.35-.24,12.39,4.86,24.29,14.75,34.42,17.81,18.17,49.25,29.01,84.11,29.01,62.29,0,87.95-28.08,96.09-40.15l1.09-1.61-27.32-18.24ZM302.75,327.24c7.74-2.05,15.9-3.09,24.29-3.09,13.03,0,23.67,1.35,31.45,3.09-7.77,1.74-18.45,3.09-31.45,3.09-8.39,0-16.55-1.04-24.29-3.09Z"/>
              <path d="M104.26,3.94c-54.51,0-98.86,44.35-98.86,98.86,0,54.51,44.35,98.86,98.86,98.86,54.51,0,98.86-44.35,98.86-98.86S158.77,3.94,104.26,3.94ZM170.28,102.8c0,36.41-29.62,66.02-66.02,66.02-36.4,0-66.02-29.62-66.02-66.02,0-36.41,29.62-66.02,66.02-66.02,36.41,0,66.02,29.62,66.02,66.02Z"/>
              <path d="M104.26,228.34c-54.51,0-98.86,44.35-98.86,98.86,0,54.51,44.35,98.86,98.86,98.86,54.51,0,98.86-44.35,98.86-98.86s-44.35-98.86-98.86-98.86ZM170.28,327.2c0,36.4-29.62,66.02-66.02,66.02-36.4,0-66.02-29.62-66.02-66.02,0-36.41,29.62-66.02,66.02-66.02,36.41,0,66.02,29.62,66.02,66.02Z"/>
              <path d="M388.15,11.79v58.15c-38.1-19.35-85.01-19.35-123.11-.02V11.79s-32.84,0-32.84,0v182.1s32.84,0,32.84,0v-6.89c18.58,9.45,39.62,14.51,61.54,14.51,21.94,0,42.99-5.06,61.58-14.51v6.89h32.84s0-182.1,0-182.1h-32.84ZM265.04,108.64c35.33-27.45,87.78-27.45,123.11,0v39.61c-35.33,27.45-87.79,27.44-123.11,0v-39.6Z"/>
            </svg>
            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
              {t.footer.copyright}
            </div>
          </div>

          {/* Column 2: Contact & Socials */}
          <div style={{
            gridColumn: isMobile ? '1 / -1' : '5 / 9',
            padding: isMobile ? '2rem 1rem 0' : '1.5rem 1rem 4rem',
            borderTop: !isMobile ? '1px solid var(--color-line)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>{t.footer.contact.label}</div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                <a href={`mailto:${t.footer.contact.email}`} style={{ color: 'inherit', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                  {t.footer.contact.email}
                </a>
                <div style={{ opacity: 0.6, marginBottom: '0.5rem' }}>
                  Seoul, Jung-gu, Myeongdong 8ga-gil, 58 4F
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <a href="https://www.instagram.com/objktt.recordbar" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', outline: 'none' }}>
                    Instagram
                  </a>
                  <a href="https://soundcloud.com/objktt_recordbar" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', outline: 'none' }}>
                    SoundCloud
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Hours Only */}
          <div style={{
             gridColumn: isMobile ? '1 / -1' : '9 / 13',
             padding: isMobile ? '2rem 1rem 2rem' : '1.5rem 1rem 4rem',
             borderTop: !isMobile ? '1px solid var(--color-line)' : 'none',
             display: 'flex',
             flexDirection: 'column',
             justifyContent: 'space-between'
          }}>
            <div style={{ marginBottom: isMobile ? '2rem' : '0' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>{t.footer.hours.label}</div>
              <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {t.footer.hours.value}
              </div>
            </div>
          </div>
        </Grid>
      </footer>
    </div>
  );
};

export default Layout;
