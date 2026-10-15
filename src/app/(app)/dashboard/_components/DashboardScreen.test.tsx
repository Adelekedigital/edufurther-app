import { qualityWindow } from './DashboardScreen';

describe('qualityWindow', () => {
  // The session-quality card follows the performance chart's range: each range
  // key maps to a stats window (days) plus the subline and teaser labels.
  it('maps the preset ranges to their window and labels', () => {
    expect(qualityWindow('3m')).toEqual({
      days: 90,
      period: 'last 3 months',
      periodPhrase: 'in the last 3 months',
    });
    expect(qualityWindow('6m')).toEqual({
      days: 180,
      period: 'last 6 months',
      periodPhrase: 'in the last 6 months',
    });
    expect(qualityWindow('12m')).toEqual({
      days: 365,
      period: 'last 12 months',
      periodPhrase: 'in the last 12 months',
    });
  });

  it('treats a specific year as the 12-month window, labelled "in YYYY"', () => {
    // A year has no "last" to swap, so the phrase stays "in 2026".
    expect(qualityWindow('y2026')).toEqual({
      days: 365,
      period: 'in 2026',
      periodPhrase: 'in 2026',
    });
  });
});
