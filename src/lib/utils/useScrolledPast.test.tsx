import { act, renderHook } from '@testing-library/react';
import { useScrolledPast } from './useScrolledPast';

type Watch = {
  cb: IntersectionObserverCallback;
  el: Element | null;
  options?: IntersectionObserverInit;
};
let watches: Watch[] = [];
class FakeObserver {
  watch: Watch;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.watch = { cb, el: null, options };
    watches.push(this.watch);
  }
  observe(el: Element) {
    this.watch.el = el;
  }
  unobserve() {}
  disconnect() {
    this.watch.el = null;
  }
  takeRecords() {
    return [];
  }
}
const report = (el: Element, isIntersecting: boolean, bottom: number) =>
  act(() => {
    for (const w of watches.filter((x) => x.el === el))
      w.cb(
        [
          {
            target: el,
            isIntersecting,
            boundingClientRect: { bottom },
            rootBounds: { top: 0 },
          } as unknown as IntersectionObserverEntry,
        ],
        w as unknown as IntersectionObserver,
      );
  });

beforeEach(() => {
  watches = [];
  window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
});

describe('useScrolledPast', () => {
  it('true only once the element is above the viewport; below or in view is false', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() => useScrolledPast(el));
    expect(result.current).toBe(false);
    report(el, false, 1200);
    expect(result.current).toBe(false);
    report(el, false, -10);
    expect(result.current).toBe(true);
    report(el, true, 50);
    expect(result.current).toBe(false);
  });

  it('a swapped or removed element starts over, and the old one is let go', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const { result, rerender } = renderHook(({ el }) => useScrolledPast(el), {
      initialProps: { el: a as Element | null },
    });
    report(a, false, -10);
    expect(result.current).toBe(true);
    rerender({ el: b });
    expect(result.current).toBe(false);
    expect(watches.some((w) => w.el === a)).toBe(false);
    rerender({ el: null });
    expect(result.current).toBe(false);
  });

  it('a top inset (a sticky header) shrinks the viewport from the top', () => {
    const el = document.createElement('div');
    const inset = () => 64;
    const { result } = renderHook(() => useScrolledPast(el, inset));
    expect(watches[0]!.options?.rootMargin).toBe('-64px 0px 0px 0px');
    // Under the header (bottom 40 < 64) counts as past.
    act(() =>
      watches[0]!.cb(
        [
          {
            target: el,
            isIntersecting: false,
            boundingClientRect: { bottom: 40 },
            rootBounds: { top: 64 },
          } as unknown as IntersectionObserverEntry,
        ],
        watches[0] as unknown as IntersectionObserver,
      ),
    );
    expect(result.current).toBe(true);
  });

  it('without IntersectionObserver it stays false', () => {
    // @ts-expect-error: an older browser without it.
    delete window.IntersectionObserver;
    const { result } = renderHook(() => useScrolledPast(document.createElement('div')));
    expect(result.current).toBe(false);
  });
});
