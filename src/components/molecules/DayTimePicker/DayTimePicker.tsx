import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { formatDay, formatTime } from '@/lib/utils/format';
import type { BookingDay } from '@/types/mentor';
import styles from './DayTimePicker.module.css';

type DayTimePickerProps = {
  /** The days that have times, soonest first, across the booking window (none is the caller's state). */
  days: BookingDay[];
  /** Index of the chosen day in `days`. */
  dayIndex: number;
  onDayChange: (index: number) => void;
  /** Selected slot's UTC instant, or null. */
  time: string | null;
  onTimeChange: (startsAt: string) => void;
  timeZone: string;
};

/** Open days per page (owner 2026-11-21: "5 days per view"). */
export const DAYS_PER_PAGE = 5;

/**
 * The open days, five at a time, then the chosen day's times (owner
 * 2026-11-21, from the legacy booking card: only days with times, weekday and
 * date, no count). ‹ › switch pages and choose that page's first day; nothing
 * scrolls, so the card never overflows. Both groups are native radio groups
 * styled as tiles, so arrow keys, focus and announcement come from the platform.
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
  const labelId = `${name}-days`;
  const pages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const page = Math.min(Math.floor(dayIndex / DAYS_PER_PAGE), pages - 1);
  const shown = days.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);
  const toPage = (p: number) => onDayChange(p * DAYS_PER_PAGE);
  const day = days[dayIndex] ?? days[0]!;
  const heading = (() => {
    const f = formatDay(day.date);
    return `${f.weekday}, ${f.date}`;
  })();
  return (
    <div className={styles.picker}>
      <div className={styles.head}>
        <span id={labelId} className={styles.label}>
          Pick a day
        </span>
        <span className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Earlier dates"
            disabled={page === 0}
            onClick={() => toPage(page - 1)}
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Later dates"
            disabled={page >= pages - 1}
            onClick={() => toPage(page + 1)}
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </span>
      </div>
      <fieldset className={styles.fieldset} aria-labelledby={labelId}>
        <legend className="sr-only">Date</legend>
        <div className={styles.days}>
          {shown.map((d, j) => {
            const i = page * DAYS_PER_PAGE + j;
            const f = formatDay(d.date);
            return (
              <label key={d.date} className={styles.option}>
                <input
                  type="radio"
                  className="sr-only"
                  name={`${name}-day`}
                  checked={i === dayIndex}
                  onChange={() => onDayChange(i)}
                  aria-label={`${f.weekday}, ${f.date}`}
                />
                <span className={cx(styles.tile, styles.dayTile)} aria-hidden>
                  <span className={styles.weekday}>{f.weekday}</span>
                  <span className={styles.date}>{f.date}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend className={styles.heading}>{heading}</legend>
        <div className={styles.times}>
          {day.slots.map((s) => (
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
