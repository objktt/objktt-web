import React from 'react';

/** Minimal capsule marking a consigned DJ Collection record. */
const DjCollectionBadge: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      fontSize: '0.62rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      lineHeight: 1.4,
      borderRadius: '999px',
      border: '1px solid var(--color-text)',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      ...style,
    }}
  >
    DJ Collection
  </span>
);

export default DjCollectionBadge;
