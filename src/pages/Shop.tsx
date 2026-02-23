import React from 'react';

const Shop: React.FC = () => {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.6,
      }}>
        Coming Soon
      </h1>
    </section>
  );
};

export default Shop;
