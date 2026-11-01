// @vitest-environment node
import { AsyncLocalStorage } from 'node:async_hooks';

// Next's matcher helper expects the runtime's global, which plain Node lacks.
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server');
const { config } = await import('./proxy');

// The real matcher, as Next applies it (the helper keeps the pre-16 name): proxy.test.ts calls proxy() directly,
// so only this pins which requests reach it at all.
const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe('proxy matcher', () => {
  it('every backend call reaches the proxy, dotted paths and queries included', () => {
    for (const url of [
      '/api/v1',
      '/api/v1/me',
      '/api/v1/me?x=1',
      '/api/v1/intake-files/x.pdf',
      '/api/v1/a/b.c/d',
    ]) {
      expect(runs(url), url).toBe(true);
    }
  });

  it('pages do; the mock API, Next assets and static files do not', () => {
    expect(runs('/explore')).toBe(true);
    expect(runs('/sessions/b1/enter')).toBe(true);
    for (const url of [
      '/api/mock/api/v1/me',
      '/api/v1x',
      '/_next/static/chunk.js',
      '/favicon.ico',
      '/brand/logo.svg',
    ]) {
      expect(runs(url), url).toBe(false);
    }
  });
});
