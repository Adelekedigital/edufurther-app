'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BookingRulesRows } from '@/components/organisms/BookingRulesRows/BookingRulesRows';
import { BOOKING_RULES_COPY as C } from '@/lib/copy/calendar';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { slotCount } from '@/lib/utils/calendar';
import { resolveDefaults, type BookingDefaults, type DayHours } from '@/lib/utils/sessionTypeDraft';
import styles from './BookingRulesForm.module.css';

type BookingRulesFormProps = {
  initial: BookingDefaults;
  /** The weekly hours on screen: a length they can't fit is said under the rows. */
  days: DayHours[];
  saving: boolean;
  /** Our copy for a save that failed; the page announces it. */
  error: string | null;
  onCancel: () => void;
  onSave: (next: BookingDefaults) => void;
};

/**
 * Calendar v2's Booking rules modal body (`windowSetup=summary`): Approve
 * bookings, then length, notice, window and buffer in Settings' words, the
 * Settings line, then Cancel / Save. Saves every rule, approval included.
 */
export function BookingRulesForm({
  initial,
  days,
  saving,
  error,
  onCancel,
  onSave,
}: BookingRulesFormProps) {
  const [v, setV] = useState(() => resolveDefaults(initial));
  const cap = initial.maxWindowDays;
  if (cap && v.windowDays > cap) setV({ ...v, windowDays: cap });
  const tooShort = days.some((d) => d.on) && slotCount(days, v.durationMin) === 0;
  return (
    <div className={styles.body}>
      <div className={styles.rows}>
        <BookingRulesRows
          value={v}
          approval={{
            on: v.requiresApproval,
            responseWindowHours: initial.responseWindowHours ?? null,
            onChange: (on) => setV({ ...v, requiresApproval: on }),
          }}
          maxWindowDays={cap}
          copy={BOOKING_COPY.rules}
          onChange={(next) => setV({ ...v, ...next })}
          classes={{ row: styles.row, text: styles.text, label: styles.label, hint: styles.hint }}
          selectWidth={150}
        />
      </div>
      {tooShort && <p className={styles.fit}>{C.tooShort}</p>}
      <p className={styles.settings}>
        <Icon name="tune" size={16} className={styles.settingsIcon} />
        <span>
          {C.settingsLead}{' '}
          {/* A new tab, as drawn: following it here would drop the rules being edited. */}
          <a
            href={C.settingsHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${C.settingsLink} (opens in a new tab)`}
            className={styles.settingsLink}
          >
            {C.settingsLink} ↗
          </a>
        </span>
      </p>
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
        <Button size="large" fullWidth busy={saving} onClick={() => onSave({ ...initial, ...v })}>
          Save
        </Button>
      </div>
    </div>
  );
}
