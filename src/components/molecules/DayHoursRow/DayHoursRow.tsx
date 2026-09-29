import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { TIME_OPTIONS, type DayHours, type Slot } from '@/lib/utils/sessionTypeDraft';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { Switch } from '@/components/atoms/Switch/Switch';
import styles from './DayHoursRow.module.css';

type DayHoursRowProps = {
  day: string;
  hours: DayHours;
  /** Per slot: our message, or null (end before start, overlap). */
  errors: (string | null)[];
  onToggle: (on: boolean) => void;
  onSlot: (k: number, slot: Slot) => void;
  onRemove: (k: number) => void;
  onAdd: () => void;
  onCopyAll: () => void;
  /** compact: TimeSlots.dc.html `compact` (the weekly-hours modal): icon actions, short errors. */
  variant?: 'list' | 'compact';
};

/** Design `errorShort`. */
const shortError = (err: string) =>
  err.startsWith('End time') ? 'Ends before it starts' : 'Overlaps';

/**
 * One day of weekly hours (TimeSlots.dc.html, variant list or compact): a switch, then
 * "Unavailable" or each start–end pair with its error, "Add hours" and
 * "Copy to all days".
 */
export function DayHoursRow({
  day,
  hours,
  errors,
  onToggle,
  onSlot,
  onRemove,
  onAdd,
  onCopyAll,
  variant = 'list',
}: DayHoursRowProps) {
  const id = useId();
  if (variant === 'compact')
    return (
      <div className={styles.cRow} role="group" aria-labelledby={`${id}-day`}>
        <div className={styles.cHead}>
          <Switch checked={hours.on} onChange={onToggle} aria-labelledby={`${id}-day`} />
          <span className={cx(styles.day, !hours.on && styles.dayOff)} aria-hidden="true">
            {day.slice(0, 3)}
          </span>
          <span id={`${id}-day`} className="sr-only">
            {day}
          </span>
        </div>
        {!hours.on ? (
          <span className={styles.cOff}>Unavailable</span>
        ) : (
          <div className={styles.cSlots}>
            {hours.slots.map(([a, b], k) => {
              const err = errors[k];
              const errId = `${id}-e${k}`;
              return (
                <div key={k} className={styles.cSlot} title={err ?? undefined}>
                  <Select
                    aria-label={`${day} start time`}
                    density="compact"
                    width={104}
                    className={styles.cTime}
                    options={TIME_OPTIONS}
                    value={String(a)}
                    invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    onChange={(e) => onSlot(k, [Number(e.target.value), b])}
                  />
                  <span className={styles.to} aria-hidden="true">
                    –
                  </span>
                  <Select
                    aria-label={`${day} end time`}
                    density="compact"
                    width={104}
                    className={styles.cTime}
                    options={TIME_OPTIONS}
                    value={String(b)}
                    invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    onChange={(e) => onSlot(k, [a, Number(e.target.value)])}
                  />
                  <button
                    type="button"
                    className={styles.cIcon}
                    aria-label={`Remove these hours on ${day}`}
                    title="Remove these hours"
                    onClick={() => onRemove(k)}
                  >
                    <Icon name="close" size={18} />
                  </button>
                  {err && (
                    <span id={errId} className={styles.cError}>
                      <span aria-hidden="true">{shortError(err)}</span>
                      <span className="sr-only">{err}</span>
                    </span>
                  )}
                </div>
              );
            })}
            <div className={styles.cActions}>
              <button
                type="button"
                className={styles.cIcon}
                aria-label={`Add hours on ${day}`}
                title="Add hours"
                onClick={onAdd}
              >
                <Icon name="add" size={18} />
              </button>
              <button
                type="button"
                className={styles.cIcon}
                aria-label={`Copy ${day}’s hours to all days`}
                title="Copy to all days"
                onClick={onCopyAll}
              >
                <Icon name="content_copy" size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  return (
    <div className={styles.row} role="group" aria-labelledby={`${id}-day`}>
      <div className={styles.head}>
        <Switch checked={hours.on} onChange={onToggle} aria-labelledby={`${id}-day`} />
        <span id={`${id}-day`} className={cx(styles.day, !hours.on && styles.dayOff)}>
          {day}
        </span>
      </div>
      {!hours.on ? (
        <span className={styles.off}>Unavailable</span>
      ) : (
        <div className={styles.slots}>
          {hours.slots.map(([a, b], k) => {
            const err = errors[k];
            const errId = `${id}-e${k}`;
            return (
              <div key={k} className={styles.slot}>
                <div className={styles.slotRow}>
                  <Select
                    aria-label={`${day} start time`}
                    width={128}
                    className={styles.time}
                    options={TIME_OPTIONS}
                    value={String(a)}
                    invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    onChange={(e) => onSlot(k, [Number(e.target.value), b])}
                  />
                  <span className={styles.to}>to</span>
                  <Select
                    aria-label={`${day} end time`}
                    width={128}
                    className={styles.time}
                    options={TIME_OPTIONS}
                    value={String(b)}
                    invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    onChange={(e) => onSlot(k, [a, Number(e.target.value)])}
                  />
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove these hours on ${day}`}
                    title="Remove"
                    onClick={() => onRemove(k)}
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
                {err && (
                  <span id={errId} className={styles.error}>
                    {err}
                  </span>
                )}
              </div>
            );
          })}
          <div className={styles.actions}>
            <button type="button" className={styles.add} onClick={onAdd}>
              <Icon name="add" size={16} />
              Add hours<span className="sr-only"> on {day}</span>
            </button>
            <button type="button" className={styles.copy} onClick={onCopyAll}>
              <Icon name="content_copy" size={16} />
              Copy to all days
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
