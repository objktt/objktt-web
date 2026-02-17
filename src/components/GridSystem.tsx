import React from 'react';

interface GridProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  showLines?: boolean;
}

const Grid: React.FC<GridProps> = ({ children, style, showLines = false }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: showLines ? '1px' : '0', // Use gap for lines if background is set
      width: 'calc(100% - 4rem)',
      maxWidth: '100%',
      margin: '0 2rem', // Use margin to prevent background color from extending to edges
      backgroundColor: showLines ? 'var(--color-line)' : 'transparent', // The gap color
      borderBottom: showLines ? '1px solid var(--color-line)' : 'none',
      ...style
    }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
           // Ensure children fill the cell to hide the gap color locally if needed, 
           // but here we WANT the gap to show as lines.
           // We assign the background color to children so the gap (transparent or colored?) creates lines.
           // Actually, better technique: Grid Container has BG color (Line Color). Children have BG Color (Theme BG).
           return React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
             style: {
               backgroundColor: 'var(--color-bg)',
               ...(child as React.ReactElement<{ style?: React.CSSProperties }>).props.style
             }
           });
        }
        return child;
      })}
    </div>
  );
};

export default Grid;
