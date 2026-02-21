import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PosterStage from '../components/PosterStage';
import { events } from '../data/events';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

type ViewMode = 'thumbnail' | 'list';
type TimeFilter = 'upcoming' | 'past';

const Events: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePoster, setActivePoster] = useState<string | null>(null);

  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) setActivePoster(event.script);
      setSearchParams({}, { replace: true });
    }
  }, []);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [viewMode, setViewMode] = useState<ViewMode>('thumbnail');
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('.').map(Number);
    return new Date(y, m - 1, d);
  };

  const upcomingEvents = events
    .filter(e => parseDate(e.date) >= today)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  const pastEvents = events
    .filter(e => parseDate(e.date) < today)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  const timeFiltered = timeFilter === 'upcoming' ? upcomingEvents : pastEvents;

  const eventTypes = ['All', ...new Set(timeFiltered.map(event => event.type))];

  const filteredEvents = filter === 'All'
    ? timeFiltered
    : timeFiltered.filter(event => event.type === filter);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    return `${dateStr} (${days[d.getDay()]})`;
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
    borderTop: '1px solid var(--color-line)',
    borderBottom: '1px solid var(--color-line)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
  };

  return (
    <>
      <div style={{ paddingBottom: '4rem' }}>
        <section>
          {/* Sticky Bar */}
          <div style={stickyBar}>
            <div style={{
              ...stickyInner,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ opacity: 0.5 }}>Programs</span>

              {/* View toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.5 }}>
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
            </div>
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
              Programs
            </h2>
          </div>

          {/* Program Descriptions */}
          <div style={{
            padding: isMobile ? '0 1.5rem 3rem' : '0 4rem 4rem',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '2.5rem' : '4rem',
          }}>
            {/* KLANG */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.4,
                marginBottom: '0.75rem',
              }}>
                Every Saturday
              </div>
              <div style={{
                fontSize: isMobile ? '1.5rem' : '1.75rem',
                fontWeight: 500,
                marginBottom: '0.75rem',
              }}>
                OBJkTT KLANG
              </div>
              <p style={{
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                opacity: 0.6,
              }}>
                Movement. A weekly DJ session with rotating genre themes.
                The routine is the point — every Saturday, the space comes alive with sound.
              </p>
            </div>

            {/* KOLLEKTION */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.4,
                marginBottom: '0.75rem',
              }}>
                Every Sunday
              </div>
              <div style={{
                fontSize: isMobile ? '1.5rem' : '1.75rem',
                fontWeight: 500,
                marginBottom: '0.75rem',
              }}>
                OBJkTT KOLLEKTION
              </div>
              <p style={{
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                opacity: 0.6,
              }}>
                Accumulation. 10 Records, 1 Collector, 1 Theme.
                A numbered archive of personal taste — each session builds on the last.
              </p>
            </div>
          </div>

          {/* Time + Type Filter */}
          <div style={{
            padding: isMobile ? '0 1.5rem 2rem' : '0 4rem 2rem',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '2rem',
            alignItems: isMobile ? 'flex-start' : 'center',
          }}>
            {/* Upcoming / Past */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setTimeFilter('upcoming'); setFilter('All'); }}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: timeFilter === 'upcoming' ? 700 : 400,
                  opacity: timeFilter === 'upcoming' ? 1 : 0.5,
                  padding: 0,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Upcoming
              </button>
              <button
                onClick={() => { setTimeFilter('past'); setFilter('All'); }}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: timeFilter === 'past' ? 700 : 400,
                  opacity: timeFilter === 'past' ? 1 : 0.5,
                  padding: 0,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Past
              </button>
            </div>

            {/* Divider */}
            {!isMobile && (
              <div style={{
                width: '1px',
                height: '1rem',
                backgroundColor: 'var(--color-line)',
              }} />
            )}

            {/* Type filter */}
            <div className="filter-row" style={{ display: 'flex', gap: '1.5rem' }}>
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
                  onClick={() => setActivePoster(item.script)}
                  style={{
                    aspectRatio: '4/5',
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
                    flexGrow: 1,
                    marginBottom: '1rem',
                    position: 'relative',
                  }}>
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
                  onClick={() => setActivePoster(event.script)}
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

      {activePoster && (
        <PosterStage
          scriptUrl={activePoster}
          onClose={() => setActivePoster(null)}
        />
      )}
    </>
  );
};

export default Events;
