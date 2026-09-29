'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { hasSlotErrors, type DayHours } from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';
import styles from './SessionTypeWizard.module.css';

type WeeklyHoursFormProps = {
  initial: DayHours[];
  /** The zone the hours are kept in; named above the editor. */
  timeZone: string;
  /** Zones of other active hours: not shown here, and left as they are. */
  otherZones?: string[];
  saving: boolean;
  /** Our copy for a save that failed; announced. */
  error: string | null;
  onCancel: () => void;
  onSave: (days: DayHours[]) => void;
};

/**
 * The "Your weekly hours" modal's body (Session Types.dc.html `hoursOpen`):
 * the mentor's Calendar hours in the compact editor, then Cancel / Save hours.
 * Hours that end before they start, or overlap, are shown on the slot and
 * block the save.
 */
export function WeeklyHoursForm({
  initial,
  timeZone,
  otherZones = [],
  saving,
  error,
  onCancel,
  onSave,
}: WeeklyHoursFormProps) {
  const [days, setDays] = useState(initial);
  const [tried, setTried] = useState(false);
  const invalid = hasSlotErrors(days);
  return (
    <div className={styles.modalBody}>
      {/* PROVISIONAL copy — design request #7. */}
      <p className={styles.zoneNote}>
        <Icon name="schedule" size={16} />
        <span>
          Times in {zoneLabel(timeZone)}.
          {otherZones.length > 0 &&
            ` Hours you set in ${otherZones.map(zoneLabel).join(', ')} aren’t shown here and stay as they are.`}
        </span>
      </p>
      <div className={styles.hoursModalBox}>
        <WeeklyHoursEditor variant="compact" days={days} onChange={setDays} />
      </div>
      {(error || (tried && invalid)) && (
        <p role="alert" className={styles.modalError}>
          <Icon name="error" size={18} />
          {tried && invalid
            ? // PROVISIONAL copy — design request #7.
              'Fix the hours marked in red, then save.'
            : error}
        </p>
      )}
      <div className={styles.modalFooter}>
        <Button size="large" variant="secondary-outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="large"
          busy={saving}
          onClick={() => {
            setTried(true);
            if (!invalid) onSave(days);
          }}
        >
          Save hours
        </Button>
      </div>
    </div>
  );
}
