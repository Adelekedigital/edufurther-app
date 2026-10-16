/**
 * The PerformanceChart view model — a pure port of PerformanceChart.dc.html's
 * `renderVals`. Kept out of the component so the bucketing, stacking and scale
 * can be unit-tested without a DOM. Geometry is the design's: a 600×262 viewBox,
 * x-axis at X0=36, plot height H=200 with its baseline at y=210.
 */

export type ChartSeries = { key: string; label: string; color: string; values: number[] };
export type ChartRange = { key: string; label: string; n: number };

export type ChartModelInput = {
  series: ChartSeries[];
  /** 'YYYY-MM', oldest first, aligned 1:1 with each series' `values`. */
  months: string[];
  ranges: ChartRange[];
  variant: 'bar' | 'line';
  /** Current range key: a `ranges` key, or `y<year>` for a whole year. */
  range: string;
  hidden: string[];
  /** Hovered bucket index, or -1. */
  hover: number;
  title: string;
  yUnit: string;
  /** Container is below the mobile breakpoint (ResizeObserver, < 440px). */
  narrow?: boolean;
  /** How the legend collapses when narrow. Default 'compact'. */
  mobileLegend?: 'compact' | 'dropdown' | 'wrap';
};

export type ChartModel = ReturnType<typeof buildChartModel>;

const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const X0 = 36;
const W = 600 - X0;
const H = 200;
const BASE = 210;

