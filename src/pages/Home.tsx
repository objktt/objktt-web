import React, { useState } from 'react';
import Grid from '../components/GridSystem';
import { events } from '../data/events';
import HeroScene from '../components/HeroScene'; // Import the scene

const Home: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');

  // Extract unique event types
  const eventTypes = ['All', ...new Set(events.map(event => event.type))];

  // Filter events based on selection
  const filteredEvents = filter === 'All' 
    ? events 
    : events.filter(event => event.type === filter);

  return (
    <div style={{ padding: '0 0 4rem 0', position: 'relative' }}>
      
      {/* Hero Section */}
      <Grid showLines={true}>
        <div style={{ 
            gridColumn: '1 / 13', // Restore full width
            minHeight: '60vh', 
            padding: '4rem 6rem', // Add padding to replace grid offset
            display: 'flex',
            flexDirection: 'column', // Stack children vertically
            justifyContent: 'center', // Center vertically in the container
            alignItems: 'flex-start', // Align text to the left
            // Existing styles:
            position: 'relative', 
            zIndex: 1, 
            backgroundColor: 'var(--color-bg)'  // Use theme background (Black in dark mode)
        }}> 
          
          {/* 3D Scene Layer - Inside the Grid Cell */}
          <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              zIndex: 0, // Sit ON TOP of the background
              opacity: 1 // Full opacity
          }}>
              <HeroScene />
          </div>

          <h1 style={{ 
            fontSize: '9vw', // Tripled from 3vw
            fontWeight: 400, 
            lineHeight: 1,
            pointerEvents: 'none', // Prevent text from blocking interaction
            userSelect: 'none', // Prevent text selection
            WebkitUserSelect: 'none', // Safari support
            color: 'var(--color-text)',
            position: 'relative', // Ensure it sits on top of absolute scene
            zIndex: 10 // Explicitly above the scene
          }}>

            A listening space for records, taste, and connection.
          </h1>

          <p style={{
            fontSize: '0.875rem', // Small text (~14px)
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
            We believe music needs time.<br />
            People need air.<br />
            Objects carry memory.
          </p>
        </div>
      </Grid>

      {/* Filter Section */}
      <Grid showLines={true}>
        <div style={{ 
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
              {type}
            </button>
          ))}
        </div>
      </Grid>
      
      {/* Gallery Section */}
      <Grid showLines={true}>
        {filteredEvents.map((item) => (
          <div 
            key={item.id} 
            style={{ 
              gridColumn: 'span 4', 
              aspectRatio: '4/5', // Strict aspect ratio as requested
              position: 'relative',
              cursor: 'pointer',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              // Borders: Grid gap handles internal lines if showLines is true, 
              // but we might want explicit borders for the "architectural" feel if grid gap is just void.
              // Our Grid component uses gap for lines.
              // We'll trust the Grid component's showLines prop for the main structure.
            }}
            onMouseEnter={() => setActiveItem(item.id)}
            onMouseLeave={() => setActiveItem(null)}
          >
            {/* Visual Block - Placeholder for Poster Image */}
            <div style={{ 
                flexGrow: 1, 
                backgroundColor: activeItem === item.id ? 'var(--color-text)' : 'var(--color-line)',
                opacity: activeItem === item.id ? 0.1 : 0.05, // Subtle placeholder visual
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
