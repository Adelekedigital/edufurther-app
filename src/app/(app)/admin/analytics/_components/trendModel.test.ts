import { describe, expect, it } from 'vitest';
import { sparkPath, trendModel } from './trendModel';

describe('trendModel', () => {
  it('fits both periods with 25% padding, never below 0', () => {
    const m = trendModel(
      [
        { value: 40, previous: 30 },
        { value: 60, previous: 50 },
      ],
      true,
    );
    // lo 30, hi 60, pad 7.5 → 22 to 68.
    expect(m.yLabels).toEqual(['68', '45', '22']);
    expect(m.prev).not.toBeNull();
    expect(m.pts.map((p) => p.x)).toEqual([0, 600]);
    expect(m.cur.startsWith('M0 ')).toBe(true);
  });

  it('floors the axis at 0', () => {
    const m = trendModel(
      [
        { value: 1, previous: null },
        { value: 3, previous: null },
      ],
      true,
    );
    expect(m.yLabels.at(-1)).toBe('0');
  });

  it('draws no previous line with compare off or no previous values', () => {
    expect(
      trendModel(
        [
          { value: 5, previous: 4 },
          { value: 6, previous: 5 },
        ],
        false,
      ).prev,
    ).toBeNull();
    expect(
      trendModel(
        [
          { value: 5, previous: null },
          { value: 6, previous: 5 },
        ],
        true,
      ).prev,
    ).toBeNull();
  });

  it('copes with a flat series and a single point', () => {
    const flat = trendModel(
      [
        { value: 5, previous: 5 },
        { value: 5, previous: 5 },
      ],
      true,
    );
    expect(flat.yLabels).toEqual(['6', '5', '4']);
    expect(trendModel([{ value: 5, previous: null }], true).pts[0]!.x).toBe(300);
  });
});

describe('sparkPath', () => {
  it('spans the 100 by 32 box', () => {
    const d = sparkPath([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(d.startsWith('M0 30')).toBe(true);
    expect(d.endsWith('L100 2')).toBe(true);
    expect(sparkPath([])).toBe('');
    expect(sparkPath([null, null])).toBe('');
  });

  it('breaks the line at a point with nothing to divide by', () => {
    const d = sparkPath([1, null, 3, 4]);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.startsWith('M0 ')).toBe(true);
  });

  it('a null value is a gap: the line breaks, no hover point, and the scale ignores it', () => {
    const m = trendModel(
      [
        { value: null, previous: null },
        { value: 10, previous: 8 },
        { value: null, previous: null },
        { value: 12, previous: 9 },
        { value: 14, previous: 11 },
      ],
      true,
    );
    // Two runs: a lone point, then two joined.
    expect(m.cur.match(/M/g)).toHaveLength(2);
    expect(m.pts.map((p) => p.i)).toEqual([1, 3, 4]);
    // Previous still draws: every point with a value has one.
    expect(m.prev).not.toBeNull();
    expect(Number(m.yLabels.at(-1))).toBeLessThanOrEqual(8);
  });
});
