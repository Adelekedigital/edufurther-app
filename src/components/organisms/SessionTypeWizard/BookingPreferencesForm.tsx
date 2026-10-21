'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BookingRulesRows } from '@/components/organisms/BookingRulesRows/BookingRulesRows';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { resolveDefaults, type BookingDefaults } from '@/lib/utils/sessionTypeDraft';
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
 * The Booking rules modal's body (Session Types.dc.html `defaultsOpen`,
 * rulesNaming=settings): the defaults every "Use my defaults" session follows,
 * drawn with Settings' rows (approval first), then Cancel / Save defaults.
 */
export function BookingPreferencesForm({
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: BookingPreferencesFormProps) {
  const [v, setV] = useState(() => resolveDefaults(initial));
  // A cap that arrives lower while the form is open (after a refused save
  // reloads it) brings the window within it; the other choices stay.
  const cap = initial.maxWindowDays;
  if (cap && v.windowDays > cap) setV({ ...v, windowDays: cap });
  return (
    <div className={styles.modalBody}>
      <div className={styles.rules}>
        <BookingRulesRows
          value={v}
          approval={{
            on: v.requiresApproval,
            responseWindowHours: initial.responseWindowHours ?? null,
            onChange: (on) => setV({ ...v, requiresApproval: on }),
          }}
          maxWindowDays={cap}
          copy={BOOKING_COPY.rules}
          onChange={(rules) => setV({ ...v, ...rules })}
          classes={{
            row: styles.ruleRow,
            text: styles.prefText,
            label: styles.ruleLabel,
            hint: styles.ruleHint,
          }}
          selectWidth={180}
        />
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
