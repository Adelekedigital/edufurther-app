'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { monthCells, monthStart, monthsBetween, type MonthCell } from '@/lib/utils/calendar';
import { addDays } from '@/lib/utils/slots';
import { cx } from '@/lib/utils/cx';
import styles from './MonthPicker.module.css';

type MonthPickerProps = {
  /** Today (YYYY-MM-DD) in the zone the days are counted in. */
  today: string;
  /**
   * Days before this can't be picked and read as past; default today. Earlier
   * than today (a reporting range), Previous pages back to its month.
   */
  min?: string;
  /** The last pickable day (a reporting range: today); later days read as past, Next stops at its month. */
  max?: string;
  /** Blocked days (design `selected`). */
  selected?: readonly string[];
  /** Days with a session booked: amber with a gold dot (design `bookedStyle=soft`). */
  booked?: readonly string[];
  /** Weekdays (0 = Sunday) with open hours, tinted green. */
  available?: readonly number[];
  /** Only days in this range are tinted open (notice to booking window). */
  openFrom?: string;
  openUntil?: string;
  /** Exact days (YYYY-MM-DD) tinted open: days that have open times. */
  openDays?: readonly string[];
  /**
   * The month to open on (any day in it), kept within the months that can be
   * shown: from today's (or `min`'s, when earlier) to `max`'s.
   */
  initialMonth?: string;
  /** No picking: the month at a glance. Blocked days read grey, as `selectedKind="blocked"`. */
  readOnly?: boolean;
  /**
   * What `selected` means (design `selectedKind`): `blocked` days read grey,
   * as on the month at a glance; `selected` (a pick) stays blue.
   */
  selectedKind?: 'selected' | 'blocked';
  /**
   * What a screen reader hears for a `selected` day. A pick is already
   * announced as pressed, so a picker of one day passes null.
   */
  selectedLabel?: string | null;
  onPick?: (iso: string) => void;
  showLegend?: boolean;
  /** The month shown changed (YYYY-MM-01): the page can load what it needs for it. */
  onMonthChange?: (month: string) => void;
  /**
   * The heading is a month and a year select, so a far month is one pick away,
   * not a click per month (a reporting range, owner 2026-11-12). Needs `max`.
   */
  jump?: boolean;
  /** Moves the view to this month (any day in it) whenever it changes: a typed date. */
  showMonth?: string;
};

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2026, i, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const dayLabel = (c: Extract<MonthCell, { kind: 'day' }>, selectedLabel: string | null) =>
  [
    new Date(`${c.iso}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    c.selected && selectedLabel,
    c.booked && 'session booked',
    c.open && 'available',
  ]
    .filter(Boolean)
    .join(', ');

const weeks = (cells: MonthCell[]) => {
  const rows: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};

/**
 * MonthPicker.dc.html, `soft` layout (`bookedStyle=soft`): one month, Sunday
 * first. Blocked runs join into one band (grey when read-only or blocking,
 * blue for a pick), open weekdays are tinted green, booked days are amber
 * with a gold dot.
 * Read-only it's a summary; with `onPick` the days are buttons in one tab
 * stop, moved through with the arrow keys (ours).
 */
export function MonthPicker({
  today,
  min,
  max,
  selected = [],
  booked = [],
  available,
  openFrom,
  openUntil,
  openDays,
  initialMonth,
  readOnly = false,
  selectedKind = 'selected',
  selectedLabel = 'blocked',
  onPick,
  showLegend = false,
  onMonthChange,
  jump = false,
  showMonth,
}: MonthPickerProps) {
  // Months shown, as offsets from today's: back to min's month only when min
  // is earlier than today (a reporting range); forward to max's, else open.
  // A max before today's month pulls the floor down to it, so max's month shows.
  const maxAt = max ? monthsBetween(today, max) : Infinity;
  const lo = Math.min(min && min < today ? monthsBetween(today, min) : 0, maxAt);
  const hi = Math.max(lo, maxAt);
  const clamp = (o: number) => Math.min(hi, Math.max(lo, o));
  const [offset, setOffset] = useState(() =>
    clamp(initialMonth ? monthsBetween(today, initialMonth) : 0),
  );
  // A new showMonth moves the view, adjusted while rendering (no effect).
  const [shownFor, setShownFor] = useState(showMonth);
  if (showMonth !== shownFor) {
    setShownFor(showMonth);
    if (showMonth) setOffset(clamp(monthsBetween(today, showMonth)));
  }
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const moved = useRef(false);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();
  const month = monthStart(today, offset);
  const cells = monthCells({
    month,
    today,
    min,
    max,
    selected,
    booked,
    available,
    openFrom,
    openUntil,
    openDays,
  });
  const days = cells.filter((c): c is Extract<MonthCell, { kind: 'day' }> => c.kind === 'day');
  const pickable = !readOnly && !!onPick;
  // Design `roBlocked`: blocked days are grey, the pick's blue is kept for a pick.
  const grey = readOnly || selectedKind === 'blocked';
  const cellRole = pickable ? 'gridcell' : 'cell';
  const floor = min ?? today;
  // The one tab stop: the last focused day, else the first blocked day, else today, else the 1st.
  const stop =
    days.find((c) => c.iso === focusIso)?.iso ??
    days.find((c) => c.selected && !c.past)?.iso ??
    days.find((c) => c.iso === today)?.iso ??
    days.find((c) => !c.past)?.iso ??
    days[0]!.iso;

  useEffect(() => {
    onMonthChange?.(month);
  }, [month, onMonthChange]);

  // The jump selects: every year in range, and that year's months in range.
  const year = Number(month.slice(0, 4));
  const yearOf = (o: number) => Number(monthStart(today, o).slice(0, 4));
  const firstYear = yearOf(lo);
  const lastYear = yearOf(Number.isFinite(hi) ? hi : lo + 24);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => String(firstYear + i));
  const offsetOf = (y: number, m: number) =>
    monthsBetween(today, `${y}-${String(m + 1).padStart(2, '0')}-01`);
  const months = MONTH_NAMES.map((label, m) => ({ value: String(m), label })).filter(
    (o) => offsetOf(year, Number(o.value)) >= lo && offsetOf(year, Number(o.value)) <= hi,
  );

  useEffect(() => {
    if (!moved.current || !focusIso) return;
    moved.current = false;
    dayRefs.current.get(focusIso)?.focus();
  }, [focusIso, month]);

  const go = (iso: string) => {
    const delta = monthsBetween(today, iso);
    if (delta < lo || delta > hi) return;
    moved.current = true;
    setOffset(delta);
    setFocusIso(iso);
  };

  const onKey = (e: KeyboardEvent, c: Extract<MonthCell, { kind: 'day' }>) => {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -c.weekday,
      End: 6 - c.weekday,
    };
    if (e.key in step) {
      e.preventDefault();
      go(addDays(c.iso, step[e.key]!));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const [y, m, d] = c.iso.split('-').map(Number) as [number, number, number];
      const next = new Date(Date.UTC(y, m - 1 + (e.key === 'PageDown' ? 1 : -1), 1));
      const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
      go(addDays(next.toISOString().slice(0, 10), Math.min(d, last.getUTCDate()) - 1));
    }
  };

  return (
    <div className={cx(styles.picker, grey && styles.pickerGrey)}>
      <div className={styles.head}>
        <span id={headingId} className={cx(styles.month, jump && 'sr-only')} aria-live="polite">
          {monthLabel(month)}
        </span>
        {jump && (
          <div className={styles.jump}>
            <Select
              aria-label="Month"
              className={styles.jumpMonth}
              density="compact"
              text="sm"
              options={months}
              value={String(Number(month.slice(5, 7)) - 1)}
              onChange={(e) => setOffset(clamp(offsetOf(year, Number(e.target.value))))}
            />
            <Select
              aria-label="Year"
              className={styles.jumpYear}
              density="compact"
              text="sm"
              options={years.map((y) => ({ value: y, label: y }))}
              value={String(year)}
              onChange={(e) =>
                setOffset(clamp(offsetOf(Number(e.target.value), Number(month.slice(5, 7)) - 1)))
              }
            />
          </div>
        )}
        {/* aria-disabled, not disabled: a button that disables itself while
            focused would drop focus to the page. At an end a press does nothing. */}
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            aria-disabled={offset <= lo || undefined}
            onClick={() => setOffset((o) => clamp(o - 1))}
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            aria-disabled={offset >= hi || undefined}
            onClick={() => setOffset((o) => clamp(o + 1))}
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>
      <div
        // Pickable it is a grid (arrow keys); read-only a plain table to read through.
        role={pickable ? 'grid' : 'table'}
        className={styles.grid}
        aria-labelledby={headingId}
      >
        <div role="row" className={styles.weekdays}>
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              role="columnheader"
              aria-label={WEEKDAY_NAMES[i]}
              className={styles.weekday}
            >
              {w}
            </span>
          ))}
        </div>
        <div role="rowgroup" className={styles.weeks}>
          {weeks(cells).map((row, r) => (
            <div key={r} role="row" className={styles.week}>
              {row.map((c, i) =>
                c.kind === 'pad' ? (
                  <span key={`p${i}`} role={cellRole} className={styles.pad} />
                ) : (
                  <Day
                    key={c.iso}
                    cell={c}
                    grey={grey}
                    label={dayLabel(c, selectedLabel)}
                    pickable={pickable}
                    tabStop={c.iso === stop}
                    disabled={c.iso < floor || (!!max && c.iso > max)}
                    refFn={(el) => {
                      if (el) dayRefs.current.set(c.iso, el);
                      else dayRefs.current.delete(c.iso);
                    }}
                    onPick={() => {
                      setFocusIso(c.iso);
                      onPick?.(c.iso);
                    }}
                    onKey={(e) => onKey(e, c)}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {available && (
            <span className={styles.key}>
              <span aria-hidden className={cx(styles.swatch, styles.swatchOpen)} />
              Available
            </span>
          )}
          <span className={styles.key}>
            <span aria-hidden className={cx(styles.swatch, styles.swatchBooked)} />
            Booked
          </span>
          <span className={styles.key}>
            <span
              aria-hidden
              className={cx(styles.swatch, grey ? styles.swatchBlockedGrey : styles.swatchBlocked)}
            />
            Blocked
          </span>
        </div>
      )}
    </div>
  );
}

function Day({
  cell: c,
  grey,
  label,
  pickable,
  tabStop,
  disabled,
  refFn,
  onPick,
  onKey,
}: {
  cell: Extract<MonthCell, { kind: 'day' }>;
  /** Blocked days read grey (design `roBlocked`). */
  grey: boolean;
  label: string;
  pickable: boolean;
  tabStop: boolean;
  disabled: boolean;
  refFn: (el: HTMLButtonElement | null) => void;
  onPick: () => void;
  onKey: (e: KeyboardEvent) => void;
}) {
  const mid = c.selected && c.joinPrev && c.joinNext;
  const band = c.selected && (c.joinPrev || c.joinNext);
  const dayClass = cx(
    styles.day,
    c.today && (!c.selected || grey) && styles.today,
    c.open && styles.open,
    c.booked && !c.selected && styles.booked,
    c.selected &&
      (grey ? (mid ? styles.midGrey : styles.selectedGrey) : mid ? styles.mid : styles.selected),
    c.past && styles.past,
    (c.today || c.selected) && styles.strong,
  );
  // The booked dot; white only on a blue pick's end (design `dot`).
  const dot = c.booked && (
    <span aria-hidden className={cx(styles.dot, c.selected && !mid && !grey && styles.dotOnBlue)} />
  );
  return (
    <span
      role={pickable ? 'gridcell' : 'cell'}
      className={cx(
        styles.cell,
        band && (grey ? styles.bandGrey : styles.band),
        c.joinPrev && styles.joinPrev,
        c.joinNext && styles.joinNext,
      )}
    >
      {pickable ? (
        <button
          ref={refFn}
          type="button"
          className={dayClass}
          aria-label={label}
          aria-pressed={c.selected}
          aria-disabled={disabled || undefined}
          tabIndex={tabStop ? 0 : -1}
          onClick={() => !disabled && onPick()}
          onKeyDown={onKey}
        >
          {c.day}
          {dot}
        </button>
      ) : (
        <span className={dayClass}>
          <span aria-hidden>{c.day}</span>
          <span className="sr-only">{label}</span>
          {dot}
        </span>
      )}
    </span>
  );
}
