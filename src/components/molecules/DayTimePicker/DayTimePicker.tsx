import { useCallback, useEffect, useId, useRef, useState } from 'react';
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

/**
 * The open days in one scrolling row, then the chosen day's times (owner
 * 2026-11-21, from the legacy booking card: only days with times, each with its
 * weekday and date, no count; ‹ › scroll the row). Both groups are native radio
 * groups styled as tiles, so arrow keys, focus and announcement come from the platform.
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
  const row = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  // Which way the row can still scroll, for the arrows.
  const measure = useCallback(() => {
    const r = row.current;
    if (!r) return;
    setEnds({
      start: r.scrollLeft <= 1,
      end: r.scrollLeft + r.clientWidth >= r.scrollWidth - 1,
    });
  }, []);
  useEffect(() => {
    measure();
    const r = row.current;
    if (!r || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    return () => ro.disconnect();
  }, [measure, days.length]);
  // The chosen day stays in view (a zone change regroups the days, an opened time picks one).
  useEffect(() => {
    const r = row.current;
    const tile = r?.querySelectorAll<HTMLElement>('label')[dayIndex];
    if (!r || !tile) return;
    const left = tile.offsetLeft - r.offsetLeft;
    if (left < r.scrollLeft || left + tile.offsetWidth > r.scrollLeft + r.clientWidth)
      r.scrollTo?.({ left: left - (r.clientWidth - tile.offsetWidth) / 2 });
  }, [dayIndex, days]);
  const page = (dir: 1 | -1) => {
    const r = row.current;
    r?.scrollBy?.({ left: dir * r.clientWidth * 0.8, behavior: 'smooth' });
  };
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
            disabled={ends.start}
            onClick={() => page(-1)}
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Later dates"
            disabled={ends.end}
            onClick={() => page(1)}
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </span>
      </div>
      <fieldset className={styles.fieldset} aria-labelledby={labelId}>
        <legend className="sr-only">Date</legend>
        <div ref={row} className={styles.days} onScroll={measure}>
          {days.map((d, i) => {
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
