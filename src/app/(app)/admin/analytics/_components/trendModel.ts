/**
 * The North Star trend's geometry (Admin Analytics.dc.html `trend`): a 600 by
 * 140 box, the y scale fitted to both periods with 25% padding and never below
 * 0, three labels (max, middle, min). Pure, so it is tested without a DOM.
 */

export type TrendPoint = { value: number; previous: number | null };

export type TrendModel = {
  cur: string;
  /** Null: no previous period to draw (compare off, or no previous values). */
  prev: string | null;
  grid: number[];
  yLabels: string[];
  pts: { x: number; y: number; value: number; previous: number | null }[];
};

const W = 600;
const fix = (n: number) => Math.round(n * 10) / 10;

export function trendModel(series: readonly TrendPoint[], compare: boolean): TrendModel {
  const showPrev = compare && series.length > 0 && series.every((p) => p.previous !== null);
  const values = series.flatMap((p) => (showPrev ? [p.value, p.previous as number] : [p.value]));
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;
  const pad = (hi - lo) * 0.25 || 1;
  const y0 = Math.max(0, Math.floor(lo - pad));
  const y1 = Math.ceil(hi + pad);
  const n = series.length;
  const X = (i: number) => fix(n > 1 ? (i / (n - 1)) * W : W / 2);
  const Y = (v: number) => fix(136 - ((v - y0) / (y1 - y0)) * 128);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' ');
  return {
    cur: path(series.map((p) => p.value)),
    prev: showPrev ? path(series.map((p) => p.previous as number)) : null,
    grid: [y0, (y0 + y1) / 2, y1].map(Y),
    yLabels: [y1, Math.round((y0 + y1) / 2), y0].map(String),
    pts: series.map((p, i) => ({ x: X(i), y: Y(p.value), value: p.value, previous: p.previous })),
  };
}

/** An 8-point sparkline in a 100 by 32 box, scaled to its own range. */
export function sparkPath(points: readonly number[]): string {
  if (points.length === 0) return '';
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const n = points.length;
  return points
    .map((v, i) => {
      const x = fix(n > 1 ? (i / (n - 1)) * 100 : 50);
      // 2px inset top and bottom, so the stroke isn't clipped.
      const y = fix(30 - ((v - lo) / span) * 28);
      return `${i ? 'L' : 'M'}${x} ${y}`;
    })
    .join(' ');
}
