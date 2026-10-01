'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import {
  breakOptions,
  durationOptions,
  windowOptions,
} from '@/components/organisms/SessionTypeWizard/SchedulingStep';
import { noticeLabel, slotCount } from '@/lib/utils/calendar';
import {
  NOTICE_HOURS,
  resolveDefaults,
  type BookingDefaults,
  type DayHours,
} from '@/lib/utils/sessionTypeDraft';
import styles from './SchedulingWindowForm.module.css';

type SchedulingWindowFormProps = {
  initial: BookingDefaults;
  /** The weekly hours on screen: a length they can't fit is said under the rows. */
  days: DayHours[];
  saving: boolean;
  /** Our copy for a save that failed; announced. */
  error: string | null;
  onCancel: () => void;
  onSave: (next: BookingDefaults) => void;
};

/** The backend's range (24 to 72 hours), with the stored value if it's another. */
const noticeOptions = (current: number) =>
  (NOTICE_HOURS.includes(current)
    ? NOTICE_HOURS
    : [...NOTICE_HOURS, current].sort((a, b) => a - b)
  ).map((h) => ({ value: String(h), label: noticeLabel(h) }));

/**
 * Calendar v2's Scheduling window modal body (`windowSetup=summary`): four
 * rows (length, notice, how far ahead, break), then Cancel / Save. Approval
 * isn't shown here and is saved as it was.
 */
export function SchedulingWindowForm({
  initial,
  days,
  saving,
  error,
  onCancel,
  onSave,
}: SchedulingWindowFormProps) {
  const [v, setV] = useState(() => resolveDefaults(initial));
  const cap = initial.maxWindowDays;
  if (cap && v.windowDays > cap) setV({ ...v, windowDays: cap });
  const rows: {
    label: string;
    hint: string;
    value: number;
    options: { value: string; label: string }[];
    set: (n: number) => void;
  }[] = [
    {
      label: 'Session length',
      hint: 'How long each booking lasts.',
      value: v.durationMin,
      options: durationOptions(v.durationMin),
      set: (n) => setV({ ...v, durationMin: n }),
    },
    {
      label: 'Minimum notice',
      hint: 'How soon before a session mentees can book.',
      value: v.noticeHours,
      options: noticeOptions(v.noticeHours),
      set: (n) => setV({ ...v, noticeHours: n }),
    },
    {
      label: 'Book up to',
      hint: 'How far ahead your calendar is open.',
      value: v.windowDays,
      options: windowOptions(v.windowDays, cap),
      set: (n) => setV({ ...v, windowDays: n }),
    },
    {
      label: 'Break between sessions',
      hint: 'Kept free after each booking.',
      value: v.breakMin,
      options: breakOptions(v.breakMin),
      set: (n) => setV({ ...v, breakMin: n }),
    },
  ];
  const tooShort = days.some((d) => d.on) && slotCount(days, v.durationMin) === 0;
  return (
    <div className={styles.body}>
      <div className={styles.rows}>
        {rows.map((r) => (
          <div key={r.label} className={styles.row}>
            <span className={styles.text}>
              <span className={styles.label}>{r.label}</span>
              <span className={styles.hint}>{r.hint}</span>
            </span>
            <Select
              aria-label={r.label}
              width={150}
              options={r.options}
              value={String(r.value)}
              onChange={(e) => r.set(Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      {tooShort && (
        <p className={styles.fit}>Your weekly hours are too short for this session length.</p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="large"
          fullWidth
          busy={saving}
          onClick={() => onSave({ ...initial, ...v, requiresApproval: initial.requiresApproval })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
