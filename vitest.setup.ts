import '@testing-library/jest-dom/vitest';
import { createElement, lazy, Suspense, type ComponentType } from 'react';

/**
 * next/dynamic, eager. In the app a lazy part (a dialog, a sheet) loads on
 * open, a few milliseconds later; that wait is the bundler's, not the
 * behaviour under test. Here the import starts when the parent module loads
 * and every file's tests wait for those imports (beforeAll), so a test renders
 * the part in the same pass, as if bundled. vi.mock of the lazy module still applies.
 */
const dynamicImports = vi.hoisted(() => [] as Promise<unknown>[]);
// Until none are left: a lazy part can bring lazy parts of its own.
beforeAll(async () => {
  for (let seen = -1; seen !== dynamicImports.length;) {
    seen = dynamicImports.length;
    await Promise.all(dynamicImports);
  }
});
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<ComponentType | { default: ComponentType }>) => {
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
