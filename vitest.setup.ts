import '@testing-library/jest-dom/vitest';
import { createElement, lazy, Suspense, type ComponentType } from 'react';

/**
 * next/dynamic, eager. In the app a lazy part (lazyPart: a dialog, a sheet)
 * loads on open, a few milliseconds later; that wait is the bundler's, not the
 * behaviour under test. Here the import starts when the parent module loads
 * and every file's tests wait for those imports (beforeAll), so a test renders
 * the part in the same pass, as if bundled. vi.mock of the lazy module still
 * applies. lazyPart's own test (lazyPart.test.tsx) unmocks this to drive a
 * real pending and a real failed load.
 */
const dynamicImports = vi.hoisted(() => {
  // Tests load every part eagerly: lazyPart's idle preload would only add noise.
  (globalThis as { __EF_NO_PRELOAD__?: boolean }).__EF_NO_PRELOAD__ = true;
  return [] as Promise<unknown>[];
});
// Until none are left: a lazy part can bring lazy parts of its own.
beforeAll(async () => {
  for (let seen = -1; seen !== dynamicImports.length;) {
    seen = dynamicImports.length;
    await Promise.allSettled(dynamicImports);
  }
});
vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<ComponentType | { default: ComponentType }>,
    opts: { ssr?: boolean; loading?: unknown } = {},
  ) => {
    // A part with neither suspends the page's own boundary while it loads,
    // hiding the page: go through lazyPart, which always sets one.
    if (opts.ssr !== false && !opts.loading) {
      throw new Error('next/dynamic needs ssr: false or loading (use lazyPart)');
    }
    let loaded: ComponentType | null = null;
    const ready = loader().then((r) => {
      loaded = 'default' in r ? r.default : r;
      return { default: loaded };
    });
    dynamicImports.push(ready);
    const Lazy = lazy(() => ready);
    return function Dynamic(props: object) {
      return loaded
        ? createElement(loaded, props)
        : createElement(Suspense, { fallback: null }, createElement(Lazy, props));
    };
  },
}));

/**
 * jsdom implements no `matchMedia`, and `useMediaQuery` calls it unguarded.
 * Defaults to the desktop answer, which is what `useMediaQuery` itself assumes
 * on the server — a suite that wants the phone overrides this per test.
 */
// `typeof window` guarded, not just `!window.matchMedia`: suites that test
// node code (scripts/vercel-ignore) run with no jsdom at all, and touching
// `window` there is a ReferenceError before a single test starts.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: false,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
