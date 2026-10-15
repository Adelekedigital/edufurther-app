import { act, renderHook } from '@testing-library/react';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import { emptyWeek, type Slot } from '@/lib/utils/sessionTypeDraft';
import { useHoursDraft } from './useHoursDraft';

const hours = (slots: Slot[] | null): WeeklyHours => {
  const days = emptyWeek();
  if (slots) days[1] = { on: true, slots };
  return { days, timeZone: 'Africa/Lagos', rules: [], otherZones: [], otherSlots: [] };
};

describe('useHoursDraft', () => {
  it('the same hours in another order are not a change', () => {
    const saved = hours([
      [540, 600],
      [780, 840],
    ]);
    const { result } = renderHook(() => useHoursDraft(saved, 'Europe/London'));
    act(() =>
      result.current.setDays(
        hours([
          [780, 840],
          [540, 600],
        ]).days,
      ),
    );
    expect(result.current.dirty).toBe(false);
  });

  it('a zone change is a change only when there are hours to move', () => {
    const withHours = renderHook(() => useHoursDraft(hours([[540, 600]]), 'Europe/London'));
    act(() => withHours.result.current.setTimeZone('Europe/London'));
    expect(withHours.result.current.dirty).toBe(true);
    expect(withHours.result.current.timeZone).toBe('Europe/London');

    const none = renderHook(() => useHoursDraft(hours(null), 'Europe/London'));
    act(() => none.result.current.setTimeZone('Europe/London'));
    expect(none.result.current.dirty).toBe(false);
  });

  it('flags a slot overlapping hours kept in another zone', () => {
    const saved = {
      ...hours(null),
      otherSlots: [{ day: 1, slot: [570, 630] as Slot, zone: 'Europe/London' }],
    };
    const { result } = renderHook(() => useHoursDraft(saved, 'Africa/Lagos'));
    act(() => result.current.setDays(hours([[540, 600]]).days));
    expect(result.current.clash?.zone).toBe('Europe/London');
  });

  it('clear drops the draft', () => {
    const { result } = renderHook(() => useHoursDraft(hours([[540, 600]]), 'Africa/Lagos'));
    act(() => result.current.setDays(hours(null).days));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.clear());
    expect(result.current.dirty).toBe(false);
    expect(result.current.days[1]!.on).toBe(true);
  });
});
