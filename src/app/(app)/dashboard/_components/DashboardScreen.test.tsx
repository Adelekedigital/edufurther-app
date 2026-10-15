import { qualityWindow } from './DashboardScreen';

describe('qualityWindow', () => {
  // The session-quality card follows the performance chart's range: each range
  // key maps to a stats window (days) plus the subline, teaser and rate labels.
  it('maps the preset ranges to their window and labels', () => {
    expect(qualityWindow('3m')).toEqual({
      days: 90,
      period: 'last 3 months',
      periodPhrase: 'in the last 3 months',
      priorLabel: 'the previous 3 months',
    });
    expect(qualityWindow('6m')).toEqual({
      days: 180,
      period: 'last 6 months',
      periodPhrase: 'in the last 6 months',
      priorLabel: 'the previous 6 months',
    });
    expect(qualityWindow('12m')).toEqual({
      days: 365,
      period: 'last 12 months',
      periodPhrase: 'in the last 12 months',
      priorLabel: 'the previous 12 months',
    });
  });

  it('treats a year as the trailing 12-month window, not a calendar year', () => {
    // mentor-stats is a trailing window, so a year reads "last 12 months" rather
    // than "in 2026" — which would mislabel the last 365 days as a calendar year.
    expect(qualityWindow('y2026')).toEqual({
      days: 365,
      period: 'last 12 months',
      periodPhrase: 'in the last 12 months',
      priorLabel: 'the previous 12 months',
    });
  });
});
