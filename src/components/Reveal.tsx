import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Restrained scroll-reveal: fades content up 24px as it enters the viewport,
 * once. Collapses to a plain static render under prefers-reduced-motion.
 * `delay` (seconds) staggers siblings — pass `index * 0.06` for grids.
 */
const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div style={style}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
