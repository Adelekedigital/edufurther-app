import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { formatDay, formatTime } from '@/lib/utils/format';
import type { BookingDay } from '@/types/mentor';
import styles from './DayTimePicker.module.css';

type DayTimePickerProps = {
  /** The seven days of the week on show; days with no slots render disabled. */
  days: BookingDay[];
  /** Index of the chosen day in `days`, or null when the week has nothing open. */
  dayIndex: number | null;
  onDayChange: (index: number) => void;
  /** Selected slot's UTC instant, or null. */
  time: string | null;
  onTimeChange: (startsAt: string) => void;
  timeZone: string;
  /** The week switcher: "Next 7 days · Sep 27 – Oct 3" with ‹ ›. */
  week: {
    label: string;
    canPrev: boolean;
    canNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    /**
     * An empty week's way on (BookingModal.dc.html, design reply #40): the
     * next week that has times, e.g. "Show Oct 4 – Oct 10". Null when no later
     * week has any ("Check back soon.").
     */
    nextOpen?: { label: string; onClick: () => void } | null;
  };
};

/**
 * A week of day tiles, then the chosen day's times (Mentor Profile.dc.html
 * booking card: 7 tiles, a dot on open days, empty days disabled, a week
 * switcher, a 3-column time grid). Both groups are native radio groups
 * styled as tiles, so arrow keys, focus and announcement come from the platform.
 */
export function DayTimePicker({
  days,
  dayIndex,
  onDayChange,
  time,
  onTimeChange,
  timeZone,
  week,
}: DayTimePickerProps) {
  const name = useId();
  const labelId = `${name}-week`;
  const day = dayIndex === null ? null : days[dayIndex];
  const heading = day
    ? (() => {
        const f = formatDay(day.date);
        const n = day.slots.length;
        return `${f.weekday}, ${f.date} · ${n} ${n === 1 ? 'time' : 'times'}`;
      })()
    : 'Time';
  return (
    <div className={styles.picker}>
      <div className={styles.weekHead}>
        <span id={labelId} className={styles.weekLabel}>
          {week.label}
        </span>
        <span className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Earlier dates"
            disabled={!week.canPrev}
            onClick={week.onPrev}
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Later dates"
            disabled={!week.canNext}
            onClick={week.onNext}
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </span>
      </div>
      <fieldset className={styles.fieldset} aria-labelledby={labelId}>
        <legend className="sr-only">Date</legend>
        <div className={styles.days}>
          {days.map((d, i) => {
            const f = formatDay(d.date);
            const none = d.slots.length === 0;
            const n = d.slots.length;
            return (
              <label key={d.date} className={cx(styles.option, none && styles.none)}>
                <input
                  type="radio"
                  className="sr-only"
                  name={`${name}-day`}
                  checked={i === dayIndex}
                  disabled={none}
                  onChange={() => onDayChange(i)}
                  aria-label={`${f.weekday}, ${f.date}, ${none ? 'no open times' : `${n} ${n === 1 ? 'time' : 'times'}`}`}
                />
                <span className={cx(styles.tile, styles.dayTile)} aria-hidden>
                  <span className={styles.weekday}>{f.weekday}</span>
                  <span className={styles.date}>{Number(d.date.slice(8))}</span>
                  <span className={styles.dot} />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {day ? (
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
      ) : (
        // BookingModal.dc.html weekEmpty (design reply #40).
        <div className={styles.emptyWeek} role="status">
          <span className={styles.emptyTitle}>No open times this week</span>
          <span className={styles.emptyBody}>
            {week.nextOpen ? 'Try later dates.' : 'Check back soon.'}
          </span>
          {week.nextOpen && (
            <button type="button" className={styles.emptyJump} onClick={week.nextOpen.onClick}>
              {week.nextOpen.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
