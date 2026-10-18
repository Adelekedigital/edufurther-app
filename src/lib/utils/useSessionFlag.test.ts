import { act, renderHook } from '@testing-library/react';
import { resetSessionFlags, useSessionFlag } from './useSessionFlag';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  resetSessionFlags();
});

describe('useSessionFlag', () => {
  it('is off, turns on, and stays on for the visit (a second reader sees it)', () => {
    const a = renderHook(() => useSessionFlag('k1'));
    expect(a.result.current[0]).toBe(false);
    act(() => a.result.current[1]());
    expect(a.result.current[0]).toBe(true);
    expect(renderHook(() => useSessionFlag('k1')).result.current[0]).toBe(true);
    // Another key is its own.
    expect(renderHook(() => useSessionFlag('k2')).result.current[0]).toBe(false);
  });

  it('comes back on the next visit (storage cleared)', () => {
    const a = renderHook(() => useSessionFlag('k1'));
    act(() => a.result.current[1]());
    window.sessionStorage.clear();
    expect(renderHook(() => useSessionFlag('k1')).result.current[0]).toBe(false);
  });

  it('still hides for the page when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const a = renderHook(() => useSessionFlag('k3'));
    expect(a.result.current[0]).toBe(false);
    act(() => a.result.current[1]());
    expect(a.result.current[0]).toBe(true);
  });
});
