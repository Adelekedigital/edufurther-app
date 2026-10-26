import { act, renderHook } from '@testing-library/react';
import { useDeviceFlag } from './deviceFlag';

beforeEach(() => window.localStorage.clear());

describe('useDeviceFlag', () => {
  it('remembers a flag per account on this device', () => {
    const a = renderHook(() => useDeviceFlag('t-hidden', 'user-a'));
    expect(a.result.current[0]).toBe(false);
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(window.localStorage.getItem('ef-t-hidden-user-a')).toBe('1');
    // Another account on the same device is its own.
    const b = renderHook(() => useDeviceFlag('t-hidden', 'user-b'));
    expect(b.result.current[0]).toBe(false);
    act(() => a.result.current[1](false));
    expect(window.localStorage.getItem('ef-t-hidden-user-a')).toBeNull();
  });

  it('without an account it reads false and setting it does nothing', () => {
    const { result } = renderHook(() => useDeviceFlag('t-x', null));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(false);
  });

  it('when storage throws, the flag lasts for the visit', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useDeviceFlag('t-throw', 'user-c'));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    set.mockRestore();
  });
});
