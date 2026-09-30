'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './SessionPickRows.module.css';

export type PickRow = { id: string; type: string; date: string };

type SessionPickRowsProps = {
  label: string;
  /** Newest first. */
  rows: PickRow[];
  value: string | null;
  onChange: (id: string) => void;
  /** Rows shown before "Show N more" (ReviewModal.dc.html: 3). */
  initial?: number;
  /**
   * A click, Enter or Space on a row: the pick is made (ReviewModal.dc.html
   * `compact` folds the list back). Arrow keys only move the selection.
   */
  onPick?: (id: string) => void;
};

/**
 * Pick one session (ReviewModal.dc.html `hasRows`, design reply #54): radio
 * rows with the session type and its date, newest first; past three, the rest
 * wait behind "Show N more". A WAI-ARIA radio group: one tab stop, arrows move
 * and select, Home/End jump.
 */
export function SessionPickRows({
  label,
  rows,
  value,
  onChange,
  initial = 3,
  onPick,
}: SessionPickRowsProps) {
  const id = useId();
  // A pick past the first rows shows them all, so the checked row is in view.
  const [all, setAll] = useState(
    rows.length <= initial || rows.findIndex((r) => r.id === value) >= initial,
  );
  const shown = all ? rows : rows.slice(0, initial);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    shown.findIndex((r) => r.id === value),
  );

  const move = (i: number) => {
    const r = shown[i];
    if (!r) return;
    onChange(r.id);
    refs.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const last = shown.length - 1;
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? (i + 1) % shown.length
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? (i - 1 + shown.length) % shown.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    move(next);
  };

  return (
    <div className={styles.group}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      {/* Only radios in the group; "Show N more" follows it. */}
      <div role="radiogroup" aria-labelledby={`${id}-label`} className={styles.rows}>
        {shown.map((r, i) => {
          const on = r.id === value;
          return (
            <button
              key={r.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${r.type}, ${r.date}`}
              tabIndex={i === current ? 0 : -1}
              className={cx(styles.row, on && styles.on)}
              onClick={() => {
                onChange(r.id);
                onPick?.(r.id);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span aria-hidden className={styles.dot} />
              <span className={styles.type}>{r.type}</span>
              <span className={styles.date}>{r.date}</span>
            </button>
          );
        })}
      </div>
      {!all && (
        <button
          type="button"
          className={styles.more}
          onClick={() => {
            setAll(true);
            // The first newly shown row takes focus, so the list reads on from there.
            requestAnimationFrame(() => refs.current[initial]?.focus());
          }}
        >
          <Icon name="expand_more" size={16} />
          Show {rows.length - initial} more
        </button>
      )}
    </div>
  );
}
