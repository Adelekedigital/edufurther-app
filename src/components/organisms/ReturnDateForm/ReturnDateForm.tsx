'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { Icon } from '@/components/atoms/Icon/Icon';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import {
  RETURN_CHOICES,
  returnOnFor,
  returnSummary,
  sessionsWhileBusy,
  shortDay,
  type ReturnChoice,
} from '@/lib/utils/calendar';
import { addDays } from '@/lib/utils/slots';
import styles from './ReturnDateForm.module.css';

type ReturnDateFormProps = {
  /** Today (YYYY-MM-DD) in the mentor's zone. */
  today: string;
  /** Booked days and who with: sessions inside the busy stretch stay booked. */
  booked: { day: string; mentee: string | null }[];
  saving: boolean;
  /** Our copy for a pause that failed; the page announces it. */
  error: string | null;
  onCancel: () => void;
  /** null = "Not sure yet". */
  onSave: (returnOn: string | null) => void;
};

/**
 * Calendar v2 "When will you be back?" (`returnOpen`): five chips (a
 * radiogroup: arrow keys move and pick), a one-line summary, the month for
 * "Pick a date", a note when booked sessions fall in the stretch, then
 * Cancel / Set as busy. The date only schedules a reminder: nothing switches
 * the mentor back (product 2026-10-01).
 */
export function ReturnDateForm({
  today,
  booked,
  saving,
  error,
  onCancel,
  onSave,
}: ReturnDateFormProps) {
  const [choice, setChoice] = useState<ReturnChoice | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const back = choice ? returnOnFor(choice, today, picked) : undefined;
  const valid = back !== undefined;
  const staying = valid ? sessionsWhileBusy(booked, today, back) : [];
  const days = [...new Set(staying.map((s) => s.day))].sort();

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = RETURN_CHOICES.length;
    const j = (i + step + n) % n;
    setChoice(RETURN_CHOICES[j]!.key);
    chips.current[j]?.focus();
  };
  const tabStop = Math.max(
    0,
    RETURN_CHOICES.findIndex((c) => c.key === choice),
  );

  return (
    <div className={styles.body}>
      <p className={styles.intro}>
        While you’re busy, mentees can’t find or book you. Pick a return date and we’ll remind you
        to switch back.
      </p>
      <div role="radiogroup" aria-label="Return date" className={styles.chips}>
        {RETURN_CHOICES.map((c, i) => (
          <Chip
            key={c.key}
            ref={(el) => {
              chips.current[i] = el;
            }}
            role="radio"
            look="choice"
            pressed={choice === c.key}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => setChoice(c.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {c.label}
          </Chip>
        ))}
      </div>
      {valid && (
        <div className={styles.summary}>
          <Icon name="event_available" size={18} className={styles.summaryIcon} />
          {returnSummary(back)}
        </div>
      )}
      {choice === 'custom' && (
        <MonthPicker
          today={today}
          min={addDays(today, 1)}
          selected={picked ? [picked] : []}
          booked={booked.map((b) => b.day)}
          onPick={setPicked}
        />
      )}
      {days.length > 0 && (
        <Notice tone="info">
          {days.length === 1 && staying.length === 1 && staying[0]!.mentee ? (
            <>
              Your session with <strong>{staying[0]!.mentee}</strong> on{' '}
              <strong>{shortDay(days[0]!)}</strong> stays booked. Busy only stops new bookings.
            </>
          ) : days.length === 1 ? (
            // PROVISIONAL: no name, or several that day (calendar design request, PR 3).
            <>
              Your {staying.length === 1 ? 'session' : 'sessions'} on{' '}
              <strong>{shortDay(days[0]!)}</strong> {staying.length === 1 ? 'stays' : 'stay'}{' '}
              booked. Busy only stops new bookings.
            </>
          ) : (
            // PROVISIONAL: sessions on several days (the blocking note's pattern).
            <>
              Your sessions on{' '}
              {days.map((d, i) => (
                <span key={d}>
                  {i > 0 && (i === days.length - 1 ? ' and ' : ', ')}
                  <strong>{shortDay(d)}</strong>
                </span>
              ))}{' '}
              stay booked. Busy only stops new bookings.
            </>
          )}
        </Notice>
      )}
      {error && (
        <p className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button size="large" variant="secondary-outlined" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button size="large" busy={saving} disabled={!valid} onClick={() => valid && onSave(back)}>
          Set as busy
        </Button>
      </div>
    </div>
  );
}
