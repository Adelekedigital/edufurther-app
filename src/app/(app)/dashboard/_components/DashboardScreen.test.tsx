import { chartRangeToWindowDays } from './DashboardScreen';

describe('chartRangeToWindowDays', () => {
  // The session-quality card follows the chart's range by fetching this window.
  it('maps each preset range to its stats window (days)', () => {
    expect(chartRangeToWindowDays('3m')).toBe(90);
    expect(chartRangeToWindowDays('6m')).toBe(180);
    expect(chartRangeToWindowDays('12m')).toBe(365);
  });

  it('treats a year as the trailing 12-month window, not a calendar year', () => {
    // mentor-stats is a trailing window, so a year reads 365 days; the card then
    // labels it "last 12 months" rather than "in 2026".
    expect(chartRangeToWindowDays('y2026')).toBe(365);
  });
});
