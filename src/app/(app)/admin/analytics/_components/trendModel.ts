/**
 * The North Star trend's geometry (Admin Analytics.dc.html `trend`): a 600 by
 * 140 box, the y scale fitted to both periods with 25% padding and never below
 * 0, three labels (max, middle, min). Pure, so it is tested without a DOM.
 */

/** A null value is a gap (no history yet, e.g. active members before 12 Nov 2026), never a 0. */
export type TrendPoint = { value: number | null; previous: number | null };

export type TrendModel = {
  cur: string;
  /** Null: no previous period to draw (compare off, or no previous values). */
  prev: string | null;
  grid: number[];
  yLabels: string[];
  /** Only the points with a value: a gap has nothing to hover. */
  pts: { i: number; x: number; y: number; value: number; previous: number | null }[];
};

const W = 600;
const fix = (n: number) => Math.round(n * 10) / 10;

export function trendModel(series: readonly TrendPoint[], compare: boolean): TrendModel {
  // Previous is drawn only when every point that has a value has one too.
  const known = series.filter((p) => p.value !== null);
  const showPrev = compare && known.length > 0 && known.every((p) => p.previous !== null);
  const values = known.flatMap((p) =>
    showPrev ? [p.value as number, p.previous as number] : [p.value as number],
  );
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;
  const pad = (hi - lo) * 0.25 || 1;
  const y0 = Math.max(0, Math.floor(lo - pad));
  const y1 = Math.ceil(hi + pad);
  const n = series.length;
  const X = (i: number) => fix(n > 1 ? (i / (n - 1)) * W : W / 2);
  const Y = (v: number) => fix(136 - ((v - y0) / (y1 - y0)) * 128);
  // A null starts a new run: the line breaks at a gap rather than dropping to 0.
  const path = (vs: (number | null)[]) => {
    let gap = true;
    return vs
      .map((v, i) => {
        if (v === null) {
          gap = true;
          return '';
        }
        const cmd = gap ? 'M' : 'L';
        gap = false;
        return `${cmd}${X(i)} ${Y(v)}`;
      })
      .filter(Boolean)
      .join(' ');
  };
  return {
    cur: path(series.map((p) => p.value)),
    prev: showPrev ? path(series.map((p) => (p.value === null ? null : p.previous))) : null,
    grid: [y0, (y0 + y1) / 2, y1].map(Y),
    yLabels: [y1, Math.round((y0 + y1) / 2), y0].map(String),
    pts: series.flatMap((p, i) =>
      p.value === null ? [] : [{ i, x: X(i), y: Y(p.value), value: p.value, previous: p.previous }],
    ),
  };
}

/** An 8-point sparkline in a 100 by 32 box, scaled to its own range. */
export function sparkPath(points: readonly (number | null)[]): string {
  const known = points.filter((v): v is number => v !== null);
  if (known.length === 0) return '';
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  const span = hi - lo || 1;
  const n = points.length;
  let gap = true;
  return points
    .map((v, i) => {
      // A point with nothing to divide by is a gap in the line, never a 0.
      if (v === null) {
        gap = true;
        return '';
      }
      const x = fix(n > 1 ? (i / (n - 1)) * 100 : 50);
      // 2px inset top and bottom, so the stroke isn't clipped.
      const y = fix(30 - ((v - lo) / span) * 28);
      const cmd = gap ? 'M' : 'L';
      gap = false;
      return `${cmd}${x} ${y}`;
    })
    .filter(Boolean)
    .join(' ');
}
