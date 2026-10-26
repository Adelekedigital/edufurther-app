import { act, renderHook } from '@testing-library/react';
import { useWeekMoves } from './useWeekMoves';

const ZONE = 'Africa/Lagos';
const tue = new Date('2026-10-27T10:00:00Z'); // ISO week 44
const nextMon = new Date('2026-11-02T10:00:00Z'); // week 45

beforeEach(() => localStorage.clear());

describe('useWeekMoves', () => {
  it('a pressed move stays done after a reload (same week)', () => {
    const first = renderHook(() => useWeekMoves('m1', ZONE, tue));
    act(() => first.result.current.mark('hours'));
    expect(first.result.current.done).toEqual(['hours']);
    first.unmount();
    const again = renderHook(() => useWeekMoves('m1', ZONE, tue));
    expect(again.result.current.done).toEqual(['hours']);
  });

  it('a new ISO week shows the buttons again, without a reload', () => {
    const { result, rerender } = renderHook(({ now }) => useWeekMoves('m1', ZONE, now), {
      initialProps: { now: tue },
    });
    act(() => result.current.mark('share'));
    rerender({ now: nextMon });
    expect(result.current.done).toEqual([]);
  });

  it('is per mentor', () => {
    const a = renderHook(() => useWeekMoves('m1', ZONE, tue));
    act(() => a.result.current.mark('about'));
    expect(renderHook(() => useWeekMoves('m2', ZONE, tue)).result.current.done).toEqual([]);
  });

  it('marking twice keeps one entry', () => {
    const { result } = renderHook(() => useWeekMoves('m1', ZONE, tue));
    act(() => result.current.mark('share'));
    act(() => result.current.mark('share'));
    expect(result.current.done).toEqual(['share']);
  });
});