export function buildChartModel(i: ChartModelInput) {
  const { series, months, ranges, variant, hidden, hover } = i;
  const years = [...new Set(months.map((k) => k.slice(0, 4)))].sort().reverse();
  // The mentor's first active month — the earliest with any session. The monthly
  // endpoint returns the full window with zero rows for empty months, so the first
  // non-zero month marks their tenure; the year picker starts there. No sessions at
  // all falls back to the most recent year.
  const firstActiveIdx = months.findIndex((_, idx) => series.some((s) => (s.values[idx] ?? 0) > 0));
  const firstActiveYear =
    firstActiveIdx >= 0 && months[firstActiveIdx]
      ? Number(months[firstActiveIdx]!.slice(0, 4))
      : Number(years[0] ?? 0);

  let range = i.range;
  if (range === 'all') range = `y${years[0]}`;
  const isYear = range.startsWith('y');
  const yr = isYear ? range.slice(1) : null;
  const def = isYear ? { n: 12 } : ranges.find((r) => r.key === range) ?? ranges[1] ?? ranges[0];
  const n = def?.n ?? 6;

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const mLab = (k: string) => {
    const [y, m] = k.split('-').map(Number);
    return { m: MN[(m ?? 1) - 1]!, y: y ?? 0, mi: (m ?? 1) - 1 };
  };

  const lastMonth = months[months.length - 1] ?? '';
  const buckets: { keys: string[]; idx: number[] }[] = isYear
    ? Array.from({ length: 12 }, (_, m) => `${yr}-${String(m + 1).padStart(2, '0')}`)
        // Keep the months we actually fetched, plus future months of the
        // current year (drawn greyed). A month before the fetched window is not
        // "0 sessions", it's "not loaded" — drop it rather than fake a zero.
        .filter((k) => months.includes(k) || k > lastMonth)
        .map((k) => ({ keys: [k], idx: [months.indexOf(k)] }))
    : // Index from the sliced length, not n: with fewer months than the range,
      // months.length - n would go negative and silently read as empty.
      months
        .slice(-n)
        .map((k, j) => ({ keys: [k], idx: [months.length - Math.min(n, months.length) + j] }));

  const val = (s: ChartSeries, b: { idx: number[] }) =>
    sum(b.idx.map((ix) => (ix >= 0 ? s.values[ix] ?? 0 : 0)));
  const visible = series.filter((s) => !hidden.includes(s.key));
  const allTotalRange = sum(series.map((s) => sum(buckets.map((b) => val(s, b)))));
  const allTotalEver = sum(series.map((s) => sum(s.values)));
  const stacked = variant === 'bar';

  const colMax = Math.max(
    1,
    ...buckets.map((b) =>
      stacked ? sum(visible.map((s) => val(s, b))) : Math.max(0, ...visible.map((s) => val(s, b))),
    ),
  );
  const step = colMax <= 4 ? 1 : Math.ceil(colMax / 4);
  const top = step * Math.ceil(colMax / step) || 1;
  const cw = W / buckets.length;
  const y = (v: number) => BASE - (v / top) * H;
  const pct = (v: number) => `${(v / 262) * 100}%`;

  const grid: { y: number; top: string; label: string }[] = [];
  for (let v = step; v <= top; v += step) grid.push({ y: y(v), top: pct(y(v)), label: String(v) });

  const bw = Math.min(28, cw * 0.5);
  const rects: { x: number; y: number; w: number; h: number; rx: number; fill: string }[] = [];
  const lines: { color: string; points: string }[] = [];
  const dots: { x: number; y: number; color: string }[] = [];
  if (stacked) {
    buckets.forEach((b, j) => {
      let acc = 0;
      const segs = visible.filter((s) => val(s, b) > 0);
      segs.forEach((s, k) => {
        const h = (val(s, b) / top) * H;
        rects.push({
          x: X0 + j * cw + (cw - bw) / 2,
          y: BASE - acc - h,
          w: bw,
          h: Math.max(h - (k < segs.length - 1 ? 2 : 0), 0),
          rx: k === segs.length - 1 ? 4 : 0,
          fill: s.color,
        });
        acc += h;
      });
    });
  } else {
    visible.forEach((s) => {
      lines.push({
        color: s.color,
        points: buckets.map((b, j) => `${X0 + j * cw + cw / 2},${y(val(s, b))}`).join(' '),
      });
      buckets.forEach((b, j) => dots.push({ x: X0 + j * cw + cw / 2, y: y(val(s, b)), color: s.color }));
    });
  }

  const labelOf = (b: { keys: string[] }) => {
    const l = mLab(b.keys[0]!);
    return { top: l.m, year: String(l.y), full: `${l.m} ${l.y}` };
  };
  const yearMarks: { x: number }[] = [];
  const cols = buckets.map((b, j) => {
    const L = labelOf(b);
    const prev = j > 0 ? labelOf(buckets[j - 1]!) : null;
    const newYear = !isYear && (!prev || prev.year !== L.year);
    const future = b.idx[0]! < 0 && b.keys[0]! > months[months.length - 1]!;
    if (newYear && j > 0) yearMarks.push({ x: X0 + j * cw });
    const last = j === buckets.length - 1;
    const hot = last || hover === j;
    return {
      index: j,
      label: L.top,
      year: newYear ? L.year : '',
      left: `${((X0 + j * cw + cw / 2) / 600) * 100}%`,
      hx: X0 + j * cw + 2,
      hw: cw - 4,
      hoverFill: hover === j ? 'var(--ink-50)' : 'transparent',
      labelColor: future ? 'var(--ink-300)' : hot ? 'var(--ink-900)' : 'var(--ink-500)',
      labelWeight: hot ? 'var(--weight-semibold)' : 'var(--weight-regular)',
      // The month's figures, for a screen reader and a keyboard tooltip.
      aria: future
        ? `${L.full}: upcoming`
        : `${L.full}: ${series.map((s) => `${val(s, b)} ${s.label.toLowerCase()}`).join(', ')}`,
    };
  });

  const legend = series.map((s) => {
    const on = !hidden.includes(s.key);
    return {
      key: s.key,
      label: s.label,
      total: sum(buckets.map((b) => val(s, b))),
      on,
      dot: on ? s.color : 'var(--ink-300)',
      border: on ? 'var(--ink-200)' : 'var(--ink-100)',
      text: on ? 'var(--ink-900)' : 'var(--ink-400)',
      // For the mobile dropdown's checkbox rows.
      checkIcon: (on ? 'check_box' : 'check_box_outline_blank') as
        | 'check_box'
        | 'check_box_outline_blank',
      checkColor: on ? 'var(--blue-500)' : 'var(--ink-400)',
    };
  });

  // The mobile legend. OUR dashboard uses 'dropdown'; 'compact'/'wrap' are the
  // design's other collapses. The flags pick inline chips vs the dropdown, the
  // chip wrap, whether chip labels show, and the gap above the chart.
  const narrow = i.narrow ?? false;
  const ml = i.mobileLegend ?? 'compact';
  const headGap = narrow ? 'var(--space-2)' : 'var(--space-4)';
  const legendChips = !(narrow && ml === 'dropdown');
  const legendMenu = narrow && ml === 'dropdown';
  const showLabels = !(narrow && ml === 'compact');
  const legendWrap: 'wrap' | 'nowrap' = narrow && ml === 'compact' ? 'nowrap' : 'wrap';
  const shownLabel = legend.every((l) => l.on)
    ? 'All'
    : legend
        .filter((l) => l.on)
        .map((l) => l.label)
        .join(', ') || 'None';

  // Guard an empty months array (no data at all): the rest produces safe empties.
  const firstL = buckets.length ? labelOf(buckets[0]!) : { top: '', year: '', full: '' };
  const lastL = buckets.length ? labelOf(buckets[buckets.length - 1]!) : firstL;
  const period = isYear
    ? `Jan – Dec ${yr}`
    : firstL.year === lastL.year
      ? `${firstL.top} – ${lastL.full}`
      : `${firstL.full} – ${lastL.full}`;

  const primary = series[0];
  const pTotal = primary ? sum(buckets.map((b) => val(primary, b))) : 0;
  const summary =
    allTotalRange === 0
      ? 'no sessions in this period'
      : `${pTotal} ${(primary?.label ?? '').toLowerCase()}`;

  const neverAny = allTotalEver === 0;

  return {
    title: i.title,
    yUnit: i.yUnit,
    period,
    summary,
    hasData: allTotalRange > 0,
    noData: allTotalRange === 0,
    allHidden: visible.length === 0,
    rangeButtons: ranges.map((r) => ({ key: r.key, label: r.label, on: r.key === range })),
    years,
    firstActiveYear,
    yearValue: yr ?? '',
    isYear,
    legend,
    // Mobile-legend derivation (design PerformanceChart.dc.html mobile update).
    headGap,
    legendChips,
    legendMenu,
    showLabels,
    legendWrap,
    shownLabel,
    grid,
    rects,
    lines,
    dots,
    cols,
    yearMarks,
    aria: `${i.title}, ${period}`,
    empty: {
      title: neverAny ? 'No sessions yet' : 'Nothing in this period',
      body: neverAny
        ? 'Each month’s completed, canceled and missed sessions will build up here once mentees start booking.'
        : isYear
          ? 'No sessions this year. Pick another year or view the last 12 months.'
          : 'Try the last 12 months or pick a year to see earlier sessions.',
      canWiden: !neverAny && range !== '12m',
      neverAny,
    },
    tooltip:
      // Not for an upcoming/unfetched month (idx < 0): its figures would read a
      // false 0, contradicting its "upcoming" accessible name.
      hover >= 0 &&
      allTotalRange > 0 &&
      visible.length > 0 &&
      buckets[hover] &&
      buckets[hover]!.idx[0]! >= 0
        ? {
            show: true,
            left: `${((X0 + hover * cw + cw / 2) / 600) * 100}%`,
            title: labelOf(buckets[hover]!).full,
            // All series — the tooltip is the month's full breakdown, even for a
            // status toggled off in the legend (as the design draws it).
            rows: series.map((s) => ({ label: s.label, dot: s.color, value: val(s, buckets[hover]!) })),
          }
        : { show: false, left: '0', title: '', rows: [] },
  };
}
