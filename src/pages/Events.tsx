import React, { useState } from 'react';
import { events } from '../data/events';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

type ViewMode = 'thumbnail' | 'list';

const Events: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('thumbnail');
  const { language, t } = useLanguage();
  const { isMobile } = useBreakpoint();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('.').map(Number);
    return new Date(y, m - 1, d);
  };

  // Upcoming first (ascending), then past (most recent first) — unified list.
  const allEvents = [...events].sort((a, b) => {
    const da = parseDate(a.date).getTime();
    const db = parseDate(b.date).getTime();
    const t = today.getTime();
    const aFuture = da >= t;
    const bFuture = db >= t;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return aFuture ? da - db : db - da;
  });

  const eventTypes = ['All', ...new Set(allEvents.map(event => event.type))];

  const filteredEvents = filter === 'All'
    ? allEvents
    : allEvents.filter(event => event.type === filter);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    return `${dateStr} (${days[d.getDay()]})`;
  };


  return (
    <>
      <div style={{ paddingBottom: '4rem' }}>
        <section>
          {/* View toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: isMobile ? '0.625rem 1.5rem' : '0.625rem 4rem',
            gap: '0.5rem',
            opacity: 0.5,
          }}>
            <button
              onClick={() => setViewMode('thumbnail')}
              style={{
                fontSize: '0.75rem',
                fontWeight: viewMode === 'thumbnail' ? 700 : 400,
                opacity: viewMode === 'thumbnail' ? 1 : 0.5,
                transition: 'opacity 0.2s ease',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                fontSize: '0.75rem',
                fontWeight: viewMode === 'list' ? 700 : 400,
                opacity: viewMode === 'list' ? 1 : 0.5,
                transition: 'opacity 0.2s ease',
              }}
            >
              List
            </button>
          </div>

          {/* Section Title */}
          <div style={{
            padding: `${isMobile ? '3rem' : '5rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
          }}>
            <h2 style={{
              fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: isMobile ? '-0.03em' : '-0.04em',
              margin: 0,
            }}>
              Events
            </h2>
          </div>

          {/* Type Filter */}
          <div style={{
            padding: isMobile ? '0 1.5rem 2rem' : '0 4rem 2rem',
          }}>
            <div className="filter-row" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {eventTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: filter === type ? 700 : 400,
                    opacity: filter === type ? 1 : 0.5,
                    padding: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {type === 'All' ? t.home.filterAll : type}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail View */}
          {viewMode === 'thumbnail' && (
            <div style={{
              padding: isMobile ? '0 1.5rem' : '0 4rem',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '1rem' : '1px',
            }}>
              {filteredEvents.map((item) => (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                  onMouseEnter={() => setActiveItem(item.id)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <div style={{
                    aspectRatio: '4/5',
                    marginBottom: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {item.posterVideo ? (
                      <video
                        src={item.posterVideo}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          transform: activeItem === item.id ? 'scale(1.03)' : 'scale(1)',
                        }}
                      />
                    ) : item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          transform: activeItem === item.id ? 'scale(1.03)' : 'scale(1)',
                        }}
                      />
                    ) : (
                      <>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: activeItem === item.id ? 'var(--color-text)' : 'var(--color-line)',
                          opacity: activeItem === item.id ? 0.1 : 0.05,
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
                        }}>Coming Soon</span>
                      </>
                    )}
                  </div>

                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                  }}>
                    <span>{formatDate(item.date)}</span>
                    <span>{item.type}</span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {item.title}
                  </div>
                  {item.description[language] && (
                    <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.25rem' }}>
                      {item.description[language]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div style={{
              padding: isMobile ? '0 1.5rem' : '0 4rem',
            }}>
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'baseline',
                    gap: isMobile ? '0.25rem' : '0',
                    padding: '1.5rem 0',
                    borderBottom: '1px solid var(--color-line)',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span className="event-date" style={{
                    fontSize: '1rem',
                    width: isMobile ? 'auto' : '150px',
                    fontWeight: 500,
                  }}>
                    {formatDate(event.date)}
                  </span>
                  <span className="event-title" style={{
                    fontSize: isMobile ? '1.25rem' : '2rem',
                    fontWeight: 500,
                    flexGrow: 1,
                  }}>
                    {event.title}
                    {event.description[language] && (
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 400, opacity: 0.5, marginTop: '0.25rem' }}>
                        {event.description[language]}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '1rem', opacity: 0.6 }}>
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

    </>
  );
};

export default Events;
