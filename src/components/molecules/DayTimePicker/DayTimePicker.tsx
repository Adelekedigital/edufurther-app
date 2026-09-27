import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { formatDay, formatTime } from '@/lib/utils/format';
import type { BookingDay } from '@/types/mentor';
import styles from './DayTimePicker.module.css';

type DayTimePickerProps = {
  days: BookingDay[];
  dayIndex: number;
  onDayChange: (index: number) => void;
  /** Selected slot's UTC instant, or null. */
  time: string | null;
  onTimeChange: (startsAt: string) => void;
  timeZone: string;
};

/**
 * Day strip + time grid. Both are native radio groups styled as tiles, so
 * arrow keys, focus and announcement come from the platform.
 */
export function DayTimePicker({
  days,
  dayIndex,
  onDayChange,
  time,
  onTimeChange,
  timeZone,
}: DayTimePickerProps) {
  const name = useId();
  const day = days[dayIndex];
  return (
    <div className={styles.picker}>
      <fieldset className={styles.fieldset}>
        <legend className="sr-only">Date</legend>
        <div className={styles.days}>
          {days.map((d, i) => {
            const f = formatDay(d.date, timeZone);
            const n = d.slots.length;
            return (
              <label key={d.date} className={styles.option}>
                <input
                  type="radio"
                  className="sr-only"
                  name={`${name}-day`}
                  checked={i === dayIndex}
                  onChange={() => onDayChange(i)}
                />
                <span className={cx(styles.tile, styles.dayTile)}>
                  <span className={styles.weekday}>{f.weekday}</span>
                  <span className={styles.date}>{f.date}</span>
                  <span className={styles.slots}>
                    {n} {n === 1 ? 'slot' : 'slots'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend className="sr-only">Time</legend>
        <div className={styles.times}>
          {day?.slots.map((s) => (
            <label key={s.startsAt} className={styles.option}>
              <input
                type="radio"
                className="sr-only"
                name={`${name}-time`}
                checked={time === s.startsAt}
                onChange={() => onTimeChange(s.startsAt)}
              />
              <span className={cx(styles.tile, styles.timeTile)}>
                {formatTime(s.startsAt, timeZone)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
