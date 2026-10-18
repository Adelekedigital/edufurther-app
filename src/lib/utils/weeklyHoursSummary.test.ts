import { describe, expect, it } from 'vitest';
import { emptyWeek, type DayHours } from './sessionTypeDraft';
import { weeklyHoursSummary } from './weeklyHoursSummary';

const week = (on: Record<number, [number, number][]>): DayHours[] =>
  emptyWeek().map((d, i) => (on[i] ? { on: true, slots: on[i]! } : d));

const EVE: [number, number] = [18 * 60, 21 * 60];

describe('weeklyHoursSummary', () => {
  it('reads the design default as a weekday range', () => {
    expect(weeklyHoursSummary(week({ 1: [EVE], 2: [EVE], 3: [EVE], 4: [EVE], 5: [EVE] }))).toBe(
      'Mon–Fri, 6:00 pm – 9:00 pm',
    );
  });

  it('lists two days, and runs Saturday into Sunday', () => {
    expect(weeklyHoursSummary(week({ 1: [EVE], 3: [EVE] }))).toBe('Mon, Wed, 6:00 pm – 9:00 pm');
    expect(weeklyHoursSummary(week({ 5: [EVE], 6: [EVE], 0: [EVE] }))).toBe(
      'Fri–Sun, 6:00 pm – 9:00 pm',
    );
  });

  it('groups days by their times', () => {
    expect(weeklyHoursSummary(week({ 1: [EVE], 6: [[540, 600]] }))).toBe(
      'Mon, 6:00 pm – 9:00 pm; Sat, 9:00 am – 10:00 am',
    );
  });

  it('is null with no hours', () => {
    expect(weeklyHoursSummary(emptyWeek())).toBeNull();
  });
});
