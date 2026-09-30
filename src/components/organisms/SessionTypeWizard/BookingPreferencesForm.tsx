'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { resolveDefaults, type BookingDefaults } from '@/lib/utils/sessionTypeDraft';
import { breakOptions, durationOptions, noticeOptions, windowOptions } from './SchedulingStep';
import styles from './SessionTypeWizard.module.css';

type BookingPreferencesFormProps = {
  initial: BookingDefaults;
  saving: boolean;
  /** Our copy for a save that failed; announced. */
  error: string | null;
  onCancel: () => void;
  onSave: (next: BookingDefaults) => void;
};

/**
 * The Booking preferences modal's body (Session Types.dc.html `defaultsOpen`,
 * rulesNaming=settings): the five defaults every "Use my defaults" type
 * follows, then Cancel / Save defaults.
 */
export function BookingPreferencesForm({
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: BookingPreferencesFormProps) {
  const [v, setV] = useState(() => resolveDefaults(initial));
  const row = (
    label: string,
    hint: string,
    value: string,
    options: { value: string; label: string }[],
    set: (value: string) => void,
  ) => (
    <div className={styles.ruleRow}>
      <span className={styles.prefText}>
        <span className={styles.ruleLabel}>{label}</span>
        <span className={styles.ruleHint}>{hint}</span>
      </span>
      <Select
        aria-label={label}
        width={180}
        options={options}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );
  return (
    <div className={styles.modalBody}>
      <div className={styles.rules}>
        {row(
          'Session length',
          'How long each booking lasts.',
          String(v.durationMin),
          durationOptions(v.durationMin),
          (x) => setV({ ...v, durationMin: Number(x) }),
        )}
        {row(
          'Minimum notice',
          'Mentees can’t book with less notice.',
          String(v.noticeHours),
          noticeOptions(v.noticeHours),
          (x) => setV({ ...v, noticeHours: Number(x) }),
        )}
        {row(
          'Bookable up to',
          'How far ahead mentees can book.',
          String(v.windowDays),
          windowOptions(v.windowDays, initial.maxWindowDays),
          (x) => setV({ ...v, windowDays: Number(x) }),
        )}
        {row(
          'Break after each session',
          'Time kept free between bookings.',
          String(v.breakMin),
          breakOptions(v.breakMin),
          (x) => setV({ ...v, breakMin: Number(x) }),
        )}
        {row(
          'Approve each booking',
          'You review each request before it’s booked.',
          v.requiresApproval ? 'on' : 'off',
          [
            { value: 'on', label: 'Approve each request' },
            { value: 'off', label: 'Confirm instantly' },
          ],
          (x) => setV({ ...v, requiresApproval: x === 'on' }),
        )}
      </div>
      {error && (
        <p role="alert" className={styles.modalError}>
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
      <div className={styles.modalFooter}>
        <Button size="large" variant="secondary-outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="large" busy={saving} onClick={() => onSave(v)}>
          Save defaults
        </Button>
      </div>
    </div>
  );
}
