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
  /**
   * grid — the modal's day grid and time grid.
   * scroll — the phone sheet: days scroll sideways, a visible heading names the
   * day and its count, then a three-column time grid (BookingModal.dc.html).
   */
  layout?: 'grid' | 'scroll';
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
  layout = 'grid',
}: DayTimePickerProps) {
  const name = useId();
  const day = days[dayIndex];
  const scroll = layout === 'scroll';
  const heading = (() => {
    if (!day) return 'Time';
    const f = formatDay(day.date, timeZone);
    const n = day.slots.length;
    return `${f.weekday}, ${f.date} · ${n} ${n === 1 ? 'time' : 'times'}`;
  })();
  return (
    <div className={cx(styles.picker, scroll && styles.scroll)}>
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
        <legend className={scroll ? styles.heading : 'sr-only'}>{scroll ? heading : 'Time'}</legend>
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
