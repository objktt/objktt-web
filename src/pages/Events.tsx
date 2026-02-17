import React, { useState } from 'react';
import Grid from '../components/GridSystem';
import PosterStage from '../components/PosterStage';
import { events } from '../data/events';

const Events: React.FC = () => {
  const [activePoster, setActivePoster] = useState<string | null>(null);

  return (
    <>
      <div style={{ padding: '4rem 0' }}>
        <Grid>
          <div style={{ gridColumn: '1 / 13', paddingBottom: '1rem', marginBottom: '2rem' }}>
             <h2 style={{ fontSize: '1rem' }}>Upcoming Events</h2>
          </div>
          
          {events.map((event) => (
            <div 
              key={event.id}
              onClick={() => setActivePoster(event.script)}
              style={{ 
                gridColumn: '1 / 13', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'baseline', 
                padding: '1.5rem 0', 
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: '1rem', width: '150px', fontWeight: 500 }}>{event.date}</span>
              <span style={{ fontSize: '2rem', fontWeight: 500, flexGrow: 1 }}>{event.title}</span>
              <span style={{ fontSize: '1rem', opacity: 0.6 }}>{event.type}</span>
            </div>
          ))}
        </Grid>
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
