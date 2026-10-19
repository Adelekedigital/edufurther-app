'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import {
  BookingRulesRows,
  type BookingRulesCopy,
} from '@/components/organisms/BookingRulesRows/BookingRulesRows';
import { slotCount } from '@/lib/utils/calendar';
import { resolveDefaults, type BookingDefaults, type DayHours } from '@/lib/utils/sessionTypeDraft';
import styles from './SchedulingWindowForm.module.css';

type SchedulingWindowFormProps = {
  initial: BookingDefaults;
  /** The weekly hours on screen: a length they can't fit is said under the rows. */
  days: DayHours[];
  saving: boolean;
  /** Our copy for a save that failed; the page announces it. */
  error: string | null;
  onCancel: () => void;
  onSave: (next: BookingDefaults) => void;
};

/** Calendar v2's words for the four rows. */
const CALENDAR_COPY: BookingRulesCopy = {
  durationMin: { label: 'Session length', hint: 'How long each booking lasts.' },
  noticeHours: { label: 'Minimum notice', hint: 'How soon before a session mentees can book.' },
  windowDays: { label: 'Book up to', hint: 'How far ahead your calendar is open.' },
  breakMin: { label: 'Break between sessions', hint: 'Kept free after each booking.' },
};

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
  const tooShort = days.some((d) => d.on) && slotCount(days, v.durationMin) === 0;
  return (
    <div className={styles.body}>
      <div className={styles.rows}>
        <BookingRulesRows
          value={v}
          maxWindowDays={cap}
          copy={CALENDAR_COPY}
          onChange={(next) => setV({ ...v, ...next })}
          classes={{ row: styles.row, text: styles.text, label: styles.label, hint: styles.hint }}
          selectWidth={150}
        />
      </div>
      {tooShort && (
        <p className={styles.fit}>Your weekly hours are too short for this session length.</p>
      )}
      {error && (
        <p className={styles.error}>
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button
          size="large"
          variant="secondary-outlined"
          fullWidth
          // A sent save can't be called back: no cancelling while it's on its way.
          disabled={saving}
          onClick={onCancel}
        >
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
