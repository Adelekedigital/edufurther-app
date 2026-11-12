'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { FormField } from '@/components/molecules/FormField/FormField';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { DATE_PICKER } from '@/lib/copy/adminAnalytics';
import { ANALYTICS_MIN_DAY, daysBetween, nextDraft } from '@/lib/utils/analytics';
import styles from './DateRangeDialog.module.css';

type Range = { from: string; to: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** What's wrong with a typed day ('' while it's empty or still being typed). */
function dayError(day: string, today: string): string | undefined {
  if (!ISO.test(day)) return undefined;
  return day < ANALYTICS_MIN_DAY || day > today ? DATE_PICKER.outOfRange : undefined;
}

/**
 * "Choose dates" (Admin Analytics.dc.html `pickOpen`; Modal `kind="picker"`:
 * a dialog on desktop, a sheet on phones). Type a first and last day, or pick
 * them: one click picks a day, a second makes a range in either order, a third
 * starts again. The month and year jump straight to a far month (owner,
 * 2026-11-12: a year's range was a click per month). Nothing changes until
 * Apply dates.
 */
export function DateRangeDialog({
  today,
  initial,
  onApply,
  onClose,
}: {
  /** Today in the zone the days follow (YYYY-MM-DD): the last day that can be picked. */
  today: string;
  /** The custom window already applied, if any. */
  initial: Range | null;
  onApply: (r: Range) => void;
  onClose: () => void;
}) {
  // The fields hold what's typed; the range is the last valid pair of them.
  const [start, setStart] = useState(initial?.from ?? '');
  const [end, setEnd] = useState(initial?.to ?? '');
  const [view, setView] = useState<string | undefined>(undefined);

  const startError = dayError(start, today);
  const endError =
    dayError(end, today) ??
    (ISO.test(start) && ISO.test(end) && end < start ? DATE_PICKER.endBeforeStart : undefined);
  const startOk = ISO.test(start) && !startError;
  const endOk = ISO.test(end) && !endError;
  // A start alone is one day, as a single click on the calendar is.
  const draft: Range | null = startOk
    ? { from: start, to: endOk ? end : end === '' ? start : '' }
    : null;
  const valid = draft && draft.to !== '' ? draft : null;

  const pick = (day: string) => {
    const next = nextDraft(valid, day);
    setStart(next.from);
    setEnd(next.to);
  };

  return (
    <ModalShell
      title={DATE_PICKER.title}
      subtitle={DATE_PICKER.subtitle}
      icon="calendar_month"
      size="sm"
      mobile="sheet"
      onClose={onClose}
    >
      <div className={styles.body}>
        <div className={styles.fields}>
          <FormField label={DATE_PICKER.start} error={startError}>
            {(f) => (
              <Input
                {...f}
                type="date"
                radius="sm"
                min={ANALYTICS_MIN_DAY}
                max={today}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (ISO.test(e.target.value)) setView(e.target.value);
                }}
              />
            )}
          </FormField>
          <FormField label={DATE_PICKER.end} error={endError}>
            {(f) => (
              <Input
                {...f}
                type="date"
                radius="sm"
                min={ISO.test(start) ? start : ANALYTICS_MIN_DAY}
                max={today}
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  if (ISO.test(e.target.value)) setView(e.target.value);
                }}
              />
            )}
          </FormField>
        </div>
        <MonthPicker
          today={today}
          min={ANALYTICS_MIN_DAY}
          max={today}
          jump
          showMonth={view}
          initialMonth={valid?.from ?? today}
          selected={valid ? daysBetween(valid.from, valid.to) : []}
          // The picked days are announced as pressed.
          selectedLabel={null}
          onPick={pick}
        />
        <div className={styles.actions}>
          <Button variant="text" size="small" onClick={onClose}>
            {DATE_PICKER.cancel}
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              onApply(valid);
            }}
          >
            {DATE_PICKER.apply}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
