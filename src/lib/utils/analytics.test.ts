import { describe, expect, it } from 'vitest';
import {
  changeOf,
  customLabel,
  daysBetween,
  formatHours,
  formatMaybe,
  formatRate,
  nextDraft,
  windowDays,
  windowLabel,
  windowParams,
} from './analytics';

describe('windows', () => {
  it('labels presets, one day and a range', () => {
    expect(windowLabel({ kind: '30d' })).toBe('Last 30 days');
    expect(windowLabel({ kind: 'custom', from: '2026-11-03', to: '2026-11-03' })).toBe('On Nov 3');
    expect(windowLabel({ kind: 'custom', from: '2026-11-03', to: '2026-11-07' })).toBe(
      'Nov 3 to Nov 7',
    );
    expect(customLabel({ kind: 'custom', from: '2026-11-03', to: '2026-11-07' })).toBe(
      'Nov 3 – Nov 7',
    );
    expect(customLabel({ kind: '7d' })).toBe('Custom');
  });

  it('sends the preset or the dates, with compare', () => {
    expect(windowParams({ kind: '7d' }, true)).toEqual({ window: '7d', compare: 'true' });
    expect(windowParams({ kind: 'custom', from: '2026-11-03', to: '2026-11-03' }, false)).toEqual({
      from: '2026-11-03',
      to: '2026-11-03',
      compare: 'false',
    });
  });

  it('counts days inclusively', () => {
    expect(windowDays({ kind: '90d' })).toBe(90);
    expect(windowDays({ kind: 'custom', from: '2026-10-30', to: '2026-11-02' })).toBe(4);
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('picks a day, then a range either way, then starts again', () => {
    const a = nextDraft(null, '2026-11-05');
    expect(a).toEqual({ from: '2026-11-05', to: '2026-11-05' });
    expect(nextDraft(a, '2026-11-02')).toEqual({ from: '2026-11-02', to: '2026-11-05' });
    const b = nextDraft(a, '2026-11-09');
    expect(b).toEqual({ from: '2026-11-05', to: '2026-11-09' });
    expect(nextDraft(b, '2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-01' });
  });
});

describe('changeOf', () => {
  it('shows counts relatively, with one decimal', () => {
    expect(changeOf({ value: 112, previous: 100 }, 'count')).toEqual({
      text: '+12.0%',
      tone: 'good',
      icon: 'arrow_upward',
    });
    expect(changeOf({ value: 90, previous: 100 }, 'count')?.text).toBe('-10.0%');
  });

  it('shows rates in points and colours by whether up is good', () => {
    expect(changeOf({ value: 84, previous: 81 }, 'rate')?.text).toBe('+3 pts');
    expect(changeOf({ value: 6.8, previous: 5.9 }, 'rate', false)).toEqual({
      text: '+0.9 pts',
      tone: 'bad',
      icon: 'arrow_upward',
    });
  });

  it('shows small counts, and a previous 0, as a difference', () => {
    expect(changeOf({ value: 2, previous: 1 }, 'abs', false)).toEqual({
      text: '+1',
      tone: 'bad',
      icon: 'arrow_upward',
    });
    expect(changeOf({ value: 5, previous: 0 }, 'count')?.text).toBe('+5');
  });

  it('reads "No change" when flat, and nothing without a previous', () => {
    expect(changeOf({ value: 4.8, previous: 4.8 }, 'rate')).toEqual({
      text: 'No change',
      tone: 'flat',
      icon: 'remove',
    });
    expect(changeOf({ value: 58, previous: null }, 'rate')).toBeNull();
    expect(changeOf({ value: null, previous: 3 }, 'count')).toBeNull();
  });
});

describe('formats', () => {
  it('reads rates, hours and unknowns', () => {
    expect(formatRate(84)).toBe('84%');
    expect(formatRate(6.83)).toBe('6.8%');
    expect(formatHours(6.24)).toBe('6.2 h');
    expect(formatMaybe(null)).toBe('—');
    expect(formatMaybe(1840)).toBe('1,840');
  });
});
