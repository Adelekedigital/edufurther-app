'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { cx } from '@/lib/utils/cx';
import { buildChartModel, type ChartRange, type ChartSeries } from './model';
import styles from './PerformanceChart.module.css';

type PerformanceChartProps = {
  /** Oldest-first monthly series, each aligned 1:1 with `months`. */
  series: ChartSeries[];
  /** 'YYYY-MM', oldest first. */
  months: string[];
  title?: string;
  /** Chart type when `chartSwitch` is 'hide'; ignored when the switch shows. */
  variant?: 'bar' | 'line';
  yUnit?: string;
  ranges?: ChartRange[];
  defaultRange?: string;
  /**
   * How the legend collapses once the card is narrow (< 440px): 'compact' hides
   * the chip labels, 'wrap' keeps them wrapping, 'dropdown' swaps the chips for
   * a disclosure menu. Default 'compact'.
   */
  mobileLegend?: 'compact' | 'dropdown' | 'wrap';
  /**
   * Whether the bar/line chart-type switch shows (default 'show'). When shown,
   * the mentor picks and the choice is remembered; 'hide' pins it to `variant`.
   */
  chartSwitch?: 'show' | 'hide';
  /**
   * Called with the active range key ('3m' | '6m' | '12m' | 'y<year>') on mount
   * and whenever it changes, so a sibling can follow the same window.
   */
  onRangeChange?: (range: string) => void;
};

const DEFAULT_RANGES: ChartRange[] = [
  { key: '3m', label: '3M', n: 3 },
  { key: '6m', label: '6M', n: 6 },
  { key: '12m', label: '12M', n: 12 },
];

/** The card is "narrow" below this width (design's ResizeObserver threshold). */
const NARROW_MAX = 440;

/** The bar/line switch, as the design draws it (bar_chart / show_chart icons). */
const CHART_TYPES = [
  { key: 'bar', icon: 'bar_chart', label: 'Bar chart' },
  { key: 'line', icon: 'show_chart', label: 'Line chart' },
] as const;

