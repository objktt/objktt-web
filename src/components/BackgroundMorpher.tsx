import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface BackgroundMorpherProps {
  sectionRefs: React.RefObject<HTMLElement | null>[];
}

const BackgroundMorpher: React.FC<BackgroundMorpherProps> = ({ sectionRefs }) => {
  const { scrollY } = useScroll();
  const { isMobile } = useBreakpoint();
  
  const [offsets, setOffsets] = useState<number[]>([0, 1000, 2000, 3000]);

  useEffect(() => {
    const updateOffsets = () => {
      if (!sectionRefs || sectionRefs.length === 0) return;
      
      const newOffsets = sectionRefs.map((ref) => {
        if (ref && ref.current) {
           const rect = ref.current.getBoundingClientRect();
           const absoluteTop = window.scrollY + rect.top;
           const absoluteCenter = absoluteTop + rect.height / 2;
           const targetScrollY = absoluteCenter - window.innerHeight / 2;
           return Math.max(0, targetScrollY);
        }
        return 0;
      });
      
      for (let i = 1; i < newOffsets.length; i++) {
         if (newOffsets[i] <= newOffsets[i-1]) {
            newOffsets[i] = newOffsets[i-1] + 1;
         }
      }
      setOffsets(newOffsets);
    };

    updateOffsets();
    window.addEventListener('resize', updateOffsets);
    const timeoutId = setTimeout(updateOffsets, 500);
    return () => {
      window.removeEventListener('resize', updateOffsets);
      clearTimeout(timeoutId);
    };
  }, [sectionRefs]);

  const smoothScrollY = useSpring(scrollY, { stiffness: 60, damping: 20 });

  const xLeft = isMobile ? '5vw' : '15vw';
  const xRight = isMobile ? '40vw' : '65vw'; 
  const x = useTransform(smoothScrollY, offsets, [xRight, xLeft, xRight, xLeft]);
  const rotate = useTransform(smoothScrollY, [offsets[0] || 0, offsets[offsets.length - 1] || 1000], [0, 180]);
  const y = useTransform(smoothScrollY, offsets, ['20vh', '30vh', '40vh', '50vh']);

  // Crossfade Opacities for the 4 SVGs
  const op0 = useTransform(smoothScrollY, [offsets[0] - 500, offsets[0], offsets[0] + 500], [0, 1, 0]);
  const op1 = useTransform(smoothScrollY, [offsets[1] - 500, offsets[1], offsets[1] + 500], [0, 1, 0]);
  const op2 = useTransform(smoothScrollY, [offsets[2] - 500, offsets[2], offsets[2] + 500], [0, 1, 0]);
  const op3 = useTransform(smoothScrollY, [offsets[3] - 500, offsets[3], offsets[3] + 500], [0, 1, 0]);

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 10, // Foreground layer over text for mix-blend-mode
      overflow: 'hidden'
    }}>
      <motion.div
        style={{
          position: 'absolute',
          width: isMobile ? 300 : 500,
          height: isMobile ? 300 : 500,
          x,
          y,
          rotate,
          originX: '50%',
          originY: '50%',
          mixBlendMode: 'difference',
          opacity: 0.15,
          color: 'var(--color-text)',
          willChange: 'transform, opacity',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Monstera */}
        <motion.svg style={{...svgStyle, opacity: op0}} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.22.22-1.8l2.91 2.91c.21.21.56.07.56-.23v-2.36c0-.28.22-.5.5-.5h2.36c.3 0 .44-.35.23-.56l-2.07-2.07c.81-.37 1.71-.58 2.66-.58 3.95 0 7.21 2.92 7.82 6.74l-2.08-2.08c-.21-.21-.56-.07-.56.23v2.36c0 .28-.22.5-.5.5h-2.36c-.3 0-.44.35-.23.56l2.91 2.91c-.58.14-1.18.22-1.8.22-1.05 0-2.05-.22-2.95-.61l2.07 2.07c-.2.2-.55.06-.55-.24v-2.36c0-.28-.22-.5-.5-.5H9.42c-.3 0-.44.35-.23.56l2.81 2.81z"/>
        </motion.svg>
        
        {/* Reel Deck (Cassette/Reel) */}
        <motion.svg style={{...svgStyle, opacity: op1}} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3.5 10c-1.38 0-2.5-1.12-2.5-2.5S15.12 9 16.5 9 19 10.12 19 11.5 17.88 14 16.5 14zm-9 0C6.12 14 5 12.88 5 11.5S6.12 9 7.5 9 10 10.12 10 11.5 8.88 14 7.5 14zm0-3c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm9 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
          <path d="M11 15h2v2h-2z" />
        </motion.svg>

        {/* Vinyl Record */}
        <motion.svg style={{...svgStyle, opacity: op2}} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </motion.svg>

        {/* Cocktail */}
        <motion.svg style={{...svgStyle, opacity: op3}} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 5V3H3v2l8 9v5H6v2h12v-2h-5v-5l8-9zM7.43 7L5.66 5h12.69l-1.78 2H7.43z" />
        </motion.svg>
      </motion.div>
    </div>
  );
};

export default BackgroundMorpher;
