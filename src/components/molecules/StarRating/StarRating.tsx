'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Star } from '@/components/atoms/Star/Star';
import { cx } from '@/lib/utils/cx';
import styles from './StarRating.module.css';

/** ReviewModal.dc.html `WORDS`. */
const WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'] as const;

type StarRatingProps = {
  /** 0 = none yet; otherwise 1–5. */
  value: number;
  onChange: (value: number) => void;
  /** Names the group ("Rating out of 5"). */
  label: string;
};

/**
 * ReviewModal.dc.html "Your rating": five 44px star radios with a hover
 * preview and the word for the rating. A WAI-ARIA radio group: one tab stop,
 * arrows move and choose.
 */
export function StarRating({ value, onChange, label }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover || value;
  const focusable = value || 1;

  const move = (to: number) => {
    const n = ((to - 1 + 5) % 5) + 1;
    onChange(n);
    refs.current[n - 1]?.focus();
  };
  const onKey = (e: KeyboardEvent, n: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') move(n + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') move(n - 1);
    else if (e.key === 'Home') move(1);
    else if (e.key === 'End') move(5);
    else return;
    e.preventDefault();
  };

  return (
    <div className={styles.row}>
      <div role="radiogroup" aria-label={label} className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}, ${WORDS[n]}`}
            tabIndex={n === focusable ? 0 : -1}
            className={styles.star}
            onClick={() => onChange(n)}
            onKeyDown={(e) => onKey(e, n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star size={32} className={cx(styles.glyph, n <= shown && styles.lit)} />
          </button>
        ))}
      </div>
      <span className={cx(styles.word, shown > 0 && styles.chosen)} aria-hidden>
        {shown ? WORDS[shown] : 'Tap a star'}
      </span>
    </div>
  );
}