const CHART_TYPE_KEY = 'ef-chart-type';
// A tiny external store over localStorage['ef-chart-type'], read through
// useSyncExternalStore: the value is SSR-safe (the server snapshot is null, so no
// hydration mismatch) and every mounted chart re-reads when the pick changes —
// here or in another tab.
const chartTypeListeners = new Set<() => void>();
/** The mentor's remembered chart type, or null before they pick (per device). */
function readChartType(): 'bar' | 'line' | null {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(CHART_TYPE_KEY) : null;
    return v === 'bar' || v === 'line' ? v : null;
  } catch {
    return null;
  }
}
function persistChartType(v: 'bar' | 'line') {
  try {
    localStorage.setItem(CHART_TYPE_KEY, v);
  } catch {
    /* private mode / blocked storage: the pick just won't be remembered */
  }
  chartTypeListeners.forEach((cb) => cb());
}
function subscribeChartType(cb: () => void) {
  chartTypeListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CHART_TYPE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    chartTypeListeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Session performance over time (Mentor Dashboard v2 / PerformanceChart.dc.html):
 * stacked bars (or lines) of each month's sessions by outcome, with a range
 * switch, a legend that filters, and a hover tooltip. Presentational — the page
 * supplies `series` + `months`; the geometry is the design's 600×262 viewBox.
 *
 * The legend is responsive: a ResizeObserver watches the card, and below 440px
 * it collapses per `mobileLegend` (our dashboard uses the dropdown).
 */
export function PerformanceChart({
  series,
  months,
  title = 'Session performance',
  variant = 'bar',
  yUnit = 'Sessions',
  ranges = DEFAULT_RANGES,
  defaultRange = '6m',
  mobileLegend = 'compact',
  chartSwitch = 'show',
  onRangeChange,
}: PerformanceChartProps) {
  const [range, setRange] = useState(defaultRange);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState(-1);
  const [narrow, setNarrow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const radiosRef = useRef<HTMLDivElement>(null);
  const typesRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const narrowRef = useRef(false);
  const menuId = useId();
  // The remembered chart type, read from the external store above.
  const chartType = useSyncExternalStore(subscribeChartType, readChartType, () => null);

  const showSwitch = chartSwitch === 'show';
  // Before any pick: bars for short ranges, a line for a year+ (the trend view).
  const longRange = range.startsWith('y') || (ranges.find((r) => r.key === range)?.n ?? 6) >= 12;
  const effectiveVariant = showSwitch ? chartType ?? (longRange ? 'line' : 'bar') : variant;

  const m = useMemo(
    () =>
      buildChartModel({
        series,
        months,
        ranges,
        variant: effectiveVariant,
        range,
        hidden,
        hover,
        title,
        yUnit,
        narrow,
        mobileLegend,
      }),
    [series, months, ranges, effectiveVariant, range, hidden, hover, title, yUnit, narrow, mobileLegend],
  );

  // Track the card width. ResizeObserver, not a media query: the card narrows
  // with its column, not the viewport, and reflows the same in Storybook.
  // Crossing the boundary closes the menu (its anchor may vanish); the ref
  // guards against acting on every resize tick and stale-closure reads.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const n = entry.contentRect.width < NARROW_MAX;
      if (n === narrowRef.current) return;
      narrowRef.current = n;
      setNarrow(n);
      setMenuOpen(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On open, move focus into the menu; a click outside closes it.
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || menuTriggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [menuOpen]);

  // Report the active range up (the session-quality card follows it). Fires on
  // mount and on every change; a parent that stores it bails on an equal value.
  useEffect(() => {
    onRangeChange?.(range);
  }, [range, onRangeChange]);

  const toggle = (key: string) =>
    setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));

  const closeMenu = () => {
    setMenuOpen(false);
    menuTriggerRef.current?.focus();
  };

  // Roving focus inside the menu: arrows move, Home/End jump, Escape closes and
  // returns to the trigger, Tab closes and lets focus leave.
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      // Return focus to the trigger so the browser's Tab continues from there;
      // closing alone would unmount the focused item and drop focus to <body>.
      closeMenu();
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]') ?? [],
    );
    if (items.length === 0) return;
    const cur = items.findIndex((el) => el === document.activeElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (cur + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (cur - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  // ArrowDown/Up opens the menu from the trigger (menu-button pattern).
  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMenuOpen(true);
    }
  };

  const pickType = (t: 'bar' | 'line') => {
    persistChartType(t);
    setHover(-1);
  };
  // Radiogroup roving focus for the bar/line switch (mirrors the range switch).
  const onTypeKey = (e: React.KeyboardEvent) => {
    const cur = Math.max(
      0,
      CHART_TYPES.findIndex((t) => t.key === effectiveVariant),
    );
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % CHART_TYPES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (cur - 1 + CHART_TYPES.length) % CHART_TYPES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = CHART_TYPES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    pickType(CHART_TYPES[next]!.key);
    typesRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  const anyRangeOn = m.rangeButtons.some((r) => r.on);
  const onRangeKey = (e: React.KeyboardEvent) => {
    const keys = m.rangeButtons.map((r) => r.key);
    const cur = Math.max(0, m.rangeButtons.findIndex((r) => r.on));
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % keys.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + keys.length) % keys.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = keys.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setRange(keys[next]!);
    setHover(-1);
    const radios = radiosRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios?.[next]?.focus();
  };

  return (
    <section ref={rootRef} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{m.title}</h2>
          <span className={styles.sub}>
            <strong className={styles.period}>{m.period}</strong> · {m.summary}
          </span>
        </div>
        <div className={cx(styles.ctrlRow, narrow && styles.ctrlRowNarrow)}>
          {showSwitch && (
            <div
              ref={typesRef}
              role="radiogroup"
              aria-label="Chart type"
              className={styles.types}
              onKeyDown={onTypeKey}
            >
              {CHART_TYPES.map((t) => {
                const on = effectiveVariant === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={t.label}
                    title={t.label}
                    tabIndex={on ? 0 : -1}
                    className={cx(styles.type, on && styles.typeOn)}
                    onClick={() => pickType(t.key)}
                  >
                    <Icon name={t.icon} size={18} />
                  </button>
                );
              })}
            </div>
          )}
          <div className={styles.rangeWrap}>
            <div
              ref={radiosRef}
              role="radiogroup"
              aria-label="Time range"
              className={styles.radios}
              onKeyDown={onRangeKey}
            >
              {m.rangeButtons.map((r, idx) => (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={r.on}
                  tabIndex={r.on || (!anyRangeOn && idx === 0) ? 0 : -1}
                  className={cx(styles.range, r.on && styles.rangeOn)}
                  onClick={() => {
                    setRange(r.key);
                    setHover(-1);
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <select
              aria-label="Show a year"
              className={cx(styles.year, m.isYear && styles.yearOn)}
              value={m.yearValue}
              onChange={(e) => {
                setRange(e.target.value ? `y${e.target.value}` : '12m');
                setHover(-1);
              }}
            >
              <option value="">Year</option>
              {m.yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {m.hasData ? (
        <>
          {m.legendChips && (
            <div className={styles.legend} style={{ flexWrap: m.legendWrap }}>
              {m.legend.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  aria-pressed={l.on}
                  aria-label={l.label}
                  title={l.label}
                  className={styles.legendBtn}
                  style={{ borderColor: l.border, color: l.text }}
                  onClick={() => toggle(l.key)}
                >
                  <span className={styles.dot} style={{ background: l.dot }} />
                  {m.showLabels && l.label}
                  <strong className={styles.legendTotal}>{l.total}</strong>
                </button>
              ))}
            </div>
          )}

          {m.legendMenu && (
            <div className={styles.menuWrap} onKeyDown={onMenuKey}>
              <button
                ref={menuTriggerRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                className={styles.menuTrigger}
                onClick={() => setMenuOpen((o) => !o)}
                onKeyDown={onTriggerKey}
              >
                Showing <strong className={styles.menuTriggerValue}>{m.shownLabel}</strong>
                <Icon name="expand_more" size={18} />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  id={menuId}
                  role="menu"
                  aria-label="Chart series"
                  className={styles.menu}
                >
                  {m.legend.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={l.on}
                      className={styles.menuItem}
                      onClick={() => toggle(l.key)}
                    >
                      <span className={styles.menuCheck} style={{ color: l.checkColor }}>
                        <Icon name={l.checkIcon} size={20} />
                      </span>
                      <span className={styles.dot} style={{ background: l.dot }} />
                      <span className={styles.menuItemLabel}>{l.label}</span>
                      <strong className={styles.menuItemTotal}>{l.total}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            className={cx(styles.plot, narrow && styles.plotNarrow)}
            // headGap is the gap above the chart; the card's flex gap already
            // adds --space-4, so subtract it to land on the design's value.
            style={{ marginTop: `calc(${m.headGap} - var(--space-4))` }}
          >
            <svg viewBox="0 0 600 262" role="img" aria-label={m.aria} className={styles.svg}>
              {m.grid.map((g, k) => (
                <line key={`g${k}`} x1={28} x2={600} y1={g.y} y2={g.y} stroke="var(--ink-100)" strokeWidth={1} />
              ))}
              <line x1={28} x2={600} y1={210} y2={210} stroke="var(--ink-300)" strokeWidth={1} />
              {m.cols.map((c) => (
                <rect key={`hov${c.index}`} x={c.hx} y={0} width={c.hw} height={210} rx={6} fill={c.hoverFill} />
              ))}
              {m.rects.map((r, k) => (
                <rect key={`r${k}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill={r.fill} />
              ))}
              {m.lines.map((ln, k) => (
                <polyline
                  key={`l${k}`}
                  points={ln.points}
                  fill="none"
                  stroke={ln.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {m.dots.map((d, k) => (
                <circle key={`d${k}`} cx={d.x} cy={d.y} r={4} fill="var(--white)" stroke={d.color} strokeWidth={2} />
              ))}
              {m.yearMarks.map((ym, k) => (
                <line key={`y${k}`} x1={ym.x} x2={ym.x} y1={214} y2={258} stroke="var(--ink-200)" strokeWidth={1} />
              ))}
              {m.cols.map((c) => (
                // Focusable, so the month's figures reach keyboard + screen
                // readers, not just a mouse hover; focus shows the tooltip too.
                <rect
                  key={`hit${c.index}`}
                  x={c.hx}
                  y={0}
                  width={c.hw}
                  height={262}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={c.aria}
                  className={styles.hit}
                  onMouseEnter={() => setHover(c.index)}
                  onMouseLeave={() => setHover(-1)}
                  onFocus={() => setHover(c.index)}
                  onBlur={() => setHover(-1)}
                />
              ))}
            </svg>

            <span aria-hidden className={styles.yUnit}>
              {m.yUnit}
            </span>
            {m.grid.map((g, k) => (
              <span key={`yl${k}`} aria-hidden className={styles.yLabel} style={{ top: g.top }}>
                {g.label}
              </span>
            ))}
            {m.cols.map((c) => (
              <Fragment key={`xl${c.index}`}>
                <span
                  aria-hidden
                  className={styles.xLabel}
                  style={{ left: c.left, color: c.labelColor, fontWeight: c.labelWeight }}
                >
                  {c.label}
                </span>
                {c.year && (
                  <span aria-hidden className={styles.xYear} style={{ left: c.left }}>
                    {c.year}
                  </span>
                )}
              </Fragment>
            ))}

            {m.allHidden && (
              <div className={styles.allHidden}>
                <span className={styles.allHiddenPill}>Turn on a status above to see it on the chart.</span>
              </div>
            )}
            {m.tooltip.show && (
              <div className={styles.tip} style={{ left: m.tooltip.left }}>
                <span className={styles.tipTitle}>{m.tooltip.title}</span>
                {m.tooltip.rows.map((t, k) => (
                  <span key={`tr${k}`} className={styles.tipRow}>
                    <span className={styles.dot} style={{ background: t.dot }} />
                    {t.label}
                    <strong className={styles.tipValue}>{t.value}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyWrap}>
          <EmptyState illustration="dashboard" title={m.empty.title} description={m.empty.body} size={120} />
          {m.empty.canWiden && (
            <Button variant="secondary-outlined" size="small" onClick={() => setRange('12m')}>
              View last 12 months
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
