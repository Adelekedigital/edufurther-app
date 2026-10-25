import { countOpenTimes } from './openTimes';

describe('countOpenTimes', () => {
  it('counts a start time once when two live session types share it', () => {
    const a = ['2026-10-26T09:00:00Z', '2026-10-26T10:00:00Z'];
    const b = ['2026-10-26T10:00:00Z', '2026-10-27T15:00:00Z'];
    expect(countOpenTimes([a, b])).toBe(3);
  });

  it('is 0 with no live session type, or none with open times', () => {
    expect(countOpenTimes([])).toBe(0);
    expect(countOpenTimes([[], []])).toBe(0);
  });
});
