'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { shortDay } from '@/lib/utils/calendar';
import styles from './BlockedDatesPanel.module.css';

type BlockedDatesPanelProps = {
  /** Blocked days from today on (YYYY-MM-DD), sorted. */
  days: string[];
  /** Opens the block-out modal ("Edit", "Block dates"). */
  onEdit: () => void;
  /** A chip's ×: unblock that day. */
  onUnblock: (iso: string) => void;
  /** A save is on its way: every × and Edit wait (each save plans from the days as read). */
  busy?: boolean;
  /** Why the last unblock failed; shown under the chips (the page reads it out). */
  error?: string | null;
};

/**
 * Calendar v2 Month at a glance, under the month: the blocked days as chips
 * (`hasBlocked`), or the dashed "Away on some days?" card (`noBlocked`). When
 * a chip goes, focus moves to the next chip, else to the action.
 */
export function BlockedDatesPanel({
  days,
  onEdit,
  onUnblock,
  busy = false,
  error = null,
}: BlockedDatesPanelProps) {
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const action = useRef<HTMLButtonElement>(null);
  // The day whose chip was removed with focus on it: focus goes next once it's gone.
  const leaving = useRef<string | null>(null);
  useEffect(() => {
    const gone = leaving.current;
    if (!gone || days.includes(gone)) return;
    leaving.current = null;
    const next = days.find((d) => d > gone) ?? days[days.length - 1];
    (next ? chips.current.get(next) : action.current)?.focus();
  }, [days]);
  // The save is over and the day is still here (it failed): forget it, so a
  // later change elsewhere doesn't pull focus to a chip.
  useEffect(() => {
    if (!busy && leaving.current && days.includes(leaving.current)) leaving.current = null;
  }, [busy, days]);
  const edit = () => {
    if (!busy) onEdit();
  };

  if (!days.length)
    return (
      <div className={styles.empty}>
        <span className={styles.title}>
          <Icon name="event_busy" size={20} className={styles.icon} />
          Away on some days?
        </span>
        <span className={styles.body}>
          {/* Ours: "Your weekly hours stay the same." dropped (product 2026-10-01: it confused). */}
          Block holidays or busy weeks so mentees can’t book them.
        </span>
        {/* Calendar v2 draws this one 32px (btnEditBlock with nothing blocked). */}
        <Button ref={action} size="small" aria-disabled={busy || undefined} onClick={edit}>
          Block dates
        </Button>
      </div>
    );

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>
          <Icon name="event_busy" size={20} className={styles.icon} />
          {days.length} blocked date{days.length === 1 ? '' : 's'}
        </span>
        <Button
          ref={action}
          variant="text"
          size="small"
          className={styles.edit}
          aria-disabled={busy || undefined}
          onClick={edit}
        >
          Edit
        </Button>
      </div>
      <ul className={styles.chips}>
        {days.map((d) => (
          <li key={d} className={styles.chip}>
            {shortDay(d)}
            <button
              ref={(el) => {
                if (el) chips.current.set(d, el);
                else chips.current.delete(d);
              }}
              type="button"
              className={styles.remove}
              aria-label={`Unblock ${shortDay(d)}`}
              aria-disabled={busy || undefined}
              onClick={() => {
                if (busy) return;
                leaving.current = d;
                onUnblock(d);
              }}
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
