import React, { useMemo, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { BLUE_DOT_FILE_IDS, driveImageUrl } from '../data/bluedotImages';

interface ImgItem {
  id: string;
  x: number; // % horizontal — cell center
  y: number; // % vertical — cell center
  size: number; // px
  speed: number; // parallax multiplier (negative = scrolls up faster than scroll)
}

/**
 * Lay out images on a grid so they never overlap.
 * Each image lands in its own cell, with small in-cell jitter for a natural feel.
 */
function makeItems(requested: number, isMobile: boolean): ImgItem[] {
  // Grid has more cells than we need — picking a random subset spreads
  // images more naturally than a fully-packed grid.
  const cols = isMobile ? 2 : 3;
  const rows = isMobile ? 3 : 2;
  const totalCells = cols * rows;
  const count = Math.min(requested, totalCells);
  const cellW = 100 / cols;
  const cellH = 100 / rows;

  const shuffledIds = [...BLUE_DOT_FILE_IDS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  const cellIndices = Array.from({ length: totalCells }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  // Wider random size range; max safely under cell footprint.
  const minSize = isMobile ? 90 : 180;
  const maxSize = isMobile ? 150 : 360;
  // Tight jitter so larger images still stay clear of adjacent cells.
  const jitterFracX = 0.08;
  const jitterFracY = 0.08;

  return shuffledIds.map((id, i) => {
    const cellIdx = cellIndices[i];
    const col = cellIdx % cols;
    const row = Math.floor(cellIdx / cols);
    const centerX = (col + 0.5) * cellW;
    const centerY = (row + 0.5) * cellH;
    return {
      id,
      x: centerX + (Math.random() - 0.5) * cellW * jitterFracX,
      y: centerY + (Math.random() - 0.5) * cellH * jitterFracY,
      size: minSize + Math.random() * (maxSize - minSize),
      speed: -(0.08 + Math.random() * 0.45),
    };
  });
}

const ParallaxImage: React.FC<{ item: ImgItem; scrollY: MotionValue<number> }> = ({
  item,
  scrollY,
}) => {
  const y = useTransform(scrollY, (v) => v * item.speed);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <motion.img
      src={driveImageUrl(item.id, 512)}
      alt=""
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: item.size,
        height: item.size,
        marginLeft: -item.size / 2,
        marginTop: -item.size / 2,
        objectFit: 'cover',
        opacity: loaded ? 1 : 0,
        y,
        userSelect: 'none',
        transition: 'opacity 0.4s ease',
      }}
      draggable={false}
    />
  );
};

interface HeroParallaxImagesProps {
  count?: number;
  isMobile?: boolean;
}

const HeroParallaxImages: React.FC<HeroParallaxImagesProps> = ({
  count,
  isMobile = false,
}) => {
  const items = useMemo(
    () => makeItems(count ?? 5, isMobile),
    [count, isMobile]
  );
  const { scrollY } = useScroll();

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {items.map((item) => (
        <ParallaxImage key={item.id} item={item} scrollY={scrollY} />
      ))}
    </div>
  );
};

export default HeroParallaxImages;
