import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Grid from './GridSystem';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
        opacity: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer'
      }}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      )}
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
        <Grid showLines={true}>
          {/* Logo Section */}
          <div style={{
             gridColumn: isMobile ? '1 / -1' : '1 / 5',
             padding: '1rem',
             display: 'flex',
             alignItems: 'center',
             justifyContent: isMobile ? 'space-between' : 'flex-start',
             height: 'var(--header-height)'
          }}>
            <NavLink to="/" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              <svg
                viewBox="540 240 320 300"
                style={{
                  height: '40px',
                  width: 'auto',
                  display: 'block',
                  fill: 'var(--color-text)',
                  transition: 'fill 0.3s ease'
                }}
              >
                <path d="M806.91,487.13l-.73,1.09c-7.3,10.91-24.78,17.43-46.76,17.43-17.32,0-33.5-5.11-41.23-13.01-2.47-2.52-3.69-4.97-3.65-7.3.13-5.64,3.56-9.44,5.34-11.04,11.75,6.29,25.31,9.62,39.28,9.62,8.47,0,50.72-1.11,50.72-23.11,0-22-42.25-23.11-50.72-23.11-14.03,0-27.59,3.32-39.27,9.61-1.78-1.63-5.22-5.47-5.35-11.03-.05-2.34,1.18-4.8,3.65-7.31,7.73-7.91,23.91-13.02,41.23-13.02,22,0,39.48,6.51,46.76,17.43l.73,1.09,18.57-12.4-.73-1.09c-5.51-8.22-22.91-27.35-65.33-27.35-23.72,0-45.1,7.37-57.18,19.72-6.75,6.86-10.22,14.96-10.03,23.4.23,11.39,5.8,19.67,9.64,24.03-3.82,4.35-9.38,12.61-9.64,24.03-.16,8.42,3.3,16.51,10.02,23.4,12.11,12.35,33.48,19.72,57.18,19.72,42.34,0,59.79-19.09,65.32-27.29l.74-1.09-18.57-12.4ZM742.65,460.8c5.26-1.39,10.81-2.1,16.51-2.1,8.86,0,16.09.92,21.38,2.1-5.28,1.18-12.54,2.1-21.38,2.1-5.71,0-11.25-.71-16.51-2.1Z"/>
                <path d="M607.72,241.03c-37.06,0-67.2,30.15-67.2,67.2,0,37.06,30.15,67.2,67.2,67.2,37.06,0,67.2-30.15,67.2-67.2,0-37.06-30.15-67.2-67.2-67.2ZM652.6,308.23c0,24.75-20.13,44.88-44.88,44.88-24.75,0-44.88-20.13-44.88-44.88,0-24.75,20.13-44.88,44.88-44.88,24.75,0,44.88,20.13,44.88,44.88Z"/>
                <path d="M607.72,393.57c-37.06,0-67.2,30.15-67.2,67.2s30.15,67.2,67.2,67.2c37.06,0,67.2-30.15,67.2-67.2,0-37.06-30.15-67.2-67.2-67.2ZM652.6,460.77c0,24.75-20.13,44.88-44.88,44.88-24.75,0-44.88-20.13-44.88-44.88,0-24.75,20.13-44.88,44.88-44.88,24.75,0,44.88,20.13-44.88,44.88Z"/>
                <path d="M800.7,246.36v39.53c-25.9-13.15-57.79-13.16-83.69-.01v-39.52s-22.32,0-22.32,0v123.78s22.32,0,22.32,0v-4.68c12.63,6.42,26.93,9.86,41.83,9.86,14.91,0,29.22-3.44,41.86-9.86v4.68h22.32s0-123.78,0-123.78h-22.32ZM717.02,312.2c24.02-18.66,59.67-18.66,83.69,0v26.92c-24.02,18.66-59.67,18.66-83.69,0v-26.92Z"/>
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
                <NavLink to="/" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.index}</NavLink>
                <NavLink to="/about" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.about}</NavLink>
                <NavLink to="/events" className={({ isActive }) => isActive ? "active-link" : ""} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.nav.events}</NavLink>

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
          <NavLink to="/" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.index}</NavLink>
          <NavLink to="/about" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.about}</NavLink>
          <NavLink to="/events" onClick={() => setMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: 500 }}>{t.nav.events}</NavLink>
        </div>
      )}

      <main style={{ paddingTop: 'var(--header-height)', flexGrow: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer>
        <Grid showLines={false}>
           <div style={{ gridColumn: '1 / 9', padding: isMobile ? '1rem 0 0.25rem' : '2rem', fontSize: '0.75rem', opacity: 0.5 }}>
              {t.footer.copyright}
           </div>
           <div style={{ gridColumn: isMobile ? '1 / -1' : '9 / 13', padding: isMobile ? '0 0 0.75rem' : '2rem', fontSize: '0.75rem', textAlign: isMobile ? 'left' : 'right' }}>
              <a href="https://www.instagram.com/objktt.recordbar" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.5, transition: 'opacity 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.opacity = '1'} onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}>
                Instagram
              </a>
              <span style={{ margin: '0 1rem', opacity: 0.3 }}>/</span>
              <a href="https://soundcloud.com/objktt_recordbar" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.5, transition: 'opacity 0.2s', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.opacity = '1'} onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}>
                SoundCloud
              </a>
           </div>
        </Grid>
      </footer>
    </div>
  );
};

export default Layout;
