'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import { shortDay } from '@/lib/utils/calendar';
import styles from './BlockOutForm.module.css';

type BlockOutFormProps = {
  /** Today (YYYY-MM-DD) in the mentor's zone: earlier days can't be picked. */
  today: string;
  /** The days blocked now, from today on. */
  initial: string[];
  /** Days with a session booked, and who with (the first name, if known). */
  booked: { day: string; mentee: string | null }[];
  saving: boolean;
  /** Our copy for a save that failed; the page announces it. */
  error: string | null;
  /** A day was picked or unpicked: the page clears a failed save's message. */
  onEdit?: () => void;
  onSave: (days: string[]) => void;
};

/** Calendar v2 `saveBlockLabel`: what the button will do with this draft. */
export function saveBlockLabel(initial: readonly string[], draft: readonly string[]): string {
  const added = draft.filter((d) => !initial.includes(d)).length;
  const removed = initial.filter((d) => !draft.includes(d)).length;
  if (!added && !removed) return 'Select dates to block';
  if (added && !removed) return `Block ${added} date${added > 1 ? 's' : ''}`;
  return 'Save blocked dates';
}

/**
 * The "Block out dates" modal body (Calendar v2 `blockoutOpen`): the month to
 * tap days on, a note when a picked day has a session (blocking won't cancel
 * it), then the save. The draft lives here: closing the modal drops it.
 */
export function BlockOutForm({
  today,
  initial,
  booked,
  saving,
  error,
  onEdit,
  onSave,
}: BlockOutFormProps) {
  const [draft, setDraft] = useState(initial);
  const toggle = (d: string) => {
    onEdit?.();
    setDraft((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d].sort()));
  };
  // After a failed save the button retries (Calendar v2 `saveBlockLabel`).
  const label = error ? 'Try again' : saveBlockLabel(initial, draft);
  // Only days picked now: a day already blocked was already said (design `hitDays`).
  const clashes = booked.filter((b) => draft.includes(b.day) && !initial.includes(b.day));
  const clashDays = [...new Set(clashes.map((c) => c.day))].sort();
  return (
    <div className={styles.body}>
      <MonthPicker
        today={today}
        min={today}
        selected={draft}
        booked={booked.map((b) => b.day)}
        onPick={toggle}
        showLegend
      />
      {clashDays.length > 0 && (
        <Notice tone="info">
          {clashDays.length === 1 && clashes.length === 1 && clashes[0]!.mentee ? (
            <>
              You have a session with <strong>{clashes[0]!.mentee}</strong> on{' '}
              <strong>{shortDay(clashDays[0]!)}</strong>. Blocking the day won’t cancel it.
            </>
          ) : clashDays.length === 1 ? (
            // PROVISIONAL: no name, or several sessions that day (calendar design request, PR 2).
            <>
              You have {clashes.length === 1 ? 'a session' : 'sessions'} on{' '}
              <strong>{shortDay(clashDays[0]!)}</strong>. Blocking the day won’t cancel{' '}
              {clashes.length === 1 ? 'it' : 'them'}.
            </>
          ) : (
            // PROVISIONAL: sessions on several picked days (calendar design request, PR 2).
            <>
              You have sessions on{' '}
              {clashDays.map((d, i) => (
                <span key={d}>
                  {i > 0 && (i === clashDays.length - 1 ? ' and ' : ', ')}
                  <strong>{shortDay(d)}</strong>
                </span>
              ))}
              . Blocking these days won’t cancel them.
            </>
          )}
        </Notice>
      )}
      {error && (
        <span role="alert" className={styles.error}>
          <Icon name="error" size={16} className={styles.errorIcon} />
          {error}
        </span>
      )}
      <Button
        size="large"
        fullWidth
        busy={saving}
        disabled={saveBlockLabel(initial, draft) === 'Select dates to block'}
        onClick={() => onSave(draft)}
      >
        {label}
      </Button>
    </div>
  );
}
