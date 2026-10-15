import { chartRangeToStatsQuery } from './DashboardScreen';

describe('chartRangeToStatsQuery', () => {
  // The session-quality card follows the chart's range by fetching this query.
  it('maps the preset ranges to a trailing window', () => {
    expect(chartRangeToStatsQuery('3m')).toEqual({ windowDays: 90 });
    expect(chartRangeToStatsQuery('6m')).toEqual({ windowDays: 180 });
    expect(chartRangeToStatsQuery('12m')).toEqual({ windowDays: 365 });
  });

  it('maps a year selection to a calendar-year query', () => {
    // A chart Year picks `y<year>`; the card fetches that whole calendar year
    // (contract #469) rather than a trailing window.
    expect(chartRangeToStatsQuery('y2026')).toEqual({ year: 2026 });
    expect(chartRangeToStatsQuery('y2022')).toEqual({ year: 2022 });
  });
});
