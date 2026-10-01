'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { monthCells, monthStart, type MonthCell } from '@/lib/utils/calendar';
import { addDays } from '@/lib/utils/slots';
import { cx } from '@/lib/utils/cx';
import styles from './MonthPicker.module.css';

type MonthPickerProps = {
  /** Today (YYYY-MM-DD) in the zone the days are counted in. */
  today: string;
  /** Days before this can't be picked and read as past; default today. */
  min?: string;
  /** Blocked days (design `selected`). */
  selected?: readonly string[];
  /** Days with a session booked: a gold ring round the day (design `bookedStyle=ring`). */
  booked?: readonly string[];
  /** Weekdays (0 = Sunday) with open hours, tinted green. */
  available?: readonly number[];
  /** Only days in this range are tinted open (notice to booking window). */
  openFrom?: string;
  openUntil?: string;
  /** No picking: the month at a glance. */
  readOnly?: boolean;
  onPick?: (iso: string) => void;
  showLegend?: boolean;
};

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

const dayLabel = (c: Extract<MonthCell, { kind: 'day' }>) =>
  [
    new Date(`${c.iso}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    c.selected && 'blocked',
    c.booked && 'session booked',
    c.open && 'open for bookings',
  ]
    .filter(Boolean)
    .join(', ');

const weeks = (cells: MonthCell[]) => {
  const rows: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};

/**
 * MonthPicker.dc.html, `soft` layout: one month, Sunday first. Blocked runs
 * join into one band, open weekdays are tinted green, booked days get a gold ring.
 * Read-only it's a summary; with `onPick` the days are buttons in one tab
 * stop, moved through with the arrow keys (ours).
 */
export function MonthPicker({
  today,
  min,
  selected = [],
  booked = [],
  available,
  openFrom,
  openUntil,
  readOnly = false,
  onPick,
  showLegend = false,
}: MonthPickerProps) {
  const [offset, setOffset] = useState(0);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const moved = useRef(false);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();
  const month = monthStart(today, offset);
  const cells = monthCells({ month, today, min, selected, booked, available, openFrom, openUntil });
  const days = cells.filter((c): c is Extract<MonthCell, { kind: 'day' }> => c.kind === 'day');
  const pickable = !readOnly && !!onPick;
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
    if (!moved.current || !focusIso) return;
    moved.current = false;
    dayRefs.current.get(focusIso)?.focus();
  }, [focusIso, month]);

  const go = (iso: string) => {
    const target = monthStart(iso, 0);
    const base = monthStart(today, 0);
    const delta =
      (Number(target.slice(0, 4)) - Number(base.slice(0, 4))) * 12 +
      Number(target.slice(5, 7)) -
      Number(base.slice(5, 7));
    if (delta < 0) return;
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
    <div className={styles.picker}>
      <div className={styles.head}>
        <span id={headingId} className={styles.month} aria-live="polite">
          {monthLabel(month)}
        </span>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            disabled={offset <= 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={() => setOffset((o) => o + 1)}
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
                    label={dayLabel(c)}
                    pickable={pickable}
                    tabStop={c.iso === stop}
                    disabled={c.iso < floor}
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
              Open
            </span>
          )}
          <span className={styles.key}>
            <span aria-hidden className={cx(styles.swatch, styles.swatchBlocked)} />
            Blocked
          </span>
          <span className={styles.key}>
            <span aria-hidden className={cx(styles.swatch, styles.swatchBooked)} />
            Booked
          </span>
        </div>
      )}
    </div>
  );
}

function Day({
  cell: c,
  label,
  pickable,
  tabStop,
  disabled,
  refFn,
  onPick,
  onKey,
}: {
  cell: Extract<MonthCell, { kind: 'day' }>;
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
    c.today && !c.selected && styles.today,
    c.open && styles.open,
    c.selected && (mid ? styles.mid : styles.selected),
    c.booked && (c.selected && !mid ? styles.bookedOnBlue : styles.booked),
    c.past && styles.past,
    (c.today || c.selected) && styles.strong,
  );
  return (
    <span
      role={pickable ? 'gridcell' : 'cell'}
      className={cx(
        styles.cell,
        band && styles.band,
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
        </button>
      ) : (
        <span className={dayClass}>
          <span aria-hidden>{c.day}</span>
          <span className="sr-only">{label}</span>
        </span>
      )}
    </span>
  );
}
