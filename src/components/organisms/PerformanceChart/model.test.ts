import { buildChartModel, type ChartModelInput, type ChartRange, type ChartSeries } from './model';

const months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});
const RANGES: ChartRange[] = [
  { key: '3m', label: '3M', n: 3 },
  { key: '6m', label: '6M', n: 6 },
  { key: '12m', label: '12M', n: 12 },
];
const series: ChartSeries[] = [
  { key: 'completed', label: 'Completed', color: 'var(--blue-500)', values: [0, 1, 2, 1, 3, 2, 4, 3, 5, 2, 6, 4] },
  { key: 'canceled', label: 'Canceled', color: 'var(--blue-200)', values: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0] },
  { key: 'missed', label: 'Missed', color: 'var(--red-500)', values: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
];
const input = (over: Partial<ChartModelInput> = {}): ChartModelInput => ({
  series,
  months,
  ranges: RANGES,
  variant: 'bar',
  range: '6m',
  hidden: [],
  hover: -1,
  title: 'Session performance',
  yUnit: 'Sessions',
  ...over,
});

describe('buildChartModel', () => {
  it('buckets the last N months for the range', () => {
    expect(buildChartModel(input({ range: '6m' })).cols).toHaveLength(6);
    expect(buildChartModel(input({ range: '3m' })).cols).toHaveLength(3);
  });

  it('totals each series over the range, for the legend', () => {
    const m = buildChartModel(input({ range: '6m' }));
    // months 7–12 (indices 6–11): completed 4+3+5+2+6+4 = 24, canceled 1, missed 2.
    expect(m.legend.find((l) => l.key === 'completed')?.total).toBe(24);
    expect(m.legend.find((l) => l.key === 'canceled')?.total).toBe(1);
    expect(m.legend.find((l) => l.key === 'missed')?.total).toBe(2);
  });

  it('stacks bars for the bar variant and draws lines for the line variant', () => {
    const bar = buildChartModel(input({ variant: 'bar' }));
    expect(bar.rects.length).toBeGreaterThan(0);
    expect(bar.lines).toHaveLength(0);
    const line = buildChartModel(input({ variant: 'line' }));
    expect(line.lines).toHaveLength(3);
    expect(line.rects).toHaveLength(0);
  });

  it('hides a series the caller switched off, and flags when all are off', () => {
    const one = buildChartModel(input({ hidden: ['canceled'] }));
    expect(one.legend.find((l) => l.key === 'canceled')?.on).toBe(false);
    expect(one.allHidden).toBe(false);
    const none = buildChartModel(input({ hidden: ['completed', 'canceled', 'missed'] }));
    expect(none.allHidden).toBe(true);
  });

  it('is empty — "No sessions yet" — when the mentor has never had one', () => {
    const zero = series.map((s) => ({ ...s, values: s.values.map(() => 0) }));
    const m = buildChartModel(input({ series: zero }));
    expect(m.hasData).toBe(false);
    expect(m.noData).toBe(true);
    expect(m.empty.title).toBe('No sessions yet');
    expect(m.empty.neverAny).toBe(true);
    // The widen button is for an empty *window*, not a mentor with nothing ever.
    expect(m.empty.canWiden).toBe(false);
  });

  it('distinguishes "nothing in this period" from never-any', () => {
    // Sessions only in the first three months; a 3-month range sees none.
    const early = series.map((s) => ({ ...s, values: s.values.map((v, i) => (i < 3 ? v : 0)) }));
    const m = buildChartModel(input({ series: early, range: '3m' }));
    expect(m.noData).toBe(true);
    expect(m.empty.title).toBe('Nothing in this period');
    expect(m.empty.neverAny).toBe(false);
    expect(m.empty.canWiden).toBe(true);
  });

  it('shows a tooltip only for a hovered bucket with visible data', () => {
    expect(buildChartModel(input({ hover: -1 })).tooltip.show).toBe(false);
    const hovered = buildChartModel(input({ hover: 5 }));
    expect(hovered.tooltip.show).toBe(true);
    expect(hovered.tooltip.rows).toHaveLength(3);
  });

  it('names the whole year for a year range', () => {
    const m = buildChartModel(input({ range: 'y2025' }));
    expect(m.cols).toHaveLength(12);
    expect(m.isYear).toBe(true);
    expect(m.period).toBe('Jan – Dec 2025');
  });

  it('year view drops months before the fetched window — no false zeros', () => {
    // A 12-month window Apr 2025 – Mar 2026; pick 2025.
    const span = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 3 + i, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    });
    const m = buildChartModel(input({ months: span, range: 'y2025' }));
    // Jan–Mar 2025 were never fetched, so they are dropped, not shown as 0.
    expect(m.cols).toHaveLength(9);
    expect(m.cols[0]!.label).toBe('Apr');
  });

  it('gives each column an accessible breakdown', () => {
    const m = buildChartModel(input({ range: '6m' }));
    // The last visible month (index 11 overall) is Dec: completed 4, canceled 0, missed 1.
    expect(m.cols.at(-1)!.aria).toBe('Dec 2025: 4 completed, 0 canceled, 1 missed');
  });

  it('derives the mobile-legend flags from narrow + mobileLegend', () => {
    const wide = buildChartModel(input({ narrow: false, mobileLegend: 'dropdown' }));
    expect(wide.legendChips).toBe(true);
    expect(wide.legendMenu).toBe(false);
    expect(wide.headGap).toBe('var(--space-4)');

    const drop = buildChartModel(input({ narrow: true, mobileLegend: 'dropdown' }));
    expect(drop.legendChips).toBe(false);
    expect(drop.legendMenu).toBe(true);
    expect(drop.headGap).toBe('var(--space-2)');

    const compact = buildChartModel(input({ narrow: true, mobileLegend: 'compact' }));
    expect(compact.legendMenu).toBe(false);
    expect(compact.showLabels).toBe(false);
    expect(compact.legendWrap).toBe('nowrap');
  });

  it('names the shown series for the dropdown trigger', () => {
    expect(buildChartModel(input()).shownLabel).toBe('All');
    expect(buildChartModel(input({ hidden: ['canceled'] })).shownLabel).toBe('Completed, Missed');
    expect(buildChartModel(input({ hidden: ['completed', 'canceled', 'missed'] })).shownLabel).toBe(
      'None',
    );
  });

  it('gives each legend item a checkbox icon and colour for the dropdown', () => {
    const m = buildChartModel(input({ hidden: ['canceled'] }));
    const completed = m.legend.find((l) => l.key === 'completed')!;
    const canceled = m.legend.find((l) => l.key === 'canceled')!;
    expect(completed.checkIcon).toBe('check_box');
    expect(completed.checkColor).toBe('var(--blue-500)');
    expect(canceled.checkIcon).toBe('check_box_outline_blank');
    expect(canceled.checkColor).toBe('var(--ink-400)');
  });

  it('suppresses the tooltip for an upcoming month — no false zeros', () => {
    const span = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    const sr = series.map((s) => ({ ...s, values: s.values.slice(0, 6) }));
    const cols = buildChartModel(input({ months: span, series: sr, range: 'y2026' })).cols;
    const jul = cols.findIndex((c) => c.aria.endsWith('upcoming')); // Jul–Dec 2026 are future
    expect(jul).toBeGreaterThan(-1);
    const hovered = buildChartModel(input({ months: span, series: sr, range: 'y2026', hover: jul }));
    expect(hovered.tooltip.show).toBe(false);
  });
});
