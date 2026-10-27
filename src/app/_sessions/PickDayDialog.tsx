'use client';

import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { todayIn } from '@/lib/utils/calendar';
import { formatTime } from '@/lib/utils/format';
import { dayKey, groupSlotsByDay } from '@/lib/utils/slots';
import styles from './PickDayDialog.module.css';

type PickDayDialogProps = {
  /** The open times the chips came from: the one availability read, never a second. */
  slots: readonly string[];
  /** The display zone: days and times are the viewer's. */
  timeZone: string;
  /** The time already picked, if any: the dialog opens on its day. */
  value: string | null;
  /** The other party's first name: "{First} sees their own." */
  otherFirst: string;
  onUse: (startsAt: string) => void;
  onClose: () => void;
  now?: Date;
};

/** "Monday, Oct 12", for a calendar date (PRD fix 5: "Open on {Weekday, Mon D}"). */
const dayHeading = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/**
 * "Pick another day" (SuggestTime.dc.html `dayPicker`): a month calendar over
 * the cancel dialog, then that day's open times as chips.
 *
 * Days are marked from the same slots the chips show, so a time here is always
 * one `/slots` listed and the offer can't 422. Nothing changes until "Use this
 * time": Go back, the X and Escape all leave the picked time as it was.
 */
export function PickDayDialog({
  slots,
  timeZone,
  value,
  otherFirst,
  onUse,
  onClose,
  now,
}: PickDayDialogProps) {
  const byDay = useMemo(() => groupSlotsByDay(slots, timeZone), [slots, timeZone]);
  const openDays = useMemo(() => byDay.map((d) => d.date), [byDay]);
  // Opens on the picked time's day, else the earliest open day.
  const [day, setDay] = useState<string | null>(() =>
    value ? dayKey(value, timeZone) : (byDay[0]?.date ?? null),
  );
  const [time, setTime] = useState<string | null>(value);
  const timesId = useId();
  const today = todayIn(timeZone, now);
  const times = byDay.find((d) => d.date === day)?.slots.map((s) => s.startsAt) ?? [];

  return (
    <ModalShell
      title="Pick another day"
      subtitle={`Times shown in your time zone. ${otherFirst} sees their own.`}
      size="sm"
      mobile="centred"
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <Button variant="secondary-outlined" size="large" onClick={onClose}>
            Go back
          </Button>
          <Button
            variant="primary"
            size="large"
            disabled={!time}
            onClick={() => {
              if (!time) return;
              onUse(time);
              onClose();
            }}
          >
            Use this time
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <MonthPicker
          today={today}
          initialMonth={day ?? undefined}
          openDays={openDays}
          selected={day ? [day] : []}
          // The pick is announced as pressed; "blocked" would be untrue here.
          selectedLabel={null}
          onPick={(iso) => {
            setDay(iso);
            // A time belongs to its day: picking another day takes it back.
            if (!time || dayKey(time, timeZone) !== iso) setTime(null);
          }}
        />
        {day && (
          <div className={styles.times}>
            <span id={timesId} className={styles.timesLabel}>
              Open on {dayHeading(day)}
            </span>
            {times.length ? (
              <div className={styles.chips} role="radiogroup" aria-labelledby={timesId}>
                {times.map((iso) => (
                  <Chip
                    key={iso}
                    role="radio"
                    pressed={time === iso}
                    onClick={() => setTime(time === iso ? null : iso)}
                  >
                    {formatTime(iso, timeZone)}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className={styles.none}>No open times this day.</p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
