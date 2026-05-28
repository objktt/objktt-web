import { useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';

interface TextRevealByWordProps {
  text: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  children?: ReactNode;
}

export const TextRevealByWord: FC<TextRevealByWordProps> = ({
  text,
  height = '200vh',
  className,
  style,
  innerStyle,
  textStyle,
  children,
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  });
  const words = text.split(' ');

  return (
    <div
      ref={targetRef}
      className={className}
      style={{
        position: 'relative',
        zIndex: 0,
        height,
        ...style,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          ...innerStyle,
        }}
      >
        <div
          style={{
            color: 'var(--color-text)',
            ...textStyle,
          }}
        >
          <p style={{ margin: 0 }}>
            {words.map((word, i) => {
              // Compress reveals into the first ~15% of scroll progress so
              // every word is fully white well before the sticky releases.
              const REVEAL_END = 0.15;
              const start = (i / words.length) * REVEAL_END;
              const end = ((i + 1) / words.length) * REVEAL_END;
              return (
                <Word key={i} progress={scrollYProgress} range={[start, end]}>
                  {word}
                </Word>
              );
            })}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
};

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <>
      <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>
        <span style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>{children}</span>
        <motion.span style={{ opacity }}>{children}</motion.span>
      </span>
      {' '}
    </>
  );
};
