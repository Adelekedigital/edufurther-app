import { mockWindow } from './adminAnalytics';

const NOW = new Date('2026-11-09T15:00:00Z');

describe("mockWindow: the routes' window rules", () => {
  it('ends a preset today and puts the previous period right before it', () => {
    expect(mockWindow({ window: '7d' }, NOW)?.window).toEqual({
      from: '2026-11-03',
      to: '2026-11-09',
      previous_from: '2026-10-27',
      previous_to: '2026-11-02',
    });
    expect(mockWindow({}, NOW)?.days).toBe(30);
  });

  it('takes one day or a range, inclusive', () => {
    expect(mockWindow({ from: '2026-11-03', to: '2026-11-03' }, NOW)?.days).toBe(1);
    expect(
      mockWindow({ from: '2026-11-01', to: '2026-11-07', compare: 'false' }, NOW),
    ).toMatchObject({
      days: 7,
      compare: false,
    });
  });

  it('refuses what the backend answers 422 to', () => {
    for (const q of [
      { window: '14d' },
      { window: '7d', from: '2026-11-01', to: '2026-11-02' },
      { from: '2026-11-01' },
      { from: '2026-11-05', to: '2026-11-01' },
      { from: '2024-05-31', to: '2024-06-02' },
      { from: '2026-11-08', to: '2026-11-10' },
      { from: '2025-02-31', to: '2025-03-02' },
      { window: '7d', compare: 'yes' },
    ]) {
      expect(mockWindow(q, NOW)).toBeNull();
    }
  });
});
