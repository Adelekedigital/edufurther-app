'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './Confetti.module.css';

/** Approved.dc.html `confettiEl`: six colours, cycled. */
const COLORS = [
  'var(--blue-500)',
  'var(--blue-300)',
  'var(--green-500)',
  // The design's #f3a218; the same literal as the rating star's token.
  'var(--rating-star)',
  'var(--mint-400)',
  'var(--blue-700)',
];

const COUNT = 90;
/** The design clears the burst after 4.2s; the longest piece ends by then. */
export const CONFETTI_MS = 4200;

/** The design's seeded random, so every burst falls the same way. */
const rand = (i: number, k: number) => {
  const x = Math.sin((i + 1) * k + 7.13) * 10000;
  return x - Math.floor(x);
};

const PIECES = Array.from({ length: COUNT }, (_, i) => ({
  left: `${rand(i, 12.9898) * 100}%`,
  width: `${6 + rand(i, 3.1) * 6}px`,
  height: `${10 + rand(i, 5.7) * 8}px`,
  background: COLORS[i % COLORS.length],
  round: i % 3 === 0,
  dx: `${(rand(i, 9.2) - 0.5) * 240}px`,
  rot: `${360 + rand(i, 2.2) * 720}deg`,
  duration: `${2.4 + rand(i, 4.4) * 1.6}s`,
  delay: `${rand(i, 7.7) * 0.6}s`,
}));

/**
 * One celebratory burst on mount (Approved.dc.html `celebrate`), then gone.
 * Never drawn under prefers-reduced-motion (PRD: hidden under reduced motion);
 * purely decorative, so it is hidden from assistive tech and takes no clicks.
 */
export function Confetti() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), CONFETTI_MS);
    return () => clearTimeout(t);
  }, []);
  if (reduced || done) return null;
  return (
    <div className={styles.layer} aria-hidden data-testid="confetti">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={p.round ? `${styles.piece} ${styles.round}` : styles.piece}
          style={
            {
              left: p.left,
              width: p.width,
              height: p.height,
              background: p.background,
              '--dx': p.dx,
              '--rot': p.rot,
              animationDuration: p.duration,
              animationDelay: p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
