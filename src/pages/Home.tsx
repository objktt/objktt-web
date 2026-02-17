import React, { useState } from 'react';
import Grid from '../components/GridSystem';
import { events } from '../data/events';
import HeroScene from '../components/HeroScene';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Home: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  const eventTypes = ['All', ...new Set(events.map(event => event.type))];

  const filteredEvents = filter === 'All'
    ? events
    : events.filter(event => event.type === filter);

  return (
    <div style={{ padding: '0 0 4rem 0', position: 'relative' }}>

      {/* Hero Section */}
      <Grid showLines={true}>
        <div style={{
            gridColumn: '1 / 13',
            minHeight: isMobile ? '50vh' : '60vh',
            padding: isMobile ? '2rem 1.5rem' : '4rem 6rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'var(--color-bg)'
        }}>

          {/* 3D Scene Layer */}
          <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
              opacity: 1
          }}>
              <HeroScene />
          </div>

          <h1 className="hero-title" style={{
            fontSize: '9vw',
            fontWeight: 400,
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

      {/* Filter Section */}
      <Grid showLines={true}>
        <div className="filter-row" style={{
          gridColumn: '1 / 13',
          padding: '1rem 2rem',
          display: 'flex',
          gap: '1.5rem',
        }}>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                fontSize: '0.875rem',
                fontWeight: filter === type ? 700 : 400,
                opacity: filter === type ? 1 : 0.5,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--color-text)',
                transition: 'opacity 0.2s ease'
              }}
            >
              {type === 'All' ? t.home.filterAll : type}
            </button>
          ))}
        </div>
      </Grid>

      {/* Gallery Section */}
      <Grid showLines={true} className="gallery-grid">
        {filteredEvents.map((item) => (
          <div
            key={item.id}
            style={{
              gridColumn: 'span 4',
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
            {/* Visual Block */}
            <div style={{
                flexGrow: 1,
                backgroundColor: activeItem === item.id ? 'var(--color-text)' : 'var(--color-line)',
                opacity: activeItem === item.id ? 0.1 : 0.05,
                border: '1px solid var(--color-text)',
                marginBottom: '1rem',
                transition: 'all 0.3s ease'
            }} />

            <div style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem'
            }}>
               <span>{item.date}</span>
               <span>{item.type}</span>
            </div>

            <div style={{
              fontSize: '1rem',
              fontWeight: 700,
            }}>
               {item.title}
            </div>
          </div>
        ))}
      </Grid>
    </div>
  );
};

export default Home;
