import { describe, expect, it } from 'vitest';
import { mixRows, monthBars, monthShort, rankPlaces, steps } from './tabModels';

const place = (key: string, mentees: number, bookableMentors: number) => ({
  key,
  name: key,
  mentees,
  bookableMentors,
});

describe('rankPlaces', () => {
  it('puts places with no bookable mentor first, then the highest mentees per mentor; five at most', () => {
    const rows = rankPlaces([
      place('a', 10, 5),
      place('b', 30, 2),
      place('c', 4, 0),
      place('d', 9, 0),
      place('e', 8, 1),
      place('f', 1, 1),
    ]);
    expect(rows.map((r) => r.key)).toEqual(['d', 'c', 'b', 'e', 'a']);
    expect(rows[0]!.ratio).toBeNull();
    expect(rows[2]!.ratio).toBe(15);
  });
});

describe('steps', () => {
  it('scales bars to the first step and converts from the step before', () => {
    expect(
      steps([
        { key: 'a', value: 38 },
        { key: 'b', value: 21 },
        { key: 'c', value: 0 },
      ]),
    ).toEqual([
      { key: 'a', value: 38, width: 100, conversion: null },
      { key: 'b', value: 21, width: (21 / 38) * 100, conversion: 55 },
      { key: 'c', value: 0, width: 0, conversion: 0 },
    ]);
  });

  it('a zero first step draws no bars', () => {
    expect(
      steps([
        { key: 'a', value: 0 },
        { key: 'b', value: 0 },
      ]).map((s) => s.width),
    ).toEqual([0, 0]);
  });
});

describe('months', () => {
  it('labels months, scales bars to the tallest and marks the current one', () => {
    const bars = monthBars(
      [
        { month: '2026-10', count: 118 },
        { month: '2026-11', count: 59 },
      ],
      '2026-11',
    );
    expect(bars).toEqual([
      { month: '2026-10', label: 'Oct', count: 118, share: 1, soFar: false },
      { month: '2026-11', label: 'Nov', count: 59, share: 0.5, soFar: true },
    ]);
    expect(monthShort('2026-06')).toBe('Jun');
  });

  it('no members draws flat bars', () => {
    expect(monthBars([{ month: '2026-11', count: 0 }], '2026-11')[0]!.share).toBe(0);
  });
});

describe('mixRows', () => {
  it('shares are of all completed sessions, bars of the largest row', () => {
    const rows = mixRows(
      [
        { key: 'a', count: 50 },
        { key: 'b', count: 25 },
      ],
      60,
    );
    expect(rows.map((r) => [r.pct, r.width])).toEqual([
      [83, 100],
      [42, 50],
    ]);
  });
});
