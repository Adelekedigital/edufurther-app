import { act, renderHook } from '@testing-library/react';
import { useTimedToast } from './useTimedToast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('goes after its time', () => {
  const { result } = renderHook(() => useTimedToast<string>(1000));
  act(() => result.current[1]('Saved'));
  expect(result.current[0]).toBe('Saved');
  act(() => vi.advanceTimersByTime(999));
  expect(result.current[0]).toBe('Saved');
  act(() => vi.advanceTimersByTime(1));
  expect(result.current[0]).toBeNull();
});

it('waits while it has focus, then goes once focus leaves', () => {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  const button = document.createElement('button');
  region.append(button);
  document.body.append(region);
  const { result } = renderHook(() => useTimedToast<string>(1000));
  act(() => result.current[1]('Saved'));
  button.focus();
  act(() => vi.advanceTimersByTime(3000));
  expect(result.current[0]).toBe('Saved');
  button.blur();
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current[0]).toBeNull();
});

it('a new toast restarts the time', () => {
  const { result } = renderHook(() => useTimedToast<string>(1000));
  act(() => result.current[1]('One'));
  act(() => vi.advanceTimersByTime(800));
  act(() => result.current[1]('Two'));
  act(() => vi.advanceTimersByTime(800));
  expect(result.current[0]).toBe('Two');
});
