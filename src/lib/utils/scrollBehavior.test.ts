import { scrollBehavior } from './scrollBehavior';

const motion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('scrollBehavior', () => {
  it('smooth by default, a jump under prefers-reduced-motion', () => {
    motion(false);
    expect(scrollBehavior()).toBe('smooth');
    motion(true);
    expect(scrollBehavior()).toBe('auto');
  });
});
