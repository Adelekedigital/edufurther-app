import { act, renderHook } from '@testing-library/react';
import { useCopyText } from './useCopyText';

const clip = (writeText: (t: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

afterEach(() => vi.useRealTimers());

describe('useCopyText', () => {
  it('copied, then idle again after resetMs', async () => {
    vi.useFakeTimers();
    clip(() => Promise.resolve());
    const { result } = renderHook(() => useCopyText(2000));
    let ok = false;
    await act(async () => {
      ok = await result.current.copy('x');
    });
    expect(ok).toBe(true);
    expect(result.current.state).toBe('copied');
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.state).toBe('idle');
  });

  it('a copy that lands after unmount sets no state and leaves no timer', async () => {
    vi.useFakeTimers();
    let resolve: () => void = () => {};
    clip(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const { result, unmount } = renderHook(() => useCopyText(2000));
    const pending = result.current.copy('x');
    unmount();
    resolve();
    await expect(pending).resolves.toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
