import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import Grid from '../components/GridSystem';
import AboutSection from '../components/AboutSection';
import ScrollPath from '../components/ScrollPath';
import { events } from '../data/events';

import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Home: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parseDate = (s: string) => { const [y, m, d] = s.split('.').map(Number); return new Date(y, m - 1, d); };
  const upcomingEvents = events
    .filter(e => parseDate(e.date) >= today)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, 5);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatDate = (s: string) => { const d = parseDate(s); return `${s} (${days[d.getDay()]})`; };

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
      <ScrollPath />
      {/* ─── Hero Section ─── */}
      <section>
        <Grid showLines={true}>
          <div style={{
              gridColumn: '1 / 13',
              minHeight: isMobile ? '55vh' : '65vh',
              padding: isMobile ? '6rem 1.5rem 3rem' : '8rem 2rem 4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
              position: 'relative',
              zIndex: 1,
              backgroundColor: 'var(--color-bg)'
          }}>
            {!isMobile && (
              <div style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                fontSize: '0.875rem',
                fontWeight: 400,
                opacity: 0.5,
                zIndex: 10,
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {t.nav.tagline}
              </div>
            )}

            <h1 className="hero-title" style={{
              fontSize: '9vw',
              fontWeight: 500,
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              color: 'var(--color-text)',
              position: 'relative',
              zIndex: 10
            }}>
              {t.home.heroTitle}
            </h1>

            <p style={{
              fontSize: '0.875rem',
              fontWeight: 400,
              lineHeight: 1.6,
              marginTop: '2rem',
              color: 'var(--color-text)',
              opacity: 0.8,
              position: 'relative',
              zIndex: 10,
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              {t.home.heroBody.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < t.home.heroBody.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>
        </Grid>
      </section>

      {/* ─── About Section ─── */}
      <section style={{ position: 'relative' }}>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>About Objktt</span></div>
        </div>

        <AboutSection />
      </section>

      {/* ─── Upcoming Events Section ─── */}
      <section style={{ position: 'relative' }}>
        <div style={stickyBar}>
          <div style={{
            ...stickyInner,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ opacity: 0.5 }}>Upcoming Events</span>
            <Link to="/events" style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              opacity: 0.5,
              letterSpacing: '0.05em',
              transition: 'opacity 0.2s ease',
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
            >
              View all →
            </Link>
          </div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '1.5rem' : '2rem',
          alignItems: 'end',
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            Upcoming<br />Events
          </h2>
        </div>

        {/* Event Grid: Featured + Thumbnails */}
        <div style={{
          padding: isMobile ? '0 1.5rem' : '0 4rem',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '1rem' : '2rem',
        }}>
          {/* Featured (first upcoming) */}
          {upcomingEvents[0] && (
            <Link
              to={`/events?event=${upcomingEvents[0].id}`}
              style={{
                aspectRatio: '4/5',
                position: 'relative',
                cursor: 'pointer',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                textDecoration: 'none',
                color: 'inherit',
              }}
              onMouseEnter={() => setActiveItem(upcomingEvents[0].id)}
              onMouseLeave={() => setActiveItem(null)}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: activeItem === upcomingEvents[0].id ? 'var(--color-text)' : 'var(--color-line)',
                opacity: activeItem === upcomingEvents[0].id ? 0.1 : 0.05,
                border: '1px solid var(--color-text)',
                transition: 'all 0.3s ease',
              }} />
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.3,
                zIndex: 1,
              }}>Coming Soon</span>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: 0.6,
                  marginBottom: '0.5rem',
                }}>
                  {formatDate(upcomingEvents[0].date)}
                </div>
                <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {upcomingEvents[0].title}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 400, opacity: 0.5 }}>
                  {upcomingEvents[0].type}
                </div>
              </div>
            </Link>
          )}

          {/* Thumbnails (rest) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '1rem' : '1px',
          }}>
            {upcomingEvents.slice(1, 5).map((event) => (
              <Link
                key={event.id}
                to={`/events?event=${event.id}`}
                style={{
                  aspectRatio: '4/5',
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={() => setActiveItem(event.id)}
                onMouseLeave={() => setActiveItem(null)}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: activeItem === event.id ? 'var(--color-text)' : 'var(--color-line)',
                  opacity: activeItem === event.id ? 0.1 : 0.05,
                  border: '1px solid var(--color-text)',
                  transition: 'all 0.3s ease',
                }} />
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '0.625rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.3,
                  zIndex: 1,
                }}>Coming Soon</span>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                    opacity: 0.6,
                  }}>
                    <span>{formatDate(event.date)}</span>
                    <span>{event.type}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {event.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div style={{ height: isMobile ? '3rem' : '4rem' }} />
      </section>

      {/* ─── Map Section ─── */}
      <section>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>We Are Here</span></div>
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
            Yes, we're on the 4th floor — no elevator.<br />
            But the climb is worth it.<br />
            Warm light, good sound, and a space<br />
            that feels like a deep breath.
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
              Line 4, Myeongdong Station Exit 10.{<br />}
              Walk straight for about 3 minutes,{<br />}
              then enter the building on your left.{<br />}
              4F — no elevator.
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
              On-site parking is not available.{<br />}
              Namsan Square parking garage{<br />}
              is a short walk away.
            </p>
          </div>
        </div>

      </section>

      {/* ─── Contact Section ─── */}
      <section style={{ position: 'relative' }}>
        <div style={stickyBar}>
          <div style={stickyInner}><span style={{ opacity: 0.5 }}>Contact</span></div>
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
              Contact
            </div>
            <form ref={formRef} onSubmit={(e) => {
              e.preventDefault();
              setFormStatus('sending');
              emailjs.sendForm('service_vgxq9ev', 'template_oxzhf08', formRef.current!, 'FhaoMuWPdR1b2o9MU')
                .then(() => {
                  setFormStatus('success');
                  setFormData({ name: '', email: '', message: '' });
                }, () => {
                  setFormStatus('error');
                });
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
