'use client';

import { Fragment, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
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
  variant?: 'bar' | 'line';
  yUnit?: string;
  ranges?: ChartRange[];
  defaultRange?: string;
};

const DEFAULT_RANGES: ChartRange[] = [
  { key: '3m', label: '3M', n: 3 },
  { key: '6m', label: '6M', n: 6 },
  { key: '12m', label: '12M', n: 12 },
];

/**
 * Session performance over time (Mentor Dashboard v2 / PerformanceChart.dc.html):
 * stacked bars (or lines) of each month's sessions by outcome, with a range
 * switch, a legend that filters, and a hover tooltip. Presentational — the page
 * supplies `series` + `months`; the geometry is the design's 600×262 viewBox.
 */
export function PerformanceChart({
  series,
  months,
  title = 'Session performance',
  variant = 'bar',
  yUnit = 'Sessions',
  ranges = DEFAULT_RANGES,
  defaultRange = '6m',
}: PerformanceChartProps) {
  const [range, setRange] = useState(defaultRange);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState(-1);
  const radiosRef = useRef<HTMLDivElement>(null);

  const m = useMemo(
    () => buildChartModel({ series, months, ranges, variant, range, hidden, hover, title, yUnit }),
    [series, months, ranges, variant, range, hidden, hover, title, yUnit],
  );

  const toggle = (key: string) =>
    setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));

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
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{m.title}</h2>
          <span className={styles.sub}>
            <strong className={styles.period}>{m.period}</strong> · {m.summary}
          </span>
        </div>
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
            {m.years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {m.hasData ? (
        <>
          <div className={styles.legend}>
            {m.legend.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={l.on}
                className={styles.legendBtn}
                style={{ borderColor: l.border, color: l.text }}
                onClick={() => toggle(l.key)}
              >
                <span className={styles.dot} style={{ background: l.dot }} />
                {l.label}
                <strong className={styles.legendTotal}>{l.total}</strong>
              </button>
            ))}
          </div>

          <div className={styles.plot}>
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
