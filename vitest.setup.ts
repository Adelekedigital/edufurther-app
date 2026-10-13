import '@testing-library/jest-dom/vitest';

/**
 * jsdom implements no `matchMedia`, and `useMediaQuery` calls it unguarded.
 * Defaults to the desktop answer, which is what `useMediaQuery` itself assumes
 * on the server — a suite that wants the phone overrides this per test.
 */
if (!window.matchMedia) {
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
