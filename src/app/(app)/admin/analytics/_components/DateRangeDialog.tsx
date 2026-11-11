'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { DATE_PICKER } from '@/lib/copy/adminAnalytics';
import { ANALYTICS_MIN_DAY, daysBetween, nextDraft } from '@/lib/utils/analytics';
import styles from './DateRangeDialog.module.css';

type Range = { from: string; to: string };

/**
 * "Choose dates" (Admin Analytics.dc.html `pickOpen`; Modal `kind="picker"`:
 * a dialog on desktop, a sheet on phones). One click picks a day, a second
 * makes a range in either order, a third starts again. Nothing changes until
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
  const [draft, setDraft] = useState<Range | null>(initial);
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
        <MonthPicker
          today={today}
          min={ANALYTICS_MIN_DAY}
          max={today}
          initialMonth={draft?.from ?? today}
          selected={draft ? daysBetween(draft.from, draft.to) : []}
          // The picked days are announced as pressed.
          selectedLabel={null}
          onPick={(day) => setDraft((d) => nextDraft(d, day))}
        />
        <div className={styles.actions}>
          <Button variant="text" size="small" onClick={onClose}>
            {DATE_PICKER.cancel}
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={!draft}
            onClick={() => {
              if (!draft) return;
              onApply(draft);
            }}
          >
            {DATE_PICKER.apply}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
